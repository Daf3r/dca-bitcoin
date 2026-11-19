# Pulido integral del paisaje: el movimiento y los osos

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El presupuesto y el banco: [30-hacer-sitio.md](30-hacer-sitio.md), [docs/rendimiento.md](../rendimiento.md). Lo anterior del pueblo: [34b](34b-pulido-del-pueblo.md) y [35b](35b-pulido-iglesia-paisaje-bajo.md).

## Pulido integral (19 nov 2026)
Encargo final del dueño, después del 38: un barrido de la escena completa, de todo el movimiento y de todos los osos.

**Barrido de la escena**: a 320, 390, 768, 844 acostado, 1440 y 2560 px, de 6:00, 12:00, 17:30 y 21:00 (`osos/impl/integral/hoja-*.png` en el scratchpad de la sesión), con acercamientos a 4× de los osos de la cumbre y de «Tú».

**Auditoría del movimiento**: un recorrido por 15 momentos del año, a 390 y 1440 px, con los tres niveles de efectos (`osos/impl/movimiento.mjs`). Para cada animación de la escena mira qué propiedades anima, si se para al deslizar y si corre con «esenciales» o «ninguno».

### Lo corregido
1. **Animaciones corriendo sobre lo escondido** (lo más grave). Las luciérnagas de día, la aurora y el brillo de la luna en el lago de día, los cohetes fuera de su noche y la llovizna fuera de la tarde lluviosa estaban escondidos (`display: none`) pero sus animaciones seguían corriendo: el navegador las calculaba en cada fotograma.
   - A las 12:00 de un día normal, con «todos», eran **55 de 88** animaciones de la escena; con «esenciales», **69 de 72**.
   - Ahora cada una corre solo cuando su pieza se ve (la misma condición del CSS que la enseña): 33 y 2.
   - En el banco, a 4× de CPU: de día, de 56.5 a **60** fps; de noche, de 47.6 a **58.5**; en Nochebuena, de 43.1 a **59.5**; la noche de lluvia, de 47.1 a 54.1.
   - Crear la escena: de 51 a 40 ms (día) y de 72.8 a 55.7 ms (Nochebuena).
2. **La corona de Navidad de «Tú» movía `stroke-dashoffset`** (la única animación que no era transform ni opacidad). Ahora gira con `transform: rotate`: 90°, tres puntos de su patrón, y vuelve a empezar igual (en el teléfono, a saltos como antes).
3. **«Tú» respiraba con «esenciales»**. Respirar es ambiente: ahora solo con «todos». Andar al subir y festejar al cruzar una etapa acompañan a una acción y siguen también con «esenciales».
4. **Los bracitos de los osos parecían palitos** (radio 1.35). Ahora son de peluche (1.75), en todas las poses de la interfaz (saludan, confundido, celebra…), en «Tú» al festejar (1.7) y en los de la cumbre al estirarse (1.6).
   - Se rehicieron con ello el eje del saludo (`.oso-saluda`, 23 % 82.3 %), las puntas que se comprueban contra el cielo (`PUNTAS_ESTIRA`) y la caja de «Tú» (`CAJA_TU`).
   - La cara, la ropa (la camiseta azul marino con su parche naranja y su cinta roja, el crema y el del mameluco celeste) y las proporciones se revisaron a 4×, de día y de noche, y se quedan.

### Lo que se quedó como está (avisado)
- Al abrir, sin deslizar, el borde de abajo del pueblo queda tapado en algunas formas (medido en la cabeza final con `osos/impl/tapa.mjs`):
  - en el teléfono acostado (844×390) y a 320×568, bajo el velo fijo del pie de la página (102 px); a 320, además, unos 6 px bajo «Anotar»;
  - con «todo junto» (sin pestañas), la píldora ancha de «Anotar» tapa la calle del centro también a 768×1024 (unos 16 px; captura `tres-compras-tablet-light` de la regresión visual).
  - Al deslizar 200 px queda todo a la vista. En escritorio (1440 a 2560, también 1920×900, 1080 y 1200) nada tapa el pueblo: la barra de pestañas va debajo, en el flujo.
  - Ya era así desde el 22C («Anotar tapa media plaza»). Arreglarlo cambia la composición del valle (ver «Para después», 7): es otro encargo, si el dueño lo quiere.
- A 1440 px el rótulo de «Tú» puede quedar sobre la quebrada: se lee, y los rótulos mandan.

