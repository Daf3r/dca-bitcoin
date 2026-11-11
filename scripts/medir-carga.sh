#!/usr/bin/env bash
# Mide cuánto pesa lo que baja el navegador al abrir la entrada, con y sin compresión (idea 104).
# Uso:  bash scripts/medir-carga.sh https://dca.tudominio.com
# Solo pide archivos públicos (la entrada, el JavaScript, el CSS y las fuentes): no necesita sesión ni toca datos.
# Úsalo antes y después de añadir «encode zstd gzip» al Caddyfile y compara la última línea.
set -u
BASE="${1:-}"
[ -n "$BASE" ] || { echo "Uso: bash scripts/medir-carga.sh https://dca.tudominio.com" >&2; exit 1; }
BASE="${BASE%/}"

html=$(curl -sS -m 15 -L "$BASE/login") || { echo "No se pudo abrir $BASE/login" >&2; exit 1; }
# Los recursos que pide la entrada, tal como los enlaza el HTML (con su ?v=)
recursos=$(printf '%s' "$html" | grep -oE '(href|src)="/[^"]+\.(js|css|woff2)[^"]*"' | sed -E 's/^(href|src)="//; s/"$//' | sort -u)
# y los módulos que importan esos scripts
extra=""
for r in $recursos; do
  case "$r" in *.js*) extra="$extra $(curl -sS -m 15 "$BASE$r" | grep -oE "from '\./[a-z0-9-]+\.js\?v=[0-9a-f]+'" | sed -E "s#^from '\.##; s#'\$##" | sort -u)";; esac
done
todos=$(printf '%s\n%s\n' "/login" "$recursos $extra" | tr ' ' '\n' | grep -v '^$' | sort -u)

total_id=0; total_gz=0
printf '%-48s %10s %10s\n' "Archivo" "sin comprimir" "con compresión"
for r in $todos; do
  id=$(curl -sS -m 15 -H 'Accept-Encoding: identity' -o /dev/null -w '%{size_download}' "$BASE$r")
  gz=$(curl -sS -m 15 -H 'Accept-Encoding: gzip, zstd' -o /dev/null -w '%{size_download}' "$BASE$r")
  printf '%-48s %10s %10s\n' "${r:0:48}" "$id" "$gz"
  total_id=$((total_id + id)); total_gz=$((total_gz + gz))
done
printf '%-48s %10s %10s\n' "TOTAL" "$total_id" "$total_gz"
if [ "$total_id" -gt 0 ]; then echo "Ahorro: $(( (total_id - total_gz) * 100 / total_id )) %  (sin «encode» en Caddy será 0 %)"; fi
