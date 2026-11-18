"""Libro DCA: API mínima sobre SQLite para registrar compras de Bitcoin."""
from __future__ import annotations

import csv
import gzip
import hashlib
import hmac
import io
import json
import math
import mimetypes
import os
import re
import secrets
import shutil
import sqlite3
import threading
import time
import urllib.error
import urllib.request
import zipfile
from collections import deque
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Any

from flask import Flask, Response, g, jsonify, redirect, request
from werkzeug.middleware.proxy_fix import ProxyFix

import auth
import push
import recorte
import ritmo
import salud

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

COLS = "id, fecha, monto, precio, sats, creado, txid, tipo, nota, extra, etiquetas"
GENESIS = date(2009, 1, 3)
Compra = tuple[str, float, float, int]  # fecha, monto, precio, sats


# ---------------------------------------------------------------- base de datos
def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=FULL")  # prioriza no perder datos sobre velocidad
    return conn


# ---- Migraciones versionadas (idea 94): la tabla `esquema` guarda qué versiones de la base ya se aplicaron.
# Cada migración es una función numerada que **debe ser idempotente** (mira si el cambio ya está antes de hacerlo): así una base de
# cualquier edad, con o sin la tabla `esquema`, llega al mismo estado, y una caída a medias se reanuda sin dañar nada. Para cambiar la
# base: añade UNA migración al final con el número siguiente (nunca edites ni reordenes las anteriores) y su prueba en tests/test_api.py.
def _columnas(conn: sqlite3.Connection, tabla: str) -> set[str]:
    return {r["name"] for r in conn.execute(f"PRAGMA table_info({tabla})")}


def _m_tablas_base(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.executescript(auth.SCHEMA)
    conn.executescript(push.SCHEMA)


def _m_columnas_compras(conn: sqlite3.Connection) -> None:
    cols = _columnas(conn, "compras")
    for col, ddl in MIGRACIONES:
        if col not in cols:
            conn.execute(ddl)
    conn.execute("CREATE INDEX IF NOT EXISTS compras_txid ON compras (txid) WHERE txid IS NOT NULL")
    # filas de antes de guardar sats: se estiman con monto y precio
    conn.execute("UPDATE compras SET sats = MAX(1, CAST(ROUND(monto / precio * 100000000) AS INTEGER)) WHERE sats IS NULL")


def _m_pendientes_sus_id(conn: sqlite3.Connection) -> None:
    if "sus_id" not in _columnas(conn, "avisos_pendientes"):
        conn.execute("ALTER TABLE avisos_pendientes ADD COLUMN sus_id INTEGER")


def _m_usuarios_visto(conn: sqlite3.Connection) -> None:
    # «Novedades»: cuándo vio cada persona el resumen por última vez
    if "visto_ts" not in _columnas(conn, "usuarios"):
        conn.execute("ALTER TABLE usuarios ADD COLUMN visto_ts INTEGER")


def _m_usuarios_cambios(conn: sqlite3.Connection) -> None:
    # «Qué hay de nuevo»: las cuentas que ya existen al añadir la columna quedan en '0' (verán el primero); las nuevas, en NULL.
    if "cambios_visto" not in _columnas(conn, "usuarios"):
        conn.execute("ALTER TABLE usuarios ADD COLUMN cambios_visto TEXT")
        conn.execute("UPDATE usuarios SET cambios_visto = '0'")


def _m_compras_etiquetas(conn: sqlite3.Connection) -> None:
    # Etiquetas (idea 56): «cumpleaños», «bono»… guardadas en minúsculas y separadas por coma (un nombre nunca lleva coma).
    if "etiquetas" not in _columnas(conn, "compras"):
        conn.execute("ALTER TABLE compras ADD COLUMN etiquetas TEXT CHECK (etiquetas IS NULL OR length(etiquetas) <= 200)")


def _m_metricas(conn: sqlite3.Connection) -> None:
    # Métricas simples (idea 96): por día y ruta (la regla, no la URL), con tope de 14 días. Cada proceso suma lo suyo.
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS metricas (
      dia      TEXT    NOT NULL,
      ruta     TEXT    NOT NULL,
      n        INTEGER NOT NULL DEFAULT 0,
      errores  INTEGER NOT NULL DEFAULT 0,
      lentas   INTEGER NOT NULL DEFAULT 0,
      ms_total REAL    NOT NULL DEFAULT 0,
      ms_max   REAL    NOT NULL DEFAULT 0,
      PRIMARY KEY (dia, ruta)
    );""")


def _m_errores_js(conn: sqlite3.Connection) -> None:
    # Errores del navegador (idea 74): solo mensaje y pantalla, agrupados (un mismo error repetido suma, no llena la tabla).
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS errores_js (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      primero  INTEGER NOT NULL,
      ultimo   INTEGER NOT NULL,
      pantalla TEXT    NOT NULL,
      mensaje  TEXT    NOT NULL,
      agente   TEXT    NOT NULL,
      usuario  TEXT,
      n        INTEGER NOT NULL DEFAULT 1,
      UNIQUE (pantalla, mensaje, agente)
    );""")


def _m_sesiones_compartida(conn: sqlite3.Connection) -> None:
    # Dispositivo compartido (idea 105): esa sesión se cierra sola (tope de 4 h y 1 h sin usarse).
    if "compartida" not in _columnas(conn, "sesiones"):
        conn.execute("ALTER TABLE sesiones ADD COLUMN compartida INTEGER NOT NULL DEFAULT 0")


def _m_tokens_api(conn: sqlite3.Connection) -> None:
    # Enlaces de solo lectura para hojas de cálculo (idea 159): solo se guarda el SHA-256 del token, nunca el token.
    conn.execute("""CREATE TABLE IF NOT EXISTS tokens_api (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        hash       TEXT    NOT NULL UNIQUE,
        nombre     TEXT    NOT NULL,
        creado     INTEGER NOT NULL,
        ultimo_uso INTEGER,
        revocado   INTEGER
    )""")


def _m_wallets(conn: sqlite3.Connection) -> None:
    # Varias wallets (idea 156): la principal («Mi wallet») es `traslados.wallet_id IS NULL`; las demás viven en `wallets`.
    conn.execute("""CREATE TABLE IF NOT EXISTS wallets (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre    TEXT    NOT NULL CHECK (length(nombre) BETWEEN 1 AND 24),
        creado    INTEGER NOT NULL,
        archivada INTEGER
    )""")
    if "wallet_id" not in _columnas(conn, "traslados"):
        conn.execute("ALTER TABLE traslados ADD COLUMN wallet_id INTEGER REFERENCES wallets(id)")


def _m_mensajes_bandera(conn: sqlite3.Connection) -> None:
    # Mensaje en la bandera (idea 16): una frase del dueño por campamento (100k, 1M, 10M…), que sale al tocar esa bandera.
    conn.execute("""CREATE TABLE IF NOT EXISTS mensajes_bandera (
        hito        INTEGER PRIMARY KEY,
        texto       TEXT    NOT NULL CHECK (length(texto) BETWEEN 1 AND 160),
        actualizado INTEGER NOT NULL,
        por         TEXT    NOT NULL
    )""")


def _m_capsulas(conn: sqlite3.Connection) -> None:
    # Cápsula sellada (idea 33): una carta que solo se abre en una fecha o al llegar a cierto saldo. Anular conserva la fila.
    conn.execute("""CREATE TABLE IF NOT EXISTS capsulas (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        texto       TEXT    NOT NULL CHECK (length(texto) BETWEEN 1 AND 1000),
        abre_fecha  TEXT,
        abre_sats   INTEGER,
        creado      INTEGER NOT NULL,
        autor       TEXT    NOT NULL,
        abierta_ts  INTEGER,
        anulada_ts  INTEGER,
        CHECK ((abre_fecha IS NULL) <> (abre_sats IS NULL))
    )""")


def _m_piedritas(conn: sqlite3.Connection) -> None:
    # Apacheta (idea 47): una piedrita por persona y compra, que deja un lector. Sin texto: un toque.
    conn.execute("""CREATE TABLE IF NOT EXISTS piedritas (
        compra_id  INTEGER NOT NULL REFERENCES compras(id),
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        creado     INTEGER NOT NULL,
        PRIMARY KEY (compra_id, usuario_id)
    )""")


def _m_usuarios_cumple(conn: sqlite3.Connection) -> None:
    # Farol por cumpleaños (idea 49): mes y día («MM-DD»), opcional; cada persona pone el suyo.
    if "cumple" not in _columnas(conn, "usuarios"):
        conn.execute("ALTER TABLE usuarios ADD COLUMN cumple TEXT")


def _m_firmas(conn: sqlite3.Connection) -> None:
    # Libro de cumbre (campamento 19, idea 18): una firma por persona y campamento ya alcanzado (hasta 80 caracteres, una línea).
    conn.execute("""CREATE TABLE IF NOT EXISTS firmas (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        hito       INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        texto      TEXT    NOT NULL CHECK (length(texto) BETWEEN 1 AND 80),
        creado     INTEGER NOT NULL,
        editado    INTEGER,
        UNIQUE (hito, usuario_id)
    )""")


def _m_codigos_tv(conn: sqlite3.Connection) -> None:
    # Entrar en la tele con un código (campamento 21B, idea 43): el admin lo crea en su teléfono para una cuenta lectora y se teclea en la
    # tele. Solo se guarda el SHA-256 del código; caduca a los 5 minutos, sirve una vez y 5 fallos lo anulan (`caduca` pasa a «ahora»).
    conn.execute("""CREATE TABLE IF NOT EXISTS codigos_tv (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        hash       TEXT    NOT NULL,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        creado     INTEGER NOT NULL,
        caduca     INTEGER NOT NULL,
        usado_ts   INTEGER,
        fallos     INTEGER NOT NULL DEFAULT 0,
        creado_por INTEGER REFERENCES usuarios(id)
    )""")


def _m_medidas_aparato(conn: sqlite3.Connection) -> None:
    # «Medir este aparato» (campamento 24, idea 44): cuánto tardó en verse el saldo y cuántos fotogramas por segundo dio al deslizar,
    # en el aparato donde el admin lo midió. Solo números, ajustes de la pantalla y el agente resumido («Safari · iPhone»): ni la cuenta,
    # ni la IP, ni el texto del agente. Se guardan las últimas 50 (el tope lo pone `POST /api/medidas`).
    conn.execute("""CREATE TABLE IF NOT EXISTS medidas_aparato (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        creado      INTEGER NOT NULL,
        agente      TEXT    NOT NULL,
        instalada   INTEGER NOT NULL DEFAULT 0,
        saldo_ms    INTEGER NOT NULL,
        red_ms      INTEGER,
        fps         REAL    NOT NULL,
        fps_escena  REAL,
        fps_peor    REAL    NOT NULL,
        fps_p5      REAL    NOT NULL,
        tirones     INTEGER NOT NULL,
        hz          INTEGER NOT NULL,
        duracion_ms INTEGER NOT NULL,
        recorrido   INTEGER NOT NULL,
        efectos     TEXT    NOT NULL CHECK (efectos IN ('todos', 'esenciales', 'ninguno')),
        ligero      INTEGER NOT NULL DEFAULT 0,
        tema        TEXT    NOT NULL CHECK (tema IN ('claro', 'oscuro')),
        ancho       INTEGER NOT NULL,
        alto        INTEGER NOT NULL,
        dpr         REAL    NOT NULL,
        memoria     REAL,
        nucleos     INTEGER,
        carga       TEXT    NOT NULL DEFAULT 'otra'
    )""")


MIGRACIONES_ESQUEMA: tuple[tuple[int, str, Callable[[sqlite3.Connection], None]], ...] = (
    (1, "tablas base (compras, precios, traslados, cuentas, avisos)", _m_tablas_base),
    (2, "columnas de compras (sats, anulación, txid, tipo, nota, extra) e índice de TXID", _m_columnas_compras),
    (3, "avisos_pendientes.sus_id", _m_pendientes_sus_id),
    (4, "usuarios.visto_ts", _m_usuarios_visto),
    (5, "usuarios.cambios_visto", _m_usuarios_cambios),
    (6, "compras.etiquetas", _m_compras_etiquetas),
    (7, "metricas por día y ruta", _m_metricas),
    (8, "errores_js (errores del navegador)", _m_errores_js),
    (9, "sesiones.compartida", _m_sesiones_compartida),
    (10, "tokens_api (enlaces de solo lectura para hojas de cálculo)", _m_tokens_api),
    (11, "wallets y traslados.wallet_id (varias wallets)", _m_wallets),
    (12, "mensajes_bandera (una frase por campamento)", _m_mensajes_bandera),
    (13, "capsulas (cartas selladas que se abren en una fecha o con un saldo)", _m_capsulas),
    (14, "piedritas (la apacheta: una por persona y compra)", _m_piedritas),
    (15, "usuarios.cumple (farol por cumpleaños)", _m_usuarios_cumple),
    (16, "firmas (el libro de cumbre: una por persona y campamento)", _m_firmas),
    (17, "codigos_tv (entrar en la tele con un código de un solo uso)", _m_codigos_tv),
    (18, "medidas_aparato (medir este aparato: tiempo hasta el saldo y fotogramas al deslizar)", _m_medidas_aparato),
)
VERSION_ESQUEMA = MIGRACIONES_ESQUEMA[-1][0]


def version_esquema(conn: sqlite3.Connection) -> int:
    """La versión más alta aplicada a esta base (0 si aún no tiene la tabla `esquema`)."""
    try:
        return int(conn.execute("SELECT COALESCE(MAX(version), 0) FROM esquema").fetchone()[0])
    except sqlite3.OperationalError:
        return 0


