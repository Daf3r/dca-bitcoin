# Campamento 43 · Las temporadas del pueblo

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Antes: [42](42-las-fiestas-del-ano.md) (las fiestas del año: el mismo patrón), [40](40-el-dia-entero-del-pueblo.md) (el día entero), [51](51-el-director-del-valle.md) (el director y sus focos), [52](52-vecinos-con-oficio.md) (los ocho vecinos). El plan: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md) (aprobado entero por el dueño el 19 nov 2026). Las ideas salen de `docs/pulido-visual/vida-del-valle/ideas_v4.py` (ids 152, 154, 155, 161, 163 y 164; sus mejoras de la v5, en `ideas_v5.py`) y los personajes, de las maquetas aprobadas en `prototipo-vida4.patch` (el osezno sentado en el suelo de los cuentos, de `prototipo-vida5.patch`).

## Lo hecho (25 nov 2026)
Lo que cambia con la **época del año** (no con una fecha de fiesta: eso fue el 42). Son **otros repartos de los mismos osos y de los mismos trazos** (0 nodos por turno): al cambiar de turno con la página abierta, `libro:turno` rehace solo `.v-vecinos` y la capa del actor, como siempre. Ninguna es un actor nuevo ni una animación nueva: todas son quietas (así venían marcadas en el diseño).

| Idea | Cuándo | Turno (`cielo.js: turno`) | Quién |
|---|---|---|---|
| 152 · Mangos | marzo y abril, las mañanas **sin escuela** (domingo antes y después de misa, vacaciones) y el **sábado de plaza** | `tp-mangos` (en lugar de `mananaLibre`); el sábado, el `mercado` de siempre con los mangos (`temporadaDelPueblo().mangos`) | un osezno baja mangos con su vara bajo el árbol de la plaza (su canasto al lado, con los que ya bajó); la de la tienda, con su canasto de siempre |
| 154 · La milpa con su gente | las dos primeras semanas de cada etapa: siembra 1–14 may, dobla 15–28 ago, tapisca 1–14 nov; de 6:00 a 10:00 | ninguno: va con el turno de la mañana (`temporadaDelPueblo().milpa`) | el milpero y otro: con el chuzo (siembra), de pie entre las matas (dobla) o con su matate (tapisca) |
| 155 · La atolada | sábados de julio y agosto, 16:00–17:45 | `tp-atolada` (en lugar de `vuelta`) | la tortillera con la olla del atol sobre su brasa, dos vecinos con su huacal, oseznos con elote; la pelota de siempre en la plaza |
| 161 · Las posadas | 16–23 de diciembre, 18:30–20:00 | `tp-posada` (después de la `posada` del nacimiento) | un grupito de espaldas frente a una casa, con tres oseznos con farolito; cada noche otra casa; la pupusera y los que miran el nacimiento |
| 163 · La mejenga | domingos 15:00–16:30, fuera de la Navidad | `tp-mejenga` (en lugar de la tarde) | dos porterías de palo, cuatro oseznos y la pelota de siempre (el actor de su franja); el panadero mira |
| 164 · Luna llena: los cuentos | noches de luna llena (la luna de las 21:00 al 97 %), 20:00–20:30 | `tp-cuentos` (antes de la fresca) | la abuela con su taburete en la plaza, cinco oseznos sentados en el suelo en rueda y dos vecinos en sus sillas |

- **Dónde vive**: `cielo.js` (`turno`, `temporadaDelPueblo`, `temporadaAhora`, `faenaDelDia`, `posadaDe`, `fraseTemporada`), `arte-vecinos.js: reparto` (los turnos `tp-…`, la milpa y los mangos, que van **antes** que el pueblo para que el tope de ocho no los deje fuera), `arte-valle.js: sitiosMilpa` (dos sitios dentro de la parcela, con su perspectiva) y `montana.js` (`lug.milpa` y la opción `temporada` del reparto). La descripción de la montaña tiene una frase para cada turno nuevo (`lib.js: FRASE_TURNO`).
- **Manda la fiesta**: los turnos de las fiestas (41 y 42), el desfile, la misa del domingo y el sábado de plaza van antes; las temporadas solo ocupan ratos de un día cualquiera. En Difuntos o el 10 de mayo no hay nadie en la milpa.
- **Focos**: uno nuevo, `temporada` (rareza «año»: los mangos, la atolada y la milpa), y otro, `mejenga` (rareza «semana», sin frase). La posada de los farolitos es del foco `posada` de siempre (ahora también con `tp-posada`) y los cuentos, del foco `luna`. **Choques declarados**: `cruz`+`temporada` (la siembra el 3 de mayo) y `azacuanes`+`temporada` (los mangos del 1 al 20 de abril): manda el primero y los azacuanes vuelan igual.
- **La línea de hoy**, solo el primer día de cada temporada: el 1 de marzo (mangos), el 1 de mayo (siembra), el 15 de agosto (dobla), el 3 de noviembre (tapisca: el 1 y el 2 manda Difuntos), el primer sábado de julio (atolada) y el 16 de diciembre (posadas). Sin «tú» y sin mandar nada.
- **Nada se mueve distinto**: la pelota de la mejenga y la de la atolada es la de siempre, en su franja (15:00–16:30). Ninguna capa, ninguna animación, ningún tono nuevo.
- **El almanaque de la guía** suma cinco fechas (un domingo de mangos con mejenga, la siembra, un sábado de atolada, las posadas y una luna llena).
- **`fueraDeTemporada`**: no hace falta tocarla: nada de esto se dibuja fuera de su turno (va en el reparto, no escondido por el CSS).
- «Qué hay de nuevo»: `2026-12-z` (cuatro frases; resume también `2026-12-y`, el 64 y el precio a su ritmo).

