# Campamento 30 · Hacer sitio

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El presupuesto y cómo medir: [docs/rendimiento.md](../rendimiento.md), «Presupuesto de la escena y el banco».

## Campamento 30 · Hacer sitio (rendimiento y presupuesto, ideas 18–21, antes de cualquier vida nueva en la escena)
Más vida en la escena obliga a optimizar: primero se mide y después se toca. No cambia nada de lo que se ve.

- **El banco de rendimiento** (idea 18, `tests/banco_rendimiento.mjs`, en el trabajo «Rendimiento» del CI): abre la app en el teléfono (390×664) con mil compras en cinco momentos (un día y una noche normales, Nochebuena a las 21:00, una tarde y una noche de lluvia) y cuenta los nodos de la escena, del valle y de los osos (con «esenciales», como `test_ui`) y las animaciones que corren **a la vista** en cada capa (con «todos»; lo que corre bajo `display: none` no cuenta: WebKit lo para). **Falla** si pasa un tope o el presupuesto; el tiempo de crear la escena y los fps en reposo (CPU 4×, mediana de 3) **solo informan**. `--rapido` se salta lo blando; `BANCO_JSON=ruta` guarda la tabla.
- **Lo de otra temporada no se dibuja ese día** (idea 19, `montana.js: fueraDeTemporada` y `podar`; **cambia una regla**, aprobado por el dueño): la escena se arma igual —la forma no cambia: el mismo `rnd()` en el mismo orden— en una plantilla inerte, y antes de ponerla se le quitan las piezas que el calendario de hoy esconde todo el día: la Navidad (y la bufanda de los osos) fuera del 1 dic – 6 ene, los cohetes fuera del 24–25 y 31 dic – 1 ene, el papel picado fuera de las fiestas, las banderas del pueblo fuera de las agostinas y las patrias, las piscuchas fuera de octubre y noviembre, los zompopos fuera del 15–21 de mayo, las otras etapas de la milpa, la quebrada de la otra época y las flores de otro mes. Lo que se pone después (los campamentos, la ladera, los osos) se poda al final del dibujo. **Lo de la hora no se toca** (luna, estrellas, luciérnagas, el mar de niebla, la luz del lago): sigue dibujado y lo enseña el CSS. Las fechas son las de `cielo.js` (`window.libroCielo`): las mismas marcas de `<html>`. **Al cambiar de día con la página abierta**, `cielo.js` dispara `libro:dia` y `app.js` vuelve a dibujar la escena (no durante la película).
- **Juntar trazos** (idea 20): los peldaños del sendero en un solo trazo y las capas del parallax sin su `<g>` vacío. Lo demás que se contó (los pinos, que la película enciende uno a uno; las gotas y los pétalos, cada uno con su ritmo; tres pares de planos del relieve con opacidad, donde se verían las costuras) **no se junta**: el «hasta 69» de la propuesta era la cota; lo que se pudo sin cambiar nada de lo que se ve son unos 27 nodos.
- **El presupuesto escrito** (idea 21, en `docs/rendimiento.md`): topes de nodos (escena 1100, valle 300, osos 40), animaciones a la vista por capa (dibujo grande 56, frente 16, cielo 44, sierra lejana 22, sierra media 4, cada capa propia nueva 3; en total 110) y el teatro de `data-mueve` con sus franjas libres (10:00–16:30). El banco usa los mismos números.
- **Las luciérnagas a su capa** (idea 22): **para después** (medido sin ganancia; solo si el iPhone, de noche, sale «Lento»).

### Medido (390×664, mil compras)
| Momento | Nodos antes | Nodos después | Animaciones a la vista (sin cambio) |
|---|---|---|---|
| Día normal (25 nov, 12 h) | 1070 | **914** | 13 |
| Noche normal (21 h) | 1070 | **914** | 88 |
| Nochebuena (21 h) | 1070 | **1017** | 98 |
| Tarde de lluvia (10 jul, 15 h) | 1070 | **906** | 31 |
| Noche de lluvia (21 h) | 1070 | **906** | 102 |

- El valle: de 222 a 165–196 nodos (tope 300).
- «Medir este aparato» (`/medir`, intercalado antes/después, dos vueltas): Chromium con la CPU 4×, la escena a la vista 54.2 · 54.6 → 54.6 · 55.7 fps de día y 53.0 · 49.5 → 51.9 · 52.3 en Nochebuena; WebKit sin GPU, 34.5 · 28.7 → 31.4 · 31.9 de día y 32.8 · 26.5 → 30.9 · 29.8 en Nochebuena. **Dentro del ruido**: no empeora.
- Dibujar la escena entera (`pintarMontana`, CPU 4×): unos 123–157 ms con la poda frente a 143–145 ms sin ella (con la máquina cargada).
- Lighthouse móvil de la app: mediana 74 (75 · 74 · 67; mínimo 70); la entrada, 98.
- La escena píxel a píxel (efectos «ninguno», cinco días, tres escenarios, 390 y 1440 px) contra la versión de antes: lo que cambia es del mismo tamaño que lo que cambia entre dos cargas de la misma versión (la escena del teléfono sale de dos formas según la carga: el «Hallazgo» de `docs/rendimiento.md`); ninguna diferencia propia.

### Decidido (no se vuelve a preguntar)
- **La regla nueva**: lo de la hora no se redibuja; lo de otra temporada no se dibuja ese día. Una pieza de temporada nueva se añade a `fueraDeTemporada`.
- **Lo nuevo que se mueva en la escena va en su capa pequeña** y entra en el presupuesto; si con la montaña a la vista baja de 55 fps en el iPhone, se quita.

### Verificado
- Bloque «campamento 30» de `test_ui` (un día de noviembre sin nada de otra temporada, la milpa en su etapa, la quebrada de la época, los peldaños en un trazo, las capas sin grupo vacío, el paso a Nochebuena y a las agostinas con la página abierta, Nochebuena desde el principio) y `test_ui` completo; el banco en verde.

### Sin probar aquí
- iPhone real y Safari: «Medir este aparato» de día, de noche y en diciembre tras desplegar; que el redibujo de medianoche no se note con la app abierta.
