// Cálculos y formatos sin DOM.
//
// Tipos (idea 79): las funciones del dinero llevan su tipo en comentarios JSDoc y `tsc` los comprueba solo en el CI y en tu equipo
// (`cd tests && npx tsc -p tsconfig.json`; no hay build y nada de esto llega al navegador). Para anotar más funciones basta con escribir su
// JSDoc: el archivo ya está en «include». Empezar por las que mueven dinero (`resumen` y lo que le llega) y seguir archivo por archivo.

/**
 * Una compra, venta o gasto como lo devuelve la API (`/api/compras`).
 * @typedef {object} Movimiento
 * @property {number} id
 * @property {string} fecha AAAA-MM-DD (se compara como texto)
 * @property {number} monto dólares
 * @property {number} precio dólares por BTC
 * @property {number} sats siempre positivos; una venta los resta
 * @property {'compra'|'venta'} tipo un gasto es una venta
 * @property {number} [creado] milisegundos
 * @property {string|null} [txid]
 * @property {string|null} [nota]
 * @property {boolean} [extra] compra extra por una caída
 * @property {string[]} [etiquetas]
 */
/**
 * Un traslado entre el exchange y tu wallet (`/api/traslados`).
 * @typedef {object} Traslado
 * @property {number} id
 * @property {string} fecha
 * @property {number} sats lo que llegó a destino
 * @property {'a_wallet'|'a_exchange'} sentido
 * @property {string|null} [txid]
 * @property {string|null} [nota]
 * @property {number} [creado]
 * @property {number|null} [wallet_id] la wallet que recibe o entrega (null = «Mi wallet», la principal)
 */
/**
 * Un movimiento dentro de `resumen`: lo mismo más lo que va acumulando.
 * @typedef {Movimiento & { inv: number, satsAcum: number, realizada: number|null }} MovimientoAcumulado
 */

const nfUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const nfUSD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const nfInt = new Intl.NumberFormat('en-US');
const dfDia = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' });
const dfCorto = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' });
const dfHora = new Intl.DateTimeFormat('es-SV', { hour: 'numeric', minute: '2-digit' });

const signo = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
export const usd = (n) => nfUSD.format(n);
export const usd0 = (n) => nfUSD0.format(n);
export const usdSigno = (n) => signo(n) + nfUSD.format(Math.abs(n));
export const pct = (n) => signo(n) + Math.abs(n).toFixed(1) + '%';
export const entero = (n) => nfInt.format(Math.round(n));
const nfComp = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
export const compacto = (n) => nfComp.format(n).replace(/K$/, 'k'); // «500k», como los hitos («100k»)
export const btc = (sats) => (sats / 1e8).toFixed(8);
export const hora = (ts) => dfHora.format(new Date(ts));
/** Formas compactas (con signo, como usdSigno) para pantallas muy pequeñas (320 px): «+$1.2K», «−$79», «1.2M». Solo para cifras secundarias; el saldo nunca se abrevia. */
export const usdSignoCorto = (n) => { const a = Math.abs(n); return signo(n) + (a < 1000 ? nfUSD0.format(a) : `$${nfComp.format(a)}`); };
export const numCorto = (n) => nfComp.format(Math.round(n));

// «Hoy» es siempre el de El Salvador, como en el servidor (TZ del contenedor): así la fecha
// por defecto, la validación y la racha coinciden aunque el navegador esté en otra zona.
export const ZONA = 'America/El_Salvador';
const dfHoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });
export const hoyISO = () => dfHoy.format(new Date());
export const aFecha = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const fechaLarga = (s) => dfDia.format(aFecha(s)).replace('.', '');
export const fechaCorta = (s) => dfCorto.format(aFecha(s)).replace('.', '');

// --------------------------------------------------------- hitos y montaña
/** Hitos: potencias de 10 desde 100k sats hasta `tope`. */
function hitosHasta(tope) {
  const out = [];
  for (let m = 1e5; m <= tope; m *= 10) out.push(m);
  return out;
}

/** El siguiente hito por encima de lo acumulado (36,578 → 100k; 100k → 1M). */
export const metaSiguiente = (sats) => {
  let m = 1e5;
  while (m <= sats) m *= 10;
  return m;
};

const num = (n) => (Number.isInteger(n) ? entero(n) : n.toFixed(1));
export const nombreHito = (m) => (m >= 1e8 ? `${num(m / 1e8)} BTC` : m >= 1e6 ? `${num(m / 1e6)}M` : `${num(m / 1e3)}k`);

/**
 * Lo que dice la tarjeta al tocar la bandera de un campamento (idea 72): alcanzado (con su fecha, si se conoce)
 * o cuánto falta. `cima` es la meta de la montaña. Solo informa.
 */
export function textoCampamento(m, sats, fecha, cima = false, libro = false) {
  const titulo = cima ? `Cumbre · ${nombreHito(m)}` : `Campamento ${nombreHito(m)}`;
  // `libro`: para quien solo mira se habla del libro, no de «ti» (campamento 17).
  if (sats >= m) return { titulo, texto: fecha ? `${libro ? 'Se alcanzó' : 'Lo alcanzaste'} el ${fechaLarga(fecha)}.` : libro ? 'Ya quedó atrás.' : 'Ya lo pasaste.', alcanzado: true };
  const falta = Math.ceil(m - sats);
  const pct = Math.min(99, Math.floor((sats / m) * 100));
  return { titulo, texto: `${libro ? 'Faltan' : 'Te faltan'} ${entero(falta)} sats${cima ? ' para la cumbre' : ''}. ${libro ? 'El libro va' : 'Vas'} al ${pct}%.`, alcanzado: false };
}

// Detalles de la montaña que siguen a tus datos (campamento 5, 3/3).
/** Racha a partir de la cual el cielo nocturno muestra una aurora suave (12 semanas o quincenas seguidas). */
export const RACHA_AURORA = 12;
export const hayAurora = (racha) => racha >= RACHA_AURORA;
/** Al llegar a 1 BTC el acento de la app pasa de naranja a dorado. */
export const acentoDe = (sats) => (sats >= 1e8 ? 'oro' : 'naranja');
/** ¿Esta compra te lleva de menos de 1 BTC a 1 BTC o más? (la celebración épica; hacia arriba, nunca al bajar) */
export const cruzo1Btc = (antes, despues) => antes < 1e8 && despues >= 1e8;
/** Fracción iluminada de la luna (0 nueva, 1 llena) a partir de su fase (fracción del ciclo, 0–1). */
export const iluminacionLunar = (fase) => (1 - Math.cos(2 * Math.PI * fase)) / 2;

// Etapas: además de los hitos grandes (potencias de 10, los campamentos de la montaña), metas intermedias
// a 2.5 y 5 de cada potencia (100k, 250k, 500k, 1M, 2.5M, 5M, 10M…) para sentir el avance cada pocas compras.
const PASOS = [1, 2.5, 5];
export function etapasHasta(tope) {
  const out = [];
  for (let d = 1e5; d <= tope; d *= 10) for (const k of PASOS) if (d * k <= tope) out.push(d * k);
  return out;
}
export const etapaSiguiente = (sats) => { for (let d = 1e5; ; d *= 10) for (const k of PASOS) if (d * k > sats) return d * k; };
export const etapaAnterior = (sats) => { let prev = 0; for (let d = 1e5; ; d *= 10) for (const k of PASOS) { if (d * k > sats) return prev; prev = d * k; } };
/** Etapas que se cruzan al subir de `desde` a `hasta` sats (vacío si no se sube). */
export const etapasCruzadas = (desde, hasta) => (hasta > desde ? etapasHasta(Math.max(hasta, 1e5)).filter((m) => m > desde && m <= hasta) : []);

/**
 * Qué campamentos dibujar. Cimas progresivas: la cumbre es la siguiente potencia de 10 (con 1.2M sats, 10M; al llegar, 100M…).
 * Con poco sitio se priorizan cumbre, siguiente meta y último hito alcanzado.
 */
export function escalaMontana(sats, maxCampos = 4) {
  const sig = metaSiguiente(sats);
  const cima = sig; // cimas progresivas: la cumbre es la siguiente potencia de 10 (1.2M → 10M); al llegar, la montaña se rehace con la siguiente
  const todos = hitosHasta(cima);
  const iSig = todos.indexOf(sig);
  const prioridad = [cima, sig, sig / 10, ...todos.slice(iSig + 1), ...todos.slice(0, Math.max(0, iSig - 1)).reverse()];
  const campos = [...new Set(prioridad)].filter((m) => todos.includes(m)).slice(0, maxCampos).sort((a, b) => a - b);
  return { cima, campos, base: campos[0] / 10 };
}

/** Altitud de 0 a 1 en escala logarítmica entre la base y la cumbre. */
export const altitud = (s, esc) => {
  const v = (Math.log10(Math.max(s, 1)) - Math.log10(esc.base)) / (Math.log10(esc.cima) - Math.log10(esc.base));
  return Math.min(1, Math.max(0, v));
};

export const textoMeses = (n) => (n <= 0 ? 'en el primer mes' : n === 1 ? 'al mes de empezar' : `a los ${n} meses`);

function mesesEntre(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.max(0, (by - ay) * 12 + (bm - am) - (bd < ad ? 1 : 0));
}

const SEMANA0 = Date.UTC(2000, 0, 3); // un lunes
const semana = (f) => {
  const [y, m, d] = f.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - SEMANA0) / (7 * 864e5));
};

/**
 * 1 si compras cada semana (o menos de 10 días entre compras), 2 si cada quincena. Pide al menos 4 semanas con
 * compra. Cuenta una sola fecha por semana (la primera): comprar de más en una caída del precio no cambia tu ritmo.
 */
function pasoSemanas(items) {
  const porSemana = new Map();
  for (const f of items.map((c) => c.fecha).sort()) if (!porSemana.has(semana(f))) porSemana.set(semana(f), f);
  const fechas = [...porSemana.values()].slice(-9);
  if (fechas.length < 4) return 1;
  const d = fechas.slice(1).map((f, i) => (aFecha(f).getTime() - aFecha(fechas[i]).getTime()) / 864e5).sort((a, b) => a - b);
  return d[d.length >> 1] >= 10 ? 2 : 1;
}

// ------------------------------------------------------------- constancia
// Hitos de constancia: cuántas compras llevas y cuánto tiempo desde la primera. Premian no fallar.
const HITOS_COMPRAS = [10, 25, 50, 100, 200, 300, 500, 750, 1000];
const HITOS_MESES = [6, 12, 24, 36, 60, 120];
export const nombreHitoMeses = (m) => (m < 12 ? `${m} meses` : m === 12 ? '1 año' : `${m / 12} años`);

const soloCompras = (compras) => compras.filter((c) => c.tipo !== 'venta');
function medidasConstancia(compras) {
  const f = soloCompras(compras).map((c) => c.fecha).sort();
  return { n: f.length, primera: f[0] ?? null, meses: f.length ? mesesEntre(f[0], f[f.length - 1]) : 0 };
}

