# Campamento 65 · El arte para Fable (cuando haya límite)

**Qué es.** Un campamento aparte, sin código todavía, que junta **todo el arte nuevo que los agentes Opus dejaron sin dibujar** durante «La vida del valle» (campamentos 39 a 64). Por encargo del dueño (26 nov 2026): **no se inventa a mano; se deja aquí para cuando Fable tenga límite de nuevo** (hoy solo hay Opus), y entonces Fable lo diseña o lo pule y un agente Opus lo integra.

**Cómo se usa.**
0. **Primero, la revisión (encargo del dueño, 26 nov 2026):** Fable **mira el arte que ya está, lo critica y lo cambia**, no solo añade. Recibe capturas de la escena a 390, 1440 y 1920 px, de día y de noche, en claro y oscuro, con estaciones y fiestas (las de `scratchpad` de cada campamento sirven de punto de partida), y entrega su crítica por escrito (qué se lee mal, qué se ve pobre, qué sobra). El dueño aprueba sobre capturas qué se cambia; Fable dibuja con **libertad creativa y esfuerzo alto**; **un agente Opus integra y mide**.
1. **Quien deje algo sin dibujar** (Opus o yo) lo **añade a la tabla de abajo** con su origen (campamento e idea), qué falta dibujar y sus reglas (privacidad, apagable, nodos). Nada de inventar un dibujo para salir del paso.
2. **Cuando haya Fable:** el dueño dice «empezamos el 65». Fable propone los dibujos (maquetas y prototipos en `docs/pulido-visual/vida-del-valle/`), el dueño aprueba, y **un solo agente Opus** los integra como en cualquier campamento (turnos o poses en `cielo.js`, trazos en `arte-vecinos.js`/`arte-valle.js`/`arte-pueblo.js`, `COSTUMBRES`, banco antes y después, doc, «Qué hay de nuevo»).
3. **Lo ya aprobado por el dueño** (todas las ideas del plan, también las que tocaban a la familia) no se vuelve a preguntar; lo **nuevo** que Fable proponga para la interfaz está preaprobado salvo lo descartado y los cambios de regla (esos piden su visto bueno).

**Reglas que valen para todo lo de abajo** (CLAUDE.md, «Escena y arte»): la forma de la montaña no cambia (`rnd()`); todo tallado y nada sobresale contra el cielo; sin `style` en línea; solo `transform`/`opacity` en lo animado y solo si la pieza se ve (`efecto-ambiente`); topes de nodos (teléfono 1100, valle 300, osos 46, tele 24 animaciones) y el banco (`tests/banco_rendimiento.mjs`); lo de otra temporada no se dibuja ese día (`fueraDeTemporada`); la app informa y nunca recomienda; lo religioso o de duelo, sobrio y **apagable con una línea** en `cielo.js: COSTUMBRES`.

