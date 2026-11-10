import { $, S, api } from './estado.js';
import { ofrecerAvisos } from './cuenta.js';

// «Qué hay de nuevo» (idea 158): tras una actualización, una tarjeta breve (una sola vez por persona) cuenta qué cambió. No es una ayuda:
// es un aviso corto. **Para cada versión con cambios que se vean, añade una entrada ARRIBA** con un `id` nuevo (se compara como texto
// y solo vale `[0-9a-z.-]`, hasta 40 caracteres) y 3 a 6 frases cortas, sin tecnicismos. Lo guardado por persona es el `id` de la
// última que vio (`usuarios.cambios_visto`); una cuenta nueva no ve nada «que haya cambiado» y se marca sin avisar.
export const CAMBIOS = [
  {
    id: '2026-11-b', fecha: '2026-11-10',
    items: [
      'La montaña ahora tiene una cima más cercana: la siguiente potencia de 10 (100k, 1M, 10M…). Al llegar, se rehace con la siguiente.',
      'Toca una bandera de la montaña para ver cuándo la alcanzaste; cada compra planta un pino al pie.',
      'En «Tu cuenta» está «Tu historia»: tus medallas de constancia y la línea de tiempo de cómo llegaste hasta aquí.',
      'Modo pantalla grande (también en «Tu cuenta»): la montaña, el saldo y el último movimiento para dejar el libro en un televisor.',
      'Sonido opcional al guardar una compra (apagado: se enciende en «Tu cuenta»).',
      'Iconos nuevos, colores por persona y una entrada que reacciona al escribir.',
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
