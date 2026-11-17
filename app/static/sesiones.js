import { $, api, esAdmin } from './estado.js';
import { avisar } from './avisar.js';
import { copiarTexto } from './copiar.js';
import { hace } from './sistema.js';

// «Sesiones abiertas» (idea 152): los dispositivos donde está abierta tu cuenta, con su último uso, y un botón para cerrar cualquiera menos
// el de este dispositivo (para ese está «Salir»). El servidor solo manda un id corto, fechas y el navegador resumido: nunca un token.
const hora = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', hour: 'numeric', minute: '2-digit' });

export async function pintarSesiones() {
  const ul = $('ses-lista');
  pintarTele();
  let lista;
  try { lista = await api('/api/sesiones'); } catch (err) { ul.replaceChildren(Object.assign(document.createElement('li'), { className: 'vacio', textContent: `No se pudo cargar. ${err.message}` })); return; }
  const ahora = Math.floor(Date.now() / 1000);
  ul.replaceChildren(...lista.map((x) => {
    const li = document.createElement('li');
    li.className = 'sis-fila ses-fila';
    const cuerpo = document.createElement('span');
    const t = Object.assign(document.createElement('b'), { textContent: x.agente || 'Dispositivo' });
    cuerpo.append(t);
    if (x.actual) cuerpo.append(Object.assign(document.createElement('span'), { className: 'sis-palabra', textContent: ' · Este dispositivo' }));
    cuerpo.append(document.createElement('br'));
    const usada = x.actual ? 'en uso ahora' : `último uso ${hace(x.ultima, ahora)}`;
    const extra = x.compartida ? ` · compartido: se cierra solo a las ${hora.format(new Date(x.caduca * 1000))}` : '';
    cuerpo.append(Object.assign(document.createElement('small'), { textContent: `Entró ${hace(x.creada, ahora)} · ${usada}${extra}` }));
    li.append(cuerpo);
    if (!x.actual) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'ses-cerrar', textContent: 'Cerrar' });
      b.setAttribute('aria-label', `Cerrar la sesión de ${x.agente || 'este dispositivo'}`);
      b.addEventListener('click', async () => {
        b.disabled = true;
        try { await api(`/api/sesiones/${x.id}`, { metodo: 'DELETE' }); avisar('Sesión cerrada.', null, true); } catch (err) { avisar(`No se pudo cerrar. ${err.message}`); }
        pintarSesiones();
      });
      li.append(b);
    }
    return li;
  }));
}

// ------------------------------------------------------------ conectar una tele (campamento 21B, idea 43; solo quien administra)
// Se elige con qué cuenta de lectura entra la tele y se crea un código de 8 cifras que se ve UNA vez (el servidor solo guarda su huella):
// se dicta o se copia y se teclea en la tele, en «Entrar con un código». Caduca a los 5 minutos, sirve una vez y crear otro anula el
// anterior. Mientras está vivo, la cuenta atrás corre aquí y, cada pocos segundos, se mira si la tele ya entró.
let elegida = null, vivo = null, reloj = 0, sondeo = 0;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const visible = () => !$('dc-sesiones').hidden && $('d-cuenta').open;
function parar() { clearInterval(reloj); clearInterval(sondeo); reloj = 0; sondeo = 0; }
function estado(texto) { $('tc-estado').textContent = texto; }
function quitarCodigo() { $('tc-codigo').hidden = true; $('tc-g1').textContent = ''; $('tc-g2').textContent = ''; $('tc-cifras-sr').textContent = ''; }

