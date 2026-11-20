# Campamentos 39–50 · La vida del valle (plan definido, sin implementar)

**Estado (19 nov 2026): definido y APROBADO POR EL DUEÑO («todo aprobado»), no hecho.** Es la siguiente ronda de ideas para dar más vida al paisaje, al valle, al pueblo de osos, a los osos de la cumbre y a «Tú», según la hora, el día y la fecha. Se implementa **otro día**, cuando el dueño marque lo que quiere. Nada de esto está en el código; lo implementado hasta hoy son los campamentos 26–38 (PR #97, en producción).

## Aprobación del dueño
El 19 nov 2026 el dueño dijo **«todo aprobado»**: todas las ideas del artifact v4 (campamentos 39–50, ids 124–222 y las «después» reexaminadas), incluidas las que **cambian una regla** y las que él había dejado a la familia (Viernes Santo, Difuntos, inditos, misa de gallo, tecolote). No hace falta pedirle la elección marcada: se implementa **todo**, en el orden de arriba. Lo que quede por confirmar de oídas (cerco de la luna 171; «Siete Cabritas» y «Alacrán» 180) se implementa con el dato más probable y se le avisa en el reporte del campamento. Las ideas que cambian una regla actualizan `CLAUDE.md` en el mismo commit. Todavía **no se ha dicho «arranca»**: espera la orden del dueño (dijo que «otro día»).

## Dónde está cada cosa
- **El artifact** «La vida del valle» (v4, privado del dueño): https://claude.ai/artifact/LfxVgi3TnM2ER36iXUL9Tm. Ahí se marca cada idea (sí / después / no) y se copia la elección con «Copiar mi elección». La elección se guarda en el navegador del dueño, por id, así que **hay que pedírsela al dueño pegada** antes de implementar.
- **El texto de todas las ideas** (ids, dónde se ve, cuándo, costo en nodos y animaciones, riesgo, qué exige) está en `docs/pulido-visual/vida-del-valle/`: `ideas_vida.py` (ids 1–43, ronda 1), `ideas_pueblo.py` (ids 100–123), `ideas_v4.py` (ids 124–222 y las «después» reexaminadas) e `ideas_fiestas.py` (las fiestas). Son los datos con los que se generó el artifact; las rutas a capturas dentro de ellos apuntan al scratchpad de aquella sesión y ya no existen.
- **El prototipo de las maquetas** (personajes nuevos del pueblo y retoques sobre la escena viva, **no es código final**): `docs/pulido-visual/vida-del-valle/prototipo-vida4.patch` (toca `arte-vecinos.js` y `cielo.js` sobre `origin/main` del 19 nov 2026).
- **Qué se mide y con qué tope**: `docs/rendimiento.md` y `tests/banco_rendimiento.mjs`.

## Estado del presupuesto (medido el 19 nov 2026, sobre `main`)
- Escena del teléfono: **926 nodos** un día normal y **1030 en Nochebuena** (tope 1100). Valle: 187–221 de 300. Osos: 33–35 de 40.
- **Lo que aprieta es la noche de lluvia**: 102 de 110 animaciones, y el dibujo grande va en **55 de 56**.
- Un turno nuevo del pueblo cuesta **0 nodos** (se rehace el mismo grupo de vecinos).
- Medida real del dueño en iPhone (430×873, app instalada, efectos «todos»): **59 fps** al deslizar, 0.83 s hasta ver el saldo.

## Orden recomendado (una sola rama, un commit por campamento, un solo PR; el CI de GitHub es limitado)
1. **39 · Hacer sitio 2** (ids 124–135). Primero: libera unos 131 nodos a las 21:00 de Nochebuena y unos 96 en el pico (23:50–0:30), y unas 44 animaciones de noche. Sin cambio visible. La 125 (cohetes solo en su hora) cambia una regla chica.
2. **41 · Fiestas: la Navidad entera** (24, 25, 31, 1 y 6 de enero; ids 210–218 y 162). **Tiene fecha**: la ventana navideña empieza el 1 de diciembre. La 210 es la pieza que lo permite: el día de fiesta cambia los turnos, y la noche del 24 y del 31 las luciérnagas descansan para que se mueva un actor de la fiesta.
3. **40 · El día entero del pueblo** (136–148).
4. **42 · Fiestas: el resto del año** (149–151, 153, 156–160, 219–222): 10 de mayo, Día del Padre, 14–15 de septiembre, Día del Niño, Difuntos, Semana Santa y los dos cumpleaños.
5. **43 · Temporadas del pueblo** (152, 154, 155, 161, 163, 164) · **44 · Lluvia y verano** (165–171) · **45 · Animales de aquí** (172–178 y 54) · **46 · Luna y estrellas** (179–183) · **47 · Los osos de la cumbre** (184–190, 24, 26, 45) · **48 · «Tú» con más gestos** (191–198, 40, 41) · **49 · El pueblo se mueve 2** (199–204, 116, 25, 118, 119) · **50 · Cambios grandes al paisaje** (205–209 y 123).

Cada fiesta dura **todo su día**, con guion por turnos (madrugada, mañana, mediodía, tarde, anochecer, noche, medianoche) y su peor momento declarado.

## Dependencias
- Exigen antes el **39**: 116, 199, 200, 25 y 201 (necesitan el banco, 124); 202 (humo del fogón: además la 127, porque suma una animación al dibujo grande); 203 y 206 (además la 131, presupuesto de pantallas anchas).
- Quedan en «después» tras el 39: 45, 118, 119, 123, 198, 204, 205, 207, 208 y 209.
- Los ahorros del 39 (125–128) están **contados sobre la escena, no implementados**.

## Decisiones del dueño pendientes
- **Cambian una regla** (se implementan solo con su visto bueno): 125, y en «después» 119, 129, 132, 134, 204 y 207.
- **Para que decida la familia**: Viernes Santo (150), Difuntos (159; el v3 lo descartaba y se reabrió porque el dueño lo pidió), inditos (160), misa de gallo (dentro de la 211) y el tecolote (173).
- **Datos de oídas que el dueño debe confirmar**: el cerco de la luna como anuncio de lluvia (171) y los nombres «Siete Cabritas» y «Alacrán» (180).
- Los cumpleaños (221 y 222) van solo en la cumbre y con «Tú», **nunca en el pueblo ni en la entrada** (privacidad de la familia).
- Si el dueño quiere subir el valle por encima del velo del pie en el teléfono acostado (844×390) y a 320 px (hoy el pueblo queda bajo el velo): ya estaba decidido dejarlo así; sería idea aparte.

## Quién lo hace (decidido con el dueño, 19 nov 2026)
- **Opus implementa todo** (39 al 50): código, pruebas, mediciones, capturas, documentación y commits, como en 26–38. Una sola sesión por ronda; parte de la rama `claude/plan-39-50`.
- **Fable solo para el arte nuevo** (sobre todo las fiestas, campamentos 41 y 42: osos con gorro, piñata, cena de Nochebuena, cuenta regresiva del 31): entrega los dibujos terminados y Opus los integra y los prueba. Si el prototipo (`prototipo-vida4.patch`) ya trae el dibujo, no hace falta.
- **Orden**: Opus hace 39 y 41 primero (el 41 tiene fecha: 1 de diciembre). Fable (o el agente principal) hace al final un repaso crítico de las capturas para detectar cosas raras, como pasó con las casas.
- **Para gastar menos**: un solo PR, y capturas solo por campamento.

## Experimento con ChatGPT (20 nov 2026): descartado, se hace desde cero con Opus y Fable
El dueño probó el campamento 41 con ChatGPT en la rama `chatgpt/campamento-41`. Resultado de la revisión: **el arte y los guiones por turnos de las cinco fechas estaban muy bien**, pero la rama tenía un defecto real (trazos SVG con `NaN` en la coordenada Y de un perro, que rompía los bloques 22C y 25 de `test_ui`; sospecha: `perroEnLaComida` y `perroBajoBanca` en `arte-pueblo.js`) y un costo de rendimiento en Nochebuena (1030→1040 nodos, 1055 en la cena del 24; crear la escena de 53 a 82 ms; el Lighthouse propio de ChatGPT dio 68 contra 71 en la base). **Decisión del dueño: no se toma esa rama; todo se hace desde cero con Opus (código) y Fable (arte).** La rama queda solo como referencia visual (la plaza a las 7:45, la cena de las 17:45, la misa de gallo de las 21:00, los abrazos de las 23:50 y los carritos del 25). Para que Opus no repita el defecto: todo trazo nuevo debe validarse contra `NaN` (una comprobación que falle si algún `d` del pueblo lo contiene) y la suite completa de `test_ui` debe correrse entera antes de decir «listo».

**Cuándo se arranca**: cuando el dueño lo diga («arranca»), por tener poco límite ahora; el orden sigue siendo 39 → 41 → 40 → resto.

## Cómo se ejecuta (igual que 26–38)
- Una rama, un commit por campamento (cada commit deja la rama verde por sí solo), capturas reales de cada uno para el dueño, `CAMBIOS` (3–6 frases) donde haya algo visible, su documento en `docs/campamentos/` con su línea en el índice de `CLAUDE.md`, y la «Definición de terminado» completa (todos los tamaños, claro/oscuro, día/noche, los tres niveles de efectos, `test_lib`, `test_api`, `test_ui` en tres partes, axe, barridos, Lighthouse, banco, regresión visual; medir antes/después cuando se toque la escena).
- **Las pruebas no dependen del día de la semana**: los datos del escenario cambian con él (un jueves falló el bloque de los osos a 320×568); fijar `FECHA_PRUEBA` en el servidor de pruebas cuando un bloque dependa de la cifra exacta del saldo.
- El dueño mezcla y despliega; el agente no. Lo que no se puede probar aquí (iPhone/Safari real, la tele, VoiceOver, `/medir` en las franjas nuevas y en diciembre) se dice y se le pide al dueño.
- Reglas de siempre: la app informa y nunca recomienda, los osos no hablan ni aconsejan, privacidad de la familia, la forma de la montaña no cambia, CSP sin estilos en línea, solo `transform`/`opacity` en lo animado, una animación corre solo cuando su pieza se ve, un solo animal en movimiento a la vez (`data-mueve`), nada de lo descartado por el dueño.
