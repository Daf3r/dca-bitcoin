import { cruzo1Btc, escalaFiesta, etapaAnterior, etapaCelebrada, etapaSiguiente, fiestaPorVer, hoyISO, metaSiguiente, MS_FIESTA, nombreHito, nombreHitoMeses, rangoEtapa } from './lib.js';
import { avisar } from './avisar.js';
import { lacre, selloSemana } from './arte-sellos.js';
import { dCuenta } from './cuenta.js';
import { $, R, S, fijarR, reducido, vozLibro } from './estado.js';
import { enFiesta, fiestaDelHito } from './fiesta.js';
import { MS_SUBIDA, esHito, pintar, pintarMontana } from './pintar.js';
import { enTV } from './tv.js';

// -------------------------------------------------------------- celebración
/**
 * Solo cuando la acción de esta sesión cruza un hito; breve y sin bloquear nada. Si coinciden una etapa y un
 * hito de constancia (10 compras, 6 meses…), la tarjeta de la etapa sale primero y la de constancia después.
 */
export function celebrar(antes, constancia = [], sello = null, fiesta = null) {
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
  // (Campamento 59) La fiesta del hito: solo si el servidor dice que esta etapa (la misma de la tarjeta) se cruzó por primera vez. Empieza
  // cuando «Tú» llega, como la tarjeta.
  if (m && fiesta?.meta === m) setTimeout(() => fiestaDelHito({ escala: escalaFiesta(m), conTu: !vozLibro(), tv: enTV() }), reducido() ? 0 : MS_SUBIDA);
  mostrarTarjetas(tarjetas, reducido() ? 0 : MS_SUBIDA);
}
/** Las tarjetas bajo el saldo, una tras otra; la primera aparece pasados `retraso` ms (cuando tu punto llega a la bandera). */
function mostrarTarjetas(tarjetas, retraso) {
  if (!tarjetas.length) return;
  const el = $('hito-cel');
  clearTimeout(celebrar.t);
  const mostrar = (i) => {
    if (i >= tarjetas.length) { cerrarConUnToque.quitar?.(); return; }
    if (i === 0) cerrarConUnToque(el);
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
    celebrar.t = setTimeout(() => { el.hidden = true; celebrar.t = setTimeout(() => mostrar(i + 1), 250); }, MS_TARJETA[t.larga ? 'larga' : t.grande ? 'grande' : t.ligera ? 'ligera' : 'normal']);
  };
  celebrar.t = setTimeout(() => mostrar(0), retraso);
}

