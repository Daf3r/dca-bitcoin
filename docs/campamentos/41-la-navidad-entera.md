# Campamento 41 · La Navidad entera (24, 25, 31, 1 y 6)

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Antes: [35](35-pueblo-de-los-osos.md) (los turnos y el reparto), [36](36-calendario-del-pueblo.md) (el calendario), [37](37-el-pueblo-se-mueve.md) (la capa del vecino), [38b](38b-pulido-integral.md) (nada corre escondido) y [39](39-hacer-sitio-2.md) (el sitio y el banco). El plan: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md); los guiones, en `docs/pulido-visual/vida-del-valle/ideas_fiestas.py` (ids 210–218 y 162) y las maquetas aprobadas en `prototipo-vida4.patch`, de donde salen los personajes nuevos (hechos desde cero en el código de la app; la rama `chatgpt/campamento-41` no se usó).

## Lo hecho (24 nov 2026)
Hasta ahora Nochebuena y el 31 eran una sola estampa de 18:00 a 1:00. Ahora **cada fecha dura todo su día**, con un guion por turnos de la madrugada a la medianoche, y **ese día no corre el de un día cualquiera** (ni la misa del domingo ni el sábado de plaza, aunque caigan en domingo o sábado).

- **El día de fiesta es un guion entero** (210, `cielo.js: turnoFiesta`): los turnos de la Navidad pasan delante de los de siempre. **Un turno nuevo cuesta 0 nodos**: es otro reparto de los mismos trazos (`arte-vecinos.js: reparto`, un trazo por tono); al cambiar con la página abierta, `libro:turno` rehace solo `.v-vecinos` y la capa del actor, como siempre.
- **La franja de fiesta** (210, `cielo.js: mueveFiesta`): la noche del 24 y del 31 es de la fiesta y **las luciérnagas descansan** (el dibujo grande de Nochebuena a las 21:00, de 26 a 10 animaciones a la vista tras el 39; 42 antes de él); se mueve un solo actor, en su capa (`montana.js: capaVecino`): **brinda** uno en la cena (de 17:45 a 21:00 el 24 y a 23:00 el 31, a saltos), la misa de gallo y la espera del 31 quedan quietas (`fiesta`), y **chispea** un volcancito de la plaza a las doce (23:40–1:00 el 24; 0:00–1:00 el 1). El 25, de 9:00 a 12:00, la pelota nueva de los oseznos. Los cohetes siguen siendo ambiente (y desde el 39 solo se dibujan de 23:40 a 0:40).
- **Nochebuena** (211): 4:30 el panadero, la que barre, la primera vendedora y el que se estira; 7:00 las compras (dos vendedoras, el del matate, el del huacal, uno en su escalera con los últimos adornos, la que barre y un osezno); 11:30 los tamales (la olla con su brasa, alguien que llega con un regalo, oseznos y la pelota); 17:45 la cena en la calle (la mesa —en el teléfono, la corta—, el brindis, los oseznos con su estrellita, la osa frente al nacimiento); 21:00 **la misa de gallo** (de espaldas camino de la iglesia y el padre a la puerta); 23:40 **los abrazos** (de dos en dos), un regalo y los volcancitos.
- **Navidad, el 25** (212): nadie hasta las 7:00; la pólvora en la calle y la que barre; 9:00 los estrenos (oseznos con su carrito y la pelota nueva, mayores sentados mirando); 12:00 el recalentado (la mesa otra vez, la siesta en la banca y el perro bajo la mesa); 14:00 el paseo (un osezno en hombros, la visita al nacimiento); 17:45 la fresca con la pupusera.
- **El 31** (213): 5:00 se barre y se tiende la ropa (el tendedero, en el corredor de una casa: en la calle quedaba encima de la que barre); 11:30 el estreno y los volcancitos apagados que preparan los oseznos (y la pelota); 17:45 la cena y el brindis; **23:00 la espera**: todo el pueblo de espaldas, mirando la torre, sin un solo número; **0:00 el abrazo de las doce** (162) con los volcancitos.
- **El 1 de enero** (214): nadie hasta las 9:00 (la pólvora en la calle); la que barre; por la tarde, las visitas de casa en casa; de noche, la fresca.
- **El 6 de enero** (215): de 14:00 a 17:45 se guarda la Navidad: un vecino en su escalera junto al pino y dos oseznos ayudando. El 7 ya no hay Navidad (como antes).
- **Los de la cumbre** (216, con la 186 fundida): **los regalos**, dos cajitas en la nieve delante de los osos (el rojo de su cinta y el verde del pueblo, la cinta en cruz hecha de un hueco), desde las 23:40 del 24 y todo el 25; dos nodos fuera del grupo de los osos (no gastan su tope), justo detrás de él en el orden (se esconden con ellos si un rótulo los pisa o si la nieve no llegó), solo si caben en la montaña con aire. **A las doce levantan los brazos** (los de estirarse, del 33), salvo si con ellos alguno quedaría contra el cielo (`data-sin-estirar`: con el saldo de las pruebas pasa a 390×844 y a 1440×900, así que ahí no los levantan; a 320, 768, 844×390 y 2560 sí caben, y `test_ui` lo comprueba a 768).
- **«Tú»** (217): a las doce del 24 y del 31, de pie con los brazos arriba (la pose de festejar), mirando los cohetes.
- **Los animales** (218): con los cohetes y en la espera del 31, el perro se esconde bajo el árbol de la plaza y las gallinas no salen; el 25 a mediodía, el perro está bajo la mesa. Es el mismo perro dibujado con los vecinos (el de siempre no se ve esos ratos).
- `html[data-festivo]` (`nochebuena`, `navidad`, `fin`, `anio`, `reyes`): lo que dura el día entero (los regalos del 25). El almanaque de la guía (39) ya enseña los turnos nuevos de cada fecha con su «Ver».

