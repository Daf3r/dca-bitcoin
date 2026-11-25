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
/** Sats en forma corta: por encima de 1 BTC se habla en BTC («65.5 BTC»: «6.5B sats» es ambiguo en español). */
export const satsCorto = (s) => (s >= 1e8 ? `${s >= 1e10 ? entero(s / 1e8) : (s / 1e8).toFixed(1)} BTC` : `${compacto(s)} sats`);

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

// Hasta dos decimales y sin ceros de más: 2.5M, 1.25M, 2.25 BTC (las etapas cercanas del campamento 21 tienen cuartos).
const num = (n) => (Number.isInteger(n) ? entero(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
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

// Etapas (campamento 21, «etapas más cercanas»): además de los campamentos (potencias de 10, las banderas de la montaña), metas
// intermedias. Las «de siempre» (2.5 y 5 de cada potencia: 250k, 500k, 2.5M, 5M…) siguen, y cada tramo entre ellas se parte en pasos
// iguales: 100k, después cada 250k hasta 2.5M, cada 500k hasta 5M, cada 1M hasta 10M, y así ×10 (cada 2.5M hasta 25M, cada 5M hasta
// 50M, cada 10M hasta 1 BTC…). Solo depende de los sats: es la misma escalera para cualquiera. `app/ritmo.py` tiene la misma tabla.
const ETAPAS_INICIO = [1e5, 2.5e5, 5e5, 7.5e5];
// De cada potencia d ≥ 1M, en cuartos de d: 1, 1.25 … 2.25 (cada cuarto), 2.5 … 4.5 (cada medio) y 5 … 9 (cada entero).
const ETAPAS_CUARTOS = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36];
/** La escalera de etapas, de menor a mayor (hasta 10^16 sats: de sobra). */
function* escalera() {
  yield* ETAPAS_INICIO;
  for (let d = 1e6; d <= 1e15; d *= 10) for (const k of ETAPAS_CUARTOS) yield (d / 4) * k;
}
export function etapasHasta(tope) {
  const out = [];
  for (const m of escalera()) { if (m > tope) break; out.push(m); }
  return out;
}
export const etapaSiguiente = (sats) => { for (const m of escalera()) if (m > sats) return m; return Number.POSITIVE_INFINITY; };
/**
 * (Campamento 47, idea 188) ¿«Tú» va ya en el último tramo antes de la cima? Cuando la siguiente etapa es un campamento (la potencia de
 * 10 que es la cima): entre «Tú» y la meta ya no queda ninguna etapa. Desde las 100,000 (antes de la primera etapa no hay tramos).
 * @param {number} sats
 * @returns {boolean}
 */
export const ultimoTramo = (sats) => sats >= 1e5 && Number.isFinite(etapaSiguiente(sats)) && rangoEtapa(etapaSiguiente(sats)) === 'campamento';
export const etapaAnterior = (sats) => { let prev = 0; for (const m of escalera()) { if (m > sats) break; prev = m; } return prev; };
/** Etapas que se cruzan al subir de `desde` a `hasta` sats (vacío si no se sube). */
export const etapasCruzadas = (desde, hasta) => (hasta > desde ? etapasHasta(Math.max(hasta, 1e5)).filter((m) => m > desde && m <= hasta) : []);
/**
 * El rango de una etapa: `campamento` (potencia de 10: una bandera de la montaña), `principal` (las de siempre, 2.5 y 5 de cada potencia:
 * llevan sello de lacre) o `intermedia` (los pasos entre ellas: se celebran en ligero y no llevan sello).
 */
export function rangoEtapa(m) {
  if (!Number.isFinite(m)) return 'campamento';
  let d = 1e5;
  while (d * 10 <= m) d *= 10;
  if (m === d) return 'campamento';
  return m * 2 === d * 5 || m === d * 5 ? 'principal' : 'intermedia';
}
const PESO_RANGO = { intermedia: 0, principal: 1, campamento: 2 };
/** De varias etapas, la que se destaca: la de más rango (campamento, principal, intermedia) y, a igual rango, la más alta. */
export const etapaDestacada = (lista) => (lista ?? []).reduce((a, m) => (a == null || PESO_RANGO[rangoEtapa(m)] > PESO_RANGO[rangoEtapa(a)] || (rangoEtapa(m) === rangoEtapa(a) && m > a) ? m : a), undefined);
/** La etapa que celebra una subida de `antes` a `despues` (la destacada de las que cruzó), o undefined. */
export const etapaCelebrada = (antes, despues) => etapaDestacada(etapasCruzadas(antes, despues));
/** La última etapa con sello (principal o campamento) a la que llega `sats`, o 0. */
export const etapaConSelloAnterior = (sats) => etapasHasta(sats).filter((m) => rangoEtapa(m) !== 'intermedia').at(-1) ?? 0;
/**
 * El tramo en curso (campamento 21): de la última etapa con sello (`desde`, 0 al empezar) a la siguiente (`hasta`), con las etapas que lo
 * forman (`pasos`, la última es `hasta`) y cuántas ya alcanza el saldo (`hechas`). Es la escalerita de «Próxima etapa»: 1M → 2.5M en seis.
 */
export function tramoEtapas(sats) {
  const desde = etapaConSelloAnterior(sats), pasos = [];
  for (let m = etapaSiguiente(desde); Number.isFinite(m); m = etapaSiguiente(m)) { pasos.push(m); if (rangoEtapa(m) !== 'intermedia') break; }
  return { desde, hasta: pasos.at(-1), pasos, hechas: pasos.filter((m) => m <= sats).length };
}
/**
 * Qué marcas de etapa caben en el sendero (campamento 21; «Para el arte de la montaña» en CLAUDE.md). Con las etapas más juntas y la
 * escala logarítmica, arriba quedarían pegadas. `marcas` = [{ m, p: {x, y} }] (las etapas que no son campamento, en orden), `campos` =
 * [{ p }] (los campamentos, que se respetan). Se eligen por prioridad —la siguiente etapa siempre, luego las principales, luego las
 * intermedias de la más cercana al saldo a la más lejana; las intermedias, solo por encima del último campamento alcanzado— y se
 * omite la que quede a menos de `min` px de otra ya elegida o a menos de
 * `minCampo` px de un campamento (en línea recta: el sendero zigzaguea, y dos marcas lejanas en el trazo pueden quedar pegadas en la
 * vuelta). Como mucho `tope`. Devuelve las elegidas en el orden de `marcas`.
 */
export function marcasDeEtapa(marcas, { sats = 0, campos = [], min = 18, minCampo = 22, tope = 20 } = {}) {
  const sig = etapaSiguiente(sats);
  // Las intermedias solo en el tramo que se está subiendo (desde el último campamento alcanzado): lo de abajo queda como antes.
  let piso = 0;
  for (let d = 1e5; d <= sats; d *= 10) piso = d;
  marcas = marcas.filter((e) => rangoEtapa(e.m) !== 'intermedia' || e.m > piso);
  const peso = (e) => (e.m === sig ? 0 : rangoEtapa(e.m) === 'principal' ? 1 : 2);
  const lejos = (e) => Math.abs(Math.log(e.m / Math.max(1, sats)));
  const orden = [...marcas].sort((a, b) => peso(a) - peso(b) || lejos(a) - lejos(b));
  const elegidas = new Set();
  const cerca = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) < d;
  for (const e of orden) {
    if (elegidas.size >= tope) break;
    if (e.m !== sig && ([...elegidas].some((o) => cerca(o.p, e.p, min)) || campos.some((c) => cerca(c.p, e.p, minCampo)))) continue;
    elegidas.add(e);
  }
  return marcas.filter((e) => elegidas.has(e));
}
/**
 * El camino «para leer» (reporte de etapas y «Tu historia»): los campamentos y las etapas principales siempre; de las intermedias, solo
 * las del tramo en curso (después de la última principal o campamento alcanzado) y las que aún faltan. Las demás se cuentan en `ocultas`.
 */
export function caminoParaLeer(camino) {
  const ultima = (camino ?? []).filter((h) => h.fecha && h.rango !== 'intermedia').at(-1)?.m ?? 0;
  const ver = (h) => h.rango !== 'intermedia' || !h.fecha || h.m > ultima;
  return { camino: (camino ?? []).filter(ver), ocultas: (camino ?? []).filter((h) => !ver(h)) };
}

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
 * Las etapas intermedias de tramos ya cerrados van juntas, un evento `pasos` por tramo (con `pasos`, `desde` y `hasta`), y
 * `etapasAgrupadas` dice cuántas son; las del tramo en curso son eventos `paso` sueltos (campamento 21).
 */
export function historia(R, hoy = hoyISO(), { maxExtras = 8, libro = false } = {}) {
  if (!R?.nCompras) return { eventos: [], extrasOcultas: 0, etapasAgrupadas: 0 };
  const ev = [];
  const compras = R.items.filter((c) => c.tipo !== 'venta');
  const p = compras[0];
  // `libro`: para quien solo mira se habla del libro, no de «ti» (campamento 20).
  ev.push({ fecha: p.fecha, clase: 'primera', orden: 0, titulo: libro ? 'La primera compra' : 'Tu primera compra', detalle: `${entero(p.sats)} sats${p.precio ? ` a ${usd0(p.precio)}` : ''}` });
  // Campamentos y etapas principales, cada una en su renglón; las intermedias del tramo en curso también (son lo más reciente) y las
  // de tramos ya terminados se juntan en un renglón plegable por tramo («5 etapas intermedias, entre 1M y 2.5M sats»; campamento 21).
  const { camino: leer, ocultas } = caminoParaLeer(R.camino);
  for (const h of leer) {
    if (!h.fecha) continue;
    const llego = `${libro ? 'El libro llegó' : 'Llegaste'} a ${metaTxt(h.m)}`;
    ev.push({ m: h.m, fecha: h.fecha, clase: h.mayor ? 'hito' : h.rango === 'intermedia' ? 'paso' : 'etapa', orden: 1, titulo: h.mayor ? `Campamento ${nombreHito(h.m)}` : llego, detalle: h.mayor ? llego : h.rango === 'intermedia' ? 'Etapa intermedia' : '' });
  }
  const tramos = new Map();
  for (const h of ocultas) {
    const desde = etapasHasta(h.m).filter((m) => rangoEtapa(m) !== 'intermedia').at(-1) ?? 0;
    if (!tramos.has(desde)) tramos.set(desde, []);
    tramos.get(desde).push({ m: h.m, fecha: h.fecha });
  }
  for (const [desde, pasos] of tramos) {
    let hasta = desde;
    do hasta = etapaSiguiente(hasta); while (rangoEtapa(hasta) === 'intermedia');
    ev.push({ m: pasos.at(-1).m, fecha: pasos.at(-1).fecha, clase: 'pasos', orden: 0.9, titulo: `${pasos.length} ${pasos.length === 1 ? 'etapa intermedia' : 'etapas intermedias'}`, detalle: `Entre ${nombreHito(desde)} y ${metaTxt(hasta)}`, pasos, desde, hasta });
  }
  for (const h of HITOS_COMPRAS) if (h <= compras.length) ev.push({ fecha: compras[h - 1].fecha, clase: 'constancia', orden: 2, titulo: `${h} compras`, detalle: 'Constancia' });
  for (const m of HITOS_MESES) {
    const f = sumarMeses(p.fecha, m);
    if (f <= hoy) ev.push({ fecha: f, clase: 'constancia', orden: 3, titulo: `${nombreHitoMeses(m)} comprando`, detalle: 'Constancia' });
  }
  if (R.mejorRacha >= 4 && R.mejorRachaDesde) {
    ev.push({ fecha: R.mejorRachaHasta, clase: 'racha', orden: 4, titulo: `${libro ? 'La mejor racha' : 'Tu mejor racha'}: ${R.mejorRacha} ${R.paso === 2 ? 'quincenas' : 'semanas'}`, detalle: `Del ${fechaCorta(R.mejorRachaDesde)} al ${fechaCorta(R.mejorRachaHasta)}` });
  }
  const extras = compras.filter((c) => c.extra).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  for (const c of extras.slice(0, maxExtras)) ev.push({ fecha: c.fecha, clase: 'extra', orden: 5, titulo: 'Compra extra en una caída', detalle: `${entero(c.sats)} sats${c.precio ? ` a ${usd0(c.precio)}` : ''}${c.nota ? ` · ${c.nota}` : ''}` });
  ev.push({ fecha: hoy, clase: 'hoy', orden: 9, titulo: 'Hoy', detalle: `${entero(R.sats)} sats${R.valor != null ? ` · valen ${usd(R.valor)}` : ''}` });
  ev.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.orden - b.orden));
  return { eventos: ev, extrasOcultas: Math.max(0, extras.length - maxExtras), etapasAgrupadas: ocultas.length };
}

/**
 * Medallas de constancia (idea 38): las que ya tienes (con su fecha) y, de cada tipo, la siguiente. No se muestran todas las
 * demás: es un reconocimiento por lo que ya hiciste, no una lista de pendientes.
 */
