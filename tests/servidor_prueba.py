"""Servidor Flask local para las pruebas de navegador: base temporal, exchanges simulados y sin red.

Uso: python tests/servidor_prueba.py PUERTO [ESCENARIO]
Escenarios: hoy (1 compra), dos, tres, nueve, anio (≈1 año de compras semanales), largo, ballena,
vacio (sin compras), sinprecio, sinhist (sin histórico de precios).
Cuentas: Daf3r / clave-de-prueba-12 (admin) y Ana / lectora-de-prueba (lector).
"""
import math
import os
import random
import sys
import tempfile
import time
import urllib.error
from datetime import date, datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "libro.db")
sys.path.insert(0, APP)
import auth  # noqa: E402
import server  # noqa: E402

puerto = int(sys.argv[1])
esc = sys.argv[2] if len(sys.argv) > 2 else "anio"
PRECIO = 77598.24
HOY = date.today()
# Precio diario simulado: interpola (en logaritmo) entre unas anclas de seis años y le añade ruido suave.
ANCLAS = [(-2192, 13800), (-2026, 63000), (-1929, 30000), (-1817, 67000), (-1597, 19000), (-1441, 15800),
          (-1209, 31000), (-1040, 42500), (-964, 71000), (-788, 54000), (-686, 106000), (-574, 77000),
          (-393, 124000), (-271, 70000), (-111, 96000), (0, PRECIO)]
rnd = random.Random(7)
PRECIOS = {}
ruido = 0.0
for (da, pa), (db_, pb) in zip(ANCLAS, ANCLAS[1:], strict=False):
    for i in range(db_ - da):
        f = i / (db_ - da)
        ruido = ruido * 0.93 + (rnd.random() - 0.5) * 0.05
        base = math.exp(math.log(pa) + (math.log(pb) - math.log(pa)) * f)
        PRECIOS[HOY + timedelta(days=da + i)] = base * (1 + ruido * math.sin(math.pi * f) * 1.6)
PRECIOS[HOY] = PRECIO


def ts(d: date) -> int:
    return int(datetime(d.year, d.month, d.day, tzinfo=timezone.utc).timestamp())


def falso(url: str, timeout: int = 8):
    """Sustituye a server._get_json: mempool.space y Coinbase simulados; Kraken no existe."""
    if "mempool.space" in url:
        if url.endswith("/blocks/tip/height"):
            return 850010
        if url.endswith("0123456789abcdef" * 4):
            return {"fee": 2150, "status": {"confirmed": True, "block_height": 850000, "block_time": 1700000000}}
        if url.endswith("fedcba9876543210" * 4):
            return {"fee": 800, "status": {"confirmed": False}}
        raise urllib.error.HTTPError(url, 404, "no", {}, None)
    if esc == "sinhist":
        raise OSError("histórico caído")
    q = parse_qs(urlparse(url).query)
    if "coinbase" in url:
        a = date.fromisoformat(q["start"][0][:10])
        b = date.fromisoformat(q["end"][0][:10])
        time.sleep(0.25)  # el relleno tarda: se ve el esqueleto y el sondeo
        out = []
        d = b
        while d >= a:
            if d in PRECIOS:
                out.append([ts(d), 1, 2, 3, PRECIOS[d], 5])
            d -= timedelta(days=1)
        return out
    raise OSError("sin kraken en pruebas")


server._get_json = falso
server.consultar_precio = (lambda: (None, None)) if esc == "sinprecio" else (lambda: (PRECIO, "Coinbase"))

conn = server.connect()


def comprar(d: date, monto: float, sats: int | None = None) -> None:
    p = PRECIOS.get(d, PRECIO)
    s = sats or round(monto / p * 1e8)
    server.insertar(conn, (d.isoformat(), monto, monto * 1e8 / s, s))


if esc in ("hoy", "sinprecio", "sinhist"):
    comprar(HOY - timedelta(days=3), 28.68, 36578)
elif esc == "nueve":
    for k in range(9, 0, -1):
        comprar(HOY - timedelta(days=k * 7 - 3), 25.0)
elif esc == "dos":
    comprar(HOY - timedelta(days=10), 25.0)
    comprar(HOY - timedelta(days=3), 28.68, 36578)
elif esc == "tres":
    comprar(HOY - timedelta(days=17), 30.0)
    comprar(HOY - timedelta(days=10), 25.0)
    comprar(HOY - timedelta(days=3), 28.68, 36578)
elif esc in ("anio", "largo", "ballena"):
    semanas = {"anio": 52, "largo": 300, "ballena": 300}[esc]
    r2 = random.Random(len(esc) * 13)
    for k in range(semanas - 1, -1, -1):
        if r2.random() < 0.06:
            continue
        d = HOY - timedelta(days=3 + k * 7 + r2.randint(0, 1))
        base = 14 if esc == "anio" else 12 + (semanas - k) * 0.05
        if esc == "ballena":
            base *= 2500
        comprar(d, round(base + r2.random() * base * 0.8, 2))
auth.crear_usuario(conn, "Daf3r", "clave-de-prueba-12", "admin", "prueba")
auth.crear_usuario(conn, "Ana", "lectora-de-prueba", "lector", "prueba")
conn.commit()
conn.close()
server.app.run(port=puerto, threaded=True)
