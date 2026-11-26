# Campamento 46 · Luna y estrellas

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Antes: [45](45-animales-de-aqui.md) (el reloj de los animales y el patrón `COSTUMBRES`), [47](47-los-osos-de-la-cumbre.md) (las poses quietas de la cumbre: `CUMBRE`), [01](01-efectos-cielo-atmosfera.md) (cielo por hora, luna con su fase), [05](05-montana-viva-banderas-aurora.md) (la aurora y la cara que mira arriba), [11](11-tu-eco-y-tus-numeros.md) (las lluvias de estrellas de la idea 43), [38b](38b-pulido-integral.md) y [30](30-hacer-sitio.md). El plan: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md) (aprobado entero por el dueño, también las ideas marcadas «después»). Las ideas: `docs/pulido-visual/vida-del-valle/ideas_v4.py` (ids 179–183) y la mejora de la 181 en `ideas_v5.py` («Tú» fuera de la carpa, 272).

## Lo hecho (26 nov 2026)
Todo quieto: **ninguna animación nueva, ninguna capa nueva**, ningún foco ni frase de la línea de hoy. Lo de la hora lo enseña el CSS (`data-lucero`, `data-eclipse`, `data-cumbre`); lo del día se dibuja al poner la escena (y al cambiar de día, `libro:dia`, como siempre).

| Idea | Cuándo | Cómo | Nodos |
|---|---|---|---|
| 179 · el conejo en la luna | las noches de luna llena (la regla del director: `lunaDeLaNoche`, la luna de las 21:00) | `montana.js: luna(…, { conejo })`: los mares de verdad (Océano de las Tormentas, Lluvias, Serenidad, Tranquilidad, Crisis, Fecunditatis y Néctar como orejas, Nubes, Humores, Frío), en el **mismo trazo** de los mares | 0 |
| 180 · las estrellas de verdad | Orión, Aldebarán y las Siete Cabritas de noviembre a marzo (20 estrellas); el Alacrán de mayo a agosto (16); abril, septiembre y octubre, las de siempre | `cielo.js: figuraDelCielo`; `arte.js: FIGURAS_CIELO` (carta del cielo, norte arriba) y `sitioFigura`; `montana.js: estrellasDelCielo`. Son las primeras de las 46 estrellas: se gastan los **mismos `rnd()`** en el mismo orden y se colocan después de calcular la silueta (`<!--estrellas-->`) | 0 |
| 181 · las Gemínidas | las noches del 13 y del 14 de diciembre, 19:00–5:00 (también pasada la medianoche) | pose `estrellas` de `CUMBRE` (antes que `duermen`): no duermen y miran arriba con la cara de la aurora (`.osos.mira-cielo`, dibujada solo esas fechas: 13, 14 y 15). Las fugaces de más ya existían (idea 43: 13–15 de diciembre) | la cara alzada, solo esos días |
| 182 · el lucero | de la tarde, 17:30–20:30; de la mañana, 4:00–6:30 | `cielo.js: lucero` (conjunciones publicadas) y `luceroAhora` → `html[data-lucero]`; un destello quieto (`.lucero`, `arte.js: luceroD`) junto al astro, donde quepa | +1 los días que lo hay |
| 183 · la luna roja de los eclipses | la totalidad de los eclipses totales que se ven de noche desde aquí: 25 jun 2029 (20:32–22:14), 8 oct 2033 (4:17–5:36) y 6 ago 2036 (20:05–21:40) | `cielo.js: ECLIPSES` → `html[data-eclipse]`: la luna cobriza, el halo apagado | 0 |

- **Dónde va la figura** (`sitioFigura`): el mayor tamaño (de 190 px de alto o el 28 % de la escena, hasta 70) y, de ese tamaño, el sitio más cerca del hueco entre la cumbre y el astro donde **todas** sus estrellas, con 5 px de aire, caen en cielo libre: ni dentro de la silueta de la montaña, ni bajo los textos de la escena (las mismas cajas que esquivan los osos), ni a menos de 1.7 radios de la luna, ni junto al rótulo de la cumbre, ni por debajo de los volcanes (`c.sy + 0.12·alto`), ni sobre el lucero. Si no cabe, ninguna figura (las estrellas de siempre). En el teléfono queda a la izquierda, bajo el saldo; en escritorio, entre la cumbre y la luna. `#montana[data-figura]` dice cuál se puso (lo leen las pruebas).
- **El lucero**, junto al astro (a 2.6, 3.4 o 4.4 radios, primero arriba a la izquierda), con 8 px de aire en cielo libre. El sol y la luna van en el mismo sitio de la escena, así que el de la tarde y el de la mañana salen en el mismo lado: la escena no tiene oriente ni poniente.
- **La hora exacta de los animales** (encargo del dueño, aprobado el 26 nov 2026; **cambia una regla**): `cielo.js: aplicar` avisa `libro:turno` también cuando cambia `animalDelPueblo` (uno solo si cambian el turno y el animal a la vez: a las 5:00, a las 14:00, a las 22:00). `montana.js: vigilarTurno` guarda el animal pedido al dibujar (`opcionesReparto` → `info.animal`) y, si solo cambió el animal, rehace el grupo `.v-vecinos` **sin que nadie camine** y vuelve a poner la capa del actor con el reparto nuevo (como al acabar la fiesta); para el que estuviera caminando, y respeta la fiesta del hito. Son unos cuatro o cinco repintados más al día: 4:30 (si hubo tecolote), 6:00, 11:00 (en la seca), 17:30 y 18:30. Con el reloj de cinco minutos de `aplicar`, como el turno.
- **COSTUMBRES** (una línea cada una; con `false`, el cielo de siempre): `conejo`, `estrellas`, `geminidas`, `lucero`, `eclipse`.
- **`fueraDeTemporada`**: no hace falta tocarla: el lucero, la figura y la cara de las Gemínidas solo se dibujan los días que tocan (la escena se rehace al cambiar de día).
- «Qué hay de nuevo»: `2026-12-zb` (cuatro frases; resume también la `2026-12-za`). Sin los nombres por confirmar: dice «Orión» y «el Escorpión».

