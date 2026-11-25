# Campamento 51 · El director del valle

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El plan: [39–50 · la vida del valle](39-50-la-vida-del-valle-plan.md) y [las decisiones de diseño](39-50-decisiones-diseno.md) (F3). Las ideas: `docs/pulido-visual/vida-del-valle/ideas_v5.py` (ids 223–229, «51 · El director del valle»); el diseño de F3: sección «F · El tempo» de `docs/pulido-visual/vida-del-valle/diseno-24nov/diseno-celebracion-nodo-miles.html`. Antes: [22](22-valle-vivo.md) y [22B](22b-valle-vivo-parte-2.md) (`data-mueve`), [37](37-el-pueblo-se-mueve.md) (la capa del vecino), [38b](38b-pulido-integral.md) (nada corre escondido), [39](39-hacer-sitio-2.md) (el banco), [39b](39b-el-tempo.md) (el tempo) y [41](41-la-navidad-entera.md) (la franja de fiesta).

## Lo hecho (24 nov 2026)
Con más de doscientas ideas aprobadas, el riesgo ya no es que falte vida sino que se pise. El director es **una sola función, pura, que con la fecha y la hora decide qué se ve**, y la regla «uno a la vez» pasa a ser **un principal y hasta tres ambientales**. Es sobre todo infraestructura: las visitas (55), las historias de varios días (53) y los vecinos con oficio (52) aún no existen; cuando lleguen, cada una es una línea más en su tabla. Lo visible de este campamento es F3 (el humo de día y el cayuco a la deriva) y la línea de hoy en los días raros.

