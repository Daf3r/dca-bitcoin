# Campamento 45 · Los animales de aquí

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Antes: [43](43-temporadas-del-pueblo.md) (el mismo patrón: `COSTUMBRES`, se mira la hora al dibujar), [47](47-los-osos-de-la-cumbre.md) (las poses quietas por tabla: `CUMBRE`), [51](51-el-director-del-valle.md) (el director), [52](52-vecinos-con-oficio.md) (los vecinos y sus cosas), [22B](22b-valle-vivo-parte-2.md) (las vacas, la garza, el cayuco) y [38b](38b-pulido-integral.md). El plan: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md) (aprobado entero por el dueño). Las ideas: `docs/pulido-visual/vida-del-valle/ideas_v4.py` (ids 172–178), `ideas_vida.py` (54) y sus mejoras de la v5 en `ideas_v5.py` (la 172 pasa a ser «el reloj de los animales» y se le funde la 54; la 173, una noche de cada cuatro y nunca con luna llena). Los dibujos, de `prototipo-vida4.patch`, sin cambios de forma.

## Lo hecho (26 nov 2026)
Todo quieto (así venían marcadas las ideas): ninguna animación nueva, ninguna capa nueva y ningún foco ni frase de la línea de hoy.

| Idea | Cuándo | Dónde | Cómo |
|---|---|---|---|
| 172 · el gallo | 5:00–6:00 | la plaza, junto a la banca del árbol | en los trazos de los vecinos (`rasgo` y la cresta `r1`) |
| 54 · el garrobo | 11:00–14:00, en la época seca (noviembre–abril) | el mismo sitio | `r0` (el verde) y su ojo |
| 172 · los zanates | 17:30–18:30 | el mismo sitio, tres en fila en el suelo | `rasgo` |
| 173 · el tecolote | 22:00–4:30, una noche de cada cuatro (sorteo por fecha), nunca con luna llena ni en Navidad | la rama baja del árbol de la plaza, dentro de su copa (`lug.rama`) | `rasgo` y los ojos encendidos (`brasa`); no parpadea |
| 174 · las vacas | 11:30–14:00 | el potrero junto al lago | echadas: la pose de la noche, ya dibujada (`html[data-valle~="vacas"]`); las garcitas se van con ellas |
| 175 · la garza | 12:00–19:00 (de noche no hay garza) | la otra orilla del lago | la misma garza reflejada sobre el centro del lago: el `transform` va en el atributo de cada trazo y el CSS lo anula por la mañana (`html:not([data-valle~="garza"]) .v-garza { transform: none }`): 0 nodos, sin grupo nuevo |

- **El reloj de los animales** (172 de la v5): un solo sitio en la plaza que ocupa el animal de cada hora. Es **junto a la banca del árbol**, detrás de la calle: así nunca se le pone delante al panadero que cruza de 6:00 a 7:00 (su capa no cuenta como obstáculo lo que está detrás: `detrasDe`) ni corta el paso al que camina al cambiar de turno (el animal no tiene `quien`: nunca camina; para los que caminan es un obstáculo más). Si la banca está ocupada (la hamaca de la siesta, el que duerme en ella en Navidad), unos pasos más allá o en la orilla de la plaza (`RELOJ`, en `arte-vecinos.js`); si no cabe, ese rato no sale.
- **Dónde vive**: `cielo.js: animalDelPueblo` (y su sorteo, `sorteo`), `VALLE` y `poseValle` (las poses quietas del valle, como `CUMBRE`), las dos en el director (`animal`, `valle`) y en la clave del mapa del día (el almanaque de la guía las enseña); `arte-vecinos.js` (los cuatro dibujos, que son `COSAS`: sin sombra de pie, no cuentan entre los ocho y no apartan a nadie; van los últimos del reparto, después de las cosas de cada quien); `arte-pueblo.js: lugaresPueblo` (`lug.rama`); `montana.js: opcionesReparto` (`animal`); `arte-valle.js: vidaLago` (el reflejo de la garza); `styles.css` (las vacas y la garza).
- **Se mira la hora al dibujar el turno** (como la milpa del 43): no hay aviso nuevo ni un repintado más. El gallo sale con el turno de las 5:00 (si la página se abre a las 6:10, ya no); el garrobo, con el de las 11:30 (o al abrir entre las 11:00 y las 14:00); los zanates, con el de las 17:45 (o al abrir desde las 17:30) y se quedan hasta el cambio de turno siguiente si la página sigue abierta; el tecolote, con el de las 22:00.
- **La descripción de la montaña** nombra el animal que está dibujado (`lib.js: FRASE_ANIMAL`, sin tutear): «En la plaza hay un gallo.», «En la plaza, un garrobo toma el sol.», «Tres zanates buscan comida en el suelo de la plaza.», «En la rama baja del árbol de la plaza vela un tecolote.».
- **El almanaque de la guía** suma un sábado de la seca con los cuatro (el 28 de noviembre de 2026, noche de tecolote) y cada tramo dice el animal de la plaza y las poses del valle.
- **`fueraDeTemporada`**: no hace falta tocarla (los animales van en el reparto, no escondidos por el CSS; las vacas y la garza ya estaban dibujadas).
- «Qué hay de nuevo»: `2026-12-za` (cuatro frases; resume también las temporadas y las fiestas, `2026-12-z` y `2026-12-y`).

