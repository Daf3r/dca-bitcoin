# Campamento 44 · Lluvia y verano

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Antes: [43](43-temporadas-del-pueblo.md) (los turnos de temporada `tp-…`: el mismo patrón), [46](46-luna-y-estrellas.md) (`COSTUMBRES` y el halo de la luna), [01](01-efectos-cielo-atmosfera.md) y [12](12-el-salvador-en-la-escena.md) (la llovizna de la tarde, la época seca y la lluviosa), [28](28-segun-el-momento.md) (el paraguas de los osos de la interfaz), [47](47-los-osos-de-la-cumbre.md) y [48](48-tu-con-mas-gestos.md) (el paraguas de la cumbre y el capote de «Tú»), [30](30-hacer-sitio.md) y [38b](38b-pulido-integral.md). El plan: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md). Las ideas: `docs/pulido-visual/vida-del-valle/ideas_v4.py` (ids 165, 166, 167 y 171); las poses `paraguas`, `hojaHuerta` y `oseznoSalta`, de `prototipo-vida4.patch`, y los charcos (`charcos3`), de `prototipo-vida5.patch`, tal cual.

**Alcance (decidido por el dueño el 26 nov 2026)**: solo la parte de Opus, las ideas 165, 166, 167 y 171. **168 (el nubarrón), 169 (el cielo de cada mes) y 170 (los meses en flor) son de Fable** (colores y arte nuevo): no se tocaron; están en [65-arte-para-fable.md](65-arte-para-fable.md).

## Lo hecho (26 nov 2026)
Es **lluvia de calendario**, la misma regla de la llovizna de siempre (nunca el clima real: «que llueva cuando llueve» está descartado). Todo quieto: **ningún actor, ninguna animación, ninguna capa nueva**.

| Idea | Cuándo | Cómo |
|---|---|---|
| 165 · tardes de lluvia | las tardes que llueve (abajo), 14:00–17:45 | turno nuevo `tp-lluvia` (en lugar de `tarde` y `vuelta`): la de la tienda y la maestra con su paraguas, uno tapándose con una hoja de huerta (el milpero los días que baja; si no, el pescador), la abuela en su corredor y dos o tres oseznos **bajo el corredor de al lado**. Nadie en la plaza: **no sale la pelota** (`hayActor(…, 'pelota')`: la franja de 15:00 a 16:30 queda sin actor, y sin el segundo principal de las pantallas anchas) ni el recado. La rutina «pelota» de la descripción se cambia por «los oseznos se quedan bajo el corredor» |
| 166 · charcos | al escampar, de 17:45 a 18:30, solo si llovió (el turno de las 17:40 fue `tp-lluvia`) | turno nuevo `tp-charcos`: el de las pupusas (la misma carta del día) con los charcos en la plaza y dos oseznos saltando en ellos (pose quieta). A las 18:30 cambia el turno (`libro:turno`): los charcos se van |
| 167 · la canícula | 15 de julio – 15 de agosto (fechas fijas y aproximadas) | no llueve por la tarde: **se podan** la nube cargada y sus 20 gotas, el capote de «Tú» y el paraguas de la cumbre (`fueraDeTemporada`); no salen los paraguas de los osos de la interfaz; vuelve el aire seco de la tarde (`html[data-canicula]`); la ropa tendida se queda hasta las 16:00 como en la seca. La línea de hoy lo cuenta el 15 de julio |
| 171 · el cerco de la luna | noches de la lluviosa (no en la canícula) con la luna crecida (iluminada al 75 % o más), 19:00–5:00; nunca en un eclipse | `html[data-cerco]`: el halo de siempre, más cerca (`scale(0.65)`) y con su borde trazado como un anillo pálido (`stroke`), y su luz un poco más ancha. Solo CSS: 0 nodos, nada se redibuja. En la entrada no (su halo ya crece al escribir el usuario: se vería saltar el anillo) |

- **Una sola regla para «esta tarde llueve»**: `cielo.js: llueveLaTarde(f)` (`html[data-lluvia]`, el día entero). Llueve en la época lluviosa **salvo** en la canícula y salvo **las tardes de costumbre**: el domingo de la mejenga, el sábado de la atolada y las tardes de una fiesta del año (10 de mayo, 17 de junio, 14 y 15 de septiembre, 1 de octubre…). La leen el pueblo (`turno`), la llovizna del cielo (CSS y `fueraDeTemporada`), el capote de «Tú» (`TU`), el paraguas de la cumbre (`.c-lluvia`), los osos de la interfaz (`.v-lluvia`), la nube baja de la tarde y la fiesta del hito (`fiesta.js`: de día, sin farolitos si llueve). De noche sigue mandando la época (los relámpagos, las luciérnagas de más, la tormenta lejana): la canícula es de las tardes.
- **Lo de otra temporada no se dibuja**: la llovizna (nube y 20 gotas) se poda **todos los días que no llueve**, también los de la seca (antes se escondía con el CSS en la seca y seguía en la escena): de ahí los −23 nodos de la seca en el banco (abajo).
- **Dónde vive**: `cielo.js` (`canicula`, `llueveLaTarde`, `charcos`, `cerco`, `turno`, `hayActor`, `fraseRutina`, `temporadaDelPueblo().seco`), `arte-vecinos.js` (las poses y `charcos3`, el reparto de `tp-lluvia` y `tp-charcos`, `COSAS`, `DIARIOS`, `PERRO_TURNOS`), `montana.js` (`fueraDeTemporada`), `fiesta.js`, `styles.css` (la llovizna, el aire seco, los paraguas de la interfaz, el perro de `tp-charcos` y el cerco), `lib.js` (`FRASE_TURNO`), `guia.js` (tres fechas más en el almanaque).
- **COSTUMBRES** (una línea cada una; con `false`, lo de antes): `aguacero` (165), `charcos` (166), `canicula` (167), `cerco` (171).
- «Qué hay de nuevo»: `2026-12-zc` (cuatro frases; resume también la `2026-12-zb`). Del cerco solo dice que la luna lleva un cerco pálido: nada de anuncio de lluvia.

