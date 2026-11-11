"""Pruebas de la API con el cliente de Flask y una base temporal. Sin red.

Uso (con Flask instalado): python tests/test_api.py
"""
import os; os.environ["LOG_PETICIONES"] = "0"; os.environ["LIMITE_ESCRITURAS"] = "1000000"  # las pruebas escriben a toda prisa; el límite se prueba aparte
import re, sys, sqlite3, tempfile, importlib, json, subprocess, shutil, hashlib
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
import auth
ok = 0
def check(cond, msg):
    global ok
    assert cond, msg
    ok += 1

# Sin cuentas la app no se abre: todo 503 y la entrada lo explica.
anon = server.app.test_client()
check(anon.get("/api/compras").status_code == 503 and anon.get("/api/estado").get_json() == {"abierto": False}, "sin cuentas: cerrado")
check(anon.get("/").status_code == 302 and anon.get("/").headers["Location"].endswith("/login"), "sin cuentas: a /login")
CLAVE_ADMIN = "montaña-de-sats-2026"
_c = server.connect(); auth.crear_usuario(_c, "Daf3r", CLAVE_ADMIN, "admin", "prueba"); _c.close()

def cliente(nombre="Daf3r", clave=CLAVE_ADMIN):
    c = server.app.test_client()
    c.environ_base.update({"wsgi.url_scheme": "https", "HTTP_X_LIBRO": "1"})
    r = c.post("/api/login", json={"usuario": nombre, "clave": clave})
    assert r.status_code == 200, r.data
    return c

cl = cliente()
TOKEN = cl.get_cookie("__Host-sesion").value

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
check(r.status_code == 200 and txt.startswith("fecha,monto_usd,precio_btc_usd,sats,btc,txid,tipo,nota,extra,etiquetas\n"), txt[:80])
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
def _copia():
    c = server.app.test_client(); c.set_cookie("__Host-sesion", TOKEN); return c
clientes = [_copia() for _ in range(4)]
hilos = [_th.Thread(target=lambda c=c: res.append(c.get(f"/api/historico?desde={desde900}").get_json())) for c in clientes]
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
check(r.headers["Cache-Control"] == "no-store" and f"/app.js?v={V}" in html and f"/styles.css?v={V}" in html and f"/fonts/bricolage.woff2?v={V}" in html, "index con versión y sin caché")
r = cl.get("/pintar.js")
t = r.get_data(as_text=True)
check(r.mimetype == "text/javascript" and f"./lib.js?v={V}'" in t and f"./montana.js?v={V}'" in t and r.headers["Cache-Control"] == "no-cache", "módulos con imports versionados")
check(f"./lib.js?v={V}'" in cl.get("/grafico.js").get_data(as_text=True), "también en los módulos importados")
check(cl.get(f"/app.js?v={V}").headers["Cache-Control"] == "public, max-age=31536000, immutable", "inmutable con la versión vigente")
check(cl.get("/app.js?v=vieja").headers["Cache-Control"] == "no-cache", "versión vieja: se revalida")
check(f'url("/fonts/fraunces.woff2?v={V}")' in cl.get("/styles.css").get_data(as_text=True), "fuentes versionadas en el CSS")
r = cl.get(f"/fonts/bricolage.woff2?v={V}")
check(r.status_code == 200 and r.mimetype == "font/woff2" and "immutable" in r.headers["Cache-Control"], "fuente inmutable")
check(cl.get("/icon.svg").headers["Cache-Control"] == "no-cache", "resto de estáticos revalida")
# --- PWA: manifiesto e iconos públicos (el navegador los pide sin cookie), con su tipo y CSP
import re
import json as _json, struct as _struct
anon = server.app.test_client()
r = anon.get("/manifest.webmanifest")
check(r.status_code == 200 and r.mimetype == "application/manifest+json", "manifiesto público con su tipo")
mf = _json.loads(r.get_data(as_text=True))
check(mf["display"] == "standalone" and mf["start_url"] == "/" and mf["scope"] == "/" and mf["name"] == "Libro DCA", "manifiesto: standalone desde /")
check("manifest-src 'self'" in r.headers["Content-Security-Policy"], "CSP permite el manifiesto")
check(all(i["type"] == "image/png" for i in mf["icons"]) and {i["purpose"] for i in mf["icons"]} == {"any", "maskable"}, "manifiesto: iconos any y maskable")
for ic in mf["icons"]:
    r = anon.get(ic["src"])
    ancho, alto = _struct.unpack(">II", r.data[16:24])
    check(r.status_code == 200 and r.mimetype == "image/png" and f"{ancho}x{alto}" == ic["sizes"], f"icono {ic['src']} sirve y mide {ic['sizes']}")
r = anon.get("/apple-touch-icon.png")
check(r.status_code == 200 and _struct.unpack(">II", r.data[16:24]) == (180, 180), "apple-touch-icon 180x180 público")
for pagina in ("/", "/login"):
    h = cl.get(pagina).get_data(as_text=True) if pagina == "/" else anon.get(pagina).get_data(as_text=True)
    check('rel="manifest" href="/manifest.webmanifest"' in h and 'rel="apple-touch-icon"' in h and 'apple-mobile-web-app-capable' in h, f"{pagina} enlaza manifiesto e icono de Apple")
# --- Imágenes de arranque del iPhone (campamento 7): cada <link> apunta a un PNG público con las medidas de su nombre y su media query
for pagina in ("/", "/login"):
    h = cl.get(pagina).get_data(as_text=True) if pagina == "/" else anon.get(pagina).get_data(as_text=True)
    arr = re.findall(r'<link rel="apple-touch-startup-image" href="(/arranque-(\d+)x(\d+)\.png)" media="\(device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\)', h)
    check(len(arr) == 12, f"{pagina}: 12 imágenes de arranque enlazadas")
    for href, w, a, dw, dh, d in arr:
        r = anon.get(href)
        check(r.status_code == 200 and r.mimetype == "image/png" and _struct.unpack(">II", r.data[16:24]) == (int(w), int(a))
              and int(dw) * int(d) == int(w) and int(dh) * int(d) == int(a), f"{href} público, mide lo que dice y coincide con su media query")
r = anon.get("/icon.svg")
check(r.status_code == 200 and "prefers-color-scheme:light" in r.get_data(as_text=True), "icon.svg cambia de colores con el tema del sistema")
# --- Tema claro/oscuro: tema.js público (lo piden también la entrada y el HTML), bloqueante en <head> y sin inline
r = anon.get("/tema.js")
check(r.status_code == 200 and r.mimetype == "text/javascript" and "libro.tema" in r.get_data(as_text=True), "tema.js público")
for pagina in ("/", "/login"):
    h = cl.get(pagina).get_data(as_text=True) if pagina == "/" else anon.get(pagina).get_data(as_text=True)
    check(re.search(r'<script src="/tema\.js\?v=[0-9a-f]+"></script>', h) is not None, f"{pagina} carga tema.js versionado, sin defer ni module")
    check(h.index("/tema.js") < h.index("/styles.css"), f"{pagina}: tema.js va antes del CSS (sin parpadeo)")
check("prefers-color-scheme" not in cl.get("/styles.css").get_data(as_text=True), "el CSS ya no depende de la consulta del sistema")
check(anon.get("/icon-evil.js").status_code == 404 and anon.get("/api/compras").status_code == 401, "lo público no abre nada más")
check(cl.get("/app.js", headers={"If-None-Match": f'"{V}-app.js"'}).status_code == 304, "304 con ETag")
check(cl.get("/../server.js").status_code == 404 and cl.get("/nada.js").status_code == 404, "solo módulos existentes")

# --- Fase A: cuentas, sesiones, roles y auditoría
import time as _tt
def audit(accion=None):
    c = server.connect()
    q = "SELECT * FROM auditoria" + (" WHERE accion = ?" if accion else "")
    rows = c.execute(q, (accion,) if accion else ()).fetchall(); c.close(); return rows
def sql(q, args=()):
    c = server.connect()
    try:
        r = c.execute(q, args); c.commit(); return r.fetchall()
    finally:
        c.close()
def nuevo():
    c = server.app.test_client(); c.environ_base.update({"wsgi.url_scheme": "https", "HTTP_X_LIBRO": "1"}); return c

check(anon.get("/api/estado").get_json() == {"abierto": True}, "estado solo dice abierto")
check(anon.get("/api/compras").status_code == 401 and anon.get("/").status_code == 302, "sin sesión: 401 y redirección")
check(anon.get("/app.js").status_code == 200 and anon.get("/login").status_code == 200, "recursos y login públicos")
check(anon.get("/index.html").status_code == 302, "index.html directo exige sesión")
# Cookie con sus atributos
c1 = nuevo(); r = c1.post("/api/login", json={"usuario": "daf3r", "clave": CLAVE_ADMIN})
sc = r.headers["Set-Cookie"]
check(r.status_code == 200 and r.get_json() == {"usuario": "Daf3r", "rol": "admin", "compartido": False}, "login sin distinguir mayúsculas")
check(sc.startswith("__Host-sesion=") and "Secure" in sc and "HttpOnly" in sc and "SameSite=Lax" in sc and "Path=/" in sc and "Domain" not in sc, sc)
check(c1.get("/api/yo").get_json()["rol"] == "admin", "yo")
r = c1.get("/api/compras"); check(r.headers["Cache-Control"] == "no-store" and "Cookie" in r.headers["Vary"], "no-store y Vary")
# Sin X-Libro la escritura se rechaza
sin = server.app.test_client(); sin.set_cookie("__Host-sesion", TOKEN)
check(sin.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 1000}).status_code == 403, "escritura sin X-Libro")
check(sin.post("/api/login", json={"usuario": "x", "clave": "y"}).status_code == 403, "login sin X-Libro")
check(sin.post("/api/traslados", json={"fecha": today, "sats": 1}).status_code == 403, "traslado sin X-Libro")
check(sin.delete("/api/traslados/1").status_code == 403, "anular un traslado sin X-Libro")
# Rotación: entrar con una cookie vieja la invalida
viejo = c1.get_cookie("__Host-sesion").value
c1.post("/api/login", json={"usuario": "Daf3r", "clave": CLAVE_ADMIN})
v2 = server.app.test_client(); v2.set_cookie("__Host-sesion", viejo)
check(v2.get("/api/compras").status_code == 401 and c1.get("/api/compras").status_code == 200, "rotación de token")
# Caducidad deslizante y tope
th = auth._h(c1.get_cookie("__Host-sesion").value)
ahora = int(_tt.time())
sql("UPDATE sesiones SET ultima = ?, caduca = ? WHERE hash = ?", (ahora - 2 * 86400, ahora + 10, th))
c1.get("/api/yo")
check(sql("SELECT caduca FROM sesiones WHERE hash = ?", (th,))[0][0] > ahora + 80 * 86400, "caducidad deslizante")
sql("UPDATE sesiones SET creada = ? WHERE hash = ?", (ahora - 181 * 86400, th))
check(c1.get("/api/yo").status_code == 401, "tope de 180 días")
c1 = cliente()
th = auth._h(c1.get_cookie("__Host-sesion").value)
sql("UPDATE sesiones SET caduca = ? WHERE hash = ?", (ahora - 1, th))
check(c1.get("/api/yo").status_code == 401, "sesión caducada")
# Lector: lee y exporta; no escribe
c2 = server.connect(); auth.crear_usuario(c2, "Ana", "lectora-de-la-familia", "lector", "prueba"); c2.close()
lec = cliente("Ana", "lectora-de-la-familia")
check(lec.get("/api/compras").status_code == 200 and lec.get("/api/export.csv").status_code == 200, "lector lee y exporta")
cid_l = cl.get("/api/compras").get_json()[0]["id"]
check(all(x.status_code == 403 for x in [lec.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 1000}),
       lec.put(f"/api/compras/{cid_l}", json={"fecha": today, "monto": 1, "sats": 1000}), lec.delete(f"/api/compras/{cid_l}"),
       lec.post("/api/import", data="fecha,monto_usd,sats\n2024-01-01,1,1000\n", content_type="text/csv"),
       lec.get("/api/auditoria")]), "lector no escribe ni ve auditoría")
# Contraseña de la UI: actual incorrecta, demasiado corta, y cambio que cierra las demás sesiones
otra = cliente("Ana", "lectora-de-la-familia")
check(lec.post("/api/clave", json={"actual": "mal-mal-mal-mal", "nueva": "otra-clave-larga-1"}).status_code == 400, "clave actual mala")
check(lec.post("/api/clave", json={"actual": "lectora-de-la-familia", "nueva": "corta"}).status_code == 400, "clave corta")
check(lec.post("/api/clave", json={"actual": "lectora-de-la-familia", "nueva": "otra-clave-larga-1"}).status_code == 200, "cambio de clave")
check(lec.get("/api/yo").status_code == 200 and otra.get("/api/yo").status_code == 401, "cierra las demás sesiones")
# Salir y salir en todos
a1, a2 = cliente(), cliente()
a1.post("/api/logout", json={})
check(a1.get("/api/yo").status_code == 401 and a2.get("/api/yo").status_code == 200, "salir")
a3 = cliente(); a3.post("/api/logout", json={"todas": True})
check(a2.get("/api/yo").status_code == 401 and cl.get("/api/yo").status_code == 401, "salir en todos")
cl = cliente(); TOKEN = cl.get_cookie("__Host-sesion").value
# Fuerza bruta: espera creciente, sin scrypt al estar bloqueado, auditoría acotada
llamadas_scrypt = []
_orig_verificar = auth.verificar
def _contar(*a): llamadas_scrypt.append(1); return _orig_verificar(*a)
auth.verificar = _contar
n_audit = len(audit())
atac = nuevo()
# Reloj congelado durante el ataque: el bloqueo es de 1 s y, en una máquina lenta, expiraría a mitad del bucle (prueba intermitente).
_reloj_real = _tt.time; _t0 = _reloj_real(); _tt.time = lambda: _t0
codigos = [atac.post("/api/login", json={"usuario": "Daf3r", "clave": f"intento-{i}-xxxxx"}).status_code for i in range(40)]
check(codigos[:5] == [401] * 5 and codigos[5] == 429 and set(codigos[5:]) == {429}, codigos)
check(len(llamadas_scrypt) == 5, f"scrypt solo antes del bloqueo ({len(llamadas_scrypt)})")
fallidas = [r for r in audit()[n_audit:] if r["usuario"] == "Daf3r"]
check(len(fallidas) == 2 and {r["accion"] for r in fallidas} == {"login_fallido", "bloqueo"}, [dict(r) for r in fallidas])
check(cl.get("/api/yo").status_code == 200, "una sesión válida no se ve afectada por el bloqueo")
check(atac.post("/api/login", json={"usuario": "Daf3r", "clave": CLAVE_ADMIN}).status_code == 429, "bloqueado incluso con la clave buena")
_tt.time = _reloj_real
# Nombres inexistentes: sin auditoría, misma respuesta; sin IP real no hay bloqueo global
n_audit = len(audit())
r1 = atac.post("/api/login", json={"usuario": "nadie-xyz", "clave": "loquesea-1234"})
check(r1.status_code == 401 and r1.get_json() == {"error": "Usuario o contraseña incorrectos."}, "mismo mensaje")
for i in range(30):
    atac.post("/api/login", json={"usuario": f"azar{i}", "clave": "loquesea-1234"}, headers={"X-Cliente-IP": "203.0.113.7"})
check(len(audit()) == n_audit, "inexistentes no inflan la auditoría")
check(lec.post("/api/logout", json={}).status_code == 200 and cliente("Ana", "otra-clave-larga-1"), "sin IP real nadie queda bloqueado por IP")
# Tiempos parecidos exista o no el usuario
def t(nombre):
    t0 = _tt.perf_counter(); nuevo().post("/api/login", json={"usuario": nombre, "clave": "otra-cosa-123456"}); return _tt.perf_counter() - t0
sql("DELETE FROM intentos")
ta = min(t("Ana") for _ in range(3)); tn = min(t("fantasma") for _ in range(3))
check(0.5 < ta / tn < 2, f"tiempos parecidos ({ta:.3f} / {tn:.3f})")
sql("DELETE FROM intentos")
auth.verificar = _orig_verificar
# Con IP real (Caddy configurado): bloqueo por IP tras 20 fallos, auditado una vez
server.CONFIAR_IP = True
n_audit = len(audit())
for i in range(21):
    nuevo().post("/api/login", json={"usuario": f"azar{i}", "clave": "loquesea-1234"}, headers={"X-Cliente-IP": "198.51.100.9"})
check(nuevo().post("/api/login", json={"usuario": "Daf3r", "clave": CLAVE_ADMIN}, headers={"X-Cliente-IP": "198.51.100.9"}).status_code == 429, "bloqueo por IP")
check(nuevo().post("/api/login", json={"usuario": "Daf3r", "clave": CLAVE_ADMIN}, headers={"X-Cliente-IP": "198.51.100.10"}).status_code == 200, "otra IP entra")
check([r["accion"] for r in audit()[n_audit:] if r["entidad"] == "ip"] == ["login_fallido", "bloqueo"], "auditoría de IP acotada")
server.CONFIAR_IP = False
sql("DELETE FROM intentos")
# Semáforo: con dos verificaciones en curso, 503 sin esperar
server._scrypt_sem.acquire(); server._scrypt_sem.acquire()
check(nuevo().post("/api/login", json={"usuario": "Daf3r", "clave": CLAVE_ADMIN}).status_code == 503, "semáforo lleno: 503")
server._scrypt_sem.release(); server._scrypt_sem.release()
# Auditoría inmutable
for q in ("UPDATE auditoria SET usuario = 'x'", "DELETE FROM auditoria"):
    try:
        sql(q); check(False, q)
    except sqlite3.DatabaseError:
        check(True, q)
# Anular: la fila queda, la lista y el export la excluyen, el importador permite volver a meterla
r = cl.post("/api/compras", json={"fecha": "2024-07-07", "monto": 77, "sats": 99999})
assert r.status_code == 201, (r.status_code, r.data)
cid_a = r.get_json()["id"]
check(cl.delete(f"/api/compras/{cid_a}").status_code == 204, "anular")
check(sql("SELECT anulada_por FROM compras WHERE id = ?", (cid_a,))[0][0] == "Daf3r", "fila anulada se conserva")
check(all(c["id"] != cid_a for c in cl.get("/api/compras").get_json()) and "99999" not in cl.get("/api/export.csv").get_data(as_text=True), "excluida")
check(cl.put(f"/api/compras/{cid_a}", json={"fecha": "2024-07-07", "monto": 77, "sats": 99999}).status_code == 404, "no se edita anulada")
r = cl.post("/api/import", data="fecha,monto_usd,sats\n2024-07-07,77,99999\n", content_type="text/csv")
check(r.get_json()["nuevas"] == 1, "importar una anulada la vuelve a crear")
acc = [r["accion"] for r in audit() if r["entidad"] == "compra"]
check({"alta", "edicion", "anulacion", "importacion"} <= set(acc), acc)
h = cl.get("/api/auditoria").get_json()
check(len(h) <= 100 and h[0]["id"] > h[-1]["id"] and cl.get(f"/api/auditoria?antes={h[-1]['id']}").status_code == 200, "historial admin paginado")
# --- Fase B: TXID opcional y enlace a mempool.space
adm = cliente()
TX1 = "a" * 63 + "1"
TX2 = "0123456789abcdef" * 4
r = adm.post("/api/compras", json={"fecha": "2024-08-01", "monto": 30, "sats": 50000, "txid": TX2.upper()})
check(r.status_code == 201 and r.get_json()["txid"] == TX2 and "txid_repetido" not in r.get_json(), f"TXID válido, en minúsculas {r.data}")
tid = r.get_json()["id"]
check(next(c for c in adm.get("/api/compras").get_json() if c["id"] == tid)["txid"] == TX2, "el listado devuelve el TXID")
# Sin TXID: nulo, y las compras viejas siguen igual
r = adm.post("/api/compras", json={"fecha": "2024-08-02", "monto": 30, "sats": 50000})
check(r.status_code == 201 and r.get_json()["txid"] is None, "sin TXID es nulo")
sin_tx = r.get_json()["id"]
# Inválidos: corto, no hexadecimal, tipo raro, demasiado largo
for malo in ("abc", "g" * 64, "a" * 65, 12345, "a" * 500, {"x": 1}, True):
    r = adm.post("/api/compras", json={"fecha": "2024-08-03", "monto": 30, "sats": 50000, "txid": malo})
    check(r.status_code == 400 and "TXID" in r.get_json()["error"], f"TXID inválido {malo!r}: {r.status_code}")
