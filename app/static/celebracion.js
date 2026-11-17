import { cruzo1Btc, etapaAnterior, etapaCelebrada, etapaSiguiente, metaSiguiente, nombreHito, nombreHitoMeses, rangoEtapa } from './lib.js';
import { avisar } from './avisar.js';
import { lacre, selloSemana } from './arte-sellos.js';
import { dCuenta } from './cuenta.js';
import { $, R, fijarR, reducido } from './estado.js';
import { MS_SUBIDA, esHito, pintar, pintarMontana } from './pintar.js';

// -------------------------------------------------------------- celebración
/**
 * Solo cuando la acción de esta sesión cruza un hito; breve y sin bloquear nada. Si coinciden una etapa y un
 * hito de constancia (10 compras, 6 meses…), la tarjeta de la etapa sale primero y la de constancia después.
 */
export function celebrar(antes, constancia = [], sello = null) {
  const tarjetas = [];
  // Cualquier etapa que se cruce hacia arriba; si son varias, la destacada (campamento, principal, intermedia; campamento 21). Una
  // intermedia lleva una tarjeta ligera y breve, sin lacre: los sellos son de las principales y los campamentos.
  const m = etapaCelebrada(antes.sats, R.sats);
  if (m) {
    const hito = esHito(m), ligera = rangoEtapa(m) === 'intermedia';
    if (cruzo1Btc(antes.sats, R.sats)) tarjetas.push({ k: 'Llegaste a la cumbre', txt: '1 BTC', grande: true, larga: true });
    else tarjetas.push({ k: hito ? 'Nuevo hito' : 'Nueva etapa', txt: m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`, grande: hito, ligera, lacre: ligera ? null : m });
  }
  for (const c of constancia.slice(-2)) tarjetas.push({ k: 'Constancia', txt: c.tipo === 'compras' ? `${c.valor} compras` : nombreHitoMeses(c.valor), grande: false });
  if (sello) tarjetas.push({ k: 'Sello de la semana', txt: sello.nombre, grande: false, sello }); // el pasaporte de «Tu historia» (13C)
  if (!tarjetas.length) return;
  const el = $('hito-cel');
  clearTimeout(celebrar.t);
  const mostrar = (i) => {
    if (i >= tarjetas.length) return;
    const t = tarjetas[i];
    $('hc-k').textContent = t.k;
    $('hc-txt').textContent = t.txt;
    $('hc-lacre').innerHTML = t.lacre ? lacre(t.lacre, { grande: true }) : t.sello ? selloSemana(t.sello, { grande: true, nuevo: true }) : ''; // el lacre de la etapa que cruzaste (13B) o el sello de la semana (13C)
    el.classList.toggle('sello-semana', Boolean(t.sello));
    el.classList.toggle('grande', t.grande);
    el.classList.toggle('ligera', Boolean(t.ligera));
    // Siempre bajo el saldo, sin tapar la cabecera, la cifra ni la etiqueta de la cumbre. En móvil y tablet va
    // centrada; en escritorio, alineada a la izquierda con el saldo.
    const saldo = document.querySelector('.saldo-d')?.getBoundingClientRect();
    if (saldo) el.style.top = `${Math.round(Math.max(saldo.bottom, 0) + 12)}px`;
    else el.style.removeProperty('top');
    if (saldo && innerWidth >= 1100) { el.style.justifyItems = 'start'; el.style.paddingLeft = `${Math.round(saldo.left)}px`; }
    else { el.style.removeProperty('justify-items'); el.style.removeProperty('padding-left'); }
    el.hidden = false;
    el.classList.remove('va'); void el.offsetWidth; el.classList.add('va');
    celebrar.t = setTimeout(() => { el.hidden = true; celebrar.t = setTimeout(() => mostrar(i + 1), 250); }, t.larga ? 4200 : t.grande ? 2600 : t.ligera ? 1700 : 2000);
  };
  // La primera aparece cuando tu punto llega a la bandera, no antes.
  celebrar.t = setTimeout(() => mostrar(0), reducido() ? 0 : MS_SUBIDA);
}

/** El anillo del tramo da un destello cuando tu punto llega. */
export function destello() {
  const b = document.querySelector('.tr-anillo');
  if (!b) return;
  b.classList.remove('destello'); void b.offsetWidth; b.classList.add('destello');
  setTimeout(() => b.classList.remove('destello'), 1000);
}

// ---------------------------------------------------- probar la celebración
// Reproduce la celebración con datos inventados y luego vuelve al estado real. No guarda nada ni toca la auditoría. Vive en
// «Tu cuenta → Estado del sistema» (solo quien administra; campamento 20): sirve para probar la animación después de un cambio.
let previaActiva = false;
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function vistaPrevia(nivel) {
  if (previaActiva) return;
  previaActiva = true;
  const base = Math.max(0, R.sats);
  let antes, despues;
  // «Etapa» es la siguiente intermedia (la celebración ligera) y «Etapa con sello», la siguiente principal (campamento 21).
  const siguienteDe = (rango) => { let m = etapaSiguiente(base); while (rangoEtapa(m) !== rango) m = etapaSiguiente(m); return m; };
  if (nivel === 'etapa' || nivel === 'paso') { const m = siguienteDe(nivel === 'paso' ? 'intermedia' : 'principal'); antes = Math.max(0, m - 20_000); despues = m + 10_000; }
  else if (nivel === 'epico') { antes = 1e8 - 30_000; despues = 1e8 + 5_000; }
  else if (nivel === 'hito') { let m = 1e6; while (m <= base) m *= 10; antes = m - 30_000; despues = m + 5_000; }
  else { antes = base; despues = base + Math.max(1000, Math.min(30_000, Math.floor((etapaSiguiente(base) - base) / 2))); } // «compra» y «constancia»
  fijarR({ ...R, sats: despues, meta: metaSiguiente(despues), etapa: etapaSiguiente(despues), etapaPrev: etapaAnterior(despues) });
  if (window.scrollY > 40) { window.scrollTo({ top: 0, behavior: reducido() ? 'auto' : 'smooth' }); await pausa(480); }
  avisar('Prueba de la celebración: no se guarda nada.', null, true);
  pintarMontana(false, antes, { antes, delta: despues - antes });
  if (!reducido()) setTimeout(() => destello(), MS_SUBIDA);
  celebrar({ sats: antes }, nivel === 'constancia' ? [{ tipo: 'compras', valor: R.constancia?.compras?.valor ?? 25 }] : []);
  await pausa(nivel === 'epico' ? 9000 : nivel === 'hito' ? 6500 : nivel === 'paso' ? 4200 : 5200);
  pintar({ montana: true }); // vuelve al estado real
  previaActiva = false;
}
$('dc-previa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-previa]');
  if (!b) return;
  dCuenta.close();
  setTimeout(() => vistaPrevia(b.dataset.previa), 350);
});
