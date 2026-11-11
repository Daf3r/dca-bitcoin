"""Servidor Flask local para las pruebas de navegador: base temporal, exchanges simulados y sin red.

Uso: python tests/servidor_prueba.py PUERTO [ESCENARIO]
Escenarios: hoy (1 compra), dos, tres, nueve, anio (≈1 año de compras semanales), largo, ballena,
mil (1,000 compras en casi seis años, con extras, ventas y traslados), vacio (sin compras), sinprecio,
sinhist (sin histórico de precios).
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
os.environ.setdefault("LIMITE_ESCRITURAS", "1000000")  # estas pruebas escriben a toda prisa; el límite (idea 151) se prueba aparte en test_api
os.environ.setdefault("LOG_PETICIONES", "0")
# «Hoy» como en producción (America/El_Salvador): si no, entre las 18:00 y las 24:00 allí el día UTC ya es el siguiente.
os.environ["TZ"] = "America/El_Salvador"
time.tzset()
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
# Una caída brusca y corta (−38 % durante 16 días, hace ~3.5 meses) para que haya un tramo de «gran caída» en el gráfico.
for i in range(-112, -96):
    PRECIOS[HOY + timedelta(days=i)] *= 0.62


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
elif esc == "mil":
    # 1,000 compras: una cada ~2 días durante casi seis años (el volumen que tendría la app tras mucho tiempo de uso).
    r3 = random.Random(1000)
    for k in range(1000):
        d = HOY - timedelta(days=3 + round((999 - k) * 2.1))
        monto = round(r3.choice([10, 15, 20, 25, 25, 30]) + r3.random() * 5, 2)
        comprar(d, monto)
        if k % 97 == 50:  # alguna compra extra por una caída, con su nota
            conn.execute("UPDATE compras SET extra = 1, nota = 'Caída' WHERE id = (SELECT MAX(id) FROM compras)")
        if k % 40 == 7:  # unas etiquetas para probar el filtro (cumpleaños sale pocas veces; bono más)
            conn.execute("UPDATE compras SET etiquetas = ? WHERE id = (SELECT MAX(id) FROM compras)", ("cumpleaños,bono" if k % 80 == 7 else "bono",))
    for k in range(6):  # unas ventas pequeñas y dos traslados
        server.insertar(conn, ((HOY - timedelta(days=100 + k * 300)).isoformat(), 5.0, 60000.0, 8000), None, "venta", "Gasto", 0)
    for fecha, sentido, sats in ((HOY - timedelta(days=500), "a_wallet", 3_000_000), (HOY - timedelta(days=60), "a_wallet", 1_500_000)):
        conn.execute("INSERT INTO traslados (fecha, sats, sentido, creado) VALUES (?, ?, ?, ?)", (fecha.isoformat(), sats, sentido, 1))
    conn.commit()
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
