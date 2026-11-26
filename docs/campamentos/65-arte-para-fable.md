# Campamento 65 · El arte para Fable (cuando haya límite)

**Qué es.** Un campamento aparte, sin código todavía, que junta **todo el arte nuevo que los agentes Opus dejaron sin dibujar** durante «La vida del valle» (campamentos 39 a 64). Por encargo del dueño (26 nov 2026): **no se inventa a mano; se deja aquí para cuando Fable tenga límite de nuevo** (hoy solo hay Opus), y entonces Fable lo diseña o lo pule y un agente Opus lo integra.

**Cómo se usa.**
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
| 46 | *(el agente del 46 añade aquí lo que quede sin dibujar: Osa Mayor, imágenes de arranque con osos, estrellas…)* | |
| 44, 50, 53–56 | *(cada agente añade aquí lo que quede sin dibujar al terminar su campamento)* | |

## Fable también puede **pulir** (no solo añadir)
- A 390 px, la **vara de los mangos** casi no se distingue y las **porterías blancas** de la mejenga se leen poco de día (límites de tamaño; vistos en las capturas del 43).
- En el teléfono, al abrir, **la plaza queda detrás de «Anotar compra» y del velo**: el gallo y los zanates miden unos 4 px (visto en el 45). Es una cuestión de composición del pueblo bajo el velo (`38b`, idea 7 de «Para después»).
- **El tecolote** solo se vio con la luz de un lado; la prueba usa una elipse al 90 % de la copa, no el polígono real.

## Lo que decide el dueño antes de empezar
Qué entra y qué no de lo que Fable proponga, y confirmar con la familia lo religioso y de duelo (posadas, Semana Santa, Difuntos, inditos, tecolote).

Ver también `39-50-para-fable-y-decisiones.md` (decisiones de los campamentos 42, 43, 45 y E) y el plan `39-50-la-vida-del-valle-plan.md`.
