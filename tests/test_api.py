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
check(r.status_code == 200 and txt.startswith("fecha,monto_usd,precio_btc_usd,sats,btc,txid,tipo,nota,extra\n"), txt[:80])
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
check(r.status_code == 200 and r.get_json() == {"usuario": "Daf3r", "rol": "admin"}, "login sin distinguir mayúsculas")
check(sc.startswith("__Host-sesion=") and "Secure" in sc and "HttpOnly" in sc and "SameSite=Lax" in sc and "Path=/" in sc and "Domain" not in sc, sc)
check(c1.get("/api/yo").get_json()["rol"] == "admin", "yo")
r = c1.get("/api/compras"); check(r.headers["Cache-Control"] == "no-store" and "Cookie" in r.headers["Vary"], "no-store y Vary")
# Sin X-Libro la escritura se rechaza
sin = server.app.test_client(); sin.set_cookie("__Host-sesion", TOKEN)
check(sin.post("/api/compras", json={"fecha": today, "monto": 1, "sats": 1000}).status_code == 403, "escritura sin X-Libro")
check(sin.post("/api/login", json={"usuario": "x", "clave": "y"}).status_code == 403, "login sin X-Libro")
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
check(luz.get("/api/yo").get_json() == {"usuario": "Luz", "rol": "lector", "visto": None}, "sin visita registrada al principio")
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
check(any(l.startswith("2018-05-02,") and l.endswith(",1") for l in txt.splitlines()), "el export marca la compra extra con 1")
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

# backup
os.environ["BACKUP_DIR"] = os.path.join(tmp, "bk")
import backup; importlib.reload(backup)
check(backup.run() and len(os.listdir(os.environ["BACKUP_DIR"])) == 1, "backup")
print("OK", ok, "comprobaciones")
