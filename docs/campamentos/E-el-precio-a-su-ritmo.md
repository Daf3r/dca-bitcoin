# Campamento E · El precio, a su ritmo (25 nov 2026)

La parte **E** del diseño de Fable («Diseño A–F», sección «E · Cuando el precio baja o sube» de `docs/pulido-visual/vida-del-valle/diseno-24nov/diseno-celebracion-nodo-miles.html`; fuente en `hacer.py`, maquetas en `js/maqE.mjs`), aprobada por el dueño con las decisiones de [39-50-decisiones-diseno.md](39-50-decisiones-diseno.md) (punto E). Apilado sobre el 48 (rama `claude/vida-e` sobre `claude/vida-48`).

**El principio** (de Fable): el valle nunca se ve peor por el precio. Si la semana del precio va hacia abajo, los vecinos se juntan; si va hacia arriba, salen. Ningún estado es mejor que otro, casi siempre es la calma, **no cambia ningún texto, no se toca el cielo** y los brazos arriba, los cohetes y los farolitos siguen siendo de los hitos.

## Lo hecho
- **La cuenta** (`lib.js: animoDelValle`, `animosDeSerie`, `ANIMOS`, `UMBRAL_ANIMO`; pura, con JSDoc que revisa `tsc`). Cinco estados activos: `calma`, `fresco`, `abrigo`, `aire` (aire libre) y `plaza`; **sin la Manta** (decidido). Con los umbrales del diseño:

  | Estado | Entra cuando | Se queda mientras (la vuelta: dos tercios del umbral) |
  |---|---|---|
  | Calma | nada de lo de abajo | — |
  | Fresco | semana ≤ −8 % | semana ≤ −5.3 % |
  | Abrigo | semana ≤ −15 % **o** 22 % o más bajo el máximo de 30 cierres | semana ≤ −10 % o 14.7 % bajo el máximo |
  | Aire libre | semana ≥ +8 % | semana ≥ +5.3 % |
  | Plaza | semana ≥ +15 % | semana ≥ +10 % |

  «Semana» = el cierre del día frente al de siete días antes (el cambio de un solo día no cuenta). Si coinciden una caída lejos del máximo y una semana de subida (un rebote), manda la semana. **Tope**: siete días seguidos en el mismo lado (contando fresco y abrigo juntos, o aire y plaza juntos); después, la calma, y no vuelve hasta que la medida salga y vuelva a entrar. Sube de grado (fresco → abrigo) solo con los umbrales de entrar.
- **Una vez al día, como mucho.** El estado de hoy es el del **último cierre completo** (el de ayer; nunca el precio vivo), mirando solo los 120 días anteriores a hoy (`hoyISO`, la hora de El Salvador): el mismo resultado en cada aparato aunque cada uno pida el histórico desde otra fecha. Sin histórico, o con el último cierre de hace más de tres días: calma. Es 100 % determinista y sale de precios públicos (el histórico que la app ya tiene), nunca de las compras ni de nadie: «nada depende de si se compró» sigue intacta.
- **Dónde se aplica** (`datos.js: cargarHistorico` → `montana.js: ponerAnimo`). Cuando el histórico llega **completo** (mientras el servidor rellena, espera: los vecinos no se rehacen varias veces al abrir), se calcula y se deja en `<html data-animo>` (sin el atributo: la calma). Si lo que se ve cambia, **se rehacen solo los vecinos** (`.v-vecinos` y la capa del actor) de cada escena viva, por el mismo camino que el cambio de turno pero **sin que nadie camine**; con la fiesta del hito en marcha, espera (al acabar, la fiesta pone a los del momento). Con la página abierta de un día para otro (la tele), `libro:dia` vuelve a pedir el histórico para traer el cierre de ayer (solo si cambió el día real, no con `libro.dia`).
- **Qué se ve** (`arte-vecinos.js: reparto`, opción `animo`): otro reparto de los **mismos vecinos, poses y trazos** (0 nodos nuevos: como mucho +1 si sale un tono que a esa hora no salía; 0 animaciones). Solo en los turnos de un día cualquiera (no el sábado de plaza, la misa, el desfile, la posada ni la Navidad entera: E5, «quién manda») y **siempre después del reparto del turno**: si la calle va llena (ocho como mucho), lo del ánimo es lo que no sale; el actor del turno nunca cambia.
  - *Fresco*: un vecino se sienta con la abuela en su corredor (`sentado`, como los encuentros del 52).
  - *Abrigo*: además, otra pareja sentada en el corredor de al lado.
  - *Aire libre*: la ropa tendida sale cualquier día (en sus turnos de siempre; el jueves, los uniformes; los demás, las sábanas) y un vecino de paseo en la plaza.
  - *Plaza*: lo de aire libre y un segundo vecino de paseo.
  
  En cuántos ratos se nota (simulación con los sitios del teléfono y del escritorio de `test_lib`, una semana de octubre cada cuarto de hora): por la mañana, a mediodía y al anochecer salen 1 a 2 vecinos más o la ropa tendida; en la tarde de la pelota la plaza ya va llena y casi nunca cabe nada. **En el teléfono el cambio es pequeño a propósito** (lo dice el diseño: se nota si miras el pueblo, no te lo grita).
