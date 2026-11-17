// «Medir este aparato» (campamento 24, idea 44): solo el admin, en /medir (la app de siempre, con todo lo que tiene puesto ese aparato).
// Al abrirse mide cuánto tardó en verse el saldo: la marca `libro:saldo` de pintar.js (el saldo ya pintado con su cifra) frente al inicio
// de la navegación. Al pedirlo, la prueba de desplazamiento: tres segundos de cuenta atrás (en el último segundo y medio se mide la pantalla
// en reposo) y siete en los que la página baja hasta tres pantallas y vuelve arriba sola, siempre igual, contando cada fotograma con
// requestAnimationFrame. En cada fotograma solo se guarda su instante y la altura en dos arreglos preasignados: nada pesado que distorsione
// lo medido. Las cuentas son de lib.js (`resumenFotogramas`, `veredictoFps`…); la medida se guarda (POST /api/medidas) y «Estado del
// sistema» lista las últimas 50.
import { abrirSistema } from './cuenta.js';
import { $, api, S } from './estado.js';
import { ESTADO_FPS, PALABRA_FPS, PRUEBA_MS, PRUEBA_PANTALLAS, REGLA_LENTO, desplazamientoPrueba, hzReposo, intervalosDe, resumenFotogramas, veredictoFps } from './lib.js';
import { nivelEfectos } from './movimiento.js';
import { verPestanaUnRato } from './pestanas.js';

const raiz = document.documentElement;
/** ¿La app se abrió para medir (/medir)? Mientras, no salen «Qué hay de nuevo», la oferta de avisos ni el aviso del día. */
export const enMedir = () => raiz.hasAttribute('data-medir');
/** ¿Está corriendo la prueba? Mientras, la app no refresca el precio ni las compras (un repintado a mitad sería ruido en la medida). */
export const midiendo = () => raiz.hasAttribute('data-midiendo');

