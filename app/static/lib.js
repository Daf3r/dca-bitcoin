// Cálculos y formatos sin DOM.

const nfUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const nfUSD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const nfInt = new Intl.NumberFormat('en-US');
const dfDia = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' });
const dfMes = new Intl.DateTimeFormat('es-SV', { month: 'long', year: 'numeric' });
const dfCorto = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' });
const dfHora = new Intl.DateTimeFormat('es-SV', { hour: 'numeric', minute: '2-digit' });

const signo = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
export const usd = (n) => nfUSD.format(n);
export const usd0 = (n) => nfUSD0.format(n);
export const usdSigno = (n) => signo(n) + nfUSD.format(Math.abs(n));
export const pct = (n) => signo(n) + Math.abs(n).toFixed(1) + '%';
export const entero = (n) => nfInt.format(Math.round(n));
export const btc = (sats) => (sats / 1e8).toFixed(8);
export const hora = (ts) => dfHora.format(new Date(ts));

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoyISO = () => iso(new Date());
export const aFecha = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const fechaLarga = (s) => dfDia.format(aFecha(s)).replace('.', '');
export const mesLargo = (s) => dfMes.format(aFecha(s));
export const fechaCorta = (s) => dfCorto.format(aFecha(s)).replace('.', '');

/** Acepta "1,234.56", "1234,5" o "$ 50". */
export function leerNumero(txt) {
  let s = String(txt ?? '').replace(/[^0-9.,]/g, '');
  if (!s) return null;
  if (s.includes('.')) s = s.replace(/,/g, '');
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function leerSats(txt) {
  const s = String(txt ?? '').replace(/[\s,._']/g, '');
  return /^\d{1,13}$/.test(s) && Number(s) > 0 ? Number(s) : null;
}

/**
 * Completa una compra a partir de lo que haya: con monto y sats basta; si falta
 * uno, se calcula con el precio escrito o, si no hay, con el precio en vivo.
 */
export function completar({ monto, sats, precio }, precioVivo) {
  if (monto && sats) return { monto, sats, precio: (monto * 1e8) / sats, estimado: false };
  if (!monto && !sats) return null;
  const p = precio || precioVivo;
  if (!p) return { falta: 'precio' };
  const estimado = !precio;
  if (sats) return { monto: Math.round((sats * p) / 1e6) / 100, sats, precio: p, estimado };
  return { monto, sats: Math.max(1, Math.round((monto / p) * 1e8)), precio: p, estimado };
}

/** Totales y acumulados en orden cronológico. */
export function resumir(compras, precioVivo) {
  const items = [...compras].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id - b.id));
  let inv = 0;
  let sats = 0;
  const acum = items.map((c) => {
    inv += c.monto;
    sats += c.sats;
    return { ...c, inv, satsAcum: sats };
  });
  const promedio = sats ? (inv * 1e8) / sats : null;
  const valor = sats && precioVivo ? (sats / 1e8) * precioVivo : null;
  const ganancia = valor == null ? null : valor - inv;
  return {
    items: acum,
    n: acum.length,
    inv,
    sats,
    promedio,
    valor,
    ganancia,
    ganPct: ganancia == null || !inv ? null : (ganancia / inv) * 100,
  };
}

/**
 * Puntos del gráfico: invertido y valor tras cada día con compras (valor con el
 * precio de ese día) y, si hay precio en vivo, un último punto hoy.
 */
export function serie(r, precioVivo) {
  const pts = [];
  for (const c of r.items) {
    const p = { fecha: c.fecha, inv: c.inv, valor: (c.satsAcum / 1e8) * c.precio };
    if (pts.length && pts.at(-1).fecha === c.fecha) pts[pts.length - 1] = p;
    else pts.push(p);
  }
  if (pts.length && precioVivo) {
    const hoy = hoyISO();
    const p = { fecha: hoy, inv: r.inv, valor: (r.sats / 1e8) * precioVivo, hoy: true };
    if (pts.at(-1).fecha >= hoy) pts[pts.length - 1] = p;
    else pts.push(p);
  }
  return pts;
}

/** Sats al mes según los últimos ~6 meses y cuánto falta para `tope` a ese ritmo. */
export function ritmo(items, sats, tope) {
  const dia = 864e5;
  const hoy = aFecha(hoyISO()).getTime();
  const desde = hoy - 182 * dia;
  const ventana = items.filter((c) => aFecha(c.fecha).getTime() >= desde);
  if (ventana.length < 3) return null;
  const dias = Math.max(30, (hoy - Math.max(desde, aFecha(items[0].fecha).getTime())) / dia);
  const porMes = (ventana.reduce((a, c) => a + c.sats, 0) / dias) * 30.44;
  return { porMes, meses: (tope - sats) / porMes };
}

/** Próxima potencia de 10 por encima de lo acumulado, como mínimo 1M sats. */
export const meta = (sats) => Math.max(1e6, 10 ** (Math.floor(Math.log10(Math.max(1, sats))) + 1));

export const nombreMeta = (m) =>
  m === 1e6 ? 'el primer millón'
    : m < 1e8 ? `los ${entero(m / 1e6)} millones`
      : m === 1e8 ? 'tu primer bitcoin entero'
        : `${entero(m / 1e8)} bitcoin`;

export const etiquetaSats = (v) =>
  v >= 1e8 ? `${entero(v / 1e8)} BTC` : v >= 1e6 ? `${entero(v / 1e6)}M` : `${entero(v / 1e3)}k`;
