"""Avisos push (Web Push con claves VAPID).

El navegador de cada dispositivo se suscribe con el servicio de push de su sistema (Apple, Google o Mozilla) y el
servidor le manda mensajes cifrados. Aquí vive todo lo común: claves, suscripciones, categorías, horario y envío.
Un fallo al avisar NUNCA debe romper una compra: todo lo que llaman las rutas captura sus errores.

Categorías (cada dispositivo elige las suyas; `rol` dice quién puede recibirlas):
  movimiento    lector  una compra, venta o gasto nuevo                       (encendida)
  hito          lector  una etapa, un hito grande o una constancia nuevos      (apagada)
  recordatorio  admin   se acaba la semana o quincena y aún no compraste       (encendida)
  txid          admin   un TXID que estaba pendiente ya se confirmó            (encendida)
  respaldo      admin   el respaldo diario falló                               (encendida)
  caida         admin   BTC cayó 15 % o más de su máximo de 30 días (una vez)  (encendida)
"""
from __future__ import annotations

import base64
import json
import os
import re
import sqlite3
import threading
import time
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from ritmo import ZONA

SCHEMA = """
CREATE TABLE IF NOT EXISTS suscripciones (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  endpoint   TEXT    NOT NULL UNIQUE,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  prefs      TEXT    NOT NULL DEFAULT '{}',
  creado     INTEGER NOT NULL,
  ultimo_ok  INTEGER,
  fallos     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS suscripciones_usuario ON suscripciones (usuario_id);
-- Avisos que cayeron de noche: salen por la mañana (varios de una misma categoría se juntan en uno).
CREATE TABLE IF NOT EXISTS avisos_pendientes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT    NOT NULL,
  titulo    TEXT    NOT NULL,
  cuerpo    TEXT    NOT NULL,
  etiqueta  TEXT    NOT NULL,
  creado    INTEGER NOT NULL,
  sus_id    INTEGER  -- el dispositivo al que le toca (cada uno tiene su horario); NULL = de antes de los horarios propios
);
-- TXID de compras y traslados nuevos: se vigilan hasta que se confirmen (solo se avisa si se vio pendiente).
CREATE TABLE IF NOT EXISTS tx_vigilados (
  txid            TEXT    PRIMARY KEY,
  creado          INTEGER NOT NULL,
  visto_pendiente INTEGER NOT NULL DEFAULT 0,
  cerrado         INTEGER NOT NULL DEFAULT 0
);
"""

CATEGORIAS: dict[str, dict[str, Any]] = {
    "movimiento": {"rol": "lector", "defecto": True, "nombre": "Compras, ventas y gastos nuevos",
                   "ayuda": "Te avisa cuando se anota un movimiento nuevo."},
    "hito": {"rol": "lector", "defecto": False, "nombre": "Etapas, hitos y constancia",
             "ayuda": "Cuando se cruza una etapa, un hito grande o un número redondo de compras."},
    "recordatorio": {"rol": "admin", "defecto": True, "nombre": "Recordatorio de compra",
                     "ayuda": "Unos días antes de que venza tu semana o quincena, si aún no compraste."},
    "txid": {"rol": "admin", "defecto": True, "nombre": "TXID confirmado",
             "ayuda": "Cuando una transacción que estaba pendiente se confirma en la red."},
    "respaldo": {"rol": "admin", "defecto": True, "nombre": "Fallo del respaldo",
                 "ayuda": "Si el respaldo diario falla."},
    "caida": {"rol": "admin", "defecto": True, "nombre": "Gran caída",
              "ayuda": "Una vez por caída, cuando BTC baja 15 % o más de su máximo de 30 días. Solo informa, no recomienda."},
    "wallet": {"rol": "admin", "defecto": False, "nombre": "Retirar a tu wallet",
               "ayuda": "Cuando en el exchange hay más sats del monto que tú elijas (abajo). Solo es un recordatorio de tu propio hábito."},
}

HORA_DESDE, HORA_HASTA = 8, 21  # los avisos no suenan de noche (hora de El Salvador)
MAX_POR_USUARIO = 10
MAX_FALLOS = 10
TTL = 24 * 3600  # si el teléfono está apagado, el aviso se guarda un día en el servicio de push
CONTACTO = os.environ.get("VAPID_CONTACTO", "https://dca.polarzero.dev")