- **El director** (223, `cielo.js: director(f, h)`): devuelve `{ foco, rareza, rutina, turno, mueve, ambiente }`. Vive en `cielo.js` y no en `lib.js` como decía la idea (`lib.focoDelValle`): `cielo.js` es un script clásico que corre antes de pintar y ya tiene `turno` y `mueve`; no puede importar un módulo. Queda en `window.libroCielo` (como el resto del calendario) y en `<html>`: `data-foco` (`navidad`, `desfile`, `cruz`, `zompopos`, `azacuanes`, `posada`, `luna`, `misa`, `mercado` o `rutina-…`) y `data-ambiente` (`humo cayuco`, separados por espacios: el CSS los lee con `~=`).
- **La escalera de rareza** (224, `RAREZA`, `FOCOS`): cada foco se declara en **una línea**: cuándo está (`cuando`, fecha y hora; `delDia`, si ese día lo tiene), su peldaño (`dia`, `semana`, `mes`, `anio`, `anios`), a quién trae que se mueva (`mueve`), lo que pesa (`pesa`: todos, 0 nodos y 0 animaciones: un turno es otro reparto de los mismos trazos) y su frase. El orden de la tabla es el de mando: la fiesta del día (la Navidad entera, el desfile, la Cruz), lo raro de temporada (zompopos, azacuanes, la posada), lo del mes (la luna llena), las costumbres de la semana (la misa, el sábado de plaza) y, si no hay nada, la rutina. **Choques declarados** (`CHOQUES`): la luna llena con la Navidad (el 24 de diciembre de 2026 es luna llena), con una noche de posada o con el Día de la Cruz; manda el primero de la tabla. Una prueba recorre dos años, cada cuarto de hora, y falla con un choque no declarado.
- **El movimiento tiene un solo dueño** (226): `mueve` es ahora «el primer foco de la tabla que está y trae a alguien; si ninguno, la rutina» (`mueveRutina`: las franjas de siempre). La Navidad (`mueveFiesta`, campamento 41), los zompopos y los azacuanes relevan a la rutina; un foco quieto (la misa) no le quita la franja a nadie. **Lo que se mueve no cambió**: `turno|mueve` volcado cada cinco minutos de junio de 2026 a diciembre de 2027, antes y después, idéntico (166,751 líneas).
- **Mañana no es igual que hoy** (227, `rutinaDelDia`): una baraja fija de seis rutinas (la que barre, las gallinas, el pescador, el perro, la pelota, el fogón) que gira cada semana: el día `i` de la semana `w` (desde un lunes) toca `RUTINAS[(i mod 6 + s_w) mod 6]`, con `s_w = (2w + b_w) mod 6` y `b_w` (0 o 1) de una semilla por semana. Sin guardar nada y igual en todos los aparatos: **hoy nunca es ayer ni el mismo día de la semana pasada, y cada semana trae seis distintas** (probado en dos años). La misa, el sábado de plaza y las fiestas no entran en la baraja (son focos).
- **El mapa del día** (225, `mapaDelDia(f, ancho)`): cada tramo (cuando cambia el turno, el foco, lo que se mueve o los ambientales, de cinco en cinco minutos) con lo que pesa en capas pequeñas (`PESO_MUEVE` y la `pesa` de cada ambiental): cuántas capas y cuántas animaciones por capa. Lo enseña la guía (`/guia`, solo el admin: el almanaque del 39 es ahora también el mapa: «foco: …», «ambiente: …», «capas pequeñas: N (hasta M animaciones por capa)», con el ancho de esa pantalla) y lo lee el banco.
- **La línea de hoy puede contar el foco** (228, `fraseDelFoco`, `fraseRutina`): si «lo del día» (campamento 11) no tiene nada que decir, el aviso del día cuenta **solo lo raro**: la fiesta (las cinco fechas de la Navidad, el 15 de septiembre, la Cruz), el **primer** día de los zompopos (15 de mayo) y de los azacuanes (10 de octubre y 1 de abril) y la primera noche de luna llena. Unos 23 días al año. Los días de rutina no hay aviso (lo común es callado); tampoco si se entró desde el almanaque (ya lo dice su aviso). La descripción de la montaña (lectores de pantalla) suma una frase del día: la del foco raro o, si no, la de la rutina («Por la tarde, el perro de la plaza la cruza y se echa en su esquina.»). Ninguna tutea ni manda; nunca en la entrada ni en un aviso push.
- **Los ambientales** (F3, `AMBIENTALES`, `montana.js: ambientalesDelValle`): hasta tres cosas lentas y baratas junto al actor principal, cada una en **su capa pequeña** (un `<svg>` entre el dibujo grande y el frente, como las gallinas), solo transform y opacidad, ciclo de 12 s o más, recorrido de 20 px o menos, sin cruzar la escena. Sus nodos **se mueven** del dibujo grande a la capa (no se copian):
  - **El humo** de la chimenea con fogón (una en el teléfono; hasta dos en pantallas anchas, las que tenga la fila de delante): de **5:00 a 20:00**, no solo a la hora del café y de la cena (antes, 4 h al día). Solo con «todos»; fuera de su hora, la capa entera escondida y la animación sin nombre (no corre, y no pisa los retrasos de cada bocanada).
  - **El cayuco a la deriva** también de día (**5:00–16:30**): se mueve la capa entera (un elemento HTML con `will-change`), no un grupo del dibujo. Lleva la transformación que tenía en el lago (en la seca el agua baja y `.lago-nivel` se encoge) y se ve con cualquier nivel de efectos (quieto con «esenciales» y «ninguno»; de noche, solo su lámpara, como siempre). Al amanecer, además, el pescador rema (dos animaciones en su capa). Está en la lista de la pausa al deslizar.
  - **La ropa tendida o las banderitas**, la otra que proponía Fable: **no entra**: un tendedero de todos los días no está dibujado (el del 31 es del campamento 41) y dibujarlo suma nodos; queda para cuando se dibuje (con el precio, E, que también lo pide).
  - De noche, ninguno.

### El banco (lo que cambió)
- **Cada capa propia cuenta por separado** (antes las sumaba todas en una clave y fallaba por encima de 3 entre todas: con el humo en su capa y el que brinda en la cena ya serían 4). Es lo que ya decía `docs/rendimiento.md`: **3 por capa**. Y un tope nuevo: **como mucho 3 ambientales moviéndose a la vez** (`AMBIENTALES`).
- **Lee el mapa del día**: un año entero, teléfono y pantalla ancha; falla si un tramo declara más de tres ambientales o una capa con más de tres animaciones, y si en un caso medido se mueven más o menos ambientales de los que el mapa declara.
- Casos nuevos (las franjas del día en que hay actor y ambientales a la vez): 7:30, 8:30, 14:30, 15:30 y 19:00 de un día normal. Cada fecha declara +3 nodos.

