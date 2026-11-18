import { cumpleHoy, entero, fechaLarga, nombreHito, primeraCompra, saludoTalDia, talDiaComoHoy, textoCumple, usd, usd0 } from './lib.js';
import { montarAvisos } from './avisos.js';
import { cambiosPendientes, mostrarCambios } from './cambios.js';
import { fijarSonido, sonar, sonidoActivo } from './sonido.js';
import { enTV, entrarTV, fijarTeleDuerme, teleDuermeActiva } from './tv.js';
import { pintarSesiones } from './sesiones.js';
import { pintarEnlaces } from './enlaces.js';
import { pintarWallets } from './wallets.js';
import { pintarSistema } from './sistema.js';
import { enMedir } from './medir.js';
import { etiquetaModo, fijarModoPestanas, enPestanas, verHistoria } from './pestanas.js';
import { abrirCumple, etiquetaCumple } from './cumple.js';
import { abrirMontana, etiquetaMontana } from './bautizo.js';
import { avatar, ilustracion } from './iconos.js';
import { avisar } from './avisar.js';
import { $, R, S, api, vozLibro } from './estado.js';
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
  $('dc-datos').hidden = cual !== 'datos';
  $('dc-sistema').hidden = cual !== 'sistema';
  $('dc-sesiones').hidden = cual !== 'sesiones';
  $('dc-enlaces').hidden = cual !== 'enlaces';
}
/** Cambia de vista dentro de «Tu cuenta» con la transición nativa; `despues` corre cuando la vista ya está a la vista. */
const irA = (cual, despues) => conTransicion(() => { vistaCuenta(cual); despues?.(); });
/** (Campamento 24) «Ver en Estado del sistema» tras medir este aparato: «Tu cuenta» abierta directo en esa vista. */
export function abrirSistema() {
  $('cuenta-btn').click();
  vistaCuenta('sistema');
  pintarSistema();
}
/** El avatar de la persona y su texto (con `textContent`: el nombre nunca se interpreta como HTML). */
function conAvatar(el, nombre, texto, opciones) {
  el.innerHTML = avatar(nombre, opciones);
  const t = document.createElement('span');
  t.textContent = texto;
  el.append(t);
}
// El nombre accesible del botón de la cuenta es su texto visible más una aclaración en `.sr` (con `aria-label` axe marca
// `label-content-name-mismatch`).
const aclararCuenta = () => $('cuenta-btn').insertAdjacentHTML('beforeend', '<span class="sr"> (tu cuenta)</span>');
export async function cargarYo() {
  try {
    const yo = await api('/api/yo');
    Object.assign(S, { usuario: yo.usuario, rol: yo.rol, visto: yo.visto ?? null, cambios: yo.cambios ?? null });
    S.familia = yo.familia ?? null; // el valle (campamento 22): cuántas cuentas hay y sus iniciales, sin nombres
    document.body.dataset.rol = yo.rol;
    document.body.dataset.mant = yo.mantenimiento ? '1' : ''; // modo solo lectura de emergencia (SOLO_LECTURA=1 en el servidor)
    $('mant').hidden = !yo.mantenimiento;
    // ¿Flota el botón «Anotar» en este dispositivo? El CSS lo usa para el alto de la escena (campamento 17). El rol se recuerda
    // (`libro.rol`) para que la próxima vez la escena salga ya con su alto (efectos.js). Solo es una pista de diseño: no da permisos.
    document.documentElement.toggleAttribute('data-boton', yo.rol === 'admin' && !yo.mantenimiento);
    document.documentElement.toggleAttribute('data-lector', yo.rol !== 'admin');
    try { localStorage.setItem('libro.rol', yo.rol === 'admin' ? 'admin' : 'lector'); } catch { /* vale para esta visita */ }
    conAvatar($('cuenta-btn'), yo.usuario, yo.usuario);
    aclararCuenta();
    $('cuenta-btn').hidden = false;
    S.cumple = yo.cumple ?? null;
    pintarSaludo(yo.usuario);
    conAvatar($('dc-quien'), yo.usuario, `${yo.usuario} · ${yo.rol === 'admin' ? 'administrador' : 'solo lectura'}`, { grande: true });
    $('dc-historial').hidden = yo.rol !== 'admin';
    $('dc-datos-btn').hidden = yo.rol !== 'admin';
    $('dc-sistema-btn').hidden = yo.rol !== 'admin';
    $('dc-enlaces-btn').hidden = yo.rol !== 'admin';
    $('dc-montana').hidden = yo.rol !== 'admin'; // bautizar la montaña: solo quien anota
    $('fc-usuario').value = yo.usuario;
    pintar();
  } catch { /* el 401 ya redirige; si falla la red, la app sigue en solo lectura */ }
}
/**
 * «Buenas noches, Daf3r»: según la hora de El Salvador (cielo.js). Se renueva cada 5 minutos y al volver a la pestaña.
 * El día de tu cumpleaños, «Feliz cumpleaños» (campamento 15B). (Campamento 23) Un día como hoy en que el libro llegó a un campamento o
 * a una etapa, hace uno o más años, el saludo lo recuerda («Daf3r, hoy hace un año llegaste a 1M sats»): uno por día, el más grande
 * (`lib.talDiaComoHoy`). El cumpleaños gana; el día de la primera compra ya tiene su aviso (`pintarDelDia`). `pintar()` lo llama al
 * llegar las compras con `forzar: false`: así no mide nada en cada repintado del precio si el saludo no cambió.
 */