# El servidor le habla al «endpoint» que le da cada dispositivo: solo se aceptan los servicios de push conocidos
# (si no, una cuenta de la familia podría hacer que el servidor consulte direcciones internas).
_HOST_PUSH = re.compile(
    r"fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com"
    r"|(?:[\w-]+\.)*push\.apple\.com|(?:[\w-]+\.)*notify\.windows\.com")
_B64URL = re.compile(r"[A-Za-z0-9_-]{16,128}")

SINCRONO = False  # las pruebas envían en el mismo hilo


def ahora() -> datetime:
    return datetime.now(ZONA)


def dentro_de_horario() -> bool:
    """El horario de siempre (8:00 a 21:00); cada dispositivo puede tener el suyo (ver `horario_de`)."""
    return HORA_DESDE <= ahora().hour < HORA_HASTA


# ------------------------------------------------------------------ horario propio de cada dispositivo
# Cada dispositivo puede elegir desde qué hora y hasta cuál quiere recibir avisos y a qué hora le llega el recordatorio de compra
# (hora de El Salvador). Va en el mismo JSON de `prefs`, bajo la clave «horario»; sin elegir, vale el de siempre.
HORA_RECORDATORIO = 9
MIN_HORAS_VENTANA = 2  # una ventana de cero horas dejaría el dispositivo sin avisos para siempre: se pide al menos esto


def horario_defecto() -> dict[str, int]:
    return {"desde": HORA_DESDE, "hasta": HORA_HASTA, "recordatorio": HORA_RECORDATORIO}


def limpiar_horario(h: Any) -> dict[str, int]:
    """Valida un horario pedido: enteros, `desde` 0–22, `hasta` 1–24, al menos 2 horas entre ambos y el recordatorio dentro de la ventana."""
    if not isinstance(h, dict):
        raise ValueError("Horario inválido.")
    base = horario_defecto()
    try:
        desde = int(h.get("desde", base["desde"]))
        hasta = int(h.get("hasta", base["hasta"]))
        raw = h.get("recordatorio")
        recordatorio = int(raw) if raw is not None else min(max(base["recordatorio"], desde), hasta - 1)
    except (TypeError, ValueError) as e:
        raise ValueError("Horario inválido.") from e
    if any(isinstance(h.get(k), bool) for k in ("desde", "hasta", "recordatorio")):
        raise ValueError("Horario inválido.")
    if not (0 <= desde <= 22 and 1 <= hasta <= 24):
        raise ValueError("Las horas van de 0 a 24.")
    if hasta - desde < MIN_HORAS_VENTANA:
        raise ValueError(f"Los avisos necesitan al menos {MIN_HORAS_VENTANA} horas entre «desde» y «hasta».")
    if not (desde <= recordatorio < hasta):
        raise ValueError("El recordatorio tiene que caer dentro del horario de los avisos.")
    return {"desde": desde, "hasta": hasta, "recordatorio": recordatorio}


def horario_de(prefs_json: str | None) -> dict[str, int]:
    """El horario guardado en las preferencias de un dispositivo (o el de siempre si no hay uno válido)."""
    try:
        crudas = json.loads(prefs_json or "{}")
        return limpiar_horario(crudas["horario"]) if isinstance(crudas, dict) and "horario" in crudas else horario_defecto()
    except (ValueError, KeyError):
        return horario_defecto()


def en_horario(h: dict[str, int], hora: int) -> bool:
    return h["desde"] <= hora < h["hasta"]


def alguien_despierto(conn: sqlite3.Connection) -> bool:
    """True si ahora cae dentro del horario de siempre o del de algún dispositivo (para no vigilar de más cuando todos duermen)."""
    hora = ahora().hour
    if HORA_DESDE <= hora < HORA_HASTA:
        return True
    return any(en_horario(horario_de(r[0]), hora) for r in conn.execute("SELECT prefs FROM suscripciones"))


