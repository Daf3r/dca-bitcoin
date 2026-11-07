"""Prueba de carga ligera (manual, no corre en el CI): muchas personas usando la app a la vez.

Levanta el servidor de pruebas con el escenario «mil» (1,000 compras), inicia sesión y lanza varios hilos que piden lo
que la app pide al abrirse (compras, traslados, precio, histórico) y alguna escritura. Mide cuánto tarda cada petición
(mediana y percentil 95) y cuántas fallan. Sirve para confirmar que la familia entera cabe de sobra, y para ver un
cuello de botella antes de que importe. Usa el servidor de desarrollo de Flask (con hilos), así que es una medida
relativa: en producción gunicorn tiene 2 procesos con 4 hilos cada uno.

Resultado de referencia (servidor de desarrollo, 1,000 compras): con 1 o 2 personas a la vez `/api/compras` tarda 6 a 16 ms; con 5,
medio segundo; con 20, varios segundos. La causa es la respuesta grande (~190 KB de JSON) que varios hilos de Python envían a la
vez; se atiende con compresión en Caddy y con ETag (ideas 104 y 165 del plan). Con el uso real de la familia no se nota.

Uso: python tests/carga_ligera.py [HILOS] [PETICIONES_POR_HILO]     (por defecto 5 y 30; con 20 se ve el estrés)
"""
import http.client
import json
import os
import socket
import statistics
import subprocess
import sys
import threading
import time

AQUI = os.path.dirname(os.path.abspath(__file__))
HILOS = int(sys.argv[1]) if len(sys.argv) > 1 else 5
POR_HILO = int(sys.argv[2]) if len(sys.argv) > 2 else 30
P95_MAX_S = 1.5  # por encima de esto, la prueba falla

with socket.socket() as s:
    s.bind(("127.0.0.1", 0))
    puerto = s.getsockname()[1]
servidor = subprocess.Popen([sys.executable, os.path.join(AQUI, "servidor_prueba.py"), str(puerto), "mil"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def pedir(metodo, ruta, cuerpo=None, cookie=None):
    t0 = time.perf_counter()
    con = http.client.HTTPConnection("127.0.0.1", puerto, timeout=30)
    cab = {"X-Libro": "1", "Accept": "application/json"}
    if cookie:
        cab["Cookie"] = cookie
    datos = None
    if cuerpo is not None:
        datos = json.dumps(cuerpo)
        cab["Content-Type"] = "application/json"
    con.request(metodo, ruta, body=datos, headers=cab)
    r = con.getresponse()
    r.read()
    dt = time.perf_counter() - t0
    set_cookie = r.getheader("Set-Cookie")
    con.close()
    return r.status, dt, set_cookie


try:
    for _ in range(100):
        try:
            if pedir("GET", "/healthz")[0] == 200:
                break
        except OSError:
            time.sleep(0.2)
    estado, _, set_cookie = pedir("POST", "/api/login", {"usuario": "Daf3r", "clave": "clave-de-prueba-12"})
    assert estado == 200 and set_cookie, "no se pudo iniciar sesión"
    cookie = set_cookie.split(";")[0]

    tiempos: dict[str, list[float]] = {}
    fallos: list[str] = []
    cerrojo = threading.Lock()

    def hilo(n: int) -> None:
        # Lo que hace la app al abrirse, y de vez en cuando una compra nueva (con fechas distintas por hilo).
        for k in range(POR_HILO):
            for metodo, ruta, cuerpo in (("GET", "/api/compras", None), ("GET", "/api/traslados", None), ("GET", "/api/precio", None),
                                         ("GET", "/api/yo", None), ("GET", "/api/historico", None)):
                try:
                    st, dt, _ = pedir(metodo, ruta, cuerpo, cookie)
                except OSError as e:
                    with cerrojo:
                        fallos.append(f"{ruta}: {e}")
                    continue
                with cerrojo:
                    tiempos.setdefault(ruta, []).append(dt)
                    if st >= 500 or (st >= 400 and ruta != "/api/historico"):
                        fallos.append(f"{ruta}: {st}")
            if k % 10 == 0:
                try:
                    st, dt, _ = pedir("POST", "/api/compras", {"fecha": f"2026-0{1 + n % 9}-{1 + k % 27:02d}", "monto": 10, "sats": 15000 + n}, cookie)
                except OSError as e:
                    with cerrojo:
                        fallos.append(f"escritura: {e}")
                    continue
                with cerrojo:
                    tiempos.setdefault("POST /api/compras", []).append(dt)
                    if st != 201:
                        fallos.append(f"escritura: {st}")

    t0 = time.perf_counter()
    hilos = [threading.Thread(target=hilo, args=(n,)) for n in range(HILOS)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()
    total = time.perf_counter() - t0
    n_pet = sum(len(v) for v in tiempos.values())
    print(f"{HILOS} personas a la vez, {n_pet} peticiones en {total:.1f} s ({n_pet / total:.0f} por segundo)")
    peor = 0.0
    for ruta, v in sorted(tiempos.items()):
        v.sort()
        p95 = v[int(len(v) * 0.95) - 1]
        peor = max(peor, p95)
        print(f"  {ruta:20} mediana {statistics.median(v) * 1000:6.0f} ms   p95 {p95 * 1000:6.0f} ms   máx {v[-1] * 1000:6.0f} ms   ({len(v)})")
    print(f"fallos: {len(fallos)}" + (f"  ejemplos: {fallos[:3]}" if fallos else ""))
    if fallos or peor > P95_MAX_S:
        print(f"MAL: {'hubo fallos' if fallos else ''} {'el percentil 95 pasó de ' + str(P95_MAX_S) + ' s' if peor > P95_MAX_S else ''}")
        sys.exit(1)
    print("Bien: sin fallos y con tiempos holgados.")
finally:
    servidor.terminate()
