"""Libro DCA: API mínima sobre SQLite para registrar compras de Bitcoin."""
import csv
import io
import json
import math
import os
import re
import sqlite3
import threading
import time
import urllib.request
from datetime import date, timedelta

from flask import Flask, Response, g, jsonify, request, send_from_directory

DB_PATH = os.environ.get("DB_PATH", "/data/libro.db")
PRICE_TTL = int(os.environ.get("PRICE_TTL", "30"))          # segundos entre consultas al exchange
PRICE_MAX_STALE = int(os.environ.get("PRICE_MAX_STALE", "900"))  # cuánto se sirve un precio viejo si falla la red

app = Flask(__name__, static_folder="static", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

SCHEMA = """
CREATE TABLE IF NOT EXISTS compras (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha  TEXT    NOT NULL CHECK (fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  monto  REAL    NOT NULL CHECK (monto > 0),
  precio REAL    NOT NULL CHECK (precio > 0),
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras (fecha);
"""

MIGRACIONES = (
    # sats recibidos (entero exacto); el precio se deriva de monto y sats
    ("sats", "ALTER TABLE compras ADD COLUMN sats INTEGER CHECK (sats IS NULL OR sats > 0)"),
)

CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; "
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
)


# ---------------------------------------------------------------- base de datos
def connect():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=FULL")  # prioriza no perder datos sobre velocidad
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(compras)")}
        for col, ddl in MIGRACIONES:
            if col not in cols:
                conn.execute(ddl)
        # compras anteriores: sats estimados a partir de monto y precio
        conn.execute("UPDATE compras SET sats = MAX(1, CAST(ROUND(monto / precio * 100000000) AS INTEGER)) WHERE sats IS NULL")
        conn.commit()
    finally:
        conn.close()


def db():
    if "db" not in g:
        g.db = connect()
    return g.db


@app.teardown_appcontext
def _close_db(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


COLS = "id, fecha, monto, precio, sats, creado"


def fila(row):
    return {k: row[k] for k in ("id", "fecha", "monto", "precio", "sats", "creado")}


# ------------------------------------------------------------------ validación
def _num(v, nombre):
    ok = (
        not isinstance(v, bool)
        and isinstance(v, (int, float))
        and math.isfinite(v)
        and 0 < v < 1e9
    )
    if not ok:
        raise ValueError(f"{nombre} inválido.")
    return round(float(v), 8)


def parse_compra(body):
    if not isinstance(body, dict):
        raise ValueError("Solicitud inválida.")
    fecha = body.get("fecha")
    if not isinstance(fecha, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", fecha):
        raise ValueError("Fecha inválida.")
    try:
        d = date.fromisoformat(fecha)
    except ValueError:
        raise ValueError("Fecha inválida.") from None
    if d > date.today() + timedelta(days=1):  # un día de margen por zonas horarias
        raise ValueError("La fecha no puede ser futura.")
    monto = _num(body.get("monto"), "Monto")
    if body.get("sats") is not None:
        s = body["sats"]
        if isinstance(s, float) and s.is_integer():
            s = int(s)
        if isinstance(s, bool) or not isinstance(s, int) or not 0 < s < 10**13:
            raise ValueError("Sats inválidos. Usa un número entero.")
        precio = monto * 1e8 / s
        if not math.isfinite(precio) or not 0 < precio < 1e9:
            raise ValueError("Esos sats no cuadran con el monto.")
        return fecha, monto, precio, s
    precio = _num(body.get("precio"), "Precio")  # compatibilidad (importar.py, clientes viejos)
    return fecha, monto, precio, max(1, round(monto / precio * 1e8))


# ------------------------------------------------------------------------ rutas
@app.get("/")
def inicio():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/healthz")
def healthz():
    db().execute("SELECT 1").fetchone()
    return jsonify(ok=True)


@app.get("/api/compras")
def listar():
    rows = db().execute("SELECT " + COLS + " FROM compras ORDER BY fecha, id").fetchall()
    return jsonify([fila(r) for r in rows])


@app.post("/api/compras")
def crear():
    try:
        fecha, monto, precio, sats = parse_compra(request.get_json(silent=True))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    cur = conn.execute(
        "INSERT INTO compras (fecha, monto, precio, sats, creado) VALUES (?, ?, ?, ?, ?)",
        (fecha, monto, precio, sats, int(time.time() * 1000)),
    )
    conn.commit()
    row = conn.execute("SELECT " + COLS + " FROM compras WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(fila(row)), 201


@app.put("/api/compras/<int:cid>")
def editar(cid):
    try:
        fecha, monto, precio, sats = parse_compra(request.get_json(silent=True))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    cur = conn.execute("UPDATE compras SET fecha = ?, monto = ?, precio = ?, sats = ? WHERE id = ?", (fecha, monto, precio, sats, cid))
    conn.commit()
    if cur.rowcount == 0:
        return jsonify(error="La compra no existe."), 404
    row = conn.execute("SELECT " + COLS + " FROM compras WHERE id = ?", (cid,)).fetchone()
    return jsonify(fila(row))


@app.delete("/api/compras/<int:cid>")
def borrar(cid):
    conn = db()
    cur = conn.execute("DELETE FROM compras WHERE id = ?", (cid,))
    conn.commit()
    if cur.rowcount == 0:
        return jsonify(error="La compra no existe."), 404
    return "", 204


def _fmt(x):
    return ("%.8f" % x).rstrip("0").rstrip(".")


@app.get("/api/export.csv")
def exportar():
    rows = db().execute("SELECT fecha, monto, precio, sats FROM compras ORDER BY fecha, id").fetchall()
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(["fecha", "monto_usd", "precio_btc_usd", "sats", "btc"])
    for r in rows:
        w.writerow([r["fecha"], _fmt(r["monto"]), _fmt(r["precio"]), r["sats"], "%.8f" % (r["sats"] / 1e8)])
    nombre = "compras-btc-%s.csv" % date.today().isoformat()
    return Response(
        out.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": 'attachment; filename="%s"' % nombre},
    )


# ------------------------------------------------------------ precio de Bitcoin
FUENTES = (
    ("Coinbase", "https://api.coinbase.com/v2/prices/BTC-USD/spot", lambda j: float(j["data"]["amount"])),
    ("Kraken", "https://api.kraken.com/0/public/Ticker?pair=XBTUSD", lambda j: float(next(iter(j["result"].values()))["c"][0])),
)
_precio = {"precio": None, "ts": 0.0, "fuente": None}
_candado = threading.Lock()


def consultar_precio():
    for nombre, url, extraer in FUENTES:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "libro-dca/1.0", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as r:
                p = extraer(json.load(r))
            if math.isfinite(p) and p > 0:
                return p, nombre
        except Exception:
            continue
    return None, None


@app.get("/api/precio")
def precio():
    ahora = time.time()
    with _candado:
        if not _precio["precio"] or ahora - _precio["ts"] >= PRICE_TTL:
            p, fuente = consultar_precio()
            if p:
                _precio.update(precio=p, ts=time.time(), fuente=fuente)
        edad = ahora - _precio["ts"]
        if not _precio["precio"] or edad > PRICE_MAX_STALE:
            return jsonify(error="No se pudo obtener el precio."), 503
        return jsonify(
            precio=_precio["precio"],
            fuente=_precio["fuente"],
            ts=int(_precio["ts"] * 1000),
            viejo=edad >= PRICE_TTL * 3,
        )


@app.after_request
def cabeceras(resp):
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/") else "no-cache"
    return resp


init_db()
