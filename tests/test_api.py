"""Pruebas de la API con el cliente de Flask y una base temporal. Sin red.

Uso (con Flask instalado): python tests/test_api.py
"""
import os, sys, sqlite3, tempfile, importlib, json, subprocess
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
from datetime import date, timedelta
tmp = tempfile.mkdtemp()
dbp = os.path.join(tmp, "libro.db")
# base vieja: sin columna sats
c = sqlite3.connect(dbp)
c.executescript("""CREATE TABLE compras (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, monto REAL NOT NULL CHECK (monto>0), precio REAL NOT NULL CHECK (precio>0), creado INTEGER NOT NULL);
INSERT INTO compras (fecha,monto,precio,creado) VALUES ('2024-01-05',50,42000,1),('2024-02-05',50,45000.5,2);""")
c.commit(); c.close()
os.environ["DB_PATH"] = dbp
sys.path.insert(0, APP)
import server
cl = server.app.test_client()
ok = 0
def check(cond, msg):
    global ok
    assert cond, msg
    ok += 1

r = cl.get("/api/compras"); rows = r.get_json()
check(r.status_code == 200 and len(rows) == 2, "listar")
check(rows[0]["sats"] == round(50/42000*1e8), f"migración sats {rows[0]}")
check(all(r_["sats"] for r_ in rows), "sats llenos")
# init_db idempotente
server.init_db(); check(len(cl.get("/api/compras").get_json()) == 2, "init idempotente")

today = date.today().isoformat()
r = cl.post("/api/compras", json={"fecha": today, "monto": 50, "sats": 74627})
check(r.status_code == 201, r.data); j = r.get_json()
check(abs(j["precio"] - 50*1e8/74627) < 1e-6 and j["sats"] == 74627, "precio derivado")
r = cl.post("/api/compras", json={"fecha": today, "monto": 25, "precio": 60000})
check(r.status_code == 201 and r.get_json()["sats"] == round(25/60000*1e8), "compat precio")
r = cl.post("/api/compras", json={"fecha": today, "monto": 10, "sats": 1000.0})
check(r.status_code == 201 and r.get_json()["sats"] == 1000, "sats float entero")
cid = j["id"]

bad = [
  ({"fecha": "2024-13-01", "monto": 1, "sats": 1}, "Fecha"),
  ({"fecha": "hoy", "monto": 1, "sats": 1}, "Fecha"),
  ({"fecha": (date.today()+timedelta(days=5)).isoformat(), "monto": 1, "sats": 1}, "futura"),
  ({"fecha": today, "monto": 0, "sats": 1}, "Monto"),
  ({"fecha": today, "monto": True, "sats": 1}, "Monto"),
  ({"fecha": today, "monto": "50", "sats": 1}, "Monto"),
  ({"fecha": today, "monto": 1e10, "sats": 1}, "Monto"),
  ({"fecha": today, "monto": 50, "sats": 1.5}, "Sats"),
  ({"fecha": today, "monto": 50, "sats": -3}, "Sats"),
  ({"fecha": today, "monto": 50, "sats": True}, "Sats"),
  ({"fecha": today, "monto": 50, "sats": 10**13}, "Sats"),
  ({"fecha": today, "monto": 1e8, "sats": 1}, "cuadran"),
  ({"fecha": today, "monto": 50}, "Precio"),
  ({"fecha": today, "monto": 50, "precio": float("inf")}, "Precio"),
]
for body, frag in bad:
    r = cl.post("/api/compras", data=json.dumps(body), content_type="application/json")
    check(r.status_code == 400 and frag in r.get_json()["error"], f"{body} -> {r.status_code} {r.data}")
r = cl.post("/api/compras", data="[]", content_type="application/json"); check(r.status_code == 400, "lista")
r = cl.post("/api/compras", data="x", content_type="text/plain"); check(r.status_code == 400, "no json")
r = cl.post("/api/compras", data=json.dumps({"fecha": today, "monto": 1, "sats": 1}), content_type="text/plain"); check(r.status_code == 400, "json con text/plain rechazado")

r = cl.put(f"/api/compras/{cid}", json={"fecha": "2024-03-01", "monto": 60, "sats": 80000})
check(r.status_code == 200 and r.get_json()["fecha"] == "2024-03-01" and r.get_json()["sats"] == 80000, "editar")
check(cl.put("/api/compras/9999", json={"fecha": today, "monto": 1, "sats": 1}).status_code == 404, "editar 404")
check(cl.put(f"/api/compras/{cid}", json={"fecha": today, "monto": -1, "sats": 1}).status_code == 400, "editar 400")
check(cl.delete(f"/api/compras/{cid}").status_code == 204, "borrar")
check(cl.delete(f"/api/compras/{cid}").status_code == 404, "borrar 404")

# CSRF guard
r = cl.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 1}, headers={"Sec-Fetch-Site": "cross-site"})
check(r.status_code == 403, "cross-site")
r = cl.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 100}, headers={"Sec-Fetch-Site": "same-origin"})
check(r.status_code == 201, "same-origin"); cl.delete(f"/api/compras/{r.get_json()['id']}")

