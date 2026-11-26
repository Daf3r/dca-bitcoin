# Campamento 53C · Historias de varios días

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Es el **53 de «La vida del valle»** (plan v5): los documentos `53a-neblina.md` y `53b-neblina-2.md` son otro trabajo que usó el mismo número (la neblina). Antes: [51](51-el-director-del-valle.md) (el director: un foco por vez), [52](52-vecinos-con-oficio.md) (los vecinos con oficio), [42](42-las-fiestas-del-ano.md) y [43](43-temporadas-del-pueblo.md) (el mismo patrón: turnos de los mismos osos, una línea de `COSTUMBRES` por cosa), [38b](38b-pulido-integral.md) y [30](30-hacer-sitio.md) (nada se mueve sobre lo escondido; lo de otra temporada no se dibuja). El plan: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md). Las ideas, en `docs/pulido-visual/vida-del-valle/ideas_v5.py` (ids 239–248) y los personajes, de las maquetas aprobadas en `prototipo-vida5.patch` (`s-ramada`, `s-bebe`, `s-globo`, `s-circo`).

## Lo hecho (26 nov 2026)
Cosas que **empiezan un día y terminan otro**. Todo sale de la fecha: igual en todos los aparatos, no avanza «si entras», no guarda nada en el aparato y **no lee los cumpleaños ni nada de la familia**. Cada capítulo es otro reparto de los mismos osos y de los mismos trazos (lo que levanta una historia va en los tonos de los vecinos): **todo quieto**, ningún actor ni animación nueva.

### 239 · El motor de las historias
- `cielo.js: HISTORIAS` (una línea por historia: su costumbre, sus capítulos —uno por día—, cuándo empieza cada vez en un año, si ocupa la plaza y su frase) y `calendarioHistorias(anio)` (memorizado por año).
- **Reglas**: una historia a la vez; **ninguna en semana de fiesta**; entre una y otra **al menos cinco días tranquilos**. Si la fecha pedida incumple una regla, va **una semana después** (o antes, o dos); si no cabe, ese año no sale. `test_lib` recorre de 2027 a 2100: **todas salen cada año**, sin pasar ninguna regla.
- **Desde 2027** (`HISTORIAS_DESDE`): las fechas ya vividas (y las del banco y las pruebas de 2026) no cambian.
- `historiaDelDia(f)` (el capítulo de hoy) y `historiaAhora(f, h)` (lo que pide el reparto a esa hora: la función del circo al anochecer, el aserrín hasta las 11:30). Los cambios dentro del día caen siempre en un cambio de turno (17:45, 20:00, 11:30), así que los trae `libro:turno`; los de un día a otro, `libro:dia`.
- **El foco** `historia` (rareza «año», en el director del 51, después de las fiestas y antes de las temporadas), de 6:00 a 20:00, y **la frase de la línea de hoy, solo el primer día** (sin «tú» ni verbos de mandar). Choques declarados: con los zompopos, los azacuanes (el mural de octubre), las temporadas (la ramada del sábado de atolada, el osezno en los mangos) y la luna llena (19:00–20:00): manda la historia y los azacuanes vuelan igual.
- **Ocho al año** (la idea decía «unas diez o doce»: el cayuco nuevo y el nido del torogoz esperan su arte; con ellos serían diez).

