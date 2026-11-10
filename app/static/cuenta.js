import { entero, fechaLarga, usd } from './lib.js';
import { montarAvisos } from './avisos.js';
import { avatar, ilustracion } from './iconos.js';
import { avisar } from './avisar.js';
import { $, S, api } from './estado.js';
import { conTransicion, sinMovimiento } from './movimiento.js';
import { novedadesMostradas } from './novedades.js';
import { atajosActivos, fijarAtajos } from './atajos.js';
import { fijarTituloConSaldo, pintar, tituloConSaldo } from './pintar.js';

let avisosOfrecidos = false; // la oferta de avisos sale una sola vez por visita (y una por dispositivo, ver avisos.js)
// ---------------------------------------------------------------- arranque
// ------------------------------------------------------------------ cuenta
const dfAudit = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const dCuenta = $('d-cuenta');
function vistaCuenta(cual) {
  $('dc-menu').hidden = cual !== 'menu';
  $('f-clave').hidden = cual !== 'clave';
  $('dc-hist').hidden = cual !== 'historial';
  $('dc-avisos').hidden = cual !== 'avisos';
}
/** Cambia de vista dentro de «Tu cuenta» con la transición nativa; `despues` corre cuando la vista ya está a la vista. */
const irA = (cual, despues) => conTransicion(() => { vistaCuenta(cual); despues?.(); });
/** El avatar de la persona y su texto (con `textContent`: el nombre nunca se interpreta como HTML). */
function conAvatar(el, nombre, texto, opciones) {
  el.innerHTML = avatar(nombre, opciones);
  const t = document.createElement('span');
  t.textContent = texto;
  el.append(t);
}
export async function cargarYo() {
  try {
    const yo = await api('/api/yo');
    Object.assign(S, { usuario: yo.usuario, rol: yo.rol, visto: yo.visto ?? null });
    document.body.dataset.rol = yo.rol;
    conAvatar($('cuenta-btn'), yo.usuario, yo.usuario);
    $('cuenta-btn').setAttribute('aria-label', `Tu cuenta: ${yo.usuario}`);
    $('cuenta-btn').hidden = false;
    pintarSaludo(yo.usuario);
    conAvatar($('dc-quien'), yo.usuario, `${yo.usuario} · ${yo.rol === 'admin' ? 'administrador' : 'solo lectura'}`, { grande: true });
    $('dc-historial').hidden = yo.rol !== 'admin';
    $('dc-previa').hidden = yo.rol !== 'admin'; // vista previa temporal
    $('fc-usuario').value = yo.usuario;
    pintar();
  } catch { /* el 401 ya redirige; si falla la red, la app sigue en solo lectura */ }
}
/** «Buenas noches, Daf3r»: según la hora de El Salvador (cielo.js). Se renueva cada 5 minutos y al volver a la pestaña. */
let nombreSaludo = '';
function pintarSaludo(nombre = nombreSaludo) {
  nombreSaludo = nombre;
  const cielo = window.libroCielo;
  if (!cielo || !nombre) return;
  $('saludo').textContent = `${cielo.saludo(cielo.hora())}, ${nombre}`;
}
setInterval(() => document.visibilityState === 'visible' && pintarSaludo(), 300_000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && pintarSaludo());

// Tema: automático (como el teléfono), claro u oscuro. `tema.js` lo aplica antes de pintar; aquí solo se elige.
const NOMBRE_TEMA = { auto: 'automático', claro: 'claro', oscuro: 'oscuro' };
const SIGUIENTE_TEMA = { auto: 'claro', claro: 'oscuro', oscuro: 'auto' };
/** Los colores se funden (0.35 s) solo al cambiar el tema a mano; nunca en la carga, para no tener parpadeo. */
let fundidoTimer = 0;
function fundirTema() {
  if (sinMovimiento()) return;
  const raiz = document.documentElement;
  raiz.classList.add('tema-fundido');
  clearTimeout(fundidoTimer);
  fundidoTimer = setTimeout(() => raiz.classList.remove('tema-fundido'), 450);
}
const etiquetaTitulo = () => { $('dc-titulo').textContent = `Título de la pestaña: ${tituloConSaldo() ? 'con saldo y precio' : 'sin saldo'}`; };
// Tamaño de letra (normal → grande → muy grande) y contraste (automático → alto → normal): `accesibilidad.js` los aplica antes de pintar.
const NOMBRE_LETRA = { '': 'normal', grande: 'grande', 'muy-grande': 'muy grande' };
const SIGUIENTE_LETRA = { '': 'grande', grande: 'muy-grande', 'muy-grande': '' };
const NOMBRE_CONTRASTE = { auto: 'automático', alto: 'alto', normal: 'normal' };
const SIGUIENTE_CONTRASTE = { auto: 'alto', alto: 'normal', normal: 'auto' };
function etiquetasAccesibilidad() {
  const acc = window.libroAcc;
  $('dc-letra').textContent = `Tamaño de letra: ${NOMBRE_LETRA[acc?.letra() ?? '']}`;
  const c = acc?.contraste() ?? 'auto';
  $('dc-contraste').textContent = `Contraste: ${NOMBRE_CONTRASTE[c]}${c === 'auto' && acc?.contrasteAlto() ? ' (alto, como pide el sistema)' : ''}`;
  $('dc-atajos').textContent = `Atajos de teclado: ${atajosActivos() ? 'activados' : 'apagados'}`;
}
/** El cambio de tema con la tecla T (atajos.js) pasa por aquí para tener el mismo fundido. */
export function siguienteTema() {
  fundirTema();
  window.libroTema?.fijar(SIGUIENTE_TEMA[window.libroTema.preferencia()]);
}
const etiquetaTema = () => { $('dc-tema').textContent = `Tema: ${NOMBRE_TEMA[window.libroTema?.preferencia() ?? 'auto']}`; };
// Efectos: automático (según el teléfono y el sistema), todos, esenciales o ninguno. `efectos.js` lo aplica antes de pintar.
const SIGUIENTE_EFECTOS = { auto: 'todos', todos: 'esenciales', esenciales: 'ninguno', ninguno: 'auto' };
function etiquetaEfectos() {
  const ef = window.libroEfectos;
  const pref = ef?.preferencia() ?? 'auto';
  let txt = pref === 'auto' ? 'automático' : pref;
  if (pref === 'auto' && ef) {
    if (ef.efectivo() === 'ninguno') txt += ' (sin movimiento)';
    else if (ef.efectivo() === 'esenciales') txt += ' (modo ligero)';
  }
  $('dc-efectos').textContent = `Efectos: ${txt}`;
}
$('cuenta-btn').addEventListener('click', () => { vistaCuenta('menu'); etiquetaTema(); etiquetaEfectos(); etiquetaTitulo(); etiquetasAccesibilidad(); dCuenta.showModal(); });