export function medallas(R, hoy = hoyISO()) {
  if (!R?.nCompras) return [];
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
 * Las ventas no se avisan (ya no pueden pasar del saldo). Al editar sin tocar los sats ni los dólares (o el precio, que los mueve) no
 * se avisa de lo atípico, para no insistir con lo ya guardado.
 */
export function avisosAlAnotar(compras, { tipo, sats, monto, fecha, editando = null, extra = false }) {
  // Una compra extra (por una caída) es grande a propósito y puede coincidir con la del día: no se avisa.
  if (tipo !== 'compra' || !(sats > 0) || extra) return [];
  const previa = editando != null ? compras.find((c) => c.id === editando) : null;
  const otras = compras.filter((c) => c.tipo === 'compra' && !c.extra && c.id !== editando); // las extra no son referencia
  const avisos = [];
  const igual = previa && previa.sats === sats && Math.abs((previa.monto ?? 0) - monto) < 0.005;
  if (monto > 0 && otras.length >= 4 && !igual) {
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

  // Camino que se enseña en «Etapas» y en «Tu historia»: las etapas hasta la siguiente (con su fecha si ya se cruzaron: la del primer
  // movimiento con el que el saldo llegó) y, más arriba, los hitos grandes que faltan hasta la cumbre. `mayor` = campamento (potencia de
  // 10); `rango` = campamento · principal · intermedia (`rangoEtapa`).
  const cima = Math.max(1e8, meta);
  const camino = [...new Set([...etapasHasta(etapa), ...hitosHasta(cima)])].sort((a, b) => a - b).map((m) => {
    const c = items.find((x) => x.satsAcum >= m);
    return { m, mayor: hitosHasta(cima).includes(m), rango: rangoEtapa(m), fecha: c?.fecha ?? null, meses: c ? mesesEntre(items[0].fecha, c.fecha) : null };
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

/**
 * El precio de la compra, escrito por la persona: los dólares de `sats` a ese `precio` **sin redondear a centavos** (a 8 decimales, lo
 * que guarda el servidor). El servidor deriva el precio al guardar (`monto × 10⁸ / sats`): así sale el que se escribió. Con 77,320 sats
 * a $62,500 son $48.325 (se ven $48.33) y el comprobante dice $62,500; redondeados a centavos ($48.33) diría $62,506. Lo que se pierde
 * es como mucho 1/sats dólares del precio (con 1 sat, ±$1).
 * @param {number} sats
 * @param {number} precio
 */
export const montoDePrecio = (sats, precio) => Math.round(sats * precio) / 1e8;
/** El precio de BTC que sale de unos dólares y unos sats: lo mismo que deriva el servidor al guardar. */
export const precioDeMonto = (/** @type {number} */ monto, /** @type {number} */ sats) => (sats > 0 ? (monto * 1e8) / sats : 0);
/** El tope del servidor para el precio y para los dólares de un movimiento (`_num`: menos de mil millones). */
export const TOPE_DINERO = 1e9;
/**
 * El precio de BTC tal como lo escribe una persona: «$62,500», «62500.50», «62 500» o «62500,5» (la coma decimal de un teclado en
 * otro idioma). Se quitan «$» y los espacios; con punto, las comas son de miles; sin punto, una sola coma seguida de una o dos cifras es
 * la decimal y si no, son de miles. Hasta 9 cifras y 2 decimales (el servidor no acepta mil millones). Devuelve el número, 0 si está
 * vacío y NaN si no se entiende o es cero: «62.500» (tres decimales) podría ser 62,500 a la europea, así que no se adivina.
 * @param {unknown} texto
 * @returns {number}
 */
export function leerPrecio(texto) {
  let t = String(texto ?? '').replace(/[$\s ]/g, '');
  if (!t) return 0;
  t = !t.includes('.') && /^\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  if (!/^(\d{1,9}(\.\d{0,2})?|\.\d{1,2})$/.test(t)) return Number.NaN;
  const p = Number(t);
  return p > 0 ? p : Number.NaN;
}
const nfPrecio = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfCampo = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
/** El precio para su campo de la hoja: con comas de miles y sin «.00» («62,500»; «62,506.47»). */
export const precioCampo = (/** @type {number} */ p) => nfPrecio.format(p).replace(/\.00$/, '');
/** Los dólares para su campo de la hoja: dos decimales y sin comas, que el campo de dólares no acepta («48.33»). */
export const montoCampo = (/** @type {number} */ m) => nfCampo.format(m);

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
  return sinAcentos([m.nota, m.fecha, mes, mes.slice(0, 3), PALABRA_TIPO[m.tipo], m.extra ? 'extra' : '', (m.etiquetas ?? []).join(' '), m.sats, m.monto != null ? montoCampo(m.monto) : '', m.txid].join(' '));
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

/**
 * (Campamento 48) Lo que «Tú» lleva por lo ya alcanzado (nunca por lo que falta): el equipo según el campamento más alto al que llegó
 * el saldo (40: la cuerda desde 1M, el piolet desde 10M; una venta no lo quita), un parche por medalla de constancia ganada (195), la
 * flor del aniversario del primer día (197) y, solo a quien anota, su tecomate el día que hay una compra anotada con la fecha de hoy
 * (196: una venta o un traslado no cuentan; un día sin compra no enseña nada distinto).
 * @param {{ sats?: number, items?: Array<{ tipo?: string, fecha: string, satsAcum?: number }>, nCompras?: number } | null | undefined} R
 * @param {string} [hoy]
 * @param {{ libro?: boolean }} [opc]
 * @returns {{ equipo: number, parches: number, flor: boolean, tecomate: boolean }}
 */
export function llevaTu(R, hoy = hoyISO(), { libro = false } = {}) {
  const items = R?.items ?? [];
  const pico = items.reduce((m, c) => Math.max(m, c.satsAcum ?? 0), R?.sats ?? 0);
  return {
    equipo: pico >= 1e7 ? 2 : pico >= 1e6 ? 1 : 0,
    parches: medallas(R, hoy).filter((m) => m.ganada).length,
    flor: Boolean(aniversario(items, hoy)),
    tecomate: !libro && items.some((c) => c.tipo !== 'venta' && c.fecha === hoy),
  };
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
 * (Campamento 57) Más de la mitad: la marca de «compra extra» de una pieza que junta varias compras. Con muchas extras, marcar «alguna
 * fue extra» lo marcaría todo y dejaría de decir nada; los textos siguen contando la cifra real.
 */
export const mayoriaExtra = (nExtra, n) => nExtra * 2 > n;

/** (Campamento 58) Hasta cuántas compras la constelación lleva una estrella por compra; con más, una por semana. */
export const ESTRELLAS_POR_COMPRA = 600;
/**
 * La constelación: una estrella por compra, en una espiral de girasol (ángulo áureo) para que el dibujo crezca hacia afuera con los
 * años. `x` e `y` van de 0 a 1 (dentro del círculo unidad); `mag` (0.15 a 1) es el brillo según sus sats frente a la mediana. La
 * escala es `sqrt(max(n, minEscala))`: con pocas compras la espiral ocupa poco y se va abriendo; pasadas `minEscala`, todo se ajusta.
 * (Campamento 58) Con más de `max` compras, una estrella por semana con compras (de lunes a domingo, como la manta): `n` y `nExtra`
 * cuentan las suyas, `extra` va por mayoría y `semanal` lo dice; `desde` y `hasta` son su semana (o su día, con una por compra).
 */
export function estrellasConstelacion(items, minEscala = 120, max = ESTRELLAS_POR_COMPRA) {
  const compras = items.filter((c) => c.tipo !== 'venta').sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  if (!compras.length) return [];
  const semanal = compras.length > max;
  /** @type {{ fecha: string, desde: string, hasta: string, sats: number, n: number, nExtra: number }[]} */
  let unidades = compras.map((c) => ({ fecha: c.fecha, desde: c.fecha, hasta: c.fecha, sats: c.sats, n: 1, nExtra: c.extra ? 1 : 0 }));
  if (semanal) {
    const por = new Map();
    for (const c of compras) {
      const s = semana(c.fecha);
      const u = por.get(s) ?? { fecha: c.fecha, desde: diaDeSemana(s, 0), hasta: diaDeSemana(s, 6), sats: 0, n: 0, nExtra: 0 };
      u.sats += c.sats; u.n++; if (c.extra) u.nExtra++;
      por.set(s, u);
    }
    unidades = [...por.values()];
  }
  const n = unidades.length;
  const esc = Math.sqrt(Math.max(n, minEscala));
  const orden = unidades.map((c) => c.sats).sort((a, b) => a - b);
  const mediana = orden[Math.floor(orden.length / 2)] || 1;
  return unidades.map((c, i) => {
    const r = Math.sqrt(i + 0.5) / esc, a = i * ANGULO_AUREO;
    return { i, fecha: c.fecha, desde: c.desde, hasta: c.hasta, anio: Number(c.fecha.slice(0, 4)), sats: c.sats, n: c.n, nExtra: c.nExtra, extra: mayoriaExtra(c.nExtra, c.n), semanal,
      x: 0.5 + 0.5 * r * Math.cos(a), y: 0.5 + 0.5 * r * Math.sin(a), mag: Math.min(1, Math.max(0.15, Math.sqrt(c.sats / mediana) / 2)) };
  });
}
/** Lo que se lee al tocar una estrella: su compra o, con una por semana, su semana. */
export function textoEstrella(s) {
  if (!s.semanal) return `${fechaLarga(s.fecha)} · +${entero(s.sats)} sats${s.extra ? ' · compra extra' : ''}`;
  return `Semana del ${nombreSemana(s.desde, s.hasta)} · ${s.n} ${s.n === 1 ? 'compra' : 'compras'}${s.nExtra ? ` (${s.nExtra} extra)` : ''} · +${entero(s.sats)} sats`;
}

/**
 * La torre de piedras: una piedra por compra, de la más vieja (abajo) a la más nueva (arriba). Con más de `max` compras cada piedra junta varias
 * seguidas (`n`), como en el bosque. `tam` (0.35 a 1) es su tamaño según los sats frente a la piedra más grande. `extra` dice si alguna fue
 * extra y `nExtra` cuántas (campamento 57: la veta de cobre se enciende según la proporción).
 */
export function piedrasTorre(items, max = 40) {
  const compras = items.filter((c) => c.tipo !== 'venta').sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  if (!compras.length) return [];
  const por = Math.ceil(compras.length / max);
  const piedras = [];
  for (let k = 0; k < compras.length; k += por) {
    const g = compras.slice(k, k + por);
    const nExtra = g.filter((c) => c.extra).length;
    piedras.push({ i: piedras.length, desde: g[0].fecha, hasta: g.at(-1).fecha, n: g.length, sats: g.reduce((a, c) => a + c.sats, 0), extra: nExtra > 0, nExtra, tam: 0 });
  }
  const mayor = Math.max(...piedras.map((p) => p.sats)) || 1;
  for (const p of piedras) p.tam = Math.min(1, Math.max(0.35, p.sats / mayor));
  return piedras;
}

/** Los textos que leen los lectores de pantalla (y los lectores de la familia) para cada dibujo. */
export function textoTronco(anios, libro = false) {
  if (!anios.length) return libro ? 'El tronco del libro empieza con su primera compra.' : 'Tu tronco empieza con tu primera compra.';
  const mejor = anios.reduce((m, y) => (y.comprados > m.comprados ? y : m), anios[0]);
  const extras = anios.reduce((a, y) => a + y.nExtras, 0);
  // (Campamento 57) El dibujo lleva un nudo por mes con compras extra (como mucho doce por anillo): si son menos que las compras
  // extra, el texto dice las dos cifras.
  const nudos = anios.reduce((a, y) => a + new Set(y.extras.map((e) => Math.min(11, Math.floor(e.frac * 12)))).size, 0);
  const txt = !extras ? '' : nudos === extras ? ` Hay ${nudos} ${nudos === 1 ? 'nudo' : 'nudos'}: las compras extra.`
    : ` Hay ${entero(nudos)} ${nudos === 1 ? 'nudo' : 'nudos'}, uno por cada mes con compras extra (${entero(extras)} en total).`;
  return `${libro ? 'El tronco del libro' : 'Tu tronco'} tiene ${anios.length} ${anios.length === 1 ? 'anillo' : 'anillos'}, uno por año, de ${anios[0].anio} a ${anios.at(-1).anio}. `
    + `El más ancho es ${mejor.anio}, con ${entero(mejor.comprados)} sats.${txt}`;
}
export function textoConstelacion(estrellas, libro = false) {
  if (!estrellas.length) return libro ? 'La constelación del libro empieza con su primera compra.' : 'Tu constelación empieza con tu primera compra.';
  const ult = estrellas.at(-1);
  if (ult.semanal) {
    const n = estrellas.reduce((a, e) => a + e.n, 0);
    return `${libro ? 'La constelación del libro' : 'Tu constelación'} tiene ${entero(estrellas.length)} estrellas, una por semana con compras (${entero(n)} compras). La más reciente es la semana del ${nombreSemana(ult.desde, ult.hasta)}.`;
  }
  return `${libro ? 'La constelación del libro' : 'Tu constelación'} tiene ${estrellas.length} ${estrellas.length === 1 ? 'estrella' : 'estrellas'}, una por compra. La más reciente es la del ${fechaLarga(ult.fecha)}.`;
}
export function textoTorre(piedras, libro = false) {
  if (!piedras.length) return libro ? 'La torre de piedras del libro empieza con su primera compra.' : 'Tu torre de piedras empieza con tu primera compra.';
  const n = piedras.reduce((a, p) => a + p.n, 0);
  const junta = piedras.some((p) => p.n > 1);
  return `${libro ? 'La torre de piedras del libro' : 'Tu torre de piedras'} tiene ${piedras.length} ${piedras.length === 1 ? 'piedra' : 'piedras'}${junta ? `, que juntan ${n} compras` : ', una por compra'}; las más grandes son las de más sats.`;
}
/** Una piedra de la torre, para leerla al tocarla. */
export function textoPiedra(s) {
  const extra = !s.nExtra ? '' : s.n === 1 ? ' · compra extra' : ` · ${s.nExtra} extra`;
  return `${s.n === 1 ? fechaLarga(s.desde) : `${fechaLarga(s.desde)} a ${fechaLarga(s.hasta)}`} · ${s.n} ${s.n === 1 ? 'compra' : 'compras'} · +${entero(s.sats)} sats${extra}`;
}
/** Resumen de un año del tronco, para leerlo al tocar su anillo. */
export function textoAnio(y, libro = false) {
  const partes = [`${y.anio}${y.completo ? '' : ' (en curso)'}: ${y.nCompras} ${y.nCompras === 1 ? 'compra' : 'compras'}`];
  if (y.comprados) partes.push(`+${entero(y.comprados)} sats`);
  if (y.nExtras) partes.push(`${y.nExtras} extra`);
  if (y.nVentas) partes.push(`${y.nVentas} ${y.nVentas === 1 ? 'venta' : 'ventas'} (−${entero(y.vendidos)} sats)`);
  partes.push(libro ? `${y.completo ? 'cerró con' : 'hoy tiene'} ${entero(y.saldoFin)} sats` : `${y.completo ? 'cerraste' : 'tienes'} ${entero(y.saldoFin)} sats`);
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
 * (`extra`; `nExtra`, cuántas: la puntada se borda solo si son más de la mitad, campamento 57) y su `tono` de añil (0 = semana sin compras, algodón crudo; 1 a 4 = de más claro a más oscuro, por cuartiles de las semanas con
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
    const o = porSemana.get(s) ?? { sats: 0, n: 0, extra: false, nExtra: 0 };
    o.sats += c.sats; o.n++; if (c.extra) { o.extra = true; o.nExtra++; }
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
      const celda = { idx, col: colDe(idx), desde: diaDeSemana(idx, 0), hasta: diaDeSemana(idx, 6), sats: o?.sats ?? 0, n: o?.n ?? 0, extra: Boolean(o?.extra), nExtra: o?.nExtra ?? 0, tono: tonoDe(o?.sats ?? 0), antes: idx < primera, futura: idx > actual, anio: a };
      semanas.push(celda);
      if (!celda.antes && !celda.futura) { celdas.push(celda); satsAnio += celda.sats; nAnio += celda.n; if (celda.n) conCompra++; }
    }
    anios.push({ anio: a, semanas, sats: satsAnio, nCompras: nAnio, semanasConCompra: conCompra, enCurso: a === a1 });
  }
  return { anios, celdas, semanasConCompra: celdas.filter((c) => c.n).length };
}

/** Lo que dice la manta en total, para los lectores de pantalla. */
export function textoManta(m, libro = false) {
  if (!m.celdas.length) return libro ? 'La manta del libro empieza con su primera compra.' : 'Tu manta empieza con tu primera compra.';
  const a = m.anios;
  return `${libro ? 'La manta del libro' : 'Tu manta'} tiene ${a.length} ${a.length === 1 ? 'fila' : 'filas'}, una por año, de ${a[0].anio} a ${a.at(-1).anio}, y ${m.celdas.length} semanas tejidas, `
    + `${m.semanasConCompra} con compra. Cuanto más oscuro el añil, más sats esa semana; el algodón crudo es una semana sin compras.`;
}
/** Una semana de la manta, para leerla al tocarla. */
export function textoSemanaManta(c) {
  const rango = `${fechaLarga(c.desde)} al ${fechaLarga(c.hasta)}`;
  if (!c.n) return `Semana del ${rango}: sin compras.`;
  const extra = !c.extra ? '' : (c.nExtra ?? 1) <= 1 ? ', con una compra extra' : `, ${c.nExtra} de ellas extra`;
  return `Semana del ${rango}: ${c.n} ${c.n === 1 ? 'compra' : 'compras'}, +${entero(c.sats)} sats${extra}.`;
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
export function datosCertificado(R, nombre, hoy = hoyISO(), { montana = null } = {}) {
  const sats = Math.max(0, R.sats ?? 0);
  const letras = enLetras(sats);
  const esc = escalaMontana(sats);
  return {
    nombre: nombre || null, montana: montana || null, hoy, fecha: fechaLarga(hoy), sats, btc: btc(sats),
    letras: `${letras.charAt(0).toUpperCase()}${letras.slice(1)} ${sats === 1 ? 'sat' : 'sats'}`,
    nCompras: R.nCompras ?? 0, racha: R.racha ?? 0, primera: R.items?.find((c) => c.tipo !== 'venta')?.fecha ?? null,
    lobulos: Math.min(48, Math.max(3, R.nCompras ?? 0)), altitud: altitud(sats, esc), trenzas: Math.min(12, Math.max(1, R.racha ?? 1)),
  };
}
export const textoCertificado = (d) => `Certificado de altitud${d.nombre ? ` de ${d.nombre}` : ' del Libro DCA'}${d.montana ? `, en la montaña «${d.montana}»` : ''}. A ${d.fecha} el libro tiene ${d.letras}`
  + `${d.nCompras ? `, de ${d.nCompras} ${d.nCompras === 1 ? 'compra' : 'compras'}` : ''}.`;

/**
 * Los sellos de lacre: uno por cada campamento y etapa principal que ya cruzaste (con su fecha); nunca los que faltan. Las etapas
 * intermedias (campamento 21) no llevan sello: así cada sello sigue valiendo lo que costó. `nombre` es la cifra del sello.
 */
export function sellos(R) {
  return (R.camino ?? []).filter((h) => h.fecha && rangoEtapa(h.m) !== 'intermedia').map((h) => ({ m: h.m, nombre: nombreHito(h.m), grande: Boolean(h.mayor), fecha: h.fecha }));
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
export function textoEstratos(e, libro = false) {
  if (!e.length) return libro ? 'Los estratos del libro empiezan con su primera compra.' : 'Tus estratos empiezan con tu primera compra.';
  const con = e.filter((x) => x.nCompras).length;
  return `${libro ? 'Los estratos del libro' : 'Tus estratos'} tienen ${e.length} ${e.length === 1 ? 'capa' : 'capas'}, una por mes, de ${e[0].nombre} a ${e.at(-1).nombre}; ${con} con compras. `
    + 'Cuanto más gruesa la capa, más sats ese mes; las vetas de cuarzo son compras extra y lo desgastado, ventas o gastos.';
}
/** Un mes de los estratos, para leerlo al tocarlo. */
export function textoEstrato(e, libro = false) {
  const partes = [`${e.nombre}${e.enCurso ? ' (en curso)' : ''}: ${e.nCompras ? `${e.nCompras} ${e.nCompras === 1 ? 'compra' : 'compras'}, +${entero(e.comprados)} sats` : 'sin compras'}`];
  if (e.nExtras) partes.push(`${e.nExtras} extra (+${entero(e.satsExtra)} sats)`);
  if (e.nVentas) partes.push(`${e.nVentas} ${e.nVentas === 1 ? 'venta' : 'ventas'} (−${entero(e.vendidos)} sats)`);
  partes.push(libro ? `${e.enCurso ? 'hoy tiene' : 'cerró con'} ${entero(e.saldoFin)} sats` : `${e.enCurso ? 'tienes' : 'cerraste con'} ${entero(e.saldoFin)} sats`);
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
export const textoSelloSemana = (s, libro = false) => `Sello n.º ${s.numero}: semana del ${s.nombre}, ${s.n} ${s.n === 1 ? 'compra' : 'compras'}, +${entero(s.sats)} sats; al cerrar la semana ${libro ? 'el libro tenía' : 'tenías'} ${entero(s.saldo)} sats`;
export const textoPasaporte = (ss, libro = false) => (ss.length
  ? (libro ? `El pasaporte del libro tiene ${ss.length} ${ss.length === 1 ? 'sello' : 'sellos'}, uno por cada semana con compras.` : `Tu pasaporte tiene ${ss.length} ${ss.length === 1 ? 'sello' : 'sellos'}, uno por cada semana en que compraste.`)
  : libro ? 'El pasaporte del libro empieza con su primera compra.' : 'Tu pasaporte empieza con tu primera compra.');

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
export const textoPartitura = (anios, libro = false, max = NOTAS_POR_DIA) => (anios.length
  ? `${libro ? 'La partitura del libro' : 'Tu partitura'} tiene ${anios.length} ${anios.length === 1 ? 'pauta' : 'pautas'}, una por año, y una nota por compra`
    + `${anios.some((a) => a.notas.length > max) ? ' (en un año de muchas compras, una figura por semana)' : ''}: cuanto más caro estaba BTC ese día, más aguda la nota.`
  : libro ? 'La partitura del libro empieza con su primera compra.' : 'Tu partitura empieza con tu primera compra.');
/**
 * Un año de la partitura, en palabras; con `fig` (de `figurasPartitura`), dice también si va por semanas.
 * @param {{ anio: number, notas: unknown[], min: number, max: number }} y
 * @param {boolean} [libro]
 * @param {{ modo: string, figuras: unknown[] } | null} [fig]
 */
export const textoAnioPartitura = (y, libro = false, fig = null) => `${y.anio}: ${entero(y.notas.length)} ${y.notas.length === 1 ? 'nota' : 'notas'}`
  + `${fig?.modo === 'semana' ? ` en ${fig.figuras.length} semanas` : ''}; BTC entre $${entero(y.min)} y $${entero(y.max)} en ${libro ? 'las compras' : 'tus compras'}`;
export const textoNota = (n) => `${fechaLarga(n.fecha)} · BTC a $${entero(n.precio)} · +${entero(n.sats)} sats${n.extra ? ' · compra extra' : ''}`;

/** (Campamento 57) Hasta cuántas notas un año de la partitura va por días de compra; con más, por semanas. */
export const NOTAS_POR_DIA = 60;
/**
 * Una figura de la partitura: lo que junta (un día, una semana o un mes) con su cantidad (`n`), sus extra (`nExtra`; `extra` por
 * mayoría), su nota (`paso`, la mediana baja: la que suena), su rango (`pasoMin`, `pasoMax`, y los precios `min` y `max`), sus `sats`,
 * su mes (0 a 11, el del primer día), su lugar (`col`) y sus notas. Con una sola compra trae también `fecha` y `precio`: se lee como una nota.
 * @param {{ fecha: string, precio: number, sats: number, extra: boolean, paso: number }[]} g
 * @param {number} i
 * @param {number} col
 * @param {'dia' | 'semana' | 'mes'} tipo
 * @param {number} anio
 * @param {string} desde
 * @param {string} hasta
 */
function figuraDe(g, i, col, tipo, anio, desde, hasta) {
  const pasos = g.map((x) => x.paso).sort((a, b) => a - b), precios = g.map((x) => x.precio);
  const nExtra = g.filter((x) => x.extra).length;
  /** @type {Record<string, any>} */
  const f = { i, col, tipo, anio, desde, hasta, n: g.length, nExtra, extra: mayoriaExtra(nExtra, g.length), paso: pasos[Math.floor((pasos.length - 1) / 2)], pasoMin: pasos[0], pasoMax: pasos[pasos.length - 1],
    min: Math.min(...precios), max: Math.max(...precios), sats: g.reduce((a, x) => a + x.sats, 0), mes: Number(g[0].fecha.slice(5, 7)) - 1, notas: g };
  if (g.length === 1) { f.fecha = g[0].fecha; f.precio = g[0].precio; }
  return f;
}
/**
 * (Campamento 57) Las figuras de un año de la partitura (`y`, un elemento de `partitura`). Hasta `max` notas, una figura por día de
 * compra (`modo: 'dia'`: varias el mismo día son un acorde con su cantidad), repartidas por cantidad y no por calendario. Con más, una
 * por semana de lunes a domingo (`modo: 'semana'`, la misma semana que la manta y el pasaporte, cortada al año: como mucho 54), y su
 * `col` es su semana en el año (0 = la del 1 de enero). Nunca hay más figuras que semanas, por muchas compras que haya.
 * @param {{ anio: number, notas: { fecha: string, precio: number, sats: number, extra: boolean, paso: number }[] } | null | undefined} y
 */
export function figurasPartitura(y, max = NOTAS_POR_DIA) {
  const notas = y?.notas ?? [];
  const anio = y?.anio ?? 0;
  if (!notas.length) return { anio, modo: 'dia', figuras: [] };
  const modo = notas.length <= max ? 'dia' : 'semana';
  const s0 = semana(`${anio}-01-01`), ini = `${anio}-01-01`, fin = `${anio}-12-31`;
  /** @type {Map<string | number, typeof notas>} */
  const grupos = new Map();
  for (const nt of notas) { const k = modo === 'dia' ? nt.fecha : semana(nt.fecha); const g = grupos.get(k) ?? []; g.push(nt); grupos.set(k, g); }
  const figuras = [...grupos.entries()].map(([k, g], i) => {
    if (typeof k === 'string') return figuraDe(g, i, i, 'dia', anio, k, k);
    const d = diaDeSemana(k, 0), h = diaDeSemana(k, 6);
    return figuraDe(g, i, k - s0, 'semana', anio, d < ini ? ini : d, h > fin ? fin : h);
  });
  return { anio, modo, figuras };
}
/**
 * (Campamento 58) Todos los años de un vistazo: una pauta por año (`fila`) y una figura por mes con compras (`col` = el mes). `figuras`
 * es la lista plana, de la más vieja a la más nueva, para recorrerla con el teclado y tocarla.
 * @param {{ anio: number, notas: { fecha: string, precio: number, sats: number, extra: boolean, paso: number }[] }[]} anios
 */
export function figurasTodos(anios) {
  /** @type {Record<string, any>[]} */
  const figuras = [];
  anios.forEach((y, fila) => {
    /** @type {Map<number, typeof y.notas>} */
    const por = new Map();
    for (const nt of y.notas) { const m = Number(nt.fecha.slice(5, 7)) - 1; const g = por.get(m) ?? []; g.push(nt); por.set(m, g); }
    for (const [m, g] of por) figuras.push(Object.assign(figuraDe(g, figuras.length, m, 'mes', y.anio, `${y.anio}-${String(m + 1).padStart(2, '0')}-01`, g[g.length - 1].fecha), { fila }));
  });
  return { modo: 'todos', anios: anios.map((y) => y.anio), figuras };
}
/** Lo que se lee al tocar una figura: con una sola compra, su nota; si no, cuándo, cuántas (y cuántas extra), los sats y el rango de BTC. */
export function textoFigura(f) {
  if (f.n === 1 && f.fecha) return textoNota(f);
  const cuando = f.tipo === 'mes' ? `${MESES[f.mes]} ${f.anio}` : f.tipo === 'semana' ? `Semana del ${nombreSemana(f.desde, f.hasta)}` : fechaLarga(f.desde);
  const btc = f.min === f.max ? `BTC a $${entero(f.min)}` : `BTC entre $${entero(f.min)} y $${entero(f.max)}`;
  return `${cuando} · ${f.n} ${f.n === 1 ? 'compra' : 'compras'}${f.nExtra ? ` (${f.nExtra} extra)` : ''} · +${entero(f.sats)} sats · ${btc}`;
}
/** Todos los años, en palabras. */
export const textoTodos = (anios, libro = false) => {
  const n = anios.reduce((a, y) => a + y.notas.length, 0);
  return `De ${anios[0].anio} a ${anios[anios.length - 1].anio}: ${entero(n)} ${n === 1 ? 'nota' : 'notas'}, una figura por mes en ${libro ? 'las compras del libro' : 'tus compras'}`;
};

// ---------------------------------------------------------------------------------------------
// Campamento 15A · el Diario del Libro, mensajes en la bandera y cartas selladas: solo datos y textos (la pantalla vive en `diario.js`,
// `capsulas.js` y `mensajes.js`). Todo informa o acompaña; nada recomienda ni presiona.
// ---------------------------------------------------------------------------------------------

/** Cuándo se abre una carta sellada, en palabras (sin cuentas de lo que falta: no es una presión). */
export function textoApertura(c) {
  if (c.abre_fecha) return `Se abre el ${fechaLarga(c.abre_fecha)}`;
  return `Se abre al llegar a ${c.abre_sats >= 1e8 ? nombreHito(c.abre_sats) : `${nombreHito(c.abre_sats)} sats`}`;
}
/**
 * Las próximas etapas por encima de tu saldo (para elegir a cuál se abre una carta): las dos siguientes, sean del rango que sean, y
 * después solo principales y campamentos, para que una carta pueda esperar a 10M aunque las etapas ahora vayan más juntas.
 */
export function etapasFuturas(sats, n = 6) {
  const out = [];
  let m = etapaSiguiente(sats);
  while (out.length < n && Number.isFinite(m)) { if (out.length < 2 || rangoEtapa(m) !== 'intermedia') out.push(m); m = etapaSiguiente(m); }
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

/**
 * El titular del Diario sin cifras (campamento 19, idea 20): lo que dice el aviso del domingo. Una notificación se lee en la pantalla
 * bloqueada, así que no lleva saldos, montos ni etapas: solo de qué fue la semana. `app/ritmo.py` tiene la misma tabla (y la misma regla
 * para elegir la clase): `tests/test_api.py` compara las dos con `paridad_ritmo.mjs`. Si cambias una, cambia la otra.
 */
export const AVISO_DIARIO = {
  etapa: 'Llegamos a una nueva etapa',
  una: 'Un paso más en la montaña',
  varias: 'La montaña subió esta semana',
  tranquila: 'Semana tranquila en la montaña',
};

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
  if (!R?.nCompras) return null;
  const compras = R.items.filter((c) => c.tipo !== 'venta');
  const sem = semana(hoy);
  const desde = restarDias(hoy, 7), desdeEtapa = restarDias(hoy, 14);
  const recientes = compras.filter((c) => c.fecha > desde && c.fecha <= hoy);
  const subidos = recientes.reduce((a, c) => a + c.sats, 0);
  // Si en esos 14 días se cruzaron varias, el titular lleva la destacada (un campamento o una principal antes que una intermedia).
  const etapasRecientes = (R.camino ?? []).filter((h) => h.fecha && h.fecha > desdeEtapa && h.fecha <= hoy);
  const etapaReciente = etapasRecientes.find((h) => h.m === etapaDestacada(etapasRecientes.map((x) => x.m)));
  // `clase` dice de qué fue la semana (etapa · una · varias · tranquila): el aviso del domingo la usa sin cifras (`AVISO_DIARIO`).
  let titular, sub, clase;
  if (etapaReciente) { clase = 'etapa'; titular = `Llegamos a ${metaTxt(etapaReciente.m)}`; sub = `La montaña ya cuenta ${entero(R.sats)} sats. El ${fechaLarga(etapaReciente.fecha)} quedó marcado en el sendero.`; }
  else if (recientes.length) {
    clase = recientes.length === 1 ? 'una' : 'varias';
    titular = recientes.length === 1 ? `Un paso más: la montaña subió ${entero(subidos)} sats` : `La montaña subió ${entero(subidos)} sats esta semana`;
    sub = `${recientes.length === 1 ? 'Una compra' : `${recientes.length} compras`} en los últimos siete días. El libro suma ${entero(R.sats)} sats.`;
  } else { clase = 'tranquila'; titular = 'Semana tranquila en la montaña'; sub = `Nadie se apura: el camino sigue ahí, ${entero(R.sats)} sats arriba, esperando con paciencia.`; }
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
  // (Campamento 23) Tal día como hoy: el campamento o la etapa a la que el libro llegó un día como hoy, hace uno o más años (el más grande).
  const tal = talDiaComoHoy(R.camino, hoy, primera);
  return { fecha: hoy, edicion: fechaLarga(hoy), numero: Math.max(1, sem - semana(primera) + 1), titular, sub, clase, aviso: AVISO_DIARIO[clase], haceUnAnio: haceAnio, notaAnio: notaDeHaceUnAnio(R.items, hoy),
    talDia: tal ? { ...tal, texto: textoTalDia(tal) } : null, clasificados, pronostico,
    altitud: altitud(R.sats, esc), sats: R.sats, valor: R.valor ?? null };
}
export const textoDiario = (d) => `El Diario del Libro, edición del ${d.edicion}. ${d.titular}. ${d.sub}`;

// ---------------------------------------------------------------------------------------------
// Campamento 19 · la familia: el Diario en voz alta, el libro de cumbre y el nombre de la montaña. Solo datos y textos.
// ---------------------------------------------------------------------------------------------

const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** «15 de noviembre de 2026»: la fecha para decirla en voz alta (la abreviada, «15 nov», se leería «nov»). */
export function fechaHablada(f) {
  const [y, m, d] = f.split('-').map(Number);
  return `${d} de ${MESES_L[m - 1]} de ${y}`;
}
/**
 * Un texto de la app preparado para la voz del aparato (idea 33). Las cifras van sin comas (con voz en español «1,241,769» se leería
 * como un decimal), «2.5M» y «100k» se dicen enteros («2,5 millones», «100 mil»), «BTC» se dice «bitcoin», los avisos en mayúsculas de
 * los clasificados («SE BUSCAN») se escriben en minúsculas para que no se deletreen y el «·» es una pausa.
 */
export function paraOir(t) {
  return String(t ?? '')
    .replace(/n\.º/g, 'número')
    .replace(/\d{1,3}(?:,\d{3})+/g, (x) => x.replace(/,/g, ''))
    .replace(/\b(\d+(?:\.\d+)?)M\b( sats)?/g, (_, x, s) => `${x.replace('.', ',')} ${x === '1' ? 'millón' : 'millones'}${s ? ' de sats' : ''}`)
    .replace(/\b(\d+(?:\.\d+)?)k\b/g, (_, x) => `${x.replace('.', ',')} mil`)
    .replace(/\b(\d+(?:\.\d+)?) BTC\b/g, (_, x) => `${x.replace('.', ',')} bitcoin`)
    .replace(/\bBTC\b/g, 'bitcoin')
    .replace(/\b[A-ZÁÉÍÓÚÑ]{2,}\b/g, (w) => w.toLowerCase())
    .replace(/\s*·\s*/g, ', ')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
/**
 * El Diario dicho en voz alta (idea 33): la misma portada, en frases cortas (una voz larga de una sola vez se corta en algunos
 * navegadores). `montana` es el nombre que le puso quien anota, si tiene. Nada que no esté ya escrito en el Diario.
 */
export function diarioParaOir(d, { montana = null } = {}) {
  if (!d) return [];
  const partes = [`El Diario del Libro${montana ? `, desde la montaña ${montana}` : ''}. Edición del ${fechaHablada(d.fecha)}, número ${d.numero}.`, `${d.titular}.`, d.sub];
  if (d.haceUnAnio || d.notaAnio || d.talDia) {
    partes.push('Hace un año.');
    if (d.talDia) partes.push(d.talDia.texto);
    if (d.haceUnAnio) partes.push(d.haceUnAnio.texto);
    if (d.notaAnio) partes.push(`El ${fechaHablada(d.notaAnio.fecha)} quedó anotado: ${d.notaAnio.nota}`);
  }
  partes.push('Clasificados.', ...d.clasificados, 'Pronóstico de la montaña.', d.pronostico);
  return partes.map(paraOir).filter(Boolean).map((p) => (/[.!?:]$/.test(p) ? p : `${p}.`));
}

/** Las firmas del libro de cumbre de un campamento (idea 18), en el orden en que se firmaron. `firmas`: las de `GET /api/firmas`. */
export function firmasDe(firmas, hito) {
  return (firmas ?? []).filter((f) => f.hito === hito).sort((a, b) => a.creado - b.creado || a.id - b.id);
}
/** Quién firmó: «Firmó Ana», «Firmaste tú», «Firmaron tú y Ana», «Firmaron Ana, Papá y 2 más». Tu firma va primero (y no se pierde en «más»). */
export function textoFirmantes(fs) {
  const n = fs?.length ?? 0;
  if (!n) return 'Nadie ha firmado todavía';
  const nombres = [...fs].sort((a, b) => Number(Boolean(b.mia)) - Number(Boolean(a.mia))).map((f) => (f.mia ? 'tú' : f.quien));
  if (n === 1) return fs[0].mia ? 'Firmaste tú' : `Firmó ${nombres[0]}`;
  return `Firmaron ${n === 2 ? `${nombres[0]} y ${nombres[1]}` : n === 3 ? `${nombres[0]}, ${nombres[1]} y ${nombres[2]}` : `${nombres[0]}, ${nombres[1]} y ${n - 2} más`}`;
}
/** Lo que invita a hacer la tarjeta del campamento con su libro: firmar (si el libro llegó ahí), cambiar tu firma o solo leerlo. */
export function accionFirmas(fs, alcanzado) {
  if (!alcanzado) return 'Léelo';
  if ((fs ?? []).some((f) => f.mia)) return 'Cambia tu firma';
  return fs?.length ? 'Firma tú también' : 'Deja la primera firma';
}

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
/**
 * (Campamento 33) Los osos de la cumbre se estiran por la mañana: de 7:00 a 8:00, en el primer minuto de cada cinco (seis segundos
 * desde el 39b, uno tras otro; el reloj de montana.js lo mira cada 20 s). `h`: la hora decimal de El Salvador. Antes de las 7 cruza el torogoz.
 * @param {number} h
 * @returns {boolean}
 */
export const estiranLosOsos = (h) => h >= 7 && h < 8 && Math.floor(h * 60 + 1e-9) % 5 === 0;

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
  const m = etapaCelebrada(antes, despues);
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

/**
 * La semana en una línea (idea 16): la nota de una compra de hace un año, para que el Diario la traiga de vuelta. Se busca en los siete
 * días que terminan en la misma fecha del año pasado (así se recuerda toda una semana) y, si hay varias, gana la más cercana a esa fecha.
 * Devuelve `{ fecha, nota }` o null. Las ventas y los gastos no cuentan: sus notas son de otra cosa.
 */
export function notaDeHaceUnAnio(items, hoy = hoyISO()) {
  const hasta = haceUnAnio(hoy), desde = sumarDias(hasta, -6);
  const c = (items ?? []).filter((x) => x.tipo !== 'venta' && x.nota?.trim() && x.fecha >= desde && x.fecha <= hasta)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.id ?? 0) - (a.id ?? 0)))[0];
  return c ? { fecha: c.fecha, nota: c.nota.trim() } : null;
}

/**
 * El comprobante de una compra o de una venta (idea 17): lo que dice su ficha, armado con lo que ya se sabe. `items` son los de
 * `resumen` (en orden y con `satsAcum`). `numero` cuenta las compras (o las ventas) por fecha; `antes` y `despues` son la altitud (el
 * saldo) al anotarla; `p` y `q` (0 a 1) la sitúan en el tramo entre la etapa anterior y la siguiente (`meta`) y `etapa` es la etapa
 * que cruzó, si cruzó alguna (la destacada: `etapaDestacada`). `sello` es el de su semana y `primeraDeSemana` dice si nació con ella. `hoy` (solo compras
 * y con precio) es lo que valen hoy esos sats y cuánto cambió el precio desde entonces: informa, no recomienda. Sin el movimiento, null.
 */
export function comprobante(items, id, { precio = null, hoy = hoyISO() } = {}) {
  const c = (items ?? []).find((x) => x.id === id);
  if (!c) return null;
  const venta = c.tipo === 'venta';
  const pares = items.filter((x) => (x.tipo === 'venta') === venta);
  const despues = c.satsAcum, antes = despues + (venta ? c.sats : -c.sats);
  const a = etapaAnterior(antes), b = etapaSiguiente(antes);
  const en = (s) => (b > a ? Math.max(0, Math.min(1, (s - a) / (b - a))) : 0);
  const sello = venta ? null : sellosSemana(items, hoy).find((s) => s.desde <= c.fecha && c.fecha <= s.hasta) ?? null;
  const primera = sello ? pares.find((x) => x.fecha >= sello.desde && x.fecha <= sello.hasta) : null;
  return {
    id: c.id, tipo: venta ? 'venta' : 'compra', numero: pares.indexOf(c) + 1, total: pares.length, fecha: c.fecha, sats: c.sats, monto: c.monto, precio: c.precio,
    antes, despues, p: en(antes), q: en(despues), meta: b, etapa: venta ? null : etapaCelebrada(antes, despues) ?? null,
    sello, primeraDeSemana: Boolean(primera && primera.id === c.id),
    hoy: !venta && precio && c.precio ? { valor: (c.sats * precio) / 1e8, variacion: (precio / c.precio - 1) * 100 } : null,
    realizada: venta ? c.realizada ?? null : null, extra: !venta && Boolean(c.extra), nota: c.nota ?? '', etiquetas: c.etiquetas ?? [], txid: c.txid ?? '',
  };
}

// ---------------------------------------------------------------------------------------------
// Campamento 20 · «Tu historia»: el dibujo de hoy (5a) y el primer año del tronco y la manta (5b). Solo datos y textos.
// ---------------------------------------------------------------------------------------------

/** Los dibujos de «Tu historia», en el orden del selector, con el nombre que se les da en la portada. */
export const DIBUJOS = [
  { vh: 'tronco', nombre: 'El tronco' }, { vh: 'constelacion', nombre: 'La constelación' }, { vh: 'torre', nombre: 'La torre de piedras' },
  { vh: 'manta', nombre: 'La manta de añil' }, { vh: 'estratos', nombre: 'Los estratos' }, { vh: 'partitura', nombre: 'La partitura' },
];
/**
 * Los dibujos que ya se ven bien con los datos (los mínimos son pocos y a propósito): el tronco con 3 compras en 2 meses, la
 * constelación con 12 estrellas, la torre con 3 piedras, la manta con 4 semanas tejidas con compra, los estratos con 3 capas (meses)
 * y la partitura con 4 notas en su año.
 */
export function dibujosListos(items, hoy = hoyISO()) {
  const compras = (items ?? []).filter((c) => c.tipo !== 'venta');
  if (!compras.length) return [];
  const meses = new Set(compras.map((c) => c.fecha.slice(0, 7))).size;
  const semanas = new Set(compras.map((c) => semana(c.fecha))).size;
  const listo = {
    tronco: compras.length >= 3 && meses >= 2,
    constelacion: compras.length >= 12,
    torre: compras.length >= 3,
    manta: semanas >= 4,
    estratos: estratosMes(items, hoy).length >= 3,
    partitura: (partitura(items).at(-1)?.notas.length ?? 0) >= 4,
  };
  return DIBUJOS.filter((d) => listo[d.vh]);
}
/** El dibujo de hoy: rota por día entre los que ya se ven bien (mismo día, mismo dibujo; mañana, el siguiente). Sin ninguno, null. */
export function objetoDeHoy(items, hoy = hoyISO()) {
  const listos = dibujosListos(items, hoy);
  if (!listos.length) return null;
  const [y, m, d] = hoy.split('-').map(Number);
  return listos[Math.round(Date.UTC(y, m - 1, d) / 864e5) % listos.length];
}

/** ¿El libro está en su primer año? Sí desde la primera compra hasta la víspera de su primer aniversario. */
export function primerAnio(items, hoy = hoyISO()) {
  const f = (items ?? []).filter((c) => c.tipo !== 'venta').map((c) => c.fecha).sort();
  return Boolean(f.length) && sumarMeses(f[0], 12) > hoy;
}

/**
 * El tronco del primer año (5b): un árbol joven todavía no tiene anillos de años, así que se dibuja por meses: una banda por mes, de
 * la primera compra a hoy (el más viejo en el centro). Cada mes trae lo de `aniosTronco` (comprados, extras, ventas, saldo al cerrar)
 * y sus marcas llevan `frac`, su lugar en el primer año (0 = la primera compra, 1 = el aniversario): así la vuelta del tronco es ese
 * año y se cierra al cumplirlo. `fr` es cuánto del primer año ya pasó (para el borde vivo).
 */
export function mesesTronco(items, hoy = hoyISO()) {
  const compras = (items ?? []).filter((c) => c.tipo !== 'venta');
  if (!compras.length) return { meses: [], fr: 0 };
  const p = compras.map((c) => c.fecha).sort()[0];
  const aniv = sumarMeses(p, 12);
  const largo = (aFecha(aniv).getTime() - aFecha(p).getTime()) / 864e5;
  const frDe = (f) => Math.min(1, Math.max(0, (aFecha(f).getTime() - aFecha(p).getTime()) / 864e5 / largo));
  const mesHoy = hoy.slice(0, 7);
  const meses = [];
  for (let k = 0, f = `${p.slice(0, 7)}-01`; k < 13 && f.slice(0, 7) <= mesHoy; k++, f = sumarMeses(f, 1)) {
    const [y, m] = f.split('-').map(Number);
    meses.push({ i: k, mes: f.slice(0, 7), nombre: `${MESES_L[m - 1]} de ${y}`, comprados: 0, vendidos: 0, nCompras: 0, nExtras: 0, nVentas: 0,
      extras: /** @type {{ fecha: string, sats: number, frac: number }[]} */ ([]), ventas: /** @type {{ fecha: string, sats: number, frac: number }[]} */ ([]),
      completo: f.slice(0, 7) < mesHoy, saldoFin: 0 });
  }
  for (const c of items) {
    const y = meses.find((x) => x.mes === c.fecha.slice(0, 7));
    if (!y) continue;
    const marca = { fecha: c.fecha, sats: c.sats, frac: frDe(c.fecha) };
    if (c.tipo === 'venta') { y.vendidos += c.sats; y.nVentas++; y.ventas.push(marca); }
    else { y.comprados += c.sats; y.nCompras++; if (c.extra) { y.nExtras++; y.extras.push(marca); } }
  }
  for (const y of meses) y.saldoFin = satsEn(items, y.completo ? restarDias(sumarMeses(`${y.mes}-01`, 1), 1) : hoy); // al cerrar el mes (su último día)
  return { meses, fr: frDe(hoy), desde: p, aniversario: aniv };
}
/** Lo que dice el tronco del primer año, para los lectores de pantalla y la portada. */
export function textoTroncoPrimer(t, libro = false) {
  const ms = t.meses;
  if (!ms.length) return textoTronco([], libro);
  const mejor = ms.reduce((m, y) => (y.comprados > m.comprados ? y : m), ms[0]);
  const nudos = ms.reduce((a, y) => a + y.nExtras, 0);
  return `${libro ? 'El tronco del libro' : 'Tu tronco'} está en su primer año: una banda por mes (${ms.length}), de ${ms[0].nombre} a ${ms.at(-1).nombre}. `
    + `La más ancha es ${mejor.nombre}, con ${entero(mejor.comprados)} sats. Al cumplir un año, la primera vuelta se cierra y desde ahí cada anillo es un año.`
    + (nudos ? ` Hay ${nudos} ${nudos === 1 ? 'nudo' : 'nudos'}: las compras extra.` : '');
}
/** Un mes del tronco del primer año, para leerlo al tocar su banda. */
export function textoMesTronco(y, libro = false) {
  const partes = [`${y.nombre.replace(/^./, (c) => c.toUpperCase())}${y.completo ? '' : ' (en curso)'}: ${y.nCompras} ${y.nCompras === 1 ? 'compra' : 'compras'}`];
  if (y.comprados) partes.push(`+${entero(y.comprados)} sats`);
  if (y.nExtras) partes.push(`${y.nExtras} extra`);
  if (y.nVentas) partes.push(`${y.nVentas} ${y.nVentas === 1 ? 'venta' : 'ventas'} (−${entero(y.vendidos)} sats)`);
  partes.push(libro ? `${y.completo ? 'cerró con' : 'hoy tiene'} ${entero(y.saldoFin)} sats` : `${y.completo ? 'cerraste con' : 'tienes'} ${entero(y.saldoFin)} sats`);
  return partes.join(' · ');
}

/**
 * La manta del primer año (5b): en vez de una fila por año del calendario (que dejaba una tira de unas semanas arriba y otra abajo),
 * el primer año del libro se teje como una sola pieza de 4 hileras (una por trimestre del libro) de 13 semanas, de la primera semana
 * a la del aniversario. Lo tejido son las semanas reales (las mismas celdas que `semanasManta`, con su tono); lo que falta es la
 * urdimbre aún sin tejer. `cols` es 13 (14 si el año del libro abarca 53 semanas).
 */
export function mantaPrimerAnio(items, hoy = hoyISO()) {
  const m = semanasManta(items, hoy);
  const total = Math.max(52, m.celdas.length);
  const cols = Math.ceil(total / 4);
  return { primer: true, cols, filas: 4, total: cols * 4, celdas: m.celdas, semanasConCompra: m.semanasConCompra, futuras: cols * 4 - m.celdas.length };
}
/** Lo que dice la manta del primer año. */
export function textoMantaPrimer(m, libro = false) {
  if (!m.celdas.length) return textoManta({ celdas: [], anios: [] }, libro);
  return `${libro ? 'La manta del libro' : 'Tu manta'} está en su primer año: 4 hileras de ${m.cols} semanas, ${m.celdas.length} ya tejidas `
    + `(${m.semanasConCompra} con compra) y ${m.futuras} en el telar. Cuanto más oscuro el añil, más sats esa semana; el algodón crudo es una semana sin compras.`;
}

// ---------------------------------------------------------------------------------------------
// Campamento 20 · un punto por mes en el gráfico del precio (idea 9). Solo datos.
// ---------------------------------------------------------------------------------------------

/** A partir de cuántas compras a la vista el gráfico del precio dibuja un punto por mes (con 150 o menos, una por compra). */
export const UMBRAL_POR_MES = 150;
/**
 * Las compras de cada mes en un solo punto, para el gráfico con muchas compras a la vista. Es un resumen honesto: el punto va al
 * precio que de verdad se pagó en promedio ese mes (dólares entre sats, no la media de los precios) y su fecha es la de la compra del
 * medio; trae cuántas compras junta (`n`), sus sats y sus dólares. Recibe solo compras habituales: las extra y las ventas no se juntan
 * (el gráfico las sigue dibujando una por una).
 */
export function comprasPorMes(compras) {
  const por = new Map();
  for (const c of compras ?? []) {
    const k = c.fecha.slice(0, 7);
    if (!por.has(k)) por.set(k, []);
    por.get(k).push(c);
  }
  return [...por.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([mes, cs]) => {
    const orden = [...cs].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.id ?? 0) - (b.id ?? 0)));
    const sats = cs.reduce((a, c) => a + c.sats, 0), monto = cs.reduce((a, c) => a + (c.monto ?? 0), 0);
    const [y, m] = mes.split('-').map(Number);
    return { grupo: true, id: `m-${mes}`, mes, nombre: `${MESES_L[m - 1]} de ${y}`, tipo: 'compra', extra: false, n: cs.length, sats, monto,
      precio: sats ? (monto * 1e8) / sats : null, fecha: orden[orden.length >> 1].fecha, desde: orden[0].fecha, hasta: orden.at(-1).fecha };
  });
}

// ---------------------------------------------------------------------------------------------
// Campamento 21B · La tele de la sala: el reloj, la noche, el marco de la historia y dónde va cada tarjeta. Cuentas puras.
// ---------------------------------------------------------------------------------------------

/** La hora de El Salvador (UTC−6, sin horario de verano) de un instante en ms: `{ h, m, s }`. */
export function horaSV(ms) {
  const t = Math.floor((ms - 6 * 3600e3) / 1000);
  const d = ((t % 86400) + 86400) % 86400;
  return { h: Math.floor(d / 3600), m: Math.floor((d % 3600) / 60), s: d % 60 };
}
/** El reloj como se lee aquí, de 12 horas: `{ hora: '8:05', sufijo: 'p. m.' }` (las 12:30 del mediodía son «p. m.»; las 0:30, «12:30 a. m.»). */
export function textoReloj(h, m) {
  return { hora: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`, sufijo: h < 12 ? 'a. m.' : 'p. m.' };
}
/** De qué hora a qué hora duerme la tele (idea 42): de 23:00 a 5:00 de El Salvador. */
export const TELE_DUERME = { desde: 23, hasta: 5 };
/** ¿Duerme la tele a esta hora (decimal, 0 a 24)? Solo si el dispositivo no lo apagó. */
export const teleDuerme = (hora, activa = true) => Boolean(activa) && (hora >= TELE_DUERME.desde || hora < TELE_DUERME.hasta);
/**
 * Cuánto se corre el reloj de la tele dormida (para no marcar la pantalla): cambia cada 5 minutos, solo unos píxeles cada vez, y en
 * unas horas recorre un rectángulo de ±`ax` × ±`ay` sin volver al mismo sitio (dos senos de periodos primos entre sí: 37 y 23 vueltas).
 * `minutos` desde la medianoche.
 */
export function corrimientoReloj(minutos, { ax = 36, ay = 22 } = {}) {
  const k = Math.floor(minutos / 5);
  return { k, x: Math.round(ax * Math.sin((2 * Math.PI * k) / 37)), y: Math.round(ay * Math.sin((2 * Math.PI * k) / 23 + 1)) };
}
/**
 * El marco de la historia (idea 32): cada 10 minutos, alineado al reloj (a las :05, :15, :25… para no coincidir con el atardecer de
 * las 18:00), la tele enseña durante 40 s uno de los dibujos de «Tu historia» que ya se ven bien. Cuál, por el número de la vuelta:
 * siempre el mismo a la misma hora y, en la vuelta siguiente, el siguiente de la lista. Sin dibujos, null.
 * Devuelve `{ visible, dibujo, vuelta, faltaMs }` (`faltaMs`: lo que le queda a lo que se ve ahora, sea el marco o la espera).
 */
export function marcoTele(ahoraMs, listos, { cadaMs = 600e3, duraMs = 40e3, desfaseMs = 300e3 } = {}) {
  const n = listos?.length ?? 0;
  if (!n) return null;
  const t = ahoraMs - desfaseMs, vuelta = Math.floor(t / cadaMs), dentro = t - vuelta * cadaMs;
  const visible = dentro < duraMs;
  return { visible, dibujo: listos[((vuelta % n) + n) % n], vuelta, faltaMs: visible ? duraMs - dentro : cadaMs - dentro };
}
/**
 * (Campamento D) Los nueve sitios de la deriva de la tele: hasta 12 px a cada lado y hacia abajo (hacia arriba, la cabecera se saldría de
 * la pantalla y el reloj ya no iría en la fila del precio).
 */
export const DERIVA_TELE = [[0, 0], [12, 0], [12, 12], [0, 12], [-12, 12], [-12, 0], [-12, 6], [0, 6], [12, 6]];
/**
 * (Campamento D) Contra el quemado de la pantalla: el saldo y la cabecera de la tele se corren hasta 12 px, un sitio cada 10 minutos.
 * Cambia a las :05:20, :15:20… (a mitad del marco de la historia, que tapa la pantalla: el salto no se ve). Devuelve `[dx, dy]` en px.
 * @param {number} ahoraMs
 * @returns {number[]}
 */
export function derivaTele(ahoraMs) {
  const k = Math.floor((ahoraMs - 320e3) / 600e3), n = DERIVA_TELE.length;
  return DERIVA_TELE[((k % n) + n) % n];
}
/**
 * Lo que enseña la tele en este momento: `'duerme'` (de 23:00 a 5:00, si el dispositivo no lo apagó y nadie la despertó un rato con un
 * toque), `'marco'` (el dibujo de la historia, si toca y no hay fiesta ni atardecer en curso: una compra nueva siempre gana) o `'escena'`.
 */
export function modoTele({ hora, ahoraMs, duerme = true, despiertaHasta = 0, fiesta = false, ritual = false, listos = [] }) {
  if (teleDuerme(hora, duerme) && ahoraMs >= despiertaHasta) return { modo: 'duerme', marco: null };
  const m = fiesta || ritual ? null : marcoTele(ahoraMs, listos);
  return m?.visible ? { modo: 'marco', marco: m } : { modo: 'escena', marco: null };
}

/** ¿Se tocan dos rectángulos `{x, y, w, h}`, dejando `margen` entre ellos? Tocarse justo en el borde (sin margen) no cuenta. */
export const chocan = (a, b, margen = 0) => a.x < b.x + b.w + margen && a.x + a.w + margen > b.x && a.y < b.y + b.h + margen && a.y + a.h + margen > b.y;
/**
 * Dónde va una tarjeta de la tele (idea 15): el primer candidato `{x, y}` en el que la caja `{w, h}` cabe en la pantalla (`W` × `H`,
 * dejando `borde`) sin pisar ningún obstáculo (el sendero, «Tú», los rótulos, el saldo, las tarjetas ya puestas…) con su `margen`.
 * Los candidatos van en orden de preferencia (el primero suele ser donde ya estaba: así no salta si no hace falta). Si no cabe en
 * ningún sitio, null: la tarjeta no se enseña (nunca tapa un dato).
 */
export function sitioLibre(caja, candidatos, obstaculos, { W, H, margen = 0, borde = 0 }) {
  for (const c of candidatos ?? []) {
    if (!c) continue;
    const r = { x: c.x, y: c.y, w: caja.w, h: caja.h };
    if (r.x < borde || r.y < borde || r.x + r.w > W - borde || r.y + r.h > H - borde) continue;
    if (!obstaculos.some((o) => chocan(r, o, margen))) return { ...c };
  }
  return null;
}
/** Candidatos a lo largo de una línea: de (x0, y0) en pasos de (dx, dy) mientras sigan dentro de [x1…x2] × [y1…y2]. */
export function riel(x0, y0, dx, dy, { x1 = -Infinity, x2 = Infinity, y1 = -Infinity, y2 = Infinity } = {}) {
  if (!dx && !dy) return [{ x: x0, y: y0 }];
  const out = [];
  for (let x = x0, y = y0; x >= x1 && x <= x2 && y >= y1 && y <= y2 && out.length < 2000; x += dx, y += dy) out.push({ x, y });
  return out;
}
/** Una rejilla de candidatos en [x1…x2] × [y1…y2], de la más cercana a (ax, ay) a la más lejana (la distancia vertical pesa `ky`). */
export function rejilla(ax, ay, { x1, x2, y1, y2, paso = 24, ky = 1 }) {
  const out = [];
  for (let x = x1; x <= x2; x += paso) for (let y = y1; y <= y2; y += paso) out.push({ x, y, d: Math.abs(x - ax) + ky * Math.abs(y - ay) });
  return out.sort((a, b) => a.d - b.d);
}

// ---------------------------------------------------------------- Campamento 24 · Medir este aparato (idea 44)
// Las cuentas de la prueba de desplazamiento, puras (medir.js mide y sistema.js enseña). La regla es del dueño: desde 55 fotogramas por
// segundo, fluido; de 50 a 55, revisar; bajo 50, lento (y entonces lo primero que se quitaría en el teléfono es el desenfoque de la sierra
// del fondo, `#m-bruma`; partir la escena o «hornearla» no se hace).
export const FPS_FLUIDO = 55;
export const FPS_LENTO = 50;
/** Una pantalla que ya en reposo va a menos de esto (el ahorro de batería del iPhone la deja en 30) no sirve para juzgar. */
export const HZ_MINIMO = 50;
/** La prueba: cuánto dura (ms) y cuántas pantallas baja como mucho antes de volver arriba. */
export const PRUEBA_MS = 7000;
export const PRUEBA_PANTALLAS = 3;

/**
 * Dónde va la página (px desde arriba) en el instante `t` (ms) de una prueba de `T` ms que baja `D` px y vuelve: arranca y frena
 * suave, como un dedo, y la mitad del tiempo baja y la otra mitad sube. Es la misma prueba en cualquier aparato.
 * @param {number} t
 * @param {number} T
 * @param {number} D
 * @returns {number}
 */
export const desplazamientoPrueba = (t, T, D) => (t <= 0 || t >= T || !(D > 0) ? 0 : Math.round((D * (1 - Math.cos((2 * Math.PI * t) / T))) / 2));

/**
 * Los intervalos (ms) entre fotogramas seguidos, a partir de sus instantes (el `performance.now()` que da requestAnimationFrame).
 * `incluir(i)` elige cuáles: el intervalo `i` va del fotograma `i − 1` al `i` (p. ej. solo mientras se veía la montaña).
 * @param {ArrayLike<number>} t instantes en ms, en orden (el arreglo puede ser más largo: va preasignado)
 * @param {number} [n] cuántos instantes valen
 * @param {(i: number) => boolean} [incluir]
 * @returns {number[]}
 */
export function intervalosDe(t, n = t.length, incluir) {
  const out = [];
  for (let i = 1; i < n; i++) if (!incluir || incluir(i)) out.push(t[i] - t[i - 1]);
  return out;
}

/**
 * La frecuencia de la pantalla en reposo (fotogramas por segundo, redondeada): la mediana de los intervalos, que no se mueve por un
 * tirón suelto. null con menos de 5 intervalos.
 * @param {number[]} d intervalos en ms
 * @returns {number|null}
 */
export function hzReposo(d) {
  const v = d.filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length < 5) return null;
  const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return Math.round(1000 / m);
}

/**
 * Lo que se vio al deslizar, a partir de los intervalos entre fotogramas: los fotogramas por segundo de media, el medio segundo más lento
 * (`peor`, la peor ventana de `ventana` ms), el 5 % más lento (`p5`: los fotogramas por segundo del intervalo del percentil 95) y los
 * `tirones` (intervalos de más de 1.5 veces el de la pantalla en reposo: ahí se perdió al menos un fotograma). null con menos de 2.
 * @param {number[]} d intervalos en ms
 * @param {{ ventana?: number, intervalo?: number }} [opciones] `intervalo`: el de la pantalla en reposo, en ms (1000 / Hz)
 * @returns {{ fps: number, peor: number, p5: number, tirones: number, fotogramas: number, duracion: number } | null}
 */
export function resumenFotogramas(d, { ventana = 500, intervalo = 1000 / 60 } = {}) {
  const v = d.filter((x) => x > 0);
  if (v.length < 2) return null;
  const duracion = v.reduce((a, x) => a + x, 0);
  const r1 = (x) => Math.round(x * 10) / 10;
  const fps = (v.length * 1000) / duracion;
  // La peor ventana: desde cada fotograma, los que caben hasta juntar `ventana` ms (si toda la prueba es más corta, es la media).
  let peor = fps;
  if (duracion > ventana) {
    let j = 0, suma = 0;
    for (let i = 0; i < v.length; i++) {
      while (j < v.length && suma < ventana) suma += v[j++];
      if (suma < ventana) break;
      peor = Math.min(peor, ((j - i) * 1000) / suma);
      suma -= v[i];
    }
  }
  const orden = [...v].sort((a, b) => a - b);
  const p95 = orden[Math.min(orden.length - 1, Math.ceil(orden.length * 0.95) - 1)];
  return { fps: r1(fps), peor: r1(peor), p5: r1(1000 / p95), tirones: v.filter((x) => x > intervalo * 1.5).length, fotogramas: v.length + 1, duracion: Math.round(duracion) };
}

/**
 * Cómo fue al deslizar, con la regla del dueño: «fluido» desde 55 fps, «revisar» de 50 a 55 y «lento» bajo 50 (con la cifra redondeada,
 * la misma que se enseña). Cuenta lo peor de toda la prueba y del rato con la montaña a la vista (la parte pesada). Si la pantalla ya iba
 * a menos de 50 en reposo (`limitada`: el ahorro de batería del iPhone la deja en 30), con eso no se puede juzgar: «revisar».
 * @param {{ fps: number, fps_escena?: number|null, hz?: number|null }} m
 * @returns {{ estado: 'fluido'|'revisar'|'lento', fps: number, limitada: boolean }}
 */
export function veredictoFps({ fps, fps_escena = null, hz = null }) {
  const v = Math.round(fps_escena != null ? Math.min(fps, fps_escena) : fps);
  const limitada = hz != null && hz < HZ_MINIMO;
  /** @type {'fluido'|'revisar'|'lento'} */
  const estado = limitada ? 'revisar' : v >= FPS_FLUIDO ? 'fluido' : v >= FPS_LENTO ? 'revisar' : 'lento';
  return { estado, fps: v, limitada };
}
/** Cómo se dice cada veredicto (con su símbolo, para no depender del color) y cómo lo pinta «Estado del sistema». */
export const PALABRA_FPS = { fluido: 'Fluido', revisar: 'Revisar', lento: 'Lento' };
export const ESTADO_FPS = { fluido: 'ok', revisar: 'aviso', lento: 'mal' };
/**
 * Lo que se haría con un «Lento»: una línea. (Antes decía que se quitaría el desenfoque de la sierra del fondo: ya no está en el
 * teléfono, y la escena va en capas; ahora apunta a los interruptores de efectos.js, que dicen qué parte pesa en ese aparato.)
 */
export const REGLA_LENTO = 'Si pasa en el iPhone, mide también en Safari /medir?sin=pausa, /medir?sin=velo y /medir?sin=capas: cada una apaga una mejora de la escena y así se ve qué parte pesa.';

// ---------------------------------------------------------------- Campamento 22 · el valle vivo
// Cuentas puras del valle. Hablan del tiempo que lleva el libro y de cuánta gente lo comparte; nada depende de si se compró hoy.
/** La primera compra del libro (AAAA-MM-DD), o null sin compras. Las ventas no cuentan. */
export function primeraCompra(items) {
  let p = null;
  for (const c of items) if (c.tipo !== 'venta' && (!p || c.fecha < p)) p = c.fecha;
  return p;
}
/** Meses de calendario que lleva el libro, del mes de la primera compra al de hoy, los dos incluidos (0 sin compras). */
export function mesesDelLibro(items, hoy = hoyISO()) {
  const p = primeraCompra(items);
  if (!p) return 0;
  const n = (Number(hoy.slice(0, 4)) - Number(p.slice(0, 4))) * 12 + Number(hoy.slice(5, 7)) - Number(p.slice(5, 7)) + 1;
  return Math.max(1, n);
}
export const LUCES_MIN = 6;
export const LUCES_MAX = 60;
/** Luces del valle de noche (idea 47): una por mes del libro, con un mínimo de seis (la noche nunca queda vacía) y un tope de sesenta. */
export const lucesDelValle = (meses) => Math.min(LUCES_MAX, Math.max(LUCES_MIN, Math.floor(Number(meses) || 0)));
/** Años (con decimales) desde la primera compra: lo que tiene el árbol del primer día (0 sin compras). */
export function aniosDelLibro(items, hoy = hoyISO()) {
  const p = primeraCompra(items);
  if (!p) return 0;
  return Math.max(0, (Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${p}T00:00:00Z`)) / (365.2425 * 864e5));
}
/**
 * El árbol del primer día (idea 50) crece con los años del libro, no con las compras: retoño el primer año, joven hasta los dos, árbol de
 * sombra desde los dos y grande desde los cinco. `tam` (0.3 a 1) es cuánto mide frente a su tamaño adulto.
 * @param {number} anios
 * @returns {{ etapa: 'retono' | 'joven' | 'arbol' | 'grande', tam: number }}
 */
export function arbolDelPrimerDia(anios) {
  const a = Math.max(0, Number(anios) || 0);
  const etapa = a < 1 ? 'retono' : a < 2 ? 'joven' : a < 5 ? 'arbol' : 'grande';
  return { etapa, tam: Math.min(1, 0.3 + (a < 2 ? a * 0.15 : 0.3 + (a - 2) * 0.1333)) };
}
/** Las iniciales de la familia, como van grabadas en la roca las noches de luna llena (idea 27): «A · D · M». */
export const inicialesGrabadas = (iniciales) => [...String(iniciales ?? '')].filter((c) => c.trim()).join(' · ');
/**
 * (Campamento 42) El domingo de Pascua de un año del calendario gregoriano (AAAA-MM-DD), con el cálculo de siempre (Meeus/Jones/Butcher).
 * De él salen el Domingo de Ramos (7 días antes), el Jueves y el Viernes Santo (3 y 2 antes) y el Sábado de Gloria (1 antes). cielo.js,
 * que es un script clásico y no puede importarla, lleva la misma función (`libroCielo.pascua`): `test_lib` las compara.
 * @param {number} anio
 * @returns {string}
 */
export function pascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4, g = Math.floor((8 * b + 13) / 25);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 19 * l) / 433);
  const mes = Math.floor((h + l - 7 * m + 90) / 25), dia = (h + l - 7 * m + 33 * mes + 19) % 32;
  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
/** La fecha de la primera compra como se graba en una piedra: «20 · XI · 2025». */
export function fechaGrabada(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f ?? ''))) return '';
  return `${Number(f.slice(8, 10))} · ${ROMANOS[Number(f.slice(5, 7)) - 1]} · ${f.slice(0, 4)}`;
}
/** Las ventanas encendidas del cantón (idea 45): una por persona con cuenta, hasta las que caben en sus ranchos. */
export const ventanasEncendidas = (personas, caben) => Math.max(0, Math.min(Number(caben) || 0, Math.floor(Number(personas) || 0)));
/** Las piscuchas de octubre y noviembre (idea 22): una por persona con cuenta, hasta seis. */
export const PISCUCHAS_MAX = 6;
export const piscuchasDelValle = (personas) => Math.max(0, Math.min(PISCUCHAS_MAX, Math.floor(Number(personas) || 0)));
/**
 * La frase del valle para la descripción de la montaña (lectores de pantalla). Sin «tu»: el valle es el mismo para toda la familia.
 * `arbol` = { fecha, etapa } si el libro ya tiene su árbol; `milpa`: si en ese tamaño se dibuja (campamento 38).
 * `foco`: la frase del foco del día (campamento 51), si la hay. `turno`: el turno del pueblo de ahora (campamento 40, idea 148): qué
 * pasa en él, en una frase (`FRASE_TURNO`; los de fiesta ya los cuenta su foco).
 * @param {{ luces?: number, arbol?: { fecha: string, etapa: string } | null, milpa?: boolean, foco?: string, turno?: string, sem?: number }} [valle]
 */
export function textoValle({ luces = 0, arbol = null, milpa = true, foco = '', turno = '', sem = -1 } = {}) {
  // (22C) El pueblo bajó al pie de la montaña: el sendero empieza en él. (Campamento 38, idea 121) Sus vecinos son osos polares: lo
  // decorativo va con aria-hidden y lo que se ve tiene que estar aquí (sin tutear y sin nombres). Sin milpa en ese tamaño, no se nombra.
  let t = `Al pie de la montaña hay un pueblo con su iglesia, su plaza y sus casas de colores; de él sale el camino real hasta donde empieza el sendero. En el pueblo, los vecinos son osos polares. Alrededor hay campos${milpa ? ' con su milpa' : ''}, un bosque y un lago, y una quebrada baja de la montaña${luces ? `; de noche se ven ${luces} luces, una por mes del libro, en los caseríos de la sierra` : ''}.`;
  if (arbol?.fecha) t += ` Junto a la salida crece ${{ retono: 'el retoño de un conacaste', joven: 'un conacaste joven', arbol: 'un conacaste', grande: 'un conacaste grande' }[arbol.etapa] ?? 'un conacaste'}, sembrado el ${fechaLarga(arbol.fecha)}, el día de la primera compra.`;
  // (Campamento 51, idea 228) El foco del día, en una frase (la del director: cielo.js, `fraseDelFoco` o `fraseRutina`); sin «tú».
  if (foco) t += ` ${foco}`;
  // (Campamento 52, idea 238) La semana de cada oficio: el lunes el panadero descansa y el sábado la tortillera hace tamales.
  const fr = FRASE_SEMANA[sem]?.[turno] ?? FRASE_TURNO[turno];
  if (fr) t += ` ${fr}`;
  return t;
}
/**
 * (Campamento 40, idea 148) Lo que pasa en el pueblo en cada turno de un día cualquiera, para la descripción de la montaña: una frase,
 * sin tutear, sin nombres y sin mandar nada. Los turnos de fiesta (la Navidad entera, el desfile) no llevan: ya los cuenta su foco.
 * @type {Record<string, string>}
 */
export const FRASE_TURNO = {
  duerme: 'En el pueblo todos duermen.',
  alba: 'En el pueblo aún es de noche y el panadero ya carga su canasto con el horno encendido.',
  amanece: 'En el pueblo amanece: el sacristán ya tiene abierta la iglesia y el panadero sale con el pan.',
  manana: 'Es media mañana en el pueblo; los oseznos están en la escuela.',
  mananaLibre: 'Es media mañana en el pueblo y los oseznos juegan en la plaza.',
  misa: 'Es domingo y en el pueblo van a misa.',
  mercado: 'Es sábado de plaza en el pueblo.',
  tortillas: 'Es mediodía en el pueblo: la tortillera echa tortillas en su comal y el panadero almuerza.',
  salida: 'Es mediodía en el pueblo y los oseznos salen de la escuela con su bolsón.',
  siesta: 'En el pueblo es la hora de la siesta.',
  tarde: 'Es la tarde en el pueblo y los oseznos juegan en la plaza.',
  vuelta: 'Cae la tarde en el pueblo y los oseznos siguen en la plaza.',
  pupusas: 'En el pueblo es hora de pupusas.',
  posada: 'En el pueblo es hora de pupusas y unos vecinos miran el nacimiento.',
  fresca: 'En el pueblo, los vecinos sacan su silla a la acera a tomar el fresco.',
};
/**
 * (Campamento 52, idea 238) La semana de cada oficio, por día de la semana (0 = domingo): el lunes el panadero descansa (de madrugada,
 * al amanecer y a mediodía) y el sábado la tortillera hace tamales.
 * @type {Record<number, Record<string, string>>}
 */
export const FRASE_SEMANA = {
  1: {
    alba: 'En el pueblo aún es de noche; los lunes el panadero descansa.',
    amanece: 'En el pueblo amanece; los lunes el panadero descansa y el pan lo trae la de la tienda.',
    tortillas: 'Es mediodía en el pueblo: la tortillera echa tortillas en su comal.',
  },
  6: { tortillas: 'Es mediodía en el pueblo: los sábados la tortillera vende tamales de su olla.' },
};

/**
 * (Campamento 25) Los osos polares de peluche de la familia en la descripción de la montaña (sin tutear: es igual para quien solo mira).
 * @param {number} n cuántos se ven (3, 2, 1 o 0)
 * @returns {string}
 */
export function textoOsos(n) {
  if (n >= 3) return 'Bajo la cumbre, junto a la meta, se sientan tres osos polares de peluche: el grande con su camiseta azul y su cinta roja, el chico y el del mameluco celeste.';
  if (n === 2) return 'Bajo la cumbre, junto a la meta, se sientan dos osos polares de peluche: el grande con su camiseta azul y su cinta roja, y el chico.';
  if (n === 1) return 'Bajo la cumbre, junto a la meta, se sienta un oso polar de peluche con su camiseta azul y su cinta roja.';
  return '';
}

// ---------------------------------------------------------------------------------------------
// Campamento 23 · Tu camino, otra vez: «Tal día como hoy» (idea 41) y la película del ascenso (idea 29). Solo datos y textos.
// ---------------------------------------------------------------------------------------------

const esBisiesto = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** ¿`fecha` cae «un día como hoy» de un año anterior? El 29 de febrero se recuerda el 28 en los años sin 29 (como los cumpleaños). */
function unDiaComoHoy(fecha, hoy) {
  const y = Number(hoy.slice(0, 4));
  if (Number(fecha.slice(0, 4)) >= y) return false;
  return fecha.slice(5) === hoy.slice(5) || (fecha.slice(5) === '02-29' && hoy.slice(5) === '02-28' && !esBisiesto(y));
}
/**
 * «Tal día como hoy» (idea 41): el campamento o la etapa a la que el libro llegó un día como hoy, hace uno o más años (con su fecha en
 * `R.camino`). Uno por día, el más grande: un campamento antes que una principal y esta antes que una intermedia; a igual rango, el más
 * alto (`etapaDestacada`). Las etapas que se cruzaron el día de la primera compra (`primera`) no cuentan: ese día es el aniversario del
 * libro, que ya se dice aparte (el aviso del día y el farolito de la salida). Devuelve `{ m, fecha, rango, anios }` o null.
 * @param {{ m: number, fecha: string|null, rango?: string }[]|null|undefined} camino
 * @param {string} [hoy]
 * @param {string|null} [primera]
 * @returns {{ m: number, fecha: string, rango: string, anios: number } | null}
 */
export function talDiaComoHoy(camino, hoy = hoyISO(), primera = null) {
  const hay = (camino ?? []).filter((h) => h.fecha && h.fecha !== primera && unDiaComoHoy(h.fecha, hoy));
  const m = etapaDestacada(hay.map((h) => h.m));
  const h = hay.find((x) => x.m === m);
  if (!h?.fecha) return null;
  return { m: h.m, fecha: h.fecha, rango: rangoEtapa(h.m), anios: Number(hoy.slice(0, 4)) - Number(h.fecha.slice(0, 4)) };
}
const cuantoHace = (n) => (n === 1 ? 'un año' : `${n} años`);
/**
 * Las formas del saludo un día como hoy, de la más larga a la más corta: se enseña la primera que cabe en su renglón (cuenta.js). Con el
 * nombre («Daf3r, hoy hace un año llegaste a 1M sats»), sin él y la corta («Hoy hace un año: 1M sats»). A quien solo mira se le habla del
 * libro («el libro llegó a 1M sats»), sin tutear.
 * @param {{ m: number, anios: number }} t
 * @param {string|null|undefined} nombre
 * @param {boolean} [libro]
 * @returns {string[]}
 */
export function saludoTalDia(t, nombre, libro = false) {
  const llego = `${libro ? 'el libro llegó' : 'llegaste'} a ${metaTxt(t.m)}`;
  return [...(nombre ? [`${nombre}, hoy hace ${cuantoHace(t.anios)} ${llego}`] : []), `Hoy hace ${cuantoHace(t.anios)} ${llego}`, `Hoy hace ${cuantoHace(t.anios)}: ${metaTxt(t.m)}`];
}
/** La línea del Diario un día como hoy (el Diario habla del libro para toda la familia): «Tal día como hoy, hace un año, el libro llegó al campamento 1M.» */
export const textoTalDia = (t) => `Tal día como hoy, hace ${cuantoHace(t.anios)}, el libro llegó ${t.rango === 'campamento' ? `al campamento ${nombreHito(t.m)}` : `a ${metaTxt(t.m)}`}.`;

/** La película dura 15 segundos de la primera compra a hoy (con efectos «ninguno» no hay reproducción: solo el deslizador). */
export const PELICULA_MS = 15000;
const diasDesde = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
/**
 * La película del ascenso (idea 29): el saldo día por día, de la primera compra a hoy, para repetir el camino sobre la montaña de hoy.
 * `items` son los movimientos de `resumen` (en orden y con `satsAcum`); `camino`, `R.camino` (cada etapa con la fecha en que el saldo
 * llegó). `pasos` lleva, por cada día con movimientos, el saldo al cerrar ese día y las compras que llevaba (`d` = días desde la primera);
 * `etapas`, cada etapa con su día. Sin movimientos, null. Las fechas se comparan como texto.
 * @param {{ fecha: string, tipo?: string, satsAcum: number }[]|null|undefined} items
 * @param {{ m: number, fecha: string|null }[]|null|undefined} camino
 * @param {string} [hoy]
 */
export function peliculaAscenso(items, camino, hoy = hoyISO()) {
  const its = (items ?? []).filter((c) => c.fecha <= hoy);
  if (!its.length) return null;
  const desde = its[0].fecha;
  /** @type {{ d: number, fecha: string, sats: number, compras: number }[]} */
  const pasos = [];
  let n = 0;
  for (const c of its) {
    if (c.tipo !== 'venta') n++;
    const d = diasDesde(desde, c.fecha), ult = pasos.at(-1);
    if (ult && ult.d === d) { ult.sats = c.satsAcum; ult.compras = n; } else pasos.push({ d, fecha: c.fecha, sats: c.satsAcum, compras: n });
  }
  const etapas = (camino ?? []).flatMap((h) => (h.fecha && h.fecha <= hoy ? [{ d: diasDesde(desde, h.fecha), fecha: h.fecha, m: h.m, rango: rangoEtapa(h.m) }] : []));
  return { desde, hoy, dias: Math.max(0, diasDesde(desde, hoy)), pasos, etapas };
}
/**
 * Un día de la película: la fecha, el saldo al cerrar ese día, las compras que llevaba y lo que pasó hace poco (`evento`: la etapa a la
 * que llegó en los últimos días de la película —la más reciente; si fueron varias el mismo día, la destacada— o la primera compra), para
 * el rótulo de la película. `d` va de 0 (la primera compra) a `P.dias` (hoy).
 * @param {{ desde: string, hoy: string, dias: number, pasos: { d: number, fecha: string, sats: number, compras: number }[], etapas: { d: number, fecha: string, m: number, rango: string }[] }} P
 * @param {number} d
 */
export function diaPelicula(P, d) {
  const k = Math.max(0, Math.min(P.dias, Math.round(d)));
  let lo = 0, hi = P.pasos.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (P.pasos[m].d <= k) { i = m; lo = m + 1; } else hi = m - 1; }
  const p = i >= 0 ? P.pasos[i] : null;
  // Lo que pasó se queda unos días de la película a la vista (un 5 % del camino, una semana como poco): así se alcanza a leer.
  const ventana = Math.max(7, Math.round(P.dias * 0.05));
  const recientes = P.etapas.filter((e) => e.d <= k && k - e.d <= ventana);
  const ultimo = recientes.length ? Math.max(...recientes.map((e) => e.d)) : null;
  const m = ultimo == null ? undefined : etapaDestacada(recientes.filter((e) => e.d === ultimo).map((e) => e.m));
  /** @type {{ tipo: 'etapa', m: number, rango: string } | { tipo: 'primera' } | null} */
  const evento = m != null ? { tipo: 'etapa', m, rango: rangoEtapa(m) } : k <= ventana ? { tipo: 'primera' } : null;
  return { d: k, fecha: sumarDias(P.desde, k), hoy: k >= P.dias, sats: p?.sats ?? 0, compras: p?.compras ?? 0, evento };
}
/** El día (de 0 a `P.dias`) de una fecha de la película, acotado al principio y a hoy. */
export const diaDeFecha = (P, fecha) => Math.max(0, Math.min(P.dias, diasDesde(P.desde, fecha)));
/**
 * Lo que dice la película de un día: el rótulo de arriba («Tu saldo el 15 nov 2025» / «Saldo del libro hoy»), lo que pasó («Llegaste al
 * campamento 1M», «Tu primera compra») y el texto completo para lectores de pantalla (el valor del deslizador). Sin tutear a quien solo mira.
 * @param {{ fecha: string, hoy: boolean, sats: number, evento: { tipo: string, m?: number, rango?: string } | null }} x
 * @param {boolean} [libro]
 */
export function textosPelicula(x, libro = false) {
  const rotulo = `${libro ? 'Saldo del libro' : 'Tu saldo'} ${x.hoy ? 'hoy' : `el ${fechaLarga(x.fecha)}`}`;
  const e = x.evento;
  const evento = !e ? '' : e.tipo === 'primera' ? (libro ? 'La primera compra del libro' : 'Tu primera compra')
    : `${libro ? 'El libro llegó' : 'Llegaste'} ${e.rango === 'campamento' ? `al campamento ${nombreHito(e.m ?? 0)}` : `a ${metaTxt(e.m ?? 0)}`}`;
  return { rotulo, evento, lectura: `${x.hoy ? `Hoy, ${fechaLarga(x.fecha)}` : fechaLarga(x.fecha)}: ${entero(x.sats)} sats.${evento ? ` ${evento}.` : ''}` };
}

// ---------------------------------------------------------------- Campamento 24 · Confianza
/**
 * La suma de la lista filtrada por una etiqueta (campamento 24): lo que se compró y lo que se vendió (o gastó) con esa etiqueta entre los
 * movimientos que se ven, cada cosa con su nombre; con las dos, el neto con esa palabra. Nunca es «el saldo» de la etiqueta (por eso se
 * descartó la alcancía: una venta sin etiqueta no tiene regla honesta): solo dice qué movimientos se ven. Los traslados no llevan
 * etiquetas y no cuentan. Sin compras ni ventas, null.
 * @param {{ tipo: string, sats: number }[]} movs
 * @returns {{ compras: number, ventas: number, comprados: number, vendidos: number, neto: number, texto: string } | null}
 */
export function sumaEtiqueta(movs) {
  let compras = 0, ventas = 0, comprados = 0, vendidos = 0;
  for (const m of movs) {
    if (m.tipo === 'compra') { compras++; comprados += m.sats; } else if (m.tipo === 'venta') { ventas++; vendidos += m.sats; }
  }
  if (!compras && !ventas) return null;
  const neto = comprados - vendidos;
  const texto = !ventas ? `${entero(comprados)} sats comprados` : !compras ? `${entero(vendidos)} sats vendidos`
    : `neto ${neto > 0 ? '+' : neto < 0 ? '−' : ''}${entero(Math.abs(neto))} sats (${entero(comprados)} comprados, ${entero(vendidos)} vendidos)`;
  return { compras, ventas, comprados, vendidos, neto, texto };
}
/**
 * El renglón de resultados de la lista filtrada («12 de 140 movimientos») y, con una etiqueta elegida, su suma («· 310,000 sats
 * comprados»). No tutea: es el mismo para quien anota y para quien solo mira.
 * @param {number} vistos
 * @param {number} todos
 * @param {{ tipo: string, sats: number }[] | null} [conEtiqueta] los movimientos que se ven, si hay una etiqueta elegida
 */
export function textoResultadosLista(vistos, todos, conEtiqueta = null) {
  const s = conEtiqueta && vistos ? sumaEtiqueta(conEtiqueta) : null;
  return `${entero(vistos)} de ${entero(todos)} ${todos === 1 ? 'movimiento' : 'movimientos'}${s ? ` · ${s.texto}` : ''}`;
}
/**
 * El botón «Ver más» de la lista, en dos piezas que no se parten por dentro: cuántas trae el toque y, si no son todas, cuántas quedan
 * sin ver («Ver 25 más» · «quedan 44»). Con las últimas, una sola: «Ver los 12 que quedan» (o «Ver el que queda»).
 * @param {number} faltan las filas que aún no se ven
 * @param {number} paso las que trae cada toque
 * @returns {string[]}
 */
export function textoVerMas(faltan, paso) {
  if (faltan > paso) return [`Ver ${entero(paso)} más`, `quedan ${entero(faltan)}`];
  return [faltan === 1 ? 'Ver el que queda' : `Ver los ${entero(faltan)} que quedan`];
}

/**
 * Una ruta de la tabla de peticiones («Estado del sistema») en los tramos donde puede partirse: el primero lleva sus dos primeros trozos
 * («/api/compras», que nunca se parte) y cada trozo siguiente va aparte («/<int:cid>»). Unidos, son la ruta tal cual.
 * @param {string} ruta
 * @returns {string[]}
 */
export function tramosRuta(ruta) {
  const trozos = ruta.match(/\/[^/]*/g) ?? [ruta];
  return trozos.length <= 2 ? [trozos.join('')] : [trozos.slice(0, 2).join(''), ...trozos.slice(2)];
}

/** Cada cuántos días pregunta la revisión del respaldo (la regla vive en el servidor: `server.resguardo`). */
export const RESGUARDO_DIAS = 180;
/**
 * La fila de la revisión del respaldo en «Estado del sistema» (campamento 24, idea 36): estado, palabra y detalle. Tranquila a propósito:
 * no haber revisado no es nunca «Falla» ni rojo (es un hábito, no una avería) y no cuenta como «cosa por revisar». La app no guarda nada de la
 * wallet: solo la fecha en que se tocó «Revisado».
 * @param {{ revisado: string|null, dias: number|null, al_dia: boolean, encendido: boolean, proximo: string|null, toca?: boolean, cada?: number }} r
 * @returns {{ estado: 'ok'|'calma', palabra: string, detalle: string }}
 */
export function textoResguardo(r) {
  const cada = r.cada ?? RESGUARDO_DIAS;
  const cuando = r.dias == null ? 'nunca' : r.dias <= 0 ? 'hoy' : r.dias === 1 ? 'ayer' : `hace ${entero(r.dias)} días (${fechaLarga(r.revisado ?? '')})`;
  const ultima = `Última revisión: ${cuando}.`;
  const sigue = r.toca ? ' El recordatorio sale hoy.' : r.proximo ? ` Próximo recordatorio: el ${fechaLarga(r.proximo)}.`
    : ` Para que te lo recuerde cada ${cada} días, enciende «Revisión tranquila del respaldo» en «Avisos en este dispositivo».`;
  if (r.al_dia) return { estado: 'ok', palabra: 'Al día', detalle: ultima + sigue };
  return { estado: 'calma', palabra: r.revisado ? 'Cuando puedas' : 'Sin anotar', detalle: ultima + (r.revisado ? '' : ' Cuando mires dónde está, toca «Revisado».') + sigue };
}

// ---------------------------------------------------------------------------------------------
// Campamento 59 · La fiesta del hito (A del diseño de Fable): un guion de cuatro tiempos a la escala del hito, para toda la familia.
// ---------------------------------------------------------------------------------------------

/**
 * La escala de la fiesta de una etapa: `campamento` (10× desde 1M: 1M, 10M, 1 BTC…), `principal` (2.5 y 5 de cada potencia, y 100k) o
 * `intermedia` (las demás). La del halving no sale de una etapa: es `halving`.
 * @param {number} m
 * @returns {'campamento' | 'principal' | 'intermedia'}
 */
export function escalaFiesta(m) {
  const r = rangoEtapa(m);
  return r === 'campamento' ? (m >= 1e6 ? 'campamento' : 'principal') : r;
}
/** Cuánto dura cada escala, en ms (24 s campamento · 12 s etapa principal y halving · 6 s intermedia, sobria). */
export const MS_FIESTA = { campamento: 24_000, principal: 12_000, halving: 12_000, intermedia: 6000 };
/** (59) Hasta nueve vecinos en la fiesta de un hito (el tope de un día cualquiera sigue en ocho: `arte-vecinos.js: MAX_VECINOS`). */
export const MAX_VECINOS_FIESTA = 9;
/**
 * El guion de la fiesta (pura: la prueba la recorre entera). Cuatro tiempos —anuncio (la campana y los vecinos salen), la plaza (la rueda
 * y los farolitos despegan), el clímax (cohetes, brazos arriba en la plaza y en la cumbre) y el cierre (chocolate en la plaza; queda el
 * farol del hito)— a la escala de `escala`. Devuelve `{ ms, pasos, farol }`: `pasos`, en orden de tiempo, cada uno `{ en, que, … }` con
 * `que` de entre `campana` ({ toques }), `vecinos` ({ cuadro }: 'salen', 'rueda', 'arriba', 'tres', 'chocolate'), `faroles`
 * ({ n, dura }), `cohetes` ({ n }), `cumbre` (los osos de arriba dan su saltito) y `tu` («Tú» levanta los brazos).
 * - `noche` (22:00 a 5:00): en el pueblo no hay nadie (regla del 35): sin vecinos; la campana, los farolitos y los cohetes sí.
 * - `lluvia` (las tardes de la lluviosa): sin farolitos.
 * - `efectos`: con «esenciales», cuadros quietos a saltos y un cohete que aparece y se apaga (sin farolitos volando); con «ninguno», nada
 *   (el estado final: la tarjeta y el farol).
 * - `ancho`: el de la escena; en el teléfono (< 700 px) el clímax es cielo y cumbre: tres cohetes como mucho.
 * - `conTu`: solo quien anota; para quien solo mira «Tú» no sale. El halving nunca lleva a «Tú» ni los brazos de la cumbre.
 * @param {'campamento' | 'principal' | 'intermedia' | 'halving'} escala
 * @param {{ noche?: boolean, lluvia?: boolean, efectos?: string, ancho?: number, conTu?: boolean }} [o]
 * @returns {{ ms: number, farol: boolean, pasos: Array<{ en: number, que: string, toques?: number, cuadro?: string, n?: number, dura?: number }> }}
 */
export function guionFiesta(escala, { noche = false, lluvia = false, efectos = 'todos', ancho = 390, conTu = false } = {}) {
  const farol = escala !== 'intermedia';
  if (efectos === 'ninguno') return { ms: 0, farol, pasos: [] };
  const ms = MS_FIESTA[escala], tel = ancho < 700, quieto = efectos !== 'todos', red = escala === 'halving';
  /** @type {Array<{ en: number, que: string, toques?: number, cuadro?: string, n?: number, dura?: number }>} */
  const pasos = [];
  const vec = (/** @type {number} */ en, /** @type {string} */ cuadro) => { if (!noche) pasos.push({ en, que: 'vecinos', cuadro }); };
  const far = (/** @type {number} */ en, /** @type {number} */ n, /** @type {number} */ dura) => { if (!lluvia && !quieto && n) pasos.push({ en, que: 'faroles', n, dura }); };
  const coh = (/** @type {number} */ en, /** @type {number} */ n) => { pasos.push({ en, que: 'cohetes', n: quieto ? 1 : n }); };
  if (escala === 'campamento') {
    pasos.push({ en: 0, que: 'campana', toques: 3 }); vec(0, 'salen');
    vec(5000, 'rueda'); far(5000, 7, 17_000);
    vec(10_000, 'arriba'); coh(10_000, tel ? 3 : 5); pasos.push({ en: 10_000, que: 'cumbre' });
    if (conTu) pasos.push({ en: 10_000, que: 'tu' });
    vec(16_000, 'chocolate');
  } else if (escala === 'principal' || red) {
    pasos.push({ en: 0, que: 'campana', toques: 2 }); vec(0, 'salen');
    vec(2500, red ? 'rueda' : 'rueda5'); far(2500, red ? 4 : 3, 8500);
    vec(5000, red ? 'arriba' : 'arriba5'); coh(5000, 1);
    if (!red) { pasos.push({ en: 5000, que: 'cumbre' }); if (conTu) pasos.push({ en: 5000, que: 'tu' }); }
  } else {
    // La intermedia, sobria (reabre el «ligera a propósito» del 21): un toque, tres osos con los brazos arriba y un farolito.
    pasos.push({ en: 0, que: 'campana', toques: 1 }); vec(1500, 'tres'); far(1500, 1, 4500);
  }
  return { ms, farol, pasos: pasos.sort((a, b) => a.en - b.en) };
}
/**
 * Dónde estallan los cohetes del clímax (pura). En escritorio, sobre la cumbre; en el teléfono, a los lados de «Tú» (la tarjeta tapa la
 * cumbre); en la tele, a la derecha de la cumbre (lejos del saldo y del reloj). Ninguno sube por encima de `techo` (el saldo y la
 * tarjeta) más 8 px ni se sale de la escena. `tu` y `cumbre`: {x, y}; `k`: la escala (1 en el escritorio; fiesta.js la saca del ancho de la plaza). [{ x, y, r, c }]: el
 * centro, el radio y el color (0–3).
 * @param {{ W: number, H: number, n: number, tu: { x: number, y: number }, cumbre: { x: number, y: number }, techo?: number, k?: number, tv?: boolean }} o
 * @returns {Array<{ x: number, y: number, r: number, c: number }>}
 */
export function palmasFiesta({ W, H, n, tu, cumbre, techo = 0, k = 1, tv = false }) {
  const s = Math.max(0.8, Math.min(2.2, k)), e = W < 700 ? 1.25 : 1;
  const c = cumbre, X = tu.x, Y = tu.y;
  const lista = tv
    ? [[c.x + 95 * s, c.y + 42 * s, 30 * s, 0], [c.x + 195 * s, c.y + 80 * s, 24 * s, 1], [c.x + 60 * s, c.y + 120 * s, 22 * s, 2], [c.x + 150 * s, c.y + 150 * s, 17 * s, 3], [c.x + 270 * s, c.y + 36 * s, 15 * s, 1]]
    : W >= 1100
      ? [[c.x - 62 * s, c.y + 46, 30 * s, 0], [c.x + 59 * s, c.y + 36, 26 * s, 1], [c.x - 10, Math.max(40 * s, c.y + 22), 36 * s, 2], [c.x + 95 * s, c.y + 78, 17 * s, 3], [c.x - 106 * s, c.y + 92, 15 * s, 1]]
      : [[X - 70 * s * e, Y + 10 * s, 26 * s * e, 0], [X + 66 * s * e, Y + 26 * s, 22 * s * e, 1], [X + 8 * s, Y - 80 * s * e, 30 * s * e, 2], [X - 100 * s * e, Y + 92 * s, 16 * s * e, 3], [X + 60 * s * e, Y + 120 * s, 14 * s * e, 1]];
  return lista.map(([x, y, r, col]) => ({ x, y, r, c: col }))
    .filter((p) => Number.isFinite(p.x + p.y + p.r) && p.y - p.r > techo + 8 && p.x - p.r > 2 && p.x + p.r < W - 2 && p.y + p.r < H - 2)
    .slice(0, n);
}
/**
 * (59) La fiesta que toca ver ahora con lo que dice el servidor (`/api/fiesta`: { dia, hito: { meta, rango, id } | null, halving }) y lo
 * que este aparato ya vio (`vista`: sus marcas opacas, «día#id» separadas por espacios, sin cifras). Al abrir, la familia ve la fiesta de un campamento o de una
 * etapa principal de hoy (la intermedia, sobria, solo la ve quien anota); el halving, una vez. null si no hay nada nuevo.
 * @param {{ dia?: string, hito?: { meta: number, rango?: string, id: number } | null, halving?: boolean } | null | undefined} f
 * @param {string} vista
 * @param {string} hoy
 * @returns {{ escala: 'campamento' | 'principal' | 'halving', meta: number | null, marca: string } | null}
 */
export function fiestaPorVer(f, vista, hoy) {
  if (!f || f.dia !== hoy) return null;
  const h = f.hito, visto = (vista || '').split(' ');
  if (h && escalaFiesta(h.meta) !== 'intermedia') {
    const marca = `${f.dia}#${h.id}`;
    if (!visto.includes(marca)) return { escala: /** @type {'campamento' | 'principal'} */ (escalaFiesta(h.meta)), meta: h.meta, marca };
  }
  if (f.halving && !visto.includes(`${f.dia}#halving`)) return { escala: 'halving', meta: null, marca: `${f.dia}#halving` };
  return null;
}
/**
 * (59) Si hoy queda encendido el farol del hito (hasta la medianoche): un campamento o una etapa principal cruzados hoy, o el halving.
 * @param {{ dia?: string, hito?: { meta: number } | null, halving?: boolean } | null | undefined} f
 * @param {string} hoy
 */
export const farolDelHito = (f, hoy) => Boolean(f && f.dia === hoy && ((f.hito && escalaFiesta(f.hito.meta) !== 'intermedia') || f.halving));

// ------------------------------------------------------------------ (Campamento E) el precio, a su ritmo: el ánimo del valle
/**
 * (E) Los cinco estados del valle según la semana del precio (la Manta, el sexto del diseño, queda fuera por ahora). Ninguno es mejor
 * que otro: si baja, el pueblo se junta y se arropa; si sube, sale al aire libre. Son repartos de los mismos vecinos (arte-vecinos.js:
 * `reparto`, opción `animo`), nunca un texto, un color de alarma ni el cielo; los brazos arriba, los cohetes y los farolitos siguen
 * siendo de los hitos.
 */
export const ANIMOS = /** @type {const} */ (['calma', 'fresco', 'abrigo', 'aire', 'plaza']);
/**
 * (E) Los umbrales (en %): la semana (el cierre frente al de siete días antes) y la distancia al máximo de los últimos 30 cierres. El
 * cambio de un solo día no cuenta. `vuelta`: para salir hay que volver un tercio hacia dentro del umbral (umbral × 2/3). `tope`: un
 * estado dura como mucho 7 días seguidos; después vuelve la calma y no regresa hasta que la medida salga y vuelva a entrar.
 */
export const UMBRAL_ANIMO = Object.freeze({ fresco: -11, abrigo: -21, lejos: 31, aire: 11, plaza: 21, vuelta: 2 / 3, tope: 7, ventana: 120 });
const NIVEL_ANIMO = /** @type {const} */ (['abrigo', 'fresco', 'calma', 'aire', 'plaza']); // nivel −2 … +2
/**
 * (E) El nivel de una medida (−2 abrigo, −1 fresco, 0 calma, +1 aire libre, +2 plaza), con los umbrales multiplicados por `q` (1 para
 * entrar, 2/3 para seguir). Si coinciden una caída lejos del máximo y una semana de subida (un rebote), manda la semana.
 * @param {number} sem
 * @param {number} dist
 * @param {number} q
 */
function nivelAnimo(sem, dist, q) {
  const U = UMBRAL_ANIMO;
  if (sem >= U.plaza * q) return 2;
  if (sem >= U.aire * q) return 1;
  if (sem <= U.abrigo * q || dist >= U.lejos * q) return -2;
  if (sem <= U.fresco * q) return -1;
  return 0;
}
/**
 * (E) ¿Sigue el estado `nivel` con su umbral de salir (dos tercios del de entrar)? Cada uno con su propia medida: fresco y aire libre
 * con la semana; abrigo con la semana o la distancia al máximo; plaza con la semana.
 * @param {number} nivel
 * @param {number} sem
 * @param {number} dist
 */
function sigueAnimo(nivel, sem, dist) {
  const U = UMBRAL_ANIMO, q = U.vuelta;
  if (nivel === 2) return sem >= U.plaza * q;
  if (nivel === 1) return sem >= U.aire * q;
  if (nivel === -2) return sem <= U.abrigo * q || dist >= U.lejos * q;
  return sem <= U.fresco * q;
}
/**
 * @param {string} f
 * @param {number} n
 */
const diasAntes = (f, n) => { const [y, m, d] = f.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10); };
/**
 * (E) Los estados día a día de una serie de cierres diarios (`[[AAAA-MM-DD, precio]…]`, en cualquier orden): para cada día con su
 * cierre de siete días antes, { fecha, sem, dist, medida, animo }. `medida` es el nivel con la vuelta (sin el tope); `animo`, lo que se
 * ve (con el tope). 100 % determinista: lo decide solo la serie. Sirve para `animoDelValle` y para la simulación del documento.
 * @param {Array<[string, number]> | null | undefined} serie
 * @returns {Array<{ fecha: string, sem: number, dist: number, medida: number, animo: typeof ANIMOS[number] }>}
 */
export function animosDeSerie(serie) {
  const U = UMBRAL_ANIMO, p = new Map();
  for (const [f, v] of serie ?? []) if (typeof f === 'string' && v > 0) p.set(f, v);
  const fechas = [...p.keys()].sort();
  /** @type {Array<{ fecha: string, sem: number, dist: number, medida: number, animo: typeof ANIMOS[number] }>} */
  const out = [];
  let cur = 0, racha = 0;
  for (const f of fechas) {
    const hoy = p.get(f), antes = p.get(diasAntes(f, 7));
    if (!antes) { cur = 0; racha = 0; continue; }
    let max = hoy;
    for (let i = 1; i < 30; i++) { const q = p.get(diasAntes(f, i)); if (q && q > max) max = q; }
    const sem = (hoy / antes - 1) * 100, dist = (1 - hoy / max) * 100;
    const entra = nivelAnimo(sem, dist, 1);
    let medida = entra;
    // Con un estado puesto, se queda mientras su propia medida no vuelva un tercio hacia dentro (abrigo de grado baja a fresco); sube de
    // grado solo con los umbrales de entrar. Si la semana entra del otro lado (un rebote), manda la semana.
    if (cur !== 0 && Math.sign(entra) !== -Math.sign(cur) && !(Math.sign(entra) === Math.sign(cur) && Math.abs(entra) > Math.abs(cur))) {
      if (sigueAnimo(cur, sem, dist)) medida = cur;
      else if (Math.abs(cur) === 2 && sigueAnimo(Math.sign(cur), sem, dist)) medida = Math.sign(cur);
    }
    racha = medida !== 0 && Math.sign(medida) === Math.sign(cur) ? racha + 1 : medida !== 0 ? 1 : 0;
    cur = medida;
    out.push({ fecha: f, sem, dist, medida, animo: racha > U.tope ? 'calma' : NIVEL_ANIMO[medida + 2] });
  }
  return out;
}
/**
 * (E) El ánimo del valle de hoy: el estado del último cierre completo (el de ayer o antes; nunca el precio vivo), así que cambia a lo
 * sumo una vez al día. Mira solo los cierres de los `ventana` días anteriores a hoy: el mismo resultado en cada aparato aunque cada uno
 * haya pedido el histórico desde otra fecha. Sin histórico suficiente o con el último cierre de hace más de tres días: 'calma' (el
 * interruptor de este aparato lo decide quien llama). Sale de precios públicos, nunca de las compras ni de nadie.
 * @param {Array<[string, number]> | null | undefined} historico
 * @param {string} [hoy]
 * @returns {typeof ANIMOS[number]}
 */
export function animoDelValle(historico, hoy = hoyISO()) {
  const desde = diasAntes(hoy, UMBRAL_ANIMO.ventana);
  const dias = animosDeSerie((historico ?? []).filter((x) => x[0] >= desde && x[0] < hoy));
  const ult = dias.at(-1);
  return ult && ult.fecha >= diasAntes(hoy, 3) ? ult.animo : 'calma';
}
