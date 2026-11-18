import { avisar } from './avisar.js';
import { etapasFuturas, fechaLarga, mananaISO, nombreHito, textoApertura } from './lib.js';
import { cartaAbierta, cartaSellada } from './arte-sellos.js';
import { pose } from './arte-osos-poses.js';
import { $, R, S, api, esAdmin, reducido } from './estado.js';

// Cartas para el futuro (campamento 15A, idea 33): el dueño escribe una carta con lacre que se abre sola en una fecha o al llegar a una
// etapa. Toda la familia la ve abrirse. El texto de una carta sellada **nunca llega a la página** (lo guarda el servidor hasta su momento).
const CLAVE_LEIDAS = 'libro.capsulas.leidas';
const leidas = () => { try { return new Set(JSON.parse(localStorage.getItem(CLAVE_LEIDAS) ?? '[]')); } catch { return new Set(); } };
const marcarLeida = (id) => { try { localStorage.setItem(CLAVE_LEIDAS, JSON.stringify([...leidas().add(id)])); } catch { /* vale para esta visita */ } };
const nodo = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };

export function pintarCapsulas() {
  const caja = $('capsulas'), lista = $('cap-lista');
  const admin = esAdmin();
  const hay = S.capsulas.length > 0;
  caja.hidden = !S.cargado || (!hay && !admin) || !R?.nCompras;
  $('cap-nueva').hidden = !admin;
  $('cap-pista').hidden = !admin || hay;
  // (Campamento 26) La invitación lleva al grande con su sobre lacrado (una vez: el dibujo no cambia).
  if (!$('cap-pista').hidden && !$('cap-pista').querySelector('.oso-ilu')) $('cap-pista').insertAdjacentHTML('afterbegin', pose('sobre', { tam: 72 }));
  lista.textContent = '';
  const vistas = leidas();
  for (const c of S.capsulas) {
    const li = nodo('li', `cap-item ${c.abierta ? 'abierta' : 'sellada'}`);
    li.dataset.id = c.id;
    const arte = nodo('div', 'cap-arte');
    arte.setAttribute('aria-hidden', 'true');
    arte.innerHTML = c.abierta ? cartaAbierta() : cartaSellada(c);
    const cuerpo = nodo('div', 'cap-cuerpo');
    if (c.abierta) {
      const nueva = c.texto && !vistas.has(c.id);
      cuerpo.append(nodo('b', null, `Carta de ${c.autor}, del ${fechaLarga(new Date((c.creado ?? 0) * 1000).toISOString().slice(0, 10))}`));
      if (nueva) cuerpo.append(nodo('span', 'cap-nueva', 'Nueva'));
      const b = nodo('button', 'enlace', 'Leer la carta');
      b.type = 'button';
      b.dataset.leer = c.id;
      cuerpo.append(b);
    } else {
      cuerpo.append(nodo('b', null, 'Una carta sellada'), nodo('small', null, textoApertura(c)));
      if (admin) {
        const l = nodo('button', 'enlace', 'Anular');
        l.type = 'button';
        l.dataset.anular = c.id;
        cuerpo.append(l);
      }
    }
    li.append(arte, cuerpo);
    lista.append(li);
  }
}

