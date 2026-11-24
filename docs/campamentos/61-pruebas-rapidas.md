# Campamento 61 · Pruebas rápidas

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Cómo se prueba, entero: [operacion.md](../operacion.md), «Pruebas rápidas».

El dueño notó que las comprobaciones tardaban cada vez más. Encargo: acortar la verificación local y la del CI **sin quitar cobertura ni
debilitar nada**. No se tocó la app: solo `tests/` y el CI. Nada visible (sin «Qué hay de nuevo»).

## Dónde se iba el tiempo (medido el 24 nov 2026, antes de tocar nada)

Máquina del sandbox: 4 núcleos, **compartida con otra sesión que corría sus propias pruebas** (carga media de 7 a 13 durante casi
todas las medidas): los tiempos absolutos de este documento son pesimistas; lo que vale es la comparación y las proporciones.

**En serie, una cosa tras otra** (la verificación del campamento 51, en esta misma máquina): `test_ui` 66 min (tres partes de ~22),
axe 22 min, barrido rápido 8, barrido por pestañas 14, banco 5, Lighthouse A/B 3, regresión visual 2 y lo rápido (API, cálculos, tipos,
Biome, recorte, ruff, mypy, push, aleatorio) unos 2: **≈ 2 h**.

**En el CI** (la última corrida del PR #103): Playwright 1/3, 2/3 y 3/3 ≈ 22 min cada uno (21 de pruebas, ~1 de preparación: instalar
Chromium tarda 30 s), axe 22 min, Lighthouse + banco 7, lo demás menos de 2. El PR esperaba **22–23 min**.

**Dentro de `test_ui`** (nuevo: `ESPERAS=1` dice por bloque cuánto se fue en esperas fijas, en `entrar` y en arrancar servidores):
72 bloques, 2,450 comprobaciones, 4,185 s sumando bloques (las tres partes a la vez). **El 58 % es espera fija** (`waitForTimeout`: 1,702
esperas, 2,425 s) y **557 entradas** (`entrar`) se llevan 2,421 s, de los que 1,560 son sus 2.8 s fijos. Arrancar los 153 servidores de
prueba que se levantan en una corrida, 96 s. En el texto hay 726 `waitForTimeout` (527 s escritos); los bucles los llevan a 1,702 (×2.3).

| Bloque | s | comprobaciones | esperas fijas (s / nº) | `entrar` (s / nº) |
|---|--:|--:|--:|--:|
| campamento 21B: la tele de la sala | 361 | 113 | 225 / 134 | 141 / 31 |
| campamento 20: cada cosa en su sitio | 326 | 157 | 194 / 119 | 256 / 58 |
| tele: el saldo contra la montaña | 223 | 87 | 84 / 48 | 37 / 9 |
| campamento 17: primera impresión | 188 | 137 | 123 / 59 | 133 / 32 |
| campamento 25: los osos polares | 183 | 103 | 123 / 60 | 121 / 28 |
| avisos push | 164 | 108 | 97 / 82 | 57 / 13 |
| campamento 21: etapas más cercanas | 146 | 129 | 92 / 42 | 117 / 29 |
| campamento 15B: piedritas, cumpleaños y la tele | 140 | 29 | 69 / 92 | 36 / 8 |
| pulido integral: el movimiento | 121 | 20 | 86 / 40 | 88 / 20 |
| un año de compras | 105 | 146 | 75 / 60 | 41 / 9 |

(Las esperas fijas incluyen los 2.8 s de cada `entrar`; por eso las dos columnas se solapan.)

**Hallazgo**: casi todo el tiempo es **espera de animaciones medidas a propósito**, no CPU. Los 2.8 s de `entrar` son la subida de «Tú»
(2.4 s, `pintar.js: pintarMontana(true)`) y el odómetro: una sonda en la página vio que todo se asienta a los 2.65–2.75 s con la máquina
cargada, así que cambiarlos por una condición ahorraría ~0.2 s por entrada, y a cambio cualquier prueba que mire el final de la subida
tendría que demostrarlo de nuevo. Las esperas del 39b (tempo) y las de la tele son de ese mismo tipo. Conclusión: **el tiempo se gana
corriendo a la vez, no quitando esperas**; las esperas se tocaron solo donde sobraban de verdad o donde se quedaban cortas con la
máquina cargada.