def migrar(conn: sqlite3.Connection) -> list[int]:
    """Aplica las migraciones que falten, en orden, y devuelve los números aplicados."""
    conn.execute("CREATE TABLE IF NOT EXISTS esquema (version INTEGER PRIMARY KEY, nombre TEXT NOT NULL, aplicada INTEGER NOT NULL)")
    hechas = {r["version"] for r in conn.execute("SELECT version FROM esquema")}
    if hechas and max(hechas) > VERSION_ESQUEMA:  # una base más nueva que este código (p. ej. tras volver a una versión anterior)
        print(f"esquema: la base está en la versión {max(hechas)} y este código conoce hasta la {VERSION_ESQUEMA}; sigue funcionando "
              "porque las migraciones solo añaden", flush=True)
    aplicadas = []
    for numero, nombre, fn in MIGRACIONES_ESQUEMA:
        if numero in hechas:
            continue
        fn(conn)
        conn.execute("INSERT INTO esquema (version, nombre, aplicada) VALUES (?, ?, ?)", (numero, nombre, int(time.time())))
        conn.commit()
        aplicadas.append(numero)
        print(f"esquema: aplicada la migración {numero} ({nombre})", flush=True)
    return aplicadas


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = connect()
    try:
        migrar(conn)
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
    return {**{k: row[k] for k in ("id", "fecha", "monto", "precio", "sats", "creado", "txid", "tipo", "nota")}, "extra": bool(row["extra"]),
            "etiquetas": [e for e in (row["etiquetas"] or "").split(",") if e]}


