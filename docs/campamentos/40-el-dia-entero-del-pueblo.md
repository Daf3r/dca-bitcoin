# Campamento 40 · El día entero del pueblo (ideas 136–148)

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El plan: [39–50 · la vida del valle](39-50-la-vida-del-valle-plan.md); las ideas, en `docs/pulido-visual/vida-del-valle/ideas_v4.py` (136–148) con sus mejoras de `ideas_v5.py`; los personajes nuevos salen de las maquetas aprobadas (`prototipo-vida4.patch`: la tortillera, el osezno con bolsón, la hamaca). Antes: [35](35-pueblo-de-los-osos.md) (los turnos y el reparto), [36](36-calendario-del-pueblo.md), [37](37-el-pueblo-se-mueve.md) (la capa del vecino), [41](41-la-navidad-entera.md) y [51](51-el-director-del-valle.md) (el director).

## Lo hecho (24 nov 2026)
Hasta ahora el pueblo tenía seis momentos al día y todos los días eran iguales. Ahora tiene once, cada día trae otro reparto de los mismos osos, la luz gira con la hora y la descripción cuenta lo que pasa. **Nada se mueve de nuevo**: son turnos (otro reparto de los mismos trazos) y estados que enseña el CSS.

### Turnos nuevos (`cielo.js: turno`)
| Hora | Turno | Quién | Idea |
|---|---|---|---|
| 4:30–5:00 | `alba` | el panadero con su canasto (y el perro detrás); solo los faroles encendidos | 140 |
| 5:00–7:00 | `amanece` | como antes, más la que baja del cantón por el camino real (teléfono y tableta) | 144 |
| 11:30–12:30 | `tortillas` | la tortillera con su comal en la calle (donde de noche va la pupusera) y alguien que espera; sin escuela, oseznos en la plaza | 136 |
| 12:00–12:30 | `salida` (días de escuela) | la tortillera y cuatro oseznos con su bolsón; el perro los espera | 137 |
| 12:30–14:00 | `siesta` | el de la siesta en su hamaca bajo el árbol de la plaza, el perro debajo (en Navidad, en la banca como antes: el pino y el nacimiento ocupan la plaza) | 138 |
| 16:00–17:45 | `vuelta` | la tarde de siempre; la del cantón vuelve a subir (16:00–17:30) | 144 |
| 20:00–22:00 | `fresca` | sillas en la acera, una junto a un farol de la plaza; los oseznos ya adentro | 139 |
- `cielo.js: escuela(f)`: entre semana, fuera de vacaciones (15 nov – 15 ene) y **no el 15 de septiembre** (feriado: sin «salida»).
- La posada de Navidad (y el foco `posada`) acaba a las 20:00; después, la fresca. Es el único cambio en los focos.
- `turno|mueve|foco|ambiente` volcado cada cinco minutos de junio de 2026 a diciembre de 2027, antes y después: **`mueve` y `ambiente`, idénticos**; el turno cambia solo en las franjas nuevas; el foco, solo en Navidad de 20:00 a 22:00 (`posada` → la rutina o la luna).
- **Lo que cambia de lo prometido en el 35**: las ventanas ya no están encendidas toda la noche: de 16:30 a 18:15 y de 22:00 a 5:00 están apagadas (como las de un pueblo que se acuesta), salvo las noches de fiesta de la Navidad entera, que no se apagan. Y la posada de Navidad acaba a las 20:00.
- **Repintados al día**: de unos seis a unos once (en días de escuela: 4:30, 5:00, 7:00, 11:30, 12:00, 12:30, 14:00, 16:00, 17:45, 20:00, 22:00). Cada uno rehace solo `.v-vecinos` y la capa del actor, como siempre.