/** Suma meses a una fecha AAAA-MM-DD (sin pasar al mes siguiente: el 31 + 1 mes es el último día del mes). */
function sumarMeses(f, n) {
  const [y, m, d] = f.split('-').map(Number);
  const t = Date.UTC(y, m - 1 + n, 1);
  const ult = new Date(Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), Math.min(d, ult))).toISOString().slice(0, 10);
}
const metaTxt = (m) => (m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`);

/**
 * «Tu historia» (idea 37): la línea de tiempo de cómo llegaste hasta aquí, de lo más viejo a lo más nuevo. Sale de datos que ya
 * existen: la primera compra, cada etapa y campamento con su fecha (`R.camino`), los hitos de constancia, tu mejor racha y las
 * compras extra (las hechas en caídas). De las extra se cuentan las `maxExtras` más recientes y el resto va en `extrasOcultas`.
 */
export function historia(R, hoy = hoyISO(), { maxExtras = 8 } = {}) {
  if (!R || !R.nCompras) return { eventos: [], extrasOcultas: 0 };
  const ev = [];
  const compras = R.items.filter((c) => c.tipo !== 'venta');
  const p = compras[0];
  ev.push({ fecha: p.fecha, clase: 'primera', orden: 0, titulo: 'Tu primera compra', detalle: `${entero(p.sats)} sats${p.precio ? ` a ${usd0(p.precio)}` : ''}` });
  for (const h of R.camino ?? []) {
    if (!h.fecha) continue;
    ev.push({ m: h.m, fecha: h.fecha, clase: h.mayor ? 'hito' : 'etapa', orden: 1, titulo: h.mayor ? `Campamento ${nombreHito(h.m)}` : `Llegaste a ${metaTxt(h.m)}`, detalle: h.mayor ? `Llegaste a ${metaTxt(h.m)}` : '' });
  }
  for (const h of HITOS_COMPRAS) if (h <= compras.length) ev.push({ fecha: compras[h - 1].fecha, clase: 'constancia', orden: 2, titulo: `${h} compras`, detalle: 'Constancia' });
  for (const m of HITOS_MESES) {
    const f = sumarMeses(p.fecha, m);
    if (f <= hoy) ev.push({ fecha: f, clase: 'constancia', orden: 3, titulo: `${nombreHitoMeses(m)} comprando`, detalle: 'Constancia' });
  }
  if (R.mejorRacha >= 4 && R.mejorRachaDesde) {
    ev.push({ fecha: R.mejorRachaHasta, clase: 'racha', orden: 4, titulo: `Tu mejor racha: ${R.mejorRacha} ${R.paso === 2 ? 'quincenas' : 'semanas'}`, detalle: `Del ${fechaCorta(R.mejorRachaDesde)} al ${fechaCorta(R.mejorRachaHasta)}` });
  }
  const extras = compras.filter((c) => c.extra).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  for (const c of extras.slice(0, maxExtras)) ev.push({ fecha: c.fecha, clase: 'extra', orden: 5, titulo: 'Compra extra en una caída', detalle: `${entero(c.sats)} sats${c.precio ? ` a ${usd0(c.precio)}` : ''}${c.nota ? ` · ${c.nota}` : ''}` });
  ev.push({ fecha: hoy, clase: 'hoy', orden: 9, titulo: 'Hoy', detalle: `${entero(R.sats)} sats${R.valor != null ? ` · valen ${usd(R.valor)}` : ''}` });
  ev.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.orden - b.orden));
  return { eventos: ev, extrasOcultas: Math.max(0, extras.length - maxExtras) };
}

/**
 * Medallas de constancia (idea 38): las que ya tienes (con su fecha) y, de cada tipo, la siguiente. No se muestran todas las
 * demás: es un reconocimiento por lo que ya hiciste, no una lista de pendientes.
 */
export function medallas(R, hoy = hoyISO()) {
  if (!R || !R.nCompras) return [];
  const compras = R.items.filter((c) => c.tipo !== 'venta');
  const primera = compras[0].fecha, meses = mesesEntre(primera, hoy);
  const out = [];
  let proxima = false;
  for (const h of HITOS_COMPRAS) {
    if (h <= compras.length) out.push({ clave: `c${h}`, tipo: 'compras', valor: h, ganada: true, fecha: compras[h - 1].fecha, titulo: `${h} compras` });
    else if (!proxima) { out.push({ clave: `c${h}`, tipo: 'compras', valor: h, ganada: false, falta: h - compras.length, titulo: `${h} compras` }); proxima = true; }
  }
  proxima = false;
  for (const m of HITOS_MESES) {
    const f = sumarMeses(primera, m);
    if (f <= hoy) out.push({ clave: `t${m}`, tipo: 'tiempo', valor: m, ganada: true, fecha: f, titulo: `${nombreHitoMeses(m)} comprando` });
    else if (!proxima) { out.push({ clave: `t${m}`, tipo: 'tiempo', valor: m, ganada: false, falta: Math.max(1, m - meses), titulo: `${nombreHitoMeses(m)} comprando` }); proxima = true; }
  }
  return out;
}

/** Hitos de constancia que cruza una compra nueva: de cantidad (10, 25…) y de tiempo (6 meses, 1 año…). */
export function constanciaCruzada(antes, despues) {
  const a = medidasConstancia(antes), d = medidasConstancia(despues);
  const cruzados = [];
  for (const h of HITOS_COMPRAS) if (a.n < h && d.n >= h) cruzados.push({ tipo: 'compras', valor: h });
  // El tiempo cuenta desde la primera compra: una compra atrasada que cambia esa fecha no celebra nada.
  if (a.n > 0 && a.primera === d.primera) for (const m of HITOS_MESES) if (a.meses < m && d.meses >= m) cruzados.push({ tipo: 'tiempo', valor: m });
  return cruzados;
}

/** Lo que falta para el siguiente hito de cantidad y de tiempo (tiempo medido hasta hoy). */
export function proximosHitosConstancia(compras, hoy = hoyISO()) {
  const { n, primera } = medidasConstancia(compras);
  const meses = primera ? mesesEntre(primera, hoy) : 0;
  const pn = HITOS_COMPRAS.find((h) => h > n);
  const pm = HITOS_MESES.find((m) => m > meses);
  return { n, meses, compras: pn ? { valor: pn, faltan: pn - n } : null, tiempo: pm ? { valor: pm, faltan: pm - meses } : null };
}

/**
 * Cómo movería tu costo promedio una compra nueva (el «ajuste» del DCA: comprar barato lo baja, comprar caro lo sube).
 * Sin saldo ni invertido (primera compra o tras vender todo) no hay costo previo y devuelve null.
 */
export function costoTrasCompra(/** @type {{ sats: number, inv: number }|null|undefined} */ R, /** @type {number} */ monto, /** @type {number} */ sats) {
  if (!R || !(R.sats > 0) || !(R.inv > 0) || !(sats > 0) || !(monto > 0)) return null;
  const antes = (R.inv * 1e8) / R.sats;
  const despues = ((R.inv + monto) * 1e8) / (R.sats + sats);
  return { antes, despues, cambio: (despues / antes - 1) * 100 };
}

/**
 * Gran caída: el precio vivo frente al máximo de los últimos `dias` días (cierres diarios y el precio vivo).
 * Devuelve null si no hay caída del `umbral` % o más, o si el histórico es muy corto para saberlo.
 */
export function caidaGrande(historico, vivo, hoy = hoyISO(), { dias = 30, umbral = 15 } = {}) {
  if (!(vivo > 0)) return null;
  const [y, m, d] = hoy.split('-').map(Number);
  const desde = new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10);
  const ventana = historico.filter((x) => x[0] >= desde && x[1] > 0);
  if (ventana.length < 5) return null;
  const max = Math.max(vivo, ...ventana.map((x) => x[1]));
  const caida = Math.round((1 - vivo / max) * 1000) / 10; // a una décima: el umbral queda exacto
  return caida >= umbral ? { max, caida, dias } : null;
}

/**
 * Tramos de «gran caída» para marcarlos en el gráfico: los días en que el precio estuvo `umbral` % o más por debajo de su
 * máximo de los últimos `dias` días (la misma regla que `caidaGrande`). `serie` es [{fecha, p}] ordenada por fecha; devuelve
 * [{desde, hasta}] (fechas inclusive) y descarta los tramos de un solo día, que solo serían ruido.
 */
export function tramosCaida(serie, { dias = 30, umbral = 15 } = {}) {
  const tramos = [];
  let abierto = null;
  let ini = 0;
  for (let i = 0; i < serie.length; i++) {
    const [y, m, d] = serie[i].fecha.split('-').map(Number);
    const limite = new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10);
    while (serie[ini].fecha < limite) ini++;
    let max = 0;
    for (let j = ini; j <= i; j++) if (serie[j].p > max) max = serie[j].p;
    const caida = max > 0 ? Math.round((1 - serie[i].p / max) * 1000) / 10 : 0;
    if (caida >= umbral) {
      if (!abierto) abierto = { desde: serie[i].fecha, hasta: serie[i].fecha, n: 0 };
      abierto.hasta = serie[i].fecha;
      abierto.n += 1;
    } else if (abierto) {
      tramos.push(abierto);
      abierto = null;
    }
  }
  if (abierto) tramos.push(abierto);
  return tramos.filter((t) => t.n >= 2).map(({ desde, hasta }) => ({ desde, hasta }));
}

/** Monto en dólares de una compra «como las tuyas»: la mediana de tus últimas 12 compras habituales, sin las extra (null con menos de 3). */
export function montoHabitual(items) {
  const montos = (items ?? []).filter((c) => c.tipo !== 'venta' && !c.extra && c.monto > 0).slice(-12).map((c) => c.monto).sort((a, b) => a - b);
  if (montos.length < 3) return null;
  const mid = montos.length >> 1;
  const monto = Math.round(montos.length % 2 ? montos[mid] : (montos[mid - 1] + montos[mid]) / 2);
  return monto >= 1 ? monto : null;
}

/**
 * «Reponer» (opcional): qué haría con tu costo promedio una compra como las tuyas (`montoHabitual`)
 * al precio vivo. Es solo información; no recomienda comprar.
 */
export function reposicion(R, vivo) {
  const monto = montoHabitual(R?.items);
  if (!monto || !(vivo > 0)) return null;
  const c = costoTrasCompra(R, monto, Math.round((monto / vivo) * 1e8));
  return c && { monto, ...c };
}

/**
 * Precio de equilibrio: el precio de BTC con el que tu ganancia total (realizada + no realizada) sería cero.
 * Sin ventas es tu costo promedio. `cambio` es cuánto tendría que moverse BTC desde hoy (positivo = subir).
 * Si lo que ya vendiste cubre lo invertido, no hay equilibrio que mostrar (null).
 */
export function equilibrio(R, vivo) {
  if (!R || !(R.sats > 0) || !(vivo > 0)) return null;
  const base = R.inv - (R.realizada ?? 0);
  if (!(base > 0)) return null;
  const precio = (base * 1e8) / R.sats;
  return { precio, cambio: (precio / vivo - 1) * 100, enGanancia: vivo > precio };
}

/** «hace 12 s», «hace 3 min», «hace 2 h»: para el precio en vivo. */
export function haceCuanto(ts, ahora = Date.now()) {
  const s = Math.max(0, Math.round((ahora - ts) / 1000));
  if (s < 5) return 'ahora';
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

/**
 * Avisos antes de guardar una compra nueva o con sats cambiados (no bloquean: piden confirmar).
 * - `atipico`: con al menos 4 compras tuyas, un monto en dólares 10 veces mayor o menor que la mediana
 *   (error de dedo: un cero de más o de menos). Se compara en **dólares**, no en sats: así $25 y $50 no
 *   avisan (solo 2 veces) y el precio de BTC, que cambia con los años, no provoca avisos falsos.
 *   Sin monto estimado (sin precio) no se evalúa.
 * - `duplicado`: ya hay otra compra el mismo día (solo al crear).
 * Las ventas no se avisan (ya no pueden pasar del saldo). Al editar sin tocar los sats no se avisa de
 * lo atípico, para no insistir con lo ya guardado.
 */
export function avisosAlAnotar(compras, { tipo, sats, monto, fecha, editando = null, extra = false }) {
  // Una compra extra (por una caída) es grande a propósito y puede coincidir con la del día: no se avisa.
  if (tipo !== 'compra' || !(sats > 0) || extra) return [];
  const previa = editando != null ? compras.find((c) => c.id === editando) : null;
  const otras = compras.filter((c) => c.tipo === 'compra' && !c.extra && c.id !== editando); // las extra no son referencia
  const avisos = [];
  if (monto > 0 && otras.length >= 4 && !(previa && previa.sats === sats)) {
    const orden = otras.map((c) => c.monto).filter((m) => m > 0).sort((a, b) => a - b);
    const mid = orden.length >> 1;
    const mediana = orden.length < 4 ? 0 : orden.length % 2 ? orden[mid] : (orden[mid - 1] + orden[mid]) / 2;
    if (mediana > 0 && monto >= mediana * 10) avisos.push({ tipo: 'atipico', sentido: 'mas', veces: Math.round(monto / mediana), mediana });
    else if (mediana > 0 && monto * 10 <= mediana) avisos.push({ tipo: 'atipico', sentido: 'menos', veces: Math.round(mediana / monto), mediana });
  }
  if (editando == null) {
    const mismas = otras.filter((c) => c.fecha === fecha);
    if (mismas.length) avisos.push({ tipo: 'duplicado', n: mismas.length, sats: mismas[mismas.length - 1].sats });
  }
  return avisos;
}

/**
 * Todo lo que muestran la cabecera y los reportes, sin tocar el DOM.
 * @param {Movimiento[]} compras compras, ventas y gastos (en cualquier orden)
 * @param {number|null|undefined} precio el precio vivo de BTC en dólares, si se conoce
 * @param {string} [hoy] AAAA-MM-DD de El Salvador
 */
export function resumen(compras, precio, hoy = hoyISO()) {
  // Movimientos: compras (suman sats) y ventas o gastos (restan). Mismo orden que el servidor: por fecha y,
  // dentro del mismo día, las compras antes que las ventas.
  const orden = [...compras].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : Number(a.tipo === 'venta') - Number(b.tipo === 'venta') || a.id - b.id));
  // Costo promedio ponderado: al vender, el costo base baja en proporción a los sats que salen y la
  // ganancia realizada es lo recibido menos ese costo. Sin impuestos: es contabilidad, no declaración.
  let inv = 0, sats = 0, realizada = 0, comprado = 0, vendido = 0, satsComprados = 0;
  const items = orden.map((c) => {
    const venta = c.tipo === 'venta';
    let real = null;
    if (venta) {
      const base = sats > 0 ? Math.min(inv, (inv / sats) * c.sats) : 0;
      real = c.monto - base;
      inv -= base; sats -= c.sats; realizada += real; vendido += c.monto;
      if (sats <= 0) { sats = 0; inv = 0; }
    } else { inv += c.monto; sats += c.sats; comprado += c.monto; satsComprados += c.sats; }
    return { ...c, tipo: venta ? 'venta' : 'compra', inv, satsAcum: sats, realizada: real };
  });
  const n = items.length;
  const comprasItems = items.filter((c) => c.tipo !== 'venta');
  const nCompras = comprasItems.length;
  const valor = n && precio ? (sats / 1e8) * precio : null;
  const meta = metaSiguiente(sats);
  const etapa = etapaSiguiente(sats), etapaPrev = etapaAnterior(sats);

  const hitos = hitosHasta(Math.max(1e8, meta)).map((m) => {
    const c = items.find((x) => x.satsAcum >= m);
    return { m, fecha: c?.fecha ?? null, meses: c ? mesesEntre(items[0].fecha, c.fecha) : null };
  });

  // Camino que se enseña en «Campamentos»: las etapas hasta la siguiente (con su fecha si ya se cruzaron)
  // y, más arriba, los hitos grandes que faltan hasta la cumbre.
  const cima = Math.max(1e8, meta);
  const camino = [...new Set([...etapasHasta(etapa), ...hitosHasta(cima)])].sort((a, b) => a - b).map((m) => {
    const c = items.find((x) => x.satsAcum >= m);
    return { m, mayor: hitosHasta(cima).includes(m), fecha: c?.fecha ?? null, meses: c ? mesesEntre(items[0].fecha, c.fecha) : null };
  });

  const limite = new Date(aFecha(hoy).getTime() - 182 * 864e5);
  const ventana = items.filter((c) => aFecha(c.fecha) >= limite);
  // Ritmo neto de los últimos 6 meses (compras menos ventas); sin ritmo positivo no hay proyección.
  // Las compras extra (por una caída) no son tu ritmo habitual: no inflan la proyección.
  const netoVentana = ventana.reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.extra ? 0 : c.sats), 0);
  const satsMes = ventana.filter((c) => c.tipo !== 'venta' && !c.extra).length >= 3 && netoVentana > 0 ? (netoVentana / 182) * 30.44 : null;
  const meses = satsMes ? (etapa - sats) / satsMes : null;

  const anios = new Map();
  for (const c of comprasItems) {
    const y = c.fecha.slice(0, 4);
    const a = anios.get(y) ?? { anio: y, usd: 0, sats: 0, n: 0, meses: Array(12).fill(0) };
    a.usd += c.monto; a.sats += c.sats; a.n++; a.meses[Number(c.fecha.slice(5, 7)) - 1] += c.monto;
    anios.set(y, a);
  }

  // La compra de la semana (racha, ritmo, «te toca», recordatorio) es la habitual: una compra extra por una caída no la cubre.
  const habituales = comprasItems.filter((c) => !c.extra);
  const porSemana = new Map();
  for (const c of habituales) porSemana.set(semana(c.fecha), (porSemana.get(semana(c.fecha)) ?? 0) + c.monto);
  // Semana = lunes a domingo en hora local. La semana en curso sin compra aún no rompe
  // la racha (le quedan días): entonces la referencia es la semana anterior, y la ventana
  // de 52 semanas termina en esa misma referencia para que ambas cuenten lo mismo.
  const actual = semana(hoy);
  const enCurso = porSemana.has(actual);
  const ref = enCurso ? actual : actual - 1;
  // Ritmo: cada semana o cada quincena (mediana de días entre tus últimas compras). Una racha es una
  // corrida de compras con no más de `paso` semanas entre una y otra; sigue viva mientras la última
  // compra no quede a más de `paso` semanas de hoy (la semana en curso aún no la rompe).
  const paso = pasoSemanas(habituales);
  let mejorRacha = 0, corrida = 0, previa = null, ini = null, mejorIni = null, mejorFin = null;
  for (const s of [...porSemana.keys()].sort((a, b) => a - b)) {
    if (previa !== null && s - previa <= paso) corrida++;
    else { corrida = 1; ini = s; }
    if (corrida > mejorRacha) { mejorRacha = corrida; mejorIni = ini; mejorFin = s; }
    previa = s;
  }
  // Cuándo empezó y acabó la mejor racha (primera compra de su primera semana y última de la última): «Tu historia».
  const fechasDe = (sem) => habituales.filter((c) => semana(c.fecha) === sem).map((c) => c.fecha).sort();
  const mejorRachaDesde = mejorIni === null ? null : fechasDe(mejorIni)[0], mejorRachaHasta = mejorFin === null ? null : fechasDe(mejorFin).at(-1);
  const racha = previa !== null && actual - previa <= paso ? corrida : 0;
  const venceSemanas = previa !== null ? previa + paso - actual : 0;
  const ultimas52 = Array.from({ length: 52 }, (_, i) => porSemana.get(ref - 51 + i) ?? 0);
  const semanasDesdePrimera = nCompras ? actual - semana(comprasItems[0].fecha) + 1 : 0;

  const porPrecio = [...comprasItems].sort((a, b) => a.precio - b.precio);
  return {
    items, n, nCompras, nVentas: n - nCompras, inv, sats, valor, realizada, comprado, vendido, satsComprados,
    total: valor == null ? null : realizada + (valor - inv),
    gan: valor == null ? null : valor - inv,
    pct: valor == null || !inv ? null : ((valor - inv) / inv) * 100,
    promedio: sats ? (inv * 1e8) / sats : null,
    meta, hitos, etapa, etapaPrev, camino,
    nExtra: comprasItems.filter((c) => c.extra).length,
    satsHabituales: comprasItems.filter((c) => !c.extra).reduce((a, c) => a + c.sats, 0),
    nHabituales: comprasItems.filter((c) => !c.extra).length,
    satsMes,
    // Solo la siguiente meta y solo si es alcanzable en un plazo razonable.
    proyeccion: meses != null && meses > 0 && meses <= 60 ? meses : null,
    anios: [...anios.values()],
    constancia: proximosHitosConstancia(comprasItems, hoy),
    racha, mejorRacha, mejorRachaDesde, mejorRachaHasta, paso, venceSemanas, ultimas52, semanaRef: ref, semanasConCompra: porSemana.size, semanaEnCurso: enCurso, semanasDesdePrimera,
    mejor: porPrecio[0] ?? null, peor: porPrecio.at(-1) ?? null,
  };
}

/**
 * Qué toca según tu ritmo (con 3 compras o más), a partir del resumen:
 * hecho (ya compraste esta semana) · aldia (quincenal, aún sobra una semana) · toca (esta semana vence la racha)
 * · ultimo (es domingo) · perdida (la racha se reinició). Es un recordatorio, no un reproche.
 */
export function tocaComprar(R, hoy = hoyISO()) {
  if (!R || R.nCompras < 3) return null;
  const d = R.paso - R.venceSemanas; // semanas desde tu última compra (0 = esta semana)
  if (d <= 0) return { estado: 'hecho', vence: R.venceSemanas };
  if (d < R.paso) return { estado: 'aldia', vence: R.venceSemanas };
  if (d === R.paso) return { estado: aFecha(hoy).getDay() === 0 ? 'ultimo' : 'toca', racha: R.racha };
  return { estado: 'perdida', mejor: R.mejorRacha };
}

// -------------------------------------------------------------- novedades
/**
 * Qué hay de nuevo para quien vuelve: los movimientos creados después de su última visita (`visto`, en ms).
 * Sin visita previa (null) se enseñan los últimos tres como bienvenida. Sin nada nuevo, null.
 */
export function novedades(items, visto, ahora = Date.now()) {
  if (!items.length) return null;
  const primera = visto == null;
  const nuevos = primera ? items.slice(-3) : items.filter((c) => c.creado > visto);
  if (!nuevos.length) return null;
  return {
    primera,
    dias: primera ? null : Math.max(0, Math.floor((ahora - visto) / 864e5)),
    nuevos: nuevos.slice(-5),
    masNuevos: Math.max(0, nuevos.length - 5),
    compras: nuevos.filter((c) => c.tipo !== 'venta').length,
    ventas: nuevos.filter((c) => c.tipo === 'venta').length,
  };
}

// ------------------------------------------------------------------- TXID
/** Enlace a la transacción en mempool.space, solo si el TXID tiene la forma correcta (64 hex). */
export const mempoolUrl = (txid) => (/^[0-9a-f]{64}$/.test(txid ?? '') ? `https://mempool.space/tx/${txid}` : null);

/** Si pegan un enlace de un explorador, saca el TXID; si no, devuelve el texto en minúsculas. */
export function extraerTxid(texto) {
  const t = String(texto ?? '').trim();
  if (/^https?:\/\//i.test(t)) {
    const m = t.match(/(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/i);
    if (m) return m[0].toLowerCase();
  }
  return t.toLowerCase();
}

// ---------------------------------------------------------- gráfico de precio
/** Serie [{fecha, p}] desde los cierres diarios; el último punto es siempre el precio en vivo. */
export function serieGrafico(historico, precioVivo, hoy = hoyISO()) {
  const s = historico.map(([fecha, p]) => ({ fecha, p }));
  if (!precioVivo) return s;
  const ult = s.at(-1);
  // Las velas son UTC: por la noche en El Salvador la última ya puede ser "mañana".
  if (ult && ult.fecha >= hoy) s[s.length - 1] = { fecha: ult.fecha, p: precioVivo, vivo: true };
  else s.push({ fecha: hoy, p: precioVivo, vivo: true });
  return s;
}

/** Marcas de dólares «redondas» (1, 2, 5 × 10ⁿ) para el eje de un gráfico que va de 0 a `max`: hasta 3, sin el 0. */
export function ticksDolares(max) {
  if (!(max > 0)) return [];
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const paso = ([1, 2, 5, 10].find((k) => k * mag >= raw) ?? 10) * mag;
  const ticks = [];
  for (let v = paso; v <= max * 0.97 + 1e-9; v += paso) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/**
 * Marcas «redondas» (1, 2, 5 × 10ⁿ) para el eje de precios de un gráfico que va de `lo` a `hi` dólares: entre 2 y 4.
 * En escala lineal son múltiplos de un paso redondo; en logarítmica, los 1, 2 y 5 de cada potencia de 10 (se aclaran
 * si salen demasiadas). Devuelve de menor a mayor, solo las que caen dentro de `lo`–`hi`.
 * @param {number} lo
 * @param {number} hi
 * @param {boolean} [log]
 * @returns {number[]}
 */
export function ticksPrecio(lo, hi, log = false) {
  if (!(hi > lo) || !(lo > 0)) return [];
  const bonito = (v) => { const mag = 10 ** Math.floor(Math.log10(v)); return ([1, 2, 5, 10].find((k) => k * mag >= v) ?? 10) * mag; };
  /** @type {number[]} */
  let t = [];
  if (log) {
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) for (const k of [1, 2, 5]) { const v = k * 10 ** e; if (v >= lo && v <= hi) t.push(v); }
    if (t.length > 4) t = t.filter((v) => /^1/.test(String(v)));
  } else {
    const paso = bonito((hi - lo) / 4);
    for (let v = Math.ceil(lo / paso) * paso; v <= hi + 1e-9; v += paso) t.push(Math.round(v * 100) / 100);
  }
  return t.length > 4 ? t.filter((_, i) => i % 2 === 0) : t;
}

/**
 * Lo que pusiste y lo que vale, día a día desde tu primera compra. `items` son los movimientos de `resumen()`
 * (con `inv`, el invertido neto, y `satsAcum`, el saldo, tras cada uno). `valor` es el saldo de sats al precio de
 * cada día; el último punto usa el precio vivo. Cada punto lleva `p: valor` para poder decimarlo con `muestrear`.
 */
export function serieValor(items, historico, vivo, hoy = hoyISO()) {
  if (!items.length) return [];
  const primera = items[0].fecha;
  const out = [];
  let k = -1; // último movimiento con fecha <= día
  for (const d of serieGrafico(historico, vivo, hoy)) {
    if (d.fecha < primera) continue;
    while (k + 1 < items.length && items[k + 1].fecha <= d.fecha) k++;
    if (k < 0) continue;
    const it = items[k];
    const valor = (it.satsAcum * d.p) / 1e8;
    out.push({ fecha: d.fecha, inv: it.inv, sats: it.satsAcum, precio: d.p, valor, p: valor, vivo: d.vivo });
  }
  return out;
}

/**
 * Tu costo promedio frente al precio promedio de BTC desde tu primera compra (media simple de los cierres diarios, con
 * el precio vivo al final). Comprar los mismos dólares cada vez compra más sats cuando el precio baja, así que el costo
 * suele quedar por debajo del promedio: ese es el efecto del DCA. Pide 3 compras y al menos 14 días de histórico; si no, null.
 * `cambio` es negativo cuando tu costo es menor que el promedio del período.
 */
export function costoVsPromedio(R, historico, vivo, hoy = hoyISO()) {
  if (!R || R.nCompras < 3 || !(R.promedio > 0) || !R.items.length) return null;
  const desde = R.items[0].fecha;
  const serie = serieGrafico(historico, vivo, hoy).filter((x) => x.fecha >= desde && x.p > 0);
  if (serie.length < 14) return null;
  const promedio = serie.reduce((a, x) => a + x.p, 0) / serie.length;
  return { costo: R.promedio, promedio, cambio: (R.promedio / promedio - 1) * 100, dias: serie.length };
}

/**
 * Dónde están tus sats. Un traslado mueve sats entre el exchange y tu wallet y no cambia el saldo total: lo trasladado a la
 * wallet (neto de lo que volvió al exchange) es lo que hay en la wallet; el resto sigue en el exchange. La wallet nunca
 * supera el saldo (si vendiste o gastaste más de lo que quedaba en el exchange, se recorta).
 */
export const walletNeto = (traslados) => (traslados ?? []).reduce((a, t) => a + (t.sentido === 'a_exchange' ? -t.sats : t.sats), 0);
/** Lo que hay en una wallet concreta (`id` 0 o null = «Mi wallet», la principal), neto de lo que volvió al exchange. */
export const walletNetoDe = (traslados, id = 0) => walletNeto((traslados ?? []).filter((t) => (t.wallet_id ?? 0) === (id ?? 0)));
/** El nombre de una wallet: la principal es «Mi wallet»; una que ya no está en la lista, «otra wallet». */
export const nombreWallet = (wallets, id) => ((id ?? 0) === 0 ? 'Mi wallet' : ((wallets ?? []).find((w) => w.id === id)?.nombre ?? 'otra wallet'));
/**
 * @param {Traslado[]|null|undefined} traslados
 * @param {number} saldo sats que tienes en total
 * @param {{ id: number, nombre: string }[]} [wallets] las wallets además de la principal (para ponerles nombre)
 * @returns {{ wallet: number, exchange: number, pctWallet: number, hay: boolean, partes: { id: number, nombre: string, sats: number }[] }}
 */
export function ubicacionSats(traslados, saldo, wallets = []) {
  // Cada wallet cuenta lo suyo (nunca negativo) y, entre todas, nunca más que el saldo; si sobra, se recorta en orden (la principal primero).
  const ids = [...new Set((traslados ?? []).map((t) => t.wallet_id ?? 0))].sort((a, b) => a - b);
  let resto = Math.max(0, saldo);
  const partes = ids.map((id) => {
    const sats = Math.min(resto, Math.max(0, walletNetoDe(traslados, id)));
    resto -= sats;
    return { id, nombre: nombreWallet(wallets, id), sats };
  });
  const wallet = partes.reduce((a, p) => a + p.sats, 0);
  const exchange = Math.max(0, saldo - wallet);
  return { wallet, exchange, pctWallet: saldo > 0 ? (wallet / saldo) * 100 : 0, hay: (traslados ?? []).length > 0, partes };
}

/** Índice del punto de la serie para una fecha; si cae después de la última vela, la última. */
export function ubicar(fecha, serie) {
  if (!serie.length || fecha < serie[0].fecha) return -1;
  if (fecha >= serie.at(-1).fecha) return serie.length - 1;
  let lo = 0, hi = serie.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (serie[m].fecha < fecha) lo = m + 1; else hi = m; }
  return lo;
}

/**
 * Precio de BTC para una fecha, para estimar los dólares de una compra anotada solo con sats:
 * hoy, el precio en vivo; otro día, el cierre diario (el último disponible si la fecha cae después de la
 * última vela). Sin dato de ese día, el precio de hoy, marcado como tal. Sin nada, null.
 * `historico` son los cierres [[fecha, cierre]] ordenados.
 */
export function precioDelDia(fecha, historico, vivo, hoy = hoyISO()) {
  if (!fecha || fecha >= hoy) return vivo ? { precio: vivo, fuente: 'vivo' } : null;
  let lo = 0, hi = historico.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (historico[m][0] <= fecha) { i = m; lo = m + 1; } else hi = m - 1; }
  if (i >= 0 && historico[i][1] > 0) return { precio: historico[i][1], fuente: 'cierre', dia: historico[i][0] };
  return vivo ? { precio: vivo, fuente: 'hoy' } : null;
}

