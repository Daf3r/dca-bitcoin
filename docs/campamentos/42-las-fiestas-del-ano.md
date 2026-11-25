# Campamento 42 · Las fiestas del resto del año

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Antes: [41](41-la-navidad-entera.md) (un día de fiesta es un guion entero), [36](36-calendario-del-pueblo.md) (el calendario del pueblo), [40](40-el-dia-entero-del-pueblo.md) (el día entero), [51](51-el-director-del-valle.md) (el director y sus focos) y [52](52-vecinos-con-oficio.md). El plan: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md) (aprobado entero por el dueño el 19 nov 2026, «todo aprobado», también lo marcado para la familia). Los guiones salen de `docs/pulido-visual/vida-del-valle/ideas_v4.py` e `ideas_fiestas.py` (ids 149–160, 219–222; la sección «Fiestas de los ositos», tabla por fecha) y los personajes, de las maquetas aprobadas en `prototipo-vida4.patch` (los mismos dibujos, pasados al código de la app).

## Lo hecho (25 nov 2026)
Cada fecha dura **todo su día**, con un guion de turnos y su momento grande, como la Navidad del 41. Son **otros repartos de los mismos osos y de los mismos trazos** (0 nodos por turno: `arte-vecinos.js: reparto`); al cambiar de turno con la página abierta, `libro:turno` rehace solo `.v-vecinos` y la capa del actor, como siempre.

| Fecha | Idea | Turnos (`cielo.js: turnoDelAnio`) | Momento grande |
|---|---|---|---|
| Domingo de Ramos (Pascua − 7) | 149 | 7:00 `sr-ramos` (a misa con su palma, el padre a la puerta) · 10:00 `sr-vuelta` (de vuelta con la palma) | la misa con palmas, 7:00–10:00 |
| Jueves y Viernes Santo | 150 | 7:00–20:00 `ss-silencio`: pocos, de espaldas frente a la iglesia; nadie juega ni barre y **la campana de las doce calla** | todo el día, en silencio |
| Sábado de Gloria y Domingo de Pascua | 151 | 7:00 `sg-lago` (oseznos con su llanta) · 11:30 `sg-solo` (la abuela en su corredor) · 16:00 `sg-vuelven`. El domingo, primero la misa de siempre (7:30–10:00) | al lago, por la mañana |
| 10 de mayo | 153 | 5:30 `m10-mananitas` (guitarra y oseznos con flores frente a una casa) · 7:00 `m10-flores` · 11:30 `m10-mesa` (la mesa puesta; en el teléfono, la corta) · 14:00 `m10-visita` | las mañanitas |
| 17 de junio, Día del Padre | 219 | mañana, la de siempre · 14:00 `p17-hombros` (en hombros, la pelota de 15:00 a 16:30) | la tarde |
| 5 y 6 de agosto | 156 | 7:00 `ag-adorna` (escalera, la que barre) · el 6, 7:30 `ag-misa` · 11:30 `ag-almuerzo` · 14:00 `ag-elotes` · 17:45–22:00 `ag-plaza` (la plaza llena). Sin rueda | la plaza de noche |
| 14 de septiembre | 157 | 7:00 `p14-hacen` (los farolitos) · 16:00 `p14-antorcha` · 17:45 `p14-farolitos` (cinco oseznos con su farolito encendido) | los farolitos, 17:45–20:00 |
| 15 de septiembre | 220 | 5:00 `p15-banderitas` · 7:00 el desfile del 36 (igual) · 12:00 `p15-plaza` (elotes locos) · 15:00 `p15-guarda` (el abanderado se lleva la bandera en alto) | el desfile |
| 1 de octubre, Día del Niño | 158 | 7:00 `n1-cuelga` (la escalera y la piñata) · 11:30 `n1-plaza` · 15:00 `n1-pinata` (el vendado y todos alrededor; **la piñata se mece**) · 17:00 `n1-dulces` | la piñata, 15:00–17:00 |
| 1 y 2 de noviembre | 159 | 6:00 `d-flores` (flores y coronas de papel) · 11:30 `d-vacio` · 15:00 `d-vuelven` · el 2, 17:45–22:00 `d-velitas` (una velita frente a cada casa; todo quieto) | las velitas del 2 |
| 12 de diciembre | 160 | 6:00 `i12-iglesia` (oseznos de inditos, el padre a la puerta) · 11:30 `i12-plaza` · 15:00 `i12-vuelta`; al anochecer, la posada de diciembre | los inditos a la iglesia |

