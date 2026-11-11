"""Prueba del envío push REAL contra un servicio de push falso.

No se simula la librería de envío: se deja que `pywebpush` cifre y firme el mensaje de verdad, y un servidor local (que
hace de Apple o Google) lo recibe, lo descifra con el estándar (RFC 8291, `aes128gcm`) y comprueba la firma VAPID
(RFC 8292). Así se prueba lo que ninguna otra prueba toca: el cifrado, las cabeceras y la clave de la app.

Uso: python tests/test_push_real.py
"""
import base64
import http.server
import json
import os
import sqlite3
import sys
import tempfile
import threading
import time
from datetime import datetime

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

tmp = tempfile.mkdtemp()
os.environ["DB_PATH"] = os.path.join(tmp, "libro.db")
os.environ.setdefault("LIMITE_ESCRITURAS", "1000000")  # estas pruebas escriben a toda prisa; el límite (idea 151) se prueba aparte en test_api
os.environ.setdefault("LOG_PETICIONES", "0")
os.environ["NO_PROXY"] = os.environ["no_proxy"] = "127.0.0.1,localhost"  # el servicio falso es local
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app"))
import auth  # noqa: E402
import push  # noqa: E402
import ritmo  # noqa: E402
import server  # noqa: E402

ok = 0


def check(cond, msg):
    global ok
    assert cond, msg
    ok += 1


def b64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


# ------------------------------------------------------------ el «navegador» que se suscribe
class Dispositivo:
    """Un dispositivo suscrito: tiene su par de claves y su secreto de autenticación, como un navegador."""

    def __init__(self):
        self.privada = ec.generate_private_key(ec.SECP256R1())
        self.publica = self.privada.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        self.auth = os.urandom(16)

    def descifrar(self, cuerpo: bytes) -> bytes:
        """RFC 8188 (aes128gcm) con las claves de RFC 8291: lo que hace el navegador al recibir el aviso."""
        sal, rs, idlen = cuerpo[:16], int.from_bytes(cuerpo[16:20], "big"), cuerpo[20]
        emisor, cifrado = cuerpo[21:21 + idlen], cuerpo[21 + idlen:]
        compartido = self.privada.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), emisor))
        ikm = HKDF(hashes.SHA256(), 32, self.auth, b"WebPush: info\x00" + self.publica + emisor).derive(compartido)
        cek = HKDF(hashes.SHA256(), 16, sal, b"Content-Encoding: aes128gcm\x00").derive(ikm)
        nonce = HKDF(hashes.SHA256(), 12, sal, b"Content-Encoding: nonce\x00").derive(ikm)
        assert len(cifrado) <= rs, "el registro no cabe en el tamaño declarado"
        claro = AESGCM(cek).decrypt(nonce, cifrado, None).rstrip(b"\x00")
        assert claro[-1:] == b"\x02", "falta el delimitador del último registro"
        return claro[:-1]


# ------------------------------------------------------------ el «servicio de push» falso
recibidos: list[dict] = []
RESPUESTAS = {"/ok": 201, "/gone": 410, "/roto": 500}


class Servicio(http.server.BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802
        largo = int(self.headers.get("Content-Length", "0"))
        recibidos.append({"ruta": self.path, "cab": {k.lower(): v for k, v in self.headers.items()}, "cuerpo": self.rfile.read(largo)})
        self.send_response(RESPUESTAS.get(self.path, 404))
        self.end_headers()

    def log_message(self, *a):
        pass


httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Servicio)
puerto = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{puerto}"

# ------------------------------------------------------------ preparación: cuenta admin y dispositivos suscritos
conn = server.connect()
auth.crear_usuario(conn, "Daf3r", "clave-de-prueba-12", "admin", "prueba")
uid = auth.buscar(conn, "Daf3r")["id"]
disp = {ruta: Dispositivo() for ruta in RESPUESTAS}
for ruta, d in disp.items():
    conn.execute("INSERT INTO suscripciones (usuario_id, endpoint, p256dh, auth, creado) VALUES (?, ?, ?, ?, ?)",
                 (uid, BASE + ruta, b64e(d.publica), b64e(d.auth), int(time.time())))
conn.commit()
push.SINCRONO = True
push.ahora = lambda: datetime(2026, 11, 6, 12, 0, tzinfo=ritmo.ZONA)  # a mediodía: dentro del horario de avisos
ESPERADO = {"titulo": "Libro DCA", "cuerpo": "Te quedan 2 días para comprar este periodo.", "etiqueta": "recordatorio", "url": "/", "acciones": ["anotar"]}  # el recordatorio trae el botón «Anotar compra»