# Pegar un enlace de un explorador: se saca el TXID
r = adm.post("/api/compras", json={"fecha": "2024-08-04", "monto": 30, "sats": 50000, "txid": f"https://mempool.space/es/tx/{TX1}?mode=details"})
check(r.status_code == 201 and r.get_json()["txid"] == TX1, f"TXID desde un enlace {r.data}")
check(adm.post("/api/compras", json={"fecha": "2024-08-04", "monto": 30, "sats": 50000, "txid": "https://mempool.space/tx/" + "b" * 62}).status_code == 400, "enlace sin TXID completo")
# Repetido: se guarda pero se avisa con el id de la otra compra
r = adm.post("/api/compras", json={"fecha": "2024-08-05", "monto": 30, "sats": 50000, "txid": TX1})
check(r.status_code == 201 and len(r.get_json()["txid_repetido"]) == 1, f"TXID repetido avisa {r.data}")
repetida = r.get_json()["id"]
# Editar: poner, cambiar, no tocarlo (cliente viejo sin el campo) y quitarlo
r = adm.put(f"/api/compras/{sin_tx}", json={"fecha": "2024-08-02", "monto": 30, "sats": 50000, "txid": TX2})
check(r.status_code == 200 and r.get_json()["txid"] == TX2 and r.get_json()["txid_repetido"] == [tid], f"editar pone el TXID {r.data}")
r = adm.put(f"/api/compras/{sin_tx}", json={"fecha": "2024-08-02", "monto": 31, "sats": 50000})
check(r.status_code == 200 and r.get_json()["txid"] == TX2, "sin el campo, el TXID se conserva")
r = adm.put(f"/api/compras/{sin_tx}", json={"fecha": "2024-08-02", "monto": 31, "sats": 50000, "txid": ""})
check(r.status_code == 200 and r.get_json()["txid"] is None, "TXID vacío lo quita")
# La auditoría guarda el TXID antes y después
ed = [x for x in audit("edicion") if x["entidad_id"] == sin_tx]
check(any(TX2 in (x["despues"] or "") for x in ed) and any(TX2 in (x["antes"] or "") for x in ed), "auditoría registra el TXID")
# La base rechaza un TXID corrupto aunque alguien se salte la validación
try:
    sql("UPDATE compras SET txid = 'corto' WHERE id = ?", (tid,)); check(False, "CHECK de txid")
except sqlite3.IntegrityError:
    check(True, "CHECK de txid")
# Export con TXID e importación ida y vuelta
txt = adm.get("/api/export.csv").get_data(as_text=True)
check(",txid," in txt.splitlines()[0] and TX2 in txt and TX1 in txt, "export incluye txid")
sql("UPDATE compras SET anulada_ts = 1 WHERE txid IS NOT NULL")
r = adm.post("/api/import", data=txt, content_type="text/csv"); j = r.get_json()
check(r.status_code == 200 and j["nuevas"] >= 2, f"reimportar con txid {j}")
check(any(c["txid"] == TX2 for c in adm.get("/api/compras").get_json()), "el TXID sobrevive al CSV")
r = adm.post("/api/import", data="fecha,monto_usd,sats,txid\n2024-09-01,10,1000,malo\n2024-09-02,10,1000,\n", content_type="text/csv"); j = r.get_json()
check(j["nuevas"] == 1 and len(j["omitidas"]) == 1 and "TXID" in j["omitidas"][0], f"CSV con TXID malo omite la fila {j}")

# --- Fase C: ventas y gastos (restan sats; el saldo nunca queda negativo)
bal = sum(c["sats"] for c in adm.get("/api/compras").get_json() if c["tipo"] == "compra") - sum(c["sats"] for c in adm.get("/api/compras").get_json() if c["tipo"] == "venta")
check(all(c["tipo"] == "compra" and c["nota"] is None for c in adm.get("/api/compras").get_json()), "las compras viejas son compras sin nota")
r = adm.post("/api/compras", json={"fecha": today, "monto": 7.5, "sats": 10000, "tipo": "venta", "nota": "  gasté   en renta  "})
check(r.status_code == 201 and r.get_json()["tipo"] == "venta" and r.get_json()["nota"] == "gasté en renta", f"venta con nota {r.data}")
vid = r.get_json()["id"]
r = adm.post("/api/compras", json={"fecha": today, "monto": 9, "sats": bal, "tipo": "venta"})
check(r.status_code == 400 and "saldo" in r.get_json()["error"], f"venta sin saldo suficiente {r.data}")
for malo in ({"tipo": "regalo"}, {"nota": "x" * 121}, {"nota": 5}):
    r = adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 100, **malo})
    check(r.status_code == 400, f"campo inválido {malo}: {r.status_code}")
r = adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 100, "tipo": "venta", "nota": "a\x00b\x07c"})
check(r.status_code == 201 and r.get_json()["nota"] == "abc", "caracteres de control fuera de la nota")
adm.delete(f"/api/compras/{r.get_json()['id']}")
check(any(c["id"] == vid and c["tipo"] == "venta" for c in adm.get("/api/compras").get_json()), "la lista devuelve la venta")
txt = adm.get("/api/export.csv").get_data(as_text=True)
check("venta,gasté en renta" in txt, "export con tipo y nota")
# Orden: compra primero, venta después, aunque la venta se anote antes de la compra el mismo día no cuenta como error
A = adm.post("/api/compras", json={"fecha": "2019-01-01", "monto": 5, "sats": 5000}).get_json()["id"]
V = adm.post("/api/compras", json={"fecha": "2019-01-02", "monto": 4, "sats": 4000, "tipo": "venta"}).get_json()["id"]
r = adm.put(f"/api/compras/{A}", json={"fecha": "2019-01-01", "monto": 3, "sats": 3000})
check(r.status_code == 400, f"editar una compra que deja una venta sin sats {r.data}")
r = adm.delete(f"/api/compras/{A}")
check(r.status_code == 409 and "ventas posteriores" in r.get_json()["error"], f"anular compra con venta posterior {r.data}")
r = adm.put(f"/api/compras/{V}", json={"fecha": "2019-01-02", "monto": 6, "sats": 6000})
check(r.status_code == 400, "editar la venta para que pase del saldo")
r = adm.put(f"/api/compras/{V}", json={"fecha": "2019-01-02", "monto": 5, "sats": 5000, "nota": "todo"})
check(r.status_code == 200 and r.get_json()["tipo"] == "venta" and r.get_json()["nota"] == "todo", f"vender exactamente todo el saldo de ese día {r.data}")
r = adm.put(f"/api/compras/{V}", json={"fecha": "2018-12-31", "monto": 5, "sats": 5000})
check(r.status_code == 400, "una venta no puede quedar antes de la compra")
r = adm.put(f"/api/compras/{V}", json={"fecha": "2019-01-02", "monto": 5, "sats": 5000})
check(r.get_json()["nota"] == "todo", "sin el campo, la nota se conserva")
check(adm.delete(f"/api/compras/{V}").status_code == 204 and adm.delete(f"/api/compras/{A}").status_code == 204, "anular la venta y luego la compra")
# Mismo día: las compras van antes que las ventas
C1 = adm.post("/api/compras", json={"fecha": "2019-02-01", "monto": 7, "sats": 700}).get_json()["id"]
r = adm.post("/api/compras", json={"fecha": "2019-02-01", "monto": 7, "sats": 700, "tipo": "venta"})
check(r.status_code == 201, "vender el mismo día de la compra")
adm.delete(f"/api/compras/{r.get_json()['id']}"); adm.delete(f"/api/compras/{C1}")
# Importar: una venta sin saldo rechaza todo el archivo; con saldo se importa, y sin columna tipo todo son compras
antes_n = len(adm.get("/api/compras").get_json())
r = adm.post("/api/import", data="fecha,monto_usd,sats,tipo,nota\n2019-03-01,1,100,compra,\n2019-03-02,5,999999,venta,mucho\n", content_type="text/csv")
check(r.status_code == 400 and "saldo" in r.get_json()["error"] and len(adm.get("/api/compras").get_json()) == antes_n, f"importación con venta sin saldo no importa nada {r.data}")
r = adm.post("/api/import", data="fecha,monto_usd,sats,tipo,nota\n2019-03-02,1,50,venta,\n2019-03-01,1,100,compra,\n", content_type="text/csv")
check(r.status_code == 200 and r.get_json()["nuevas"] == 2, f"importar venta y compra desordenadas {r.data}")
check(adm.post("/api/import", data="fecha,monto_usd,sats,tipo\n2019-03-02,1,50,venta\n", content_type="text/csv").get_json()["repetidas"] == 1, "una venta repetida se detecta")
check(adm.post("/api/import", data="fecha,monto_usd,sats,tipo\n2019-03-04,1,50,regalo\n", content_type="text/csv").get_json()["omitidas"], "tipo inválido omite la fila")
try:
    sql("UPDATE compras SET tipo = 'otro' WHERE id = ?", (vid,)); check(False, "CHECK de tipo")
except sqlite3.IntegrityError:
    check(True, "CHECK de tipo")
check(any(x["accion"] == "alta" and '"venta"' in (x["despues"] or "") for x in audit()), "la auditoría guarda el tipo de la venta")

# --- Novedades: cuándo vio cada persona el resumen (un lector también puede marcarlo)
_c = server.connect(); auth.crear_usuario(_c, "Luz", "clave-de-luz-2026", "lector", "prueba"); _c.close()
luz = cliente("Luz", "clave-de-luz-2026")
check(luz.get("/api/yo").get_json() == {"usuario": "Luz", "rol": "lector", "visto": None, "cambios": None, "mantenimiento": False}, "sin visita ni cambios vistos al principio")
check("visto_ts" in [r[1] for r in sql("PRAGMA table_info(usuarios)")], "columna visto_ts")
r = luz.post("/api/visto"); v1 = r.get_json()["visto"]
check(r.status_code == 200 and isinstance(v1, int) and abs(v1 - _tt.time() * 1000) < 5000, f"un lector puede marcar que vio las novedades {r.data}")
check(luz.get("/api/yo").get_json()["visto"] == v1, "yo devuelve la última visita")
check(adm.get("/api/yo").get_json()["visto"] is None, "la visita es por persona")
check(luz.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 100}).status_code == 403, "pero un lector sigue sin poder escribir")
check(anon.post("/api/visto", headers={"X-Libro": "1"}).status_code == 401, "sin sesión no se marca")
check(not [x for x in audit() if x["accion"] == "visto"], "no se audita cada visita")
nolibro = server.app.test_client(); nolibro.set_cookie("__Host-sesion", luz.get_cookie("__Host-sesion").value)
check(nolibro.post("/api/visto").status_code == 403, "sin X-Libro se rechaza")

# --- «Qué hay de nuevo»: el último aviso de cambios que vio cada persona (un lector también puede marcarlo)
check("cambios_visto" in [r[1] for r in sql("PRAGMA table_info(usuarios)")], "columna cambios_visto")
r = luz.post("/api/cambios-visto", json={"id": "2026-11-b"})
check(r.status_code == 200 and r.get_json() == {"cambios": "2026-11-b"}, f"un lector marca los cambios vistos {r.data}")
check(luz.get("/api/yo").get_json()["cambios"] == "2026-11-b", "yo devuelve el último aviso de cambios visto")
check(adm.get("/api/yo").get_json()["cambios"] is None, "los cambios vistos son por persona")
for malo in ({}, {"id": ""}, {"id": 5}, {"id": "a b"}, {"id": "x" * 41}, {"id": "Mayus"}, {"id": "<b>"}):
    check(luz.post("/api/cambios-visto", json=malo).status_code == 400, f"id de cambios no válido {malo}")
check(luz.get("/api/yo").get_json()["cambios"] == "2026-11-b", "un id inválido no cambia lo guardado")
check(anon.post("/api/cambios-visto", json={"id": "x"}, headers={"X-Libro": "1"}).status_code == 401, "sin sesión no se marcan cambios")
check(nolibro.post("/api/cambios-visto", json={"id": "x"}).status_code == 403, "sin X-Libro se rechaza")
check(not [x for x in audit() if "cambios" in x["accion"]], "no se audita")
# Migración: una base anterior (sin la columna) deja a las cuentas que ya existen en '0' (verán el primer aviso)
sql("ALTER TABLE usuarios DROP COLUMN cambios_visto")
sql("DELETE FROM esquema WHERE version = 5")  # la base «vuelve» a una versión anterior
server.init_db()
check({r[0] for r in sql("SELECT cambios_visto FROM usuarios")} == {"0"}, "la migración deja las cuentas existentes en '0'")
check(luz.get("/api/yo").get_json()["cambios"] == "0", "yo lo refleja tras migrar")
server.init_db()
check({r[0] for r in sql("SELECT cambios_visto FROM usuarios")} == {"0"}, "la migración no se repite")

# --- Migraciones versionadas (idea 94): una base de cualquier edad llega al mismo estado y no se repite nada
check(server.version_esquema(server.connect()) == server.VERSION_ESQUEMA, "la base de las pruebas está en la última versión")
check([r[0] for r in sql("SELECT version FROM esquema ORDER BY version")] == [n for n, _x, _f in server.MIGRACIONES_ESQUEMA], "una fila por migración")
check([n for n, _x, _f in server.MIGRACIONES_ESQUEMA] == list(range(1, server.VERSION_ESQUEMA + 1)), "los números de migración son 1, 2, 3… sin huecos")
_conn = server.connect()
try:
    check(server.migrar(_conn) == [], "volver a migrar no aplica nada")
finally:
    _conn.close()
def _base_vieja(nombre, sql_inicial):
    """Una base temporal «de antes», migrada con el código de hoy; devuelve su conexión."""
    ruta = os.path.join(tmp, nombre)
    c0 = sqlite3.connect(ruta); c0.executescript(sql_inicial); c0.commit(); c0.close()
    anterior = server.DB_PATH
    server.DB_PATH = ruta
    try:
        server.init_db()
        return server.connect()
    finally:
        server.DB_PATH = anterior
# (a) la más vieja: solo compras sin sats, sin tabla de usuarios, sin esquema
v0 = _base_vieja("v0.db", """CREATE TABLE compras (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, monto REAL NOT NULL CHECK (monto>0), precio REAL NOT NULL CHECK (precio>0), creado INTEGER NOT NULL);
INSERT INTO compras (fecha,monto,precio,creado) VALUES ('2024-01-05',50,42000,1);""")
check(server.version_esquema(v0) == server.VERSION_ESQUEMA, "una base de la época sin sats migra hasta la última versión")
check(v0.execute("SELECT sats, tipo, extra FROM compras").fetchone()[:] == (119048, "compra", 0), "la compra vieja conserva sus datos y recibe sats, tipo y extra")
check({"anulada_ts", "txid", "nota"} <= server._columnas(v0, "compras"), "las columnas nuevas de compras están")
v0.close()
# (b) con todas las columnas pero sin la tabla `esquema` (la base de producción de antes de las migraciones versionadas)
v1 = _base_vieja("v1.db", server.SCHEMA + auth.SCHEMA + server.push.SCHEMA)
check(server.version_esquema(v1) == server.VERSION_ESQUEMA, "una base completa sin tabla esquema solo anota las versiones")
v1.close()
# (c) a medias: aplicada hasta la 3; se completan solo las que faltan y los datos de usuarios se respetan
ruta_c = os.path.join(tmp, "v3.db")
shutil.copy(dbp, ruta_c)
cc = sqlite3.connect(ruta_c); cc.execute("DELETE FROM esquema WHERE version > 3"); cc.execute("ALTER TABLE usuarios DROP COLUMN cambios_visto"); cc.commit(); cc.close()
_ant = server.DB_PATH; server.DB_PATH = ruta_c
try:
    _cx = server.connect()
    check(server.migrar(_cx) == list(range(4, server.VERSION_ESQUEMA + 1)), "una base en la versión 3 aplica solo de la 4 en adelante")
    check({r[0] for r in _cx.execute("SELECT cambios_visto FROM usuarios")} == {"0"}, "y la migración 5 deja las cuentas existentes en '0'")
    _cx.close()
finally:
    server.DB_PATH = _ant
# (d) una base más nueva que el código: no falla
_cn = server.connect()
try:
    _cn.execute("INSERT INTO esquema (version, nombre, aplicada) VALUES (?, 'del futuro', 0)", (server.VERSION_ESQUEMA + 5,)); _cn.commit()
    check(server.migrar(_cn) == [], "una base más nueva que el código no aplica nada ni falla")
    _cn.execute("DELETE FROM esquema WHERE nombre = 'del futuro'"); _cn.commit()
finally:
    _cn.close()

# --- Guía de estilo (solo admin) y paridad del sprite de iconos con index.html
import re as _re
r = adm.get("/guia")
check(r.status_code == 200 and "Guía de estilo" in r.get_data(as_text=True), f"el admin abre la guía de estilo {r.status_code}")
check(all(f"?v={server.VERSION}" in r.get_data(as_text=True) for _ in [0]) and r.headers["Cache-Control"] == "no-store", "la guía va versionada y sin caché")
check(luz.get("/guia").status_code == 404, "un lector no ve la guía de estilo")
check(anon.get("/guia", follow_redirects=False).status_code == 302, "sin sesión la guía lleva a la entrada")
def _simbolos(nombre):
    with open(os.path.join(server.ESTATICOS, nombre), encoding="utf-8") as f:
        return _re.findall(r'<symbol id="(i-[\w-]+)"[^>]*>(.*?)</symbol>', f.read(), _re.S)
check(_simbolos("guia.html") == _simbolos("index.html") and len(_simbolos("index.html")) >= 8, "el sprite de la guía es idéntico al de index.html")
check(not _re.search(r'/guia', open(os.path.join(server.ESTATICOS, "index.html"), encoding="utf-8").read()), "la guía no está enlazada desde la app")

# --- Verificación de TXID contra mempool.space (con la red simulada)
import urllib.error as _ue
TXV, TXP, TXN, TXE = "1" * 64, "2" * 64, "3" * 64, "4" * 64
for tx_, d_ in ((TXV, "2024-10-01"), (TXP, "2024-10-02"), (TXN, "2024-10-03")):
    assert adm.post("/api/compras", json={"fecha": d_, "monto": 5, "sats": 5000, "txid": tx_}).status_code == 201
llamadas_tx = []
estado_red = {"caida": False}
def falso_mempool(url, timeout=8):
    llamadas_tx.append(url)
    if estado_red["caida"]:
        raise _ue.URLError("sin red")
    if url.endswith("/blocks/tip/height"):
        return 850010
    if url.endswith(TXV):
        return {"fee": 1234, "status": {"confirmed": True, "block_height": 850000, "block_time": 1700000000}}
    if url.endswith(TXP):
        return {"fee": 500, "status": {"confirmed": False}}
    if url.endswith(TXN):
        raise _ue.HTTPError(url, 404, "no", {}, None)
    raise AssertionError(url)
_get_real = server._get_json; server._get_json = falso_mempool
check(adm.get("/api/tx/abc").status_code == 400, "TXID inválido")
check(adm.get(f"/api/tx/{TXE}").status_code == 404 and not llamadas_tx, "un TXID que no está en ninguna compra no se consulta (no es un proxy abierto)")
check(anon.get(f"/api/tx/{TXV}").status_code == 401, "sin sesión no se consulta")
r = adm.get(f"/api/tx/{TXV}"); j = r.get_json()
check(r.status_code == 200 and j["estado"] == "confirmada" and j["confirmaciones"] == 11 and j["comision"] == 1234 and j["bloque"] == 850000, f"confirmada {j}")
check(all(u.startswith("https://mempool.space/api/") for u in llamadas_tx), "solo habla con mempool.space")
n_antes = len(llamadas_tx)
check(adm.get(f"/api/tx/{TXV}").get_json()["estado"] == "confirmada" and len(llamadas_tx) == n_antes, "una confirmada se guarda y no se vuelve a consultar")
check(luz.get(f"/api/tx/{TXV}").status_code == 200, "un lector también puede verificar")
j = adm.get(f"/api/tx/{TXP}").get_json()
check(j["estado"] == "pendiente" and j["confirmaciones"] is None and j["comision"] == 500, f"pendiente {j}")
n_antes = len(llamadas_tx)
adm.get(f"/api/tx/{TXP}")
check(len(llamadas_tx) == n_antes, "una pendiente no se consulta otra vez antes de un minuto")
j = adm.get(f"/api/tx/{TXN}").get_json()
check(j["estado"] == "no_encontrada" and j["comision"] is None, f"no encontrada {j}")
# Una pendiente pasa a confirmada pasado un minuto
_real_t = _tt.time; _tt.time = lambda: _real_t() + 61
falso_viejo = falso_mempool
def falso_ya_confirmada(url, timeout=8):
    if url.endswith(TXP):
        llamadas_tx.append(url); return {"fee": 500, "status": {"confirmed": True, "block_height": 850005, "block_time": 1700000600}}
    return falso_viejo(url, timeout)
server._get_json = falso_ya_confirmada
j = adm.get(f"/api/tx/{TXP}").get_json()
check(j["estado"] == "confirmada" and j["confirmaciones"] == 6, f"la pendiente se confirma {j}")
# Red caída: sin caché, 503; con caché vieja, se sirve marcada como desactualizada
estado_red["caida"] = True
_tt.time = lambda: _real_t() + 200
j = adm.get(f"/api/tx/{TXN}").get_json()
check(j["estado"] == "no_encontrada" and j.get("desactualizado") is True, f"red caída con caché: {j}")
sql("DELETE FROM tx_cache WHERE txid = ?", (TXN,))
r = adm.get(f"/api/tx/{TXN}")
check(r.status_code == 503 and "mempool.space" in r.get_json()["error"], f"red caída sin caché {r.data}")
_tt.time = _real_t; server._get_json = _get_real
try:
    sql("INSERT INTO tx_cache (txid, estado, ts) VALUES (?, 'rara', 1)", ("5" * 64,)); check(False, "CHECK de estado")
except sqlite3.IntegrityError:
    check(True, "CHECK de estado")

