# Campamento 39b · El tempo (F1 y F2 del diseño de Fable)

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Decisiones: [39–50 · decisiones de diseño](39-50-decisiones-diseno.md) (F y la duda 3). El diseño: sección «F · El tempo» de `docs/pulido-visual/vida-del-valle/diseno-24nov/diseno-celebracion-nodo-miles.html`. Antes: [30](30-hacer-sitio.md) (el banco), [38b](38b-pulido-integral.md) (nada corre escondido), [39](39-hacer-sitio-2.md) y [41](41-la-navidad-entera.md).

**Número**: el plan ya usa el 42 para «Fiestas: el resto del año» ([plan](39-50-la-vida-del-valle-plan.md), «Orden recomendado»), así que este va como **39b** (F1 y F2 se hacen después del 39 y del 41 y antes del 51).

## Lo hecho (24 nov 2026)
El dueño sintió que la viveza era muy corta para el estilo de la app: 46 de 75 animaciones de una sola vez duraban menos de un segundo y los personajes se movían con ritmo de botón. **Mismos elementos, más despacio: 0 nodos y 0 animaciones nuevas** (solo duraciones, pausas dentro del ciclo y curvas).

- **Tres tempos con nombre** en `:root` (`styles.css`): `--t-gesto: 1.6s` (un personaje hace algo corto, 1.2–2.5 s), `--t-accion: 6s` (algo con principio y final, 4–10 s), `--t-ambiente: 16s` (lo que respira, 12–60 s), y dos curvas: `--t-suave` (entra y sale despacio) y `--t-sale` (frena al final). Cada animación de la tabla toma el suyo con su factor (`calc(var(--t-ambiente) * 0.75)` = 12 s): así se lee de qué familia es y la prueba ve el valor resuelto.
- **La interfaz no los usa** y conserva su tempo rápido (diálogos, filas de la lista, cambio de gráfico, pestañas, «cargando», foco, pulsado, el banderín que se agita al anotar, la nota que suena). **Ninguna transición cambió.**
- **La subida de «Tú» al anotar sigue en 1.4 s** con su paso de 0.32 s (`MS_SUBIDA`; duda 3: decidido con el dueño, no 2.4 s). Lo que la acompaña al llegar (brasas, la cifra, el saltito, la bandera, el cometa) sí va al tempo nuevo. **«Tú» andando por su cuenta** (al abrir y en la película) lleva un paso más tranquilo, 0.55 s (`#m-yo.anda.sola`); la subida al abrir sigue en 2.4 s.
- **La tarjeta del hito dura más y se cierra con un toque** (`celebracion.js: cerrarConUnToque`): el primer toque o tecla en cualquier sitio la cierra (y sigue a lo suyo: la tarjeta no recibe toques). Lo que celebra la montaña (`#m-fx`) no se corta: se retira solo, como siempre.
- **F2 · acciones con principio y final** (mismos `<svg>` pequeños, mismos nodos, otros fotogramas clave; siguen a saltos, `steps(1)`, como se decidió en el 37):
  - **La pelota** hace una jugada de 9 s: tres botes cada vez más bajos, rueda hacia un osezno, sube a sus manos, vuelve a su sitio y espera. *El osezno no se mueve* (se mueve solo la capa de la pelota: animarlo pediría otra capa).
  - **La que barre** da tres pasadas de 1.44 s y descansa 2.9 s (ciclo de 7.2 s; antes, un vaivén pegado de 1.2 s).
  - **Las gallinas** pican dos veces, levantan la cabeza y descansan (3.6 s; antes 2.4).
  - **El humo del fogón** sale en tres bocanadas seguidas (cada una 8 s, a 2 s la una de la otra) y para 4 s (ciclo de 16 s; antes una bocanada cada 6.6 s, sin pausa). En el teléfono sigue a pasos, al mismo ritmo de repintado (`steps(60)` en 16 s, antes `steps(30)` en 6.6 s).
  - **Los de la cumbre se estiran en 6 s** (uno tras otro cada 0.6 s; antes 2.6 s), en el mismo primer minuto de cada cinco de 7:00 a 8:00.
  - **La onda del lago** se abre en 7.8 s y descansa 4.2 s (ciclo de 12 s); **el saludo** de la bienvenida saluda, se detiene con el brazo arriba y vuelve a saludar (3.2 s); **el que brinda** alza el vaso y descansa (3.2 s).
- **Los temporizadores de JS van a la par** (`montana.js: llegar`, `cometa`, `epico`, `brasas`, la moneda, el estirarse; `celebracion.js`; `pintar.js`): cada pieza se retira después de que acabe su animación al tempo nuevo; la tarjeta dura lo que su animación (`MS_TARJETA`); la escena no se redibuja en mitad de la celebración de 1 BTC (`ocupadaHasta`: 11 s después de llegar; antes 7); «Probar la celebración» espera lo que dura cada nivel (1 BTC 12 s, hito 7.5, etapa 6, intermedia 4.8).
- **La fase se conserva**: los retrasos negativos (nubes, piscuchas, papel picado, gallinas, el farol) se escalaron con su duración, para que al abrir cada cosa esté donde estaba.