/** Dólares de una compra de `sats` a `precio`, redondeados a centavos (mínimo un centavo). */
export const estimarMonto = (sats, precio) => Math.max(0.01, Math.round((sats * precio) / 1e8 * 100) / 100);

/** Reduce la serie a ~2n puntos conservando el mínimo y el máximo de cada tramo. */
export function muestrear(serie, n) {
  if (serie.length <= n * 2) return serie;
  const out = [];
  const paso = serie.length / n;
  for (let i = 0; i < n; i++) {
    const tramo = serie.slice(Math.floor(i * paso), Math.floor((i + 1) * paso));
    if (!tramo.length) continue;
    let mn = tramo[0], mx = tramo[0];
    for (const x of tramo) { if (x.p < mn.p) mn = x; if (x.p > mx.p) mx = x; }
    if (mn === mx) out.push(mn); else out.push(...(mn.fecha < mx.fecha ? [mn, mx] : [mx, mn]));
  }
  if (out.at(-1) !== serie.at(-1)) out.push(serie.at(-1));
  return out;
}

/**
 * Cuánto subió o bajó el precio desde el cierre de ayer (UTC, que es como se guardan los cierres diarios): { pct, cierre, fecha }.
 * Con menos de 3 cierres, sin precio o sin ningún cierre anterior a hoy, no hay dato (null).
 */