# ------------------------------------------------------------ envío de verdad (sin sustituir nada de push.py)
n = push.notificar(conn, "recordatorio", ESPERADO["titulo"], ESPERADO["cuerpo"], ESPERADO["etiqueta"])
check(n == 1, f"se entregó a un dispositivo (los otros dos responden con error a propósito) ({n})")
por_ruta = {r["ruta"]: r for r in recibidos}
check(set(por_ruta) == set(RESPUESTAS), f"el servicio recibió un mensaje por dispositivo {list(por_ruta)}")

# El mensaje de /ok: cabeceras, cifrado y firma
r = por_ruta["/ok"]
check(r["cab"].get("content-encoding") == "aes128gcm", f"cifrado aes128gcm {r['cab'].get('content-encoding')}")
check(r["cab"].get("ttl") == str(push.TTL), f"TTL de un día {r['cab'].get('ttl')}")
claro = disp["/ok"].descifrar(r["cuerpo"])
check(json.loads(claro) == ESPERADO, f"el dispositivo descifra exactamente el aviso {claro}")
check(b"Te quedan" not in r["cuerpo"], "lo que viaja va cifrado, no en claro")

auth_h = r["cab"].get("authorization", "")
check(auth_h.startswith("vapid t=") and ",k=" in auth_h.replace(", k=", ",k="), f"cabecera VAPID {auth_h[:30]}")
jwt = auth_h.split("t=", 1)[1].split(",")[0].strip()
k = auth_h.split("k=", 1)[1].strip()
check(k == push.clave_publica(), "la clave pública VAPID del mensaje es la que la app entrega a los navegadores")
cab_b64, carga_b64, firma_b64 = jwt.split(".")
firma = b64(firma_b64)
check(len(firma) == 64, "firma ES256 de 64 bytes")
ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), b64(k)).verify(
    encode_dss_signature(int.from_bytes(firma[:32], "big"), int.from_bytes(firma[32:], "big")),
    f"{cab_b64}.{carga_b64}".encode(), ec.ECDSA(hashes.SHA256()))
ok += 1  # (verify lanza si la firma no es válida)
carga = json.loads(b64(carga_b64))
check(carga["aud"] == BASE, f"el destinatario de la firma es el servicio de push {carga['aud']}")
check(carga["sub"] == push.CONTACTO, f"contacto de la app {carga['sub']}")
check(0 < carga["exp"] - time.time() <= 24 * 3600 + 60, "la firma caduca dentro de las próximas 24 horas")
check(json.loads(b64(cab_b64)) == {"typ": "JWT", "alg": "ES256"}, "cabecera del JWT")

# Limpieza según la respuesta del servicio
filas = {f["endpoint"].replace(BASE, ""): f for f in conn.execute("SELECT endpoint, fallos, ultimo_ok FROM suscripciones")}
check("/gone" not in filas, "un 410 borra la suscripción (el dispositivo ya no existe)")
check(filas["/roto"]["fallos"] == 1 and filas["/ok"]["fallos"] == 0 and filas["/ok"]["ultimo_ok"], "un 500 cuenta un fallo y un 201 deja la marca del último envío")

# Un mensaje de otra categoría llega con su propia etiqueta, y el cifrado cambia cada vez (sal nueva)
recibidos.clear()
push.notificar(conn, "respaldo", "Libro DCA", "El respaldo diario falló. Revisa el servidor.", "respaldo")
r2 = next(x for x in recibidos if x["ruta"] == "/ok")
check(json.loads(disp["/ok"].descifrar(r2["cuerpo"]))["etiqueta"] == "respaldo", "la segunda categoría llega bien")
check(r2["cuerpo"][:16] != r["cuerpo"][:16], "cada mensaje usa una sal nueva")

# Con un cuerpo manipulado, el descifrado falla (el cifrado autentica)
malo = bytearray(r["cuerpo"]); malo[-1] ^= 1
try:
    disp["/ok"].descifrar(bytes(malo)); fallo = False
except Exception:
    fallo = True
check(fallo, "un mensaje alterado en el camino no se puede descifrar")

httpd.shutdown()
sqlite3.connect(os.environ["DB_PATH"]).close()
print("OK", ok, "comprobaciones del envío push real")
