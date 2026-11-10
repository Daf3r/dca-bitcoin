"""Libro DCA: API mínima sobre SQLite para registrar compras de Bitcoin."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import mimetypes
import os
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from datetime import UTC, date, datetime, timedelta
from collections.abc import Callable
from typing import Any

from flask import Flask, Response, g, jsonify, redirect, request
from werkzeug.middleware.proxy_fix import ProxyFix

import auth
import push
import ritmo

DB_PATH = os.environ.get("DB_PATH", "/data/libro.db")
PRICE_TTL = int(os.environ.get("PRICE_TTL", "30"))               # segundos entre consultas al exchange
PRICE_MAX_STALE = int(os.environ.get("PRICE_MAX_STALE", "900"))  # cuánto se sirve un precio viejo si falla la red
HIST_MAX_DIAS = 3660        # el histórico se pide como mucho 10 años atrás
HIST_BLOQUEO_S = 180        # caducidad del candado de descarga (por si un proceso muere a medias)
HIST_ESPERA_FALLO_S = 600   # tras un fallo de los exchanges, nadie reintenta en este tiempo

# Algunas imágenes base no traen el tipo de .woff2 y lo servirían como octet-stream.
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("application/manifest+json", ".webmanifest")

app = Flask(__name__, static_folder="static", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024  # el CSV de importación es lo más grande que llega
# Caddy habla con la app por HTTP local: el esquema real viene en X-Forwarded-Proto.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=0, x_proto=1, x_host=0)  # type: ignore[method-assign]
COOKIE = "__Host-sesion"
# La IP real solo se cree si Caddy la pone (sobrescribiendo lo que mande el cliente) y así se
# declara; si no, el límite por IP se desactiva en vez de meter a todos en el mismo saco.
CONFIAR_IP = os.environ.get("CONFIAR_X_CLIENTE_IP") == "1"
_scrypt_sem = threading.BoundedSemaphore(2)  # verificaciones simultáneas por proceso
if not CONFIAR_IP:
    print("aviso: CONFIAR_X_CLIENTE_IP no está activo; el límite de intentos por IP queda desactivado", flush=True)

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
-- Caché de la verificación de TXID en mempool.space: una confirmada no cambia, una pendiente se revisa cada minuto.
CREATE TABLE IF NOT EXISTS tx_cache (
  txid   TEXT PRIMARY KEY CHECK (length(txid) = 64),
  estado TEXT NOT NULL CHECK (estado IN ('confirmada', 'pendiente', 'no_encontrada')),
  bloque INTEGER, fee INTEGER, hora INTEGER,
  ts     INTEGER NOT NULL
);
-- Traslados entre el exchange y tu wallet: dónde están los sats. No cambian el saldo total ni el costo promedio.
CREATE TABLE IF NOT EXISTS traslados (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT    NOT NULL CHECK (fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  sats        INTEGER NOT NULL CHECK (sats > 0),
  sentido     TEXT    NOT NULL DEFAULT 'a_wallet' CHECK (sentido IN ('a_wallet', 'a_exchange')),
  txid        TEXT    CHECK (txid IS NULL OR length(txid) = 64),
  nota        TEXT    CHECK (nota IS NULL OR length(nota) <= 120),
  creado      INTEGER NOT NULL,
  anulada_ts  INTEGER,
  anulada_por TEXT
);
"""

MIGRACIONES = (
    ("sats", "ALTER TABLE compras ADD COLUMN sats INTEGER CHECK (sats IS NULL OR sats > 0)"),
    ("anulada_ts", "ALTER TABLE compras ADD COLUMN anulada_ts INTEGER"),
    ("anulada_por", "ALTER TABLE compras ADD COLUMN anulada_por TEXT"),
    ("txid", "ALTER TABLE compras ADD COLUMN txid TEXT CHECK (txid IS NULL OR length(txid) = 64)"),
    ("tipo", "ALTER TABLE compras ADD COLUMN tipo TEXT NOT NULL DEFAULT 'compra' CHECK (tipo IN ('compra', 'venta'))"),
    ("nota", "ALTER TABLE compras ADD COLUMN nota TEXT CHECK (nota IS NULL OR length(nota) <= 120)"),
    # Compra extra (por una caída): se muestra aparte y no cuenta como tu ritmo habitual. Solo compras.
    ("extra", "ALTER TABLE compras ADD COLUMN extra INTEGER NOT NULL DEFAULT 0 CHECK (extra IN (0, 1))"),
)
VIGENTES = "anulada_ts IS NULL"

CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; "
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
)

COLS = "id, fecha, monto, precio, sats, creado, txid, tipo, nota, extra"
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
        conn.executescript(auth.SCHEMA)
        conn.executescript(push.SCHEMA)
        if "sus_id" not in {r["name"] for r in conn.execute("PRAGMA table_info(avisos_pendientes)")}:
            conn.execute("ALTER TABLE avisos_pendientes ADD COLUMN sus_id INTEGER")
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(compras)")}
        for col, ddl in MIGRACIONES:
            if col not in cols:
                conn.execute(ddl)
        # «Novedades»: cuándo vio cada persona el resumen por última vez (en bases anteriores, se añade aquí)
        if "visto_ts" not in {r["name"] for r in conn.execute("PRAGMA table_info(usuarios)")}:
            conn.execute("ALTER TABLE usuarios ADD COLUMN visto_ts INTEGER")
        # «Qué hay de nuevo»: el último aviso de cambios que vio cada persona. Las cuentas que ya existen al añadir la columna
        # quedan en '0' (verán el primero); las nuevas empiezan en NULL (no han visto nada que haya cambiado: se marca en silencio).
        if "cambios_visto" not in {r["name"] for r in conn.execute("PRAGMA table_info(usuarios)")}:
            conn.execute("ALTER TABLE usuarios ADD COLUMN cambios_visto TEXT")
            conn.execute("UPDATE usuarios SET cambios_visto = '0'")
        conn.execute("CREATE INDEX IF NOT EXISTS compras_txid ON compras (txid) WHERE txid IS NOT NULL")
        # filas de antes de guardar sats: se estiman con monto y precio
        conn.execute(
            "UPDATE compras SET sats = MAX(1, CAST(ROUND(monto / precio * 100000000) AS INTEGER)) WHERE sats IS NULL"
        )
        conn.commit()
    finally:
        conn.close()
    try:
        push.asegurar_clave()
    except Exception as e:  # noqa: BLE001 — sin la librería o sin permisos, la app sigue; solo no hay avisos
        print(f"push: sin clave VAPID, los avisos no estarán disponibles ({type(e).__name__}: {e})", flush=True)


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
    return {**{k: row[k] for k in ("id", "fecha", "monto", "precio", "sats", "creado", "txid", "tipo", "nota")}, "extra": bool(row["extra"])}


