import { dibujarMontana } from './montana.js';
import { instalarParallax } from './parallax.js';

const $ = (id) => document.getElementById(id);
const host = $('montana');
const pintar = () => dibujarMontana(host, { sats: 0, meta: 1e5, inicio: 0, techo: 40 });
pintar();
instalarParallax();
let ancho = host.clientWidth, alto = host.clientHeight;
new ResizeObserver(() => { if (host.clientWidth !== ancho || Math.abs(host.clientHeight - alto) > 2) { ancho = host.clientWidth; alto = host.clientHeight; pintar(); } }).observe(host);

const form = $('f-login');

// Con el teclado del teléfono abierto, el formulario entero (hasta Entrar y el error) debe verse:
// se añade el alto del teclado como relleno y se sube lo justo para que quepa.
const vv = window.visualViewport;
function encajar() {
  const f = form.hidden ? $('f-codigo') : form; // el formulario a la vista (el de siempre o el del código)
  if (!vv || !f.contains(document.activeElement)) return;
  const teclado = Math.max(0, window.innerHeight - vv.height);
  document.body.style.paddingBottom = teclado > 80 ? `${teclado}px` : '';
  const caja = f.getBoundingClientRect();
  const sobra = caja.bottom - (vv.offsetTop + vv.height) + 12;
  if (sobra > 0) window.scrollBy({ top: Math.min(sobra, caja.top - vv.offsetTop - 8), behavior: 'auto' });
}
vv?.addEventListener('resize', encajar);
form.addEventListener('focusin', () => setTimeout(encajar, 60));
form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) document.body.style.paddingBottom = ''; }, 120));

// La montaña reacciona a lo que haces (idea 35): el campo enfocado deja una marca en <html> que el CSS aprovecha.
const marcar = (v) => { document.documentElement.dataset.entrada = v; };
form.addEventListener('focusin', (e) => marcar(e.target.id === 'l-usuario' ? 'usuario' : ['l-clave', 'l-ver'].includes(e.target.id) ? 'clave' : ''));
form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) marcar(''); }, 60));

// Ver la contraseña (campamento 17): «Ver» la enseña y pasa a «Ocultar»; se vuelve a ocultar sola a los 10 s sin escribir, al enviar
// y al salir de la pestaña. Sigue siendo el mismo campo (`autocomplete="current-password"`): los gestores de contraseñas no lo notan.
const clave = $('l-clave'), ver = $('l-ver');
const MS_VISIBLE = 10_000;
let relojVer = 0;
function mostrarClave(si) {
  clave.type = si ? 'text' : 'password';
  ver.setAttribute('aria-pressed', String(si));
  $('l-ver-t').textContent = si ? 'Ocultar' : 'Ver';
  clearTimeout(relojVer);
  if (si) relojVer = setTimeout(() => mostrarClave(false), MS_VISIBLE);
}
ver.addEventListener('click', () => {
  const [i, f] = [clave.selectionStart, clave.selectionEnd];
  mostrarClave(clave.type === 'password');
  clave.focus(); // se sigue escribiendo donde se estaba
  try { if (i != null) clave.setSelectionRange(i, f); } catch { /* da igual dónde quede el cursor */ }
});
clave.addEventListener('input', () => { if (clave.type === 'text') mostrarClave(true); }); // mientras se escribe, no se esconde a medias
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') mostrarClave(false); });

// Mayúsculas puestas: solo se dice después de un intento fallido (antes sería ruido) y mientras sigan puestas. Su sitio ya está
// reservado junto a la etiqueta, así que el formulario no cambia de alto.
let huboFallo = false, mayusculas = false;
const pintarMayus = () => { const t = huboFallo && mayusculas ? 'Mayúsculas activadas' : ''; if ($('l-mayus').textContent !== t) $('l-mayus').textContent = t; };
const mirarMayus = (e) => { if (typeof e.getModifierState === 'function') { mayusculas = e.getModifierState('CapsLock'); pintarMayus(); } };
for (const tipo of ['keydown', 'keyup', 'click']) form.addEventListener(tipo, mirarMayus);

const boton = $('l-entrar');
const error = (t) => { $('l-error').textContent = t; if (t) encajar(); };

