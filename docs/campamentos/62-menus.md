# Campamento 62 · Los menús

Las propuestas **300, 301, 302, 303 y 304** del diseño de interfaz de Fable (`docs/pulido-visual/mejoras-interfaz/propuestas-interfaz.html`, 24 nov 2026), **aprobadas por el dueño**. Nada se añade a la pantalla: se acorta, se ordena y se arregla. **0 nodos y 0 animaciones nuevas en la escena** (el banco da lo mismo). Un commit por pieza en `claude/vida-62` (sobre `claude/vida-51`).

## Lo hecho

- **300 · «Tu cuenta» se cierra desde arriba** (`index.html: #dc-cab`, `cuenta.js: vistaCuenta/irA`, `.dc-cab`). La cabecera (el título y «Cerrar») va pegada arriba del diálogo (`position: sticky`, fondo `--s1` opaco, sin desenfoque) y el «Cerrar» del final se quitó. En las vistas de dentro (contraseña, avisos, tus datos, enlace, sesiones, estado del sistema, historial) el título deja su sitio a **«‹ Tu cuenta»** (`#dc-volver`, `data-cuenta="volver"`, nombre accesible «Volver a Tu cuenta») y los cinco «Volver» del final se quitaron (la contraseña conserva «Guardar» y el historial «Ver más»; una fila de botones sin ninguno a la vista no deja hueco). **«Cerrar» sigue en las vistas de dentro**, a la derecha. El foco inicial cae en «Cerrar»; al entrar en una vista sin campo que pida el foco, en «‹ Tu cuenta»; al volver, en la fila que abrió la vista. `scroll-padding-top` del diálogo: lo que recibe el foco no queda bajo la cabecera. La cabecera lleva `view-transition-name: none` (es la misma en todas las vistas; si compartiera `dc-cuerpo` la transición se rompería). El estado de la cabecera se pone en `vistaCuenta` (no en `irA`: `abrirSistema()` entra directo). Con letra grande en menos de 360 px, título y botón bajan un punto para caber en un renglón.
- **301 · «Este dispositivo» en dos niveles** (`index.html: .dc-sec`, `#dc-mas`; `cuenta.js: ajustarMas`). Cada grupo de «Tu cuenta» va en su caja (`#dc-sec-libro`, `#dc-sec-disp`, `#dc-sec-admin`, `#dc-sec-salir`): **los tres grupos y su orden no cambian** (campamento 20). En el teléfono y la tablet quedan a la vista avisos, tema, tamaño de letra, efectos, pantalla y **«Atajos de teclado», que no se pliega** (WCAG 2.1.4: tiene que estar a la vista cuando los atajos pueden dispararse; ver 24-pulido-final-b); los siete que se tocan una vez en la vida (contraste, colores de ganancia, madrugada, pantalla grande, la tele duerme, título y sonido) van bajo **«Más ajustes de este aparato»** (un `<details>` nativo de 48 px), que recuerda si lo dejaste abierto (`localStorage` `libro.cuenta.mas`, con try/catch). Dentro del grupo, contraste, ganancia y madrugada pasan al plegado y atajos sube junto a pantalla: es el único cambio de orden. **Escritorio (≥ 1100 px)**: el menú se ensancha a dos columnas (`min(54rem, …)`; «El libro», «Administrar» y salir a la izquierda, «Este dispositivo» a la derecha) por colocación en la rejilla, sin mover nada en el documento (el orden del tabulador sigue siendo libro → este dispositivo → administrar → salir); el plegado se abre desde JS y su resumen se esconde; ese estado forzado no se recuerda.
- **302 · El valor de cada ajuste, en tinta** (`.dc-v`). El valor deja la píldora naranja y va en `--txt2`, a la derecha, en el renglón de su nombre: el nombre se parte si no cabe; el valor ocupa lo que mide, hasta la mitad de la fila (un nombre de montaña largo o «automático (alto, como pide el sistema)» se parten dentro de esa mitad) y **nunca cae solo al renglón de abajo**. Dos textos: «Modo madrugada» dice sus horas en el valor cuando está encendido («de 22:00 a 5:00»; antes «Modo madrugada (22:00 a 5:00): automático») y el título de la pestaña dice «saldo y precio». Con alto contraste, la fila al pasar el ratón se marca con su filo (`--s3` es ahí un color de borde: el valor quedaba a 3.5:1 sobre ese fondo).
- **303 · En el dock, «Movimientos» cabe** (bloque «Campamento 20 (9/9)» de `styles.css`). Con «Anotar», las columnas son `1fr 1fr hueco 0.84fr 1.16fr`: la de «Movimientos» toma de la de «Historia» (44 px de texto, le sobra) y los dos lados del hueco siguen sumando 2fr, así que «Anotar» queda en el centro exacto. En el modo compacto de menos de 360 px (solo la activa lleva nombre) la letra es la de 360–389 px y sin relleno lateral; quien solo mira conserva **sus cuatro pestañas parejas** (campamento 20) y, a menos de 360 px, su letra baja un punto.
- **304 · Escritorio: «Anotar compra» al final de la barra de pestañas** (`index.html: #barra`, `pestanas.js: colocarAnotar`). Desde 1100 px y por pestañas, el botón se muda a `#barra`, **después de `<nav>`** (no dentro: `aplicar()` y las flechas recorren los hijos de `nav`), y la caja es la pegajosa; con la mini-cabecera a la vista lleva `--fondo` detrás (como el `box-shadow` que ya tapaba la rendija sobre la barra): nada de la página asoma junto al botón. En el teléfono, la tablet y «todo junto» vuelve a su sitio de siempre (antes de `#compras`); si tenía el foco, lo conserva. Historia ya no reserva una columna para el botón. Orden del tabulador: las pestañas y, enseguida, la acción; el atajo `A` no cambia. Fuera del escritorio `#barra` es `display: contents`.

