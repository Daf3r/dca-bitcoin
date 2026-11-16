import { diario, diarioParaOir, fechaLarga, textoDiario } from './lib.js';
import { miniMontana } from './arte.js';
import { alCambiarVoces, callar, leer, leyendo, vozEspanol } from './escuchar.js';
import { $, R, S } from './estado.js';

// El Diario del Libro (campamento 15A, idea 46): una portada con lo que pasó, para todos (también los lectores). Es una tarjeta del
// Resumen. Se arma con datos que ya existen (`lib.diario`); sin sección de «quién abrió y cuándo»: eso se sentiría como vigilancia.
// (Campamento 17) En el teléfono el Diario ocupaba pantalla y media antes de «Próxima etapa». Ahora sale en portada (titular y una
// línea) y «Leer el Diario de hoy» lo abre entero; otro toque lo pliega. Se recuerda la edición abierta (por dispositivo): la de
// mañana vuelve a salir en portada. En tablet y escritorio el botón no existe y el Diario va abierto (lo decide el CSS).
const CLAVE_ABIERTO = 'libro.diario.abierto';
let edicionAbierta = null;
try { edicionAbierta = localStorage.getItem(CLAVE_ABIERTO); } catch { /* sin almacenamiento: plegado */ }
let ultimo = null; // el último diario pintado
function pintarPliegue() {
  const abierto = Boolean(ultimo) && edicionAbierta === ultimo.edicion;
  $('diario').toggleAttribute('data-abierto', abierto);
  $('dia-abrir').setAttribute('aria-expanded', String(abierto));
  // Solo se escribe si cambió: el Diario se repinta con cada precio (cada 30 s) y el botón puede tener el foco.
  const poner = (id, txt) => { if ($(id).textContent !== txt) $(id).textContent = txt; };
  poner('dia-abrir-t', abierto ? 'Plegar el Diario' : 'Leer el Diario de hoy');
  poner('dia-abrir-d', abierto || !ultimo ? '' : ` · ${ultimo.haceUnAnio || ultimo.notaAnio ? 'hace un año, ' : ''}clasificados y pronóstico`);
}
$('dia-abrir').addEventListener('click', () => {
  if (!ultimo) return;
  edicionAbierta = edicionAbierta === ultimo.edicion ? null : ultimo.edicion;
  try { if (edicionAbierta) localStorage.setItem(CLAVE_ABIERTO, edicionAbierta); else localStorage.removeItem(CLAVE_ABIERTO); } catch { /* vale para esta visita */ }
  if (!edicionAbierta) callar(); // plegar el Diario lo cierra: si se estaba leyendo, se calla
  pintarPliegue();
});

// «Escuchar» (campamento 19, idea 33): el Diario leído por la voz del propio aparato (escuchar.js). Solo suena al tocarlo; otro toque lo
// calla, y también se calla al cambiar de pestaña, al plegar el Diario, al irse de la página o a la tele. Sin una voz en español del
// aparato el botón no sale (en Chrome las voces llegan un momento después: se vuelve a mirar cuando avisan). Es un interruptor:
// `aria-pressed` dice si está leyendo y el nombre no cambia.
const bOir = $('dia-oir');
let edicionLeida = null;
const marcarOir = (si) => bOir.setAttribute('aria-pressed', String(si));
function pintarOir() {
  const hay = Boolean(ultimo) && Boolean(vozEspanol());
  if (!hay) callar();
  bOir.hidden = !hay;
}
bOir.addEventListener('click', () => {
  if (leyendo()) { callar(); return; }
  if (!ultimo) return;
  if (leer(diarioParaOir(ultimo), { alTerminar: () => { marcarOir(false); edicionLeida = null; } })) { marcarOir(true); edicionLeida = ultimo.edicion; }
  else pintarOir(); // la voz ya no está (el sistema la quitó): fuera el botón
});
alCambiarVoces(pintarOir);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') callar(); });
window.addEventListener('pagehide', () => callar());
for (const ev of ['libro:pestana', 'libro:tv']) document.addEventListener(ev, () => callar());

export function pintarDiario() {
  const caja = $('diario');
  const d = S.cargado && R?.items && R.nCompras ? diario(R) : null;
  caja.hidden = !d;
  if (!d) { ultimo = null; pintarOir(); return; }
  if (edicionLeida && edicionLeida !== d.edicion) callar(); // pasó la medianoche mientras se leía: la de ayer ya no es la portada
  $('dia-edicion').textContent = `${d.edicion} · edición n.º ${d.numero}`;
  ultimo = d;
  pintarPliegue();
  $('t-diario').textContent = d.titular;
  $('dia-sub').textContent = d.sub;
  const grab = $('dia-grabado');
  grab.innerHTML = miniMontana({ altitud: d.altitud });
  grab.setAttribute('aria-label', `Grabado de la montaña: vas al ${Math.round(d.altitud * 100)} % de la altura de la cima.`);
  $('dia-hace-b').hidden = !d.haceUnAnio && !d.notaAnio;
  $('dia-hace').textContent = d.haceUnAnio?.texto ?? '';
  // La semana en una línea (campamento 18): lo que se anotó con la compra de esa semana, hace un año. Siempre con `textContent`.
  $('dia-nota').hidden = !d.notaAnio;
  $('dia-nota-k').textContent = d.notaAnio ? `El ${fechaLarga(d.notaAnio.fecha)} quedó anotado:` : '';
  $('dia-nota-q').textContent = d.notaAnio ? `«${d.notaAnio.nota}»` : '';
  const lista = $('dia-clasif');
  lista.textContent = '';
  for (const t of d.clasificados) {
    const li = document.createElement('li');
    const m = /^(SE [A-ZÁÉÍÓÚÑ]+)(.*)$/.exec(t); // «SE BUSCAN», «SE OFRECE»…: el encabezado del aviso va aparte (para darle su estilo)
    if (m) { const b = document.createElement('b'); b.textContent = m[1]; li.append(b, document.createTextNode(m[2])); } else li.textContent = t;
    lista.append(li);
  }
  $('dia-pron').textContent = d.pronostico;
  caja.setAttribute('aria-description', textoDiario(d));
  pintarOir();
}
