# Pulido general (pasada final)

## Pulido general (pasada final)
Retoques pequeños y seguros, sin quitar nada ni tocar lógica, API ni base:
- **Perfil de altitud** (`escalera.js`): las cifras del eje van en un margen propio a la izquierda (`m.l = 46`, alineadas a la derecha con su línea; antes se encimaban con los primeros puntos y faroles). **Puntos espaciados**: solo se dibuja un punto si queda a más de un diámetro del anterior; con mil compras los cantos oscuros de puntos encimados formaban una banda que **tapaba la línea entera** (también en la vista Costo). El degradado del área tiene id propio por gráfico (`s-grad-<id del lienzo>`, en atributo `fill`): costo y sats repetían `#s-grad`. Anillos de las extra más finos, para no confundirse con «Tú».
- **Monedas del lago** (`arte.js: monedasDelLago`): elipses doradas con canto oscuro y filo de luz (se leen como monedas tumbadas, no como puntos naranjas).
- **Reloj de sol**: piedras planas (elipses) del color de `--nieve` con canto, mayores a las 9, 12 y 15, un gnomon corto y una sombra algo más ancha y oscura. Se dibuja tras el bosque de adorno y **antes de los árboles de honor** (sus piedras quedaban sobre las copas).
- **«Tú» fantasma** (`#h-ruta`): lo que sumaría la compra va a rayas entre tu punto y el fantasma (`.hr-pista::after`), el fantasma es un anillo punteado de 20 px alrededor y la regla queda más cerca de su texto.
- **Alineación**: `.medalla`, `.sello` y `.sello-sem` con `align-content: start` (un título de dos líneas desalineaba la fila). **Tablet**: el Diario va a lo ancho (dejaba media página vacía). «Ocultar hoy» de la gran caída pegado a su texto en el teléfono (margen negativo; la zona de toque sigue de 48 px). En **< 360 px** la cotización pone «Coinbase» y la hora en dos líneas sin el «·» colgando (`.cot-sep`/`.cot-hace`; `textContent` igual).
- `CAMBIOS` tiene la entrada `2026-11-p`. Capturas antes y después en el scratchpad de la sesión (`pulido/antes`, `pulido/despues`).
