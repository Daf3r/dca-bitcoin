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
r = cl.get("/fonts/fraunces.woff2")
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


# --- histórico de precios, con los exchanges simulados
import threading as _th
import time as _t
from datetime import datetime as _dt, timezone as _tz
from urllib.parse import urlparse, parse_qs

llamadas = []
modo = {"cb": "ok", "kr": "ok", "lento": 0.0}


def _dias(a, b):
    d = a
    while d <= b:
        yield d
        d += timedelta(days=1)


def _ts(d):
    return int(_dt(d.year, d.month, d.day, tzinfo=_tz.utc).timestamp())


def falso_get_json(url, timeout=8):
    q = parse_qs(urlparse(url).query)
    if "coinbase" in url:
        a = date.fromisoformat(q["start"][0][:10]); b = date.fromisoformat(q["end"][0][:10])
        llamadas.append(("cb", a, b))
        _t.sleep(modo["lento"])
        if modo["cb"] != "ok":
            raise OSError("coinbase caído")
        assert (b - a).days < 300, "ventana de más de 300 días"
        return [[_ts(d), 1, 2, 3, 30000 + d.toordinal() % 1000, 5] for d in reversed(list(_dias(a, b)))]
    if "kraken" in url:
        a = _dt.fromtimestamp(int(q["since"][0]), _tz.utc).date()
        llamadas.append(("kr", a, None))
        if modo["kr"] != "ok":
            raise OSError("kraken caído")
        hoy_ = _dt.now(_tz.utc).date()
        a = max(a, hoy_ - timedelta(days=719))  # como el real: solo las últimas 720 velas
        return {"error": [], "result": {"XXBTZUSD": [[_ts(d), "1", "2", "3", str(40000 + d.toordinal() % 1000), "0", "0", 1] for d in _dias(a, hoy_)], "last": 0}}
    raise AssertionError(url)


server._get_json = falso_get_json
hoy_utc = _dt.now(_tz.utc).date()


def hist(desde=None):
    return cl.get("/api/historico" + (f"?desde={desde}" if desde else ""))


def esperar(desde):
    for _ in range(100):
        r = hist(desde)
        if not r.get_json().get("cargando"):
            return r
        _t.sleep(0.05)
    raise AssertionError("el relleno no terminó")


check(hist("2024-13-01").status_code == 400, "desde mal formado")
check(hist("ayer").status_code == 400, "desde no fecha")
check(hist((hoy_utc + timedelta(days=2)).isoformat()).status_code == 400, "desde futuro")
check(hist((hoy_utc - timedelta(days=4000)).isoformat()).status_code == 400, "más de 10 años")

# Primer relleno lento: la respuesta no espera a la descarga.
desde900 = (hoy_utc - timedelta(days=900)).isoformat()
modo["lento"] = 0.15
t0 = _t.time(); r = hist(desde900); dt_ = _t.time() - t0
j = r.get_json()
check(r.status_code == 200 and j["cargando"] and j["precios"] == [] and dt_ < 0.12, f"no bloquea ({dt_:.3f}s) {j}")
# Peticiones simultáneas mientras descarga: una sola descarga.
res = []
hilos = [_th.Thread(target=lambda: res.append(server.app.test_client().get(f"/api/historico?desde={desde900}").get_json())) for _ in range(4)]
[h.start() for h in hilos]; [h.join() for h in hilos]
check(all(x["cargando"] for x in res), "simultáneas ven la descarga en curso")
r = esperar(desde900); j = r.get_json()
inicios = [c for c in llamadas if c[0] == "cb" and c[1].isoformat() == desde900]
check(len(inicios) == 1, f"una sola descarga ({len(inicios)})")
check(len([c for c in llamadas if c[0] == "cb"]) == 4, f"paginación de 300 en 300: {len(llamadas)} llamadas")
check(len(j["precios"]) == 901 and j["precios"][0][0] == desde900 and j["precios"][-1][0] == hoy_utc.isoformat(), "relleno completo")
check(not j["desactualizado"] and r.headers["Cache-Control"] == "private, max-age=600", "caché http")
modo["lento"] = 0.0
n = len(llamadas)
r = hist(desde900)
check(len(llamadas) == n and not r.get_json()["cargando"], "segunda petición sale de la caché")
check(len(hist((hoy_utc - timedelta(days=30)).isoformat()).get_json()["precios"]) == 31, "subrango sin descargar")

# Actualización diaria perezosa: solo los últimos días.
c2 = server.connect(); server._meta_poner(c2, "hist_dia", (hoy_utc - timedelta(days=1)).isoformat()); c2.commit(); c2.close()
n = len(llamadas)
esperar(desde900)
nuevas = llamadas[n:]
check(len(nuevas) == 1 and nuevas[0][1] == hoy_utc - timedelta(days=3), f"refresco corto {nuevas}")

# Reserva a Kraken cuando Coinbase falla: lo reciente sí se completa.
modo["cb"] = "caido"
c2 = server.connect(); server._meta_poner(c2, "hist_dia", (hoy_utc - timedelta(days=1)).isoformat()); c2.commit(); c2.close()
n = len(llamadas)
r = esperar(desde900); j = r.get_json()
check(any(c[0] == "kr" for c in llamadas[n:]) and not j["desactualizado"], "refresco reciente por Kraken")
# Un hueco antiguo que Kraken no alcanza no se da por cubierto: se sirve lo que hay y se reintenta luego.
desde1000 = (hoy_utc - timedelta(days=1000)).isoformat()
r = esperar(desde1000); j = r.get_json()
c2 = server.connect(); cub = server._meta(c2, "hist_desde"); c2.close()
check(cub == desde900 and j["precios"][0][0] == desde900 and j["desactualizado"], f"hueco antiguo pendiente ({cub})")
c2 = server.connect(); c2.execute("DELETE FROM meta WHERE clave = 'hist_fallo'"); c2.commit(); c2.close()