def insertar(conn: sqlite3.Connection, c: Compra, txid: str | None = None, tipo: str = "compra", nota: str | None = None,
             extra: int = 0, etiquetas: str | None = None) -> int:
    fecha, monto, precio, sats = c
    cur = conn.execute(
        "INSERT INTO compras (fecha, monto, precio, sats, creado, txid, tipo, nota, extra, etiquetas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (fecha, monto, precio, sats, int(time.time() * 1000), txid, tipo, nota, extra, etiquetas),
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
Tras = tuple[str, int, str, int, int]  # fecha, id, sentido, sats, wallet (0 = «Mi wallet», la principal)


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


TRAS_COLS = "id, fecha, sats, sentido, txid, nota, creado, wallet_id"
PRINCIPAL = "Mi wallet"  # el nombre de la wallet de siempre (la que no tiene fila en `wallets`)
MAX_WALLETS = 5  # además de la principal


def fila_traslado(row: sqlite3.Row) -> dict[str, Any]:
    return {k: row[k] for k in ("id", "fecha", "sats", "sentido", "txid", "nota", "creado", "wallet_id")}


def traslados_vigentes(conn: sqlite3.Connection) -> list[Tras]:
    return [(r["fecha"], r["id"], r["sentido"], r["sats"], r["wallet_id"] or 0) for r in
            conn.execute("SELECT fecha, id, sentido, sats, wallet_id FROM traslados WHERE anulada_ts IS NULL")]


def saldos_wallets(tras: list[Tras]) -> dict[int, int]:
    """Cuánto hay hoy en cada wallet (0 = la principal), solo las que tienen o tuvieron traslados."""
    out: dict[int, int] = {}
    for _f, _i, sentido, sats, w in tras:
        out[w] = out.get(w, 0) + (sats if sentido == "a_wallet" else -sats)
    return out


def nombres_wallets(conn: sqlite3.Connection) -> dict[int, str]:
    return {0: PRINCIPAL, **{r["id"]: r["nombre"] for r in conn.execute("SELECT id, nombre FROM wallets")}}


def parse_nombre_wallet(v: Any) -> str:
    if not isinstance(v, str):
        raise ValueError("Ponle un nombre a la wallet.")
    nombre = " ".join(v.split())
    if not 1 <= len(nombre) <= 24:
        raise ValueError("El nombre de la wallet debe tener de 1 a 24 caracteres.")
    if not re.fullmatch(r"[\w .\-]+", nombre):
        raise ValueError("El nombre solo puede llevar letras, números, espacios, puntos y guiones.")
    return nombre


def parse_wallet_id(conn: sqlite3.Connection, v: Any) -> int | None:
    """None = la principal. Un id debe ser de una wallet que existe y no está archivada."""
    if v is None or v == "" or v == 0:
        return None
    if isinstance(v, bool) or not isinstance(v, int):
        raise ValueError("Wallet inválida.")
    f = conn.execute("SELECT archivada FROM wallets WHERE id = ?", (v,)).fetchone()
    if not f:
        raise ValueError("Esa wallet no existe.")
    if f["archivada"]:
        raise ValueError("Esa wallet está archivada: ya no recibe traslados.")
    return v


def wallet_por_nombre(conn: sqlite3.Connection, nombre: str) -> sqlite3.Row | None:
    # La comparación se hace en Python: el `lower()` de SQLite no entiende acentos («FRÍO» y «frío» son la misma wallet).
    return next((r for r in conn.execute("SELECT id, nombre, archivada FROM wallets") if r["nombre"].casefold() == nombre.casefold()), None)


def sats_en_exchange(conn: sqlite3.Connection) -> int:
    """Sats que hoy están en el exchange: el saldo total menos lo que hay en la wallet (recortado a [0, saldo]), igual que `lib.ubicacionSats`."""
    saldo = sum(-s if tipo == "venta" else s for _f, _i, tipo, s in movimientos(conn))
    wallet = sum(max(0, v) for v in saldos_wallets(traslados_vigentes(conn)).values())
    return max(0, saldo - max(0, min(saldo, wallet)))


def falla_traslados(conn: sqlite3.Connection, tras: list[Tras]) -> str | None:
    """Mensaje de error si los traslados no cuadran: ninguna wallet puede quedar en negativo y entre todas no pueden tener más sats
    de los que posees en total ese día. None si todo cuadra."""
    movs = movimientos(conn)
    nombres = nombres_wallets(conn)
    saldos: dict[int, int] = {}
    for fecha, _id, sentido, sats, w in sorted(tras, key=lambda t: (t[0], t[1])):
        saldos[w] = saldos.get(w, 0) + (sats if sentido == "a_wallet" else -sats)
        if saldos[w] < 0:
            return f"No tienes tantos sats en tu wallet (el {fecha})." if w == 0 else f"No tienes tantos sats en «{nombres.get(w, 'la wallet')}» (el {fecha})."
        total = sum(-s if tipo == "venta" else s for f, _i, tipo, s in movs if f <= fecha)
        if sentido == "a_wallet" and sum(saldos.values()) > total:
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


MAX_ETIQUETAS = 5
_RE_ETIQUETA = re.compile(r"[0-9a-záéíóúüñ][0-9a-záéíóúüñ \-]{0,23}")


def parse_etiquetas(v: Any) -> str | None:
    """Etiquetas opcionales (idea 56): una lista o un texto separado por comas o punto y coma. Se guardan en minúsculas, sin `#`,
    sin repetidas, hasta 5 de 1 a 24 caracteres (letras, números, espacios y guion). Devuelve «a,b,c» o None."""
    if v is None or v == "":
        return None
    if isinstance(v, str):
        piezas: list[Any] = re.split(r"[,;]", v)
    elif isinstance(v, list):
        piezas = v
    else:
        raise ValueError("Etiquetas inválidas.")
    salida: list[str] = []
    for p in piezas:
        if not isinstance(p, str):
            raise ValueError("Etiquetas inválidas.")
        t = " ".join(p.replace("#", " ").split()).lower()
        if not t:
            continue
        if not _RE_ETIQUETA.fullmatch(t):
            raise ValueError("Cada etiqueta admite hasta 24 letras, números, espacios o guiones.")
        if t not in salida:
            salida.append(t)
    if len(salida) > MAX_ETIQUETAS:
        raise ValueError(f"Hasta {MAX_ETIQUETAS} etiquetas por movimiento.")
    return ",".join(salida) or None


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
            etiquetas = parse_etiquetas(row.get("etiquetas"))
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
        ids.append(insertar(conn, c, txid, tipo, nota, extra, etiquetas))
        nuevas += 1
    resumen = {"nuevas": nuevas, "repetidas": repetidas, "omitidas": len(omitidas), "ids": ids[:500]}
    if nuevas and (falla := saldo_negativo(movimientos(conn))):
        conn.rollback()  # el archivo entero se rechaza: no se importa nada a medias
        raise ValueError(_error_saldo(falla))
    if nuevas:
        auth.auditar(conn, usuario, "importacion", "compra", None, None, resumen, ip)
    conn.commit()
    return {"nuevas": nuevas, "repetidas": repetidas, "omitidas": omitidas}


def importar_traslados_csv(conn: sqlite3.Connection, texto: str, usuario: str = "cli", ip: str | None = None) -> dict[str, Any]:
    """Importa un CSV de traslados (`fecha,sats,sentido,txid,nota`), igual que `importar_csv`: salta repetidos e inválidos, así que se
    puede importar dos veces el mismo archivo. Un traslado es repetido si ya hay uno vigente con la misma fecha, sats y sentido
    (y mismo TXID si lo trae). Si el resultado dejaría la wallet en negativo o con más sats de los que posees, se rechaza todo el
    archivo (hay que importar las compras primero)."""
    lector = csv.DictReader(io.StringIO(texto.lstrip("﻿")))
    campos = {c.strip() for c in lector.fieldnames or []}
    if not {"fecha", "sats"} <= campos:
        raise ValueError("El CSV necesita las columnas fecha y sats.")
    nuevos = repetidos = 0
    omitidos: list[str] = []
    ids: list[int] = []
    creadas: list[str] = []
    for n, row in enumerate(lector, start=2):
        row = {(k or "").strip(): v for k, v in row.items()}
        try:
            fecha = parse_fecha((row.get("fecha") or "").strip())
            sats = parse_sats(_decimal(row.get("sats"), "Sats"))
            sentido = parse_sentido((row.get("sentido") or "").strip().lower() or None)
            txid = parse_txid(row.get("txid"))
            nota = parse_nota(row.get("nota"))
            nombre_w = " ".join((row.get("wallet") or "").split())
            wid = None
            if nombre_w and nombre_w.casefold() != PRINCIPAL.casefold():
                nombre_w = parse_nombre_wallet(nombre_w)
                existente = wallet_por_nombre(conn, nombre_w)
                if existente and existente["archivada"]:
                    raise ValueError(f"la wallet «{nombre_w}» está archivada")
                if existente:
                    wid = existente["id"]
                else:  # una wallet nueva en el archivo: se crea (con el mismo tope de siempre)
                    if conn.execute("SELECT COUNT(*) FROM wallets WHERE archivada IS NULL").fetchone()[0] >= MAX_WALLETS:
                        raise ValueError(f"ya hay {MAX_WALLETS} wallets además de la principal; no se crea «{nombre_w}»")
                    wid = int(conn.execute("INSERT INTO wallets (nombre, creado) VALUES (?, ?)", (nombre_w, int(time.time()))).lastrowid or 0)
                    creadas.append(nombre_w)
        except ValueError as e:
            omitidos.append(f"Línea {n}: {e}")
            continue
        if conn.execute("SELECT 1 FROM traslados WHERE anulada_ts IS NULL AND fecha = ? AND sats = ? AND sentido = ? AND COALESCE(wallet_id, 0) = ? "
                        "AND (? IS NULL OR txid IS NULL OR txid = ?)", (fecha, sats, sentido, wid or 0, txid, txid)).fetchone():
            repetidos += 1
            continue
        cur = conn.execute("INSERT INTO traslados (fecha, sats, sentido, txid, nota, creado, wallet_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                           (fecha, sats, sentido, txid, nota, int(time.time() * 1000), wid))
        ids.append(int(cur.lastrowid or 0))
        nuevos += 1
    if nuevos and (falla := falla_traslados(conn, traslados_vigentes(conn))):
        conn.rollback()
        raise ValueError(f"{falla} No se importó nada: importa primero las compras y revisa el orden de los traslados.")
    if nuevos:
        auth.auditar(conn, usuario, "importacion", "traslado", None, None,
                     {"nuevos": nuevos, "repetidos": repetidos, "omitidos": len(omitidos), "ids": ids[:500], **({"wallets_creadas": creadas} if creadas else {})}, ip)
    conn.commit()
    return {"nuevos": nuevos, "repetidos": repetidos, "omitidos": omitidos, **({"wallets_creadas": creadas} if creadas else {})}


# ------------------------------------------------------------------------ rutas
ESCRITURA = ("POST", "PUT", "DELETE", "PATCH")
PUBLICAS = {"/healthz", "/login", "/api/login", "/api/login/codigo", "/api/estado"}  # entrar con un código es entrar (campamento 21B)
# El código de la página no es secreto: módulos, estilos, fuentes e icono se sirven sin sesión.
RECURSO_PUBLICO = re.compile(r"/(?:[\w-]+\.js|styles\.css|icon\.svg|manifest\.webmanifest|(?:icon-[\w-]+|apple-touch-icon|arranque-\d+x\d+|grano)\.png|icon-(?:luna|oro)-\d\.svg|curvas\.svg|fonts/[\w.-]+)")


# ------------------------------------------- registros estructurados, métricas y errores del navegador (ideas 95, 96, 74)
LOG_PETICIONES = os.environ.get("LOG_PETICIONES", "1") != "0"
LENTA_MS = 1000       # una petición que tarda más de esto cuenta como «lenta»
MET_CADA = 60         # cada cuántos segundos cada proceso vuelca sus contadores a la base
MET_DIAS = 14
_MET_LOCK = threading.Lock()
_MET: dict[tuple[str, str], list[float]] = {}  # (día, ruta) -> [n, errores, lentas, ms_total, ms_max]
_MET_ULTIMO = [time.time()]


def registrar(nivel: str, evento: str, **campos: Any) -> None:
    """Una línea de registro en JSON (para `docker compose logs app`). Nunca lleva contraseñas, cuerpos, consultas ni IP."""
    print(json.dumps({"t": datetime.now(UTC).isoformat(timespec="seconds"), "nivel": nivel, "evento": evento, **campos}, ensure_ascii=False), flush=True)


def _ruta_de_la_peticion() -> str | None:
    """La regla de la ruta («/api/compras/<int:cid>»), no la URL con sus datos; None para los archivos estáticos y /healthz."""
    if request.path == "/healthz" or RECURSO_PUBLICO.fullmatch(request.path):
        return None
    regla = request.url_rule.rule if request.url_rule else None
    if regla in (None, "/<path:filename>"):
        return "otras" if not request.path.startswith("/api/") else "api: no existe"
    return regla


def registrar_metrica(ruta: str, estado: int, ms: float) -> None:
    clave = (ritmo.hoy_sv().isoformat(), ruta)
    with _MET_LOCK:
        m = _MET.setdefault(clave, [0, 0, 0, 0.0, 0.0])
        m[0] += 1
        m[1] += 1 if estado >= 500 else 0
        m[2] += 1 if ms >= LENTA_MS else 0
        m[3] += ms
        m[4] = max(m[4], ms)


def vaciar_metricas(conn: sqlite3.Connection | None = None) -> None:
    """Suma lo contado en este proceso a la tabla `metricas` (los dos procesos de gunicorn suman sobre las mismas filas)."""
    with _MET_LOCK:
        pendientes = dict(_MET)
        _MET.clear()
    _MET_ULTIMO[0] = time.time()
    if not pendientes:
        return
    c = conn or connect()
    try:
        for (dia, ruta), (n, e, lentas, tot, mx) in pendientes.items():
            c.execute("INSERT INTO metricas (dia, ruta, n, errores, lentas, ms_total, ms_max) VALUES (?, ?, ?, ?, ?, ?, ?) "
                      "ON CONFLICT (dia, ruta) DO UPDATE SET n = n + excluded.n, errores = errores + excluded.errores, "
                      "lentas = lentas + excluded.lentas, ms_total = ms_total + excluded.ms_total, ms_max = MAX(ms_max, excluded.ms_max)",
                      (dia, ruta, int(n), int(e), int(lentas), tot, mx))
        c.execute("DELETE FROM metricas WHERE dia < ?", ((ritmo.hoy_sv() - timedelta(days=MET_DIAS)).isoformat(),))
        c.commit()
    except sqlite3.Error as e:  # las métricas son un extra: nunca rompen una petición
        registrar("aviso", "metricas_sin_guardar", error=type(e).__name__)
    finally:
        if conn is None:
            c.close()


@app.before_request
def iniciar_peticion() -> None:
    g.t0 = time.perf_counter()
    rid = request.headers.get("X-Request-ID", "")
    g.rid = rid if re.fullmatch(r"[\w-]{8,64}", rid) else secrets.token_hex(6)


@app.after_request
def cerrar_peticion(resp: Response) -> Response:
    """Pone el identificador de la petición, la cuenta en las métricas y deja una línea de registro en JSON."""
    rid = g.get("rid")
    if rid:
        resp.headers["X-Request-ID"] = rid
    ruta = _ruta_de_la_peticion()
    t0 = g.get("t0")
    if ruta is not None and t0 is not None:
        ms = (time.perf_counter() - t0) * 1000
        registrar_metrica(ruta, resp.status_code, ms)
        if LOG_PETICIONES:
            u = g.get("usuario")
            registrar("error" if resp.status_code >= 500 else "info", "peticion", rid=rid, m=request.method, ruta=ruta, st=resp.status_code,
                      ms=round(ms), u=u["nombre"] if u else None)
        if time.time() - _MET_ULTIMO[0] > MET_CADA:
            vaciar_metricas()
    return resp


def _agente_corto(ua: str) -> str:
    """«Safari · iPhone»: solo el navegador y el sistema, nunca el texto completo del agente. La app instalada en el iPhone no lleva
    «Safari/» en su agente (solo «AppleWebKit/… Mobile/…»): también es Safari (campamento 24; antes salía «otro · iPhone»)."""
    nav = next((n for k, n in (("Edg/", "Edge"), ("OPR/", "Opera"), ("Firefox/", "Firefox"), ("Chrome/", "Chrome"), ("Safari/", "Safari"),
                               ("AppleWebKit/", "Safari")) if k in ua), "otro")
    so = next((n for k, n in (("iPhone", "iPhone"), ("iPad", "iPad"), ("Android", "Android"), ("Windows", "Windows"), ("Macintosh", "Mac"), ("Linux", "Linux")) if k in ua), "otro")
    return f"{nav} · {so}"


def _limpiar_mensaje(m: Any) -> str:
    """El mensaje de un error del navegador sin nada que identifique: sin enlaces, correos ni números largos, en una línea y corto."""
    if not isinstance(m, str):
        return ""
    t = re.sub(r"https?://\S+", "<enlace>", m)
    t = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "<correo>", t)
    t = re.sub(r"\d{6,}", "<número>", t)
    t = re.sub(r"[0-9a-fA-F]{32,}", "<código>", t)
    return " ".join("".join(ch for ch in t if ch.isprintable()).split())[:160]


_ERR_RECIENTES: dict[str, deque[float]] = {}
ERR_MAX, ERR_VENTANA, ERR_FILAS = 20, 600, 100  # por cuenta y proceso: 20 reportes cada 10 minutos; se guardan como mucho 100 errores distintos


@app.post("/api/errores")
def reportar_error() -> Any:
    """Un error de JavaScript en cualquier dispositivo (también de un lector): solo la pantalla y el mensaje, con límites estrictos."""
    cuerpo: Any = request.get_json(silent=True)
    if not isinstance(cuerpo, dict):
        return jsonify(error="Datos inválidos."), 400
    mensaje = _limpiar_mensaje(cuerpo.get("mensaje"))
    pantalla = cuerpo.get("pantalla") if isinstance(cuerpo.get("pantalla"), str) and re.fullmatch(r"/[a-z0-9/_-]{0,30}", cuerpo["pantalla"]) else "/"
    if not mensaje:
        return jsonify(error="Falta el mensaje."), 400
    ahora = time.time()
    cola = _ERR_RECIENTES.setdefault(quien(), deque())
    while cola and ahora - cola[0] > ERR_VENTANA:
        cola.popleft()
    if len(cola) >= ERR_MAX:
        return jsonify(error="Demasiados reportes."), 429
    cola.append(ahora)
    conn = db()
    agente = _agente_corto(request.headers.get("User-Agent", ""))
    conn.execute("INSERT INTO errores_js (primero, ultimo, pantalla, mensaje, agente, usuario) VALUES (?, ?, ?, ?, ?, ?) "
                 "ON CONFLICT (pantalla, mensaje, agente) DO UPDATE SET ultimo = excluded.ultimo, n = n + 1, usuario = excluded.usuario",
                 (int(ahora), int(ahora), pantalla, mensaje, agente, quien()))
    conn.execute("DELETE FROM errores_js WHERE id NOT IN (SELECT id FROM errores_js ORDER BY ultimo DESC LIMIT ?)", (ERR_FILAS,))
    conn.commit()
    return "", 204


@app.delete("/api/errores")
def limpiar_errores() -> Any:
    if g.usuario["rol"] != "admin":  # la ruta está abierta a lectores para reportar; borrar es solo del admin
        return jsonify(error="Solo el admin limpia la lista."), 403
    conn = db()
    n = conn.execute("DELETE FROM errores_js").rowcount
    conn.commit()
    return jsonify(quitados=n)


# ------------------------------------- modo solo lectura de emergencia y límite de escrituras (ideas 150, 151)
SOLO_LECTURA = os.environ.get("SOLO_LECTURA", "0") == "1"
LIMITE_ESCRITURAS = int(os.environ.get("LIMITE_ESCRITURAS", "120"))  # escrituras por cuenta y por minuto (por proceso)
_ESCRITURAS: dict[str, deque[float]] = {}


@app.before_request
def modo_mantenimiento() -> Any:
    """Con `SOLO_LECTURA=1` la app se sigue viendo entera pero ninguna escritura entra (salvo entrar y salir)."""
    if SOLO_LECTURA and request.method in ESCRITURA and request.path not in ("/api/login", "/api/login/codigo", "/api/logout"):
        return jsonify(error="La app está en mantenimiento: por ahora solo se puede mirar, no anotar.", mantenimiento=True), 503
    return None


def _demasiadas_escrituras(nombre: str) -> bool:
    """Un tope holgado por cuenta (120 por minuto) contra un navegador que repite peticiones sin parar o un uso malicioso. Importar un
    CSV grande es UNA escritura, así que el uso normal queda lejos."""
    ahora = time.time()
    cola = _ESCRITURAS.setdefault(nombre, deque())
    while cola and ahora - cola[0] > 60:
        cola.popleft()
    if len(cola) >= LIMITE_ESCRITURAS:
        return True
    cola.append(ahora)
    return False


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
    if request.method in ("GET", "HEAD") and ruta.startswith("/api/token/"):
        return None  # el enlace de solo lectura se autentica con su propio token (ver `leer_con_token`), no con la cookie
    api = ruta.startswith("/api/")
    conn = db()
    if not auth.hay_usuarios(conn):
        # Sin cuentas no se abre nada: la pantalla de entrada explica cómo crear el primer admin.
        return (jsonify(error="Aún no hay cuentas. Crea el primer admin en el servidor."), 503) if api else redirect("/login")
    u = auth.sesion(conn, request.cookies.get(COOKIE))
    if not u:
        return (jsonify(error="Inicia sesión."), 401) if api else redirect("/login")
    g.usuario = u
    if request.method in ESCRITURA and ruta not in ("/api/logout", "/api/errores") and _demasiadas_escrituras(u["nombre"]):
        resp = jsonify(error="Demasiadas operaciones seguidas. Espera un minuto.")
        resp.headers["Retry-After"] = "60"
        return resp, 429
    if request.method in ESCRITURA and u["rol"] != "admin" and ruta not in ("/api/logout", "/api/clave", "/api/visto", "/api/cambios-visto", "/api/errores") \
            and not ruta.startswith(("/api/push/", "/api/sesiones/", "/api/piedritas/", "/api/yo/", "/api/firmas/")):
        return jsonify(error="Tu cuenta es de solo lectura."), 403
    return None


# ------------------------------------------------------- estáticos versionados
# Sin build: al servir, index.html, los módulos y el CSS llevan ?v=<hash del contenido> en sus
# referencias. Así una caché intermedia (Cloudflare) nunca mezcla HTML nuevo con JS o CSS viejos.
# Y salen sin sus comentarios (recorte.py): en el código se quedan, porque son su documentación.
ESTATICOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
_REF_JS = re.compile(r"""((?:from|import)\s*['"]\./[\w-]+\.js)(['"])""")
_REF_HTML = re.compile(r"""((?:href|src)="/(?:[\w-]+\.(?:js|css)|fonts/[\w-]+\.woff2))(")""")
# En el CSS, las fuentes y las imágenes de fondo (`/grano.png`, `curvas.svg`): con la versión vigente van `immutable` (ver `cabeceras`).
_REF_CSS = re.compile(r"""(url\("(?:/fonts/[\w-]+\.woff2|/?[\w-]+\.(?:png|svg)))("\))""")
# Lo que, pedido con `?v=` de la versión vigente, no puede cambiar: la versión es el hash de todos los estáticos.
_VERSIONADO = re.compile(r"/(?:fonts/[\w.-]+|[\w-]+\.(?:png|svg))")


def _version() -> str:
    h = hashlib.sha256()
    for raiz, _, archivos in sorted(os.walk(ESTATICOS)):
        for nombre in sorted(archivos):
            ruta = os.path.join(raiz, nombre)
            h.update(os.path.relpath(ruta, ESTATICOS).encode())
            with open(ruta, "rb") as f:
                h.update(f.read())
    # Lo que se sirve depende también de cómo se recorta y se versiona: si cambia una regla, cambia la versión (los recursos con la
    # versión vigente van `immutable`: sin esto, un navegador o Cloudflare se quedarían un año con lo servido antes).
    with open(recorte.__file__, "rb") as f:
        h.update(f.read())
    for p in (_REF_JS, _REF_HTML, _REF_CSS):
        h.update(p.pattern.encode())
    return h.hexdigest()[:12]


VERSION = _version()
def _leer_version_git(v: str) -> str:
    """El commit desplegado (README, «Actualizar»): solo hex de 4 a 40; cualquier otra cosa (o nada) queda vacía."""
    v = v.strip()
    return v if re.fullmatch(r"[0-9a-f]{4,40}", v) else ""


VERSION_GIT = _leer_version_git(os.environ.get("VERSION_GIT", ""))


# Lo servido de cada archivo, una vez por proceso y versión: el texto limpio (sin comentarios y con `?v=`) y, si alguien lo pidió así,
# su gzip. Antes se leía el archivo y se pasaba la sustitución en cada petición.
_TEXTO_CACHE: dict[tuple[str, str], str] = {}
_GZ_CACHE: dict[tuple[str, str], bytes] = {}


def _texto_servido(nombre: str, patron: re.Pattern[str]) -> str:
    clave = (VERSION, nombre)
    if clave not in _TEXTO_CACHE:
        with open(os.path.join(ESTATICOS, nombre), encoding="utf-8") as f:
            _TEXTO_CACHE[clave] = patron.sub(rf"\1?v={VERSION}\2", recorte.sin_comentarios(f.read(), nombre))
    return _TEXTO_CACHE[clave]


def _servir_versionado(nombre: str, tipo: str, patron: re.Pattern[str], cache: str) -> Any:
    resp = Response(_texto_servido(nombre, patron), mimetype=tipo)
    resp.headers["Cache-Control"] = cache
    # La versión ya resume el contenido servido (archivos, recorte y referencias): el ETag cambia con cualquiera de ellos.
    resp.set_etag(f"{VERSION}-{nombre}")
    # Comprimido aquí mismo (los archivos de la app no cambian sin cambiar VERSION): se hace una vez por archivo y se guarda en memoria.
    # Caddy no vuelve a comprimir lo que ya trae `Content-Encoding`.
    resp.vary.add("Accept-Encoding")
    if "gzip" in request.headers.get("Accept-Encoding", "").lower():
        clave = (VERSION, nombre)
        if clave not in _GZ_CACHE:
            _GZ_CACHE[clave] = gzip.compress(resp.get_data(), compresslevel=9, mtime=0)
        resp.set_data(_GZ_CACHE[clave])
        resp.headers["Content-Encoding"] = "gzip"
        resp.set_etag(f"{VERSION}-{nombre}-gz")
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


@app.get("/guia")
def pantalla_guia() -> Any:
    """La guía de estilo viva (idea 90): una página para quien mantiene la app. No está enlazada; solo el admin la abre."""
    if g.usuario["rol"] != "admin":
        return Response("No existe.", status=404, mimetype="text/plain")
    return _servir_versionado("guia.html", "text/html", _REF_HTML, "no-store")


@app.get("/medir")
def pantalla_medir() -> Any:
    """«Medir este aparato» (campamento 24, idea 44): la app de siempre (el mismo index.html) que, abierta por aquí, mide cuánto tardó en
    verse el saldo y ofrece la prueba de desplazamiento (medir.js). Solo el admin; un lector recibe 404, como en /guia. Sin enlace en la
    app salvo el botón de «Estado del sistema»."""
    if g.usuario["rol"] != "admin":
        return Response("No existe.", status=404, mimetype="text/plain")
    return _servir_versionado("index.html", "text/html", _REF_HTML, "no-store")


@app.get("/api/estado")
def estado() -> Response:
    # Lo único público: si ya hay cuentas. No dice cuántas ni cuáles.
    return jsonify(abierto=auth.hay_usuarios(db()))


def _poner_cookie(resp: Response, token: str, duracion: int = auth.SESION_DESLIZANTE) -> None:
    resp.set_cookie(COOKIE, token, max_age=duracion, path="/", secure=True, httponly=True, samesite="Lax")


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
    compartido = isinstance(body, dict) and body.get("compartido") is True
    token = auth.crear_sesion(conn, u["id"], ip, _agente_corto(request.headers.get("User-Agent", "")), compartido)
    auth.auditar(conn, u["nombre"], "login", "usuario", u["id"], None, {"compartido": True} if compartido else None, ipr)
    conn.commit()
    resp = jsonify(usuario=u["nombre"], rol=u["rol"], compartido=compartido)
    _poner_cookie(resp, token, auth.SESION_COMPARTIDA_TOPE if compartido else auth.SESION_DESLIZANTE)
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
    fila = db().execute("SELECT visto_ts, cambios_visto, cumple FROM usuarios WHERE id = ?", (g.usuario["id"],)).fetchone()
    return jsonify(usuario=g.usuario["nombre"], rol=g.usuario["rol"], visto=fila["visto_ts"] if fila else None,
                   cambios=fila["cambios_visto"] if fila else None, cumple=fila["cumple"] if fila else None, mantenimiento=SOLO_LECTURA,
                   familia=familia_valle())


def familia_valle() -> dict[str, Any]:
    """Lo mínimo que necesita el valle (campamento 22): cuántas cuentas activas hay (una ventana encendida y una piscucha por persona) y
    sus iniciales, ordenadas (van grabadas en la roca las noches de luna llena). Ni nombres ni quién entra ni cuándo: solo con sesión."""
    nombres = [r["nombre"] for r in db().execute("SELECT nombre FROM usuarios WHERE activo = 1").fetchall()]
    iniciales = sorted((n.strip()[:1] or "?").upper() for n in nombres)
    return {"personas": len(nombres), "iniciales": "".join(iniciales)}


@app.get("/api/sesiones")
def listar_sesiones() -> Response:
    """Las sesiones abiertas de quien pregunta (idea 152), también un lector: solo las suyas, sin tokens."""
    lista = auth.sesiones_de(db(), g.usuario["id"], g.usuario["hash"])
    for x in lista:  # las anteriores a este cambio guardaban el texto del navegador, no el resumen
        if " · " not in x["agente"]:
            x["agente"] = _agente_corto(x["agente"])
    return jsonify(lista)


@app.delete("/api/sesiones/<sid>")
def cerrar_una_sesion(sid: str) -> Any:
    conn = db()
    if not auth.cerrar_una(conn, g.usuario["id"], sid, g.usuario["hash"]):
        return jsonify(error="Esa sesión ya no existe (o es la de este dispositivo: usa Salir)."), 404
    auth.auditar(conn, g.usuario["nombre"], "sesion_cerrada", "usuario", g.usuario["id"], ip=auth.ip_resumida(ip_real()))
    conn.commit()
    return "", 204


# ------------------------------------------------- conectar una tele con un código (campamento 21B, idea 43)
# Al revés que un «apruébalo en el teléfono»: desde la tele nadie pide nada (no hay una puerta pública que cree filas ni un «aprobar» que
# alguien pueda pedir con engaños). El admin crea en su teléfono un código de 8 cifras para una cuenta **lectora** («Tu cuenta → Sesiones
# abiertas → Conectar una tele»), lo ve una sola vez y lo teclea en la tele («Entrar con un código»). Caduca a los 5 minutos, sirve una vez,
# crear otro anula el que hubiera vivo y 5 fallos anulan los vivos; además, 10 intentos por minuto y proceso (429). En la base solo queda
# su SHA-256 y la auditoría nunca lo lleva. Da una sesión normal de esa cuenta (90 días, como cualquier otra), que se ve en sus
# «Sesiones abiertas» como «Tele · …».
CODIGO_TV_VIDA = 300
CODIGO_TV_FALLOS = 5
CODIGO_TV_POR_MINUTO = 10
_CODIGO_TV_INTENTOS: deque[float] = deque()  # instantes de los últimos intentos (por proceso)
CODIGO_TV_ERROR = "Ese código no sirve. Pide uno nuevo en «Tu cuenta → Sesiones abiertas → Conectar una tele»."


def _hash_codigo(codigo: str) -> str:
    return hashlib.sha256(codigo.encode()).hexdigest()


def _estado_codigo(f: sqlite3.Row, ahora: int) -> str:
    if f["usado_ts"]:
        return "usado"
    if f["fallos"] >= CODIGO_TV_FALLOS:
        return "anulado"
    return "vivo" if f["caduca"] > ahora else "caducado"


@app.get("/api/tv/codigo")
def ver_codigo_tv() -> Any:
    """Para «Conectar una tele» (solo admin): las cuentas lectoras y cómo va el último código que creó (vivo, usado…). Nunca el código."""
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo quien administra el libro conecta una tele."), 403
    conn = db()
    ahora = int(time.time())
    lectores = [r["nombre"] for r in conn.execute("SELECT nombre FROM usuarios WHERE rol = 'lector' AND activo = 1 ORDER BY nombre COLLATE NOCASE")]
    f = conn.execute("SELECT c.id, c.creado, c.caduca, c.usado_ts, c.fallos, u.nombre FROM codigos_tv c JOIN usuarios u ON u.id = c.usuario_id "
                     "WHERE c.creado_por = ? AND c.creado > ? ORDER BY c.id DESC LIMIT 1", (g.usuario["id"], ahora - 3600)).fetchone()
    codigo = {"id": f["id"], "usuario": f["nombre"], "caduca": f["caduca"], "usado": f["usado_ts"], "estado": _estado_codigo(f, ahora)} if f else None
    return jsonify(lectores=lectores, codigo=codigo, vida=CODIGO_TV_VIDA)


@app.post("/api/tv/codigo")
def crear_codigo_tv() -> Any:
    """Crea el código para que una tele entre con una cuenta lectora (nunca con la de un admin). Se muestra esta única vez."""
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo quien administra el libro conecta una tele."), 403
    body = request.get_json(silent=True)
    nombre = body.get("usuario") if isinstance(body, dict) else None
    if not isinstance(nombre, str) or not 0 < len(nombre.strip()) <= 64:
        return jsonify(error="Elige con qué cuenta entra la tele."), 400
    conn = db()
    u = auth.buscar(conn, nombre.strip())
    if not u or u["activo"] != 1:
        return jsonify(error="Esa cuenta no existe."), 400
    if u["rol"] != "lector":
        return jsonify(error="La tele solo entra con una cuenta de solo lectura: con una que anota se podría escribir desde la sala."), 400
    ahora = int(time.time())
    codigo = f"{secrets.randbelow(10**8):08d}"  # texto: los ceros de delante cuentan
    if conn.in_transaction:
        conn.commit()
    conn.execute("BEGIN IMMEDIATE")
    anulados = conn.execute("UPDATE codigos_tv SET caduca = ? WHERE usado_ts IS NULL AND caduca > ?", (ahora, ahora)).rowcount  # solo uno vivo
    cur = conn.execute("INSERT INTO codigos_tv (hash, usuario_id, creado, caduca, creado_por) VALUES (?, ?, ?, ?, ?)",
                       (_hash_codigo(codigo), u["id"], ahora, ahora + CODIGO_TV_VIDA, g.usuario["id"]))
    auth.auditar(conn, g.usuario["nombre"], "tele_codigo", "usuario", u["id"], None,
                 {"usuario": u["nombre"], "caduca": ahora + CODIGO_TV_VIDA, **({"anulados": anulados} if anulados else {})}, auth.ip_resumida(ip_real()))
    conn.commit()
    return jsonify(id=cur.lastrowid, codigo=codigo, usuario=u["nombre"], caduca=ahora + CODIGO_TV_VIDA, vida=CODIGO_TV_VIDA), 201


@app.post("/api/login/codigo")
def login_codigo() -> Any:
    """Entrar en la tele con el código. Pública como /api/login, con sus mismas defensas (Sec-Fetch-Site y X-Libro: `mismo_origen`).
    Un único mensaje de error: no dice si el código caducó, ya se usó o nunca existió."""
    ahora_f = time.time()
    while _CODIGO_TV_INTENTOS and ahora_f - _CODIGO_TV_INTENTOS[0] > 60:
        _CODIGO_TV_INTENTOS.popleft()
    if len(_CODIGO_TV_INTENTOS) >= CODIGO_TV_POR_MINUTO:  # el freno se mira antes de hacer ningún trabajo
        resp = jsonify(error="Demasiados intentos. Espera un minuto.")
        resp.headers["Retry-After"] = str(max(1, int(61 - (ahora_f - _CODIGO_TV_INTENTOS[0]))))
        return resp, 429
    _CODIGO_TV_INTENTOS.append(ahora_f)
    body = request.get_json(silent=True)
    crudo = body.get("codigo") if isinstance(body, dict) else None
    codigo = re.sub(r"[\s-]", "", crudo) if isinstance(crudo, str) and len(crudo) <= 32 else ""
    if not re.fullmatch(r"\d{8}", codigo):
        return jsonify(error="Escribe las 8 cifras del código."), 400
    conn = db()
    ahora, h = int(ahora_f), _hash_codigo(codigo)
    if conn.in_transaction:
        conn.commit()
    conn.execute("BEGIN IMMEDIATE")  # buscar, marcarlo usado y crear la sesión van juntos: dos teles con el mismo código, solo entra una
    acierto = None
    for f in conn.execute("SELECT id, hash, usuario_id FROM codigos_tv WHERE usado_ts IS NULL AND caduca > ?", (ahora,)).fetchall():
        if hmac.compare_digest(f["hash"], h) and acierto is None:  # se comparan todos, en tiempo constante
            acierto = f
    u = conn.execute("SELECT id, nombre, rol, activo FROM usuarios WHERE id = ?", (acierto["usuario_id"],)).fetchone() if acierto else None
    if not acierto or not u or u["activo"] != 1 or u["rol"] != "lector" \
            or conn.execute("UPDATE codigos_tv SET usado_ts = ? WHERE id = ? AND usado_ts IS NULL AND caduca > ?", (ahora, acierto["id"], ahora)).rowcount != 1:
        # Un fallo cuenta contra los códigos vivos: al quinto se anulan (aunque alguien adivinara, tendría 5 intentos entre 100 millones).
        conn.execute("UPDATE codigos_tv SET fallos = fallos + 1 WHERE usado_ts IS NULL AND caduca > ?", (ahora,))
        conn.execute("UPDATE codigos_tv SET caduca = ? WHERE usado_ts IS NULL AND caduca > ? AND fallos >= ?", (ahora, ahora, CODIGO_TV_FALLOS))
        conn.commit()
        return jsonify(error=CODIGO_TV_ERROR), 401
    auth.cerrar_sesion(conn, request.cookies.get(COOKIE))  # la cookie anterior, si había, deja de valer (como al entrar con contraseña)
    ip = ip_real()
    token = auth.crear_sesion(conn, u["id"], ip, f"Tele · {_agente_corto(request.headers.get('User-Agent', ''))}")
    auth.auditar(conn, u["nombre"], "tele_entro", "usuario", u["id"], None, {"codigo_id": acierto["id"]}, auth.ip_resumida(ip))
    conn.commit()
    resp = jsonify(usuario=u["nombre"], rol=u["rol"])
    _poner_cookie(resp, token)
    return resp


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
def _resp_push(prefs: dict[str, bool] | None, rol: str, horario: dict[str, int] | None = None, umbral: int | None = None) -> Response:
    cats = [{"id": c, "nombre": push.CATEGORIAS[c]["nombre"], "ayuda": push.CATEGORIAS[c]["ayuda"], "activo": prefs[c]}
            for c in push.categorias_de(rol)] if prefs is not None else []
    if prefs is None:
        return jsonify(suscrito=False, categorias=[])
    return jsonify(suscrito=True, categorias=cats, horario=horario or push.horario_defecto(), horario_defecto=push.horario_defecto(),
                   umbral_wallet=umbral or 0)


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
                      push.horario_dispositivo(db(), u["id"], body.get("endpoint")), push.umbral_dispositivo(db(), u["id"], body.get("endpoint")))


