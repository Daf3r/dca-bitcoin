// «Escuchar» (campamento 19, idea 33): el libro te lee el Diario con la voz del propio aparato (`speechSynthesis`). Nada de terceros:
// solo se usan voces en español que el navegador marca como del aparato (`localService`); las voces «en línea» (las de Google o
// Microsoft que mandan el texto a sus servidores) no cuentan. Si el aparato no tiene ninguna, quien lo use no enseña el botón.
// No importa nada de la app: solo sabe leer frases y callarse.

const sintesis = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null);
// Las variantes del español más cercanas a El Salvador primero; la de España, al final.
const CERCANAS = ['es-sv', 'es-419', 'es-mx', 'es-us', 'es-gt', 'es-hn', 'es-ni', 'es-cr', 'es-co'];
function rango(v) {
  const l = String(v.lang ?? '').replace('_', '-').toLowerCase();
  const i = CERCANAS.indexOf(l);
  if (i >= 0) return i;
  if (l === 'es-es') return CERCANAS.length + 2;
  return l === 'es' ? CERCANAS.length + 1 : CERCANAS.length; // otra de América, luego «es» a secas
}

/** La mejor voz en español del propio aparato, o null si no hay ninguna (o el navegador aún no las cargó). */
export function vozEspanol() {
  const s = sintesis();
  if (!s) return null;
  let voces = [];
  try { voces = s.getVoices() ?? []; } catch { voces = []; }
  const es = voces.filter((v) => v && v.localService === true && /^es([-_]|$)/i.test(String(v.lang ?? '')));
  if (!es.length) return null;
  return [...es].sort((a, b) => rango(a) - rango(b) || Number(Boolean(b.default)) - Number(Boolean(a.default)))[0];
}

/** Avisa cuando cambian las voces (en Chrome llegan un momento después de cargar la página; en Safari ya están). */
export function alCambiarVoces(fn) {
  const s = sintesis();
  if (!s) return;
  try { s.addEventListener('voiceschanged', fn); } catch { /* navegador viejo: sin evento */ }
}

let lectura = null; // { id, alTerminar, reloj }
let siguiente = 0;
export const leyendo = () => lectura !== null;

function terminar(id) {
  if (!lectura || lectura.id !== id) return;
  const { alTerminar, reloj } = lectura;
  clearInterval(reloj);
  lectura = null;
  alTerminar?.();
}

/**
 * Lee las frases una tras otra (en frases cortas: una voz muy larga se corta sola en algunos navegadores). Debe llamarse desde un toque
 * (iPhone y Chrome no dejan hablar sin uno). Devuelve false si no hay voz en español del aparato. `alTerminar` corre una sola vez: al
 * acabar, al fallar o al callarse.
 */
export function leer(frases, { alTerminar } = {}) {
  const s = sintesis(), voz = vozEspanol();
  if (!s || !voz || !frases?.length) return false;
  callar();
  const id = ++siguiente;
  let quedan = frases.length;
  try {
    for (const f of frases) {
      const u = new window.SpeechSynthesisUtterance(f);
      u.voice = voz;
      u.lang = voz.lang;
      u.rate = 0.95;
      u.onend = () => { quedan -= 1; if (quedan <= 0) terminar(id); };
      u.onerror = () => terminar(id); // una frase que falla (o la lectura cancelada) termina la lectura
      s.speak(u);
    }
  } catch {
    try { s.cancel(); } catch { /* ya se calló */ }
    return false;
  }
  // Vigía: algunos navegadores no avisan al terminar (o al cortar el audio el sistema). Si lleva dos revisiones sin hablar ni tener nada
  // en cola, se da por terminada.
  let quieto = 0;
  const reloj = setInterval(() => {
    if (s.speaking || s.pending) { quieto = 0; return; }
    quieto += 1;
    if (quieto >= 2) terminar(id);
  }, 1000);
  lectura = { id, alTerminar, reloj };
  return true;
}

/** Calla lo que se esté leyendo (si se está leyendo algo) y avisa a quien la empezó. */
export function callar() {
  const s = sintesis();
  if (!lectura) return;
  // Primero se suelta la lectura (los `onerror` de «cancelado» que llegan después ya no son de nadie) y luego se cancela.
  const { alTerminar, reloj } = lectura;
  clearInterval(reloj);
  lectura = null;
  try { s?.cancel(); } catch { /* ya se calló */ }
  alTerminar?.();
}