### Lo que no entra (depende de ideas de campamentos posteriores; los textos de la 216 y la 217 dicen cómo quedan sin ellas)
- Dormirse (24): el 25 y el 1 los de la cumbre amanecen como siempre. La carpa de «Tú» (191): «Tú» no acampa; solo levanta los brazos a las doce.
- El oso de nieve (185), mirar al pueblo de espaldas al anochecer (184) y mirar al cielo el 31 a las 23:50 (la cara «mirando arriba» solo existe con la aurora; sin ella costaría 6 nodos en los osos).
- El gallo (172), el tecolote (173), la hamaca (199; el 25 a mediodía va la siesta de siempre) y las estrellitas que titilan (201: siguen quietas).

## Medido (banco, 390×664, mil compras, «esenciales»)
| Momento | Nodos | Animaciones a la vista («todos») |
|---|---|---|
| Nochebuena 19:00 (la cena) | 907 | 38 (dibujo grande 13, el que brinda en su capa 1) |
| Nochebuena 21:00 (misa de gallo) | 899 | 34 (antes del 41, 50: las luciérnagas descansan) |
| Nochebuena 23:55 (las doce, cohetes) | **938** (el pico del año; tope 1100) | 47 (frente 26 de 28) |
| 25 dic 9:30 (estrenos) | 900 | 24 |
| 31 dic 23:35 (la espera) | 870 | 28 |
| 1 ene 0:30 (el abrazo) | 908 | 29 |
| 6 ene 15:12 (se guarda) | 867 | 17 |
Los turnos no suman nodos (el mismo número de trazos); lo que sube es el reparto más lleno (unos 7–10 más que la estampa de antes) y los regalos (2). El escritorio (1440 y 2560 px) queda en 958–979, bajo su tope.

## Decidido (no se vuelve a preguntar)
- **Un día de fiesta es un guion entero**: sus turnos pasan delante de los de un día cualquiera, también un domingo o un sábado. Una fiesta nueva añade los suyos en `turnoFiesta` (y su franja en `mueveFiesta`, si algo se mueve) y declara lo que pesa en el banco.
- **La noche del 24 y del 31 es de la fiesta**: las luciérnagas descansan y se mueve un actor de la fiesta, uno a la vez.
- **El perro de las fiestas es el mismo perro**, dibujado con los vecinos donde se esconde; el de siempre no se ve esos ratos.
- **Los regalos van fuera del grupo de los osos** (no gastan su tope) y se esconden con ellos.
- Las cosas del suelo (la mesa, la pólvora, los volcancitos, el tendedero, el perro escondido: `arte-vecinos.js: COSAS`) no cuentan entre los ocho vecinos ni apartan a nadie.