@app.post("/api/push/suscribir")
def push_suscribir() -> Any:
    body = _cuerpo_push()
    if body is None:
        return jsonify(error="Datos inválidos."), 400
    u = g.usuario
    try:
        prefs = push.suscribir(db(), u["id"], u["rol"], body.get("suscripcion"))
        s = body.get("suscripcion")
        ep = s.get("endpoint") if isinstance(s, dict) else None
        return _resp_push(prefs, u["rol"], push.horario_dispositivo(db(), u["id"], ep), push.umbral_dispositivo(db(), u["id"], ep))
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
        if "umbral_wallet" in body:  # el monto de «retirar a tu wallet» (solo el admin tiene esa categoría)
            if u["rol"] != "admin":
                return jsonify(error="Solo el admin elige ese monto."), 403
            push.guardar_umbral(db(), u["id"], endpoint, body.get("umbral_wallet"))
        prefs = push.guardar_prefs(db(), u["id"], u["rol"], endpoint, body["prefs"]) if "prefs" in body \
            else push.estado(db(), u["id"], u["rol"], endpoint)
        return _resp_push(prefs, u["rol"], push.horario_dispositivo(db(), u["id"], endpoint), push.umbral_dispositivo(db(), u["id"], endpoint))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except LookupError as e:
        return jsonify(error=str(e)), 404


