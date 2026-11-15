import { avisar } from './avisar.js';
import { textoCumpleFecha } from './lib.js';
import { $, S, api } from './estado.js';
import { pintar } from './pintar.js';
import { pintarSaludo } from './cuenta.js';

// Mi cumpleaños (campamento 15B, idea 49): cada persona pone el suyo (mes y día). Ese día el libro la saluda y la montaña enciende un farol
// con su inicial. Es opcional y se puede quitar. Lo ve toda la familia (solo nombre, mes y día).
const dlg = $('d-cumple');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const sel = (id, opciones) => { for (const [v, t] of opciones) { const o = document.createElement('option'); o.value = v; o.textContent = t; $(id).append(o); } };
sel('cu-mes', MESES.map((m, i) => [String(i + 1).padStart(2, '0'), m]));
sel('cu-dia', Array.from({ length: 31 }, (_, i) => [String(i + 1).padStart(2, '0'), String(i + 1)]));

/** El texto del botón de «Tu cuenta». */
export const etiquetaCumple = () => (S.cumple ? `Mi cumpleaños: ${textoCumpleFecha(S.cumple)}` : 'Mi cumpleaños: sin poner');

export function abrirCumple() {
  const [m, d] = S.cumple ? S.cumple.split('-') : ['', ''];
  $('cu-mes').value = m;
  $('cu-dia').value = d;
  $('cu-quitar').hidden = !S.cumple;
  $('cu-error').textContent = '';
  dlg.showModal();
}
async function guardar(cumple) {
  const r = await api('/api/yo/cumple', { metodo: 'PUT', cuerpo: { cumple } });
  S.cumple = r.cumple;
  S.cumples = await api('/api/cumples').catch(() => S.cumples);
  dlg.close();
  pintarSaludo();
  pintar({ montana: true });
  avisar(r.cumple ? `Listo: tu cumpleaños es el ${textoCumpleFecha(r.cumple)}.` : 'Cumpleaños quitado.', null, true);
}
$('f-cumple').addEventListener('submit', async (e) => {
  e.preventDefault();
  const m = $('cu-mes').value, d = $('cu-dia').value;
  if (!m || !d) { $('cu-error').textContent = 'Elige el mes y el día.'; return; }
  try { await guardar(`${m}-${d}`); } catch (err) { $('cu-error').textContent = err.message; }
});
$('cu-quitar').addEventListener('click', async () => { try { await guardar(null); } catch (err) { $('cu-error').textContent = err.message; } });
$('cu-cancelar').addEventListener('click', () => dlg.close());
