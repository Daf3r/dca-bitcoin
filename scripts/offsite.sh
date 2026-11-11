#!/usr/bin/env bash
# Copia los respaldos a otro lugar con rclone (R2, Backblaze B2, otra máquina por SFTP, etc.).
# Un respaldo en el mismo disco no protege si el servidor se pierde, por eso este paso importa.
#
# Configura el destino una vez:   rclone config      (por ejemplo un remoto llamado "r2")
# Prueba a mano:                  ./scripts/offsite.sh
# Programa (cron, todos los días): 15 3 * * * cd /ruta/a/libro-dca && ./scripts/offsite.sh >> offsite.log 2>&1
set -euo pipefail

REMOTO="${REMOTO:-r2:libro-dca-respaldos}"
ORIGEN="$(cd "$(dirname "$0")/.." && pwd)/data/backups"

[ -d "$ORIGEN" ] || { echo "No existe $ORIGEN: ¿ya corrió el primer respaldo?" >&2; exit 1; }

# copy (no sync): si se borra algo por error aquí, el remoto lo conserva.
rclone copy "$ORIGEN" "$REMOTO" --include "libro-*.db" --include "libro-*.db.cifrado" --max-age 72h --verbose
echo "$(date -Is) respaldo copiado a $REMOTO"
