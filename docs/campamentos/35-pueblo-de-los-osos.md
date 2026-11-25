# Campamento 35 · El Pueblo de los Osos

*(Campamento 59: en la fiesta de un hito salen **hasta nueve** vecinos —los ocho y el del bombo— y la fiesta reacciona a cruzar un hito; el tope de un día cualquiera sigue en ocho. Ver [59](59-la-fiesta-del-hito.md).)*

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El pueblo: [22c-valle-de-verdad.md](22c-valle-de-verdad.md) y [34b-pulido-del-pueblo.md](34b-pulido-del-pueblo.md). Los osos de la familia: [25-osos.md](25-osos.md). Lo que se mueve en el pueblo: [34-el-pueblo-vive.md](34-el-pueblo-vive.md).

## Campamento 35 · El Pueblo de los Osos (ideas 100–107)
Lo pidió el dueño: que los habitantes sean osos. No es un oso de visita entre siluetas: es el pueblo entero. Los de la cumbre son los peluches de la familia; los del valle son los vecinos, con el mismo pelo blanco pero otra talla, otra ropa y otra vida. Parte del prototipo de Fable (`arte-vecinos.prototipo.js`), sin lo que no se aprobó: el de las minutas (se parecía a la carreta), los interruptores de prueba en `localStorage` y el corte de «ocho más cuatro».

- **La talla pueblo** (100, `app/static/arte-vecinos.js`, módulo nuevo de funciones puras):
  - Cada vecino es un oso polar de pie: cabezota redonda, dos orejitas, hocico de palma, nariz oscura y su sombra propia del lado contrario al astro, sin contornos.
  - Mide unas 6.7 unidades del pueblo: unos 15 px en el teléfono y 24 en escritorio. Un osezno, al 62 %.
  - Todo el pueblo sale en **un trazo por tono** (pelo, sombra, tres colores de ropa, palma, pelo de encima, rasgos y la brasa) más su sombra de contacto: 10 a 12 nodos como mucho.
  - Clases `v-vo-…`. Los colores siguen a la hora con las variables del pueblo (`--v-blanco`, `--v-luz`); de noche la luna los deja pálidos, no grises.
  - La ropa no repite la de la familia: verde, rojo teja y maíz.
- **El reparto** (101): el campesino con sombrero de palma, la vendedora con su canasto y su delantal, la vecina y el vecino, la abuela en su taburete del corredor, la que barre, el que se estira al amanecer, el de la siesta con el sombrero en la cara, la pupusera detrás de su plancha, el panadero en bicicleta (de perfil), el osezno, el osezno con el brazo arriba y la pelota.
  - Las siluetas de antes (`.v-gente`, también los seis niños) ya no existen.
  - Los sitios salen de `lugaresPueblo(sit)` (`arte-pueblo.js`): el atrio, dos en cada corredor, la calle (primero junto a las casas sin corredor, después delante de las que lo tienen), los seis de la plaza, la banca bajo el árbol de la plaza y los postes de los faroles.
- **Los turnos** (102, `cielo.js: turno(día, hora)`, junto a `mueve`). El turno queda en `html[data-turno]`:
  - **amanece**, 5:00–7:00: el que se estira, el panadero y la que barre.
  - **mañana**, hasta las 11:30: la vendedora, la abuela, el campesino y la que barre.
  - **siesta**, hasta las 14:00: el de la siesta, la abuela y la vendedora.
  - **tarde**, hasta las 17:45: los oseznos con su pelota, la abuela, la vecina y el campesino.
  - **pupusas**, hasta las 22:00: la pupusera, un vecino y un osezno que esperan, la abuela y la vecina en el atrio.
  - **duerme**: nadie.
  - *(Campamento 40: más turnos: `alba` 4:30–5:00, `tortillas` 11:30, `salida` 12:00–12:30 los días de escuela, la siesta desde las 12:30 y en hamaca, `vuelta` 16:00–17:45 y `fresca` 20:00–22:00; unos once repintados al día. Ver [40](40-el-dia-entero-del-pueblo.md).)*
  - **La manera (A) que aprobó el dueño**: se dibuja solo el turno de ahora. Al cambiar con la página abierta, `cielo.js` avisa (`libro:turno`) y `montana.js` rehace **solo el grupo `.v-vecinos`** de cada escena viva: la de la página, la tele y la película. Es la única excepción a «nada se redibuja al cambiar de hora»: un repintado del dibujo grande unas seis veces al día. El cambio de día sigue con `libro:dia`, que redibuja todo.
- **De noche el pueblo duerme** (103): de 22:00 a 5:00 no hay nadie en la calle. Quedan los faroles, la iglesia y las ventanas encendidas de siempre (una por persona con cuenta, sin cambios). *(Campamento 40: desde las 4:30 sale el panadero, y las luces se encienden y se apagan una a una: las ventanas a las 18:15 y hasta las 22:00, la iglesia de 18:00 a 23:00, los faroles toda la noche.)*
- **Los oseznos** (104): entre semana por la mañana están en la escuela. Salen por la tarde (cinco, con su pelota). El sábado, el domingo y en vacaciones (del 15 de noviembre al 15 de enero) salen desde la mañana (turno «mananaLibre», cuatro).
  - Sus seis sitios van ahora entre la esquina de las gallinas y el perro: antes el último caía encima del perro.
