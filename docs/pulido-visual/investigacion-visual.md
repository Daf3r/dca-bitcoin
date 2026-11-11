# Libro DCA — Investigación para la pasada final de pulido visual

> **Nota (11 nov 2026).** Este informe lo preparó un agente de investigación por encargo del dueño para la pasada final de pulido visual (ver `CLAUDE.md`, «Pulido visual al final»). En esta carpeta quedan el prototipo del cielo en shader (`prototipo-cielo-gl.js`, que **no está conectado a la app**) y dos capturas. Las pruebas de CSP y de librerías que cita (`csp/`, `npmtest/`) y el resto de capturas se hicieron en el espacio temporal de la sesión y **no están en el repo**: el informe dice cómo reproducirlas (Apéndice B). Cifras medidas en Chrome 153; **WebKit/iPhone y GPU real no se probaron** (§8).


Fecha: 2026-11-11. Autor: investigación de diseño/front-end (solo lectura del repo; nada del repositorio fue modificado).
Todo lo medido o probado por mí está marcado **[MEDIDO]** o **[PROBADO]**. Lo que viene de fuentes web está citado con URL. Lo que viene de mi memoria y no pude verificar está marcado **[NO VERIFICADO]**.

Archivos de evidencia (en el scratchpad, fuera del repo):
- Capturas de la app actual (servidor de pruebas, escenario `anio`, Chrome 153): `app-actual-movil-4h.png` (noche, día, atardecer, amanecer a 390×844), `.../actual/noche-pc.png` (1366×768), `.../actual/noche-abajo.png` (cuerpo de la página).
- Prototipo de cielo en shader: `prototipo-cielo-gl.js` y captura `.../cielo/sky-todos.png` (noche, amanecer, día, atardecer).
- Pruebas de CSP y de librerías: `.../scratchpad/csp/` y `.../scratchpad/npmtest/` (con `medir.mjs` y `web/`).

---

## Resumen ejecutivo

1. **Diagnóstico**: lo que el dueño siente «mejorable» en los «climas» tiene causas concretas y baratas de arreglar. El cielo son **5 rectángulos planos con bordes duros** (`montana.js:112`), el halo del sol/luna es un **disco plano de borde duro** (`montana.js:117-118`), las nubes son **3 elipses apiladas** (`montana.js:42`), el lago una elipse lisa y la montaña un polígono de dos tonos sin luz direccional ni perspectiva atmosférica. Se ve «clip-art vectorial», no «atardecer». El concepto, la tipografía, el sendero y el naranja sí funcionan.
2. **Lo que más impacto da con menos riesgo** (sin ninguna librería): (a) cielo con degradado continuo (SVG `linearGradient` o un shader) con dithering; (b) halos y luz con `radialGradient`; (c) montañas con degradado de luz hacia el astro y **perspectiva atmosférica** (cada capa se funde hacia el color del horizonte); (d) grano estático en un PNG (los `data:` están bloqueados por la CSP **[PROBADO]**).
3. **Cielo en shader (WebGL crudo)** es viable sin librerías: mi prototipo pesa **3.7 KB sin comprimir / 1.9 KB gzip**, funciona bajo la CSP actual **[PROBADO en Chrome 153]** y produce degradado continuo, halo físico-inspirado, nubes con borde iluminado, estrellas y dithering (ver `sky-todos.png`). Es la mejora visual más grande por byte. Rendimiento real en GPU de teléfono: **no medido** (el sandbox usa SwiftShader).
4. **Animación**: no hace falta GSAP ni Motion. Con CSS moderno + WAAPI + un `anim.js` propio (~1–2 KB: resortes → `linear()`, orquestación sencilla) se cubre todo. Todas las librerías ligeras probadas (GSAP, Motion, anime.js v4, lottie-web light, uPlot, canvas-confetti sin worker, auto-animate) **funcionan bajo la CSP estricta actual** **[PROBADO]**; **Lottie-wasm (dotLottie) y Rive NO** (WebAssembly bloqueado, y pesan 350–490 KB gz de wasm). Si se quiere un resorte/timeline de librería: `motion/mini` (3.2 KB gz **[MEDIDO]**) o `animejs` (12.5 KB gz **[MEDIDO]**), vendorizados.
5. **Arquitectura**: **no introducir un build para el proyecto**. Mantener ESM sin build y, si se necesita alguna librería, **vendorizarla ya empaquetada con esbuild una sola vez** (archivo ESM único con versión exacta y su licencia, commit al repo). Un build completo (Vite) obliga a rehacer el versionado `?v=hash` del servidor, el Dockerfile y las pruebas; no se justifica para este tamaño.
6. **Dirección de arte recomendada**: «**Hora dorada**» (oscuro cálido + dorado, mantiene la identidad actual) usando la técnica de «**Cielo vivo**» (cielo atmosférico por shader, capas con luz y niebla) y el grano de «**Cuaderno de montaña**» en modo claro. Paletas en OKLCH con contrastes calculados en §4.
7. **Plan**: Fase 0 línea base de medición → Fase 1 «arreglos de bajo riesgo» (gradientes, halos, perspectiva atmosférica, cabecera) → Fase 2 tokens OKLCH/superficies/grano → Fase 3 cielo en shader con respaldo SVG → Fase 4 capa de animación (scroll-driven, `@starting-style`, resortes, partículas de luz) → Fase 5 gráficos → Fase 6 auditoría de rendimiento/accesibilidad.
8. **Trampas principales**: contraste del texto sobre un cielo con nubes (axe no puede medir un `<canvas>`; hay que medir píxeles), tope de **30 fps de iOS en modo bajo consumo** para rAF, CSS y WAAPI **[fuentes WebKit]**, pérdida de contexto WebGL en iOS, `backdrop-filter` en Safari, y la prueba de regresión visual (hay que fijar el tiempo del shader).
9. **Hápticos en iPhone**: `navigator.vibrate` no existe en iOS; el truco del `<input type="checkbox" switch>` funciona en iOS 17.4–26.4 según el README de `ios-haptics`, que **dice que Apple lo parchó en iOS 26.5** (una sola fuente; no verificado). Tratar como mejora opcional, nunca como requisito.
10. **Incertidumbres abiertas** al final del documento (§8).

---

## 0. Diagnóstico visual de lo que hay hoy

Lo vi renderizado (capturas arriba) y lo leí en el código. Hallazgos, de mayor a menor impacto:

| # | Hallazgo | Dónde | Efecto visual |
|---|---|---|---|
| 1 | El cielo son 5 `<rect>` con `fill` plano a alturas 0, .17, .31, .43, .53 de `H` | `montana.js:112`, `styles.css` (`.cielo-0…4`) | **Franjas horizontales duras**, muy visibles en amanecer/atardecer (en `movil-4.png` se ven las líneas a ~y=250 y ~y=360). Es lo que más delata «vector barato». |
| 2 | Halo del sol y la luna = `<circle>` con `fill: var(--halo)` plano | `montana.js:117-118` | Un **disco translúcido de borde nítido** alrededor del astro, en vez de resplandor suave. En la luna de la captura de PC es un círculo gris claro enorme. |
| 3 | Nubes = 3 grupos de 3 `<ellipse>` del mismo color | `montana.js:42-45` | Parecen «manchas ovaladas»; no hay borde iluminado ni forma de nube. |
| 4 | Lago = elipse plana + 4 elipses de reflejo | `montana.js:91-100` | De día/amanecer es una **elipse blanca/naranja opaca** que no refleja el cielo. |
| 5 | Sierras `lejos`/`medio` y `monte` son polígonos con `fill` plano; la cara en sombra es un segundo polígono plano | `montana.js:123-150`, `.lejos/.medio/.monte` | Sin luz direccional (el astro no ilumina la cara que mira hacia él), sin perspectiva atmosférica (las capas lejanas no se funden con el cielo), sin facetas ni textura. |
| 6 | La escena termina en corte seco contra el fondo de la página en escritorio (franja oscura bajo los pinos) | `noche-pc.png` | Transición brusca; el velo `escena::after` solo actúa con scroll. |
| 7 | El bloque de precio de arriba a la derecha llega a **4 líneas** en 390 px («1 BTC / $77,598 / 0.0% vs ayer / Coinbase · ahora mismo») y compite con el saldo | `movil-4.png` | Cabecera apretada; la jerarquía no es clara. |
| 8 | Tarjetas: `--s1` + borde `--s3`, todas iguales | `styles.css` (decenas de `.xxx { background: var(--s1); border… }`) | Cuerpo de página correcto pero plano: sin profundidad ni material. |
| 9 | Sin grano/dithering en ningún degradado | — | Cuando se haga el degradado continuo, aparecerán bandas en pantallas OLED oscuras si no hay dither. |

Lo que **ya funciona bien y hay que conservar**: el concepto de ascenso, el sendero naranja con campamentos, «Tú» con su halo, la jerarquía del saldo (odómetro, Fraunces), el naranja como color de lo «tuyo», el sistema de efectos (`data-efectos`, pausa por visibilidad), la tipografía (Fraunces + Bricolage, ambas OFL), el tono sin presión.

Datos del código: `styles.css` ≈ 109 KB, 47 `@keyframes`, `montana.js` 33 KB; el SVG de la escena se regenera por `innerHTML` en cada cambio de tamaño (ResizeObserver).

---

## 1. Animación en la web hoy (2025-2026)

### 1.1 Plataforma nativa (lo que ya no necesita librería)

