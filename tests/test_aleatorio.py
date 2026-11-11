"""Pruebas con datos aleatorios para las reglas del dinero.

Genera cientos de secuencias aleatorias de compras, ventas, gastos, traslados, ediciones y anulaciones a través de la
API y, después de CADA operación, comprueba lo que nunca debe romperse:
  · el saldo no queda negativo en ninguna fecha;
  · la wallet nunca queda negativa ni con más sats de los que hay, mientras no se haya tocado el total (ver «Hallazgos»);
  · una operación rechazada (400, 404 o 409) no cambia nada;
  · ninguna operación da un error del servidor (500).
Al final de cada secuencia compara el saldo, el invertido neto y «dónde están los sats» con lo que calcula lib.js.
Hallazgos (a propósito, no son fallos de esta prueba): el servidor comprueba los traslados solo cuando se crean o se anulan
ELLOS. Una venta o gasto, la anulación de una compra o la edición de una compra pueden bajar el saldo total por debajo de
lo que está «en la wallet» sin que nadie lo rechace ni lo avise (el cliente lo recorta con `ubicacionSats`; la regla
escrita es «si vendes desde la wallet, anota antes un traslado de vuelta al exchange»). El chequeo de traslados y saldo del
campamento 8 (idea 46) existe para esto. Por eso, tras la primera de esas operaciones, la secuencia deja de exigir que los
traslados cuadren, y esta prueba cuenta cuántas secuencias terminaron así.

Usa una semilla fija (la misma corrida da lo mismo); cámbiala con SEMILLA=n para explorar otros casos.

Uso: python tests/test_aleatorio.py
"""
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
from datetime import date, timedelta

tmp = tempfile.mkdtemp()
os.environ["DB_PATH"] = os.path.join(tmp, "libro.db")
os.environ.setdefault("LIMITE_ESCRITURAS", "1000000")  # estas pruebas escriben a toda prisa; el límite (idea 151) se prueba aparte en test_api
os.environ.setdefault("LOG_PETICIONES", "0")
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
sys.path.insert(0, APP)
import auth  # noqa: E402
import ritmo  # noqa: E402
import server  # noqa: E402

SEMILLA = int(os.environ.get("SEMILLA", "20261107"))
SECUENCIAS = int(os.environ.get("SECUENCIAS", "60"))
OPERACIONES = int(os.environ.get("OPERACIONES", "45"))
ok = 0


def check(cond, msg):
    global ok
    assert cond, msg
    ok += 1


c0 = server.connect()
auth.crear_usuario(c0, "Daf3r", "clave-de-prueba-12", "admin", "prueba")
c0.close()
cl = server.app.test_client()
cl.environ_base.update({"wsgi.url_scheme": "https", "HTTP_X_LIBRO": "1"})
assert cl.post("/api/login", json={"usuario": "Daf3r", "clave": "clave-de-prueba-12"}).status_code == 200

rng = random.Random(SEMILLA)
HOY = ritmo.hoy_sv()


def fecha_al_azar():
    return (HOY - timedelta(days=rng.randrange(0, 70))).isoformat()


def estado():
    return cl.get("/api/compras").get_json(), cl.get("/api/traslados").get_json()


def invariantes(contexto, traslados_cuadran=True):
    conn = server.connect()
    try:
        check(server.saldo_negativo(server.movimientos(conn)) is None, f"el saldo quedó negativo ({contexto})")
        if traslados_cuadran:
            check(server.falla_traslados(conn, server.traslados_vigentes(conn)) is None, f"los traslados dejaron de cuadrar ({contexto})")
    finally:
        conn.close()


def vaciar():
    conn = server.connect()
    conn.execute("DELETE FROM compras"); conn.execute("DELETE FROM traslados"); conn.commit(); conn.close()


