"""Avisos programados (un servicio aparte en docker-compose, igual que el respaldo).

Uso:
  python avisos.py          una pasada ahora
  python avisos.py --loop   una pasada cada AVISOS_INTERVALO_SEGUNDOS (por defecto 120)

En cada pasada:
  · saca lo que cayó de noche (los avisos no suenan fuera de 8:00 a 21:00, hora de El Salvador);
  · recordatorio de compra al admin (viernes a domingo, una vez al día, desde las 9:00) si el periodo se acaba y
    aún no compró; no avisa si ya compraste, aunque haya sido días antes;
  · TXID vigilados: si uno que estaba pendiente ya se confirmó, avisa al admin una vez;
  · gran caída: si BTC está 15 % o más bajo su máximo de 30 días, avisa al admin una vez por caída (se reinicia cuando
    BTC se recupera y queda a menos de 10 % de su máximo). Solo informa; solo de 8:00 a 21:00;
  · vigilantes: deja una marca de «sigo vivo»; avisa si pasan más de 36 horas sin respaldo nuevo, si la revisión semanal
    de la base de datos encuentra un problema o si queda poco espacio en disco (cada aviso, una vez al día).
  (el chequeo de salud de docker-compose vive en salud.py)
"""
from __future__ import annotations

import os
import shutil
import sqlite3
import sys
import time
from datetime import timedelta
from typing import Any

import push
import ritmo
import salud
import server  # abre la base y crea lo que falte; de aquí salen la verificación de TXID y las consultas

HORA_RECORDATORIO = 9
INTERVALO = int(os.environ.get("AVISOS_INTERVALO_SEGUNDOS", "120"))
VIGILAR_DIAS = 14  # un TXID que no se confirma en dos semanas se deja de vigilar
MAX_TX_POR_PASADA = 20
CAIDA_CADA = 300  # el precio se consulta como mucho cada 5 minutos
CAIDA_UMBRAL = 15.0
CAIDA_RECUPERADA = 10.0  # la caída «termina» cuando BTC queda a menos de esto bajo su máximo
RESPALDO_MAX_HORAS = 36
DISCO_MIN_BYTES = 1024**3  # menos de 1 GiB libre
DISCO_MIN_PCT = 10.0       # o menos del 10 % libre


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


def _caida(conn: sqlite3.Connection, cada: int = CAIDA_CADA) -> bool:
    """Gran caída (la misma regla que la tarjeta de la app). Una vez por caída; no suena de noche (si sigue por la mañana, sale entonces)."""
    if not push.dentro_de_horario():
        return False
    if int(time.time()) - int(server._meta(conn, "aviso_caida_chequeo") or 0) < cada:
        return False
    server._meta_poner(conn, "aviso_caida_chequeo", str(int(time.time())))
    conn.commit()
    movs = [(r["fecha"], r["id"], r["tipo"], r["monto"], r["sats"], r["extra"]) for r in
            conn.execute(f"SELECT fecha, id, tipo, monto, sats, extra FROM compras WHERE {server.VIGENTES}")]
    if sum(1 for m in movs if m[2] == "compra") < 3:
        return False
    hoy = ritmo.hoy_sv(push.ahora())
    cierres = [(r["fecha"], r["cierre"]) for r in conn.execute(
        "SELECT fecha, cierre FROM precios WHERE fecha >= ? ORDER BY fecha", ((hoy - timedelta(days=31)).isoformat(),))]
    vivo, _fuente = server.consultar_precio()
    if not vivo:
        return False
    alta = server._meta(conn, "aviso_caida") == "1"
    c = ritmo.caida_grande(cierres, vivo, hoy, umbral=CAIDA_UMBRAL)
    if c is None:
        # Recuperada: queda a menos de 10 % de su máximo (o ya no hay datos para decir que sigue la caída).
        if alta and ritmo.caida_grande(cierres, vivo, hoy, umbral=CAIDA_RECUPERADA) is None:
            server._meta_poner(conn, "aviso_caida", "0")
            conn.commit()
        return False
    if alta:
        return False
    server._meta_poner(conn, "aviso_caida", "1")  # se marca antes de avisar: una caída, un aviso
    conn.commit()
    push.notificar(conn, "caida", "Libro DCA", ritmo.texto_caida(c, ritmo.reposicion(movs, vivo)), "caida")
    return True


