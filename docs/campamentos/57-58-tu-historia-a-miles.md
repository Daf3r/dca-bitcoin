# Campamentos 57 y 58 · «Tu historia» a miles de compras (24 nov 2026)

La parte **C** del diseño de Fable («Diseño A–F», `docs/pulido-visual/vida-del-valle/diseno-24nov/`, sección C), aprobada por el dueño («tus recomendaciones haremos»; ver [39-50-decisiones-diseno.md](39-50-decisiones-diseno.md), punto C y duda 6). El dueño compra muchas veces de más seguidas y espera **miles** de compras: los dibujos que ponían una pieza por compra sin tope (la partitura y la constelación) se volvían bloques ilegibles y pesados, y la marca de «extra» dejaba de decir nada cuando las extra son mayoría.

## Qué entra en cada uno
El plan partía la idea en dos; se hicieron juntos (un PR, commits por pieza), y así quedan:
- **57 · Muchas compras extra juntas** (C1 y C2): la partitura por **días** hasta 60 notas y por **semanas** con más, la **semana al tocarla**, los botones **‹ ›** de 48 px, «Tocar» una nota por figura, y la marca de «extra» **por mayoría** en todos los dibujos.
- **58 · A miles** (C1 «Todos», C3 y C4): la vista **«Todos»** de la partitura (una pauta por año, una figura por mes), la **constelación por semanas** con más de 600 compras, el **tope de nodos escrito** con su prueba y el escenario permanente **`miles`**.
- **Fuera** (C5, «después» en el diseño): la compresión de `/api/compras` (1.8 MB con 10,000 compras sin comprimir en el servidor de prueba). Se decide con la cabecera real de producción (Cloudflare seguramente ya la comprime); no se tocó el servidor.

## La partitura, en tres alturas (`lib.figurasPartitura`, `lib.figurasTodos`, `arte-historia.js: partitura`)
- **Por días** (hasta `NOTAS_POR_DIA` = 60 notas en el año): una figura por **día de compra**, repartidas **por cantidad** y no por calendario (hasta 16 por pauta, como mucho 4 pautas). Varias el mismo día son un acorde: una cabeza con su «×n» debajo. Las del mismo mes siguen unidas por su barra (el grabado de 13C), con una barra entre meses y el nombre del mes encima de la primera de cada uno.
- **Por semanas** (más de 60): cuatro pautas de **14 semanas** (un año tiene como mucho 54). Cada figura: la barra del **rango** de su nota, la **cabeza** en la nota del medio (la mediana baja, la que suena), más grande con más compras, y la **cantidad** debajo; una rayita es una semana sin compras entre la primera y la última. Cada pauta dice sus meses arriba a la derecha («ene – abr»). Se toca una **columna de pauta entera** (`<rect class="pieza hp-toque hp-col">`), que no se tapa con las vecinas.
- **La semana al tocarla**: debajo se abre una pauta más con sus días (L 3, M 4…), cada uno con su figura y su cantidad, unida a su columna por un lazo naranja punteado. **No lleva piezas tocables** (se lee en el texto). El texto: «Semana del 14 – 20 sept 2026 · 9 compras (2 extra) · +161,779 sats · BTC entre $87,398 y $94,345».
- **Todos** (botón «Todos», primero en la fila de años, con más de un año): una pauta por año (el año arriba a la derecha) y una figura por mes con compras; se entiende sin tocar nada. «Tocar todos los años» suena una nota por mes.
- **Qué es una semana**: la misma que la manta y el pasaporte (lunes a domingo, `lib.semana`), **cortada al año** de la pauta: la semana del 1 de enero empieza el 1 de enero y la del 31 de diciembre acaba ese día (el texto dice el rango real: «1 – 3 ene 2027»). Así una compra nunca sale en dos «semana del…» distintos entre la partitura, la manta y el pasaporte (salvo ese corte en el cambio de año, que el texto dice).
- **‹ ›** (`#dh-pasos`, solo en la partitura): dos botones de 48 px junto a «Tocar», del mismo lenguaje que «Tocar» (borde y fondo suaves; la flecha en tinta). Su nombre dice qué mueven («Semana anterior», «Nota siguiente», «Mes anterior»). Sin nada elegido, ‹ va a la última figura y › a la primera; en los extremos se apagan. Las flechas del teclado siguen igual.
- **«Tocar este año»** suena una nota por **figura**: como mucho 54 por semanas (con 2,250 notas, una por compra, duraría minutos).
- **La marca de extra**: la cabeza naranja si **más de la mitad** de lo que junta fue extra; **sin aros** (se quitaron: con extras amontonadas eran una banda sólida).