### La carta del día (141 y 142)
- `arte-vecinos.js: carta(dia, turno, n)`: cada turno de un día cualquiera (amanece, mañana, mañana libre, tortillas/salida, siesta, tarde/vuelta, pupusas/posada, fresca) tiene **dos o tres repartos parecidos** (la vendedora en el atrio o en la plaza platicando con una vecina; la abuela con visita; quién espera las tortillas o las pupusas; quién va junto al farol). Sale **solo de la fecha** (nunca de la cuenta ni de las compras): igual para toda la familia.
- Gira de un día al siguiente: **hoy nunca es ayer**, y con dos o tres cartas tampoco el mismo día de la semana pasada (probado en `test_lib`). Sin fecha (las pruebas de siempre), la carta 0, que es el reparto de antes.
- **Viernes, sábado y domingo, más fila en las pupusas** (142, fundida en la 141): tres más (campesino, vecina y un osezno) del lado de la plaza; si ahí no caben, detrás de los que esperan, y **nunca fuera de la calle** (`lug.borde`): en escritorio la calle acaba junto al sendero.
- La misa, el sábado de plaza, el desfile y las fiestas no barajan: son focos.

### La ropa tendida (143)
- Lunes y jueves, de la mañana a las 16:00 (en la lluviosa, hasta las 12:30: se recoge antes del aguacero). El lunes, sábanas y ropa de colores (el tendedero del 31); el jueves, los uniformes de la escuela (camisas blancas y pantalones oscuros, `tendederoJueves`).
- Va delante de una casa con corredor donde **no tape a nadie**: se prueba cada sitio contra las cajas de los vecinos, el perro y las gallinas; en el teléfono y en el escritorio de un solo corredor no cabe el largo y va **el corto** (`tendederoCorto`, el mismo al 55 %). Si no cabe ninguno, ese día no sale.

### La que baja del cantón (144)
- `montana.js: sitioCanton`: baja por el camino real de 5:30 a 7:00 y vuelve a subir de 16:00 a 17:30. **No camina**: su sitio sale de la hora **al dibujar el turno** (cada vez que se abre, un poco más allá) y se queda quieta hasta el turno siguiente. 0 animaciones.
- Guarda 13 px del sendero (pies, cintura y cabeza), no se mete en el conacaste y **no se para sobre los tejados** (donde el camino sale de la plaza pasa por detrás del pueblo); si no hay sitio, más abajo o no sale.
- Solo donde hay camino real (teléfono y tableta); en escritorio y acostado la calle ya lleva a la salida y el camino no se dibuja: ahí no sale.

### El perro tiene su día (145)
- En `PERRO_TURNOS` (alba, amanece, mañana, tortillas, salida, siesta, pupusas, posada y fresca) el perro va dibujado **con los vecinos**: detrás del panadero, junto a quien espera las tortillas, esperando a los oseznos a la salida, **bajo la hamaca**, junto a la pupusera o a las sillas de la fresca. El de siempre (`.v-animal`) y su sombra (ahora un trazo propio, `.v-sombra-perro`: +1 nodo) se esconden con el CSS esos turnos.
- Se pone el último, donde no le quede nadie encima; si no cabe, en su sitio de siempre (dibujado igual). De tarde sigue en su esquina: es adonde llega al cruzar la plaza (34).

### Las sombras siguen al sol (146)
- `cielo.js: sombraDelPueblo` → `html[data-sombra]`: `larga` (5:00–7:00 y 16:00–17:45), `corta` (11:30–14:00) y, el resto, como siempre. Coinciden con cambios de turno: no añaden repintados.
- Solo CSS sobre los dos trazos de sombra que ya existían (`.v-sombra` de la fila de delante y `.v-sombra-atras` de la terraza): `skewX` y `scaleY` desde su base (`--v-suelo`, `--v-suelo-atras` y `--v-sol`, que pone `montana.js` en el anfitrión). No es una animación. No son las «sombras de nube» descartadas: es la sombra propia de casas, iglesia, árboles y faroles.

