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
