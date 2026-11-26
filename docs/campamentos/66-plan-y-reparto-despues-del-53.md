# Campamento 66 · Lo que queda después del 53 y cómo se reparte (26 nov 2026)

**Para qué.** El dueño pidió que, al terminar el campamento 53C, **quedara todo documentado**: qué campamentos faltan y cómo se reparte el trabajo, porque **vuelve cuando haya límite de Fable** (hoy solo hay Opus). Este documento es el punto de partida de esa sesión. Se lee junto con `39-50-la-vida-del-valle-plan.md` (el plan y lo aprobado), `39-50-para-fable-y-decisiones.md` (decisiones tomadas) y `65-arte-para-fable.md` y `65b-revision-visual-de-partida.md` (el arte y la crítica visual).

## 1. Dónde estamos
**Hecho y en `main`** (campamentos de «La vida del valle» y la interfaz): 39, 39b, 40, 41, 42, 43, 44 (solo la parte de Opus), 45, 46, 47, 48, 49, 51, 52, 53A, 53B, 57 y 58, 59, 61, 62, 63, 64, D, E, el 65 (el arte para Fable, solo documentos) y el ajuste del CI (límite del trabajo de rendimiento de 60 minutos). **El 53C · Historias de varios días** está en su PR. Medida real en iPhone del dueño: **59 fps** (producción hasta el #123; antes 58 y 59).

## 2. La regla del reparto (decidida con el dueño, 26 nov 2026)
- **Opus hace la base**: lógica, calendario, turnos, motor, cableado, pruebas, banco, «Qué hay de nuevo», documentos. **Usa solo los dibujos que ya existen** (código y prototipos `prototipo-vida4.patch` y `prototipo-vida5.patch`). **No dibuja nada nuevo ni cambia cómo se ve algo ya dibujado.** Lo que falta o se ve provisional lo deja escrito en `65-arte-para-fable.md`, con captura.
- **Fable hace lo visual**: dibujo nuevo, composición, color, y **revisa y critica el arte que ya está** (empezando por `65b-revision-visual-de-partida.md`). **Libertad creativa y esfuerzo alto**; el dueño aprueba sobre capturas.
- **Después de cada tanda de Fable, un agente Opus integra y mide** (un solo agente Opus a la vez, por ahorro de tokens).
- **El dueño aprueba cada campamento al terminarlo** y mezcla él; yo (Claude) no mezclo ni despliego.
- Barandas de siempre: la forma de la montaña (`rnd()`), «todo tallado», nada sobresale contra el cielo, topes de nodos (teléfono 1100, valle 300, osos 46) y de animaciones (tele 24), el banco (`tests/banco_rendimiento.mjs`), CSP sin `style` en línea, la app informa y nunca recomienda, privacidad de la familia, y lo descartado no se vuelve a proponer.

## 3. Lo que falta, por campamento y por quién
| Campamento | Qué falta | Quién | Notas |
|---|---|---|---|
| **53C** (cierre) | Los dibujos de las historias están como prototipo: circo, ramada, globo de la cumbre, osezno, casa a media pared, mural, aserrín | **Fable** mejora (la crítica por historia está en el 65) | 245 el cayuco nuevo (espera la decisión del cayuco del 51 y el presupuesto de pantallas anchas), 246 el nido del torogoz (necesita el torogoz posado, 177), la banca nueva de la 248 (sin dibujo) |
| **54 · La memoria del día** (249–255) | Lo que quedó de ayer, charcos que se secan, el canasto que se va llenando, la pelota que se queda hasta el lunes… | **Opus** (base) · Fable (dibujos que falten) | Ver `ideas_v5.py`. Todo sale de la fecha, sin guardar nada en el aparato |
| **55 · Encuentros raros y visitas** (256–266) | Visitas de fuera y encuentros raros | **Opus** (base) · Fable | Algunas están marcadas «dudoso»: revisar con el dueño antes |
| **56 · La cumbre y «Tú», a tu ritmo** (267–272) | La cumbre y «Tú» según el ritmo de compra | **Opus** (base) · Fable | 272: «Tú» sentado fuera de la carpa mirando el cielo (pose nueva, de Fable) |
| **44 · Lluvia y verano** (la parte de Fable) | 168 el nubarrón, 169 el cielo de cada mes (colores), 170 más meses en flor (cortez, pascuas) | **Fable** | Los colores del cielo son lo más afinado de la app: cambios del 5 al 10 % con capturas de cada mes |
| **46 · Luna y estrellas** (pulido) | El conejo de la luna (hecho con elipses por Opus) y las figuras de las estrellas, la Osa Mayor en «Tu historia», las imágenes de arranque con osos | **Fable** | Los nombres «Siete Cabritas» y «Alacrán» siguen por confirmar |
| **42, 43, 45** (arte) | Pastel de cumpleaños (221–222, privacidad), paño morado, palmas, canasto de mangos, doblar la caña, farolito de las posadas, cresta y pollitos, torogoz posado, venado, corral | **Fable** | Todo en la tabla de `65-arte-para-fable.md` |
| **50 · Cambios grandes al paisaje** (205, 206, 207, 209) | Plaza con kiosko y ceiba, orilla del lago con vida (pantallas anchas), el valle por encima del velo, el muelle desde 1920 px | **Fable** completo, aparte, **libertad creativa y esfuerzo alto**; luego Opus integra | **Descartadas:** 208 (el cantón mide 5 px) y 123 (la tele: el dueño no tiene). El monitor del dueño (1920×1080) sí ve la 206 y la 209 |
| **65 · La revisión de Fable** | La crítica del arte ya hecho (`65b`) y su lista de cambios | **Fable** primero | Es el primer paso cuando vuelva el límite |
| **60 · El nodo** | Integrar el nodo (mempool.space propio); actualizar el diagrama del README | **Opus** | **Espera la URL de mempool.space del dueño**; `HALVING_FECHA` sigue vacío hasta tener nodo |

## 4. El orden que propongo cuando vuelva el límite
1. **Fable: la revisión (65 y 65b).** Entrega su crítica; el dueño decide qué se cambia.
2. **Fable: el 50** (lo grande del paisaje) y lo que salga de la revisión; el dueño aprueba sobre capturas.
3. **Opus integra** lo de Fable, un solo agente, midiendo con el banco.
4. **Opus: 54, 55 y 56** (la base), y de nuevo Fable para los dibujos que pidan.
5. **60 · el nodo**, cuando el dueño dé la URL.
Mientras no haya límite de Fable, Opus puede seguir con **54, 55 y 56** (solo la base), tal como se hizo con el 53C.

## 5. Decisiones abiertas del dueño (no bloquean a Opus)
- **45 · el cayuco (51):** desde las 9:00 el pescador (52) está en el pueblo pero el cayuco sigue con él dentro todo el día.
- **44 · las tardes de costumbre sin lluvia** (domingo de la mejenga, sábado de atolada, tardes de fiesta): lo dejé como el agente lo hizo; con `COSTUMBRES.aguacero = false` vuelve a como era.
- **El punto flojo del 64** (rango no pegado al gráfico con «Todo» y escala logarítmica a 390 px: 277 → 275 px).
- **302**, **las poses de «Tú» para la lectora** y **el ancho del saldo de 1100 a 1599 px**.
- **E · repetir la simulación del ánimo con el histórico real de producción.**
- **Confirmar con la familia** lo religioso y de duelo (posadas, Semana Santa, Difuntos, inditos, tecolote), y los nombres «Siete Cabritas» y «Alacrán».
- **Del dueño, siempre:** desplegar (respaldo primero, `VERSION_GIT`, `verificar-despliegue.sh`), medir fps en iPhone de día y de noche, la compra n.º 10 (su precio en Editar → «Más detalles»), Dependabot #20, #21 y #22, y borrar `chatgpt/campamento-41` solo cuando él lo diga.

## 6. El CI
El trabajo «Rendimiento (Lighthouse y banco de la escena)» tarda **~32 a 39 minutos** (límite 60). **Cada momento que se declara en el banco suma tiempo**: declarar solo los que prueban algo. Si crece más, la salida duradera es **partir el banco en dos trabajos** (una `PARTE` en `banco_rendimiento.mjs`, como `test_ui`).

## 7. Lighthouse en rojo en `main` (26 nov 2026): para Fable cuando vuelva
El chequeo «Rendimiento (Lighthouse)» del CI da **62 a 67** en la app (mínimo 70) **también en `main`** (corrida 252) y en el PR del 53C. Medido en la misma máquina: **64 en `main`, 64 en `755ef18` (antes de 42–46), 63 en `4c86bce` (19 nov, antes de «La vida del valle»)**: la puntuación no depende del código sino de la velocidad del corredor, que rinde menos que cuando se fijó el mínimo. El dueño mezcló el #125 con ese chequeo en rojo y **dejó la decisión para esta sesión** (con Fable): subir la medición a algo estable (por ejemplo más corridas o un perfil de CPU fijo), bajar el mínimo a 60, o dejar Lighthouse informativo y fiarse del iPhone (59 fps). Hasta decidirlo, el CI de `main` marcará rojo en ese punto: es esperado. No es un problema de arte; si Fable lo mira, que sea con medidas, no con el ojo.
