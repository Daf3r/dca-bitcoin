import { $, S, api } from './estado.js';
import { ofrecerAvisos } from './cuenta.js';

// «Qué hay de nuevo» (idea 158): tras una actualización, una tarjeta breve (una sola vez por persona) cuenta qué cambió. No es una ayuda:
// es un aviso corto. **Para cada versión con cambios que se vean, añade una entrada ARRIBA** con un `id` nuevo (se compara como texto
// y solo vale `[0-9a-z.-]`, hasta 40 caracteres) y 3 a 6 frases cortas, sin tecnicismos. La tarjeta enseña solo la primera
// (`CAMBIOS[0]`): si salen varias casi a la vez, la nueva las resume (quien no abrió la app esos días solo vería la última). Lo guardado
// por persona es el `id` de la última que vio (`usuarios.cambios_visto`); una cuenta nueva no ve nada «que haya cambiado» y se marca sin
// avisar. Aquí quedan solo las últimas entradas (el archivo se sirve entero); las anteriores están en el historial de git.
export const CAMBIOS = [
  {
    // (Campamento 45) Los animales de aquí; resume también las temporadas y las fiestas del pueblo (2026-12-z y 2026-12-y).
    id: '2026-12-za',
    items: [
      'El pueblo vive sus fiestas y sus temporadas: mangos en marzo, posadas en diciembre y mejenga los domingos.',
      'Llegan los animales de aquí: un gallo al amanecer, un garrobo al sol en la época seca y zanates al atardecer.',
      'Algunas noches, un tecolote vela en el árbol de la plaza.',
      'A mediodía las vacas se echan y por la tarde la garza pesca en la otra orilla del lago.',
    ],
  },
  {
    // (Campamento 43) Las temporadas del pueblo; resume también las fiestas del año (2026-12-y), un solo material (x) y el precio (w).
    id: '2026-12-z',
    items: [
      'El pueblo vive sus fiestas del año, cada una el día entero, y ahora también sus temporadas.',
      'En marzo hay mangos, la milpa tiene quien la siembre y los sábados de julio hay atol.',
      'En diciembre hay posadas, los domingos mejenga y, con luna llena, cuentos en la plaza.',
      'Los botones van más ordenados y el pueblo sigue la semana del precio.',
    ],
  },
  {
    // (Campamento 42) Las fiestas del resto del año; resume también un solo material (2026-12-x) y el precio a su ritmo (2026-12-w).
    id: '2026-12-y',
    items: [
      'El pueblo vive sus fiestas del año, cada una el día entero: Semana Santa, mayo, junio, agosto y septiembre.',
      'El 14 de septiembre salen los farolitos, el Día del Niño hay piñata y el 2 de noviembre una velita en cada casa.',
      'Los botones van más ordenados: el naranja es solo para anotar y guardar.',
      'Y el pueblo sigue la semana del precio: unas semanas los vecinos se juntan y otras salen a la plaza.',
    ],
  },
  {
    // (Campamento 64) Un solo material; resume también el precio a su ritmo (2026-12-w). El renglón de «Dónde están tus sats» sin
    // traslados solo lo ve el dueño: no lleva frase.
    id: '2026-12-x',
    items: [
      'Los botones van más ordenados: el naranja es solo para anotar y guardar; lo demás es una píldora con borde o un enlace subrayado.',
      'Las tarjetas del Resumen tienen todas la misma forma y el mismo título, y «Próxima etapa» lleva el suyo como las demás.',
      'En el teléfono, en Gráficos, el rango de fechas y «Ampliar» van juntos, pegados al dibujo, y el gráfico queda más arriba.',
      'Y el pueblo sigue la semana del precio: unas semanas los vecinos se juntan y otras salen a la plaza.',
    ],
  },
  {
    // (Campamento E) El precio, a su ritmo; resume también «Tú» con más gestos (2026-12-v) y los osos de la cumbre (2026-12-u).
    id: '2026-12-w',
    items: [
      'El pueblo sigue la semana del precio: unas semanas los vecinos se juntan y otras salen a la plaza y tienden la ropa.',
      'Casi siempre está en calma. Se apaga en «Tu cuenta», en «Más ajustes de este aparato».',
      'El osito «Tú» acampa de noche, mira el atardecer y lleva en su mochila lo ya logrado.',
      'Los osos de la cumbre se estiran por la mañana, y al llegar a una etapa hay fiesta en el pueblo.',
    ],
  },
  {
    // (Campamento 48) «Tú» con más gestos; resume también los osos de la cumbre (2026-12-u) y el pueblo que se mueve (2026-12-t).
    id: '2026-12-v',
    items: [
      'El osito «Tú» acampa de noche en su carpita, mira el atardecer de espaldas y, en las tardes de lluvia, sube con capote amarillo.',
      'Por la mañana se estira con los osos de la cumbre, y al abrir la app se para un instante en cada campamento que pasa.',
      'Su mochila cuenta lo ya logrado: cuerda y piolet en los campamentos altos, un parche por cada medalla y una flor el día del aniversario.',
      'Los osos de la cumbre duermen de noche, se asoman cuando pasa algo en el pueblo y en diciembre hacen su oso de nieve.',
      'En el pueblo se mueven más vecinos, y al llegar a una etapa hay fiesta para toda la familia.',
    ],
  },
  {
    // (Campamento 47) Los osos de la cumbre; resume también el pueblo se mueve 2 (2026-12-t) y la fiesta del hito, que salen casi a la vez.
    id: '2026-12-u',
    items: [
      'Los osos de la cumbre duermen de noche y, al atardecer, se ponen de espaldas a mirar cómo baja el sol.',
      'Cuando pasa algo en el pueblo, uno de ellos se asoma a mirar.',
      'De vez en cuando se acomodan o se estiran, y en diciembre va creciendo a su lado un oso de nieve.',
      'En el pueblo se mueven más vecinos: el panadero en su bicicleta, la tortillera y la hamaca de la siesta.',
      'Al llegar a una etapa, el pueblo hace fiesta una vez para toda la familia.',
    ],
  },
  {
    // (Campamento 49) El pueblo se mueve 2; resume también la pantalla grande (2026-12-s) y la fiesta del hito (2026-12-r), que salen casi a la vez.
    id: '2026-12-t',
    items: [
      'Los osos del pueblo se mueven más: el panadero cruza en su bicicleta, la tortillera palmea y la hamaca de la siesta se mece.',
      'A mediodía la campana de la torre se mece unos minutos.',
      'Cuando cambia la hora del pueblo, algún vecino camina hasta su sitio nuevo.',
      'En las pantallas anchas pueden moverse dos cosas a la vez, lejos una de la otra.',
      'Al llegar a una etapa, el pueblo hace fiesta una vez para toda la familia, y en la pantalla grande todo se lee de lejos.',
    ],
  },
  {
    // (Campamento D) La pantalla grande a 1920×1080; resume también la fiesta del hito (2026-12-r), la neblina y los vecinos con oficio, que salen casi a la vez.
    id: '2026-12-s',
    items: [
      'En la pantalla grande los nombres de la montaña se leen de lejos, con menos datos a la vista.',
      'En las pantallas anchas el pueblo se ve más grande.',
      'En la pantalla grande el saldo se corre un poquito cada rato, para cuidar la pantalla.',
      'Al llegar a una etapa, el pueblo hace fiesta una vez para toda la familia: campana, farolitos y cohetes.',
      'La neblina de la mañana es más suave, y los vecinos tienen oficio.',
    ],
  },
  {
    // (Campamento 59) La fiesta del hito; resume también la neblina (2026-12-p y q) y los vecinos con oficio (2026-12-o), que salen casi a la vez.
    id: '2026-12-r',
    items: [
      'Al llegar a una etapa, el pueblo hace fiesta: campana, osos en la plaza, farolitos y cohetes.',
      'La ve toda la familia ese día, una vez, y queda un farol en la plaza hasta la medianoche.',
      'Un toque la salta, y cada etapa tiene su fiesta una sola vez.',
      'La neblina de la mañana es más suave y se levanta poco a poco hasta las nueve.',
      'Los vecinos tienen oficio, y el pueblo y su suelo se ven limpios.',
    ],
  },
  {
    // (Campamento 53B) La neblina, segunda pasada; resume también la primera (2026-12-p) y los vecinos con oficio (2026-12-o).
    id: '2026-12-q',
    items: [
      'La neblina dura más: se forma desde las cinco y se va levantando poco a poco hasta las nueve.',
      'Al caer la tarde vuelve, fina, y se va antes de la noche.',
      'En pantallas grandes, una bruma baja se queda detrás de las casas del pueblo, sin tocar el suelo.',
      'Es clara y suave, sin bordes, y el pueblo y su suelo se ven limpios.',
      'Los vecinos del pueblo tienen oficio: el panadero, la maestra, el pescador, el sacristán… y cada uno sigue su día.',
    ],
  },
  {
    // (Campamento 53A) La neblina de la mañana; resume también los vecinos con oficio (2026-12-o) y el día entero del pueblo (2026-12-n),
    // que salen casi a la vez.
    id: '2026-12-p',
    items: [
      'La neblina de la mañana ahora parece neblina: suave, sin bordes, y deja ver lo que hay detrás.',
      'Se queda en el fondo del valle, detrás de la loma y de la montaña: el pueblo y su suelo se ven limpios.',
      'Los vecinos del pueblo tienen oficio: el panadero, la maestra, el pescador, el sacristán… y cada uno sigue su día.',
      'El pueblo vive el día entero, de las tortillas a la fresca en la acera, y los lunes el panadero descansa.',
      'Con muchas compras, «Tu historia» va por semanas: toca una para verla día por día.',
    ],
  },
  {
    // (Campamento 52) Vecinos con oficio; resume también el día entero del pueblo (2026-12-n) y «Tu historia» a miles (2026-12-m).
    id: '2026-12-o',
    items: [
      'Los vecinos del pueblo tienen oficio, y cada uno lleva siempre su ropa: el panadero, la maestra, el pescador, el sacristán…',
      'Cada uno sigue su día: el pan de madrugada, el pescado a media mañana y la iglesia que se abre y se cierra.',
      'Dos vecinos se encuentran cada mañana y cada tarde, y un osezno lleva un recado.',
      'Los lunes el panadero descansa y los sábados hay tamales.',
      'El pueblo vive el día entero, de las tortillas a la fresca en la acera.',
      'Con muchas compras, la partitura de «Tu historia» va por semanas.',
    ],
  },
  {
    // (Campamento 40) El día entero del pueblo; resume también «Tu historia» a miles (2026-12-m), anotar y buscar (2026-12-l) y los menús
    // (2026-12-k), que salen casi a la vez.
    id: '2026-12-n',
    items: [
      'El pueblo vive el día entero: el pan de madrugada, las tortillas, la salida de la escuela, la hamaca y la fresca en la acera.',
      'Cada día el pueblo está un poco distinto, y los lunes y jueves hay ropa tendida.',
      'Al anochecer las luces se encienden una a una, y las sombras de las casas siguen al sol.',
      'Con muchas compras, la partitura de «Tu historia» va por semanas: toca una para verla día por día.',
      'En «Movimientos», buscar y filtrar van en una fila.',
      '«Tu cuenta» se cierra desde arriba y es más corta.',
    ],
  },
  {
    // (Campamentos 57 y 58) «Tu historia» a miles de compras; resume también anotar y buscar (2026-12-l), que sale casi a la vez.
    id: '2026-12-m',
    items: [
      'Con muchas compras, la partitura de «Tu historia» va por semanas: toca una para verla día por día.',
      'La partitura tiene «Todos»: cada año en una línea, una figura por mes.',
      'Con cientos de compras, la constelación lleva una estrella por semana.',
      'Las compras extra se marcan donde fueron más de la mitad.',
      'En «Movimientos», buscar y filtrar van en una fila.',
    ],
  },
  {
    // (Campamento 63) Anotar y buscar; resume también los menús (2026-12-k), que salen casi a la vez. Lo de la hoja de anotar («Guardar»
    // dice qué falta, ayudas más cortas) solo lo ve quien anota: no va aquí.
    id: '2026-12-l',
    items: [
      'En «Movimientos», buscar y filtrar van en una fila.',
      'En el teléfono, los filtros se abren con «Filtros», que dice cuál está puesto.',
      'Los campos donde se escribe se distinguen mejor, también con sol.',
      '«Tu cuenta» se cierra desde arriba y es más corta.',
      'En el pueblo sale humo de una chimenea y el cayuco se mece en el lago.',
    ],
  },
  {
    // (Campamento 62) Los menús; resume también el director del valle (2026-12-j), que sale casi a la vez.
    id: '2026-12-k',
    items: [
      '«Tu cuenta» se cierra desde arriba y es más corta.',
      'Los ajustes que casi no se tocan van en «Más ajustes de este aparato».',
      'En la computadora, «Anotar compra» queda junto a las pestañas.',
      'En la barra de abajo, «Movimientos» ya cabe en su sitio.',
      'En el pueblo sale humo de una chimenea y el cayuco se mece en el lago.',
      'Los días de fiesta un aviso corto lo cuenta, y en Navidad el pueblo vive el día entero.',
    ],
  },
  {
    // (Campamento 51) El director del valle; resume también el tempo (2026-12-i) y la Navidad (2026-12-h), que salen casi a la vez.
    id: '2026-12-j',
    items: [
      'De día sale humo de una chimenea del pueblo y el cayuco del pescador se mece en el lago.',
      'El valle va con más calma: las piscuchas se mecen despacio y la que barre descansa entre pasadas.',
      'Un día de fiesta, de luna llena o cuando llegan los azacuanes, un aviso corto lo cuenta.',
      'En Navidad el pueblo vive el día entero, del pan de madrugada a los abrazos de las doce.',
      'La celebración de una etapa dura un poco más; un toque la cierra.',
    ],
  },
  {
    id: '2026-12-i',
    items: [
      'El valle va con más calma: el humo sale en bocanadas y las piscuchas se mecen despacio.',
      'En el pueblo la pelota bota, rueda y vuelve, y la que barre descansa entre pasadas.',
      'La celebración de una etapa dura un poco más; un toque la cierra.',
      'En Navidad el pueblo vive el día entero, del pan de madrugada a los abrazos de las doce.',
    ],
  },
  {
    id: '2026-12-h',
    items: [
      'En Navidad, el pueblo vive el día entero: el 24 hay pan de madrugada, tamales, cena en la calle, misa de gallo y abrazos a las doce.',
      'El 25 los oseznos estrenan juguetes; el 31, a las once, todo el pueblo espera las doce mirando la torre.',
      'El 1 de enero el pueblo duerme hasta tarde y el 6 se guarda la Navidad.',
      'A medianoche aparecen regalos junto a los osos de la cumbre y «Tú» levanta los brazos para ver los cohetes.',
    ],
  },
  {
    id: '2026-12-g',
    items: [
      'El punto naranja del sendero es ahora un osito con mochila: anda al subir, festeja y deja huellas.',
      'Los osos de la cumbre también leen en la lista vacía, saludan al entrar por primera vez, van en teleférico y duermen en la tele.',
      'De madrugada duermen, en Navidad se abrigan, con lluvia sacan paraguas y en fiestas patrias, la banderita.',
      'En el pueblo los vecinos son osos: a cada hora hay otros en la calle, el domingo van a misa y el 15 de septiembre desfilan.',
    ],
  },
  {
    id: '2026-12-f',
    items: [
      'En la nieve, bajo la cumbre, se sentaron tres osos polares de peluche: el grande con su camiseta azul y su cinta roja, el chico y el del mameluco celeste.',
      'Si un rótulo o «Tú» les cae encima, se esconden un rato; en una pantalla pequeña a veces cabe uno solo, o ninguno.',
      'Dan un saltito cuando se anota una compra y, con la aurora, miran al cielo. En Navidad llevan bufanda y, el día de un cumpleaños de la familia, el grande estrena gorrito.',
      'Y el sello de 1 BTC lleva ahora la cara de un oso.',
    ],
  },
  {
    id: '2026-12-e',
    items: [
      'Al pie de la montaña hay ahora un pueblo, con campos, un lago y un bosque que crece con cada compra; el paisaje cambia con las épocas del año.',
      'De noche se encienden luces en el valle, una por cada mes del libro, y en Navidad toda la montaña se viste de fiesta.',
      'En «Tu historia» está la película del ascenso: el camino del libro, de la primera compra a hoy, en quince segundos.',
      'En «Movimientos», al elegir una etiqueta en «Fechas y orden», se ve cuántos sats suman.',
    ],
  },
  {
    id: '2026-12-d',
    items: [
      'En «Movimientos», al elegir una etiqueta en «Fechas y orden», el renglón de arriba de la lista dice además cuántos sats suman esos movimientos: «12 de 140 movimientos · 310,000 sats comprados».',
      'Si con esa etiqueta también hay ventas o gastos, los cuenta aparte y da el neto: «neto +290,000 sats (310,000 comprados, 20,000 vendidos)».',
      'Solo suma lo que se ve con los filtros de ese momento; el saldo de arriba sigue siendo el de todo el libro.',
    ],
  },
  {
    id: '2026-12-c',
    items: [
      'Un día como hoy en que el libro llegó a un campamento o a una etapa, hace uno o más años, el saludo lo recuerda y el Diario lo cuenta al empezar «Hace un año».',
      'En «Tu historia» está la película del ascenso: en quince segundos, el camino del libro desde la primera compra hasta hoy, sobre la montaña de hoy.',
      'Mientras corre, arriba se ve el saldo de cada día; los faroles de los campamentos se encienden al pasarlos y el bosque crece con las compras.',
      'Con el deslizador se va a cualquier día. Y en la línea de «Tu historia», cada etapa con fecha tiene «Ver ese día», que abre la película detenida ahí.',
    ],
  },
];
const ULTIMO = CAMBIOS[0];

const dCam = $('d-cambios');
/** ¿Falta mostrar el aviso de cambios a esta persona? (Con `null` —cuenta nueva— se marca en silencio y no hay nada que mostrar.) */
export function cambiosPendientes() {
  if (!S.rol || S.cambios === undefined) return false;
  if (S.cambios === null) { marcarVisto(); return false; }
  return S.cambios !== ULTIMO.id;
}
async function marcarVisto() {
  S.cambios = ULTIMO.id;
  try { await api('/api/cambios-visto', { metodo: 'POST', cuerpo: { id: ULTIMO.id } }); } catch { /* sin red: saldrá otra vez */ }
}
export function mostrarCambios() {
  if (dCam.open) return;
  const lista = $('cam-lista');
  lista.textContent = '';
  for (const t of ULTIMO.items) { const li = document.createElement('li'); li.textContent = t; lista.append(li); }
  dCam.showModal();
}
$('cam-ok').addEventListener('click', () => dCam.close());
dCam.addEventListener('close', async () => {
  await marcarVisto();
  ofrecerAvisos(); // lo que sigue: la oferta de avisos
});
