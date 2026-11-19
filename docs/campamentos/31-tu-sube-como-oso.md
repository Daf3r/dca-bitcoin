# Campamento 31 · «Tú» sube como oso

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Los osos de la cumbre: [25-osos.md](25-osos.md). El presupuesto: [30-hacer-sitio.md](30-hacer-sitio.md).

## Campamento 31 · «Tú» sube como oso (ideas 33–39, la idea clave del dueño)
El punto naranja de «Tú» (y de «Vamos aquí», para quien solo mira) es ahora **un osito que sube por el sendero**. El dato no cambia: **la altitud es la de sus pies**, que están sobre el punto exacto del sendero (`camino.getPointAtLength`), con una pisada naranja debajo.

- **El osito** (idea 34, `arte-osos.js: osoTu`, `CAJA_TU`; `montana.js: yoTu`, `cajaTu`): un cuarto osito, blanco como el grande pero **sin la ropa de los tres** —con la ropa del grande, a 320 px habría dos grandes iguales, uno subiendo y otro en la cumbre—, sentado como ellos (un peluche que alguien hace subir), con **su mochila y sus correas naranjas** (el naranja sigue siendo lo tuyo) y su palito. Un cuarto más grande que los de la cumbre (unos 25 px en el teléfono, 37 en escritorio). Un trazo por tono, 15 nodos; `#m-yo` pasa de 8 a unos 20.
- **Lo que se queda en #m-yo**: el grupo y su `translate` (`colocar`, `subir`, `fotograma`), la linterna de noche, los anillos de Navidad, **`.yo-anillo`** —ahora la caja del osito, invisible: con ella se apartan los rótulos (`etiquetar`), los osos de la cumbre (`colocarOsos`) y las tarjetas de la tele (`tv.js`)— y **`.yo-punto`**, ahora la pisada naranja con borde de nieve (una elipse más ancha que el osito, entre su sombra y su cuerpo: asoma a los lados y por delante, y se lee a 320 px). El halo es una elipse plana a sus pies.
- **El rótulo** «Tú» / «Vamos aquí»: sus rincones se miden desde la caja del osito (arriba, a media altura y abajo, a cada lado; encima y debajo), así que nunca le cae encima.
- **Las huellas, de oso** (idea 33, `huellas`): una almohadilla y tres deditos cada 20 px, alternando a cada lado del sendero, **todas en un solo trazo** (`.huellas-oso`, `data-n` dice cuántas). Antes, un círculo por huella (29–128): la escena pesa menos que antes aun con el osito.
- **Anda mientras sube** (idea 35): la clase `anda` en `#m-yo` mientras sube (al abrir la app, al anotar y en la película, con `fotograma`); dos cuadros (`steps(2)`), ±6° desde los pies, solo `transform`; acompaña a una acción (sale con «esenciales»), nunca con «ninguno». No suma repintados: `#m-yo` ya cambia en cada fotograma al subir.
- **En reposo, respira** (idea 36): la animación que llevaba el halo pasa al osito (escala 1 → 1.03 desde los pies, 2.4 s): ninguna animación más. Se pausa al deslizar y en la película (`#m-yo:not(.anda) .oso-tu` en la lista de la pausa); mientras anda, no.
- **Levanta los brazos al cruzar una etapa o un campamento** (idea 37, `llegar`): los brazos alzados van dibujados y escondidos (`tu-festeja`) y la clase `festeja` los enseña 1.2 s; un cambio a saltos, no una animación; nunca con «ninguno».
- **El eco de hace un año** (idea 38): el mismo osito, a la mitad de opacidad, quieto en el sendero, con su caja (`rect.eco-anillo`, invisible) y una pisada tenue.
- **Su bufanda en Navidad y su gorrito en un cumpleaños** (idea 39): como los de la cumbre (la bufanda se poda fuera de la Navidad: campamento 30).
- **Lo chico sigue con el punto**: la mini-cabecera, el altímetro y la montañita del Diario (a 8–14 px un oso no se lee). La tele y la película usan la misma escena: llevan el osito.
- **Para después**: el equipo según el campamento (40) y pararse en cada campamento al subir (41).

### Medido
- El banco (390×664, mil compras, «esenciales»): un día normal **889** nodos (914 tras el 30), Nochebuena **993** (1017), lluvia **881** (906): con el osito, la escena pesa menos que antes porque las huellas son un solo trazo. Las animaciones a la vista no cambian (frente 5 de día, 14 en Nochebuena).

### Verificado
- `test_lib` (+5: la mochila, las correas y el palito sin la ropa de los tres, la bufanda y el gorrito, los brazos en su grupo, la pisada entre la sombra y el osito, todo dentro de su caja).
- Bloque «campamento 31» de `test_ui` (a 320, 390 y 1440 px: el osito con los pies sobre el sendero, dentro de su caja, sin su rótulo encima, mochila del naranja de la pisada, decorativo; las huellas en un trazo; anda al subir y queda quieto al llegar, respira y levanta los brazos con «todos», y nada de eso con «ninguno»; el eco translúcido). La prueba de siempre de las huellas cuenta ahora `data-n`.
- «Qué hay de nuevo» (`2026-12-g`, tres frases: el osito, los osos en otros rincones y el calendario): cabe en 360×640 (580 px).
- Capturas a 320, 390 y 1440 px de día, de noche y en Navidad, el eco y los brazos alzados.

### Sin probar aquí
- iPhone real y Safari: que el bamboleo al subir se vea suave (dos cuadros) y que la pisada se lea a pleno sol.