### Las luces una a una (147)
- `cielo.js: lucesDelPueblo(f, h)` → `html[data-luces]`: los ratos de fiesta de la Navidad entera (la misa de gallo, la espera, las doce) no se apagan; de 16:30 a 17:45 ninguna (antes se encendía todo a las 16:30); a las 17:45 los faroles, a las 18:00 la iglesia, a las 18:15 las ventanas; a las 22:00 se apagan las ventanas, a las 23:00 la iglesia; los faroles, toda la noche (de 4:30 a 5:00, solo ellos). Solo el pueblo (el cantón y la sierra, como siempre). Tres cambios de color al día fuera de los turnos (18:00, 18:15 y 23:00), sin redibujar nada.
- Las ventanas siguen siendo una por persona y se encienden y apagan **todas a la vez**: separarlas pedía más trazos y el orden diría de quién es cada una.

### La descripción cuenta el turno (148)
- `lib.FRASE_TURNO` y `textoValle({ …, turno })`: una frase por turno de un día cualquiera («En el pueblo es hora de pupusas.», «En el pueblo, los vecinos sacan su silla a la acera a tomar el fresco.»), sin tutear ni mandar; los turnos de fiesta no llevan (ya los cuenta su foco). Se suma a la del foco o la rutina (51).
- Se rehace con el turno (`libro:turno` vuelve a escribir `#m-desc`).

### Pedido del dueño: nadie bajo el árbol del primer día
- **Qué era**: el conacaste del primer día (`arbolPrimerDia`) va en el pie de la escena y se pinta **después** del pueblo. En escritorio queda al final de la calle, y el reparto no lo conocía: quien caía en su sitio quedaba con el tronco cruzándole el cuerpo. Pasaba ya en `main` (a 1440 px: la posada de Navidad, los tamales del 24, el paseo y la fresca del 25, la fresca del 1 de enero) y con la fila del viernes de este campamento (la captura del dueño).
- **Arreglo**: `arte-valle.js: cajasArbol` da las cajas del tronco y de la copa con las mismas medidas del dibujo y `montana.js: conArbol` las suma a lo ocupado del pueblo: el reparto aparta (3 o 6 unidades) a quien caería ahí, o no lo pone. La forma de la montaña y `rnd()` no se tocan; el árbol no se movió.
- **Qué más se buscó**: vecinos contra todo lo que se pinta **después** de ellos: el tronco y la copa del árbol, las torres y el cable del teleférico y su cabina, el perro y las gallinas de siempre, el aro de la salida del sendero, «Tú» (`.yo-anillo`) y los rótulos; con «todos», a 320, 390, 768, 1440 y 2560 px, en 43 momentos (cada turno nuevo, viernes y sábado, fines de semana, Navidad del 10, 24, 25, 31, 1 y 6, el 15 de septiembre, la lluviosa), con un año de compras, con varios (árbol más grande), con poco saldo (`hoy`) y con mucho (`ballena`): **antes, 13 choques (todos con el árbol, a 1440 px); después, 0**. Las casas, la iglesia, los faroles y el árbol de la plaza se pintan **antes** que los vecinos (quedan detrás, como debe ser): no pueden quedar encima.
- **Lo que mueve el arreglo**: quien caía bajo el árbol da unos pasos a un lado y, si no cabe, no sale. Los oseznos no se apartan (como siempre): el que iba junto a quien se apartó puede quedarse sin sitio. Ejemplo (1440 px, miércoles 19:00): la vecina que espera las pupusas pasa al otro lado del árbol y su osezno no sale (de 5 vecinos a 4). Antes y después: `cap/1440-pupusas-vie.png` (antes, la captura del dueño) y `cap/1440-pupusas-vie-arbol-despues.png`, `cap/1440-posada-arbol-despues.png`.
- Además, **quien se aparta no se sale de la calle** (`lug.borde`): en escritorio la calle acaba junto al sendero, y un paso de 6 unidades podía llevar a alguien hasta su arranque.
- **La prueba**: el bloque «campamento 40» de `test_ui` mira, en cada momento y en cinco anchos, que nada pintado después de los vecinos les quede encima.

