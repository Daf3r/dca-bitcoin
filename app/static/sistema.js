import { $, api } from './estado.js';
import { avisar } from './avisar.js';
import { ESTADO_FPS, PALABRA_FPS, REGLA_LENTO, veredictoFps } from './lib.js';

// «Estado del sistema» (ideas 53, 145, 96, 74, 46): una vista de «Tu cuenta» solo para el admin. Muestra estados y fechas, nunca claves ni
// contenido de las compras. Cada fila lleva una palabra («Bien», «Revisar», «Falla») además del símbolo: no depende del color.
const MARCA = { ok: ['✔', 'Bien'], aviso: ['!', 'Revisar'], mal: ['✘', 'Falla'] };

export function hace(ts, ahora) {
  const s = Math.max(0, ahora - ts);
  if (s < 90) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 90) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}
function gb(bytes) {
  const g = bytes / 1024 ** 3;
  return g >= 10 ? `${Math.round(g)} GB` : `${g.toFixed(1)} GB`;
}
export function fila(estado, titulo, detalle, palabraPropia = null) {
  const li = document.createElement('li');
  li.className = 'sis-fila';
  li.dataset.estado = estado;
  const ico = Object.assign(document.createElement('span'), { className: 'sis-ico', textContent: MARCA[estado][0] });
  ico.setAttribute('aria-hidden', 'true');
  const cuerpo = document.createElement('span');
  const t = Object.assign(document.createElement('b'), { textContent: titulo });
  const palabra = Object.assign(document.createElement('span'), { className: 'sis-palabra', textContent: ` · ${palabraPropia ?? MARCA[estado][1]}` });
  const d = Object.assign(document.createElement('small'), { textContent: detalle });
  cuerpo.append(t, palabra, document.createElement('br'), d);
  li.append(ico, cuerpo);
  return li;
}