## La constelación por semanas (`lib.estrellasConstelacion`, `ESTRELLAS_POR_COMPRA` = 600)
- Hasta 600 compras, **como hoy**: una estrella por compra, con un círculo tocable cada una.
- Con más, **una estrella por semana con compras** (lunes a domingo), más grande con más sats, dorada si la mayoría fue extra. Sin un nodo por estrella: un solo **vigía** (`.hc-vigia`, el círculo del cielo) recibe el toque y `historia.js: estrellaCercana` elige la más cercana (a 16 del dibujo como mucho). El texto: «Tu constelación tiene 254 estrellas, una por semana con compras (5,000 compras)…» y, al tocar, «Semana del … · N compras (K extra) · +… sats».

## La marca de «extra», por mayoría (`lib.mayoriaExtra`)
Regla única: una pieza que junta varias compras se marca si **más de la mitad** fueron extra. Los textos siguen diciendo la cifra real.
- **Partitura** y **constelación por semanas**: como arriba.
- **Manta**: la puntada en cruz solo en las semanas de mayoría extra (`celda.nExtra`); `celda.extra` sigue diciendo «alguna fue extra» (el pasaporte lo usa) y el texto dice cuántas («…, 3 de ellas extra»).
- **Torre**: la veta de cobre se enciende según la parte extra de la piedra (`hm-v1` hasta un tercio, `hm-v2` hasta dos tercios, la de siempre más); el texto dice cuántas («· 12 extra»; `lib.textoPiedra`).
- **Tronco**: **un nudo por mes con extras** (doce por anillo como mucho), en el lugar medio de las suyas; el texto lo dice si no coinciden: «Hay N nudos, uno por cada mes con compras extra (3,139 en total)».
- **Estratos**: ya llevaban como mucho 3 vetas de cuarzo por capa; sin cambios.

## El tope de nodos (C4)
- **`arte-historia.js: TOPE_NODOS` = 400**: ningún dibujo de «Tu historia» pasa de 400 nodos con 1, 90 (precios iguales), 200, 800 (todas extra y ninguna extra), 1,000, 5,000 y 10,000 compras **en cinco años**. Lo comprueba `test_lib` (bloque «campamentos 57 y 58») contando las etiquetas del SVG de cada dibujo (también la partitura con una semana elegida y «Todos»), y que ningún trazo lleve `NaN`, `undefined` ni `Infinity`. La manta y los estratos crecen **con los años, no con las compras** (la manta, unas 53 piezas por año: 299 nodos con cinco años, 340 con seis); el tope vale para cinco años y la manta llegaría a 400 hacia el año siete u ocho (dicho, no escondido).
- `test_ui` (bloque «campamentos 57 y 58», escenario `miles1000` con `FECHA_PRUEBA` fija) mide cada dibujo en la página: bajo el tope, sin scroll horizontal, sin `NaN` y pintado en menos de 600 ms.
- **Escenario `miles`** en `tests/servidor_prueba.py` (`miles` = 5,000; `milesN` = N): N compras realistas en 3–5 años, rachas y cuatro huecos, más de la mitad extra amontonadas en las caídas (varias el mismo día), ventas y traslados.

