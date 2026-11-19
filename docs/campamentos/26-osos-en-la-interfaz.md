# Campamento 26 · Los osos en la interfaz

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Los osos de la cumbre: [25-osos.md](25-osos.md).

## Campamento 26 · Los osos en la interfaz (Fase 3 de los osos, ideas 1–7, aprobadas por el dueño)
Los mismos tres osos de la cumbre en otras poses, como pequeñas ilustraciones en los huecos de la app donde había un dibujo de línea o nada. **No tocan la escena**: cero nodos y cero animaciones en la montaña. Son decorativos (`aria-hidden="true"`, `focusable="false"`, nunca dentro de un `role="img"`), no hablan, no llevan globos ni texto y no se tocan.

- **Dónde vive**: `app/static/arte-osos-poses.js`, funciones puras que devuelven un `<svg>` como texto (sin DOM, sin estilos en línea), con su `modulepreload` en `index.html`. Las piezas salen de `arte-osos.js` (`PARTES`: cabeza, cuerpo, cara y ropa), así que si un día cambia la cara en la cumbre, cambia en todas partes. Los colores, en el bloque «Campamento 26» al final de `styles.css`.
- **Las poses** (`pose(nombre, { tam })`, `NOMBRES_POSES`; nodos con su `<svg>` y su sombra de contacto): `lee` 15, `mochila` 14, `saludan` 31 (los tres), `sobre` 15, `confundido` 13, `duerme` 13, `duermen` 28 (los tres), `celebra` 13; y `huella()` 2. Un grupo por oso con un trazo por tono, como en la escena. `test_lib` comprueba que son decorativas, sin `style`, `fill` ni `NaN`, con clases `oso-…`, como mucho 32 nodos cada una y que el módulo no toca el DOM.
- **Los colores**: sobre una tarjeta la luz y la sombra siguen al **tema** (no al cielo de la escena): `--ilu-luz`, `--ilu-sombra` y `--ilu-medio` en `.oso-ilu`, más cálidos en claro; de noche (`data-cielo="noche"`) la luz se enfría un poco. El canto en tono medio del lado de la luz separa el blanco de una tarjeta clara; con alto contraste se oscurece. La sombra de contacto es `--s3`; el signo de pregunta, las zetas y la huella, `--txt3`.
- **Dónde salen**:
  - **La lista sin compras** (`lista.js`) y **el Historial vacío** de «Tu cuenta» (`cuenta.js`): el grande leyendo (`lee`, 96 px), en el sitio del dibujo de línea. De paso, **la voz del lector**: a quien solo mira, la lista vacía ya no le dice «Anota la primera o importa un CSV» (no puede hacerlo), sino «Aún no hay compras en el libro.».
  - **«Tu historia» sin compras** (`historia.js`): el grande con su mochila y su palito, al pie del camino (`mochila`).
  - **La bienvenida de quien solo mira** (`novedades.js`, `#nov-osos` antes del título): los tres saludan (`saludan`, 84 px), **solo la primera vez** («Así va el libro»; en «Desde tu última visita» no salen). **Si con el dibujo la bienvenida no cabe, el dibujo se quita**: se mide una vez, al abrir (`scrollHeight > clientHeight`), así que «Entendido» nunca queda fuera. Medido: cabe en 360×640 y 390×844 (también con letra muy grande a 390×844); en 320×568 no cabe y no sale.
  - **El saludo** (idea 5): el brazo del grande va en su propio `<g class="oso-saluda">`; con efectos «todos» saluda dos veces al abrir (1.2 s, solo `transform: rotate`, desde el hombro: `transform-origin: 19.7% 85.2%` de la caja del brazo, que `test_lib` compara con la geometría de `SALUDO`) y se queda arriba. Con «esenciales» o «ninguno», el mismo dibujo quieto. No lleva `efecto-ambiente` (esa clase lo escondería entero con «esenciales»). Es un SVG de 84 px dentro de un diálogo: no toca la escena.
  - **Cartas para el futuro** (`capsulas.js`): mientras no hay cartas, la invitación del dueño (`#cap-pista`, el texto ahora en su `<span>`) lleva al grande con su sobre lacrado (`sobre`, 72 px) a la izquierda; con menos de 360 px, encima del texto. Se pone una sola vez.
  - **La guía de estilo** (`/guia`, sección «Los osos de la interfaz»): las ocho poses y la huella, cada una con su nombre, con los controles de tema, efectos, letra y contraste de siempre. El ejemplo de estado vacío de la guía también usa al grande leyendo.
- **Para después** (ya están en el módulo, aún sin sitio en la app): `confundido` (el error de la lista, campamento 27), `duerme` (el mantenimiento, 27), `duermen` (la tele dormida, 29), `celebra` y la huella (el libro de cumbre, 29).

### Decidido (Fase 3, no se vuelve a preguntar)
- Los osos de la interfaz **nunca hablan, aconsejan ni compiten con las cifras**: no van en la hoja, el comprobante, los gráficos, la celebración, la racha, la entrada ni en las herramientas del dueño.
- **Si no cabe, no va**: un dibujo nunca empuja un botón fuera de la pantalla.

### Verificado
- `test_lib` (+40 comprobaciones), `test_api`, el bloque nuevo de `test_ui` («campamento 26», 22 comprobaciones: la lista y «Tu historia» sin compras del dueño y de quien solo mira a 320 px, la bienvenida a 390×844, 360×640, 320×568 y con letra muy grande, el saludo con «todos» y quieto con «ninguno», las cartas a 390 y 320 px, la guía) y los dos estados de antes que miraban el dibujo de línea, ahora el oso. `axe`, con dos estados nuevos (la bienvenida con los osos y la lista sin compras), sin violaciones.
- Capturas a 320, 390, 768, 1440 y 2560 px, claro y oscuro (de día y de noche), letra muy grande, alto contraste, acostado y efectos «ninguno».

### Sin probar aquí
- iPhone real y Safari: que el saludo de 1.2 s se vea suave y que la bienvenida, con la barra de Safari, siga cabiendo.