## Las temporadas que la familia puede apagar (una línea cada una)
En `app/static/cielo.js`, la misma tabla `COSTUMBRES` del 42. Con `false`, ese rato es el de siempre: su turno, su foco, su frase y lo que va al reparto (`test_lib` lo comprueba).

| Línea | Qué apaga | Por qué está marcada |
|---|---|---|
| `mangos: true` | los mangos de marzo y abril | — |
| `milpa: true` | la gente en la milpa | — |
| `atolada: true` | la atolada de los sábados | — |
| `posadas: true` | la posada de los farolitos (vuelve la de siempre, frente al nacimiento) | religiosa |
| `mejenga: true` | la mejenga del domingo | — |
| `cuentos: true` | los cuentos de luna llena | — |

## Decidido (este campamento; no se vuelve a preguntar)
- **Los mangos, solo cuando no hay escuela** (y el sábado de plaza): un osezno en la plaza una mañana de escuela contradice el 40. Es decir: los domingos de marzo y abril (7:00–7:30 y 10:00–11:30), los sábados de plaza (7:00–12:00) y los días entre semana sin escuela. Unos **17 días al año**. `escuela()` no sabe de la semana de vacaciones de Semana Santa: no se tocó (cambiaría una regla del 40).
- **La milpa no es un turno**: su gente va con el turno de la mañana y se mira la hora **al dibujarlo** (como los recorridos del 52). Si la página se abre a las 9:00, siguen ahí hasta el cambio de turno de las 11:30; si se abre a las 10:30, ya no están; el turno de las 5:00 se dibuja sin ellos y salen con el de las 7:00. Así no hay un aviso `libro:turno` más.
- **El milpero**, esas mañanas, está en la milpa y no baja al pueblo. Donde la milpa no cabe (a 1440×900) no sale nadie y él sigue su día.
- **La posada cambia de casa cada noche** (la calle tiene un sitio frente a cada casa: la noche 16 la primera, la 17 la siguiente…; con menos casas que noches, vuelve a empezar).
- **La mejenga, fuera de la Navidad**: la plaza de diciembre es la del nacimiento y el pino. Durante la mejenga **el perro se echa en la calle** (como en los turnos del 40: `PERRO_TURNOS` y su línea del CSS), porque su sitio de siempre quedaba dentro de la portería de la izquierda; la de la derecha no pisa el sitio de las gallinas (si no, unos pasos adentro).
- **La posada en el teléfono y a 1440 px alterna entre dos casas**: ahí la calle solo tiene dos sitios (`lug.calle`); con más casas (tableta, acostado, 2560), cada noche otra.
- **Los cuentos duran media hora** (20:00–20:30, como dice la idea), y de 20:30 sigue la fresca.
- Lo de las mejoras de la v5 que piden memoria de varios días o arte nuevo queda para su campamento (abajo).

## Lo que queda para después o para Fable (y por qué)
- **152 · el osezno sentado comiéndose un mango a mediodía y el canasto que se llena durante la mañana** (v5, 253): la memoria del día es del campamento 54; el osezno comiendo es **arte nuevo** (para Fable). **«La vendedora lleva el canasto lleno»** tampoco tiene dibujo (la maqueta usaba la vendedora de siempre): hoy lleva su canasto de siempre. **Para Fable**: el canasto con el montón de mangos.
- **154 · el gesto de doblar la caña**: no hay dibujo; en la dobla están de pie entre las matas. **Para Fable**: un campesino doblando la caña, a la talla del pueblo. La milpa por capítulos (roza, primera hoja, vacas en el rastrojo; v5, 239) es del campamento 53.
- **155 · la ramada que se levanta el jueves y el viernes** (v5, 240): historia de varios días, campamento 53 (la maqueta `s-ramada` existe en `prototipo-vida5.patch`).
- **161 · el farolito que se queda encendido en la puerta de cada casa visitada** (v5): **arte nuevo** (un farolito de puerta) y memoria de varios días. **Para Fable**; hoy la posada no deja rastro.
- **163 · la pelota que se queda en la plaza hasta el lunes** (v5, 254): campamento 54.
- **164**: la v5 también pedía nadie hablando: así está (sin globos). El garrobo de la maqueta de los mangos es la idea 54 (campamento 45). *(Campamento 45: hecho; el garrobo es una de las horas del reloj de los animales, de 11:00 a 14:00 en la seca, junto a la banca del árbol de la plaza: ver [45-animales-de-aqui.md](45-animales-de-aqui.md).)*