- **Dónde vive**: `cielo.js: turnoDelAnio` (los turnos), `mueveAnio` (lo que se mueve distinto) y el foco nuevo `fiestas` del director (rareza «año», con su frase para la línea de hoy). **Va aparte de `turnoFiesta` a propósito** (el 41 decía añadirlas ahí): `lucesDelPueblo` y `puertaIglesia` leen `turnoFiesta` y encenderían todo el pueblo y dejarían la iglesia abierta, y el foco `navidad` se habría quedado con estas fechas. Así las luces y la puerta siguen su horario (una prueba lo fija) y en el 41 queda una nota.
- **Manda la fiesta**, también un domingo (Ramos, el 10 de mayo si cae en domingo: sin la misa de siempre) o un sábado (Gloria, el 15 de septiembre de 2029: sin el sábado de plaza). La Pascua conserva la misa de su mañana.
- **La Pascua**: `lib.pascua(anio)` (pura, con JSDoc) y la misma cuenta en `cielo.js` (`libroCielo.pascua`; es un script clásico y no puede importarla). `test_lib` comprueba fechas conocidas (con las extremas: 22 de marzo de 1818 y de 2285, 25 de abril de 1943 y de 2038) y que las dos dan lo mismo de 1900 a 2300, siempre en domingo.
- **Lo que se mueve** (`mueveAnio`): casi siempre lo de un día cualquiera. Jueves y Viernes Santo, `fiesta` en las franjas del pueblo (la que barre, la campana de las doce y la pelota: nadie se mueve); si es día de azacuanes (del 1 al 20 de abril), ellos vuelan igual. El anochecer del 2 de noviembre, `fiesta`: quieto, las luciérnagas descansan. El 1 de octubre de 15:00 a 17:00, **`mece`: la piñata se mece** desde donde cuelga (su capa `v-actor-mece`, un `rotate` a saltos de ±6°, `--t-gesto` × 2.5 = 4 s; solo con «todos» y en su franja; con «ninguno», quieta). Es del pueblo (`DEL_PUEBLO`: en pantallas anchas cruza la cabina) y declara su capa (`PESO_MUEVE.mece`). Donde un turno trae la escoba o la pelota, son el actor de su franja de siempre.
- **Personajes nuevos** (de `prototipo-vida4.patch`, sin cambios de forma): `ramos`, `oseznoLlanta`, `guitarra`, `flores`, `corona`, `velita`, `oseznoElote`, `oseznoFarol`, `antorcha`, `pinata`, `vendado`, `oseznoIndito`. La piñata y las velitas son **cosas** (`COSAS`: sin sombra de pie, no cuentan entre los ocho ni apartan a nadie). Ningún tono nuevo.
- **Choques declarados** (`CHOQUES`): `fiestas`+`luna` (el anochecer del 14 de septiembre, del 2 de noviembre, las noches de agosto) y `fiestas`+`azacuanes` (Semana Santa entre el 1 y el 20 de abril, como en 2026). La prueba del director (dos años) y una nueva de diez años, en verde.
- **El almanaque de la guía** suma diez fechas (Semana Santa de 2027, el 10 de mayo, el Día del Padre, el 6 de agosto, el 14 de septiembre, el Día del Niño, el 2 de noviembre y el 12 de diciembre), cada turno con su «Ver».
- «Qué hay de nuevo»: `2026-12-y` (cuatro frases; resume también el precio a su ritmo, `2026-12-w`); cabe entera a 360×640 sin desplazarse (comprobado: 63–577 px; con cinco frases se pasaba 14 px). La id `2026-12-x` la tiene la rama del 64. *Si el 64 (`2026-12-x`, «un solo material») se mezcla antes, conviene que esta entrada lo resuma también.*

## Las costumbres que la familia puede apagar (una línea cada una)
En `app/static/cielo.js`, la tabla `COSTUMBRES` (arriba de `pascua`). Cambiar `true` por `false` deja ese día como un día cualquiera: su turno, su foco, su frase y lo que se mueve (`test_lib` lo comprueba con todas apagadas). Nada más que tocar.

| Línea | Qué apaga | Por qué está marcada |
|---|---|---|
| `ramos: true` | el Domingo de Ramos (vuelve la misa de siempre) | religiosa |
| `santos: true` | Jueves y Viernes Santo en silencio (vuelven la escoba, la pelota y la campana) | religiosa; día de recogimiento |
| `gloria: true` | el Sábado de Gloria y la Pascua al lago | — |
| `madre: true`, `padre: true` | el 10 de mayo, el 17 de junio | — |
| `agostinas: true` | el 5 y el 6 de agosto | — |
| `misaAgosto: true` | solo la misa de la mañana del 6 (el 6 se adorna como el 5) | religiosa |
| `patrias: true` | el 14 y lo nuevo del 15 (el desfile del 36 sigue) | — |
| `nino: true` | la piñata del 1 de octubre | — |
| `difuntos: true` | el 1 y el 2 de noviembre, con las velitas | duelo para muchas familias |
| `inditos: true` | el 12 de diciembre | religiosa |