def horario_dispositivo(conn: sqlite3.Connection, usuario_id: int, endpoint: Any) -> dict[str, int] | None:
    if not isinstance(endpoint, str):
        return None
    f = conn.execute("SELECT prefs FROM suscripciones WHERE endpoint = ? AND usuario_id = ?", (endpoint, usuario_id)).fetchone()
    return horario_de(f[0]) if f else None


UMBRAL_WALLET_MAX = 10**10  # 100 BTC: más que eso no es un recordatorio razonable


def limpiar_umbral(v: Any) -> int:
    """El monto (en sats) a partir del cual avisa «retirar a tu wallet»; 0 lo deja sin elegir. Entero de 0 a 10,000,000,000."""
    if isinstance(v, bool) or not isinstance(v, int | float) or v != int(v) or not 0 <= int(v) <= UMBRAL_WALLET_MAX:
        raise ValueError("Elige un monto en sats entre 0 y 10,000,000,000 (0 = sin avisar).")
    return int(v)


def umbral_de(prefs_json: str | None) -> int:
    """El monto elegido en ese dispositivo (0 si no hay uno válido)."""
    try:
        crudas = json.loads(prefs_json or "{}")
        return limpiar_umbral(crudas["umbral_wallet"]) if isinstance(crudas, dict) and "umbral_wallet" in crudas else 0
    except (ValueError, KeyError):
        return 0


def umbral_dispositivo(conn: sqlite3.Connection, usuario_id: int, endpoint: Any) -> int | None:
    if not isinstance(endpoint, str):
        return None
    f = conn.execute("SELECT prefs FROM suscripciones WHERE endpoint = ? AND usuario_id = ?", (endpoint, usuario_id)).fetchone()
    return umbral_de(f[0]) if f else None


# ------------------------------------------------------------------ claves VAPID
def ruta_clave() -> str:
    return os.environ.get("VAPID_PEM") or os.path.join(os.path.dirname(os.environ.get("DB_PATH", "/data/libro.db")) or ".", "vapid_private.pem")


def asegurar_clave() -> str:
    """Crea la clave privada VAPID la primera vez (queda en la carpeta de datos, solo legible por la app)."""
    ruta = ruta_clave()
    if not os.path.exists(ruta):
        from py_vapid import Vapid

        v = Vapid()
        v.generate_keys()
        os.makedirs(os.path.dirname(ruta) or ".", exist_ok=True)
        tmp = f"{ruta}.{os.getpid()}.tmp"
        v.save_key(tmp)
        os.chmod(tmp, 0o600)
        try:
            os.link(tmp, ruta)  # atómico: si otro proceso llegó antes, se queda su clave
        except FileExistsError:
            pass
        finally:
            os.remove(tmp)
    return ruta


def clave_publica() -> str:
    """La clave pública que el navegador necesita para suscribirse (base64url, punto sin comprimir)."""
    from cryptography.hazmat.primitives import serialization
    from py_vapid import Vapid

    v = Vapid.from_file(asegurar_clave())
    raw = v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


# ------------------------------------------------------------------ suscripciones
def validar_suscripcion(s: Any) -> tuple[str, str, str]:
    """(endpoint, p256dh, auth) de lo que manda el navegador, o ValueError."""
    if not isinstance(s, dict) or not isinstance(s.get("keys"), dict):
        raise ValueError("Suscripción inválida.")
    endpoint, keys = s.get("endpoint"), s["keys"]
    p256dh, auth = keys.get("p256dh"), keys.get("auth")
    if not isinstance(endpoint, str) or len(endpoint) > 600:
        raise ValueError("Suscripción inválida.")
    u = urlparse(endpoint)
    if u.scheme != "https" or u.username or u.password or u.port not in (None, 443) or not u.hostname \
            or not _HOST_PUSH.fullmatch(u.hostname):
        raise ValueError("Este navegador usa un servicio de avisos que no está permitido.")
    if not (isinstance(p256dh, str) and _B64URL.fullmatch(p256dh) and isinstance(auth, str) and _B64URL.fullmatch(auth)):
        raise ValueError("Suscripción inválida.")
    return endpoint, p256dh, auth


def categorias_de(rol: str) -> list[str]:
    return [c for c, d in CATEGORIAS.items() if d["rol"] == rol]