## Lo hecho

- **`tests/verificar_todo.mjs`** (nuevo): corre todo a la vez, cada cosa en su proceso con su servidor (puerto y base aparte):
  lo rápido, `test_ui` en seis partes (`UI_PARTES`), axe en claro y oscuro (`ESQUEMA`), el barrido rápido y el de pestañas en tres
  grupos de escenarios (`SOLO`; comprueba que los grupos son exactamente los once de `barrido_ui.mjs`) y, **después y solos**, el banco
  y Lighthouse (miden rendimiento: con la máquina cargada falsearían los fps). Empieza por lo más largo, `-j N` dice cuántas a la vez
  (por defecto, los núcleos), registros en `tests/registros/` (ignorado), un resumen con lo que tardó cada una y el total de
  comprobaciones de `test_ui`; sale con error si algo falla y enseña el final de su registro. `--visual DIR` añade la regresión visual;
  `ESTADOS_DIR` guarda los estados que revisó cada axe y cada barrido. Tareas sueltas o grupos: `ui`, `ui:2/6`, `axe`, `barrido`,
  `pestanas`, `rapidas`, `lentas`, `banco`…
- **El CI, con los mismos checks**: cada uno de «Navegador (Playwright) 1/3», «2/3» y «3/3» corre **dos sextas partes a la vez**
  (`node tests/verificar_todo.mjs ui:1/6 ui:2/6`, `UI_PARTES=6`; el runner de un repo público tiene 4 núcleos y las pruebas esperan
  más de lo que calculan) y «Accesibilidad (axe)» corre claro y oscuro a la vez. El registro de cada parte sale entero en el del
  trabajo, plegado (`::group::`). Los nombres de los checks no cambian; ningún trabajo se quitó ni se volvió informativo.
- **Servidores de prueba que no se confunden** (`servidor_prueba.py`, `PRUEBA_ID`): con varias pruebas a la vez, dos podían pedir el mismo
  puerto libre; el segundo no arrancaba y su prueba hablaba **con el servidor del otro** (otro escenario) sin enterarse. Ahora cada
  servidor responde con `X-Prueba-Id`, y `test_ui`, axe y el barrido exigen el suyo en `/healthz` y, si el hijo se murió, prueban otro
  puerto (tres intentos).
- **axe por esquema** (`ESQUEMA=light|dark`) y **lista de estados** (`ESTADOS=archivo`: cada estado revisado con los diálogos que tenía
  abiertos), y en el barrido `ESTADOS=archivo` (cada combinación): para demostrar que dos corridas revisan lo mismo.
- **`test_ui`**:
  - `ESPERAS=1` (solo mide).
  - `entrar` espera en la entrada a su única llamada (`/api/estado`) y al «load», en vez de `networkidle` (que añadía 500 ms de silencio
    en cada una de las ~557 entradas).
  - Tras sus 2.8 s de siempre, `entrar` espera además a que «Tú» deje de andar (`#m-yo.anda`) y el odómetro pare: **solo puede esperar
    más**, nunca menos (con la máquina cargada la subida puede no haber acabado a los 2.8 s).
  - `entrar(…, { espera: false })` para la tele (21B, 25 y 29), que recarga enseguida con `#tv`: esa primera carga nadie la mira; basta
    con que acaben sus llamadas. Lo que se comprueba se mide después de la recarga, con su espera de siempre. 21B: **361 → 306 s**.
  - Tres esperas que con la máquina cargada se quedaban cortas (la tercera, el aviso de prueba: ver «Riesgos»), con su espera fija **más** una condición: el índice lateral tras cambiar
    de tema (`sinTransiciones`: falló una vez con 1.1:1 de contraste porque el color aún iba de camino) y la fiesta de la tele
    (`entradas`: falló una vez «tv-fiesta sin ver» a 3840×2160 porque su animación de entrada no había acabado). La primera versión de
    `entradas` miraba todas las animaciones de las tarjetas y **se colgó en serie**: contaba el marco de la historia (40 s, que sale o no
    según la hora real) y las brasas de la fiesta grande (tres vueltas, ~8.6 s). Ahora mira solo la entrada de `#tv-fiesta`. Lección:
    una condición nueva espera a algo concreto, nunca a «todo lo que se mueve».
  - `PESOS` medidos otra vez (las tres partes en serie, 24 nov 2026; con 39b y 51, que contaban 60 s por no tener medida). Las dos últimas
    líneas no se tocaron (otra rama añade allí su bloque).

