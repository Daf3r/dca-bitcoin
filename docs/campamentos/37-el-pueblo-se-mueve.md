# Campamento 37 · El pueblo se mueve

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Los vecinos y sus turnos: [35-pueblo-de-los-osos.md](35-pueblo-de-los-osos.md); las capas pequeñas y uno a la vez: [34-el-pueblo-vive.md](34-el-pueblo-vive.md), [docs/rendimiento.md](../rendimiento.md).

## Campamento 37 · El pueblo se mueve (ideas 114, 115 y 117)
El movimiento que pidió el dueño, donde es barato: una sola figura chica en su capa, solo transform, en su franja. El resto del pueblo cambia de sitio por turnos (un salto, no una animación). El panadero que cruza (116), la ronda (118) y el saludo al guardar (119) quedan para después, como en el v3.

- **La capa del vecino** (114, `montana.js: capaVecino`):
  - El reparto de cada turno marca un **actor** (`actor` en `arte-vecinos.js: reparto`). Ese vecino no va en el grupo del dibujo grande, sino en su propio `<svg class="v-capa-vecino">` pequeño, hermano del principal, encima de él y debajo del frente (los rótulos y «Tú» quedan encima).
  - Lo único que cambia es el `transform` de ese elemento, a saltos (`steps`), con «todos» y en su franja de `data-mueve`.
  - Quieto, se ve igual con cualquier nivel de efectos: es un vecino más.
  - Se rehace con el turno (`libro:turno`). Va en la lista de la pausa al deslizar.
  - En la película no hay capa: el actor va con los demás.
  - Son 2 a 10 nodos, según el actor.
- **La que barre** (115): de **7:00 a 8:00**, franja nueva `barre`. La osa de la escoba de la mañana de entre semana se mece dos grados y medio a un lado y al otro desde sus pies, cada 0.6 s. *(Campamento 39b: la que barre da tres pasadas y descansa, ciclo de 7.2 s; la pelota hace una jugada de 9 s: tres botes, rueda, sube y espera.)*
  - Como propuso el v3, las gallinas empiezan ahora a las **8:00**.
  - Los fines de semana y en vacaciones no hay escoba en ese turno, así que no hay capa.
- **La pelota de los oseznos** (117): de **15:00 a 16:30**, franja nueva `pelota`. La pelota bota entre los oseznos de la tarde, un bote cada 1.2 s; los oseznos no se mueven.
  - El perro cruza ahora de **14:00 a 15:00**.
  - Los días de azacuanes vuelan ellos hasta las 16:00 y la pelota se queda quieta hasta entonces.
- **`data-mueve`** queda así (uno a la vez):
  - torogoz, 5:00–7:00;
  - **barre**, 7:00–8:00;
  - zompopos, 7:30–10:00 (del 15 al 21 de mayo);
  - azacuanes, 8:00–16:00 (sus fechas);
  - gallinas, 8:00–10:00;
  - teleférico, 10:00–13:00;
  - perro, 14:00–15:00;
  - **pelota**, 15:00–16:30;
  - pericos, 16:30–18:00;
  - luciérnagas y relámpagos, de noche.

**Nodos y animaciones**: banco con mil compras a 390×664: 924 un día normal y 1028 en Nochebuena. Presupuesto de animaciones dentro: a las 15:00 de la lluviosa, una animación en capa propia (la pelota).

### Verificado
- `test_lib` (976):
  - las franjas nuevas de `mueve` y las de siempre con ellas;
  - en todo un año, cada actor solo en su franja;
  - un solo actor por turno: la que barre entre semana y la pelota de la tarde.
- Bloque «campamento 37» de `test_ui`, a 390 y 1440 px, un miércoles sin azacuanes (10 comprobaciones):
  - a las 7:30 la que barre se mece en su capa, bajo el frente y decorativa;
  - a las 15:30 la pelota bota;
  - con «esenciales», la capa está quieta;
  - a las 9:00 sigue en su capa, pero quieta;
  - en la siesta no hay capa.
- Bloques 34 (el perro, ahora a las 14:30), 35 y «capas» de `test_ui`, el banco y Biome.
- Capturas: `osos/impl/cap37` en el scratchpad de la sesión.

### Sin probar aquí
- «Medir este aparato» en el iPhone de 7:00 a 8:00 y de 15:00 a 16:30 (si baja de 55 fps con la montaña a la vista, se quita).
- Safari.
