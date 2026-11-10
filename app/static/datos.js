import { avisar } from './avisar.js';
import { R, S, api, normalizar } from './estado.js';
import { pintarMercado, pintarSatsDolar, pintarValor, pintarVistas } from './mercado.js';
import { pintar, pintarLinea, pintarPrecio } from './pintar.js';
import { entradaTarjetas } from './entrada.js';
import { pintarCaida } from './reportes.js';

/**
 * Cada minuto, con la app abierta y a la vista, mira si hay movimientos nuevos (los de otra persona, o los tuyos desde otro dispositivo)
 * y solo repinta si algo cambió. No toca los avisos ni muestra errores: si falla, lo reintenta el minuto siguiente.
 */
export async function actualizarSuave() {
  if (!S.cargado || S.errorCarga) return;
  try {
    const compras = (await api('/api/compras')).map(normalizar);
    const traslados = await api('/api/traslados');
    if (JSON.stringify(compras) === JSON.stringify(S.compras) && JSON.stringify(traslados) === JSON.stringify(S.traslados)) return;
    S.compras = compras;
    S.traslados = traslados;
    pintar({ montana: true });
  } catch { /* en silencio */ }
}

export async function cargarCompras() {
  const teniaError = S.errorCarga;
  try {
    S.compras = (await api('/api/compras')).map(normalizar);
    S.traslados = await api('/api/traslados').catch(() => S.traslados); // dónde están los sats; si falla, lo demás sigue
    S.errorCarga = false;
    if (teniaError) avisar(''); // solo se quita el aviso de error propio: un «Deshacer» o un «Reconectando…» a la vista se quedan
  } catch (e) {
    S.errorCarga = true;
    avisar(`No se pudieron cargar tus compras. ${e.status === 0 ? e.message : ''}`.trim(), cargarCompras);
  }
  const primeraVez = !S.cargado;
  S.cargado = true;
  pintar({ montana: true, animar: primeraVez });
  if (primeraVez) { entradaTarjetas(); cargarHistorico(); }
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
  pintarVistas();
  pintarPrecio(); // la variación desde ayer sale del histórico
  if (S.cargado && !(S.errorCarga && !R.n)) pintarLinea(); // y la mini línea del valor
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