## Datos y de dónde salen
- **Eclipses** (183): NASA, «Decade Tables of Lunar Eclipses» 2021–2030 y 2031–2040 (eclipse.gsfc.nasa.gov/LEdecade). Del máximo en TD se restan 6 horas (El Salvador, UTC−6; TD y UT difieren en algo más de un minuto) y media totalidad a cada lado. Solo los que tienen la totalidad de noche aquí: no entran el del 20 dic 2029 (16:43), el del 11 feb 2036 (16:13) ni el del 26 may 2040 (5:46, la luna se pone y ya es de día en la escena). Una prueba comprueba que cada fecha es de luna llena con la cuenta de la fase.
- **Venus** (182): conjunciones inferiores del 23 mar 2025, 24 oct 2026, 1 jun 2028 y 6 ene 2030; superiores del 6 ene 2026, 11 ago 2027 y 23 mar 2029 (EarthSky, in-the-sky.org; la del 1 jun 2028 sale como 1 o 2 de junio según la fuente: da igual con 8 días de margen). Invisible 8 días alrededor de la inferior y 40 de la superior. Fuera de la tabla, el ciclo medio de 583.92 días.
- **Por confirmar con la familia** (de oídas, como decía la idea): que las Pléyades se llamen aquí «las Siete Cabritas» y Escorpio «el Alacrán». Están solo en los comentarios del código y en este documento; la app no los escribe en ningún sitio (la entrada de novedades dice «el Escorpión»).
- **El conejo** es el dibujo de los mares de verdad, hecho aquí con elipses (no hay dibujo de Fable): las orejas son Fecunditatis y Néctar, alargadas hacia abajo a la derecha. Se lee mejor en escritorio y en la tele; a 390 px la luna mide unos 40 px.

## Decidido (este campamento; no se vuelve a preguntar)
- **Las ideas «después» del plan (182 y 183) entran**: el dueño aprobó todo (19 nov 2026). La 183 solo con fechas sacadas de la tabla oficial de la NASA (no de memoria); la 182 con conjunciones publicadas y una prueba contra ellas.
- **Las figuras no son dibujo nuevo**: son 20 o 16 de las 46 estrellas de siempre en su sitio del cielo; los nodos no cambian. La forma de la montaña no se entera: los `rnd()` se gastan igual.
- **Una figura fija toda la noche**, sin girar con la hora: en la escena el astro tampoco se mueve.
- **Las Gemínidas, con cualquier nivel de efectos**: es una pose quieta; miran el cielo estrellado aunque las fugaces solo crucen con «todos».
- **La hora exacta de los animales** (arriba): el cambio de animal avisa como el de turno; nadie camina por un animal.
- **El lucero suma un nodo**: no puede ser una de las 46 (las estrellas tienen `--estrellas` en 0 al amanecer).

## Lo que queda para Fable o para después (y por qué)
- **«Tú» fuera de la carpa, sentado, mirando hacia arriba** las noches de las Gemínidas (mejora de la 181 en la v5, de la 272): no hay pose sentada de «Tú». Esas noches «Tú» sigue en su carpa. **Para Fable**: «Tú» sentado de espaldas mirando el cielo, a la talla de `osoTu`.
- **La Osa Mayor en la constelación de «Tu historia»** (pendiente 4 de [39-50-pendientes-revision.md](39-50-pendientes-revision.md); la propuesta, en [25](25-osos.md)): no hay dibujo en el código ni en los prototipos, y su sitio (el borde del planisferio, con su nombre, sin confundirse con las figuras de cada año) es una decisión de diseño. **Para Fable**.
- **Las imágenes de arranque con osos** (iPhone; `scripts/generar-arranque.mjs`): exigen una composición nueva (los osos en la montaña simple del arranque). **Para Fable** (o un pulido de arranque).
- **El conejo**, si a Fable o al dueño no se les lee como conejo: se rehace el trazo de los mares (sigue siendo uno).
- La 183 con eclipses parciales o de penumbra: no (la idea habla de los totales).

