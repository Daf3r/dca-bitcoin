# Campamento 33 · Más ositos en el paisaje

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Los osos de la cumbre: [25-osos.md](25-osos.md). El presupuesto: [30-hacer-sitio.md](30-hacer-sitio.md).

## Campamento 33 · Los de la cumbre se estiran por la mañana (idea 42; 43–47, para después)
- **Cuándo** (`lib.js: estiranLosOsos`, pura): de 7:00 a 8:00 (después del torogoz), en el primer minuto de cada cinco. Un reloj de `montana.js` lo mira cada 20 s y, una vez por franja, pone en `#m-osos` las clases `estira-1`, `estira-2` y `estira-3` con 0.3 s entre cada una (el grande, el chico y el del mameluco) y las quita a los 2.6 s. *(Campamento 39b: se estiran en 6 s, uno tras otro cada 0.6 s; la prueba espera hasta 9 s.)*
- **El dibujo** (`arte-osos.js: osos`): cada oso lleva sus brazos alzados en V en **un solo trazo** (`.oso-brazos`), escondido con `display: none`, así que **no cuenta en la caja de los osos** (los rótulos y «el oso cede» no se enteran). Los brazos salen por fuera de la cabeza, para que se vean sobre la nieve blanca; **si alguna de sus puntas (`PUNTAS_ESTIRA`, con 2 px de aire) quedara fuera de la montaña**, esos osos no se estiran (`data-sin-estirar`): nada sale contra el cielo. La regla de sitio de siempre no cambia.
- **A saltos y solo con «todos»**: es ambiente; un cambio de `display`, nunca una animación que corra siempre (dos repintados del frente cada cinco minutos durante una hora). Con «esenciales» o «ninguno», quietos.
- **Nodos**: un trazo más por oso (los tres, 35 de tope 40).
- **Para después** (ideas 43–47): el osito de visita en el valle y lo que lleva según la fecha (los reemplaza el Pueblo de los Osos, campamentos 35–38), el que baja por la nieve al mediodía, el nacimiento de osos y el oso cartero.

### Verificado
- `test_lib`: la franja (de 7 a 8, el primer minuto de cada cinco), un trazo de brazos por oso y sus puntas, que son las que se comprueban; la prueba de siempre de «nada contra el cielo» deja aparte los brazos; el tope de nodos del trío, de 25 a 28.
- Bloque «campamento 33» de `test_ui`: a las 7:00 el reloj los pone a estirarse (o no, si no caben) y a los 2.6 s quedan quietos; con «esenciales», nunca.
- Capturas a 390 y 1440 px (a 390, en esta escena, las puntas no caben: no se estiran).

### Sin probar aquí
- iPhone real y Safari.