# CLI: generar, mínimo de 12 y desbloquear
import usuarios, getpass as _gp
g = auth.generar_clave()
check(len(g) == 19 and g.count("-") == 3 and not set(g) & set("0O1lI"), g)
_resp = iter(["corta", "una-clave-buena-1", "una-clave-buena-1"])
_gp.getpass = lambda prompt="": next(_resp)
check(usuarios.main(["crear", "Beto", "--rol", "lector"]) == 0 and auth.buscar(server.connect(), "Beto")["rol"] == "lector", "CLI crear")
for i in range(6): nuevo().post("/api/login", json={"usuario": "Beto", "clave": f"mala-{i}-xxxxxxx"})
# El 5.º fallo bloquea solo 1 s: se alarga para no depender del borde del segundo (prueba determinista).
_c = server.connect(); _c.execute("UPDATE intentos SET bloqueado_hasta = ? WHERE clave = 'u:beto'", (int(_t.time()) + 60,)); _c.commit(); _c.close()
check(nuevo().post("/api/login", json={"usuario": "Beto", "clave": "una-clave-buena-1"}).status_code == 429, "Beto bloqueado")
check(usuarios.main(["desbloquear", "Beto"]) == 0 and cliente("Beto", "una-clave-buena-1"), "CLI desbloquear")
bet = cliente("Beto", "una-clave-buena-1")
check(usuarios.main(["desactivar", "Beto"]) == 0 and bet.get("/api/yo").status_code == 401, "CLI desactivar cierra sesiones")
check({r["accion"] for r in audit() if r["usuario"] == "cli"} >= {"cuenta_creada", "desbloqueo", "cuenta_desactivada"}, "CLI auditada")
# Los respaldos solo guardan hashes de token: una cookie no se puede reconstruir
check(all(len(x[0]) == 64 for x in sql("SELECT hash FROM sesiones")) and TOKEN not in str(sql("SELECT * FROM sesiones")), "solo hashes de token")

# CLI importar
p = os.path.join(tmp, "c.csv"); open(p, "w").write(txt)
out = subprocess.run([sys.executable, os.path.join(APP, "importar.py"), p], capture_output=True, text=True, env={**os.environ}, cwd=APP)
check(out.returncode == 0 and "importadas: 0" in out.stdout, out.stdout + out.stderr)

# --- Compra extra (por una caída): marca opcional, solo compras, con su nota, en CSV y en la auditoría
check("extra" in {r[1] for r in sqlite3.connect(dbp).execute("PRAGMA table_info(compras)")}, "la migración añade la columna extra a bases anteriores")
r = adm.post("/api/compras", json={"fecha": "2018-05-01", "monto": 25, "sats": 40000})
check(r.status_code == 201 and r.get_json()["extra"] is False, "por defecto una compra no es extra")
EX0 = r.get_json()["id"]
r = adm.post("/api/compras", json={"fecha": "2018-05-02", "monto": 250, "sats": 400000, "extra": True, "nota": "cayó 20 %"})
check(r.status_code == 201 and r.get_json()["extra"] is True and r.get_json()["nota"] == "cayó 20 %", f"compra extra con su nota {r.data}")
EX1 = r.get_json()["id"]
check({c["id"]: c["extra"] for c in adm.get("/api/compras").get_json()}[EX1] is True, "el listado devuelve extra")
check(adm.post("/api/compras", json={"fecha": "2018-05-03", "monto": 5, "sats": 8000, "extra": "tal vez"}).status_code == 400, "extra inválido da 400")
r = adm.post("/api/compras", json={"fecha": "2018-05-03", "monto": 5, "sats": 100, "tipo": "venta", "extra": True})
check(r.status_code == 400 and "compra puede ser extra" in r.get_json()["error"], f"una venta no puede ser extra {r.data}")
r = adm.put(f"/api/compras/{EX0}", json={"fecha": "2018-05-01", "monto": 25, "sats": 40000, "extra": True})
check(r.status_code == 200 and r.get_json()["extra"] is True, "se puede marcar una compra como extra al editar")
r = adm.put(f"/api/compras/{EX0}", json={"fecha": "2018-05-01", "monto": 25, "sats": 40000})
check(r.get_json()["extra"] is True, "un PUT que no manda extra conserva la marca")
r = adm.put(f"/api/compras/{EX0}", json={"fecha": "2018-05-01", "monto": 25, "sats": 40000, "extra": False})
check(r.get_json()["extra"] is False, "extra: false la quita")
# Auditoría: queda en la alta y en la edición
au = adm.get("/api/auditoria").get_json()
alta = next(a for a in au if a["accion"] == "alta" and a["entidad_id"] == EX1)
check(alta["despues"]["extra"] is True, "la auditoría guarda la marca de extra")
ed = next(a for a in au if a["accion"] == "edicion" and a["entidad_id"] == EX0)
check(ed["antes"]["extra"] is True and ed["despues"]["extra"] is False, "la edición audita el cambio de extra")
# CSV: la columna extra sale y vuelve a entrar; un CSV sin esa columna sigue entrando
txt = adm.get("/api/export.csv").get_data(as_text=True)
check(any(l.startswith("2018-05-02,") and l.endswith(",1,") for l in txt.splitlines()), "el export marca la compra extra con 1")
check(any(l.startswith("2018-05-01,") and l.endswith(",") for l in txt.splitlines()), "el export deja vacío extra en las normales")
r = adm.post("/api/import", data="fecha,monto_usd,sats,tipo,nota,extra\n2018-06-01,100,160000,compra,por caída,1\n2018-06-02,25,40000,compra,,\n", content_type="text/csv")
check(r.get_json()["nuevas"] == 2, f"importar con columna extra {r.data}")
imp = {c["fecha"]: c for c in adm.get("/api/compras").get_json()}
check(imp["2018-06-01"]["extra"] is True and imp["2018-06-02"]["extra"] is False, "la importación respeta extra")
check(adm.post("/api/import", data="fecha,monto_usd,sats\n2018-06-03,25,40000\n", content_type="text/csv").get_json()["nuevas"] == 1, "un CSV sin la columna extra sigue entrando")
r = adm.post("/api/import", data="fecha,monto_usd,sats,tipo,extra\n2018-06-04,1,10,venta,1\n", content_type="text/csv")
check(r.get_json()["omitidas"], "una venta marcada extra en el CSV se omite")
lec_ex = cliente("Ana", "otra-clave-larga-1").get("/api/compras").get_json()
check(isinstance(lec_ex, list) and all("extra" in c for c in lec_ex) and any(c["extra"] for c in lec_ex), "el lector también ve la marca extra")
for i in (EX0, EX1):
    adm.delete(f"/api/compras/{i}")

# --- Traslados: dónde están los sats (exchange o wallet); no cambian el saldo total
check("traslados" in {r[0] for r in sqlite3.connect(dbp).execute("SELECT name FROM sqlite_master WHERE type='table'")}, "la tabla traslados se crea sola en bases anteriores")
check(adm.get("/api/traslados").get_json() == [], "sin traslados al principio")
TB = adm.post("/api/compras", json={"fecha": "2017-01-01", "monto": 100, "sats": 5000000}).get_json()["id"]
TXT = "5" * 64
compras_antes = adm.get("/api/compras").get_json()
r = adm.post("/api/traslados", json={"fecha": "2017-02-01", "sats": 3000000, "txid": TXT, "nota": "a mi wallet"})
check(r.status_code == 201 and r.get_json()["sentido"] == "a_wallet" and r.get_json()["txid"] == TXT, f"traslado a la wallet {r.data}")
T1 = r.get_json()["id"]
check([x["id"] for x in adm.get("/api/traslados").get_json()] == [T1], "el listado devuelve el traslado")
lec_t = cliente("Ana", "otra-clave-larga-1")
check([x["id"] for x in lec_t.get("/api/traslados").get_json()] == [T1], "el lector ve los traslados")
check(lec_t.post("/api/traslados", json={"fecha": "2017-02-02", "sats": 1}).status_code == 403, "el lector no puede anotar un traslado")
check(lec_t.delete(f"/api/traslados/{T1}").status_code == 403, "el lector no puede anular un traslado")
# El saldo total no cambia con un traslado
check(adm.get("/api/compras").get_json() == compras_antes, "anotar un traslado no cambia ninguna compra, ni el saldo total")
# Validaciones
for cuerpo, motivo in [({"fecha": "2017-02-02", "sats": 0}, "sats cero"), ({"fecha": "2017-02-02", "sats": 1.5}, "sats con decimales"),
                       ({"fecha": "2017-02-02", "sats": "5"}, "sats como texto"), ({"fecha": "2017-02-02", "sats": 10, "sentido": "otro"}, "sentido inválido"),
                       ({"fecha": "2099-01-01", "sats": 10}, "fecha futura"), ({"fecha": "ayer", "sats": 10}, "fecha mala"),
                       ({"fecha": "2005-01-01", "sats": 10}, "fecha anterior a bitcoin"), ({"fecha": "2017-02-02", "sats": 10, "txid": "xyz"}, "TXID inválido")]:
    check(adm.post("/api/traslados", json=cuerpo).status_code == 400, f"traslado inválido: {motivo}")
check(adm.post("/api/traslados", data="no es json", content_type="text/plain").status_code == 400, "cuerpo que no es JSON da 400")
# La wallet no puede tener más de lo que posees ni quedar en negativo
r = adm.post("/api/traslados", json={"fecha": "2017-02-01", "sats": 3000000})
check(r.status_code == 400 and "en total" in r.get_json()["error"], f"no puedes mandar a la wallet más de lo que tienes {r.data}")
r = adm.post("/api/traslados", json={"fecha": "2017-03-01", "sats": 4000000, "sentido": "a_exchange"})
check(r.status_code == 400 and "en tu wallet" in r.get_json()["error"], f"no puedes sacar de la wallet más de lo que hay {r.data}")
check(adm.post("/api/traslados", json={"fecha": "2016-12-01", "sats": 100}).status_code == 400, "no puedes trasladar sats antes de haberlos comprado")
r = adm.post("/api/traslados", json={"fecha": "2017-03-01", "sats": 1000000, "sentido": "a_exchange", "nota": "para vender"})
check(r.status_code == 201 and r.get_json()["sentido"] == "a_exchange", f"traslado de la wallet al exchange {r.data}")
T2 = r.get_json()["id"]
# Anular
r = adm.delete(f"/api/traslados/{T1}")
check(r.status_code == 409 and "posteriores" in r.get_json()["error"], f"no se anula si un traslado posterior se queda sin sats {r.data}")
check(adm.delete(f"/api/traslados/{T2}").status_code == 204, "anular el traslado de vuelta")
check(adm.delete(f"/api/traslados/{T1}").status_code == 204, "ahora sí se anula el primero")
check(adm.get("/api/traslados").get_json() == [] and adm.delete(f"/api/traslados/{T1}").status_code == 404, "anulados no salen y no se anulan dos veces")
# Auditoría (alta y anulación) y TXID verificable
au = adm.get("/api/auditoria").get_json()
check(any(a["accion"] == "alta" and a["entidad"] == "traslado" and a["despues"]["sats"] == 3000000 for a in au), "la auditoría guarda el alta del traslado")
check(any(a["accion"] == "anulacion" and a["entidad"] == "traslado" and a["antes"]["id"] == T1 for a in au), "la auditoría guarda la anulación del traslado")
adm.post("/api/traslados", json={"fecha": "2017-02-01", "sats": 100, "txid": TXT})  # vuelve a existir un traslado con ese TXID
_get_antes = server._get_json
def _sin_red(url, timeout=8):
    raise OSError("sin red en pruebas")
server._get_json = _sin_red
check(adm.get(f"/api/tx/{TXT}").status_code == 503, "el TXID de un traslado se puede verificar (no da 404)")
check(adm.get(f"/api/tx/{'6' * 64}").status_code == 404, "un TXID que no está en compras ni traslados sigue dando 404")
server._get_json = _get_antes
for x in adm.get("/api/traslados").get_json():
    adm.delete(f"/api/traslados/{x['id']}")
adm.delete(f"/api/compras/{TB}")

# --- Avisos push: suscripciones, categorías, horario, recordatorio, TXID confirmado, respaldo y service worker
import base64 as _b64
import random as _rnd
import types as _types
import push, ritmo, avisos
from datetime import datetime as _dtm, timedelta as _td

enviados = []
class _Muerto(Exception):
    response = _types.SimpleNamespace(status_code=410)
def _enviar_falso(sub, payload):
    if "muerto" in sub["endpoint"]:
        raise _Muerto()
    enviados.append((sub["endpoint"], json.loads(payload)))
push._enviar_uno = _enviar_falso
push.SINCRONO = True
_de_dia = lambda: _dtm(2026, 11, 6, 12, 0, tzinfo=ritmo.ZONA)      # viernes, a mediodía
_de_noche = lambda: _dtm(2026, 11, 6, 23, 0, tzinfo=ritmo.ZONA)
_manana = lambda: _dtm(2026, 11, 7, 8, 30, tzinfo=ritmo.ZONA)
push.ahora = _de_dia

EP_LUZ = "https://fcm.googleapis.com/fcm/send/luz-telefono"
EP_ANA = "https://web.push.apple.com/ana-iphone"
EP_ADM = "https://updates.push.services.mozilla.com/wpush/v2/admin-pc"
def _sus(ep):
    return {"suscripcion": {"endpoint": ep, "keys": {"p256dh": "B" + "x" * 86, "auth": "a" * 22}}}
def _a_quien():
    return sorted(e for e, _ in enviados)

# Sin sesión no hay clave ni suscripción
anon = server.app.test_client(); anon.environ_base.update({"wsgi.url_scheme": "https", "HTTP_X_LIBRO": "1"})
check(anon.get("/api/push/clave").status_code == 401 and anon.post("/api/push/suscribir", json=_sus(EP_LUZ)).status_code == 401, "los avisos exigen sesión")
# La clave pública VAPID: punto sin comprimir de 65 bytes en base64url
clave_v = adm.get("/api/push/clave").get_json()["clave"]
_raw = _b64.urlsafe_b64decode(clave_v + "=" * (-len(clave_v) % 4))
check(len(_raw) == 65 and _raw[0] == 4, "clave pública VAPID de 65 bytes")
check(os.path.exists(push.ruta_clave()) and oct(os.stat(push.ruta_clave()).st_mode & 0o777) == "0o600", "la clave privada queda en la carpeta de datos, solo para la app")

# Validación del endpoint (el servidor le habla a esa dirección: solo servicios de push conocidos)
luz = cliente("Luz", "clave-de-luz-2026")
ana = cliente("Ana", "otra-clave-larga-1")
for malo in ("https://evil.example/x", "http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.evil.com/x",
             "https://usuario@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x", "ftp://fcm.googleapis.com/x", "https://" + "a" * 700):
    check(luz.post("/api/push/suscribir", json=_sus(malo)).status_code == 400, f"endpoint rechazado: {malo[:40]}")
check(luz.post("/api/push/suscribir", json={"suscripcion": {"endpoint": EP_LUZ}}).status_code == 400, "sin claves, 400")
check(luz.post("/api/push/suscribir", json={"suscripcion": {"endpoint": EP_LUZ, "keys": {"p256dh": "no valido!", "auth": "a" * 22}}}).status_code == 400, "claves mal formadas, 400")
check(luz.post("/api/push/suscribir", json=[1]).status_code == 400, "cuerpo que no es objeto, 400")

# Un lector sí puede suscribirse (su dispositivo, sus avisos) y ve solo sus categorías
r = luz.post("/api/push/suscribir", json=_sus(EP_LUZ))
check(r.status_code == 200 and r.get_json()["suscrito"] is True, f"un lector se suscribe {r.data}")
cats = r.get_json()["categorias"]
check([(c["id"], c["activo"]) for c in cats] == [("movimiento", True), ("hito", False)], f"categorías del lector y sus valores por defecto {cats}")
check(all(c["nombre"] and c["ayuda"] for c in cats), "cada categoría trae nombre y ayuda")
r = adm.post("/api/push/suscribir", json=_sus(EP_ADM))
check([(c["id"], c["activo"]) for c in r.get_json()["categorias"]] == [("recordatorio", True), ("txid", True), ("respaldo", True), ("caida", True), ("wallet", False)], "categorías del admin")
check(luz.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 100}).status_code == 403, "suscribirse no da permiso de escribir")

# Estado por dispositivo: solo el dueño ve el suyo
check(luz.post("/api/push/estado", json={"endpoint": EP_LUZ}).get_json()["suscrito"] is True, "estado: suscrito")
check(luz.post("/api/push/estado", json={"endpoint": "https://fcm.googleapis.com/otro"}).get_json() == {"suscrito": False, "categorias": []}, "estado: otro dispositivo no")
check(ana.post("/api/push/estado", json={"endpoint": EP_LUZ}).get_json()["suscrito"] is False, "estado: el dispositivo de otra cuenta no se ve")

# Preferencias
check(luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "prefs": {"recordatorio": True}}).status_code == 400, "un lector no elige categorías de admin")
check(luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "prefs": {"movimiento": "si"}}).status_code == 400, "preferencia que no es booleana, 400")
check(luz.put("/api/push/prefs", json={"endpoint": "https://fcm.googleapis.com/otro", "prefs": {"movimiento": False}}).status_code == 404, "prefs de un dispositivo sin avisos, 404")
check(ana.put("/api/push/prefs", json={"endpoint": EP_LUZ, "prefs": {"movimiento": False}}).status_code == 404, "nadie cambia las prefs de otra cuenta")

# Movimiento nuevo: avisa a los lectores, no al admin, y solo al crear
enviados.clear()
r = adm.post("/api/compras", json={"fecha": today, "monto": 10, "sats": 25000})
CN = r.get_json()["id"]
check(_a_quien() == [EP_LUZ] and enviados[0][1]["cuerpo"] == "Daf3r anotó una compra de 25,000 sats" and enviados[0][1]["etiqueta"] == f"mov-{CN}",
      f"una compra avisa al lector {enviados}")
check(enviados[0][1]["url"] == "/" and enviados[0][1]["titulo"] == "Libro DCA", "el aviso lleva título y a dónde abrir")
enviados.clear()
adm.post("/api/compras", json={"fecha": today, "monto": 10, "sats": 25000, "extra": True, "nota": "caída"})
check(enviados and "compra extra de 25,000 sats" in enviados[0][1]["cuerpo"] and "caída" not in enviados[0][1]["cuerpo"], "una compra extra lo dice y no cuenta la nota")
enviados.clear()
VN = adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 700, "tipo": "venta"}).get_json()["id"]
check(enviados and enviados[0][1]["cuerpo"] == "Daf3r anotó una venta o gasto de 700 sats", f"una venta o gasto avisa {enviados}")
enviados.clear()
adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 300, "tipo": "venta", "nota": "Comisión de retiro"})
check(not enviados, "la comisión de un traslado no es una novedad para la familia")
enviados.clear()
adm.put(f"/api/compras/{CN}", json={"fecha": today, "monto": 11, "sats": 26000})
adm.delete(f"/api/compras/{VN}")
adm.post("/api/import", data="fecha,monto_usd,sats\n2016-05-05,5,50000\n", headers={"Content-Type": "text/csv"})
check(not enviados, "editar, anular o importar no avisa")
check(not any(e == EP_ADM for e, _ in enviados), "el admin no recibe avisos de lo que anota él")

# Categorías apagadas no reciben; «hito» está apagada por defecto y se enciende por dispositivo
r = luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "prefs": {"movimiento": False}})
check(r.status_code == 200 and [c["activo"] for c in r.get_json()["categorias"]] == [False, False], "se apaga una categoría")
enviados.clear()
adm.post("/api/compras", json={"fecha": today, "monto": 10, "sats": 1000})
check(not enviados, "con «movimiento» apagado no llega nada")
luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "prefs": {"movimiento": True, "hito": True}})
_saldo = sum(r_["sats"] if r_["tipo"] == "compra" else -r_["sats"] for r_ in adm.get("/api/compras").get_json())
_sig = next(m for m in ritmo.etapas_hasta(10**12) if m > _saldo)
enviados.clear()
adm.post("/api/compras", json={"fecha": today, "monto": 10, "sats": _sig - _saldo})
_txt = [p["cuerpo"] for e, p in enviados]
check(any(("Nueva etapa" in t or "Nuevo hito" in t) and ritmo.nombre_hito(_sig) in t for t in _txt), f"cruzar una etapa avisa a quien lo encendió {_txt}")

# Horario: de noche se guarda y sale por la mañana (varios de una categoría, en uno solo)
push.ahora = _de_noche
enviados.clear()
adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 111})
luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "prefs": {"hito": False}})
_pend = sqlite3.connect(dbp).execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0]
check(not enviados and _pend >= 1, f"de noche no suena: queda pendiente ({_pend})")
push.ahora = _manana
cx = server.connect(); n_env = push.vaciar_pendientes(cx); cx.close()
check(n_env >= 1 and _a_quien() and set(_a_quien()) == {EP_LUZ}, "por la mañana salen los pendientes")
check(sqlite3.connect(dbp).execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0] == 0, "los pendientes se vacían")
push.ahora = _de_noche
enviados.clear()
for _ in range(3):
    adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 112})