def insertar(conn: sqlite3.Connection, c: Compra, txid: str | None = None, tipo: str = "compra", nota: str | None = None,
             extra: int = 0) -> int:
    fecha, monto, precio, sats = c
    cur = conn.execute(
        "INSERT INTO compras (fecha, monto, precio, sats, creado, txid, tipo, nota, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (fecha, monto, precio, sats, int(time.time() * 1000), txid, tipo, nota, extra),
    )
    return int(cur.lastrowid or 0)


# Un movimiento es una compra (suma sats) o una venta o gasto (resta sats). Mismo orden que el frontend:
# por fecha y, dentro del mismo día, las compras antes que las ventas.
Mov = tuple[str, int, str, int]  # fecha, id, tipo, sats


def movimientos(conn: sqlite3.Connection) -> list[Mov]:
    return [(r["fecha"], r["id"], r["tipo"], r["sats"]) for r in
            conn.execute(f"SELECT fecha, id, tipo, sats FROM compras WHERE {VIGENTES}")]


def saldo_negativo(movs: list[Mov]) -> str | None:
    """Fecha del primer movimiento que deja el saldo en negativo, o None si todo cuadra."""
    saldo = 0
    for fecha, _id, tipo, sats in sorted(movs, key=lambda m: (m[0], m[2] == "venta", m[1])):
        saldo += -sats if tipo == "venta" else sats
        if saldo < 0:
            return fecha
    return None


# ------------------------------------------------------------------ traslados
# Un traslado mueve sats entre el exchange y tu wallet. `sats` es lo que LLEGÓ a destino: si pagaste comisión de red,
# se anota aparte como un gasto. Dónde están los sats = lo trasladado a tu wallet (neto) frente al saldo total.
Tras = tuple[str, int, str, int]  # fecha, id, sentido, sats


def parse_sentido(v: Any) -> str:
    if v is None or v == "":
        return "a_wallet"
    if v not in ("a_wallet", "a_exchange"):
        raise ValueError("Sentido inválido: a_wallet o a_exchange.")
    return str(v)


