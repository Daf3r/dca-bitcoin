# Campamento 32 · El teleférico del valle

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). El presupuesto y el teatro: [30-hacer-sitio.md](30-hacer-sitio.md), [docs/rendimiento.md](../rendimiento.md).

## Campamento 32 · El teleférico del valle (idea 23, la del hermano del dueño, en pantallas anchas)
Un teleférico pequeño en el valle, **solo desde 1100 px** (escritorio y la tele): en el teléfono, medido a 390×664, el cable cruzaría el sendero y el rótulo de 100k, así que no va. La versión del teléfono es la cabina de la tarjeta de la película (campamento 29). Nada depende de comprar.

- **Dónde** (`montana.js: telefericoValle`, al final de `dibujarMontana`, solo en la escena de la página): un cable de la torre de la iglesia (`.v-ig-torre`, su parte de arriba) a la loma de detrás del pueblo (55 × 17 unidades del pueblo hacia la derecha y arriba), con dos torres. **Si el cable pasara a menos de 10 px del sendero, no se pone.** Medido en la maqueta a 1100, 1440, 1920 y 2560 px y con `mil` y `ballena` a 1440: no cruza el sendero, ni un rótulo, ni «Tú», ni la meta, ni sale al cielo.
- **El cable y las torres**: dos trazos quietos (`.v-tele-cable`, `.v-tele-torre`) en `#m-v-pie`, dentro del dibujo grande (cuentan en el valle).
- **La cabina**: roja, con techo azul y los tres asomados a la ventana (tres puntitos claros a ese tamaño), en **su propia capa pequeña**: un `<svg class="tele-cabina">` de 6 nodos y unos 19×17 px, con `will-change: transform`, justo encima del dibujo grande y debajo del frente (los rótulos y «Tú» quedan encima). Se mueve **solo con `transform`**, con un `@keyframes` entre dos estaciones que el dibujo deja en variables (`--ax`, `--ay`, `--bx`, `--by`, por CSSOM): espera en el pueblo, cruza en unos 40 s, espera en la loma y vuelve (240 s).
- **Cuándo** (`data-mueve`, una cosa a la vez): nueva franja **`teleferico`, de 10:00 a 13:00**; los días de azacuanes (octubre y abril) vuelan ellos y la cabina se queda quieta. Solo con efectos «todos»; con «esenciales» o «ninguno», fuera de su franja o en el teléfono, quieta en la estación del pueblo. En la lista de la pausa al deslizar.
- **Para después**: los osos de la cumbre dormidos de madrugada (24), la campana del mediodía (25) y el paraguas de la cumbre (26).

### Verificado
- `test_lib`: la franja nueva de `mueve` (10:00–13:00; los azacuanes ganan) y las de siempre con ella.
- Bloque «campamento 32» de `test_ui`: a 1100, 1440 y 2560 px el cable en el valle y la cabina en su capa bajo el frente, decorativa, a 10 px o más del sendero, con `will-change: transform` y 6 nodos; viaja a las 11 y a las 12 con «todos», quieta a las 14 y con «esenciales»; en el teléfono no hay teleférico.
- Capturas a 1100, 1440 y 2560 px de día (la cabina a medio camino) y de noche (quieta en el pueblo).

### Sin probar aquí
- «Medir este aparato» en el PC del dueño y en la tele, de 10:00 a 13:00 (con la montaña a la vista: si baja de 55 fps, se quita); Safari de escritorio.

*(Campamento 49: en pantallas de 1100 px o más, la cabina es también el segundo principal mientras se mueve el del pueblo, de 7:00 a 16:30 (`data-mueve2`); la tortillera ya no la para. Ver [49-el-pueblo-se-mueve-2.md](49-el-pueblo-se-mueve-2.md).)*
