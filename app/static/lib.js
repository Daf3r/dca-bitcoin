// Cálculos y formatos sin DOM.

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
export const compacto = (n) => nfComp.format(n);
export const btc = (sats) => (sats / 1e8).toFixed(8);
export const hora = (ts) => dfHora.format(new Date(ts));

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
 * Qué campamentos dibujar. La cumbre es la siguiente meta, nunca menos de 1 BTC.
 * Con poco sitio se priorizan cumbre, siguiente meta y último hito alcanzado.
 */
export function escalaMontana(sats, maxCampos = 4) {
  const sig = metaSiguiente(sats);
  const cima = Math.max(1e8, sig);
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
  const d = fechas.slice(1).map((f, i) => (aFecha(f) - aFecha(fechas[i])) / 864e5).sort((a, b) => a - b);
  return d[d.length >> 1] >= 10 ? 2 : 1;
}

// ------------------------------------------------------------- constancia
// Hitos de constancia: cuántas compras llevas y cuánto tiempo desde la primera. Premian no fallar.
export const HITOS_COMPRAS = [10, 25, 50, 100, 200, 300, 500, 750, 1000];
export const HITOS_MESES = [6, 12, 24, 36, 60, 120];
export const nombreHitoMeses = (m) => (m < 12 ? `${m} meses` : m === 12 ? '1 año' : `${m / 12} años`);

const soloCompras = (compras) => compras.filter((c) => c.tipo !== 'venta');
function medidasConstancia(compras) {
  const f = soloCompras(compras).map((c) => c.fecha).sort();
  return { n: f.length, primera: f[0] ?? null, meses: f.length ? mesesEntre(f[0], f[f.length - 1]) : 0 };
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
export function costoTrasCompra(R, monto, sats) {
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
  if (s < 5) return 'ahora mismo';
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

/** Todo lo que muestran la cabecera y los reportes, sin tocar el DOM. */
export function resumen(compras, precio, hoy = hoyISO()) {
  // Movimientos: compras (suman sats) y ventas o gastos (restan). Mismo orden que el servidor: por fecha y,
  // dentro del mismo día, las compras antes que las ventas.
  const orden = [...compras].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.tipo === 'venta') - (b.tipo === 'venta') || a.id - b.id));
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

  const porSemana = new Map();
  for (const c of comprasItems) porSemana.set(semana(c.fecha), (porSemana.get(semana(c.fecha)) ?? 0) + c.monto);
  // Semana = lunes a domingo en hora local. La semana en curso sin compra aún no rompe
  // la racha (le quedan días): entonces la referencia es la semana anterior, y la ventana
  // de 52 semanas termina en esa misma referencia para que ambas cuenten lo mismo.
  const actual = semana(hoy);
  const enCurso = porSemana.has(actual);
  const ref = enCurso ? actual : actual - 1;
  // Ritmo: cada semana o cada quincena (mediana de días entre tus últimas compras). Una racha es una
  // corrida de compras con no más de `paso` semanas entre una y otra; sigue viva mientras la última
  // compra no quede a más de `paso` semanas de hoy (la semana en curso aún no la rompe).
  const paso = pasoSemanas(comprasItems);
  let mejorRacha = 0, corrida = 0, previa = null;
  for (const s of [...porSemana.keys()].sort((a, b) => a - b)) {
    corrida = previa !== null && s - previa <= paso ? corrida + 1 : 1;
    mejorRacha = Math.max(mejorRacha, corrida);
    previa = s;
  }
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
    racha, mejorRacha, paso, venceSemanas, ultimas52, semanasConCompra: porSemana.size, semanaEnCurso: enCurso, semanasDesdePrimera,
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
  const paso = [1, 2, 5, 10].find((k) => k * mag >= raw) * mag;
  const ticks = [];
  for (let v = paso; v <= max * 0.97 + 1e-9; v += paso) ticks.push(Math.round(v * 100) / 100);
  return ticks;
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
