"""Cuentas, sesiones, límite de intentos y auditoría. Solo librería estándar."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  hash           TEXT    NOT NULL,
  rol            TEXT    NOT NULL CHECK (rol IN ('admin', 'lector')),
  activo         INTEGER NOT NULL DEFAULT 1,
  creado         INTEGER NOT NULL,
  clave_cambiada INTEGER NOT NULL,
  visto_ts       INTEGER
);
CREATE TABLE IF NOT EXISTS sesiones (
  hash       TEXT    PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios (id),
  creada     INTEGER NOT NULL,
  ultima     INTEGER NOT NULL,
  caduca     INTEGER NOT NULL,
  ip         TEXT,
  agente     TEXT
);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones (usuario_id);
CREATE TABLE IF NOT EXISTS intentos (
  clave           TEXT    PRIMARY KEY,
  fallos          INTEGER NOT NULL,
  primer_fallo    INTEGER NOT NULL,
  bloqueado_hasta INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS auditoria (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         INTEGER NOT NULL,
  usuario    TEXT    NOT NULL,
  accion     TEXT    NOT NULL,
  entidad    TEXT,
  entidad_id INTEGER,
  antes      TEXT,
  despues    TEXT,
  ip         TEXT
);
CREATE TRIGGER IF NOT EXISTS auditoria_sin_cambios BEFORE UPDATE ON auditoria
BEGIN SELECT RAISE(ABORT, 'la auditoría es de solo añadir'); END;
CREATE TRIGGER IF NOT EXISTS auditoria_sin_borrados BEFORE DELETE ON auditoria
BEGIN SELECT RAISE(ABORT, 'la auditoría es de solo añadir'); END;
"""

# scrypt: n = 2^15, r = 8, p = 1 (≈32 MB, decenas de ms). Los parámetros van en la cadena.
N_LOG2, R, P = 15, 8, 1
CLAVE_MIN = 12
DIA = 86400
SESION_DESLIZANTE = 90 * DIA
SESION_TOPE = 180 * DIA
ACTUALIZAR_CADA = 3600
VENTANA = 3600
FALLOS_USUARIO = 5          # desde el quinto fallo, espera 2^(n-5) s ...
ESPERA_MAX_USUARIO = 900    # ... hasta 15 min como mucho
FALLOS_IP = 20              # 20 fallos en una hora desde una IP: 1 h de bloqueo
BLOQUEO_IP = 3600
MAX_INTENTOS = 10000        # tope de filas: probar nombres al azar no llena el disco
NOMBRE = re.compile(r"[\w.@-]{2,32}")
ALFABETO = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0 O 1 l I


def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode()


def hashear(clave: str, n_log2: int = N_LOG2) -> str:
    sal = secrets.token_bytes(16)
    h = hashlib.scrypt(clave.encode(), salt=sal, n=2**n_log2, r=R, p=P, maxmem=64 * 1024 * 1024, dklen=32)
    return f"scrypt${n_log2}${R}${P}${_b64(sal)}${_b64(h)}"


def verificar(clave: str, cadena: str) -> tuple[bool, bool]:
    """(correcta, conviene rehacer el hash con los parámetros actuales)."""
    try:
        _, n, r, p, sal, h = cadena.split("$")
        calc = hashlib.scrypt(clave.encode(), salt=base64.b64decode(sal), n=2 ** int(n), r=int(r), p=int(p),
                              maxmem=64 * 1024 * 1024, dklen=32)
        ok = hmac.compare_digest(calc, base64.b64decode(h))
        return ok, ok and (int(n), int(r), int(p)) < (N_LOG2, R, P)
    except (ValueError, TypeError):
        return False, False


# Se verifica contra este hash cuando el usuario no existe: mismo tiempo de respuesta.
RELLENO = hashear(secrets.token_hex(16))


def generar_clave() -> str:
    return "-".join("".join(secrets.choice(ALFABETO) for _ in range(4)) for _ in range(4))


def validar_clave(clave: str, nombre: str) -> str | None:
    if len(clave) < CLAVE_MIN:
        return f"La contraseña necesita al menos {CLAVE_MIN} caracteres."
    if len(clave) > 256:
        return "La contraseña es demasiado larga."
    if clave.strip().lower() == nombre.lower():
        return "La contraseña no puede ser tu nombre de usuario."
    return None