### Lo que se miró y no se hizo (con sus números)

- **Cambiar los 2.8 s de `entrar` por una condición**: ~0.2 s por entrada (≈ 110 s de 4,185), y obligaría a demostrar otra vez cada prueba
  que mira el final de la subida. Se dejó la espera fija y se le añadió la condición (solo espera más).
- **Reutilizar la sesión (`storageState`)**: lo que cuesta entrar **aparte** de sus 2.8 s fijos son ~860 s de los 2,421 (la página de
  entrada, el formulario y la primera carga). Es el techo de lo que se ganaría, pero saltarse `/login` dejaría sin mirar la consola de la
  entrada en cada `eq(consola, [])`, y varias pruebas dependen de lo que hace la primera carga (la bienvenida, «visto», «Qué hay de
  nuevo»). No compensa el riesgo; con todo a la vez, esos 860 s se reparten entre seis.
- **Duplicados entre barrido, axe y `test_ui`**: recorren tamaños y estados parecidos, pero cada uno mira otra cosa (el barrido:
  desbordes y toques de 48 px en 112/448 combinaciones; axe: reglas WCAG en 336 estados; `test_ui`: el comportamiento). Unir dos
  exigiría probar la misma cobertura combinación por combinación; con todo a la vez, el barrido entero dura 6 min de reloj. No se unió nada.
- **Datos de prueba más pequeños**: arrancar los 153 servidores (incluido `mil`, con mil compras) suma 96 s en toda la corrida (2 %).
  No vale la pena.

## Antes y después

Todo con la misma máquina compartida (ver arriba): con la otra sesión corriendo a la vez, la carga media fue de 6 a 17.

| | Antes | Después |
|---|--:|--:|
| Verificación local completa, **en serie** | ≈ 122 min (campamento 51) | ≈ 118 min (`test_ui` 61.8 min en sus tres partes en vez de 66; lo demás, igual) |
| Verificación local completa, **a la vez** (`node tests/verificar_todo.mjs --visual DIR`, 4 a la vez) | — | **36.7 min** (≈ 31 de lo paralelo + 6 de banco y Lighthouse solos) |
| `test_ui`, comprobaciones | 2,450 (72 bloques) | **2,450** (72 bloques; cada bloque, las mismas que antes) |
| axe, estados | 336 | **336**, los mismos nombres (ver abajo) |
| Barrido rápido / por pestañas, combinaciones | 112 / 448 | **112 / 448**, sin repetidas (32 + 40 + 40 y 128 + 160 + 160) |
| CI: Playwright 1/3, 2/3, 3/3 | ≈ 22 min cada uno | ≈ 11–12 min (proyectado: el par, 10 min 16 s aquí) |
| CI: axe | ≈ 22 min | ≈ 12–14 min (proyectado) |
| CI: lo que espera un PR | ≈ 22–23 min | ≈ 12–14 min (proyectado; lo marca axe) |

- **El par del CI, medido aquí**: `node tests/verificar_todo.mjs ui:5/6 ui:6/6` (lo que hace «Navegador (Playwright) 3/3»), solo y con la
  máquina ya sin la otra sesión: **10 min 16 s** (610 y 616 s). Con la otra sesión cargando (carga 6–9), el par 1/6 + 2/6 tardó 13 min
  21 s. En el runner: ~10–11 min de pruebas más ~1 de preparación. axe en claro y oscuro a la vez tardó 15 min con otras dos pruebas
  de navegador al lado y la máquina cargada; en serie, los dos esquemas, 24.6 min con la misma carga. El CI real lo dirá el PR.
