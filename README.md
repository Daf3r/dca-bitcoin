# Libro DCA (autoalojado)

Registro de compras DCA de Bitcoin con precio en vivo. Flask + SQLite en tu servidor, detrás de Caddy y Cloudflare, con login propio por persona.

Tu saldo en sats es una montaña que subes compra a compra: la cabecera es un paisaje de noche (de amanecer en modo claro) con campamentos en 100k, 1M, 10M y 1 BTC, y una celebración cuando cruzas uno. Debajo, el precio de BTC con tus compras marcadas y tu costo promedio, y reportes: campamentos con fecha, año por año, constancia semanal y tu mejor y peor precio. Anotas escribiendo solo los sats que recibiste, con el teclado numérico del teléfono (los dólares se calculan con el precio de ese día; si quieres, los escribes exactos), tocas una compra para editarla o borrarla, e importas o exportas CSV. Funciona igual de bien en el teléfono y en el PC.

```
navegador ──▶ Cloudflare (proxy) ──▶ Caddy ──▶ 127.0.0.1:18082 (login propio) ──▶ data/libro.db
                                                       backup ──▶ data/backups/ (diario)
```

## Qué necesitas
- Docker y Docker Compose en el servidor, y Caddy (u otro proxy) para HTTPS.
- Un dominio en Cloudflare y Zero Trust (el plan gratis alcanza).

## Despliegue (Caddy + Cloudflare)

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

Después, en Cloudflare: registro DNS con proxy (nube naranja), SSL/TLS en *Full (strict)* y una regla de límite de peticiones para `/api/login` (por ejemplo, 10 por minuto por IP). En el firewall del servidor, el 443 solo para las IPs de Cloudflare: sin eso, entrar por la IP se salta Cloudflare. La protección de la app es su login propio (cuentas por persona, abajo); Cloudflare Access ya no se usa.

## Acceso con cuentas
La app tiene login propio: una cuenta por persona, **admin** (anota, corrige, anula, importa, ve el historial) o **lector** (ve todo, no escribe). Toda escritura queda en un historial que no se puede modificar, y borrar una compra la **anula** (sigue en el historial).

Despliegue la primera vez (con Cloudflare Access todavía activo):
```bash
docker compose exec backup python backup.py        # respaldo antes de nada
docker compose up -d --build                       # la app muestra «Aún no hay cuentas»
docker compose exec app python usuarios.py crear Daf3r --rol admin --generar
docker compose exec app python usuarios.py crear Ana --rol lector --generar
docker compose exec app python usuarios.py listar
```
Las contraseñas generadas son de 16 caracteres sin letras ambiguas (`xxxx-xxxx-xxxx-xxxx`); también puedes escribir una (mínimo 12) quitando `--generar`. Cada uno puede cambiar la suya desde la app (botón con su nombre → Cambiar contraseña).

Caddy debe decir a la app la IP real del visitante (solo así funciona el límite de intentos por IP). En el Caddyfile del servidor:
```caddy
dca.polarzero.dev {
	reverse_proxy 127.0.0.1:18082 {
		header_up X-Forwarded-Proto https
		header_up X-Cliente-IP {http.request.header.CF-Connecting-IP}
	}
}
```
`header_up` sobrescribe lo que mande el visitante, y el firewall solo deja llegar a Cloudflare, así que la cabecera es de fiar. Después: `sudo systemctl reload caddy`, añade `CONFIAR_X_CLIENTE_IP=1` a `.env` y `docker compose up -d`. Sin eso, la app avisa en el log y desactiva el límite por IP (el límite por cuenta sigue).

Probar: entra en el iPhone y en el PC, prueba un lector y revisa el Historial. Si migras desde una instalación con Cloudflare Access, mantenla activa unos días mientras pruebas el login y quítala después. La regla de *Bypass cache* para el dominio es obligatoria.

Otras órdenes: `usuarios.py clave NOMBRE` (cambia la contraseña y cierra sus sesiones), `desactivar`/`activar`, `cerrar-sesiones`, `desbloquear` (tras muchos intentos fallidos la cuenta espera hasta 15 min).

Si algo falla: vuelve a activar Access en Cloudflare (un clic) y despliega el commit anterior (`git checkout <commit> && docker compose up -d --build`). Las tablas nuevas no estorban al código viejo, pero este verá como normales las compras anuladas; si ya anulaste alguna, restaura el respaldo de antes del despliegue (ver abajo).

