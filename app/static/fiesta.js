// (Campamento 59) La fiesta del hito, en la escena viva: dirige el guion de lib.js (`guionFiesta`) con el arte de arte-fiesta.js sobre la
// escena que dibujó montana.js. Cada pieza que se mueve va en su propia capa pequeña (un <svg> hermano del principal, encima de él y
// debajo del frente) y se mueve entera: solo transform y opacidad. Los vecinos cambian de cuadro a saltos (otro reparto de los mismos
// trazos, como un turno). Mientras dura, `data-mueve` es `fiesta-hito` (cielo.js: la fiesta es el actor principal; el de la franja y lo
// ambiental esperan). Un toque, una tecla, la rueda o deslizar la saltan al final; al acabar (o al saltarla, o si la escena se redibuja)
// queda el estado final: los vecinos del turno de ahora y, si toca, el farol del hito hasta la medianoche.
import { guionFiesta, palmasFiesta } from './lib.js';
import { nivelEfectos } from './movimiento.js';
import { farolitos, ondasCampana, palma } from './arte-fiesta.js';
import { gestoCumbre, marcarFiesta, ponerFarolHito, sitiosFiesta, vecinosFiesta } from './montana.js';

const NS = 'http://www.w3.org/2000/svg';
let viva = null; // { host, timers, capas, guion, fin, quitar, vecinos }

/** (59) Si hay una fiesta en marcha en la escena. */
export const enFiesta = () => Boolean(viva);