const txCorto = (t) => (t ? `${t.slice(0, 8)}…${t.slice(-6)}` : 'sin TXID');
/** Describe un movimiento de la auditoría: «20,000 sats ($15.52) del 4 nov 2026 · TXID 01234567…abcdef · «nota»». */
function textoMov(x) {
  if (!x?.sats) return '';
  return `${entero(x.sats)} sats (${usd(x.monto)}) del ${fechaLarga(x.fecha)}` +
    (x.extra ? ' · compra extra' : '') + (x.txid ? ` · TXID ${txCorto(x.txid)}` : '') + (x.nota ? ` · «${x.nota}»` : '');
}
/** Qué cambió en una edición: solo los campos que difieren. */
function cambiosEdicion(antes, despues) {
  if (!antes || !despues) return '';
  const c = [];
  if (antes.sats !== despues.sats) c.push(`${entero(antes.sats)} → ${entero(despues.sats)} sats`);
  if (antes.monto !== despues.monto) c.push(`${usd(antes.monto)} → ${usd(despues.monto)}`);
  if (antes.fecha !== despues.fecha) c.push(`fecha ${fechaLarga(antes.fecha)} → ${fechaLarga(despues.fecha)}`);
  if ((antes.txid ?? null) !== (despues.txid ?? null)) c.push(`TXID ${txCorto(antes.txid)} → ${txCorto(despues.txid)}`);
  if (!!antes.extra !== !!despues.extra) c.push(despues.extra ? 'marcada como extra' : 'ya no es extra');
  if ((antes.nota ?? null) !== (despues.nota ?? null)) c.push(`nota ${antes.nota ? `«${antes.nota}»` : 'vacía'} → ${despues.nota ? `«${despues.nota}»` : 'vacía'}`);
  return c.join(' · ') || 'sin cambios visibles';
}
function textoAuditoria(a) {
  const d = a.despues || a.antes || {};
  if (a.entidad === 'traslado') {
    const dir = d.sentido === 'a_exchange' ? 'de su wallet al exchange' : 'a su wallet';
    return a.accion === 'alta' ? `anotó un traslado de ${entero(d.sats)} sats ${dir}` : `anuló el traslado de ${entero(d.sats)} sats ${dir}`;
  }
  const venta = d.tipo === 'venta';
  const mov = venta ? 'la venta' : 'la compra';
  return {
    alta: venta ? `registró una venta de ${textoMov(d)}` : `anotó ${textoMov(d)}`,
    edicion: `corrigió ${mov} del ${a.antes ? fechaLarga(a.antes.fecha) : ''}: ${cambiosEdicion(a.antes, a.despues)}`,
    anulacion: `anuló ${mov} de ${textoMov(d)}`,
    importacion: `importó ${d.nuevas} ${d.nuevas === 1 ? 'movimiento' : 'movimientos'}`,
    login: 'entró', logout: 'salió', logout_todas: 'salió en todos los dispositivos',
    login_fallido: a.entidad === 'ip' ? 'falló varias veces al entrar desde una misma red' : 'falló al entrar',
    bloqueo: a.entidad === 'ip' ? 'quedó bloqueado desde una red por demasiados intentos' : 'quedó bloqueado unos minutos por demasiados intentos',
    clave_cambiada: `cambió la contraseña de ${d.nombre}`,
    cuenta_creada: `creó la cuenta ${d.nombre} (${d.rol})`,
    cuenta_activada: `activó la cuenta ${d.nombre}`, cuenta_desactivada: `desactivó la cuenta ${d.nombre}`,
    sesiones_cerradas: `cerró las sesiones de ${d.nombre}`, desbloqueo: `desbloqueó la cuenta ${d.nombre}`,
  }[a.accion] ?? a.accion;
}
let histUltimo = null;
async function cargarHistorial(mas = false) {
  const lista = $('hist-lista');
  if (!mas) { lista.textContent = ''; histUltimo = null; }
  try {
    const filas = await api(`/api/auditoria${histUltimo ? `?antes=${histUltimo}` : ''}`);
    for (const a of filas) {
      const li = document.createElement('li');
      const t = document.createElement('time');
      t.textContent = dfAudit.format(new Date(a.ts * 1000)).replace('.', '');
      const p = document.createElement('p');
      const b = document.createElement('b');
      const neutro = a.usuario === 'cli' || a.usuario === '?';
      b.textContent = a.usuario === 'cli' ? 'Servidor' : a.usuario === '?' ? 'Alguien' : a.usuario;
      p.append(b, ` ${textoAuditoria(a)}`);
      li.insertAdjacentHTML('beforeend', avatar(b.textContent, { neutro }));
      li.append(t, p);
      lista.append(li);
    }
    histUltimo = filas.at(-1)?.id ?? histUltimo;
    $('hist-mas').hidden = filas.length < 100;
    if (!lista.children.length) lista.innerHTML = `<li class="vacio con-ilu">${ilustracion('montana')}Aún no hay nada en el historial.</li>`;
  } catch (e) {
    lista.innerHTML = '';
    const li = document.createElement('li'); li.className = 'vacio'; li.textContent = e.message; lista.append(li);
  }
}
$('hist-mas').addEventListener('click', () => cargarHistorial(true));
const avisosUI = montarAvisos(api);
// Tras entrar: una sola vez por dispositivo se ofrece activar los avisos. Los lectores primero ven su bienvenida.
export async function ofrecerAvisos() {
  if (avisosOfrecidos || !S.rol || !S.cargado || document.querySelector('dialog[open]')) return;
  if (S.rol === 'lector' && !novedadesMostradas) return;
  avisosOfrecidos = true;
  if (await avisosUI.ofrecer(S.rol)) avisar('Avisos activados en este dispositivo.', null, true);
}

