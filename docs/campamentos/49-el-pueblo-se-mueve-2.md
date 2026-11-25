# Campamento 49 · El pueblo se mueve 2 (25 nov 2026)

El dueño veía **poco movimiento de los osos**. Este campamento es la respuesta: cinco gestos nuevos en el pueblo, la ronda, el vecino que camina al cambiar de turno y, en pantallas anchas, dos focos a la vez. Ideas del plan: 116, 199, 200, 25, 201, 118, 204 y 275 (texto en `docs/pulido-visual/vida-del-valle/ideas_pueblo.py`, `ideas_v4.py` e `ideas_v5.py`). Apilado sobre el campamento D (PR #111) y el 59 (PR #110).

## Lo hecho, idea por idea
Todo va en capas pequeñas (un `<svg>` hermano del principal, encima del dibujo grande y debajo del frente). Lo animado es solo `transform` u `opacity`, a saltos o suave. Corre solo con «todos» y en su franja (`cielo.js: mueveRutina`), y se pausa al deslizar. Quieto, se ve igual con cualquier nivel de efectos.

| Idea | Qué | Franja | Dónde |
|---|---|---|---|
| 116 | El panadero cruza la calle en su bicicleta: ida y vuelta, a saltos, una pasada cada 40 s. Va hasta la otra punta, sin pasar por encima de nadie (`arte-vecinos.js: tramoLibre`); si no hay sitio, no se mueve. El torogoz cede una hora (vuela de 5:00 a 6:00). | 6:00–7:00, salvo el lunes (descansa) | `v-actor-cruza`, `vo-cruza` |
| 200 | La tortillera palmea: solo sus manos van a la capa (`tortilleraManos`); el cuerpo, el comal y la brasa se quedan en el dibujo grande (`tortilleraCuerpo`). Dos poses, un cambio cada medio segundo. | 11:30–12:30, salvo el sábado (tamales) | `v-actor-palmea` |
| 25 | La campana de la torre se mece, muda, desde arriba. Su trazo pasa a su capa (`campanaDelPueblo`, +1 nodo: el `<svg>`); la tortillera espera esos minutos. | 12:00–12:05 | `v-capa-campana` |
| 199 | La hamaca de la siesta se mece despacio, a saltos (un vaivén cada 3 s), desde donde cuelga. Los postes se quedan (`hamacaPostes` / `hamacaSola`). | 13:00–14:00, fuera de la Navidad | `v-actor-hamaca` |
| 201 | Las estrellitas de los oseznos titilan: la chispa va a su capa (`estrellita`) y el osezno se queda con su varita (`oseznoLuzSin`). Es un ambiental (`AMBIENTALES`: una capa, una animación de opacidad, ciclo de 12 s). | 24 y 31 de dic., 18:00–1:00 (la cena y los abrazos) | `v-amb-estrellitas` |
| 118 | La ronda. En la mañana de la que barre y en la tarde de la pelota, cuando el actor descansa, la abuela se mece en su taburete. Va en otra capa, con la misma duración y la misma fase: un reloj común, `--fase`, la hora del aparato módulo 3600 s. Por eso nunca se mueven las dos a la vez, aunque una capa se rehaga. | 7:00–8:00 y 15:00–16:30 | `v-ronda` |
| 204 | Al cambiar de turno, un vecino camina a su sitio nuevo en vez de aparecer (abajo). | cada cambio de turno con camino libre | `v-capa-camina` |
| 275 | Dos focos en pantallas anchas (abajo). | 7:00–16:30, desde 1100 px | `data-mueve2` |

**Actores partidos.** En el reparto, un actor puede traer `capaT` (lo que va a su capa) y `quedaT` (lo que se queda en el dibujo grande). Sin capa (la entrada, la película) se dibuja la figura entera de siempre, y la caja de choque es siempre la del tipo entero. Una prueba de `test_lib` comprueba que las dos partes suman la figura.

**Un solo predicado.** `cielo.js: hayActor(f, h, a)` dice si el actor de una franja está en la calle ese rato: el lunes no hay panadero, el sábado hay tamales, en Navidad no hay hamaca y los días de fiesta mandan sus turnos. `test_lib` recorre un año, cada cuarto de hora, y comprueba que el reparto lo trae.

### 204 · el que camina (regla reabierta, aprobada por el dueño el 25 nov 2026)
- `arte-vecinos.js: recorrido(antes, ahora, lug)` es pura. Toma la lista que estaba dibujada (`info.lista`, no un reparto recalculado con la hora nueva, que daría sitios falsos) y la del turno nuevo. Elige al que va más lejos de entre los que siguen en la calle. Tiene que estar de pie al salir; si al llegar se sienta, camina con la figura de antes. El trecho debe ser casi llano: sube o baja como mucho cinco unidades.
- **Comprueba cada paso**: su caja no toca la de nadie del turno nuevo ni lo ocupado (el perro, las gallinas, la cruz, el árbol), ni se sale de la calle. Si el camino entero no está libre, llega andando el último trecho que sí lo está, de al menos tres pasos y tres unidades. Si no hay ninguno, devuelve `null` y el vecino aparece directo.
- `montana.js: caminar` dibuja el grupo sin él y lo pone en su capa. La capa va a saltos, un paso cada 0.4 s (`vo-camina`, `steps(var(--pasos))`). Mientras camina es **el actor principal**: `data-camina` en la escena, y las capas del pueblo esperan en pausa. Al acabar (`animationend`, o un temporizador si la pestaña está oculta), el grupo se vuelve a dibujar con él: es un segundo repintado del grupo `.v-vecinos` dentro de la misma excepción de `libro:turno`. **En el teléfono solo camina si lo que se mueve es del pueblo (y espera) o nada**: con el torogoz, los pericos, las luciérnagas o una bandada de principal, aparece directo, porque serían dos a la vez (`montana.js: puedeCaminar`). En ancho caben dos.
- Se corta (queda en su sitio) si llega otro turno, la fiesta del hito o una escena nueva. Con «esenciales» o «ninguno», con la página oculta o en la película, aparece directo.
- En cinco fechas de prueba y dos tamaños (`test_lib`, 390 y 1440 px), alguien camina en unos 9–10 de cada 45 cambios de turno. Casi siempre es la de la tienda o el panadero; de noche, el pescador a la fresca. El resto aparece directo porque la calle va llena y nadie pasa por encima de nadie.

### 275 · dos focos en pantallas anchas (regla reabierta, aprobada por el dueño el 25 nov 2026)
- `cielo.js: mueve2(f, h)`: mientras el principal es del pueblo (`DEL_PUEBLO`: cruza, barre, gallinas, campana, palmea, hamaca, perro, pelota), de día (7:00–16:30), la cabina del teleférico cruza el valle, lejos de la plaza. La deja `data-mueve2`, y el CSS solo la enseña desde 1100 px (`@media (min-width: 1100px)`). En el teléfono no hay cabina, así que sigue con un principal.
- Esto sustituye la «cabina quieta» de la idea 200: en escritorio, la cabina sigue mientras la tortillera palmea. Nunca hay dos en el pueblo ni dos en el cielo.
- El director lo declara: `director()` trae `mueve2`, y `mapaDelDia(f, true)` suma su capa y cuenta `principales`, que es 1 en el teléfono y hasta 2 en pantalla ancha (`test_lib`).
- **La regla del CLAUDE.md** («Valle») queda así: un principal y hasta tres ambientales; en pantallas de 1100 px o más, hasta dos principales en zonas distintas.

## Decidido por mí (no por el dueño)
- **La campana, de 12:00 a 12:05, y no un minuto.** `aplicar()` corre cada cinco minutos y el mapa del día muestrea de cinco en cinco, así que una franja de un minuto casi nunca se vería.
- **La ronda (118) como secuencia estricta.** El documento de decisiones reabre «uno a la vez» como «un principal + hasta tres ambientales». La ronda no pone dos a la vez: va en secuencia dentro de una franja, con una sola fase común. La pareja es la abuela, que está en su corredor en esas dos franjas.
- **El segundo foco es la cabina**, y no un segundo vecino «al otro lado de la plaza»: es lo que ya existe solo en ancho, en su capa y en otra zona, sin nodos nuevos.
- **El panadero pasa por delante de quien está más atrás** (la abuela en su corredor, el sacristán en el atrio): sus pies están al menos una unidad más arriba en la escena y él va delante, así que la capa encima se ve bien. Nunca pasa por encima de quien está a su altura o más adelante, ni de lo ocupado (el perro, las gallinas, la cruz, el árbol); el tramo se acorta hasta donde está libre. Si no queda tramo, la capa va quieta (`v-actor-quieto`, sin animación) y nunca se voltea en su sitio. Su sitio sale de la hora **al dibujar el turno** (el 52): si la página se abre antes de las 5:30, está en la otra punta, junto al perro, y ese rato no cruza.
- **Amplitudes medidas a 390 px** (con `getAnimations()` y `currentTime`): las manos de la tortillera, unos 2.5 px; la campana, unos 2 px; la hamaca, 1 a 1.5 px (a 1440 px, 1.5 a 2 px); la pelota, 6 a 7 px. La abuela de la ronda es la más sutil: menos de 1 px en el teléfono, aunque se subió de ±2° a ±5°. Se nota en escritorio; en el teléfono es apenas un vaivén, a propósito.
- **Las estrellitas sin `efecto-ambiente`**: la chispa vive solo en su capa y debe verse quieta con «esenciales». Su animación va bajo `data-ambiente~="estrellitas"` y está en la lista de la pausa al deslizar.

## Medidas (banco, `--rapido`, 390×664 con mil compras; antes → después)
Las tablas completas están en el registro: `banco-antes.txt` y `banco-despues.txt`.

| Caso | Nodos (escena) | Animaciones a la vista | Qué se mueve en capas propias |
|---|---|---|---|
| día normal (12:00) | 833 → 838 | 15 → 16 | + la campana (12:00–12:05) |
| amanecer (6:00) | 831 → 839 | 19 → 17 | el panadero que cruza (el torogoz, de 5 a 6) |
| mediodía, tortillas (11:45) | 824 → 829 | 13 → 14 | la tortillera palmea |
| siesta (13:00) | 822 → 827 | 13 → 14 | la hamaca |
| día, pelota (15:30) | 833 → 841 | 16 → 17 | la pelota + la abuela de la ronda (en secuencia) |
| Nochebuena, cena (19:00) | 911 → 914 | 36 → 37 | + las estrellitas (ambiental: humo + estrellitas = 2) |
| Nochebuena, cohetes (23:55) | 942 → 945 | 47 → 48 | + las estrellitas |
| fiesta del hito, Nochebuena 23:55 (el pico) | 982 → 985 | 49 | sin cambios (la fiesta espera a todos) |
| Nochebuena a 1440 / 1920 / 2560 | 968 / 985 / 984 → 969 / 986 / 985 | (solo nodos) | |
| la tele, día / Nochebuena cena (tope 24) | 15 / 21 → 16 / 22 | | + la cabina con el del pueblo |

**Dos focos** (casos nuevos del banco, `DOS_FOCOS`, con «todos»): a 390 px, un principal (la que barre, la campana, la hamaca); a 1440, 1920 y 2560 px, dos (la cabina + el del pueblo), con 16 a 19 animaciones a la vista en toda la escena y como mucho una por capa propia. Ningún tramo del mapa del día pasa de tres ambientales ni de tres animaciones por capa (teléfono y ancho, un año entero). Cada capa nueva cuesta lo suyo: la campana +1 nodo todo el día; la abuela de la ronda +6 en los turnos de la mañana de escuela y de la tarde; las estrellitas +2 a +3 las dos noches. **El pico del año sigue en 985 de 1100.** Las fechas que se pasaban de lo declarado (+6) suben su `declara` (el perro y la pelota a 841, la vuelta del cantón a 832, el lunes de ropa tendida a 839), y las nuevas declaran lo suyo (830, 829 y 827). Los fotogramas con la CPU 4× no se midieron (`--rapido`).

## Lo que quedó fuera y por qué
- **202 · el humo del fogón.** Al mediodía, en pantalla ancha, ya hay tres ambientales de tres (dos humos y el cayuco): no cabe sin quitar otro. En el dibujo grande repintaría la montaña en Safari. Queda «después».
- **203 · el reloj de la torre.** No es movimiento de osos, toca la iglesia (pulida dos veces) y serían dos animaciones todo el día en escritorio y en la tele. En el teléfono mediría 3 px. Queda «después».
- **119 · el pueblo saluda al guardar una compra.** No se hace: rompe «nada depende de si se compró» y el dueño no lo aprobó.

## Sin probar aquí
iPhone real (Safari/WebKit): «Medir este aparato» en las franjas nuevas (6:30, 11:45, 12:02, 13:30, 7:30 y 15:30) y un cambio de turno con alguien caminando. Tampoco un monitor ni una tele de verdad a 1920×1080 o 2560 con los dos focos. El criterio del plan sigue: por debajo de 55 fps en el iPhone, el gesto se quita.