## Medidas (390×844, Chromium del sandbox; nodos del dibujo · tiempo hasta pintar, mediana de 3; «4×» = CPU frenada cuatro veces)
| Escenario (compras) | Constelación | Partitura (último año) | Tronco | Torre | Manta | Estratos |
|---|---|---|---|---|---|---|
| `hoy` (1) | 31 → 31 · 14 → 16 ms | 24 → 25 · 20 → 21 ms | 30 → 30 | 28 → 28 | 39 → 39 | 39 → 39 |
| `anio` (≈49) | 84 → 84 · 20 → 19 ms | 70 → 83 · 20 → 11 ms | 42 → 42 | 153 → 153 | 90 → 90 | 52 → 52 |
| `largo` (≈280) | 324 → 324 · 20 → 21 ms | 66 → 78 · 14 → 23 ms | 34 → 34 | 203 → 203 | 338 → 338 | 113 → 113 |
| `ballena` (≈280) | 326 → 326 | 70 → 83 | 34 → 34 | 203 → 203 | 338 → 338 | 113 → 113 |
| `mil` (1,000) | **1,041 → 42** · 26 → 11 ms (4×: 77 → 37) | **178 → 120** · 17 → 10 ms | 34 → 34 | 233 → 233 | 340 → 338 | 113 → 113 |
| `miles1000` (1,000, 60 % extra) | **1,041 → 42** · 24 → 19 ms (4×: 100 → 35) | **232 → 106** · 21 → 21 ms | 34 → 34 | 263 → 263 | 301 → 301 | 104 → 104 |
| `miles5000` (5,000) | **5,041 → 42** · 75 → 12 ms (4×: 268 → 40) | **1,057 → 118** · 37 → 14 ms (4×: 91 → 55) | 34 → 34 · 35 → 28 ms | 263 → 263 | 301 → 301 | 104 → 104 |
| `miles10000` (10,000) | **10,041 → 42** · 150 → 17 ms (4×: 532 → 48) | **2,273 → 120** · 59 → 19 ms (4×: 202 → 50) | 34 → 34 · 42 → 27 ms | 263 → 263 | 301 → 301 | 104 → 104 |

Los tiempos de menos de ~30 ms son ruido del sandbox (de una vez a otra varían ±10 ms). La partitura con pocas compras gana unos 12 nodos: el nombre de cada mes sobre su primera nota. Con la semana elegida abierta, la partitura de `miles5000` tiene 139 nodos y «Todos», 150. Registros: `medidas-antes.json` y `medidas-despues.json` en el scratchpad de la sesión (`c57/`).

## Decidido aquí (dicho en el informe)
- **Umbrales**: 60 notas por año para pasar de días a semanas (el del diseño) y 600 compras para la constelación por semanas (el del diseño).
- **La semana** es la de la manta, cortada al año (el prototipo usaba bloques de 7 días desde el 1 de enero; se cambió para no contradecir a la manta y al pasaporte).
- **‹ ›** solo en la partitura (donde el diseño los pone); la constelación por semanas se recorre con el teclado y con el vigía.
- **«Ver estas compras»** (el botón del diseño que llevaría a la lista filtrada por esa semana) **no entra**: la lista de «Movimientos» filtra por año, mes y etiqueta, no por un rango de fechas; añadirlo es otra pieza (lista y filtros, campamento 63). Queda para cuando se quiera.
- **La tele** sigue con el último año de la partitura (que con miles de compras ya va por semanas: cabe y se lee); el diseño proponía «Todos» en su marco, pero toca la composición de la tele (campamento D, pendiente de que el dueño diga qué aparato la mueve).

## Sin probar aquí
- iPhone real y Safari (WebKit): el pintado de la partitura y el toque del vigía de la constelación con el dedo. Pedir al dueño que abra «Tu historia» con su libro real (Partitura, un año, una semana, «Todos»; la Constelación) y lo diga.
- Lo que el CI repite: la suite completa de `test_ui`, el barrido por pestañas y Lighthouse A/B no se corrieron aquí (se corrieron los bloques que toca el cambio).