export function variacionAyer(historico, vivo, hoyUtc = new Date().toISOString().slice(0, 10)) {
  if (!vivo || !historico || historico.length < 3) return null;
  const previos = historico.filter(([f]) => f < hoyUtc);
  if (!previos.length) return null;
  const [fecha, cierre] = previos[previos.length - 1];
  if (!(cierre > 0)) return null;
  return { pct: (vivo / cierre - 1) * 100, cierre, fecha };
}

/** Cuántos sats compra un dólar a ese precio. */
export const satsPorDolar = (precio) => (precio > 0 ? 1e8 / precio : null);

/**
 * Sats por dólar de los últimos `dias` días (cierres diarios), con el precio vivo como último punto: [{ fecha, spd }].
 * Con menos de 14 cierres no hay serie (null): una línea de pocos días no dice nada.
 */
export function serieSatsPorDolar(historico, vivo, dias = 30, hoyUtc = new Date().toISOString().slice(0, 10)) {
  if (!vivo || !historico) return null;
  const previos = historico.filter(([f, c]) => f < hoyUtc && c > 0).slice(-dias);
  if (previos.length < 14) return null;
  const serie = previos.map(([fecha, c]) => ({ fecha, spd: 1e8 / c }));
  serie.push({ fecha: hoyUtc, spd: 1e8 / vivo });
  return serie;
}

// ------------------------------------------------------- vistas del gráfico: costo promedio, sats y semanas
/**
 * Cómo ha ido cambiando tu costo promedio con cada compra (el mismo costo ponderado de `resumen`: invertido neto ÷ sats).
 * Una venta no lo mueve (baja el costo base en proporción), así que solo hay un punto por compra:
 * [{ fecha, costo, cambio, pct, id, sats, precio }]; `cambio` y `pct` son respecto a la compra anterior (null en la primera).
 */
export function serieCostoPromedio(items) {
  const out = [];
  let previo = null;
  for (const it of items) {
    if (it.tipo === 'venta' || !(it.satsAcum > 0)) continue;
    const costo = (it.inv * 1e8) / it.satsAcum;
    out.push({ fecha: it.fecha, costo, cambio: previo == null ? null : costo - previo, pct: previo ? (costo / previo - 1) * 100 : null, id: it.id, sats: it.sats, precio: it.precio });
    previo = costo;
  }
  return out;
}

/** Las `k` compras que más movieron tu costo promedio (por porcentaje, hacia abajo o hacia arriba). */
export const masMovieron = (serie, k = 3) => serie.filter((p) => p.pct != null).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, k);

/**
 * La escalera de tus sats: el saldo tras cada movimiento (las ventas la bajan) y, si hace falta, un último punto hoy:
 * [{ fecha, sats, delta, tipo, id, hoy? }].
 */
export function serieSatsAcum(items, hoy = hoyISO()) {
  if (!items.length) return [];
  const out = items.map((it, i) => ({ fecha: it.fecha, sats: it.satsAcum, delta: it.tipo === 'venta' ? -it.sats : it.sats, tipo: it.tipo, id: it.id, i, extra: Boolean(it.extra) }));
  const u = out.at(-1);
  if (u.fecha < hoy) out.push({ fecha: hoy, sats: u.sats, delta: 0, tipo: null, id: null, hoy: true });
  return out;
}

/**
 * Las últimas `n` semanas (lunes a domingo) que terminan en la semana `ref` (`R.semanaRef`), cada una con sus compras:
 * [{ desde, hasta, compras, sats, monto }]. `monto` coincide con `R.ultimas52`.
 */
export function semanasDetalle(items, ref, n = 52) {
  const dia = (idx, k) => new Date(SEMANA0 + (idx * 7 + k) * 864e5).toISOString().slice(0, 10);
  const mapa = new Map();
  for (const c of items) {
    if (c.tipo === 'venta') continue;
    const s = semana(c.fecha);
    if (!mapa.has(s)) mapa.set(s, []);
    mapa.get(s).push(c);
  }
  return Array.from({ length: n }, (_, i) => {
    const idx = ref - (n - 1) + i;
    const compras = mapa.get(idx) ?? [];
    return { desde: dia(idx, 0), hasta: dia(idx, 6), compras, sats: compras.reduce((a, c) => a + c.sats, 0), monto: compras.reduce((a, c) => a + c.monto, 0) };
  });
}