// ------------------------------------------------------------ leer una carta abierta
const dCarta = $('d-carta');
/** Sella una carta (y la repinta); devuelve la que creó el servidor. */
async function sellar(cuerpo) {
  const c = await api('/api/capsulas', { metodo: 'POST', cuerpo });
  S.capsulas = await api('/api/capsulas').catch(() => [...S.capsulas, c]);
  pintarCapsulas();
  return c;
}
async function anular(id) {
  await api(`/api/capsulas/${id}`, { metodo: 'DELETE' });
  S.capsulas = await api('/api/capsulas').catch(() => S.capsulas);
  pintarCapsulas();
}
$('cap-lista').addEventListener('click', async (e) => {
  const leer = e.target.closest('button[data-leer]');
  const quitar = e.target.closest('button[data-anular]');
  if (leer) abrirCarta(Number(leer.dataset.leer));
  if (quitar) {
    const c = S.capsulas.find((x) => x.id === Number(quitar.dataset.anular));
    try {
      await anular(c.id);
      // Deshacer = volver a sellarla igual (el dueño tiene el texto; una carta anulada sigue en la base, pero no se «desanula»).
      avisar('Carta anulada.', () => sellar({ texto: c.texto, ...(c.abre_fecha ? { abre_fecha: c.abre_fecha } : { abre_sats: c.abre_sats }) })
        .then(() => avisar('Carta sellada otra vez.', null, true)).catch((err) => avisar(err.message, null, true)), true, { etiqueta: 'Deshacer', ms: 8000 });
    } catch (err) { avisar(err.message, null, true); }
  }
});
function abrirCarta(id) {
  const c = S.capsulas.find((x) => x.id === id);
  if (!c?.texto) return;
  const primera = !leidas().has(id);
  $('carta-de').textContent = `De ${c.autor}, escrita el ${fechaLarga(new Date((c.creado ?? 0) * 1000).toISOString().slice(0, 10))}`;
  $('carta-texto').textContent = c.texto; // con textContent: la carta es texto, nunca HTML
  $('carta-arte').innerHTML = cartaAbierta({ abriendo: primera && !reducido() });
  dCarta.classList.toggle('abriendo', primera && !reducido());
  marcarLeida(id);
  pintarCapsulas();
  dCarta.showModal();
}
$('carta-ok').addEventListener('click', () => dCarta.close());

// ------------------------------------------------------------ escribir una carta
const dCap = $('d-capsula');
const contar = () => { $('cap-cuenta').textContent = `${$('cap-texto').value.length.toLocaleString('en-US')} de 1,000`; };
$('cap-texto').addEventListener('input', contar);
const cuando = () => document.querySelector('input[name="cap-cuando"]:checked').value;
function alternarCuando() {
  $('cap-fecha').disabled = cuando() !== 'fecha';
  $('cap-etapa').disabled = cuando() !== 'etapa';
}
for (const r of document.querySelectorAll('input[name="cap-cuando"]')) r.addEventListener('change', alternarCuando);
$('cap-nueva').addEventListener('click', () => {
  $('cap-texto').value = '';
  $('cap-error').textContent = '';
  $('cap-fecha').min = mananaISO();
  $('cap-fecha').value = '';
  const sel = $('cap-etapa');
  sel.textContent = '';
  for (const m of etapasFuturas(R.sats)) { const o = document.createElement('option'); o.value = String(m); o.textContent = m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`; sel.append(o); }
  document.querySelector('input[name="cap-cuando"][value="fecha"]').checked = true;
  alternarCuando();
  contar();
  dCap.showModal();
  $('cap-texto').focus();
});
$('cap-cancelar').addEventListener('click', () => dCap.close());
$('f-capsula').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cuerpo = { texto: $('cap-texto').value };
  if (cuando() === 'fecha') cuerpo.abre_fecha = $('cap-fecha').value; else cuerpo.abre_sats = Number($('cap-etapa').value);
  if (!cuerpo.texto.trim()) { $('cap-error').textContent = 'Escribe la carta.'; return; }
  if (cuando() === 'fecha' && !cuerpo.abre_fecha) { $('cap-error').textContent = 'Elige la fecha en que se abre.'; return; }
  try {
    const c = await sellar(cuerpo);
    dCap.close();
    avisar(`Carta sellada. ${textoApertura(c)}.`, () => anular(c.id).then(() => avisar('Carta anulada.', null, true)).catch((err) => avisar(err.message, null, true)), true, { etiqueta: 'Deshacer', ms: 8000 });
  } catch (err) { $('cap-error').textContent = err.message; }
});