## Decidido (este campamento; no se vuelve a preguntar)

- **Con lluvia no hay pelota**: la franja de 15:00 a 16:30 queda sin actor (lo dice `data-mueve`) y la abuela no se mece en la ronda. Nada se mueve en su lugar (el perro sigue cruzando de 14:00 a 15:00).
- **El ánimo del valle sigue con lluvia** (`tp-lluvia` y `tp-charcos` son de un día cualquiera): si baja, se juntan en los corredores; si sube, nadie pasea por la plaza bajo la lluvia.
- **La luna crecida = iluminada al 75 % o más** (unas nueve o diez noches de cada luna, alrededor de la llena; en 2026, unas 55 noches de mayo a octubre). Fuera de la canícula y nunca durante la totalidad de un eclipse (la luna roja manda).
- **El cerco es de oídas: por confirmar con la familia** (que en casa se tome por anuncio de lluvia). La app no lo afirma en ningún texto (ni «Qué hay de nuevo» ni la descripción); solo está en este documento y en los comentarios.
- **Los charcos no se secan poco a poco** (la v5, idea 250, los quiere hasta las 21:00): eso es memoria del día, del campamento 54.

## Decisión de Opus que espera el visto bueno del dueño
- **Las tardes de costumbre no llueven** (la mejenga del domingo, la atolada del sábado, la tarde de una fiesta del año; unos 30 días de la lluviosa): la costumbre manda, como manda la fiesta sobre la temporada en el 43. Así no hay tardes partidas (lluvia, mejenga, lluvia) ni una atolada seca con charcos después. Como la regla es una para todo, **cambia lo del 28, el 47 y el 48**: esas tardes (y en la canícula) no hay llovizna en el cielo, ni capote de «Tú», ni paraguas en la cumbre ni en los osos de la interfaz (antes, toda la lluviosa). Con `COSTUMBRES.aguacero` en `false` vuelve lo de antes (llueve toda la lluviosa, salvo la canícula si su línea sigue encendida). Si el dueño prefiere lluvia también esas tardes, se quita la excepción en `llueveLaTarde` (una línea).

## Lo que queda para Fable o para después (y por qué)
- **168, 169 y 170**: de Fable (colores del cielo y arte nuevo), sin tocar. En [65](65-arte-para-fable.md).
- **Los petates al sol** de la canícula (mejora v5 de la 167): no hay dibujo. **Para Fable.**
- **El tono de los charcos** (hoy el de la sombra de los osos con un brillo: al anochecer se leen casi como sombras), **el anillo del cerco** (a 1920 px se ve sobre la sierra lejana, que es translúcida) y, si se quiere, **paraguas de colores**: para que Fable los revise.
- **Los charcos que se secan hasta las 21:00** (250): campamento 54 (memoria del día).
- El pronóstico del Diario del domingo (`lib.js: diario`) sigue diciendo el de la lluviosa también en la canícula (no sabe de `COSTUMBRES`); es un texto semanal sin hora: se dejó igual.

## Medido (banco `--rapido`, 390×664, mil compras, nodos con «esenciales»; antes = la base `claude/vida-46` en los mismos momentos)
**Nada sube** (salvo ruido: «fiesta del hito, Nochebuena 23:55», 48 → 49 animaciones, mide también 49 en la base al repetirlo). Ningún momento existente sube en nodos; las animaciones solo bajan.

- **−23 nodos en cada fecha sin lluvia por la tarde** (la seca, la canícula, las tardes de costumbre), en el teléfono, en las pantallas anchas y en la tele: la nube cargada y sus 20 gotas se podan (antes se escondían con el CSS). Por ejemplo: día normal 850 → 827, Nochebuena 919 → 896, el pico (Nochebuena, cohetes) 960 → 937, Nochebuena a 1920 999 → 976, 31 dic a 1920 1005 → 982.
- **La tarde de lluvia de siempre** (10 jul 2026, 15:00): 848 → 839 nodos (−9: la pelota y su capa, la abuela de la ronda) y 35 → 33 animaciones; en la tele, 931 → 922 y 21 → 18.
- **Las fiestas de la lluviosa con tarde propia** (10 de mayo, Día del Padre, 6 de agosto, 15 de septiembre, Día del Niño, la atolada, el lucero de la tarde del 15 de agosto): −24 nodos y **−20 animaciones** (esas tardes ya no llueve: las gotas no se dibujan). Día del Niño en la tele: 22 → 16 de 24.
- Los `declara` del banco bajan a lo medido (71 fechas).