def parse_fecha(v: Any) -> str:
    if not isinstance(v, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        raise ValueError("Fecha inválida.")
    try:
        d = date.fromisoformat(v)
    except ValueError:
        raise ValueError("Fecha inválida.") from None
    if d > date.today() + timedelta(days=1):  # un día de margen por zonas horarias
        raise ValueError("La fecha no puede ser futura.")
    if d < GENESIS:
        raise ValueError("La fecha es anterior a bitcoin.")
    return v


def parse_sats(v: Any) -> int:
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    if isinstance(v, bool) or not isinstance(v, int) or not 0 < v < 10**13:
        raise ValueError("Sats inválidos. Usa un número entero.")
    return v


def fila_traslado(row: sqlite3.Row) -> dict[str, Any]:
    return {k: row[k] for k in ("id", "fecha", "sats", "sentido", "txid", "nota", "creado")}


def traslados_vigentes(conn: sqlite3.Connection) -> list[Tras]:
    return [(r["fecha"], r["id"], r["sentido"], r["sats"]) for r in
            conn.execute("SELECT fecha, id, sentido, sats FROM traslados WHERE anulada_ts IS NULL")]


def falla_traslados(conn: sqlite3.Connection, tras: list[Tras]) -> str | None:
    """Mensaje de error si los traslados no cuadran: la wallet no puede quedar en negativo ni tener más sats de los
    que posees en total ese día. None si todo cuadra."""
    movs = movimientos(conn)
    wallet = 0
    for fecha, _id, sentido, sats in sorted(tras, key=lambda t: (t[0], t[1])):
        wallet += sats if sentido == "a_wallet" else -sats
        if wallet < 0:
            return f"No tienes tantos sats en tu wallet (el {fecha})."
        total = sum(-s if tipo == "venta" else s for f, _i, tipo, s in movs if f <= fecha)
        if sentido == "a_wallet" and wallet > total:
            return f"No tienes tantos sats en total (el {fecha})."
    return None


def _error_saldo(fecha: str) -> str:
    return f"No alcanzan los sats: el {fecha} el saldo quedaría negativo."


def txid_repetido(conn: sqlite3.Connection, txid: str | None, excepto: int = 0) -> list[int]:
    """Ids de otras compras vigentes con el mismo TXID (se avisa, no se rechaza)."""
    if not txid:
        return []
    return [r["id"] for r in conn.execute(
        f"SELECT id FROM compras WHERE txid = ? AND id != ? AND {VIGENTES} ORDER BY id", (txid, excepto))]


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


def parse_txid(v: Any) -> str | None:
    """TXID opcional: 64 caracteres hexadecimales. También se acepta pegar un enlace de un explorador
    (mempool.space, blockstream…): se saca el TXID de la dirección. Vacío o None = sin TXID."""
    if v is None:
        return None
    if not isinstance(v, str) or len(v) > 400:
        raise ValueError("TXID inválido.")
    t = v.strip()
    if not t:
        return None
    if re.match(r"https?://", t, re.I):
        m = re.search(r"(?<![0-9a-fA-F])[0-9a-fA-F]{64}(?![0-9a-fA-F])", t)
        if m:
            t = m.group(0)
    t = t.lower()
    if not re.fullmatch(r"[0-9a-f]{64}", t):
        raise ValueError("El TXID debe tener 64 caracteres hexadecimales (0-9 y a-f).")
    return t


def parse_tipo(v: Any) -> str:
    if v is None or v == "":
        return "compra"
    if v not in ("compra", "venta"):
        raise ValueError("Tipo inválido: compra o venta.")
    return str(v)


def parse_extra(v: Any, tipo: str = "compra") -> int:
    """¿Compra extra (por una caída)? Acepta true/false, 1/0 y, en el CSV, 1/si/sí/true/x. Solo las compras pueden serlo."""
    if isinstance(v, str):
        v = v.strip().lower()
        v = True if v in ("1", "si", "sí", "true", "x") else False if v in ("", "0", "no", "false") else v
    if v is None or v is False or (not isinstance(v, bool) and isinstance(v, (int, float)) and v == 0):
        return 0
    if v is True or (not isinstance(v, bool) and isinstance(v, (int, float)) and v == 1):
        if tipo != "compra":
            raise ValueError("Solo una compra puede ser extra.")
        return 1
    raise ValueError("Extra inválido: sí o no.")


def parse_nota(v: Any) -> str | None:
    """Nota opcional (hasta 120 caracteres, sin saltos de línea ni caracteres de control)."""
    if v is None:
        return None
    if not isinstance(v, str):
        raise ValueError("Nota inválida.")
    t = " ".join("".join(ch for ch in v if ch.isprintable() or ch in "\t\n").split())
    if len(t) > 120:
        raise ValueError("La nota admite hasta 120 caracteres.")
    return t or None


def _decimal(v: str | None, nombre: str) -> float:
    try:
        return float((v or "").strip())
    except ValueError:
        raise ValueError(f"{nombre} inválido.") from None


def importar_csv(conn: sqlite3.Connection, texto: str, usuario: str = "cli", ip: str | None = None) -> dict[str, Any]:
    """Importa un CSV como el de /api/export.csv. Salta filas inválidas y repetidas,
    así que se puede importar el mismo archivo varias veces sin duplicar. Las compras anuladas
    no cuentan como repetidas: si se anuló una por error, se puede volver a importar."""
    lector = csv.DictReader(io.StringIO(texto.lstrip("﻿")))
    campos = {c.strip() for c in lector.fieldnames or []}
    if "fecha" not in campos or not campos & {"monto_usd", "monto"}:
        raise ValueError("El CSV necesita las columnas fecha y monto_usd.")
    nuevas = repetidas = 0
    omitidas: list[str] = []
    ids: list[int] = []
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
            txid = parse_txid(row.get("txid"))
            tipo = parse_tipo((row.get("tipo") or "").strip().lower() or None)
            nota = parse_nota(row.get("nota"))
            extra = parse_extra(row.get("extra"), tipo)
        except ValueError as e:
            omitidas.append(f"Línea {n}: {e}")
            continue
        fecha, monto, precio, sats = c
        # las filas viejas tienen sats estimados, así que también vale coincidir en precio
        existe = conn.execute(
            f"SELECT 1 FROM compras WHERE {VIGENTES} AND tipo = ? AND fecha = ? AND abs(monto - ?) < 1e-6 AND (sats = ? OR abs(precio - ?) < 1e-6 * ?)",
            (tipo, fecha, monto, sats, precio, precio),
        ).fetchone()
        if existe:
            repetidas += 1
            continue
        ids.append(insertar(conn, c, txid, tipo, nota, extra))
        nuevas += 1
    resumen = {"nuevas": nuevas, "repetidas": repetidas, "omitidas": len(omitidas), "ids": ids[:500]}
    if nuevas and (falla := saldo_negativo(movimientos(conn))):
        conn.rollback()  # el archivo entero se rechaza: no se importa nada a medias
        raise ValueError(_error_saldo(falla))
    if nuevas:
        auth.auditar(conn, usuario, "importacion", "compra", None, None, resumen, ip)
    conn.commit()
    return {"nuevas": nuevas, "repetidas": repetidas, "omitidas": omitidas}


# ------------------------------------------------------------------------ rutas
ESCRITURA = ("POST", "PUT", "DELETE", "PATCH")
PUBLICAS = {"/healthz", "/login", "/api/login", "/api/estado"}
# El código de la página no es secreto: módulos, estilos, fuentes e icono se sirven sin sesión.
RECURSO_PUBLICO = re.compile(r"/(?:[\w-]+\.js|styles\.css|icon\.svg|manifest\.webmanifest|(?:icon-[\w-]+|apple-touch-icon)\.png|fonts/[\w.-]+)")


@app.before_request
def mismo_origen() -> Any:
    if request.method not in ESCRITURA:
        return None
    # Defensa contra CSRF: el navegador marca las peticiones de otros sitios, y una cabecera
    # propia obliga a un preflight CORS que el servidor nunca concede.
    if request.headers.get("Sec-Fetch-Site", "same-origin") not in ("same-origin", "none"):
        return jsonify(error="Origen no permitido."), 403
    if request.headers.get("X-Libro") != "1":
        return jsonify(error="Solicitud no permitida."), 403
    return None


def ip_real() -> str | None:
    if not CONFIAR_IP:
        return None
    ip = (request.headers.get("X-Cliente-IP") or "").strip()
    return ip if re.fullmatch(r"[0-9a-fA-F:.]{3,45}", ip) else None


def quien() -> str:
    u = g.get("usuario")
    return u["nombre"] if u else "?"


@app.before_request
def exigir_sesion() -> Any:
    ruta = request.path
    if ruta in PUBLICAS or (request.method in ("GET", "HEAD") and RECURSO_PUBLICO.fullmatch(ruta)):
        return None
    api = ruta.startswith("/api/")
    conn = db()
    if not auth.hay_usuarios(conn):
        # Sin cuentas no se abre nada: la pantalla de entrada explica cómo crear el primer admin.
        return (jsonify(error="Aún no hay cuentas. Crea el primer admin en el servidor."), 503) if api else redirect("/login")
    u = auth.sesion(conn, request.cookies.get(COOKIE))
    if not u:
        return (jsonify(error="Inicia sesión."), 401) if api else redirect("/login")
    g.usuario = u
    if request.method in ESCRITURA and u["rol"] != "admin" and ruta not in ("/api/logout", "/api/clave", "/api/visto", "/api/cambios-visto") \
            and not ruta.startswith("/api/push/"):
        return jsonify(error="Tu cuenta es de solo lectura."), 403
    return None


# ------------------------------------------------------- estáticos versionados
# Sin build: al servir, index.html, los módulos y el CSS llevan ?v=<hash del contenido> en sus
# referencias. Así una caché intermedia (Cloudflare) nunca mezcla HTML nuevo con JS o CSS viejos.
ESTATICOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


def _version() -> str:
    h = hashlib.sha256()
    for raiz, _, archivos in sorted(os.walk(ESTATICOS)):
        for nombre in sorted(archivos):
            ruta = os.path.join(raiz, nombre)
            h.update(os.path.relpath(ruta, ESTATICOS).encode())
            with open(ruta, "rb") as f:
                h.update(f.read())
    return h.hexdigest()[:12]


VERSION = _version()
_REF_JS = re.compile(r"""((?:from|import)\s*['"]\./[\w-]+\.js)(['"])""")
_REF_HTML = re.compile(r"""((?:href|src)="/(?:[\w-]+\.(?:js|css)|fonts/[\w-]+\.woff2))(")""")
_REF_CSS = re.compile(r"""(url\("/fonts/[\w-]+\.woff2)("\))""")


def _servir_versionado(nombre: str, tipo: str, patron: re.Pattern[str], cache: str) -> Any:
    ruta = os.path.join(ESTATICOS, nombre)
    with open(ruta, encoding="utf-8") as f:
        texto = patron.sub(rf"\1?v={VERSION}\2", f.read())
    resp = Response(texto, mimetype=tipo)
    resp.headers["Cache-Control"] = cache
    resp.set_etag(f"{VERSION}-{nombre}")
    return resp.make_conditional(request)


def _cache_recurso() -> str:
    # Con la versión vigente en la URL el contenido no cambia nunca; sin ella, se revalida.
    return "public, max-age=31536000, immutable" if request.args.get("v") == VERSION else "no-cache"


@app.get("/")
def inicio() -> Response:
    return _servir_versionado("index.html", "text/html", _REF_HTML, "no-cache")


@app.get("/<nombre>.js")
def modulo(nombre: str) -> Any:
    if not re.fullmatch(r"[\w-]+", nombre) or not os.path.isfile(os.path.join(ESTATICOS, f"{nombre}.js")):
        return jsonify(error="No existe."), 404
    return _servir_versionado(f"{nombre}.js", "text/javascript", _REF_JS, _cache_recurso())


@app.get("/styles.css")
def estilos() -> Response:
    return _servir_versionado("styles.css", "text/css", _REF_CSS, _cache_recurso())


# ---------------------------------------------------------------- cuentas
@app.get("/login")
def pantalla_login() -> Any:
    if auth.sesion(db(), request.cookies.get(COOKIE)):
        return redirect("/")
    return _servir_versionado("login.html", "text/html", _REF_HTML, "no-store")


@app.get("/api/estado")
def estado() -> Response:
    # Lo único público: si ya hay cuentas. No dice cuántas ni cuáles.
    return jsonify(abierto=auth.hay_usuarios(db()))


def _poner_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(COOKIE, token, max_age=auth.SESION_DESLIZANTE, path="/", secure=True, httponly=True, samesite="Lax")


@app.post("/api/login")
def login() -> Any:
    body: Any = request.get_json(silent=True)
    nombre = body.get("usuario") if isinstance(body, dict) else None
    clave = body.get("clave") if isinstance(body, dict) else None
    if not isinstance(nombre, str) or not isinstance(clave, str) or not 0 < len(nombre) <= 64 or not 0 < len(clave) <= 256:
        return jsonify(error="Escribe usuario y contraseña."), 400
    conn = db()
    ip = ip_real()
    claves = [auth.clave_usuario(nombre)] + ([f"ip:{ip}"] if ip else [])
    auth.limpiar(conn)
    # Bloqueado: se responde sin calcular scrypt, así un ataque no cuesta CPU.
    if (seg := auth.espera(conn, claves)):
        conn.commit()
        r = jsonify(error="Demasiados intentos. Espera unos minutos.")
        r.headers["Retry-After"] = str(seg)
        return r, 429
    if not _scrypt_sem.acquire(timeout=1):
        return jsonify(error="El servidor está ocupado. Intenta en unos segundos."), 503
    try:
        u = auth.buscar(conn, nombre.strip())
        ok, rehacer = auth.verificar(clave, u["hash"] if u else auth.RELLENO)
        ok = ok and u is not None and u["activo"] == 1
    finally:
        _scrypt_sem.release()
    ipr = auth.ip_resumida(ip)
    if not ok:
        # Solo se audita el primer fallo de la ventana y los bloqueos, y solo para cuentas que
        # existen (o por IP): un bucle de intentos no puede llenar la auditoría.
        for clave_i in claves:
            _, primero, bloqueo = auth.fallo(conn, clave_i)
            sujeto = u["nombre"] if (u and clave_i.startswith("u:")) else None
            if clave_i.startswith("ip:"):
                sujeto = "?"
            if sujeto and (primero or bloqueo):
                auth.auditar(conn, sujeto, "bloqueo" if bloqueo else "login_fallido",
                             "ip" if clave_i.startswith("ip:") else "usuario", u["id"] if u and clave_i.startswith("u:") else None,
                             None, None, ipr)
        conn.commit()
        return jsonify(error="Usuario o contraseña incorrectos."), 401
    assert u is not None  # arriba ya se rechazó al que no existe o no acierta
    auth.acierto(conn, claves)
    if rehacer:
        conn.execute("UPDATE usuarios SET hash = ? WHERE id = ?", (auth.hashear(clave), u["id"]))
    auth.cerrar_sesion(conn, request.cookies.get(COOKIE))  # la cookie anterior, si había, deja de valer
    token = auth.crear_sesion(conn, u["id"], ip, request.headers.get("User-Agent", ""))
    auth.auditar(conn, u["nombre"], "login", "usuario", u["id"], None, None, ipr)
    conn.commit()
    resp = jsonify(usuario=u["nombre"], rol=u["rol"])
    _poner_cookie(resp, token)
    return resp


@app.post("/api/logout")
def logout() -> Any:
    body = request.get_json(silent=True) or {}
    conn = db()
    u = g.usuario
    if isinstance(body, dict) and body.get("todas"):
        auth.cerrar_todas(conn, u["id"])
        auth.auditar(conn, u["nombre"], "logout_todas", "usuario", u["id"], ip=auth.ip_resumida(ip_real()))
    else:
        auth.cerrar_sesion(conn, request.cookies.get(COOKIE))
        auth.auditar(conn, u["nombre"], "logout", "usuario", u["id"], ip=auth.ip_resumida(ip_real()))
    conn.commit()
    resp = jsonify(ok=True)
    resp.delete_cookie(COOKIE, path="/", secure=True, httponly=True, samesite="Lax")
    return resp


@app.get("/api/yo")
def yo() -> Response:
    fila = db().execute("SELECT visto_ts, cambios_visto FROM usuarios WHERE id = ?", (g.usuario["id"],)).fetchone()
    return jsonify(usuario=g.usuario["nombre"], rol=g.usuario["rol"], visto=fila["visto_ts"] if fila else None,
                   cambios=fila["cambios_visto"] if fila else None)


@app.post("/api/visto")
def visto() -> Response:
    """Marca que esta persona ya vio las novedades (hasta ahora). Cualquiera puede, también un lector;
    no se audita: solo guarda cuándo, para no mostrar dos veces lo mismo."""
    ahora = int(time.time() * 1000)
    conn = db()
    conn.execute("UPDATE usuarios SET visto_ts = ? WHERE id = ?", (ahora, g.usuario["id"]))
    conn.commit()
    return jsonify(visto=ahora)


_ID_CAMBIOS = re.compile(r"[0-9a-z.\-]{1,40}")


@app.post("/api/cambios-visto")
def cambios_visto() -> Response | tuple[Response, int]:
    """Marca que esta persona ya vio el aviso «Qué hay de nuevo» con ese `id` (el de la última entrada de `cambios.js`).
    Cualquiera puede, también un lector; no se audita (solo evita mostrar dos veces lo mismo)."""
    datos = request.get_json(silent=True) or {}
    ident = datos.get("id") if isinstance(datos, dict) else None
    if not isinstance(ident, str) or not _ID_CAMBIOS.fullmatch(ident):
        return jsonify(error="Identificador de cambios no válido."), 400
    conn = db()
    conn.execute("UPDATE usuarios SET cambios_visto = ? WHERE id = ?", (ident, g.usuario["id"]))
    conn.commit()
    return jsonify(cambios=ident)


# ----------------------------------------------------------------- avisos push
# Cada persona (también un lector) activa o apaga los avisos de SU dispositivo: solo toca sus propias suscripciones.
def _resp_push(prefs: dict[str, bool] | None, rol: str, horario: dict[str, int] | None = None) -> Response:
    cats = [{"id": c, "nombre": push.CATEGORIAS[c]["nombre"], "ayuda": push.CATEGORIAS[c]["ayuda"], "activo": prefs[c]}
            for c in push.categorias_de(rol)] if prefs is not None else []
    if prefs is None:
        return jsonify(suscrito=False, categorias=[])
    return jsonify(suscrito=True, categorias=cats, horario=horario or push.horario_defecto(), horario_defecto=push.horario_defecto())


def _cuerpo_push() -> dict[str, Any] | None:
    body: Any = request.get_json(silent=True)
    return body if isinstance(body, dict) else None


@app.get("/api/push/clave")
def push_clave() -> Any:
    try:
        return jsonify(clave=push.clave_publica())
    except Exception:  # noqa: BLE001
        return jsonify(error="Los avisos no están disponibles en este servidor."), 503


@app.post("/api/push/estado")
def push_estado() -> Any:
    body = _cuerpo_push() or {}
    u = g.usuario
    return _resp_push(push.estado(db(), u["id"], u["rol"], body.get("endpoint")), u["rol"],
                      push.horario_dispositivo(db(), u["id"], body.get("endpoint")))


@app.post("/api/push/suscribir")
def push_suscribir() -> Any:
    body = _cuerpo_push()
    if body is None:
        return jsonify(error="Datos inválidos."), 400
    u = g.usuario
    try:
        prefs = push.suscribir(db(), u["id"], u["rol"], body.get("suscripcion"))
        s = body.get("suscripcion")
        return _resp_push(prefs, u["rol"], push.horario_dispositivo(db(), u["id"], s.get("endpoint") if isinstance(s, dict) else None))
    except ValueError as e:
        return jsonify(error=str(e)), 400


@app.put("/api/push/prefs")
def push_prefs() -> Any:
    body = _cuerpo_push()
    if body is None:
        return jsonify(error="Datos inválidos."), 400
    u = g.usuario
    try:
        endpoint = body.get("endpoint")
        if "horario" in body:  # el horario de este dispositivo (y, si vienen, también las categorías)
            push.guardar_horario(db(), u["id"], endpoint, body.get("horario"))
        prefs = push.guardar_prefs(db(), u["id"], u["rol"], endpoint, body["prefs"]) if "prefs" in body \
            else push.estado(db(), u["id"], u["rol"], endpoint)
        return _resp_push(prefs, u["rol"], push.horario_dispositivo(db(), u["id"], endpoint))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except LookupError as e:
        return jsonify(error=str(e)), 404


@app.post("/api/push/baja")
def push_baja() -> Any:
    body = _cuerpo_push() or {}
    push.baja(db(), g.usuario["id"], body.get("endpoint"))
    return "", 204


def _avisar_movimiento(conn: sqlite3.Connection, antes: list[Mov], cid: int, nueva: dict[str, Any]) -> None:
    """Avisa de un movimiento nuevo a quien tenga esa categoría (y, en una compra, de la etapa o constancia que cruce)."""
    try:
        sats, quien_ = nueva["sats"], quien()
        if nueva["tipo"] == "venta":
            if nueva.get("nota") != "Comisión de retiro":  # la comisión de un traslado no es una novedad para la familia
                push.notificar(conn, "movimiento", "Libro DCA", f"{quien_} anotó una venta o gasto de {sats:,} sats", f"mov-{cid}")
            return
        extra = "extra " if nueva.get("extra") else ""
        push.notificar(conn, "movimiento", "Libro DCA", f"{quien_} anotó una compra {extra}de {sats:,} sats", f"mov-{cid}")
        saldo = sum(-s if tipo == "venta" else s for _f, _i, tipo, s in antes)
        if cruzadas := ritmo.etapas_cruzadas(saldo, saldo + sats):
            m = cruzadas[-1]  # la más alta si fueron varias
            nombre = "Nuevo hito" if ritmo.es_hito_grande(m) else "Nueva etapa"
            push.notificar(conn, "hito", "Libro DCA", f"{nombre}: ya son {ritmo.nombre_hito(m)} en el libro.", f"hito-{cid}")
        fechas = [f for f, _i, tipo, _s in antes if tipo == "compra"]
        for k, (clase, valor) in enumerate(ritmo.constancia_cruzada(fechas, [*fechas, nueva["fecha"]])):
            que = f"{valor} compras" if clase == "compras" else ritmo.nombre_hito_meses(valor)
            push.notificar(conn, "hito", "Libro DCA", f"Constancia: {que}.", f"constancia-{cid}-{k}")
    except Exception as e:  # noqa: BLE001 — avisar es secundario: nunca debe romper la compra
        print(f"push: no se pudo preparar el aviso ({type(e).__name__}: {e})", flush=True)


@app.post("/api/clave")
def nueva_clave() -> Any:
    body: Any = request.get_json(silent=True)
    actual = body.get("actual") if isinstance(body, dict) else None
    nueva = body.get("nueva") if isinstance(body, dict) else None
    if not isinstance(actual, str) or not isinstance(nueva, str) or len(actual) > 256:
        return jsonify(error="Escribe la contraseña actual y la nueva."), 400
    conn = db()
    u = g.usuario
    claves = [auth.clave_usuario(u["nombre"])]
    if auth.espera(conn, claves):
        return jsonify(error="Demasiados intentos. Espera unos minutos."), 429
    if not _scrypt_sem.acquire(timeout=1):
        return jsonify(error="El servidor está ocupado. Intenta en unos segundos."), 503
    try:
        ok, _ = auth.verificar(actual, conn.execute("SELECT hash FROM usuarios WHERE id = ?", (u["id"],)).fetchone()["hash"])
    finally:
        _scrypt_sem.release()
    if not ok:
        auth.fallo(conn, claves[0])
        conn.commit()
        return jsonify(error="La contraseña actual no es correcta."), 400
    try:
        auth.cambiar_clave(conn, u["id"], nueva, u["nombre"], conservar=u["hash"])
    except ValueError as e:
        return jsonify(error=str(e)), 400
    return jsonify(ok=True)


@app.get("/api/auditoria")
def ver_auditoria() -> Any:
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo el admin ve el historial."), 403
    antes = request.args.get("antes", type=int) or 2**62
    rows = db().execute("SELECT * FROM auditoria WHERE id < ? ORDER BY id DESC LIMIT 100", (antes,)).fetchall()
    return jsonify([{**dict(r), "antes": json.loads(r["antes"]) if r["antes"] else None,
                     "despues": json.loads(r["despues"]) if r["despues"] else None} for r in rows])


@app.get("/healthz")
def healthz() -> Response:
    db().execute("SELECT 1").fetchone()
    return jsonify(ok=True)


@app.get("/api/compras")
def listar() -> Response:
    rows = db().execute(f"SELECT {COLS} FROM compras WHERE {VIGENTES} ORDER BY fecha, id").fetchall()
    return jsonify([fila(r) for r in rows])


@app.post("/api/compras")
def crear() -> Any:
    body: Any = request.get_json(silent=True)
    try:
        c = parse_compra(body)
        txid = parse_txid(body.get("txid"))
        tipo = parse_tipo(body.get("tipo"))
        nota = parse_nota(body.get("nota"))
        extra = parse_extra(body.get("extra"), tipo)
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    if tipo == "venta" and (falla := saldo_negativo(movimientos(conn) + [(c[0], 10**12, "venta", c[3])])):
        return jsonify(error=_error_saldo(falla)), 400
    antes = movimientos(conn)
    cid = insertar(conn, c, txid, tipo, nota, extra)
    nueva = fila(conn.execute(f"SELECT {COLS} FROM compras WHERE id = ?", (cid,)).fetchone())
    auth.auditar(conn, quien(), "alta", "compra", cid, None, nueva, auth.ip_resumida(ip_real()))
    conn.commit()
    push.vigilar_tx(conn, txid)
    _avisar_movimiento(conn, antes, cid, nueva)
    rep = txid_repetido(conn, txid, cid)
    return jsonify({**nueva, **({"txid_repetido": rep} if rep else {})}), 201


@app.put("/api/compras/<int:cid>")
def editar(cid: int) -> Any:
    body: Any = request.get_json(silent=True)
    try:
        fecha, monto, precio, sats = parse_compra(body)
        txid = parse_txid(body.get("txid")) if "txid" in body else None
        tipo = parse_tipo(body.get("tipo")) if "tipo" in body else None
        nota = parse_nota(body.get("nota")) if "nota" in body else None
        extra = parse_extra(body.get("extra"), tipo or "compra") if "extra" in body else None
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    previa = conn.execute(f"SELECT {COLS} FROM compras WHERE id = ? AND {VIGENTES}", (cid,)).fetchone()
    if not previa:
        return jsonify(error="La compra no existe."), 404
    if "txid" not in body:  # un cliente que no manda el campo no borra el TXID guardado
        txid = previa["txid"]
    if tipo is None:
        tipo = previa["tipo"]
    if "nota" not in body:
        nota = previa["nota"]
    if extra is None:
        extra = previa["extra"]
    if tipo == "venta":
        if extra and "extra" in body:
            return jsonify(error="Solo una compra puede ser extra."), 400
        extra = 0  # una venta nunca es extra
    otros = [m for m in movimientos(conn) if m[1] != cid]
    if falla := saldo_negativo(otros + [(fecha, cid, tipo, sats)]):
        return jsonify(error=_error_saldo(falla)), 400
    conn.execute("UPDATE compras SET fecha = ?, monto = ?, precio = ?, sats = ?, txid = ?, tipo = ?, nota = ?, extra = ? WHERE id = ?",
                 (fecha, monto, precio, sats, txid, tipo, nota, extra, cid))
    nueva = fila(conn.execute(f"SELECT {COLS} FROM compras WHERE id = ?", (cid,)).fetchone())
    auth.auditar(conn, quien(), "edicion", "compra", cid, fila(previa), nueva, auth.ip_resumida(ip_real()))
    conn.commit()
    push.vigilar_tx(conn, txid)
    rep = txid_repetido(conn, txid, cid)
    return jsonify({**nueva, **({"txid_repetido": rep} if rep else {})})


@app.get("/api/traslados")
def listar_traslados() -> Response:
    rows = db().execute("SELECT id, fecha, sats, sentido, txid, nota, creado FROM traslados WHERE anulada_ts IS NULL ORDER BY fecha, id").fetchall()
    return jsonify([fila_traslado(r) for r in rows])


@app.post("/api/traslados")
def crear_traslado() -> Any:
    body: Any = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error="Datos inválidos."), 400
    try:
        fecha = parse_fecha(body.get("fecha"))
        sats = parse_sats(body.get("sats"))
        sentido = parse_sentido(body.get("sentido"))
        txid = parse_txid(body.get("txid"))
        nota = parse_nota(body.get("nota"))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    if falla := falla_traslados(conn, traslados_vigentes(conn) + [(fecha, 10**12, sentido, sats)]):
        return jsonify(error=falla), 400
    cur = conn.execute("INSERT INTO traslados (fecha, sats, sentido, txid, nota, creado) VALUES (?, ?, ?, ?, ?, ?)",
                       (fecha, sats, sentido, txid, nota, int(time.time() * 1000)))
    tid = int(cur.lastrowid or 0)
    nuevo = fila_traslado(conn.execute("SELECT id, fecha, sats, sentido, txid, nota, creado FROM traslados WHERE id = ?", (tid,)).fetchone())
    auth.auditar(conn, quien(), "alta", "traslado", tid, None, nuevo, auth.ip_resumida(ip_real()))
    conn.commit()
    push.vigilar_tx(conn, txid)
    return jsonify(nuevo), 201


