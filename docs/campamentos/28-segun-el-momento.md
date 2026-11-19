# Campamento 28 · Según el momento

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Las poses: [26-osos-en-la-interfaz.md](26-osos-en-la-interfaz.md).

## Campamento 28 · Según el momento (Fase 3 de los osos, ideas 10–14)
Los osos de la interfaz siguen el calendario de aquí, como la montaña. **Todo va dibujado y lo enseña el CSS** con las marcas que deja `cielo.js` en `<html>`: nada se redibuja al cambiar la hora o el día. No toca la escena.

- **De madrugada se duermen** (idea 10): de 22:00 a 5:00 (hora de El Salvador) los que estaban despiertos cierran los ojos y les salen dos zetas: el que lee se durmió leyendo, el de la mochila y el del sobre también. Los que saludan siguen despiertos (es una bienvenida), el confundido también (un error se lee mejor despierto) y el que celebra. Marca nueva **`data-sueno`** (22:00–5:00), aparte del velo de madrugada (`data-madrugada`, que se puede apagar): con el velo apagado, igual duermen. Piezas `oso-ojos-zz v-sueno` y `oso-zz v-sueno`; los ojos abiertos llevan `se-duerme`.
- **Navidad** (idea 11, `data-navidad`, 1 dic – 6 ene): el grande lleva un gorro rojo con su borde y su pompón blancos (`oso-gorro-nav`, `oso-pompon`); el chico y el del mameluco, la bufanda roja de la cumbre (`oso-bufanda`). Todo con `v-navidad`.
- **Tardes de lluvia** (idea 12): en la época lluviosa (mayo a octubre), de 13:00 a 18:00, un paraguas celeste plantado del lado de la sombra (`<g class="v-lluvia">`). Marca nueva **`data-tarde`** (13:00–18:00); el CSS mira `html[data-epoca="lluviosa"][data-tarde]`. Sigue el clima de aquí, no el de un servicio (eso se descartó).
- **Fiestas patrias** (idea 13, `data-fiesta="patrias"`, 13–15 de septiembre): una banderita azul y blanca plantada al lado (`<g class="v-patrias">`), solo sus franjas: sin escudo a ese tamaño. (El dueño propuso un sombrero: a 52–96 px no se lee como de fiestas patrias; la banderita sí.)
- **El cumpleaños** (idea 14): el día de un cumpleaños de la familia (`lib.cumpleHoy`, `pintar.js: cumpleDeHoy`), el grande lleva el gorrito naranja de la cumbre en vez del gorro de Navidad. No dice de quién es. La invitación de las cartas se vuelve a dibujar solo si cambia el gorrito.
- **Lo plantado ocupa su sitio siempre** (`pose(…, { plantar: false })` lo quita): el dibujo es algo más ancho del lado de la sombra también los demás días, para que nada se mueva cuando sale el paraguas o la banderita.
- **Nodos**: con todo lo de temporada escondido, `lee` 26, `mochila` 25, `saludan` 42, `sobre` 26, `confundido` 22, `duerme` 22, `duermen` 39, `celebra` 22 (tope en `test_lib`, 44). Ninguno está en la escena.

### Verificado
- `test_lib`: las marcas `data-sueno` y `data-tarde` en sus bordes (4.9 / 5, 12.9 / 13, 17.9 / 18, 21.9 / 22, con el velo apagado) y, para cada pose, el gorro y las bufandas de Navidad, el gorrito en vez del gorro, quién se duerme de madrugada y el paraguas y la banderita plantados (y sin ellos si se pide).
- Bloque «campamento 28» de `test_ui` (la lista sin compras en un día cualquiera, de madrugada con el velo apagado, a las 5, en Nochebuena, una tarde y una noche de lluvia, una tarde de la época seca, el 15 de septiembre y un cumpleaños en diciembre) y los bloques 26 y 27 otra vez.
- «Qué hay de nuevo» (`2026-12-g`, cuatro frases que resumen 26 y 28): cabe entera en 360×640 (538 px).
- Capturas a 390 y 1440 px de la madrugada, Navidad (también la bienvenida), la lluvia y las fiestas patrias.

### Sin probar aquí
- iPhone real y Safari.