@app.post("/api/push/prueba")
def push_prueba() -> Any:
    """Manda un aviso de prueba solo al dispositivo que lo pide (idea 143), con un mínimo de 30 s entre uno y otro."""
    body = _cuerpo_push() or {}
    try:
        return jsonify(push.probar(db(), g.usuario["id"], body.get("endpoint")))
    except LookupError as e:
        return jsonify(error=str(e)), 404
    except PermissionError as e:
        resp = jsonify(error=f"Espera {e} segundos antes de pedir otra prueba.")
        resp.headers["Retry-After"] = str(e)
        return resp, 429


@app.post("/api/push/baja")
def push_baja() -> Any:
    body = _cuerpo_push() or {}
    push.baja(db(), g.usuario["id"], body.get("endpoint"))
    return "", 204


# La voz del libro (idea 48): al avisar de una compra, una frase del paisaje. Rota por el id de la compra (no al azar: cada compra
# siempre dice la misma, y se puede probar). Nada de «compra ahora»: solo describe la montaña.
FRASES_PAISAJE = (
    "Hay un pino más al pie de la montaña.",
    "El sendero sube un poco más.",
    "Un farol más cerca en el camino.",
    "La montaña guarda otro paso.",
    "El campamento queda un poco más cerca.",
)


def frase_paisaje(cid: int) -> str:
    return FRASES_PAISAJE[cid % len(FRASES_PAISAJE)]


def _avisar_movimiento(conn: sqlite3.Connection, antes: list[Mov], cid: int, nueva: dict[str, Any]) -> None:
    """Avisa de un movimiento nuevo a quien tenga esa categoría (y, en una compra, de la etapa o constancia que cruce)."""
    try:
        sats, quien_ = nueva["sats"], quien()
        if nueva["tipo"] == "venta":
            if nueva.get("nota") != "Comisión de retiro":  # la comisión de un traslado no es una novedad para la familia
                push.notificar(conn, "movimiento", "Libro DCA", f"{quien_} anotó una venta o gasto de {sats:,} sats", f"mov-{cid}")
            return
        extra = "extra " if nueva.get("extra") else ""
        push.notificar(conn, "movimiento", "Libro DCA", f"{quien_} anotó una compra {extra}de {sats:,} sats. {frase_paisaje(cid)}", f"mov-{cid}")
        saldo = sum(-s if tipo == "venta" else s for _f, _i, tipo, s in antes)
        if (m := ritmo.etapa_celebrada(saldo, saldo + sats)) is not None:
            # La destacada si fueron varias (un campamento o una principal antes que una intermedia; campamento 21), como la celebración.
            # Telegrama (idea 59): el aviso de etapa llega como en los viejos telegramas.
            push.notificar(conn, "hito", "Libro DCA", f"LLEGÓ A {ritmo.nombre_hito(m)} STOP SIGUE EL SENDERO STOP", f"hito-{cid}")
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


# ------------------------------------------------------------- estado del sistema (ideas 53, 145, 46, 96, 74)
def chequeo_contable(conn: sqlite3.Connection) -> list[str]:
    """Reglas contables que deben cumplirse siempre (idea 46). Devuelve lo que NO cuadra, en texto; lista vacía = todo bien.
    Solo avisa: nunca corrige nada por su cuenta. El servidor valida los traslados al crearlos o anularlos, pero una venta, anular
    o editar una compra después pueden dejar la wallet con más sats de los que hay: aquí se detecta."""
    problemas: list[str] = []
    if fecha := saldo_negativo(movimientos(conn)):
        problemas.append(f"El saldo queda en negativo el {fecha}: hay ventas o gastos que no alcanzan con lo comprado hasta entonces.")
    if falla := falla_traslados(conn, traslados_vigentes(conn)):
        problemas.append(f"Los traslados no cuadran con las compras. {falla}")
    return problemas


_TIPO_PUSH = (("fcm.googleapis.com", "Google (Chrome o Android)"), ("push.apple.com", "Apple (iPhone o Safari)"),
              ("push.services.mozilla.com", "Mozilla (Firefox)"), ("notify.windows.com", "Windows (Edge)"))


def _tipo_dispositivo(endpoint: str) -> str:
    return next((nombre for host, nombre in _TIPO_PUSH if host in endpoint), "otro")


def estado_sistema(conn: sqlite3.Connection) -> dict[str, Any]:
    """Todo lo que ve el admin en «Estado del sistema». Solo estados y fechas: ni claves, ni endpoints, ni contenido de las compras."""
    ahora = int(time.time())
    carpeta = os.environ.get("BACKUP_DIR", "/data/backups")
    ultimo = salud.ultimo_respaldo(carpeta)
    prueba = None
    try:
        marca = os.path.join(carpeta, ".restauracion")
        with open(marca) as f:
            prueba = {"ts": int(os.path.getmtime(marca)), "bien": " bien" in f.read()}
    except OSError:
        pass
    latido = _meta(conn, "avisos_latido")
    integ = (_meta(conn, "aviso_integridad") or "").split(":", 1)
    uso = shutil.disk_usage(os.path.dirname(DB_PATH) or ".")
    vaciar_metricas(conn)  # incluye lo que este proceso lleva contado
    desde = (ritmo.hoy_sv() - timedelta(days=6)).isoformat()
    metricas = [{"ruta": r["ruta"], "n": r["n"], "errores": r["errores"], "lentas": r["lentas"], "ms_medio": round(r["ms_total"] / r["n"]) if r["n"] else 0,
                 "ms_max": round(r["ms_max"])} for r in conn.execute(
        "SELECT ruta, SUM(n) AS n, SUM(errores) AS errores, SUM(lentas) AS lentas, SUM(ms_total) AS ms_total, MAX(ms_max) AS ms_max "
        "FROM metricas WHERE dia >= ? GROUP BY ruta ORDER BY n DESC LIMIT 15", (desde,))]
    return {
        "ahora": ahora, "version": VERSION, "commit": VERSION_GIT[:12], "esquema": version_esquema(conn),
        "respaldo": {"ultimo": int(ultimo) if ultimo else None, "ok": ultimo is not None and ahora - ultimo < 36 * 3600, "prueba": prueba},
        "avisos": {"latido": int(latido) if latido else None, "vivo": latido is not None and ahora - int(latido) < salud.LATIDO_MAX_SEGUNDOS},
        "integridad": {"estado": integ[0] if integ[0] in ("ok", "mal") else None, "cuando": integ[1] if len(integ) > 1 else None},
        "disco": {"libre": uso.free, "total": uso.total, "pct_libre": round(uso.free / uso.total * 100, 1) if uso.total else None},
        "cuentas": chequeo_contable(conn),
        "dispositivos": [{"usuario": r["nombre"], "tipo": _tipo_dispositivo(r["endpoint"]), "creado": r["creado"], "ultimo_ok": r["ultimo_ok"], "fallos": r["fallos"],
                          "categorias": [c for c, on in push.prefs_efectivas(r["prefs"], r["rol"]).items() if on]}
                         for r in conn.execute("SELECT u.nombre, u.rol, s.endpoint, s.creado, s.ultimo_ok, s.fallos, s.prefs FROM suscripciones s "
                                               "JOIN usuarios u ON u.id = s.usuario_id ORDER BY u.nombre, s.id")],
        "metricas": metricas,
        "errores": [dict(r) for r in conn.execute("SELECT ultimo, pantalla, mensaje, agente, usuario, n FROM errores_js ORDER BY ultimo DESC LIMIT 20")],
        "medidas": [_medida_json(r) for r in conn.execute(f"SELECT {MEDIDA_COLS} FROM medidas_aparato ORDER BY id DESC LIMIT ?", (MEDIDAS_MAX,))],
        "resguardo": resguardo(conn),
    }


@app.get("/api/sistema")
def ver_sistema() -> Any:
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo el admin ve el estado del sistema."), 403
    return jsonify(estado_sistema(db()))


# ------------------------------------------------- medir este aparato (campamento 24, idea 44)
# El admin abre /medir en un aparato (el iPhone, sobre todo): la app mide cuánto tardó en verse el saldo y, al pedirlo, cuántos fotogramas
# por segundo da al deslizar. Aquí solo se valida y se guarda: números en sus rangos, tres textos de una lista y el agente resumido que
# saca el servidor (nunca el texto completo, ni la IP, ni la cuenta). No se audita, como los errores del navegador y las métricas: es un
# dato del aparato, no del libro, y el Historial es para lo que cambia el libro o el acceso. Cuenta para el límite de escrituras.
MEDIDAS_MAX = 50
MEDIDA_COLS = ("id, creado, agente, instalada, saldo_ms, red_ms, fps, fps_escena, fps_peor, fps_p5, tirones, hz, duracion_ms, recorrido, "
               "efectos, ligero, tema, ancho, alto, dpr, memoria, nucleos, carga")
# (campo, entero?, mínimo, máximo, opcional)
_MEDIDA_NUMEROS: tuple[tuple[str, bool, float, float, bool], ...] = (
    ("saldo_ms", True, 0, 120_000, False), ("red_ms", True, 0, 120_000, True),
    ("fps", False, 0.5, 1000, False), ("fps_escena", False, 0.5, 1000, True), ("fps_peor", False, 0.1, 1000, False), ("fps_p5", False, 0.1, 1000, False),
    ("tirones", True, 0, 100_000, False), ("hz", True, 1, 1000, False), ("duracion_ms", True, 1000, 60_000, False), ("recorrido", True, 0, 1_000_000, False),
    ("ancho", True, 100, 20_000, False), ("alto", True, 100, 20_000, False), ("dpr", False, 0.25, 10, False),
    ("memoria", False, 0.1, 4096, True), ("nucleos", True, 1, 1024, True),
)
_MEDIDA_TEXTOS = {"efectos": ("todos", "esenciales", "ninguno"), "tema": ("claro", "oscuro"), "carga": ("navegar", "recargar", "historial", "otra")}


def parse_medida(body: Any) -> dict[str, Any]:
    """Valida una medida; ValueError con el motivo (en español) si algo no está en su rango."""
    if not isinstance(body, dict):
        raise ValueError("Medida inválida.")
    out: dict[str, Any] = {}
    for campo, entero, lo, hi, opcional in _MEDIDA_NUMEROS:
        v = body.get(campo)
        if v is None and opcional:
            out[campo] = None
            continue
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not lo <= v <= hi or (entero and not float(v).is_integer()):
            raise ValueError(f"Medida inválida: «{campo}» debe ser {'un entero' if entero else 'un número'} entre {lo:g} y {hi:g}.")
        out[campo] = int(v) if entero else round(float(v), 2)
    for campo, valores in _MEDIDA_TEXTOS.items():
        v = body.get(campo, "otra" if campo == "carga" else None)
        if v not in valores:
            raise ValueError(f"Medida inválida: «{campo}» debe ser {', '.join(valores)}.")
        out[campo] = v
    for campo in ("ligero", "instalada"):
        v = body.get(campo, False)
        if not isinstance(v, bool):
            raise ValueError(f"Medida inválida: «{campo}» debe ser verdadero o falso.")
        out[campo] = int(v)
    return out


def _medida_json(r: sqlite3.Row) -> dict[str, Any]:
    return {**dict(r), "instalada": bool(r["instalada"]), "ligero": bool(r["ligero"])}


@app.post("/api/medidas")
def guardar_medida() -> Any:
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo quien administra el libro mide los aparatos."), 403
    try:
        m = parse_medida(request.get_json(silent=True))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    m.update(creado=int(time.time()), agente=_agente_corto(request.headers.get("User-Agent", "")))
    cols = [c.strip() for c in MEDIDA_COLS.split(",") if c.strip() != "id"]
    cur = conn.execute(f"INSERT INTO medidas_aparato ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", [m[c] for c in cols])
    conn.execute("DELETE FROM medidas_aparato WHERE id NOT IN (SELECT id FROM medidas_aparato ORDER BY id DESC LIMIT ?)", (MEDIDAS_MAX,))
    conn.commit()
    return jsonify(_medida_json(conn.execute(f"SELECT {MEDIDA_COLS} FROM medidas_aparato WHERE id = ?", (cur.lastrowid,)).fetchone())), 201