/** Lo que dijo el servidor del último código (vivo, usado, caducado o anulado), en palabras. */
function contarEstado(c, mostrado) {
  if (!c) { estado(''); return; }
  const ahora = Math.floor(Date.now() / 1000);
  if (c.estado === 'usado') { parar(); quitarCodigo(); estado(`Listo: la tele entró con la cuenta de ${c.usuario}. La verás en las sesiones abiertas de esa cuenta.`); vivo = null; return; }
  if (c.estado === 'anulado') { parar(); quitarCodigo(); estado('Ese código se anuló tras varios intentos fallidos. Crea otro.'); vivo = null; return; }
  if (c.estado === 'caducado' || c.caduca <= ahora) { parar(); quitarCodigo(); estado('El código caducó. Crea otro si lo necesitas.'); vivo = null; return; }
  if (!mostrado) estado(`Hay un código vivo para ${c.usuario} (caduca en ${mmss(c.caduca - ahora)}). Por seguridad no se vuelve a mostrar: si no lo anotaste, crea otro.`);
}
/** Al salir de la vista el código se olvida: se muestra una sola vez (volver a la vista dice que hay uno vivo, sin enseñarlo). */
function olvidar() { parar(); quitarCodigo(); vivo = null; }
function cuentaAtras() {
  if (!visible()) { olvidar(); return; }
  if (!vivo) { parar(); return; }
  const queda = vivo.caduca - Math.floor(Date.now() / 1000);
  if (queda <= 0) { contarEstado({ ...vivo, estado: 'caducado' }); return; }
  $('tc-vence').textContent = `Caduca en ${mmss(queda)} · entra como ${vivo.usuario} · sirve una vez`;
}
async function mirar() {
  if (!visible()) { olvidar(); return; }
  try { const r = await api('/api/tv/codigo'); if (vivo && r.codigo?.id === vivo.id) contarEstado(r.codigo, true); } catch { /* lo mira en la vuelta siguiente */ }
}

async function pintarTele() {
  const caja = $('tele-con');
  caja.hidden = !esAdmin();
  if (caja.hidden) return;
  $('tc-error').textContent = '';
  if (!vivo) quitarCodigo();
  let r;
  try { r = await api('/api/tv/codigo'); } catch (err) { $('tc-error').textContent = `No se pudo cargar. ${err.message}`; return; }
  const ops = $('tc-opciones');
  if (!r.lectores.includes(elegida)) elegida = r.lectores.length === 1 ? r.lectores[0] : null;
  ops.replaceChildren(...r.lectores.map((nombre) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: nombre });
    b.setAttribute('aria-pressed', String(nombre === elegida));
    b.addEventListener('click', () => { elegida = nombre; for (const o of ops.children) o.setAttribute('aria-pressed', String(o === b)); $('tc-crear').disabled = false; $('tc-error').textContent = ''; });
    return b;
  }));
  $('tc-quien').hidden = !r.lectores.length;
  $('tc-crear').hidden = !r.lectores.length;
  $('tc-crear').disabled = !elegida;
  if (!r.lectores.length) { estado('No hay cuentas que solo miren. Crea una en el servidor: usuarios.py crear NOMBRE --rol lector.'); return; }
  if (vivo && r.codigo?.id === vivo.id) { contarEstado(r.codigo, true); if (vivo) { cuentaAtras(); if (!reloj) reloj = setInterval(cuentaAtras, 1000); if (!sondeo) sondeo = setInterval(mirar, 3000); } }
  else contarEstado(r.codigo?.estado === 'vivo' ? r.codigo : null, false);
}

$('tc-crear').addEventListener('click', async () => {
  if (!elegida) { $('tc-error').textContent = 'Elige con qué cuenta entra la tele.'; return; }
  const b = $('tc-crear');
  b.disabled = true;
  $('tc-error').textContent = '';
  try {
    const r = await api('/api/tv/codigo', { metodo: 'POST', cuerpo: { usuario: elegida } });
    vivo = { id: r.id, usuario: r.usuario, caduca: r.caduca, codigo: r.codigo };
    $('tc-g1').textContent = r.codigo.slice(0, 4);
    $('tc-g2').textContent = r.codigo.slice(4);
    $('tc-cifras-sr').textContent = `Código: ${r.codigo.split('').join(' ')}`; // cifra a cifra, como se dicta
    $('tc-codigo').hidden = false;
    estado('');
    parar();
    cuentaAtras();
    reloj = setInterval(cuentaAtras, 1000);
    sondeo = setInterval(mirar, 3000);
    $('tc-copiar').focus();
  } catch (err) { $('tc-error').textContent = err.message || 'No se pudo crear el código.'; }
  b.disabled = false;
});
$('tc-copiar').addEventListener('click', async () => {
  if (!vivo) return;
  avisar(await copiarTexto(vivo.codigo) ? 'Código copiado.' : 'No se pudo copiar: díctalo o escríbelo a mano.', null, true);
});
