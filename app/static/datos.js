import { avisar } from './avisar.js';
import { R, S, api, normalizar } from './estado.js';
import { pintarMercado, pintarSatsDolar, pintarValor } from './mercado.js';
import { pintar, pintarPrecio } from './pintar.js';
import { pintarCaida } from './reportes.js';

export async function cargarCompras() {
  try {
    S.compras = (await api('/api/compras')).map(normalizar);
    S.traslados = await api('/api/traslados').catch(() => S.traslados); // dónde están los sats; si falla, lo demás sigue
    S.errorCarga = false;
    avisar('');
  } catch (e) {
    S.errorCarga = true;
    avisar(`No se pudieron cargar tus compras. ${e.status === 0 ? e.message : ''}`.trim(), cargarCompras);
  }
  const primeraVez = !S.cargado;
  S.cargado = true;
  pintar({ montana: true, animar: primeraVez });
  if (primeraVez) cargarHistorico();
}

/** Desde la primera compra (o un año, si es más reciente), con el tope de 10 años del servidor. */
export function desdeHistorico() {
  const hoy = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const anio = iso(new Date(hoy - 365 * 864e5));
  const tope = iso(new Date(hoy - 3650 * 864e5));
  const primera = R.items[0]?.fecha;
  return primera && primera < anio ? (primera < tope ? tope : primera) : anio;
}

export async function cargarHistorico(intento = 0) {
  const desde = desdeHistorico();
  try {
    const j = await api(`/api/historico?desde=${desde}`);
    S.historico = j.precios;
    S.histDesde = desde;
    // El servidor rellena en segundo plano: se vuelve a preguntar mientras diga «cargando».
    if (j.cargando && intento < 10) setTimeout(() => cargarHistorico(intento + 1), 3000);
    S.histEstado = j.precios.length > 1 ? 'ok' : j.cargando && intento < 10 ? 'cargando' : 'error';
  } catch {
    S.histEstado = S.historico.length > 1 ? 'ok' : 'error';
  }
  pintarMercado();
  pintarValor();
  pintarPrecio(); // la variación desde ayer sale del histórico
  pintarSatsDolar();
  pintarCaida();
}

export async function consultarPrecio() {
  try {
    const j = await api('/api/precio');
    Object.assign(S, { precio: j.precio, precioTs: j.ts, fuente: j.fuente, viejo: j.viejo, errorPrecio: false });
  } catch {
    S.errorPrecio = true;
  }
  pintar();
}