| Momento nuevo (declarado) | Nodos | Valle | Animaciones a la vista («todos») |
|---|---|---|---|
| Tarde de lluvia, paraguas (9 sep, 15:30) | 838 | 185 | 33 (sin la pelota) |
| Al escampar, charcos (9 sep, 18:00) | 841 | 188 | 60 (la de una tarde lluviosa a esa hora: la llovizna y las luciérnagas de la lluviosa; la base, el 15 ago a las 18:00, 60) |
| La canícula (22 jul, 15:30) | 824 | 193 | 15 |
| El cerco de la luna (22 sep, 21:00) | 837 | 186 | 46 |
| Lluvia · charcos · cerco a 1440 / 1920 / 2560 | 901·904·899 / 921·924·920 / 918·921·917 (tope 1100) | — | — |
| Tele 1920×1080: charcos · cerco | 924 · 920 | — | 21 · 15 (tope 24) |

Banco entero en verde («OK: dentro de los topes de nodos y del presupuesto de animaciones»), antes y después.

## Verificado
- `test_lib` (1255 comprobaciones), bloque «lluvia 44»: la canícula y `llueveLaTarde` (con sus excepciones: la seca, la canícula, el domingo de la mejenga, el sábado de atolada, las tardes de fiesta), los turnos `tp-lluvia` y `tp-charcos` a cada hora (y la tarde de siempre donde no llueve), la pelota que no sale con lluvia (y en todo mayo–octubre, `data-mueve` nombra la pelota solo si el reparto la trae), el reparto en cinco tamaños con la luz de cada lado (paraguas, hoja de huerta, oseznos fuera de la plaza, sin actor; los charcos con dos oseznos que saltan; de dos a ocho, sin NaN ni estilos, nadie dos veces), la ropa tendida en la canícula, el capote, lo que deja en `<html>` y los avisos de las 17:45 y las 18:30, el cerco (en qué noches, después de medianoche, nunca en la totalidad del eclipse), la línea de hoy del 15 de julio, que no suma capas y **cada línea de `COSTUMBRES` en `false`** (vuelve lo de antes).
- `test_ui`: bloque nuevo «campamento 44» a 390 y 1440 px, con la página abierta (cambiando día y hora): la tarde de lluvia (sin pelota, con llovizna y capote, «paraguas» en la descripción), los charcos de 17:45 a 18:30, la canícula (sin llovizna ni capote ni paraguas de la cumbre, con el aire seco, la pelota de siempre y menos nodos), el cerco (el halo escalado y su anillo) y que no hay ninguna animación nueva, ningún NaN y la consola limpia. `test_ui` entero por partes (`PARTE=k/6`, de dos en dos): 474 + 438 + 328 + 371 + 669 + 547, en verde.
- **Pruebas viejas cambiadas** (cambio intencional, nunca saltadas): en `test_lib`, los turnos de un miércoles de octubre (35/40: ahora con la lluvia y los charcos), el siesta→tarde del aviso de turno (35), lo que se mueve el 15 de octubre a las 16:00 (22B: sin pelota), la atolada del 43 (el sábado de septiembre llueve; el 15 de julio es canícula), la lista de turnos válidos (suma `tp-lluvia` y `tp-charcos`) y el ánimo del valle (E: `tp-lluvia` y `tp-charcos` son de un día cualquiera). En `test_ui`: el 12 (en la seca la llovizna ya no se dibuja: `null` en vez de `none`), el 35 (el miércoles de octubre a las 15:00 es tarde de lluvia), el 37 (la pelota se mira el miércoles de la canícula, 22 jul, en vez del 16 sep) y el E (espera a que llegue quien camina al cambiar de turno antes de comparar: con lluvia, alguien camina de la mañana a la tarde).
- axe: 348 estados, sin violaciones. `tsc`, Biome (0 avisos) y `comprobar_recorte`, en verde. El banco, en verde antes y después (arriba).
- No se corrieron los barridos (`rapido` y por pestañas), Lighthouse, `test_api` (no se tocó el servidor) ni la regresión visual: los corre el CI.
- Capturas reales (en el `scratchpad` del campamento, `c44/`): la tarde de lluvia, los charcos y la canícula a 390, 1440 y 1920 px, en claro con «todos» y en oscuro con «ninguno», con la plaza de cerca; el cerco de la luna a 390, 1440 y 1920, junto a una noche sin él.

## Sin probar aquí
- iPhone real y Safari: el cambio de turno con la app abierta a las 14:00, 17:45 y 18:30; el anillo del cerco (un `stroke` sobre un círculo con degradado, escalado con `transform`).
- La tele real una tarde de lluvia (el banco la mide a 1920×1080).
- Que en casa se diga lo del cerco de la luna.