- **La pupusera** (105): de 17:45 a 22:00, detrás de su plancha con la brasa encendida (no sigue a la hora, como las ventanas) y tres pupusas. Su charco de luz cae en la calle como el de las puertas. No hay rótulo ni precio.
- **El panadero** (106): de 5:00 a 7:00, de perfil en su bicicleta con el canasto del pan atrás, quieto en la calle.
- **Cuántos caben** (107):
  - **Ocho como mucho** (`MAX_VECINOS`; la pelota no cuenta). El número sale solo del tamaño de la pantalla: de los sitios que dejan las casas que caben.
  - **Nunca** depende de las cuentas ni de las compras. Las piscuchas, que sí siguen a las personas como desde el 22C, solo cambian qué oseznos alzan el brazo, no cuántos hay.
  - Además, **nadie se monta sobre otro**: en el orden del reparto, quien caería encima de alguien ya puesto no sale (`cajaVecino`).
- **Los hilos de las piscuchas** (octubre y noviembre; las piscuchas no se tocaron, como pidió el dueño):
  - Cuando hay oseznos en la plaza, bajan a la manita alzada de un osezno que mira hacia ellas.
  - Cuando no hay (escuela, siesta, noche), van amarrados al poste del farol más cercano: nunca queda un hilo suelto.
  - Van en el grupo de los vecinos (`hilosPiscuchas`, `arte-valle.js`), con las mismas clases `efecto-ambiente v-piscuchas`, y solo en temporada.
- **Lo que pidió el dueño en la primera captura** (dentro de este campamento):
  - **El perro echado** ahora es de perfil, con la cabeza alzada, el hocico, la oreja, las patas de delante estiradas y la cola, de color canela (`PERRO`, `ANCHO_PERRO`). Oscuro se leía como una mancha. El que cruza la plaza (campamento 34) y la cruz de mayo se ajustan a su nueva medida.
  - **Las gallinas** pasan a la esquina de la plaza, junto al farol. Entre los oseznos parecían coletas.
- **Para después**: la misa del domingo, el padre (aprobado), el sábado de plaza, el desfile, los vecinos ante el nacimiento y las estrellitas son el campamento 36. La que barre y la pelota que se mueven, el 37. El pescador y la descripción, el 38.

**Nodos** (banco, mil compras a 390×664): 920 un día normal, 922 de noche (pupusas), **1026 en Nochebuena** y 912–914 en la lluviosa. El valle, 183–217 (tope 300). Los vecinos son 10 a 12 nodos en el turno más cargado; de noche, ninguno.

### Verificado
- `test_lib` (965):
  - Los turnos de un miércoles, los fines de semana y las vacaciones.
  - Cada cuarto de hora de un año da un turno válido, nadie de noche y escuela solo entre semana fuera de vacaciones.
  - `data-turno` y un solo aviso `libro:turno` al cambiar.
  - En cuatro tamaños, con la luz de cada lado y los siete turnos: ocho figuras como mucho, solo trazos `v-vo-…` (uno por tono y la sombra), sin estilos ni NaN, y las piscuchas no cambian cuántos hay.
  - De noche nadie, la escuela, los cinco oseznos con su pelota, la pupusera con su luz, el panadero, y las manitas alzadas hacia las piscuchas.
  - El presupuesto del valle con los vecinos del turno más cargado.
- Bloque «campamento 35» de `test_ui` (15):
  - A 390 y 1440 px, en los seis turnos de un miércoles de octubre: cuántos vecinos hay, todos dentro de la calle y la plaza, ninguno encima de otro, sin siluetas de antes y solo con sus clases.
  - De la siesta a la tarde con la página abierta, salen los oseznos sin redibujar la escena (el mismo `<svg>`).
  - En noviembre, los hilos a cada osezno de tarde y al poste de noche.
  - La entrada enseña a los vecinos osos.
- Bloques 22, 22B, 22C, 23, 25, 32, 34, «pulido del pueblo», «identidad» y «mil compras» de `test_ui`; `test_api` (el `modulepreload` nuevo en `index.html` y `login.html`), `tsc`, Biome, recorte y el banco.
- Capturas a 390, 768, 1440 y 2560 px en cada turno, de día y de noche, en claro y oscuro, en Nochebuena y con las piscuchas: `osos/impl/cap35` en el scratchpad de la sesión.

### Sin probar aquí
- El blanco de los osos frente a la cal de la iglesia a pleno sol en un iPhone real: se separan por la sombra propia, la ropa y la sombra de contacto.
- Safari: el repintado del dibujo grande al cambiar de turno, unas seis veces al día.
