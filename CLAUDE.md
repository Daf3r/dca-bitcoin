# Libro DCA — contexto para Claude

App familiar para registrar compras DCA de Bitcoin con precio en vivo. Dueño: Daf3r (El Salvador, habla español, prefiere respuestas **concisas y directas**; usa Windows en su PC y entra al servidor por `ssh vultr`).

## Stack
- `app/server.py`: Flask + SQLite (WAL, synchronous=FULL), gunicorn. Rutas: `/`, `/healthz`, `GET/POST /api/compras`, `PUT/DELETE /api/compras/<id>`, `/api/export.csv`, `/api/precio` (Coinbase, Kraken de reserva, caché 30 s).
- `app/static/{index.html,styles.css,app.js}`: frontend sin dependencias. CSP estricta: **sin scripts ni estilos inline** (`style-src 'self'`, solo se permite CSSOM `el.style.x=`). Fuentes de Google es lo único externo.
- `app/backup.py` (respaldo diario verificado con integrity_check, conserva 30), `app/importar.py` (CSV, idempotente).
- `docker-compose.yml`: servicios `app` y `backup`, endurecidos (read_only, cap_drop ALL, no-new-privileges). La app publica solo `127.0.0.1:18082`.

## Modelo de datos
Tabla `compras(id, fecha, monto, precio, sats, creado)`. Se guarda **sats** (entero) y el precio se deriva: `precio = monto*1e8/sats`. La API acepta `{fecha, monto, sats}` (o `{fecha, monto, precio}` por compatibilidad). El frontend deja registrar con sats o USD: lo que falte se calcula con el precio escrito o el actual (se marca "Estimado"). Migración automática en `init_db()` (agrega `sats` y estima las filas viejas).

## Producción (Vultr, Ubuntu 24.04, host `remesafam-vpn`)
- Carpeta `~/libro-dca-selfhost`, datos en `./data` (uid 1000: `chown -R 1000:1000 data`).
- **Sin túnel de Cloudflare.** Caddy en el host publica `dca.polarzero.dev` → `127.0.0.1:18082` con HTTPS; el DNS está con proxy de Cloudflare (nube naranja) y **Cloudflare Access** protege el dominio. El 443 del firewall de Vultr debe aceptar solo IPs de Cloudflare (verificado: la IP directa no responde).
- Otras cosas en el mismo servidor (no tocar): RemesaFam, Vaultwarden (127.0.0.1:18081), AdGuard, wg-easy. Respaldos del servidor con restic a Backblaze B2.
- Actualizar: copiar cambios y `docker compose up -d --build`. Antes: `docker compose exec backup python backup.py`.
- El Docker build y la integración real con Cloudflare no se pueden probar en el sandbox de Claude; se valida en el servidor.

## Pendientes
1. **Acceso familiar**: Access con login de Google (varios Gmail en iPhone), sesión de 1 mes. Alternativa: login propio en la app (contraseña familiar, cookie 90 días, límite de intentos) quitando Access. La base es **compartida** entre todos.
2. Cache Rule en Cloudflare: *Bypass cache* para `dca.polarzero.dev` (se sirvieron `app.js` viejos tras actualizar).
3. Incluir `~/libro-dca-selfhost/data/backups/` en el restic diario a B2.
4. Opcional: alerta a Discord del resultado de los respaldos.

## Pruebas rápidas
- API: Flask test client con `DB_PATH` temporal (ver `app/server.py`).
- Frontend: Playwright/jsdom contra `app/static` con un `fetch` simulado.
- Verifica siempre sin overflow horizontal en móvil (360–400 px).

## Cuidado
- Nunca subir `.env`, `data/` ni la base `libro.db`.
- La app no autentica: confía en Cloudflare Access. No publicar el puerto fuera de localhost.
