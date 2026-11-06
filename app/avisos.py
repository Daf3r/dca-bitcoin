"""Avisos programados (un servicio aparte en docker-compose, igual que el respaldo).

Uso:
  python avisos.py          una pasada ahora
  python avisos.py --loop   una pasada cada AVISOS_INTERVALO_SEGUNDOS (por defecto 120)

En cada pasada:
  · saca lo que cayó de noche (los avisos no suenan fuera de 8:00 a 21:00, hora de El Salvador);
  · recordatorio de compra al admin (viernes a domingo, una vez al día, desde las 9:00) si el periodo se acaba y
    aún no compró; no avisa si ya compraste, aunque haya sido días antes;
  · TXID vigilados: si uno que estaba pendiente ya se confirmó, avisa al admin una vez.
"""
from __future__ import annotations

import os
import sqlite3
import sys
import time
from typing import Any

import push
import ritmo
import server  # abre la base y crea lo que falte; de aquí salen la verificación de TXID y las consultas

HORA_RECORDATORIO = 9
INTERVALO = int(os.environ.get("AVISOS_INTERVALO_SEGUNDOS", "120"))
VIGILAR_DIAS = 14  # un TXID que no se confirma en dos semanas se deja de vigilar
MAX_TX_POR_PASADA = 20


def _recordatorio(conn: sqlite3.Connection) -> bool:
    ahora = push.ahora()
    if not push.dentro_de_horario() or ahora.hour < HORA_RECORDATORIO:
        return False
    hoy = ritmo.hoy_sv(ahora)
    if server._meta(conn, "aviso_recordatorio_dia") == hoy.isoformat():
        return False
    fechas = [r["fecha"] for r in conn.execute(f"SELECT fecha FROM compras WHERE tipo = 'compra' AND {server.VIGENTES}")]
    t = ritmo.recordatorio(fechas, hoy)
    if t is None:
        return False
    # Se marca el día aunque no haya nadie suscrito: no se reintenta cada dos minutos.
    server._meta_poner(conn, "aviso_recordatorio_dia", hoy.isoformat())
    conn.commit()
    push.notificar(conn, "recordatorio", "Libro DCA", ritmo.texto_recordatorio(t), "recordatorio")
    return True


def _txid(conn: sqlite3.Connection) -> int:
    ahora = int(time.time())
    conn.execute("DELETE FROM tx_vigilados WHERE cerrado = 0 AND creado < ?", (ahora - VIGILAR_DIAS * 86400,))
    avisos = 0
    filas = conn.execute("SELECT txid, visto_pendiente FROM tx_vigilados WHERE cerrado = 0 ORDER BY creado LIMIT ?",
                         (MAX_TX_POR_PASADA,)).fetchall()
    for f in filas:
        try:
            estado = server.verificar_tx(conn, f["txid"])["estado"]
        except Exception:  # noqa: BLE001 — mempool.space sin respuesta: se reintenta en la siguiente pasada
            continue
        if estado == "pendiente":
            conn.execute("UPDATE tx_vigilados SET visto_pendiente = 1 WHERE txid = ?", (f["txid"],))
        elif estado == "confirmada":
            conn.execute("UPDATE tx_vigilados SET cerrado = 1 WHERE txid = ?", (f["txid"],))
            conn.commit()
            if f["visto_pendiente"]:  # si ya estaba confirmada al anotarla, no hay nada que avisar
                push.notificar(conn, "txid", "Libro DCA", f"Tu transacción {f['txid'][:6]}…{f['txid'][-4:]} ya está confirmada en la red.",
                               f"tx-{f['txid'][:12]}")
                avisos += 1
    conn.commit()
    return avisos


def una_pasada() -> dict[str, Any]:
    conn = server.connect()
    try:
        return {"pendientes": push.vaciar_pendientes(conn), "recordatorio": _recordatorio(conn), "txid": _txid(conn)}
    finally:
        conn.close()


if __name__ == "__main__":
    if "--loop" in sys.argv:
        while True:
            try:
                una_pasada()
            except Exception as e:  # el ciclo no debe morir por un fallo puntual
                print(f"avisos: error: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
            time.sleep(INTERVALO)
    else:
        print(una_pasada())
