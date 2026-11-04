"""Libro DCA: API mínima sobre SQLite para registrar compras de Bitcoin."""
from __future__ import annotations

import csv
import io
import json
import math
import mimetypes
import os
import re
import sqlite3
import threading
import time
import urllib.request
from datetime import UTC, date, datetime, timedelta
from typing import Any, Callable

from flask import Flask, Response, g, jsonify, request, send_from_directory

DB_PATH = os.environ.get("DB_PATH", "/data/libro.db")
PRICE_TTL = int(os.environ.get("PRICE_TTL", "30"))               # segundos entre consultas al exchange
PRICE_MAX_STALE = int(os.environ.get("PRICE_MAX_STALE", "900"))  # cuánto se sirve un precio viejo si falla la red
HIST_MAX_DIAS = 3660        # el histórico se pide como mucho 10 años atrás
HIST_BLOQUEO_S = 180        # caducidad del candado de descarga (por si un proceso muere a medias)
HIST_ESPERA_FALLO_S = 600   # tras un fallo de los exchanges, nadie reintenta en este tiempo

# Algunas imágenes base no traen el tipo de .woff2 y lo servirían como octet-stream.
mimetypes.add_type("font/woff2", ".woff2")

app = Flask(__name__, static_folder="static", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024  # el CSV de importación es lo más grande que llega

SCHEMA = """
CREATE TABLE IF NOT EXISTS compras (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha  TEXT    NOT NULL CHECK (fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  monto  REAL    NOT NULL CHECK (monto > 0),
  precio REAL    NOT NULL CHECK (precio > 0),
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras (fecha);
CREATE TABLE IF NOT EXISTS precios (
  fecha  TEXT PRIMARY KEY CHECK (fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  cierre REAL NOT NULL CHECK (cierre > 0)
);
CREATE TABLE IF NOT EXISTS meta (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
"""

MIGRACIONES = (
    ("sats", "ALTER TABLE compras ADD COLUMN sats INTEGER CHECK (sats IS NULL OR sats > 0)"),
)

CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; "
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
)

COLS = "id, fecha, monto, precio, sats, creado"
GENESIS = date(2009, 1, 3)
Compra = tuple[str, float, float, int]  # fecha, monto, precio, sats


# ---------------------------------------------------------------- base de datos
def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=FULL")  # prioriza no perder datos sobre velocidad
    return conn


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(compras)")}
        for col, ddl in MIGRACIONES:
            if col not in cols:
                conn.execute(ddl)
        # filas de antes de guardar sats: se estiman con monto y precio
        conn.execute(
            "UPDATE compras SET sats = MAX(1, CAST(ROUND(monto / precio * 100000000) AS INTEGER)) WHERE sats IS NULL"
        )
        conn.commit()
    finally:
        conn.close()


def db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = connect()
    return g.db


@app.teardown_appcontext
def _close_db(_exc: BaseException | None) -> None:
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def fila(row: sqlite3.Row) -> dict[str, Any]:
    return {k: row[k] for k in ("id", "fecha", "monto", "precio", "sats", "creado")}


def insertar(conn: sqlite3.Connection, c: Compra) -> int:
    fecha, monto, precio, sats = c
    cur = conn.execute(
        "INSERT INTO compras (fecha, monto, precio, sats, creado) VALUES (?, ?, ?, ?, ?)",
        (fecha, monto, precio, sats, int(time.time() * 1000)),
    )
    return int(cur.lastrowid or 0)


# ------------------------------------------------------------------ validación
def _num(v: Any, nombre: str) -> float:
    ok = not isinstance(v, bool) and isinstance(v, (int, float)) and math.isfinite(v) and 0 < v < 1e9
    if not ok:
        raise ValueError(f"{nombre} inválido.")
    return round(float(v), 8)


def parse_compra(body: Any) -> Compra:
    """Valida {fecha, monto, sats} o, por compatibilidad, {fecha, monto, precio}."""
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
    if d < GENESIS:
        raise ValueError("La fecha es anterior a bitcoin.")
    monto = _num(body.get("monto"), "Monto")
    if body.get("sats") is not None:
        s = body["sats"]
        if isinstance(s, float) and s.is_integer():
            s = int(s)
        if isinstance(s, bool) or not isinstance(s, int) or not 0 < s < 10**13:
            raise ValueError("Sats inválidos. Usa un número entero.")
        precio = monto * 1e8 / s
        if not 0 < precio < 1e9:
            raise ValueError("Esos sats no cuadran con el monto.")
        return fecha, monto, precio, s
    precio = _num(body.get("precio"), "Precio")
    return fecha, monto, precio, max(1, round(monto / precio * 1e8))