fetch('/api/estado', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
  if (j.abierto) return;
  const aviso = $('l-aviso');
  aviso.hidden = false;
  aviso.textContent = 'Aún no hay cuentas. En el servidor: docker compose exec app python usuarios.py crear TU_NOMBRE --rol admin';
  document.querySelectorAll('.login-caja :is(input, button)').forEach((el) => { el.disabled = true; });
}).catch(() => {});

// ---------------------------------------------------------------- entrar con un código (campamento 21B, idea 43)
// Para la tele de la sala: quien administra el libro crea en su teléfono un código de 8 cifras para una cuenta de lectura y aquí se teclea.
// Sirve una vez y caduca a los 5 minutos. Se abre con «Entrar con un código» o directamente con /login#codigo (y con /login#tv, adonde
// llega una tele cuya sesión caducó). Al entrar, la tele vuelve a su modo de pantalla grande (/#tv).
const fCodigo = $('f-codigo'), codigo = $('l-codigo');
const quiereTele = ['#tv', '#codigo'].includes(location.hash);
function modoCodigo(si, foco = true) {
  form.hidden = si;
  fCodigo.hidden = !si;
  $('l-c-error').textContent = '';
  if (foco) (si ? codigo : $('l-usuario')).focus();
}
$('l-a-codigo').addEventListener('click', () => modoCodigo(true));
$('l-a-clave').addEventListener('click', () => modoCodigo(false));
// Se escribe como se dicta: «1234 5678» (solo cifras; el espacio lo pone solo).
const cifras = () => codigo.value.replace(/\D/g, '').slice(0, 8);
codigo.addEventListener('input', () => {
  const c = cifras(), bonito = c.length > 4 ? `${c.slice(0, 4)} ${c.slice(4)}` : c;
  if (codigo.value !== bonito) codigo.value = bonito;
  if ($('l-c-error').textContent) $('l-c-error').textContent = '';
});
fCodigo.addEventListener('focusin', () => { marcar('clave'); setTimeout(encajar, 60); });
fCodigo.addEventListener('focusout', () => setTimeout(() => { if (!fCodigo.contains(document.activeElement)) marcar(''); }, 60));
fCodigo.addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = cifras(), boton = $('l-c-entrar'), err = $('l-c-error');
  if (c.length !== 8) { err.textContent = 'Escribe las 8 cifras del código.'; codigo.focus(); return; }
  boton.disabled = true;
  boton.textContent = 'Entrando…';
  err.textContent = '';
  try {
    const r = await fetch('/api/login/codigo', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Libro': '1' },
      body: JSON.stringify({ codigo: c }),
    });
    if (r.ok) { location.replace('/#tv'); return; }
    const j = await r.json().catch(() => null);
    err.textContent = j?.error || `Error ${r.status}.`;
    if (r.status === 401) { codigo.value = ''; codigo.focus(); }
  } catch {
    err.textContent = 'Sin conexión con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  }
  boton.disabled = false;
  boton.textContent = 'Entrar';
});
if (quiereTele) modoCodigo(true); // quien llega aquí viene a teclear el código: el campo ya está listo

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = $('l-usuario').value.trim();
  const clave = $('l-clave').value;
  if (!usuario || !clave) { error('Escribe usuario y contraseña.'); (usuario ? $('l-clave') : $('l-usuario')).focus(); return; }
  mostrarClave(false);
  boton.disabled = true;
  boton.textContent = 'Entrando…';
  error('');
  try {
    const r = await fetch('/api/login', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Libro': '1' },
      body: JSON.stringify({ usuario, clave, compartido: $('l-compartido').checked }),
    });
    if (r.ok) { location.replace(quiereTele ? '/#tv' : '/'); return; } // una tele con la sesión caducada vuelve a su pantalla grande
    const j = await r.json().catch(() => null);
    error(j?.error || `Error ${r.status}.`);
    if (r.status === 401) { huboFallo = true; pintarMayus(); $('l-clave').value = ''; $('l-clave').focus(); }
  } catch {
    error('Sin conexión con el servidor. Revisa tu conexión y vuelve a intentarlo.');
  }
  boton.disabled = false;
  boton.textContent = 'Entrar';
});
