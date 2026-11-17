import { avisar } from './avisar.js';
import { R, S, api, normalizar, vozLibro } from './estado.js';
import { pintarMercado, pintarSatsDolar, pintarValor, pintarVistas } from './mercado.js';
import { pintar, pintarLinea, pintarPrecio } from './pintar.js';
import { entradaTarjetas } from './entrada.js';
import { pintarCaida } from './reportes.js';
import { enTV, fiestaTV, teleDormida } from './tv.js';
import { actualizarFirmas } from './montana.js';

/**
 * Cada minuto, con la app abierta y a la vista, mira si hay movimientos nuevos (los de otra persona, o los tuyos desde otro dispositivo)
 * y solo repinta si algo cambió. No toca los avisos ni muestra errores: si falla, lo reintenta el minuto siguiente.
 */
export async function actualizarSuave() {
  if (!S.cargado || S.errorCarga) return;
  try {
    // (Las lecturas salen a la vez: ver `cargarCompras`.)
    const [crudas, traslados, wallets, mensajes, capsulas, piedritas, cumples, firmas, montana] = await Promise.all([
      api('/api/compras'),
      api('/api/traslados'),
      api('/api/wallets').catch(() => S.wallets),
      api('/api/mensajes').catch(() => S.mensajes),
      api('/api/capsulas').catch(() => S.capsulas),
      api('/api/piedritas').catch(() => S.piedritas),
      api('/api/cumples').catch(() => S.cumples),
      api('/api/firmas').catch(() => S.firmas),
      api('/api/montana').then((r) => r?.nombre ?? null).catch(() => S.montana),
    ]);
    const compras = crudas.map(normalizar);
    // Piedritas, cumpleaños, firmas del libro de cumbre y el nombre de la montaña: se repinta lo que los enseña, sin redibujar la montaña.
    if (JSON.stringify(piedritas) !== JSON.stringify(S.piedritas) || JSON.stringify(cumples) !== JSON.stringify(S.cumples) || JSON.stringify(firmas) !== JSON.stringify(S.firmas) || montana !== S.montana) {
      S.piedritas = piedritas; S.cumples = cumples; S.firmas = firmas; S.montana = montana;
      actualizarFirmas(firmas);
      pintar();
    }
    if (JSON.stringify(compras) === JSON.stringify(S.compras) && JSON.stringify(traslados) === JSON.stringify(S.traslados) && JSON.stringify(wallets) === JSON.stringify(S.wallets)
      && JSON.stringify(mensajes) === JSON.stringify(S.mensajes) && JSON.stringify(capsulas) === JSON.stringify(S.capsulas)) return;
    // Una compra nueva con la tele a la vista (idea 5): se celebra entera, como al anotarla.
    const antesSats = R.sats;
    const nuevas = compras.filter((c) => c.tipo === 'compra' && !S.compras.some((x) => x.id === c.id));
    S.compras = compras;
    S.traslados = traslados;
    S.wallets = wallets;
    S.mensajes = mensajes;
    S.capsulas = capsulas;
    if (enTV() && nuevas.length && !teleDormida()) { // (dormida, la tele no hace fiesta: al despertar ya está al día)
      const delta = nuevas.reduce((a, c) => a + c.sats, 0);
      pintar({ montana: true, desde: antesSats, festejo: { antes: antesSats, delta } });
      fiestaTV(antesSats, R.sats, delta);
    } else pintar({ montana: true });
  } catch { /* en silencio */ }
}

export async function cargarCompras() {
  const teniaError = S.errorCarga;
  try {
    // Rendimiento: las lecturas salen A LA VEZ (antes iban una tras otra: siete viajes de red antes de ver el saldo, lo que en
    // un teléfono con datos móviles es más de un segundo de espera). Si fallan las compras, falla todo, como antes; cada una de las
    // demás conserva lo que había si falla (dónde están los sats, frases de las banderas y cartas, apacheta y cumpleaños).
    const [compras, traslados, wallets, mensajes, capsulas, piedritas, cumples, firmas, montana] = await Promise.all([
      api('/api/compras'),
      api('/api/traslados').catch(() => S.traslados),
      api('/api/wallets').catch(() => S.wallets),
      api('/api/mensajes').catch(() => S.mensajes),
      api('/api/capsulas').catch(() => S.capsulas),
      api('/api/piedritas').catch(() => S.piedritas),
      api('/api/cumples').catch(() => S.cumples),
      api('/api/firmas').catch(() => S.firmas),
      api('/api/montana').then((r) => r?.nombre ?? null).catch(() => S.montana),
    ]);
    S.compras = compras.map(normalizar);
    S.traslados = traslados;
    S.wallets = wallets;
    S.mensajes = mensajes;
    S.capsulas = capsulas;
    S.piedritas = piedritas;
    S.cumples = cumples;
    S.firmas = firmas;
    S.montana = montana;
    S.errorCarga = false;
    if (teniaError) avisar(''); // solo se quita el aviso de error propio: un «Deshacer» o un «Reconectando…» a la vista se quedan
  } catch (e) {
    S.errorCarga = true;
    avisar(`No se pudieron cargar ${vozLibro() ? 'las compras' : 'tus compras'}. ${e.status === 0 ? e.message : ''}`.trim(), cargarCompras);
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