def _decimal(v: str | None, nombre: str) -> float:
    try:
        return float((v or "").strip())
    except ValueError:
        raise ValueError(f"{nombre} inválido.") from None


def importar_csv(conn: sqlite3.Connection, texto: str) -> dict[str, Any]:
    """Importa un CSV como el de /api/export.csv. Salta filas inválidas y repetidas,
    así que se puede importar el mismo archivo varias veces sin duplicar."""
    lector = csv.DictReader(io.StringIO(texto.lstrip("﻿")))
    campos = {c.strip() for c in lector.fieldnames or []}
    if "fecha" not in campos or not campos & {"monto_usd", "monto"}:
        raise ValueError("El CSV necesita las columnas fecha y monto_usd.")
    nuevas = repetidas = 0
    omitidas: list[str] = []
    for n, row in enumerate(lector, start=2):
        row = {(k or "").strip(): v for k, v in row.items()}
        try:
            body: dict[str, Any] = {
                "fecha": (row.get("fecha") or "").strip(),
                "monto": _decimal(row.get("monto_usd") or row.get("monto"), "Monto"),
            }
            if (row.get("sats") or "").strip():
                body["sats"] = _decimal(row["sats"], "Sats")  # parse_compra rechaza los no enteros
            else:
                body["precio"] = _decimal(row.get("precio_btc_usd") or row.get("precio"), "Precio")
            c = parse_compra(body)
        except ValueError as e:
            omitidas.append(f"Línea {n}: {e}")
            continue
        fecha, monto, precio, sats = c
        # las filas viejas tienen sats estimados, así que también vale coincidir en precio
        existe = conn.execute(
            "SELECT 1 FROM compras WHERE fecha = ? AND abs(monto - ?) < 1e-6 AND (sats = ? OR abs(precio - ?) < 1e-6 * ?)",
            (fecha, monto, sats, precio, precio),
        ).fetchone()
        if existe:
            repetidas += 1
            continue
        insertar(conn, c)
        nuevas += 1
    conn.commit()
    return {"nuevas": nuevas, "repetidas": repetidas, "omitidas": omitidas}


# ------------------------------------------------------------------------ rutas
@app.before_request
def mismo_origen() -> Any:
    # Defensa extra contra CSRF: el navegador marca las peticiones de otros sitios.
    if request.method not in ("GET", "HEAD") and request.headers.get("Sec-Fetch-Site", "same-origin") not in ("same-origin", "none"):
        return jsonify(error="Origen no permitido."), 403
    return None


@app.get("/")
def inicio() -> Response:
    return send_from_directory(app.static_folder or "static", "index.html")


@app.get("/healthz")
def healthz() -> Response:
    db().execute("SELECT 1").fetchone()
    return jsonify(ok=True)


@app.get("/api/compras")
def listar() -> Response:
    rows = db().execute(f"SELECT {COLS} FROM compras ORDER BY fecha, id").fetchall()
    return jsonify([fila(r) for r in rows])


@app.post("/api/compras")
def crear() -> Any:
    try:
        c = parse_compra(request.get_json(silent=True))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    cid = insertar(conn, c)
    conn.commit()
    return jsonify(fila(conn.execute(f"SELECT {COLS} FROM compras WHERE id = ?", (cid,)).fetchone())), 201


@app.put("/api/compras/<int:cid>")
def editar(cid: int) -> Any:
    try:
        fecha, monto, precio, sats = parse_compra(request.get_json(silent=True))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    cur = conn.execute(
        "UPDATE compras SET fecha = ?, monto = ?, precio = ?, sats = ? WHERE id = ?", (fecha, monto, precio, sats, cid)
    )
    conn.commit()
    if cur.rowcount == 0:
        return jsonify(error="La compra no existe."), 404
    return jsonify(fila(conn.execute(f"SELECT {COLS} FROM compras WHERE id = ?", (cid,)).fetchone()))


@app.delete("/api/compras/<int:cid>")
def borrar(cid: int) -> Any:
    conn = db()
    cur = conn.execute("DELETE FROM compras WHERE id = ?", (cid,))
    conn.commit()
    if cur.rowcount == 0:
        return jsonify(error="La compra no existe."), 404
    return "", 204


def _fmt(x: float) -> str:
    # 15 cifras significativas: sin el ruido de coma flotante de los montos grandes.
    s = f"{x:.15g}"
    return s if "e" not in s else ("%.8f" % x).rstrip("0").rstrip(".")