let nombreSaludo = '', formasSaludo = [], claveSaludo = '';
export function pintarSaludo(nombre = nombreSaludo, { forzar = true } = {}) {
  nombreSaludo = nombre;
  const cielo = window.libroCielo;
  if (!cielo || !nombre) return;
  const dia = cielo.dia();
  const cumple = S.cumple && cumpleHoy([{ nombre, cumple: S.cumple }], dia).length;
  const tal = !cumple && S.cargado && R?.camino ? talDiaComoHoy(R.camino, dia, primeraCompra(S.compras)) : null;
  const formas = cumple ? [textoCumple(nombre)] : [...(tal ? saludoTalDia(tal, nombre, vozLibro()) : []), `${cielo.saludo(cielo.hora())}, ${nombre}`];
  const clave = formas.join('|');
  if (!forzar && clave === claveSaludo) return;
  claveSaludo = clave;
  formasSaludo = formas;
  encajarSaludo();
}
/**
 * Si la marca y el botón de la cuenta no caben en un renglón (teléfonos de 360 px, letra grande, un nombre largo), el saludo baja
 * un renglón y caía encima del rótulo del saldo. En ese caso no se enseña (el nombre ya está en el botón de la cuenta). Se mide en
 * el mismo fotograma (mostrar, leer, decidir): no parpadea. Se revisa al cambiar el tamaño de la cabecera.
 * (Campamento 23) Un día como hoy hay varias formas, de la más larga a la más corta: se enseña la primera que cabe entera en su renglón
 * (sin partirse ni cortarse con «…», que con letra grande no se parte); si ninguna, el saludo de siempre, con la regla de siempre.
 */
function encajarSaludo() {
  const s = $('saludo'), k = $('t-saldo');
  s.hidden = false;
  const lh = Number.parseFloat(getComputedStyle(s).lineHeight) || 20;
  for (const t of formasSaludo.slice(0, -1)) {
    s.textContent = t;
    const r = s.getBoundingClientRect();
    if (r.height <= lh * 1.5 && s.scrollWidth <= s.clientWidth + 1 && r.bottom <= k.getBoundingClientRect().top + 2) return;
  }
  s.textContent = formasSaludo.at(-1) ?? '';
  if (s.textContent && s.getBoundingClientRect().bottom > k.getBoundingClientRect().top + 2) s.hidden = true;
}
if ('ResizeObserver' in window) new ResizeObserver(() => encajarSaludo()).observe(document.querySelector('.cima'));
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
const etiquetaMadrugada = () => { $('dc-madrugada').textContent = `Modo madrugada (22:00 a 5:00): ${window.libroCielo?.madrugadaPref() ? 'automático' : 'apagado'}`; };
const etiquetaSonido = () => { $('dc-sonido').textContent = `Sonido al guardar: ${sonidoActivo() ? 'encendido' : 'apagado'}`; };
// (Campamento 21B) La tele duerme de 23:00 a 5:00; por dispositivo se puede dejar despierta toda la noche.
const etiquetaTeleDuerme = () => { $('dc-tv-duerme').textContent = `La tele duerme de noche: ${teleDuermeActiva() ? 'sí' : 'no'}`; };
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
  $('dc-ganancia').textContent = `Colores de ganancia: ${acc?.ganancia() ? 'verde y rojo' : 'neutros'}`;
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
$('cuenta-btn').addEventListener('click', () => { vistaCuenta('menu'); etiquetaTema(); etiquetaEfectos(); etiquetaTitulo(); etiquetaSonido(); etiquetaTeleDuerme(); etiquetaMadrugada(); $('dc-pestanas').textContent = etiquetaModo(); $('dc-cumple').textContent = etiquetaCumple(); etiquetaMontana(); etiquetasAccesibilidad(); dCuenta.showModal(); });