| Capacidad | Estado | Fuente | Encaje aquí |
|---|---|---|---|
| **Scroll-driven animations** (`animation-timeline: scroll()/view()`) | **Baseline Newly available desde oct-2026** (Chrome 115, Safari 26, Firefox 159) | [web.dev oct-2026](https://web.dev/blog/web-platform-10-2026); [WebKit Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) | Sustituir el parallax por scroll de `parallax.js` (hoy JS + rAF escribe `--scroll-p`). Va en el compositor, mejor en iPhone. El parallax por puntero sigue en JS. Un resumen de terceros menciona correcciones de precisión en Safari 26.5 [lilting.ch](https://lilting.ch/en/articles/chrome-146-scroll-animation-safari-grid-lanes) (fuente secundaria). Usar `@supports (animation-timeline: scroll())` y dejar el JS como respaldo. |
| **View Transitions (mismo documento)** | Baseline Newly available (Firefox 144, oct-2025) | [web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available), [Chrome 2025](https://developer.chrome.com/blog/view-transitions-in-2025) | Ya se usa (`movimiento.js: conTransicion`). Ampliar a lista → detalle, apertura de la hoja, cambio de unidad. `view-transition-class` y `match-element` permiten nombrar en bloque. La variante entre documentos no está soportada en Firefox según Chrome Docs (irrelevante: la app es de una página). |
| **`@starting-style` + `transition-behavior: allow-discrete`** | Baseline Newly available con Firefox 129 (Safari 17.5) | [web.dev](https://web.dev/blog/baseline-entry-animations) | Entradas/salidas de diálogos, hoja, avisos, filas **sin los trucos `void el.offsetWidth` + clases** que usa hoy `celebracion.js`/`lista.js`. |
| **`linear()` easing** | Baseline desde dic-2023 | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear), [Smashing](https://smashingmagazine.com/2023/09/path-css-easing-linear-function) | Permite **resortes y rebotes en CSS puro** (valores > 1). Un generador de ~15 líneas de JS puede muestrear un resorte amortiguado a 30–50 puntos y escribirlo en una variable CSS. **[PROBADO]**: `element.animate(..., {easing: 'linear(0, 1.2 40%, 1)'})` funciona bajo la CSP actual. |
| **WAAPI** (`element.animate`) | Universal | — | **[PROBADO]** funciona bajo la CSP estricta (no toca el atributo `style` del HTML). Es el motor de las librerías «ligeras». |
| **`@property` / `CSS.registerProperty`** | **[PROBADO]** `CSS.registerProperty` funciona bajo la CSP. Baseline de `@property`: **[NO VERIFICADO]** (de memoria, 2024; comprobar en MDN). | — | Degradados animados (ángulo, posición) sin JS; útil para el brillo de la cumbre y los anillos. |
| **Motion path** (`offset-path`) | **[NO VERIFICADO]** | — | Posible para «Tú» siguiendo el sendero, pero el sendero ya se calcula con `getPointAtLength` y funciona; no es prioridad. |
| **Color OKLCH / `color-mix()`** | `oklch()` y `color-mix()` Baseline Widely available (2023); **sintaxis de color relativo** Baseline Newly available (2024-09) | [MDN oklch](https://developer.mozilla.org/docs/Web/CSS/color_value/oklch), [explorer](https://web-platform-dx.github.io/web-features-explorer/features/relative-color) | Tokens en OKLCH; para color relativo, mantener respaldo estático. |

**Matiz importante para iPhone**: iOS limita a **30 fps** `requestAnimationFrame` **y también animaciones CSS/WAAPI** en Modo de bajo consumo; es comportamiento intencional de WebKit ([bug 215745](https://bugs.webkit.org/show_bug.cgi?id=215745), [Motion: cuándo throttlean rAF](https://motion.dev/magazine/when-browsers-throttle-requestanimationframe)); un commit de WebKit de dic-2025 lo sigue reflejando. No encontré nada específico de PWAs instaladas. Consecuencia: diseñar movimientos que se vean bien a 30 fps (bajo pero estable), no apostar por 60/120 fps en el cielo.

### 1.2 Librerías — tamaños medidos

**Método [MEDIDO]**: `npm i` de cada paquete (versiones abajo) en una carpeta temporal y `esbuild` 0.28.2 (`bundle`, `minify`, `format=esm`, tree-shaking) para cada **punto de entrada realista**; gzip nivel 9 y brotli por defecto. Script reproducible: `.../npmtest/medir.mjs`. Los números son de **la importación mínima útil**, no del paquete completo.

| Librería (versión) | Entrada | min | **gzip** | brotli | Licencia | CSP estricta | Sin build |
|---|---|---|---|---|---|---|---|
| **motion** 14.12.0 | `motion/mini` `animate` (WAAPI) | 8.4 KB | **3.2 KB** | 2.9 KB | MIT | ✅ [PROBADO] | Hay que vendorizar (empaquetar) |
| motion | `motion/mini` + `spring` | 12.0 | **4.9 KB** | 4.5 | MIT | ✅ [PROBADO] | idem |
| motion | `animate` híbrido (x/scale/variables CSS/valores) | 70.7 | **25.9 KB** | 23.7 | MIT | ✅ [PROBADO] | idem |
| **animejs** 4.5.0 | `animate` | 31.6 | **12.5 KB** | 11.4 | MIT | ✅ [PROBADO] | idem |
| animejs | `animate`+`createTimeline`+`stagger`+`svg` | 41.2 | **16.4 KB** | 14.9 | MIT | ✅ [PROBADO] (incl. `svg.createDrawable`) | idem |
| animejs | solo `waapi` | 10.7 | **4.7 KB** | 4.3 | MIT | ✅ [PROBADO] | idem |
| animejs | `animate`+`onScroll` | 44.6 | 16.8 KB | 15.3 | MIT | no probé `onScroll` | idem |
| **gsap** 3.15.1 | núcleo | 69.5 | **27.2 KB** | 24.6 | «Standard No Charge» de Webflow (propietaria) | ✅ [PROBADO] (`x`, `opacity`, variables CSS, `DrawSVG`) | idem |
| gsap | núcleo + ScrollTrigger | 113.0 | 44.4 KB | 39.9 | idem | no probé | idem |
| gsap | núcleo + MotionPath + DrawSVG | 94.4 | 37.3 KB | 33.5 | idem | ✅ DrawSVG [PROBADO] | idem |
| **canvas-confetti** 1.9.4 | default | 10.4 | **4.2 KB** | 3.8 | ISC | ✅ **sin worker**; ❌ con `useWorker:true` (crea un worker `blob:` y `worker-src 'self'` lo bloquea) [PROBADO] | sí (es un script) |
| **@formkit/auto-animate** 0.10.2 | default | 8.4 | **3.4 KB** | 3.0 | MIT | ✅ [PROBADO] | idem |
| **uPlot** 1.6.32 | default | 50.8 | **22.6 KB** | 20.4 | MIT | ✅ crea canvas [PROBADO] | idem |
| **lottie-web** 5.13.0 | `lottie_light` (solo SVG, sin expresiones) | 168.2 | **48.0 KB** | 41.6 | MIT | ✅ SVG [PROBADO] | idem |
| lottie-web | completo | 301.7 | 77.1 KB | 64.4 | MIT | **no probado**: el build completo incluye expresiones (usan `eval`); **[NO VERIFICADO]** | — |
| **@lottiefiles/dotlottie-web** 0.82.1 | JS (sin wasm) | 56.8 | 12.5 KB | 11.1 | MIT | ❌ necesita **WebAssembly** (ver abajo) | — |
| | + `dotlottie-player.wasm` | 1,226 KB | **491 KB gz** | — | — | ❌ `WebAssembly.compile` bloqueado [PROBADO] | — |
| **@rive-app/canvas-lite** 2.50.0 | JS | 216.9 | 61.7 KB | 53.6 | MIT | ❌ wasm | — |
| | + `rive.wasm` | 859 KB | **353 KB gz** | — | — | ❌ | — |
| **@theatre/core** | core | 104.9 | 34.5 KB | 30.4 | Apache-2.0 (según [README](https://cdn.jsdelivr.net/npm/@theatre/core@0.7.2/README.md); Studio es AGPL-3) | no probé | — |
| **three** (Scene+WebGLRenderer+ShaderMaterial+Plano) | mínimo | 519.6 | **129.7 KB** | 107.0 | MIT | no probé | — |

Cifras de la documentación de Motion (contrastar): [`motion.dev/docs/animate`](https://motion.dev/docs/animate) dice mini **3.2 KB** y híbrido **22 KB**; otras páginas de Motion citan 2.3/18 KB: son versiones distintas. Mi medición con la 14.12.0 coincide con 3.2 KB para mini. La [comparativa de Motion](https://motion.dev/docs/gsap-vs-motion) (autointeresada) cita 27.29 KB para GSAP, coincide con mi 27.2 KB.

### 1.3 Licencias

- **GSAP**: desde abril 2025 es gratuita, incluidos los plugins antes de pago (SplitText, MorphSVG…), pero bajo una **licencia propietaria de Webflow** que prohíbe usarla para crear herramientas que compitan con el constructor de animaciones de Webflow, **Webflow puede cambiarla y terminarla** [licencia](https://gsap.com/community/standard-license/), [anuncio](https://webflow.com/blog/gsap-becomes-free). Para una app familiar no hay conflicto práctico, pero es código cerrado y revocable; **evitarla salvo que un plugin concreto (p. ej. MorphSVG) compense**.
- Motion, anime.js, lottie-web, dotLottie, Rive, uPlot, auto-animate: MIT (confirmado con `npm view`). canvas-confetti: ISC.

### 1.4 Compatibilidad con la CSP estricta (qué probé y qué resultó)

**[PROBADO]** con la CSP exacta de `server.py:103` (`default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'…`) servida por un servidor mínimo y ejecutada en Chrome 153 (Chrome for Testing). Safari/WebKit **no se probó**; la CSP trata el CSSOM igual en la especificación, pero no verifiqué WebKit.

| Sonda | Resultado |
|---|---|
| `el.style.opacity = …`, `el.style.setProperty('--v', …)`, **`el.style.cssText = …`** | ✅ permitido |
| `setAttribute('style', …)`, `innerHTML` con `style="…"` (HTML y SVG), `<style>` creado por JS | ❌ bloqueado |
| `new CSSStyleSheet().replaceSync()` + `adoptedStyleSheets`; `insertRule` en hoja externa | ✅ permitido |
| `element.animate()` (WAAPI), con `linear()` | ✅ |
| `CSS.registerProperty` | ✅ |
| SVG por `createElementNS`/`setAttribute` (`d`, `fill`) | ✅ |
| `Image` con URL **`data:`** | ❌ bloqueado (`img-src 'self'`) |
| `Image` con URL **`blob:`** | ❌ bloqueado |
| `Image` desde `/ruido.png` (mismo origen) | ✅ |
| `createImageBitmap(canvas)`, `drawImage(canvas)` | ✅ |
| WebGL / WebGL2 (`getContext`) | ✅ |
| `new Worker(blob:)` | ❌ bloqueado (`worker-src 'self'`); `new Worker('/w.js')` ✅ |
| `WebAssembly.compile` | ❌ bloqueado (haría falta `'wasm-unsafe-eval'` en `script-src`) |
| `eval` / `new Function` | ❌ bloqueado |
| `document.startViewTransition` | ✅ |
| `fetch` a otro origen | ❌ (`connect-src 'self'`) |

Conclusiones prácticas:
1. **Grano, sprites de nubes, texturas: deben ser archivos PNG/WebP/SVG servidos desde `/static`** (versionados). Un grano generado con canvas y asignado como `background-image: url(data:…)` o `blob:` queda bloqueado. (Sí se puede dibujar un canvas y mostrarlo como `<canvas>`.)
2. **Nada con WebAssembly** salvo que se añada `'wasm-unsafe-eval'` a `script-src` (menos estricto, y sigue sin permitir `eval`). dotLottie/Rive además pesan 350–490 KB gz de wasm → rompen el presupuesto de JS (~250 KB sin comprimir hoy).
3. Las pruebas de Playwright: `page.waitForFunction('string')` evalúa texto y **falla bajo esta CSP**; usar la forma de función (lo descubrí al probar). Ya lo deben hacer así `test_ui`, pero conviene tenerlo presente al escribir pruebas nuevas.
4. GSAP/Motion/anime.js/auto-animate/uPlot/lottie_light **no inyectan atributos `style` en HTML ni usan `eval`** en las rutas probadas.

### 1.5 Veredictos

| Opción | Veredicto |
|---|---|
| **CSS + WAAPI + `anim.js` propio** | **Recomendado**. Cubre resortes (`linear()`), secuencias, números, trazos. ~1–2 KB. |
| `motion/mini` (3.2 KB gz) | **Opcional** si se quiere resorte real con velocidad inicial y `stagger`; MIT; vendorizar. |
| `animejs` (12.5–16 KB gz) | Opcional: timelines más ricos y `svg.createDrawable`. Más pesado que lo que el proyecto necesita hoy. |
| `motion` híbrido / GSAP (26–44 KB gz) | **No**: peso y (GSAP) licencia cerrada. Solo si se quisiera morphing de trazos o físicas complejas. |
| `canvas-confetti` | **No** como tal (el tono es calmo; mejor «luz» propia en canvas 2D con 30–60 partículas). Si se usa: `useWorker:false`. |
| Lottie (`lottie_light`) | Solo con un diseñador que entregue animaciones. 48 KB gz; sin pipeline de diseño no tiene sentido. |
| dotLottie / Rive | **No**: wasm bloqueado por CSP y peso. |
| Theatre.js | **No**: sobredimensionado. |
| auto-animate (3.4 KB gz) | **Opcional** para altas/bajas de filas; ya hay entrada/salida propia en `lista.js`. |
| uPlot / Chart.js / D3 | **No**: los gráficos propios en SVG dan control de diseño; uPlot solo si algún día hubiera decenas de miles de puntos (el histórico se decima al ancho). |

---

## 2. Cielo, clima y paisaje

### 2.1 Comparación de enfoques

| Enfoque | Calidad posible | Coste | CSP | Riesgo | Veredicto |
|---|---|---|---|---|---|
| **A. SVG + CSS (actual)** mejorado: `linearGradient`/`radialGradient`, capas con degradado, niebla en degradado, nubes como `<path>` suaves o sprites PNG | Media-alta si se hace bien | Casi nulo en JS; SVG se regenera con `innerHTML` (ya es así) | ✅ | Bajo | **Fase 1** (arreglo rápido y también el **respaldo** del shader) |
| **B. Canvas 2D** (cielo/estrellas/partículas) | Media-alta (degradados, `createRadialGradient`, nubes por «puffs» alfa) | CPU; cuidado con DPR y reasignar el backing store (informes de fugas en iOS al redimensionar) | ✅ | Medio | Para **partículas** (luciérnagas, luz) sí; para el cielo, peor que B’ |
| **B’. WebGL crudo (un triángulo + shader de fragmentos)** | **Alta**: degradado continuo sin bandas, halos físicos, nubes fbm con luz, estrellas, aurora | GPU; baja si se renderiza a media resolución y a 30 fps o **se «hornea»** (ver 2.3) | ✅ [PROBADO] | Medio (contexto perdido en iOS, contraste) | **Fase 3**, con respaldo SVG |
| C. three.js (Sky de Preetham/Hosek) | Alta | **130 KB gz** mínimo [MEDIDO] | no probé | Alto | **No**: desproporcionado |
| D. Vídeo/Lottie/Rive | — | wasm bloqueado / peso | ❌ | — | **No** |

### 2.2 Qué es viable SIN librería (y lo que pesa)

**Prototipo construido [MEDIDO/PROBADO]**: `prototipo-cielo-gl.js` (código completo en el Apéndice A). WebGL 1, **un solo triángulo** que cubre la pantalla, 4 octavas de fbm, sin texturas. Pesa **3,733 B sin comprimir / 1,874 B gzip**. Usa los **mismos 5 colores por franja de `cielo.js`** (así reutiliza la lógica de mezcla de horas) y añade: degradado continuo (adiós a las franjas), halo ancho + núcleo con caída exponencial (aproxima la dispersión hacia delante), disco del astro con borde suave, **nubes fbm con warp de dominio y borde iluminado hacia el astro**, estrellas puntuales con titileo, y **dithering** (ruido ±0.75/255) que impide bandas. Renderizado de `sky-todos.png` a 390×700 con SwiftShader (WebGL2 del navegador de pruebas; el shader es GLSL ES 1.00): sale sin errores de compilación ni violaciones de CSP.

Lo que **no** está resuelto en el prototipo (honestidad): las nubes cubren demasiado (hay que bajar `cobertura` y enmascarar la zona del saldo); el corte horizontal en y≈0.7 es visible (hay que fundir con las sierras, que las dibuja el SVG encima); la hora usa `T` arbitrario; no hay aurora/niebla/luz sobre montañas; **no medí ms por frame en GPU real**.

Estimación de coste (razonamiento, no medición): ≈ 4 octavas × 3 llamadas a fbm por píxel ≈ 12–15 lecturas de ruido + ~40 ALU. A **½ resolución en x e y (¼ de píxeles)** y 30 fps es un coste bajo para cualquier GPU de teléfono de los últimos años, pero hay que medirlo en un Android modesto y en un iPhone antiguo (ver §6).

**Receta de coste mínimo («horneado») — recomendada**: el cielo cambia muy despacio (la paleta se mezcla en ventanas de 30–60 min y la app recalcula cada 5 min). Entonces:
1. Renderizar el shader **una sola vez** al cargar y cada 5 min (o al cambiar de tamaño) → un fotograma estático. Coste continuo ≈ 0.
2. Las **nubes** como una **segunda capa** (otro canvas transparente o el mismo shader con modo «solo nubes» renderizado una vez a un canvas más ancho que la pantalla) que se **desplaza con `transform: translateX` en CSS** (compositor, cero JS por frame). Así «hay nubes que se mueven» sin ejecutar el shader en cada frame.
3. Estrellas: las que titilan pueden seguir siendo SVG/CSS (como hoy) o un pequeño canvas 2D; la fugaz sigue en CSS.
4. Con `data-efectos="esenciales"` o `"ninguno"` o `data-ligero`: un solo fotograma, **sin bucle**; con WebGL no disponible: el cielo SVG de la Fase 1.
5. Pausar con los atributos ya existentes (`data-oculta`, `data-escena-fuera`).

**Fallos de WebGL en iOS** (ver §7): manejar `webglcontextlost` (`preventDefault()`) y `webglcontextrestored` re-creando recursos; probar tras ir a segundo plano.

### 2.3 Cómo se logra el aspecto (técnicas y referencias)

- **Degradados atmosféricos y «hora dorada»**: no hace falta física completa; un **LUT de colores por elevación solar** (lo que ya es `cielo.js`) ya da «la paleta correcta». Para darle realismo se añaden tres efectos baratos: (i) **neblina de horizonte** (el cielo se aclara y desatura hacia el horizonte); (ii) **resplandor hacia delante** alrededor del astro (la función de fase de Henyey-Greenstein se aproxima con `exp(-r·k)`, como en el prototipo); (iii) **enrojecimiento por extinción de Rayleigh** cuando el sol está bajo: atenuar canales con `exp(-β·masaDeAire)` con β ∝ λ⁻⁴ (rojo ≪ azul) **[NO VERIFICADO: los coeficientes β_R ≈ (5.8, 13.5, 33.1)·10⁻⁶ m⁻¹ son de memoria; comprobar en Scratchapixel/Nishita antes de usarlos]**. Para esta app basta con **interpolar la paleta**, no resolver la ecuación.
- **Three.js Sky** implementa un modelo analítico físico-inspirado con uniformes de turbidez, Rayleigh, Mie y posición del sol [docs/guía](https://threejsresources.com/guides/sky-and-clouds), [tutorial](https://mam-mam.net/en/javascript/three_js_sky.html); la variante precomputada de Bruneton está portada a three.js [repo](https://github.com/jeantimex/precomputed_atmospheric_scattering). Ambas son **mucho más pesadas** de lo que esta escena necesita (y el modelo físico está pensado para cielos realistas, no estilizados).
- **Nubes**: la técnica clásica es **fbm** (ruido fractal) con umbral para controlar la cobertura y movimiento por octavas con velocidades distintas — [Inigo Quilez, «dynamic clouds»](https://iquilezles.org/articles/dynclouds); [The Book of Shaders, cap. 13 (fBm)](https://thebookofshaders.com/13/). Para nubes volumétricas de juegos AAA (con raymarching) la referencia es [Horizon Zero Dawn: Real-time Volumetric Cloudscapes](https://www.advances.realtimerendering.com/s2015/The%20Real-time%20Volumetric%20Cloudscapes%20of%20Horizon%20-%20Zero%20Dawn%20-%20ARTR.pdf) y un tutorial práctico [Maxime Heckel](https://blog.maximeheckel.com/posts/real-time-cloudscapes-with-volumetric-raymarching/). **No hace falta volumétrico**: la escena es estilizada y a 30 fps en móvil; fbm 2D con borde iluminado basta (el prototipo lo demuestra).
- **Aurora**: la referencia de Shadertoy es «Auroras» de nimitz (ruido triangular `triNoise2d` + raymarching corto); hay portes comentados a Godot/Unity [Godot Shaders: Aurora sky shader](https://godotshaders.com/shader/aurora-sky-shader/), [Volumetric Aurora](https://godotshaders.com/shader/volumetric-aurora-borealis-with-polar-reflection/). El ID de Shadertoy `XtGGRt` lo cita un porte de Godot **[no abrí Shadertoy; verificar]**. Para esta app, la aurora actual (3 cintas SVG con gradiente, solo de noche y con racha ≥ 12) puede mantenerse y mejorarse con un degradado + `mix-blend-mode: screen`; la versión en shader es opcional.
- **Estética de referencia**: *Alto's Adventure/Odyssey* — su equipo atribuye parte de la sensación de «mundo vivo» a **la iluminación dinámica y el clima** y a detalles sutiles como el arcoíris tras la lluvia [80.lv](https://80.lv/articles/altos-adventure-a-game-with-style); el ciclo de colores del sol es codificado por color [Killscreen](https://www.killscreen.com/altos-adventure-creators-tease-next-game-altos-odyssey.md). No encontré una entrevista que explique cómo hicieron los degradados, así que **no afirmo su técnica**. De mi conocimiento general (no verificado aquí): usan capas de siluetas con **fundido a niebla por distancia** y paletas muy limitadas — exactamente la perspectiva atmosférica que falta en Libro DCA. *Monument Valley* (formas planas con sombras limpias) y Apple Weather (animaciones por condición, requieren A12+; [MacRumors](https://www.macrumors.com/guide/ios-15-weather-app)): **no encontré documentación de cómo se construyen**; el enfoque que sugieren guías de terceros es «degradado por hora del día como base + capas por condición + pausa en segundo plano + versión estática para movimiento reducido» (el mismo diseño que aquí).

### 2.4 Arreglos de paisaje sin shader (Fase 1, también respaldo del shader)

1. **Cielo**: sustituir los 5 `<rect>` por **un solo `<rect>` con `linearGradient`** de 5–7 paradas (`stop-color: var(--c0)…`), con paradas intermedias por interpolación en OKLCH (la mezcla lineal en RGB de `cielo.js` da tonos «sucios» entre el naranja y el azul; mezclar en OKLab/OKLCH da transiciones más limpias — **[NO VERIFICADO en esta app; probar con `color-mix(in oklch, …)`]**).
2. **Halos**: `radialGradient` (centro `--halo`, borde transparente, 3 paradas con caída suave) en vez de disco.
3. **Perspectiva atmosférica**: color de cada sierra = `mix(colorPropio, colorHorizonte, k)` con `k` creciente con la distancia (p. ej. 0.55 lejos, 0.3 media, 0 la montaña principal); añadir un `linearGradient` vertical dentro de cada capa (más claro/desaturado abajo, hacia la niebla).
4. **Luz direccional**: la cara de la montaña que mira al astro lleva un degradado cálido (hora dorada) y la otra se mantiene en sombra azulada; **luz de borde** (rim light) en la arista iluminada y en la nieve (franja fina clara). El lado depende de `c.sol[0]` vs `c.sx`.
5. **Facetas** (estilo low-poly suave): 3–5 polígonos con tres tonos sobre la cara de la montaña, derivados de los mismos puntos `izq/der` (no añadir llamadas a `rnd()`: usar una semilla aparte, como ya hace `bosque`).
6. **Lago**: elipse con `linearGradient` vertical del color del cielo del horizonte a más oscuro, reflejo del astro como una franja alargada difusa (ya existe la luna: reutilizar), orilla con un trazo suave.
7. **Nubes**: pasar de elipses a **sprites PNG/WebP** (3–4 formas de 2–6 KB, servidos desde `/static`, recoloreados con `mask-image` + `background-color: var(--nube)` o con `filter`) o a `<path>` suaves con `feGaussianBlur` (coste GPU; **solo un blur pequeño**, como el existente `m-bruma`). Con el shader (Fase 3) esto se sustituye.
8. **Niebla**: bandas con `linearGradient` vertical (alfa 0 → 0.5 → 0) en vez de elipses.
9. **Transición escena → página en escritorio**: degradado final a `--fondo` en el último 12 % de la escena (hoy el `::after` solo oscurece con scroll).
10. **Dither/grano**: PNG de ruido 128×128 (≈ 1–3 KB) como capa `mix-blend-mode: overlay` a 3–6 % de opacidad sobre la escena, **estático** (animar el grano cuesta y se lee como película; el estático se lee como papel [fuente](https://frontendmasters.com/blog/grainy-gradients/)). **No** usar `feTurbulence` a pantalla completa en móviles: las fuentes lo señalan como costoso en GPU en dispositivos modestos (sin medición independiente que encontrara) [GSAP forum](https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/).

### 2.5 «Clima»

La app no tiene datos meteorológicos y **no debe ligar el clima al precio ni a la racha** (sería presión o reproche: contradice las decisiones del dueño). Propuesta:
- **Clima determinista por fecha** (semilla = día): cantidad de nubes, niebla matinal, brisa. Cada día se ve distinto y estable en todos los dispositivos, sin llamadas de red. El prototipo ya tiene `cobertura` como entrada.
- **Eventos raros y bonitos** (porcentajes bajos, también por semilla): arcoíris al atardecer con llovizna lejana, «mar de nubes» al amanecer por debajo de la cumbre (niebla en el valle), luciérnagas al anochecer cerca del bosque, luna llena grande al salir.
- **Opción descartable**: clima real de San Salvador con una API gratuita sin clave (p. ej. Open-Meteo) consultada **por el servidor** (la CSP prohíbe al navegador), con coordenadas fijas del país. **No verifiqué términos ni disponibilidad**; aportaría poco (la familia mira la app a distintas horas y lugares) y añade una dependencia externa al servidor: **recomendación: no hacerlo**.

### 2.6 Partículas ligeras

- **Luciérnagas / luz** (anochecer/noche, solo `todos`): canvas 2D con **20–40 partículas** reutilizadas (pool, sin crear objetos por frame), movimiento por ruido/seno, radialGradient pequeño precomputado a un canvas fuera de pantalla y `drawImage`. Parar con `data-oculta`/`data-escena-fuera`.
- **Nieve alta** cerca de la cumbre cuando el saldo es muy alto: ≤ 40 copos CSS (`translateY` + `opacity`), no JS.
- **Lluvia de luz** de 1 BTC ya existe (34 gotas CSS): mantener.
- Reglas: tope DPR a 2; ≤ 60 partículas; sin alocaciones por frame; todo cuelga de `conAmbiente()`.

---

## 3. Microinteracciones y celebraciones

| Tema | Hallazgos y recomendación |
|---|---|
| **Números que ruedan** | El odómetro actual (CSS puro, sin medir) es sólido y compatible con CSP. Mejorar: añadir una **ligera sobre-oscilación (resorte `linear()`)** en la última fila y un destello de luz en las cifras que cambian; mantener `aria`/`.sr`. |
| **Resortes** | Generar `linear()` desde un resorte amortiguado (masa, rigidez, amortiguación) y guardarlo en `--resorte-suave`, `--resorte-vivo`; usar en hoja (apertura/rebote), tarjetas y la subida de «Tú». **[PROBADO]** `linear()` con WAAPI bajo la CSP. Si hace falta velocidad inicial real (soltar la hoja arrastrada), `motion/mini` `spring` (4.9 KB gz) lo hace. |
| **Trazos que se dibujan** | Ya hay `pathLength` + `stroke-dashoffset`. Extender al sendero recorrido y a la línea del gráfico de valor al cambiar de rango. |
| **Confeti / partículas** | Recomendación: **no confeti** (tono calmo). Para etapas: «lluvia de luz» ya existe; para constancia: destello de medalla + brasas. Si algún día se quiere confeti: `canvas-confetti` 4.2 KB gz con `useWorker:false`. |
| **Hápticos en iPhone** | `navigator.vibrate` no existe en iOS Safari. El truco de un `<input type="checkbox" switch>` (toggle genera háptico) funcionó desde iOS 17.4 según [ios-haptics](https://unpkg.com/ios-haptics@3.1.1/README.md); ese README afirma que **solo funciona de iOS 17.4 a 26.4 y que Apple lo parchó en 26.5**; otras fuentes lo dan por vigente sin mencionar el parche ([npm ios-haptics](https://npmjs.com/package/ios-haptics), [WebKit bug 285120](https://bugs.webkit.org/show_bug.cgi?id=285120)). **Estado actual no verificado por mí** (hoy es nov-2026). En Android: `navigator.vibrate(10–15)`. Recomendación: función `haptico('exito')` **opcional**, apagada por defecto, activada en «Tu cuenta», solo en «Guardar» y al llegar a una etapa; nunca depender de ella. |
| **Sonido** | Ya hay Web Audio opcional. Pulir con una sola nota suave al abrir la hoja y un acorde corto al celebrar; mantener apagado por defecto. |
| **Transición entre vistas** | View Transitions ya en uso. Añadir `view-transition-class` y morph entre la fila de la lista y la hoja de edición; la transición del saldo al cambiar de unidad. Respetar `conTransicion` (nunca con `ninguno`). |
| **Entradas/salidas** | `@starting-style` + `transition-behavior: allow-discrete` para diálogos, hoja, avisos y tarjetas de celebración (reemplaza los `void el.offsetWidth`). |
| **Esqueletos de carga** | Ya hay. Pulir con el mismo material que las tarjetas finales y un brillo lento (solo `todos`). |
| **Gráficos** | Mantener SVG propio (control total de estética, accesibilidad y lectura con puntero/teclado). Mejoras: entrada de la línea con `stroke-dashoffset` y del área con `clip-path` animado; punto «hoy» pulsante suave; en la lectura, el punto y la tarjeta siguen con un resorte corto; zonas ya diferenciadas por patrón (daltonismo). uPlot/Chart.js/D3: no aportan aquí. |
| **Parallax y scroll** | Pasar el desplazamiento a `animation-timeline: scroll()` (Baseline oct-2026) con `@supports` y JS de respaldo. |

---

## 4. Rediseño visual general

### 4.1 Diagnóstico de diseño (más allá de la escena)
- **Jerarquía de la cabecera**: saldo (héroe), valor y ganancia, precio. Reducir el bloque del precio (una línea «$77,598 · Coinbase hace 22 s», y la variación en otra) y darle un contenedor tipo «píldora» translúcida para que no flote sobre el cielo cambiante.
- **Superficies**: hoy `--s1` plano + borde `--s3`. Pasar a **material en capas**: fondo, superficie, superficie elevada; sombras en capas (2–3 sombras con distinto desenfoque/alfa) y un **borde superior de luz** de 1 px (gradiente blanco 8 % → 0). Evitar el cristal esmerilado generalizado (ver 4.4).
- **Color**: el naranja (`#ff8a1f`) es bueno; falta una **segunda nota** cálida (el dorado ya existe desde 1 BTC) y neutros con un tinte (azul-violeta en oscuro, crema en claro) en vez de grises/azules planos.
- **Tipografía**: Fraunces para títulos/palabras y Bricolage para cifras es una buena pareja. Usar la variación de Fraunces: eje **opsz** (9–144) y **SOFT** (0–100) [Google Fonts/GitHub](https://github.com/undercasetype/Fraunces): cifras grandes con opsz alto y SOFT ≈ 50–100 se ven más cálidas. **[NO VERIFICADO]** que el `fraunces.woff2` del repo (31.7 KB) conserve los ejes `opsz`/`SOFT` (probablemente es un subconjunto reducido; comprobar con `fonttools` antes de prometer ejes).

### 4.2 Inspiración (de mi conocimiento general; **no navegué estas apps**)
- **Apple Fitness/Health**: anillos, color vivo sobre fondo oscuro, tipografía grande y datos mínimos por tarjeta, animación breve al completar el anillo.
- **Copilot Money / Monarch**: finanzas con superficies suaves, sparkline pequeño junto a cada número, color solo con significado.
- **Finch**: hábito con mascota y calidez; progreso sin castigo (el «no presiona» de la app).
- **Headspace / Calm**: paisajes ilustrados cambiantes, respiración, tipografía amable.
- **Strava**: celebración social (aquí no aplica: sin compartir).
- **Duolingo sin presión**: celebración clara y breve; **evitar** rachas con culpa.
- **Streaks / Oak / Tide**: minimalismo calmado, un objeto por pantalla, haptics y sonido discretos.
- **Alto's/Monument Valley**: paisaje como objeto emocional.

### 4.3 Tendencias vigentes y cómo aplicarlas aquí
- **OKLCH/`color-mix`**: tokens por tono con luminosidad uniforme → los contrastes se calculan, no se adivinan (hecho abajo).
- **Cristal (Liquid Glass de Apple)**: tentador, pero `backdrop-filter` grande es caro en móviles y en Safari necesita el prefijo `-webkit-` (y una fuente avisa de que las variables CSS no se resuelven dentro de `-webkit-backdrop-filter`) [guía](https://www.buildmvpfast.com/blog/liquid-glass-css-backdrop-filter-recipes-2026). Las refracciones SVG con `backdrop-filter:url()` **no funcionan en Safari** según varios desarrolladores [dev.to](https://dev.to/devyatov/liquid-glass-on-the-web-6-ways-to-build-it-with-css-and-svg-3m07). Ya hay cristal en la hoja y la mini-cabecera con apagado en modo ligero: **no extenderlo**. Una cifra de «30–45 fps frente a 55–60 con WebGL» circula en un artículo promocional [macos-tahoe.com](https://macos-tahoe.com/blog/liquid-glass-performance-comparison/) — no es fiable (sin metodología).
- **Grano/ruido sutil**: estático, PNG, 3–6 % (ver 2.4.10). El grano ayuda a enmascarar el *banding* de degradados largos solo en parte [fuente](https://instantgradient.com/blog/grainy-gradients): por eso el dithering va **en el shader** y el PNG es complemento.
- **Sombras en capas** y **profundidad por luz** (borde superior más claro, sombra inferior de color del tema, no negra).
- **Tipografía variable** con pocos archivos (Fraunces + Bricolage ya van subsetteados a ~65 KB entre ambas).
- **Modo claro «amanecer»** y oscuro «noche» ya existen; asegurar que el modo claro no sea «el oscuro invertido»: sus superficies deben ser papel cálido.

### 4.4 Cómo hacer el saldo y la montaña memorables
1. **El número es el héroe**: Fraunces opsz alto/SOFT, con un **resplandor sutil del color del cielo de la hora** detrás (no un `text-shadow` fuerte) y el odómetro con resorte.
2. **La montaña como objeto vivo**: luz direccional + niebla en el valle + luz de la «linterna» de «Tú»; al abrir la app, **una respiración de 1.2 s** (el cielo se enciende desde el horizonte, el sendero se dibuja, «Tú» aparece).
3. **Momento «hora dorada»**: a ciertas horas (amanecer y atardecer) la escena se ve especialmente bonita; es el cuadro que la familia recordará. Invertir el esfuerzo de arte allí.
4. **Mapa topográfico sutil** (isolíneas) como textura de la montaña y de los fondos de tarjeta en la dirección B.
5. **Altitud con unidades fabulosas** (opcional): mostrar bajo el saldo una «altitud» poética (p. ej. «a 3,240 m sobre el campamento») — decorativo, desactivable. **Idea mía, no probada.**

### 4.5 Errores a evitar
- Contraste del texto sobre el cielo con nubes (§7).
- Efectos «porque sí»: cada animación debe responder a una acción o ser ambiente pausable.
- Tema claro como inversión del oscuro.
- Degradados sin dithering en pantallas OLED oscuras (bandas).
- Alarma/urgencia en color: nada rojo en caídas (la app ya usa signos y rayas).
- Sobrecargar con cristal.
- Sprites o grano como `data:` URI (bloqueados).
- Animar `filter`/`box-shadow`/`width` (usar `transform`/`opacity`).

### 4.6 Tres direcciones de arte

Paletas en **OKLCH** con equivalentes hex **calculados por mí** (conversión OKLab→sRGB con recorte; script en `.../scratchpad/oklch.mjs`). Los contrastes son WCAG 2.x calculados sobre las superficies indicadas. «Acento texto» es el naranja/dorado para texto; «acento» es para rellenos.

**Dirección A — «Hora dorada»** (evolución de la actual; **recomendada como base**)
Oscuro cálido-azul, naranja ámbar y dorado; la escena es el protagonista; tarjetas oscuras con borde superior de luz.
| Token (oscuro) | OKLCH | Hex |
|---|---|---|
| fondo | `oklch(0.16 0.025 265)` | `#080d18` |
| s1 | `oklch(0.21 0.03 265)` | `#111826` |
| s2 | `oklch(0.26 0.035 265)` | `#1c2435` |
| txt | `oklch(0.95 0.02 85)` | `#f5eee0` |
| txt2 | `oklch(0.78 0.02 255)` | `#afb8c4` |
| acento (relleno) | `oklch(0.78 0.16 65)` | `#fc9f30` |
| acento texto | `oklch(0.84 0.14 70)` | `#ffb95b` |
| oro (≥ 1 BTC) | `oklch(0.84 0.15 88)` | `#f3c443` |
| sube / baja | `oklch(0.82 0.14 160)` / `oklch(0.78 0.12 25)` | `#65e0a5` / `#fb9890` |
Contrastes sobre s1: txt 15.4, txt2 8.9, acento texto 10.4, oro 10.8, sube 10.8, baja 8.5; texto oscuro sobre botón acento 9.4.
| Token (claro «amanecer/papel») | OKLCH | Hex |
|---|---|---|
| fondo / s1 / s2 | `oklch(0.965 0.02 85)` / `oklch(0.985 0.012 85)` / `oklch(0.93 0.025 80)` | `#faf3e5` / `#fefaf1` / `#f1e6d6` |
| txt / txt2 | `oklch(0.25 0.03 60)` / `oklch(0.42 0.03 60)` | `#2c1e13` / `#5a493d` |
| acento relleno / texto | `oklch(0.72 0.17 60)` / `oklch(0.5 0.13 55)` | `#ef8600` / `#994a00` |
| oro texto | `oklch(0.5 0.11 85)` | `#805d00` |
Contrastes sobre s1: txt 15.5, txt2 8.2, acento texto 6.0, oro 5.8, sube 6.8, baja 7.7. **Atención**: en claro, el texto sobre el botón de acento debe ser **tinta oscura** (`#2c1e13`), no el fondo (el fondo sobre `#ef8600` da solo 2.4:1).
- Tipografía: Fraunces (títulos; pesos 400–600, opsz alto, SOFT 50–100) + Bricolage Grotesque (cifras y UI; 400/500/600). Ambas **OFL-1.1** (verificado con `npm view` de `@fontsource-variable/*`).
- Montaña/cielo: shader de cielo + sierras con perspectiva atmosférica y luz de borde; lago reflejante; grano estático.
- Tarjetas: 3 niveles de superficie, sombra en capas, borde superior de luz, anillos y sparklines en acento.
- Gráficos: línea de precio crema, zona por encima en naranja suave y por debajo a rayas (ya existe), puntos con anillo.

**Dirección B — «Cuaderno de montaña»** (claro-primero, papel y tinta, diferente)
Papel crema, tinta azul marino, bermellón; la montaña como **grabado/mapa topográfico** con isolíneas y sendero dibujado a mano.
| Token (claro) | OKLCH | Hex |
|---|---|---|
| fondo / s1 / s2 | `oklch(0.955 0.015 95)` / `oklch(0.98 0.01 95)` / `oklch(0.92 0.02 90)` | `#f3f0e5` / `#faf8f1` / `#eae4d6` |
| txt / txt2 | `oklch(0.27 0.04 265)` / `oklch(0.43 0.035 265)` | `#1d263a` / `#465064` |
| acento relleno / texto | `oklch(0.62 0.19 35)` / `oklch(0.5 0.16 35)` | `#e14d28` / `#ab3415` |
| oro texto | `oklch(0.55 0.11 85)` | `#8f6b09` |
Contrastes sobre s1: txt 14.2, txt2 7.6, acento texto 6.1, oro 4.6 (justo), sube 6.6, baja 7.6. Oscuro de la dirección: fondo `#11161f`, s1 `#1b222c`, txt `#eeebe0`, acento `#fd8358` (texto `#ff9f6f`, 8.0:1 sobre s1).
- Tipografía: **Newsreader** (serif de lectura, variable, OFL-1.1) para títulos + **Figtree** (OFL-1.1) para UI y cifras (con `tnum`). Pesos 400/500/600.
- Cielo: gradientes planos suaves con ruido de papel; nubes como sellos PNG; la montaña con trama de líneas de nivel (SVG `<path>` concéntricos, cero JS por frame).
- Pros: muy distinta y cálida, barata de renderizar (casi todo estático); contras: pierde el «wow» de la hora del día, y obliga a rehacer la escena (mayor riesgo creativo).

**Dirección C — «Cielo vivo»** (cielo como experiencia, tipo Alto/Apple Weather)
Escena a todo color que ocupa gran parte de la pantalla, cielo atmosférico por shader, montañas en capas con niebla, tarjetas de cristal ligero *solo* sobre la escena.
| Token (oscuro) | OKLCH | Hex |
|---|---|---|
| fondo / s1 / s2 | `oklch(0.14 0.04 275)` / `oklch(0.19 0.045 275)` / `oklch(0.24 0.05 275)` | `#050719` / `#0e1128` / `#181d37` |
| txt / txt2 | `oklch(0.96 0.015 95)` / `oklch(0.8 0.03 270)` | `#f5f2e7` / `#b6bdd2` |
| acento relleno / texto | `oklch(0.8 0.15 60)` / `oklch(0.86 0.13 65)` | `#ffa44e` / `#ffbf70` |
| oro / sube / baja | `oklch(0.86 0.14 92)` / `oklch(0.84 0.14 170)` / `oklch(0.8 0.12 20)` | `#f2ce59` / `#54e8bd` / `#ff9d9e` |
Contrastes sobre s1: txt 16.6, txt2 9.9, acento texto 11.5, oro 12.2, sube 12.1, baja 9.4.
- Tipografía: Bricolage Grotesque (cifras y títulos) + Fraunces solo para palabras sueltas; o Fraunces + **Onest/Hanken Grotesk** (OFL-1.1).
- Mayor impacto visual, mayor coste en GPU/batería y mayor riesgo de contraste.

**Recomendación**: **A como identidad, con la técnica de C** (cielo atmosférico y capas) **y el grano/papel de B en modo claro**. Razones: conserva lo que el dueño ya aprecia («en cierta parte se ve bien»), ataca exactamente lo que se ve mal (cielo/clima), reutiliza `cielo.js`, y se puede entregar por fases sin reescribir la app.

Tipografías gratuitas con licencia abierta verificadas (`npm view @fontsource…`, todas OFL-1.1): Fraunces 5.3.0, Bricolage Grotesque, Figtree, Newsreader, Hanken Grotesk, Onest, DM Sans, Instrument Serif, Geist, Outfit, Young Serif, Literata, Recursive, Manrope. **Los ejes y pesos exactos de cada una**: **[NO VERIFICADO]** salvo Fraunces (ejes `wght`, `opsz` 9–144, `SOFT` 0–100, `WONK` según [Google Fonts](https://fonts.google.com/specimen/Fraunces/about)); comprobar en la ficha antes de subsetear. Subsetear a latín + español (`á é í ó ú ñ ü ¿ ¡ «»`) y conservar `tnum/lnum` en la fuente de cifras.

---

## 5. Decisión de arquitectura: ¿build o sin build?

| Opción | Qué es | Pros | Contras en este proyecto |
|---|---|---|---|
| **A. Sin build puro** (hoy) | ESM escritos a mano en `static/` | Cero dependencias en producción y en Docker; `?v=hash` ya resuelto por `server.py` (regex sobre `from './x.js'`); pruebas existentes (`test_ui`, axe, barrido, regresión visual) no cambian | No se pueden usar paquetes npm sin copiar archivos a mano |
| **B. Vendorizar con esbuild puntual** | Una vez, en tu PC/CI manual: `esbuild --bundle --minify --format=esm lib.mjs > static/vendor/motion-14.12.0.js` + licencia + versión en el nombre; se commitea el resultado | Mantiene «sin build» en producción y en Docker; permite usar `motion/mini`, `animejs`, etc.; auditable (archivo versionado); funciona con el regex de `?v=` **si el archivo vendorizado no tiene `import` relativos** (esbuild los resuelve) | Hay que acordarse de regenerar y de actualizar manualmente; un script `scripts/vendorizar.mjs` con la versión exacta lo hace repetible |
| **C. Build completo (Vite/esbuild en CI y Docker multi-stage)** | `npm run build` produce `dist/` con hashes propios | Tree-shaking, TypeScript, código dividido; admite muchas librerías | Rehacer `server.py` (hoy reescribe imports con hash), el Dockerfile (etapa node), el CI, las pruebas (apuntan a `static/` y a módulos), y las herramientas de dev; más cadena de suministro; el beneficio es nulo si solo hay 0–1 librería |

**Recomendación: B si hace falta alguna librería; A si no.** La investigación indica que **no hace falta ninguna** (CSS + WAAPI + `anim.js` + shader propio). Introducir C solo si algún día se adopta TypeScript o más de ~3 librerías. Costos medidos: `esbuild` 0.28.2 empaqueta cualquiera de las entradas de §1.2 en < 1 s (`medir.mjs`). Reglas para vendorizar: nombre de archivo con versión exacta, copiar la licencia al lado (como las OFL de las fuentes), comentario de cabecera con versión y fecha, tamaño anotado en CLAUDE.md, y añadir el archivo a la lista que comprueba `test_api` (ningún import sin versión).

---

## 6. Plan por fases para el modelo que hará el pulido

### Fase 0 — Línea base y banco de pruebas (medio día)
- Congelar **capturas de referencia** (las 15 de `regresion_visual.mjs`) y añadir 6 más con la escena: noche/amanecer/día/atardecer × móvil/escritorio (ya se pueden fijar con `libro.hora`).
- Preparar medición de rendimiento reutilizable (`tests/medir_escena.mjs`): CDP `Emulation.setCPUThrottlingRate` 4× y 6×; `PerformanceObserver` para `longtask` y `layout-shift`; contador de frames con `requestAnimationFrame` durante 10 s para FPS; tamaño de JS/CSS (transferido); Lighthouse móvil (ya existe; mínimo 70, hoy ~82).
- **Presupuestos propuestos**: JS total ≤ +15 KB gz; CSS ≤ +10 KB gz; Lighthouse móvil ≥ 78 (mínimo del CI 70); long tasks > 50 ms: 0 en el arranque tras la primera pintura; FPS ≥ 55 a throttling 4× con efectos `todos`; con `esenciales`/`ligero`, sin trabajo continuo en reposo (0 frames de shader).
- Añadir a las pruebas un **modo de tiempo fijo** para el cielo/shader (p. ej. `localStorage libro.hora` ya existe; añadir `libro.fotograma` o similar) para que las capturas sean deterministas.

### Fase 1 — «Arreglos de bajo riesgo» con gran impacto (1–2 días)
Orden: (1) cielo en un solo `linearGradient` (§2.4.1); (2) halos radiales; (3) perspectiva atmosférica y luz de borde; (4) lago con reflejo; (5) niebla con degradado; (6) cabecera del precio rehecha; (7) transición escena → página. Sin JS nuevo. **Medir**: bytes del SVG, tiempo de `dibujarMontana`, regresión visual (se espera un cambio grande y aceptado), axe/barrido.

### Fase 2 — Tokens, superficies y grano (1–2 días)
Tokens en OKLCH (`--*` con respaldo hex), superficies en 3 niveles + sombras en capas, borde de luz superior, tema claro «papel»; grano PNG estático con `mix-blend-mode`; revisar contraste (alto contraste conserva reglas). **Medir**: CSS, Lighthouse, barrido a 320 px con letra muy grande y alto contraste.

### Fase 3 — Cielo en shader con respaldo (2–3 días)
Construir `cielo-gl.js` (partir del Apéndice A): modo horneado (un fotograma por 5 min), capa de nubes deslizada en CSS, `webglcontextlost/restored`, respaldo SVG, atenuación de nubes sobre la zona del saldo, tinta calculada con el cielo real (muestreo del canvas, ver §7), apagado con `esenciales`/`ninguno`/`ligero`/`data-oculta`. **Medir**: ms por frame con el rastreo de Chrome en una GPU real y con throttling; consumo (comparar % de GPU/CPU en el Task Manager de Chrome o `chrome://tracing`) con bucle de 30 fps frente a horneado; Lighthouse; memoria.

### Fase 4 — Capa de animación (2–3 días)
`anim.js` (resortes→`linear()`, `animar(el, frames, {resorte})`, respeta `sinMovimiento()`); parallax por `animation-timeline: scroll()` con respaldo JS; `@starting-style` en diálogos/hoja/avisos; celebración rehecha (luz, medallas); luciérnagas/nieve (canvas 2D, pool); háptico opcional. **Medir**: FPS durante scroll con throttling, long tasks, ausencia de CLS.

### Fase 5 — Gráficos y reportes (1–2 días)
Entradas de línea/área, punto vivo, resorte de la tarjeta, materiales; anillos con luz. **Medir**: tiempo de dibujo con 1,000 compras (escenario `mil`), FPS al cambiar de rango.

### Fase 6 — Cierre (1 día)
Barrido completo, axe en todos los estados nuevos, regresión visual aceptando diferencias, Lighthouse, actualizar `CAMBIOS` («Qué hay de nuevo») y CLAUDE.md.

### Prototipos rápidos (primero, en este orden) y cómo medirlos
| # | Prototipo | Qué decide | Cómo medir |
|---|---|---|---|
| 1 | **Cielo en shader en 3–4 horas del día** (ya hecho en bruto: Apéndice A) | ¿Se ve mejor que el SVG y cabe en presupuesto? | Capturas lado a lado; ms/frame en GPU real; GPU% con bucle vs horneado |
| 2 | **Cielo SVG con `linearGradient` + halo radial** (sin shader) | Ganancia «gratis» de la Fase 1 | Diferencia visual; contar colores únicos por fila para detectar bandas |
| 3 | **Montañas con perspectiva atmosférica y luz de borde** | Valor visual de la luz direccional | Captura; tamaño del SVG |
| 4 | **Nubes horneadas deslizadas por CSS** vs shader por frame | Coste por frame vs «vivo» | Rastreo de rendimiento (trabajo del hilo principal y de GPU) |
| 5 | **Generador de resorte → `linear()`** | ¿Un resorte de 15 líneas basta frente a `motion/mini`? | Comparar curva y tamaño; revisión visual en hoja/odómetro |
| 6 | **Parallax con `animation-timeline: scroll()`** | ¿Mejora el scroll en iPhone? | FPS en scroll con throttling 4×; en iPhone real si se puede |
| 7 | **Grano PNG** con `mix-blend-mode: overlay` | ¿Aporta calidez sin coste? | Lighthouse y FPS de scroll con/sin |
| 8 | **Luciérnagas en canvas 2D (30 partículas)** | Coste de partículas | CPU% y GC (sin alocaciones) |

---

## 7. Riesgos y trampas

1. **CSP**: ver tabla en §1.4. En resumen: sin `data:`/`blob:` en imágenes y workers, sin wasm, sin `eval`, sin `<style>`/atributos `style` inyectados. Todo lo nuevo debe usar CSSOM, WAAPI, archivos estáticos y canvas/WebGL.
2. **Contraste con un cielo dinámico**: hoy `cielo.js: tinta()` elige tinta clara u oscura calculando contraste contra las tres capas de arriba **de la paleta**. Con nubes y halos reales, el color detrás del saldo cambia. **Axe no mide texto sobre `<canvas>`** (lo marcará como «incompleto»). Soluciones: (a) **no dibujar nubes ni halo detrás del saldo** (máscara en el shader y SVG), (b) **muestrear píxeles** del canvas (zona del saldo) al renderizar y recalcular la tinta/velo, (c) mantener un **velo suave** (`--cielo-sombra`) bajo el texto, (d) pruebas: capturar con Playwright y calcular contraste real sobre los píxeles (como ya hace `test_lib.mjs` con la paleta).
3. **iOS Safari**:
   - **WebGL**: el contexto puede perderse por presión de memoria, cambio de app o segundo plano largo; algunos informes de WebKit hablan de contextos que no se pueden recrear hasta limpiar datos ([WebKit 262628](https://bugs.webkit.org/show_bug.cgi?id=262628), [WebKit 300782](https://bugs.webkit.org/show_bug.cgi?id=300782), [guía de «gotchas»](https://abratabia.com/mobile-web-games/ios-safari-gotchas.php)). Manejar `webglcontextlost` con `preventDefault()` y reconstruir en `webglcontextrestored`; **respaldo SVG** siempre listo; no confiar en que la recuperación funcione.
   - **Fugas al redimensionar un canvas** (cada resize reserva un backing store nuevo); redimensionar solo cuando el tamaño cambia más de un umbral, y reutilizar. Hay un informe de proceso terminado a 1.25 GB [Apple Developer Forums](https://developer.apple.com/forums/thread/741327).
   - **Modo de bajo consumo**: rAF, CSS y WAAPI a 30 fps (§1.1). Diseñar para ello.
   - **OffscreenCanvas con WebGL**: soporte de Safari irregular hasta 17; no necesario aquí (el shader corre en el hilo principal, es ligero).
   - **`backdrop-filter`**: prefijo `-webkit-`, variables CSS no se resuelven dentro del prefijado según una fuente; refracción SVG no funciona. Mantener solo donde ya está.
   - PWA instalada: no encontré nada específico sobre rAF/WebGL en modo independiente; **probar en un iPhone real** (el sandbox no lo permite).
4. **Batería**: evitar bucles de rAF permanentes; horneado + CSS en el compositor; pausar con `data-oculta`/`data-escena-fuera`; sin animaciones de `filter`/`box-shadow`.
5. **Accesibilidad de movimiento**: todo cuelga de `efectos.js`; el parallax y las nubes son ambiente solo con `todos`; **no** destellos > 3/s (estrellas fugaces ya son raras); respetar «sin movimiento» (estado final). Con el shader, `ninguno` = un fotograma.
6. **Peso**: el shader (1.9 KB gz) y `anim.js` caben holgados; cuidado con texturas PNG de nubes (cada una ≤ 6 KB) y con `styles.css` (109 KB): dividir/minificar o limpiar reglas muertas durante el pulido.
7. **Mantenimiento**: el shader es «escritura única»; mantenerlo corto, comentado y con una prueba de humo (compila y pinta un fotograma sin errores de consola). Un desarrollador único: preferir pocas piezas propias bien documentadas a muchas librerías.
8. **Pruebas deterministas**: la regresión visual compara capturas; el shader y las nubes deben aceptar un tiempo fijo, o la prueba será ruidosa. En CI el WebGL de Chromium headless funciona con SwiftShader (lo verifiqué en este sandbox con `--use-gl=swiftshader`; **no verifiqué el runner de GitHub**).
9. **Compatibilidad**: `animation-timeline` solo desde Chrome 115/Safari 26/Firefox 159; `@supports` y respaldo JS; navegadores viejos (iPhones sin iOS 26) siguen con JS.
10. **Legal/licencias**: copiar la licencia de cada archivo vendorizado; GSAP bajo licencia revocable (evitar).

---

## 8. Incertidumbres (lo que NO pude verificar)

- **Rendimiento real en GPU/CPU de móviles** (Android modesto, iPhone): no medido; solo SwiftShader (software) en este sandbox.
- **WebKit/Safari**: la CSP y las librerías se probaron solo en **Chrome 153**; WebKit no. El comportamiento de CSSOM bajo CSP debería ser el mismo, pero no lo comprobé.
- **Hápticos iOS**: si el truco `switch` sigue vivo en iOS 26.5+ (una sola fuente dice que fue parchado).
- **Scroll-driven animations en Safari**: estado exacto de errores en 26.x (fuente secundaria).
- **Baseline de `@property`** y de `offset-path`: de memoria.
- **Coeficientes de Rayleigh** y detalles de los modelos de cielo: de memoria; el prototipo no usa Rayleigh físico, solo paleta.
- **Shadertoy «Auroras» de nimitz**: no abrí la página; el ID lo cita un porte de Godot.
- **Cómo construyen su arte Alto's, Monument Valley, Apple Weather, Carrot**: sin documentación encontrada; lo anotado es de conocimiento general y marcado como tal.
- **Open-Meteo** u otra API de clima: términos no verificados (no recomendada).
- **Ejes/pesos** de las tipografías alternativas y los ejes que conserva el `fraunces.woff2` subsetteado del repo.
- **Lottie-web completo con expresiones**: no probado bajo CSP (se sabe que usa `eval` para expresiones; **[NO VERIFICADO]**).
- **Licencia de Theatre.js**: tomada del README de una versión antigua.
- Tamaños de `@property`/OKLCH en el CI y en Lighthouse reales: no medidos.

---

## Recomendación concreta

**Pila elegida**
- Estilos: CSS con tokens **OKLCH** (respaldo hex), `color-mix`, `@starting-style`, `linear()` para resortes, `animation-timeline` (con `@supports` y respaldo JS) y View Transitions donde ya existen.
- JS de animación: **`anim.js` propio (~1–2 KB)** sobre WAAPI y `linear()`; **sin GSAP/Motion/anime.js** salvo que el prototipo 5 demuestre que falta algo (entonces `motion/mini` 3.2 KB gz **vendorizado**).
- Cielo: **WebGL crudo** (`cielo-gl.js` ≈ 2 KB gz) en modo **horneado** + nubes deslizadas por CSS, con **respaldo SVG** de degradados (Fase 1).
- Paisaje: SVG con degradados, perspectiva atmosférica, luz direccional y de borde, niebla y lago reflejante; grano PNG estático.
- Partículas: canvas 2D con pool (≤ 40), solo con `todos`.
- Gráficos: SVG propio (sin uPlot/Chart.js/D3).
- Arquitectura: **sin build**; si algún día hace falta una librería, vendorizar un solo archivo ESM con esbuild.
- Dirección de arte: **A «Hora dorada»** + técnica de **C** + grano/papel de **B** en claro.

**Orden de trabajo**
1. Fase 0 (banco de pruebas, presupuestos, tiempo fijo del cielo).
2. Fase 1 (gradientes, halos, perspectiva atmosférica, luz, lago, niebla, cabecera) — **mayor impacto visible con riesgo mínimo**.
3. Prototipos 1–3 en paralelo para decidir el shader con datos.
4. Fase 2 (tokens/superficies/grano).
5. Fase 3 (shader horneado con respaldo y manejo de contraste).
6. Fase 4 (animación: scroll-driven, `@starting-style`, resortes, luz/luciérnagas, háptico opcional).
7. Fase 5 (gráficos) y Fase 6 (cierre: barrido, axe, regresión visual, Lighthouse, «Qué hay de nuevo» y CLAUDE.md).

---

## Apéndice A — Prototipo del cielo en shader (completo)

Archivo: `prototipo-cielo-gl.js`. Uso: `iniciar(canvas, 0.5).pintar({c:[5 colores], astro, nube, estrellas, cobertura, ax, ay, luna}, tiempoEnSegundos)`.

```js
// Prototipo: cielo en un shader de fragmentos (WebGL1, un triángulo, sin librerías).
// Entradas (uniforms): 5 colores del cielo (los de cielo.js), color de nube, luz del sol, posición del astro, estrellas, hora.
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
uniform vec2 R; uniform float T; uniform vec3 c0,c1,c2,c3,c4,luz,nube; uniform vec2 astro; uniform float estrellas,cobertura,esLuna;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){s+=a*n(p);p=m*p;a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y; float y=1.-uv.y;          // y=0 arriba, 1 horizonte
  vec3 col=mix(c0,c1,smoothstep(0.,.25,y)); col=mix(col,c2,smoothstep(.2,.5,y)); col=mix(col,c3,smoothstep(.45,.75,y)); col=mix(col,c4,smoothstep(.7,1.,y));
  vec2 d=(vec2(uv.x,1.-uv.y)-astro)*vec2(asp,1.); float r=length(d);
  col+=luz*(.16*exp(-r*4.5)+.30*exp(-r*16.))*(1.-.5*esLuna);               // halo ancho + núcleo (dispersión hacia delante)
  float disco=1.-smoothstep(.030,.034,r); col=mix(col,luz*1.15,disco);
  // nubes: fbm en dos capas que derivan con distinto ritmo; el borde que mira al astro recibe luz
  vec2 q=vec2(uv.x*asp*2.2+T*.004,y*5.5)+vec2(0.,T*.0006);
  float f=fbm(q+fbm(q*.7+T*.003)*.8); float m=smoothstep(.62-cobertura*.45,.86-cobertura*.45,f)*(1.-smoothstep(.45,.98,y));
  float f2=fbm(q+normalize(d+.0001)*vec2(1.,-1.)*.07); float borde=clamp((f-f2)*9.,0.,1.);
  vec3 cn=nube*(.78+.22*borde)+luz*.25*borde*exp(-r*2.5);
  col=mix(col,cn,m*.85);
  // estrellas con titileo
  vec2 gp=uv*vec2(asp,1.)*70.; vec2 g=floor(gp); float e=h(g); vec2 ctr=vec2(h(g+3.1),h(g+7.7)); float st=step(.93,e)*smoothstep(.16,.0,length(fract(gp)-ctr))*estrellas*(.6+.4*sin(T*1.7+e*80.))*(1.-m)*(1.-smoothstep(.0,.6,y)*0.0);
  col+=vec3(.95,.9,.8)*st;
  col+=(h(gl_FragCoord.xy+fract(T))-.5)/255.*1.5;                          // dither: rompe las bandas del degradado
  gl_FragColor=vec4(col,1.);
}`;
export function iniciar(canvas, escala = 0.5) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return {
    pintar(p, t) {
      const w = Math.round(canvas.clientWidth * escala), h = Math.round(canvas.clientHeight * escala);
      if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      p.c.forEach((c, i) => gl.uniform3fv(U('c' + i), rgb(c)));
      gl.uniform3fv(U('luz'), rgb(p.astro)); gl.uniform3fv(U('nube'), rgb(p.nube));
      gl.uniform2f(U('R'), w, h); gl.uniform1f(U('T'), t); gl.uniform2f(U('astro'), p.ax, p.ay);
      gl.uniform1f(U('estrellas'), p.estrellas); gl.uniform1f(U('cobertura'), p.cobertura); gl.uniform1f(U('esLuna'), p.luna ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
```

Notas del prototipo: `precision highp` es necesario porque el hash con `sin` es poco fiable en `mediump` (no lo probé en móvil; **[NO VERIFICADO]**). El `1-smoothstep(…)*0.0` de las estrellas es un resto inofensivo del desarrollo (se puede quitar).

## Apéndice B — Cómo reproducir las mediciones

- Tamaños: `cd .../scratchpad/npmtest && node medir.mjs` (paquetes instalados con `npm i gsap motion animejs uplot canvas-confetti @formkit/auto-animate lottie-web @lottiefiles/dotlottie-web @rive-app/canvas-lite esbuild three @theatre/core`).
- CSP del navegador: `cd .../scratchpad/csp && python3 servidor.py & node prueba.cjs` (sondas); `cd .../scratchpad/npmtest/web && python3 servidor.py & node run.cjs` (librerías bajo CSP). Requieren `/usr/bin/google-chrome` y el Playwright de `tests/node_modules`.
- Capturas de la app actual: `.../scratchpad/actual/shot.cjs` con `tests/servidor_prueba.py 8770 anio` (necesita Flask en un venv: `.../scratchpad/venv`).
- Capturas del cielo en shader: `.../scratchpad/cielo/shot.cjs` (Chrome con `--use-gl=swiftshader`).
- Paletas: `node .../scratchpad/oklch.mjs`.

## Apéndice C — Fuentes consultadas

- Scroll-driven animations Baseline: https://web.dev/blog/web-platform-10-2026 · https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ · https://lilting.ch/en/articles/chrome-146-scroll-animation-safari-grid-lanes
- View Transitions: https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available · https://developer.chrome.com/blog/view-transitions-in-2025
- `@starting-style`: https://web.dev/blog/baseline-entry-animations
- `linear()`: https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear · https://smashingmagazine.com/2023/09/path-css-easing-linear-function
- Color: https://developer.mozilla.org/docs/Web/CSS/color_value/oklch · https://web-platform-dx.github.io/web-features-explorer/features/relative-color
- GSAP licencia: https://gsap.com/community/standard-license/ · https://webflow.com/blog/gsap-becomes-free
- Motion: https://motion.dev/docs/animate · https://motion.dev/docs/gsap-vs-motion
- anime.js: https://github.com/juliangarnier/anime · https://animejs.com/documentation/getting-started/module-imports
- dotLottie CSP/wasm: https://github.com/LottieFiles/dotlottie-web/wiki/CSP-and-WASM-Self%E2%80%90Hosting-Guide
- Rive tamaños: https://rive.app/docs/runtimes/runtime-sizes.md
- Theatre.js: https://cdn.jsdelivr.net/npm/@theatre/core@0.7.2/README.md
- iOS rAF 30 fps: https://bugs.webkit.org/show_bug.cgi?id=215745 · https://motion.dev/magazine/when-browsers-throttle-requestanimationframe
- Hápticos iOS: https://unpkg.com/ios-haptics@3.1.1/README.md · https://npmjs.com/package/ios-haptics · https://bugs.webkit.org/show_bug.cgi?id=285120
- WebGL en iOS: https://bugs.webkit.org/show_bug.cgi?id=262628 · https://bugs.webkit.org/show_bug.cgi?id=300782 · https://abratabia.com/mobile-web-games/ios-safari-gotchas.php · https://developer.apple.com/forums/thread/741327
- Cielo/nubes: https://iquilezles.org/articles/dynclouds · https://thebookofshaders.com/13/ · https://www.advances.realtimerendering.com/s2015/The%20Real-time%20Volumetric%20Cloudscapes%20of%20Horizon%20-%20Zero%20Dawn%20-%20ARTR.pdf · https://blog.maximeheckel.com/posts/real-time-cloudscapes-with-volumetric-raymarching/ · https://threejsresources.com/guides/sky-and-clouds · https://github.com/jeantimex/precomputed_atmospheric_scattering
- Aurora: https://godotshaders.com/shader/aurora-sky-shader/ · https://godotshaders.com/shader/volumetric-aurora-borealis-with-polar-reflection/
- Alto: https://80.lv/articles/altos-adventure-a-game-with-style · https://www.killscreen.com/altos-adventure-creators-tease-next-game-altos-odyssey.md
- Apple Weather: https://www.macrumors.com/guide/ios-15-weather-app
- Cristal: https://www.buildmvpfast.com/blog/liquid-glass-css-backdrop-filter-recipes-2026 · https://dev.to/devyatov/liquid-glass-on-the-web-6-ways-to-build-it-with-css-and-svg-3m07 · https://macos-tahoe.com/blog/liquid-glass-performance-comparison/
- Grano: https://frontendmasters.com/blog/grainy-gradients/ · https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/ · https://instantgradient.com/blog/grainy-gradients
- Fraunces: https://fonts.google.com/specimen/Fraunces/about · https://github.com/undercasetype/Fraunces
- Gráficos (tamaños, fuentes secundarias): https://tanstack.com/charts/latest/docs/comparison
- Sin build / import maps: https://preactjs.com/guide/v10/no-build-workflows · https://www.endpointdev.com/blog/2025/10/preact-web-app-without-npm-build/