// ------------------------------------------------------- la lista de movimientos: buscar, filtrar, ordenar y agrupar por mes
const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const PALABRA_TIPO = { compra: 'compra', venta: 'venta gasto', traslado: 'traslado' };
/** Compras, ventas y traslados en una sola forma, lo más reciente primero (a igual fecha, lo último que anotaste). */
/** @param {Movimiento[]} items @param {Traslado[]} [traslados] */
export function movimientosLista(items, traslados = []) {
  const m = [
    ...items.map((c) => ({ clave: `c${c.id}`, tipo: c.tipo === 'venta' ? 'venta' : 'compra', fecha: c.fecha, creado: c.creado ?? 0, id: c.id, sats: c.sats, monto: c.monto, nota: c.nota ?? '', txid: c.txid ?? '', extra: !!c.extra, etiquetas: c.etiquetas ?? [], ref: c })),
    ...traslados.map((t) => ({ clave: `t${t.id}`, tipo: 'traslado', fecha: t.fecha, creado: t.creado ?? 0, id: t.id, sats: t.sats, monto: null, nota: t.nota ?? '', txid: t.txid ?? '', extra: false, etiquetas: [], ref: t })),
  ];
  return ordenarMovimientos(m, 'recientes');
}
/** `orden`: recientes | antiguas | monto (dólares, de mayor a menor; los traslados al final) | sats. Las fechas se comparan como texto. */
export function ordenarMovimientos(movs, orden = 'recientes') {
  const porFecha = (a, b) => (a.fecha === b.fecha ? 0 : a.fecha < b.fecha ? -1 : 1);
  const cmp = {
    recientes: (a, b) => -porFecha(a, b) || b.creado - a.creado || 0,
    antiguas: (a, b) => porFecha(a, b) || a.creado - b.creado || 0,
    monto: (a, b) => (b.monto ?? -1) - (a.monto ?? -1) || b.sats - a.sats,
    sats: (a, b) => b.sats - a.sats,
  }[orden] ?? ((a, b) => -porFecha(a, b));
  return [...movs].sort(cmp);
}
/** Las etiquetas que has usado, de más a menos frecuentes: [{ nombre, n }]. Las anuladas ya no vienen en `items`. */
/** @param {{ etiquetas?: string[] }[]} items @returns {{ nombre: string, n: number }[]} */
export function etiquetasUsadas(items) {
  const cuenta = new Map();
  for (const c of items) for (const e of c.etiquetas ?? []) cuenta.set(e, (cuenta.get(e) ?? 0) + 1);
  return [...cuenta].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, 'es'));
}
/** Lo que escribe la persona («Cumpleaños, #bono ») como lista: minúsculas, sin # ni repetidas (el servidor valida lo demás). */
/** @param {string} texto @returns {string[]} */
export function partirEtiquetas(texto) {
  const salida = [];
  for (const p of String(texto ?? '').split(/[,;]/)) {
    const t = p.replace(/#/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
    if (t && !salida.includes(t)) salida.push(t);
  }
  return salida;
}
/** Lo que se puede buscar de un movimiento: nota, fecha, nombre del mes, tipo, sats, dólares y TXID (sin acentos ni mayúsculas). */
function pajar(m) {
  const mes = MESES[Number(m.fecha.slice(5, 7)) - 1] ?? '';
  return sinAcentos([m.nota, m.fecha, mes, mes.slice(0, 3), PALABRA_TIPO[m.tipo], m.extra ? 'extra' : '', (m.etiquetas ?? []).join(' '), m.sats, m.monto != null ? m.monto.toFixed(2) : '', m.txid].join(' '));
}
/**
 * Filtra: `texto` (todas las palabras deben aparecer), `filtro` (todos | compra | venta | traslado | extra | txid) y un rango de
 * fechas AAAA-MM-DD (`desde`, `hasta`, ambos inclusivos). Los totales de la pantalla no dependen de esto: solo es lo que se ve en la lista.
 */
export function filtrarMovimientos(movs, { texto = '', filtro = 'todos', desde = '', hasta = '', etiqueta = '' } = {}) {
  const palabras = sinAcentos(texto).split(/\s+/).map((p) => (/^[\d,.$]+$/.test(p) ? p.replace(/[,$]/g, '') : p)).filter(Boolean);
  return movs.filter((m) => {
    if (filtro === 'extra' ? !m.extra : filtro === 'txid' ? !m.txid : filtro !== 'todos' && m.tipo !== filtro) return false;
    if (desde && m.fecha < desde) return false;
    if (hasta && m.fecha > hasta) return false;
    if (etiqueta && !(m.etiquetas ?? []).includes(etiqueta)) return false;
    if (!palabras.length) return true;
    const h = pajar(m);
    return palabras.every((p) => h.includes(p));
  });
}
/** Encabezados por mes, en el orden que ya traen los movimientos: [{ mes: '2026-11', etiqueta: 'Noviembre 2026', resumen: '4 compras · 1 venta', movs }]. */
export function agruparPorMes(movs) {
  const grupos = [];
  for (const m of movs) {
    const mes = m.fecha.slice(0, 7);
    let g = grupos.at(-1);
    if (!g || g.mes !== mes) { g = { mes, etiqueta: `${MESES[Number(mes.slice(5)) - 1].replace(/^./, (c) => c.toUpperCase())} ${mes.slice(0, 4)}`, movs: [] }; grupos.push(g); }
    g.movs.push(m);
  }
  for (const g of grupos) {
    const cuenta = (t) => g.movs.filter((m) => m.tipo === t).length;
    const nombre = { compra: ['compra', 'compras'], venta: ['venta', 'ventas'], traslado: ['traslado', 'traslados'] };
    g.resumen = ['compra', 'venta', 'traslado'].filter(cuenta).map((t) => `${cuenta(t)} ${nombre[t][cuenta(t) === 1 ? 0 : 1]}`).join(' · ');
  }
  return grupos;
}

/**
 * Lo que dice la montaña a un lector de pantalla: dónde estás, cuántos campamentos pasaste, cuál es el siguiente y la cumbre.
 * `campos` son los campamentos que se ven en la escena (en sats) y `cima` la cumbre; `meta` es la siguiente etapa.
 */
export function descripcionMontana(sats, meta, campos, cima, libro = false) {
  const hechos = campos.filter((m) => m <= sats);
  const pct = Math.min(100, (sats / meta) * 100);
  // `libro`: para quien solo mira, el que sube es el libro (campamento 17).
  const pasados = hechos.length
    ? `Ya ${libro ? 'pasó' : 'pasaste'} ${hechos.length} de ${campos.length} campamentos (el último, ${nombreHito(hechos.at(-1))}).`
    : `Aún no ${libro ? 'llega' : 'llegas'} al primer campamento (${nombreHito(campos[0])}).`;
  const falta = meta > sats ? ` ${libro ? 'faltan' : 'te faltan'} ${entero(meta - sats)} sats` : '';
  return `${libro ? 'El libro está' : 'Estás'} a ${entero(sats)} sats de altitud, subiendo por un sendero con campamentos en la montaña. ${pasados} `
    + `Siguiente meta: ${nombreHito(meta)}, al ${pct < 10 ? pct.toFixed(1) : Math.floor(pct)} %;${falta}. La cumbre es ${nombreHito(cima)}.`;
}

// ---------------------------------------------------------------------------------------------
// Campamento 11 · «Tu eco y tus números»: pequeñas cuentas puras (el dibujo vive en montana.js y pintar.js).
// ---------------------------------------------------------------------------------------------

/** Saldo de sats que tenías al final de `fecha` (inclusive). `items` son los movimientos vigentes (compras y ventas). */
export function satsEn(items, fecha) {
  let s = 0;
  for (const c of items) {
    if (c.fecha > fecha) continue;
    s += c.tipo === 'venta' ? -c.sats : c.sats;
  }
  return Math.max(0, s);
}

/** La misma fecha de hace un año (el 29 de febrero cae el 28). */
export const haceUnAnio = (hoy) => sumarMeses(hoy, -12);

/**
 * Tu eco (idea 31): dónde estabas hace un año. Solo existe si ya tenías sats entonces y la primera compra es de hace un año o más
 * (si no, no hay «hace un año» que mostrar). `subiste` es cuánto más tienes hoy (puede ser 0 o negativo si vendiste).
 */
export function eco(items, saldoHoy, hoy = hoyISO()) {
  const compras = items.filter((c) => c.tipo !== 'venta');
  if (!compras.length) return null;
  const primera = compras.reduce((m, c) => (c.fecha < m ? c.fecha : m), compras[0].fecha);
  const fecha = haceUnAnio(hoy);
  if (primera > fecha) return null;
  const sats = satsEn(items, fecha);
  if (sats <= 0) return null;
  return { fecha, sats, subiste: saldoHoy - sats };
}

/**
 * «Número bonito» (idea 41): el saldo es capicúa (1,234,321), repite una cifra (777,777), es una escalera (123,456) o
 * recuerda a los 21 millones (2,100,000). Devuelve la razón en una palabra o null. Con menos de 4 cifras no cuenta:
 * 11 o 22 sats no son una rareza.
 */
export function numeroBonito(sats) {
  const s = String(Math.floor(sats));
  if (!(sats >= 1000) || s.length < 4) return null;
  if (/^(\d)\1+$/.test(s)) return 'repetido';
  if (s.length >= 5 && '0123456789'.includes(s)) return 'escalera';
  if (s.length >= 5 && s === [...s].reverse().join('')) return 'capicúa';
  if (/^21(0+)$/.test(s) && s.length >= 6) return '21';
  return null;
}
export const TEXTO_BONITO = { repetido: 'número bonito · todo repetido', escalera: 'número bonito · una escalera', 'capicúa': 'número bonito · capicúa', 21: 'número bonito · como los 21 millones' };

/** Calendario bitcoiner (idea 42): un dato del día, solo informativo. */
const EFEMERIDES = {
  '01-03': 'Hoy, en 2009, nació la red: el bloque génesis.',
  '05-22': 'Hoy es el Pizza Day: en 2010 alguien pagó dos pizzas con 10,000 BTC.',
  '10-31': 'Hoy, en 2008, se publicó el documento de Bitcoin.',
  '11-17': 'Noche de Leónidas: hoy se ven más estrellas fugaces.',
};
export function efemeride(fecha = hoyISO()) {
  const t = EFEMERIDES[fecha.slice(5)];
  return t ? { clave: fecha.slice(5), texto: t } : null;
}

/** Lluvias de estrellas reales (idea 43): la noche del máximo y las dos de al lado. `fuerza` 1 es la noche del máximo. */
const LLUVIAS = [
  { nombre: 'Perseidas', mes: 8, dia: 12 },
  { nombre: 'Leónidas', mes: 11, dia: 17 },
  { nombre: 'Gemínidas', mes: 12, dia: 14 },
];
export function lluviaEstrellas(fecha = hoyISO()) {
  const [y, m, d] = fecha.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  for (const l of LLUVIAS) {
    const dias = Math.round((t - Date.UTC(y, l.mes - 1, l.dia)) / 864e5);
    if (Math.abs(dias) <= 1) return { nombre: l.nombre, fuerza: dias === 0 ? 1 : 0.5 };
  }
  return null;
}

/** Aniversario (idea 6): hoy es el día en que hiciste tu primera compra, y de ello hace al menos un año. */
export function aniversario(items, hoy = hoyISO()) {
  const compras = items.filter((c) => c.tipo !== 'venta');
  if (!compras.length) return null;
  const primera = compras.reduce((m, c) => (c.fecha < m ? c.fecha : m), compras[0].fecha);
  const anios = Number(hoy.slice(0, 4)) - Number(primera.slice(0, 4));
  if (anios < 1) return null;
  return sumarMeses(primera, anios * 12) === hoy ? { anios } : null;
}

/** Cuántas pupusas (idea 28, huevo de pascua): a un precio fijo en dólares; sin precio no se calcula. */
export function enPupusas(valorUsd, precio = 0.75) {
  return valorUsd > 0 ? Math.floor(valorUsd / precio) : null;
}

/** Árbol de honor (idea 52): la compra n.º 100, 500 y 1,000 plantan uno distinto entre los pinos. */
export const ARBOLES = [{ desde: 1000, tipo: 'maquilishuat' }, { desde: 500, tipo: 'amate' }, { desde: 100, tipo: 'ceibo' }];
export const arbolesDe = (nCompras) => ARBOLES.filter((a) => nCompras >= a.desde).map((a) => a.tipo).reverse();

// ---------------------------------------------------------------------------------------------
// Campamento 13 · «Tu historia en objetos»: los datos de tres dibujos (el tronco, la constelación y la torre de piedras). Son cuentas
// puras: el dibujo vive en `arte-historia.js`. Nada de esto recomienda ni presiona: solo cuenta lo que ya pasó.
// ---------------------------------------------------------------------------------------------

/** Posición dentro del año (0 a 1) de una fecha AAAA-MM-DD, por día del año. */
export function fraccionAnio(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const dia = (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5;
  const dias = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 864e5;
  return Math.min(1, Math.max(0, dia / dias));
}

/**
 * El tronco: un anillo por año, desde el de tu primera compra hasta el de hoy (un año sin compras es un anillo delgado, no un hueco).
 * `comprados` es el ancho; `extras` son los nudos y `ventas` las grietas, cada uno con su posición en el año (`frac`, 0 a 1).
 * `saldoFin` es lo que tenías al cerrar el año (o hoy, si es el año en curso: `completo` falso).
 */
export function aniosTronco(items, hoy = hoyISO()) {
  const compras = items.filter((c) => c.tipo !== 'venta');
  if (!compras.length) return [];
  const anioHoy = Number(hoy.slice(0, 4));
  const primero = Math.min(...compras.map((c) => Number(c.fecha.slice(0, 4))));
  const por = new Map();
  for (let a = primero; a <= anioHoy; a++) por.set(a, { anio: a, comprados: 0, vendidos: 0, nCompras: 0, nExtras: 0, nVentas: 0, extras: [], ventas: [], completo: a < anioHoy, saldoFin: 0 });
  for (const c of items) {
    const y = por.get(Number(c.fecha.slice(0, 4)));
    if (!y) continue;
    const marca = { fecha: c.fecha, sats: c.sats, frac: fraccionAnio(c.fecha) };
    if (c.tipo === 'venta') { y.vendidos += c.sats; y.nVentas++; y.ventas.push(marca); }
    else { y.comprados += c.sats; y.nCompras++; if (c.extra) { y.nExtras++; y.extras.push(marca); } }
  }
  for (const y of por.values()) y.saldoFin = satsEn(items, y.completo ? `${y.anio}-12-31` : hoy);
  return [...por.values()];
}

const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));
/**
 * La constelación: una estrella por compra, en una espiral de girasol (ángulo áureo) para que el dibujo crezca hacia afuera con los
 * años. `x` e `y` van de 0 a 1 (dentro del círculo unidad); `mag` (0.15 a 1) es el brillo según sus sats frente a la mediana. La
 * escala es `sqrt(max(n, minEscala))`: con pocas compras la espiral ocupa poco y se va abriendo; pasadas `minEscala`, todo se ajusta.
 */