const dlg = $('d-medir');
const CUENTA_MS = 3000, REPOSO_MS = 1500, ESPERA_MAX = 30_000;
const MAX = 8192; // fotogramas: siete segundos a 240 Hz caben de sobra
const tiempos = new Float64Array(MAX), alturas = new Int32Array(MAX), reposo = new Float64Array(1024);
const seg = (ms) => `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
const NOMBRE_EFECTOS = {
  ninguno: 'Efectos «ninguno»: se mide sin animaciones, como está puesto ahora en este aparato.',
  esenciales: 'Efectos «esenciales»: se mide sin los adornos del paisaje, como está puesto ahora en este aparato.',
};

let carga = null; // { saldo_ms, red_ms, carga } de esta visita, o { error }
let oculta = document.visibilityState === 'hidden'; // si la página no estuvo a la vista mientras cargaba, el tiempo no vale
let parar = null; // el motivo por el que se detuvo la prueba (un toque, la página oculta)
let cerrandoParaMedir = false;

const estadoNavegacion = () => {
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const tipo = { navigate: 'navegar', reload: 'recargar', back_forward: 'historial' }[nav?.type] ?? 'otra';
  return { red_ms: nav && nav.responseEnd > 0 ? Math.round(nav.responseEnd) : null, carga: tipo };
};
function datosAparato() {
  return {
    efectos: nivelEfectos(), ligero: raiz.dataset.ligero === '1', tema: raiz.dataset.tema === 'claro' ? 'claro' : 'oscuro',
    ancho: Math.round(innerWidth), alto: Math.round(innerHeight), dpr: Math.round((devicePixelRatio || 1) * 100) / 100,
    memoria: navigator.deviceMemory ?? null, nucleos: navigator.hardwareConcurrency || null,
    instalada: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  };
}
function textoAparato(a) {
  const partes = [`${a.ancho} × ${a.alto} px`, `densidad ×${a.dpr}`, `efectos ${a.efectos}${a.ligero ? ' (modo ligero)' : ''}`, `tema ${a.tema}`];
  if (a.nucleos) partes.push(`${a.nucleos} núcleos`);
  if (a.memoria) partes.push(`${a.memoria} GB de memoria`);
  if (a.instalada) partes.push('app instalada');
  // (Rendimiento iPhone) Si se abrió con /medir?sin=… (efectos.js), que la captura lo diga: esa medida es para comparar.
  if (raiz.dataset.sin) partes.push(`para comparar, sin: ${raiz.dataset.sin.split(' ').join(', ')}`);
  return `Este aparato: ${partes.join(' · ')}.`;
}

// ---------------------------------------------------------------- el diálogo
function pintarDialogo(fase, medida = null, guardada = null) {
  const a = datosAparato();
  $('me-aparato').textContent = textoAparato(a);
  const nota = NOMBRE_EFECTOS[a.efectos];
  $('me-ef').hidden = !nota;
  $('me-ef').textContent = nota ? `${nota}${a.ligero ? ' Este aparato está en modo ligero.' : ''}` : '';
  // Al abrir
  $('me-carga').textContent = carga && !carga.error ? seg(carga.saldo_ms) : '—';
  conRotulo($('me-carga-n'), 'Al abrir', carga?.error ?? (carga
    ? `desde que se pidió la página hasta que el saldo se vio con su cifra (sin esperar a que los números acaben de girar)${carga.red_ms != null ? `; la página llegó del servidor en ${carga.red_ms < 100 ? `${carga.red_ms} ms` : seg(carga.red_ms)}` : ''}.`
    : 'midiendo…'));
  // Al deslizar: la cifra grande es la que decide (la peor de toda la prueba y del rato con la montaña a la vista)
  const v = medida ? veredictoFps(medida) : null;
  $('me-fps').textContent = v ? `${v.fps} fps` : '—';
  const ver = $('me-ver');
  ver.dataset.estado = v ? ESTADO_FPS[v.estado] : '';
  $('me-ver-ico').hidden = !v;
  $('me-ver-ico').textContent = v ? { fluido: '✔', revisar: '!', lento: '✘' }[v.estado] : '';
  $('me-ver-t').textContent = v ? PALABRA_FPS[v.estado] : 'por medir';
  conRotulo($('me-fps-n'), 'Al deslizar', medida ? detalleFps(medida, v)
    : fase === 'sin-carga' ? 'sin el tiempo de carga la prueba no se guarda: «Medir otra vez» vuelve a abrir la app.'
      : `la página bajará y subirá sola durante ${PRUEBA_MS / 1000} segundos, tras una cuenta atrás. No toques la pantalla mientras tanto.`);
  $('me-regla').hidden = v?.estado !== 'lento';
  $('me-regla').textContent = REGLA_LENTO;
  const hecha = fase === 'hecha';
  $('me-empezar').hidden = hecha || fase === 'sin-carga';
  $('me-otra').hidden = !(hecha || fase === 'sin-carga');
  $('me-sistema').hidden = !(hecha && guardada === true); // si no se guardó (p. ej. en mantenimiento), no hay nada nuevo que ver allí
  // El aviso de estado: a la vista, solo si se guardó; para los lectores de pantalla, además, el resultado completo.
  const res = $('me-res');
  res.replaceChildren();
  if (hecha && v) {
    res.append(Object.assign(document.createElement('span'), { className: 'sr', textContent: `Listo: ${v.fps} fotogramas por segundo al deslizar, ${PALABRA_FPS[v.estado].toLowerCase()}. ` }));
    res.append(guardada === true ? '✔ Guardada en «Estado del sistema».' : `No se guardó: ${guardada}`);
    res.dataset.estado = guardada === true ? 'ok' : 'mal';
  } else {
    res.textContent = {
      toque: 'La prueba se detuvo porque se tocó la pantalla. Vuelve a empezarla y no toques nada hasta que termine.',
      oculta: 'La prueba se detuvo porque la página dejó de verse. Vuelve a empezarla con la app a la vista.',
    }[fase] ?? '';
    res.dataset.estado = res.textContent ? 'aviso' : '';
  }
}
/** «Al abrir: …» con el rótulo en negrita (todo con `textContent`). */
function conRotulo(el, rotulo, texto) {
  el.replaceChildren(Object.assign(document.createElement('b'), { textContent: `${rotulo}: ` }), texto);
}
function detalleFps(m, v) {
  const f = Math.round(m.fps), e = m.fps_escena == null ? null : Math.round(m.fps_escena);
  const partes = [e == null ? `${f} fps en toda la prueba` : e < f ? `${e} fps con la montaña a la vista y ${f} en toda la prueba` : `${f} fps en toda la prueba y ${e} con la montaña a la vista`];
  partes.push(`el peor medio segundo, ${Math.round(m.fps_peor)} fps`,`${m.tirones} ${m.tirones === 1 ? 'tirón' : 'tirones'}`, `pantalla a ${m.hz} Hz`);
  let t = `${partes.join(' · ')}.`;
  if (m.recorrido < m.alto) t += ` La página era corta: solo bajó ${m.recorrido} px.`;
  if (v.limitada) t += ` La pantalla ya iba a ${m.hz} fotogramas por segundo en reposo (¿el ahorro de batería, o el aparato ocupado con otra cosa?): así no se puede juzgar. Quita el ahorro y mide otra vez.`;
  return t;
}
function abrir() {
  if (dlg.open) return;
  dlg.showModal();
  $('me-t').focus(); // primero se lee qué se mide; en el teléfono no salta nada
}
function salirDeMedir() {
  delete raiz.dataset.medir;
  try { history.replaceState(null, '', '/'); } catch { /* da igual */ }
}
// (El evento `close` llega después, en otra tarea: el aviso de que el cierre es para medir se consume ahí.)
dlg.addEventListener('close', () => { if (cerrandoParaMedir) cerrandoParaMedir = false; else salirDeMedir(); });
$('me-cerrar').addEventListener('click', () => dlg.close());
$('me-sistema').addEventListener('click', () => { dlg.close(); abrirSistema(); });
$('me-otra').addEventListener('click', () => location.assign(`/medir?otra=${Date.now().toString(36)}`)); // una carga nueva (no una recarga)
$('me-empezar').addEventListener('click', () => { empezar(); });

// ---------------------------------------------------------------- la prueba
const pildora = $('me-pildora');
/** El texto de la píldora (una vez por segundo, no en cada fotograma) y su barra: a dónde llegará en el segundo que empieza. */
function textoPildora(fase, grande, chico, p = 0) {
  pildora.dataset.fase = fase;
  $('me-pi-t').textContent = grande;
  $('me-pi-c').textContent = chico;
  $('me-barra').style.transform = `scaleX(${p.toFixed(3)})`;
}
const anunciar = (t) => { $('me-sr').textContent = t; };
const alTocar = () => { parar ??= 'toque'; };
const alOcultar = () => { if (document.visibilityState === 'hidden') parar ??= 'oculta'; };
const ESCUCHAS = ['pointerdown', 'touchstart', 'wheel', 'keydown'];

function correr() {
  return new Promise((fin) => {
    let fase = 'cuenta', t0 = 0, n = 0, nR = 0, D = 0, alto = 0, s = -1;
    const paso = (ts) => {
      if (parar) { fin(null); return; }
      if (!t0) t0 = ts;
      const e = ts - t0;
      if (fase === 'cuenta') {
        if (e >= CUENTA_MS - REPOSO_MS && nR < reposo.length) reposo[nR++] = ts;
        const quedan = Math.max(1, Math.ceil((CUENTA_MS - e) / 1000));
        if (quedan !== s) { s = quedan; textoPildora('cuenta', `Empieza en ${quedan}`, 'No toques la pantalla'); }
        if (e >= CUENTA_MS) {
          // Una sola lectura de la página antes de medir: hasta dónde bajar y hasta qué altura se ve la montaña.
          D = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, PRUEBA_PANTALLAS * innerHeight));
          alto = (document.querySelector('.escena')?.getBoundingClientRect().bottom ?? 0) + scrollY;
          fase = 'mide'; t0 = ts; s = -1;
          anunciar(`Midiendo durante ${PRUEBA_MS / 1000} segundos.`);
        }
        requestAnimationFrame(paso);
        return;
      }
      const y = desplazamientoPrueba(e, PRUEBA_MS, D);
      scrollTo(0, y);
      if (n < MAX) { tiempos[n] = ts; alturas[n] = y; n++; }
      const quedan = Math.max(0, Math.ceil((PRUEBA_MS - e) / 1000));
      if (quedan !== s) { s = quedan; textoPildora('mide', `Midiendo · ${quedan} s`, 'Toca la pantalla para detenerla', 1 - (Math.max(0, quedan - 1) * 1000) / PRUEBA_MS); }
      if (e >= PRUEBA_MS) { fin({ n, nR, D, alto }); return; }
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

async function empezar() {
  parar = null;
  cerrandoParaMedir = true;
  dlg.close();
  // La prueba es siempre la misma: el Resumen (lo que se ve al abrir, con la montaña), arriba del todo y sin desplazamiento suave.
  const volver = verPestanaUnRato('resumen');
  const suave = raiz.style.scrollBehavior;
  raiz.style.scrollBehavior = 'auto';
  scrollTo(0, 0);
  raiz.setAttribute('data-midiendo', '');
  pildora.hidden = false;
  anunciar(`La prueba empieza en ${CUENTA_MS / 1000} segundos. No toques la pantalla.`);
  // Los toques se escuchan desde el fotograma siguiente (el del botón «Empezar» ya pasó).
  await new Promise((r) => requestAnimationFrame(() => r()));
  for (const ev of ESCUCHAS) addEventListener(ev, alTocar, { capture: true, passive: true });
  document.addEventListener('visibilitychange', alOcultar);
  const r = await correr();
  for (const ev of ESCUCHAS) removeEventListener(ev, alTocar, { capture: true });
  document.removeEventListener('visibilitychange', alOcultar);
  scrollTo(0, 0);
  raiz.style.scrollBehavior = suave;
  raiz.removeAttribute('data-midiendo');
  pildora.hidden = true;
  volver();
  if (!r) { anunciar(''); pintarDialogo(parar); abrir(); return; }
  const hz = hzReposo(intervalosDe(reposo, r.nR)) ?? 60;
  const todo = resumenFotogramas(intervalosDe(tiempos, r.n), { intervalo: 1000 / hz });
  const escena = resumenFotogramas(intervalosDe(tiempos, r.n, (i) => alturas[i - 1] < r.alto), { intervalo: 1000 / hz });
  if (!todo) { anunciar(''); pintarDialogo('oculta'); abrir(); return; }
  const medida = {
    saldo_ms: carga.saldo_ms, red_ms: carga.red_ms, carga: carga.carga,
    fps: todo.fps, fps_escena: escena?.fps ?? null, fps_peor: todo.peor, fps_p5: todo.p5, tirones: todo.tirones, hz,
    duracion_ms: Math.max(1000, todo.duracion), recorrido: Math.round(r.D), ...datosAparato(),
  };
  let guardada = true;
  try { await api('/api/medidas', { metodo: 'POST', cuerpo: medida }); } catch (e) { guardada = e.message; }
  anunciar('');
  pintarDialogo('hecha', medida, guardada);
  abrir();
}

// ---------------------------------------------------------------- arranque (solo en /medir)
function esperar() {
  const t0 = Date.now();
  const mirar = () => {
    if (!enMedir()) return;
    if (S.rol && S.rol !== 'admin') { salirDeMedir(); return; } // (el servidor ya no le sirve /medir a un lector)
    const marca = performance.getEntriesByName?.('libro:saldo')?.[0];
    const tarde = Date.now() - t0 > ESPERA_MAX;
    if (!S.rol && tarde) return; // sin cuenta (sin red) no hay nada que medir
    if (!S.rol || (!marca && !tarde) || document.querySelector('dialog[open]')) { setTimeout(mirar, 120); return; }
    document.removeEventListener('visibilitychange', marcarOculta);
    if (!marca) carga = { error: 'El saldo no llegó a verse en 30 segundos: revisa la conexión y mide otra vez.' };
    else if (oculta) carga = { error: 'La página no estuvo a la vista mientras cargaba, así que ese tiempo no vale.' };
    else carga = { saldo_ms: Math.round(marca.startTime), ...estadoNavegacion() };
    try { if (location.search) history.replaceState(null, '', '/medir'); } catch { /* da igual */ }
    pintarDialogo(carga.error ? 'sin-carga' : 'lista');
    abrir();
  };
  mirar();
}
const marcarOculta = () => { if (document.visibilityState === 'hidden') oculta = true; };
if (location.pathname === '/medir') {
  raiz.setAttribute('data-medir', '');
  document.addEventListener('visibilitychange', marcarOculta);
  esperar();
}