## Respaldos (para no perder datos)
- El servicio `backup` copia la base cada 24 h a `data/backups/`, verifica cada copia con `PRAGMA integrity_check` y conserva las últimas 30.
- Copia manual: `docker compose exec backup python backup.py`
- **Una copia en el mismo disco no te salva si pierdes el servidor.** Saca copias fuera con `scripts/offsite.sh` (rclone hacia R2, Backblaze B2 u otra máquina) y prográmalo en cron. Los *backups automáticos* de Vultr cubren el servidor completo y se suman a esto.
- **Restaurar** (idea 48; el comando y la prueba están probados de verdad en `tests/test_api.py`: restauran un respaldo, comparan tabla por tabla y abren el resultado con la app):
  1. *Ensayo sin riesgo* (no toca nada): `docker compose exec backup python backup.py --restaurar` deja el último respaldo en `data/libro.restaurada.db` (o `--restaurar data/backups/libro-AAAAMMDD-HHMMSS.db`). Puedes abrirlo con `sqlite3` y mirar.
  2. *Recuperar de verdad* (la base real se dañó o se borró algo): primero para quien escribe, y después restaura encima. La base actual no se borra: se guarda junto a ella como `libro.db.antes-FECHA` (con su `-wal` y `-shm`).
```bash
docker compose stop app avisos
docker compose exec backup python backup.py --restaurar --a /data/libro.db --reemplazar
docker compose start app avisos
bash scripts/verificar-despliegue.sh
```
  3. Elige otro respaldo si el último ya traía el problema: añade su ruta tras `--restaurar` (están en `data/backups/`, uno por día). La app migra el esquema sola al arrancar (`esquema`: ver «Migraciones»).
  - El comando se niega (sale con 1 y no toca nada) si el archivo no es una base, no pasa `integrity_check` o le faltan las tablas clave.
  - La prueba semanal automática y `python backup.py --probar` siguen igual (comparan el último respaldo con la base real).

## Migraciones de la base
La base lleva su versión en la tabla `esquema` (`SELECT * FROM esquema;`). Al arrancar, `server.migrar` aplica en orden las migraciones que falten (`MIGRACIONES_ESQUEMA` en `app/server.py`), cada una **idempotente**, y dice en el registro cuáles aplicó (`docker compose logs app | grep esquema`). Una base de cualquier edad, con o sin esa tabla, llega al mismo estado; una base más nueva que el código (volviste a una versión anterior) sigue funcionando porque las migraciones solo añaden. Para cambiar la base: una migración nueva al final y su prueba (`tests/test_api.py`, «Migraciones versionadas»).

## Respaldos cifrados (opcional)
Los respaldos locales llevan los hashes de las contraseñas; restic ya cifra lo que sube a B2, pero los de `data/backups/` quedan en claro. Para cifrarlos pon una clave larga en el `.env` (`BACKUP_CLAVE=…`) y reinicia: `docker compose up -d backup`. Desde entonces cada copia es `libro-FECHA.db.cifrado` (AES-256-GCM, clave derivada con scrypt) y **no queda copia en claro**; el respaldo se descifra de vuelta y se compara antes de borrar la copia en claro. Los respaldos viejos en claro siguen ahí (conviven, la retención cuenta todos); bórralos tú cuando quieras. `backup.py --restaurar` y `--probar` leen la misma variable. **Si pierdes la clave, esos respaldos no se pueden abrir**: guárdala aparte. Por eso es opcional.

## Modo solo lectura de emergencia
Para un mantenimiento, o si sospechas de un problema y quieres revisarlo sin que nadie escriba: pon `SOLO_LECTURA=1` en el `.env` y `docker compose up -d app`. Todo se sigue viendo (saldo, gráficos, lista, estado del sistema), la gente puede entrar y salir, pero **ninguna escritura entra** (responde 503) y arriba sale «Mantenimiento: por ahora solo se puede mirar». Para volver a la normalidad quita la línea (o ponla en 0) y `docker compose up -d app`. El servicio `avisos` y los respaldos no se detienen.

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
- La app autentica con cuentas propias (scrypt, sesiones con cookie `__Host-` `HttpOnly; Secure; SameSite=Lax`, límite de intentos, roles comprobados en el servidor) y aun así solo escucha en localhost detrás de Caddy y Cloudflare.
- Los respaldos contienen hashes de contraseña: guárdalos cifrados (restic ya cifra). Las sesiones solo se guardan como hash del token, inservibles para entrar.
- Las cabeceras CSP limitan la página a su propio origen, sin scripts ni estilos inline. Las únicas fuentes web (Fraunces y Bricolage Grotesque, licencias OFL en `app/static/fonts/`) va dentro del repo: el navegador no llama a ningún tercero.
- Las escrituras rechazan peticiones marcadas por el navegador como de otro sitio (`Sec-Fetch-Site`), y la importación exige `text/csv`, que obliga a un preflight CORS.
- El precio y el histórico los consulta el servidor (Coinbase, con Kraken de reserva). El precio se guarda 30 s; el histórico diario se guarda en la base (tabla `precios`) y se actualiza como mucho una vez al día, en segundo plano. El navegador nunca habla con terceros.

