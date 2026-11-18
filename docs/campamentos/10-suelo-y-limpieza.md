# Campamento 10 · Suelo y limpieza

Movido tal cual de `CLAUDE.md` el 18 nov 2026 (solo se añadieron enlaces y alguna nota con fecha). Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md).

## Campamento 10 · Suelo y limpieza (ideas visuales, primera entrega)
Vienen de la ronda de ideas con Opus (`scratchpad/ideas-visuales.md` y el artifact «Ideas visuales Libro DCA»; fases 10–15). Hecho:
- **Suelo bajo «Anotar»** (`body[data-rol="admin"]::after`, solo < 1100 px, sin `data-tv` ni `data-mant`): degradado fijo del color del fondo, `z-index: 5` (bajo el botón, que es 6).
- **Leyenda plegable** (`<details class="ley-det" id="ley-det">` en `#mercado`; `mercado.js` la abre con `matchMedia('(min-width: 700px)')`): en el teléfono empieza cerrada («Leyenda y series», 48 px). **Las pruebas deben abrirla antes de tocar `.leyenda button`** (en `test_ui`: `document.getElementById('ley-det').open = true`).
- **Puntos por sats** (`grafico.js`): radio × √(sats/mediana), entre 0.75 y 1.45; el anillo de las extra sigue al punto.
- **Curvas de nivel** (`scripts/generar-curvas.mjs` → `app/static/curvas.svg`, 31 KB, mosaico de 800 px sin costuras; `html[data-tema="claro"] body`): trazo a 6 %. Determinista; volver a correr el script da el mismo archivo.
- **Altímetro** (`#minicab-alt`, `pintar.js: pintarMinicab`, `--p` por CSSOM): regla entre `etapaAnterior(sats)` y `R.etapa` con tu punto.
- **Favicon con luna** (`favicon.js`, `scripts/generar-favicons.mjs` → `icon-luna-0..7.svg` e `icon-oro-0..7.svg`): la CSP solo permite `img-src 'self'`, así que no puede ser un icono en línea; `pintar` elige el archivo por `libroCielo.faseLunar()` y por 1 BTC. Los 16 SVG y `curvas.svg` están en `RECURSO_PUBLICO`.
- **Arranque**: en la app instalada (`display-mode: standalone`) la escena entra con un fundido de 0.45 s (`escena-fundido`). **No se pudo probar en un iPhone real.**
- `test_ui` (9 comprobaciones nuevas), `test_api` (iconos y curvas públicos) y `CAMBIOS` `2026-11-g` lo cubren. Quedan los campamentos 11–15 del artifact.