### La tabla (antes → después)
Duraciones resueltas por el navegador; la prueba nueva fija cada fila. Entre paréntesis, la familia.

| Animación | Antes | Después |
|---|---|---|
| **Ambiente** | | |
| Nubes (tres) | 170 · 230 · 200 s | **110 · 150 · 130 s** (más deprisa: que se note que pasan) |
| «Tú» respira · el eco respira | 2.4 · 5 s | 4.8 · 8 s |
| Banderín de un campamento alcanzado (y el de la entrada) | 2.6 s | 5.2 s |
| La luz del farol respira | 5.2 s | 9 s |
| Onda del lago · brillo de la luna en el lago | 7 · 5 s | 12 s (con pausa) · 9 s |
| Piscuchas (tres ritmos) | 5.2 · 6.3 · 4.6 s | 10 · 13 · 9 s |
| Humo del fogón (dos chimeneas) | 6.6 · 7.4 s | 16 · 18 s (tres bocanadas y pausa) |
| Remo del pescador (amanecer) | 2.6 s | 4.2 s |
| Papel picado (pares · impares) | 3.4 · 2.9 s | 6.5 · 5.6 s |
| **Personajes (gesto y acción)** | | |
| Osos de la cumbre: saltito (y sus pies) | 0.9 s | 1.8 s |
| Osos de la cumbre: se estiran | 2.6 s | 6 s |
| El saludo de la bienvenida | 1.2 s | 3.2 s (vaivén y pausa) |
| «Tú» festeja al cruzar una etapa | 1.2 s | 2 s |
| «Tú» anda por su cuenta (al abrir, película) | 0.32 s | 0.55 s |
| Gallinas | 2.4 s | 3.6 s (pican dos veces y levantan la cabeza) |
| La que barre | 1.2 s | 7.2 s (tres pasadas y descansa) |
| La pelota | 1.2 s en bucle | 9 s (una jugada) |
| El que brinda · el volcancito que chispea (41) | 1.6 · 0.9 s | 3.2 · 1.8 s |
| **Fiesta** | | |
| Cohete: sube y estalla · chispa (y la del segundo volcancito) | 3.4 · 1.25 (1.4) s | 5.4 · 2.2 (2.5) s |
| **Celebración** | | |
| Tarjeta del hito: ligera · etapa · hito grande | 1.7 · 2 · 2.6 s | 2.6 · 3.5 · 4.5 s (se cierra con un toque) |
| Lacre que cae · su destello | 0.62 · 0.7 s | 1.1 · 1.4 s |
| Sello de la semana: se estampa · el golpe | 0.5 · 0.6 s | 0.9 · 1 s |
| Anillos · brasas (en JS: 0.9–1.6 s) · la cifra «+N sats» | 1.4 · 1.2 · 1.7 s | 2.4 · 2 (1.5–2.7) · 2.6 s |
| El cielo respira · amanece | 2 · 2.8 s | 4 · 4.5 s |
| Cometa · luz de la cima · aurora épica · gotas de luz | 1.9 · 2.8 · 6 · 1.9 s | 3.2 · 4.5 · 9 · 3.2 s |
| La bandera se iza: mástil · banderín · farol | 0.6 · 0.8 · 1.3 s | 1.2 · 1.6 · 2.2 s |
| La bandera plantada se apaga · la estela se apaga · el pino nuevo | 3.2 · 0.9 · 0.9 s | 5 · 1.5 · 1.5 s |
| Moneda de la luna (gira y brilla) · moneda que se hunde en el lago | 1.6 · 1.7 s | 2.6 · 2.6 s |
| **Entrada** (commit aparte, para medirlo) | | |
| La escena se asienta · el resplandor se enciende · «Tú» aparece | 1.2 · 1.6 · 0.6 s | 2 · 2.6 · 1 s |
| Fundido de la app instalada | 0.45 s | 0.9 s |

**Igual** (ya están en su tempo o responden a tu dedo): estrellas (4.2–8.5 s), estrellas fugaces, niebla (80–110 s), torogoz (52 s y su aleteo de 1.9 s), llama del farol (1.1 s), aurora (18–29 s), llovizna y gotas, pétalos, luciérnagas, el pino de Navidad que parpadea, el cayuco a la deriva, las bandadas, los zompopos, el relámpago, la corona de «Tú», el teleférico (240 s), el perro (22 s), el paso de «Tú» al anotar (0.32 s) y la subida (1.4 s), el banderín que se agita al anotar (0.42 s × 4), el destello del anillo del tramo, la cifra bonita, los adornos de «Tu historia» y de la tele (la tele es del campamento D), el logo al abrir, la película (el bosque brota con el deslizador) y **toda la interfaz** (diálogos 0.22–0.24 s, filas 0.3–0.35 s, gráfico 0.28–0.35 s, tarjetas 0.5 s, semanas 0.45 s, «cargando», el comprobante, las cartas y las piedritas que caen).