### Las historias
| Idea | Cuándo (desde 2027) | Capítulos | Dónde |
|---|---|---|---|
| 244 · Llega el circo | del 8 al 12 de enero (vacaciones, pasada la Navidad) | la lona tendida y el oso en zancos · la carpa a rayas, con el malabarista · días 3 y 4, la función de 17:45 a 20:00 (vecinos con oseznos en hombros) · se fueron: el redondel de aserrín hasta las 11:30, con la que barre | la plaza (la ocupa) |
| 243 · La casa que se pinta | lunes a miércoles de la primera semana de febrero | la escalera · media pared del color nuevo (+1 trazo ese día) · entera, y dos vecinos la miran | una casa del frente distinta cada año (`CASAS_PINTADAS`) |
| 241 · Nace un osezno | lunes a miércoles de la segunda semana de marzo | el tendedero de pañales · la visita (la olla, las flores y el huacal) · la vecina sale al corredor con el osezno en brazos y medio pueblo se asoma; **desde entonces, una tarde de cada tres** (14:00–17:45) hasta fin de año, sale con él (de fondo: `conElOsezno`) | una casa del pueblo; **nunca en la entrada ni en la cumbre** |
| 240 · La ramada de la atolada | de jueves a domingo, dos veces: antes del 2.º sábado de julio y del 3.º de agosto | los cuatro horcones (y las palmas apiladas) · el techo, y uno lo termina desde su escalera · el sábado con banderines y, de 16:00 a 17:45, la atolada debajo · los horcones solos (el lunes, nada) | la plaza (la ocupa) |
| 242 · El globo que se escapa | de domingo a martes, el 1.er domingo de junio y el 3.º de noviembre | el de los globos en la plaza y un osezno con el suyo, rojo · el globo enredado en el árbol de la plaza y los oseznos mirándolo · **el globo en la cumbre**, atado a una piedrita delante de los osos (el miércoles, ya no está) | la plaza, el árbol y la cumbre |
| 247 · El mural de la escuela | lunes a viernes de la tercera semana de octubre | los oseznos junto a la pared · el sol · el volcán · el torogoz · posan delante con la maestra; el mural se queda hasta el octubre siguiente | la pared lateral de la escuela (la misma casa que piensa el reparto: `arte-pueblo.js: casaEscuela`) |

### 248 · Cada año deja algo
`cielo.js: obrasDelPueblo(f)`: las casas que se pintaron hasta hoy (se acumulan: el pueblo del tercer año no es el del primero) y el mural. `arte-pueblo.js: pueblo(…, { obras })` lo dibuja (el color con `colorCasa`, solo en la fila del frente). **Tope escrito: 12 nodos** (`PESO_OBRAS`): el mural, 3 trazos; los colores de las casas, a lo sumo 4 trazos más que el pueblo de siempre (los colores son cinco). Lo vigilan `test_lib` (seis tamaños, las dos luces, de 2027 a 2045) y el banco (un miércoles de 2040: como mucho el día normal + 12).

### Lo que levanta una historia ocupa su sitio
El pueblo va en **un trazo por tono**: si algo se pone delante de la carpa, la carpa le pinta encima. Por eso (`arte-vecinos.js`):
- `ESTRUCTURAS` (la lona, la carpa, el aserrín, la ramada, las palmas, los pañales): van las primeras y **ocupan su caja, sin roce**: nadie se pone encima ni delante; las cosas del turno que caerían dentro (la pelota, los charcos) no salen; el perro que no cabe, tampoco. Lo que va aparte (las palmas, los pañales) prueba unos pasos a un lado.
- `alto`: la carpa, la ramada, el de los globos y el de los zancos no suben más de lo que deja el sendero encima de la plaza (`lug.techoPlaza`); si no caben, se encogen un poco (hasta el 70 %).
- `alt`: el malabarista, el de los zancos y los demás de la historia tienen otros sitios (el atrio, la calle) si la plaza está llena.
- **Con la plaza ocupada** (`cielo.js: plazaOcupada`): ni mejenga, ni charcos, ni cuentos (`turno`), ni tecolote en la rama, y la hamaca y la pelota no salen (`mueve`: su franja queda quieta). Las gallinas y el perro que cruza siguen (van por delante, en su capa).
- La olla y el del huacal de la atolada van **debajo** del techo de la ramada a propósito (`libre`).

### Las líneas de `COSTUMBRES`
| Línea | Qué apaga |
|---|---|
| `circo: true` | el circo de enero |
| `casaPintada: true` | la casa que se pinta (y que se quede pintada) |
| `osezno: true` | el osezno de marzo y sus tardes |
| `ramada: true` | la ramada (también con `atolada` en `false`: es su ramada) |
| `globo: true` | el globo, en el pueblo y en la cumbre |
| `mural: true` | el mural |
| `obras: true` | lo que cada año deja (con `false`, solo se ve la obra de esos días) |

Con una línea en `false`, esos días son los de siempre (su foco, su frase, su reparto) **y el calendario de las demás no se mueve** (`test_lib`).