## Medido (banco, 390×664, mil compras, «esenciales»; antes = `origin/main` con los casos nuevos)
| Momento | Turno | Nodos escena antes → después | Valle | Animaciones a la vista («todos») |
|---|---|---|---|---|
| 10 feb 2027, 4:45 | alba | 812 → **820** | 179 → 187 | 38 → 38 |
| 10 feb, 11:45 | tortillas | 821 → 824 | 188 → 191 | 13 → 13 |
| 10 feb, 12:15 | salida | 821 → 824 | 188 → 191 | 13 → 13 |
| 10 feb, 13:00 | siesta (hamaca) | 821 → 821 | 188 → 188 | 13 → 13 |
| 10 feb, 16:45 | vuelta | 823 → 824 | 189 → 190 | 16 → 16 |
| 10 feb, 21:00 | fresca | 823 → 822 | 190 → 189 | 38 → 38 |
| lunes 8 feb, 9:00 | mañana + ropa tendida | 829 → 831 | 195 → 197 | 16 → 16 |
| viernes 12 feb, 19:00 | pupusas (fila) | 823 → 825 | 190 → 192 | 39 → 39 |
| Día normal (25 nov, 12:00) | | 830 → 833 | 197 → 200 | 15 → 15 |
| Nochebuena, cohetes (el pico) | | 941 → **942** | 225 → 226 | 47 → 47 |
| Pantallas anchas (1440 y 2560) | | 961–983 → 962–984 | | — |
- Tope 1100 (y 300 el valle, 40 los osos) en todos. **Ninguna animación nueva** en ninguna capa ni franja; el director y el mapa del día, sin cambios (`mueve` y `ambiente` idénticos).
- +1 en todas las fechas: la sombra del perro en su trazo propio. El resto, los tonos de los vecinos que ese reparto usa (el alba pasa de nadie a dos: +8).
- Crear la escena (CPU 4×): 23–49 ms (antes 33–49); fotogramas en reposo: 56.5–60 (antes 58–60). Ruido del sandbox (corría a la vez que `test_ui`); informa, no falla.
- Cada `declara` del banco sube 1; las fechas nuevas declaran lo medido.

## Decidido por el dueño
- Aprobó las trece ideas (136–148); lo que cambiaba una regla no se hizo (ver abajo).

## Propuesto por quien implementa (lo revisa el dueño)
- Las horas exactas: la salida a las 12:00–12:30, la siesta desde las 12:30, la vuelta desde las 16:00, la fresca de 20:00 a 22:00 y la posada hasta las 20:00.
- El 15 de septiembre no hay salida de la escuela (es feriado).
- La ropa se recoge en la lluviosa al empezar la siesta (12:30), no «a la una»: la hora la marca un cambio de turno.
- En Navidad no se cuelga la hamaca (el pino y el nacimiento ocupan la plaza).
- Las luces: el orden y las horas de arriba; las ventanas, todas juntas.
- Las sombras: cuánto se estiran (1.7 y 0.55) y se tuercen (38° y 18°).
- La fila del fin de semana, del lado de la plaza.
- El perro, en qué turnos y junto a quién.
- Las frases de la descripción (tono para revisar con la familia).

## Lo que quedó fuera (y por qué)
- **Las mejoras de `ideas_v5.py` que dependen de ideas posteriores**: la luz del horno del panadero (140 → 231), los tres mazos «quién, dónde y con quién» elegidos por el director con su regla de no repetir (141 → 223/227: aquí la carta del día cumple «nunca como ayer» por su cuenta), los manteles después de una fiesta y los pañales (143 → 241), «el día del primer aguacero se queda a medias» (143 → 265), el perro que duerme donde hubo fiesta (145 → 255) y las luces detrás del sacristán (147 → 234).
- **Apagar las ventanas una a una**: dos trazos más y el orden diría de quién es cada una; se apagan juntas a las 22:00.
- **La que baja del cantón en escritorio**: allí el camino real no se dibuja (pulido del paisaje bajo).
- **Los turnos nuevos no son focos del director**: no traen movimiento ni rareza (son la rutina); `mueve` y los ambientales no cambian. El mapa del día los recoge solo (cambia su clave).
- Nada que cambie una regla del CLAUDE.md: ningún tope subió, ninguna animación nueva.