## Los animales que la familia puede apagar (una línea cada uno)
En `app/static/cielo.js`, la tabla `COSTUMBRES` del 42 y el 43. Con `false`, ese animal no sale y ese rato es el de siempre (`test_lib` lo comprueba).

| Línea | Qué apaga | Por qué está marcada |
|---|---|---|
| `gallo: true` | el gallo de 5:00 a 6:00 | — |
| `garrobo: true` | el garrobo del mediodía | — |
| `zanates: true` | los zanates del atardecer | — |
| `tecolote: true` | el tecolote de algunas noches | en algunos lugares es de mal agüero (la idea lo dejaba a la familia) |
| `vacas: true` | las vacas echadas a mediodía | — |
| `garza: true` | la garza en la otra orilla por la tarde | — |

## Decidido (este campamento; no se vuelve a preguntar)
- **Manda la v5** («el reloj de los animales»): un solo sitio para el animal de cada hora, no un animal en cada rincón. El garrobo es una de sus horas (la 54 fundida en la 172).
- **El sitio del reloj, junto a la banca del árbol de la plaza** y no en la fila de delante de la plaza (donde lo ponían dos maquetas): delante, el gallo de las 5:00 podía cortarle el paso al panadero que cruza de 6:00 a 7:00 (su tramo se calcula al dibujar el turno de las 5:00, con el gallo ya puesto). Una prueba lo fija en los seis tamaños.
- **El tecolote, en la copa del árbol**, del lado del astro, con su caja entera dentro de la copa (prueba en los seis tamaños): nada contra el cielo. En Navidad el árbol de la plaza es el pino: esas noches no sale. Una noche de cada cuatro **por sorteo de la fecha** (igual en todos los aparatos, sin guardar nada): 156 noches de 730 en 2026–2027, contando que nunca sale con luna llena ni en Navidad. No se afinó el sorteo para esquivar las noches que mide el banco.
- **Los animales no son un turno ni un foco**: no cambian lo que se mueve (`mueve` es el mismo con ellos y sin ellos: prueba) ni dicen nada en la línea de hoy (lo común es callado).
- **Las vacas y la garza no se redibujan**: son poses quietas que enseña el CSS (`data-valle`), como las de la cumbre; 0 capas, 0 animaciones, 0 nodos.
- **El cayuco de la 175 no se tocó** (ver abajo).

## Lo que queda para Fable o para después (y por qué)
- **176 · la cresta roja de las gallinas y los pollitos de mayo** (en la v5, «la gallina echada y sus pollitos», historia 239 del campamento 53): **no hay dibujo** de los pollitos ni de la gallina echada; la cresta sola sumaría un tono (+1 nodo) en **todas** las fechas y en cada capa de las gallinas cuando picotean. **Para Fable**: los tres pollitos y la gallina echada a la talla de las gallinas del pueblo; la cresta, con ellos.
- **177 · el torogoz posado** en el árbol del primer día, con la cola de raquetas colgando: **no existe la pose posada** (el dibujo de `arte.js: torogoz` es de vuelo, de perfil y con la cola horizontal), y hoy vive en la capa del cielo con `efecto-ambiente`: posado no sale a 0 nodos (o se mueven sus nodos de capa a las 7:00 y a las 17:00, o se dibuja otro). **Para Fable**: el torogoz posado, de perfil, cola colgando, a la talla del árbol del primer día.
- **178 · el venado cola blanca** al borde del bosque (desde 1440 px; en la v5, una madrugada de cada cinco): **no hay dibujo**. **Para Fable**.
- **174 · «juntas camino del corral al atardecer»**: no hay corral y las tres vacas van en el mismo trazo (moverlas una a una suma nodos). Al atardecer siguen de pie, como hoy. Después, con un corral dibujado.
- **175 · el cayuco** («sale al centro al amanecer y de día descansa en la orilla»; en la v5, el del pescador con su día, 233): **no se tocó**. El 51 lo dejó a la deriva de día (5:00–16:30, ambiental en su capa) y el 52 hizo del pescador un vecino con oficio. **Incoherencia a decidir**: desde las 9:00 el pescador está en el pueblo (vende en la plaza, duerme en la hamaca de 12:30 a 14:00, remienda por la tarde), pero el cayuco del lago sigue con él dentro todo el día. Arreglarlo es quitar el pescador del cayuco desde las 9:00 y dejarlo en la orilla, lo que cambia la franja del ambiental `cayuco` del 51 (y sus pruebas) y pide comprobar el sitio de la orilla contra el tule, la garza y las monedas: mejor en su propio paso, con el visto bueno del dueño.

