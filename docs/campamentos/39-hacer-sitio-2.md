# Campamento 39 · Hacer sitio 2

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El presupuesto y cómo medir: [docs/rendimiento.md](../rendimiento.md), «Presupuesto de la escena y el banco» y «Hacer sitio 2». El plan de la ronda: [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md); el texto de cada idea, en `docs/pulido-visual/vida-del-valle/ideas_v4.py` (ids 124–135).

## Lo hecho (24 nov 2026)
Antes de la Navidad entera (41) y del resto de «La vida del valle», sitio en la escena **sin cambiar lo que se ve**, y un banco que mide lo que faltaba. El dueño lo aprobó todo; de las ideas del 39 entran las que el v4 marcaba «sí» (124–128, 131 y 135), que son exactamente las de la tabla de ahorros. **129, 130, 132, 133 y 134 siguen «después»**: no hacen falta (el texto de la 134 lo desaconseja) y cuatro de ellas cambian una regla.

- **Las estrellas en cinco trazos** (126): las 46 eran 46 círculos; ahora son cinco trazos, uno por ritmo (`.estrella.t0` quieta y `t1`–`t4`, que ya titilaban cada grupo a la vez), con el mismo `rnd()` en el mismo orden. 41 nodos menos y 32 animaciones menos cada noche (la capa del cielo, de 42 a 10). Son cinco y no cuatro: juntar las diez quietas con un ritmo las haría titilar.
- **Las luciérnagas, más livianas** (127): cada una era un grupo con dos grupos dentro (la estela y la luz con su halo: 6 nodos y 4 animaciones). Ahora es su grupo (el brillo, `lu-brilla`) y un círculo que vuela (`lu-a/b/c`) con la luz y el halo en un degradado (`#m-lu`: la luz hasta 1.35 de 7 y el halo de `#m-luz` a 0.6). **La estela no se veía**: su retraso (`.lu-cola { animation-delay }`) perdía ante el `animation:` de la regla de efectos, más específica, así que volaba a la par, debajo de la luz. De 73 nodos a 30 (con el degradado) y de 4 a 2 animaciones por luciérnaga: el dibujo grande de noche, de 41 a 25 (la lluviosa, de 55 a 31; su tope es 56).
- **El reloj de sol y la luna en menos trazos** (128): las once piedritas, en dos trazos (las diez iguales y la de las 12, algo más viva: otra opacidad); los siete mares de la luna, en uno (el grupo ya tenía la opacidad). 15 nodos menos.
- **Los cohetes, solo en su hora** (125, **cambia una regla**): se dibujaban todo el 24, 25, 31 y 1 (35 nodos) y se veían de 23:50 a 0:30. Ahora su grupo (`g.cohetes`) va vacío y, a las 23:40 y a las 0:40, `cielo.js` (`cohetesPuestos`) dispara `libro:cohetes` y `montana.js` pone o quita lo de dentro de cada escena viva, con las medidas que el grupo guarda (`data-cw`, `data-cs`, `data-ck`, `data-ca`). Entran diez minutos antes de que se vean, en un momento quieto; al dibujar la escena (también en el redibujo de medianoche) ya salen como toca a esa hora.
- **El banco mide lo que faltaba** (124): suma el pico del año (Nochebuena y el 31 a las 23:55, con los cohetes), fija los datos del escenario a un día (`FECHA_PRUEBA=2026-11-20`) y cada fecha declara lo que pesa (`declara`; falla si pasa por más de 6 nodos). Una fecha nueva del calendario se añade ahí con lo suyo.
- **Un tope para pantallas anchas** (131): la escena a 1440×900 y a 2560×1440 (Nochebuena y el 31 a las 23:55), tope **1100** como el teléfono. Lo «solo ancho» no se dibuja debajo de 1100 px.
- **El almanaque en la guía** (135): en `/guia` (solo el admin), «Almanaque del valle»: quince fechas (un día de entre semana, sábado, domingo, la lluviosa, zompopos, la Cruz, agostinas, el 15 de septiembre, octubre, el 1 de diciembre, el 24, 25, 31, 1 y 6), cada una con sus tramos (cada cambio de turno del pueblo o de lo que se mueve, de cuarto en cuarto de hora: `cielo.js: turno` y `mueve`) y su «Ver», que pone `libro.dia`, `libro.hora` y `libro.almanaque` y abre la montaña. Con esa marca, la barra de aviso dice «Estás viendo otro día: AAAA-MM-DD a las H:MM.» con «Volver a hoy» (quita las tres y recarga). Las pruebas fijan `libro.dia`/`libro.hora` sin la marca: a ellas no les sale.

## Medido (banco, A/B en el mismo sandbox y el mismo momento; 390×664, mil compras, datos del 20 nov 2026)
| Momento | Nodos antes | Nodos después | Animaciones a la vista antes → después |
|---|---|---|---|
| Día normal (25 nov, 12 h) | 926 | **827** | 13 → 13 |
| Noche normal (21 h) | 928 | **829** | 88 → **40** |
| Nochebuena (21 h) | 1030 | **897** | 98 → **50** |
| Tarde de lluvia (10 jul, 15 h) | 920 | **821** | 32 → 32 |
| Noche de lluvia (21 h) | 920 | **821** | 102 → **46** |
| Nochebuena 23:55 (cohetes) | 1030* | **931** | (sin medir) → **62** |
| 31 dic 23:55 (cohetes) | 1002 | **903** | 104 → **56** |
| Nochebuena 21 h, 1440 px | 1089 | **956** | — |
| 31 dic 23:55, 1440 px | 1062 | **963** | — |
| Nochebuena 21 h, 2560 px | 1105 | **972** | — |
| 31 dic 23:55, 2560 px | 1077 | **978** | — |