# Fallo total con caché: sirve lo guardado marcado como desactualizado y espera antes de reintentar.
modo["kr"] = "caido"
c2 = server.connect(); server._meta_poner(c2, "hist_dia", (hoy_utc - timedelta(days=1)).isoformat()); c2.commit(); c2.close()
esperar(desde900)
n = len(llamadas)
r = hist(desde900); j = r.get_json()
check(r.status_code == 200 and j["desactualizado"] and not j["cargando"] and len(j["precios"]) == 901, "sirve caché si fallan")
check(len(llamadas) == n and "max-age" not in r.headers["Cache-Control"], "no reintenta durante la espera")

# Fallo total sin caché: error claro.
c2 = server.connect(); c2.execute("DELETE FROM precios"); c2.execute("DELETE FROM meta"); c2.commit(); c2.close()
r = esperar(desde900)
check(r.status_code == 503 and "error" in r.get_json(), "503 sin datos")
c2 = server.connect(); c2.execute("DELETE FROM meta"); c2.commit(); c2.close()
modo["cb"] = modo["kr"] = "ok"

# --- robustez y seguridad
r = cl.get("/api/nada")
check(r.status_code == 404 and r.is_json and r.get_json()["error"], "404 de la API en JSON")
r = cl.post("/api/precio")
check(r.status_code == 405 and r.is_json, "405 de la API en JSON")
check(cl.post("/api/compras", json={"fecha": "2008-12-31", "monto": 10, "sats": 1000}).status_code == 400, "fecha anterior a bitcoin")
r = cl.get("/")
check(r.headers["Cross-Origin-Opener-Policy"] == "same-origin" and "camera=()" in r.headers["Permissions-Policy"], "cabeceras extra")
# El hilo del histórico ante una excepción: anota el fallo y suelta el candado.
orig = server.huecos_historico
llamadas_huecos = []
def explota(*a):
    llamadas_huecos.append(1)
    if len(llamadas_huecos) > 1:  # la primera es la del request; la segunda, la del hilo
        raise RuntimeError("boom")
    return orig(*a)
server.huecos_historico = explota
c2 = server.connect(); server._meta_poner(c2, "hist_dia", (hoy_utc - timedelta(days=1)).isoformat()); c2.commit(); c2.close()
hist(desde900)
for _ in range(60):
    c2 = server.connect(); bl, fa = server._meta(c2, "hist_bloqueo"), server._meta(c2, "hist_fallo"); c2.close()
    if bl == "0":
        break
    _t.sleep(0.05)
check(bl == "0" and float(fa or 0) > _t.time(), "el hilo suelta el candado y anota el fallo")
server.huecos_historico = orig
c2 = server.connect(); c2.execute("DELETE FROM meta"); c2.commit(); c2.close()

# --- estáticos versionados y caché
V = server.VERSION
r = cl.get("/")
html = r.get_data(as_text=True)
check(r.headers["Cache-Control"] == "no-cache" and f"/app.js?v={V}" in html and f"/styles.css?v={V}" in html and f"/fonts/bricolage.woff2?v={V}" in html, "index con versión y sin caché")
r = cl.get("/app.js")
t = r.get_data(as_text=True)
check(r.mimetype == "text/javascript" and f"./lib.js?v={V}'" in t and f"./montana.js?v={V}'" in t and r.headers["Cache-Control"] == "no-cache", "módulos con imports versionados")
check(f"./lib.js?v={V}'" in cl.get("/grafico.js").get_data(as_text=True), "también en los módulos importados")
check(cl.get(f"/app.js?v={V}").headers["Cache-Control"] == "public, max-age=31536000, immutable", "inmutable con la versión vigente")
check(cl.get("/app.js?v=vieja").headers["Cache-Control"] == "no-cache", "versión vieja: se revalida")
check(f'url("/fonts/fraunces.woff2?v={V}")' in cl.get("/styles.css").get_data(as_text=True), "fuentes versionadas en el CSS")
r = cl.get(f"/fonts/bricolage.woff2?v={V}")
check(r.status_code == 200 and r.mimetype == "font/woff2" and "immutable" in r.headers["Cache-Control"], "fuente inmutable")
check(cl.get("/icon.svg").headers["Cache-Control"] == "no-cache", "resto de estáticos revalida")
check(cl.get("/app.js", headers={"If-None-Match": f'"{V}-app.js"'}).status_code == 304, "304 con ETag")
check(cl.get("/../server.js").status_code == 404 and cl.get("/nada.js").status_code == 404, "solo módulos existentes")

# CLI importar
p = os.path.join(tmp, "c.csv"); open(p, "w").write(txt)
out = subprocess.run([sys.executable, os.path.join(APP, "importar.py"), p], capture_output=True, text=True, env={**os.environ}, cwd=APP)
check(out.returncode == 0 and "importadas: 0" in out.stdout, out.stdout + out.stderr)

# backup
os.environ["BACKUP_DIR"] = os.path.join(tmp, "bk")
import backup; importlib.reload(backup)
check(backup.run() and len(os.listdir(os.environ["BACKUP_DIR"])) == 1, "backup")
print("OK", ok, "comprobaciones")