## Pruebas
- `python tests/test_api.py` (necesita Flask; base temporal, exchanges simulados, sin red): API completa, validaciones, CSV, migración, precio e histórico, y el acceso: sesiones, roles, fuerza bruta, auditoría inmutable y acotada, anular y la CLI de cuentas.
- `node tests/test_lib.mjs`: cálculos del frontend (hitos, racha con casos límite, proyección, «hoy» de El Salvador, borde de husos horarios, decimación).
- `node tests/test_ui.mjs`: prueba de navegador (Playwright + Chromium) contra un servidor de pruebas con base temporal y exchanges simulados (`tests/servidor_prueba.py`). Instala una vez con `npm ci --prefix tests` y `npx --prefix tests playwright install chromium`. Comprueba el saldo (sats y BTC, de 320 a 2560 px), los gráficos, el tema, anotar una compra con sus avisos, y lo que ve un lector.
- **CI en GitHub**: cada PR y cada cambio a `main` corren las tres pruebas anteriores (`.github/workflows/pruebas.yml`). Dependabot propone una vez al mes actualizaciones (pip, Docker, GitHub Actions y npm); revisa que el PR esté en verde antes de mezclarlo.
- El build de Docker y la integración con Caddy y Cloudflare se validan en el servidor.

## TXID y auditoría de las compras
Cada compra puede llevar su **TXID** (64 caracteres hexadecimales, o pega el enlace de mempool.space y se extrae solo): en «Más detalles» de la hoja de anotar. Con TXID, la lista muestra «Ver en mempool.space» (abre `https://mempool.space/tx/<txid>` en otra pestaña) para que cualquiera de la familia compruebe la transacción. Es opcional: una compra dentro del exchange o por Lightning no tiene. Si un TXID ya está en otra compra, se guarda y se avisa. El CSV de exportación incluye la columna `txid` y el importador la lee. Los cambios de TXID quedan en la auditoría como cualquier edición.

**Verificación contra mempool.space.** Bajo cada TXID la lista muestra su estado («Confirmada · N confirmaciones · comisión X sats», «Pendiente de confirmar», «No encontrada»). Lo consulta **el servidor** (`GET /api/tx/<txid>`; el navegador nunca habla con mempool.space, así que la CSP no cambia) y solo para TXID que están en una compra vigente, para que no sirva de proxy abierto. Las confirmadas se guardan para siempre en la tabla `tx_cache` (se crea sola); pendientes y no encontradas se reconsultan pasados 60 s; si mempool.space no responde se sirve lo guardado marcado como «dato guardado». Es informativo: no bloquea guardar nada.

**Vista previa de la celebración (temporal, solo admin).** En «Tu cuenta» hay tres botones (Compra, Etapa, Hito grande) que reproducen la animación sin guardar nada. Para quitarla: borrar el bloque `#dc-previa` de `index.html`, el bloque «vista previa temporal» de `app.js` (y la línea que la muestra en `cargarYo`) y `.dc-previa` de `styles.css`.

## Ventas y gastos
Además de compras, puedes registrar **ventas o gastos** (un gasto cuenta como venta): en la hoja de anotar, elige «Venta o gasto», escribe los sats que salieron y, si quieres, una nota («gasté en renta»). Los dólares se estiman con el precio de ese momento (o los escribes exactos en «Más detalles»). El saldo nunca puede quedar negativo: el servidor rechaza una venta de más sats de los que tenías a esa fecha, y también anular o editar una compra si eso dejara sin sats a una venta posterior. La cuenta usa el **costo promedio ponderado**: al vender, el costo de lo que te queda baja en proporción y la ganancia realizada es lo recibido menos ese costo (sin impuestos). La tarjeta «Ganancia» muestra la realizada, la no realizada, el total y el invertido neto. El CSV exporta `tipo` y `nota`; un CSV viejo sin esas columnas se sigue importando como compras. Todos, también los lectores, ven las ventas.

## Metas intermedias
Además de los campamentos grandes de la montaña (100k, 1M, 10M, 1 BTC), la barra «Próximo campamento» y la tarjeta «Siguiente paso» usan etapas intermedias: 100k, 250k, 500k, 1M, 2.5M, 5M, 10M… Al guardar una compra, el aviso dice cuánto avanzaste hacia la siguiente etapa («+32,500 sats · 69 % del camino a 250k»), y la celebración salta al cruzar cualquiera de ellas.

