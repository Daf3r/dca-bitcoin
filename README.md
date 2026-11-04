# Libro DCA (autoalojado)

Registro de compras DCA de Bitcoin con precio en vivo. Flask + SQLite en tu servidor, detrás de Caddy y Cloudflare Access.

Tu saldo en sats es una montaña que subes compra a compra: la cabecera es un paisaje de noche (de amanecer en modo claro) con campamentos en 100k, 1M, 10M y 1 BTC, y una celebración cuando cruzas uno. Debajo, el precio de BTC con tus compras marcadas y tu costo promedio, y reportes: campamentos con fecha, año por año, constancia semanal y tu mejor y peor precio. Anotas con un teclado numérico (pagaste y recibiste; el precio se deriva), tocas una compra para editarla o borrarla, e importas o exportas CSV. Funciona igual de bien en el teléfono y en el PC.

```
navegador ──▶ Cloudflare Access (login) ──▶ Caddy ──▶ 127.0.0.1:18082 ──▶ data/libro.db
                                                       backup ──▶ data/backups/ (diario)
```

## Qué necesitas
- Docker y Docker Compose en el servidor, y Caddy (u otro proxy) para HTTPS.
- Un dominio en Cloudflare y Zero Trust (el plan gratis alcanza).

## Despliegue (Caddy + Cloudflare Access)

```bash
mkdir -p data && sudo chown -R 1000:1000 data     # el contenedor corre como uid 1000
cp .env.example .env
docker compose up -d --build
docker compose ps                                  # app en "healthy"
curl -s http://127.0.0.1:18082/healthz
```

La app solo escucha en `127.0.0.1:18082`. Publícala con tu Caddy:

```caddy
dca.tudominio.com {
	reverse_proxy 127.0.0.1:18082
}
```

Después, en Cloudflare: registro DNS con proxy (nube naranja), SSL/TLS en *Full (strict)*, y una aplicación de Zero Trust → Access para ese dominio con política *Allow* a los correos permitidos (código por correo o login con Google). En el firewall del servidor, el 443 solo para las IPs de Cloudflare: sin eso, entrar por la IP se salta Access. La app no tiene login propio.

## Respaldos (para no perder datos)
- El servicio `backup` copia la base cada 24 h a `data/backups/`, verifica cada copia con `PRAGMA integrity_check` y conserva las últimas 30.
- Copia manual: `docker compose exec backup python backup.py`
- **Una copia en el mismo disco no te salva si pierdes el servidor.** Saca copias fuera con `scripts/offsite.sh` (rclone hacia R2, Backblaze B2 u otra máquina) y prográmalo en cron. Los *backups automáticos* de Vultr cubren el servidor completo y se suman a esto.
- Prueba una restauración una vez, antes de necesitarla:
```bash
docker compose stop app backup
cp data/backups/libro-AAAAMMDD-HHMMSS.db data/libro.db
rm -f data/libro.db-wal data/libro.db-shm
docker compose start app backup
```

## Importar y exportar
*Exportar CSV* descarga todas las compras (`fecha,monto_usd,precio_btc_usd,sats,btc`). *Importar CSV* acepta ese mismo formato o uno viejo sin `sats` (usa `precio_btc_usd`). Salta filas repetidas e inválidas y dice cuáles, así que puedes importar el mismo archivo dos veces sin duplicar.

Desde el servidor, para archivos grandes (la página acepta hasta 1 MB):
```bash
docker compose run --rm --no-deps -v "$PWD/compras.csv:/import/compras.csv:ro" app python importar.py /import/compras.csv
```

## Actualizar
Copia los archivos nuevos y ejecuta `docker compose up -d --build`. Los datos viven en `./data` y no se tocan.

## Notas de seguridad
- Ningún servicio publica puertos; los contenedores van en solo lectura, sin capabilities y con `no-new-privileges`.
- La app confía en que Cloudflare Access ya autenticó la petición y solo escucha en localhost. Si algún día se expone de otra forma, valida el encabezado `Cf-Access-Jwt-Assertion` en `server.py` o añade login propio.
- Las cabeceras CSP limitan la página a su propio origen, sin scripts ni estilos inline. La única fuente web (Fraunces, licencia OFL en `app/static/fonts/OFL.txt`) va dentro del repo: el navegador no llama a ningún tercero.
- Las escrituras rechazan peticiones marcadas por el navegador como de otro sitio (`Sec-Fetch-Site`), y la importación exige `text/csv`, que obliga a un preflight CORS.
- El precio y el histórico los consulta el servidor (Coinbase, con Kraken de reserva). El precio se guarda 30 s; el histórico diario se guarda en la base (tabla `precios`) y se actualiza como mucho una vez al día, en segundo plano. El navegador nunca habla con terceros.

## Pruebas
- `python tests/test_api.py` (necesita Flask; base temporal, exchanges simulados, sin red): API completa, validaciones, CSV, migración, precio e histórico (descarga en segundo plano, una sola descarga, paginación, Kraken, fallos).
- `node tests/test_lib.mjs`: cálculos del frontend (hitos, racha con casos límite, proyección, «hoy» de El Salvador, borde de husos horarios, decimación).
- El frontend se prueba con Playwright contra el servidor local en siete estados (de 0 compras a más de 200 BTC, sin precio y sin histórico), de 320 a 1920 px, claro y oscuro. El build de Docker y la integración con Caddy y Access se validan en el servidor.
