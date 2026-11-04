# Libro DCA — contexto para Claude

App familiar para registrar compras DCA de Bitcoin con precio en vivo. Dueño: Daf3r (El Salvador, habla español, prefiere respuestas **concisas y directas**; usa Windows en su PC y entra al servidor por `ssh vultr`).

## Stack
- `app/server.py`: Flask + SQLite (WAL, synchronous=FULL), gunicorn (2 workers × 4 hilos), con tipos. Rutas: `/`, `/healthz`, `GET/POST /api/compras`, `PUT/DELETE /api/compras/<id>`, `GET /api/export.csv`, `POST /api/import` (cuerpo `text/csv`, idempotente), `/api/precio` (Coinbase, Kraken de reserva, caché 30 s), `GET /api/historico?desde=AAAA-MM-DD` (cierres diarios UTC; por defecto un año, máximo 10). Rechaza escrituras con `Sec-Fetch-Site` de otro sitio y fechas anteriores a 2009-01-03. Errores 404/405/413/500 de la API en JSON, sin detalles internos. Todas las llamadas a exchanges pasan por `_get_json` (las pruebas lo simulan).
- Histórico: responde al instante con lo cacheado y `cargando: true` si falta algo; el relleno corre en un **hilo daemon** (nunca dentro del request) protegido por un candado en la tabla `meta` con caducidad (`BEGIN IMMEDIATE`; solo un proceso descarga). Coinbase en ventanas de 300 días, Kraken de reserva (solo da las últimas 720 velas: lo que no alcanza no se da por cubierto y se reintenta luego). Actualización perezosa una vez al día. Tras un fallo o un relleno incompleto, 10 min sin reintentar y se sirve lo cacheado (`desactualizado: true`); sin datos, 503. El hilo suelta el candado siempre. `precios` crece una fila por día (≈3,650 en 10 años).
- `app/static/` (ES modules, sin build ni dependencias): `lib.js` (cálculos puros: `resumen`, escala de la montaña, serie del gráfico, decimación), `montana.js` (escena SVG), `grafico.js` (precio con tus compras), `app.js` (estado, `api()` único, hoja de anotar, reportes), `styles.css`, `icon.svg`, `fonts/` (Fraunces, OFL). **Cero llamadas a terceros** desde el navegador.
- Estáticos versionados sin build: al servir, `index.html`, los módulos (y sus `import`) y `styles.css` llevan `?v=<hash del contenido>`; HTML `no-cache`, recursos con la versión vigente `immutable`, el resto revalida. Evita mezclas de caché en Cloudflare.
- CSP estricta: **sin scripts ni estilos inline** (`script-src 'self'; style-src 'self'; font-src 'self'`); solo CSSOM (`el.style.x=`) y SVG generado por JS. `.woff2` se sirve como `font/woff2` (fijado en `server.py`).
- `app/backup.py` (respaldo diario verificado con integrity_check, conserva 30), `app/importar.py` (CLI sobre `server.importar_csv`).
- `docker-compose.yml`: servicios `app` y `backup`, endurecidos (read_only, cap_drop ALL, no-new-privileges). La app publica solo `127.0.0.1:18082`.

