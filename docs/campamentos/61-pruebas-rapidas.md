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
esperas, 2,425 s) y **557 entradas** (`entrar`) se llevan 2,421 s, de los que 1,560 son sus 2.8 s fijos. Arrancar los 138 servidores de
prueba, 96 s. En el texto hay 726 `waitForTimeout` (527 s escritos), pero los bucles los multiplican por tres.

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
  - Dos esperas que con la máquina cargada se quedaban cortas, con su espera fija **más** una condición: el índice lateral tras cambiar
    de tema (`sinTransiciones`: falló una vez con 1.1:1 de contraste porque el color aún iba de camino) y la fiesta de la tele
    (`entradas`: falló una vez «tv-fiesta sin ver» a 3840×2160 porque su animación de entrada no había acabado).
  - `PESOS` medidos otra vez (las tres partes en serie, 24 nov 2026; con 39b y 51, que contaban 60 s por no tener medida). Las dos últimas
    líneas no se tocaron (otra rama añade allí su bloque).

## Antes y después

Todo con la misma máquina compartida (ver arriba): con la otra sesión corriendo a la vez, la carga media fue de 6 a 17.

| | Antes | Después |
|---|--:|--:|
| Verificación local completa, **en serie** | ≈ 122 min (campamento 51) | SERIE_DESPUES |
| Verificación local completa, **a la vez** (`node tests/verificar_todo.mjs --visual DIR`, 4 a la vez) | — | **38.5 min** (32 de lo paralelo + 6.5 de banco y Lighthouse solos) |
| `test_ui`, comprobaciones | 2,450 (72 bloques) | **2,450** (72 bloques; cada bloque, las mismas que antes) |
| axe, estados | 336 | **336**, los mismos nombres (ver abajo) |
| Barrido rápido / por pestañas, combinaciones | 112 / 448 | **112 / 448**, sin repetidas (32 + 40 + 40 y 128 + 160 + 160) |
| CI: Playwright 1/3, 2/3, 3/3 | ≈ 22 min cada uno | ≈ 13–14 min (proyectado) |
| CI: axe | ≈ 22 min | ≈ 12–14 min (proyectado) |
| CI: lo que espera un PR | ≈ 22–23 min | ≈ 13–14 min (proyectado) |

- **El par del CI, medido aquí**: `node tests/verificar_todo.mjs ui:1/6 ui:2/6` (lo que hace «Navegador (Playwright) 1/3»), solo, con
  la otra sesión cargando la máquina: **13 min 21 s** (las dos sextas, 801 y 703 s). En el runner, sin vecinos, debería quedar en
  11–13 min de pruebas más ~1 de preparación. axe en claro y oscuro a la vez tardó 14.5 min **con otras dos pruebas de navegador y la
  otra sesión a la vez** (carga 12–17); en serie, los dos esquemas, 24.6 min con la misma carga. El CI real lo dirá el PR.
- **Misma cobertura, demostrada**: cada uno de los 72 bloques de `test_ui` dio las mismas comprobaciones que antes (2,450 en total). axe:
  la lista de estados (`ESTADOS`) de una corrida entera y la de claro + oscuro por separado tienen **los mismos 336 nombres**; lo
  único distinto es **a favor**: en la corrida entera, la bienvenida de la lectora en oscuro se revisaba **sin** su diálogo (la de
  claro ya la había marcado como vista en el mismo servidor), y por separado se revisa con él. Barridos: 112 y 448 combinaciones
  distintas, como antes.
- **Todo en verde** en la corrida a la vez (`test_lib` 1,006, `test_api` 1,314, push 19, aleatorio 8,862, `tsc`, Biome 0 avisos,
  recorte 70 archivos, ruff, mypy, axe sin violaciones, barridos en orden, banco dentro de topes y presupuesto, regresión visual
  0.00 % en las 15 capturas) salvo **Lighthouse local** (la app, mediana 66 de 66 · 66 · 59; mínimo 70), que ya salía por debajo
  aquí antes de este campamento (67 en la verificación del 51) con la máquina cargada; la app no cambió, y en el CI (sin vecinos) pasa.
  La parte 1/6 falló una vez (la fiesta de la tele, arreglada arriba) y pasó al repetirla.

## Riesgos y lo que no se pudo probar aquí

- **Esperas que se quedan cortas a la vez**: dos aparecieron con la máquina muy cargada (carga 12–17 en 4 núcleos) y se arreglaron con
  una condición **además** de la espera fija. Puede haber más que no salieron en estas corridas. En el CI cada trabajo corre solo dos
  procesos en 4 núcleos (mucho menos cargado que aquí). Si un check falla y al repetirlo pasa, la regla es la de siempre: se busca qué
  espera se quedó corta y se le añade su condición; nunca se acorta ni se quita. Como último recurso, `-j 1` en el paso del CI vuelve
  a correr las dos sextas una tras otra sin cambiar el nombre del check.
- **Los registros del CI** ya no salen línea a línea mientras corre la parte: cada sexta deja el suyo entero al acabar, plegado.
- **PESOS**: si otra rama añade un bloque (la de `vida-62` lo hace), al mezclar puede chocar con las líneas medidas; basta con quedarse
  con ambas. Un bloque sin peso cuenta 60 s.
- **Sin probar aquí**: el CI real (lo corre el PR; los tiempos de arriba son una proyección), y el runner de GitHub con dos sextas a la
  vez.
