import { avisar } from './avisar.js';
import { $, S, api } from './estado.js';
import { pintar } from './pintar.js';

// Bautizar la montaña (campamento 19, idea 21): quien anota le pone nombre a la montaña del libro (hasta 32 caracteres). El nombre sale en
// el Diario, en el certificado de altitud y en la tele; nunca en la pantalla de entrada (ahí no se enseña nada antes de iniciar sesión).
// Solo el nombre: la bandera de la cumbre no se elige (decidido). Aquí solo se escribe y se quita; lo pintan diario.js, historia.js y tv.js.
const dlg = $('d-montana');
const MAX = 32;
const largo = (t) => [...t].length; // como el servidor: por caracteres
const contar = () => { $('mo-cuenta').textContent = `${largo($('mo-nombre').value)} de ${MAX}`; };
$('mo-nombre').addEventListener('input', () => { contar(); $('mo-error').textContent = ''; });

/** El botón de «Tu cuenta» (solo el dueño): «Nombre de la montaña: La Ceiba». Se arma con sus partes (el nombre puede llevar «: »). */
export function etiquetaMontana() {
  const b = $('dc-montana');
  const parte = (clase, txt) => { const e = document.createElement('span'); e.className = clase; e.textContent = txt; return e; };
  b.replaceChildren(parte('dc-k', 'Nombre de la montaña'), parte('dc-dp', ': '), parte('dc-v', S.montana || 'sin nombre'));
}

export function abrirMontana() {
  $('mo-nombre').value = S.montana ?? '';
  $('mo-quitar').hidden = !S.montana;
  $('mo-error').textContent = '';
  contar();
  dlg.showModal();
  $('mo-nombre').focus();
}
async function guardar(nombre) {
  const r = await api('/api/montana', { metodo: 'PUT', cuerpo: { nombre } });
  S.montana = r.nombre ?? null;
  dlg.close();
  etiquetaMontana();
  pintar();
  avisar(S.montana ? `La montaña se llama «${S.montana}».` : 'La montaña ya no tiene nombre.', null, true);
}
$('f-montana').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = $('mo-nombre').value.replace(/\s+/g, ' ').trim();
  if (!nombre) { $('mo-error').textContent = 'Escribe un nombre (o usa «Quitar el nombre»).'; $('mo-nombre').focus(); return; }
  if (largo(nombre) > MAX) { $('mo-error').textContent = `El nombre admite hasta ${MAX} caracteres.`; $('mo-nombre').focus(); return; }
  try { await guardar(nombre); } catch (err) { $('mo-error').textContent = err.message; }
});
$('mo-quitar').addEventListener('click', async () => { try { await guardar(''); } catch (err) { $('mo-error').textContent = err.message; } });
$('mo-cancelar').addEventListener('click', () => dlg.close());