- **En serie, después** (las tres partes una tras otra, con la máquina cargada como en el «antes»): 1,250 + 1,208 + 1,252 s = **61.8 min**
  (antes 66); sumando bloques, 3,708 s frente a 3,970. Las esperas fijas medidas a la vez bajaron de 2,425 a 2,338 s; casi todo lo
  ganado es la tele (21B: 361 → 299 s) y la entrada.
- **Misma cobertura, demostrada**: cada uno de los 72 bloques de `test_ui` dio las mismas comprobaciones que antes (2,450 en total). axe:
  la lista de estados (`ESTADOS`) de una corrida entera y la de claro + oscuro por separado tienen **los mismos 336 nombres**; lo
  único distinto es **a favor**: en la corrida entera, la bienvenida de la lectora en oscuro se revisaba **sin** su diálogo (la de
  claro ya la había marcado como vista en el mismo servidor), y por separado se revisa con él. Barridos: 112 y 448 combinaciones
  distintas, como antes.
- **Todo en verde** en la corrida final a la vez (36 min 42 s; `test_lib` 1,006, `test_api` 1,314, push 19, aleatorio 8,862, `tsc`,
  Biome 0 avisos, recorte 70 archivos, ruff, mypy, axe sin violaciones, barridos en orden, banco dentro de topes y presupuesto,
  regresión visual 0.00 % en las 15 capturas, **Lighthouse** de la app mediana 74 de 76 · 74 · 72) salvo la parte 6/6, que falló una vez
  (el aviso de prueba, arreglado: ver «Riesgos») y pasó al repetirla con la 5/6 al lado. En una corrida anterior, con la máquina muy
  cargada, Lighthouse local dio 66 (la base del A/B del 51 ya daba 69 aquí): la app no cambió (`git diff origin/main -- app/` vacío).

## Riesgos y lo que no se pudo probar aquí

- **Esperas que se quedan cortas a la vez**: tres aparecieron (el índice lateral, la fiesta de la tele y el aviso de prueba de
  «Avisos», cuyo texto llega antes de que el botón se reactive: `avisos.js` aún espera a `refrescar()`); las tres con la máquina muy cargada (carga 12–17 en 4 núcleos) y se arreglaron con
  una condición **además** de la espera fija. Puede haber más que no salieron en estas corridas. En el CI cada trabajo corre solo dos
  procesos en 4 núcleos (mucho menos cargado que aquí). Si un check falla y al repetirlo pasa, la regla es la de siempre: se busca qué
  espera se quedó corta y se le añade su condición; nunca se acorta ni se quita. Como último recurso, `-j 1` en el paso del CI vuelve
  a correr las dos sextas una tras otra sin cambiar el nombre del check.
- **Los registros del CI** ya no salen línea a línea mientras corre la parte: cada sexta deja el suyo entero al acabar, plegado.
- **PESOS**: si otra rama añade un bloque (la de `vida-62` lo hace), al mezclar puede chocar con las líneas medidas; basta con quedarse
  con ambas. Un bloque sin peso cuenta 60 s.
- **La meta de ~12 min por trabajo no está confirmada en el CI**: aquí el par tardó 10 min 16 s con la máquina libre (13 min 21 s
  cargada). axe, ~12–15 min, es ahora el trabajo más largo. Si el primer PR enseña más de ~14 min, la palanca siguiente es **nueve
  partes, tres por trabajo** (`ui:1/9 ui:2/9 ui:3/9` y `UI_PARTES=9`) y axe en cuatro (claro y oscuro, cada uno en dos mitades), con
  los mismos nombres de los checks; se decide con esa corrida delante.
- **Sin probar aquí**: el CI real (lo corre el PR; los tiempos de arriba son una proyección), y el runner de GitHub con dos sextas a la
  vez.
