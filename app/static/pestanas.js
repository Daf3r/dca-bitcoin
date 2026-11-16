import { $, reducido } from './estado.js';
import { refrescarHistoria, verMedallas } from './historia.js';

// Pestañas (campamento 14): Resumen · Gráficos · Historia · Movimientos. Una sola vista a la vez, sin el scroll largo.
// No se mueve nada de sitio: cada bloque de la página lleva `data-p` con la pestaña a la que pertenece y el CSS esconde los demás
// (`.cuerpo[data-pestana="…"]`). En «Todo junto» (Tu cuenta → Pantalla) `.cuerpo` pierde `data-pestana`, la barra se esconde y todo
// vuelve a ser una sola página larga, como antes. Se recuerda la pestaña y el modo por dispositivo (con try/catch).
const PESTANAS = ['resumen', 'graficos', 'historia', 'movimientos'];
const CLAVE_PESTANA = 'libro.pestana', CLAVE_MODO = 'libro.pestanas';
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin almacenamiento: vale esta visita */ } };

let actual = PESTANAS.includes(leer(CLAVE_PESTANA)) ? leer(CLAVE_PESTANA) : 'resumen';
let porPestanas = leer(CLAVE_MODO) !== 'todo';

export const enPestanas = () => porPestanas;
export const pestanaActual = () => actual;
/** ¿Se ve ahora la pestaña de la historia? (en «Todo junto» siempre) */
export const historiaVisible = () => (porPestanas ? actual === 'historia' : historiaPedida);
// En «Todo junto» la historia no se pinta (son cientos de nodos que casi nadie mira ahí): sale, al final de la página, cuando se pide
// desde «Tu cuenta → Tu historia y medallas».
let historiaPedida = false;

function aplicar() {
  const cuerpo = $('principal');
  if (porPestanas) cuerpo.dataset.pestana = actual; else delete cuerpo.dataset.pestana;
  document.documentElement.toggleAttribute('data-pestanas', porPestanas);
  $('pestanas').hidden = !porPestanas;
  $('historia').hidden = !porPestanas && !historiaPedida; // con pestañas, el CSS la esconde cuando no es su turno
  for (const b of $('pestanas').children) {
    if (b.dataset.pestana === actual) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  }
  if (historiaVisible()) refrescarHistoria();
}

/** Cambia de pestaña. `desplazar`: sube hasta la barra si el contenido anterior era largo (no con el scroll arriba del todo). */
export function irAPestana(cual, { desplazar = true } = {}) {
  if (!PESTANAS.includes(cual)) return;
  actual = cual;
  guardar(CLAVE_PESTANA, cual === 'resumen' ? null : cual);
  aplicar();
  document.dispatchEvent(new CustomEvent('libro:pestana', { detail: { pestana: cual } })); // quien lee en voz alta (el Diario) se calla
  if (desplazar && porPestanas) subirAlInicio();
}

/** La barra puede ser pegajosa (no sirve para saber hasta dónde se bajó): se compara con el inicio natural del cuerpo. */
function subirAlInicio() {
  const arriba = $('principal').getBoundingClientRect().top;
  // Se deja un margen arriba: al bajar sale la mini-cabecera y la barra (pegajosa) se coloca bajo ella; sin ese margen la barra
  // quedaba unos píxeles encima del primer título de la pestaña.
  if (arriba < 0) window.scrollTo({ top: window.scrollY + arriba - 36, behavior: reducido() ? 'auto' : 'smooth' });
}

/** «Tu historia y medallas» de «Tu cuenta»: lleva a la pestaña (o, en «Todo junto», baja hasta la sección). */
export function verHistoria() {
  if (porPestanas) {
    irAPestana('historia', { desplazar: false });
    const arriba = $('principal').getBoundingClientRect().top;
    window.scrollTo({ top: Math.max(0, window.scrollY + arriba), behavior: reducido() ? 'auto' : 'smooth' });
  } else {
    historiaPedida = true;
    $('historia').hidden = false;
    refrescarHistoria();
    $('historia').scrollIntoView({ block: 'start', behavior: reducido() ? 'auto' : 'smooth' });
  }
}

export function fijarModoPestanas(si) {
  porPestanas = si;
  guardar(CLAVE_MODO, si ? null : 'todo');
  aplicar();
  document.dispatchEvent(new CustomEvent('libro:pestana', { detail: { pestana: si ? actual : null } }));
}
export const etiquetaModo = () => `Pantalla: ${porPestanas ? 'por pestañas' : 'todo junto'}`;

$('pestanas').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-pestana]');
  if (b && b.dataset.pestana !== actual) irAPestana(b.dataset.pestana);
});
// Flechas izquierda y derecha entre las pestañas (además de Tab), como una barra de pestañas.
$('pestanas').addEventListener('keydown', (e) => {
  const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!d) return;
  const i = PESTANAS.indexOf(document.activeElement?.dataset?.pestana);
  if (i < 0) return;
  e.preventDefault();
  $('pestanas').children[(i + d + PESTANAS.length) % PESTANAS.length].focus();
});
$('res-historia').addEventListener('click', () => { irAPestana('historia'); verMedallas(); }); // con sus medallas abiertas (campamento 20)
aplicar();
