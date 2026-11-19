import { avisar } from './avisar.js';
import { fechaLarga, firmasDe, nombreHito } from './lib.js';
import { avatar } from './iconos.js';
import { huella } from './arte-osos-poses.js';
import { $, S, api, esAdmin } from './estado.js';
import { actualizarFirmas } from './montana.js';
import { refrescarHistoria } from './historia.js';

// El libro de cumbre (campamento 19, idea 18): en cada campamento al que el libro ya llegó, cada persona de la familia deja una firma
// (hasta 80 caracteres, una línea) y la puede reescribir o borrar; quien anota puede quitar cualquiera. Lo leen todos. La tarjeta de la
// bandera (montana.js) y «Tu historia» avisan con `libro:firmas`; aquí se abre el libro. Todo texto entra con `textContent`.
const dlg = $('d-firmas');
let hito = null, alcanzado = false, confirmar = null, confirmarTimer = 0;
const MAX = 80;
const largo = (t) => [...t].length; // como el servidor: caracteres, no unidades de UTF-16 (un emoji cuenta uno)
const contar = () => { $('fi-cuenta').textContent = `${largo($('fi-texto').value)} de ${MAX}`; };
$('fi-texto').addEventListener('input', () => { contar(); $('fi-error').textContent = ''; });
const dia = (ts) => fechaLarga(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date(ts * 1000)));
const nodo = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };

function pintarLista() {
  const lista = $('fi-lista');
  lista.textContent = '';
  const fs = firmasDe(S.firmas, hito);
  if (!fs.length) { lista.append(nodo('li', 'fi-vacio', alcanzado ? 'Nadie ha firmado todavía. La primera firma puede ser la tuya.' : 'Nadie firmó este libro.')); return; }
  for (const f of fs) {
    const li = nodo('li', `fi-firma${f.mia ? ' mia' : ''}`);
    li.insertAdjacentHTML('beforeend', avatar(f.quien));
    const cuerpo = nodo('div', 'fi-cuerpo');
    const cab = nodo('p', 'fi-quien');
    cab.append(nodo('b', null, f.mia ? `${f.quien} (tú)` : f.quien), nodo('time', null, dia(f.editado ?? f.creado)));
    // Quien anota puede quitar la firma de otra persona (con un segundo toque para confirmar). El botón va en el renglón del nombre: así el
    // texto de la firma tiene todo el ancho (con letra grande en un teléfono estrecho, a su lado quedaba en una columna de una palabra).
    if (esAdmin() && !f.mia) {
      const b = nodo('button', 'fi-quitar');
      b.type = 'button';
      b.dataset.id = String(f.id);
      b.dataset.quien = f.quien;
      b.append(nodo('span', 'fi-quitar-t', 'Quitar'), nodo('span', 'sr', ` la firma de ${f.quien}`));
      cab.append(b);
    }
    cuerpo.append(cab, nodo('p', 'fi-txt', f.texto));
    li.append(cuerpo);
    lista.append(li);
  }
}

function pintarFormulario() {
  const mia = firmasDe(S.firmas, hito).find((f) => f.mia);
  $('fi-campos').hidden = !alcanzado;
  $('fi-guardar').hidden = !alcanzado;
  $('fi-cerrado').hidden = alcanzado;
  $('fi-borrar').hidden = !mia;
  $('fi-guardar').textContent = mia ? 'Guardar mi firma' : 'Firmar';
  $('fi-texto').value = mia?.texto ?? '';
  contar();
}

/** Abre el libro de cumbre del campamento `m`. Se enfoca el título (no el campo): primero se lee lo que firmaron los demás. */
export function abrirFirmas(m, { alcanzado: alc = false } = {}) {
  hito = m;
  alcanzado = Boolean(alc);
  $('fi-t').textContent = `Campamento ${nombreHito(m)}`;
  $('fi-error').textContent = '';
  $('fi-estado').textContent = '';
  confirmar = null;
  pintarLista();
  pintarFormulario();
  // (Campamento 29) Una huella de oso junto a «Libro de cumbre», del color de la tinta del cuaderno: los de la cumbre también firman.
  const marca = dlg.querySelector('.fi-marca');
  if (!marca.querySelector('.oso-huella')) marca.insertAdjacentHTML('afterbegin', huella({ tam: 20 }));
  if (!dlg.open) dlg.showModal();
  $('fi-t').focus();
}

