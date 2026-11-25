# Campamento D · La pantalla grande a 1920×1080 (25 nov 2026)

Parte **D** del diseño de Fable («Diseño A–F», [39-50-decisiones-diseno.md](39-50-decisiones-diseno.md)), aprobada por el dueño. **Aclaración del dueño (25 nov 2026): no es una tele, es su monitor de casa de 1920×1080.** Lo usa con la app normal en una ventana (unos 1920×950 con las barras del navegador), a pantalla completa (1920×1080) y con el modo pantalla grande (`#tv`). Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md).

## Cómo se veía antes (medido a 1920×1080, mil compras y los escenarios `hoy`, `medio`, `anio`, `mil`, `ballena` y `milbtc`)
- **Pantalla grande**: los rótulos de la montaña medían **14–16 px**, que no se leen a 3 m. Había datos que de lejos son ruido: «Coinbase · hace 20 s», la mini línea junto a la ganancia y «ya se realizaron…». El pueblo quedaba chico en la esquina (los osos medían unos 30–36 px de alto, en una franja de 520 px de 1920). Tenía **41–47 animaciones a la vista de noche** y 37 en una tarde de lluvia, sin un tope propio. Mientras la tele dormía, la escena tapada seguía animando 30 cosas. El saldo y la cabecera no se movían en todo el día.
- **La app a 1920×1080**: con un saldo de 8 cifras (`mil`), «sats» rozaba la ladera (6 muestras dentro de los 8 px de aire: el «Hallazgo» de [24-pulido-final-a-tele.md](24-pulido-final-a-tele.md)). A 1920×950 cabía justo. El pueblo, igual de chico.
- Nodos de la escena: 705–921 según el escenario (tope de pantallas anchas: 1100).

## Lo hecho
- **Rótulos a 26 px en la pantalla grande** (desde 1600 px de ancho): `--rotulo-k: 1.625` en `styles.css`. `montana.js: etiquetar` lo lee y sus cajas crecen con el texto (ancho, alto y línea base de los campamentos, de la siguiente etapa, de «Tú»/«Vamos aquí» y del eco). Con `kr = 1` las cajas son las de siempre: la app no cambia. El eco («hace 1 año») va a 19.5 px.
- **El saldo, un obstáculo para los rótulos en la tele**: con 26 px, «Vamos aquí» entraba en el aire del saldo (`medio`, `mil`, `ballena`). Ahora `etiquetar` mide la cifra y su unidad (sin la deriva) y los rótulos les dejan **20 px** (8 de la regla y 12 de la deriva); el rótulo se va a otro rincón. Lo decidí yo: preferí apartar el rótulo antes que estrechar más la columna del saldo. Con `mil`, el rótulo de la siguiente etapa (60M) ya no cabe y no sale (de 6 rótulos pasa a 5). El resto conserva los suyos.
- **Dos datos menos en la tele** (desde 1600 px): sin «Coinbase · hace…» mientras el precio está vivo (si se queda viejo o no llega, su aviso sí se ve), sin la mini línea y sin lo ya realizado. Se quedan el saldo, «valen», la ganancia, el último movimiento, el reloj, el precio y «vs ayer».
- **El pueblo más grande**: `--pueblo-k` → `arte-pueblo.js: sitiosPueblo({ escala })` multiplica la escala del pueblo y el ancho que puede ocupar. Son las mismas piezas y menos casas, en el mismo hueco entre el borde y la salida del sendero. **×1.35 en la tele y ×1.2 en la app desde 1800 px.** El llano, el primer plano y el teleférico siguen a su escala (`pb.u0`). Los vecinos, los animales, la iglesia y los cohetes (vía `sit.k`) siguen al pueblo.
- **Tope propio de 24 animaciones en la pantalla grande** (`html[data-tv]`, solo CSS): quietos las estrellas, el reflejo del lago y el papel picado; fuera el humo de cada farol, las luciérnagas salvo dos y las gotas de la lluvia salvo seis. **Mientras la tele duerme (23:00–5:00), la escena se pausa** (`animation-play-state: paused`). La fiesta de un hito (unos segundos) va aparte, como en el teléfono.
- **Deriva contra el quemado** (solo en `#tv`): `lib.derivaTele(ms)` da nueve sitios, **hasta 12 px a los lados y hacia abajo**. Cambia a las :05:20, :15:20…, a mitad del marco de la historia, que tapa la pantalla. `tv.js: derivar` pone `--tv-dx`/`--tv-dy` y el CSS corre la cabecera y el saldo con `translate` (dos elementos HTML, sin transición). Las tarjetas se recolocan solas porque miden el saldo. `pintar.js: bajoSaldo` descuenta la deriva al medir el techo: correrse no redibuja la montaña.
- **La app de 1600 a 2399 px usa la columna del saldo de la tele** (`width: min(40%, var(--medio-ancho))`). Con `mil` a 1920, la cifra baja de 110 a 92 px y «sats» ya no roza la ladera. Resuelve el Hallazgo para el monitor del dueño; **de 1100 a 1599 sigue pendiente de su decisión**.
- **La fiesta a la derecha de la cumbre en la pantalla grande**: ya lo hacía el campamento 59 (`fiestaDelHito({ tv: enTV() })`). No se tocó.