dCuenta.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cuenta]');
  if (!b) return;
  const accion = b.dataset.cuenta;
  if (accion === 'cerrar') dCuenta.close();
  else if (accion === 'letra') { window.libroAcc?.fijarLetra(SIGUIENTE_LETRA[window.libroAcc.letra()]); etiquetasAccesibilidad(); }
  else if (accion === 'contraste') { window.libroAcc?.fijarContraste(SIGUIENTE_CONTRASTE[window.libroAcc.contraste()]); etiquetasAccesibilidad(); }
  else if (accion === 'atajos') { fijarAtajos(!atajosActivos()); etiquetasAccesibilidad(); }
  else if (accion === 'titulo') { fijarTituloConSaldo(!tituloConSaldo()); etiquetaTitulo(); }
  else if (accion === 'tema') { fundirTema(); window.libroTema?.fijar(SIGUIENTE_TEMA[window.libroTema.preferencia()]); etiquetaTema(); }
  else if (accion === 'efectos') { window.libroEfectos?.fijar(SIGUIENTE_EFECTOS[window.libroEfectos.preferencia()]); etiquetaEfectos(); }
  else if (accion === 'volver') irA('menu');
  else if (accion === 'clave') irA('clave', () => { $('fc-error').textContent = ''; $('fc-actual').focus(); });
  else if (accion === 'historial') irA('historial', cargarHistorial);
  else if (accion === 'avisos') irA('avisos', () => avisosUI.refrescar());
  else if (accion === 'salir' || accion === 'salir-todas') {
    try { await api('/api/logout', { metodo: 'POST', cuerpo: { todas: accion === 'salir-todas' } }); } catch { /* da igual: se sale */ }
    location.replace('/login');
  }
});
$('f-clave').addEventListener('submit', async (e) => {
  e.preventDefault();
  const actual = $('fc-actual').value, nueva = $('fc-nueva').value;
  if (nueva.length < 12) { $('fc-error').textContent = 'La nueva necesita al menos 12 caracteres.'; $('fc-nueva').focus(); return; }
  if (nueva !== $('fc-nueva2').value) { $('fc-error').textContent = 'Las dos nuevas no coinciden.'; $('fc-nueva2').focus(); return; }
  try {
    await api('/api/clave', { metodo: 'POST', cuerpo: { actual, nueva } });
    e.target.reset();
    dCuenta.close();
    avisar('Contraseña cambiada. Tus otras sesiones se cerraron.', null, true);
  } catch (err) {
    $('fc-error').textContent = err.message;
  }
});