### Dónde vive
`cielo.js` (`HISTORIAS`, `calendarioHistorias`, `historiaDelDia`, `historiaAhora`, `plazaOcupada`, `conElOsezno`, `obrasDelPueblo`, el foco y los choques), `arte-vecinos.js` (los personajes y cosas de la maqueta, `ESTRUCTURAS`, el capítulo en `reparto`), `arte-pueblo.js` (`casaEscuela`, `colorCasa`, `lug.casas`, `lug.escuela`, `lug.techoPlaza`; la media pared y el mural en `pueblo`), `montana.js` (las opciones del reparto, `entrada`, `globoCumbre`, `fueraDeTemporada`: `.c-globo`) y `styles.css` (el mural y el globo).

«Qué hay de nuevo»: `2026-12-zd` (cuatro frases; resume también `2026-12-zc`).

## Decidido (este campamento; no se vuelve a preguntar)
- **«La semana de fiesta»** es el día de fiesta y uno a cada lado, más la Navidad entera (1 dic – 6 ene) y Semana Santa entera (de Ramos a Pascua). Una semana de calendario no puede ser: la idea del circo lo pone el 8 de enero, dos días después del 6. Las fiestas cuentan **estén o no encendidas sus costumbres**.
- **El osezno, la segunda semana de marzo** (la primera chocaba con la frase de los mangos del 1 de marzo: el 1 de marzo de 2027 es lunes).
- **Desde 2027**: las fechas de 2026 (las del banco y las pruebas) se quedan como estaban.
- **Todo quieto**: el malabarista hace malabares quieto (la pose de la maqueta); ninguna historia trae un actor a `data-mueve`. Si un día se quiere que se mueva, sería el actor de su franja (226).
- **El globo en la cumbre** lo dibujó Opus (no venía en el parche): la piedrita con su hilo, el globo rojo y su brillo, **delante de los osos** (de delante hacia los lados, siempre dentro de la nieve con aire; primero sin tapar a ningún oso). Ese día no se planta nada más (ni el paraguas de la lluviosa).
- **El mural** se dejó en lo mínimo que dice la idea («tres manchas de color y nada más»): un óvalo de sol, un volcán y un torogoz en su pared lateral, tres trazos. Para pulir por Fable (ver [65](65-arte-para-fable.md)).
- **La media pared** es la mitad del frente que no da al hastial; el color nuevo, un paso de la paleta del pueblo (cal, añil, ocre, rosa, menta) que cambia cada año.
- **La casa que se pinta cada año** sigue `CASAS_PINTADAS` (1, 3, 0, 2, 5, 4, 6): la primera es una de las que se ven en el teléfono.

## Lo que queda para después o para Fable (y por qué)
- **245 · El cayuco nuevo**: exige el presupuesto de pantallas anchas (131) y resolver antes la incoherencia del cayuco del 51 (el pescador está en el pueblo desde las 9:00 y el cayuco sigue con él dentro: `39-50-para-fable-y-decisiones.md`). No se tocó. Su arte, en [65](65-arte-para-fable.md).
- **246 · El nido del torogoz**: depende del torogoz posado (177), que es de Fable; que anida en túneles de los paredones y cría de marzo a junio es **de oídas: por confirmar con el dueño**.
- **Arte que falta** (en [65](65-arte-para-fable.md)): los botes y las brochas, el mural de verdad, el aserrín, el techo de la ramada (verde, se confunde con la copa a 390 px), el globo de la cumbre (pulirlo) y la banca nueva de la 248.
- **Las mejoras de la v5 que llaman a este motor** y no estaban en el encargo: la milpa por capítulos (154), la gallina echada y los pollitos (176, que además son arte de Fable), el cayuco nuevo como obra que se queda (206).

## Medido
(pendiente: banco antes y después)

## Verificado
(pendiente)

## Sin probar aquí
- iPhone real y Safari: el reparto con la carpa o la ramada (que nadie quede encima), el globo de la cumbre a 390 px con la nieve real del saldo de la familia, el mural en la pared de la escuela.
- La tele de la sala con la función del circo.
