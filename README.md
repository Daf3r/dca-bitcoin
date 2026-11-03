# Libro DCA (autoalojado)

Registro de compras DCA de Bitcoin con precio en vivo. Flask + SQLite en tu servidor, detrás de Caddy y Cloudflare Access. Registras con sats o USD y el precio se calcula.

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

## Importar compras de la versión anterior
Exporta el CSV desde el botón *Exportar CSV* y súbelo al servidor como `compras.csv`:
```bash
docker compose run --rm --no-deps -v "$PWD/compras.csv:/import/compras.csv:ro" app python importar.py /import/compras.csv
```
Se puede repetir sin duplicar.

## Actualizar
Copia los archivos nuevos y ejecuta `docker compose up -d --build`. Los datos viven en `./data` y no se tocan.

## Notas de seguridad
- Ningún servicio publica puertos; los contenedores van en solo lectura, sin capabilities y con `no-new-privileges`.
- La app confía en que Cloudflare Access ya autenticó la petición y solo escucha en localhost. Si algún día se expone de otra forma, valida el encabezado `Cf-Access-Jwt-Assertion` en `server.py` o añade login propio.
- Las cabeceras CSP limitan la página a su propio origen. Las únicas llamadas externas son las fuentes de Google (hoja de estilos y tipografías); se pueden autoalojar si prefieres cero terceros.
- El precio lo consulta el servidor (Coinbase, con Kraken de reserva), se guarda 30 s en caché y el navegador nunca habla con terceros.

## Qué se probó
Probado: API completa y validaciones, caché y respaldo del precio, respaldos con rotación y verificación, restauración, importación idempotente, arranque bajo gunicorn y el frontend completo contra el servidor (registrar, editar, borrar, precio manual y en vivo).
El despliegue con Docker, Caddy y Access está funcionando en producción. La suite de pruebas automáticas no está en el repo: solo se probó a mano con el cliente de pruebas de Flask y un navegador.
