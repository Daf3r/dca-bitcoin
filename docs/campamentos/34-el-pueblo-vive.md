# Campamento 34 · El pueblo vive

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El presupuesto y el banco: [30-hacer-sitio.md](30-hacer-sitio.md), [docs/rendimiento.md](../rendimiento.md). El pueblo: [22c-valle-de-verdad.md](22c-valle-de-verdad.md); uno a la vez: [22b-valle-vivo-parte-2.md](22b-valle-vivo-parte-2.md).

## Campamento 34 · El pueblo vive (ideas 49, 50 y 51)
*(Campamento 37: las gallinas picotean de 8:00 a 10:00 y el perro cruza de 14:00 a 15:00; de 7:00 a 8:00 barre la vecina y de 15:00 a 16:30 bota la pelota. Ver [37-el-pueblo-se-mueve.md](37-el-pueblo-se-mueve.md).)*

*(Campamento 35: el perro echado es ahora de perfil, con la cabeza alzada y de color canela, y las gallinas van en la esquina de la plaza, lejos de los oseznos; el que cruza y la cruz de mayo se ajustaron a su medida. Ver [35-pueblo-de-los-osos.md](35-pueblo-de-los-osos.md).)*

Los animales quietos de la plaza (el perro echado y las tres gallinas, campamento 22C) se mueven un rato al día, y el 3 de mayo el pueblo pone su cruz. Nada depende de comprar. La misa del domingo (48) queda para después: la absorbe la 108 (Pueblo de los Osos); 52–54, después.

- **Las gallinas picotean** (49): de **7:00 a 10:00**, franja nueva `gallinas` de `data-mueve` (el torogoz, los zompopos y los azacuanes ganan en sus fechas y horas). Cada gallina es **su propia capa pequeña**: un `<svg class="efecto-ambiente v-capa-animal v-capa-gallina">` de 2 nodos con su trazo (el mismo del dibujo, partido por gallina), entre el dibujo grande y el frente, con las coordenadas de la escena en su `viewBox` y su sitio por CSSOM. Cabecea con `rotate` desde sus patas (`steps`, cada una a su ritmo); mientras, las del dibujo grande se esconden (un cambio al empezar la franja y otro al acabarla).
- **El perro cruza la plaza** (50): de **14:00 a 16:30**, franja nueva `perro`. Una silueta del perro de pie, de perfil (cuatro patas, cola y orejas, en las mismas unidades que el echado), llega andando desde cinco largos a la izquierda hasta su sitio de siempre (22 s, `translateX` de su capa) y allí se cambia por el echado (opacidad de dos capas). **Cruza una vez** (al abrir la app o al empezar su franja) y se queda echado: nada se repite toda la tarde.
- **Solo `transform` y opacidad de la capa entera** (nada dentro de un `<svg>` se mueve: ver «Escena por capas» en CLAUDE.md). Llevan `efecto-ambiente`: solo con «todos» y se pausan al deslizar. Con «esenciales», «ninguno», fuera de su franja o en la película, quietos como siempre (las capas no se ven y los del dibujo grande sí).
- **El Día de la Cruz** (51, 3 de mayo): en la plaza, una cruz de palo adornada con jocotes, mangos y una cadena de papel azul (`arte-pueblo.js`, `.v-cruz-mayo`, 5 nodos): su palo a la izquierda del perro echado (los brazos y las frutas quedan por encima de él) y la gente de la plaza se para delante. Quieta. Se dibuja siempre y `fueraDeTemporada` la poda los demás días (campamento 30).
- **`data-mueve`** queda así (uno a la vez): torogoz 5:00–7:00 · **gallinas 7:00–10:00** · zompopos 7:30–10:00 (15–21 de mayo) · azacuanes 8:00–16:00 (sus fechas) · teleférico 10:00–13:00 · **perro 14:00–16:30** · pericos 16:30–18:00 · luciérnagas y relámpagos de noche.
- **Nodos** (banco, mil compras a 390×664): 902 un día normal, 1006 en Nochebuena, 894 en la lluviosa (las capas suman 10; la cruz, solo el 3 de mayo); valle 173–197 (tope 300). A las 15:00 de la lluviosa el perro es la única animación de capa propia a la vista.

### Arreglos de pruebas en el mismo paquete
- Al correr `test_ui` entero sobre la rama salieron tres pruebas viejas que esperaban piezas de otra temporada **dibujadas y escondidas** (el papel picado y los cohetes del bloque 12; el pino de la plaza del bloque 22): desde el campamento 30 no se dibujan, y la prueba espera que no estén. Y «el oso cede» del bloque 25 (película): desde el campamento 31 el rótulo de «Tú» se aparta de la caja del osito y ya no cae sobre los de la cumbre, así que la prueba recorre ahora seis fotogramas junto a la cumbre y pide que en cada uno nada los pise o cedan; el oso cede con la caja de verdad del osito (`cajaTu`), no con un cuadro de 20 px. Estos arreglos van en los commits de los campamentos 30 y 31.
- La lectura del gráfico del costo (bloque «mil compras») se espera hasta 3 s en vez de 200 ms fijos: con la escena ocupada a veces llegaba un cuadro tarde.
- Entre el principal y el frente ahora puede haber capas pequeñas (la cabina, las gallinas, el perro): las pruebas de las capas y del teleférico lo admiten.

### Verificado
- `test_lib` (955): las franjas nuevas de `mueve` y las de siempre con ellas; en todo un año, gallinas solo de 7:00 a 10:00 y perro solo de 14:00 a 16:30; el valle con seis personas en 200 nodos (con la cruz).
- Bloque «campamento 34» de `test_ui` (10): a 390 y 1440 px, a las 8:00 las tres gallinas en su capa bajo el frente, decorativas, de 2 nodos, picoteando, y las del dibujo escondidas; a las 15:00 el perro cruza y, al llegar, queda el echado; a las 12:00 con «todos», a las 8:00 con «esenciales» y a las 15:00 con «ninguno», quietos; el 3 de mayo la cruz, con sus cuatro piezas, junto al perro y no encima.
- Banco (`tests/banco_rendimiento.mjs`): dentro de los topes de nodos y del presupuesto de animaciones. Bloques de las capas, 22, 22B, 22C, 25, 30, 31 y 32 de `test_ui` en verde.
- Capturas a 320, 390, 768, 1440 (claro y oscuro) y 2560 px: las gallinas, el perro a medio cruzar y echado, la cruz.

### Sin probar aquí
- Safari/WebKit real e iPhone: «Medir este aparato» de 7:00 a 10:00 y de 14:00 a 16:30 (las capas son tan pequeñas que no deberían notarse; si sale «Lento», se quitan).