push.ahora = _manana
cx = server.connect(); push.vaciar_pendientes(cx); cx.close()
check(len(enviados) == 1 and enviados[0][1]["cuerpo"] == "Tienes 3 avisos nuevos del libro.", f"varios de la noche salen juntos {enviados}")
push.ahora = _de_dia

# Un dispositivo que ya no existe (410) se borra solo
EP_MUERTO = "https://fcm.googleapis.com/fcm/send/muerto-1"
luz.post("/api/push/suscribir", json=_sus(EP_MUERTO))
enviados.clear()
adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 113})
check(sqlite3.connect(dbp).execute("SELECT COUNT(*) FROM suscripciones WHERE endpoint = ?", (EP_MUERTO,)).fetchone()[0] == 0, "el 410 borra la suscripción")
check(EP_LUZ in _a_quien(), "y un dispositivo roto no frena a los demás")

# Cambiar de cuenta en el mismo dispositivo, límite por persona y baja
r = ana.post("/api/push/suscribir", json=_sus(EP_LUZ))
check(r.status_code == 200 and luz.post("/api/push/estado", json={"endpoint": EP_LUZ}).get_json()["suscrito"] is False, "el dispositivo pasa a la otra cuenta")
push.MAX_POR_USUARIO = 2
ana.post("/api/push/suscribir", json=_sus("https://fcm.googleapis.com/fcm/send/ana-2"))
check(ana.post("/api/push/suscribir", json=_sus("https://fcm.googleapis.com/fcm/send/ana-3")).status_code == 400, "límite de dispositivos por persona")
push.MAX_POR_USUARIO = 10
check(luz.post("/api/push/baja", json={"endpoint": EP_LUZ}).status_code == 204 and ana.post("/api/push/estado", json={"endpoint": EP_LUZ}).get_json()["suscrito"] is True,
      "nadie da de baja el dispositivo de otra cuenta")
check(ana.post("/api/push/baja", json={"endpoint": EP_LUZ}).status_code == 204 and ana.post("/api/push/estado", json={"endpoint": EP_LUZ}).get_json()["suscrito"] is False, "baja propia")
# Una cuenta desactivada deja de recibir
luz.post("/api/push/suscribir", json=_sus(EP_LUZ))
cx = server.connect(); cx.execute("UPDATE usuarios SET activo = 0 WHERE nombre = 'Luz'"); cx.commit()
check(EP_LUZ not in [d["endpoint"] for d in push.destinatarios(cx, "movimiento")], "una cuenta desactivada no recibe avisos")
cx.execute("UPDATE usuarios SET activo = 1 WHERE nombre = 'Luz'"); cx.commit(); cx.close()

# Recordatorio: reglas puras (semana a semana, quincena, ya compraste, <3 compras)
def _f(hoy_, dias):
    return [(hoy_ - _td(days=d)).isoformat() for d in dias]
vie = ritmo.hoy_sv(_dtm(2026, 11, 6, 12, tzinfo=ritmo.ZONA))        # viernes
semanal = _f(vie, [7 * k + 11 for k in range(8)])                    # compras cada semana, la última el lunes de la semana pasada
check(ritmo.recordatorio(semanal, vie)["estado"] == "toca" and ritmo.recordatorio(semanal, vie)["dias_restantes"] == 2, "viernes sin comprar esta semana: recordar")
check(ritmo.recordatorio(semanal, vie - _td(days=1)) is None, "jueves aún no (faltan 3 días)")
check(ritmo.recordatorio(semanal, vie + _td(days=2))["estado"] == "ultimo", "domingo: último día")
check(ritmo.recordatorio(semanal + [vie.isoformat()], vie) is None and ritmo.recordatorio(semanal + [(vie - _td(days=4)).isoformat()], vie) is None,
      "si ya compraste esta semana (aunque sea días antes) no se avisa")
check(ritmo.recordatorio(semanal, vie + _td(days=3)) is None and ritmo.toca_comprar(semanal, vie + _td(days=3))["estado"] == "perdida", "pasada la semana ya no se recuerda (sin reproche)")
check(ritmo.recordatorio(semanal[:2], vie) is None, "con menos de 3 compras no hay recordatorio")
quincenal = _f(vie, [14 * k + 11 for k in range(8)])                 # cada 14 días, la última hace 11 días
check(ritmo.toca_comprar(quincenal, vie)["paso"] == 2 and ritmo.recordatorio(quincenal, vie) is None, "quincenal con semana de margen: aún no")
check(ritmo.recordatorio(quincenal, vie + _td(days=7))["estado"] == "toca", "quincenal: en la semana límite sí")
check("Te quedan 2 días" in ritmo.texto_recordatorio(ritmo.recordatorio(semanal, vie)) and "racha de 8 semanas" in ritmo.texto_recordatorio(ritmo.recordatorio(semanal, vie)), "texto del recordatorio")
check("Mañana domingo" in ritmo.texto_recordatorio(ritmo.recordatorio(semanal, vie + _td(days=1))) and "Hoy vence" in ritmo.texto_recordatorio(ritmo.recordatorio(semanal, vie + _td(days=2))), "textos del sábado y el domingo")

# Paridad con lib.js (las mismas reglas en el navegador y en el servidor)
import shutil as _sh
if _sh.which("node"):
    _r = _rnd.Random(7)
    casos_toca = []
    for _ in range(80):
        base = date(2026, 3, 1) + _td(days=_r.randrange(0, 200))
        paso_d = _r.choice([3, 5, 7, 7, 9, 14, 14, 21])
        fechas_ = sorted({(base + _td(days=paso_d * k + _r.randrange(0, 3))).isoformat() for k in range(_r.randrange(0, 14))})
        hoy_ = base + _td(days=_r.randrange(0, 120))
        casos_toca.append({"fechas": fechas_, "hoy": hoy_.isoformat()})
    for _ in range(60):  # compradores con la última compra en la semana anterior (o la anterior a esa): «toca», «aldia», «perdida»
        hoy_ = date(2026, 6, 1) + _td(days=_r.randrange(0, 200))
        lunes_pasado = hoy_ - _td(days=hoy_.weekday() + 7)
        paso_d = _r.choice([7, 7, 14])
        fechas_ = sorted({(lunes_pasado - _td(days=paso_d * k - _r.randrange(0, 3 if k else 1))).isoformat() for k in range(_r.randrange(2, 10))})
        casos_toca.append({"fechas": fechas_, "hoy": hoy_.isoformat()})
    casos_etapas = [[a, a + _r.choice([1, 500, 90000, 260000, 3000000, 90000000])] for a in (_r.randrange(0, 4 * 10**8) for _ in range(60))] + [[0, 100000], [99999, 100000], [5, 4]]
    casos_const = []
    for _ in range(60):
        n = _r.randrange(0, 60)
        ff = sorted({(date(2025, 1, 1) + _td(days=_r.randrange(0, 700))).isoformat() for _ in range(n)})
        nueva = (date(2025, 1, 1) + _td(days=_r.randrange(0, 760))).isoformat()
        casos_const.append({"antes": ff, "despues": sorted([*ff, nueva]) if _r.random() < 0.8 else [*ff, nueva]})
    casos_const += [{"antes": [f"2026-01-{d:02d}" for d in range(1, 10)], "despues": [f"2026-01-{d:02d}" for d in range(1, 11)]}]
    nombres = [100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 100000000, 250000000, 1000000000000]
    casos_caida = []
    for _ in range(120):
        hoy_ = date(2026, 1, 1) + _td(days=_r.randrange(0, 300))
        base_ = _r.uniform(20000, 100000)
        hist_ = [[(hoy_ - _td(days=d)).isoformat(), round(base_ * _r.uniform(0.7, 1.15), 2)] for d in range(_r.randrange(0, 45)) if _r.random() < 0.9]
        casos_caida.append({"historico": hist_, "vivo": round(base_ * _r.uniform(0.6, 1.1), 2), "hoy": hoy_.isoformat()})
    casos_caida += [{"historico": [["2026-03-%02d" % d, 100000] for d in range(1, 9)], "vivo": 85000, "hoy": "2026-03-10"},   # exactamente 15 %
                    {"historico": [["2026-03-%02d" % d, 100000] for d in range(1, 9)], "vivo": 85001, "hoy": "2026-03-10"},
                    {"historico": [["2026-03-%02d" % d, 100000] for d in range(1, 4)], "vivo": 50000, "hoy": "2026-03-10"}]   # muy poco histórico
    casos_repo = []
    for _ in range(80):
        movs_ = []
        for i in range(_r.randrange(0, 30)):
            precio_ = _r.uniform(20000, 100000)
            monto_ = round(_r.uniform(4, 220), 2)
            movs_.append({"fecha": (date(2025, 6, 1) + _td(days=i * _r.randrange(1, 9))).isoformat(), "monto": monto_, "sats": max(1, round(monto_ / precio_ * 1e8)),
                          "tipo": "venta" if _r.random() < 0.15 else "compra", "extra": _r.random() < 0.2})
        casos_repo.append({"movs": movs_, "vivo": round(_r.uniform(40000, 100000), 2), "hoy": "2026-11-01"})
    entrada = {"toca": casos_toca, "etapas": casos_etapas, "constancia": casos_const, "nombres": nombres, "caida": casos_caida, "reposicion": casos_repo}
    p_ = subprocess.run(["node", os.path.join(os.path.dirname(os.path.abspath(__file__)), "paridad_ritmo.mjs")], input=json.dumps(entrada), capture_output=True, text=True)
    check(p_.returncode == 0, f"node calcula la paridad: {p_.stderr[:200]}")
    js = json.loads(p_.stdout)
    mal = []
    for caso, esperado in zip(casos_toca, js["toca"], strict=True):
        t = ritmo.toca_comprar(caso["fechas"], date.fromisoformat(caso["hoy"]))
        mio = {"estado": t["estado"], "racha": t["racha"], "paso": t["paso"]} if t else None
        if mio != esperado:
            mal.append((caso, mio, esperado))
    check(not mal, f"«te toca comprar» igual que lib.js ({len(mal)} casos distintos de {len(casos_toca)}): {mal[:1]}")
    check([ritmo.etapas_cruzadas(a, b) for a, b in casos_etapas] == js["etapas"], "etapas cruzadas igual que lib.js")
    check([[list(x) for x in ritmo.constancia_cruzada(c["antes"], c["despues"])] for c in casos_const] == js["constancia"], "constancia cruzada igual que lib.js")
    check([ritmo.nombre_hito(m).replace(" sats", "") for m in nombres] == js["nombres"], "nombre del hito igual que lib.js")
    check(sum(1 for x in js["toca"] if x and x["estado"] in ("toca", "ultimo")) > 5, "la paridad prueba casos de «toca» de verdad")
    mal_c = []
    for caso, esperado in zip(casos_caida, js["caida"], strict=True):
        mio = ritmo.caida_grande([(f, c_) for f, c_ in caso["historico"]], caso["vivo"], date.fromisoformat(caso["hoy"]))
        if (mio is None) != (esperado is None) or (mio and (abs(mio["caida"] - esperado["caida"]) > 1e-9 or abs(mio["max"] - esperado["max"]) > 1e-6)):
            mal_c.append((caso, mio, esperado))
    check(not mal_c, f"gran caída igual que lib.js ({len(mal_c)} distintos de {len(casos_caida)}): {mal_c[:1]}")
    check(sum(1 for x in js["caida"] if x) > 10 and sum(1 for x in js["caida"] if not x) > 10, "la paridad de la gran caída prueba casos con y sin caída")
    mal_r = []
    for caso, esperado in zip(casos_repo, js["reposicion"], strict=True):
        movs_p = [(m["fecha"], i + 1, m["tipo"], m["monto"], m["sats"], 1 if m["extra"] and m["tipo"] == "compra" else 0) for i, m in enumerate(caso["movs"])]
        # lib.js lee `extra` tal cual venga; el servidor guarda extra=0 en las ventas, así que el caso lo normaliza igual
        r_ = ritmo.reposicion(movs_p, caso["vivo"])
        inv_, sats_ = ritmo.invertido_y_sats(movs_p)
        ok_r = ritmo.monto_habitual(movs_p) == esperado["habitual"] and abs(inv_ - esperado["inv"]) < 1e-6 and sats_ == esperado["sats"]
        ok_r = ok_r and ((r_ is None) == (esperado["r"] is None)) and (r_ is None or all(abs(r_[k] - esperado["r"][k]) < 1e-6 for k in ("monto", "antes", "despues")))
        if not ok_r:
            mal_r.append((caso, r_, esperado))
    check(not mal_r, f"monto habitual y reposición igual que lib.js ({len(mal_r)} distintos de {len(casos_repo)}): {mal_r[:1]}")
    check(sum(1 for x in js["reposicion"] if x["r"]) > 20, "la paridad de la reposición prueba casos con resultado")
else:
    print("(sin node: se omite la paridad con lib.js)")

# El servicio de recordatorios: una vez al día, desde las 9:00, solo si toca
cx = server.connect()
_ori = ritmo.recordatorio
ritmo.recordatorio = lambda f, h: {"estado": "toca", "racha": 8, "paso": 1, "dias_restantes": 2}
push.ahora = lambda: _dtm(2026, 11, 6, 8, 30, tzinfo=ritmo.ZONA)
enviados.clear()
check(avisos._recordatorio(cx) is False and not enviados, "antes de las 9:00 no se avisa")
push.ahora = lambda: _dtm(2026, 11, 6, 9, 5, tzinfo=ritmo.ZONA)
check(avisos._recordatorio(cx) is True and _a_quien() == [EP_ADM] and enviados[0][1]["etiqueta"] == "recordatorio"
      and "Te quedan 2 días" in enviados[0][1]["cuerpo"], f"el recordatorio llega al admin y a nadie más {enviados}")
check(avisos._recordatorio(cx) is False and len(enviados) == 1, "una vez al día")
push.ahora = lambda: _dtm(2026, 11, 7, 9, 5, tzinfo=ritmo.ZONA)
check(avisos._recordatorio(cx) is True and len(enviados) == 2, "al día siguiente vuelve a avisar")
ritmo.recordatorio = lambda f, h: None
push.ahora = lambda: _dtm(2026, 11, 8, 9, 5, tzinfo=ritmo.ZONA)
check(avisos._recordatorio(cx) is False and len(enviados) == 2, "si ya compraste (o no toca) no avisa")
ritmo.recordatorio = _ori

# --- Horario propio de cada dispositivo (idea 103): desde, hasta y hora del recordatorio
_HDEF = {"desde": 8, "hasta": 21, "recordatorio": 9}
r = adm.post("/api/push/estado", json={"endpoint": EP_ADM}).get_json()
check(r["horario"] == _HDEF and r["horario_defecto"] == _HDEF, f"el horario por defecto es el de siempre {r}")
check(luz.post("/api/push/estado", json={"endpoint": "https://fcm.googleapis.com/otro"}).get_json() == {"suscrito": False, "categorias": []}, "sin suscribir no hay horario")
r = adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": {"desde": 6, "hasta": 23, "recordatorio": 7}})
check(r.status_code == 200 and r.get_json()["horario"] == {"desde": 6, "hasta": 23, "recordatorio": 7}, f"se guarda el horario del dispositivo {r.data}")
check([c["id"] for c in r.get_json()["categorias"]] == ["recordatorio", "txid", "respaldo", "caida", "wallet"], "guardar el horario no cambia las categorías")
r = adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "prefs": {"caida": False}})
check(r.get_json()["horario"] == {"desde": 6, "hasta": 23, "recordatorio": 7}, "elegir categorías no borra el horario")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "prefs": {"caida": True}})
check(adm.post("/api/push/estado", json={"endpoint": EP_ADM}).get_json()["horario"]["desde"] == 6, "el horario se recuerda")
# Validación: ventana de al menos 2 horas, horas de 0 a 24, recordatorio dentro de la ventana, enteros
for malo in ({"desde": 10, "hasta": 11, "recordatorio": 10}, {"desde": 10, "hasta": 10}, {"desde": 12, "hasta": 8}, {"desde": -1, "hasta": 20, "recordatorio": 9},
             {"desde": 8, "hasta": 25}, {"desde": 23, "hasta": 24}, {"desde": 8, "hasta": 21, "recordatorio": 21}, {"desde": 8, "hasta": 21, "recordatorio": 7},
             {"desde": "ocho", "hasta": 21}, {"desde": True, "hasta": 21}, {"desde": None, "hasta": None}, [8, 21], "8-21"):
    check(adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": malo}).status_code == 400, f"horario inválido rechazado: {malo}")
check(adm.post("/api/push/estado", json={"endpoint": EP_ADM}).get_json()["horario"] == {"desde": 6, "hasta": 23, "recordatorio": 7}, "un horario inválido no cambia el guardado")
check(adm.put("/api/push/prefs", json={"endpoint": "https://fcm.googleapis.com/otro", "horario": _HDEF}).status_code == 404, "horario de un dispositivo sin avisos, 404")
check(ana.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": _HDEF}).status_code == 404, "nadie cambia el horario de otra cuenta")
check(adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": {"desde": 7, "hasta": 22}}).get_json()["horario"] == {"desde": 7, "hasta": 22, "recordatorio": 9},
      "sin recordatorio se toma el de siempre ajustado a la ventana")
check(adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": {"desde": 11, "hasta": 22}}).get_json()["horario"]["recordatorio"] == 11,
      "y si el de siempre queda antes de la ventana, empieza con ella")
# Sin horario guardado (o con el JSON roto) vale el de siempre
check(push.horario_de(None) == _HDEF and push.horario_de("no es json") == _HDEF and push.horario_de('{"horario": {"desde": 20, "hasta": 3}}') == _HDEF
      and push.horario_de('{"horario": 7}') == _HDEF, "un horario ausente o dañado vuelve al de siempre")

# El recordatorio sale a la hora de cada dispositivo: uno que lo quiere a las 7:00 no espera al de las 9:00
EP_ADM2 = "https://updates.push.services.mozilla.com/wpush/v2/admin-telefono"
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": {"desde": 6, "hasta": 23, "recordatorio": 7}})
check(adm.post("/api/push/suscribir", json=_sus(EP_ADM2)).status_code == 200, "el admin suma un segundo dispositivo")
check(adm.post("/api/push/estado", json={"endpoint": EP_ADM2}).get_json()["horario"] == _HDEF, "el dispositivo nuevo arranca con el horario de siempre")
cxh = server.connect()
ritmo.recordatorio = lambda f, h: {"estado": "toca", "racha": 8, "paso": 1, "dias_restantes": 2}
enviados.clear()
push.ahora = lambda: _dtm(2026, 11, 9, 6, 30, tzinfo=ritmo.ZONA)
check(avisos._recordatorio(cxh) is False and not enviados, "6:30: ninguno de los dos quiere aún el recordatorio")
push.ahora = lambda: _dtm(2026, 11, 9, 7, 5, tzinfo=ritmo.ZONA)
check(avisos._recordatorio(cxh) is True and _a_quien() == [EP_ADM], f"7:05: llega al que lo quiere a las 7:00 (aunque el horario de siempre empiece a las 8:00) {_a_quien()}")
check(avisos._recordatorio(cxh) is False and len(enviados) == 1, "7:10: una vez al día por dispositivo")
push.ahora = lambda: _dtm(2026, 11, 9, 9, 5, tzinfo=ritmo.ZONA)
check(avisos._recordatorio(cxh) is True and _a_quien() == sorted([EP_ADM, EP_ADM2]) and len(enviados) == 2, f"9:05: llega al otro, que no lo había recibido {_a_quien()}")
check(avisos._recordatorio(cxh) is False, "9:10: los dos ya lo recibieron hoy")
push.ahora = lambda: _dtm(2026, 11, 10, 23, 30, tzinfo=ritmo.ZONA)
enviados.clear()
check(avisos._recordatorio(cxh) is False and not enviados, "23:30: fuera del horario de los dos no suena")
push.ahora = lambda: _dtm(2026, 11, 10, 9, 5, tzinfo=ritmo.ZONA)
check(avisos._recordatorio(cxh) is True and _a_quien() == sorted([EP_ADM, EP_ADM2]), "al día siguiente vuelve a avisar a los dos")
ritmo.recordatorio = _ori

# --- Campamento 9: aviso de prueba (143), botón en el recordatorio (144) y «retirar a tu wallet» (146)
push.ahora = _de_dia
enviados.clear()
r = adm.post("/api/push/prueba", json={"endpoint": EP_ADM})
check(r.status_code == 200 and r.get_json()["ok"] is True and "enviado" in r.get_json()["mensaje"], f"aviso de prueba enviado {r.data}")
check(len(enviados) == 1 and enviados[0][0] == EP_ADM and enviados[0][1]["etiqueta"] == "prueba" and "acciones" not in enviados[0][1],
      "la prueba llega solo a ese dispositivo y sin botones")
r = adm.post("/api/push/prueba", json={"endpoint": EP_ADM})
check(r.status_code == 429 and r.headers.get("Retry-After") and len(enviados) == 1, "otra prueba enseguida: 429 con Retry-After")
check(adm.post("/api/push/prueba", json={"endpoint": EP_ADM2}).status_code == 200 and len(enviados) == 2, "el límite es por dispositivo")
check(adm.post("/api/push/prueba", json={"endpoint": "https://fcm.googleapis.com/otro"}).status_code == 404, "prueba de un dispositivo sin avisos, 404")
check(ana.post("/api/push/prueba", json={"endpoint": EP_ADM}).status_code == 404, "nadie prueba el dispositivo de otra cuenta")
check(adm.post("/api/push/prueba", json={}).status_code == 404 and adm.post("/api/push/prueba", json=[1]).status_code in (400, 404), "sin endpoint no hay prueba")
check(anon.post("/api/push/prueba", json={"endpoint": EP_ADM}).status_code == 401, "la prueba exige sesión")
check(luz.post("/api/push/prueba", json={"endpoint": EP_LUZ}).status_code == 200, "un lector también prueba sus propios avisos")
# Con el límite vencido, un dispositivo que el servicio ya no reconoce se quita y se explica; un fallo de red también
cxp = server.connect()
cxp.execute("UPDATE meta SET valor = '0' WHERE clave LIKE 'prueba_aviso:%'")
cxp.commit()
EP_MUERTO2 = "https://fcm.googleapis.com/fcm/send/muerto-prueba"
adm.post("/api/push/suscribir", json=_sus(EP_MUERTO2))
r = adm.post("/api/push/prueba", json={"endpoint": EP_MUERTO2}).get_json()
check(r["ok"] is False and "vuelve a activar" in r["mensaje"] and adm.post("/api/push/estado", json={"endpoint": EP_MUERTO2}).get_json()["suscrito"] is False,
      f"410: se dice y el dispositivo se quita {r}")
class _Rechazo(Exception):
    response = _types.SimpleNamespace(status_code=403)
def _rechaza(sub, payload):
    raise _Rechazo()
def _sin_red(sub, payload):
    raise OSError("sin red")
cxp.execute("UPDATE meta SET valor = '0' WHERE clave LIKE 'prueba_aviso:%'")
cxp.commit()
push._enviar_uno = _rechaza
r = adm.post("/api/push/prueba", json={"endpoint": EP_ADM}).get_json()
check(r["ok"] is False and "403" in r["mensaje"] and adm.post("/api/push/estado", json={"endpoint": EP_ADM}).get_json()["suscrito"] is True, f"otro código: se explica y no se borra {r}")
cxp.execute("UPDATE meta SET valor = '0' WHERE clave LIKE 'prueba_aviso:%'")
cxp.commit()
push._enviar_uno = _sin_red
r = adm.post("/api/push/prueba", json={"endpoint": EP_ADM}).get_json()
check(r["ok"] is False and "conexión" in r["mensaje"], f"sin red: mensaje de conexión {r}")
push._enviar_uno = _enviar_falso

# 144: solo el recordatorio lleva el botón «Anotar compra»
enviados.clear()
push.enviar_ahora(cxp, "recordatorio", "Libro DCA", "Te toca", "recordatorio")
check(enviados and all(p.get("acciones") == ["anotar"] for _e, p in enviados), f"el recordatorio trae la acción anotar {enviados}")
enviados.clear()
push.enviar_ahora(cxp, "caida", "Libro DCA", "Caída", "caida")
check(enviados and all("acciones" not in p for _e, p in enviados), "los demás avisos no traen botones")

# 146: el monto de «retirar a tu wallet» es de cada dispositivo, solo del admin y validado
est = adm.post("/api/push/estado", json={"endpoint": EP_ADM}).get_json()
check(est["umbral_wallet"] == 0 and ("wallet", False) in [(c["id"], c["activo"]) for c in est["categorias"]], "la categoría nace apagada y sin monto")
check(luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "umbral_wallet": 1000}).status_code == 403, "un lector no elige ese monto")
for malo in (-1, 1.5, "mucho", None, True, 10**10 + 1, [5]):
    check(adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "umbral_wallet": malo}).status_code == 400, f"monto inválido rechazado: {malo}")