def prefs_efectivas(prefs_json: str | None, rol: str) -> dict[str, bool]:
    try:
        crudas = json.loads(prefs_json or "{}")
    except ValueError:
        crudas = {}
    if not isinstance(crudas, dict):
        crudas = {}
    return {c: bool(crudas[c]) if isinstance(crudas.get(c), bool) else CATEGORIAS[c]["defecto"] for c in categorias_de(rol)}


def limpiar_prefs(prefs: Any, rol: str) -> dict[str, bool]:
    if not isinstance(prefs, dict):
        raise ValueError("Preferencias inválidas.")
    ok = categorias_de(rol)
    if any(k not in ok or not isinstance(v, bool) for k, v in prefs.items()):
        raise ValueError("Preferencias inválidas.")
    return dict(prefs)


def suscribir(conn: sqlite3.Connection, usuario_id: int, rol: str, s: Any) -> dict[str, bool]:
    endpoint, p256dh, auth = validar_suscripcion(s)
    previa = conn.execute("SELECT usuario_id, prefs FROM suscripciones WHERE endpoint = ?", (endpoint,)).fetchone()
    if previa is None:
        if conn.execute("SELECT COUNT(*) FROM suscripciones WHERE usuario_id = ?", (usuario_id,)).fetchone()[0] >= MAX_POR_USUARIO:
            raise ValueError("Ya tienes demasiados dispositivos con avisos. Desactívalos en alguno.")
        conn.execute("INSERT INTO suscripciones (usuario_id, endpoint, p256dh, auth, creado) VALUES (?, ?, ?, ?, ?)",
                     (usuario_id, endpoint, p256dh, auth, int(time.time())))
        prefs_json = "{}"
    else:
        # El mismo dispositivo puede pasar a otra cuenta: las preferencias de la anterior no valen.
        prefs_json = previa["prefs"] if previa["usuario_id"] == usuario_id else "{}"
        conn.execute("UPDATE suscripciones SET usuario_id = ?, p256dh = ?, auth = ?, prefs = ?, fallos = 0 WHERE endpoint = ?",
                     (usuario_id, p256dh, auth, prefs_json, endpoint))
    conn.commit()
    return prefs_efectivas(prefs_json, rol)


def estado(conn: sqlite3.Connection, usuario_id: int, rol: str, endpoint: Any) -> dict[str, bool] | None:
    """Las preferencias de este dispositivo si está suscrito con esta cuenta; None si no lo está."""
    if not isinstance(endpoint, str):
        return None
    f = conn.execute("SELECT prefs FROM suscripciones WHERE endpoint = ? AND usuario_id = ?", (endpoint, usuario_id)).fetchone()
    return prefs_efectivas(f["prefs"], rol) if f else None


def guardar_prefs(conn: sqlite3.Connection, usuario_id: int, rol: str, endpoint: Any, prefs: Any) -> dict[str, bool]:
    nuevas = limpiar_prefs(prefs, rol)
    f = conn.execute("SELECT prefs FROM suscripciones WHERE endpoint = ? AND usuario_id = ?", (endpoint, usuario_id)).fetchone() \
        if isinstance(endpoint, str) else None
    if not f:
        raise LookupError("Este dispositivo no tiene los avisos activados.")
    todas = {**prefs_efectivas(f["prefs"], rol), **nuevas}
    guardado = json.loads(f["prefs"] or "{}")
    contenido: dict[str, Any] = dict(todas)
    if isinstance(guardado, dict):
        for k, v in guardado.items():
            if k not in CATEGORIAS:
                contenido[k] = v  # elegir categorías no borra el horario ni el monto de «retirar a tu wallet»
    conn.execute("UPDATE suscripciones SET prefs = ? WHERE endpoint = ?", (json.dumps(contenido), endpoint))
    conn.commit()
    return todas


