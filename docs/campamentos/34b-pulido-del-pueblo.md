# Pulido del pueblo · Las casas en su sitio

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El pueblo: [22c-valle-de-verdad.md](22c-valle-de-verdad.md). Va entre el campamento 34 y el 35, como commit propio, por encargo del dueño («que no quede nada feo o donde no debe estar»; «las casas se tapan entre sí o están mal hechas»).

## Pulido del pueblo (19 nov 2026)
El dueño mandó dos capturas: una del prototipo del Pueblo de los Osos y otra de **producción, de noche**. En las dos, varias casas se veían montadas: una sobre la iglesia y las del fondo amontonadas sobre las de delante. **Venía del campamento 22C**, no de los osos. Medido sobre la geometría del dibujo, a 390, 768, 1440, 1920 y 2560 px (capturas «antes», con las casas marcadas, en el scratchpad de la sesión: `osos/impl/casas/antes`):

- **La casa pegada a la iglesia era de la fila de atrás.** Esa fila empezaba a 26 unidades de la iglesia, pero la nave llega hasta 41. Como el pueblo se pinta **por tono** (un trazo para todas las paredes de un color, otro para todos los tejados…) y las paredes van después de la iglesia, esa casa quedaba **pintada encima de la nave** aunque estuviera detrás.
- **Las casas de atrás eran solo un tejado.** Iban 10 unidades por encima de la calle, al 70 %, y los tejados de delante llegan a unas 15: entre el **45 y el 95 % de su fachada** quedaba detrás del tejado de delante y solo asomaba su tejado, montado sobre el otro. A 768 px eran diez tejados en fila, sin orden de terraza.
- Y, al pintar por tono, un tejado, una puerta o una ventana de atrás podía quedar encima de una pared de delante.
- Aparte: al final de la calle, el **árbol de fuego** quedaba detrás del **árbol del primer día**, y su tronco, entre los dos, se leía como una persona (lo vio el dueño en la captura del prototipo).

Lo que cambió (`arte-pueblo.js`, sin tocar la montaña ni su `rnd()`):
- **La fila de atrás va en una terraza** (`TERRAZA`, 13.8 unidades sobre la calle, con un muro bajo de piedra, `.v-terraza`): a la altura de los tejados del frente, que tapan a lo sumo el pie de su fachada (un 29 % en el peor caso posible, con la casa más alta delante; en los doce casos de la prueba, nada). Todas a la misma altura, al 70 % y al 64 % alternadas.
- **Empieza donde acaba la iglesia**: su nave si la luz viene de la derecha, su torre si viene de la izquierda. Nunca detrás de ella.
- **Se pinta aparte y antes**: sus trazos (sombra, muro, paredes, tejados, puertas y ventanas) van antes que la iglesia y que el frente, así el orden de profundidad es siempre el de verdad. Las casas de delante siguen como estaban.
- Donde el sendero no deja sitio encima, hay menos casas atrás (en el teléfono, 3 o 4 en vez de 5).
- **El árbol de fuego no se pone** si el árbol del primer día ocupa su sitio al final de la calle (`pueblo(…, { evitar })`, desde `montana.js`).
- El dibujo de cada casa (frente, hastial al astro, tejado de teja con su borde, alero, corredor con postes, puerta y dos ventanas) se revisó a 4× de día y de noche y se queda: lo que se veía mal era cómo estaban puestas.
- Las cometas, la iglesia, la plaza, el perro, las gallinas, la cruz de mayo y el teleférico, en su sitio.

**Nodos**: el pueblo del teléfono pasa de 87 a 96 (la fila de atrás lleva sus trazos propios; con seis personas), a 768 px de 89 a 108 y en escritorio de 87 a 98; el valle sigue lejos de su tope de 300 y la escena del teléfono, de 1100 (banco).

### Para que no vuelva a pasar
- `test_lib`: `cajaCasa` y `cajaIglesia` (exportadas de `arte-pueblo.js`) en seis tamaños (320, 390, 768, 844 acostado, 1440 y 2560) con la luz de cada lado. Ninguna casa sobre la iglesia ni sobre otra. Ninguna fachada de atrás tapada más del 40 %. La terraza se pinta antes que la iglesia. El árbol de fuego cede su sitio.
- Bloque «pulido del pueblo» de `test_ui`: en la escena de verdad, a 390, 768, 1440 y 2560 px, de día y de noche, mide cada subtrazo de las fachadas y los tejados. Pide lo mismo y falla con la disposición de antes (comprobado: «sobre la iglesia: 1»).

### Verificado
- `test_lib`, los bloques 22, 22B, 22C, 32, 34, capas y «pulido del pueblo» de `test_ui`, y el banco.
- Capturas antes y después a 390, 768, 1440, 1920 y 2560 px, de día y de noche (`osos/impl/casas/comparar` en el scratchpad de la sesión), y después en Navidad y en fiestas patrias (`casas/v1-navidad`, `casas/v1-patrias`).

### Sin probar aquí
- iPhone real y Safari.
