# Campamento 48 · «Tú» con más gestos (25 nov 2026)

Ideas 191–197, 40 y 41 del plan («La vida del valle», [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md); texto en `docs/pulido-visual/vida-del-valle/ideas_v4.py`), aprobadas por el dueño. La **198** (el chucho) sigue «después». Apilado sobre el 47 (rama `claude/vida-48` sobre `claude/vida-47`). Antes de tocar a «Tú», lee también [31-tu-sube-como-oso.md](31-tu-sube-como-oso.md) y [38b-pulido-integral.md](38b-pulido-integral.md).

## Lo hecho, por idea
Todo son **poses a saltos** (un cambio de clase al empezar y otro al acabar, sin transición), como los gestos de los de la cumbre (47): **0 animaciones nuevas y 0 capas**. Por eso caben en `#m-yo`, dentro del SVG principal: nada cambia en cada fotograma. Todo cabe en la caja de «Tú» (`CAJA_TU`, `.yo-anillo`): los rótulos, los osos de la cumbre y la tele no se enteran. La pisada naranja y el rótulo «Tú» / «Vamos aquí» no cambian.
- **191 · Acampa de noche** (22:00–5:00): una carpita naranja con la puerta abierta y la luz dentro (`.tu-carpa`, tres trazos, fuera del grupo del osito) y su palito clavado al lado. El osito se esconde y **deja de respirar** (38b: nada corre sobre lo escondido). No acampa las noches de fiesta (las mismas que los de la cumbre: el 24 y el 31 espera las doce) ni durante la fiesta del hito.
- **192 · Capote amarillo** (época lluviosa, 14:00–17:45): capucha alrededor de la cara y capa del cuello abajo (un trazo, `tu-lluvia`); la mochila sigue asomando. Fuera de la lluviosa **no se dibuja** (`fueraDeTemporada`).
- **193 · Mira el atardecer** (17:30–18:15): de espaldas, como los de la cumbre a la misma hora (con la 184, los cuatro miran lo mismo; la mejora de la v5 sale sola): sin cara, manitas ni correas, con la mochila al frente (un trazo más).
- **194 · Se estira con los de la cumbre** (7:00–8:00): 1.8 s después de que empiezan ellos, levanta los brazos de festejar hasta los 5.4 s (la clase `estira` en `#m-yo`, desde el mismo reloj de 20 s del campamento 33; no si va subiendo). Solo con «todos».
- **40 · El equipo**: un rollo de cuerda sobre la mochila desde 1M sats y un piolet atado a ella desde 10M. Sale del **saldo más alto alcanzado** (el pico de `satsAcum`): una venta no lo quita.
- **195 · Los parches**: un puntito celeste en la mochila por cada medalla de constancia ganada (`lib.medallas`), **hasta ocho** (dos columnas en lo que asoma de la mochila), en un solo trazo. Nunca se quitan.
- **196 · El día que se anota, descansa**: con su tecomate en la mano (dos trazos) el día que hay una compra con la fecha de hoy; a medianoche la escena se redibuja (`libro:dia`) y ya no está. Una venta o un traslado no lo traen; un día sin compra no enseña nada distinto.
- **197 · El aniversario del primer día**: una flor de maquilishuat en la mochila (un trazo), con la misma regla que la luz de la salida (`lib.aniversario`). La v5 la funde con la 221 (el cumpleaños de la montaña, aún no hecho): cuando se haga, la flor ya está.
- **41 · Se para en cada campamento**: solo cuando sube **por su cuenta al abrir** (`subir(…, sola)`): se queda quieto 0.25 s en cada campamento que cruza (sin bambolearse: la clase `para`, que no quita `anda`) y sigue. **La subida dura lo mismo** (2.4 s): las paradas salen del tiempo de andar, como mucho un 30 %. Al anotar (1.4 s, decisión 3) y en la película no se para.

Lo que lleva (40, 195, 196, 197) sale de `lib.llevaTu(R, hoy, { libro })` y **solo se dibuja si toca** (no hay nada escondido esperando); el eco de hace un año y la película no lo llevan (la película es otro día: sería anacrónico). Las poses por la hora (191–193) van dibujadas siempre (salvo el capote fuera de la lluviosa) y las enseña el CSS: nada se redibuja al cambiar de hora.

## El director
`cielo.js: TU` (carpa, espaldas, capote; cada uno `pesa: { capas: 0, anim: 0 }`) pone `html[data-tu]` (varias a la vez, separadas por espacios: de 17:30 a 17:45 de la lluviosa, `espaldas capote`); `director()` devuelve `tu`, el mapa del día la lleva en su clave y la guía la enseña en el almanaque. El banco falla si una pose de «Tú» del mapa no está declarada sin capas ni animaciones. Mientras «Tú» anda, festeja o se estira, las poses le ceden (el CSS: `#m-yo:not(.anda, .festeja, .estira)`).

## Quien solo mira
El osito sale para todos (es «Vamos aquí» para quien solo mira, campamento 31; la tele entra con la cuenta de una lectora). Las poses por la hora y lo ya alcanzado del libro (equipo, parches, flor) también: la 195 decía que los parches se ven mejor en la tele. **El tecomate (196), que responde a anotar, solo a quien anota**, como «Tú» en la fiesta del hito (59).

## Medidas (banco `--rapido`, 390×664, mil compras, «esenciales»)
MEDIDAS

## Decidido por mí
- Las poses son a saltos y viven en `#m-yo` (no en una capa propia): ninguna se mueve en cada fotograma.
- Varias poses a la vez en `data-tu` (el capote con las demás).
- El tecomate solo para quien anota (ver arriba); el equipo por el pico del saldo; los parches hasta ocho; dentro de la carpa no se ve nada de lo que lleva.
- 194: los brazos de festejar (los mismos que al cruzar una etapa), no unos de estirarse nuevos: caben en su caja.
- 41: solo al abrir y sin alargar la subida (la decisión 3 deja que «Tú» andando por su cuenta vaya más lento, pero abrir rápido importa más).

## Lo que quedó fuera
- **198 · El chucho**: sigue «después» (ensancha la caja de «Tú», que mueve rótulos, osos y la tele en todos los tamaños).
- Las mejoras de la v5 que son de otro campamento (56): el cordel de banderines (269) y las noches distintas de la carpa (272).

## Pruebas
- `test_lib` (+9): las poses por la hora (y la noche del 24), el mapa las declara sin capas ni animaciones, `llevaTu` (el pico, los parches, la flor, el tecomate solo a quien anota y nunca por una venta, y que un día sin compra no cambia nada), sin pedirlo el osito no lleva nada nuevo, ocho parches como mucho y todas las piezas dentro de `CAJA_TU`.
- `test_ui`, bloque «campamento 48» (9 comprobaciones): de día el osito de siempre y todo en su caja; acampa de noche (sin respirar) y cede al andar; no la noche del 24; de espaldas al atardecer; se estira con «todos» y no con «ninguno»; el capote en la lluviosa, sin estilos en línea ni NaN.
- Cambió una prueba vieja: la del campamento 31 contaba `#m-yo` ≤ 24 nodos; ahora ≤ 34 (lo nuevo suma hasta 12).

## Sin probar aquí
iPhone real, Safari/WebKit, la tele y un monitor real. Revisar en el iPhone a las 23:00 (la carpa con su luz), a las 17:45, una tarde de julio (el capote) y a las 7:00 (se estira), y que al abrir las paradas en los campamentos se sientan como pausas y no como tirones.