@app.delete("/api/traslados/<int:tid>")
def anular_traslado(tid: int) -> Any:
    # Igual que las compras: anular conserva la fila y su historia; las cuentas dejan de contarla.
    conn = db()
    previa = conn.execute("SELECT id, fecha, sats, sentido, txid, nota, creado FROM traslados WHERE id = ? AND anulada_ts IS NULL", (tid,)).fetchone()
    if not previa:
        return jsonify(error="El traslado no existe."), 404
    if falla := falla_traslados(conn, [t for t in traslados_vigentes(conn) if t[1] != tid]):
        return jsonify(error=f"No se puede anular: los traslados posteriores se quedarían sin sats. {falla}"), 409
    conn.execute("UPDATE traslados SET anulada_ts = ?, anulada_por = ? WHERE id = ?", (int(time.time()), quien(), tid))
    auth.auditar(conn, quien(), "anulacion", "traslado", tid, fila_traslado(previa), None, auth.ip_resumida(ip_real()))
    conn.commit()
    return "", 204


@app.delete("/api/compras/<int:cid>")
def borrar(cid: int) -> Any:
    # Borrar es anular: la fila y su historia se quedan; listados, export y cálculos la excluyen.
    conn = db()
    previa = conn.execute(f"SELECT {COLS} FROM compras WHERE id = ? AND {VIGENTES}", (cid,)).fetchone()
    if not previa:
        return jsonify(error="La compra no existe."), 404
    if falla := saldo_negativo([m for m in movimientos(conn) if m[1] != cid]):
        return jsonify(error=_error_saldo(falla).replace("No alcanzan los sats:", "No se puede anular, las ventas posteriores se quedarían sin sats:")), 409
    conn.execute("UPDATE compras SET anulada_ts = ?, anulada_por = ? WHERE id = ?", (int(time.time()), quien(), cid))
    auth.auditar(conn, quien(), "anulacion", "compra", cid, fila(previa), None, auth.ip_resumida(ip_real()))
    conn.commit()
    return "", 204