## Decidido por mí (con su motivo; el dueño puede cambiarlo)
- **×1.35 y no ×1.5 en la tele.** A ×1.5, en el hueco de unos 550 px entre el borde y la salida solo cabían la iglesia, la plaza y **una** casa delante (más tres detrás): ya no se leía como pueblo. A ×1.35 caben dos delante y tres detrás. Los osos pasan de unos 36 a 48 px de alto (a ×1.5, 54). Medido en `medio`: los nodos de la escena bajan de 754 a 744 (menos casas). Las capturas de ×1, ×1.25, ×1.35 y ×1.5 están en el scratchpad (`cd/pueblo/`).
- **×1.2 en la app desde 1800 px**, porque en el escritorio se mira más cerca: los osos de la app a 1920 pasan de 36 a 43 px. También vale a 2560.
- **La deriva no sube**: hacia arriba, la cabecera (el precio) se salía del borde de la pantalla y el reloj dejaba de ir en su fila (lo vio la prueba 21B·15).
- **Solo desde 1600 px** los rótulos y los dos datos menos: es la pantalla grande a 1080p; por debajo (1280, 1366, 1024) la tele sigue como estaba.
- **Sin D1** (componer a 1080p y escalar entera por encima de 1920): el monitor es de 1080p y no estaba en el encargo. Quedó fuera.
- **Sin las tarjetas al 85 % tras 30 min y sin «Último bloque»** (D5 y D6 de Fable): no estaban en lo decidido.

## Medido después (1920×1080; la misma medida del saldo que `test_ui`)
- El saldo contra la montaña: **0 choques** en la tele (los seis escenarios, dueño y lectora, de día y de noche, y en los nueve sitios de la deriva: 126 combinaciones). En la tele de 1366×768, 1280×720, 2560×1440, 3840×2160, 1080×1920 y 1024×768 con `hoy`, `medio`, `mil` y `ballena`: 270 combinaciones, 0 choques. En la app a 1920×1080 y 1920×950, 0 choques (antes, 1 con `mil`).
- Rótulos de la tele: 26 px (antes 14–16).
- Animaciones a la vista en la tele (banco, mil compras): día 15, anochecer 20, noche 17, tarde de lluvia 19, noche de lluvia 15, Nochebuena a la cena 21, Nochebuena 17; tope 24. Antes: 19 de día y 41–47 de noche. Dormida: 0.
- Nodos: la tele a 1920 con `medio`, 754 → 744; con `mil`, 919 → 908; Nochebuena en el banco, 990. La app a 1920 con `mil`, 921 → 909. Ninguno nuevo; el teléfono no cambia (nada de esto aplica por debajo de 1600 px).

## Pruebas
- `test_ui`: bloque nuevo «campamento D: la pantalla grande a 1920×1080» (rótulos ≥ 26 px, dos datos menos con el precio a la vista, `--pueblo-k`, el saldo en las cuatro esquinas de la deriva, ≤ 24 animaciones de noche, 0 mientras duerme). `saldoLibre` subió al nivel de arriba para compartirla. En el bloque «tele: el saldo contra la montaña», `APP` suma 1920×1080 y 1920×950.
- `test_lib`: `derivaTele` (cambia a las :05:20 con el marco a la vista, se queda diez minutos, nueve sitios, nunca hacia arriba).
- Banco: casos `tele …` a 1920×1080 con `#tv` (`TOPE_TV = 24`) y la app a 1920×1080 en `ANCHOS`.

## Sin probar aquí
- El monitor real del dueño con su Chrome o Edge y su escala de Windows. Se probaron los anchos en px, no su navegador.
- Safari/WebKit en pantalla grande.
- Una noche entera con la tele dormida y despertando. Las pruebas fijan la hora con `libro.hora`.