## Medido (banco `--rapido`, 390×664, mil compras, nodos con «esenciales»; antes = la base `claude/vida-42` en los mismos momentos)
| Momento | Nodos antes → después | Animaciones a la vista («todos») antes → después |
|---|---|---|
| Domingo de marzo 10:30 (los mangos) | 834 → 834 | 13 → 13 |
| 6 may 8:30 (la siembra) | 850 → **852** | 36 → 36 |
| 19 ago 8:30 (la dobla) | 851 → **853** | 36 → 36 |
| 4 nov 8:30 (la tapisca) | 859 → **861** | 18 → 18 |
| Sábado de julio 17:00 (la atolada) | 847 → 841 | 36 → 36 |
| 18 dic 19:00 (la posada) | 889 → 886 | 45 → 45 |
| Domingo 15:30 (la mejenga) | 843 → 837 | 15 → 14 (sin la abuela de la ronda; el perro, echado en la calle) |
| Luna llena 20:15 (los cuentos) | 835 → 833 | 38 → 38 |
| Escritorio posada · mejenga · siembra (1440 / 1920 / 2560) | 956·907·914 / 971·924·933 / 969·923·930 → 953·901·914 / 970·918·935 / 968·917·932 (tope 1100) | — |
| Tele 1920×1080, posada · mejenga | 971 · 924 → 968 · 918 | 24 · 15 → 24 · 14 (tope 24; la posada ya iba en el tope en la base) |

**La milpa con su gente sube 2 nodos** (y el valle, 2): no es la gente (van en los trazos de siempre) sino dos tonos que a esa hora el pueblo no tenía: la camisa de maíz del milpero (su color, fijado por persona desde el 52) y la manita sobre su herramienta. Comprobado en el navegador comparando la escena con la costumbre encendida y apagada. Muy lejos del tope (852 de 1100). Lo demás baja o queda igual: los turnos de temporada no sacan las cosas de cada quien (la bicicleta, el comal) ni la ronda de la abuela. Cada momento va declarado en `tests/banco_rendimiento.mjs`; el banco entero en verde («OK: dentro de los topes»). Los demás casos del banco, iguales que en la base.

## Verificado
- `test_lib` (1197 comprobaciones), bloque «temporada 43»: el turno de cada temporada a cada hora (y lo que no lo es: un día de escuela, mayo, septiembre, Navidad, Nochebuena, sin luna llena), los mangos del sábado de plaza, la milpa con su gente (en sus semanas y horas; no en Difuntos ni el 10 de mayo; sí el Día de la Cruz), el foco de cada una (con los choques declarados), la frase del primer día y solo ese, **todas apagadas** (cada rato vuelve a ser el de siempre) y encendidas otra vez, que nada se mueve distinto, y el reparto en seis tamaños (320, 390, 844 acostado, 768, 1440 y 2560) con la luz de cada lado: la figura de cada temporada, su actor (la pelota en la mejenga y la atolada), de dos a ocho vecinos, ningún NaN; la milpa con su gente solo donde la hay (el milpero no sale dos veces y la que barre sigue siendo el actor); la posada en otra casa cada noche; los sitios de la milpa dentro de la parcela.
- Pruebas viejas cambiadas con criterio (cambio intencional, nunca saltadas): la lista de turnos válidos de un año (35/40 en `test_lib`) suma los cinco `tp-…`; el tope de frases de la línea de hoy en dos años (51, idea 228) pasa de 70 a 90: las temporadas suman seis al año (de 69 a 81).
- `test_ui` entero por partes (`PARTE=k/6`, de dos en dos): 300 + 455 + 305 + 476 + 636 + 622 comprobaciones, en verde a la primera. Bloque nuevo «campamento 43»: a 390 y 1440 px, nueve momentos con la página abierta (cambiando día y hora): el turno, el foco, lo que se mueve, el actor en su capa, de dos a ocho vecinos y ningún NaN; la siembra con dos en la parcela donde hay milpa (a 1440×900 no hay); la escena bajo 1000 nodos y la consola limpia; con «ninguno», la pelota de la mejenga quieta.
- axe: 348 estados, sin violaciones. `tsc`, Biome (0 avisos) y `comprobar_recorte`, en verde. El banco (arriba), en verde.
- No se corrieron los barridos (`rapido` y por pestañas), Lighthouse, `test_api` (no se tocó el servidor) ni la regresión visual: los corre el CI.
- Capturas reales de cada temporada (los mangos el domingo y en el sábado de plaza, la siembra, la dobla, la tapisca, la atolada, la posada dos noches seguidas, la mejenga y los cuentos) a 390×844, 1440×900 y 1920×1080, en claro y oscuro, con «todos» y «ninguno», cada una con el pueblo de cerca (en el informe del campamento).

## Sin probar aquí
- iPhone real y Safari: los turnos nuevos con la app abierta (el cambio de turno de las 18:30 en la posada, el de las 20:30 tras los cuentos).
- La tele real en una de estas fechas (el banco mide la posada y la mejenga a 1920×1080).
- Que a la familia le parezca bien la posada (religiosa, sobria: se apaga con una línea).
