# Campamento 52 · Vecinos con oficio: vidas que se cruzan (ideas 230–238)

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El plan: [39–50 · la vida del valle](39-50-la-vida-del-valle-plan.md) y [las decisiones de diseño](39-50-decisiones-diseno.md); las ideas, en `docs/pulido-visual/vida-del-valle/ideas_v5.py` («52 · Vecinos con oficio», ids 230–238, y las mejoras de la 140, 144, 147 y 175 que apuntan aquí). Antes: [35](35-pueblo-de-los-osos.md) (los turnos y el reparto), [36](36-calendario-del-pueblo.md), [37](37-el-pueblo-se-mueve.md) (la capa del vecino), [40](40-el-dia-entero-del-pueblo.md) (la carta del día, `cajasArbol`/`conArbol` y «nada encima», las luces una a una, `PERRO_TURNOS`) y [51](51-el-director-del-valle.md) (el director). Va apilado sobre el 40 (PR #108).

## Lo hecho (25 nov 2026)
Hasta el 40 los osos del pueblo eran figurantes: el de camisa roja era el panadero a las 5:30 y un campesino cualquiera a las 9:00. Ahora el pueblo tiene **ocho vecinos de siempre**, cada uno con su ropa y su prenda en todos los turnos, y un **recorrido por horas**. **Nada se mueve de nuevo y no hay turnos nuevos**: los vecinos no caminan; su sitio sale de la hora **al dibujar el turno** (como la del cantón del 40), así que cada vez que se abre la app están un poco más allá. `turno|mueve|foco|ambiente` volcado cada cinco minutos de junio de 2026 a diciembre de 2027, antes y después: **idéntico** (166,751 líneas): ni un repintado más al día.

### 230 · Ocho vecinos de siempre (`arte-vecinos.js: VECINOS`)
| Vecino | Ropa (la fija la persona, no el turno) | Prenda |
|---|---|---|
| el panadero | camisa roja (`r1`) | su bicicleta con el canasto del pan |
| la tortillera (de noche, la pupusera) | vestido verde (`r0`) | delantal; su comal (el sábado, la olla) |
| la maestra | vestido de maíz (`r2`) | su libro bajo el brazo; el viernes, un ramo |
| el pescador | camisa verde (`r0`) | sombrero; la sarta de pescado o la atarraya |
| el sacristán | de oscuro (`r: 'rasgo'`) | su manojo de llaves |
| la de la tienda | vestido rojo (`r1`) | delantal y su canasto; barre su acera |
| el milpero | camisa de maíz (`r2`) | sombrero y su chuzo |
| la abuela | su rebozo (`r2`) | el taburete de su corredor |

- `reparto` los pone con `quien(id, sitio, i, …)`: **nadie sale dos veces en un turno** y cada uno lleva siempre su color. Los personajes nuevos (`maestra`, `maestraRamo`, `lee`, `pescador`, `pescadorSarta`, `pescadorSaluda`, `remienda`, `sacristan`, `milpero`, `milperoSaluda`, `delantal`, `delantalSaluda`, `vendedoraSaluda` y los cuatro oseznos del recado) usan **solo los tonos de siempre**: 0 nodos (un trazo por tono para todo el pueblo, como en el 35).
- Ninguno lleva nombre ni es nadie de la familia; el número de osos sigue dependiendo solo de la pantalla (ocho como mucho); las ventanas no se tocan.
- Las fiestas (la Navidad entera, el desfile) **no cambian**: en fiesta, cada uno hace lo de la fiesta. La misa y el sábado de plaza sí se hacen con los vecinos de siempre (el sábado, la segunda vendedora es la que baja del cantón a vender lo de su huerta: la mejora de la 144).

### 231 · El día del panadero
4:30 carga su canasto con **el horno encendido: la única luz del pueblo** (`data-luces="horno"`: los faroles apagados; su charco de luz va con los vecinos, como el de la pupusera: +1 nodo solo de 4:30 a 5:00, en lugar de los faroles) · 5:00 en su puerta y desde las 5:30 por la calle en la bicicleta · 7:00–10:00 en el atrio · desde las 10:00 en la plaza · a mediodía almuerza sentado junto al comal de la tortillera, con la bicicleta al lado · por la tarde la bicicleta está recostada en su pared · al anochecer hace fila en las pupusas (o se queda en casa) · en la fresca, en su silla.

### 232 · La maestra y su escuela
La escuela es una de las casas de hoy (la última con corredor; donde solo hay dos, la de la calle). 6:45 abre · 7:00–7:15 los oseznos entran en fila con su bolsón · 9:30–9:50 recreo en la plaza · 12:00 la salida (137), con ella (el viernes, con un ramo) · por la tarde corrige cuadernos en su corredor (en vacaciones, lee). Solo los días de escuela (`cielo.js: escuela`).

### 233 · El pescador: del lago a la plaza
Al alba en su cayuco (el del lago, como siempre) · 9:00–10:00 vuelve por la calle con la sarta · desde las 10:00 la vende en la plaza · a mediodía es el de la hamaca (138), con el sombrero en la cara · por la tarde remienda la atarraya en su corredor (con la red tendida al lado, 237) · en la fresca, junto al farol.

### 234 · El sacristán abre, toca y cierra
- **La puerta de la iglesia** (`cielo.js: puertaIglesia` → `html[data-puerta="cerrada"]`): el portal va en su propio trazo (`.v-ig-portal`, **+1 nodo en todas las fechas**: antes iba con el hueco de la campana y el óculo). Cerrado (21:00–5:30) es madera; abierto, la luz de dentro (al amanecer y de noche). Las noches de fiesta de la Navidad entera se queda abierto. Solo CSS: nada se redibuja.
- **Las luces van detrás del sacristán** (mejora de la 147): a las 17:45 solo la iglesia (`data-luces="templo"`), a las 18:00 los faroles, a las 18:15 las ventanas (antes: faroles, iglesia, ventanas). Lo de la noche no cambia.
- Él: al amanecer en la puerta con sus llaves (el domingo, barre el atrio antes de misa) · a mediodía junto a la torre · al anochecer en el atrio · en la fresca, en la puerta (la cierra a las 21:00) · en misa, junto al padre. **Se queda todo el turno** en la puerta: si la página queda abierta (la tele), la puerta cambia a las 5:30 y a las 21:00 con él delante.

### 235 · Encuentros
Una baraja de doce (`ENCUENTROS`: seis de mañana, de 9:00 a 11:30, y seis de tarde): la abuela con visita (el sacristán, la tortillera o la maestra, sentados frente a ella), el pescador que le deja la sarta al sacristán, el milpero (o, si no es jueves ni domingo, el pescador) que saluda al panadero con el brazo, la tortillera que saluda al sacristán, el panadero de visita, el pescador remendando con el panadero, la tortillera y la maestra en la calle, la de la tienda que saluda al panadero… La carta sale de la fecha (`carta(dia, 'encuentro-m', 6)`): **nunca la de ayer ni la del mismo día de la semana pasada** (probado en 400 días). Nadie habla: sin globos ni gestos de boca.

### 236 · El recado del día
Un osezno lleva algo de una punta de la calle a la otra: un huacal tapado, unas flores o un pollito en su caja (cambia cada día); a ratos va saliendo, a media calle, llegando, y de vuelta con las manos vacías o con un dulce. Los días de escuela de 15:00 a 17:00; los demás, la mañana (8:00–11:00) o la tarde según el día. Si su sitio está ocupado, da unos pasos (como los adultos).

### 237 · Las cosas de cada quien
La bicicleta del panadero recostada en su pared cuando él está en casa (a mediodía, junto al comal), el comal frío de la tortillera (el sábado, la olla de los tamales), la atarraya del pescador tendida en su corredor y la escoba junto a la puerta de la de la tienda cuando no barre. Son «cosas» (`COSAS`: sin pie, no cuentan entre los ocho), van **las últimas y solo donde no tapan a nadie** (`choca`, `lug.ocupado` y `lug.borde`, como la ropa tendida del 40); si no caben, ese rato no salen. En el teléfono, con dos corredores, salen menos. Solo los días de siempre (no en fiesta ni en Navidad).

### 238 · La semana de cada oficio
El lunes el panadero descansa: no hay horno a las 4:30 (los faroles, como antes), ni bicicleta, y al amanecer el pan lo trae la de la tienda en su canasto · el sábado la tortillera hace tamales (la olla en vez del comal) · el milpero baja al pueblo solo jueves y domingo · las noches de luna llena el pescador no sale: el cayuco (y su lámpara) no está (`html[data-luna-llena][data-cielo="noche"]`). La descripción de la montaña lo cuenta (`lib.FRASE_SEMANA`, por día de la semana: «los lunes el panadero descansa», «los sábados la tortillera vende tamales de su olla»), sin tutear.

## Medido
Banco (390×664, mil compras, «esenciales» para los nodos; antes = `claude/vida-40`, el mismo sandbox):

| Momento | Turno | Nodos escena antes → después | Valle | Animaciones a la vista («todos») |
|---|---|---|---|---|
| Día normal (25 nov, 12:00) | tortillas | 833 → 834 | 200 → 201 | 15 → 15 |
| Día, barre (7:30) | mañana | 831 → 831 | 198 → 198 | 15 → 15 |
| Día, gallinas (8:30) | mañana | 831 → 831 | 198 → 198 | 18 → 18 |
| Día, perro / pelota (14:30, 15:30) | tarde | 833 → 834 | 199 → 200 | 16 → 16 |
| Anochecer, fogón (19:00) | pupusas | 834 → 835 | 201 → 202 | 41 → 41 |
| Noche normal (21:00) | fresca | 831 → 833 | 198 → 200 | 40 → 40 |
| Antes del alba (10 feb, 4:45) | alba (el horno) | 820 → 822 | 187 → 189 | 38 → 38 |
| Mediodía, tortillas / salida | | 824 → 825 | 191 → 192 | 13 → 13 |
| Siesta, la hamaca (13:00) | | 821 → 823 | 188 → 190 | 13 → 13 |
| La fresca (10 feb, 21:00) | | 822 → 824 | 189 → 191 | 38 → 38 |
| Lunes, ropa tendida (9:00) | | 831 → 832 | 197 → 198 | 16 → 16 |
| Viernes, pupusas (19:00) | | 825 → 826 | 192 → 193 | 39 → 39 |
| Nochebuena (21:00) | | 903 → 904 | 222 → 223 | 34 → 34 |
| Nochebuena, cohetes (el pico) | | 942 → **943** | 226 → 227 | 47 → 47 |
| Pantallas anchas (1440 y 2560) | | 962–984 → 963–985 | | — |

- Tope 1100 (valle 300, osos 40) en todos. **Ninguna animación nueva** en ninguna capa ni franja; `mueve` y los ambientales, idénticos (volcado de un año y medio).
- +1 en todas las fechas: el portal de la iglesia en su trazo. +1 más en algunos turnos de un día cualquiera: un tono de ropa que antes ese reparto no usaba (o el charco del horno a las 4:30). Cada `declara` del banco sube lo medido.
- Crear la escena (CPU 4×): 41–65 ms (antes 28–53); fotogramas en reposo: 55.5–60 (antes 59–60), en la segunda corrida del banco (la primera, recién reiniciado el contenedor, dio 32–74 ms y 37–60 fps). Ruido del sandbox (informa, no falla): los vecinos son los mismos trazos y ninguna animación cambió; el reparto hace unas pruebas de sitio más (las cosas de cada quien). Lo que manda es el iPhone («Medir este aparato») y el CI.

## Decidido por el dueño
- Aprobó las nueve ideas (230–238) y las mejoras que apuntan aquí; lo que cambiaba una regla no se hizo (ver abajo).

## Propuesto por quien implementa (lo revisa el dueño)
- **Sin turnos nuevos**: el recorrido sale de la hora al dibujar el turno; así no hay ni un repintado más al día (la regla «unas seis veces al día» ya iba en once). Con la página abierta, el vecino se queda donde estaba hasta el turno siguiente.
- Quién es quién y su ropa (la tabla de arriba); que la tortillera y el pescador compartan el verde, y el panadero y la de la tienda el rojo (solo hay tres colores de ropa; la prenda los distingue).
- Las horas: el panadero en el atrio hasta las 10:00; el pescador de vuelta a las 9:00; el recreo de 9:30 a 9:50; la fila de las 7:00 hasta las 7:15; el recado de 15:00 a 17:00 (o de 8:00 a 11:00); el encuentro de la mañana desde las 9:00.
- La que se estira al amanecer es la abuela; el de la hamaca, el pescador; la que barre, la de la tienda; la que mira el nacimiento en Navidad, la de la tienda.
- **La iglesia primero** (17:45), luego los faroles (18:00): es lo que pide la mejora de la 147; las demás horas de las luces son las del 40.
- **El horno apaga los faroles** de 4:30 a 5:00 («la única luz del pueblo»); el lunes, sin horno, quedan los faroles.
- **La lámpara del cayuco**: el cayuco ya llevaba su lámpara todas las noches. La 233 pide que salga «las noches de cuarto creciente» con un farolito (+1 nodo en pantallas anchas): **no se hizo** así, porque quitaría la lámpara casi todas las noches (y cambiaría lo probado en el 22, el 38 y el 51). Se hizo lo mínimo de la 238: con luna llena no sale.
- Las frases de la descripción.

## Lo que quedó fuera (y por qué)
- **La campana que se mece a mediodía con el sacristán junto a la torre** (25): es del campamento 49 (una animación más); aquí solo está él junto a la torre.
- **El sacristán no sube a la torre** (quedaría contra el cielo) ni toca nada que suene, como pedía la idea.
- **El farolito del cayuco solo en cuarto creciente** (233): ver «Propuesto».
- **La hamaca de la maestra en vacaciones** (232): por la tarde la plaza es de los oseznos y su pelota (el actor): la hamaca les quitaría el sitio; lee sentada en su corredor.
- **El cruce del panadero a las 7:00** (116): es del campamento 49 (movimiento en su capa).
- **Los manteles después de una fiesta y los pañales** (241, 143), **el primer aguacero** (265), **el perro que duerme donde hubo fiesta** (255) y **el perro que acompaña a un vecino distinto cada día** más allá de lo del 40 (145): son de los campamentos 53 y 54.
- **El pescador de la orilla y el cayuco nuevo** (206, 245): campamentos 50 y 53.
- **Que el director elija las tres barajas** (141 → 223/227): la carta del encuentro sale de la fecha con la misma regla de no repetir; el director no cambia (`mueve` y los ambientales, idénticos).
- Nada que cambie una regla del CLAUDE.md: ningún tope subió, **ninguna animación nueva**, ningún turno nuevo.

## Verificado
En local (25 nov 2026), sin CI; registros y capturas en `scratchpad/c52/` de la sesión. A mitad de la verificación el contenedor se reinició: todo lo de abajo se repitió después, sobre el código final.
- `test_lib` **1061** (bloque «Campamento 52»: seis tamaños × catorce turnos × dos semanas × veinte horas, con la luz de cada lado: cada vecino con su ropa, nadie dos veces, ocho como mucho, sin NaN, el milpero solo jueves y domingo, el lunes sin panadero ni bicicleta, ninguna cosa encima de nadie; los personajes nuevos sin tonos nuevos; el día del panadero, la maestra, el pescador; la puerta y las luces; el encuentro que no repite en 400 días; el recado; la semana de los oficios y sus frases sin tutear). Cambió la prueba de las luces del 40 (la iglesia a las 17:45, el horno a las 4:30).
- `test_api` **1314** (disco simulado sano), `tsc`, Biome (0 avisos), recorte, ruff y mypy (como en el CI): en verde.
- `turno|mueve|foco|ambiente` cada cinco minutos de junio de 2026 a diciembre de 2027: **idéntico** antes y después.
- `test_ui`, **solo los bloques que toca el cambio** (no la suite entera ni sus partes: las corre el CI del PR): «campamento 52» (22, nuevo: a 390 y 1440 px el horno, el lunes sin horno, la puerta abierta y cerrada, el sábado de tamales; la luna llena sin cayuco en un mes de noches; y nada encima de un vecino con un trazo por tono en 25 momentos × cinco anchos), 40 (39), 39 (7), 35 (15), 36 (10), 37 (10), 38 (3), 41 (5), 51 (19), pulido integral (20), pulido del pueblo (4), pulido de la iglesia (6), 22C (21), 22 (27) y 34 (10), sobre el código final; 22B (36), 25 (103) y «Tu historia, medallas y qué hay de nuevo» (16), en la primera pasada (antes de dos retoques del reparto de la mañana). Cambiaron el 35 (al amanecer hasta cinco: el sacristán en la puerta), el 39 (Nochebuena hasta 910 nodos: el portal) y el 40 (el horno; la iglesia antes que los faroles).
- axe: **346** estados, sin violaciones.
- El banco entero, antes y después: en verde (tabla arriba).
- **No se corrieron aquí**: `test_ui` entero (en sus partes), los barridos (`rapido` y por pestañas), Lighthouse A/B y la regresión visual: los corre el CI del PR.
- Capturas (`scratchpad/c52/cap/`): a 320, 390, 768, 844×390, 1440 y 2560 px; claro y oscuro; antes del alba (el horno), el amanecer (el sacristán en la puerta), la fila de las 7:00, el recreo, el pescador de vuelta, las tortillas con el panadero, el sábado de tamales, la salida del viernes (el ramo), la tarde (el recado y el encuentro), las 17:50 (solo la iglesia), la fresca con la puerta cerrada, el lunes; con «todos», «esenciales» y «ninguno». «Qué hay de nuevo» (`2026-12-o`) cabe entero en 360×640 sin desplazar.

## Sin probar aquí
- iPhone real y Safari: el portal que cambia de color a las 5:30 y a las 21:00 (un cambio de `fill` por CSS en el dibujo grande, como las luces del 40) y «Medir este aparato» con el pueblo nuevo.
- La tele real (2560 px), una noche entera con la página abierta (el sacristán en la puerta mientras se cierra).
- Que a la familia le parezcan bien quién es quién, las horas, los encuentros y las frases.