## Medido (banco `--rapido`, 390×664, mil compras, nodos con «esenciales»; antes = la base `claude/vida-43` en los mismos momentos)
**Lo que sube**: la siesta de las 13:00 (y la hamaca que se mece, 13:30): **838 → 839**, en la escena y en el valle, también en los «dos focos» a 1440, 1920 y 2560 (902 → 903, 919 → 920, 918 → 919). Es el verde del garrobo (`r0`): a esa hora la ropa de la hamaca va en su capa y el pueblo no tenía ese tono en el dibujo grande. Muy lejos del tope (1100). Declarado en el banco.

Lo demás, igual que en la base (117 de 123 filas idénticas, también las animaciones): el día normal de las 12:00 (el garrobo usa tonos que ya estaban), el mediodía de las tortillas y la salida, el atardecer de espaldas (17:45, con los zanates), las noches del banco (no son noches de tecolote) y todas las fechas de fiesta y temporada.

| Momento nuevo (declarado) | Nodos | Animaciones a la vista («todos») |
|---|---|---|
| El gallo (25 nov, 5:30) | 850 | 19 (las de siempre del amanecer) |
| El garrobo y las vacas echadas (10 feb, 13:00) | 839 | 14 |
| Los zanates (25 nov, 18:00) | 846 | 34 |
| El tecolote (28 nov, 23:00) | 836 (**+2** frente a una noche sin él: su trazo oscuro y sus ojos; de noche el pueblo no tenía ningún trazo) | 39 |
| El gallo en Navidad (10 dic, 5:30) | 893 | 23 |
| Tecolote 1440 / 1920 / 2560 | 899 / 917 / 916 (tope 1100) | — |
| Garrobo 1440 / 1920 / 2560 | 903 / 920 / 919 | — |
| Tele 1920×1080, garrobo · zanates | 920 · 927 | 14 · 17 (tope 24) |

Banco entero en verde («OK: dentro de los topes de nodos y del presupuesto de animaciones»).

## Verificado
- `test_lib` (1205 comprobaciones), bloque «animales 45»: la hora de cada animal (y sin garrobo en la lluviosa); el tecolote en dos años (una noche de cada cuatro, nunca con luna llena, ni en Navidad, ni fuera de `duerme`, la misma noche antes y después de medianoche); las poses del valle y que no pesan; con cada línea de `COSTUMBRES` en `false`, nada; lo que se mueve, igual con ellos y sin ellos; y el reparto en seis tamaños (320, 390, 844 acostado, 768, 1440 y 2560) con la luz de cada lado, en siete momentos (también la siesta con la hamaca y el gallo en Navidad): el animal sale una vez, **los demás quedan exactamente igual que sin él**, nadie encima de nadie, el gallo detrás del panadero que cruza, el tecolote dentro de la copa, ningún NaN; la descripción lo nombra sin tutear.
- `test_ui`: bloque nuevo «campamento 45» a 390 y 1440 px (ocho momentos con la página abierta, cambiando día y hora): `data-valle`, el animal que nombra la descripción, los ojos del tecolote solo su noche, la garza reflejada por la tarde y en su orilla por la mañana (`getComputedStyle(…).transform`), las vacas echadas a mediodía, ningún NaN, la consola limpia y ninguna animación en la garza ni en las vacas. El resto de `test_ui`, por partes: ver el informe del campamento.
- axe, `tsc`, Biome (0 avisos) y `comprobar_recorte`: ver el informe del campamento.
- Capturas reales (390, 1440 y 1920×1080, claro y oscuro, «todos» y «ninguno») de cada animal en su momento, en el informe.

## Sin probar aquí
- **Safari/WebKit e iPhone real**: que el `transform` en el atributo de los trazos de la garza lo anule el CSS (`transform: none`) igual que en Chromium (es SVG 2 y Safari lo soporta, pero no se vio aquí). Si en Safari la garza saliera siempre en la otra orilla, se nota de inmediato a las 9:00.
- La tele real a mediodía y al atardecer (el banco mide el garrobo y los zanates a 1920×1080).
- Que a la familia le parezca bien el tecolote (se quita con `tecolote: false`).