## Medido (banco `--rapido`, 390×664, mil compras, nodos con «esenciales»; antes = la base `claude/vida-45` en los mismos momentos)
**Lo que sube: +1 nodo en las 136 filas que ya había** (teléfono, 1440, 1920, 2560, «dos focos» y tele): es el lucero, que esas fechas tiene (Venus es de la mañana de noviembre de 2026 a junio de 2027 y de la tarde de febrero a octubre de 2026: todas las fechas del banco caen en uno u otro). Cada `declara` sube 1. **Ninguna animación cambia** en ninguna fila (ni el número ni el reparto por capa). Lejos de los topes (1100 en el teléfono; la noche más cargada en pantallas anchas, Nochebuena a 1920: 999).

| Momento nuevo (declarado) | Nodos | Osos | Animaciones a la vista («todos») |
|---|---|---|---|
| El Alacrán (15 jul, 21:00) | 838 | 36 | 46 |
| El lucero de la tarde (15 ago, 18:00) | 841 | 36 | 60 |
| El lucero de la mañana (26 nov, 5:15) | 851 | 36 | 19 |
| Gemínidas, miran arriba (14 dic, 23:00) | 882 | **38** (+2: la cara alzada; tope 46) | 43 |
| Eclipse de luna (25 jun 2029, 21:00) | 836 | 36 | 46 |
| Gemínidas 1440 / 1920 / 2560 | 949 / 964 / 962 | 39 / 39 / 27 | — |
| Lucero 1440 / 1920 / 2560 | 904 / 924 / 921 | — | — |
| Tele 1920×1080, lucero de la tarde | 924 | — | 21 (tope 24) |

Banco entero en verde («OK: dentro de los topes de nodos y del presupuesto de animaciones»). Colocar la figura (una búsqueda en rejilla de 6 a 14 px, con la silueta) no se midió aparte: el «crear» del banco no se tomó en `--rapido`.

## Verificado
- `test_lib` (1228 comprobaciones), bloque «luna 46»: el aviso `libro:turno` cuando cambia solo el animal (6:00, 11:00, 18:30 sin cambio de turno) y uno solo cuando cambian los dos; las figuras por mes; el lucero contra diez fechas (conjunciones y máximas elongaciones publicadas); la luna roja solo en la totalidad de cada eclipse y cada fecha de luna llena; las Gemínidas (también pasada la medianoche) y que la pose va antes que «duermen»; el conejo las noches de luna llena (la misma noche antes y después de medianoche); cada línea de `COSTUMBRES` en `false`; y `sitioFigura` en un cielo inventado (con montaña, texto y luna: todas las estrellas libres; sin sitio, null).
- `test_ui`: bloque nuevo «campamento 46» a 390 y 1440 px: con la página abierta y el mismo día, el gallo se va a las 6:00, el garrobo a las 14:00 y los zanates llegan a las 17:30 y se van a las 18:30 (la descripción nombra el que está, un solo grupo de vecinos, una sola capa de actor, ningún NaN); Orión en noviembre, el Alacrán en julio, nada en abril; el lucero de la mañana y el de la tarde, quietos, y de día no; la luna cobriza solo en la totalidad; las Gemínidas en la cumbre. `test_ui` entero por partes (`PARTE=k/6`, de dos en dos): 472 + 437 + 349 + 337 + 653 + 567 comprobaciones, en verde. **Prueba vieja cambiada** (intencional): la del 39 en Nochebuena a las 21:00 contaba 7 mares; el 24 de diciembre de 2026 es luna llena y lleva el conejo (12 mares en el mismo trazo); el total (920, con el lucero) sigue bajo su tope (922). Y el banco declara +1 en cada fecha (el lucero).
- axe: 348 estados, sin violaciones. `tsc`, Biome (0 avisos) y `comprobar_recorte`, en verde.
- No se corrieron los barridos (`rapido` y por pestañas), Lighthouse, `test_api` (no se tocó el servidor) ni la regresión visual: los corre el CI.
- Capturas reales (390, 1440 y 1920; claro y oscuro; «todos» y «ninguno»): Orión bajo el saldo en el teléfono y entre la cumbre y la luna en escritorio; el Alacrán; el lucero de la tarde junto al sol y el de la mañana (en el teléfono, a la derecha bajo el astro); la luna cobriza; el conejo; las Gemínidas. **Las figuras son sutiles**: son las mismas estrellas pequeñas de siempre; el cinturón de Orión y la curva del Alacrán se reconocen mirando, no saltan a la vista.

## Sin probar aquí
- Safari de iOS e iPhone real: la figura y el lucero son trazos quietos (como las estrellas); la luna cobriza es un `fill` por CSS. Lo que cambia en el iPhone es la colocación: depende de dónde caen los textos de la escena en ese aparato (se mide en el momento de dibujar).
- La tele real de noche con la figura y el lucero.
- Que la familia llame así a las Cabritas y al Alacrán.