- **El interruptor** «El valle sigue al precio: sí/no», por aparato, dentro de «Más ajustes de este aparato» (ahora son ocho; «Atajos de teclado» sigue fuera). Encendido de fábrica; apagado guarda `libro.valle.precio = 0` (con try/catch; si el almacenamiento falla, vale esta visita) y el valle vuelve a la calma sin recargar. Es un ajuste con valor, no una fila que navega: no va en la lista `data-cuenta` del CSS.
- **Para probar** sin esperar al mercado: `localStorage` `libro.animo` = `calma`, `fresco`, `abrigo`, `aire` o `plaza` (como `libro.hora`). Con el interruptor apagado manda el interruptor.
- **«Qué hay de nuevo»**: `2026-12-w`, cinco frases, sin «compra», «vende», «baja», «sube» ni juicios; resume también el 48 y el 47.

## La prueba de que nada aconseja
- `test_lib` (ánimo E): los umbrales, la vuelta, el tope, el rebote, que el cierre de hoy no cuenta hasta mañana, que da lo mismo con un año más de histórico delante; que lo del ánimo solo sale en los turnos de un día cualquiera, con el mismo actor, sin poses de fiesta (`oseznoArriba`, `estira`, saludos, estrellitas, abrazos, brindis, volcancitos), ocho como mucho y nadie dos veces; que cada estado se nota en varios ratos del día en el teléfono y en escritorio; y que la entrada de `CAMBIOS` y la etiqueta del interruptor no tienen palabras de compra, venta ni juicio (compra, vende, aprovecha, momento, oportunidad, barato, caro, baja, sube, rojo, verde, alarma…).
- `test_ui` («campamento E»), a 390 y 1440 px, a las 10:00 y a las 15:00 de un martes con escuela (`libro.dia`, `libro.hora`), para cada estado frente a la calma: **todo el texto de la página es idéntico** (`innerText`, todas las `aria-label`/`title`/`alt` y la descripción de la montaña, `#m-desc`), **el cielo y los demás atributos de `<html>` no cambian** (solo `data-animo`), el pueblo sí cambia, sin nodos ni animaciones nuevas, sin piezas de fiesta (cohetes, festejo, farol del hito, el que camina) ni clases nuevas salvo un tono de siempre, y sin `rojo`/`verde`/`alarma`. Y el interruptor: dentro del plegable, encendido de fábrica, apagado vuelve a la calma y se recuerda.

## La simulación (lo que vería el valle cada día)
Con `animoDelValle` día por día (`scratchpad/ce/sim.mjs`).

| Serie | Días | Calma | Fresco | Abrigo | Aire libre | Plaza | Cambios al año | Racha más larga (no calma) |
|---|---|---|---|---|---|---|---|---|
| Precios simulados del servidor de pruebas (seis años; los de `anio`, `largo` y `mil` son la misma serie) | 2186 | **84.3 %** | 4.8 % | 2.1 % | 7.4 % | 1.5 % | 30 | 7 |
| **Histórico real** (cierres diarios públicos de Coinbase BTC-USD, 25 nov 2020 – 25 nov 2026) | 2192 | **74.6 %** | 7.3 % | 4.5 % | 9.1 % | 4.5 % | 49 | 7 |
| Real, últimos tres años | 1097 | 80.7 % | 6.1 % | 1.7 % | 9.0 % | 2.5 % | 39 | 7 |
| Real, último año | 366 | 89.3 % | 1.6 % | 4.1 % | 3.3 % | 1.6 % | 22 | 6 |

