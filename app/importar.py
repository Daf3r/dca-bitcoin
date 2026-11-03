"""Importa compras desde un CSV (el mismo formato que exporta la app).

Columnas: fecha, monto_usd y sats; si falta sats se usa precio_btc_usd.
Salta filas inválidas y repetidas, así que se puede ejecutar más de una vez.

Uso: python importar.py /ruta/compras.csv
"""
import sys

import server


def main(ruta: str) -> int:
    with open(ruta, encoding="utf-8-sig") as f:
        texto = f.read()
    conn = server.connect()
    try:
        r = server.importar_csv(conn, texto)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 1
    finally:
        conn.close()
    for linea in r["omitidas"]:
        print(f"{linea} (omitida)")
    print(f"importadas: {r['nuevas']} · repetidas: {r['repetidas']} · omitidas: {len(r['omitidas'])}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