/** Una capa pequeña de la fiesta: un <svg> con su caja en píxeles de la escena, entre el principal y el frente. */
function capa(host, clase, [x, y, w, h], html) {
  const s = document.createElementNS(NS, 'svg');
  for (const [a, v] of [['class', `fiesta-capa ${clase}`], ['viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`], ['aria-hidden', 'true'], ['focusable', 'false']]) s.setAttribute(a, v);
  Object.assign(s.style, { left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`, width: `${w.toFixed(1)}px`, height: `${h.toFixed(1)}px` });
  s.innerHTML = html;
  const frente = host.querySelector(':scope > svg.frente');
  if (frente) frente.before(s); else host.append(s);
  return s;
}

/**
 * Lo de arriba que no se debe tapar: el saldo y la tarjeta del hito, en píxeles de la escena. Desde 1100 px el saldo y la tarjeta van en
 * su columna, a la izquierda, y los cohetes sobre la cumbre no los tocan.
 */
function techoDe(host, techo) {
  if (host.clientWidth >= 1100) return 0;
  const top = host.getBoundingClientRect().top;
  const tarjeta = [...document.querySelectorAll('#hito-cel:not([hidden]) > *')].map((e) => e.getBoundingClientRect().bottom - top).filter((v) => v > 0);
  return Math.max(techo || 0, ...tarjeta);
}

/**
 * Empieza la fiesta de `escala` ('campamento', 'principal', 'intermedia' o 'halving') en la escena de la página. `conTu`: solo quien
 * anota («Tú» levanta los brazos en el clímax); `tv`: los cohetes a la derecha de la cumbre. Devuelve una promesa que se cumple al acabar
 * (también si se salta). Con «ninguno», el estado final de golpe.
 * @param {{ escala: 'campamento' | 'principal' | 'intermedia' | 'halving', conTu?: boolean, tv?: boolean }} o
 * @returns {Promise<void>}
 */
export function fiestaDelHito({ escala, conTu = false, tv = false }) {
  terminarFiesta();
  const sit = sitiosFiesta();
  const C = window.libroCielo, h = C?.hora?.() ?? 12, raiz = document.documentElement;
  const g = guionFiesta(escala, { noche: h >= 22 || h < 5, lluvia: raiz.dataset.epoca === 'lluviosa' && raiz.hasAttribute('data-tarde'), efectos: nivelEfectos(), ancho: sit?.W ?? innerWidth, conTu });
  if (!sit || !g.pasos.length) { if (g.farol) ponerFarolHito(); return Promise.resolve(); }
  return new Promise((listo) => {
    const v = { host: sit.host, timers: [], capas: [], guion: g, vecinos: false, fin: listo, quitar: null };
    viva = v;
    marcarFiesta(true);
    C?.fiestaHito?.(true);
    raiz.dataset.fiestaHito = escala;
    const en = (ms, fn) => v.timers.push(setTimeout(() => { if (viva === v) fn(); }, ms));
    const pon = (clase, dibujo, vida) => { const s = capa(sit.host, clase, dibujo.caja, dibujo.svg); v.capas.push(s); if (vida) en(vida, () => s.remove()); return s; };
    const conTuAqui = g.pasos.some((p) => p.que === 'tu');
    for (const p of g.pasos) {
      en(p.en, () => {
        if (p.que === 'vecinos') { vecinosFiesta(p.cuadro); v.vecinos = true; }
        else if (p.que === 'campana' && sit.campana) {
          const s = pon('fiesta-ondas', ondasCampana(sit.campana.x, sit.campana.y, sit.k), (p.toques ?? 1) * 1600 + 200);
          s.style.animationIterationCount = String(p.toques ?? 1);
        } else if (p.que === 'faroles') {
          const s = pon('fiesta-faroles', farolitos(p.n ?? 1, sit.plaza.x, sit.plaza.alto - 3 * sit.k, sit.k), p.dura);
          // Suben de la plaza hacia la cumbre, por encima de «Tú», y se pierden arriba (sin pasar por encima del saldo).
          const techo = techoDe(sit.host, sit.techo), destinoY = Math.max(techo + 24, Math.min(sit.tu.y - 30 * sit.k, sit.cumbre.y + 40));
          s.style.setProperty('--dx', `${((sit.tu.x + sit.cumbre.x) / 2 - sit.plaza.x).toFixed(1)}px`);
          s.style.setProperty('--dy', `${(destinoY - sit.plaza.alto).toFixed(1)}px`);
          s.style.animationDuration = `${p.dura}ms`;
        } else if (p.que === 'cohetes') {
          const lista = palmasFiesta({ W: sit.W, H: sit.H, n: p.n ?? 1, tu: sit.tu, cumbre: sit.cumbre, techo: techoDe(sit.host, sit.techo), k: sit.k * 0.35, tv }); // (la escala de los cohetes: la de la plaza, en su ancho)
          lista.forEach((q, i) => { const s = pon(`fiesta-palma fi-p${i}`, palma(q.x, q.y, q.r, q.c), 2600 + i * 500); s.style.animationDelay = `${i * 500}ms`; });
        } else if (p.que === 'cumbre') gestoCumbre(conTuAqui);
      });
    }
    en(g.ms, () => terminarFiesta());
    // Saltarla: cualquier toque, tecla, rueda o deslizar (el toque sigue a lo suyo: nada de la fiesta recibe toques).
    const saltar = () => terminarFiesta();
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchmove'];
    for (const e of evs) addEventListener(e, saltar, { capture: true, passive: true });
    // El desplazamiento, un momento después (la página pudo subir sola a la escena antes de empezar).
    const armar = setTimeout(() => addEventListener('scroll', saltar, { passive: true }), 700);
    v.quitar = () => { clearTimeout(armar); for (const e of evs) removeEventListener(e, saltar, true); removeEventListener('scroll', saltar); };
  });
}

/** Lleva la fiesta en marcha a su estado final (si la hay): quita sus capas, vuelve el turno de ahora y deja el farol si toca. */
export function terminarFiesta() {
  const v = viva;
  if (!v) return;
  viva = null;
  for (const t of v.timers) clearTimeout(t);
  for (const s of v.capas) s.remove();
  v.host.querySelectorAll(':scope > svg.fiesta-capa').forEach((s) => s.remove());
  v.quitar?.();
  marcarFiesta(false);
  window.libroCielo?.fiestaHito?.(false);
  delete document.documentElement.dataset.fiestaHito;
  if (v.host.isConnected) {
    if (v.vecinos) vecinosFiesta(null);
    if (v.guion.farol) ponerFarolHito();
  }
  v.fin();
}
