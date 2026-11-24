# Decisiones del dueño sobre el diseño de Fable (24 nov 2026)

**El dueño dijo: «tus recomendaciones haremos, y claro, el halving se celebra».** Se adoptan las propuestas de Fable (artifact «Diseño A–F», https://claude.ai/artifact/58FJ2JGTdZXDTx2zqD6tYZ; fuente y maquetas en `docs/pulido-visual/vida-del-valle/diseno-24nov/`) con las recomendaciones del agente principal en las 7 dudas. Todo se implementa **después** del 39 y el 41 (que ya están en marcha) y en el orden del plan.

## Respuestas a las siete dudas (decididas)
1. **¿Qué aparato mueve la tele?** — Sin dato: **pendiente del dueño** (decir marca y año). Mientras tanto, diseñar para hardware modesto y **comprobar qué navegador trae**: el CSS usa `color-mix()` 363 veces (Chromium 111+); si la tele trae uno más viejo, hay que dar una alternativa (variables ya mezcladas) solo para la tele.
2. **La manta de los tres osos (E3)** — **No por ahora.** Es el gesto que más puede leerse como «va mal». Se implementan Calma, Fresco, Abrigo, Aire libre y Plaza; la Manta queda en «después», apagada y con interruptor por dispositivo, si el dueño la quiere más adelante.
3. **¿2.4 s para que «Tú» suba al anotar?** — **No.** Lo que responde a una acción del dueño sigue rápido (como hoy, ~1.2–1.4 s). El tempo largo es para lo ambiental, los personajes y las fiestas; «Tú» andando por su cuenta (al abrir, película) sí puede ser más lento.
4. **¿La familia ve la fiesta entera o solo el farol?** — **La ven entera** (lectores incluidos): es la fiesta del libro, sin cifras de nadie; los lectores no se tutean («el libro llegó a…»).
5. **¿El halving se celebra?** — **Sí (decisión expresa del dueño)**, como **fiesta del pueblo, sin «Tú»** (es un hecho de la red, no un logro suyo), con su gesto propio, distinto del de un hito de saldo; no se repite. Solo informa.
6. **«Tocar este año» por semanas** — **Sí**, junto con la partitura y la constelación agregadas por semana a miles de compras.
7. **La intermedia gana su gesto de 6 s** — **Sí, pero sobrio** (sin secuencia completa; reabre la nota del 21 «ligera a propósito» y se dice en el informe).

## Se adopta tal cual lo recomendado por Fable
- **A · La fiesta del hito (59):** cuatro tiempos; 24 s campamento, 12 s etapa principal, 6 s intermedia; se salta con un toque; versiones de noche, lluvia, «esenciales» y «ninguno»; farol del hito hasta la medianoche; no se repite (marca en el servidor, **migración 19**: idempotente y con su prueba); en el teléfono el clímax es cielo y cumbre.
- **B · El nodo (60):** tarjeta «Pulso de la red» vía `/api/red` y su mempool.space; campana de la torre con cada bloque; gestos para lo raro (múltiplo de 1,000, ajuste de dificultad, **halving**, bloque 1,000,000 una sola vez). **No** osito mensajero, **no** osito contador, **no** distintivos coleccionables.
- **C · «Tu historia» a miles (57 y 58):** la partitura pasa a años → un año por semanas (≤ 52 figuras) → la semana al tocarla; la constelación, una estrella por semana; la marca de «extra» **por mayoría** en todos los dibujos. Revisar la cabecera de compresión real de `/api/compras` en producción (1.8 MB con 10,000 compras sin comprimir en el servidor de pruebas).
- **D · La tele:** componerla a 1080p y escalarla entera; rótulos de la montaña a 26 px o más y dos datos menos; el pueblo a ×1.5 con composición propia (el T3 sí lo merece); tope propio de 24 animaciones; deriva de ±12 px contra el quemado; la fiesta a la derecha de la cumbre.
- **E · Precio:** seis estados (sin la Manta por ahora: cinco activos), umbrales por **semana y distancia al máximo de 30 días con topes de racha** (calma el 84 % de los días); el cielo no se toca y no cambia ningún texto; brazos arriba, cohetes y farolitos reservados a los hitos; interruptor por dispositivo; prueba automática de que nada aconseja. Repetir la simulación con el histórico real.
- **F · El tempo:** tres tempos en variables CSS (gesto, acción, ambiente) con la tabla antes → después; la interfaz no se alarga; acciones con principio y final; hasta tres actores «ambientales» lentos junto al principal (**excepción acotada** a «uno a la vez»); un actor propio del teléfono a mediodía (el pescador).

## Reglas que se reabren (decididas: se pueden cambiar, diciéndolo claro en cada informe)
- «Uno en movimiento a la vez» (22, 22B): un principal + hasta tres ambientales de bajo costo.
- «Ocho vecinos como mucho y nunca según las cuentas» (35): hasta **nueve** en una fiesta de hito (el texto y el tope se ajustan juntos).
- La intermedia «ligera a propósito» (21): gesto sobrio de 6 s.
- «Una nota por compra» en la partitura (13C): por semana a partir de N notas.
- Qué enseña la tele (21B): dos datos menos.

## Orden sugerido (se suma al del plan)
39 → 41 → **F1/F2** (auditoría y tempo global, se pueden hacer ya) → 51 → **C (57/58)** → 40 y 52 → **A (59)** con el halving del **B (60)** cuando el mempool.space del dueño esté → **E (precio)** → **D (tele)** → el resto de 42–56. Cada campamento sigue la «Definición de terminado» y, sin CI, la verificación local completa.

## Quién revisa (decidido con el dueño, 24 nov 2026)
Para gastar menos tokens: **Opus implementa, Sonnet revisa, Fable solo diseña arte nuevo.** La revisión de cada campamento (hecha por un agente Sonnet, o por el agente principal si es Sonnet) comprueba, sin repetir la suite entera de `test_ui` que ya corrió el implementador: (1) lectura del diff contra las reglas de `CLAUDE.md` (CSP sin estilos en línea, solo transform/opacity, una animación solo corre si su pieza se ve, `fueraDeTemporada`, topes de nodos, voz del lector, privacidad, la app informa y no recomienda); (2) las comprobaciones rápidas: `test_lib`, `tsc`, Biome, recorte, ruff/mypy, `test_api`, el bloque nuevo de `test_ui`, el banco y la comprobación de que ningún trazo contiene `NaN`; (3) los registros completos de las tres partes de `test_ui` que pega el implementador (que estén completos y en verde) y las capturas reales; (4) un informe corto con hallazgos y qué queda sin probar. Si el revisor encuentra algo, vuelve a Opus con el hallazgo concreto.