def _fmt(x: float) -> str:
    # 15 cifras significativas: sin el ruido de coma flotante de los montos grandes.
    s = f"{x:.15g}"
    return s if "e" not in s else f"{x:.8f}".rstrip("0").rstrip(".")


@app.get("/api/export.csv")
def exportar() -> Response:
    rows = db().execute(f"SELECT fecha, monto, precio, sats, txid, tipo, nota, extra FROM compras WHERE {VIGENTES} ORDER BY fecha, id").fetchall()
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(["fecha", "monto_usd", "precio_btc_usd", "sats", "btc", "txid", "tipo", "nota", "extra"])
    for r in rows:
        w.writerow([r["fecha"], _fmt(r["monto"]), _fmt(r["precio"]), r["sats"], f'{r["sats"] / 1e8:.8f}', r["txid"] or "", r["tipo"], r["nota"] or "", "1" if r["extra"] else ""])
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
        return jsonify(importar_csv(db(), request.get_data(as_text=True), quien(), auth.ip_resumida(ip_real())))
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


# ------------------------------------------------- verificación de TXID (mempool.space)
# Solo el servidor habla con mempool.space (el navegador nunca), con una dirección fija y un TXID ya validado
# y registrado en una compra: no es un proxy abierto. mempool.space solo ve el TXID, no quién lo pregunta.
MEMPOOL = "https://mempool.space/api"
_punta = {"altura": 0, "ts": 0.0}


