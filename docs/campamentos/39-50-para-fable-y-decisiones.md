# Para Fable y decisiones pendientes (26 nov 2026)

Anotado por encargo del dueño: **cuando haya límite de Fable otra vez** se usa Fable para lo de arte nuevo; **mientras tanto solo hay Opus** y se sigue con lo que no exige dibujo nuevo. Complementa a `39-50-pendientes-revision.md` (del 24 nov) y al plan (`39-50-la-vida-del-valle-plan.md`). Si algo de aquí se hace, se tacha aquí y se anota en el documento de su campamento.

## 1. Para Fable (arte nuevo que quedó sin dibujar)

**Ahora vive en su propio campamento: [`65-arte-para-fable.md`](65-arte-para-fable.md)** (la tabla de abajo queda como copia del 26 nov; el 65 manda).
Regla: Opus no inventa dibujos que no estén en las maquetas o los prototipos (`docs/pulido-visual/vida-del-valle/prototipo-vida4.patch` y `prototipo-vida5.patch`). Cada línea dice de dónde sale y qué hace falta dibujar.

| De | Qué falta dibujar | Nota |
|---|---|---|
| 42 (idea 221 y 222) | **El pastel con su velita en la cumbre** (cumpleaños de la montaña y de la familia) | Toca la **privacidad de la familia**: nada de «quién cumple» a quien no es de la familia; ver `15b-familia-y-tele.md` (cumpleaños) |
| 42 | **El paño morado del Viernes Santo** (tono nuevo) | Sobrio; apagable con `COSTUMBRES.santos` |
| 42 | **La palma en cada puerta el Domingo de Ramos** | Apagable con `COSTUMBRES.ramos` |
| 43 (152) | **El canasto lleno de mangos** de la vendedora y el **osezno comiéndose un mango** | El canasto que se llena es el campamento 54 |
| 43 (154) | **El gesto de doblar la caña** (en la dobla están de pie entre las matas) | |
| 43 (161) | **El farolito que se queda en la puerta de cada casa visitada** (posadas) | Apagable con `COSTUMBRES.posadas` |
| 45 (176) | **Cresta del gallo, pollitos y gallina echada** | La cresta sola suma +1 nodo en todas las fechas |
| 45 (177) | **Torogoz posado con la cola colgando** | Hoy solo existe el de vuelo, en la capa del cielo |
| 45 (178) | **El venado** | |
| 45 (174) | **El corral y su camino** (las vacas van en un solo trazo) | |

## 2. Para después, sin arte (Opus puede)
- **Mejoras de la v5 que piden memoria de varios días** (campamentos 53 y 54): la **ramada de la atolada** y la **milpa por capítulos**, la **pelota que se queda hasta el lunes** y el **canasto que se va llenando**. *(Campamento 53C: la ramada, hecha; la milpa por capítulos sigue para después: ver [53c-historias-de-varios-dias.md](53c-historias-de-varios-dias.md).)*
- **El perro junto a la piñata** (42): colocarlo con los vecinos exige comprobar que nadie quede encima.
- **«Más fila» en las pupusas** el Día del Padre y la noche de Gloria (42): hoy queda la fila de siempre.
- **La semana de Semana Santa en `escuela()`** (43): `escuela(f)` no sabe de la semana de vacaciones; los mangos de esos días siguen la regla de siempre.
- **Camino que sigue**, en este orden (decidido con el dueño el 25 nov): **46** Luna y estrellas (179–183; aquí encajan la Osa Mayor y las imágenes de arranque con osos, ver `39-50-pendientes-revision.md`), **44** Lluvia y verano (165–171), **50** Cambios grandes al paisaje (205–209 y 123; **pide el visto bueno del dueño al diseño antes de empezar**), **53–56** (lo que quede) y **60** el nodo (espera su URL). El dueño **aprueba cada campamento al terminar**, uno a uno, con un solo agente Opus a la vez.