// ---- Medidas de los aparatos (campamento 24, idea 44): la prueba de «Medir este aparato» (/medir, medir.js). Cada fila dice con palabra y
// símbolo si fue fluido, para revisar o lento (la regla del dueño: 55 y 50 fotogramas por segundo); un «Lento» dice qué se revisaría.
const VISIBLES = 5; // las más recientes; las demás (hasta 50) van plegadas
const segundos = (ms) => `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
export function filaMedida(m, ahora) {
  const v = veredictoFps(m);
  // La cifra del título es la que decide: la peor de toda la prueba y del rato con la montaña a la vista (la parte pesada).
  const titulo = `${v.fps} fps · ${m.agente}${m.instalada ? ' (app)' : ''}`;
  const f = Math.round(m.fps), e = m.fps_escena == null ? null : Math.round(m.fps_escena);
  const partes = [`${segundos(m.saldo_ms)} hasta ver el saldo`];
  if (e != null && e < f) partes.push(`con la montaña a la vista (${f} en toda la prueba)`);
  partes.push(`el peor medio segundo, ${Math.round(m.fps_peor)} fps`, `${m.tirones} ${m.tirones === 1 ? 'tirón' : 'tirones'}`);
  let detalle = `${partes.join(' · ')}. ${hace(m.creado, ahora)[0].toUpperCase()}${hace(m.creado, ahora).slice(1)} · ${m.ancho} × ${m.alto} ×${m.dpr} · efectos ${m.efectos}${m.ligero ? ' (modo ligero)' : ''} · ${m.tema}.`;
  if (v.limitada) detalle += ` La pantalla ya iba a ${m.hz} Hz en reposo (¿ahorro de batería?): así no se puede juzgar.`;
  if (v.estado === 'lento') detalle += ` ${REGLA_LENTO}`;
  const li = fila(ESTADO_FPS[v.estado], titulo, detalle, PALABRA_FPS[v.estado]);
  li.classList.add('sis-medida');
  li.dataset.veredicto = v.estado;
  return li;
}
function pintarMedidas(medidas, ahora) {
  const lista = $('sis-med'), mas = $('sis-med-mas');
  lista.replaceChildren(...(medidas.length ? medidas.slice(0, VISIBLES).map((m) => filaMedida(m, ahora))
    : [Object.assign(document.createElement('li'), { className: 'vacio', textContent: 'Aún no hay medidas. En el aparato que quieras medir (el iPhone, sobre todo), abre aquí «Medir este aparato».' })]));
  const resto = medidas.slice(VISIBLES);
  mas.hidden = !resto.length;
  $('sis-med-mas-t').textContent = `${resto.length} ${resto.length === 1 ? 'medida anterior' : 'medidas anteriores'}`;
  $('sis-med-resto').replaceChildren(...resto.map((m) => filaMedida(m, ahora)));
  $('sis-med-borrar').hidden = !medidas.length;
  borrarListo(false);
}
// Borrar las medidas pide un segundo toque («Sí, borrar…»): no tiene «Deshacer».
let confirmar = 0;
function borrarListo(pedir, n = 0) {
  clearTimeout(confirmar);
  const b = $('sis-med-borrar');
  b.textContent = pedir ? `Sí, borrar ${n === 1 ? 'la medida' : `las ${n} medidas`}` : 'Borrar las medidas';
  b.dataset.confirmar = pedir ? '1' : '';
  if (pedir) confirmar = setTimeout(() => borrarListo(false), 6000);
}
$('sis-medir').addEventListener('click', () => location.assign('/medir'));
$('sis-med-borrar').addEventListener('click', async () => {
  const b = $('sis-med-borrar');
  if (!b.dataset.confirmar) { borrarListo(true, $('sis-med').querySelectorAll('.sis-fila').length + $('sis-med-resto').children.length); return; }
  borrarListo(false);
  try { await api('/api/medidas', { metodo: 'DELETE' }); avisar('Medidas borradas.', null, true); } catch (err) { avisar(`No se pudieron borrar. ${err.message}`); }
  pintarSistema();
});
const SENTIDO_CAT = { movimiento: 'movimientos', hito: 'hitos', recordatorio: 'recordatorio', txid: 'TXID', respaldo: 'respaldo y sistema', caida: 'gran caída' };

export function filasDelEstado(e) {
  const ahora = e.ahora, f = [];
  f.push(e.cuentas.length
    ? fila('mal', 'Tus cuentas', `Algo no cuadra: ${e.cuentas.join(' ')} La app no corrige nada sola: revisa tus compras, ventas y traslados.`)
    : fila('ok', 'Tus cuentas', 'El saldo nunca queda en negativo y la wallet no tiene más sats de los que hay.'));
  f.push(e.respaldo.ultimo
    ? fila(e.respaldo.ok ? 'ok' : 'mal', 'Último respaldo', `${hace(e.respaldo.ultimo, ahora)}.${e.respaldo.ok ? '' : ' Pasó más de un día y medio: revisa el servicio de respaldos.'}`)
    : fila('mal', 'Último respaldo', 'Todavía no hay ninguno. Revisa el servicio de respaldos.'));
  const pr = e.respaldo.prueba;
  f.push(pr ? fila(pr.bien ? 'ok' : 'mal', 'Prueba de restauración', `${pr.bien ? 'Salió bien' : 'Encontró problemas'}, ${hace(pr.ts, ahora)} (se repite cada semana).`)
    : fila('aviso', 'Prueba de restauración', 'Todavía no se ha hecho (corre sola cada semana).'));
  f.push(e.avisos.latido
    ? fila(e.avisos.vivo ? 'ok' : 'mal', 'Servicio de avisos', e.avisos.vivo ? `Vivo, su última marca fue ${hace(e.avisos.latido, ahora)}.` : `No responde desde ${hace(e.avisos.latido, ahora)}: mira «docker compose logs avisos».`)
    : fila('mal', 'Servicio de avisos', 'Nunca dejó su marca de «sigo vivo».'));
  const i = e.integridad;
  f.push(i.estado === 'ok' ? fila('ok', 'Base de datos', `Pasó su revisión de integridad (${i.cuando}). Esquema versión ${e.esquema}.`)
    : i.estado === 'mal' ? fila('mal', 'Base de datos', `La revisión de integridad encontró un problema (${i.cuando}). Restaura desde un respaldo.`)
      : fila('aviso', 'Base de datos', `Aún sin revisión de integridad (corre sola cada semana). Esquema versión ${e.esquema}.`));
  const d = e.disco;
  const pocoDisco = d.libre < 1024 ** 3 || (d.pct_libre ?? 100) < 10;
  f.push(fila(pocoDisco ? 'aviso' : 'ok', 'Espacio en disco', `${gb(d.libre)} libres de ${gb(d.total)} (${d.pct_libre ?? '?'} %).`));
  f.push(fila('ok', 'Versión', `Archivos ${e.version}${e.commit ? ` · commit ${e.commit}` : ' · sin commit (despliega con VERSION_GIT, ver el README)'}.`));
  return f;
}

export async function pintarSistema() {
  const res = $('sis-res');
  res.textContent = 'Cargando…';
  let e;
  try { e = await api('/api/sistema'); } catch (err) { res.textContent = `No se pudo cargar. ${err.message}`; return; }
  const filas = filasDelEstado(e);
  const revisar = filas.filter((li) => li.dataset.estado !== 'ok').length;
  res.textContent = revisar ? `${revisar} ${revisar === 1 ? 'cosa por revisar' : 'cosas por revisar'}.` : 'Todo en orden.';
  $('sis-lista').replaceChildren(...filas);
  pintarMedidas(e.medidas ?? [], e.ahora);
  $('sis-disp').replaceChildren(...(e.dispositivos.length ? e.dispositivos.map((x) => {
    const sano = x.fallos < 3;
    const cats = x.categorias.map((c) => SENTIDO_CAT[c] ?? c).join(', ') || 'ninguna';
    return fila(sano ? 'ok' : 'aviso', `${x.usuario} · ${x.tipo}`,
      `${x.ultimo_ok ? `Último envío ${hace(x.ultimo_ok, e.ahora)}` : 'Aún sin envíos'}${x.fallos ? ` · ${x.fallos} ${x.fallos === 1 ? 'fallo' : 'fallos'} seguidos` : ''}. Avisos: ${cats}.`);
  }) : [Object.assign(document.createElement('li'), { className: 'vacio', textContent: 'Nadie ha activado avisos todavía.' })]));
  $('sis-met').replaceChildren(...e.metricas.map((m) => {
    const tr = document.createElement('tr');
    for (const [k, v] of [['ruta', m.ruta], ['n', m.n.toLocaleString('en-US')], ['medio', `${m.ms_medio} ms`], ['max', `${m.ms_max} ms`], ['lentas', m.lentas], ['err', m.errores]]) {
      const td = document.createElement(k === 'ruta' ? 'th' : 'td');
      if (k === 'ruta') td.scope = 'row';
      if (k === 'ruta') String(v).split('/').forEach((t, i) => { if (i) td.append('/', document.createElement('wbr')); td.append(t); });
      else td.textContent = String(v);
      tr.append(td);
    }
    return tr;
  }));
  $('sis-err').replaceChildren(...(e.errores.length ? e.errores.map((x) => fila('aviso', `${x.mensaje}`,
    `${x.pantalla} · ${x.agente}${x.usuario ? ` · ${x.usuario}` : ''} · ${hace(x.ultimo, e.ahora)}${x.n > 1 ? ` · ${x.n} veces` : ''}`))
    : [Object.assign(document.createElement('li'), { className: 'vacio', textContent: 'Sin errores. Los de cualquier dispositivo aparecen aquí.' })]));
  $('sis-err-limpiar').hidden = !e.errores.length;
}
$('sis-err-limpiar').addEventListener('click', async () => {
  try { await api('/api/errores', { metodo: 'DELETE' }); avisar('Lista de errores limpiada.', null, true); } catch (err) { avisar(`No se pudo limpiar. ${err.message}`); }
  pintarSistema();
});