@app.get("/api/export.csv")
def exportar() -> Response:
    rows = db().execute("SELECT fecha, monto, precio, sats FROM compras ORDER BY fecha, id").fetchall()
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(["fecha", "monto_usd", "precio_btc_usd", "sats", "btc"])
    for r in rows:
        w.writerow([r["fecha"], _fmt(r["monto"]), _fmt(r["precio"]), r["sats"], "%.8f" % (r["sats"] / 1e8)])
    return Response(
        out.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="compras-btc-{date.today().isoformat()}.csv"'},
    )


@app.post("/api/import")
def importar() -> Any:
    # Exigir text/csv obliga a un preflight CORS si otro sitio intenta enviarlo.
    if request.mimetype != "text/csv":
        return jsonify(error="Envía el archivo como text/csv."), 415
    try:
        return jsonify(importar_csv(db(), request.get_data(as_text=True)))
    except ValueError as e:
        return jsonify(error=str(e)), 400


# ------------------------------------------------------------ precio de Bitcoin
FUENTES: tuple[tuple[str, str, Callable[[Any], float]], ...] = (
    ("Coinbase", "https://api.coinbase.com/v2/prices/BTC-USD/spot", lambda j: float(j["data"]["amount"])),
    ("Kraken", "https://api.kraken.com/0/public/Ticker?pair=XBTUSD", lambda j: float(next(iter(j["result"].values()))["c"][0])),
)
_precio: dict[str, Any] = {"precio": None, "ts": 0.0, "fuente": None}
_candado = threading.Lock()


def _get_json(url: str, timeout: float = 8) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "libro-dca/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def consultar_precio() -> tuple[float | None, str | None]:
    for nombre, url, extraer in FUENTES:
        try:
            p = extraer(_get_json(url, timeout=5))
            if math.isfinite(p) and p > 0:
                return p, nombre
        except Exception:
            continue
    return None, None


@app.get("/api/precio")
def precio() -> Any:
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


# ------------------------------------------------------- histórico de precios
# Cierres diarios en UTC (así vienen las velas). Se descargan en un hilo de fondo:
# el primer relleno son varias peticiones y no debe bloquear a los workers.
CB_VELAS = "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400&start={a}T00:00:00Z&end={b}T23:59:59Z"
KR_VELAS = "https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440&since={ts}"
_hist_hilo = threading.Lock()


def _hoy_utc() -> date:
    return datetime.now(UTC).date()


def _dia_utc(ts: float) -> str:
    return datetime.fromtimestamp(ts, UTC).date().isoformat()


def _meta(conn: sqlite3.Connection, clave: str) -> str | None:
    row = conn.execute("SELECT valor FROM meta WHERE clave = ?", (clave,)).fetchone()
    return row["valor"] if row else None


def _meta_poner(conn: sqlite3.Connection, clave: str, valor: str) -> None:
    conn.execute("INSERT INTO meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor", (clave, valor))


def velas_coinbase(a: date, b: date) -> list[tuple[str, float]]:
    out = []
    ini = a
    while ini <= b:  # Coinbase devuelve como mucho 300 velas por petición
        fin = min(b, ini + timedelta(days=299))
        for v in _get_json(CB_VELAS.format(a=ini.isoformat(), b=fin.isoformat())):
            out.append((_dia_utc(v[0]), float(v[4])))
        ini = fin + timedelta(days=1)
    return out


def velas_kraken(a: date, b: date) -> list[tuple[str, float]]:
    # Kraken solo da las últimas 720 velas: sirve de reserva para lo reciente.
    j = _get_json(KR_VELAS.format(ts=int(datetime(a.year, a.month, a.day, tzinfo=UTC).timestamp())))
    if j.get("error"):
        raise ValueError(str(j["error"]))
    filas = next(v for k, v in j["result"].items() if k != "last")
    desde, hasta = a.isoformat(), b.isoformat()
    return [(d, float(f[4])) for f in filas if desde <= (d := _dia_utc(f[0])) <= hasta]


def descargar_velas(a: date, b: date) -> tuple[list[tuple[str, float]], bool]:
    """Velas del tramo y si el tramo quedó completo (Kraken solo llega a ~2 años atrás)."""
    try:
        return velas_coinbase(a, b), True
    except Exception:
        filas = velas_kraken(a, b)
        return filas, bool(filas) and filas[0][0] <= (a + timedelta(days=3)).isoformat()


def huecos_historico(conn: sqlite3.Connection, desde: date, hoy: date) -> list[tuple[date, date]]:
    cubierto, dia = _meta(conn, "hist_desde"), _meta(conn, "hist_dia")
    if not cubierto or not dia:
        return [(desde, hoy)]
    out = []
    c = date.fromisoformat(cubierto)
    if desde < c:
        out.append((desde, c - timedelta(days=1)))
    if dia != hoy.isoformat():  # la vela de hoy cambia: se repasan los últimos días
        out.append((date.fromisoformat(dia) - timedelta(days=2), hoy))
    return out