## Novedades al abrir la web
Quien entra con una cuenta de lector ve, la primera vez que abre la web, un resumen de lo que pasó desde su última visita: las compras o ventas nuevas, el saldo, lo que vale hoy, la ganancia, el avance hacia la siguiente meta y la racha. Si no pasó nada, no sale nada. La primera vez es una bienvenida con los últimos movimientos. Al cerrarlo, el servidor guarda la visita de esa persona, así que vale igual en el móvil y en el PC. No hace falta ningún canal externo: como se compra una vez por semana o por quincena, basta con que lo vean al entrar.

## Instalar en el iPhone (PWA)
En Safari abre `https://dca.polarzero.dev`, toca **Compartir → Añadir a pantalla de inicio**. Queda con su icono y sin la barra de Safari. En Android (Chrome): menú → «Instalar app». Notas:
- La app instalada en iPhone **no comparte las cookies de Safari**: la primera vez hay que entrar de nuevo. La sesión dura 90 días deslizantes.
- No hay modo sin conexión a propósito: el único service worker (`sw.js`) solo recibe avisos, sin caché, así que nunca se sirve un módulo (`app.js` y los que importa) viejo tras actualizar.
- El manifiesto (`/manifest.webmanifest`) y los iconos son públicos, porque el navegador los pide sin cookie. Los iconos PNG salen de `icon.svg` (el de Apple va a sangre completa y el «maskable» con margen).
- La barra de estado es la opaca (`black`). Si se quiere que la montaña llegue hasta arriba, cambiar a `black-translucent` en `index.html` y añadir `env(safe-area-inset-top)` a la cabecera; probar en el iPhone antes.

## Recordatorio «te toca comprar» y hitos de constancia
Solo el admin ve, bajo la montaña, una línea según su ritmo (semanal o quincenal, el que marcan sus últimas compras): «Al día», «Te toca comprar esta semana», «Hoy es el último día…» o «Tu racha se reinició» (sin reproche). Es solo un recordatorio dentro de la app: no hay notificaciones externas. Además, al anotar la compra 10, 25, 50, 100… o al cumplir 6 meses, 1 año… desde la primera compra, sale una tarjeta «Constancia» y el reporte de Constancia dice cuánto falta para el siguiente hito. No hay cambios de base de datos.

Cuando el precio cae 15 % o más frente a su máximo de 30 días, el admin ve una tarjeta opcional con el dato y con qué haría «reponer» (una compra como las tuyas) en el costo promedio. Es solo información: no recomienda comprar, y «Ocultar hoy» la quita hasta mañana.

Toca la cifra del saldo para verla en sats o en BTC (se recuerda en cada dispositivo). Bajo el título del gráfico, una línea dice con qué precio de BTC estarías en cero. La cotización muestra hace cuánto se actualizó el precio, y la hoja de anotar enseña a cuántos sats equivale hoy una compra como las tuyas.

Bajo el gráfico de precio, «Lo que pusiste y lo que vale» compara, día a día desde tu primera compra, lo invertido (neto de ventas) con lo que valía tu saldo cada día. Sale desde 3 compras y cuando hay histórico de precios; pasa el dedo o usa las flechas para leer un día.

En «Tu cuenta», el botón «Tema» elige entre automático (como el teléfono), claro y oscuro; se recuerda en cada dispositivo y también se aplica en la pantalla de entrada.

**Compra extra por una caída.** Al anotar una compra, en «Más detalles» puedes marcarla como *extra* y escribir una nota (por qué la hiciste). Las extra se ven aparte en la lista y no cuentan como tu ritmo habitual: no desvían la «compra como las tuyas», los avisos ni la proyección. Sí suman al saldo y al costo promedio. El CSV de exportación lleva una columna `extra` al final (`1` en las extra); un CSV antiguo sin esa columna se importa igual. La base se actualiza sola al desplegar (columna nueva en `compras`): haz antes el respaldo de siempre.

Bajo «Lo que pusiste y lo que vale», una línea compara tu costo promedio con el precio promedio de BTC desde tu primera compra. Comprar los mismos dólares cada vez compra más sats cuando el precio baja, así que el costo suele quedar por debajo del promedio: es el efecto del DCA, medido con tus datos. Sale desde 3 compras y con al menos 14 días de histórico.

