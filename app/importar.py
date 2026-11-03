"""Importa compras desde un CSV con columnas fecha,monto_usd,precio_btc_usd.

El archivo que genera el botón "Exportar CSV" ya tiene ese formato.
Omite filas inválidas y filas idénticas a una compra existente, así que se
puede ejecutar más de una vez sin duplicar.

Uso: python importar.py /ruta/compras.csv
"""
import csv
import sys
import time

import server


def main(ruta):
    conn = server.connect()
    nuevos = repetidos = omitidos = 0
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            try:
                fecha, monto, precio, sats = server.parse_compra({
                    "fecha": (row.get("fecha") or "").strip(),
                    "monto": float(row.get("monto_usd") or row.get("monto")),
                    "precio": float(row.get("precio_btc_usd") or row.get("precio")),
                })
            except (ValueError, TypeError) as e:
                print(f"línea {n}: omitida ({e})")
                omitidos += 1
                continue
            if conn.execute("SELECT 1 FROM compras WHERE fecha = ? AND monto = ? AND precio = ?", (fecha, monto, precio)).fetchone():
                repetidos += 1
                continue
            conn.execute(
                "INSERT INTO compras (fecha, monto, precio, sats, creado) VALUES (?, ?, ?, ?, ?)",
                (fecha, monto, precio, sats, int(time.time() * 1000)),
            )
            nuevos += 1
    conn.commit()
    conn.close()
    print(f"importadas: {nuevos} · repetidas: {repetidos} · omitidas: {omitidos}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