def _una_vez_al_dia(conn: sqlite3.Connection, clave: str) -> bool:
    """True la primera vez que se pregunta cada día (y deja marcado el día)."""
    hoy = ritmo.hoy_sv(push.ahora()).isoformat()
    if server._meta(conn, clave) == hoy:
        return False
    server._meta_poner(conn, clave, hoy)
    conn.commit()
    return True


def _respaldo_viejo(conn: sqlite3.Connection) -> bool:
    """Avisa si el respaldo más reciente tiene más de 36 horas (o si nunca hubo uno desde que se vigila)."""
    ahora = int(time.time())
    if server._meta(conn, "avisos_primer_pase") is None:
        server._meta_poner(conn, "avisos_primer_pase", str(ahora))
        conn.commit()
    ultimo = salud.ultimo_respaldo()
    desde = ultimo if ultimo is not None else int(server._meta(conn, "avisos_primer_pase") or ahora)
    if ahora - desde <= RESPALDO_MAX_HORAS * 3600 or not _una_vez_al_dia(conn, "aviso_respaldo_viejo_dia"):
        return False
    horas = round((ahora - desde) / 3600)
    texto = (f"Hace {horas} horas que no hay un respaldo nuevo. Revisa el servicio de respaldos." if ultimo is not None
             else "Todavía no hay ningún respaldo guardado. Revisa el servicio de respaldos.")
    push.notificar(conn, "respaldo", "Libro DCA", texto, "respaldo-viejo")
    return True


def _resultado_integridad(conn: sqlite3.Connection) -> list[str]:
    return [str(r[0]) for r in conn.execute("PRAGMA integrity_check")]


def _integridad(conn: sqlite3.Connection) -> bool:
    """Revisa la base real una vez por semana (o cada día mientras tenga un problema). Avisa si algo falla."""
    hoy = ritmo.hoy_sv(push.ahora())
    semana = f"{hoy.isocalendar().year}-S{hoy.isocalendar().week:02d}"
    estado = server._meta(conn, "aviso_integridad") or ""
    if estado == f"ok:{semana}" or estado == f"mal:{hoy.isoformat()}":
        return False
    res = _resultado_integridad(conn)
    if res == ["ok"]:
        server._meta_poner(conn, "aviso_integridad", f"ok:{semana}")
        conn.commit()
        return False
    server._meta_poner(conn, "aviso_integridad", f"mal:{hoy.isoformat()}")
    conn.commit()
    push.notificar(conn, "respaldo", "Libro DCA", "La revisión de la base de datos encontró un problema. Restaura desde un respaldo antes de seguir.", "integridad")
    return True


def _disco(conn: sqlite3.Connection) -> bool:
    """Avisa (una vez al día) si queda poco espacio libre en el volumen de los datos."""
    uso = shutil.disk_usage(os.path.dirname(server.DB_PATH) or ".")
    pct = uso.free / uso.total * 100 if uso.total else 100.0
    if uso.free >= DISCO_MIN_BYTES and pct >= DISCO_MIN_PCT:
        return False
    if not _una_vez_al_dia(conn, "aviso_disco_dia"):
        return False
    push.notificar(conn, "respaldo", "Libro DCA", f"Queda poco espacio en el servidor: {uso.free / 1024**2:,.0f} MB libres ({pct:.0f} %).", "disco")
    return True


def una_pasada() -> dict[str, Any]:
    conn = server.connect()
    try:
        server._meta_poner(conn, "avisos_latido", str(int(time.time())))  # «sigo vivo»: lo lee el chequeo de salud
        conn.commit()
        return {"pendientes": push.vaciar_pendientes(conn), "recordatorio": _recordatorio(conn), "txid": _txid(conn), "caida": _caida(conn),
                "respaldo": _respaldo_viejo(conn), "integridad": _integridad(conn), "disco": _disco(conn)}
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
