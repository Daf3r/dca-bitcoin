import { $, api } from './estado.js';
import { avisar } from './avisar.js';
import { copiarTexto } from './copiar.js';
import { hace } from './sistema.js';

// «Enlace para tu hoja de cálculo» (idea 159, solo admin): un enlace de solo lectura que Google Sheets (=IMPORTDATA) o Excel leen sin iniciar
// sesión. El token se muestra UNA vez al crearlo; el servidor solo guarda su huella. Se puede revocar cuando quieras (hasta 5 activos).
const el = (tag, props = {}, ...hijos) => { const e = Object.assign(document.createElement(tag), props); e.append(...hijos); return e; };

function mostrarNuevo(r) {
  const caja = $('en-nuevo');
  const base = location.origin;
  const filas = [['Compras', `${base}${r.rutas.compras}`], ['Traslados', `${base}${r.rutas.traslados}`]];
  caja.replaceChildren(
    el('p', { className: 'dc-nota' }, 'Este es tu enlace. Cópialo ahora: por seguridad no se vuelve a mostrar (si lo pierdes, revócalo y crea otro).'),
    ...filas.flatMap(([titulo, url]) => {
      const campo = el('input', { type: 'text', readOnly: true, value: url, className: 'en-url' });
      campo.setAttribute('aria-label', `Enlace de ${titulo.toLowerCase()}`);
      campo.addEventListener('focus', () => campo.select());
      const b = el('button', { type: 'button', className: 'ses-cerrar', textContent: 'Copiar' });
      b.setAttribute('aria-label', `Copiar el enlace de ${titulo.toLowerCase()}`);
      b.addEventListener('click', async () => avisar(await copiarTexto(url) ? `Enlace de ${titulo.toLowerCase()} copiado.` : 'No se pudo copiar: selecciónalo y cópialo a mano.', null, true));
      return [el('b', {}, titulo), el('div', { className: 'en-fila' }, campo, b)];
    }),
    el('p', { className: 'dc-nota' }, 'En Google Sheets, en una celda: ', el('code', {}, '=IMPORTDATA("…el enlace…")'), '. Se actualiza solo cada tanto.'),
  );
  caja.hidden = false;
}

export async function pintarEnlaces() {
  const ul = $('en-lista');
  $('en-error').textContent = '';
  let lista;
  try { lista = await api('/api/tokens'); } catch (err) { ul.replaceChildren(el('li', { className: 'vacio', textContent: `No se pudo cargar. ${err.message}` })); return; }
  const ahora = Math.floor(Date.now() / 1000);
  const activos = lista.filter((x) => !x.revocado).length;
  $('en-crear').disabled = activos >= 5;
  $('en-cupo').textContent = activos >= 5 ? 'Ya hay 5 enlaces activos: revoca alguno para crear otro.' : `${activos} de 5 enlaces activos.`;
  ul.replaceChildren(...(lista.length ? lista : []).map((x) => {
    const li = el('li', { className: 'sis-fila ses-fila' });
    const t = el('span', {}, el('b', { textContent: x.nombre }));
    if (x.revocado) t.append(el('span', { className: 'sis-palabra', textContent: ' · Revocado' }));
    t.append(document.createElement('br'), el('small', { textContent: `Creado ${hace(x.creado, ahora)} · ${x.ultimo_uso ? `último uso ${hace(x.ultimo_uso, ahora)}` : 'sin usar todavía'}` }));
    li.append(t);
    if (!x.revocado) {
      const b = el('button', { type: 'button', className: 'ses-cerrar', textContent: 'Revocar' });
      b.setAttribute('aria-label', `Revocar el enlace ${x.nombre}`);
      b.addEventListener('click', async () => {
        b.disabled = true;
        try { await api(`/api/tokens/${x.id}`, { metodo: 'DELETE' }); avisar('Enlace revocado: ya no funciona.', null, true); } catch (err) { avisar(`No se pudo revocar. ${err.message}`); }
        pintarEnlaces();
      });
      li.append(b);
    }
    return li;
  }));
  if (!lista.length) ul.append(el('li', { className: 'vacio', textContent: 'Todavía no hay enlaces.' }));
}

$('en-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = $('en-nombre').value.trim();
  $('en-error').textContent = '';
  if (!nombre) { $('en-error').textContent = 'Ponle un nombre al enlace (por ejemplo «Mi hoja de Google»).'; $('en-nombre').focus(); return; }
  $('en-crear').disabled = true;
  try {
    const r = await api('/api/tokens', { metodo: 'POST', cuerpo: { nombre } });
    $('en-nombre').value = '';
    mostrarNuevo(r);
  } catch (err) { $('en-error').textContent = err.message || 'No se pudo crear el enlace.'; }
  await pintarEnlaces();
});