check(adm.put("/api/push/prefs", json={"endpoint": "https://fcm.googleapis.com/otro", "umbral_wallet": 5}).status_code == 404, "monto de un dispositivo sin avisos, 404")
cxw = server.connect()
exch = server.sats_en_exchange(cxw)
check(exch > 0, f"hay sats en el exchange para probar ({exch})")
r = adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "umbral_wallet": exch - 1})
check(r.status_code == 200 and r.get_json()["umbral_wallet"] == exch - 1, "se guarda el monto")
r = adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "prefs": {"caida": False}})
check(r.get_json()["umbral_wallet"] == exch - 1, "elegir categorías no borra el monto")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "prefs": {"caida": True}})
r = adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": {"desde": 6, "hasta": 23, "recordatorio": 7}})
check(r.get_json()["umbral_wallet"] == exch - 1 and r.get_json()["horario"]["desde"] == 6, "guardar el horario no borra el monto ni al revés")
check(adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "umbral_wallet": exch - 1}).get_json()["horario"]["desde"] == 6, "guardar el monto no borra el horario")
# sin la categoría encendida no avisa
enviados.clear()
check(avisos._wallet(cxw) == 0 and not enviados, "con la categoría apagada no avisa aunque pase del monto")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "prefs": {"wallet": True}})
push.ahora = lambda: _dtm(2026, 11, 12, 23, 30, tzinfo=ritmo.ZONA)
check(avisos._wallet(cxw) == 0 and not enviados, "de noche (fuera de su horario) espera")
push.ahora = lambda: _dtm(2026, 11, 13, 10, 0, tzinfo=ritmo.ZONA)
check(avisos._wallet(cxw) == 1 and _a_quien() == [EP_ADM] and enviados[0][1]["etiqueta"] == "wallet" and f"{exch:,}" in enviados[0][1]["cuerpo"]
      and "recordatorio" in enviados[0][1]["cuerpo"], f"avisa una vez al pasar del monto {enviados}")
check(avisos._wallet(cxw) == 0 and len(enviados) == 1, "no repite mientras siga arriba")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "umbral_wallet": exch + 5})
check(avisos._wallet(cxw) == 0 and server._meta(cxw, f"aviso_wallet:{cxw.execute('SELECT id FROM suscripciones WHERE endpoint = ?', (EP_ADM,)).fetchone()[0]}") is None,
      "al quedar debajo del monto se quita la marca")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "umbral_wallet": exch - 1})
check(avisos._wallet(cxw) == 1 and len(enviados) == 2, "al volver a pasarlo avisa otra vez")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "umbral_wallet": 0})
check(avisos._wallet(cxw) == 0, "con monto 0 no avisa")
# la marca de un dispositivo que ya no existe se limpia
cxw.execute("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('aviso_wallet:99999', '1'), ('prueba_aviso:99999', '1')")
cxw.commit()
avisos.limpiar(cxw)
check(cxw.execute("SELECT COUNT(*) FROM meta WHERE clave IN ('aviso_wallet:99999', 'prueba_aviso:99999')").fetchone()[0] == 0, "la limpieza quita las marcas de dispositivos que ya no existen")
push.ahora = _de_dia

# De noche cada dispositivo espera su hora: lo que cae mientras duerme queda guardado solo para él
EP_ANA2 = "https://web.push.apple.com/ana-horario"
luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "horario": {"desde": 10, "hasta": 20, "recordatorio": 10}})
check(ana.post("/api/push/suscribir", json=_sus(EP_ANA2)).status_code == 200, "Ana suma un dispositivo con el horario de siempre")
cxh.execute("DELETE FROM avisos_pendientes"); cxh.commit()
enviados.clear()
push.ahora = lambda: _dtm(2026, 11, 10, 20, 30, tzinfo=ritmo.ZONA)
push.notificar(cxh, "movimiento", "Libro DCA", "Daf3r anotó una compra de 25,000 sats", "mov-horario")
check(EP_ANA2 in _a_quien() and EP_LUZ not in _a_quien(), f"20:30: le llega a quien está despierto y no al que duerme desde las 20:00 {_a_quien()}")
_luz_id = cxh.execute("SELECT id FROM suscripciones WHERE endpoint = ?", (EP_LUZ,)).fetchone()[0]
check(cxh.execute("SELECT COUNT(*) FROM avisos_pendientes WHERE sus_id = ?", (_luz_id,)).fetchone()[0] == 1, "para el que duerme queda uno guardado, a su nombre")
enviados.clear()
push.ahora = lambda: _dtm(2026, 11, 11, 9, 30, tzinfo=ritmo.ZONA)
check(push.vaciar_pendientes(cxh) == 0 and not enviados and cxh.execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0] == 1, "9:30: todavía duerme, sigue guardado")
push.ahora = lambda: _dtm(2026, 11, 11, 10, 30, tzinfo=ritmo.ZONA)
check(push.vaciar_pendientes(cxh) == 1 and _a_quien() == [EP_LUZ] and cxh.execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0] == 0, f"10:30: sale solo a su dueño {_a_quien()}")
# Varios para el mismo dispositivo salen juntos; un dispositivo dado de baja pierde los suyos sin errores
push.ahora = lambda: _dtm(2026, 11, 11, 20, 30, tzinfo=ritmo.ZONA)
enviados.clear()
for _i in range(3):
    push.notificar(cxh, "movimiento", "Libro DCA", f"aviso {_i}", f"mov-h{_i}")
push.ahora = lambda: _dtm(2026, 11, 12, 10, 30, tzinfo=ritmo.ZONA)
enviados.clear()
push.vaciar_pendientes(cxh)
check([(e, p["cuerpo"]) for e, p in enviados] == [(EP_LUZ, "Tienes 3 avisos nuevos del libro.")], f"varios guardados salen como uno {enviados}")
push.ahora = lambda: _dtm(2026, 11, 12, 20, 30, tzinfo=ritmo.ZONA)
push.notificar(cxh, "movimiento", "Libro DCA", "para un dispositivo que se irá", "mov-baja")
luz.post("/api/push/baja", json={"endpoint": EP_LUZ})
push.ahora = lambda: _dtm(2026, 11, 13, 10, 30, tzinfo=ritmo.ZONA)
enviados.clear()
check(push.vaciar_pendientes(cxh) == 0 and not enviados and cxh.execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0] == 0, "los avisos de un dispositivo dado de baja se descartan")
luz.post("/api/push/suscribir", json=_sus(EP_LUZ))
# Los avisos guardados de antes de los horarios propios (sin dispositivo) salen con el horario de siempre
cxh.execute("INSERT INTO avisos_pendientes (categoria, titulo, cuerpo, etiqueta, creado) VALUES ('movimiento', 'Libro DCA', 'de antes', 'viejo', 1)")
cxh.commit()
enviados.clear()
push.ahora = lambda: _dtm(2026, 11, 13, 7, 30, tzinfo=ritmo.ZONA)
check(push.vaciar_pendientes(cxh) == 0 and cxh.execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0] == 1, "los de antes esperan al horario de siempre (7:30 aún no)")
push.ahora = lambda: _dtm(2026, 11, 13, 8, 30, tzinfo=ritmo.ZONA)
check(push.vaciar_pendientes(cxh) >= 1 and cxh.execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0] == 0, "y salen a las 8:30")
# «Alguien despierto»: ni una consulta de precio de más cuando todos duermen
push.ahora = lambda: _dtm(2026, 11, 13, 5, 0, tzinfo=ritmo.ZONA)
check(push.alguien_despierto(cxh) is False, "5:00 con todos dormidos")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": {"desde": 4, "hasta": 23, "recordatorio": 5}})
check(push.alguien_despierto(cxh) is True, "5:00 con un dispositivo que despierta a las 4:00")
# Dejamos los dispositivos como estaban
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "horario": _HDEF})
luz.put("/api/push/prefs", json={"endpoint": EP_LUZ, "horario": _HDEF})
adm.post("/api/push/baja", json={"endpoint": EP_ADM2})
ana.post("/api/push/baja", json={"endpoint": EP_ANA2})
cxh.close()
push.ahora = _de_dia
enviados.clear()

# TXID: solo avisa si se vio pendiente y luego se confirmó
TXP, TXC = "a1" * 32, "b2" * 32
adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 150, "txid": TXP})
adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 151, "txid": TXC})
check(sqlite3.connect(dbp).execute("SELECT COUNT(*) FROM tx_vigilados WHERE txid IN (?, ?)", (TXP, TXC)).fetchone()[0] == 2, "un TXID nuevo se vigila")
estados = {TXP: "pendiente", TXC: "confirmada"}
_ver = server.verificar_tx
server.verificar_tx = lambda conn, txid: {"estado": estados.get(txid, "no_encontrada")}
push.ahora = _de_dia
enviados.clear()
avisos._txid(cx)
check(not enviados, "pendiente y confirmada-desde-el-inicio no avisan")
estados[TXP] = "confirmada"
avisos._txid(cx)
check(_a_quien() == [EP_ADM] and "ya está confirmada" in enviados[0][1]["cuerpo"] and TXP[:6] in enviados[0][1]["cuerpo"], f"el pendiente que se confirma avisa al admin {enviados}")
avisos._txid(cx)
check(len(enviados) == 1, "y avisa una sola vez")
cx.execute("INSERT OR REPLACE INTO tx_vigilados (txid, creado) VALUES (?, ?)", ("c3" * 32, int(_tt.time()) - 15 * 86400)); cx.commit()
avisos._txid(cx)
check(cx.execute("SELECT COUNT(*) FROM tx_vigilados WHERE txid = ?", ("c3" * 32,)).fetchone()[0] == 0, "tras dos semanas se deja de vigilar")
server.verificar_tx = _ver
cx.close()

# Gran caída: una vez por caída, no de noche, y se reinicia al recuperarse a menos de 10 %
cx = server.connect()
cx.execute("DELETE FROM precios WHERE fecha >= '2026-10-01'")
for d in range(20, 30):
    cx.execute("INSERT INTO precios (fecha, cierre) VALUES (?, ?)", (f"2026-10-{d:02d}", 100000.0))
cx.execute("DELETE FROM meta WHERE clave IN ('aviso_caida', 'aviso_caida_chequeo')"); cx.commit()
_vivo = {"p": 100000.0}
_cp = server.consultar_precio
server.consultar_precio = lambda: (_vivo["p"], "prueba")
push.ahora = _de_dia
enviados.clear()
check(avisos._caida(cx, cada=0) is False and not enviados, "sin caída no avisa")
_vivo["p"] = 86000.0   # −14 %: aún no
check(avisos._caida(cx, cada=0) is False and not enviados, "−14 % todavía no es una gran caída")
_vivo["p"] = 78000.0   # −22 %
check(avisos._caida(cx, cada=0) is True and _a_quien() == [EP_ADM] and enviados[0][1]["etiqueta"] == "caida", f"−22 % avisa al admin y a nadie más {enviados}")
_txt = enviados[0][1]["cuerpo"]
check(_txt.startswith("BTC está 22% por debajo de su máximo de los últimos 30 días.") and "Es opcional." in _txt and "compra ahora" not in _txt.lower(), f"texto informativo, sin recomendar {_txt}")
check("Si decides reponer con una compra como las tuyas ($" in _txt, "con la reposición cuando hay compras habituales")
_vivo["p"] = 60000.0   # sigue cayendo: no repite
check(avisos._caida(cx, cada=0) is False and len(enviados) == 1, "si sigue cayendo no vuelve a avisar")
_vivo["p"] = 88000.0   # −12 %: aún no se considera recuperada
avisos._caida(cx, cada=0); _vivo["p"] = 70000.0
check(avisos._caida(cx, cada=0) is False and len(enviados) == 1, "oscilar por encima de −10 % no reinicia la caída (no suena dos veces)")
_vivo["p"] = 95000.0   # −5 %: recuperada
avisos._caida(cx, cada=0)
_vivo["p"] = 79000.0
check(avisos._caida(cx, cada=0) is True and len(enviados) == 2, "recuperada y con una caída nueva, vuelve a avisar")
# De noche no suena y no gasta el aviso: si por la mañana sigue la caída, sale entonces
cx.execute("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('aviso_caida', '0')"); cx.commit()
push.ahora = _de_noche
check(avisos._caida(cx, cada=0) is False and len(enviados) == 2, "de noche no avisa")
push.ahora = _manana
check(avisos._caida(cx, cada=0) is True and len(enviados) == 3, "por la mañana, si sigue la caída, sale")
# Se limita la frecuencia de las consultas, y sin datos o con pocas compras no hace nada
cx.execute("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('aviso_caida', '0')"); cx.commit()
check(avisos._caida(cx, cada=300) is False and len(enviados) == 3, "no consulta el precio más de una vez cada 5 minutos")
cx.execute("DELETE FROM precios WHERE fecha >= '2026-10-24'"); cx.commit()
check(avisos._caida(cx, cada=0) is False and len(enviados) == 3, "con menos de 5 días de histórico no dice nada")
for d in range(24, 30):
    cx.execute("INSERT INTO precios (fecha, cierre) VALUES (?, ?)", (f"2026-10-{d:02d}", 100000.0))
cx.commit()
# Apagada en «Tu cuenta», no llega
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "prefs": {"caida": False}})
push.ahora = _de_dia
check(avisos._caida(cx, cada=0) is True and len(enviados) == 3, "con la categoría apagada se evalúa pero no llega nada")
adm.put("/api/push/prefs", json={"endpoint": EP_ADM, "prefs": {"caida": True}})
server.consultar_precio = _cp
cx.close()

# Vigilantes: «sigo vivo», respaldo atrasado, integridad de la base y espacio en disco
import salud, collections as _col
cx = server.connect()
push.ahora = _de_dia
cx.execute("DELETE FROM meta WHERE clave IN ('avisos_latido', 'avisos_primer_pase', 'aviso_respaldo_viejo_dia', 'aviso_integridad', 'aviso_disco_dia')"); cx.commit()
check(salud.avisos(db_path=dbp) is False, "sin marca de «sigo vivo», el servicio no está sano")
_t_ori, _c_ori = avisos._txid, avisos._caida
avisos._txid, avisos._caida = (lambda conn: 0), (lambda conn: False)
_bk = os.path.join(tmp, "bk-vigilantes"); os.makedirs(_bk, exist_ok=True)
os.environ["BACKUP_DIR"] = _bk
_pasada = avisos.una_pasada()
check(set(_pasada) >= {"pendientes", "recordatorio", "txid", "caida", "respaldo", "integridad", "disco"}, f"la pasada incluye los vigilantes {_pasada}")
check(salud.avisos(db_path=dbp) is True and salud.avisos(ahora=_tt.time() + 700, db_path=dbp) is False, "la marca de «sigo vivo» dice sano y, pasados 10 minutos, no")
avisos._txid, avisos._caida = _t_ori, _c_ori

# Respaldo atrasado
enviados.clear()
_viejo = os.path.join(_bk, "libro-20260101-000000.db"); open(_viejo, "wb").close()
os.utime(_viejo, (_tt.time() - 40 * 3600, _tt.time() - 40 * 3600))
check(avisos._respaldo_viejo(cx) is True and _a_quien() == [EP_ADM] and enviados[0][1]["etiqueta"] == "respaldo-viejo" and "Hace 40 horas" in enviados[0][1]["cuerpo"], f"respaldo de hace 40 h avisa al admin {enviados}")
check(avisos._respaldo_viejo(cx) is False and len(enviados) == 1, "el aviso del respaldo atrasado sale una vez al día")
cx.execute("DELETE FROM meta WHERE clave = 'aviso_respaldo_viejo_dia'"); cx.commit()
_nuevo = os.path.join(_bk, "libro-20260106-000000.db"); open(_nuevo, "wb").close()
check(avisos._respaldo_viejo(cx) is False and len(enviados) == 1, "con un respaldo reciente no avisa")
check(salud.ultimo_respaldo(_bk) == os.path.getmtime(_nuevo), "el último respaldo es el más reciente")
check(salud.respaldo(db_path=dbp) is True, "con un respaldo reciente, el servicio de respaldos está sano")
for _f in (_viejo, _nuevo):
    os.utime(_f, (_tt.time() - 50 * 3600, _tt.time() - 50 * 3600))
check(salud.respaldo(db_path=dbp) is False, "con el último respaldo de hace 50 h (más de 1.5 intervalos), no está sano")
check(salud.respaldo(db_path="/no/existe.db") is True, "mientras no exista la base, no se exige respaldo")
# Sin ningún respaldo: avisa pasadas 36 horas desde que se empezó a vigilar
os.remove(_viejo); os.remove(_nuevo)
cx.execute("DELETE FROM meta WHERE clave = 'aviso_respaldo_viejo_dia'"); cx.execute("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('avisos_primer_pase', ?)", (str(int(_tt.time()) - 40 * 3600),)); cx.commit()
enviados.clear()
check(avisos._respaldo_viejo(cx) is True and "Todavía no hay ningún respaldo" in enviados[0][1]["cuerpo"], "sin ningún respaldo desde hace más de 36 h, avisa")

# Integridad de la base
check(avisos._resultado_integridad(cx) == ["ok"], "la base de las pruebas pasa su revisión de integridad")
enviados.clear()
check(avisos._integridad(cx) is False and not enviados, "una base sana no avisa")
_llamadas = []
_res_ori = avisos._resultado_integridad
avisos._resultado_integridad = lambda conn: _llamadas.append(1) or ["ok"]
check(avisos._integridad(cx) is False and not _llamadas, "ya revisada esta semana, no se vuelve a revisar")
cx.execute("DELETE FROM meta WHERE clave = 'aviso_integridad'"); cx.commit()
avisos._resultado_integridad = lambda conn: ["*** in database main ***", "Page 3: never used"]
check(avisos._integridad(cx) is True and enviados[-1][1]["etiqueta"] == "integridad" and _a_quien() == [EP_ADM], f"una base con problemas avisa al admin {enviados}")
check(avisos._integridad(cx) is False, "el mismo día no vuelve a revisar ni a avisar")
avisos._resultado_integridad = _res_ori

