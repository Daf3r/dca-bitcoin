// (Campamento 26) Los mismos osos de la cumbre en otras poses, como pequeñas ilustraciones de la interfaz: la lista y «Tu historia» sin
// compras, la bienvenida de quien solo mira, las cartas para el futuro, los errores, el mantenimiento y la tele dormida. Funciones puras
// que devuelven un <svg> como texto: sin DOM, sin estilos en línea, decorativo (`aria-hidden`, `focusable="false"`).
// Las piezas (cabeza, cuerpo, cara y ropa) son las de `arte-osos.js` (`PARTES`): misma cara, mismas proporciones y la misma ropa que en
// la montaña; si un día cambia la cara en la cumbre, cambia en todas partes. Lo que cambia es la pose (brazos, cabeza, ojos) y lo que
// llevan en las manos (un libro, un sobre, la mochila). Cada oso va en un grupo con un trazo por tono, como en la escena; los colores, por
// variables (`--oso-*` y las de la interfaz: bloque «Campamento 26» de styles.css). Sobre una tarjeta la luz y la sombra siguen al tema,
// no al cielo de la escena.
import { PARTES } from './arte-osos.js';

const { arco, elipse, canto, PIEZAS, CARA, ROPA } = PARTES;
const f1 = (n) => n.toFixed(1);
const RAD = Math.PI / 180;
const ESCALA = { grande: 1, chico: 0.7, mameluco: 0.84 };
// Las piezas de PIEZAS que son de la cabeza (giran con ella): la orejita en sombra, la cabeza en sombra y en luz, su canto y la otra orejita.
const DE_CABEZA = new Set([2, 3, 5, 6, 8]);
const CUELLO = [0, -8.4];
const girar = (pts, ang, [cx, cy] = CUELLO) => { const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
const mover = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
/** Suma planos a un tono de `pl` (crea su lista si no la tiene). */
const sumar = (pl, tono, ...pts) => {
  if (!pl[tono]) pl[tono] = [];
  pl[tono].push(...pts);
};
/** Una cápsula (un bracito) de `a` a `b` con radio `r`. */
const capsula = ([ax, ay], [bx, by], r, n = 7) => {
  const ang = Math.atan2(by - ay, bx - ax) / RAD;
  return [...arco(bx, by, r, r, ang - 90, ang + 90, n), ...arco(ax, ay, r, r, ang + 90, ang + 270, n)];
};
/** El canto en tono medio de un bracito iluminado: una media luna por su lado de fuera (el de la luz), como el de la cabeza. */
const cantoBrazo = ([ax, ay], [bx, by], r, lado = 1) => {
  const ang = Math.atan2(by - ay, bx - ax) / RAD, nx = -Math.sin(ang * RAD) * lado, ny = Math.cos(ang * RAD) * lado, h = r * 0.55;
  return [[ax + nx * r, ay + ny * r], [bx + nx * r, by + ny * r], ...arco(bx, by, r, r, ang + 90 * lado, ang, 3).slice(1), [bx + nx * (r - h), by + ny * (r - h)], [ax + nx * (r - h), ay + ny * (r - h)]];
};
const OJOS = CARA.rasgos.slice(1), NARIZ = CARA.rasgos[0], HOCICO = CARA.hocico[0], MANITAS = CARA.hocico.slice(1);
/** Ojos cerrados: dos medias lunas finas, curvas hacia abajo (dormido) o hacia arriba (contento). */
const ojosCerrados = (feliz = false) => OJOS.map((o) => {
  const cx = o.reduce((a, p) => a + p[0], 0) / o.length, cy = o.reduce((a, p) => a + p[1], 0) / o.length + 0.2;
  return feliz ? canto(cx, cy + 0.6, 1.05, 0.9, 200, 340, 0.36, 5) : canto(cx, cy - 0.5, 1.05, 0.9, 20, 160, 0.36, 5);
});
/** Una zeta llena (de dormir), con su esquina abajo a la izquierda en (x, y) y alto `h`. */
const zeta = (x, y, h) => { const w = h * 0.9, t = h * 0.22; return [[x, y - h], [x + w, y - h], [x + w, y - h + t], [x + t * 1.4, y - t], [x + w, y - t], [x + w, y], [x, y], [x, y - t], [x + w - t * 1.4, y - h + t], [x, y - h + t]]; };
/** Un signo de pregunta lleno (estar confundido), centrado arriba en (x, y), alto `h`: el gancho, el palito y el punto. */
const pregunta = (x, y, h) => { const r = h * 0.28; return [canto(x, y + r, r, r, -200, 80, r * 0.55, 10), [[x + r * 0.05, y + r * 2 - 0.1], [x + r * 0.6, y + r * 2.1], [x + r * 0.55, y + r * 2.9], [x, y + r * 2.9]], elipse(x + r * 0.28, y + h - r * 0.3, r * 0.36, r * 0.36, 8)]; };
/** Una chispa de cuatro puntas en (x, y). */
const chispa = (x, y, r) => [[x, y - r], [x + r * 0.26, y - r * 0.26], [x + r, y], [x + r * 0.26, y + r * 0.26], [x, y + r], [x - r * 0.26, y + r * 0.26], [x - r, y], [x - r * 0.26, y - r * 0.26]];

/**
 * Un oso (sus planos por tono) en una pose. `cabeza`: grados que inclina la cabeza; `ojos`: 'abiertos' | 'abajo' | 'dormido' | 'feliz';
 * `brazos`: [{ de, a, lado: 'luz'|'sombra', aparte }] (sin manitas en la panza si hay brazos). Un brazo `aparte` no se suma a los planos
 * del cuerpo: va en `pl.aparte` (el brazo que saluda, que se mueve solo). Devuelve { tono: [puntos…] }.
 */
function oso(quien, { cabeza = 0, ojos = 'abiertos', brazos = [], manitas = true } = {}) {
  const pl = { aparte: {} };
  const add = (tono, pts, a = pl) => sumar(a, tono, pts);
  const cab = (pts) => (cabeza ? girar(pts, cabeza) : pts);
  PIEZAS.forEach(([tono, pts], i) => add(tono, DE_CABEZA.has(i) ? cab(pts) : pts));
  for (const [tono, pts] of ROPA[quien] || []) add(tono, pts);
  // Brazos: el iluminado en luz con su canto; el de la sombra, en el tono medio (en el de sombra se fundía con la media luna de la cabeza
  // y parecía un ala). La manita al final, del crema del hocico.
  for (const { de, a, lado = 'luz', r = 1.35, aparte = false } of brazos) {
    const dest = aparte ? pl.aparte : pl;
    add(lado === 'luz' ? 'luz' : 'medio', capsula(de, a, r), dest);
    if (lado === 'luz') add('medio', cantoBrazo(de, a, r, a[0] < de[0] ? -1 : 1), dest);
    add('hocico', elipse(a[0], a[1], r * 1.08, r, 9), dest);
  }
  add('hocico', cab(HOCICO));
  if (manitas && !brazos.length) for (const m of MANITAS) add('hocico', m);
  add('rasgos', cab(NARIZ));
  if (ojos === 'abiertos' || ojos === 'abajo') for (const o of OJOS) add('ojos', cab(ojos === 'abajo' ? mover(o, 0, 0.7) : o));
  else for (const o of ojosCerrados(ojos === 'feliz')) add('ojos-cerrados', cab(o));
  return pl;
}

const TONOS = ['mochila', 'sombra', 'luz', 'medio', 'marino', 'celeste', 'parche', 'cinta', 'tapa', 'papel', 'pliegue', 'palo', 'hocico', 'rasgos', 'ojos', 'ojos-cerrados', 'chispa', 'signo'];
const d = (lista) => lista.map((pts) => `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`).join('');

/** Coloca un oso (sus planos) en (x, y) con escala `s` y lo vuelve un grupo; lo `aparte` va al final, en su propio grupo. */
function grupo(quien, pl, x = 0, y = 0, s = ESCALA[quien]) {
  const T = (lista) => lista.map((pts) => pts.map(([px, py]) => [x + px * s, y + py * s]));
  const todos = [];
  const trazos = (planos) => TONOS.filter((t) => planos[t]).map((t) => { const pts = T(planos[t]); todos.push(...pts.flat()); return `<path class="oso-${t}" d="${d(pts)}"/>`; }).join('');
  const aparte = trazos(pl.aparte);
  return { svg: `<g class="oso oso-${quien}">${trazos(pl)}${aparte ? `<g class="oso-saluda">${aparte}</g>` : ''}</g>`, pts: todos };
}

/** La sombra de contacto del suelo (de la tarjeta), bajo los osos. */
const suelo = (x0, x1, y) => `<path class="oso-suelo" d="${d([arco((x0 + x1) / 2, y + 0.4, (x1 - x0) / 2, 1.5, 0, 350, 18)])}"/>`;

/** Arma el <svg>: viewBox ajustado a lo dibujado (con margen), `tam` = alto en px; clase de la pose. */
function svgDe(nombre, partes, tam) {
  let cuerpo = '';
  const pts = [];
  for (const p of partes) { cuerpo += p.svg; pts.push(...p.pts); }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys, 0.6);
  const m = 1.2, vb = [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m + 1.4];
  const w = Math.round((tam * vb[2]) / vb[3]);
  return `<svg class="oso-ilu oso-pose-${nombre}" viewBox="${vb.map(f1).join(' ')}" width="${w}" height="${tam}" aria-hidden="true" focusable="false">${suelo(x0 + 1, x1 - 1, y1 - 0.6)}${cuerpo}</svg>`;
}

