import { dibujarMontana } from './montana.js';

const $ = (id) => document.getElementById(id);
const host = $('montana');
const pintar = () => dibujarMontana(host, { sats: 0, meta: 1e5, inicio: 0, techo: 40 });
pintar();
let ancho = host.clientWidth;
new ResizeObserver(() => { if (host.clientWidth !== ancho) { ancho = host.clientWidth; pintar(); } }).observe(host);

const form = $('f-login');

// Con el teclado del teléfono abierto, el formulario entero (hasta Entrar y el error) debe verse:
// se añade el alto del teclado como relleno y se sube lo justo para que quepa.
const vv = window.visualViewport;
function encajar() {
  if (!vv || !form.contains(document.activeElement)) return;
  const teclado = Math.max(0, window.innerHeight - vv.height);
  document.body.style.paddingBottom = teclado > 80 ? `${teclado}px` : '';
  const caja = form.getBoundingClientRect();
  const sobra = caja.bottom - (vv.offsetTop + vv.height) + 12;
  if (sobra > 0) window.scrollBy({ top: Math.min(sobra, caja.top - vv.offsetTop - 8), behavior: 'auto' });
}
vv?.addEventListener('resize', encajar);
form.addEventListener('focusin', () => setTimeout(encajar, 60));
form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) document.body.style.paddingBottom = ''; }, 120));

const boton = $('l-entrar');
const error = (t) => { $('l-error').textContent = t; if (t) encajar(); };

fetch('/api/estado', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
  if (j.abierto) return;
  const aviso = $('l-aviso');
  aviso.hidden = false;
  aviso.textContent = 'Aún no hay cuentas. En el servidor: docker compose exec app python usuarios.py crear TU_NOMBRE --rol admin';
  form.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });
}).catch(() => {});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = $('l-usuario').value.trim();
  const clave = $('l-clave').value;
  if (!usuario || !clave) { error('Escribe usuario y contraseña.'); (usuario ? $('l-clave') : $('l-usuario')).focus(); return; }
  boton.disabled = true;
  boton.textContent = 'Entrando…';
  error('');
  try {
    const r = await fetch('/api/login', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Libro': '1' },
      body: JSON.stringify({ usuario, clave }),
    });
    if (r.ok) { location.replace('/'); return; }
    const j = await r.json().catch(() => null);
    error(j?.error || `Error ${r.status}.`);
    if (r.status === 401) { $('l-clave').value = ''; $('l-clave').focus(); }
  } catch {
    error('Sin conexión con el servidor. Revisa tu conexión y vuelve a intentarlo.');
  }
  boton.disabled = false;
  boton.textContent = 'Entrar';
});