## Medidas (escenario `anio`, Daf3r, oscuro, de noche)

| | Antes (`claude/vida-51`) | Después |
|---|---|---|
| «Tu cuenta» a 390×844: alto del menú | 1,611 px | 1,203 px (la tarjeta preveía ~1,210) |
| «Tu cuenta» a 390×844: «Cerrar» | a 1,541 px del borde (la ventana enseña 812) | arriba (14 px), siempre a la vista |
| «Tu cuenta» a 320×568: alto / «Cerrar» | 1,815 px / a 1,745 | 1,323 px / arriba |
| «Tu cuenta» a 1440×900: alto | 1,659 px (ventana 868) | 922 px (dos columnas; la tarjeta, ~918) |
| Filas partidas en dos renglones (390 / 320) | 3 / 11 | 1 / 6 |
| «Tu cuenta» a 2560×1440 / lectora a 390 / 320 con letra muy grande | 1,748 / 1,316 / 2,362 px | 965 / 913 / 1,700 px |
| Dock a 390: casilla de «Movimientos» / su texto | 69 / 74 px (se salía) | 80 / 74 px |
| Dock a 360: casilla / texto | 62 / 67 px | 71 / 67 px |
| «Anotar compra» a 1440: x en Resumen · Gráficos · Historia · Movimientos | 862 · 862 · 1082 · 272 | 1082 en las cuatro (y = barra + 6) |
| «Anotar compra» a 2560 | 1455 · 1455 · 1762 · 720 | 1762 en las cuatro |
| Al bajar por la lista entera (1440, cada 23 px): posiciones con algo de la página junto al botón | 501 de 167 muestras (4 puntos por posición) | 0 de 163 |

## Decidido por el dueño / propuesto por mí

- **Por el dueño** (aprobó las cinco tarjetas tal cual): «Cerrar» arriba y «‹ Tu cuenta» dentro; los siete plegados y las dos columnas de escritorio; **el valor en tinta, que deshace el «valor resaltado» del rediseño de Fable** (16-pulido-2; anotado allí); el reparto del dock; «Anotar» al final de la barra en escritorio.
- **Mío** (al implementar): «Cerrar» se queda también en las vistas de dentro (cerrar desde cualquier sitio, sin volver primero); el foco al entrar en una vista y al volver; los nombres de clase (`.dc-cab`, `.dc-sec`, `.dc-mas`, `#barra`); que los atajos suban junto a «Pantalla» (antes del plegado); que el plegado se recuerde por dispositivo y que lo abierto a la fuerza en escritorio no cuente; dos columnas solo en la vista del menú (las de dentro conservan su ancho); el reparto 0.84/1.16 en `fr` (la tarjeta daba píxeles que solo valían para 390) y solo con «Anotar» (para no romper las «cuatro pestañas parejas» del campamento 20); el compacto de menos de 360 px con letra más pequeña en vez de otra columna (ensancharla descentraba más a «Anotar»); el fondo de la barra solo con la mini-cabecera a la vista; el filo en alto contraste al pasar el ratón.
- **Fuera**: lo demás de la auditoría (305+, 308, 311, 315, 317) es de otras tandas o está descartado. La guía de estilo no cambia: no enseña las filas de «Tu cuenta» ni el dock (la 316, «la guía al día», va con el campamento 64).