export function estrellasConstelacion(items, minEscala = 120) {
  const compras = items.filter((c) => c.tipo !== 'venta').sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  const n = compras.length;
  if (!n) return [];
  const esc = Math.sqrt(Math.max(n, minEscala));
  const orden = compras.map((c) => c.sats).sort((a, b) => a - b);
  const mediana = orden[Math.floor(orden.length / 2)] || 1;
  return compras.map((c, i) => {
    const r = Math.sqrt(i + 0.5) / esc, a = i * ANGULO_AUREO;
    return { i, fecha: c.fecha, anio: Number(c.fecha.slice(0, 4)), sats: c.sats, extra: Boolean(c.extra), x: 0.5 + 0.5 * r * Math.cos(a), y: 0.5 + 0.5 * r * Math.sin(a), mag: Math.min(1, Math.max(0.15, Math.sqrt(c.sats / mediana) / 2)) };
  });
}

/**
 * La torre de piedras: una piedra por compra, de la más vieja (abajo) a la más nueva (arriba). Con más de `max` compras cada piedra junta varias
 * seguidas (`n`), como en el bosque. `tam` (0.35 a 1) es su tamaño según los sats frente a la piedra más grande.
 */
export function piedrasTorre(items, max = 40) {
  const compras = items.filter((c) => c.tipo !== 'venta').sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  if (!compras.length) return [];
  const por = Math.ceil(compras.length / max);
  const piedras = [];
  for (let k = 0; k < compras.length; k += por) {
    const g = compras.slice(k, k + por);
    piedras.push({ i: piedras.length, desde: g[0].fecha, hasta: g.at(-1).fecha, n: g.length, sats: g.reduce((a, c) => a + c.sats, 0), extra: g.some((c) => c.extra), tam: 0 });
  }
  const mayor = Math.max(...piedras.map((p) => p.sats)) || 1;
  for (const p of piedras) p.tam = Math.min(1, Math.max(0.35, p.sats / mayor));
  return piedras;
}

/** Los textos que leen los lectores de pantalla (y los lectores de la familia) para cada dibujo. */
export function textoTronco(anios) {
  if (!anios.length) return 'Tu tronco empieza con tu primera compra.';
  const mejor = anios.reduce((m, y) => (y.comprados > m.comprados ? y : m), anios[0]);
  const nudos = anios.reduce((a, y) => a + y.nExtras, 0);
  return `Tu tronco tiene ${anios.length} ${anios.length === 1 ? 'anillo' : 'anillos'}, uno por año, de ${anios[0].anio} a ${anios.at(-1).anio}. `
    + `El más ancho es ${mejor.anio}, con ${entero(mejor.comprados)} sats.${nudos ? ` Hay ${nudos} ${nudos === 1 ? 'nudo' : 'nudos'}: las compras extra.` : ''}`;
}
export function textoConstelacion(estrellas) {
  if (!estrellas.length) return 'Tu constelación empieza con tu primera compra.';
  const ult = estrellas.at(-1);
  return `Tu constelación tiene ${estrellas.length} ${estrellas.length === 1 ? 'estrella' : 'estrellas'}, una por compra. La más reciente es la del ${fechaLarga(ult.fecha)}.`;
}
export function textoTorre(piedras) {
  if (!piedras.length) return 'Tu torre de piedras empieza con tu primera compra.';
  const n = piedras.reduce((a, p) => a + p.n, 0);
  const junta = piedras.some((p) => p.n > 1);
  return `Tu torre de piedras tiene ${piedras.length} ${piedras.length === 1 ? 'piedra' : 'piedras'}${junta ? `, que juntan ${n} compras` : ', una por compra'}; las más grandes son las de más sats.`;
}
/** Resumen de un año del tronco, para leerlo al tocar su anillo. */
export function textoAnio(y) {
  const partes = [`${y.anio}${y.completo ? '' : ' (en curso)'}: ${y.nCompras} ${y.nCompras === 1 ? 'compra' : 'compras'}`];
  if (y.comprados) partes.push(`+${entero(y.comprados)} sats`);
  if (y.nExtras) partes.push(`${y.nExtras} extra`);
  if (y.nVentas) partes.push(`${y.nVentas} ${y.nVentas === 1 ? 'venta' : 'ventas'} (−${entero(y.vendidos)} sats)`);
  partes.push(`${y.completo ? 'cerraste' : 'tienes'} ${entero(y.saldoFin)} sats`);
  return partes.join(' · ');
}

// ---------------------------------------------------------------------------------------------
// Campamento 13B · la manta de añil, el certificado de altitud y los sellos de lacre: solo datos (el dibujo vive en `arte-historia.js`
// y `arte-sellos.js`). Cuentan lo que ya pasó; una semana sin compras es parte del tejido, no una falta.
// ---------------------------------------------------------------------------------------------

const diaDeSemana = (idx, k) => new Date(SEMANA0 + (idx * 7 + k) * 864e5).toISOString().slice(0, 10);

/**
 * La manta: una fila por año y una celda por semana (lunes a domingo; cada semana va en el año de su jueves, como las semanas ISO).
 * Cada celda trae sus `sats` (compras de esa semana; las ventas no se cuentan), cuántas compras fueron (`n`), si alguna fue extra
 * y su `tono` de añil (0 = semana sin compras, algodón crudo; 1 a 4 = de más claro a más oscuro, por cuartiles de las semanas con
 * compra). `antes` marca las celdas anteriores a tu primera semana y `futura` las que aún no llegan (los flecos del año en curso).
 * `celdas` es la lista plana de las semanas reales (de la primera a hoy), en orden, para recorrerlas con el teclado.
 */
export function semanasManta(items, hoy = hoyISO()) {
  const compras = items.filter((c) => c.tipo !== 'venta');
  if (!compras.length) return { anios: [], celdas: [], semanasConCompra: 0 };
  const primera = semana(compras.reduce((m, c) => (c.fecha < m ? c.fecha : m), compras[0].fecha));
  const actual = semana(hoy);
  const porSemana = new Map();
  for (const c of compras) {
    const s = semana(c.fecha);
    const o = porSemana.get(s) ?? { sats: 0, n: 0, extra: false };
    o.sats += c.sats; o.n++; if (c.extra) o.extra = true;
    porSemana.set(s, o);
  }
  const orden = [...porSemana.values()].map((o) => o.sats).sort((a, b) => a - b);
  // El tono sale de la posición de la semana entre todas las que tuvieron compra (las iguales comparten el punto medio de su grupo):
  // de 1 (añil claro) a 4 (añil oscuro); con una sola semana, un tono medio.
  const tonoDe = (sats) => {
    if (sats <= 0) return 0;
    if (orden.length === 1) return 3;
    const pos = (orden.indexOf(sats) + orden.lastIndexOf(sats)) / 2;
    return 1 + Math.min(3, Math.floor((pos * 4) / (orden.length - 1)));
  };
  const anioDe = (idx) => Number(diaDeSemana(idx, 3).slice(0, 4)); // el año del jueves
  const colDe = (idx) => { const j = diaDeSemana(idx, 3); return Math.floor((Date.UTC(Number(j.slice(0, 4)), Number(j.slice(5, 7)) - 1, Number(j.slice(8, 10))) - Date.UTC(Number(j.slice(0, 4)), 0, 1)) / (7 * 864e5)); };
  const a0 = anioDe(primera), a1 = anioDe(actual);
  const anios = [];
  const celdas = [];
  for (let a = a0; a <= a1; a++) {
    // El número de columnas del año: las semanas cuyo jueves cae en él (52 o 53).
    let desde = Number.NaN, hasta = Number.NaN;
    for (let idx = semana(`${a}-01-01`) - 1; idx <= semana(`${a}-12-31`) + 1; idx++) if (anioDe(idx) === a) { if (Number.isNaN(desde)) desde = idx; hasta = idx; }
    const semanas = [];
    let satsAnio = 0, nAnio = 0, conCompra = 0;
    for (let idx = desde; idx <= hasta; idx++) {
      const o = porSemana.get(idx);
      const celda = { idx, col: colDe(idx), desde: diaDeSemana(idx, 0), hasta: diaDeSemana(idx, 6), sats: o?.sats ?? 0, n: o?.n ?? 0, extra: Boolean(o?.extra), tono: tonoDe(o?.sats ?? 0), antes: idx < primera, futura: idx > actual, anio: a };
      semanas.push(celda);
      if (!celda.antes && !celda.futura) { celdas.push(celda); satsAnio += celda.sats; nAnio += celda.n; if (celda.n) conCompra++; }
    }
    anios.push({ anio: a, semanas, sats: satsAnio, nCompras: nAnio, semanasConCompra: conCompra, enCurso: a === a1 });
  }
  return { anios, celdas, semanasConCompra: celdas.filter((c) => c.n).length };
}

/** Lo que dice la manta en total, para los lectores de pantalla. */
export function textoManta(m) {
  if (!m.celdas.length) return 'Tu manta empieza con tu primera compra.';
  const a = m.anios;
  return `Tu manta tiene ${a.length} ${a.length === 1 ? 'fila' : 'filas'}, una por año, de ${a[0].anio} a ${a.at(-1).anio}, y ${m.celdas.length} semanas tejidas, `
    + `${m.semanasConCompra} con compra. Cuanto más oscuro el añil, más sats esa semana; el algodón crudo es una semana sin compras.`;
}
/** Una semana de la manta, para leerla al tocarla. */
export function textoSemanaManta(c) {
  const rango = `${fechaLarga(c.desde)} al ${fechaLarga(c.hasta)}`;
  if (!c.n) return `Semana del ${rango}: sin compras.`;
  return `Semana del ${rango}: ${c.n} ${c.n === 1 ? 'compra' : 'compras'}, +${entero(c.sats)} sats${c.extra ? ', con una compra extra' : ''}.`;
}

