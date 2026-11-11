import { $, S, api } from './estado.js';
import { ofrecerAvisos } from './cuenta.js';

// «Qué hay de nuevo» (idea 158): tras una actualización, una tarjeta breve (una sola vez por persona) cuenta qué cambió. No es una ayuda:
// es un aviso corto. **Para cada versión con cambios que se vean, añade una entrada ARRIBA** con un `id` nuevo (se compara como texto
// y solo vale `[0-9a-z.-]`, hasta 40 caracteres) y 3 a 6 frases cortas, sin tecnicismos. Lo guardado por persona es el `id` de la
// última que vio (`usuarios.cambios_visto`); una cuenta nueva no ve nada «que haya cambiado» y se marca sin avisar.
export const CAMBIOS = [
  {
    id: '2026-11-e', fecha: '2026-11-13',
    items: [
      'La app tiene un aspecto nuevo, más cálido: el cielo de la montaña cambia de color sin franjas y el sol y la luna dan una luz suave.',
      'Las montañas lejanas se pierden en la bruma, la cara que mira al sol se ilumina y las nubes y el lago se ven más naturales.',
      'Las tarjetas tienen más profundidad y la letra de los títulos es más suave.',
      'En pantallas grandes, bajo tu saldo ves tu costo promedio, tu racha y cuántas compras llevas.',
      'Cada wallet tiene ahora su propio color en «Dónde están tus sats».',
    ],
  },
  {
    id: '2026-11-d', fecha: '2026-11-12',
    items: [
      'Puedes tener varias wallets: al anotar un traslado elige a cuál va, y la tarjeta «Dónde están tus sats» las reparte con sus nombres.',
      'En «Avisos en este dispositivo» hay un botón para enviarte un aviso de prueba, y el recordatorio de compra trae el botón «Anotar compra».',
      'Opcional: elige un monto y te recordamos cuando en el exchange haya más sats de ese monto, por si quieres moverlos a tu wallet (solo es un recordatorio).',
      'Quien administra puede crear un enlace de solo lectura para ver tus compras en una hoja de cálculo (Google Sheets o Excel), y revocarlo cuando quiera.',
    ],
  },
  {
    id: '2026-11-c', fecha: '2026-11-11',
    items: [
      'Ahora puedes ponerle etiquetas a tus compras («cumpleaños», «bono»…) y filtrar la lista por ellas.',
      'En «Tu cuenta» está «Sesiones abiertas»: ves en qué dispositivos está tu cuenta y puedes cerrar cualquiera con un toque.',
      'Al entrar, marca «Este dispositivo es compartido» si es una computadora o tablet de varios: la sesión se cierra sola a las 4 horas.',
      'Quien administra puede descargar todo en un solo archivo y ver el estado del sistema.',
      'La app se ve bien también con el teléfono acostado y en pantallas muy grandes.',
    ],
  },
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