# export
r = cl.get("/api/export.csv"); txt = r.get_data(as_text=True)
check(r.status_code == 200 and txt.startswith("fecha,monto_usd,precio_btc_usd,sats,btc\n"), txt[:80])
check("attachment" in r.headers["Content-Disposition"], "disposition")
n_antes = len(cl.get("/api/compras").get_json())
# reimportar el export: todo repetido
r = cl.post("/api/import", data=txt, content_type="text/csv")
check(r.status_code == 200 and r.get_json()["nuevas"] == 0 and r.get_json()["repetidas"] == n_antes, r.data)
# CSV viejo (sin sats) con BOM y una línea mala
viejo = "﻿fecha,monto_usd,precio_btc_usd\n2024-01-05,50,42000\n2024-04-01,20,61000\n2024-04-02,abc,1\n2099-01-01,5,5\n2024-05-01,10,\n"
r = cl.post("/api/import", data=viejo.encode(), content_type="text/csv; charset=utf-8"); j = r.get_json()
check(r.status_code == 200 and j["nuevas"] == 1 and j["repetidas"] == 1 and len(j["omitidas"]) == 3, j)
check(j["omitidas"][0].startswith("Línea 4"), j["omitidas"])
r = cl.post("/api/import", data=viejo.encode(), content_type="text/csv"); check(r.get_json()["nuevas"] == 0, "idempotente")
check(cl.post("/api/import", data="a,b\n1,2\n", content_type="text/csv").status_code == 400, "sin columnas")
check(cl.post("/api/import", data=txt, content_type="text/plain").status_code == 415, "mimetype")
check(cl.post("/api/import", data=txt, content_type="text/csv", headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403, "import csrf")
# sats no entero en CSV
r = cl.post("/api/import", data="fecha,monto_usd,sats\n2024-06-01,10,12.5\n2024-06-02,10,12000\n", content_type="text/csv")
check(r.get_json()["nuevas"] == 1 and len(r.get_json()["omitidas"]) == 1, r.get_json())
# demasiado grande
check(cl.post("/api/import", data="x"*(1024*1024+10), content_type="text/csv").status_code == 413, "413")


# --- casos añadidos en la pasada final
r = cl.post("/api/compras", json={"fecha": today, "monto": 999999999.99, "sats": 9999999999999})
check(r.status_code == 201 and r.get_json()["sats"] == 9999999999999, "límites altos")
big = r.get_json()["id"]
exp = cl.get("/api/export.csv").get_data(as_text=True)
check(any(l.startswith(today + ",999999999.99,") and ",9999999999999," in l for l in exp.splitlines()), "export conserva cifras grandes")
cl.delete(f"/api/compras/{big}")
# ida y vuelta: exportar, vaciar, importar -> mismos sats exactos
antes = sorted((c["fecha"], c["monto"], c["sats"]) for c in cl.get("/api/compras").get_json())
exp = cl.get("/api/export.csv").get_data(as_text=True)
for c in cl.get("/api/compras").get_json(): cl.delete(f"/api/compras/{c['id']}")
r = cl.post("/api/import", data=exp, content_type="text/csv")
despues = sorted((c["fecha"], c["monto"], c["sats"]) for c in cl.get("/api/compras").get_json())
check(r.get_json()["nuevas"] == len(antes) and antes == despues, "ida y vuelta exacta")
# filas idénticas dentro del mismo archivo: la segunda cuenta como repetida
r = cl.post("/api/import", data="fecha,monto_usd,sats\n2023-03-03,10,20000\n2023-03-03,10,20000\n", content_type="text/csv")
check(r.get_json()["nuevas"] == 1 and r.get_json()["repetidas"] == 1, r.get_json())
# columnas con espacios y en otro orden
r = cl.post("/api/import", data=" sats , fecha , monto_usd \n30000,2023-04-04,15\n", content_type="text/csv")
check(r.get_json()["nuevas"] == 1, r.get_json())
# CSV vacío con cabecera válida
r = cl.post("/api/import", data="fecha,monto_usd,sats\n", content_type="text/csv")
check(r.status_code == 200 and r.get_json() == {"nuevas": 0, "repetidas": 0, "omitidas": []}, r.get_json())
# id no numérico -> 404 de Flask, no 500
check(cl.delete("/api/compras/abc").status_code in (404, 405), "id no numérico")

# cabeceras
r = cl.get("/")
check(r.status_code == 200 and "script-src 'self'" in r.headers["Content-Security-Policy"] and "unsafe" not in r.headers["Content-Security-Policy"], "csp")
check(cl.get("/app.js").mimetype in ("text/javascript", "application/javascript"), cl.get("/app.js").mimetype)
check(cl.get("/api/compras").headers["Cache-Control"] == "no-store", "no-store")
r = cl.get("/fonts/instrument-serif.woff2")
check(r.status_code == 200 and r.mimetype == "font/woff2", "fuente servida desde self")
check("font-src 'self'" in r.headers["Content-Security-Policy"], "csp font-src")
check(cl.get("/healthz").get_json() == {"ok": True}, "healthz")

# precio con fuentes simuladas
calls = []
def fake(): calls.append(1); return (70000.0, "Coinbase")
server.consultar_precio = fake
r = cl.get("/api/precio"); check(r.get_json()["precio"] == 70000.0 and not r.get_json()["viejo"], r.data)
cl.get("/api/precio"); check(len(calls) == 1, "caché")
server._precio["ts"] -= 100
server.consultar_precio = lambda: (None, None)
r = cl.get("/api/precio"); check(r.status_code == 200 and r.get_json()["viejo"], "viejo")
server._precio["ts"] -= 1000
check(cl.get("/api/precio").status_code == 503, "503")

# CLI importar
p = os.path.join(tmp, "c.csv"); open(p, "w").write(txt)
out = subprocess.run([sys.executable, os.path.join(APP, "importar.py"), p], capture_output=True, text=True, env={**os.environ}, cwd=APP)
check(out.returncode == 0 and "importadas: 0" in out.stdout, out.stdout + out.stderr)

# backup
os.environ["BACKUP_DIR"] = os.path.join(tmp, "bk")
import backup; importlib.reload(backup)
check(backup.run() and len(os.listdir(os.environ["BACKUP_DIR"])) == 1, "backup")
print("OK", ok, "comprobaciones")