(*) Antes, los cohetes estaban dibujados todo el día: a las 23:55 pesaba lo mismo que a las 21:00 (el 31 sí se midió A/B con el banco nuevo). El plan contaba «unos 131» nodos menos en Nochebuena a las 21:00 y «unos 96» en el pico: salen **133** y **99** (las luciérnagas ahorran más de lo contado porque la estela sobraba; las estrellas, uno menos: cinco trazos y no cuatro).
- **Hallazgo del banco**: en la hora de los cohetes el frente pasaba su presupuesto (16) ya antes del 39: Nochebuena a las 23:55 lleva **26** animaciones en el frente (14 de los cohetes y las banderitas del papel picado de la fiesta), el 31, 20. No es de este campamento; esos 40 minutos, dos veces al año, el frente admite **28** (escrito en el banco y en `docs/rendimiento.md`). El total (62) queda lejos de 110.
- Crear la escena (CPU 4×, mediana de 3; informa, varía mucho en este sandbox) y fps en reposo: ver la tabla del banco en el informe del campamento; sin empeorar.

## Sin cambio visible (comprobado píxel a píxel)
Capturas de `#montana` en diez momentos (25 nov a las 12 y 21 con «ninguno» y «todos», Nochebuena a las 21, 23:35 y 23:55, julio a las 19 y 21, 1 de enero a las 0:10) a 390×664 y 1440×900, con todas las animaciones paradas en el mismo instante (1.7 s), antes y después, más dos cargas de antes entre sí (el ruido):
- En el teléfono, lo único que cambia es el antialias del borde de las estrellas y de los mares (círculo → subtrazo; diferencias de 6 a 32 en un canal, en píxeles sueltos) y la hora del precio («hace 30 s» / «31 s»). Las luciérnagas, a 3× de aumento, iguales.
- A 1440 px, además, los puntos de luz de la sierra se corren un píxel entre cargas (el parallax): también pasa entre dos cargas de la misma versión (A contra A: hasta 0.144 % de píxeles).

## Decidido (no se vuelve a preguntar)
- **Los cohetes se dibujan solo en su hora** (23:40–0:40 del 24 y del 31): es la segunda excepción a «lo de la hora no se redibuja» (la primera, los vecinos al cambiar de turno). Solo el grupo `.cohetes`, dos veces por noche.
- **Cada fecha nueva declara lo que pesa** en el banco (`CASOS`, `declara`), y **en la hora de los cohetes el frente admite 28** animaciones.
- **Las pantallas anchas tienen su tope** (1100 a 1440 y 2560 px).
- 129, 130, 132, 133 y 134 siguen «después».

## Verificado
- `test_lib` (bloque «Campamento 39»: los cohetes en su hora y un solo aviso al ponerlos y otro al quitarlos, el grupo vacío con sus medidas, doce luciérnagas de dos nodos, el reloj en dos trazos), `test_api` (con el disco simulado sano), `tsc`, Biome, ruff, mypy, recorte.
- Bloque «campamento 39» de `test_ui` (Nochebuena 21:00 en el teléfono: 897 nodos, estrellas, luciérnagas y mares en menos trazos, cohetes sin dibujar, ningún `NaN`; los cohetes entran a las 23:45, siguen tras el redibujo de medianoche y salen a las 0:45; dos animaciones por luciérnaga a la vista, 8 en la seca y 12 en la lluviosa; el almanaque abre Nochebuena con su aviso y «Volver a hoy» lo quita todo). Los bloques que contaban las piedritas del reloj (16A y el pulido del paisaje bajo) cuentan ahora sus subtrazos.
- **Verificación completa en local** (24 nov 2026, el commit del 39 en su propio worktree, de una en una; sin CI): `test_ui` entero en sus tres partes (793 + 749 + 872 comprobaciones, 69 bloques), axe (336 estados, sin violaciones), barrido `rapido` (112 combinaciones) y por pestañas (448), todo en orden; Lighthouse móvil A/B en el mismo momento: la app, mediana **73** (72 · 74 · 73) frente a **71** (68 · 71 · 75) en `main`; la entrada, 97 en las dos; accesibilidad y buenas prácticas, 100. El banco, en verde. Regresión visual contra `main`: 13 de 15 iguales (0.00 %); las otras dos (1.42 % y 0.85–1.58 %, distintas en cada corrida) son la escena entera corrida dos píxeles: «Tú» cae en `y` 568.4 o 566.4 según la carga, también en `main` (el «Hallazgo» de `docs/rendimiento.md`), no este campamento.

## Sin probar aquí
- iPhone real y Safari: «Medir este aparato» de noche (las luciérnagas y las estrellas con su nueva forma) y el 24 o el 31 a las 23:40 con la app abierta (que entren los cohetes sin un tirón).
- La tele real (2560 px) en Nochebuena.