## 3. Del dueño (decide o hace él)
**Decisiones abiertas**
- **45 · la hora exacta de los animales.** Hoy la hora se mira al **dibujar el turno**: con la página abierta (la tele), el gallo se queda hasta las 7:00 y los zanates hasta las 20:00. Alternativa: unos cuatro repintados más al día, a su hora.
- **45 · el cayuco (51).** Desde las 9:00 el pescador (52) está en el pueblo, pero el cayuco sigue con él dentro todo el día. Arreglarlo cambia la franja del ambiental `cayuco` y sus pruebas.
- **43 · +2 nodos de la milpa** con su gente (aceptados al mezclar el #119; quedan en 852 de 1100).
- **302**: la confirmación pendiente; **si la lectora ve las poses de «Tú»**; **el ancho del saldo en 1100–1599 px**.
- **64 · punto flojo:** con «Todo» y la escala logarítmica a la vista, a ancho de teléfono el rango no queda pegado al gráfico (277 → 275 px). ¿Se acepta?
- **E · repetir la simulación del ánimo con la tabla de histórico real de producción** (los umbrales ×1.4 salieron de la serie de pruebas: ≈84 % de calma).
- Lo religioso y de duelo (posadas, Semana Santa, Difuntos, inditos, tecolote): **confirmar con la familia**; cada una se apaga con una línea en `cielo.js: COSTUMBRES`.

**Cosas suyas**
- Desplegar lo mezclado (respaldo → build → `verificar-despliegue.sh`) y **medir fps en iPhone** tras cada despliegue (producción hasta el #118: **58 fps**; referencia anterior 59).
- **La compra n.º 10**: su precio, en Editar → «Más detalles».
- **Dependabot** #20, #21, #22.
- **La URL de mempool.space** (nodo, campamento 60): `HALVING_FECHA` sigue vacío hasta tener nodo.
- **Ramas viejas**: borrar `chatgpt/campamento-41` solo cuando él lo diga.

## 4. Decisiones mías (para no volver a discutirlas)
**Campamento 42 · fiestas del año**
- El guion de las fiestas va **aparte de `turnoFiesta`** (`cielo.js: turnoDelAnio`): si iba dentro, las luces del pueblo se quedaban encendidas y la iglesia abierta, y el foco de la Navidad se quedaba con estas fechas.
- Todo lo religioso es sobrio, sin humor: de espaldas camino de la iglesia; no hay procesiones, cementerio, cruces ni luto.
- **El guion manda sobre la misa del domingo** (Ramos y un 10 de mayo en domingo); el Domingo de Pascua conserva la misa por la mañana.
- La Pascua se calcula con Meeus/Jones/Butcher; hay copia en `lib.js` y en `cielo.js`, y una prueba las compara de 1900 a 2300.
- 150 (Jueves y Viernes Santo) se hizo aunque `ideas_v4` la marcaba «después»: el dueño aprobó todo.

**Campamento 43 · temporadas**
- Los mangos solo cuando **no hay escuela**, para no contradecir el 40.
- La milpa con su gente **no es un turno** (se mira la hora al dibujar, como en los recorridos del 52), para no sumar un cambio de turno más.
- La mejenga **no va en Navidad** (la plaza es la del nacimiento); el perro va a la calle en la mejenga.

**Campamento 45 · animales de aquí**
- Un solo sitio junto a la **banca** del árbol de la plaza para los animales del reloj (gallo, garrobo, zanates), detrás de la calle: no estorba a quien cruza ni a quien camina al cambiar de turno.
- La garza pasa de orilla por **CSS** (`--gz-x`), no por el atributo `transform`: WebKit no deja que el CSS lo anule.
- El tecolote sale **una noche de cada cuatro**, por sorteo de la fecha (igual en todos los aparatos), nunca con luna llena ni en Navidad.

**Otros**
- **Campamento E:** los umbrales del ánimo del valle pasaron a ×1.4 (fresco −11 %, abrigo −21 % o 31 % bajo el máximo, aire +11 %, plaza +21 %) para que casi siempre esté en calma.
- **CI:** el trabajo de rendimiento pasó de 25 a **40 minutos**: el banco de la escena ya tarda unos 24 y cada campamento le suma momentos. Si sigue creciendo, hay que **partirlo en dos trabajos**.
- **Entregas apiladas:** cuando un PR se apila sobre otro, al mezclar el de abajo el de arriba puede quedar mezclado contra la rama vieja y no contra `main` (pasó con el #117). Se evita abriendo cada PR contra `main` cuando la base ya entró.