def operacion(compras, traslados):
    """Una operación al azar. Devuelve (descripción, respuesta)."""
    saldo = sum(c["sats"] if c["tipo"] == "compra" else -c["sats"] for c in compras)
    azar = rng.random()
    if azar < 0.42 or not compras:
        sats = rng.randrange(1_000, 2_000_000)
        monto = round(sats / 1e8 * rng.uniform(20_000, 110_000), 2) or 0.01
        return "compra", cl.post("/api/compras", json={"fecha": fecha_al_azar(), "monto": monto, "sats": sats, "extra": rng.random() < 0.15})
    if azar < 0.57:
        # Venta o gasto: a veces cabe, a veces pide más de lo que hay (debe rechazarse).
        sats = rng.randrange(1, max(2, int(saldo * rng.uniform(0.05, 1.4)) + 2))
        return "venta", cl.post("/api/compras", json={"fecha": fecha_al_azar(), "monto": round(sats / 1e8 * 70_000, 2) or 0.01, "sats": sats, "tipo": "venta"})
    if azar < 0.74:
        sats = rng.randrange(1, max(2, int(max(saldo, 1) * rng.uniform(0.05, 1.3)) + 2))
        return "traslado", cl.post("/api/traslados", json={"fecha": fecha_al_azar(), "sats": sats, "sentido": rng.choice(["a_wallet", "a_wallet", "a_exchange"])})
    if azar < 0.84:
        c = rng.choice(compras)
        return "anular compra", cl.delete(f"/api/compras/{c['id']}")
    if azar < 0.92 and traslados:
        t = rng.choice(traslados)
        return "anular traslado", cl.delete(f"/api/traslados/{t['id']}")
    c = rng.choice(compras)
    sats = rng.randrange(1_000, 2_000_000)
    return "editar", cl.put(f"/api/compras/{c['id']}", json={"fecha": fecha_al_azar(), "monto": round(sats / 1e8 * 60_000, 2) or 0.01, "sats": sats})


casos = []
conteo = {"aceptadas": 0, "rechazadas": 0, "sin_cuadrar": 0}
for s in range(SECUENCIAS):
    vaciar()
    toco_el_total = False
    for k in range(OPERACIONES):
        compras, traslados = estado()
        nombre, r = operacion(compras, traslados)
        ctx = f"secuencia {s}, operación {k}: {nombre}, respuesta {r.status_code} {r.get_data(as_text=True)[:120]}"
        check(r.status_code < 500, f"error del servidor ({ctx})")
        check(r.status_code in (200, 201, 204, 400, 404, 409), f"respuesta inesperada ({ctx})")
        if r.status_code >= 400:
            conteo["rechazadas"] += 1
            check(estado() == (compras, traslados), f"una operación rechazada cambió datos ({ctx})")
        else:
            conteo["aceptadas"] += 1
            toco_el_total = toco_el_total or nombre in ("venta", "anular compra", "editar")
        invariantes(ctx, traslados_cuadran=not toco_el_total)
    if toco_el_total:
        conn = server.connect()
        conteo["sin_cuadrar"] += server.falla_traslados(conn, server.traslados_vigentes(conn)) is not None
        conn.close()
    compras, traslados = estado()
    casos.append({"compras": compras, "traslados": traslados})

check(conteo["aceptadas"] > SECUENCIAS * OPERACIONES * 0.3 and conteo["rechazadas"] > SECUENCIAS, f"el azar prueba aceptadas y rechazadas {conteo}")

# Paridad con lib.js: saldo, invertido neto y dónde están los sats
if shutil.which("node"):
    p = subprocess.run(["node", os.path.join(os.path.dirname(os.path.abspath(__file__)), "paridad_dinero.mjs")], input=json.dumps(casos), capture_output=True, text=True)
    check(p.returncode == 0, f"node calcula la paridad: {p.stderr[:200]}")
    js = json.loads(p.stdout)
    for i, (caso, esperado) in enumerate(zip(casos, js, strict=True)):
        movs = [(c["fecha"], c["id"], c["tipo"], c["monto"], c["sats"], c["extra"]) for c in caso["compras"]]
        inv, sats = ritmo.invertido_y_sats(movs)
        check(sats == esperado["sats"] and abs(inv - esperado["inv"]) < 1e-6, f"saldo e invertido igual que lib.js (secuencia {i}): {sats}/{inv} contra {esperado}")
        neto = sum(t["sats"] if t["sentido"] == "a_wallet" else -t["sats"] for t in caso["traslados"])
        wallet = max(0, min(neto, sats))
        check(esperado["wallet"] == wallet and esperado["exchange"] == sats - wallet, f"wallet y exchange igual que lib.js (secuencia {i}): {wallet} contra {esperado}")
else:
    print("(sin node: se omite la paridad con lib.js)")
print("OK", ok, f"comprobaciones con datos aleatorios (semilla {SEMILLA}; {conteo['aceptadas']} operaciones aceptadas y {conteo['rechazadas']} rechazadas; "
      f"{conteo['sin_cuadrar']} de {SECUENCIAS} secuencias terminaron con traslados que ya no cuadran tras tocar el total)")