## Dónde están tus sats (traslados)
Tu saldo cuenta cuántos sats tienes en total, sin importar dónde estén. Para ver cuánto sigue en el exchange y cuánto ya está en tu wallet, anota un **Traslado** (tercer botón de «Anotar»): los sats que **llegaron** a tu wallet, la fecha y, si quieres, el TXID. La tarjeta «Dónde están tus sats» muestra la barra y los porcentajes, y la ven también tus papás. Un traslado **no cambia tu saldo ni tu costo promedio**.
- Si pagaste comisión de red, escríbela en «Más detalles»: se anota además como un gasto («Comisión de retiro») y baja tu saldo en esa cantidad.
- Si algún día vendes o gastas desde la wallet, antes anota un traslado «De mi wallet al exchange».
- Un traslado no se edita: tócalo para anularlo (queda en el historial) y vuelve a anotarlo bien.
- Los traslados no van en el CSV; sí van en los respaldos de la base. La tabla se crea sola al desplegar: haz antes el respaldo de siempre.

## Revisión del código
El CI revisa en cada PR: Python con `ruff` y `mypy`, el JavaScript con Biome, la **accesibilidad** con axe (falla ante cualquier violación), el **rendimiento** con Lighthouse, que la **imagen de Docker** se construye y arranca, y, de forma informativa, vulnerabilidades conocidas (pip-audit, npm audit, Trivy) y cambios visuales contra una referencia de `main`. Cada lunes, `semanal.yml` corre el barrido visual completo y las revisiones de seguridad sin tolerancia: si algo falla, GitHub te avisa por correo.

En tu computadora, antes de subir algo:
```bash
python tests/test_api.py && node tests/test_lib.mjs
npx --prefix tests biome lint
node tests/auditoria_axe.mjs
node tests/barrido_ui.mjs rapido
```
(`pre-commit install` hace las revisiones rápidas solas en cada commit.)

**Después de desplegar** (en el servidor): `bash scripts/verificar-despliegue.sh`. Comprueba en segundos que los tres servicios están en marcha, que la app responde, que la base pasa su revisión de integridad, que hay un respaldo reciente y que el servicio de avisos está vivo, y te dice qué falló si algo no está bien.

**Restauración de prueba:** cada semana, el servicio de respaldos restaura el último respaldo en una carpeta temporal y lo compara con la base real (integridad, tablas, filas y la auditoría); si algo no cuadra, te avisa por push. Puedes pedirla cuando quieras con `docker compose exec backup python backup.py --probar`.

**Vigilantes de los servicios:** el servicio `avisos` te avisa por push (categoría «Fallo del respaldo») si pasan más de 36 horas sin un respaldo nuevo, si la revisión semanal de la base encuentra un problema o si queda poco espacio en disco. Además, `docker compose ps` muestra si `backup` y `avisos` están `healthy`.

## Avisos push
Cada persona activa los avisos **en su dispositivo**: «Tu cuenta» → «Avisos en este dispositivo» → «Activar», y marca cuáles quiere.
- **Al entrar:** la primera vez en cada dispositivo sale una tarjeta «¿Quieres recibir avisos?» (a tus papás, después de su bienvenida). Si dices «Ahora no», no vuelve a preguntar; siempre puedes activarlos en «Tu cuenta».
- **Tus papás (lectores):** un aviso por cada compra, venta o gasto nuevo (encendido) y, si quieren, por etapas, hitos y constancia (apagado por defecto).
- **Tú (admin):** recordatorio unos días antes de que venza tu semana o quincena (viernes a domingo, una vez al día, y solo si aún no compraste), TXID confirmado, fallo del respaldo y **gran caída** (BTC 15 % o más bajo su máximo de 30 días: un aviso por caída, solo informa; se reinicia cuando BTC queda a menos de 10 % de su máximo).
- **No suenan de noche** (solo de 8:00 a 21:00, hora de El Salvador): lo de la noche sale por la mañana.
- **iPhone:** los avisos solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o más). Ábrela desde ahí y actívalos.
- **Al desplegar:** `docker compose up -d --build` crea el servicio nuevo `avisos` y la clave `data/vapid_private.pem`. **No borres esa clave**: si se pierde, cada dispositivo tiene que activar los avisos otra vez. Inclúyela en el respaldo de la carpeta `data`.
- **Brave:** trae los avisos apagados. En `brave://settings/privacy` activa «Usar servicios de Google para mensajes push» (en inglés, «Use Google services for push messaging»), reinicia Brave y vuelve a activar los avisos. En Chrome, Edge, Firefox y Safari no hace falta.
- Si algo no llega: `docker compose logs avisos` y `docker compose logs app`; en el teléfono, revisa que la app tenga permiso de notificaciones.