## Verificado
En local (24–25 nov 2026), sin CI; registros y capturas en `scratchpad/c40/` de la sesión.
- `test_lib` **1019** (bloque «campamento 40»: la escuela, las sombras y las luces por hora, la carta del día que nunca repite ayer ni la semana pasada, cada turno × carta × seis tamaños × la luz de cada lado: ocho como mucho, sin NaN, el actor de siempre y nadie encima del perro ni de la ropa; la ropa solo lunes y jueves; la fila del fin de semana; la del cantón; la hamaca salvo en Navidad; las frases sin tutear; las noches de fiesta no apagan las luces). Cambiaron las pruebas viejas de los turnos de un miércoles, el barrido de un año (con `alba`, de 4:30 a 5:00 solo el panadero) y los del calendario (a las 12:00 del sábado y del 15 de septiembre, la tortillera).
- `test_api` **1314** (con el disco simulado sano), `tsc`, Biome (0 avisos), recorte, ruff y mypy (los del CI): en verde.
- `test_ui`, **solo los bloques que toca el cambio** (no la suite entera ni sus seis partes: las corre el CI del PR): «campamento 40» (37, nuevo: 15 momentos a 390 y 1440 px; la descripción al cambiar de turno; 43 momentos con «todos» en cinco anchos sin nada encima de nadie; el perro que cruza aunque la página se abra en la siesta), 22 (27), 22B (36), 22C (21), 23 (52), 25 (103), pulido del pueblo (4), pulido de la iglesia (6), 34 (10), 35 (15), 36 (10), 37 (10), 38 (3), pulido integral (20), 39 (7), 41 (5), 39b (8), 51 (19), mil compras (53), identidad (15) y «Tu historia, medallas y qué hay de nuevo» (16): en verde.
- axe: **346** estados, sin violaciones. **No se corrieron aquí**: `test_ui` entero (en sus partes), los barridos (`rapido` y por pestañas), Lighthouse A/B y la regresión visual: los corre el CI del PR.
- El banco entero, antes y después: en verde (tabla arriba).
- «Nada encima» (script aparte, `scratchpad/c40/encima.mjs`): 215 momentos (43 × 5 anchos) con cada escenario (`anio`, `largo`, `hoy`, `ballena`): 0 choques (antes del arreglo, 13 con `anio`).
- Después de los arreglos de la revisión se repitieron `test_lib`, `test_api`, `tsc`, Biome, recorte, el bloque 40, los bloques 22C, 34–38, 41, 51 y «pulido integral», y el banco.
- Capturas (`scratchpad/c40/cap/`): los turnos nuevos a 390, 768 y 1440 px; 320 y 2560 (salida, fresca, tortillas con la ropa del lunes), 844×390 (el pueblo bajo el velo, como estaba decidido), en oscuro y claro, con «todos», y a 1440 con «esenciales» y «ninguno»; las cuatro luces (17:00 ninguna, 17:54 faroles, 18:06 iglesia, 22:30); la del cantón en el camino a 390 px; el antes/después del árbol. «Qué hay de nuevo» (`2026-12-n`) cabe entero en 360×640.

## Sin probar aquí
- iPhone real y Safari: los once repintados al día (antes seis), las sombras torcidas con `transform` en el dibujo grande (un repintado al cambiar de franja) y «Medir este aparato» a mediodía y en la fresca.
- La tele real (2560 px).
- Que a la familia le parezcan bien las horas, la ropa del jueves, la hamaca y las frases.