def ip_resumida(ip: str | None) -> str | None:
    """Red /24 (o /48 en IPv6): suficiente para reconocer accesos sin guardar la IP exacta."""
    if not ip:
        return None
    if ":" in ip:
        return ":".join(ip.split(":")[:3]) + "::/48"
    partes = ip.split(".")
    return ".".join(partes[:3]) + ".0/24" if len(partes) == 4 else None


# -------------------------------------------------------------------- auditoría
def auditar(conn: sqlite3.Connection, usuario: str, accion: str, entidad: str | None = None,
            entidad_id: int | None = None, antes: Any = None, despues: Any = None, ip: str | None = None) -> None:
    """Añade una fila; quien llama hace el commit, en la misma transacción que el cambio."""
    conn.execute(
        "INSERT INTO auditoria (ts, usuario, accion, entidad, entidad_id, antes, despues, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (int(time.time()), usuario, accion, entidad, entidad_id,
         None if antes is None else json.dumps(antes, ensure_ascii=False),
         None if despues is None else json.dumps(despues, ensure_ascii=False), ip),
    )


# --------------------------------------------------------------------- cuentas
def crear_usuario(conn: sqlite3.Connection, nombre: str, clave: str, rol: str, autor: str) -> int:
    if not NOMBRE.fullmatch(nombre):
        raise ValueError("Nombre inválido: 2 a 32 letras, números, punto, guion, guion bajo o @.")
    if rol not in ("admin", "lector"):
        raise ValueError("El rol es admin o lector.")
    if (err := validar_clave(clave, nombre)):
        raise ValueError(err)
    ahora = int(time.time())
    try:
        cur = conn.execute("INSERT INTO usuarios (nombre, hash, rol, creado, clave_cambiada) VALUES (?, ?, ?, ?, ?)",
                           (nombre, hashear(clave), rol, ahora, ahora))
    except sqlite3.IntegrityError:
        raise ValueError("Ese nombre ya existe.") from None
    uid = int(cur.lastrowid or 0)
    auditar(conn, autor, "cuenta_creada", "usuario", uid, None, {"nombre": nombre, "rol": rol})
    conn.commit()
    return uid


def buscar(conn: sqlite3.Connection, nombre: str) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM usuarios WHERE nombre = ?", (nombre,)).fetchone()


def cambiar_clave(conn: sqlite3.Connection, uid: int, clave: str, autor: str, conservar: str | None = None) -> None:
    """Cambia la contraseña y cierra las demás sesiones (salvo `conservar`, la actual)."""
    u = conn.execute("SELECT nombre FROM usuarios WHERE id = ?", (uid,)).fetchone()
    if (err := validar_clave(clave, u["nombre"])):
        raise ValueError(err)
    conn.execute("UPDATE usuarios SET hash = ?, clave_cambiada = ? WHERE id = ?", (hashear(clave), int(time.time()), uid))
    conn.execute("DELETE FROM sesiones WHERE usuario_id = ? AND hash IS NOT ?", (uid, conservar))
    auditar(conn, autor, "clave_cambiada", "usuario", uid, None, {"nombre": u["nombre"]})
    conn.commit()


def hay_usuarios(conn: sqlite3.Connection) -> bool:
    return conn.execute("SELECT 1 FROM usuarios WHERE activo = 1 LIMIT 1").fetchone() is not None