## Pruebas

- Bloque nuevo de `test_ui` «campamento 62: menús» (22 comprobaciones): las cinco piezas, en teléfono (390, 360, 320; dueño y lectora) y escritorio (1440).
- Cambiaron pruebas viejas: las que volvían con `#dc-… [data-cuenta="volver"]` (test_ui y axe) usan `#dc-volver`; «20·cuenta» ya no espera «cerrar» al final y recorre los grupos (`.dc-sec`) en vez de los hijos de `.dc-lista`; «21B·42» busca el grupo con `closest('.dc-sec')`; «tu eco» lee la madrugada por sus horas. `entrar()` abre el plegado por defecto (`masAjustes`, como las pruebas viejas corren en «todo junto»): las que tocan esos siete ajustes en un iPhone siguen igual; la del 62 lo mira cerrado.
- `auditoria_axe`: «Tu cuenta» con el plegado cerrado y abierto a media bajada, una vista de dentro, y en escritorio las dos columnas y «Anotar» en la barra bajando por la lista (claro y oscuro).

## Verificado (tras el último cambio de código, `739a7cd`)

Registros y capturas en el scratchpad de la sesión (`c62/`).
- `test_lib` 1,006 · `test_api` 1,314 · `tsc` · Biome (80 archivos, 0 avisos) · recorte (70 archivos) · ruff · mypy: en verde.
- `test_ui` completo en tres partes: 737 + 673 + 1,062 comprobaciones (73 bloques), en verde.
- axe: 346 estados, sin violaciones. Barrido `rapido` normal y por pestañas (448 combinaciones): todo en orden.
- Banco de la escena: **los 21 casos dan los mismos nodos y las mismas animaciones** que `claude/vida-51`.
- Regresión visual contra `claude/vida-51`: cambian a propósito `tu-cuenta-movil-dark` (6.66 %) y `tu-cuenta-movil-light` (6.70 %); `una-compra-movil-light` (1.58 %) es la escena que sale de dos formas según la carga (conocido desde el pulido final b); las otras 12, iguales.
- Lighthouse móvil, A/B alternando seis veces con `claude/vida-51` (cuatro con la base primero y dos con la rama primero): mediana de las medianas de la app **50 la base y 48 la rama** (base 54 · 49 · 51 · 46 · 51 · 45; rama 50 · 48 · 49 · 45 · 45 · 48). El sandbox iba lento ese rato (las dos por debajo del mínimo de 70 del CI, también la base; en el campamento 51 daba 66–67): la diferencia cabe en el ruido (la base sola va de 45 a 54). Accesibilidad y buenas prácticas, 100 en todas.
- Capturas de lo nuevo (22 combinaciones: 320, 390, 768, 1440 y 2560 en claro de día y oscuro de noche, letra grande y muy grande, alto contraste, acostado 844×390 en los dos temas, y los tres niveles de efectos): sin errores de página.

## Sin probar aquí

- **iPhone real y Safari**: la cabecera pegajosa dentro de un `<dialog>` modal en iOS (la sobrecarga de `position: sticky` en un diálogo que desplaza; en Chromium va bien), el dock nuevo sobre la zona segura y el `<details>` del plegado con VoiceOver. Pedirle al dueño: abrir «Tu cuenta», bajar hasta el final y comprobar que «Cerrar» sigue arriba; entrar en «Sesiones abiertas» y volver con «‹ Tu cuenta»; abrir «Más ajustes de este aparato», cerrar y volver a abrir la cuenta (debe recordarlo); la pestaña «Movimientos» del dock dentro de su píldora.
- WebKitGTK del sandbox: no se pudo entrar con la cuenta de prueba (la entrada no terminó en 30 s), así que no hay ni la evidencia parcial de otras veces.
- La tele no se toca (no tiene «Tu cuenta» ni dock).