## Interfaz
Concepto: **el ascenso**. La cabecera es una montaña ilustrada de noche (amanecer en modo claro) y el saldo en sats es la altitud: un sendero en zigzag con campamentos en los hitos y tu punto ("Tú") subiendo. Debajo, el gráfico del precio de BTC con tus compras y tu costo promedio, y los reportes.
- Montaña (`montana.js`): SVG a la medida de la caja, composición propia en móvil (<700 px, cumbre baja, 3 campamentos), tablet y escritorio (pico dimensionado por la altura). Hitos = potencias de 10 desde 100k; la cumbre es la siguiente meta y nunca menos de 1 BTC (más de 200 BTC → cumbre 1,000 BTC); altitud logarítmica (`lib.escalaMontana`/`altitud`). Etiquetas sin choques (cambian de lado o se ocultan) y la cumbre nunca invade el texto del saldo (`techo`). `role="img"` con descripción dinámica. La nieve se recorta con la silueta (`clip-path`) para no sobresalir del pico; el sendero tiene esquinas redondeadas y arranca en una marca de salida (`.salida`) sobre los pinos.
- **Cifras**: Bricolage Grotesque (OFL, `fonts/bricolage.woff2`, 33 KB, subset con `tnum`/`lnum`) para todas las cifras; Fraunces solo para títulos y palabras (no tiene cifras tabulares). Todo el documento usa `tabular-nums lining-nums`. Reservas con métricas parecidas (Segoe UI/Arial, Georgia).
- Saldo: texto normal; la cifra final invisible (`.cg-reserva`) reserva el ancho en la misma celda que la animada (`.cg-vivo`); tamaño por número de caracteres (`--n`) con `clamp` (suelo 2.25rem). **Nada se mide en JS**; si no puede animar, muestra la cifra final. La caja `.saldo` se posiciona con left/right y `min-width`: nunca con un padding que crezca con la ventana (eso causó el saldo invisible con zoom pequeño / monitores anchos).
- Gráfico (`grafico.js`): decimado al ancho conservando extremos; compras como un único path a su propio precio; el último punto es siempre el precio en vivo; compras posteriores a la última vela UTC se acotan a ella. Rangos 1M/6M/1A/Todo, por defecto el menor que contiene la primera compra y nunca menos de 6M. Lectura con puntero y flechas. Si no hay histórico, la sección lo dice.
- Anotar: en móvil y tablet, botón fijo abajo; la escena ocupa la pantalla (100svh, respaldo 100vh) y el sendero empieza por encima del botón, así que al abrir nunca tapa el saldo, el camino ni el próximo campamento (comprobado con capturas de viewport). En escritorio el botón va pegajoso en la columna derecha. Hoja con **un solo campo, los sats que recibiste** (`inputmode="numeric"`: abre el teclado numérico nativo del teléfono; se enfoca en el mismo toque que abre la hoja y se sube con `visualViewport` para que el teclado no tape Guardar), fecha y, opcional, «Escribir los dólares exactos». Los dólares se estiman con el precio de ese día (`lib.precioDelDia`: en vivo si es hoy, cierre diario si no; `lib.estimarMonto`, a centavos) y la línea de ayuda muestra «≈ $X»; si escribes dólares, son los exactos. Al editar, si cambias los sats sin tocar los dólares, se recalculan. Editar y borrar (con `<dialog>`) desde la lista. Sin zoom por doble toque (`touch-action: manipulation`). Celebración breve (~1.5 s, sin bloquear) solo si la acción de esta sesión cruza un hito.
- Diseño: en escritorio dos columnas independientes (`.col-principal`: tramo, gráfico, reportes; `.col-lateral`: botón, compras, siguiente paso, año por año); en móvil y tablet esos contenedores son `display: contents` y el orden visual es el del documento (igual que el de tabulación). En pantallas bajas (≤680 px de alto) el saldo encoge.
- Con 1 o 2 compras no hay reportes vacíos: una sola tarjeta «Siguiente paso» (compras como las tuyas que faltan para el próximo campamento, hasta qué domingo sigue la racha, campamentos siguientes).
- Reportes desde 3 compras: constancia (única caja; racha en cifra grande), campamentos con fecha y meses, año por año (desde 2 meses con compras) y mejor y peor precio; sin cajas iguales apiladas. Proyección solo hacia la siguiente meta y solo si llega en ≤ 60 meses.
- «Hoy» es siempre el de `America/El_Salvador` (`lib.hoyISO`), como el servidor: fecha por defecto, validación, racha y avisos coinciden aunque el navegador esté en otra zona.
- Racha: semanas de lunes a domingo. La semana en curso sin compra no rompe la racha; la ventana de 52 semanas termina en la misma semana de referencia que la racha.
- Accesibilidad: montaña `role="img"` con descripción; la lectura del gráfico se anuncia solo al recorrerlo con teclado (`#g-sr`); avisos en `role="status"`; zonas de toque ≥ 44 px. Al volver a la pestaña se refrescan precio y compras.
- Color: noche (principal) y amanecer; el naranja marca lo tuyo. En claro, los puntos de compra llevan borde oscuro para llegar a 3:1. `prefers-reduced-motion` quita toda animación.

