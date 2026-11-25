# Campamento 47 · Los osos de la cumbre (25 nov 2026)

Ideas 184–190, 24, 26 y 45 del plan («La vida del valle», [39-50-la-vida-del-valle-plan.md](39-50-la-vida-del-valle-plan.md)), con la **129** (el tope de los osos sube de 40 a 46 nodos) y la **229** (los de la cumbre se asoman a mirar lo que pasa abajo), que **cambian una regla** y el dueño aprobó explícitamente el 25 nov 2026. Pedido del dueño: «veo poco movimiento de los osos». Apilado sobre el 49 (rama `claude/vida-47`).

## Lo hecho, por idea
- **24 · Duermen** (22:00–5:00): ojos cerrados (dos medias lunas; un trazo `oso-dormido` por oso, escondido de día) y unas zetas (`oso-zz`, un trazo, junto a la cabeza del grande, del lado donde quepan dentro de la montaña y sin tocar rótulos, «Tú», el eco ni la meta; si no caben, no salen). Pisa a la aurora: de 19 a 22 miran al cielo, desde las 22 duermen. **No duermen** las noches de fiesta (turnos `nb-cena`, `nb-misa`, `nb-doce`, `f31-cena`, `f31-espera`, `f31-doce`, `n25-polvora`, `e1-polvora`) ni durante la fiesta del hito (59).
- **184 · De espaldas al atardecer** (17:30–18:15): el CSS esconde la cara, las manitas y el parche; quedan la cabeza blanca, la bufanda y la cinta. 0 nodos.
- **185 · El oso de nieve de diciembre**: del 1 al 7 una bola, del 8 al 15 dos, del 16 al 23 con orejas, del 24 al 6 de enero con su bufanda roja; el 7 ya no está (`arte-osos.js: etapaOsoNieve`). 2–3 trazos, fuera del grupo de los osos, **solo sobre la nieve**: si a su lado no hay nieve al sol, no sale (con los datos de prueba sale en el teléfono y a 2560; a 768, 1440 y 1920 —la tele— no cabe junto a los osos y no sale).
- **186 · Regalos el 24 y el 25**: ya estaban (campamento 41, `regalosCumbre`).
- **187 · Tres festejos**: con el saltito de siempre (la clase `salta`, la misma duración), según el día de la escena: solo el saltito, el saltito con los brazos arriba (si caben; si no, mirando arriba) o el saltito mirando al cielo (la cara y las manitas suben un poco, en proporción a su caja). Acompaña una acción: también con «esenciales», nunca con «ninguno». Lo usan la compra y el clímax de la fiesta del hito (`montana.js: festejoCumbre`).
- **188 · El brazo arriba en el último tramo**: cuando entre «Tú» y la cima ya no queda ninguna etapa (`lib.ultimoTramo`: la siguiente etapa es la potencia de 10 de la cima, desde 100,000), el grande tiene un brazo levantado (`oso-hola`, un trazo; solo si los brazos caben contra el cielo; no en la entrada ni en la película; se esconde mientras duermen).
- **189 · Sombrero de palma** (marzo y abril, 10:00–15:00): un trazo en el grande, solo si su copa cabe con el saltito (`PUNTAS_SOMBRERO`); nunca con el gorrito de cumpleaños.
- **190 · La banderita** del 13 al 15 de septiembre y **26 · el paraguas** de las tardes de la lluviosa (13:00–18:00): las formas y colores de la interfaz (28), dos trazos cada uno, clavados junto a los osos. Lo plantado (`plantadosCumbre`) va en el primer sitio libre a un lado de los osos, a la altura de sus pies (más abajo empiezan los cerros de delante), dentro de la montaña con 2 px de aire, a 8 px del sendero, fuera de los rótulos, de «Tú», del eco y de la meta; si no cabe, no sale. La banderita (tres días) va antes que el paraguas (toda la lluviosa). Sus cajas se suman a las de los osos: si un rótulo las pisa, ceden con ellos.
- **229 · Se asoman** (regla reabierta): cuando el panadero cruza (`data-mueve="cruza"`), un vecino camina (`.montana[data-camina]`), en la fiesta del hito o en el desfile, el oso que queda del lado del pueblo (`data-mira`: `i` o `d`, calculado al dibujar) baja la mirada hacia allá (la cara se corre en % de su caja) y se inclina 4° (solo si su cabeza sigue dentro de la montaña: si no, `data-sin-inclinar` y solo mira). Solo uno, solo con «todos», ni dormido ni de espaldas. Es una pose a saltos: 0 animaciones, no suma movimiento principal.
- **Gestos a saltos** (propuesta mía, por el «poco movimiento»): de 8:05 a 17:25, a las y cinco de cada diez minutos (`cielo.js: gestoDeLosOsos`), seis segundos: `mira` (el de la 229), `acomoda` (el chico y el del mameluco se recuestan 5° en el grande, si caben) o `estira-1` (el grande se estira). Las horas en punto quedan quietas (las pruebas las usan). Solo con «todos».
- **45 · Uno baja y sube un trecho de nieve**: **fuera**, como decía el plan: necesita su capa propia y una ruta medida contra rótulos, sendero y cielo en cada tamaño. Todo lo de este campamento son poses y gestos a saltos (sin animación continua); un movimiento corrido de los osos exigiría sacarlos a su propio `<svg>` pequeño, el mismo costo que deja fuera la 45.