# Espacio en disco
_du = _col.namedtuple("uso", "total used free")
_disco_ori = avisos.shutil.disk_usage
enviados.clear()
avisos.shutil.disk_usage = lambda ruta: _du(100 * 1024**3, 50 * 1024**3, 50 * 1024**3)
check(avisos._disco(cx) is False and not enviados, "con espacio de sobra no avisa")
avisos.shutil.disk_usage = lambda ruta: _du(100 * 1024**3, 100 * 1024**3 - 500 * 1024**2, 500 * 1024**2)
check(avisos._disco(cx) is True and enviados[0][1]["etiqueta"] == "disco" and "500 MB" in enviados[0][1]["cuerpo"], f"con 500 MB libres avisa {enviados}")
check(avisos._disco(cx) is False and len(enviados) == 1, "el aviso de disco sale una vez al día")
avisos.shutil.disk_usage = _disco_ori
cx.close()
os.environ["BACKUP_DIR"] = os.path.join(tmp, "bk")

# Servicio de worker y archivos del navegador
r = anon.get("/sw.js")
check(r.status_code == 200 and "javascript" in r.content_type and r.headers["Cache-Control"] == "no-cache", "sw.js es público y se revalida siempre")
check("worker-src 'self'" in r.headers["Content-Security-Policy"], "la CSP permite el service worker")
cuerpo_sw = r.get_data(as_text=True)
check("showNotification" in cuerpo_sw and "'push'" in cuerpo_sw and "notificationclick" in cuerpo_sw, "el service worker muestra avisos y atiende el toque")
check("addEventListener('fetch'" not in cuerpo_sw and "caches." not in cuerpo_sw, "sin fetch ni caché: no puede servir JS viejo")
check("./avisos.js?v=" in adm.get("/cuenta.js").get_data(as_text=True), "cuenta.js importa avisos.js con su versión")
_app_js = adm.get("/app.js").get_data(as_text=True)
check("import './avisar.js?v=" in _app_js and "from './estado.js?v=" in _app_js, "app.js (la entrada) versiona también las importaciones sin nombres")
import glob as _glob
for _f in sorted(_glob.glob(os.path.join(server.ESTATICOS, "*.js"))):
    _n = os.path.basename(_f)
    if _n in ("sw.js", "tema.js"):  # scripts clásicos, sin importaciones
        continue
    _txt = adm.get("/" + _n).get_data(as_text=True)
    _sin = re.findall(r"(?:from|import)\s*['\"]\./[\w-]+\.js['\"]", _txt)
    check(not _sin, f"{_n}: todas sus importaciones llevan ?v= ({_sin[:2]})")

# backup
os.environ["BACKUP_DIR"] = os.path.join(tmp, "bk")
import backup; importlib.reload(backup)
check(backup.run() and len(os.listdir(os.environ["BACKUP_DIR"])) == 1, "backup")
# Si el respaldo falla, el admin se entera (por push, sin romper nada si no hay a quién avisar)
push.ahora = _de_dia
enviados.clear()
backup.DB_PATH = dbp
backup.avisar_fallo()
check(_a_quien() == [EP_ADM] and enviados[0][1]["etiqueta"] == "respaldo" and "respaldo" in enviados[0][1]["cuerpo"], f"el fallo del respaldo avisa al admin {enviados}")
backup.DB_PATH = "/no/existe/libro.db"
backup.avisar_fallo()  # sin base no hay a quién avisar: solo se registra, no lanza
check(len(enviados) == 1, "avisar_fallo nunca rompe el respaldo")
# Prueba de restauración del respaldo (la que corre cada semana en el servicio de respaldos)
backup.DB_PATH = dbp
backup.DEST = os.environ["BACKUP_DIR"]
check(backup.probar_restauracion() == [], f"un respaldo recién hecho se restaura bien {backup.probar_restauracion()}")
adm.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 777})
check(backup.probar_restauracion() == [], "con la base real más nueva que el respaldo, también está bien")
_ultimo = sorted(os.listdir(backup.DEST))[-1]
_ruta_bk = os.path.join(backup.DEST, _ultimo)
def _copia(nombre):
    d = os.path.join(tmp, "rest-" + nombre); shutil.copy2(_ruta_bk, d); return d
# 1) auditoría alterada en el respaldo (se le quitan los triggers para poder cambiarla)
_c1 = _copia("auditoria"); _cx = sqlite3.connect(_c1)
for (_n,) in _cx.execute("SELECT name FROM sqlite_master WHERE type = 'trigger'").fetchall():
    _cx.execute(f"DROP TRIGGER {_n}")
_cx.execute("UPDATE auditoria SET accion = 'alterada' WHERE id = (SELECT MIN(id) FROM auditoria)"); _cx.commit(); _cx.close()
_pr = backup.probar_restauracion(respaldo=_c1)
check(len(_pr) == 1 and "auditoría" in _pr[0], f"una auditoría alterada en el respaldo se detecta {_pr}")
# 2) le falta una tabla
_c2 = _copia("sintabla"); _cx = sqlite3.connect(_c2); _cx.execute("DROP TABLE traslados"); _cx.commit(); _cx.close()
_pr = backup.probar_restauracion(respaldo=_c2)
check(any("faltan tablas: traslados" in x for x in _pr), f"una tabla que falta se detecta {_pr}")
# 3) archivo dañado
_c3 = os.path.join(tmp, "rest-dañada"); open(_c3, "wb").write(b"esto no es una base de datos" * 50)
_pr = backup.probar_restauracion(respaldo=_c3)
check(len(_pr) == 1 and "dañada" in _pr[0], f"un archivo dañado se detecta {_pr}")
# 4) el respaldo tiene filas que la base real no tiene
_c4 = _copia("masfilas"); _cx = sqlite3.connect(_c4)
_cx.execute("INSERT INTO compras (fecha, monto, precio, sats, creado, tipo, extra) VALUES ('2020-01-01', 1, 50000, 2000, 1, 'compra', 0)"); _cx.commit(); _cx.close()
_vivo_n = sqlite3.connect(dbp).execute("SELECT COUNT(*) FROM compras").fetchone()[0]
_cx = sqlite3.connect(_c4); _cx.execute("INSERT INTO compras (fecha, monto, precio, sats, creado, tipo, extra) VALUES ('2020-01-02', 1, 50000, 2000, 1, 'compra', 0)")
for _i in range(5):
    _cx.execute("INSERT INTO compras (fecha, monto, precio, sats, creado, tipo, extra) VALUES ('2020-01-03', 1, 50000, 2000, 1, 'compra', 0)")
_cx.commit(); _cx.close()
_pr = backup.probar_restauracion(respaldo=_c4)
check(any("más filas de compras" in x for x in _pr), f"un respaldo con filas que la base real no tiene se detecta {_pr}")
# 5) sin respaldos
_dest_ori = backup.DEST
backup.DEST = os.path.join(tmp, "vacio"); os.makedirs(backup.DEST)
check(backup.probar_restauracion() == ["No hay ningún respaldo que probar."], "sin ningún respaldo, la prueba lo dice")
# 6) la marca semanal
check(backup.prueba_semanal() == ["No hay ningún respaldo que probar."] and os.path.exists(os.path.join(backup.DEST, backup.MARCA_PRUEBA)), "la primera vez corre y deja su marca")
check(backup.prueba_semanal() is None, "pasado menos de una semana no vuelve a correr")
check(backup.prueba_semanal(ahora=_tt.time() + 8 * 86400) is not None, "pasada una semana vuelve a correr")
backup.DEST = _dest_ori
check(subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "backup.py"), "--probar"],
                     env={**os.environ, "DB_PATH": dbp, "BACKUP_DIR": backup.DEST}, capture_output=True, text=True).returncode == 0, "backup.py --probar sale con 0 cuando todo está bien")

# --- CSV de traslados y «descargar todo» (ideas 47 y 107)
_adm = cliente()
_c3 = server.connect(); auth.crear_usuario(_c3, "Lola", "lectora-nueva-123", "lector", "prueba"); _c3.close()
_ana = cliente("Lola", "lectora-nueva-123")
sql("DELETE FROM traslados")
_adm.post("/api/compras", json={"fecha": "2026-03-01", "monto": 100, "sats": 200000}); _adm.post("/api/compras", json={"fecha": "2026-03-10", "monto": 50, "sats": 100000})
t1 = _adm.post("/api/traslados", json={"fecha": "2026-03-05", "sats": 150000, "sentido": "a_wallet", "txid": "ab" * 32, "nota": "primer, retiro"}); check(t1.status_code == 201, f"traslado de prueba {t1.data}")
t2 = _adm.post("/api/traslados", json={"fecha": "2026-03-12", "sats": 40000, "sentido": "a_exchange"}); check(t2.status_code == 201, "segundo traslado de prueba")
t3 = _adm.post("/api/traslados", json={"fecha": "2026-03-20", "sats": 1000, "sentido": "a_wallet"}); _adm.delete(f"/api/traslados/{t3.get_json()['id']}")  # uno anulado
r = _adm.get("/api/traslados.csv")
check(r.status_code == 200 and r.mimetype == "text/csv" and "traslados-btc-" in r.headers["Content-Disposition"], "traslados.csv se descarga como CSV")
_lineas = r.get_data(as_text=True).splitlines()
check(_lineas[0] == "fecha,sats,sentido,txid,nota" and len(_lineas) == 3, f"cabecera y solo los traslados vigentes {_lineas}")
check(_lineas[1] == f'2026-03-05,150000,a_wallet,{"ab" * 32},"primer, retiro"' and _lineas[2] == "2026-03-12,40000,a_exchange,,", f"las filas salen en orden y con la nota entre comillas {_lineas[1:]}")
check(nuevo().get("/api/traslados.csv").status_code == 401, "sin sesión no se exporta")
_csv = r.get_data(as_text=True)
# importar el mismo archivo: nada nuevo, todo repetido
_h = {"Content-Type": "text/csv"}
r = _adm.post("/api/traslados/import", data=_csv, headers=_h)
check(r.status_code == 200 and r.get_json() == {"nuevos": 0, "repetidos": 2, "omitidos": []}, f"importar lo mismo no duplica {r.get_json()}")
# un archivo nuevo: filas válidas, repetidas e inválidas
_mas = "fecha,sats,sentido,txid,nota\n2026-03-15,20000,a_wallet,,otro\n2026-03-05,150000,a_wallet,,\n2099-01-01,5,a_wallet,,\n2026-03-16,0,a_wallet,,\n2026-03-16,abc,a_wallet,,\n2026-03-16,100,raro,,\n"
r = _adm.post("/api/traslados/import", data=_mas, headers=_h)
_j = r.get_json()
check(r.status_code == 200 and _j["nuevos"] == 1 and _j["repetidos"] == 1 and len(_j["omitidos"]) == 4, f"importa lo bueno, salta repetidos e inválidos {_j}")
check(len(_adm.get("/api/traslados").get_json()) == 3, "ahora hay tres traslados vigentes")
check([x for x in audit() if x["accion"] == "importacion" and x["entidad"] == "traslado"], "la importación de traslados se audita")
# la wallet no puede quedar negativa ni con más de lo que posees: se rechaza TODO el archivo
_antes_n = len(_adm.get("/api/traslados").get_json())
r = _adm.post("/api/traslados/import", data="fecha,sats,sentido\n2026-03-21,1000,a_wallet\n2026-03-22,999999999,a_wallet\n", headers=_h)
check(r.status_code == 400 and "No se importó nada" in r.get_json()["error"] and len(_adm.get("/api/traslados").get_json()) == _antes_n, "un archivo que pasaría de lo que tienes se rechaza entero y no deja nada a medias")
r = _adm.post("/api/traslados/import", data="fecha,sats,sentido\n2026-03-23,200000,a_exchange\n", headers=_h)
check(r.status_code == 400 and len(_adm.get("/api/traslados").get_json()) == _antes_n, "sacar más de lo que hay en la wallet también se rechaza")
check(_adm.post("/api/traslados/import", data="a,b\n1,2\n", headers=_h).status_code == 400, "sin las columnas fecha y sats se rechaza")
check(_adm.post("/api/traslados/import", data=_csv).status_code == 415, "hay que mandarlo como text/csv")
check(nuevo().post("/api/traslados/import", data=_csv, headers={**_h, "X-Libro": "1"}).status_code == 401, "sin sesión no se importa")
if _ana:
    check(_ana.post("/api/traslados/import", data=_csv, headers=_h).status_code == 403, "una lectora no importa traslados")
    check(_ana.get("/api/traslados.csv").status_code == 200, "una lectora sí ve el CSV de traslados (los ve todos)")
    check(_ana.get("/api/todo.zip").status_code == 403, "una lectora no descarga todo")
# el ZIP
import zipfile, io as _io
r = _adm.get("/api/todo.zip")
check(r.status_code == 200 and r.mimetype == "application/zip" and "libro-dca-" in r.headers["Content-Disposition"], "todo.zip se descarga")
_z = zipfile.ZipFile(_io.BytesIO(r.data))
check(sorted(_z.namelist()) == ["LEEME.txt", "compras.csv", "traslados.csv"] and _z.testzip() is None, f"el ZIP trae LEEME, compras y traslados {_z.namelist()}")
check(_z.read("compras.csv").decode() == _adm.get("/api/export.csv").get_data(as_text=True), "compras.csv del ZIP es igual al export de compras")
check(_z.read("traslados.csv").decode() == _adm.get("/api/traslados.csv").get_data(as_text=True), "traslados.csv del ZIP es igual al export de traslados")
check(nuevo().get("/api/todo.zip").status_code == 401, "sin sesión no se descarga")
# ida y vuelta: borrar los traslados y volver a cargarlos desde el ZIP deja lo mismo
_antes_f = [(x["fecha"], x["sats"], x["sentido"], x["txid"], x["nota"]) for x in _adm.get("/api/traslados").get_json()]
sql("UPDATE traslados SET anulada_ts = 1, anulada_por = 'prueba'")
r = _adm.post("/api/traslados/import", data=_z.read("traslados.csv").decode(), headers=_h)
check(r.status_code == 200 and r.get_json()["nuevos"] == 3, f"el CSV exportado se puede volver a importar {r.get_json()}")
check(sorted((x["fecha"], x["sats"], x["sentido"], x["txid"], x["nota"]) for x in _adm.get("/api/traslados").get_json()) == sorted(_antes_f), "y deja exactamente los mismos traslados")

# --- Etiquetas en las compras (idea 56): minúsculas, hasta 5, en el CSV, la auditoría y el importador; editar sin mandarlas las conserva
_ad = cliente()
r = _ad.post("/api/compras", json={"fecha": "2026-04-01", "monto": 25, "sats": 30000, "etiquetas": ["Cumpleaños", " #BONO ", "cumpleaños", "dca mensual"]})
check(r.status_code == 201 and r.get_json()["etiquetas"] == ["cumpleaños", "bono", "dca mensual"], f"se normalizan: minúsculas, sin # ni repetidas {r.get_json().get('etiquetas')}")
_ide = r.get_json()["id"]
check(_ad.post("/api/compras", json={"fecha": "2026-04-02", "monto": 25, "sats": 30000, "etiquetas": "regalo, extra casa;cumple"}).get_json()["etiquetas"] == ["regalo", "extra casa", "cumple"], "también acepta un texto con comas o punto y coma")
_sin = _ad.post("/api/compras", json={"fecha": "2026-04-03", "monto": 25, "sats": 30000}); check(_sin.get_json()["etiquetas"] == [], "sin etiquetas es una lista vacía")
for malo, msg in ((["a", "b", "c", "d", "e", "f"], "seis etiquetas"), (["x" * 25], "una de 25 caracteres"), (["a@b"], "con símbolos"), ([1], "un número"), ({"a": 1}, "un objeto")):
    check(_ad.post("/api/compras", json={"fecha": "2026-04-04", "monto": 25, "sats": 30000, "etiquetas": malo}).status_code == 400, f"se rechaza {msg}")
r = _ad.put(f"/api/compras/{_ide}", json={"fecha": "2026-04-01", "monto": 25, "sats": 30000})
check(r.status_code == 200 and r.get_json()["etiquetas"] == ["cumpleaños", "bono", "dca mensual"], "editar sin mandar etiquetas las conserva")
r = _ad.put(f"/api/compras/{_ide}", json={"fecha": "2026-04-01", "monto": 25, "sats": 30000, "etiquetas": ["bono"]})
check(r.get_json()["etiquetas"] == ["bono"], "editar con etiquetas las reemplaza")
ed = [x for x in audit("edicion") if json.loads(x["despues"] or "{}").get("id") == _ide][-1]
check(json.loads(ed["antes"])["etiquetas"] == ["cumpleaños", "bono", "dca mensual"] and json.loads(ed["despues"])["etiquetas"] == ["bono"], "la auditoría guarda las etiquetas de antes y de después")
r = _ad.put(f"/api/compras/{_ide}", json={"fecha": "2026-04-01", "monto": 25, "sats": 30000, "etiquetas": []})
check(r.get_json()["etiquetas"] == [], "mandar una lista vacía las quita")
_ad.put(f"/api/compras/{_ide}", json={"fecha": "2026-04-01", "monto": 25, "sats": 30000, "etiquetas": ["bono", "dca mensual"]})
v = _ad.post("/api/compras", json={"fecha": "2026-04-05", "tipo": "venta", "monto": 5, "sats": 1000, "etiquetas": ["gasto"]}); check(v.status_code == 201 and v.get_json()["etiquetas"] == ["gasto"], "una venta o gasto también se etiqueta")
_csvt = _ad.get("/api/export.csv").get_data(as_text=True)
check('"bono, dca mensual"' in _csvt and _csvt.splitlines()[0].endswith(",etiquetas"), "el CSV trae la columna etiquetas")
# ida y vuelta por el importador: se anula y se vuelve a importar
_ad.delete(f"/api/compras/{_ide}")
r = _ad.post("/api/import", data=_csvt, headers={"Content-Type": "text/csv"}).get_json()
check(r["nuevas"] == 1 and r["repetidas"] >= 1, f"el importador recupera la compra anulada {r}")
_vuelta = [x for x in _ad.get("/api/compras").get_json() if x["fecha"] == "2026-04-01"][0]
check(_vuelta["etiquetas"] == ["bono", "dca mensual"], "y con sus etiquetas")
r = _ad.post("/api/import", data="fecha,monto_usd,sats,etiquetas\n2026-04-06,10,10000,\"uno, dos, tres, cuatro, cinco, seis\"\n2026-04-07,10,10000,\"ok\"\n", headers={"Content-Type": "text/csv"}).get_json()
check(r["nuevas"] == 1 and len(r["omitidas"]) == 1, f"un CSV con demasiadas etiquetas en una fila la omite {r}")
check(_ad.post("/api/import", data="fecha,monto_usd,sats\n2026-04-08,10,10000\n", headers={"Content-Type": "text/csv"}).get_json()["nuevas"] == 1, "un CSV sin la columna etiquetas entra igual")
check(server.parse_etiquetas(None) is None and server.parse_etiquetas("") is None and server.parse_etiquetas(["  "]) is None, "sin etiquetas: None")
check(server.version_esquema(server.connect()) >= 6, "la migración 6 está aplicada")