@app.delete("/api/medidas")
def borrar_medidas() -> Any:
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo quien administra el libro borra las medidas."), 403
    conn = db()
    n = conn.execute("DELETE FROM medidas_aparato").rowcount
    conn.commit()
    return jsonify(quitados=n)


# ------------------------------------------------- revisión tranquila del respaldo (campamento 24, idea 36)
# Cada 180 días, una pregunta al admin (categoría push `resguardo`, apagada): ¿el respaldo de la wallet y la nota para la familia siguen
# donde los dejó? Revisar es mirarlo él mismo: la app NUNCA pide ni guarda la frase ni nada de la wallet, solo la fecha en que tocó
# «Revisado». Todo vive en `meta` (sin migración): `resguardo_revisado` (la última revisión), `resguardo_inicio` (cuándo se encendió el
# aviso en algún dispositivo; lo pone y lo quita `avisos._resguardo`; solo cuenta si nunca se revisó) y `aviso_resguardo` (el último
# aviso). Las fechas salen de
# `push.ahora()` (hora de El Salvador), así las pruebas pueden mover el reloj.
RESGUARDO_DIAS = 180
TEXTO_RESGUARDO = ("¿Tu respaldo de la wallet y la nota para tu familia siguen donde los dejaste? Cuando puedas, míralo tú y marca "
                   "«Revisado» en «Estado del sistema». La app no guarda nada de eso.")


def _ts_meta(conn: sqlite3.Connection, clave: str) -> int | None:
    v = _meta(conn, clave)
    try:
        return int(v) if v else None
    except ValueError:
        return None


def _dia_sv(ts: int) -> date:
    return datetime.fromtimestamp(ts, ritmo.ZONA).date()


def resguardo(conn: sqlite3.Connection) -> dict[str, Any]:
    """La regla de la revisión del respaldo, la misma para «Estado del sistema» y para el aviso (así la fecha que se ve es la que suena).
    El próximo aviso llega 180 días después del último «Revisado» (o del último aviso, si es más reciente: nunca más de uno cada 180 días).
    Si nunca se tocó «Revisado», en lugar de la revisión cuenta el día en que se encendió el aviso: así no suena el día del despliegue (viene
    apagado) ni el día en que se enciende. Sin ningún dispositivo con la categoría encendida no hay próximo aviso (`proximo` None)."""
    ahora = push.ahora()
    hoy = ritmo.hoy_sv(ahora)
    revisado = _ts_meta(conn, "resguardo_revisado")
    encendido = bool(push.destinatarios(conn, "resguardo"))
    # Solo sin ninguna revisión cuenta el día en que se encendió. Antes de la primera pasada de `avisos` (cada 2 minutos) aún no está
    # anotado: se cuenta desde ahora, que es lo que va a anotar.
    inicio = (_ts_meta(conn, "resguardo_inicio") or int(ahora.timestamp())) if encendido and not revisado else None
    base = max((t for t in (revisado, inicio, _ts_meta(conn, "aviso_resguardo")) if t), default=None)
    proximo = _dia_sv(base) + timedelta(days=RESGUARDO_DIAS) if encendido and base else None
    dias = (hoy - _dia_sv(revisado)).days if revisado else None
    return {"revisado": _dia_sv(revisado).isoformat() if revisado else None, "dias": dias, "cada": RESGUARDO_DIAS,
            "al_dia": dias is not None and dias < RESGUARDO_DIAS, "encendido": encendido, "proximo": proximo.isoformat() if proximo else None,
            "toca": proximo is not None and hoy >= proximo}


@app.post("/api/resguardo")
def marcar_resguardo() -> Any:
    """«Revisado»: anota (y audita) que hoy el admin miró su respaldo. Tocarlo otra vez el mismo día no cambia nada ni se audita dos veces.
    Lo que ya estaba guardado de noche para este aviso se descarta: no llega después de revisar."""
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo quien lleva el libro anota la revisión del respaldo."), 403
    conn = db()
    ahora = push.ahora()
    hoy = ritmo.hoy_sv(ahora)
    previo = _ts_meta(conn, "resguardo_revisado")
    antes = _dia_sv(previo) if previo else None
    if antes != hoy:
        _meta_poner(conn, "resguardo_revisado", str(int(ahora.timestamp())))
        conn.execute("DELETE FROM avisos_pendientes WHERE categoria = 'resguardo'")
        auth.auditar(conn, quien(), "resguardo_revisado", "libro", None, {"fecha": antes.isoformat()} if antes else None, {"fecha": hoy.isoformat()},
                     auth.ip_resumida(ip_real()))
        conn.commit()
    return jsonify({**resguardo(conn), "ya": antes == hoy})


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
        etiquetas = parse_etiquetas(body.get("etiquetas"))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    conn = db()
    if tipo == "venta" and (falla := saldo_negativo(movimientos(conn) + [(c[0], 10**12, "venta", c[3])])):
        return jsonify(error=_error_saldo(falla)), 400
    antes = movimientos(conn)
    cid = insertar(conn, c, txid, tipo, nota, extra, etiquetas)
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
        etiquetas = parse_etiquetas(body.get("etiquetas")) if "etiquetas" in body else None
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
    if "etiquetas" not in body:  # un cliente que no manda el campo no borra las etiquetas guardadas
        etiquetas = previa["etiquetas"]
    if tipo == "venta":
        if extra and "extra" in body:
            return jsonify(error="Solo una compra puede ser extra."), 400
        extra = 0  # una venta nunca es extra
    otros = [m for m in movimientos(conn) if m[1] != cid]
    if falla := saldo_negativo(otros + [(fecha, cid, tipo, sats)]):
        return jsonify(error=_error_saldo(falla)), 400
    conn.execute("UPDATE compras SET fecha = ?, monto = ?, precio = ?, sats = ?, txid = ?, tipo = ?, nota = ?, extra = ?, etiquetas = ? WHERE id = ?",
                 (fecha, monto, precio, sats, txid, tipo, nota, extra, etiquetas, cid))
    nueva = fila(conn.execute(f"SELECT {COLS} FROM compras WHERE id = ?", (cid,)).fetchone())
    auth.auditar(conn, quien(), "edicion", "compra", cid, fila(previa), nueva, auth.ip_resumida(ip_real()))
    conn.commit()
    push.vigilar_tx(conn, txid)
    rep = txid_repetido(conn, txid, cid)
    return jsonify({**nueva, **({"txid_repetido": rep} if rep else {})})


@app.get("/api/traslados")
def listar_traslados() -> Response:
    rows = db().execute(f"SELECT {TRAS_COLS} FROM traslados WHERE anulada_ts IS NULL ORDER BY fecha, id").fetchall()
    return jsonify([fila_traslado(r) for r in rows])


@app.get("/api/wallets")
def listar_wallets() -> Response:
    """Las wallets además de la principal (también las archivadas, para poder nombrar traslados viejos). Las ven todos, como los traslados."""
    conn = db()
    saldos = saldos_wallets(traslados_vigentes(conn))
    return jsonify([{"id": r["id"], "nombre": r["nombre"], "archivada": bool(r["archivada"]), "sats": max(0, saldos.get(r["id"], 0))}
                    for r in conn.execute("SELECT id, nombre, archivada FROM wallets ORDER BY id")])


@app.post("/api/wallets")
def crear_wallet() -> Any:
    if (e := _solo_admin()) is not None:
        return e
    body = request.get_json(silent=True)
    try:
        nombre = parse_nombre_wallet(body.get("nombre") if isinstance(body, dict) else None)
    except ValueError as err:
        return jsonify(error=str(err)), 400
    conn = db()
    if nombre.casefold() == PRINCIPAL.casefold() or wallet_por_nombre(conn, nombre):
        return jsonify(error="Ya tienes una wallet con ese nombre."), 400
    if conn.execute("SELECT COUNT(*) FROM wallets WHERE archivada IS NULL").fetchone()[0] >= MAX_WALLETS:
        return jsonify(error=f"Ya tienes {MAX_WALLETS} wallets además de la principal. Archiva alguna antes de añadir otra."), 400
    cur = conn.execute("INSERT INTO wallets (nombre, creado) VALUES (?, ?)", (nombre, int(time.time())))
    wid = int(cur.lastrowid or 0)
    auth.auditar(conn, quien(), "wallet_creada", "wallet", wid, None, {"nombre": nombre}, auth.ip_resumida(ip_real()))
    conn.commit()
    return jsonify(id=wid, nombre=nombre, archivada=False, sats=0), 201


@app.delete("/api/wallets/<int:wid>")
def archivar_wallet(wid: int) -> Any:
    """Archivar: deja de recibir traslados, pero su historia se conserva. Solo si ya no tiene sats."""
    if (e := _solo_admin()) is not None:
        return e
    conn = db()
    f = conn.execute("SELECT id, nombre FROM wallets WHERE id = ? AND archivada IS NULL", (wid,)).fetchone()
    if not f:
        return jsonify(error="Esa wallet no existe o ya está archivada."), 404
    queda = saldos_wallets(traslados_vigentes(conn)).get(wid, 0)
    if queda > 0:
        return jsonify(error=f"«{f['nombre']}» todavía tiene {queda:,} sats. Anota un traslado de vuelta al exchange o a otra wallet antes de archivarla."), 409
    conn.execute("UPDATE wallets SET archivada = ? WHERE id = ?", (int(time.time()), wid))
    auth.auditar(conn, quien(), "wallet_archivada", "wallet", wid, {"nombre": f["nombre"]}, None, auth.ip_resumida(ip_real()))
    conn.commit()
    return "", 204


# ------------------------------------------------- mensajes en la bandera y cápsulas selladas (campamento 15)
HITOS_MENSAJE = tuple(10**n for n in range(5, 13))  # los campamentos: 100k, 1M, 10M… 1,000 BTC
MAX_MENSAJE, MAX_CARTA, MAX_CAPSULAS = 160, 1000, 20
MAX_SATS = 21_000_000 * 10**8


def saldo_actual(conn: sqlite3.Connection) -> int:
    return max(0, sum(-s if tipo == "venta" else s for _f, _i, tipo, s in movimientos(conn)))


def parse_mensaje(v: Any) -> str:
    """Una frase de hasta 160 caracteres, en una sola línea. Vacía = borrar el mensaje."""
    if v is None:
        return ""
    if not isinstance(v, str):
        raise ValueError("Mensaje inválido.")
    t = " ".join("".join(ch for ch in v if ch.isprintable() or ch in "\t\n").split())
    if len(t) > MAX_MENSAJE:
        raise ValueError(f"El mensaje admite hasta {MAX_MENSAJE} caracteres.")
    return t


def parse_carta(v: Any) -> str:
    """El texto de una carta: hasta 1,000 caracteres; se conservan los saltos de línea (pero no más de uno en blanco seguido)."""
    if not isinstance(v, str):
        raise ValueError("Escribe la carta.")
    lineas = ["".join(ch for ch in ln if ch.isprintable() or ch == "\t").rstrip() for ln in v.replace("\r", "").split("\n")]
    t = re.sub(r"\n{3,}", "\n\n", "\n".join(lineas)).strip()
    if not t:
        raise ValueError("Escribe la carta.")
    if len(t) > MAX_CARTA:
        raise ValueError(f"La carta admite hasta {MAX_CARTA} caracteres.")
    return t


@app.get("/api/mensajes")
def listar_mensajes() -> Response:
    """Las frases de las banderas. Las ven todos, pero la de un campamento que aún no alcanzas llega sellada (sin texto): es una sorpresa."""
    conn = db()
    admin = g.usuario["rol"] == "admin"
    saldo = saldo_actual(conn)
    out = []
    for r in conn.execute("SELECT hito, texto, por FROM mensajes_bandera ORDER BY hito"):
        visible = admin or saldo >= r["hito"]
        out.append({"hito": r["hito"], "sellado": not visible, "texto": r["texto"] if visible else None, "por": r["por"]})
    return jsonify(out)


@app.put("/api/mensajes/<int:hito>")
def guardar_mensaje(hito: int) -> Any:
    if (e := _solo_admin()) is not None:
        return e
    if hito not in HITOS_MENSAJE:
        return jsonify(error="Ese campamento no existe."), 400
    body = request.get_json(silent=True)
    try:
        texto = parse_mensaje(body.get("texto") if isinstance(body, dict) else None)
    except ValueError as err:
        return jsonify(error=str(err)), 400
    conn = db()
    antes = conn.execute("SELECT texto FROM mensajes_bandera WHERE hito = ?", (hito,)).fetchone()
    if not texto:
        conn.execute("DELETE FROM mensajes_bandera WHERE hito = ?", (hito,))
    else:
        conn.execute("INSERT INTO mensajes_bandera (hito, texto, actualizado, por) VALUES (?, ?, ?, ?) "
                     "ON CONFLICT(hito) DO UPDATE SET texto = excluded.texto, actualizado = excluded.actualizado, por = excluded.por",
                     (hito, texto, int(time.time()), quien()))
    auth.auditar(conn, quien(), "mensaje_bandera", "campamento", hito, {"texto": antes["texto"]} if antes else None, {"texto": texto} if texto else None,
                 auth.ip_resumida(ip_real()))
    conn.commit()
    return jsonify(hito=hito, texto=texto or None)


def _capsula_json(r: sqlite3.Row, saldo: int, hoy: str, admin: bool) -> dict[str, Any]:
    abierta = bool(r["abierta_ts"]) or (r["abre_fecha"] is not None and hoy >= r["abre_fecha"]) or (r["abre_sats"] is not None and saldo >= r["abre_sats"])
    return {"id": r["id"], "abre_fecha": r["abre_fecha"], "abre_sats": r["abre_sats"], "creado": r["creado"], "autor": r["autor"],
            "abierta": abierta, "abierta_ts": r["abierta_ts"], "texto": r["texto"] if (abierta or admin) else None}