// ------------------------------------------------ (Campamento 59) la fiesta del hito para toda la familia
// Quien abre la app el día de un campamento o de una etapa principal (también quien solo mira y la tele) ve la fiesta una vez en ese
// aparato; la intermedia, sobria, solo la ve quien anota. El aparato recuerda solo marcas opacas («día#id» de la compra, o «día#halving»)
// del día de hoy: ni cifras ni quién abrió (al servidor no se le dice nada: `/api/fiesta` solo se lee).
const CLAVE_VISTAS = 'libro.fiestas';
const vistas = () => { try { return localStorage.getItem(CLAVE_VISTAS) ?? ''; } catch { return ''; } };
/** Recuerda en este aparato que la fiesta `marca` ya se vio (solo las de hoy). */
export function fiestaVista(marca) {
  const hoy = hoyISO(), lista = vistas().split(' ').filter((x) => x.startsWith(`${hoy}#`) && x !== marca);
  try { localStorage.setItem(CLAVE_VISTAS, [...lista, marca].join(' ')); } catch { /* sin almacenamiento: a lo sumo se vería otra vez */ }
}
/** Si hay una fiesta de hoy que este aparato no ha visto (`S.fiesta`, de `/api/fiesta`), la enseña con su tarjeta. `retraso`: ms. */
export function revisarFiesta(retraso = 0) {
  const f = fiestaPorVer(S.fiesta, vistas(), hoyISO());
  if (!f || enFiesta()) return;
  fiestaVista(f.marca);
  setTimeout(() => {
    if (enFiesta()) return;
    fiestaDelHito({ escala: f.escala, conTu: false, tv: enTV() });
    const libro = vozLibro(), m = f.meta;
    const t = f.escala === 'halving'
      ? { k: 'Hoy, en la red de Bitcoin', txt: 'El halving', grande: false }
      : { k: libro ? 'Hoy el libro llegó a' : f.escala === 'campamento' ? 'Nuevo hito' : 'Nueva etapa', txt: m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`, grande: f.escala === 'campamento', lacre: m };
    mostrarTarjetas([t], 0);
  }, retraso);
}
/** (39b · El tempo) Cuánto se queda cada tarjeta: lo que dura su animación en el CSS (`.hito-cel`: 2.6, 3.5 y 4.5 s; la de 1 BTC, un rato más). */
export const MS_TARJETA = { ligera: 2600, normal: 3500, grande: 4500, larga: 6000 };
/**
 * (39b) Las tarjetas duran más que antes, así que no bloquean: el primer toque o tecla en cualquier sitio las cierra todas (y ese toque
 * sigue a lo suyo: la tarjeta no recibe toques). Lo que celebra la montaña se retira solo.
 */
function cerrarConUnToque(el) {
  cerrarConUnToque.quitar?.();
  const cerrar = () => { clearTimeout(celebrar.t); el.hidden = true; quitar(); };
  const quitar = () => { cerrarConUnToque.quitar = null; for (const ev of ['pointerdown', 'keydown']) removeEventListener(ev, cerrar, true); };
  cerrarConUnToque.quitar = quitar;
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, cerrar, { capture: true, passive: true });
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
  if (nivel === 'halving') { // (59) la fiesta del pueblo, sin «Tú» ni la cumbre, sobre la montaña de ahora
    if (window.scrollY > 40) { window.scrollTo({ top: 0, behavior: reducido() ? 'auto' : 'smooth' }); await pausa(480); }
    avisar('Prueba de la celebración: no se guarda nada.', null, true);
    mostrarTarjetas([{ k: 'Hoy, en la red de Bitcoin', txt: 'El halving', grande: false }], 0);
    await fiestaDelHito({ escala: 'halving', tv: enTV() });
    pintar({ montana: true });
    previaActiva = false;
    return;
  }
  if (nivel === 'etapa' || nivel === 'paso') { const m = siguienteDe(nivel === 'paso' ? 'intermedia' : 'principal'); antes = Math.max(0, m - 20_000); despues = m + 10_000; }
  else if (nivel === 'epico') { antes = 1e8 - 30_000; despues = 1e8 + 5_000; }
  else if (nivel === 'hito') { let m = 1e6; while (m <= base) m *= 10; antes = m - 30_000; despues = m + 5_000; }
  else { antes = base; despues = base + Math.max(1000, Math.min(30_000, Math.floor((etapaSiguiente(base) - base) / 2))); } // «compra» y «constancia»
  fijarR({ ...R, sats: despues, meta: metaSiguiente(despues), etapa: etapaSiguiente(despues), etapaPrev: etapaAnterior(despues) });
  if (window.scrollY > 40) { window.scrollTo({ top: 0, behavior: reducido() ? 'auto' : 'smooth' }); await pausa(480); }
  avisar('Prueba de la celebración: no se guarda nada.', null, true);
  pintarMontana(false, antes, { antes, delta: despues - antes });
  if (!reducido()) setTimeout(() => destello(), MS_SUBIDA);
  // (59) Con la fiesta del hito de su escala (el mismo código, sin escribir la marca): la etapa que cruza se da por nueva.
  const m = etapaCelebrada(antes, despues);
  celebrar({ sats: antes }, nivel === 'constancia' ? [{ tipo: 'compras', valor: R.constancia?.compras?.valor ?? 25 }] : [], null, m ? { meta: m } : null);
  // (39b) La espera cubre la subida y lo más largo de cada celebración al tempo nuevo (1 BTC: unos 9 s después de llegar); (59) y la
  // fiesta, hasta que acabe (o se salte).
  await pausa(nivel === 'epico' ? 12_000 : nivel === 'hito' ? 7500 : nivel === 'paso' ? 4800 : 7000);
  for (let t = 0; enFiesta() && t < MS_FIESTA.campamento + 2000; t += 250) await pausa(250);
  pintar({ montana: true }); // vuelve al estado real
  previaActiva = false;
}
$('dc-previa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-previa]');
  if (!b) return;
  dCuenta.close();
  setTimeout(() => vistaPrevia(b.dataset.previa), 350);
});