## Modelo de datos
- `compras(id, fecha, monto, precio, sats, creado)`: se guarda **sats** (entero) y el precio se deriva (`precio = monto*1e8/sats`). La API acepta `{fecha, monto, sats}` (o `{fecha, monto, precio}` por compatibilidad). El importador usa `sats` si existe y, si no, `precio_btc_usd`.
- `precios(fecha, cierre)`: cierres diarios UTC de BTC-USD (caché del histórico).
- `meta(clave, valor)`: estado del histórico (`hist_desde`, `hist_dia`, `hist_bloqueo`, `hist_fallo`).
- Todo se crea o migra solo en `init_db()`.

## Producción (Vultr, Ubuntu 24.04, host `remesafam-vpn`)
- Carpeta `~/libro-dca-selfhost`, datos en `./data` (uid 1000: `chown -R 1000:1000 data`).
- **Sin túnel de Cloudflare.** Caddy en el host publica `dca.polarzero.dev` → `127.0.0.1:18082` con HTTPS; el DNS está con proxy de Cloudflare (nube naranja) y **Cloudflare Access** protege el dominio. El 443 del firewall de Vultr debe aceptar solo IPs de Cloudflare (verificado: la IP directa no responde).
- Otras cosas en el mismo servidor (no tocar): RemesaFam, Vaultwarden (127.0.0.1:18081), AdGuard, wg-easy. Respaldos del servidor con restic a Backblaze B2.
- Actualizar: copiar cambios y `docker compose up -d --build`. Antes: `docker compose exec backup python backup.py`.
- El Docker build y la integración real con Cloudflare no se pueden probar en el sandbox de Claude; se valida en el servidor.

## Pendientes
1. **Acceso familiar**: Access con login de Google (varios Gmail en iPhone), sesión de 1 mes. Alternativa: login propio en la app (contraseña familiar, cookie 90 días, límite de intentos) quitando Access. La base es **compartida** entre todos.
2. Cache Rule en Cloudflare: *Bypass cache* para `dca.polarzero.dev` (se sirvieron `app.js` viejos tras actualizar; ahora hay más módulos JS y una fuente, así que importa más). Paso 2 de la interfaz: histograma de precios de compra y mapa de calor mes a mes.
3. Incluir `~/libro-dca-selfhost/data/backups/` en el restic diario a B2.
4. Opcional: alerta a Discord del resultado de los respaldos.

## Pruebas rápidas
- API: `python tests/test_api.py` (Flask test client, `DB_PATH` temporal, exchanges simulados con `server._get_json`; histórico: no bloquear, una sola descarga con peticiones simultáneas, paginación, refresco diario, Kraken, fallo con y sin caché, validación). Añade casos ahí.
- Cálculos del frontend: `node tests/test_lib.mjs` (escala de hitos, racha, proyección, borde UTC, decimación).
- Frontend: Playwright contra el Flask local con exchanges simulados; estados hoy (1 compra) / ~50 / ~300 / más de 200 BTC / sin compras / sin precio / sin histórico, a 320, 375, 768–1100 (cada ~100), 1280, 1920 y 2560 px, más zooms (50–175 % sobre 1216–2560 px físicos), claro y oscuro. Revisa consola, CSP, scroll horizontal, etiquetas de la montaña sin solaparse, saldo en la primera pantalla y **saldo visible con ancho > 0 y la cifra real** (comprobación automática), y contenido al ancho esperado.

## Cuidado
- Nunca subir `.env`, `data/` ni la base `libro.db`.
- La app no autentica: confía en Cloudflare Access. No publicar el puerto fuera de localhost.