@app.get("/api/capsulas")
def listar_capsulas() -> Response:
    """Las cartas selladas. Las ven todos; el texto solo llega cuando la carta ya se abrió (el dueño la ve siempre: la escribió él)."""
    conn = db()
    admin = g.usuario["rol"] == "admin"
    saldo, hoy = saldo_actual(conn), date.today().isoformat()
    out = []
    for r in conn.execute("SELECT id, texto, abre_fecha, abre_sats, creado, autor, abierta_ts FROM capsulas WHERE anulada_ts IS NULL ORDER BY id"):
        c = _capsula_json(r, saldo, hoy, admin)
        if c["abierta"] and not r["abierta_ts"]:  # primera vez que se ve abierta: queda abierta aunque el saldo luego baje
            ahora = int(time.time())
            conn.execute("UPDATE capsulas SET abierta_ts = ? WHERE id = ? AND abierta_ts IS NULL", (ahora, r["id"]))
            c["abierta_ts"] = ahora
        out.append(c)
    conn.commit()
    return jsonify(out)


@app.post("/api/capsulas")
def sellar_capsula() -> Any:
    if (e := _solo_admin()) is not None:
        return e
    body: Any = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error="Datos inválidos."), 400
    conn = db()
    try:
        texto = parse_carta(body.get("texto"))
        fecha, sats = body.get("abre_fecha"), body.get("abre_sats")
        if (fecha is None) == (sats is None):
            raise ValueError("Elige cuándo se abre: una fecha o un saldo.")
        if fecha is not None:
            if not isinstance(fecha, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", fecha):
                raise ValueError("Fecha inválida.")
            d = date.fromisoformat(fecha)
            if d <= date.today():
                raise ValueError("La fecha tiene que ser futura.")
            if d > date.today() + timedelta(days=366 * 40):
                raise ValueError("Esa fecha queda demasiado lejos.")
        else:
            if isinstance(sats, bool) or not isinstance(sats, int) or sats <= 0 or sats > MAX_SATS:
                raise ValueError("Saldo inválido.")
            if sats <= saldo_actual(conn):
                raise ValueError("Ese saldo ya lo tienes: elige uno más arriba.")
    except ValueError as err:
        return jsonify(error=str(err)), 400
    if conn.execute("SELECT COUNT(*) FROM capsulas WHERE anulada_ts IS NULL AND abierta_ts IS NULL").fetchone()[0] >= MAX_CAPSULAS:
        return jsonify(error=f"Ya hay {MAX_CAPSULAS} cartas selladas. Espera a que se abra alguna."), 400
    cur = conn.execute("INSERT INTO capsulas (texto, abre_fecha, abre_sats, creado, autor) VALUES (?, ?, ?, ?, ?)",
                       (texto, fecha, sats, int(time.time()), quien()))
    cid = int(cur.lastrowid or 0)
    auth.auditar(conn, quien(), "capsula_sellada", "capsula", cid, None, {"abre_fecha": fecha, "abre_sats": sats, "largo": len(texto)}, auth.ip_resumida(ip_real()))
    conn.commit()
    r = conn.execute("SELECT id, texto, abre_fecha, abre_sats, creado, autor, abierta_ts FROM capsulas WHERE id = ?", (cid,)).fetchone()
    return jsonify(_capsula_json(r, saldo_actual(conn), date.today().isoformat(), True)), 201


@app.delete("/api/capsulas/<int:cid>")
def anular_capsula(cid: int) -> Any:
    """Una carta aún sellada se puede anular (queda la fila). Una ya abierta es parte de la historia: no."""
    if (e := _solo_admin()) is not None:
        return e
    conn = db()
    r = conn.execute("SELECT id, texto, abre_fecha, abre_sats, creado, autor, abierta_ts FROM capsulas WHERE id = ? AND anulada_ts IS NULL", (cid,)).fetchone()
    if not r:
        return jsonify(error="Esa carta no existe."), 404
    if _capsula_json(r, saldo_actual(conn), date.today().isoformat(), True)["abierta"]:
        return jsonify(error="Esa carta ya se abrió: es parte de la historia y no se borra."), 409
    conn.execute("UPDATE capsulas SET anulada_ts = ? WHERE id = ?", (int(time.time()), cid))
    auth.auditar(conn, quien(), "capsula_anulada", "capsula", cid, {"abre_fecha": r["abre_fecha"], "abre_sats": r["abre_sats"]}, None, auth.ip_resumida(ip_real()))
    conn.commit()
    return "", 204


# ------------------------------------------------- la apacheta y los cumpleaños (campamento 15B)
@app.get("/api/piedritas")
def listar_piedritas() -> Response:
    """Las piedritas que los lectores dejaron en las compras vigentes. Las ven todos (quién la dejó y cuándo)."""
    rows = db().execute("""SELECT p.compra_id, u.nombre AS quien, p.creado FROM piedritas p
        JOIN usuarios u ON u.id = p.usuario_id JOIN compras c ON c.id = p.compra_id
        WHERE c.anulada_ts IS NULL AND c.tipo = 'compra' ORDER BY p.creado, p.compra_id""").fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/piedritas/<int:cid>")
def dejar_piedrita(cid: int) -> Any:
    """Un lector deja una piedrita en una compra (una por persona y compra; repetirla no hace nada). Es su primera escritura: un toque, sin texto."""
    u = g.usuario
    if u["rol"] == "admin":
        return jsonify(error="Las piedritas las dejan los demás en tus compras."), 403
    conn = db()
    c = conn.execute("SELECT id, fecha FROM compras WHERE id = ? AND anulada_ts IS NULL AND tipo = 'compra'", (cid,)).fetchone()
    if not c:
        return jsonify(error="Esa compra no existe."), 404
    cur = conn.execute("INSERT OR IGNORE INTO piedritas (compra_id, usuario_id, creado) VALUES (?, ?, ?)", (cid, u["id"], int(time.time())))
    nueva = cur.rowcount > 0
    conn.commit()
    if nueva:
        try:
            push.notificar(conn, "piedrita", "Libro DCA", f"{u['nombre']} dejó una piedrita en tu compra del {c['fecha']}.", f"piedrita-{cid}-{u['id']}")
        except Exception as e:  # noqa: BLE001 — avisar es secundario
            print(f"push: no se pudo avisar de la piedrita ({type(e).__name__}: {e})", flush=True)
    r = conn.execute("SELECT creado FROM piedritas WHERE compra_id = ? AND usuario_id = ?", (cid, u["id"])).fetchone()
    return jsonify(compra_id=cid, quien=u["nombre"], creado=r["creado"]), 201 if nueva else 200


@app.delete("/api/piedritas/<int:cid>")
def quitar_piedrita(cid: int) -> Any:
    conn = db()
    cur = conn.execute("DELETE FROM piedritas WHERE compra_id = ? AND usuario_id = ?", (cid, g.usuario["id"]))
    conn.commit()
    return ("", 204) if cur.rowcount else (jsonify(error="No dejaste una piedrita ahí."), 404)


def parse_cumple(v: Any) -> str | None:
    """«MM-DD» (el 29 de febrero vale) o None para quitarlo."""
    if v is None or v == "":
        return None
    if not isinstance(v, str) or not re.fullmatch(r"\d{2}-\d{2}", v):
        raise ValueError("Elige el mes y el día de tu cumpleaños.")
    try:
        date.fromisoformat(f"2024-{v}")  # 2024 es bisiesto: el 29 de febrero es válido
    except ValueError:
        raise ValueError("Ese día no existe.") from None
    return v


@app.put("/api/yo/cumple")
def guardar_cumple() -> Any:
    """Cada persona pone su cumpleaños (mes y día), también un lector. Sirve para el saludo y el farol de ese día."""
    body = request.get_json(silent=True)
    try:
        cumple = parse_cumple(body.get("cumple") if isinstance(body, dict) else None)
    except ValueError as err:
        return jsonify(error=str(err)), 400
    conn = db()
    conn.execute("UPDATE usuarios SET cumple = ? WHERE id = ?", (cumple, g.usuario["id"]))
    conn.commit()
    return jsonify(cumple=cumple)


@app.get("/api/cumples")
def listar_cumples() -> Response:
    """Los cumpleaños que la familia puso (solo nombre, mes y día) de las cuentas activas."""
    rows = db().execute("SELECT nombre, cumple FROM usuarios WHERE activo = 1 AND cumple IS NOT NULL ORDER BY nombre").fetchall()
    return jsonify([dict(r) for r in rows])


# ------------------------------------------------- el libro de cumbre (campamento 19, idea 18)
# Una firma por persona y campamento ya alcanzado: también la deja un lector (es su segunda escritura, después de las piedritas). Las
# firmas las lee toda la familia siempre: solo se escriben en un campamento al que el libro ya llegó, así que no hay sorpresa que guardar
# (si el saldo luego baja, lo firmado se queda; para firmar o reescribir, el libro tiene que volver a estar ahí). Cada cambio va a la
# auditoría; reescribir la propia no avisa a nadie, la primera firma de alguien más avisa al dueño («Piedritas y firmas de tu familia»).
MAX_FIRMA = 80
FIRMA_MAX, FIRMA_VENTANA = 20, 600  # por cuenta y proceso: 20 firmas (o cambios) cada 10 minutos
_FIRMAS_RECIENTES: dict[str, deque[float]] = {}


def parse_firma(v: Any) -> str:
    """La firma: hasta 80 caracteres en una sola línea, sin caracteres de control. No puede ir vacía (para quitarla está «Borrar»)."""
    if not isinstance(v, str):
        raise ValueError("Escribe tu firma.")
    t = " ".join("".join(ch for ch in v if ch.isprintable() or ch in "\t\n").split())
    if not t:
        raise ValueError("Escribe tu firma.")
    if len(t) > MAX_FIRMA:
        raise ValueError(f"La firma admite hasta {MAX_FIRMA} caracteres.")
    return t


def _demasiadas_firmas(nombre: str) -> bool:
    ahora = time.time()
    cola = _FIRMAS_RECIENTES.setdefault(nombre, deque())
    while cola and ahora - cola[0] > FIRMA_VENTANA:
        cola.popleft()
    if len(cola) >= FIRMA_MAX:
        return True
    cola.append(ahora)
    return False


def _firma_json(r: sqlite3.Row, uid: int) -> dict[str, Any]:
    return {"id": r["id"], "hito": r["hito"], "quien": r["quien"], "texto": r["texto"], "creado": r["creado"], "editado": r["editado"], "mia": r["usuario_id"] == uid}


_SQL_FIRMAS = "SELECT f.id, f.hito, f.usuario_id, u.nombre AS quien, f.texto, f.creado, f.editado FROM firmas f JOIN usuarios u ON u.id = f.usuario_id"


@app.get("/api/firmas")
def listar_firmas() -> Response:
    """Todas las firmas de los libros de cumbre, en el orden en que se firmaron. `mia` dice cuál es de quien pregunta."""
    uid = g.usuario["id"]
    return jsonify([_firma_json(r, uid) for r in db().execute(f"{_SQL_FIRMAS} ORDER BY f.hito, f.creado, f.id")])


@app.put("/api/firmas/<int:hito>")
def firmar(hito: int) -> Any:
    """Firma (o reescribe la propia firma) el libro de cumbre de un campamento al que el libro ya llegó."""
    u = g.usuario
    if hito not in HITOS_MENSAJE:
        return jsonify(error="Ese campamento no existe."), 400
    body = request.get_json(silent=True)
    try:
        texto = parse_firma(body.get("texto") if isinstance(body, dict) else None)
    except ValueError as err:
        return jsonify(error=str(err)), 400
    conn = db()
    if saldo_actual(conn) < hito:
        return jsonify(error="El libro todavía no llega a este campamento: su libro de cumbre se firma al llegar."), 400
    if _demasiadas_firmas(u["nombre"]):
        resp = jsonify(error="Demasiadas firmas seguidas. Espera unos minutos.")
        resp.headers["Retry-After"] = str(FIRMA_VENTANA)
        return resp, 429
    if conn.in_transaction:
        conn.commit()
    conn.execute("BEGIN IMMEDIATE")  # leer la firma de antes y escribir la nueva van juntas (la auditoría dice lo que había de verdad)
    antes = conn.execute("SELECT texto FROM firmas WHERE hito = ? AND usuario_id = ?", (hito, u["id"])).fetchone()
    ahora = int(time.time())
    if antes and antes["texto"] == texto:
        conn.commit()  # lo mismo que ya estaba: nada que guardar ni que auditar
    else:
        conn.execute("INSERT INTO firmas (hito, usuario_id, texto, creado) VALUES (?, ?, ?, ?) "
                     "ON CONFLICT (hito, usuario_id) DO UPDATE SET texto = excluded.texto, editado = excluded.creado", (hito, u["id"], texto, ahora))
        auth.auditar(conn, u["nombre"], "firma", "campamento", hito, {"texto": antes["texto"]} if antes else None, {"texto": texto}, auth.ip_resumida(ip_real()))
        conn.commit()
    nueva = antes is None
    if nueva and u["rol"] != "admin":  # al dueño se le avisa de la primera firma de alguien más (no de las suyas ni de reescribir)
        try:
            push.notificar(conn, "piedrita", "Libro DCA", f"{u['nombre']} firmó el libro de cumbre del campamento {ritmo.nombre_hito(hito).replace(' sats', '')}.",
                           f"firma-{hito}-{u['id']}")
        except Exception as e:  # noqa: BLE001 — avisar es secundario
            print(f"push: no se pudo avisar de la firma ({type(e).__name__}: {e})", flush=True)
    r = conn.execute(f"{_SQL_FIRMAS} WHERE f.hito = ? AND f.usuario_id = ?", (hito, u["id"])).fetchone()
    return jsonify({**_firma_json(r, u["id"]), "nueva": nueva}), 201 if nueva else 200


@app.delete("/api/firmas/<int:hito>/<int:fid>")
def borrar_firma(hito: int, fid: int) -> Any:
    """Quita una firma: la propia, cualquiera; la de otra persona, solo el admin (403 para un lector). Queda en la auditoría."""
    u = g.usuario
    conn = db()
    r = conn.execute(f"{_SQL_FIRMAS} WHERE f.id = ? AND f.hito = ?", (fid, hito)).fetchone()
    if not r:
        return jsonify(error="Esa firma ya no está."), 404
    if r["usuario_id"] != u["id"] and u["rol"] != "admin":
        return jsonify(error="Solo puedes borrar tu propia firma."), 403
    conn.execute("DELETE FROM firmas WHERE id = ?", (fid,))
    auth.auditar(conn, u["nombre"], "firma_borrada", "campamento", hito, {"texto": r["texto"], "de": r["quien"]}, None, auth.ip_resumida(ip_real()))
    conn.commit()
    return "", 204


# ------------------------------------------------- bautizar la montaña (campamento 19, idea 21)
# Solo el nombre (la bandera de la cumbre no se elige). Lo pone el dueño; lo lee toda la familia en el Diario, el certificado y la tele.
# Nunca sale en la entrada: esta ruta pide sesión como todas (no está en PUBLICAS) y la entrada no la llama.
MAX_NOMBRE_MONTANA = 32


def parse_nombre_montana(v: Any) -> str:
    """Hasta 32 caracteres en una línea, sin caracteres de control. Vacío (o None) = quitar el nombre."""
    if v is None:
        return ""
    if not isinstance(v, str):
        raise ValueError("Nombre inválido.")
    t = " ".join("".join(ch for ch in v if ch.isprintable() or ch in "\t\n").split())
    if len(t) > MAX_NOMBRE_MONTANA:
        raise ValueError(f"El nombre admite hasta {MAX_NOMBRE_MONTANA} caracteres.")
    return t


@app.get("/api/montana")
def ver_nombre_montana() -> Response:
    return jsonify(nombre=_meta(db(), "nombre_montana"))


@app.put("/api/montana")
def bautizar_montana() -> Any:
    if (e := _solo_admin()) is not None:
        return e
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or "nombre" not in body:
        return jsonify(error="Falta el nombre (vacío lo quita)."), 400
    try:
        nombre = parse_nombre_montana(body["nombre"])
    except ValueError as err:
        return jsonify(error=str(err)), 400
    conn = db()
    antes = _meta(conn, "nombre_montana")
    if (antes or "") != nombre:  # el mismo nombre otra vez no cambia nada ni se audita
        if nombre:
            _meta_poner(conn, "nombre_montana", nombre)
        else:
            conn.execute("DELETE FROM meta WHERE clave = 'nombre_montana'")
        auth.auditar(conn, quien(), "montana_nombre", "libro", None, {"nombre": antes} if antes else None, {"nombre": nombre} if nombre else None,
                     auth.ip_resumida(ip_real()))
        conn.commit()
    return jsonify(nombre=nombre or None)


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
        conn = db()
        wid = parse_wallet_id(conn, body.get("wallet_id"))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    if falla := falla_traslados(conn, traslados_vigentes(conn) + [(fecha, 10**12, sentido, sats, wid or 0)]):
        return jsonify(error=falla), 400
    cur = conn.execute("INSERT INTO traslados (fecha, sats, sentido, txid, nota, creado, wallet_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                       (fecha, sats, sentido, txid, nota, int(time.time() * 1000), wid))
    tid = int(cur.lastrowid or 0)
    nuevo = fila_traslado(conn.execute(f"SELECT {TRAS_COLS} FROM traslados WHERE id = ?", (tid,)).fetchone())
    auth.auditar(conn, quien(), "alta", "traslado", tid, None, nuevo, auth.ip_resumida(ip_real()))
    conn.commit()
    push.vigilar_tx(conn, txid)
    return jsonify(nuevo), 201


@app.delete("/api/traslados/<int:tid>")
def anular_traslado(tid: int) -> Any:
    # Igual que las compras: anular conserva la fila y su historia; las cuentas dejan de contarla.
    conn = db()
    previa = conn.execute(f"SELECT {TRAS_COLS} FROM traslados WHERE id = ? AND anulada_ts IS NULL", (tid,)).fetchone()
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


def csv_compras(conn: sqlite3.Connection) -> str:
    rows = conn.execute(f"SELECT fecha, monto, precio, sats, txid, tipo, nota, extra, etiquetas FROM compras WHERE {VIGENTES} ORDER BY fecha, id").fetchall()
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(["fecha", "monto_usd", "precio_btc_usd", "sats", "btc", "txid", "tipo", "nota", "extra", "etiquetas"])
    for r in rows:
        w.writerow([r["fecha"], _fmt(r["monto"]), _fmt(r["precio"]), r["sats"], f'{r["sats"] / 1e8:.8f}', r["txid"] or "", r["tipo"], r["nota"] or "", "1" if r["extra"] else "",
                    (r["etiquetas"] or "").replace(",", ", ")])
    return out.getvalue()


def csv_traslados(conn: sqlite3.Connection) -> str:
    nombres = nombres_wallets(conn)
    rows = conn.execute("SELECT fecha, sats, sentido, txid, nota, wallet_id FROM traslados WHERE anulada_ts IS NULL ORDER BY fecha, id").fetchall()
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(["fecha", "sats", "sentido", "txid", "nota", "wallet"])
    for r in rows:
        w.writerow([r["fecha"], r["sats"], r["sentido"], r["txid"] or "", r["nota"] or "", nombres.get(r["wallet_id"] or 0, "") if r["wallet_id"] else ""])
    return out.getvalue()


@app.get("/api/export.csv")
def exportar() -> Response:
    return Response(
        csv_compras(db()),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="compras-btc-{date.today().isoformat()}.csv"'},
    )


@app.get("/api/traslados.csv")
def exportar_traslados() -> Response:
    """Los traslados como CSV (idea 47): `fecha,sats,sentido,txid,nota`. Los ven todos, igual que la lista."""
    return Response(
        csv_traslados(db()),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="traslados-btc-{date.today().isoformat()}.csv"'},
    )


LEEME_ZIP = """Libro DCA: copia de tus datos
==============================
compras.csv     compras, ventas y gastos (fecha, monto_usd, precio_btc_usd, sats, btc, txid, tipo, nota, extra, etiquetas)
traslados.csv   traslados entre el exchange y tus wallets (fecha, sats, sentido, txid, nota, wallet; la wallet en blanco es «Mi wallet»)

Se abren en cualquier hoja de cálculo. Para volver a cargarlos en la app usa «Importar CSV» (compras) y «Importar traslados»
(traslados): saltan lo repetido, así que importar dos veces el mismo archivo no duplica nada. Primero las compras y después
los traslados (la wallet no puede tener más sats de los que posees ese día).
Solo lo vigente: lo anulado queda en la base y en el historial, no aquí.
"""


@app.get("/api/todo.zip")
def descargar_todo() -> Any:
    """Todo tu historial en un solo archivo (idea 107): compras y traslados en CSV más un LEEME. Solo el admin."""
    if g.usuario["rol"] != "admin":
        return jsonify(error="Solo el admin descarga todo."), 403
    conn = db()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for nombre, texto in (("LEEME.txt", LEEME_ZIP), ("compras.csv", csv_compras(conn)), ("traslados.csv", csv_traslados(conn))):
            info = zipfile.ZipInfo(nombre, date_time=time.gmtime()[:6])  # fecha fija por archivo: sin atributos raros del servidor
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, texto.encode("utf-8"))
    return Response(buf.getvalue(), mimetype="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="libro-dca-{date.today().isoformat()}.zip"'})


# --- Enlaces de solo lectura para hojas de cálculo (idea 159)
# Un enlace `…/api/token/<token>/compras.csv` que `=IMPORTDATA("…")` de Google Sheets (o cualquier programa) puede leer sin iniciar sesión.
# El token son 32 bytes al azar, se enseña UNA vez al crearlo y en la base solo queda su SHA-256. Solo da los dos CSV (nada de escribir, cuentas ni
# historial). Hay un máximo de 5 activos; el admin los revoca cuando quiera. OJO: la dirección completa viaja en la URL, así que puede quedar en los
# registros de Caddy o de Cloudflare: es una llave, no la pegues en chats ni en documentos que otros vean.
MAX_TOKENS = 5
_TOKEN_FALLOS: list[float] = []  # instantes de los últimos intentos con un token que no existe (por proceso)
TOKEN_FALLOS_MAX = 30  # por minuto y por proceso


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def crear_token(conn: sqlite3.Connection, nombre: str, usuario: str, ip: str | None = None) -> tuple[int, str]:
    nombre = " ".join(nombre.split())[:40]
    if not nombre:
        raise ValueError("Ponle un nombre al enlace (por ejemplo «Mi hoja de Google»).")
    if conn.execute("SELECT COUNT(*) FROM tokens_api WHERE revocado IS NULL").fetchone()[0] >= MAX_TOKENS:
        raise ValueError(f"Ya hay {MAX_TOKENS} enlaces activos. Revoca alguno antes de crear otro.")
    token = secrets.token_urlsafe(32)
    cur = conn.execute("INSERT INTO tokens_api (hash, nombre, creado) VALUES (?, ?, ?)", (_hash_token(token), nombre, int(time.time())))
    auth.auditar(conn, usuario, "token_creado", "token", cur.lastrowid, None, {"nombre": nombre}, ip)
    conn.commit()
    return int(cur.lastrowid or 0), token


def _token_activo(conn: sqlite3.Connection, token: str) -> sqlite3.Row | None:
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,64}", token):
        return None
    return conn.execute("SELECT id, nombre FROM tokens_api WHERE hash = ? AND revocado IS NULL", (_hash_token(token),)).fetchone()


@app.get("/api/token/<token>/<archivo>")
def leer_con_token(token: str, archivo: str) -> Any:
    if archivo not in ("compras.csv", "traslados.csv"):
        return jsonify(error="No existe."), 404
    ahora = time.time()
    _TOKEN_FALLOS[:] = [t for t in _TOKEN_FALLOS if ahora - t < 60]
    if len(_TOKEN_FALLOS) >= TOKEN_FALLOS_MAX:
        resp = jsonify(error="Demasiados intentos. Espera un minuto.")
        resp.headers["Retry-After"] = "60"
        return resp, 429
    conn = db()
    if not auth.hay_usuarios(conn):
        return jsonify(error="No existe."), 404
    fila = _token_activo(conn, token)
    if not fila:
        _TOKEN_FALLOS.append(ahora)
        return jsonify(error="No existe."), 404  # el mismo mensaje con un token mal escrito, revocado o inexistente
    conn.execute("UPDATE tokens_api SET ultimo_uso = ? WHERE id = ?", (int(ahora), fila["id"]))
    conn.commit()
    texto = csv_compras(conn) if archivo == "compras.csv" else csv_traslados(conn)
    return Response(texto, mimetype="text/csv", headers={"X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer"})


def _solo_admin() -> Any:
    return None if g.usuario["rol"] == "admin" else (jsonify(error="Solo el admin maneja estos enlaces."), 403)


@app.get("/api/tokens")
def listar_tokens() -> Any:
    if (e := _solo_admin()) is not None:
        return e
    filas = db().execute("SELECT id, nombre, creado, ultimo_uso, revocado FROM tokens_api ORDER BY id DESC LIMIT 50").fetchall()
    return jsonify([{k: f[k] for k in ("id", "nombre", "creado", "ultimo_uso", "revocado")} for f in filas])


@app.post("/api/tokens")
def nuevo_token() -> Any:
    if (e := _solo_admin()) is not None:
        return e
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not isinstance(body.get("nombre"), str):
        return jsonify(error="Ponle un nombre al enlace."), 400
    try:
        tid, token = crear_token(db(), body["nombre"], quien(), auth.ip_resumida(ip_real()))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    # El token se muestra esta única vez: no se puede volver a pedir.
    return jsonify(id=tid, token=token, rutas={"compras": f"/api/token/{token}/compras.csv", "traslados": f"/api/token/{token}/traslados.csv"}), 201


@app.delete("/api/tokens/<int:tid>")
def revocar_token(tid: int) -> Any:
    if (e := _solo_admin()) is not None:
        return e
    conn = db()
    f = conn.execute("SELECT id, nombre FROM tokens_api WHERE id = ? AND revocado IS NULL", (tid,)).fetchone()
    if not f:
        return jsonify(error="Ese enlace no existe o ya estaba revocado."), 404
    conn.execute("UPDATE tokens_api SET revocado = ? WHERE id = ?", (int(time.time()), tid))
    auth.auditar(conn, quien(), "token_revocado", "token", tid, {"nombre": f["nombre"]}, None, auth.ip_resumida(ip_real()))
    conn.commit()
    return "", 204


@app.post("/api/traslados/import")
def importar_traslados() -> Any:
    if request.mimetype != "text/csv":
        return jsonify(error="Envía el archivo como text/csv."), 415
    try:
        return jsonify(importar_traslados_csv(db(), request.get_data(as_text=True), quien(), auth.ip_resumida(ip_real())))
    except ValueError as e:
        return jsonify(error=str(e)), 400


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
    if request.args.get("v") == VERSION and resp.status_code == 200 and _VERSIONADO.fullmatch(request.path):
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif request.path in {"/", "/login"}:
        resp.headers["Cache-Control"] = "no-store"
    elif "Cache-Control" not in resp.headers:
        resp.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/") else "no-cache"
    if request.path == "/" or request.path.startswith("/api/"):
        resp.vary.add("Cookie")
    return resp


init_db()
