import { PASOS_HZ, etapasCruzadas } from './lib.js';

// Sonido corto y opcional al guardar una compra (idea 26): apagado por defecto, se activa en «Tu cuenta» (por dispositivo, `libro.sonido`).
// Se genera en el momento con Web Audio (sin archivos de sonido) y solo suena como respuesta a un toque tuyo. Es discreto: volumen bajo y
// menos de medio segundo. Los navegadores lo callan solos si el teléfono está en silencio o la pestaña no puede reproducir audio.
const CLAVE = 'libro.sonido';
export function sonidoActivo() { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } }
export function fijarSonido(v) { try { localStorage.setItem(CLAVE, v ? '1' : '0'); } catch { /* sin almacenamiento: vale esta visita */ } if (!v) cierre(); }

let ctx = null;
const cierre = () => { try { ctx?.close(); } catch { /* ya cerrado */ } ctx = null; };
function audio() {
  const Ctx = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx || ctx.state === 'closed') ctx = new Ctx();
  if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
  return ctx;
}
// Notas (Hz): do, mi, sol y do alto de una escala mayor, suaves como una campanita.
const NOTAS = { do: 523.25, mi: 659.25, sol: 783.99, do2: 1046.5 };
function nota(c, hz, inicio, dur, vol) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine';
  o.frequency.value = hz;
  const t = c.currentTime + inicio;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
/** `compra`: dos notas que suben; `etapa`: tres (un arpegio breve). `forzar` es para la prueba al encender el sonido. */
export function sonar(tipo = 'compra', { forzar = false } = {}) {
  if (!forzar && !sonidoActivo()) return;
  try {
    const c = audio();
    if (!c) return;
    const v = 0.07;
    if (tipo === 'etapa') [['do', 0], ['mi', 0.11], ['sol', 0.22], ['do2', 0.33]].forEach(([n, t]) => nota(c, NOTAS[n], t, 0.28, v));
    else [['mi', 0], ['sol', 0.1]].forEach(([n, t]) => nota(c, NOTAS[n], t, 0.22, v));
  } catch { /* el sonido nunca puede romper el guardado */ }
}
/** El que corresponde a guardar una compra: con etapa cruzada suena más largo. */
export const sonarGuardado = (satsAntes, satsDespues) => sonar(etapasCruzadas(satsAntes, satsDespues).length ? 'etapa' : 'compra');

/**
 * La partitura (campamento 13C): toca las notas de un año, una tras otra, como respuesta a tu toque en «Tocar» (por eso suena aunque el
 * sonido al guardar esté apagado). `pasos` son posiciones 0–12 de `lib.PASOS_HZ`; el año entero cabe en unos 6 segundos como mucho.
 * Devuelve una función para detenerla. `alNota(k)` avisa de la nota que suena y `alFin()` de que terminó o se detuvo.
 */
export function tocarPasos(pasos, { alNota = () => {}, alFin = () => {} } = {}) {
  const c = (() => { try { return audio(); } catch { return null; } })();
  if (!c || !pasos.length) { alFin(); return () => {}; }
  const sep = Math.min(0.32, 6 / pasos.length), dur = Math.min(0.5, sep * 2.4);
  let alarma = null, k = 0, parada = false;
  const siguiente = () => {
    if (parada) return;
    if (k >= pasos.length) { alarma = setTimeout(() => { if (!parada) { parada = true; alFin(); } }, dur * 1000); return; }
    try { nota(c, PASOS_HZ[Math.max(0, Math.min(12, pasos[k]))], 0, dur, 0.06); } catch { /* el sonido nunca rompe nada */ }
    alNota(k++);
    alarma = setTimeout(siguiente, sep * 1000);
  };
  siguiente();
  return () => { if (parada) return; parada = true; clearTimeout(alarma); alFin(); };
}