def guardar_horario(conn: sqlite3.Connection, usuario_id: int, endpoint: Any, horario: Any) -> dict[str, int]:
    """Guarda el horario de este dispositivo (validado). Lanza ValueError si no vale y LookupError si el dispositivo no está suscrito."""
    nuevo = limpiar_horario(horario)
    f = conn.execute("SELECT prefs FROM suscripciones WHERE endpoint = ? AND usuario_id = ?", (endpoint, usuario_id)).fetchone() \
        if isinstance(endpoint, str) else None
    if not f:
        raise LookupError("Este dispositivo no tiene los avisos activados.")
    try:
        contenido = json.loads(f["prefs"] or "{}")
    except ValueError:
        contenido = {}
    if not isinstance(contenido, dict):
        contenido = {}
    contenido["horario"] = nuevo
    conn.execute("UPDATE suscripciones SET prefs = ? WHERE endpoint = ?", (json.dumps(contenido), endpoint))
    conn.commit()
    return nuevo


def guardar_umbral(conn: sqlite3.Connection, usuario_id: int, endpoint: Any, valor: Any) -> int:
    """Guarda el monto de «retirar a tu wallet» de este dispositivo (validado)."""
    nuevo = limpiar_umbral(valor)
    f = conn.execute("SELECT prefs FROM suscripciones WHERE endpoint = ? AND usuario_id = ?", (endpoint, usuario_id)).fetchone() \
        if isinstance(endpoint, str) else None
    if not f:
        raise LookupError("Este dispositivo no tiene los avisos activados.")
    try:
        contenido = json.loads(f["prefs"] or "{}")
    except ValueError:
        contenido = {}
    if not isinstance(contenido, dict):
        contenido = {}
    contenido["umbral_wallet"] = nuevo
    conn.execute("UPDATE suscripciones SET prefs = ? WHERE endpoint = ?", (json.dumps(contenido), endpoint))
    conn.commit()
    return nuevo


def baja(conn: sqlite3.Connection, usuario_id: int, endpoint: Any) -> None:
    if isinstance(endpoint, str):
        conn.execute("DELETE FROM suscripciones WHERE endpoint = ? AND usuario_id = ?", (endpoint, usuario_id))
        conn.commit()


