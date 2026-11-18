# Campamento 27 · Cuando algo no va

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Las poses: [26-osos-en-la-interfaz.md](26-osos-en-la-interfaz.md).

## Campamento 27 · Cuando algo no va (Fase 3 de los osos, ideas 8 y 9)
Dos estados que casi nunca se ven y que eran solo texto llevan ahora a uno de los osos de la interfaz, tranquilo: quita el susto sin decir nada. Sin colores de alarma y con el texto de siempre. No toca la escena. No lleva «Qué hay de nuevo» (no es una novedad).

- **Si no cargan las compras** (`lista.js`, con `S.errorCarga`): en el sitio del dibujo de la lista vacía, el grande se rasca la cabeza junto a un signo de pregunta dibujado (`pose('confundido', { tam: 92 })`), sobre el texto de siempre con la voz de cada uno: «No se pudieron cargar tus compras.» o, para quien solo mira, «No se pudieron cargar las compras.». El aviso con «Reintentar» de abajo no cambia. Mientras carga, solo el texto.
- **Mantenimiento** (`SOLO_LECTURA`, `#mant` en `cuenta.js`): el grande duerme a la izquierda del aviso (`pose('duerme', { tam: 52 })`); el texto va en su `<span>` y el aviso sigue siendo un `role="status"` (el dibujo es `aria-hidden`). Se pone una sola vez.
- El signo de pregunta es un dibujo, no un globo de texto: el oso no habla.

### Verificado
- Bloque «campamento 27» de `test_ui` (el error del dueño y de quien solo mira con las compras cortadas, el mantenimiento a 390 y 320 px: dibujo a la izquierda, una sola vez, `role="status"`, sin desplazamiento de lado); la prueba de siempre del aviso de mantenimiento sigue igual. Un estado nuevo de `axe` (el mantenimiento con el grande dormido).
- Capturas a 320, 390 y 1440 px, claro (de día) y oscuro (de noche), del dueño y de quien solo mira.

### Sin probar aquí
- iPhone real y Safari.