## Decidido (no se vuelve a preguntar)
- La subida al anotar no se alarga (duda 3). El tempo largo es para lo ambiental, los personajes, las fiestas y la celebración.
- La interfaz no usa `--t-…`; una animación nueva de la escena elige su tempo con nombre.
- La tarjeta del hito se cierra con cualquier toque o tecla; la celebración de la montaña no se corta.
- Las acciones del pueblo siguen a saltos (`steps(1)`) en su capa; solo cambian sus fotogramas clave.
- Diferencias con la tabla de Fable, a propósito: el cohete va a **5.4 s** (no 5.5; un factor exacto de `--t-accion`), la que barre a **7.2 s** por ciclo (tres pasadas de 1.44 s y su descanso: los 2.8 s de la tabla, leídos como una ida y vuelta), **la subida al anotar 1.4 s** (no 2.4, por la duda 3) y el paso de «Tú» al anotar, el de siempre.

## Lo que puede no verse bien (avisado)
- **La pelota**: el osezno que «la recoge» no se mueve; la pelota sube un instante a sus manos y vuelve a su sitio a saltos. Si se lee raro, el siguiente paso es otra capa para el osezno (en el 49, con el director del 51).
- **Las nubes a 110–150 s** se notan pasar (~3 px/s a 390 px); si el dueño las siente inquietas, volver a 170 s es cambiar un factor.
- **El humo** son bocanadas más grandes y lentas; en el teléfono va a pasos (como antes) y su pausa de 4 s deja la chimenea quieta un rato.
- **La tarjeta de 1 BTC** sigue apagándose a los 4.5 s y se queda escondida hasta los 6 s antes de la siguiente (como antes, en proporción).

## Para que no vuelva a pasar
Bloque «campamento 39b: el tempo» de `test_ui`: fija las 61 duraciones de la tabla (resueltas en el navegador), comprueba 18 de la interfaz (y el paso de «Tú» al anotar) como estaban, que los tempos solo estén en esas reglas y en ninguna transición, que nada lleve `NaN`, que la subida al anotar dure lo de siempre (~1.4 s, sin el paso lento) y que la tarjeta se cierre con un toque. Al día: el humo y las piscuchas del 22 y el estirarse de 6 s del 33.

## Verificado (24 nov 2026, en local, sin CI)
- `test_ui` entero en sus tres partes, una tras otra: **754 + 743 + 934** comprobaciones (71 bloques). La primera corrida de la parte 3 cayó en «luna-moneda: vuelve a ser luna» (la prueba esperaba 2 s y la moneda gira ahora 2.6): se ajustó la espera a 3 s y la parte 3 entera volvió a pasar.
- `test_lib` 992, `test_api` 1314 (con el disco simulado sano), `tsc`, Biome (0 avisos), recorte, ruff y mypy (los del CI): en verde.
- axe: 336 estados, sin violaciones. Barrido `rapido` (112) y por pestañas (448): en orden.
- **El banco**: los mismos nodos en los 16 casos (día 827, Nochebuena 899, con cohetes 938, 1440/2560 hasta 979) y las mismas animaciones a la vista por capa, salvo «Nochebuena, cena» (38 → 36 en la principal: las bocanadas de humo en su pausa tienen opacidad 0 en el instante medido y el banco no las cuenta; no es una animación menos). Dentro de los topes.
- **Lighthouse móvil A/B**, alternando con `claude/vida-41` en el mismo momento: la app, medianas **71 · 74 · 73** contra **68 · 70 · 69**; la entrada, 97–98 contra 92–97. Accesibilidad y buenas prácticas, 100. La entrada más lenta no bajó la medida (ruido del sandbox; lo que manda es el CI).
- Regresión visual contra `claude/vida-41`: las 15 capturas iguales (0.00 %, una 0.11 %): la fase de cada animación se conservó.
- Capturas a 390 y 1440 px, a mediodía y a las 21:00: nada roto, ningún `NaN` en trazos ni estilos. «Qué hay de nuevo» (`2026-12-i`, resume también la Navidad del 41) cabe entero en 360×640.

## Sin probar aquí
- **iPhone real**: si anotar se siente igual de ágil (debe: la subida no cambió) y si lo ambiental ya no se siente corto; la pelota y la que barre de cerca; «Medir este aparato» de día y de noche (las animaciones son las mismas: no debería cambiar).
- Safari/WebKit de verdad (en el sandbox, WebKitGTK sin GPU).
