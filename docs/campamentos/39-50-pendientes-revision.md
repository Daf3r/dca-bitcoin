# Revisión de pendientes (24 nov 2026): lo que no se nos debe escapar

Auditoría hecha leyendo el plan (`39-50-la-vida-del-valle-plan.md`), `CLAUDE.md` y lo conversado con el dueño. Cada punto dice si **ya está cubierto**, **falta** o es **del dueño**.

## Cerrado al revisar
- **La línea fina oscura que baja por la ladera derecha** (captura de producción del 19–20 nov): es la **quebrada** del campamento 22 (`arte-valle.js: quebrada`, «la quebrada llega al lago»); es intencional. No hace falta tocarla.
- **«Estimado» en el comprobante** cuando los dólares no se escribieron: decidido en `24-precio-de-la-compra.md` («sin marca de estimado/escrito; rótulo neutro»). No es pendiente.
- **El pueblo bajo el velo del pie en el teléfono acostado y a 320 px**: el dueño dijo «haz lo que recomiendes» → se deja como está; queda como idea 7 de «Para después» en `38b-pulido-integral.md` por si algún día lo quiere.

## Falta (para el agente que arma los PR)
1. **El plan solo vive en la rama `claude/plan-39-50`.** Si esa rama no entra a `main`, una sesión nueva no lo ve. Abrir **primero un PR «0» con el plan** (docs + textos de las ideas + prototipos) sobre `main`, y encima el 39, el 41, etc. (apilados; sin CI no cuesta nada).
2. **`CLAUDE.md` está desfasado en «Pendientes y decisiones»**: dice «la app está terminada (18 nov 2026)», «Por decidir: nada pendiente» y «Esperando datos: nada». Debe decir que los campamentos 26–38 están hechos y que hay un **plan 39–60 aprobado por el dueño** (enlace al plan), con el orden y la regla «sin CI». Hacerlo en el PR 0 (o en el del 39, no en dos). Además, **CLAUDE.md creció a ~48 KB** desde la compactación (39.8 KB): compactar las líneas largas de los campamentos 26–38 del índice cuando se toque.
3. **Higiene de pruebas sin CI (propuesto como campamento 61)**: dos bloques de `test_ui` fallaron por depender del día de la semana (el 17·2 por el precio del día y el de los osos a 320×568 un jueves). Sin CI no hay quien lo note: **fijar la fecha de los datos por defecto en el servidor de pruebas** (`FECHA_PRUEBA` ya existe) para todo `test_ui`, y correr la suite completa con **dos o tres fechas distintas** (un lunes, un jueves, un domingo) una vez, para sacar de una vez los demás bloques frágiles. Añadir `workflow_dispatch` a `pruebas.yml` (lo hace el agente del 39). Un script `tests/verificar_todo.sh` que corra la verificación local completa en orden, para que «sin CI» no dependa de acordarse de cada comando.
4. **Ideas de la fase 2 de los osos sin lugar en el plan**: la **Osa Mayor** en la constelación de «Tu historia» (idea de Opus) y las **imágenes de arranque con osos** (iPhone). Anotadas aquí; encajan en el campamento 46 (Luna y estrellas) y en un pulido de arranque.
5. **Datos de oídas por confirmar** (ya en el plan): cuándo anida el torogoz (246), el cerco de la luna como anuncio de lluvia (171), «Siete Cabritas» y «Alacrán» (180).
6. **README**: al añadir el nodo (campamento 60) hay que actualizar el diagrama Mermaid de «Arquitectura» (integración nueva) y `docs/operacion.md`.
7. **Limpieza de ramas y worktrees** (31 worktrees locales y ramas viejas en el remoto): cuando el dueño lo diga, borrar `chatgpt/campamento-41` y las ramas ya mezcladas; nunca antes.

## Del dueño (el agente no puede)
- **Desplegar** lo mezclado (respaldo → `export VERSION_GIT=$(git rev-parse --short HEAD); docker compose up -d --build` → `DOMINIO=dca.polarzero.dev bash scripts/verificar-despliegue.sh`) y **probar en el iPhone**: «Medir este aparato» de noche, en las franjas nuevas (7–8, 8–10, 10–13 solo pantalla grande, 14–15, 15–16:30) y en diciembre (Navidad); el saludo y el bamboleo de «Tú»; los vecinos al cambiar de turno; VoiceOver con la descripción nueva; la tele real de noche.
- **La compra n.º 10** con su precio real: Editar → «Más detalles» (el campo de precio de BTC existe desde #94).
- **Dependabot** #20, #21 y #22 (siguen apuntando a la rama vieja o esperan Playwright; con CI apagado, mezclarlos puede esperar al próximo ciclo).
- **Cuando se renueve el CI**: lanzar una corrida completa sobre `main` (botón «Run workflow») y mirarla.
- **Decidir** sobre lo que Fable entrega (celebración, nodo, «Tu historia» a miles, modo TV, caídas y subidas): qué entra y qué no.
- **Confirmar** con la familia lo sensible ya aprobado en bloque (misa de gallo, padre, Viernes Santo, Difuntos, inditos, tecolote) por si algo no cuadra al verlo.
- **El nodo**: dar la URL interna de su mempool.space cuando corra, y el acceso por WireGuard desde el Vultr.

## Reglas que cambian con este plan (para no olvidarlas en `CLAUDE.md`)
- 39: **cohetes solo en su hora** (125) y los topes del banco; 41: la Navidad entera (cada fecha todo el día); más reglas «cambia una regla» de la v5 (119, 129, 132, 134, 204, 207, 229, 275) solo si el dueño las aprobó y se implementan.
- **Sin CI**: la verificación local completa es la compuerta.
- **Se pueden retomar descartes** si se definen mejor, diciéndolo claro en el informe.