## Medido (banco, 390×664, mil compras; antes = `claude/vida-tempo` con el banco nuevo)
| Momento | Nodos antes → después | Animaciones a la vista antes → después (por capa) |
|---|---|---|
| Día normal (12:00) | 827 → **830** | 13 → **17** (principal 5 · humo 3 · cayuco 1 · frente 5 · cielo 3) |
| Día, gallinas (8:30) | 827 → 830 | 16 → **20** (tres gallinas de 1, humo 3, cayuco 1) |
| Día, perro (14:30) | 829 → 832 | 14 → 18 |
| Día, pelota (15:30) | 829 → 832 | 14 → 18 |
| Anochecer, fogón (19:00) | 829 → 832 | 41 → 43 (el humo sale del dibujo grande a su capa: principal 26 → 25) |
| Noche normal (21:00) | 829 → 832 | 40 → 40 |
| Nochebuena (21:00) | 899 → **902** | 34 → 34 |
| Tarde de lluvia (15:00) | 821 → 824 | 32 → 36 |
| Nochebuena, cohetes (23:55, el pico) | 938 → **941** | 47 → 47 |
| Nochebuena, cena (19:00) | 907 → 910 | 36 → 38 (el que brinda 1, humo 3) |
| Pantallas anchas (1440 y 2560) | 958–979 → **961–983** | — |

Tope 1100 en todos. Ninguna animación nueva en el dibujo grande. Los fotogramas a 4× y crear la escena: ver «Verificado».

## Decidido por el dueño (no se vuelve a preguntar)
- Se adoptó F del diseño de Fable: **«uno a la vez» pasa a ser un principal más hasta tres ambientales** lentos y baratos (excepción acotada; [decisiones de diseño](39-50-decisiones-diseno.md), «Reglas que se reabren»). La 229 (los de la cumbre se asoman) sigue «después»: cambia el tope de los osos.

## Propuesto por quien implementa (lo revisa el dueño)
- **El director vive en `cielo.js`**, no en `lib.js` (motivo arriba). Sus funciones quedan en `window.libroCielo`.
- **Lo que hoy cambia de verdad con la rutina del día es poco**: `data-foco`, la frase de la descripción y el mapa de la guía. Con el reparto de hoy no hay otra palanca sin dibujar: las seis rutinas pasan todos los días a su hora. Cuando lleguen los vecinos con oficio (52) y las barajas del 40, la rutina del día podrá elegir a quién se ve.
- **Los ambientales**: el humo de 5:00 a 20:00 (no toda la noche) y el cayuco de 5:00 a 16:30 (al atardecer queda quieto, como siempre). **El humo pesa 3 animaciones por chimenea**, no «+3 de día» en total como contaba la hoja de Fable: en pantallas anchas con dos chimeneas son 6, cada una en su capa (dentro del presupuesto de 3 por capa).
- **El humo y el cayuco van encima del dibujo grande** (como las gallinas): comprobado píxel a píxel a 320, 390, 768, 844×390, 1440 y 2560 px, en la seca y en la lluviosa, de día, al amanecer y de noche, con «ninguno» y las animaciones paradas: lo único distinto es el antialias del cayuco (0.001–0.03 % de la pantalla, dentro de su caja); nada del dibujo grande lo tapaba (el tule va en la orilla y los árboles del primer plano no llegan).
- **La línea de hoy, solo en lo raro y el primer día de lo que dura semanas** (los azacuanes son tres semanas: un aviso cada día dejaría de ser raro).
- Frases (unas veinte, no las ochenta que preveía la idea: son las de lo que existe hoy). Revisar el tono con la familia.

## Lo que se dejó fuera (y por qué)
- **229** (los de la cumbre se asoman): «después» (sube el tope de los osos).
- **La ropa tendida de todos los días**: no hay dibujo; suma nodos (ver arriba).
- **Más palancas para la rutina** (quién sale, dónde): son del 40 y del 52. *(Campamento 40: la carta del día, `arte-vecinos.js: carta`, elige entre dos o tres repartos de cada turno; los turnos nuevos no son focos y no cambian `mueve` ni los ambientales.)*
- La línea de hoy **no** sale en la entrada ni en un push, y **no** cuenta la rutina (lo común es callado).