# ------------------------------------------------------------------ envío
def _enviar_uno(sub: dict[str, Any], payload: str) -> None:
    """Un mensaje a un dispositivo (las pruebas sustituyen esta función)."""
    from pywebpush import webpush

    webpush(
        subscription_info={"endpoint": sub["endpoint"], "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]}},
        data=payload, vapid_private_key=asegurar_clave(), vapid_claims={"sub": CONTACTO}, ttl=TTL, timeout=10)


PRUEBA_ESPERA = 30  # segundos mínimos entre dos avisos de prueba al mismo dispositivo


def probar(conn: sqlite3.Connection, usuario_id: int, endpoint: Any) -> dict[str, Any]:
    """Un aviso de prueba, ya y solo a este dispositivo (idea 143). Devuelve `{ok, mensaje}` con el resultado en español.
    LookupError si el dispositivo no tiene avisos; PermissionError (con los segundos que faltan) si se pidió hace menos de 30 s."""
    f = conn.execute("SELECT id, endpoint, p256dh, auth FROM suscripciones WHERE endpoint = ? AND usuario_id = ?",
                     (endpoint, usuario_id)).fetchone() if isinstance(endpoint, str) else None
    if not f:
        raise LookupError("Este dispositivo no tiene los avisos activados.")
    clave = f"prueba_aviso:{f['id']}"
    ahora_t = int(time.time())
    previo = conn.execute("SELECT valor FROM meta WHERE clave = ?", (clave,)).fetchone()
    if previo and ahora_t - int(previo[0]) < PRUEBA_ESPERA:
        raise PermissionError(str(PRUEBA_ESPERA - (ahora_t - int(previo[0]))))
    conn.execute("INSERT INTO meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor", (clave, str(ahora_t)))
    conn.commit()
    payload = json.dumps({"titulo": "Libro DCA", "cuerpo": "Aviso de prueba: si lo ves, los avisos funcionan en este dispositivo.",
                          "etiqueta": "prueba", "url": "/"}, ensure_ascii=False)
    try:
        _enviar_uno(dict(f), payload)
    except Exception as e:  # noqa: BLE001 — el resultado se traduce a un mensaje claro
        codigo = _codigo(e)
        if codigo in (404, 410):
            conn.execute("DELETE FROM suscripciones WHERE id = ?", (f["id"],))
            conn.commit()
            return {"ok": False, "mensaje": "El servicio de avisos ya no reconoce este dispositivo (lo canceló o lo borró). Lo quité: vuelve a activar los avisos."}
        if codigo is not None:
            return {"ok": False, "mensaje": f"El servicio de avisos rechazó el mensaje (código {codigo}). Prueba apagar y volver a activar los avisos en este dispositivo."}
        return {"ok": False, "mensaje": "El servidor no pudo hablar con el servicio de avisos. Revisa su conexión a internet y vuelve a intentarlo."}
    conn.execute("UPDATE suscripciones SET ultimo_ok = ?, fallos = 0 WHERE id = ?", (int(time.time()), f["id"]))
    conn.commit()
    return {"ok": True, "mensaje": "Aviso enviado. Debería llegarte en unos segundos; si no aparece, mira los permisos de notificaciones del navegador."}


def _codigo(e: Exception) -> int | None:
    r = getattr(e, "response", None)
    return getattr(r, "status_code", None)


def _despachar(db_path: str, destinos: list[dict[str, Any]], payload: str) -> int:
    """Envía a cada dispositivo y limpia los que ya no existen. Devuelve cuántos se entregaron al servicio de push."""
    conn = sqlite3.connect(db_path, timeout=15)
    ok = 0
    try:
        for d in destinos:
            try:
                _enviar_uno(d, payload)
            except Exception as e:  # noqa: BLE001 — un dispositivo roto no debe frenar a los demás
                if _codigo(e) in (404, 410):  # el dispositivo canceló los avisos o los borró
                    conn.execute("DELETE FROM suscripciones WHERE id = ?", (d["id"],))
                else:
                    conn.execute("UPDATE suscripciones SET fallos = fallos + 1 WHERE id = ?", (d["id"],))
                    conn.execute("DELETE FROM suscripciones WHERE id = ? AND fallos >= ?", (d["id"], MAX_FALLOS))
                    print(f"push: no se pudo avisar a un dispositivo ({type(e).__name__})", flush=True)
            else:
                ok += 1
                conn.execute("UPDATE suscripciones SET ultimo_ok = ?, fallos = 0 WHERE id = ?", (int(time.time()), d["id"]))
            conn.commit()
    finally:
        conn.close()
    return ok


def destinatarios(conn: sqlite3.Connection, categoria: str) -> list[dict[str, Any]]:
    rol = CATEGORIAS[categoria]["rol"]
    out = []
    for r in conn.execute(
            "SELECT s.id, s.endpoint, s.p256dh, s.auth, s.prefs FROM suscripciones s "
            "JOIN usuarios u ON u.id = s.usuario_id WHERE u.activo = 1 AND u.rol = ?", (rol,)):
        if prefs_efectivas(r["prefs"], rol).get(categoria):
            out.append({"id": r["id"], "endpoint": r["endpoint"], "p256dh": r["p256dh"], "auth": r["auth"], "horario": horario_de(r["prefs"]),
                        "umbral": umbral_de(r["prefs"])})
    return out


def destinatario(conn: sqlite3.Connection, sus_id: int, categoria: str) -> dict[str, Any] | None:
    """Un dispositivo concreto si sigue suscrito, su cuenta está activa y tiene esa categoría encendida."""
    return next((d for d in destinatarios(conn, categoria) if d["id"] == sus_id), None)


def _db_path(conn: sqlite3.Connection) -> str:
    return next(r[2] for r in conn.execute("PRAGMA database_list") if r[1] == "main")


def enviar_ahora(conn: sqlite3.Connection, categoria: str, titulo: str, cuerpo: str, etiqueta: str,
                 destinos: list[dict[str, Any]] | None = None) -> int:
    """Manda el aviso ya. Sin `destinos`, a todos los que tengan esa categoría; con ellos, solo a esos dispositivos."""
    conn.commit()  # el envío abre su propia conexión: sin una escritura a medias aquí, la base no se bloquea
    if destinos is None:
        destinos = destinatarios(conn, categoria)
    if not destinos:
        return 0
    datos: dict[str, Any] = {"titulo": titulo, "cuerpo": cuerpo, "etiqueta": etiqueta, "url": "/"}
    if categoria == "recordatorio":
        datos["acciones"] = ["anotar"]  # el botón «Anotar compra» de la notificación (Android y computadora; iPhone no los muestra)
    payload = json.dumps(datos, ensure_ascii=False)
    ruta = _db_path(conn)
    if SINCRONO:
        return _despachar(ruta, destinos, payload)
    # En segundo plano: la petición que anota la compra no espera a Apple ni a Google.
    threading.Thread(target=_despachar, args=(ruta, destinos, payload), daemon=True).start()
    return len(destinos)


def notificar(conn: sqlite3.Connection, categoria: str, titulo: str, cuerpo: str, etiqueta: str) -> int:
    """
    Avisa a quien tenga esa categoría encendida y esté dentro de su horario; a quien duerme se lo deja guardado para cuando despierte
    (cada dispositivo tiene su horario, por defecto de 8:00 a 21:00). Nunca lanza: avisar es secundario.
    """
    try:
        conn.row_factory = sqlite3.Row
        hora = ahora().hour
        todos = destinatarios(conn, categoria)
        despiertos = [d for d in todos if en_horario(d["horario"], hora)]
        for d in todos:
            if d not in despiertos:
                conn.execute("INSERT INTO avisos_pendientes (categoria, titulo, cuerpo, etiqueta, creado, sus_id) VALUES (?, ?, ?, ?, ?, ?)",
                             (categoria, titulo, cuerpo, etiqueta, int(time.time()), d["id"]))
        conn.commit()
        return enviar_ahora(conn, categoria, titulo, cuerpo, etiqueta, destinos=despiertos) if despiertos else 0
    except Exception as e:  # noqa: BLE001
        print(f"push: no se pudo avisar ({type(e).__name__}: {e})", flush=True)
        return 0


def vaciar_pendientes(conn: sqlite3.Connection) -> int:
    """
    Manda lo guardado a cada dispositivo cuando ya está dentro de su horario. Varios avisos de una categoría para un mismo dispositivo
    salen como uno solo. Los de antes de los horarios propios (sin dispositivo) salen con el horario de siempre.
    """
    conn.row_factory = sqlite3.Row
    filas = conn.execute("SELECT id, categoria, titulo, cuerpo, etiqueta, sus_id FROM avisos_pendientes ORDER BY id").fetchall()
    if not filas:
        return 0
    hora = ahora().hour
    grupos: dict[tuple[str, int | None], list[sqlite3.Row]] = {}
    for f in filas:
        grupos.setdefault((f["categoria"], f["sus_id"]), []).append(f)
    enviados = 0
    borrar: list[int] = []
    for (cat, sus_id), lista in grupos.items():
        if sus_id is None:  # de antes de los horarios propios: el horario de siempre y quien tenga la categoría ahora
            if not dentro_de_horario():
                continue
            destinos = destinatarios(conn, cat)
        else:
            d = destinatario(conn, sus_id, cat)
            if d is not None and not en_horario(d["horario"], hora):
                continue  # todavía duerme: sigue guardado
            destinos = [d] if d is not None else []  # si el dispositivo ya no existe o apagó la categoría, el aviso se descarta
        if destinos:
            if len(lista) == 1:
                enviados += enviar_ahora(conn, cat, lista[0]["titulo"], lista[0]["cuerpo"], lista[0]["etiqueta"], destinos=destinos)
            else:
                cuerpo = f"Tienes {len(lista)} avisos nuevos del libro."
                enviados += enviar_ahora(conn, cat, lista[0]["titulo"], cuerpo, f"resumen-{cat}", destinos=destinos)
        borrar.extend(f["id"] for f in lista)
    if borrar:
        conn.executemany("DELETE FROM avisos_pendientes WHERE id = ?", [(i,) for i in borrar])
        conn.commit()
    return enviados


# ------------------------------------------------------------------ TXID vigilados
def vigilar_tx(conn: sqlite3.Connection, txid: str | None) -> None:
    if txid:
        conn.execute("INSERT OR IGNORE INTO tx_vigilados (txid, creado) VALUES (?, ?)", (txid, int(time.time())))
        conn.commit()