## Verificado
- `test_lib`: los turnos de cada fecha a cada hora (y un 24 y un 31 en domingo y en sábado), la franja de fiesta, `data-festivo`, y en seis tamaños (320, 390, 844 acostado, 768, 1440 y 2560) con la luz de cada lado: la figura clave de cada turno sale, un solo actor y **ningún NaN** en los trazos; el barrido de todo un año sigue válido.
- `test_ui`, bloque «campamento 41»: a 390 y 1440 px, las cinco fechas en 22 momentos con la página abierta (cambiando día y hora): el turno, lo que se mueve, el actor en su capa, **ningún NaN ni `undefined` en ningún `d`, `transform` o `points` de la escena ni en el `viewBox` o el estilo de sus capas**, las luciérnagas que descansan, el perro escondido, «Tú» con los brazos arriba, los regalos, al menos tres vecinos, la escena bajo 1000 nodos y la consola limpia. «Pulido integral» suma la cena y las doce (nada corre escondido; todo quieto al deslizar). El 36 mira la cena de Nochebuena en vez de la estampa de antes. El bloque comprueba también que el perro escondido existe en sus cuatro turnos y que a 768 px los de la cumbre levantan los brazos a las doce (estas dos comprobaciones y el tendedero en el corredor llegaron después de la corrida completa: se volvieron a correr los bloques 39 y 41, `test_lib` y el banco rápido, no la suite entera).
- Capturas de cada turno a 320, 390, 768, 844×390, 1440 y 2560 px, en oscuro y claro, con «todos», «esenciales» y «ninguno» (en el informe del campamento).
- **Verificación completa en local** (24 nov 2026, el commit del 41 en su propio worktree, de una en una; sin CI): `test_ui` entero en sus tres partes (674 + 737 + 1011 comprobaciones, 70 bloques), axe (336 estados, sin violaciones), barrido `rapido` (112) y por pestañas (448), en orden; Lighthouse móvil A/B en el mismo momento: la app, mediana **71** (72 · 66 · 71) frente a **67** (63 · 67 · 70) en `main` (el sandbox iba cargado: `main` quedó bajo 70); la entrada, 92 y 93. El banco en verde con las fechas nuevas declaradas. Regresión visual contra `main`: 14 de 15 iguales; la otra (1.58 %) es la escena corrida dos píxeles según la carga, como en el 39. `test_lib` 992, `test_api` 1314 (con el disco simulado sano), tsc, Biome, ruff, mypy y recorte, en verde. «Qué hay de nuevo» cabe entero en 360×640 (con letra muy grande se desplaza, como las entradas de antes).

## Límites conocidos (para Fable o una ronda de arte)
- A 390 px el pueblo es chico: el carrito de los estrenos, los volcancitos y los regalos de la cumbre se leen como manchitas de color; se entiende por el conjunto. En el teléfono va la mesa corta (`mesaCorta`), aunque en la maqueta aprobada la mesa entera cabía a 390.
- A 320 px y con el teléfono acostado (844×390) el pueblo queda bajo «Anotar compra» y el velo del pie, como ya estaba decidido.
- De noche el perro escondido es una silueta oscura bajo el pino (como el perro de siempre de noche).
- Los regalos solo se comprueban contra la silueta de la montaña, los rótulos y «Tú» (con los saldos de `hoy`, `tres`, `mil` y `ballena`, a 390 y 1440 px, no pisan nada); contra el sendero, no hay comprobación (caen bajo los pies de los osos, que ya se sientan a 12 px de él).

## Sin probar aquí
- iPhone real y Safari: «Medir este aparato» la noche del 24 (la cena con su brindis) y a las doce (el pico: cohetes, volcancito y regalos); que el cambio de turno con la app abierta no dé un tirón.
- La tele real en Nochebuena.
- Que a la familia le parezca bien la misa de gallo (es religiosa, como la misa del domingo ya aprobada).