def _altura_punta() -> int:
    if not _punta["altura"] or time.time() - _punta["ts"] > 120:
        h = _get_json(f"{MEMPOOL}/blocks/tip/height", timeout=6)
        if isinstance(h, bool) or not isinstance(h, int) or h <= 0:
            raise ValueError("altura de bloque inválida")
        _punta.update(altura=h, ts=time.time())
    return int(_punta["altura"])


def _tx_dict(txid: str, f: sqlite3.Row, desactualizado: bool = False) -> dict[str, Any]:
    conf = None
    if f["estado"] == "confirmada" and f["bloque"]:
        try:
            conf = max(1, _altura_punta() - int(f["bloque"]) + 1)
        except Exception:
            conf = None  # sin la altura actual no se inventa el número
    out: dict[str, Any] = {"txid": txid, "estado": f["estado"], "confirmaciones": conf, "bloque": f["bloque"],
                           "comision": f["fee"], "hora": f["hora"], "verificado": f["ts"]}
    if desactualizado:
        out["desactualizado"] = True
    return out


def verificar_tx(conn: sqlite3.Connection, txid: str) -> dict[str, Any]:
    ahora = int(time.time())
    f = conn.execute("SELECT estado, bloque, fee, hora, ts FROM tx_cache WHERE txid = ?", (txid,)).fetchone()
    if f and (f["estado"] == "confirmada" or ahora - f["ts"] < 60):
        return _tx_dict(txid, f)
    try:
        j = _get_json(f"{MEMPOOL}/tx/{txid}", timeout=6)
        if not isinstance(j, dict):
            raise ValueError("respuesta inesperada")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            return _fallo_tx(txid, f)
        estado, bloque, fee, hora = "no_encontrada", None, None, None
    except Exception:
        return _fallo_tx(txid, f)
    else:
        st: dict[str, Any] = j["status"] if isinstance(j.get("status"), dict) else {}
        fee = j.get("fee") if isinstance(j.get("fee"), int) and not isinstance(j.get("fee"), bool) else None
        if st.get("confirmed") is True and isinstance(st.get("block_height"), int):
            estado, bloque = "confirmada", st["block_height"]
            hora = st.get("block_time") if isinstance(st.get("block_time"), int) else None
        else:
            estado, bloque, hora = "pendiente", None, None
    conn.execute("INSERT OR REPLACE INTO tx_cache (txid, estado, bloque, fee, hora, ts) VALUES (?, ?, ?, ?, ?, ?)",
                 (txid, estado, bloque, fee, hora, ahora))
    conn.commit()
    return _tx_dict(txid, conn.execute("SELECT estado, bloque, fee, hora, ts FROM tx_cache WHERE txid = ?", (txid,)).fetchone())