## Lo que falta dibujar
| De | Qué falta | Notas |
|---|---|---|
| 42 · ideas 221 y 222 | **El pastel con su velita en la cumbre** (cumpleaños de la montaña y de la familia) | Toca la **privacidad de la familia**: nada de «quién cumple» a quien no es de la familia (ver `15b-familia-y-tele.md`, cumpleaños). Apagable |
| 42 | **El paño morado del Viernes Santo** (tono nuevo) | Sobrio. `COSTUMBRES.santos` |
| 42 | **La palma en cada puerta el Domingo de Ramos** | `COSTUMBRES.ramos` |
| 43 · 152 | **El canasto lleno de mangos** de la vendedora y el **osezno comiéndose un mango** | El canasto que se va llenando es del 54 (memoria de varios días) |
| 43 · 154 | **El gesto de doblar la caña** | En la dobla los vecinos están hoy de pie entre las matas |
| 43 · 161 | **El farolito que se queda en la puerta de cada casa visitada** (posadas) | `COSTUMBRES.posadas` (religiosa) |
| 45 · 176 | **La cresta del gallo, los pollitos y la gallina echada** | La cresta sola suma +1 nodo en todas las fechas |
| 45 · 177 | **El torogoz posado con la cola colgando** | Hoy solo existe el de vuelo, en la capa del cielo |
| 45 · 178 | **El venado** | |
| 45 · 174 | **El corral y su camino** | Las vacas van hoy en un solo trazo |
| 44 · 168 | **El nubarrón de la tarde** detrás de los volcanes (+2 nodos en la lluviosa, crece a saltos con la hora; blanco y detrás: no debe parecer erupción, el Izalco humeante está descartado) | |
| 44 · 169 | **El cielo de cada mes**: celajes rojos de noviembre y diciembre, el azul limpio de enero, la calima y el humo de las rozas de marzo y abril | Los colores del cielo son lo más afinado de la app: cambios del 5 al 10 %, con capturas de cada mes junto a las de hoy |
| 44 · 170 | **Más meses en flor**: cortez amarillo en marzo y pascuas rojas en los corredores en diciembre | Los mismos árboles en otro mes (no es la «orilla florida» descartada) |
| 44 · 166 | **Los charcos**: hoy son los de la maqueta v5 (`charcos3`, en el tono de la sombra de los osos con un brillo): de día se leen como charcos claros, al anochecer casi como sombras. Pulir el tono (+1 nodo si es un tono propio) y, si se quiere, la salpicadura | La v5 los quiere secándose hasta las 21:00 (idea 250): eso es memoria del día (campamento 54), no arte |
| 44 · 167 | **Los petates al sol** de la canícula (mejora v5 de la 167: petates con maíz y frijol delante de dos casas) | No hay dibujo. Hoy en la canícula la ropa tendida se queda hasta las 16:00 (ya existía) |
| 44 · 171 | **El cerco de la luna: revisar.** Opus lo hizo con el halo de siempre (su borde trazado, `stroke`, y su luz un poco más ancha). A 1920 px el anillo se ve sobre la sierra lejana (que es translúcida) | `COSTUMBRES.cerco`. Que se tome por anuncio de lluvia sigue **por confirmar** |
| 44 · 165 | **Los paraguas** son los de la maqueta (negros, del tono de los rasgos) y la hoja de huerta, verde: si Fable quiere, paraguas de colores (sin nodos nuevos: van en los trazos de la ropa) | |
| 46 · 179 | **El conejo en la luna: revisar y pulir.** Opus lo dibujó con elipses (mares de la luna en un trazo) | La luna mide ~30 px en el teléfono |
| 46 · 180 | **Las figuras de las estrellas** (Orión, Aldebarán, las Cabritas, el Alacrán): pulir cómo se leen; hoy son sutiles | Los nombres «Siete Cabritas» y «Alacrán» siguen **por confirmar** con el dueño o la familia |
| 46 · 181 | **«Tú» sentado fuera de la carpa mirando el cielo** (mejora 272) | Esas noches de Gemínidas «Tú» sigue en su carpa |
| 46 | **La Osa Mayor en la constelación de «Tu historia»** | Siete puntos, pero dónde va y cómo se nombra es una decisión de diseño |
| 46 | **Las imágenes de arranque con osos** (iPhone) | Piden una composición nueva |
| 50 | **Todo el campamento 50 · Cambios grandes al paisaje**, **aparte y completo, con libertad creativa y esfuerzo alto**: 205 la plaza con kiosko y ceiba (+10 nodos, reabre la composición de 34b y 35b), 206 la orilla del lago con vida (solo pantallas anchas, +8 nodos), 207 el valle por encima del velo (en teléfono acostado y 320 px; cambia una regla de composición del 22C), 209 el muelle desde 1920 px (**el monitor del dueño sí lo ve**; ojo con el tope de 1100 nodos a 2560 px) | **Descartadas:** 208 (el cantón mide 5 px) y 123 (la tele: el dueño no tiene) |
| 53–56 | *(cada agente añade aquí lo que quede sin dibujar al terminar su campamento)* | |

## Fable también puede **pulir** (no solo añadir)
- A 390 px, la **vara de los mangos** casi no se distingue y las **porterías blancas** de la mejenga se leen poco de día (límites de tamaño; vistos en las capturas del 43).
- En el teléfono, al abrir, **la plaza queda detrás de «Anotar compra» y del velo**: el gallo y los zanates miden unos 4 px (visto en el 45). Es una cuestión de composición del pueblo bajo el velo (`38b`, idea 7 de «Para después»).
- **El tecolote** solo se vio con la luz de un lado; la prueba usa una elipse al 90 % de la copa, no el polígono real.

## Lo que decide el dueño antes de empezar
Qué entra y qué no de lo que Fable proponga, y confirmar con la familia lo religioso y de duelo (posadas, Semana Santa, Difuntos, inditos, tecolote).

Ver también `39-50-para-fable-y-decisiones.md` (decisiones de los campamentos 42, 43, 45 y E) y el plan `39-50-la-vida-del-valle-plan.md`.
