"""Servidor Flask local para las pruebas de navegador: base temporal, exchanges simulados y sin red.

Uso: python tests/servidor_prueba.py PUERTO [ESCENARIO]
Escenarios: hoy (1 compra), bonito (saldo capicúa), cero (vendió todo), aniv (hoy es el aniversario de su primera compra), taldia (hoy hace un año llegó a 1M), eco (80 semanas), dos, tres, nueve, anio (≈1 año de compras semanales), largo, ballena,
milbtc (como ballena, con una compra de 600 BTC: más de 1,000 BTC, para probar las cifras más largas),
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
elif esc == "bonito":  # saldo capicúa: 1,234,321 sats
    comprar(HOY - timedelta(days=10), 500.0, 1_000_000)
    comprar(HOY - timedelta(days=3), 200.0, 234_321)
elif esc == "cero":  # compró y vendió todo: campamento base con el bosque en pie
    comprar(HOY - timedelta(days=24), 25.0, 30_000)
    comprar(HOY - timedelta(days=17), 25.0, 30_000)
    comprar(HOY - timedelta(days=10), 25.0, 30_000)
    comprar(HOY - timedelta(days=5), 25.0, 30_000)
    server.insertar(conn, ((HOY - timedelta(days=2)).isoformat(), 100.0, 100000.0, 120_000), None, "venta", "Gasto", 0)
elif esc == "aniv":  # la primera compra fue hace exactamente un año (hoy es su aniversario) y hay compras semanales desde entonces
    ya = HOY.replace(year=HOY.year - 1, day=28) if (HOY.month == 2 and HOY.day == 29) else HOY.replace(year=HOY.year - 1)
    comprar(ya, 25.0, 30_000)
    for k in range(40, 0, -1):
        comprar(HOY - timedelta(days=3 + k * 7), 25.0, 30_000)
elif esc == "taldia":  # (campamento 23) un día como hoy: hace dos años llegó a 250k y hace un año, al campamento 1M (gana el campamento)
    def hace(anios: int) -> date:
        return HOY.replace(year=HOY.year - anios, day=28) if (HOY.month == 2 and HOY.day == 29) else HOY.replace(year=HOY.year - anios)

    def con_precio(d: date, s: int) -> None:
        comprar(d, round(PRECIOS.get(d, PRECIO) * s / 1e8, 2), s)

    ya2, ya1 = hace(2), hace(1)
    con_precio(ya2 - timedelta(days=30), 200_000)
    con_precio(ya2, 60_000)  # 260k: cruza 250k (principal)
    for k in range(1, 12):
        con_precio(ya2 + timedelta(days=30 * k), 60_000)  # 920k un mes antes del año
    con_precio(ya1, 100_000)  # 1,020,000: cruza el campamento 1M
    for k in range(1, 12):
        con_precio(ya1 + timedelta(days=30 * k), 25_000)
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
elif esc in ("anio", "eco", "largo", "ballena", "milbtc"):
    semanas = {"anio": 52, "eco": 80, "largo": 300, "ballena": 300, "milbtc": 300}[esc]
    r2 = random.Random(len(esc) * 13)
    for k in range(semanas - 1, -1, -1):
        if r2.random() < 0.06:
            continue
        ref = HOY - timedelta(days=3 + k * 7)
        # Un día antes como mucho, pero sin salirse de la semana (lunes a domingo) de `ref`: si no, los jueves
        # —cuando HOY - 3 cae en lunes— la compra pasaba a la semana anterior y la racha se rompía sola.
        d = ref - timedelta(days=r2.randint(0, 1) if ref.weekday() > 0 else (r2.randint(0, 1) and 0))
        base = 14 if esc in ("anio", "eco") else 12 + (semanas - k) * 0.05
        if esc in ("ballena", "milbtc"):
            base *= 2500
        comprar(d, round(base + r2.random() * base * 0.8, 2))
    if esc == "milbtc":  # cifras largas (campamento 20): una compra de 600 BTC deja el saldo por encima de 1,000 BTC
        comprar(HOY - timedelta(days=10), round(PRECIOS[HOY - timedelta(days=10)] * 600, 2), 60_000_000_000)
if esc == "eco":  # la semana en una línea (campamento 18): la compra de hace un año lleva su nota, y el Diario la trae de vuelta
    ya = HOY.replace(year=HOY.year - 1, day=28) if (HOY.month == 2 and HOY.day == 29) else HOY.replace(year=HOY.year - 1)
    semana_ya = ((ya - timedelta(days=6)).isoformat(), ya.isoformat())
    if conn.execute("SELECT 1 FROM compras WHERE fecha BETWEEN ? AND ?", semana_ya).fetchone() is None:  # esa semana pudo quedar sin compra
        comprar(ya - timedelta(days=2), 20.0)
    conn.execute("UPDATE compras SET nota = 'Sofi perdió su primer diente' WHERE id = (SELECT id FROM compras WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC, id DESC LIMIT 1)", semana_ya)
auth.crear_usuario(conn, "Daf3r", "clave-de-prueba-12", "admin", "prueba")
auth.crear_usuario(conn, "Ana", "lectora-de-prueba", "lector", "prueba")
if esc in ("anio", "largo"):  # una carta que ya se abrió (campamento 15A), para probar cómo se lee
    conn.execute("INSERT INTO capsulas (texto, abre_fecha, creado, autor) VALUES (?, ?, ?, ?)",
                 ("Querida familia:\n\nSi leen esto, ya llegamos lejos.\nCon cariño, papá", (HOY - timedelta(days=20)).isoformat(), 1_700_000_000, "Daf3r"))
conn.commit()
conn.close()
server.app.run(port=puerto, threaded=True)
