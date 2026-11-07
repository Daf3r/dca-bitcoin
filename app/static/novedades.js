import { btc, entero, fechaCorta, novedades, pct, usd, usdSigno } from './lib.js';
import { ofrecerAvisos } from './cuenta.js';
import { $, R, S, api } from './estado.js';
import { progresoEtapa } from './pintar.js';
import { nombreMeta, rachaTxt } from './reportes.js';

// ------------------------------------------------------------- novedades
// Para los lectores: al abrir la web, un resumen de lo que pasó desde su última visita (si pasó algo).
// «Entendido» (o cerrar) lo marca como visto en el servidor, así que sale igual desde el móvil y el PC.
const dNov = $('d-novedades');
export let novedadesMostradas = false;
export function pintarNovedades() {
  // Espera al precio (o a su error) para poder decir cuánto vale; pintar() vuelve a llamar cuando llega.
  if (novedadesMostradas || S.rol !== 'lector' || !S.cargado || S.visto === undefined || !(S.precio || S.errorPrecio) || dNov.open) return;
  novedadesMostradas = true;
  const n = novedades(R.items, S.visto);
  if (!n) return;
  $('nov-titulo').textContent = n.primera ? 'Así va el libro' : `Desde tu última visita${n.dias > 0 ? ` (hace ${n.dias} ${n.dias === 1 ? 'día' : 'días'})` : ''}`;
  const partes = [n.compras && `${n.compras} ${n.compras === 1 ? 'compra' : 'compras'}`, n.ventas && `${n.ventas} ${n.ventas === 1 ? 'venta' : 'ventas'}`].filter(Boolean);
  $('nov-sub').textContent = n.primera ? 'Los últimos movimientos:' : `${partes.join(' y ')} ${n.compras + n.ventas === 1 ? 'nueva' : 'nuevas'}:`;
  const lista = $('nov-lista');
  lista.textContent = '';
  for (const c of n.nuevos) {
    const li = document.createElement('li');
    li.textContent = `${fechaCorta(c.fecha)} · ${c.tipo === 'venta' ? '−' : '+'}${entero(c.sats)} sats (${usd(c.monto)})${c.nota ? ` · ${c.nota}` : ''}${c.tipo === 'venta' ? ' · venta' : ''}`;
    lista.append(li);
  }
  if (n.masNuevos) { const li = document.createElement('li'); li.textContent = `y ${n.masNuevos} más`; lista.append(li); }
  const filas = [['Saldo', `${entero(R.sats)} sats`], ['En BTC', `${btc(R.sats)} BTC`]];
  if (R.valor != null) {
    filas.push(['Vale hoy', usd(R.valor)]);
    filas.push(['Ganancia', `${usdSigno(R.gan)}${R.pct == null ? '' : ` (${pct(R.pct)})`}`]);
    if (R.nVentas) filas.push(['Ya realizada', usdSigno(R.realizada)]);
  }
  filas.push(['Avance', `${Math.floor(Math.max(0, Math.min(1, progresoEtapa())) * 100)}% del camino a ${nombreMeta(R.etapa)}`]);
  if (R.racha) filas.push(['Racha', `${rachaTxt(R.racha)} ${R.racha === 1 ? 'seguida' : 'seguidas'}`]);
  const dl = $('nov-resumen');
  dl.textContent = '';
  for (const [k, v] of filas) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k; dd.textContent = v;
    dl.append(dt, dd);
  }
  dNov.showModal();
}
$('nov-ok').addEventListener('click', () => dNov.close());
dNov.addEventListener('close', async () => {
  try { S.visto = (await api('/api/visto', { metodo: 'POST', cuerpo: {} })).visto; } catch { /* sin red: saldrá otra vez */ }
  ofrecerAvisos(); // tras la bienvenida del lector
});
