"""Respaldo consistente de la base SQLite.

Uso:
  python backup.py                una copia ahora
  python backup.py --loop         una copia cada BACKUP_INTERVAL_HOURS (por defecto 24) y, una vez por semana, una
                                  prueba de restauración del último respaldo
  python backup.py --probar       la prueba de restauración ahora (sale con 1 si encuentra algo)
  (el chequeo de salud de docker-compose vive en salud.py)

Usa la API de respaldo de SQLite, que produce una copia coherente aunque la
app esté escribiendo, y verifica la copia antes de conservarla.
"""
import glob
import hashlib
import os
import shutil
import sqlite3
import sys
import tempfile
import time

DB_PATH = os.environ.get("DB_PATH", "/data/libro.db")
DEST = os.environ.get("BACKUP_DIR", "/data/backups")
KEEP = int(os.environ.get("BACKUP_KEEP", "30"))
INTERVAL = int(os.environ.get("BACKUP_INTERVAL_HOURS", "24")) * 3600


TABLAS_CLAVE = ("compras", "traslados", "usuarios", "auditoria", "precios", "meta")  # lo que un respaldo debe traer
PRUEBA_CADA = 7 * 24 * 3600  # la prueba de restauración corre una vez por semana
MARCA_PRUEBA = ".restauracion"  # su marca de tiempo (mtime) dice cuándo fue la última


def _huella_auditoria(conn: sqlite3.Connection, hasta_id: int) -> str:
    """Huella de las filas de auditoría hasta cierto id. La tabla es de solo añadir: no puede cambiar entre el respaldo y la base real."""
    h = hashlib.sha256()
    for fila in conn.execute("SELECT * FROM auditoria WHERE id <= ? ORDER BY id", (hasta_id,)):
        h.update(repr(tuple(fila)).encode())
    return h.hexdigest()


def probar_restauracion(respaldo: str | None = None, db_vivo: str | None = None) -> list[str]:
    """Restaura el respaldo más reciente en un archivo temporal y lo compara con la base real.

    Devuelve los problemas encontrados (lista vacía = todo bien). Comprueba que la copia se abre, que pasa su revisión de
    integridad, que trae las tablas clave, que no tiene filas que la base real no tenga y que las filas de auditoría
    (de solo añadir) son idénticas. No toca la base real ni los respaldos: trabaja con una copia en una carpeta temporal.
    """
    db_vivo = db_vivo or DB_PATH
    if respaldo is None:
        archivos = sorted(glob.glob(os.path.join(DEST, "libro-*.db")))
        if not archivos:
            return ["No hay ningún respaldo que probar."]
        respaldo = archivos[-1]
    problemas: list[str] = []
    with tempfile.TemporaryDirectory() as d:
        copia = os.path.join(d, "restaurada.db")
        shutil.copy2(respaldo, copia)
        try:
            rest = sqlite3.connect(copia)
            vivo = sqlite3.connect(f"file:{db_vivo}?mode=ro", uri=True, timeout=15)
        except sqlite3.Error as e:
            return [f"No se pudo abrir la copia restaurada o la base real: {e}"]
        try:
            try:
                if rest.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    problemas.append("la copia restaurada no pasa su revisión de integridad")
                tablas = {r[0] for r in rest.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
            except sqlite3.Error as e:
                return [f"La copia restaurada está dañada: {e}"]
            faltan = [t for t in TABLAS_CLAVE if t not in tablas]
            if faltan:
                problemas.append("a la copia le faltan tablas: " + ", ".join(faltan))
            for t in [t for t in ("compras", "traslados", "usuarios", "auditoria") if t in tablas]:
                n_rest = rest.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                n_vivo = vivo.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                if n_rest > n_vivo:
                    problemas.append(f"el respaldo tiene más filas de {t} ({n_rest}) que la base real ({n_vivo})")
            if "auditoria" in tablas:
                ultimo = rest.execute("SELECT COALESCE(MAX(id), 0) FROM auditoria").fetchone()[0]
                if _huella_auditoria(rest, ultimo) != _huella_auditoria(vivo, ultimo):
                    problemas.append("las filas de auditoría del respaldo no coinciden con las de la base real (esa tabla solo se añade)")
        except sqlite3.Error as e:
            problemas.append(f"error al comparar con la base real: {e}")
        finally:
            rest.close()
            vivo.close()
    return problemas


def prueba_semanal(ahora: float | None = None) -> list[str] | None:
    """Corre la prueba de restauración si pasó una semana desde la última. None si todavía no tocaba."""
    marca = os.path.join(DEST, MARCA_PRUEBA)
    ahora = ahora or time.time()
    if os.path.exists(marca) and ahora - os.path.getmtime(marca) < PRUEBA_CADA:
        return None
    problemas = probar_restauracion()
    os.makedirs(DEST, exist_ok=True)
    with open(marca, "w") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S") + (" con problemas" if problemas else " bien") + "\n")
    return problemas


def avisar_fallo(texto: str = "El respaldo diario falló. Revisa el servidor.") -> None:
    """Avisa por push al admin de que el respaldo falló. Es secundario: si no se puede avisar, solo se registra."""
    try:
        import push  # misma imagen que la app; sin suscripciones simplemente no hay a quién avisar

        conn = sqlite3.connect(DB_PATH, timeout=15)
        conn.row_factory = sqlite3.Row
        try:
            push.notificar(conn, "respaldo", "Libro DCA", texto, "respaldo")
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
    if "--probar" in sys.argv:
        problemas = probar_restauracion()
        print("backup: la prueba de restauración encontró problemas: " + "; ".join(problemas) if problemas else "backup: la prueba de restauración salió bien", flush=True)
        sys.exit(1 if problemas else 0)
    if "--loop" in sys.argv:
        while True:
            try:
                if not run():
                    avisar_fallo()
            except Exception as e:  # el ciclo no debe morir por un fallo puntual
                print(f"backup: error: {e}", file=sys.stderr, flush=True)
                avisar_fallo()
            try:
                semanal = prueba_semanal()
                if semanal:
                    print("backup: la prueba de restauración encontró problemas: " + "; ".join(semanal), file=sys.stderr, flush=True)
                    avisar_fallo("La prueba semanal de restauración del respaldo encontró un problema: " + semanal[0])
                elif semanal is not None:
                    print("backup: la prueba de restauración semanal salió bien", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"backup: error en la prueba de restauración: {e}", file=sys.stderr, flush=True)
            time.sleep(INTERVAL)
    else:
        ok = run()
        if not ok:
            avisar_fallo()
        sys.exit(0 if ok else 1)
