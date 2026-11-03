# Libro DCA — contexto para Claude

App familiar para registrar compras DCA de Bitcoin con precio en vivo. Dueño: Daf3r (El Salvador, habla español, prefiere respuestas **concisas y directas**; usa Windows en su PC y entra al servidor por `ssh vultr`).

## Stack
- `app/server.py`: Flask + SQLite (WAL, synchronous=FULL), gunicorn, con tipos. Rutas: `/`, `/healthz`, `GET/POST /api/compras`, `PUT/DELETE /api/compras/<id>`, `GET /api/export.csv`, `POST /api/import` (cuerpo `text/csv`, idempotente), `/api/precio` (Coinbase, Kraken de reserva, caché 30 s). Rechaza escrituras con `Sec-Fetch-Site` de otro sitio.
- `app/static/`: frontend sin dependencias ni build, ES modules: `lib.js` (cálculos y formatos puros), `chart.js` (gráfico SVG propio), `app.js` (estado y DOM), `styles.css`, `icon.svg`. Fuentes del sistema: **cero llamadas a terceros** desde el navegador.
- CSP estricta: **sin scripts ni estilos inline** (`script-src 'self'; style-src 'self'`); solo se permite CSSOM (`el.style.x=`) y SVG generado por JS.
- `app/backup.py` (respaldo diario verificado con integrity_check, conserva 30), `app/importar.py` (CLI sobre `server.importar_csv`).
- `docker-compose.yml`: servicios `app` y `backup`, endurecidos (read_only, cap_drop ALL, no-new-privileges). La app publica solo `127.0.0.1:18082`.

## Interfaz
Móvil primero; en ≥ 60rem pasa a dos columnas con el formulario fijo a la derecha. Orden: precio → valor hoy y ganancia → cifras (invertido, costo promedio, sats) → formulario → gráfico invertido/valor → compras por mes (últimas 20, "Mostrar las N"). Tocar una compra la carga en el formulario para editar; borrar está ahí, con `<dialog>` de confirmación. Claro/oscuro por `prefers-color-scheme`. Tokens de color en `:root` de `styles.css`.

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