def _fallo_tx(txid: str, f: sqlite3.Row | None) -> dict[str, Any]:
    """mempool.space no respondió: se sirve lo guardado marcado como desactualizado, o se avisa."""
    if f:
        return _tx_dict(txid, f, desactualizado=True)
    raise ConnectionError("mempool.space no respondió")


@app.get("/api/tx/<txid>")
def estado_tx(txid: str) -> Any:
    if not re.fullmatch(r"[0-9a-f]{64}", txid):
        return jsonify(error="TXID inválido."), 400
    conn = db()
    if not (conn.execute(f"SELECT 1 FROM compras WHERE txid = ? AND {VIGENTES} LIMIT 1", (txid,)).fetchone()
            or conn.execute("SELECT 1 FROM traslados WHERE txid = ? AND anulada_ts IS NULL LIMIT 1", (txid,)).fetchone()):
        return jsonify(error="Ese TXID no está en ninguna compra ni traslado."), 404
    try:
        return jsonify(verificar_tx(conn, txid))
    except ConnectionError:
        return jsonify(error="No se pudo consultar mempool.space ahora."), 503


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


_CON_ETAG = {"/api/compras", "/api/traslados", "/api/historico"}  # lecturas grandes que casi nunca cambian entre dos consultas


def _etag_condicional(resp: Response) -> None:
    """ETag del cuerpo y «304 sin cambios» si el navegador ya lo tiene (la app lo manda a mano: la API sigue en `no-store`)."""
    etag = '"' + hashlib.sha1(resp.get_data(), usedforsecurity=False).hexdigest()[:20] + '"'
    resp.headers["ETag"] = etag
    previos = [x.strip().removeprefix("W/") for x in request.headers.get("If-None-Match", "").split(",")]
    if etag in previos:
        resp.status_code = 304
        resp.set_data(b"")
        resp.headers.pop("Content-Length", None)


@app.after_request
def cabeceras(resp: Response) -> Response:
    if request.method == "GET" and request.path in _CON_ETAG and resp.status_code == 200 and not resp.direct_passthrough:
        _etag_condicional(resp)
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    if request.path.startswith("/fonts/") and request.args.get("v") == VERSION and resp.status_code == 200:
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif request.path in {"/", "/login"}:
        resp.headers["Cache-Control"] = "no-store"
    elif "Cache-Control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/") else "no-cache"
    if request.path == "/" or request.path.startswith("/api/"):
        resp.headers["Vary"] = "Cookie"
    return resp


init_db()