### Para que no vuelva a pasar
- Bloque «pulido integral: el movimiento» de `test_ui` (16 comprobaciones). A 390 y 1440 px, en ocho momentos (la mañana de la que barre, el mediodía, la pelota, la noche, Nochebuena, la tarde de lluvia; con «todos» y con «esenciales»):
  - ninguna animación corre sobre algo escondido;
  - todas animan solo transform u opacidad;
  - todas las infinitas se paran al deslizar (salvo la celebración);
  - con «esenciales» no queda ninguna infinita.

### Verificado
- `test_lib` (978).
- Los bloques 12, 16, 21B, 22, 22C, 25, 26, 31, 33, «efectos», «atmósfera», «la montaña viva», «capas» y el nuevo de `test_ui`.
- Biome y el banco, antes y después.

### Verificación final de la rama (campamentos 26 a 38 y sus pulidos, 19 nov 2026)
- `test_lib` 978, `test_api` 1314, `tsc`, Biome (0 avisos), ruff, mypy y el recorte: en verde.
- `test_ui` completo en sus tres partes: 812, 817 y 778 comprobaciones. axe sin violaciones. Barrido `rapido` (112 combinaciones) y por pestañas (448): en orden. El banco, dentro de los topes (mil compras a 390×664: 924–926 nodos de día, 1030 en Nochebuena; el valle, 187–221 de 300).
- La prueba 17·2 esperaba un saldo fijo en la descripción de la montaña: el escenario lo calcula con el precio del día y, desde las 0:00 del 19 de noviembre, fallaba también en `main`. Ahora mira la forma de la frase, no la cifra.
- Lighthouse móvil: accesibilidad 100 y buenas prácticas 100. El rendimiento da 69 de mediana en este sandbox, **lo mismo que `main` aquí** (69 y 69); en dos vueltas más, 67 y 71. Es ruido del entorno: el CI decide con su mínimo de 70.
- Regresión visual contra `main`: 9 de 15 capturas cambian; revisadas las nueve, todas por lo buscado (los osos de la interfaz y de la bienvenida de la lectora, «Tú» oso, los de la cumbre, el pueblo nuevo, la milpa en su sitio libre y el teleférico); el resto de cada diferencia es el grano del papel en los bordes. La hoja de anotar y «Tu cuenta», iguales.
- `/medir` A/B (`main` contra esta rama, mil compras): en Chromium a 4×, la escena de 48.5 a 50.2 de día y de 45.7 a 48.7 en Nochebuena (una vuelta). En WebKit sin GPU, de día 20.4 → 22.1; en Nochebuena, en cuatro vueltas, la escena de 21.6 a 22.3 de media y el peor fotograma de 11.6 a 12 (la primera vuelta, 22 → 20.1 y 11.3 → 7.9, fue la única que bajó); el saldo sale unos 20 ms más tarde (722 → 744 ms, dentro del ruido). Lo que vale es el iPhone del dueño.

### Para después (sin hacer: lo decide el dueño)
1. **El panadero que cruza** (116, quedó para después desde el v3): en bicicleta de un lado al otro de la calle de 5:00 a 7:00, en su capa chica como la que barre. Unos 6 nodos en su capa; comparte franja con el torogoz, así que uno de los dos cede (`data-mueve`).
2. **La ronda y el saludo al guardar** (118 y 119, del v3): sin tocar.
3. **Las estrellitas que titilan** (113): hoy la chispa está quieta. Titilar es una animación de opacidad más (0 nodos), con `efecto-ambiente` y en la pausa al deslizar, solo en Nochebuena y el 31 de 18:00 a 1:00.
4. **El humo del fogón de la pupusera**: 1 o 2 nodos y una animación de ambiente, de 17:45 a 22:00. Riesgo bajo; compite con el humo de la chimenea.
5. **El pescador de la orilla en escritorio** (120): en el teléfono no guarda los 13 px del sendero; a partir de 1440 sí cabría. Unos 8 nodos, solo en el valle ancho.
6. **La cresta roja de las gallinas**: un trazo más (1 nodo); se leerían mejor a 390.
7. **El valle por encima del velo** en el teléfono acostado y a 320×568: subir el valle 70–90 px en esas formas. Es un cambio de composición (el del 22C) y toca las pruebas del valle: solo con el visto bueno del dueño.