**Decisiones mías en lo religioso** (para que el dueño las vea): todo es sobrio y sin humor, como la misa del domingo ya aprobada. Los vecinos van **de espaldas** camino de la iglesia y el padre a la puerta; nada de procesiones, cementerio, cruces ni luto (lo descartado en el diseño). Jueves y Viernes Santo solo hay pocos vecinos quietos frente a la iglesia y el pueblo calla (ni pelota, ni escoba, ni la campana de las doce: la costumbre de esos días), sin el paño morado (ver abajo). En Difuntos, flores y coronas de papel de colores y velitas pequeñas; nadie con cara triste. Las frases de la línea de hoy solo dicen qué pasa («Es Viernes Santo: el pueblo está en silencio.»).

## Lo que queda para después (y por qué)
- **221 · El cumpleaños de la montaña y 222 · un cumpleaños de la familia, el día entero**: necesitan **arte nuevo** que no está en los prototipos (el pastel con su velita en la nieve, la cinta del árbol del primer día) y tocan la cumbre y los datos de la familia (privacidad: nunca en el pueblo ni en la entrada). **Para Fable**: el pastel y la velita a la talla de los osos de la cumbre (encendida al anochecer), fuera del grupo de los osos como los regalos del 41.
- **150 · el paño morado en la puerta de la iglesia**: arte nuevo y un tono nuevo (+1 nodo esos dos días). El silencio del pueblo sí está. **Para Fable**.
- **149 · la palma en la puerta de cada casa** el resto del Domingo de Ramos: arte nuevo (una palma pequeña junto a cada puerta). Hoy, de 11:30 en adelante, es un domingo cualquiera. **Para Fable**.
- **218 · el perro junto a la piñata, esperando**: no entra; el perro de siempre sigue en su sitio (ponerlo con los vecinos exige comprobar que nadie quede encima, como en el 41).
- **Las cumbres y «Tú» en estas fechas** (se estiran, de espaldas al atardecer…): ya lo hacen por la hora (47, 48); nada propio de cada fiesta.
- **«Más fila en las pupusas»** el Día del Padre y la noche de Gloria: queda la de siempre (la fila del fin de semana).
- Las **temporadas** del bloque 149–164 (mangos 152, la milpa con su gente 154, la atolada 155, las posadas 161, la mejenga 163, la luna llena 164) son del **campamento 43** según el plan: no se hicieron aquí.

## Medido (banco `--rapido`, 390×664, mil compras, nodos con «esenciales»; antes = `main` sin el 42, en los mismos momentos)
| Momento | Nodos antes → después | Animaciones a la vista («todos») antes → después |
|---|---|---|
| Domingo de Ramos 8:30 (misa con palmas) | 836 → 836 | 16 → 16 |
| Viernes Santo 12:00 (en silencio) | 840 → 833 | 14 → 13 (la campana calla) |
| Sábado de Gloria 9:00 (al lago) | 837 → 835 | 13 → 13 |
| 10 de mayo 6:00 (las mañanitas) | 843 → 836 | 15 → 17 (en lugar del panadero que cruza, el torogoz) |
| 10 de mayo 12:30 (la mesa) | 840 → 837 | 33 → 33 |
| Día del Padre 15:30 (en hombros) | 844 → 837 | 35 → 34 |
| 6 de agosto 8:30 (la misa) | 885 → 869 | 42 → 42 |
| 5 de agosto 19:00 (la plaza de noche) | 870 → 869 | 53 → 53 |
| 14 sept 19:00 (los farolitos) | 871 → 868 | 53 → 53 |
| 15 sept 16:00 (se guarda la bandera) | 879 → 870 | 41 → 39 |
| Día del Niño 15:30 (la piñata se mece) | 854 → 849 | 37 → 36 (la piñata, 1 en su capa, en lugar de la pelota y la ronda de la abuela) |
| 2 nov 19:00 (las velitas) | 848 → 846 | 41 → **25** (las luciérnagas descansan: el dibujo grande de 25 a 9) |
| 12 dic 8:00 (los inditos) | 886 → 885 | 22 → 22 |
| Escritorio 14 sept · 2 nov (1440 / 1920 / 2560) | 933·911 / 951·929 / 948·928 → 930·909 / 948·927 / 945·926 (tope 1100) | — |
| Tele 1920×1080, 14 sept 19:00 · Día del Niño 15:30 | 951 · 937 → 948 · 932 | 18 · 23 → 18 · 22 (tope 24) |

Ningún momento sube: un turno de fiesta es otro reparto de los mismos trazos y, como no es un día cualquiera, no salen las cosas de cada quien (la bicicleta, el comal, la escoba recostada: 52). Los demás casos del banco (el día normal, Nochebuena, los cohetes, la lluvia, el ánimo E…) quedan igual que en `main`. Cada momento nuevo va declarado en `tests/banco_rendimiento.mjs` con lo medido, más el 14 de septiembre y el 2 de noviembre en las tres pantallas anchas y dos casos de la tele. El banco entero en verde («OK: dentro de los topes»).