const UNI = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const VEINTI = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECE = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENT = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
const apocope = (s) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
function decenas(n) {
  if (n < 20) return UNI[n];
  if (n < 30) return VEINTI[n - 20];
  return DECE[Math.floor(n / 10)] + (n % 10 ? ` y ${UNI[n % 10]}` : '');
}
function centenas(n) {
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100), r = n % 100;
  return [CENT[c], r ? decenas(r) : ''].filter(Boolean).join(' ');
}
/**
 * Un número entero (0 a 999 billones) escrito en letras, en español: «mil doscientos treinta y cuatro». El «uno» pierde la o antes de
 * una palabra («un millón», «veintiún mil», «un sat»), así que sirve tal cual delante de «sats».
 */
export function enLetras(n) {
  n = Math.floor(n);
  if (!(n >= 0) || n >= 1e15) return String(n);
  if (n === 0) return 'cero';
  const r = (x) => {
    if (x < 1000) return apocope(centenas(x));
    if (x < 1e6) { const m = Math.floor(x / 1e3), resto = x % 1e3; return `${m === 1 ? 'mil' : `${r(m)} mil`}${resto ? ` ${r(resto)}` : ''}`; }
    if (x < 1e12) { const m = Math.floor(x / 1e6), resto = x % 1e6; return `${m === 1 ? 'un millón' : `${r(m)} millones`}${resto ? ` ${r(resto)}` : ''}`; }
    const m = Math.floor(x / 1e12), resto = x % 1e12;
    return `${m === 1 ? 'un billón' : `${r(m)} billones`}${resto ? ` ${r(resto)}` : ''}`;
  };
  return r(n);
}

/**
 * Los datos del certificado de altitud: tu saldo en cifras y en letras, la fecha, cuántas compras y cuánta racha. Para el dibujo:
 * `lobulos` (tus compras, de 3 a 48), `altitud` (0 a 1, dónde estás entre la base y la cima de tu montaña) y `trenzas` (tu racha,
 * de 1 a 12). `nombre` es de quien mira (null para una persona que no es dueña del libro: sale «Libro DCA»). Todo sale igual cada vez.
 */
export function datosCertificado(R, nombre, hoy = hoyISO()) {
  const sats = Math.max(0, R.sats ?? 0);
  const letras = enLetras(sats);
  const esc = escalaMontana(sats);
  return {
    nombre: nombre || null, hoy, fecha: fechaLarga(hoy), sats, btc: btc(sats),
    letras: `${letras.charAt(0).toUpperCase()}${letras.slice(1)} ${sats === 1 ? 'sat' : 'sats'}`,
    nCompras: R.nCompras ?? 0, racha: R.racha ?? 0, primera: R.items?.find((c) => c.tipo !== 'venta')?.fecha ?? null,
    lobulos: Math.min(48, Math.max(3, R.nCompras ?? 0)), altitud: altitud(sats, esc), trenzas: Math.min(12, Math.max(1, R.racha ?? 1)),
  };
}
export const textoCertificado = (d) => `Certificado de altitud${d.nombre ? ` de ${d.nombre}` : ' del Libro DCA'}. A ${d.fecha} el libro tiene ${d.letras}`
  + `${d.nCompras ? `, de ${d.nCompras} ${d.nCompras === 1 ? 'compra' : 'compras'}` : ''}.`;

/**
 * Los sellos de lacre: uno por cada etapa que ya cruzaste (con su fecha); nunca los que faltan. `nombre` es la cifra del sello.
 */
export function sellos(R) {
  return (R.camino ?? []).filter((h) => h.fecha).map((h) => ({ m: h.m, nombre: nombreHito(h.m), grande: Boolean(h.mayor), fecha: h.fecha }));
}
export const textoSello = (s) => `Sello de ${s.m >= 1e8 ? s.nombre : `${s.nombre} sats`}, cruzado el ${fechaLarga(s.fecha)}`;

// ---------------------------------------------------------------------------------------------
// Campamento 13C · estratos, sellos de la semana y partitura: solo datos (los dibujos viven en `arte-historia.js`, `arte-sellos.js` y
// `arte.js`). Cuentan lo que ya pasó; un mes o una semana sin compras es parte del paisaje, no una falta.
// ---------------------------------------------------------------------------------------------

/**
 * Los estratos: una capa por mes, desde el de tu primera compra hasta el de hoy (un mes sin compras es una capa delgada, nunca un hueco).
 * `espesor` (0 a 1) es lo comprado ese mes frente al mes que más compraste; `erosion` (0 a 1) es la parte de lo comprado que se vendió o se
 * gastó ese mes; `satsExtra` son las compras extra (las vetas de cuarzo). `saldoFin` es lo que tenías al cerrar el mes (o hoy).
 */
export function estratosMes(items, hoy = hoyISO()) {
  const compras = items.filter((c) => c.tipo !== 'venta');
  if (!compras.length) return [];
  const mes0 = compras.reduce((m, c) => (c.fecha < m ? c.fecha : m), compras[0].fecha).slice(0, 7), mesHoy = hoy.slice(0, 7);
  const por = new Map();
  let [y, m] = mes0.split('-').map(Number);
  while (`${y}-${String(m).padStart(2, '0')}` <= mesHoy) {
    const mes = `${y}-${String(m).padStart(2, '0')}`;
    por.set(mes, { i: por.size, mes, anio: y, nombre: `${MESES[m - 1]} ${y}`, comprados: 0, vendidos: 0, nCompras: 0, nVentas: 0, nExtras: 0, satsExtra: 0, espesor: 0, erosion: 0, saldoFin: 0, enCurso: mes === mesHoy });
    if (++m > 12) { m = 1; y++; }
  }
  for (const c of items) {
    const e = por.get(c.fecha.slice(0, 7));
    if (!e) continue;
    if (c.tipo === 'venta') { e.vendidos += c.sats; e.nVentas++; }
    else { e.comprados += c.sats; e.nCompras++; if (c.extra) { e.nExtras++; e.satsExtra += c.sats; } }
  }
  const tope = Math.max(1, ...[...por.values()].map((e) => e.comprados));
  for (const e of por.values()) {
    e.espesor = e.comprados / tope;
    e.erosion = e.comprados ? Math.min(1, e.vendidos / e.comprados) : e.vendidos ? 1 : 0;
    e.saldoFin = satsEn(items, e.enCurso ? hoy : `${e.mes}-31`);
  }
  return [...por.values()];
}
export function textoEstratos(e) {
  if (!e.length) return 'Tus estratos empiezan con tu primera compra.';
  const con = e.filter((x) => x.nCompras).length;
  return `Tus estratos tienen ${e.length} ${e.length === 1 ? 'capa' : 'capas'}, una por mes, de ${e[0].nombre} a ${e.at(-1).nombre}; ${con} con compras. `
    + 'Cuanto más gruesa la capa, más sats ese mes; las vetas de cuarzo son compras extra y lo desgastado, ventas o gastos.';
}
/** Un mes de los estratos, para leerlo al tocarlo. */
export function textoEstrato(e) {
  const partes = [`${e.nombre}${e.enCurso ? ' (en curso)' : ''}: ${e.nCompras ? `${e.nCompras} ${e.nCompras === 1 ? 'compra' : 'compras'}, +${entero(e.comprados)} sats` : 'sin compras'}`];
  if (e.nExtras) partes.push(`${e.nExtras} extra (+${entero(e.satsExtra)} sats)`);
  if (e.nVentas) partes.push(`${e.nVentas} ${e.nVentas === 1 ? 'venta' : 'ventas'} (−${entero(e.vendidos)} sats)`);
  partes.push(`${e.enCurso ? 'tienes' : 'cerraste con'} ${entero(e.saldoFin)} sats`);
  return partes.join(' · ');
}

/** «9 – 15 nov 2026» o «30 nov – 6 dic 2026»: el rango de una semana de lunes a domingo, con el año del domingo. */
export function nombreSemana(desde, hasta) {
  const d = fechaCorta(desde), h = fechaCorta(hasta);
  const [dd, dm] = d.split(' '), [hd, hm] = h.split(' ');
  return `${dm === hm ? dd : d} – ${hd} ${hm} ${hasta.slice(0, 4)}`;
}
/**
 * El pasaporte: un sello por cada semana en que compraste algo (de la más vieja a la más nueva), con tu saldo y tu altitud (0 a 1) al
 * cerrar esa semana. `numero` es el lugar del sello en el pasaporte. Una semana sin sello no es una falta: no se enseña ni se cuenta.
 */
export function sellosSemana(items, hoy = hoyISO()) {
  return semanasManta(items, hoy).celdas.filter((c) => c.n).map((c, k) => {
    const saldo = satsEn(items, c.hasta < hoy ? c.hasta : hoy);
    return { idx: c.idx, numero: k + 1, desde: c.desde, hasta: c.hasta, nombre: nombreSemana(c.desde, c.hasta), sats: c.sats, n: c.n, extra: c.extra, saldo, altitud: altitud(saldo, escalaMontana(saldo)) };
  });
}
/** El sello que nace al guardar una compra: solo si es la primera de su semana (si no, esa semana ya tenía su sello); si no, null. */
export function selloNuevo(items, fecha, hoy = hoyISO()) {
  const s = sellosSemana(items, hoy).find((x) => x.desde <= fecha && fecha <= x.hasta);
  return s && s.n === 1 ? s : null;
}
export const textoSelloSemana = (s) => `Sello n.º ${s.numero}: semana del ${s.nombre}, ${s.n} ${s.n === 1 ? 'compra' : 'compras'}, +${entero(s.sats)} sats; al cerrar la semana tenías ${entero(s.saldo)} sats`;
export const textoPasaporte = (ss) => (ss.length
  ? `Tu pasaporte tiene ${ss.length} ${ss.length === 1 ? 'sello' : 'sellos'}, uno por cada semana en que compraste.`
  : 'Tu pasaporte empieza con tu primera compra.');

/** Las trece posiciones de la pauta (do 4 a la 5 sobre la quinta), de abajo arriba, en Hz: escala de do mayor. Las líneas son los pasos 2, 4, 6, 8 y 10. */
export const PASOS_HZ = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880];
/**
 * La partitura: un año por pauta y una nota por compra. Cuanto más caro estaba BTC ese día (`precio`, lo que pagaste por 1 BTC), más
 * arriba la nota (`paso`, 0 a 12); la escala es logarítmica y la misma para todos los años, para que se puedan comparar. `frac` (0 a 1) es
 * su lugar en el año. Con todos los precios iguales, las notas van a la mitad. Solo cuenta lo que ya pasó: ni predice ni recomienda.
 */
export function partitura(items) {
  const compras = items.filter((c) => c.tipo !== 'venta' && c.precio > 0).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  if (!compras.length) return [];
  const logs = compras.map((c) => Math.log(c.precio));
  const lo = Math.min(...logs), hi = Math.max(...logs);
  const por = new Map();
  compras.forEach((c, k) => {
    const anio = Number(c.fecha.slice(0, 4));
    const y = por.get(anio) ?? { anio, notas: [], min: Infinity, max: 0 };
    y.notas.push({ i: y.notas.length, fecha: c.fecha, frac: fraccionAnio(c.fecha), precio: c.precio, sats: c.sats, extra: Boolean(c.extra), paso: hi > lo ? Math.round(((logs[k] - lo) / (hi - lo)) * 12) : 6 });
    y.min = Math.min(y.min, c.precio); y.max = Math.max(y.max, c.precio);
    por.set(anio, y);
  });
  return [...por.values()];
}
export const textoPartitura = (anios) => (anios.length
  ? `Tu partitura tiene ${anios.length} ${anios.length === 1 ? 'pauta' : 'pautas'}, una por año, y una nota por compra: cuanto más caro estaba BTC ese día, más aguda la nota.`
  : 'Tu partitura empieza con tu primera compra.');
export const textoAnioPartitura = (y) => `${y.anio}: ${y.notas.length} ${y.notas.length === 1 ? 'nota' : 'notas'}; BTC entre $${entero(y.min)} y $${entero(y.max)} en tus compras`;
export const textoNota = (n) => `${fechaLarga(n.fecha)} · BTC a $${entero(n.precio)} · +${entero(n.sats)} sats${n.extra ? ' · compra extra' : ''}`;

