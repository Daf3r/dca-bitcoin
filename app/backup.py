"""Respaldo consistente de la base SQLite.

Uso:
  python backup.py          una copia ahora
  python backup.py --loop   una copia cada BACKUP_INTERVAL_HOURS (por defecto 24)

Usa la API de respaldo de SQLite, que produce una copia coherente aunque la
app esté escribiendo, y verifica la copia antes de conservarla.
"""
import glob
import os
import sqlite3
import sys
import time

DB_PATH = os.environ.get("DB_PATH", "/data/libro.db")
DEST = os.environ.get("BACKUP_DIR", "/data/backups")
KEEP = int(os.environ.get("BACKUP_KEEP", "30"))
INTERVAL = int(os.environ.get("BACKUP_INTERVAL_HOURS", "24")) * 3600


def avisar_fallo() -> None:
    """Avisa por push al admin de que el respaldo falló. Es secundario: si no se puede avisar, solo se registra."""
    try:
        import push  # misma imagen que la app; sin suscripciones simplemente no hay a quién avisar

        conn = sqlite3.connect(DB_PATH, timeout=15)
        conn.row_factory = sqlite3.Row
        try:
            push.notificar(conn, "respaldo", "Libro DCA", "El respaldo diario falló. Revisa el servidor.", "respaldo")
        finally:
            conn.close()
    except Exception as e:  # noqa: BLE001
        print(f"backup: no se pudo avisar del fallo ({type(e).__name__}: {e})", file=sys.stderr, flush=True)


def run() -> bool:
    if not os.path.exists(DB_PATH):
        print("backup: todavía no existe la base, nada que copiar", flush=True)
        return True
    os.makedirs(DEST, exist_ok=True)
    nombre = time.strftime("libro-%Y%m%d-%H%M%S")
    tmp = os.path.join(DEST, nombre + ".db.tmp")
    final = os.path.join(DEST, nombre + ".db")
    src = sqlite3.connect(DB_PATH, timeout=30)
    dst = sqlite3.connect(tmp)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    chk = sqlite3.connect(tmp)
    try:
        ok = chk.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        filas = chk.execute("SELECT COUNT(*) FROM compras").fetchone()[0]
    finally:
        chk.close()
    if not ok:
        os.remove(tmp)
        print("backup: la copia no pasó la verificación, se descartó", file=sys.stderr, flush=True)
        return False
    os.replace(tmp, final)
    todas = sorted(glob.glob(os.path.join(DEST, "libro-*.db")))
    for f in todas[:-KEEP]:
        os.remove(f)
    print(f"backup: {final} ({filas} compras), copias guardadas: {len(todas[-KEEP:])}", flush=True)
    return True


if __name__ == "__main__":
    if "--loop" in sys.argv:
        while True:
            try:
                if not run():
                    avisar_fallo()
            except Exception as e:  # el ciclo no debe morir por un fallo puntual
                print(f"backup: error: {e}", file=sys.stderr, flush=True)
                avisar_fallo()
            time.sleep(INTERVAL)
    else:
        ok = run()
        if not ok:
            avisar_fallo()
        sys.exit(0 if ok else 1)
