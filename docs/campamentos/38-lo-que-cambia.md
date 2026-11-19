# Campamento 38 · Lo que cambia de la app de hoy

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El pueblo de los osos: [35-pueblo-de-los-osos.md](35-pueblo-de-los-osos.md).

## Campamento 38 · Lo que cambia de la app de hoy (ideas 120, 121 y 122)
Para que el pueblo de osos sea coherente en toda la app sin perder lo salvadoreño: los osos son los habitantes; los animales, los volcanes, los árboles y las fiestas de aquí se quedan como están. El pueblo de la tele con su propia composición (123) queda para después, como en el v3: solo con una tele delante.

- **El pescador del cayuco, un oso** (120, `arte-valle.js: vidaLago`): el pescador sentado en el cayuco del lago es ahora un oso polar, con cuerpo y cabeza blancos, sus orejas, el hocico y el sombrero de palma, y la nariz y el ojo oscuros mirando a la lámpara.
  - El cayuco, sus colores, el remo y la lámpara no cambian.
  - De noche, como siempre, solo se ven la lámpara y su reflejo.
  - Cuesta +2 nodos (`.v-cy-oso`, `.v-cy-sombrero`). El de la orilla, que el v3 dejaba en «solo donde quepa», no se puso: en el teléfono no guarda los 13 px del sendero.
- **La descripción dice «osos»** (121, `lib.js: textoValle`): para lectores de pantalla, «En el pueblo, los vecinos son osos polares.», sin tutear y sin nombres.
  - De paso, la milpa solo se nombra si está: desde el pulido de la iglesia y el paisaje bajo, a 1440 × 900 no cabe fuera del pueblo y no se dibuja.
- **La entrada enseña el pueblo de osos** (122): ya lo hacía desde el campamento 35, porque es la misma escena.
  - El turno sale solo de la hora y el día de El Salvador, y el número de osos solo del tamaño de la pantalla.
  - Las ventanas siguen apagadas ahí (no hay personas en la entrada): no aparece nada de la familia, ni gorritos de cumpleaños ni aurora.

### Verificado
- `test_lib` (978): la descripción (osos, sin tutear, la milpa solo si está) y el pescador oso (sin estilos ni NaN).
- Bloque «campamento 38» de `test_ui`:
  - de día, la descripción y el pescador oso;
  - de noche, solo su lámpara;
  - en la entrada a las 21:00, los vecinos del turno de pupusas y ninguna ventana encendida.
- Capturas del cayuco a 390 y 768 px: `osos/impl/cap38` en el scratchpad de la sesión.

### Sin probar aquí
- iPhone real y Safari.
- VoiceOver leyendo la descripción nueva.
