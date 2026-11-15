import { avisar } from './avisar.js';
import { nombreHito } from './lib.js';
import { $, S, api } from './estado.js';
import { pintar } from './pintar.js';

// Mensaje en la bandera (campamento 15A, idea 16): el dueño deja una frase en cada campamento y sale al tocar esa bandera. Los demás
// la ven cuando el campamento ya se alcanzó; antes, el servidor ni siquiera la manda (es una sorpresa). Aquí solo se escribe y se borra.
const dlg = $('d-mensaje');
let hito = null;
const nombre = (m) => (m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`);
const contar = () => { $('msg-cuenta').textContent = `${$('msg-texto').value.length} de 160`; };
$('msg-texto').addEventListener('input', contar);

/** Abre el cuadro para escribir (o cambiar) el mensaje del campamento `m`. */
export function abrirMensaje(m) {
  hito = m;
  const actual = S.mensajes.find((x) => x.hito === m)?.texto ?? '';
  $('msg-t').textContent = `Un mensaje en el campamento ${nombre(m)}`;
  $('msg-ayuda').textContent = 'Lo verán todos al tocar esa bandera, una vez que lleguen a ella. Hasta entonces es una sorpresa.';
  $('msg-texto').value = actual;
  $('msg-borrar').hidden = !actual;
  $('msg-error').textContent = '';
  contar();
  dlg.showModal();
  $('msg-texto').focus();
}
async function enviar(texto) {
  const r = await api(`/api/mensajes/${hito}`, { metodo: 'PUT', cuerpo: { texto } });
  S.mensajes = await api('/api/mensajes').catch(() => S.mensajes);
  return r;
}
$('f-mensaje').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await enviar($('msg-texto').value);
    dlg.close();
    pintar({ montana: true });
    avisar(`Mensaje guardado en el campamento ${nombre(hito)}.`, null, true);
  } catch (err) { $('msg-error').textContent = err.message; }
});
$('msg-borrar').addEventListener('click', async () => {
  try {
    await enviar('');
    dlg.close();
    pintar({ montana: true });
    avisar('Mensaje quitado.', null, true);
  } catch (err) { $('msg-error').textContent = err.message; }
});
$('msg-cancelar').addEventListener('click', () => dlg.close());
// La tarjeta del campamento (montana.js) avisa con este evento: la montaña no importa nada de la app.
document.addEventListener('libro:mensaje', (e) => abrirMensaje(e.detail.hito));
