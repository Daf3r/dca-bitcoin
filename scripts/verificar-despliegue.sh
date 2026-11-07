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
docker compose exec -T app python -c "import server;print('  versión de los archivos:', server.VERSION)" 2>/dev/null || falla "no se pudo leer la versión"

echo
if [ "$mal" -eq 0 ]; then echo "Todo bien ($ok comprobaciones)."; exit 0; fi
echo "$mal cosa(s) fallaron de $((ok + mal))."; exit 1