// ---------------------------------------------------------------------------------------------------------------- las poses
const HOMBRO = { luz: [4.4, -7.4], sombra: [-4.4, -7.4] };
/** Dónde termina el brazo que saluda del grande (lo usa la prueba que comprueba el eje del saludo en styles.css). */
export const SALUDO = { de: HOMBRO.luz, a: [8.2, -13.6], r: 1.35 };
const POSES = {
  /** Con un libro abierto en el regazo, leyendo (la lista y el Historial sin compras). */
  lee: () => {
    const pl = oso('grande', { cabeza: -5, ojos: 'abajo', manitas: false });
    sumar(pl, 'tapa', [[-6.6, -6.9], [0, -5.7], [6.6, -6.9], [6.8, -1.5], [0, -0.4], [-6.8, -1.5]]);
    sumar(pl, 'papel', [[-6, -6.4], [-0.35, -5.3], [-0.35, -1.0], [-6.1, -2.0]], [[0.35, -5.3], [6, -6.4], [6.1, -2.0], [0.35, -1.0]]);
    sumar(pl, 'pliegue', [[-5.1, -5.2], [-1.2, -4.5], [-1.2, -4.1], [-5.1, -4.8]], [[-5.1, -3.8], [-1.2, -3.1], [-1.2, -2.7], [-5.1, -3.4]], [[1.2, -4.5], [5.1, -5.2], [5.1, -4.8], [1.2, -4.1]]);
    sumar(pl, 'hocico', elipse(-6.6, -4.2, 1.6, 1.5, 9), elipse(6.7, -4.4, 1.6, 1.5, 9));
    return [grupo('grande', pl, 0, 0, 1)];
  },
  /** Con su mochila y un palito, al pie del camino («Tu historia» sin compras: la historia es un ascenso). */
  mochila: () => {
    const pl = oso('grande', { brazos: [{ de: HOMBRO.luz, a: [7.4, -6.2] }] });
    // La mochila asoma detrás del hombro en sombra: un bulto redondeado con su solapa, y las correas naranjas por delante.
    sumar(pl, 'mochila', [...arco(-7.4, -10.6, 2.6, 2.2, 180, 300, 5), [-4.2, -12.2], [-3.8, -4.4], ...arco(-6.6, -4.6, 2.8, 2, 0, 160, 5)]);
    sumar(pl, 'parche', [[-4.2, -10.4], [-2.6, -10.6], [-1.4, -3.2], [-2.8, -3]], [[2.6, -10.6], [4.2, -10.4], [2.8, -3], [1.4, -3.2]]);
    sumar(pl, 'palo', [[7.6, -15.6], [8.4, -15.6], [7.6, 0.4], [6.8, 0.4]]);
    return [grupo('grande', pl, 0, 0, 1)];
  },
  /** Los tres saludando (la bienvenida de quien solo mira, «Así va el libro»). El brazo del grande va aparte: es el que se mueve. */
  saludan: () => {
    const g = oso('grande', { brazos: [{ ...SALUDO, aparte: true }] });
    const m = oso('mameluco', { brazos: [{ de: HOMBRO.sombra, a: [-8.4, -13.2], lado: 'sombra' }] });
    const c = oso('chico', { brazos: [{ de: HOMBRO.luz, a: [8.4, -13] }] });
    return [grupo('grande', g, 0, 0), grupo('mameluco', m, -10.6, 2.6), grupo('chico', c, 10, 3.4)];
  },
  /** Con un sobre lacrado delante del pecho (Cartas para el futuro). */
  sobre: () => {
    const pl = oso('grande', { manitas: false });
    sumar(pl, 'papel', girar([[-4.6, -7.6], [4.6, -7.6], [4.6, -2.2], [-4.6, -2.2]], -6, [0, -5]));
    sumar(pl, 'pliegue', girar([[-4.6, -7.6], [0, -4.6], [4.6, -7.6], [4.6, -7.0], [0, -4.0], [-4.6, -7.0]], -6, [0, -5]));
    sumar(pl, 'chispa', girar(elipse(0, -4.4, 1.05, 1.05, 9), -6, [0, -5]));
    sumar(pl, 'hocico', elipse(-4.8, -4.2, 1.5, 1.4, 9), elipse(4.9, -5.2, 1.5, 1.4, 9));
    return [grupo('grande', pl, 0, 0, 1)];
  },
  /** Confundido, rascándose la cabeza, con un signo de pregunta dibujado (cuando algo no cargó). */
  confundido: () => {
    const pl = oso('grande', { cabeza: 11, brazos: [{ de: HOMBRO.luz, a: [6.6, -15.4] }] });
    sumar(pl, 'signo', ...pregunta(10.6, -22.4, 6.2));
    return [grupo('grande', pl, 0, 0, 1)];
  },
  /** Dormido, con la cabeza caída y sus zetas (el mantenimiento). */
  duerme: () => {
    const pl = oso('grande', { cabeza: -9, ojos: 'dormido' });
    sumar(pl, 'signo', zeta(7.4, -16.6, 2.4), zeta(10.4, -20.6, 3.1));
    return [grupo('grande', pl, 0, 0, 1)];
  },
  /** Los tres dormidos, juntos (la tele de noche). */
  duermen: () => {
    const g = oso('grande', { cabeza: -9, ojos: 'dormido' });
    sumar(g, 'signo', zeta(7.4, -16.6, 2.2), zeta(10.2, -20.2, 2.8));
    const m = oso('mameluco', { cabeza: 12, ojos: 'dormido' });
    const c = oso('chico', { cabeza: -14, ojos: 'dormido' });
    return [grupo('grande', g, 0, 0), grupo('mameluco', m, -10.2, 2.4), grupo('chico', c, 9.4, 3.4)];
  },
  /** Con los brazos arriba, contento (para lo que se celebre: el aniversario del libro, si un día se usa). */
  celebra: () => {
    const pl = oso('grande', { ojos: 'feliz', brazos: [{ de: HOMBRO.luz, a: [8, -15.6] }, { de: HOMBRO.sombra, a: [-8, -15.6], lado: 'sombra' }] });
    sumar(pl, 'chispa', chispa(12, -18.6, 2.2), chispa(-12.2, -14.4, 1.6));
    return [grupo('grande', pl, 0, 0, 1)];
  },
};
/** Los nombres de las poses, en el orden de la guía. */
export const NOMBRES_POSES = Object.keys(POSES);

/** Una pose como <svg> decorativo; `tam`: el alto en px. Un nombre que no existe no dibuja nada. */
export function pose(nombre, { tam = 96 } = {}) {
  return POSES[nombre] ? svgDe(nombre, POSES[nombre](), tam) : '';
}

/** La huella de una pata (el sello de los de la cumbre): la almohadilla y cuatro deditos, en un solo trazo. */
export function huella({ tam = 28 } = {}) {
  const pts = [elipse(0, 2.4, 3.4, 2.7, 14), elipse(-3.6, -1.8, 1.25, 1.5, 9), elipse(-1.25, -3.6, 1.25, 1.55, 9), elipse(1.35, -3.6, 1.25, 1.55, 9), elipse(3.7, -1.8, 1.25, 1.5, 9)];
  return `<svg class="oso-ilu oso-huella" viewBox="-5.6 -6 11.2 11.6" width="${tam}" height="${Math.round(tam * 1.04)}" aria-hidden="true" focusable="false"><path class="oso-huella-p" d="${d(pts)}"/></svg>`;
}
