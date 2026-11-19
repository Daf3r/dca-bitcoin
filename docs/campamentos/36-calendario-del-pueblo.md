# Campamento 36 · El calendario del pueblo

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Los vecinos y sus turnos: [35-pueblo-de-los-osos.md](35-pueblo-de-los-osos.md).

## Campamento 36 · El calendario del pueblo (ideas 108–113)
La originalidad según el día sin inventar costumbres: cada fecha es otro reparto de los mismos osos, y otro turno en `cielo.js: turno`. Con eso entran la misa del domingo (era la 48) y el día de plaza (era la 53), ya con osos. Ningún nodo más, salvo el azul del 15 de septiembre. El nacimiento no se toca.

- **El domingo, a misa** (108): de 7:30 a 10:00 los vecinos van por el atrio, de espaldas (`espaldas`: la nuca y las orejas, sin cara), camino de la puerta, y un vecino lleva a su osezno de la mano, delante de la torre.
  - **El padre** (109, aprobado por el dueño): un oso con sotana negra y alzacuellos a la puerta (`cura`).
  - Si a la familia no le suena bien, se quita solo ese turno, o solo el padre: una línea en `reparto`.
- **El sábado, más plaza** (110): de 7:00 a 12:00, dos vendedoras con su canasto, el campesino, una vecina y un osezno en la plaza. Sin puestos, toldos ni rótulos (y sin el de las minutas, que se parecía a la carreta descartada). El día se cambia en una línea.
- **El 15 de septiembre, el desfile** (111): de 7:00 a 12:00, el abanderado con la azul y blanco (franjas, sin escudo, nunca en el suelo) y el del bombo de la banda de paz (`v-vo-azul`, el azul de la bandera de la plaza, +1 nodo ese día). Los vecinos miran en la plaza ya embanderada. Quietos: nadie marcha.
- **En Navidad, frente al nacimiento** (112): del 1 de diciembre al 6 de enero, al anochecer (turno `posada`), una osa de espaldas y su osezno miran el portal; además está lo de las pupusas.
  - El portal no cambia. Su sitio (`lugaresPueblo: portal`) va del lado contrario al astro, a 14 unidades de su centro: en la maqueta quedaban pegados, y ahora tienen unas 4 unidades de aire (comprobado con la luz de cada lado).
- **Nochebuena y el 31: estrellitas** (113): de 18:00 a 1:00 (pasada la medianoche ya es el 25 o el 1), tres oseznos de la plaza con su estrellita encendida (`oseznoLuz`: la chispa en el trazo de la brasa, quieta; titilar sería otra animación) y los vecinos en la calle. Los cohetes de las 23:50 siguen como están.
- **El atrio y el perro**: para que quepan los dos de espaldas y el padre a la puerta, el perro echado se corre a la esquina de la plaza y el farol de esa esquina va un poco más adentro, detrás de él (su poste no le atraviesa la cabeza). Los vecinos ya no se paran sobre el perro ni sobre las gallinas (pulido de la iglesia). Delante de la cruz de mayo, sí (así se diseñó en el 34).
- **Los turnos** quedan así:
  - desfile, el 15 de septiembre de 7:00 a 12:00;
  - nochebuena, el 24 y el 31 de 18:00 a 1:00;
  - duerme, de 22:00 a 5:00;
  - amanece, hasta las 7:00;
  - misa, el domingo de 7:30 a 10:00;
  - mercado, el sábado de 7:00 a 12:00;
  - mañana o mañana libre, hasta las 11:30;
  - siesta, hasta las 14:00;
  - tarde, hasta las 17:45;
  - al anochecer, posada en Navidad y pupusas el resto del año.

**Nodos**: los turnos de calendario no suman nodos (otro reparto de los mismos trazos), salvo el azul del 15 de septiembre (+1). Banco con mil compras a 390×664: 924 un día normal, 1030 en Nochebuena (con las estrellitas).

### Verificado
- `test_lib` (975):
  - los turnos de calendario, con sus bordes: la misa, el sábado hasta las 12:00, el desfile, la posada del 10 de diciembre al 6 de enero (el 7, ya pupusas) y las estrellitas hasta la 1:00 del 25 y del 1;
  - en cada cuarto de hora de un año, un turno válido, y de noche nadie salvo en Nochebuena;
  - los repartos: el padre y dos de espaldas, dos vendedoras sin el de las minutas, el abanderado y el bombo (el azul solo ese día), tres estrellitas;
  - la osa frente al portal con aire, con la luz de cada lado.
- Bloque «campamento 36» de `test_ui`, a 390 y 1440 px: los cinco turnos de calendario en sus fechas; en la posada nadie sobre el portal.
- Bloques 34, 35 y los dos de pulido de `test_ui`, y Biome.
- Capturas a 390 y 1440 de cada fecha: `osos/impl/cap36` en el scratchpad de la sesión.

### Sin probar aquí
- iPhone real y Safari.
- Lo de la familia: si la misa y el padre les suenan bien.
