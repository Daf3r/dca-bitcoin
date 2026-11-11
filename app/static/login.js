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

// La montaña reacciona a lo que haces (idea 35): el campo enfocado deja una marca en <html> que el CSS aprovecha.
const marcar = (v) => { document.documentElement.dataset.entrada = v; };
form.addEventListener('focusin', (e) => marcar(e.target.id === 'l-usuario' ? 'usuario' : e.target.id === 'l-clave' ? 'clave' : ''));
form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) marcar(''); }, 60));

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
      body: JSON.stringify({ usuario, clave, compartido: $('l-compartido').checked }),
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