async function recargar() {
  S.firmas = await api('/api/firmas').catch(() => S.firmas);
  actualizarFirmas(S.firmas);
  refrescarHistoria();
}

$('f-firma').addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = $('fi-texto').value.replace(/\s+/g, ' ').trim();
  if (!texto) { $('fi-error').textContent = 'Escribe tu firma.'; $('fi-texto').focus(); return; }
  if (largo(texto) > MAX) { $('fi-error').textContent = `La firma admite hasta ${MAX} caracteres.`; $('fi-texto').focus(); return; }
  const b = $('fi-guardar');
  b.disabled = true;
  try {
    const r = await api(`/api/firmas/${hito}`, { metodo: 'PUT', cuerpo: { texto } });
    await recargar();
    dlg.close();
    avisar(r.nueva ? `Firmaste el libro de cumbre del campamento ${nombreHito(hito)}.` : 'Tu firma quedó guardada.', null, true);
  } catch (err) { $('fi-error').textContent = err.message; }
  b.disabled = false;
});

// Borrar la propia firma: sin pedir confirmación, pero con «Deshacer» (la vuelve a escribir igual, si el libro sigue en ese campamento).
$('fi-borrar').addEventListener('click', async () => {
  const mia = firmasDe(S.firmas, hito).find((f) => f.mia);
  if (!mia) return;
  const m = hito;
  try {
    await api(`/api/firmas/${m}/${mia.id}`, { metodo: 'DELETE' });
    await recargar();
    dlg.close();
    avisar('Quitaste tu firma del libro de cumbre.', alcanzado ? async () => {
      try { await api(`/api/firmas/${m}`, { metodo: 'PUT', cuerpo: { texto: mia.texto } }); await recargar(); avisar('Tu firma volvió al libro.', null, true); }
      catch (err) { avisar(`No se pudo deshacer: ${err.message}`); }
    } : null, true, { etiqueta: 'Deshacer', ms: 8000 });
  } catch (err) { $('fi-error').textContent = err.message; }
});

// Quitar la firma de otra persona (solo quien anota): el primer toque pregunta, el segundo quita. Sin «Deshacer»: no se escribe en nombre
// de otra persona.
function soltarConfirmacion() {
  clearTimeout(confirmarTimer);
  if (confirmar?.isConnected) confirmar.querySelector('.fi-quitar-t').textContent = 'Quitar';
  confirmar?.removeAttribute('data-confirmar');
  confirmar = null;
}
$('fi-lista').addEventListener('click', async (e) => {
  const b = e.target.closest('.fi-quitar');
  if (!b) return;
  if (confirmar !== b) {
    soltarConfirmacion();
    confirmar = b;
    b.dataset.confirmar = '1';
    b.querySelector('.fi-quitar-t').textContent = 'Sí, quitar';
    $('fi-estado').textContent = `¿Quitar la firma de ${b.dataset.quien}? Toca «Sí, quitar» para confirmar.`;
    confirmarTimer = setTimeout(() => { soltarConfirmacion(); $('fi-estado').textContent = ''; }, 6000);
    return;
  }
  soltarConfirmacion();
  try {
    await api(`/api/firmas/${hito}/${b.dataset.id}`, { metodo: 'DELETE' });
    await recargar();
    pintarLista();
    $('fi-estado').textContent = `Quitaste la firma de ${b.dataset.quien}.`;
    $('fi-t').focus();
  } catch (err) { $('fi-error').textContent = err.message; }
});

$('fi-cerrar').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => { soltarConfirmacion(); });
// La tarjeta del campamento (montana.js) y «Tu historia» avisan con este evento.
document.addEventListener('libro:firmas', (e) => abrirFirmas(e.detail.hito, { alcanzado: e.detail.alcanzado }));
