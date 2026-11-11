"""Chequeos de salud de los servicios, para docker-compose (`healthcheck`). Solo biblioteca estándar: se corre cada minuto
y no debe cargar Flask ni tocar la base más que para leer una marca.

Uso:
  python salud.py avisos     sano si el servicio de avisos dejó su marca de «sigo vivo» hace poco
  python salud.py respaldo   sano si hay un respaldo reciente
Sale con 0 (sano) o 1.
"""
from __future__ import annotations

import glob
import os
import sqlite3
import sys
import time

LATIDO_MAX_SEGUNDOS = 600  # el servicio de avisos debe dejar su marca al menos cada 10 minutos


def ultimo_respaldo(carpeta: str | None = None) -> float | None:
    """Cuándo se hizo el respaldo más reciente (marca de tiempo de su archivo), o None si no hay ninguno."""
    carpeta = carpeta or os.environ.get("BACKUP_DIR", "/data/backups")
    marcas = [os.path.getmtime(f) for patron in ("libro-*.db", "libro-*.db.cifrado") for f in glob.glob(os.path.join(carpeta, patron))]
    return max(marcas) if marcas else None


def avisos(ahora: float | None = None, db_path: str | None = None) -> bool:
    try:
        conn = sqlite3.connect(db_path or os.environ.get("DB_PATH", "/data/libro.db"), timeout=5)
        try:
            fila = conn.execute("SELECT valor FROM meta WHERE clave = 'avisos_latido'").fetchone()
        finally:
            conn.close()
    except sqlite3.Error:
        return False
    return fila is not None and (ahora or time.time()) - int(fila[0]) < LATIDO_MAX_SEGUNDOS


def respaldo(ahora: float | None = None, db_path: str | None = None) -> bool:
    """Sano si hay un respaldo de menos de 1.5 intervalos más 6 horas de margen; mientras no exista la base, también."""
    if not os.path.exists(db_path or os.environ.get("DB_PATH", "/data/libro.db")):
        return True
    intervalo = int(os.environ.get("BACKUP_INTERVAL_HOURS", "24")) * 3600
    u = ultimo_respaldo()
    return u is not None and (ahora or time.time()) - u < intervalo * 1.5 + 6 * 3600


if __name__ == "__main__":
    que = sys.argv[1] if len(sys.argv) > 1 else ""
    if que not in ("avisos", "respaldo"):
        print(__doc__)
        sys.exit(2)
    sys.exit(0 if {"avisos": avisos, "respaldo": respaldo}[que]() else 1)