# -------------------------------------------------------------------- sesiones
def _h(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def crear_sesion(conn: sqlite3.Connection, uid: int, ip: str | None, agente: str) -> str:
    token = secrets.token_urlsafe(32)
    ahora = int(time.time())
    conn.execute("INSERT INTO sesiones (hash, usuario_id, creada, ultima, caduca, ip, agente) VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (_h(token), uid, ahora, ahora, ahora + SESION_DESLIZANTE, ip_resumida(ip), agente[:80]))
    return token


def sesion(conn: sqlite3.Connection, token: str | None) -> dict[str, Any] | None:
    if not token or len(token) > 100:
        return None
    hs = _h(token)
    row = conn.execute(
        "SELECT s.hash, s.creada, s.ultima, s.caduca, u.id, u.nombre, u.rol FROM sesiones s "
        "JOIN usuarios u ON u.id = s.usuario_id WHERE s.hash = ? AND u.activo = 1", (hs,)).fetchone()
    ahora = int(time.time())
    if not row or row["caduca"] <= ahora or row["creada"] + SESION_TOPE <= ahora:
        if row:
            conn.execute("DELETE FROM sesiones WHERE hash = ?", (hs,))
            conn.commit()
        return None
    if ahora - row["ultima"] >= ACTUALIZAR_CADA:  # deslizante, sin escribir en cada petición
        conn.execute("UPDATE sesiones SET ultima = ?, caduca = ? WHERE hash = ?",
                     (ahora, min(ahora + SESION_DESLIZANTE, row["creada"] + SESION_TOPE), hs))
        conn.commit()
    return {"id": row["id"], "nombre": row["nombre"], "rol": row["rol"], "hash": hs}


def cerrar_sesion(conn: sqlite3.Connection, token: str | None) -> None:
    if token:
        conn.execute("DELETE FROM sesiones WHERE hash = ?", (_h(token),))


def cerrar_todas(conn: sqlite3.Connection, uid: int) -> int:
    return conn.execute("DELETE FROM sesiones WHERE usuario_id = ?", (uid,)).rowcount


# ------------------------------------------------------------ límite de intentos
def clave_usuario(nombre: str) -> str:
    return "u:" + nombre.strip().lower()[:64]


def espera(conn: sqlite3.Connection, claves: list[str]) -> int:
    """Segundos de bloqueo que quedan (0 si ninguno). Se mira ANTES de calcular scrypt."""
    if not claves:
        return 0
    ahora = int(time.time())
    q = ",".join("?" * len(claves))
    row = conn.execute(f"SELECT MAX(bloqueado_hasta) FROM intentos WHERE clave IN ({q})", claves).fetchone()
    return max(0, (row[0] or 0) - ahora)


def fallo(conn: sqlite3.Connection, clave: str) -> tuple[int, bool, bool]:
    """Cuenta un fallo. Devuelve (fallos en la ventana, es el primero, acaba de bloquearse)."""
    ahora = int(time.time())
    row = conn.execute("SELECT fallos, primer_fallo FROM intentos WHERE clave = ?", (clave,)).fetchone()
    fallos = 1 if not row or ahora - row["primer_fallo"] > VENTANA else row["fallos"] + 1
    primero = fallos == 1
    hasta, nuevo = 0, False
    if clave.startswith("u:") and fallos >= FALLOS_USUARIO:
        hasta = ahora + min(ESPERA_MAX_USUARIO, 2 ** (fallos - FALLOS_USUARIO))
        nuevo = fallos == FALLOS_USUARIO
    elif clave.startswith("ip:") and fallos >= FALLOS_IP:
        hasta = ahora + BLOQUEO_IP
        nuevo = fallos == FALLOS_IP
    conn.execute(
        "INSERT INTO intentos (clave, fallos, primer_fallo, bloqueado_hasta) VALUES (?, ?, ?, ?) "
        "ON CONFLICT(clave) DO UPDATE SET fallos = excluded.fallos, primer_fallo = "
        "CASE WHEN excluded.fallos = 1 THEN excluded.primer_fallo ELSE intentos.primer_fallo END, "
        "bloqueado_hasta = excluded.bloqueado_hasta",
        (clave, fallos, ahora, hasta))
    return fallos, primero, nuevo


def acierto(conn: sqlite3.Connection, claves: list[str]) -> None:
    q = ",".join("?" * len(claves))
    conn.execute(f"DELETE FROM intentos WHERE clave IN ({q})", claves)


def limpiar(conn: sqlite3.Connection) -> None:
    ahora = int(time.time())
    conn.execute("DELETE FROM intentos WHERE primer_fallo < ? AND bloqueado_hasta < ?", (ahora - DIA, ahora))
    conn.execute("DELETE FROM sesiones WHERE caduca <= ?", (ahora,))
    exceso = conn.execute("SELECT COUNT(*) FROM intentos").fetchone()[0] - MAX_INTENTOS
    if exceso > 0:
        conn.execute("DELETE FROM intentos WHERE clave IN (SELECT clave FROM intentos ORDER BY primer_fallo LIMIT ?)", (exceso,))