const txCorto = (t) => (t ? `${t.slice(0, 8)}…${t.slice(-6)}` : 'sin TXID');
/** Describe un movimiento de la auditoría: «20,000 sats ($15.52) del 4 nov 2026 · TXID 01234567…abcdef · «nota»». */
function textoMov(x) {
  if (!x?.sats) return '';
  return `${entero(x.sats)} sats (${usd(x.monto)}) del ${fechaLarga(x.fecha)}` +
    (x.extra ? ' · compra extra' : '') + (x.txid ? ` · TXID ${txCorto(x.txid)}` : '') + (x.nota ? ` · «${x.nota}»` : '') +
    (x.etiquetas?.length ? ` · etiquetas: ${x.etiquetas.join(', ')}` : '');
}
/** Qué cambió en una edición: solo los campos que difieren. */
function cambiosEdicion(antes, despues) {
  if (!antes || !despues) return '';
  const c = [];
  if (antes.sats !== despues.sats) c.push(`${entero(antes.sats)} → ${entero(despues.sats)} sats`);
  if (antes.monto !== despues.monto && usd(antes.monto) !== usd(despues.monto)) c.push(`${usd(antes.monto)} → ${usd(despues.monto)}`);
  // El precio de BTC del movimiento: se puede corregir solo él (la hoja lo deja escribir) y, con pocos sats, los dólares casi no se mueven.
  if (antes.precio > 0 && despues.precio > 0 && usd0(antes.precio) !== usd0(despues.precio)) c.push(`precio ${usd0(antes.precio)} → ${usd0(despues.precio)}`);
  if (antes.fecha !== despues.fecha) c.push(`fecha ${fechaLarga(antes.fecha)} → ${fechaLarga(despues.fecha)}`);
  if ((antes.txid ?? null) !== (despues.txid ?? null)) c.push(`TXID ${txCorto(antes.txid)} → ${txCorto(despues.txid)}`);
  if (!!antes.extra !== !!despues.extra) c.push(despues.extra ? 'marcada como extra' : 'ya no es extra');
  if ((antes.nota ?? null) !== (despues.nota ?? null)) c.push(`nota ${antes.nota ? `«${antes.nota}»` : 'vacía'} → ${despues.nota ? `«${despues.nota}»` : 'vacía'}`);
  const eA = (antes.etiquetas ?? []).join(', '), eD = (despues.etiquetas ?? []).join(', ');
  if (eA !== eD) c.push(`etiquetas ${eA || 'ninguna'} → ${eD || 'ninguna'}`);
  return c.join(' · ') || 'sin cambios visibles';
}
function textoAuditoria(a) {
  const d = a.despues || a.antes || {};
  // Mensajes y cartas (campamento 15A): se arman aparte porque el diccionario de abajo evalúa todas sus líneas con cada fila.
  if (a.accion === 'mensaje_bandera') return a.despues ? `dejó un mensaje en el campamento ${nombreHito(a.entidad_id)}` : `quitó el mensaje del campamento ${nombreHito(a.entidad_id)}`;
  if (a.accion === 'capsula_sellada') return `selló una carta para ${d.abre_fecha ? `el ${fechaLarga(d.abre_fecha)}` : `cuando llegue a ${nombreHito(d.abre_sats)}`}`;
  if (a.accion === 'capsula_anulada') return 'anuló una carta aún sellada';
  // El libro de cumbre (campamento 19)
  if (a.accion === 'firma') return a.antes ? `cambió su firma en el campamento ${nombreHito(a.entidad_id)}: «${a.despues?.texto ?? ''}»` : `firmó el libro de cumbre del campamento ${nombreHito(a.entidad_id)}: «${a.despues?.texto ?? ''}»`;
  if (a.accion === 'montana_nombre') return a.despues ? (a.antes ? `cambió el nombre de la montaña: «${a.antes.nombre}» → «${a.despues.nombre}»` : `le puso a la montaña el nombre «${a.despues.nombre}»`) : 'quitó el nombre de la montaña';
  if (a.accion === 'resguardo_revisado') return 'anotó que revisó el respaldo de su wallet y la nota para su familia'; // campamento 24: solo la fecha
  if (a.accion === 'firma_borrada') return a.antes?.de && a.antes.de !== a.usuario ? `quitó la firma de ${a.antes.de} del campamento ${nombreHito(a.entidad_id)}` : `quitó su firma del campamento ${nombreHito(a.entidad_id)}`;
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
    token_creado: `creó el enlace de solo lectura «${d.nombre}»`, token_revocado: `revocó el enlace de solo lectura «${d.nombre}»`,
    sesion_cerrada: 'cerró una de sus sesiones abiertas',
    tele_codigo: `creó un código para conectar una tele con la cuenta de ${d.usuario}`, tele_entro: 'entró en una tele con un código',
    wallet_creada: `añadió la wallet «${d.nombre}»`, wallet_archivada: `archivó la wallet «${d.nombre}»`,
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
  if (avisosOfrecidos || !S.rol || !S.cargado || document.querySelector('dialog[open]') || enTV() || enMedir()) return;
  if (S.rol === 'lector' && !novedadesMostradas) return;
  if (cambiosPendientes()) { mostrarCambios(); return; } // «Qué hay de nuevo»: antes de la oferta de avisos
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
  else if (accion === 'ganancia') { window.libroAcc?.fijarGanancia(window.libroAcc.ganancia() ? '' : 'color'); etiquetasAccesibilidad(); }
  else if (accion === 'madrugada') { window.libroCielo?.fijarMadrugada(!window.libroCielo.madrugadaPref()); etiquetaMadrugada(); }
  else if (accion === 'sonido') { fijarSonido(!sonidoActivo()); etiquetaSonido(); if (sonidoActivo()) sonar('compra'); } // al encenderlo suena una muestra
  else if (accion === 'tv') { dCuenta.close(); entrarTV(); }
  else if (accion === 'tv-duerme') { fijarTeleDuerme(!teleDuermeActiva()); etiquetaTeleDuerme(); }
  else if (accion === 'titulo') { fijarTituloConSaldo(!tituloConSaldo()); etiquetaTitulo(); }
  else if (accion === 'tema') { fundirTema(); window.libroTema?.fijar(SIGUIENTE_TEMA[window.libroTema.preferencia()]); etiquetaTema(); }
  else if (accion === 'efectos') { window.libroEfectos?.fijar(SIGUIENTE_EFECTOS[window.libroEfectos.preferencia()]); etiquetaEfectos(); }
  else if (accion === 'volver') irA('menu');
  else if (accion === 'clave') irA('clave', () => { $('fc-error').textContent = ''; $('fc-actual').focus(); });
  else if (accion === 'historial') irA('historial', cargarHistorial);
  else if (accion === 'historia') { dCuenta.close(); setTimeout(verHistoria, 120); } // «Tu historia» ahora es una pestaña de la página
  else if (accion === 'cumple') { dCuenta.close(); setTimeout(abrirCumple, 120); }
  else if (accion === 'montana') { dCuenta.close(); setTimeout(abrirMontana, 120); }
  else if (accion === 'pestanas') { fijarModoPestanas(!enPestanas()); $('dc-pestanas').textContent = etiquetaModo(); }
  else if (accion === 'datos') irA('datos', pintarWallets);
  else if (accion === 'sistema') irA('sistema', pintarSistema);
  else if (accion === 'sesiones') irA('sesiones', pintarSesiones);
  else if (accion === 'enlaces') irA('enlaces', () => { $('en-nuevo').hidden = true; pintarEnlaces(); });
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

// (Rediseño Fable) Los ajustes de «Tu cuenta» que dicen «Nombre: valor» se visten en dos partes: el nombre a la izquierda y el
// valor, resaltado, a la derecha. El texto del botón no cambia («Tema: automático»): los dos puntos siguen ahí, solo que no se ven.
// Lo hace un observador porque cada etiqueta se escribe con `textContent` desde varios sitios (aquí, tv.js, pestanas.js…).
function vestirAjuste(b) {
  if (b.firstElementChild || b.dataset.cuenta === 'datos' || !b.textContent.includes(': ')) return; // ya vestido, con icono, sin valor o un título con dos puntos
  const t = b.textContent, i = t.lastIndexOf(': ');
  const parte = (clase, txt) => { const e = document.createElement('span'); e.className = clase; e.textContent = txt; return e; };
  b.replaceChildren(parte('dc-k', t.slice(0, i)), parte('dc-dp', ': '), parte('dc-v', t.slice(i + 2)));
}
{
  const lista = document.querySelector('#d-cuenta .dc-lista');
  if (lista) {
    const vestir = () => lista.querySelectorAll('button[data-cuenta]').forEach(vestirAjuste);
    new MutationObserver(vestir).observe(lista, { childList: true, subtree: true, characterData: true });
    vestir();
  }
}