// ---------------------------------------------------------------------------------------------
// Campamento 15A · el Diario del Libro, mensajes en la bandera y cartas selladas: solo datos y textos (la pantalla vive en `diario.js`,
// `capsulas.js` y `mensajes.js`). Todo informa o acompaña; nada recomienda ni presiona.
// ---------------------------------------------------------------------------------------------

/** Cuándo se abre una carta sellada, en palabras (sin cuentas de lo que falta: no es una presión). */
export function textoApertura(c) {
  if (c.abre_fecha) return `Se abre el ${fechaLarga(c.abre_fecha)}`;
  return `Se abre al llegar a ${c.abre_sats >= 1e8 ? nombreHito(c.abre_sats) : `${nombreHito(c.abre_sats)} sats`}`;
}
/** Las próximas etapas por encima de tu saldo (para elegir a cuál se abre una carta). */
export function etapasFuturas(sats, n = 6) {
  const out = [];
  let m = etapaSiguiente(sats);
  while (out.length < n) { out.push(m); m = etapaSiguiente(m); }
  return out;
}
/** La fecha de mañana (la primera en que puede abrirse una carta). */
export function mananaISO(hoy = hoyISO()) {
  const [y, m, d] = hoy.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
const restarDias = (hoy, n) => {
  const [y, m, d] = hoy.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
};
/** Suma (o resta, con `n` negativo) días a una fecha AAAA-MM-DD. */
export const sumarDias = (f, n) => restarDias(f, -n);

const PRONOSTICOS = {
  lluviosa: ['lluvias por la tarde en el valle y la cumbre despejada', 'nubes bajas por la mañana, claros al mediodía', 'chubascos ligeros abajo y mucha luz arriba', 'tarde fresca, con olor a tierra mojada'],
  seca: ['cielos limpios y brisa fresca en la cumbre', 'sol parejo todo el día y viento suave', 'mañana clara y tarde dorada', 'noche despejada, buena para mirar las estrellas'],
};
/**
 * El Diario del Libro (idea 46): una portada con lo que pasó, escrita con los datos que ya existen. Siempre sale igual para un mismo día.
 * `titular` y `sub` dependen de lo último que pasó (una etapa reciente, compras de la semana, o una semana tranquila, sin reproche);
 * `haceUnAnio` solo existe si hay un año de historia; los `clasificados` son tres avisos con humor sobre tu camino; el `pronostico` es el
 * clima de la montaña (de la época del año), **nunca del precio**. `altitud` (0 a 1) es para el grabado.
 */
export function diario(R, hoy = hoyISO()) {
  if (!R || !R.nCompras) return null;
  const compras = R.items.filter((c) => c.tipo !== 'venta');
  const sem = semana(hoy);
  const desde = restarDias(hoy, 7), desdeEtapa = restarDias(hoy, 14);
  const recientes = compras.filter((c) => c.fecha > desde && c.fecha <= hoy);
  const subidos = recientes.reduce((a, c) => a + c.sats, 0);
  const etapaReciente = (R.camino ?? []).filter((h) => h.fecha && h.fecha > desdeEtapa && h.fecha <= hoy).at(-1);
  let titular, sub;
  if (etapaReciente) { titular = `Llegamos a ${metaTxt(etapaReciente.m)}`; sub = `La montaña ya cuenta ${entero(R.sats)} sats. El ${fechaLarga(etapaReciente.fecha)} quedó marcado en el sendero.`; }
  else if (recientes.length) {
    titular = recientes.length === 1 ? `Un paso más: la montaña subió ${entero(subidos)} sats` : `La montaña subió ${entero(subidos)} sats esta semana`;
    sub = `${recientes.length === 1 ? 'Una compra' : `${recientes.length} compras`} en los últimos siete días. El libro suma ${entero(R.sats)} sats.`;
  } else { titular = 'Semana tranquila en la montaña'; sub = `Nadie se apura: el camino sigue ahí, ${entero(R.sats)} sats arriba, esperando con paciencia.`; }
  const e = eco(R.items, R.sats, hoy);
  const haceAnio = e ? { fecha: e.fecha, sats: e.sats, hoy: R.sats, subiste: e.subiste,
    texto: e.subiste > 0 ? `Hace un año el libro tenía ${entero(e.sats)} sats. Hoy tiene ${entero(R.sats)}: ${entero(e.subiste)} más.` : `Hace un año el libro tenía ${entero(e.sats)} sats. Hoy tiene ${entero(R.sats)}.` } : null;
  const alcanzado = [...(R.camino ?? [])].filter((h) => h.mayor && h.fecha).at(-1);
  const faltan = Math.max(0, Math.ceil(R.etapa - R.sats));
  const unidad = R.paso === 2 ? 'quincenas' : 'semanas';
  const clasificados = [
    `SE BUSCAN ${entero(faltan)} sats para llegar a ${metaTxt(R.etapa)}. Sin prisa. Razón: la vista.`,
    R.racha >= 2 ? `SE OFRECE racha de ${R.racha} ${unidad} seguidas. Poco uso, mucho cariño.` : 'SE ACEPTAN paciencia y buen humor. Experiencia no necesaria.',
    alcanzado ? `SE REGALA vista desde el campamento ${nombreHito(alcanzado.m)}. Buenas condiciones, sin vecinos ruidosos.` : 'SE ALQUILA el primer campamento, con vista al sendero. Tienda incluida.',
  ];
  if (sem % 2) clasificados.reverse();
  const epoca = Number(hoy.slice(5, 7)) >= 5 && Number(hoy.slice(5, 7)) <= 10 ? 'lluviosa' : 'seca';
  const pronostico = `${PRONOSTICOS[epoca][sem % 4].replace(/^./, (ch) => ch.toUpperCase())}. Es el clima, no un consejo: la montaña no adivina nada.`;
  const esc = escalaMontana(R.sats);
  const primera = compras[0].fecha;
  return { edicion: fechaLarga(hoy), numero: Math.max(1, sem - semana(primera) + 1), titular, sub, haceUnAnio: haceAnio, clasificados, pronostico,
    altitud: altitud(R.sats, esc), sats: R.sats, valor: R.valor ?? null };
}
export const textoDiario = (d) => `El Diario del Libro, edición del ${d.edicion}. ${d.titular}. ${d.sub}`;

// ---------------------------------------------------------------------------------------------
// Campamento 15B · la apacheta (piedritas), los cumpleaños y la tele: solo datos y textos. Todo acompaña; nada presiona.
// ---------------------------------------------------------------------------------------------

/** Las piedritas agrupadas por compra: Map(compra_id → [{ quien, creado }]), en el orden en que se dejaron. */
export function piedritasPorCompra(piedritas) {
  const m = new Map();
  for (const p of piedritas ?? []) m.set(p.compra_id, [...(m.get(p.compra_id) ?? []), { quien: p.quien, creado: p.creado }]);
  return m;
}
/** «Mamá dejó una piedrita», «Mamá y Papá dejaron una piedrita», «Mamá, Papá y 1 más dejaron una piedrita». */
export function textoPiedritas(lista) {
  const n = lista?.length ?? 0;
  if (!n) return '';
  const q = lista.map((x) => x.quien);
  if (n === 1) return `${q[0]} dejó una piedrita`;
  if (n === 2) return `${q[0]} y ${q[1]} dejaron una piedrita`;
  return `${q[0]}, ${q[1]} y ${n - 2} ${n === 3 ? 'más' : 'más'} dejaron una piedrita`;
}
/** La piedrita más reciente sobre una compra vigente: { quien, fecha (de la compra), creado }, o null. */
export function ultimaPiedrita(piedritas, compras) {
  const fechas = new Map((compras ?? []).filter((c) => c.tipo !== 'venta').map((c) => [c.id, c.fecha]));
  const p = [...(piedritas ?? [])].filter((x) => fechas.has(x.compra_id)).sort((a, b) => b.creado - a.creado)[0];
  return p ? { quien: p.quien, fecha: fechas.get(p.compra_id), creado: p.creado } : null;
}

/** ¿Quién cumple años hoy? `cumples`: [{ nombre, cumple: 'MM-DD' }]. El 29 de febrero se celebra el 28 en los años sin 29. */
export function cumpleHoy(cumples, hoy = hoyISO()) {
  const [y, m, d] = hoy.split('-').map(Number);
  const bisiesto = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const md = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return (cumples ?? []).filter((c) => c.cumple === md || (c.cumple === '02-29' && !bisiesto && md === '02-28'))
    .map((c) => ({ nombre: c.nombre, inicial: [...c.nombre.trim()][0]?.toUpperCase() ?? '?' }));
}
export const textoCumple = (nombre) => `Feliz cumpleaños, ${nombre}`;
/** «14 mar» para el botón de «Tu cuenta». */
export function textoCumpleFecha(cumple) {
  if (!cumple) return '';
  const [m, d] = cumple.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}

/**
 * El sismógrafo de la tele (idea 55): la tira de papel con el precio en vivo de las últimas horas. `muestras` = [{ t (ms), p }], de la más
 * vieja a la más nueva. Devuelve los puntos ya en 0–1 (x: tiempo dentro de la ventana; y: precio entre el mínimo y el máximo de la tira,
 * 1 arriba), con a lo más `max` puntos. Solo muestra lo que pasó: nunca predice. A medianoche de El Salvador la tira se arranca
 * (`desdeMedianoche`).
 */
export function muestrasSismo(muestras, ahoraMs, { ventanaMs = 6 * 3600e3, max = 240, desdeMs = 0 } = {}) {
  const desde = Math.max(ahoraMs - ventanaMs, desdeMs);
  let m = (muestras ?? []).filter((x) => x.t >= desde && x.t <= ahoraMs && x.p > 0);
  if (m.length > max) { const paso = m.length / max; m = Array.from({ length: max }, (_, i) => m[Math.floor(i * paso)]).concat(m.at(-1)); }
  if (!m.length) return { puntos: [], min: null, max: null, ultima: null };
  const lo = Math.min(...m.map((x) => x.p)), hi = Math.max(...m.map((x) => x.p));
  const ancho = Math.max(1, ahoraMs - desde);
  return { puntos: m.map((x) => ({ x: (x.t - desde) / ancho, y: hi > lo ? (x.p - lo) / (hi - lo) : 0.5, p: x.p })), min: lo, max: hi, ultima: m.at(-1).p };
}
/** Medianoche de El Salvador (UTC−6, sin horario de verano) más reciente, en ms. */
export function medianocheSV(ahoraMs) {
  const SV = 6 * 3600e3;
  return Math.floor((ahoraMs - SV) / 864e5) * 864e5 + SV;
}

/** Lo que dice la tele cuando se anota una compra (idea 5): `antes`/`despues` son los saldos; `sats` lo que se compró. */
export function tarjetaFiesta(antes, despues, sats) {
  const m = etapasCruzadas(antes, despues).at(-1);
  if (m) {
    const grande = m >= 1e6 && Math.abs(Math.log10(m) - Math.round(Math.log10(m))) < 1e-9;
    return { titulo: grande ? 'Nuevo hito' : 'Nueva etapa', texto: m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`, sub: `+${entero(sats)} sats`, grande };
  }
  return { titulo: 'Compra nueva', texto: `+${entero(sats)} sats`, sub: 'La montaña sube un paso más', grande: false };
}

// ---------------------------------------------------------------------------------------------
// Campamento 18 · El ritual de anotar: la fecha escrita, la nota de la semana que vuelve al año y el comprobante de cada movimiento.
// ---------------------------------------------------------------------------------------------

const dfEscrita = new Intl.DateTimeFormat('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
/** La fecha escrita como aquí: «domingo 15 de noviembre»; si no es de este año, «sábado 15 de noviembre de 2025». */
export function fechaEscrita(f, hoy = hoyISO()) {
  const p = Object.fromEntries(dfEscrita.formatToParts(aFecha(f)).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} de ${p.month}${f.slice(0, 4) === hoy.slice(0, 4) ? '' : ` de ${p.year}`}`;
}
/** Qué botón de la fecha le toca a un día: 'hoy', 'ayer' u 'otro'. */
export const diaDe = (f, hoy = hoyISO()) => (f === hoy ? 'hoy' : f === sumarDias(hoy, -1) ? 'ayer' : 'otro');
