# Pulido de la iglesia y el paisaje bajo

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El pueblo: [22c-valle-de-verdad.md](22c-valle-de-verdad.md), [34b-pulido-del-pueblo.md](34b-pulido-del-pueblo.md) y [35-pueblo-de-los-osos.md](35-pueblo-de-los-osos.md). Va entre el campamento 35 y el 36, como commit propio, por encargo del dueño: «a la iglesia aún le falta mejorar», «cierta parte del paisaje de abajo tiene cositas un poco mal colocadas» y, después, «que quede todo en orden, nada fuera de lugar, con techos y todo bien colocado; que no quede nada feo».

## Pulido de la iglesia y el paisaje bajo (19 nov 2026)
Antes de tocar nada se hizo un barrido de la franja baja de la escena a 390, 768, 1440 y 2560 px, de día y de noche y en temporadas. Las capturas «antes», con lo encontrado marcado, están en el scratchpad de la sesión (`osos/impl/bajo/marcado`, `bajo/antes`). Lo que había, y lo que cambió:

**La iglesia**
- **I1 · Flotaba sobre la calle**: la fachada, la torre y la nave salían de la tierra. Ahora se asienta en su **atrio de piedra**: una plataforma con su piso al frente y una grada en sombra, de la torre al canto de la fachada (`.v-ig-atrio`, `.v-ig-atrio-s`).
- **I2 · Su dibujo era pobre**. Ahora lleva:
  - la fachada con zócalo y cuatro pilastras, en los cantos y a los lados de la puerta (`.v-ig-relieve`, un tono más hondo que la cal; de noche sigue a la fachada encendida);
  - la nave con tres contrafuertes entre sus ventanas y la cumbrera de su tejado;
  - la torre con su basa, una cornisa a media altura y una ventanita que de noche se enciende como las otras.
- Se quedan la torre donde ancla el cable del teleférico, el campanario y la cruz corta.

**Las casas**
- **C1 · Escala**: las puertas medían 4.6 unidades y un vecino oso, 6.7. Ahora la puerta mide 6 × 2.6 y las ventanas van de 3 a 5.6, a la altura de una persona.
- **C2 · El humo salía del tejado sin chimenea**. Las casas con fogón llevan su chimenea de ladrillo: arranca dentro del faldón, cerca de la cumbrera, y asoma por encima de ella. El humo sale de su boca.
- **C3 · Bases sin sombra**: el árbol de la plaza (y el pino en Navidad), el árbol de fuego, los faroles y el perro echado tienen ahora su sombra en el suelo, en el mismo trazo de sombras del pueblo (0 nodos).
- Las piezas de cada casa salen de una función pura, `piezasCasa` (`arte-pueblo.js`), que es la que dibuja y la que comprueba `test_lib`.

**La plaza**
- **P1 · En Navidad el perro quedaba metido en el nacimiento.**
  - El perro se echa ahora en la esquina de la plaza, junto a la grada del atrio. La cruz de mayo sigue a su lado.
  - Las gallinas picotean donde estaba él, al otro lado de los oseznos; en diciembre, junto al portal.
  - El nacimiento no se tocó.
  - Los vecinos osos no se paran sobre el perro, las gallinas ni la cruz (`lugaresPueblo: ocupado`). Un adulto da unos pasos a un lado, o no sale.
- **P2 · El cordón de foquitos (o banderitas) de la torre terminaba en el aire.** Ahora se amarra en el farol del otro lado de la plaza.

**El paisaje de abajo**
- **B1 · La milpa caía detrás o debajo del pueblo.**
  - A 1440 px sus surcos asomaban bajo la calle y parecían una cerca.
  - A 390 px las matas de maíz salían entre las casas de la terraza.
  - A 768 px se cortaba en el borde, pegada a la torre.
  - Ahora `campos` elige un trozo de parcela fuera del pueblo, de la salida del sendero y del lago (mejor delante), o una parcela de atrás que quede entera por encima de los tejados. Si no hay ninguno, en ese tamaño no hay milpa (a 1440 × 900 no cabe). Solo elige: no gasta azar, y los campos se ven igual.
- **B2 · Las piedritas del reloj de sol (campamento 16) caían en la calle del pueblo** en escritorio. El reloj se estrecha para no pisarla (`relojDeSol(…, evitar)`). Si ni así cabe, las de ese lado no se ponen.
- **B3 · En escritorio el camino real pasaba por debajo de la calle** y su cerca asomaba entre las casas. Ahí la calle ya lleva a la salida, así que el camino real no se dibuja. Sus cajas siguen apartando los árboles de honor y el papel picado. En el teléfono, donde baja desde la salida, se queda.
- Lo que el dueño vio como una persona oscura bajo el árbol de la derecha se arregló en el pulido de las casas: era el tronco del árbol de fuego detrás del árbol del primer día.

**Lo que se queda como está (avisado)**
- En el teléfono acostado (844 × 390) y en la parte baja del teléfono, la calle cae dentro del velo fijo del pie de la página, el que deja leer «Anotar» (`body::after`). Ya pasaba antes y está decidido en el 22C («Anotar tapa media plaza»).
- La sombra del gnomon del reloj de sol se queda como la decidió el campamento 16.

**Nodos** (banco, mil compras a 390×664): 924 un día normal, 926 de noche, **1030 en Nochebuena** y 916–918 en la lluviosa. El valle, 187–221 (tope 300). Respecto del 35, cuatro trazos más: el atrio, su grada, el relieve y la chimenea. Queda la milpa en el teléfono.

### Para que no vuelva a pasar
- `test_lib`:
  - las siete casas, en sus cinco tallas y con la luz de cada lado: el tejado cubre su pared y su alero asienta en lo alto de ella; el hastial llega a la cumbrera; la puerta y las ventanas, dentro de la fachada y sin pisarse; la puerta no es mucho más baja que un vecino oso; la chimenea sale del tejado y el humo de la chimenea;
  - la milpa no cae detrás ni debajo del pueblo, y los campos se ven igual;
  - el reloj de sol no pisa la calle.
- Bloque «pulido de la iglesia y el paisaje bajo» de `test_ui`, en la escena de verdad:
  - a 390, 768, 1440 y 2560 px: la iglesia en su atrio; el pie de cada árbol, farol, perro y gallina dentro de la calle o la plaza; ni piedritas del reloj sobre la calle ni milpa sobre el pueblo; una chimenea;
  - en Nochebuena, el perro fuera del nacimiento y los foquitos de la torre amarrados a un farol.

### Verificado
- `test_lib` y Biome.
- Los bloques 12, 16, 22, 22B, 22C, 30, 32, 34, 35, «pulido del pueblo» y «pulido de la iglesia» de `test_ui`, y el banco.
- Revisión final con capturas a 390, 768, 844 acostado, 1440 y 2560 px, de mañana, tarde y noche, en Nochebuena, fiestas patrias, el 3 de mayo y el 2 de noviembre (`osos/impl/bajo/rev`, `rev2`).
- Antes y después, uno sobre otro: `osos/impl/bajo/comparar`.

### Sin probar aquí
- iPhone real y Safari.
