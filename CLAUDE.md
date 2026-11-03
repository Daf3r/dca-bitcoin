# Libro DCA — contexto para Claude

App familiar para registrar compras DCA de Bitcoin con precio en vivo. Dueño: Daf3r (El Salvador, habla español, prefiere respuestas **concisas y directas**; usa Windows en su PC y entra al servidor por `ssh vultr`).

## Stack
- `app/server.py`: Flask + SQLite (WAL, synchronous=FULL), gunicorn, con tipos. Rutas: `/`, `/healthz`, `GET/POST /api/compras`, `PUT/DELETE /api/compras/<id>`, `GET /api/export.csv`, `POST /api/import` (cuerpo `text/csv`, idempotente), `/api/precio` (Coinbase, Kraken de reserva, caché 30 s). Rechaza escrituras con `Sec-Fetch-Site` de otro sitio.
- `app/static/`: frontend sin dependencias ni build, ES modules: `lib.js` (cálculos y formatos puros), `chart.js` (gráfico SVG propio), `app.js` (estado y DOM), `styles.css`, `icon.svg`, `fonts/` (Instrument Serif, OFL). **Cero llamadas a terceros** desde el navegador.
- CSP estricta: **sin scripts ni estilos inline** (`script-src 'self'; style-src 'self'; font-src 'self'`); solo se permite CSSOM (`el.style.x=`) y SVG generado por JS.
- `app/backup.py` (respaldo diario verificado con integrity_check, conserva 30), `app/importar.py` (CLI sobre `server.importar_csv`).
- `docker-compose.yml`: servicios `app` y `backup`, endurecidos (read_only, cap_drop ALL, no-new-privileges). La app publica solo `127.0.0.1:18082`.

## Interfaz
Concepto: **la libreta de ahorro**. Cada compra es una línea con su depósito y el **saldo corrido en sats**; la siguiente línea en blanco es el formulario ("Siguiente línea"); la última anotación lleva un **sello** naranja con la fecha, que "golpea" al anotar (sin animación con `prefers-reduced-motion`).
- Arriba, el saldo en sats en serif grande, una frase con valor y ganancia, y una regla hacia la próxima meta (potencia de 10, mínimo 1M sats) que muestra en fantasma lo que sumará la compra que se escribe, más la proyección al ritmo de 6 meses (`lib.ritmo`). Al lado (escritorio) o debajo (móvil): costo promedio, invertido y BTC.
- La libreta muestra las últimas 12 líneas agrupadas por mes ("Ver las N líneas anteriores"). Tocar una línea la carga en el formulario para corregirla; borrar va con `<dialog>`.
- El gráfico invertido/valor solo aparece con 3 puntos o más; antes se explica con una nota.
- Tipografía: Instrument Serif (OFL, `app/static/fonts/`, 43 KB, servida desde `'self'` con `font-src 'self'`) para saldo, títulos y meses; sans del sistema con cifras tabulares para todo lo demás. Nada de monoespaciada ni rótulos en mayúsculas.
- Color: papel y tinta cálidos; el naranja es tinta de sello y de avance. En claro, el naranja de relleno (`--sello`) da 2.8:1: bordes, líneas y sello usan `--sello-trazo` (≥3.8:1) y el texto `--sello-texto`. El foco va en tinta.
- Móvil: las filas son flex con salto forzado (si no cabe, el saldo baja de línea) y el sello va al pie de la última línea. Desde 40rem de hoja, columnas Fecha/Pagaste/Precio/Depósito/Saldo y el sello a la derecha.

## Modelo de datos
Tabla `compras(id, fecha, monto, precio, sats, creado)`. Se guarda **sats** (entero) y el precio se deriva: `precio = monto*1e8/sats`. La API acepta `{fecha, monto, sats}` (o `{fecha, monto, precio}` por compatibilidad). El frontend pide monto y sats; si falta uno se calcula con un precio escrito o el actual (se marca "estimado"). El importador usa `sats` si la columna existe y, si no, `precio_btc_usd`. Migración automática en `init_db()` (agrega `sats` y estima las filas viejas).

## Producción (Vultr, Ubuntu 24.04, host `remesafam-vpn`)
- Carpeta `~/libro-dca-selfhost`, datos en `./data` (uid 1000: `chown -R 1000:1000 data`).
- **Sin túnel de Cloudflare.** Caddy en el host publica `dca.polarzero.dev` → `127.0.0.1:18082` con HTTPS; el DNS está con proxy de Cloudflare (nube naranja) y **Cloudflare Access** protege el dominio. El 443 del firewall de Vultr debe aceptar solo IPs de Cloudflare (verificado: la IP directa no responde).
- Otras cosas en el mismo servidor (no tocar): RemesaFam, Vaultwarden (127.0.0.1:18081), AdGuard, wg-easy. Respaldos del servidor con restic a Backblaze B2.
- Actualizar: copiar cambios y `docker compose up -d --build`. Antes: `docker compose exec backup python backup.py`.
- El Docker build y la integración real con Cloudflare no se pueden probar en el sandbox de Claude; se valida en el servidor.

## Pendientes
1. **Acceso familiar**: Access con login de Google (varios Gmail en iPhone), sesión de 1 mes. Alternativa: login propio en la app (contraseña familiar, cookie 90 días, límite de intentos) quitando Access. La base es **compartida** entre todos.
2. Cache Rule en Cloudflare: *Bypass cache* para `dca.polarzero.dev` (se sirvieron `app.js` viejos tras actualizar; ahora hay más módulos JS, así que importa más).
3. Incluir `~/libro-dca-selfhost/data/backups/` en el restic diario a B2.
4. Opcional: alerta a Discord del resultado de los respaldos.

## Pruebas rápidas
- API: `python tests/test_api.py` (Flask test client, `DB_PATH` temporal, `server.consultar_precio` simulado; incluye una base vieja sin columna `sats`). Añade casos ahí.
- Frontend: Playwright (`require('playwright')`, `chromium.launch()`) contra el servidor Flask local con datos sembrados; capturas a 375 px y escritorio, claro y oscuro; revisar consola/CSP.
- Verifica siempre sin overflow horizontal en móvil (320–400 px) y con cifras enormes: las cifras grandes se escalan con `--caracteres` (lo pone `ajustarCifra` en `app.js`) y unidades `cqi`.

## Cuidado
- Nunca subir `.env`, `data/` ni la base `libro.db`.
- La app no autentica: confía en Cloudflare Access. No publicar el puerto fuera de localhost.