## Lo que puede no verse bien (avisado)
- El cayuco a la deriva de día va y viene 11 px en 26 s, suave (se mueve la capa: no repinta el dibujo); en el teléfono es pequeño. Si al dueño le parece inquieto, se quita del mapa en una línea.
- El humo de mediodía: la misma bocanada del café y de la cena, a la misma hora del sol (el color sigue al cielo).

## Verificado (24 nov 2026, en local, sin CI; el código congelado en `26e1fb2`, después solo documentación)
- `test_lib` **1006** (bloque «Campamento 51»: la tabla y su orden, ningún choque raro sin declarar en dos años cada cuarto de hora, el foco del momento, lo que se mueve igual que antes cada cinco minutos de dos años, la rutina sin repetir ayer ni la semana pasada, las frases sin tutear ni mandar, los ambientales y el mapa de un año), `test_api` **1314** (con el disco simulado sano), `tsc`, Biome (0 avisos), recorte, ruff y mypy (los del CI): en verde.
- `turno|mueve` volcado cada cinco minutos de junio de 2026 a diciembre de 2027, antes y después: **idéntico**.
- `test_ui` **entero en sus tres partes**, una tras otra, tras el último cambio de código: **743 + 854 + 853** comprobaciones (72 bloques), en verde. El bloque nuevo «campamento 51» (19): a 390 y 1440 px el foco, el humo y el cayuco en sus capas fuera del dibujo grande, como mucho tres ambientales y tres animaciones por capa, sin NaN, la pausa al deslizar, el amanecer (el pescador rema), el atardecer (solo humo), la noche (nada), las gallinas con los ambientales al lado, «esenciales» (el cayuco quieto, sin humo), la línea de hoy el 15 de septiembre para el admin y la lectora (sin tutear), ningún aviso un día de rutina, la descripción y el mapa en la guía. Cambiaron tres pruebas viejas: el 22 (de día hay humo con «todos»), el orden de las capas (admite las ambientales) y el 39 (Nochebuena hasta 908 nodos: +3).
- axe: **336** estados, sin violaciones. Barrido `rapido` (**112**) y por pestañas (**448**): en orden.
- **El banco** (entero, con el banco nuevo en las dos ramas): en verde; las cifras, arriba. Fotogramas a 4× en reposo: 57.5–60 (antes 51.5–60); crear la escena 43–84 ms (antes 34–61: ruido del sandbox, que iba cargado con las pruebas; informa, no falla).
- **Lighthouse móvil A/B**, alternando con `claude/vida-tempo` en el mismo momento: la app, medianas **67 · 71** contra **69 · 65**; la entrada, 94–98 contra 96–98; accesibilidad y buenas prácticas, 100. El sandbox iba cargado (las dos ramas bajaron de 70 alguna vez): dentro del ruido; lo que manda es el CI.
- **Regresión visual** contra `claude/vida-tempo`: 12 de 15 iguales; las otras tres (1.42–2.49 %) son la escena entera corrida dos píxeles según la carga (el «Hallazgo» de `docs/rendimiento.md`, como en el 39 y el 41). Además, la escena píxel a píxel con «ninguno» y las animaciones paradas a 320, 390, 768, 844×390, 1440 y 2560 px, cinco momentos: solo el antialias del cayuco (ver «Propuesto»).
- Capturas de la escena a 320, 390, 768, 844×390, 1440 y 2560 px, en claro y oscuro, a mediodía y de noche, con «todos», y a 390 y 1440 con «esenciales» y «ninguno» (`scratchpad/c51/capturas/`). «Qué hay de nuevo» (`2026-12-j`) cabe entero en 360×640 sin desplazar, también con letra grande.

## Sin probar aquí
- **iPhone real y Safari**: «Medir este aparato» de día (con el humo y el cayuco en sus capas, 17 animaciones a la vista en vez de 13) y al deslizar; que la capa del cayuco con `will-change` no pese en el iPhone de verdad.
- La tele real (2560 px): las dos chimeneas.
- Que a la familia le parezcan bien las frases del aviso del día (sobre todo la de la luna llena, que puede salir uno o dos días al mes).
