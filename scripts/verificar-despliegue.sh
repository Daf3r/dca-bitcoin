#!/usr/bin/env bash
# Prueba de humo después de desplegar: confirma en unos segundos que todo quedó en pie.
# Uso (en el servidor, dentro de ~/libro-dca-selfhost):  bash scripts/verificar-despliegue.sh
# Sale con 0 si todo está bien y con 1 si algo falla. No modifica nada.
set -u
cd "$(dirname "$0")/.." || exit 1

ok=0; mal=0
bien() { echo "  ✔ $1"; ok=$((ok + 1)); }
falla() { echo "  ✘ $1"; mal=$((mal + 1)); }

echo "Servicios de docker compose"
for s in app backup avisos; do
  estado=$(docker compose ps --format '{{.Service}} {{.State}} {{.Health}}' 2>/dev/null | awk -v s="$s" '$1 == s {print $2, $3}')
  case "$estado" in
    "running healthy"*|"running "|"running") bien "$s: en marcha" ;;
    "running starting") falla "$s: arrancando todavía (espera un minuto y vuelve a correr esto)" ;;
    "") falla "$s: no existe (¿falta 'docker compose up -d --build'?)" ;;
    *) falla "$s: $estado" ;;
  esac
done

echo "La app responde"
if curl -fsS -m 5 http://127.0.0.1:18082/healthz > /dev/null; then bien "/healthz responde en 127.0.0.1:18082"; else falla "/healthz no responde en 127.0.0.1:18082"; fi
if curl -fsS -m 5 http://127.0.0.1:18082/api/estado | grep -q '"abierto"'; then bien "/api/estado responde"; else falla "/api/estado no responde como se espera"; fi

echo "Datos y respaldos"
if docker compose exec -T app python -c "import sqlite3,os;c=sqlite3.connect(os.environ['DB_PATH']);print(c.execute('PRAGMA integrity_check').fetchone()[0])" 2>/dev/null | grep -qx ok; then
  bien "la base de datos pasa su revisión de integridad"; else falla "la revisión de integridad de la base no dio «ok»"; fi
if docker compose exec -T backup python salud.py respaldo; then bien "hay un respaldo reciente"; else falla "no hay un respaldo reciente (corre: docker compose exec backup python backup.py)"; fi
if docker compose exec -T avisos python salud.py avisos; then bien "el servicio de avisos está vivo"; else falla "el servicio de avisos no dejó su marca de «sigo vivo» (mira: docker compose logs avisos)"; fi

echo "Versión desplegada"
docker compose exec -T app python -c "import server;print('  versión de los archivos:', server.VERSION, '· commit:', server.VERSION_GIT or 'sin commit (usa VERSION_GIT, ver el README)')" 2>/dev/null || falla "no se pudo leer la versión"

# Opcional: con DOMINIO=dca.tudominio.com mira lo que llega de verdad por Cloudflare y Caddy: compresión (idea 104), la CSP,
# que Cloudflare no guarde la página ni la API en su caché y HSTS. Solo pide /login, /, /api/estado y styles.css, sin sesión.
# cabecera NOMBRE (en minúsculas): su valor en las cabeceras que llegan por la entrada estándar (la primera, sin espacios a los lados).
cabecera() { tr -d '\r' | awk -v k="$1" 'index($0, ":") { n = tolower(substr($0, 1, index($0, ":") - 1)); if (n == k) { v = substr($0, index($0, ":") + 1); sub(/^[ \t]+/, "", v); sub(/[ \t]+$/, "", v); print v; exit } }'; }
if [ -n "${DOMINIO:-}" ]; then
  echo "Compresión (Caddy)"
  if ! cab=$(curl -sS -m 10 -H 'Accept-Encoding: gzip, zstd' -o /dev/null -D - "https://$DOMINIO/styles.css") || [ -z "$cab" ]; then
    falla "no se pudo abrir https://$DOMINIO/styles.css"
  else
    enc=$(printf '%s\n' "$cab" | cabecera content-encoding)
    if [ -n "$enc" ]; then bien "styles.css llega comprimido ($enc)"; else falla "styles.css llega sin comprimir: añade «encode zstd gzip» al Caddyfile (README, «Más rápido»)"; fi
  fi

  echo "Cabeceras de seguridad y caché (Cloudflare)"
  login=$(curl -sS -m 10 -o /dev/null -D - "https://$DOMINIO/login"); r=$?
  # El código de la última respuesta (con un proxy delante, curl enseña antes la de su «CONNECT»).
  st=$(printf '%s\n' "$login" | tr -d '\r' | awk '/^HTTP\// {c = $2} END {print c}')
  if [ "$r" -ne 0 ] || [ -z "$login" ]; then
    falla "no se pudo abrir https://$DOMINIO/login: sin eso no se pueden revisar la CSP, HSTS ni la caché"
  elif [ "$st" != "200" ]; then
    falla "https://$DOMINIO/login respondió ${st:-sin código} (se esperaba 200): revisa eso primero; la CSP, HSTS y la caché se revisan después"
  else
    csp=$(printf '%s\n' "$login" | cabecera content-security-policy)
    case "$csp" in
      *"script-src 'self'"*) bien "/login llega con la CSP de la app" ;;
      "") falla "/login llega sin Content-Security-Policy: algo entre la app y el navegador la quita (revisa reglas de transformación de Cloudflare o el Caddyfile)" ;;
      *) falla "/login llega con otra Content-Security-Policy («${csp:0:60}…»): algo la reescribe (revisa reglas de transformación de Cloudflare o el Caddyfile)" ;;
    esac
    hsts=$(printf '%s\n' "$login" | cabecera strict-transport-security)
    if [ -n "$hsts" ]; then bien "HSTS activo ($hsts)"; else
      falla "falta Strict-Transport-Security: actívala en Cloudflare (SSL/TLS → Edge Certificates → HTTP Strict Transport Security) o en el Caddyfile (header Strict-Transport-Security \"max-age=31536000\")"; fi
    for ruta in / /api/estado; do
      # Sin -L: la redirección de / a la entrada también dice si Cloudflare la guardó. Solo estos valores significan «sale de su caché».
      if ! cab=$(curl -sS -m 10 -o /dev/null -D - "https://$DOMINIO$ruta") || [ -z "$cab" ]; then falla "no se pudo abrir https://$DOMINIO$ruta"; continue; fi
      cc=$(printf '%s\n' "$cab" | cabecera cf-cache-status)
      case "$(printf '%s' "$cc" | tr '[:lower:]' '[:upper:]')" in
        HIT|MISS|EXPIRED|STALE|UPDATING|REVALIDATED) falla "Cloudflare guarda $ruta en su caché (cf-cache-status: $cc): crea la regla «Bypass cache» para el dominio (README, «Despliegue»)" ;;
        "") bien "$ruta no sale de la caché de Cloudflare (sin cf-cache-status)" ;;
        *) bien "$ruta no sale de la caché de Cloudflare (cf-cache-status: $cc)" ;;
      esac
    done
  fi
else
  echo
  echo "(Con DOMINIO=dca.tudominio.com revisa también lo que llega por Cloudflare: compresión, CSP, caché y HSTS.)"
fi

echo
if [ "$mal" -eq 0 ]; then echo "Todo bien ($ok comprobaciones)."; exit 0; fi
echo "$mal cosa(s) fallaron de $((ok + mal))."; exit 1