# --- Estado del sistema (ideas 53, 145, 46, 96, 74, 95)
_ad = cliente(); _lc2 = cliente("Lola", "lectora-nueva-123")
check(nuevo().get("/api/sistema").status_code == 401, "sin sesión no hay estado del sistema")
check(_lc2.get("/api/sistema").status_code == 403, "una lectora no ve el estado del sistema")
_e = _ad.get("/api/sistema"); _est = _e.get_json()
check(_e.status_code == 200 and {"version", "esquema", "respaldo", "avisos", "integridad", "disco", "cuentas", "dispositivos", "metricas", "errores"} <= set(_est), f"el admin ve el estado {sorted(_est)}")
check(_est["version"] == server.VERSION and _est["esquema"] == server.VERSION_ESQUEMA and _est["disco"]["libre"] > 0, "versión, esquema y disco")
check(_est["respaldo"]["ultimo"] is not None and _est["respaldo"]["ok"], "el último respaldo (el de las pruebas) aparece y está al día")
check(not any(k in json.dumps(_est) for k in ("p256dh", "endpoint", "auth\"", "vapid", "hash")), "el estado no trae claves, endpoints ni hashes")
# dispositivos: solo estados
_ep_sis = "https://fcm.googleapis.com/fcm/send/sistema-prueba"
_ad.post("/api/push/suscribir", json=_sus(_ep_sis))
_dv = [d for d in _ad.get("/api/sistema").get_json()["dispositivos"] if d["tipo"].startswith("Google") and d["usuario"] == "Daf3r"]
check(_dv and set(_dv[0]) == {"usuario", "tipo", "creado", "ultimo_ok", "fallos", "categorias"} and "recordatorio" in _dv[0]["categorias"], f"dispositivos con avisos: usuario, tipo, fechas y categorías {_dv[:1]}")
_ad.post("/api/push/baja", json={"endpoint": _ep_sis})
# Idea 46: el chequeo contable detecta lo que no cuadra y no corrige nada
check(server.chequeo_contable(server.connect()) == [] and _ad.get("/api/sistema").get_json()["cuentas"] == [], "con las cuentas bien, el chequeo no dice nada")
_cc = server.connect()
_cv = _cc.execute("INSERT INTO compras (fecha, monto, precio, sats, creado, tipo) VALUES ('2026-05-02', 5, 100000, 100000000000, 2, 'venta')").lastrowid  # una venta imposible, metida «por fuera»
_cc.commit()
_pb = server.chequeo_contable(_cc)
check(len(_pb) >= 1 and "negativo" in _pb[0], f"detecta el saldo negativo {_pb}")
check(_ad.get("/api/sistema").get_json()["cuentas"] == _pb, "y el estado lo muestra")
_antes = _cc.execute("SELECT COUNT(*) FROM compras WHERE anulada_ts IS NULL").fetchone()[0]
server.chequeo_contable(_cc); check(_cc.execute("SELECT COUNT(*) FROM compras WHERE anulada_ts IS NULL").fetchone()[0] == _antes, "el chequeo nunca modifica nada")
_cc.execute("DELETE FROM compras WHERE id = ?", (_cv,)); _cc.commit()
check(server.chequeo_contable(_cc) == [], "al arreglarlo el chequeo vuelve a no decir nada")
# traslado de más: una venta que baja el total por debajo de lo que hay en la wallet
_n_sin = _cc.execute("SELECT COUNT(*) FROM traslados WHERE anulada_ts IS NULL").fetchone()[0]
_cc.execute("INSERT INTO traslados (fecha, sats, sentido, creado) VALUES ('2026-05-01', 100000000000, 'a_wallet', 1)"); _cc.commit()
check(any("traslados" in x.lower() for x in server.chequeo_contable(_cc)), "detecta una wallet con más sats de los que hay")
_cc.execute("DELETE FROM traslados WHERE sats = 100000000000"); _cc.commit()
check(server.chequeo_contable(_cc) == [], "al arreglar los traslados el chequeo vuelve a no decir nada")
_cc.close()
# Avisos push por cuentas que no cuadran (una vez por problema, no corrige)
_ccn = server.connect()
_ccn.execute("DELETE FROM meta WHERE clave = 'aviso_cuentas'"); _ccn.commit()
_enviados2: list = []
_orig_not = avisos.push.notificar
avisos.push.notificar = lambda c, cat, t, cu, et: _enviados2.append((cat, cu, et)) or 1
try:
    check(avisos._cuentas(_ccn) is False and not _enviados2, "cuentas bien: no avisa")
    _ccn.execute("INSERT INTO traslados (fecha, sats, sentido, creado) VALUES ('2026-05-01', 100000000000, 'a_wallet', 1)"); _ccn.commit()
    check(avisos._cuentas(_ccn) is True and len(_enviados2) == 1 and _enviados2[0][0] == "respaldo" and "no cuadra" in _enviados2[0][1], "un problema nuevo avisa al admin")
    check(avisos._cuentas(_ccn) is False and len(_enviados2) == 1, "el mismo problema no vuelve a avisar")
    _ccn.execute("DELETE FROM traslados WHERE sats = 100000000000"); _ccn.commit()
    check(avisos._cuentas(_ccn) is False and len(_enviados2) == 1, "si se arregla, se anota en silencio")
finally:
    avisos.push.notificar = _orig_not
    _ccn.close()
# Idea 96: métricas por ruta (la regla, no la URL) y X-Request-ID (idea 95)
server.vaciar_metricas()
_r = _ad.get("/api/compras"); _rid = _r.headers.get("X-Request-ID")
check(_rid and re.fullmatch(r"[0-9a-f]{12}", _rid), f"cada respuesta lleva su X-Request-ID {_rid}")
check(_ad.get("/api/compras", headers={"X-Request-ID": "mi-id-de-prueba-123"}).headers["X-Request-ID"] == "mi-id-de-prueba-123", "respeta el identificador que manda Caddy")
check(_ad.get("/api/compras", headers={"X-Request-ID": "<script>"}).headers["X-Request-ID"] != "<script>", "uno raro se reemplaza")
_ad.get("/api/no-existe-esta-ruta"); _ad.get("/api/tx/" + "ab" * 32)
_m = {x["ruta"]: x for x in _ad.get("/api/sistema").get_json()["metricas"]}
check(_m["/api/compras"]["n"] >= 3 and _m["/api/compras"]["ms_max"] >= _m["/api/compras"]["ms_medio"] >= 0, f"cuenta las peticiones por ruta {_m.get('/api/compras')}")
check("api: no existe" in _m and "/api/tx/<txid>" in _m or "/api/tx/<txid>" in str(_m), f"usa la regla de la ruta, no la URL con datos {sorted(_m)}")
check(not any("ab" * 16 in r for r in _m) and "/healthz" not in _m and not any(r.endswith(".js") for r in _m), "sin TXID, sin /healthz y sin archivos estáticos")
check(server.version_esquema(server.connect()) == server.VERSION_ESQUEMA, "el esquema incluye las tablas de métricas y errores")
# Idea 74: errores del navegador (también de un lector), con límites
_c0 = server.connect(); _c0.execute("DELETE FROM errores_js"); _c0.commit(); _c0.close()
server._ERR_RECIENTES.clear()
r = _lc2.post("/api/errores", json={"pantalla": "/", "mensaje": "TypeError: x is undefined en https://dca.polarzero.dev/app.js?v=abc123 con 123456789 y yo@correo.com"},
              headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Safari/604.1"})
check(r.status_code == 204, "un lector puede reportar un error")
_er = _ad.get("/api/sistema").get_json()["errores"]
check(len(_er) == 1 and "dca.polarzero.dev" not in _er[0]["mensaje"] and "123456789" not in _er[0]["mensaje"] and "yo@correo.com" not in _er[0]["mensaje"], f"el mensaje se guarda sin enlaces, correos ni números largos {_er}")
check(_er[0]["agente"] == "Safari · iPhone" and _er[0]["pantalla"] == "/" and _er[0]["usuario"] == "Lola" and _er[0]["n"] == 1, f"agente corto, pantalla y quién {_er[0]}")
_lc2.post("/api/errores", json={"pantalla": "/", "mensaje": "TypeError: x is undefined en https://otro.example/x.js con 987654321 y otra@correo.com"},
          headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Safari/604.1"})
check(_ad.get("/api/sistema").get_json()["errores"][0]["n"] == 2, "el mismo error repetido suma, no llena la tabla")
check(_lc2.post("/api/errores", json={"pantalla": "/<script>", "mensaje": "raro"}).status_code == 204 and any(e["pantalla"] == "/" for e in _ad.get("/api/sistema").get_json()["errores"]), "una pantalla rara se guarda como «/»")
for malo in ({}, {"mensaje": ""}, {"mensaje": 5}, {"mensaje": "   "}):
    check(_lc2.post("/api/errores", json=malo).status_code == 400, f"se rechaza {malo}")
check(nuevo().post("/api/errores", json={"mensaje": "x"}, headers={"X-Libro": "1"}).status_code == 401, "sin sesión no se reporta")
check(_lc2.delete("/api/errores").status_code == 403, "una lectora no limpia la lista")
server._ERR_RECIENTES.clear()
_cod = [_lc2.post("/api/errores", json={"mensaje": f"error distinto {i}"}).status_code for i in range(25)]
check(_cod[:20] == [204] * 20 and _cod[20:] == [429] * 5, f"pasadas 20 en 10 minutos se frena a esa cuenta {_cod[18:22]}")
check(len(_ad.get("/api/sistema").get_json()["errores"]) <= 20, "el estado trae como mucho 20")
_c0 = server.connect(); check(_c0.execute("SELECT COUNT(*) FROM errores_js").fetchone()[0] <= server.ERR_FILAS, "la tabla guarda como mucho 100"); _c0.close()
r = _ad.delete("/api/errores"); check(r.status_code == 200 and r.get_json()["quitados"] >= 20 and _ad.get("/api/sistema").get_json()["errores"] == [], "el admin limpia la lista")
server._ERR_RECIENTES.clear()
check(server._agente_corto("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537 Edg/120") == "Edge · Windows" and server._agente_corto("x") == "otro · otro", "agente corto")

# --- Sesiones abiertas (152), dispositivo compartido (105), límite de escrituras (151), solo lectura (150)
def _entrar(nombre, clave, ua=None, **extra):
    c = nuevo(); h = {"User-Agent": ua} if ua else {}
    r = c.post("/api/login", json={"usuario": nombre, "clave": clave, **extra}, headers=h); assert r.status_code == 200, r.data
    return c, r
_UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
_UA_PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
sql("DELETE FROM sesiones WHERE usuario_id = (SELECT id FROM usuarios WHERE nombre = 'Lola')")
l1, _ = _entrar("Lola", "lectora-nueva-123", _UA_IPHONE)
l2, _ = _entrar("Lola", "lectora-nueva-123", _UA_PC)   # entrar invalida solo la cookie de ESTE cliente, no la del otro
ss = l1.get("/api/sesiones").get_json()
check(len(ss) == 2 and sum(x["actual"] for x in ss) == 1, f"dos sesiones abiertas, una marcada como la de este dispositivo {ss}")
check(sorted(x["agente"] for x in ss) == ["Chrome · Windows", "Safari · iPhone"], "el dispositivo se resume («Chrome · Windows»), no se guarda el texto del navegador")
check(all(set(x) == {"id", "actual", "creada", "ultima", "caduca", "agente", "compartida"} and re.fullmatch(r"[0-9a-f]{12}", x["id"]) for x in ss), "solo id corto, fechas y agente: nada que sirva para robar una sesión")
check(not any(len(str(v)) >= 40 for x in ss for v in x.values()), "ningún valor largo (ni token ni hash completo)")
check(nuevo().get("/api/sesiones").status_code == 401, "sin sesión no se ve la lista")
check(len(_adm.get("/api/sesiones").get_json()) >= 1 and all(x["agente"] for x in _adm.get("/api/sesiones").get_json()), "cada cuenta ve solo las suyas")
actual = [x for x in ss if x["actual"]][0]; otra = [x for x in ss if not x["actual"]][0]
check(l1.delete(f"/api/sesiones/{actual['id']}").status_code == 404, "la sesión de este dispositivo no se cierra por aquí (para eso está Salir)")
check(l1.delete("/api/sesiones/xxxxxxxxxxxx").status_code == 404 and l1.delete("/api/sesiones/" + "0" * 12).status_code == 404, "un id raro o inexistente da 404")
check(_adm.delete(f"/api/sesiones/{otra['id']}").status_code == 404, "no se puede cerrar la sesión de otra persona")
check(l2.get("/api/yo").status_code == 200, "antes de cerrarla, la otra sesión funciona")
r = l1.delete(f"/api/sesiones/{otra['id']}")
check(r.status_code == 204 and l2.get("/api/yo").status_code == 401 and l1.get("/api/yo").status_code == 200, "cerrar una sesión ajena la deja sin acceso y no toca la actual")
check(len(l1.get("/api/sesiones").get_json()) == 1, "la lista se actualiza")
check([x for x in audit() if x["accion"] == "sesion_cerrada"], "cerrar una sesión se audita")
check(nuevo().delete(f"/api/sesiones/{otra['id']}", headers={"X-Libro": "1"}).status_code == 401, "sin sesión no se cierra nada")
# dispositivo compartido
c_comp, r = _entrar("Lola", "lectora-nueva-123", _UA_PC, compartido=True)
check(r.get_json()["compartido"] is True and "Max-Age=14400" in r.headers["Set-Cookie"], f"la cookie de un dispositivo compartido dura 4 horas {r.headers['Set-Cookie'][:120]}")
_hc = [x for x in c_comp.get("/api/sesiones").get_json() if x["actual"]][0]
check(_hc["compartida"] is True and _hc["caduca"] - _hc["creada"] <= auth.SESION_COMPARTIDA_INACTIVA, "la sesión compartida caduca en una hora sin usarse")
check(c_comp.get("/api/yo").status_code == 200, "una sesión compartida funciona")
import time as _tt2
_ahora = int(_tt2.time())
sql("UPDATE sesiones SET creada = ?, ultima = ?, caduca = ? WHERE substr(hash, 1, 12) = ?", (_ahora - 5 * 3600, _ahora - 60, _ahora + 3000, _hc["id"]))
check(c_comp.get("/api/yo").status_code == 401, "pasadas 4 horas desde que entró, se cierra aunque la usen (tope duro)")
c_comp, _ = _entrar("Lola", "lectora-nueva-123", _UA_PC, compartido=True); _hc = [x for x in c_comp.get("/api/sesiones").get_json() if x["actual"]][0]
sql("UPDATE sesiones SET ultima = ?, caduca = ? WHERE substr(hash, 1, 12) = ?", (_ahora - 4000, _ahora - 400, _hc["id"]))
check(c_comp.get("/api/yo").status_code == 401, "una hora sin usarse la cierra")
c_comp, _ = _entrar("Lola", "lectora-nueva-123", _UA_PC, compartido=True); _hc = [x for x in c_comp.get("/api/sesiones").get_json() if x["actual"]][0]
sql("UPDATE sesiones SET ultima = ?, caduca = ? WHERE substr(hash, 1, 12) = ?", (_ahora - 400, _ahora + 3200, _hc["id"]))
c_comp.get("/api/yo")
_nueva = [x for x in c_comp.get("/api/sesiones").get_json() if x["actual"]][0]
check(_nueva["caduca"] - _ahora >= 3500 and _nueva["caduca"] <= _nueva["creada"] + auth.SESION_COMPARTIDA_TOPE, "usarla la renueva (cada 5 min) sin pasar del tope de 4 horas")
c_norm, r = _entrar("Lola", "lectora-nueva-123", _UA_PC, compartido="si")
check(r.get_json()["compartido"] is False and "Max-Age=7776000" in r.headers["Set-Cookie"], "sin marcar la casilla (o con un valor raro) la sesión es la de siempre: 90 días")
_hn = [x for x in c_norm.get("/api/sesiones").get_json() if x["actual"]][0]
check(_hn["compartida"] is False and _hn["caduca"] - _hn["creada"] >= 80 * 86400, "la normal sigue en 90 días deslizantes")
# Límite de escrituras por cuenta (151)
_lim = server.LIMITE_ESCRITURAS
try:
    server.LIMITE_ESCRITURAS = 5; server._ESCRITURAS.clear()
    _cod = [c_norm.post("/api/visto", json={}).status_code for _ in range(8)]
    check(_cod == [200] * 5 + [429] * 3, f"pasado el límite por minuto se frena a esa cuenta {_cod}")
    r = c_norm.post("/api/visto", json={})
    check(r.headers.get("Retry-After") == "60" and "Demasiadas" in r.get_json()["error"], "con su Retry-After y un mensaje claro")
    check(c_norm.get("/api/yo").status_code == 200 and c_norm.get("/api/compras").status_code == 200, "las lecturas nunca se frenan")
    check(_adm.post("/api/visto", json={}).status_code == 200, "las otras cuentas no se ven afectadas")
    check(c_norm.post("/api/logout", json={}).status_code == 200, "salir nunca se frena")
    server._ESCRITURAS["Lola"].clear() if "Lola" in server._ESCRITURAS else None
finally:
    server.LIMITE_ESCRITURAS = _lim; server._ESCRITURAS.clear()
# Modo solo lectura de emergencia (150)
_ant_sl = server.SOLO_LECTURA
try:
    server.SOLO_LECTURA = True
    n_antes = len(_adm.get("/api/compras").get_json())
    r = _adm.post("/api/compras", json={"fecha": "2026-05-05", "monto": 10, "sats": 10000})
    check(r.status_code == 503 and r.get_json()["mantenimiento"] is True and "mantenimiento" in r.get_json()["error"], f"con SOLO_LECTURA no se escribe {r.status_code}")
    check(_adm.put("/api/compras/1", json={"fecha": "2026-05-05", "monto": 10, "sats": 10000}).status_code == 503 and _adm.delete("/api/compras/1").status_code == 503, "ni editar ni anular")
    check(_adm.post("/api/traslados", json={"fecha": "2026-05-05", "sats": 10}).status_code == 503 and _adm.post("/api/import", data="fecha,monto_usd,sats\n2026-05-05,1,100\n", headers={"Content-Type": "text/csv"}).status_code == 503, "ni traslados ni importar")
    check(_adm.post("/api/visto", json={}).status_code == 503 and _adm.post("/api/errores", json={"mensaje": "x"}).status_code == 503, "ni siquiera las marcas menores")
    check(len(_adm.get("/api/compras").get_json()) == n_antes and _adm.get("/api/export.csv").status_code == 200 and _adm.get("/api/sistema").status_code == 200, "todo lo demás se puede mirar")
    check(_adm.get("/api/yo").get_json()["mantenimiento"] is True, "/api/yo lo dice (la pantalla lo avisa)")
    c_nuevo, r = _entrar("Daf3r", CLAVE_ADMIN)
    check(r.status_code == 200 and c_nuevo.post("/api/logout", json={}).status_code == 200, "entrar y salir siguen funcionando")
    check(nuevo().post("/api/login", json={"usuario": "Daf3r", "clave": "mala-mala-mala"}).status_code == 401, "y un login mal sigue dando 401, no 503")
finally:
    server.SOLO_LECTURA = _ant_sl
check(_adm.get("/api/yo").get_json()["mantenimiento"] is False and _adm.post("/api/visto", json={}).status_code == 200, "al quitarlo, todo vuelve a la normalidad")

# --- Respaldos cifrados (idea 153)
import hashlib as _hl
_bk_dir = os.path.join(tmp, "bk-cifrado"); os.makedirs(_bk_dir)
_dest0, _db0, _env0 = backup.DEST, backup.DB_PATH, os.environ.get("BACKUP_CLAVE")
try:
    backup.DEST = _bk_dir; backup.DB_PATH = dbp
    os.environ["BACKUP_CLAVE"] = "clave-larga-de-pruebas-153"
    check(backup.run() is True, "un respaldo con clave se hace")
    _arch = sorted(os.listdir(_bk_dir))
    check(len(_arch) == 1 and _arch[0].endswith(".db.cifrado") and not any(f.endswith(".db") or f.endswith(".tmp") for f in _arch), f"queda solo la copia cifrada, sin la de en claro {_arch}")
    _crudo = open(os.path.join(_bk_dir, _arch[0]), "rb").read()
    check(_crudo.startswith(backup.MAGIA) and b"SQLite format" not in _crudo and b"Daf3r" not in _crudo, "el archivo no contiene la base ni nombres en claro")
    check(salud.ultimo_respaldo(_bk_dir) is not None and backup.respaldos(_bk_dir) == [os.path.join(_bk_dir, _arch[0])], "salud y la lista de respaldos lo ven")
    check(backup.probar_restauracion() == [], f"la prueba de restauración abre el cifrado con la clave {backup.probar_restauracion()}")
    _dd = os.path.join(tmp, "desc.db"); backup.descifrar_archivo(os.path.join(_bk_dir, _arch[0]), _dd, "clave-larga-de-pruebas-153")
    check(sqlite3.connect(_dd).execute("SELECT COUNT(*) FROM compras").fetchone()[0] > 0, "descifrado, es una base con sus compras")
    try:
        backup.descifrar_archivo(os.path.join(_bk_dir, _arch[0]), _dd, "otra-clave"); _mal = False
    except ValueError as e:
        _mal = "clave" in str(e)
    check(_mal, "con otra clave no se abre (y lo dice)")
    # alterar un byte: se detecta
    _alt = bytearray(_crudo); _alt[-5] ^= 1; open(os.path.join(tmp, "alt.db.cifrado"), "wb").write(_alt)
    try:
        backup.descifrar_archivo(os.path.join(tmp, "alt.db.cifrado"), _dd, "clave-larga-de-pruebas-153"); _mal = False
    except ValueError:
        _mal = True
    check(_mal, "un archivo alterado no se descifra (GCM autentica)")
    # restaurar desde el cifrado
    _rd = os.path.join(tmp, "restaurada-cifrada.db")
    _u, _p = backup.restaurar(None, _rd)
    check(_p == [] and os.path.exists(_rd), f"restaurar desde un respaldo cifrado {_p}")
    check(sqlite3.connect(_rd).execute("SELECT COUNT(*) FROM compras").fetchone()[0] > 0, "y la base restaurada trae las compras")
    # sin la clave: no se puede abrir y lo explica
    del os.environ["BACKUP_CLAVE"]
    _p = backup.restaurar(None, os.path.join(tmp, "sin-clave.db"))[1]
    check(_p and "BACKUP_CLAVE" in _p[0] and not os.path.exists(os.path.join(tmp, "sin-clave.db")), "sin la clave no restaura nada y dice qué falta")
    check(backup.probar_restauracion() and "BACKUP_CLAVE" in backup.probar_restauracion()[0], "la prueba semanal también lo dice")
    # clave en archivo
    _kf = os.path.join(tmp, "clave.txt"); open(_kf, "w").write("clave-larga-de-pruebas-153\n"); os.environ["BACKUP_CLAVE_ARCHIVO"] = _kf
    check(backup.probar_restauracion() == [], "la clave también puede venir de un archivo")
    del os.environ["BACKUP_CLAVE_ARCHIVO"]
    # sin clave: respaldo en claro como siempre, y conviven en la carpeta
    _tt2.sleep(1.1)
    check(backup.run() is True and len(backup.respaldos(_bk_dir)) == 2 and any(f.endswith(".db") for f in os.listdir(_bk_dir)), "sin clave se respalda en claro y conviven con los cifrados")
    _keep0 = backup.KEEP; backup.KEEP = 1
    _tt2.sleep(1.1)
    backup.run()
    check(len(backup.respaldos(_bk_dir)) == 1, "la retención cuenta cifrados y en claro por igual")
    backup.KEEP = _keep0
finally:
    backup.DEST, backup.DB_PATH = _dest0, _db0
    os.environ.pop("BACKUP_CLAVE_ARCHIVO", None)
    if _env0 is None: os.environ.pop("BACKUP_CLAVE", None)
    else: os.environ["BACKUP_CLAVE"] = _env0

# --- Commit desplegado (idea 97): VERSION_GIT llega del build y se muestra en «Estado del sistema»; nada raro entra
check(server._leer_version_git("1d736a6") == "1d736a6" and server._leer_version_git(" abcdef0123456789abcdef0123456789abcdef01\n") == "abcdef0123456789abcdef0123456789abcdef01", "un commit válido pasa")
check(all(server._leer_version_git(x) == "" for x in ("", "abc", "XYZ123", "1d736a6; rm -rf /", "<script>", "g" * 12, "a" * 41)), "lo que no es un hash corto o largo queda vacío")
check(_ad.get("/api/sistema").get_json()["commit"] == server.VERSION_GIT[:12], "el estado del sistema trae el commit (vacío si no se desplegó con VERSION_GIT)")

# --- Restaurar de verdad (idea 48): del respaldo a una base nueva, con todo igual, y reemplazando una base con su WAL viejo
def _todo(ruta):
    """Todas las filas de todas las tablas de una base, para compararlas tal cual."""
    c0 = sqlite3.connect(ruta)
    try:
        tablas = [r[0] for r in c0.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        return {t: c0.execute(f"SELECT * FROM {t} ORDER BY rowid").fetchall() for t in tablas}
    finally:
        c0.close()
_bk = sorted(os.path.join(backup.DEST, f) for f in os.listdir(backup.DEST) if f.startswith("libro-"))[-1]
_dst = os.path.join(tmp, "restauradas", "libro.db")
_usado, _prob = backup.restaurar(_bk, _dst)
check(_usado == _bk and _prob == [] and os.path.exists(_dst), f"restaurar deja la base en el destino {_prob}")
check(_todo(_dst) == _todo(_bk), "la base restaurada tiene exactamente las mismas filas que el respaldo, tabla por tabla")
_cr = sqlite3.connect(_dst); check(_cr.execute("PRAGMA integrity_check").fetchone()[0] == "ok", "la restaurada pasa la revisión de integridad"); _cr.close()
_ant = server.DB_PATH; server.DB_PATH = _dst
try:
    server.init_db(); _cr = server.connect()
    check(server.version_esquema(_cr) == server.VERSION_ESQUEMA and _cr.execute("SELECT COUNT(*) FROM compras").fetchone()[0] > 0, "la app abre la base restaurada y su esquema está al día")
    _cr.close()
finally:
    server.DB_PATH = _ant
check(backup.restaurar(_bk, _dst)[1] and "--reemplazar" in backup.restaurar(_bk, _dst)[1][0], "sin --reemplazar no pisa una base que ya existe")
# reemplazar: la actual se guarda como .antes (con su WAL) y no queda nada del WAL viejo junto a la nueva
open(_dst + "-wal", "wb").write(b"basura de una sesion anterior"); open(_dst + "-shm", "wb").write(b"x")
check(backup.restaurar(_bk, _dst, reemplazar=True)[1] == [], "con --reemplazar restaura encima")
_antes = [f for f in os.listdir(os.path.dirname(_dst)) if ".antes-" in f]
check(len(_antes) == 3 and not os.path.exists(_dst + "-wal") and not os.path.exists(_dst + "-shm"), f"la anterior se guarda como .antes (con -wal y -shm) y el WAL viejo no se queda junto a la nueva {_antes}")
check(_todo(_dst) == _todo(_bk), "tras reemplazar la base vuelve a ser igual al respaldo")
# respaldos malos no tocan nada
_malo = os.path.join(tmp, "malo.db"); open(_malo, "wb").write(b"esto no es una base de datos" * 50)
_d2 = os.path.join(tmp, "restauradas", "otra.db")
check(backup.restaurar(_malo, _d2)[1] and not os.path.exists(_d2), "un archivo que no es una base no restaura nada")
_sin = os.path.join(tmp, "sin-tablas.db"); _cs = sqlite3.connect(_sin); _cs.execute("CREATE TABLE x (a)"); _cs.commit(); _cs.close()
check("faltan tablas" in backup.restaurar(_sin, _d2)[1][0] and not os.path.exists(_d2), "un respaldo sin las tablas clave no restaura nada")
check(backup.restaurar(os.path.join(tmp, "nada.db"), _d2)[1] and not os.path.exists(_d2), "un respaldo que no existe se dice y no hace nada")
_dest_v = backup.DEST; backup.DEST = os.path.join(tmp, "vacio")
check(backup.restaurar(None, _d2)[1] == ["No hay ningún respaldo que restaurar."], "sin ningún respaldo se dice")
backup.DEST = _dest_v
# la línea de comandos: por defecto el más reciente y un destino explícito
_r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "backup.py"), "--restaurar", "--a", _d2],
                    env={**os.environ, "DB_PATH": dbp, "BACKUP_DIR": backup.DEST}, capture_output=True, text=True)