Con la serie de prueba la implementación reproduce la tabla de Fable (84 % de calma). **Con el mercado real los mismos umbrales dan 74.6 % de calma en seis años** (Fable ya lo advirtió: «los precios de prueba son más suaves que el mercado real»). No retoqué los umbrales: son los aprobados. **Propuesta para el dueño** (barrido `scratchpad/ce/barrido.mjs`, todos los umbrales ×k): con ×1.4 (fresco −11 %, abrigo −21 % o 31 % bajo el máximo, aire libre +11 %, plaza +21 %) el histórico real de seis años da **83.8 % de calma** y 30 cambios al año; con ×1.3, 82.1 %. Es un cambio de una línea (`UMBRAL_ANIMO`) y de los números de las pruebas.

**El límite**: la serie real es la de velas diarias públicas de Coinbase (la misma fuente que usa el servidor), bajada desde el sandbox; no es la tabla `historico` que guarda la app en producción. La repetición con esa tabla queda del dueño (`/api/historico?desde=2020-11-25` y `sim.mjs`).

## Medidas (banco, `--rapido`)
Casos nuevos (`ánimo …`, con `libro.animo`, mil compras, un miércoles de escuela). Los vecinos van en un trazo por tono: un vecino más no es un nodo más.

| Caso | Calma (antes) | Fresco | Abrigo | Aire libre | Plaza | Animaciones a la vista |
|---|---|---|---|---|---|---|
| 390 × 664, 10:00 | 849 | 850 | 850 | 850 | 850 | 13 en los cinco |
| 390 × 664, 15:30 (pelota) | 844 | 844 | 844 | 844 | 844 | 15 en los cinco |
| 1440 / 1920 / 2560, 10:00 (plaza y abrigo) | — | | 914 / 931 / 930 | | 914 / 931 / 930 | (solo nodos; tope 1100) |
| tele 1920 × 1080 (plaza 10:00, abrigo 15:30) | 930 (día normal) | | 925 | | 931 | 13 y 15 (tope 24) |

Valle 193–210 (tope 300), osos 26–37 (tope 46). Sin cambios en el resto: el banco entero antes (`banco-antes.txt`, todo en verde) y solo los casos «ánimo» después (`banco-despues.txt`, en verde); la calma pasa por el mismo código que antes. Fotogramas con CPU 4× no medidos (`--rapido`).

## Decidido por mí (no por el dueño)
- **El tope cuenta por lado** (fresco y abrigo juntos; aire y plaza juntos) y es de siete días para todos. El diseño daba 7 para abrigo y aire libre y no decía nada de fresco y plaza (sus rachas simuladas ya eran 6 y 7).
- **Cambia una vez al día** (el último cierre completo), no «al cambiar de turno» como decía E1: el precio vivo haría que el estado cambiara dentro del día, y los cierres diarios lo dejan determinista y quieto. Con la página abierta, el cambio llega al pedir el histórico del día nuevo.
- **Qué se ve, sin arte nuevo**: el diseño proponía bufandas, humo de chimeneas, chocolate, un farolito, piscuchas de más y la manta (arte nuevo y animaciones). Con la regla «otros repartos y poses de los mismos vecinos, 0 animaciones» se quedó en compañía (parejas sentadas) y aire libre (ropa tendida, paseo). El humo no se tocó: serían animaciones a la vista de más. Si el dueño quiere las bufandas o el humo, es trabajo de Fable (arte nuevo).
- **Hoy es el de El Salvador real** (`hoyISO`), no `libro.dia`: el estado sale del mercado, no del calendario de prueba; para probar está `libro.animo`. Por eso las pruebas viejas (que fijan `libro.dia`) siguen en calma: además, con los precios del servidor de pruebas, la calma sale cualquier día (su cola va anclada a `HOY`).
- **Sin repintar la escena entera** al llegar el histórico (lo que hace `libro:dia`): habría cortado la subida de «Tú» al abrir. Se rehace solo el grupo de los vecinos, y solo si el estado no es la calma (casi nunca).
- **La etiqueta**: «El valle sigue al precio: sí/no» (E7 la llamaba así).

## Lo que quedó fuera
- La **Manta** (los tres osos de la cumbre bajo una manta de añil): fuera por decisión del dueño.
- Bufandas, humo, chocolate, farolito y piscuchas de más (arte nuevo; ver arriba).

## Sin probar aquí
- iPhone real y Safari/WebKit (el cambio es un repintado de un grupo SVG una vez al abrir, si el estado no es la calma).
- El histórico real de producción (ver «El límite»).
- Lighthouse A/B: no se corrió (verificación ligera por encargo).