def _tomar_candado() -> str:
    """Devuelve 'tomado', 'ocupado' (otro proceso descarga) o 'espera' (falló hace poco)."""
    conn = connect()
    try:
        conn.execute("BEGIN IMMEDIATE")  # serializa a todos los workers sobre la misma base
        ahora = time.time()
        if float(_meta(conn, "hist_bloqueo") or 0) > ahora:
            conn.rollback()
            return "ocupado"
        if float(_meta(conn, "hist_fallo") or 0) > ahora:
            conn.rollback()
            return "espera"
        _meta_poner(conn, "hist_bloqueo", str(ahora + HIST_BLOQUEO_S))
        conn.commit()
        return "tomado"
    finally:
        conn.close()


def _rellenar(desde: date) -> None:
    """Corre en un hilo: cualquier error se anota como fallo y el candado se suelta siempre."""
    conn = None
    completo = False
    try:
        conn = connect()
        hoy = _hoy_utc()
        cubre = desde
        completo = True
        for a, b in huecos_historico(conn, desde, hoy):
            filas, tramo_completo = descargar_velas(a, b)
            conn.executemany(
                "INSERT INTO precios (fecha, cierre) VALUES (?, ?) ON CONFLICT(fecha) DO UPDATE SET cierre = excluded.cierre",
                [f for f in filas if f[1] > 0 and math.isfinite(f[1])],
            )
            conn.commit()
            if not tramo_completo:
                # Solo se da por cubierto lo que de verdad llegó; el resto se reintenta más tarde.
                completo = False
                cubre = max(cubre, date.fromisoformat(filas[0][0])) if filas else max(cubre, b + timedelta(days=1))
        cubierto = _meta(conn, "hist_desde")
        _meta_poner(conn, "hist_desde", min(cubre.isoformat(), cubierto or cubre.isoformat()))
        _meta_poner(conn, "hist_dia", hoy.isoformat())
        conn.commit()
    except Exception:
        completo = False
    finally:
        try:
            c = conn or connect()
            if not completo:
                _meta_poner(c, "hist_fallo", str(time.time() + HIST_ESPERA_FALLO_S))
            _meta_poner(c, "hist_bloqueo", "0")
            c.commit()
            c.close()
        except Exception:
            pass  # sin base no hay nada que soltar: el candado caduca solo


def _lanzar_relleno(desde: date) -> str:
    with _hist_hilo:
        estado = _tomar_candado()
        if estado == "tomado":
            threading.Thread(target=_rellenar, args=(desde,), daemon=True).start()
        return estado


@app.get("/api/historico")
def historico() -> Any:
    hoy = _hoy_utc()
    txt = request.args.get("desde") or (hoy - timedelta(days=365)).isoformat()
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", txt):
            raise ValueError
        desde = date.fromisoformat(txt)
    except ValueError:
        return jsonify(error="Fecha inválida. Usa AAAA-MM-DD."), 400
    if desde > hoy:
        return jsonify(error="La fecha no puede ser futura."), 400
    if (hoy - desde).days > HIST_MAX_DIAS:
        return jsonify(error="Como mucho 10 años de histórico."), 400
    conn = db()
    cargando = False
    pendiente = bool(huecos_historico(conn, desde, hoy))
    if pendiente:
        cargando = _lanzar_relleno(desde) in ("tomado", "ocupado")
    rows = conn.execute("SELECT fecha, cierre FROM precios WHERE fecha >= ? ORDER BY fecha", (desde.isoformat(),)).fetchall()
    if not rows and not cargando:
        return jsonify(error="El histórico de precios no está disponible ahora."), 503
    resp = jsonify(
        desde=desde.isoformat(),
        precios=[[r["fecha"], round(r["cierre"], 2)] for r in rows],
        cargando=cargando,
        desactualizado=pendiente and not cargando,
    )
    if not pendiente:
        resp.headers["Cache-Control"] = "private, max-age=600"
    return resp


@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(413)
@app.errorhandler(500)
def error_http(e: Any) -> Any:
    # En la API, errores en JSON y sin detalles internos; en el resto, el texto estándar.
    codigo = getattr(e, "code", 500) or 500
    if not request.path.startswith("/api/"):
        return e if codigo != 500 else ("Error interno.", 500)
    mensajes = {404: "No existe.", 405: "Método no permitido.", 413: "El envío es demasiado grande.", 500: "Error interno."}
    return jsonify(error=mensajes.get(codigo, "Error.")), codigo


@app.after_request
def cabeceras(resp: Response) -> Response:
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    if "Cache-Control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/") else "no-cache"
    return resp


init_db()