check(_r.returncode == 0 and os.path.exists(_d2) and "restaurado" in _r.stdout, f"backup.py --restaurar --a RUTA restaura el último respaldo {_r.stderr}")
_r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "backup.py"), "--restaurar", "--a", _d2],
                    env={**os.environ, "DB_PATH": dbp, "BACKUP_DIR": backup.DEST}, capture_output=True, text=True)
check(_r.returncode == 1 and "--reemplazar" in _r.stderr, "y si ya existe, sale con 1 y explica")

# --- ETag en las lecturas grandes (idea 165): «304 sin cambios» y la API sigue en no-store
ce = cliente()
for ruta in ("/api/compras", "/api/traslados"):
    r1 = ce.get(ruta)
    et = r1.headers.get("ETag")
    check(r1.status_code == 200 and et and et.startswith('"') and r1.headers["Cache-Control"] == "no-store", f"{ruta}: trae ETag y sigue en no-store")
    r2 = ce.get(ruta, headers={"If-None-Match": et})
    check(r2.status_code == 304 and r2.data == b"" and r2.headers["ETag"] == et and r2.headers["Cache-Control"] == "no-store", f"{ruta}: con el mismo ETag contesta 304 sin cuerpo")
    check(ce.get(ruta, headers={"If-None-Match": '"otro"'}).status_code == 200, f"{ruta}: con otro ETag manda todo")
    check(ce.get(ruta, headers={"If-None-Match": f"W/{et}"}).status_code == 304, f"{ruta}: acepta el ETag débil")
r1 = ce.get("/api/compras")
nuevo = ce.post("/api/compras", json={"fecha": "2026-01-05", "monto": 10, "sats": 10000})
check(nuevo.status_code == 201, "ETag: una compra nueva se guarda")
r3 = ce.get("/api/compras", headers={"If-None-Match": r1.headers["ETag"]})
check(r3.status_code == 200 and r3.headers["ETag"] != r1.headers["ETag"] and any(x["id"] == nuevo.get_json()["id"] for x in r3.get_json()), "ETag: tras un cambio el ETag viejo ya no vale y llega la lista nueva")
ce.delete(f"/api/compras/{nuevo.get_json()['id']}")
check(ce.get("/api/estado").headers.get("ETag") is None, "ETag: solo las lecturas grandes lo llevan")
check(anon.get("/api/compras", headers={"If-None-Match": r1.headers["ETag"]}).status_code in (401, 503), "ETag: sin sesión no se saca nada con el ETag de otro")

# --- Limpieza automática de tablas que solo crecen (idea 50): quita lo viejo sin tocar compras, traslados, cuentas ni auditoría
_lc = server.connect()
try:
    _ya = 2_000_000_000
    _viejo = _ya - 100 * 86400
    _tx_vivo, _tx_huerfano, _tx_cerrado, _tx_abierto = ("1f" * 32, "2e" * 32, "3d" * 32, "4c" * 32)
    _lc.execute("DELETE FROM tx_vigilados"); _lc.execute("DELETE FROM tx_cache"); _lc.execute("DELETE FROM avisos_pendientes"); _lc.execute("DELETE FROM suscripciones"); _lc.execute("DELETE FROM meta WHERE clave LIKE 'aviso_recordatorio_dia:%'")
    _lc.execute("INSERT INTO compras (fecha, monto, precio, sats, creado, txid) VALUES ('2026-01-02', 10, 100000, 10000, 1, ?)", (_tx_vivo,))
    for t in (_tx_vivo, _tx_huerfano):
        _lc.execute("INSERT INTO tx_cache (txid, estado, ts) VALUES (?, 'confirmada', ?)", (t, _viejo))
    _lc.execute("INSERT INTO tx_vigilados (txid, creado, cerrado) VALUES (?, ?, 1)", (_tx_cerrado, _viejo))
    _lc.execute("INSERT INTO tx_vigilados (txid, creado, cerrado) VALUES (?, ?, 0)", (_tx_abierto, _viejo))
    _lc.execute("INSERT INTO tx_vigilados (txid, creado, cerrado) VALUES (?, ?, 1)", ("5b" * 32, _ya - 86400))
    _lc.execute("INSERT INTO avisos_pendientes (categoria, titulo, cuerpo, etiqueta, creado) VALUES ('movimiento','t','c','e',?)", (_viejo,))
    _lc.execute("INSERT INTO avisos_pendientes (categoria, titulo, cuerpo, etiqueta, creado) VALUES ('movimiento','t','c','e',?)", (_ya - 3600,))
    _uid = _lc.execute("SELECT id FROM usuarios LIMIT 1").fetchone()[0]
    for ep, fallos, ult, creado in (("https://fcm.googleapis.com/muerto", 5, _viejo, _viejo), ("https://fcm.googleapis.com/sano-sin-envios", 0, None, _viejo),
                                    ("https://fcm.googleapis.com/falla-reciente", 5, _ya - 86400, _viejo), ("https://fcm.googleapis.com/nunca-respondio", 4, None, _viejo)):
        _lc.execute("INSERT INTO suscripciones (usuario_id, endpoint, p256dh, auth, prefs, creado, ultimo_ok, fallos) VALUES (?, ?, 'k', 'a', '{}', ?, ?, ?)", (_uid, ep, creado, ult, fallos))
    _sid = _lc.execute("SELECT id FROM suscripciones WHERE endpoint LIKE '%sano-sin-envios'").fetchone()[0]
    _lc.execute("DELETE FROM meta WHERE clave LIKE 'prueba_aviso:%' OR clave LIKE 'aviso_wallet:%'")  # restos de las pruebas de arriba (ya probadas aparte)
    server._meta_poner(_lc, f"aviso_recordatorio_dia:{_sid}", "2026-01-01"); server._meta_poner(_lc, "aviso_recordatorio_dia:99999", "2026-01-01")
    _lc.commit()
    _compras_antes = _lc.execute("SELECT COUNT(*) FROM compras").fetchone()[0]
    _aud_antes = _lc.execute("SELECT COUNT(*) FROM auditoria").fetchone()[0]
    _usr_antes = _lc.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]
    _n = avisos.limpiar(_lc, ahora=_ya)
    check(_n == {"tx_vigilados": 1, "tx_cache": 1, "avisos_pendientes": 1, "suscripciones": 2, "meta": 1}, f"la limpieza quita solo lo viejo e inútil {_n}")
    check({r[0] for r in _lc.execute("SELECT txid FROM tx_cache")} == {_tx_vivo}, "la caché conserva el TXID de un movimiento que sigue ahí")
    check({r[0] for r in _lc.execute("SELECT txid FROM tx_vigilados")} == {_tx_abierto, "5b" * 32}, "un TXID abierto o cerrado hace poco se conserva")
    check([r[0].rsplit("/", 1)[1] for r in _lc.execute("SELECT endpoint FROM suscripciones ORDER BY endpoint")] == ["falla-reciente", "sano-sin-envios"],
          "se van los dispositivos con fallos y sin envíos en 90 días; el sano que no ha recibido nada se queda")
    check(_lc.execute("SELECT COUNT(*) FROM avisos_pendientes").fetchone()[0] == 1, "un aviso pendiente reciente se conserva")
    check([r[0] for r in _lc.execute("SELECT clave FROM meta WHERE clave LIKE 'aviso_recordatorio_dia:%'")] == [f"aviso_recordatorio_dia:{_sid}"], "la marca de un dispositivo que ya no existe se va")
    check((_lc.execute("SELECT COUNT(*) FROM compras").fetchone()[0], _lc.execute("SELECT COUNT(*) FROM auditoria").fetchone()[0],
           _lc.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]) == (_compras_antes, _aud_antes, _usr_antes), "compras, auditoría y cuentas no se tocan")
    check(avisos.limpiar(_lc, ahora=_ya) == {"tx_vigilados": 0, "tx_cache": 0, "avisos_pendientes": 0, "suscripciones": 0, "meta": 0}, "una segunda limpieza no encuentra nada")
    server._meta_poner(_lc, "limpieza_dia", ""); _lc.commit()
    check(avisos._limpieza(_lc) is not None and avisos._limpieza(_lc) is None, "la limpieza corre una vez al día")
    _lc.execute("DELETE FROM compras WHERE txid = ?", (_tx_vivo,)); _lc.execute("DELETE FROM suscripciones"); _lc.commit()
finally:
    _lc.close()

# --- Campamento 9: enlace de solo lectura para hojas de cálculo (idea 159)
adm_t = adm
check(adm_t.get("/api/tokens").get_json() == [], "al principio no hay enlaces")
check(luz.get("/api/tokens").status_code == 403 and luz.post("/api/tokens", json={"nombre": "x"}).status_code == 403, "un lector no maneja los enlaces")
check(anon.get("/api/tokens").status_code == 401 and anon.post("/api/tokens", json={"nombre": "x"}).status_code == 401, "sin sesión tampoco")
check(adm_t.post("/api/tokens", json={}).status_code == 400 and adm_t.post("/api/tokens", json={"nombre": "   "}).status_code == 400
      and adm_t.post("/api/tokens", json={"nombre": 5}).status_code == 400, "el enlace pide un nombre")
r = adm_t.post("/api/tokens", json={"nombre": "  Mi   hoja de Google  "})
tk = r.get_json()
check(r.status_code == 201 and len(tk["token"]) >= 40 and tk["rutas"]["compras"] == f"/api/token/{tk['token']}/compras.csv", f"se crea y el token se muestra una vez {r.status_code}")
lista = adm_t.get("/api/tokens").get_json()
check(len(lista) == 1 and lista[0]["nombre"] == "Mi hoja de Google" and "token" not in lista[0] and "hash" not in lista[0] and lista[0]["ultimo_uso"] is None
      and tk["token"] not in json.dumps(lista), "la lista no trae el token ni su huella")
cxt = server.connect()
fila = cxt.execute("SELECT hash FROM tokens_api").fetchone()
check(fila[0] == hashlib.sha256(tk["token"].encode()).hexdigest() and tk["token"] not in fila[0], "en la base solo queda el SHA-256")
check(not any(tk["token"] in (str(v) if v is not None else "") for f in cxt.execute("SELECT antes, despues, ip FROM auditoria") for v in f), "la auditoría no guarda el token")
check(any(a["accion"] == "token_creado" for a in adm_t.get("/api/auditoria").get_json()), "crear un enlace queda en el historial")
# Lo lee cualquiera con el enlace, sin sesión, y es el mismo CSV que la exportación
r = anon.get(tk["rutas"]["compras"])
check(r.status_code == 200 and r.mimetype == "text/csv" and r.data.decode() == adm_t.get("/api/export.csv").data.decode(), "con el enlace se lee el CSV de compras, sin sesión")
check(r.headers.get("X-Robots-Tag") == "noindex" and "no-store" in r.headers.get("Cache-Control", ""), "no se indexa ni se guarda en caché")
r = anon.get(tk["rutas"]["traslados"])
check(r.status_code == 200 and r.data.decode() == adm_t.get("/api/traslados.csv").data.decode(), "y el de traslados")
check(adm_t.get("/api/tokens").get_json()[0]["ultimo_uso"] is not None, "queda anotado el último uso")
# Solo esos dos archivos, solo lectura
for malo in (f"/api/token/{tk['token']}/todo.zip", f"/api/token/{tk['token']}/compras", f"/api/token/{tk['token']}/yo", f"/api/token/{tk['token']}/../export.csv"):
    check(anon.get(malo).status_code == 404, f"el enlace no da más que los dos CSV: {malo[-20:]}")
check(anon.post(tk["rutas"]["compras"], json={}, headers={"X-Libro": "1"}).status_code in (401, 405), "el enlace no sirve para escribir")
check(anon.get("/api/compras").status_code == 401 and anon.get("/api/yo").status_code == 401, "y el resto de la API sigue pidiendo sesión")
# Un token que no existe responde igual que uno revocado, sin pistas
check(anon.get("/api/token/" + "a" * 43 + "/compras.csv").status_code == 404 and anon.get("/api/token/corto/compras.csv").status_code == 404, "token inexistente o mal formado: 404")
check(adm_t.delete(f"/api/tokens/{lista[0]['id']}").status_code == 204, "se revoca")
check(anon.get(tk["rutas"]["compras"]).status_code == 404, "un enlace revocado deja de funcionar al instante")
check(adm_t.delete(f"/api/tokens/{lista[0]['id']}").status_code == 404 and adm_t.delete("/api/tokens/99999").status_code == 404, "revocar dos veces o uno que no existe: 404")
check(luz.delete(f"/api/tokens/{lista[0]['id']}").status_code == 403, "un lector no revoca")
check(adm_t.get("/api/tokens").get_json()[0]["revocado"] is not None and any(a["accion"] == "token_revocado" for a in adm_t.get("/api/auditoria").get_json()), "se ve como revocado y queda en el historial")
# Máximo 5 activos
for i in range(5):
    check(adm_t.post("/api/tokens", json={"nombre": f"hoja {i}"}).status_code == 201, f"enlace {i + 1} de 5")
r = adm_t.post("/api/tokens", json={"nombre": "uno más"})
check(r.status_code == 400 and "5" in r.get_json()["error"], "el sexto se rechaza")
activos = [t for t in adm_t.get("/api/tokens").get_json() if not t["revocado"]]
adm_t.delete(f"/api/tokens/{activos[0]['id']}")
check(adm_t.post("/api/tokens", json={"nombre": "otra vez"}).status_code == 201, "al revocar uno se libera un lugar")
# Las llaves no se cuentan por URL en las métricas ni en el registro: solo la regla de la ruta
server.vaciar_metricas()
rutas_met = [r[0] for r in server.connect().execute("SELECT ruta FROM metricas")]
check("/api/token/<token>/<archivo>" in rutas_met and not any("a" * 20 in x or tk["token"] in x for x in rutas_met), f"las métricas usan la regla, no el token {rutas_met}")
# Frenar a quien prueba tokens al azar (por proceso y por minuto)
server._TOKEN_FALLOS.clear()
for i in range(server.TOKEN_FALLOS_MAX):
    anon.get(f"/api/token/{'b' * 40}{i:03d}/compras.csv")
r = anon.get("/api/token/" + "c" * 43 + "/compras.csv")
check(r.status_code == 429 and r.headers.get("Retry-After") == "60", "demasiados intentos con tokens que no existen: 429")
server._TOKEN_FALLOS.clear()
# Modo solo lectura de emergencia: el enlace (una lectura) sigue funcionando; crear o revocar no
_tk_vivo = next(t for t in adm_t.get("/api/tokens").get_json() if not t["revocado"])
_tk2 = adm_t.post("/api/tokens", json={"nombre": "emergencia"})
check(_tk2.status_code == 400, "(ya hay 5 activos: sirve para el siguiente paso)")
adm_t.delete(f"/api/tokens/{_tk_vivo['id']}")
_tk3 = adm_t.post("/api/tokens", json={"nombre": "emergencia"}).get_json()
_ant_sl2 = server.SOLO_LECTURA
try:
    server.SOLO_LECTURA = True
    check(anon.get(_tk3["rutas"]["compras"]).status_code == 200, "con SOLO_LECTURA el enlace se sigue leyendo")
    check(adm_t.post("/api/tokens", json={"nombre": "x"}).status_code == 503, "pero no se crean enlaces")
    check(adm_t.delete(f"/api/tokens/{_tk_vivo['id']}").status_code == 503, "ni se revocan")
finally:
    server.SOLO_LECTURA = _ant_sl2

print("OK", ok, "comprobaciones")