## Verificado
- `test_lib` (1184 comprobaciones), bloque «fiesta 42»: la Pascua (fechas conocidas y lib.js = cielo.js de 1900 a 2300), las fechas de cada fiesta, el guion de cada día a cada hora (y un 15 de septiembre y un 10 de mayo en sábado, el 6 de agosto en domingo), lo que se mueve (Semana Santa en 2026, con azacuanes, y en 2027, sin ellos; las velitas; la piñata), el foco y la frase de cada fecha (corta, sin tutear ni mandar), **todas las costumbres apagadas** (cada día vuelve a ser uno cualquiera; el Día del Padre y las patrias, a su hora; el desfile del 36 sigue) y encendidas otra vez, las luces y la puerta de la iglesia con su horario, diez años cada media hora sin fallos, y el reparto de los 33 turnos en seis tamaños (320, 390, 844 acostado, 768, 1440 y 2560) y con la luz de cada lado: la figura de cada turno, su actor, como mucho ocho vecinos y ningún NaN.
- Pruebas viejas corregidas con criterio (cambio intencional, nunca saltadas): el 15 de septiembre a mediodía ya no es la tortillera sino `p15-plaza` (40 y 36 en `test_lib`) y su foco a las 12:00 es `fiestas`, no la rutina (51 en `test_ui`; la frase sigue siendo la del desfile); el barrido del año de lo que se mueve acepta la quietud de Semana Santa y del 2 de noviembre y la piñata en su franja; la piñata va con los gestos del pueblo (49) y en la tabla del tempo (39b, `vo-mece` 4 s); la prueba de «Qué hay de nuevo» del E acepta la entrada nueva que lo resume.
- `test_ui` entero por partes (`PARTE=k/6`, de dos en dos): 282 + 489 + 342 + 449 + 610 + 587 comprobaciones, en verde (las partes 3 y 6 se repitieron tras corregir las dos pruebas de arriba). Bloque nuevo «campamento 42»: a 390 y 1440 px, 25 momentos de las once fechas con la página abierta (cambiando día y hora): el turno, lo que se mueve, el actor en su capa, la piñata que se mece (`vo-mece`) y, con «ninguno», quieta; las luciérnagas que descansan con las velitas, al menos dos vecinos, ningún NaN, la escena bajo 1000 nodos y la consola limpia.
- axe: 348 estados, sin violaciones. No se corrieron los barridos (`rapido` y por pestañas), Lighthouse ni la regresión visual (los corre el CI).
- `tsc`, Biome (0 avisos) y `comprobar_recorte`, en verde. El banco (arriba), en verde. No se tocó el servidor (no se corrió `test_api`).
- Capturas reales de cada fecha a la hora de su momento grande (21 momentos: Ramos, Viernes Santo, Gloria, las mañanitas y la mesa del 10 de mayo, el Día del Padre, la misa, los elotes y la plaza de agosto, la antorcha y los farolitos del 14, las banderitas, la plaza y la bandera del 15, la piñata colgada, meciéndose y los dulces, las flores y las velitas, los inditos en el atrio y en la plaza), a 390×844, 1440×900 y 1920×1080, en claro y oscuro, con «todos» y «ninguno», cada una con un recorte del pueblo de cerca (420 imágenes, en el informe del campamento). Lo revisado (claro y oscuro, «todos» y «ninguno», a 390, 1440 y 1920 en una muestra de cada fecha): en lo revisado nadie se monta sobre nadie (la piñata y las velitas son cosas y no se comprueban contra los vecinos: se miraron a ojo a 390 y 1440); la piñata cuelga del árbol de la plaza; las velitas se leen como puntitos de luz de noche.

## Límites conocidos (para Fable o una ronda de arte)
- A 390 px el pueblo es chico: las llantas del Sábado de Gloria se leen como dos aros negros, el elote loco y la flor de los oseznos como un punto de color; se entiende por el conjunto (como en el 41).
- Los oseznos de inditos llevan el sombrero de los mayores, a su talla: a 390 px el cotón de manta casi no se distingue de la camisa.
- A 320 px y con el teléfono acostado el pueblo queda bajo «Anotar compra» y el velo del pie, como ya estaba decidido.

## Sin probar aquí
- iPhone real y Safari: la piñata que se mece (una capa, `rotate` a saltos) y el cambio de turno con la app abierta en estas fechas.
- La tele real en una de estas fechas (el banco mide la tele a 1920×1080 el 14 de septiembre y el Día del Niño).
- Que a la familia le parezcan bien las costumbres religiosas y Difuntos (aprobadas por el dueño en el plan; se apagan con una línea).
