# Libro DCA — contexto para Claude

App familiar para registrar compras DCA de Bitcoin con precio en vivo. Dueño: Daf3r (El Salvador, habla español, prefiere respuestas **concisas y directas**; usa Windows en su PC y entra al servidor por `ssh vultr`).

## Stack
- `app/server.py`: Flask + SQLite (WAL, synchronous=FULL), gunicorn, con tipos. Rutas: `/`, `/healthz`, `GET/POST /api/compras`, `PUT/DELETE /api/compras/<id>`, `GET /api/export.csv`, `POST /api/import` (cuerpo `text/csv`, idempotente), `/api/precio` (Coinbase, Kraken de reserva, caché 30 s). Rechaza escrituras con `Sec-Fetch-Site` de otro sitio.
- `app/static/`: frontend sin dependencias ni build, ES modules: `lib.js` (cálculos y formatos puros), `pila.js` (cuadrícula de sats), `chart.js` (gráfico SVG propio), `app.js` (estado y DOM), `styles.css`, `icon.svg`. Fuentes del sistema: **cero llamadas a terceros** desde el navegador.
- CSP estricta: **sin scripts ni estilos inline** (`script-src 'self'; style-src 'self'`); solo se permite CSSOM (`el.style.x=`) y SVG generado por JS.
- `app/backup.py` (respaldo diario verificado con integrity_check, conserva 30), `app/importar.py` (CLI sobre `server.importar_csv`).
- `docker-compose.yml`: servicios `app` y `backup`, endurecidos (read_only, cap_drop ALL, no-new-privileges). La app publica solo `127.0.0.1:18082`.

## Interfaz
Concepto: **la pila hacia la próxima meta**. El protagonista es lo acumulado en sats, dibujado como una cuadrícula de 10×10 que se llena de abajo arriba hacia el siguiente hito (1M sats → 10M → 1 BTC → 10 BTC; cada cuadro = meta/100). La última compra va en tinta; mientras escribes una compra nueva se ve en fantasma lo que sumará, y al guardarla sus cuadros "caen" (sin animación con `prefers-reduced-motion`). Debajo van los hitos y una proyección: "al ritmo de los últimos 6 meses llegas a X en N meses" (`lib.ritmo`, exige 3 compras en la ventana).
- Identidad: banda naranja Bitcoin (`#f7931a`) con el logotipo en monoespaciada; cifras en `--mono` (fuentes del sistema); el formulario es un panel oscuro con borde naranja; botones rectos, sin sombras.
- El naranja sobre el papel da 2:1: úsalo solo para rellenos y líneas, nunca para texto ni para el foco (en claro, texto naranja = `--naranja-texto`; el foco va en tinta, y en naranja dentro del panel).
- Orden en móvil: banda → pila → valor/invertido/costo promedio → anotar compra → gráfico invertido/valor → compras por mes (últimas 20). En ≥ 56rem: pila a la izquierda; cifras y formulario a la derecha; gráfico y lista debajo a todo el ancho.
- Tocar una compra la carga en el formulario para editarla; borrar está ahí, con un `<dialog>` de confirmación.

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
- API: Flask test client con `DB_PATH` temporal; simula `server.consultar_precio` para no salir a la red. Incluye una base vieja sin columna `sats`.
- Frontend: Playwright (`require('playwright')`, `chromium.launch()`) contra el servidor Flask local con datos sembrados; capturas a 375 px y escritorio, claro y oscuro; revisar consola/CSP.
- Verifica siempre sin overflow horizontal en móvil (360–400 px).

## Cuidado
- Nunca subir `.env`, `data/` ni la base `libro.db`.
- La app no autentica: confía en Cloudflare Access. No publicar el puerto fuera de localhost.
