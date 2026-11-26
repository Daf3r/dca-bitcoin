# Revisión visual de partida (26 nov 2026), para Fable

**Quién y cómo.** La hizo Sonnet, mirando capturas reales de la app en `main` (tras los campamentos 39 a 46 y el CI de 60 min): amanecer, mediodía, atardecer, noche, tarde de lluvia, Nochebuena, el desfile del 15 de septiembre y la milpa, a **390, 1440 y 1920 px**, en claro y oscuro (el script está en `docs/pulido-visual/revision-26nov/capturas.mjs`: `node capturas.mjs <raíz del repo> <carpeta de salida>`; ~270 imágenes, no se guardan en el repo por su peso). Fue una mirada rápida de cinco o seis capturas: **es una lista de dónde mirar primero, no un veredicto**. Fable decide qué es un defecto de verdad. El dueño dijo, viendo un recorte del pueblo: «Fable debe hacer mejor lo visual».

## Lo que se ve mejor de lo esperado (no tocar sin motivo)
- El **cielo**: el amanecer/atardecer púrpura-naranja a 390 px y la noche con luna (el conejo de la 179 se lee en pantalla ancha) son lo más afinado de la app.
- La **tipografía de las etapas** (10M, 2.5M, 1M, 100k) con su halo, y la píldora «Tú».
- El **árbol de Navidad** y el nacimiento del pueblo: son lo más encantador del valle.

## Lo que se ve flojo o provisional (por área)
1. **La escala y la composición del valle.** En pantalla ancha (1440 y 1920) el pueblo ocupa **una esquina inferior izquierda diminuta** (los osos miden unos 25 px, las casas casi lo mismo): la montaña domina y el valle parece una maqueta aparte; el resto del ancho es bosque repetido y un lago pequeño y vacío. Revisar cuánto debe pesar el pueblo frente a la montaña.
2. **El suelo del valle en el teléfono (390).** Entre el bosque y el pueblo hay una **banda ancha de terrazas planas** (morada, marrón o gris según la hora) sin nada, y el pueblo queda pequeño, **bajo el velo del pie y detrás de «Anotar compra»**. Es el mismo punto de la idea 207 del plan («el valle por encima del velo») y de `38b`, idea 7.
3. **La montaña.** Caras de baja poligonación en un verde oscuro muy uniforme a mediodía: **poca variación de luz, textura y profundidad**; el bosque de triángulos se repite igual; los claros ovalados de la ladera parecen **sellos**. La cumbre nevada es una sola forma blanca lisa; los tres osos de la cima miden ~15 px a 390.
4. **La línea clara que baja por la derecha** de la montaña (el cable del teleférico, solo desde 1100 px) **se lee como una grieta** o un río: no se entiende qué es.
5. **La tira de flores rojas y amarillas al pie** (pascuas) corre como una guirnalda uniforme a lo ancho: repetitiva y ruidosa.
6. **El pueblo de cerca.** Las casas de bloque con techo rojo son muy parecidas (poca variedad de volumen, de sombra y de relieve); la plaza es un llano gris-beige liso, sin pavimento ni detalle; los osos tienen la ropa bien (colores planos) pero la **cara se reduce a puntos**; en proporción, el árbol de Navidad es enorme frente a las casas (encantador, pero fuera de escala).
7. **El lago**: pequeño, lejos y casi vacío a mediodía; los animales y el pescador se pierden.
8. **La noche en el teléfono.** La ladera derecha y el valle quedan **casi sin forma** (oscuro sobre oscuro): se pierde la silueta.
9. **Lo provisional que Opus dejó a propósito** (ver `65-arte-para-fable.md`): el pastel, el paño morado, las palmas, el canasto de mangos, doblar la caña, el farolito de las posadas, cresta y pollitos, el torogoz posado, el venado, el corral, el nubarrón, el cielo de cada mes, los meses en flor, y todo lo que el campamento 53 deje como «visual provisional».

## Cómo debe trabajar Fable con esto
1. Mira las capturas (las suyas, con el script) y **da su propia crítica por escrito**: confirma, descarta o añade a esta lista.
2. El dueño aprueba sobre capturas qué se cambia. Libertad creativa, esfuerzo alto.
3. Lo que cambie respeta las barandas (CLAUDE.md, «Escena y arte»): la forma de la montaña (`rnd()`), «todo tallado», nada sobresale contra el cielo, los topes de nodos y de animaciones, el banco, la CSP (nada de `style` en línea) y lo descartado.
4. **Un agente Opus integra y mide** lo que Fable entregue.