## El director
`cielo.js: CUMBRE` (duermen, espaldas, sol; cada uno `pesa: { capas: 0, anim: 0 }`) pone `html[data-cumbre]`; `director()` devuelve `cumbre` y el mapa del día la lleva en su clave (la guía la enseña en el almanaque). Los gestos van aparte (`GESTOS_CUMBRE`, `gestoDeLosOsos`) para no partir el mapa cada diez minutos. El banco falla si una pose del mapa no está declarada sin animaciones.

## Medidas (banco `--rapido`, 390×664, mil compras, «esenciales»)
- Osos: **33 → 37** un día cualquiera, **35 → 39** en Navidad, 38 en abril (sombrero); el peor caso posible (Navidad + aurora + gorrito + brazo arriba) sería 41. **Tope 46.**
- Escena: **+4 nodos** en cada fecha (838 → 842 el día normal; 904 → 911 Nochebuena; 985 → 992 la fiesta del hito en el pico de Nochebuena). Diciembre con el oso de nieve: 885. Lo plantado va fuera del grupo de los osos.
- Animaciones: ninguna nueva. La fiesta del hito en la tarde de lluvia y en Nochebuena 23:55 da 1 más a la vista (36 → 37, 48 → 49): es una segunda capa de palmas de la fiesta (`fiesta-palma.fi-p1`) que en esta medida ya estaba en el clímax; no es de los osos (el frente no cambia). Tope de 24 de la pantalla grande sin cambio (16–22).
- Antes y después: `banco-antes.txt` y `banco-despues*.txt` en el scratchpad de la sesión.

## Lo que cambia del campamento 25
- De 22:00 a 5:00 el sueño gana a la aurora: con racha de aurora miran al cielo de 19:00 a 22:00 y después duermen.
- El eco de hace un año es ahora un obstáculo más al sentarlos (antes solo los rótulos y «Tú»): puede cambiar su sitio en algún saldo.
- El grupo de cada oso lleva clases nuevas (`oso-asoma`, `oso-hacia-i|d`); las pruebas leen quién es con `oso-(grande|chico|mameluco)`.

## Decidido por mí
- «Último tramo» (188) = la siguiente etapa es la cima. Usa el saldo de hoy (con una venta puede volver a bajar).
- Los tres festejos (187) sin nodos nuevos: «mirar arriba» corre la cara (con las manitas) hacia arriba en vez de dibujar otra cara.
- La 229 y los gestos son poses a saltos (sin transición), para no repintar el frente en cada fotograma en Safari.
- Los gestos cada diez minutos (no estaban en las ideas): para que se note que están vivos sin sumar animaciones.
- Lo plantado nunca más abajo que los pies de los osos.

## Sin probar aquí
iPhone real, Safari/WebKit, la tele y un monitor real. **Lo más delicado en Safari**: mover la cara con `transform: translate(%)` y `transform-box: fill-box` sobre trazos SVG (mirar al pueblo y el festejo «mirar arriba»); si en el iPhone la cara no se mueve o salta de sitio, es eso. Revisar en el iPhone de día, a las 17:45 y a las 23:00, y en diciembre.
