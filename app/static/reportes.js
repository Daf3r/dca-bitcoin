import { aFecha, semanasDetalle, caidaGrande, compacto, entero, equilibrio, fechaLarga, hoyISO, nombreHito, nombreHitoMeses, pct, reposicion, textoMeses, tocaComprar, ubicacionSats, usd, usd0, usdSigno } from './lib.js';
import { pintarAnillo } from './anillo.js';
import { dual } from './cifras.js';
import { $, R, S, esAdmin } from './estado.js';
import { abrirHoja } from './hoja.js';
import { plazo } from './pintar.js';
import { ilustracion } from './iconos.js';

// --------------------------------------------------------------- reportes
const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const nombreMeta = (m) => (m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`);
export const semanas = (n) => `${n} ${n === 1 ? 'semana' : 'semanas'}`;
// La racha cuenta semanas o quincenas según tu ritmo (`R.paso`).
export const rachaTxt = (n) => (R.paso === 2 ? `${n} ${n === 1 ? 'quincena' : 'quincenas'}` : semanas(n));
// Por encima de 1 BTC se habla en BTC: «4.8B sats» es ambiguo en español.
const satsCorto = (s) => (s >= 1e8 ? `${(s / 1e8).toFixed(s >= 1e10 ? 0 : 1)} BTC` : `${compacto(s)} sats`);

function pintarGanancia() {
  const ver = R.nVentas > 0;
  $('rep-ganancia').hidden = !ver;
  if (!ver) return;
  const fila = (id, n) => { const el = $(id); el.textContent = n == null ? '—' : usdSigno(n); el.dataset.tono = n == null ? '' : n >= 0 ? 'sube' : 'baja'; };
  fila('gan-real', R.realizada); fila('gan-noreal', R.gan); fila('gan-total', R.total);
  $('gan-inv').textContent = usd(R.inv);
}

export function pintarReportes() {
  // Con menos de tres compras los reportes serían casi vacíos: su lugar lo ocupa «Siguiente paso».
  $('reportes').hidden = R.nCompras < 3;
  if (R.nCompras < 3) { $('rep-anios').hidden = true; $('rep-ganancia').hidden = true; return; }
  pintarGanancia();
  $('hitos').innerHTML = R.camino.map((h) => {
    const estado = h.fecha ? 'hecho' : h.m === R.etapa ? 'siguiente' : 'lejos';
    const detalle = h.fecha ? `${fechaLarga(h.fecha)} · ${textoMeses(h.meses)}`
      : estado === 'siguiente' ? (R.proyeccion ? `faltan ${entero(h.m - R.sats)} sats · a tu ritmo, en ${plazo(R.proyeccion)}` : `faltan ${entero(h.m - R.sats)} sats`)
        : 'más arriba';
    return `<li data-estado="${estado}"><b>${nombreMeta(h.m)}</b><span>${detalle}</span></li>`;
  }).join('');

  // Con un solo mes de compras no hay nada que comparar todavía.
  const mesesConCompra = R.anios.reduce((t, a) => t + a.meses.filter(Boolean).length, 0);
  $('rep-anios').hidden = mesesConCompra < 2;
  const maxMes = Math.max(...R.anios.flatMap((a) => a.meses));
  $('anios').innerHTML = [...R.anios].reverse().map((a) =>
    `<div class="anio"><b class="an-y">${a.anio}</b><div class="an-barras" aria-hidden="true">` +
    a.meses.map((v, i) => `<i class="${v ? '' : 'vacio'}" data-h="${v / maxMes}" title="${MESES[i]}: ${usd(v)}"></i>`).join('') +
    `</div><p class="an-tot"><span><b>+${satsCorto(a.sats)}</b></span><span>${usd0(a.usd)} · ${a.n} ${a.n === 1 ? 'compra' : 'compras'}</span></p></div>`).join('');
  $('anios').querySelectorAll('[data-h]').forEach((i) => { i.style.height = `${Math.max(Number(i.dataset.h) * 100, 6)}%`; });

  // Ventana de 52 semanas desde la primera compra si es más reciente: sin huellas vacías antes de empezar.
  const ventana = R.ultimas52.slice(-Math.min(52, Math.max(R.semanasDesdePrimera - (R.semanaEnCurso ? 0 : 1), 1)));
  $('semanas').innerHTML = ventana.map((v) => `<i${v ? ' class="con"' : ''}></i>`).join('');
  $('semanas').style.setProperty('--n', String(Math.max(ventana.length, 13)));
  // Detalle por semana (al tocar o con flechas) y entrada escalonada la primera vez.
  detalleSemanas = semanasDetalle(R.items, R.semanaRef).slice(-ventana.length);
  [...$('semanas').children].forEach((h, i) => h.style.setProperty('--i', String(i)));
  if (!semanasAnimadas) { semanasAnimadas = true; $('semanas').classList.add('entra'); }
  marcarSemana(semSel != null && detalleSemanas[semSel] ? semSel : null, false);
  const con = ventana.filter(Boolean).length;
  $('const-racha').textContent = R.racha;
  // Anillo del año: cuántas de las semanas de la ventana tuvieron compra (mide constancia, no una meta).
  pintarAnillo($('const-anillo-svg'), [{ clase: 'an-naranja', desde: 0, hasta: ventana.length ? con / ventana.length : 0 }]);
  $('const-n').textContent = String(con);
  $('const-de').textContent = `de ${ventana.length}`;
  $('const-anillo').setAttribute('aria-label', `Compraste en ${con} de ${ventana.length === 52 ? 'las últimas 52 semanas' : `tus ${ventana.length} semanas`}`);
  $('const-unidad').textContent = R.paso === 2 ? (R.racha === 1 ? 'quincena seguida' : 'quincenas seguidas') : R.racha === 1 ? 'semana seguida' : 'semanas seguidas';
  const resumenSemanas = con === ventana.length && ventana.length < 52
    ? `Has comprado todas las semanas desde que empezaste (${ventana.length}). `
    : `Compraste en <b>${con}</b> de ${ventana.length === 52 ? 'las últimas 52 semanas' : `tus ${ventana.length} semanas`}. `;
  $('const-txt').innerHTML = resumenSemanas +
    (R.mejorRacha > R.racha ? `Tu mejor racha: <b>${rachaTxt(R.mejorRacha)}</b>.` : '') + (R.semanaEnCurso || !R.racha ? '' : ` Tu próxima compra, antes del ${domingo(R.venceSemanas)}, mantiene la racha.`);

  // Cifras curiosas: pocas y bien elegidas.
  const dias = Math.max(1, Math.round((aFecha(hoyISO()) - aFecha(R.items[0].fecha)) / 864e5));
  $('curiosas').innerHTML = `<li><b>${entero(dias)} días</b> desde tu primera compra.</li>` +
    (R.sats > 0 ? `<li>Tu saldo suma en promedio <b>${entero(R.sats / dias)} sats</b> por día.</li>` : '');

  const hc = R.constancia;
  const faltan = (n, uno, varios) => (n === 1 ? `falta 1 ${uno}` : `faltan ${n} ${varios}`);
  const proximos = [hc.compras && `${hc.compras.valor} compras (${faltan(hc.compras.faltan, 'compra', 'compras')})`, hc.tiempo && `${nombreHitoMeses(hc.tiempo.valor)} (${faltan(hc.tiempo.faltan, 'mes', 'meses')})`].filter(Boolean);
  $('const-hito').innerHTML = proximos.length ? `Llevas <b>${hc.n} compras</b>. Próximos hitos: ${proximos.join(' · ')}.` : `Llevas <b>${hc.n} compras</b>.`;

  const ext = $('extremos');
  const tarjeta = (c, titulo) => {
    const v = S.precio ? (S.precio / c.precio - 1) * 100 : null;
    return `<div class="ext"><small>${titulo}</small><b>${usd0(c.precio)}</b><span>${fechaLarga(c.fecha)} · ${entero(c.sats)} sats</span>` +
      (v == null ? '' : `<span data-tono="${v >= 0 ? 'sube' : 'baja'}">${pct(v)} desde entonces</span>`) + '</div>';
  };
  ext.innerHTML = tarjeta(R.mejor, 'Mejor precio') + tarjeta(R.peor, 'Precio más alto');
}

// ------------------------------------------------------- tira de semanas: detalle al tocar
let detalleSemanas = [];
let semSel = null;
let semanasAnimadas = false;
const dfSem = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' });
const diaCorto = (f) => dfSem.format(aFecha(f)).replace('.', '');
function textoSemana(s) {
  const rango = `${diaCorto(s.desde)} al ${diaCorto(s.hasta)}`;
  return s.compras.length
    ? `Semana del ${rango}: ${s.compras.length} ${s.compras.length === 1 ? 'compra' : 'compras'}, +${entero(s.sats)} sats (${usd0(s.monto)}).`
    : `Semana del ${rango}: sin compras.`;
}
/** Marca una semana de la tira y dice qué compras tuvo; `anunciar` la anuncia a los lectores de pantalla (solo con teclado). */
function marcarSemana(i, anunciar) {
  const hijos = $('semanas').children;
  for (const h of hijos) h.classList.remove('sel');
  semSel = i;
  const det = $('sem-det');
  det.setAttribute('aria-live', anunciar ? 'polite' : 'off');
  if (i == null || !detalleSemanas[i] || !hijos[i]) { semSel = null; det.textContent = 'Toca una semana para ver sus compras.'; return; }
  hijos[i].classList.add('sel');
  det.textContent = textoSemana(detalleSemanas[i]);
}
function semanaCercana(ev) {
  let mejor = 0, d2 = Number.POSITIVE_INFINITY;
  [...$('semanas').children].forEach((h, i) => {
    const r = h.getBoundingClientRect();
    const d = (r.left + r.width / 2 - ev.clientX) ** 2 + (r.top + r.height / 2 - ev.clientY) ** 2;
    if (d < d2) { d2 = d; mejor = i; }
  });
  return mejor;
}
$('semanas').addEventListener('click', (e) => marcarSemana(semanaCercana(e), false));
$('semanas').addEventListener('keydown', (e) => {
  const ult = detalleSemanas.length - 1;
  const sig = { ArrowLeft: (semSel ?? ult + 1) - 1, ArrowRight: (semSel ?? -1) + 1, Home: 0, End: ult }[e.key];
  if (sig == null || ult < 0) return;
  e.preventDefault();
  marcarSemana(Math.max(0, Math.min(ult, sig)), true);
});

// ------------------------------------------------------------- te toca comprar
function textoToca(t) {
  const conRacha = t.racha >= 2;
  if (t.estado === 'hecho') return R.paso === 2 ? `Al día: ya compraste esta semana. La próxima, antes del ${domingo(t.vence)}.` : 'Al día: ya compraste esta semana.';
  if (t.estado === 'aldia') return `Vas al día. Tu próxima compra, antes del ${domingo(t.vence)}, mantiene la racha.`;
  if (t.estado === 'toca') return `Te toca comprar esta semana${conRacha ? ` (hasta el ${domingo(0)}) para mantener tu racha de ${rachaTxt(t.racha)}` : ''}.`;
  if (t.estado === 'ultimo') return `Hoy es el último día${conRacha ? ` para mantener tu racha de ${rachaTxt(t.racha)}` : ' para comprar esta semana'}.`;
  return 'Tu racha se reinició. Tu próxima compra empieza una nueva.';
}
/** Recordatorio según tu ritmo; solo lo ve el admin (los lectores no compran). */
export function pintarToca() {
  const t = esAdmin() ? tocaComprar(R) : null;
  $('toca').hidden = !t;
  if (!t) return;
  $('toca').dataset.estado = t.estado;
  $('toca-txt').textContent = textoToca(t);
}

// ------------------------------------------------------ dónde están tus sats
/** Wallet frente a exchange, según los traslados. Todos la ven cuando hay traslados; el admin ve además la pista inicial. */
export function pintarUbicacion() {
  const u = ubicacionSats(S.traslados, R.sats);
  const ver = S.cargado && R.n > 0 && (u.hay || esAdmin());
  $('ubicacion').hidden = !ver;
  if (!ver) return;
  $('ub-datos').hidden = !u.hay;
  $('ub-pista').hidden = u.hay;
  if (!u.hay && !$('ub-pista').querySelector('.ilu')) $('ub-pista').insertAdjacentHTML('afterbegin', ilustracion('traslado'));
  $('ub-anotar').hidden = u.hay;
  // La pista y el botón son para quien anota; un lector sin traslados no ve la tarjeta.
  const fw = Math.max(0, Math.min(1, u.pctWallet / 100));
  pintarAnillo($('ub-dona-svg'), [{ clase: 'an-naranja', desde: 0, hasta: fw }]);
  $('ub-pct').textContent = `${Math.round(u.pctWallet)}%`;
  $('ub-dona').setAttribute('aria-label', `${Math.round(u.pctWallet)}% de tus sats en tu wallet y ${Math.round(100 - u.pctWallet)}% en el exchange`);
  for (const [id, sats, parte] of [['ub-w', u.wallet, u.pctWallet], ['ub-e', u.exchange, 100 - u.pctWallet]]) {
    const el = $(id);
    el.textContent = '';
    dual(el, `${entero(sats)} sats`, satsCorto(sats));
    el.append(` · ${Math.round(parte)}%`);
  }
}
$('ub-anotar').addEventListener('click', () => abrirHoja(null, 'traslado'));

// ------------------------------------------------------- precio de equilibrio
/** Con qué precio de BTC tu ganancia total sería cero (sin ventas, tu costo promedio) y cuánto falta desde hoy. */
export function pintarEquilibrio() {
  const e = S.precio ? equilibrio(R, S.precio) : null;
  const el = $('g-equilibrio');
  el.hidden = !e;
  pintarIndicador();
  if (!e) return;
  el.textContent = e.enGanancia
    ? `Estarías en cero si BTC bajara ${Math.abs(e.cambio).toFixed(1)}% hasta ${usd0(e.precio)}.`
    : `Para estar en cero, BTC debe subir ${e.cambio.toFixed(1)}% hasta ${usd0(e.precio)}.`;
}

/** Una barra serena: la marca del centro es tu costo promedio y el punto, el precio de hoy (entre −30 % y +30 %). Sin colores de alarma. */
function pintarIndicador() {
  const ver = S.precio && R.sats > 0 && R.promedio > 0 && R.nCompras >= 2;
  $('g-indicador').hidden = !ver;
  if (!ver) return;
  const dif = (S.precio / R.promedio - 1) * 100;
  const x = 50 + (Math.max(-30, Math.min(30, dif)) / 30) * 46;
  $('ind-hoy').style.left = `${x.toFixed(1)}%`;
  $('ind-costo-t').textContent = `Tu costo promedio · ${usd0(R.promedio)}`;
  $('ind-hoy-t').textContent = `Hoy · ${usd0(S.precio)} (${pct(dif)})`;
  $('g-indicador').setAttribute('aria-label', `El precio de hoy, ${usd0(S.precio)}, está ${Math.abs(dif).toFixed(1)}% ${dif < 0 ? 'por debajo de' : 'por encima de'} tu costo promedio, ${usd0(R.promedio)}`);
}

// ------------------------------------------------------------ gran caída (opcional)
// Si el precio cae mucho frente a su máximo de 30 días, una tarjeta lo dice y enseña qué haría reponer con una
// compra como las tuyas. Es solo información y opcional: «Ocultar hoy» la quita hasta mañana (por dispositivo).
const CLAVE_CAIDA = 'libro.caida.oculta';
const caidaOculta = () => { try { return localStorage.getItem(CLAVE_CAIDA); } catch { return null; } };
/** La gran caída que la tarjeta enseña hoy (solo admin, con 3 compras y si no la ocultó): la usa también el gráfico para marcar el máximo. */
export const caidaVisible = () => (esAdmin() && R.nCompras >= 3 && S.precio && caidaOculta() !== hoyISO() ? caidaGrande(S.historico, S.precio) : null);
export function pintarCaida() {
  const c = caidaVisible();
  $('caida').hidden = !c;
  if (!c) return;
  const r = reposicion(R, S.precio);
  $('caida-txt').textContent = `BTC está ${Math.round(c.caida)}% por debajo de su máximo de los últimos ${c.dias} días.` +
    (r ? ` Si decides reponer con una compra como las tuyas (${usd0(r.monto)}), tu costo promedio ${r.despues < r.antes ? 'bajaría' : 'subiría'} de ${usd0(r.antes)} a ${usd0(r.despues)}. Es opcional.` : '');
}
$('caida-ocultar').addEventListener('click', () => {
  try { localStorage.setItem(CLAVE_CAIDA, hoyISO()); } catch { /* sin almacenamiento: se oculta solo ahora */ }
  $('caida').hidden = true;
});

// ------------------------------------------------------------ siguiente paso
const dfDomingo = new Intl.DateTimeFormat('es-SV', { weekday: 'long', day: 'numeric', month: 'short' });
/** Domingo que cierra la semana en curso (+7 días por cada semana más). */
function domingo(semanasMas = 0) {
  const d = aFecha(hoyISO());
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 7 * semanasMas);
  return dfDomingo.format(d).replace('.', '');
}

export function pintarComienzo() {
  const ver = R.nCompras > 0 && R.nCompras < 3;
  $('comienzo').hidden = !ver;
  if (!ver) return;
  const falta = R.etapa - R.sats;
  const porCompra = R.nHabituales ? R.satsHabituales / R.nHabituales : R.satsComprados / R.nCompras; // sin las extra
  const compras = Math.max(1, Math.ceil(falta / porCompra));
  $('t-comienzo').textContent = `${compras === 1 ? 'Una compra más' : `${compras} compras más`} para ${R.etapa === 1e5 ? 'tu primer campamento' : `los ${nombreMeta(R.etapa)}`}`;
  $('com-txt').textContent = `Te faltan ${entero(falta)} sats para ${nombreMeta(R.etapa)}. Tus compras rondan ${entero(porCompra)} sats cada una.`;
  $('com-racha').textContent = rachaTxt(R.racha);
  $('com-racha-sub').textContent = R.racha
    ? `sigue si vuelves a comprar antes del ${domingo(R.venceSemanas)}`
    : `empieza de nuevo con tu próxima compra`;
  const despues = R.hitos.filter((h) => !h.fecha && h.m > R.meta && h.m <= 1e8).map((h) => nombreHito(h.m));
  const lista = despues.length > 1 ? `${despues.slice(0, -1).join(', ')} y ${despues.at(-1)}` : despues[0] ?? nombreHito(1e8);
  $('com-despues').textContent = lista.replace(/ BTC/g, '\u00a0BTC');
}
$('com-anotar').addEventListener('click', () => abrirHoja());
