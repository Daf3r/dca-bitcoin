// La montaña de la cabecera: el saldo en sats es la altitud y los hitos son campamentos.
import { escalaMontana, altitud, descripcionMontana, nombreHito, entero, textoCampamento, iluminacionLunar } from './lib.js';
import { sinMovimiento } from './movimiento.js';

const f1 = (n) => n.toFixed(1);

function azar(s) {
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** Composición según el tamaño: en móvil la cumbre baja para dejar el cielo al saldo. */
function composicion(W, H, techo) {
  // techo: dónde acaba el texto del saldo; la cumbre y su etiqueta quedan por debajo.
  // En móvil y tablet el botón fijo «Anotar compra» ocupa los últimos ~90 px: el sendero empieza por encima.
  // Teléfono acostado (idea 64): la escena mide lo que la pantalla (poca altura), el saldo va a la izquierda y la montaña a la
  // derecha, a lo ancho; el botón «Anotar» va abajo a la izquierda, así que el sendero puede bajar hasta casi el borde.
  if (H <= 520 && W >= H * 1.5 && W < 1100) return { sx: W * 0.7, sy: Math.max(H * 0.36, 92), base: [W * 0.5, H - 26], vueltas: 4, ancho: 0.2, campos: 3, sol: [W * 0.92, H * 0.3], rs: H * 0.07, lago: [W * 0.85, W * 0.11] };
  if (W < 700) return { sx: W * 0.62, sy: Math.max(H * 0.43, techo + 70), base: [W * 0.14, H - 104], vueltas: 5, ancho: 0.34, campos: 3, sol: [W * 0.86, H * 0.47], rs: W * 0.1 };
  if (W < 1100) return { sx: W * 0.64, sy: Math.max(H * 0.3, techo + 70), base: [W * 0.2, H - 104], vueltas: 6, ancho: 0.27, campos: 4, sol: [W * 0.87, H * 0.3], rs: W * 0.07 };
  // Escritorio: el pico se dimensiona por la altura y se compone en un marco centrado de hasta
  // 1600 px (2000 desde 2400 px de ancho, 2400 desde 3200), alineado con el contenido; fuera del marco solo hay cielo y cordillera.
  const marco = Math.min(W, W >= 3200 ? 2400 : W >= 2400 ? 2000 : 1600); // crece con la raíz en pantallas muy anchas (styles.css: --medio-ancho)
  const dcha = (W + marco) / 2;
  const mw = Math.min(marco, H * 1.7);
  return { sx: dcha - mw * 0.42, sy: H * 0.16, base: [dcha - mw * 0.74, H * 0.915], vueltas: 7, ancho: mw * 0.26 / W, campos: 4, sol: [dcha - mw * 0.12, H * 0.24], rs: H * 0.08 };
}

/**
 * La luna con su fase (0 nueva, 0.25 cuarto creciente, 0.5 llena, 0.75 cuarto menguante): el disco apagado y encima la parte
 * iluminada (un semicírculo y media elipse, que es el terminador). Creciente se ilumina por la derecha; menguante, al revés.
 */
export function luna(cx, cy, r, fase) {
  const k = Math.cos(2 * Math.PI * fase); // 1 nueva, -1 llena
  const rx = Math.abs(k) * r;
  const barrido = k > 0 ? 0 : 1;
  const espejo = fase > 0.5 ? ` transform="translate(${f1(2 * cx)} 0) scale(-1 1)"` : '';
  const luz = `M${f1(cx)} ${f1(cy - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx)} ${f1(cy + r)}A${f1(rx)} ${f1(r)} 0 0 ${barrido} ${f1(cx)} ${f1(cy - r)}Z`;
  return `<circle class="luna-sombra" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/><path class="astro" d="${luz}"${espejo}/>`;
}

/**
 * Una nube de cúmulo: base plana y cuatro lomos redondos (un solo trazo, sin elipses apiladas). Con su degradado
 * (`#m-nube`) la parte de arriba recibe la luz y la base queda en la sombra del cielo.
 */
function cumulo(x, y, k) {
  const p = (dx, dy) => `${f1(x + dx * k)} ${f1(y + dy * k)}`;
  return `M${p(-52, 0)}C${p(-60, 0)} ${p(-58, -12)} ${p(-44, -12)}C${p(-42, -26)} ${p(-20, -28)} ${p(-12, -18)}`
    + `C${p(-6, -36)} ${p(22, -38)} ${p(26, -20)}C${p(36, -26)} ${p(50, -20)} ${p(46, -10)}C${p(60, -10)} ${p(62, 0)} ${p(52, 0)}Z`;
}
/** Tres nubes que cruzan despacio (solo con todos los efectos): van detrás de la montaña y por debajo del texto del saldo. */
function nubes(H) {
  const una = (y, k, clase) => `<g class="efecto-ambiente nube ${clase}"><path d="${cumulo(0, y, k)}"/></g>`;
  return una(H * 0.33, 0.8, 'n1') + una(H * 0.4, 1.1, 'n2') + una(H * 0.46, 0.6, 'n3');
}
/** Dos bandas de niebla entre la sierra y la montaña (solo con todos los efectos): degradados que se desvanecen arriba y abajo. */
function niebla(W, H, y) {
  return `<g class="efecto-ambiente niebla"><rect class="niebla-a" x="${f1(-W * 0.15)}" y="${f1(y * H - H * 0.05)}" width="${f1(W * 1.3)}" height="${f1(H * 0.1)}" fill="url(#m-niebla)"/><rect class="niebla-b" x="${f1(-W * 0.15)}" y="${f1(y * H + H * 0.035)}" width="${f1(W * 1.3)}" height="${f1(H * 0.08)}" fill="url(#m-niebla)"/></g>`;
}
/** Un pequeño vuelo de aves al amanecer (solo con todos los efectos): siluetas en «v» que aletean mientras cruzan. */
function aves(H) {
  // La posición va en grupos con atributo `transform`; el CSS anima las clases (un transform de CSS reemplaza al del atributo).
  const ave = (dx, dy, clase) => `<g transform="translate(${dx} ${dy})"><path class="ave-ala ${clase}" d="M0 0q4-5 8 0q4-5 8 0"/></g>`;
  return `<g transform="translate(0 ${f1(H * 0.37)})"><g class="efecto-ambiente ave">${ave(0, 0, 'a1')}${ave(-18, 9, 'a2')}${ave(-30, -4, 'a3')}</g></g>`;
}

let estado = null;

/** La franja de nieve de la cumbre: más honda cuanto más cerca de la meta (la altitud va de 0 a 1 hasta la cumbre). */
const DIENTES = [0.95, 0.7, 1.1, 0.8, 1.15, 0.75, 1.05, 0.9];
const NIEVE_MIN = 0.55; // con la altitud en cero: una capa fina
const NIEVE_MAX = 1.5;  // llegando a la cumbre: la cumbre bien cubierta
function trazoNieve({ sx, sy, ancho, nv }, alt) {
  const hondo = nv * (NIEVE_MIN + (NIEVE_MAX - NIEVE_MIN) * Math.min(1, Math.max(0, alt)));
  let d = `M${f1(sx - ancho)} ${f1(sy - 20)}L${f1(sx + ancho)} ${f1(sy - 20)}`;
  DIENTES.forEach((k, i) => { d += `L${f1(sx + ancho - (2 * ancho * (i + 0.5)) / DIENTES.length)} ${f1(sy + hondo * k)}`; });
  return `${d}Z`;
}

/**
 * Aurora (idea 110): tres cintas suaves en el cielo nocturno mientras tu racha sea larga. Solo ambiente (`efecto-ambiente`,
 * y el CSS la muestra de noche). Va entre el cielo y la montaña, por debajo del saldo (`techo`), y es muy tenue: es un
 * premio, no un adorno que compita con las cifras. Sin llamadas a `rnd()`.
 */
function cintaD(W, y, amp, alto) {
  let d = `M${f1(-W * 0.1)} ${f1(y)}`;
  for (let i = 0; i < 6; i++) d += `Q${f1((W * (i + 0.5)) / 6)} ${f1(y + (i % 2 ? amp : -amp))} ${f1((W * (i + 1)) / 6)} ${f1(y)}`;
  return `${d}L${f1(W * 1.1)} ${f1(y)}L${f1(W * 1.1)} ${f1(y + alto)}L${f1(-W * 0.1)} ${f1(y + alto)}Z`;
}
function auroraBoreal(W, H, techo) {
  const y0 = Math.max(techo + 12, H * 0.2), alto = H * 0.14;
  const cinta = (k, dy, amp) => `<path class="aurora-cinta a${k}" d="${cintaD(W, y0 + dy, amp, alto)}"/>`;
  return `<g class="efecto-ambiente aurora">${cinta(0, 0, alto * 0.35)}${cinta(1, alto * 0.45, alto * 0.28)}${cinta(2, alto * 0.9, alto * 0.22)}</g>`;
}

/**
 * Lago al pie de la montaña (idea 113): un estanque que refleja el cielo y, de noche, la luna con su fase (el brillo del
 * reflejo sigue a `--luna-ilum`) y unas estrellas; con todos los efectos una ondulación leve. Se coloca bajo la luna,
 * por debajo del arranque del sendero y a un lado, así que nunca empuja el camino ni las etiquetas.
 */
function lago(c, W, H) {
  const cx = c.lago ? c.lago[0] : Math.min(Math.max(c.sol[0], W * 0.2), W * 0.8), cy = W >= 1100 && !c.lago ? H * 0.9 : Math.min(H * 0.875, c.base[1] - 24); // en escritorio, al fondo del valle, tras los pinos
  const rx = c.lago ? c.lago[1] : Math.min(W * 0.16, 120), ry = Math.max(8, H * 0.016);
  const reflejo = [0, 1, 2, 3].map((i) => `<ellipse class="lago-reflejo" cx="${f1(cx + (i % 2 ? 3 : -3))}" cy="${f1(cy - ry * 0.35 + i * ry * 0.42)}" rx="${f1(rx * (0.26 - i * 0.045))}" ry="${f1(Math.max(1.1, ry * 0.12))}"/>`).join('');
  const estrellas = [[-0.5, -0.2], [-0.2, 0.25], [0.45, -0.1], [0.62, 0.3], [-0.68, 0.2]].map(([x, y]) => `<circle class="lago-estrella" cx="${f1(cx + rx * x)}" cy="${f1(cy + ry * y)}" r="0.9"/>`).join('');
  // De día el sol deja una estela de luz en el agua (dos trazos finos); de noche, la luna con su fase.
  const sol = [0, 1].map((i) => `<ellipse class="lago-sol" cx="${f1(cx)}" cy="${f1(cy - ry * 0.25 + i * ry * 0.5)}" rx="${f1(rx * (0.42 - i * 0.16))}" ry="${f1(Math.max(1, ry * 0.1))}"/>`).join('');
  return `<g class="lago" aria-hidden="true"><ellipse class="lago-agua" cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#m-lago)"/><g class="lago-luz">${sol}</g><g class="lago-luna">${reflejo}${estrellas}</g><ellipse class="efecto-ambiente lago-onda" cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx * 0.6)}" ry="${f1(ry * 0.6)}"/><path class="lago-borde" d="M${f1(cx - rx)} ${f1(cy)}A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(cx + rx)} ${f1(cy)}"/></g>`;
}

/**
 * Dibuja la escena en `host` con la escala de `sats` y deja a "Tú" en `inicio` (para animar luego con subir).
 */
export function dibujarMontana(host, { sats, meta, etapa = meta, inicio = sats, techo = 0, fechas = {}, compras = 0, plantar = false, tocable = false, aurora = false }) {
  const W = Math.round(host.clientWidth), H = Math.round(host.clientHeight);
  if (!W || !H) return;
  const c = composicion(W, H, techo);
  const esc = escalaMontana(sats, c.campos);
  const rnd = azar(42);
  // Degradados de la escena (dirección «Hora dorada»): el cielo es continuo (sin franjas), la luz del astro se difumina y cada
  // sierra se funde hacia el color del horizonte según lo lejos que está (perspectiva atmosférica). Los colores salen de las
  // variables de cielo.js, así que siguen a la hora sin volver a dibujar.
  const yH = c.sy / H + 0.2; // altura aproximada del horizonte (la sierra lejana)
  const lado = c.sol[0] >= c.sx ? 1 : -1; // de qué lado está el astro: esa cara de la montaña recibe la luz
  const derX0 = c.sx + (c.sx - (c.base[0] - W * 0.2)) * 0.95;
  const grad = (id, attrs, paradas) => `<linearGradient id="${id}" ${attrs}>${paradas.map(([o, k]) => `<stop offset="${o}" class="${k}"/>`).join('')}</linearGradient>`;
  const defs = grad('m-cielo', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'g-c0'], [0.17, 'g-c1'], [0.31, 'g-c2'], [0.46, 'g-c3'], [Math.min(0.9, yH * 0.92).toFixed(3), 'g-c4'], [1, 'g-c4']])
    + `<radialGradient id="m-halo"><stop offset="0" class="h-0"/><stop offset="0.3" class="h-1"/><stop offset="0.55" class="h-2"/><stop offset="1" class="h-3"/></radialGradient>`
    + `<radialGradient id="m-resplandor" gradientUnits="userSpaceOnUse" cx="${f1(c.sol[0])}" cy="${f1(yH * H)}" r="${f1(Math.max(W, H) * 0.75)}" gradientTransform="translate(${f1(c.sol[0])} ${f1(yH * H)}) scale(1 0.55) translate(${f1(-c.sol[0])} ${f1(-yH * H)})"><stop offset="0" class="r-0"/><stop offset="0.45" class="r-1"/><stop offset="1" class="r-2"/></radialGradient>`
    + grad('m-lejos', `gradientUnits="userSpaceOnUse" x1="0" y1="${f1((yH - 0.12) * H)}" x2="0" y2="${f1((yH + 0.12) * H)}"`, [[0, 'lj-0'], [1, 'lj-1']])
    + grad('m-medio', `gradientUnits="userSpaceOnUse" x1="0" y1="${f1((yH + 0.02) * H)}" x2="0" y2="${f1((yH + 0.26) * H)}"`, [[0, 'md-0'], [1, 'md-1']])
    + grad('m-ladera', `gradientUnits="userSpaceOnUse" x1="${f1(c.sx)}" y1="${f1(c.sy)}" x2="${f1(c.sx - W * 0.25 * lado)}" y2="${f1(H)}"`, [[0, 'ld-0'], [0.55, 'ld-1'], [1, 'ld-2']])
    + grad('m-cara', `gradientUnits="userSpaceOnUse" x1="${f1(c.sx)}" y1="${f1(c.sy)}" x2="${f1(c.sx + (derX0 - c.sx) * 0.35)}" y2="${f1(c.sy + (H - c.sy) * 0.55)}"`, [[0, 'cr-0'], [0.45, 'cr-1'], [1, 'cr-2']])
    + grad('m-nube', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'nb-0'], [1, 'nb-1']])
    + grad('m-niebla', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'nl-0'], [0.5, 'nl-1'], [1, 'nl-0']])
    + grad('m-lago', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'lg-0'], [1, 'lg-1']])
    + grad('m-suelo', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'sl-0'], [1, 'sl-1']]);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="m-desc"><desc id="m-desc"></desc><defs><radialGradient id="m-luz"><stop offset="0" class="luz-0"/><stop offset="1" class="luz-1"/></radialGradient><linearGradient id="m-aurora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="au-0"/><stop offset="0.55" class="au-1"/><stop offset="1" class="au-2"/></linearGradient><filter id="m-bruma" x="-2%" y="-5%" width="104%" height="110%"><feGaussianBlur stdDeviation="1.6"/></filter>${defs}</defs><g aria-hidden="true">`;
  host.style.setProperty('--escena-w', `${W}px`); // las nubes, la niebla y las aves cruzan en CSS: necesitan saber cuánto mide la escena
  // Capa del cielo (parallax): cielo, estrellas, fugaz, sol, luna, nubes y aves.
  s += '<g class="par par-cielo">';
  // Un solo rectángulo con el degradado de las cinco capas (antes eran cinco franjas de bordes duros) y el resplandor del horizonte bajo el astro.
  s += `<rect class="cielo-0" x="0" y="0" width="${W}" height="${H}" fill="url(#m-cielo)"/><rect class="resplandor" x="0" y="0" width="${W}" height="${H}" fill="url(#m-resplandor)"/>`;
  for (let i = 0; i < 46; i++) s += `<circle class="estrella t${i % 5}" cx="${f1(rnd() * W)}" cy="${f1(rnd() * H * 0.5)}" r="${f1(0.5 + rnd() * 1.1)}"/>`;
  // Estrella fugaz (muy esporádica, solo de noche y con todos los efectos): una raya corta que cruza el cielo alto.
  s += `<line class="fugaz" x1="${f1(W * 0.16)}" y1="${f1(H * 0.1)}" x2="${f1(W * 0.16 + 46)}" y2="${f1(H * 0.1 + 20)}"/>`;
  // Sol (amanecer, día y atardecer) y luna con su fase real (noche): el CSS muestra uno u otro según `html[data-cielo]`.
  // El halo es un degradado radial (luz que se difumina), no un disco.
  const halo = `<circle class="halo" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs * 3.4)}" fill="url(#m-halo)"/>`;
  s += `<g class="sol">${halo}<circle class="astro" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs)}"/></g>`;
  s += `<g class="luna">${halo}${luna(c.sol[0], c.sol[1], c.rs, window.libroCielo?.faseLunar() ?? 0.5)}</g>`;
  s += (aurora ? auroraBoreal(W, H, techo) : '') + nubes(H) + aves(H) + '</g>';
  // Velo cálido del cielo para las celebraciones: va antes de las montañas, así solo tiñe el cielo.
  s += `<rect class="alba" id="m-alba" x="0" y="0" width="${W}" height="${H}"/>`;
  const sierra = (base, amp, paso, clase) => {
    let d = `M0 ${H}`;
    for (let x = 0; x <= W + paso; x += paso) d += `L${f1(x)} ${f1(base * H - (Math.sin(x / (W / 3.3) + base * 9) * 0.5 + rnd() * 0.6) * amp * H)}`;
    s += `<path class="${clase}" d="${d}L${W} ${H}Z" fill="url(#m-${clase})"/>`;
  };
  s += '<g class="par par-lejos">';
  sierra(c.sy / H + 0.2, 0.1, Math.max(24, W / 18), 'lejos');
  s += '</g><g class="par par-medio">';
  sierra(c.sy / H + 0.32, 0.09, Math.max(30, W / 14), 'medio');
  s += '</g>' + niebla(W, H, c.sy / H + 0.3);

  // Montaña: ladera izquierda larga (el sendero) y cara derecha. La cara que mira al astro recibe la luz (`#m-cara`) y
  // su arista lleva un filo de luz; la otra queda en una sombra suave que se funde con la niebla del valle (`#m-ladera`).
  const piso = H * 0.99;
  const izqX = c.base[0] - W * 0.2;
  const izq = [], der = [];
  for (let k = 0; k <= 10; k++) {
    const f = k / 10, ruido = k && k < 10;
    izq.push([izqX + (c.sx - izqX) * f + (ruido ? (rnd() - 0.5) * W * 0.025 : 0), piso - (piso - c.sy) * f ** 0.92 + (ruido ? (rnd() - 0.5) * H * 0.025 : 0)]);
  }
  const derX = c.sx + (c.sx - izqX) * 0.95;
  for (let k = 1; k <= 8; k++) {
    const f = k / 8, ruido = k < 8;
    der.push([c.sx + (derX - c.sx) * f + (ruido ? (rnd() - 0.5) * W * 0.025 : 0), c.sy + (piso * 0.97 - c.sy) * f ** 0.8 + (ruido ? (rnd() - 0.5) * H * 0.035 : 0)]);
  }
  const contorno = [...izq, ...der].map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
  const silueta = `${contorno}L${f1(derX + W)} ${H}L${f1(izqX - W)} ${H}Z`;
  // La arista central baja quebrada (roca), no en línea recta: así la cara iluminada no parece una cascada.
  const alto = piso - c.sy;
  const quiebre = [[0.012, 0.07], [0.034, 0.13], [0.018, 0.2], [0.046, 0.29], [0.03, 0.38], [0.06, 0.52], [0.05, 0.7], [0.075, 1]]
    .map(([dx, dy]) => [c.sx + W * dx, c.sy + alto * dy]);
  const arista = quiebre.map((p) => `L${f1(p[0])} ${f1(p[1])}`);
  const cara = `M${f1(c.sx)} ${f1(c.sy)}${der.map((p) => `L${f1(p[0])} ${f1(p[1])}`).join('')}L${f1(derX + W)} ${H}${[...arista].reverse().join('')}Z`;
  // Lo que queda a la izquierda de la arista central: ahí la nieve está en sombra.
  const izqArista = `M${f1(c.sx)} ${f1(-H)}L${f1(c.sx)} ${f1(c.sy)}${arista.join('')}L${f1(c.sx + W * 0.075)} ${H}L${f1(-W)} ${H}L${f1(-W)} ${f1(-H)}Z`;
  s += `<defs><clipPath id="m-silueta"><path d="${silueta}"/></clipPath><clipPath id="m-izq"><path d="${izqArista}"/></clipPath></defs><path class="monte" d="${silueta}" fill="url(#m-ladera)"/>`;
  s += `<path class="monte-sombra" d="${cara}" fill="url(#m-cara)"/>`;
  // Facetas de roca en lo alto de la cara iluminada: tres planos que reciben un poco más de luz (solo cerca de la cumbre).
  s += `<g class="facetas">${[[0, 1, 2], [1, 3, 4], [3, 5, 6]].map(([a, b, k], i) => {
    const q = quiebre[Math.min(k, quiebre.length - 1)], r1 = der[Math.min(a, der.length - 1)], r2 = der[Math.min(b, der.length - 1)];
    const mx = (r1[0] + q[0]) / 2, my = (r1[1] + q[1]) / 2;
    return `<path class="faceta f${i}" d="M${f1(r1[0])} ${f1(r1[1])}L${f1(r2[0])} ${f1(r2[1])}L${f1(mx + (r2[0] - mx) * 0.3)} ${f1(my + (r2[1] - my) * 0.6)}Z"/>`;
  }).join('')}</g>`;
  s += `<path class="arista" d="M${f1(c.sx)} ${f1(c.sy)}${der.slice(0, 5).map((p) => `L${f1(p[0])} ${f1(p[1])}`).join('')}"/>`;
  // Nieve: una franja irregular mucho más ancha que el pico, recortada por la silueta, para que
  // nunca sobresalga de las laderas.
  // Su profundidad sigue a tu altitud (`colocar` la actualiza), así que la cumbre se va cubriendo a medida que subes.
  const nieveMedidas = { sx: c.sx, sy: c.sy, ancho: Math.max(W * 0.12, 140), nv: H * 0.075 };
  const dNieve = trazoNieve(nieveMedidas, altitud(inicio, esc));
  s += `<path class="nieve" clip-path="url(#m-silueta)" d="${dNieve}"/><g clip-path="url(#m-silueta)"><path class="nieve-sombra" clip-path="url(#m-izq)" d="${dNieve}"/></g>`;

  s += lago(c, W, H);
  const [bx, by] = c.base;
  for (let fila = 0; fila < 2; fila++) {
    const yb = H * (fila ? 1.005 : 0.975), alto = H * (fila ? 0.07 : 0.05);
    for (let x = -10; x < W + 20; x += alto * (0.55 + rnd() * 0.4)) {
      const a = alto * (0.7 + rnd() * 0.5), an = a * 0.42;
      // (Los pinos de adorno van detrás del sendero: ya no hace falta dejar hueco en la marca de salida.)
      s += `<path class="pino-${fila}" d="M${f1(x)} ${f1(yb - a)}L${f1(x + an)} ${f1(yb)}L${f1(x - an)} ${f1(yb)}Z"/>`;
    }
  }
  // El pie de la escena se funde con el fondo de la página (sin el corte seco de antes).
  s += `<rect class="suelo suelo-a" x="0" y="${f1(H * 0.8)}" width="${W}" height="${f1(H * 0.2 + 1)}" fill="url(#m-suelo)"/>`;

  // Sendero en zigzag: siempre sube, así que la altura recorrida es monótona.
  const pts = [[bx, by]];
  for (let i = 1; i <= c.vueltas; i++) {
    const f = i / c.vueltas;
    const y = by - (by - c.sy - 6) * f;
    const a = (1 - f) * W * c.ancho + 4;
    const x = i === c.vueltas ? c.sx : i % 2 ? c.sx - a * 0.2 + W * 0.03 : c.sx - a * 1.2;
    pts.push([x, y]);
  }
  // El mismo trazo, entero (para medir la altitud y el tramo recorrido) y por tramos de zigzag (para la tierra del camino,
  // que se estrecha con la altura: más ancho abajo, más fino arriba, como visto en perspectiva).
  let d = `M${f1(bx)} ${f1(by)}`;
  const piezas = [];
  let desde = [bx, by];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1];
    if (i === pts.length - 1) { d += `L${f1(x)} ${f1(y)}`; piezas.push(`M${f1(desde[0])} ${f1(desde[1])}L${f1(x)} ${f1(y)}`); break; }
    const [nx, ny] = pts[i + 1], k = 0.22;
    const ax = x + (px - x) * k, ay = y + (py - y) * k, sx2 = x + (nx - x) * k, sy2 = y + (ny - y) * k;
    d += `L${f1(ax)} ${f1(ay)}Q${f1(x)} ${f1(y)} ${f1(sx2)} ${f1(sy2)}`;
    piezas.push(`M${f1(desde[0])} ${f1(desde[1])}L${f1(ax)} ${f1(ay)}Q${f1(x)} ${f1(y)} ${f1(sx2)} ${f1(sy2)}`);
    desde = [sx2, sy2];
  }
  const anchoAbajo = Math.min(12, Math.max(7, W / 60)), anchoArriba = anchoAbajo * 0.42;
  const ancho = (i) => anchoAbajo + (anchoArriba - anchoAbajo) * (piezas.length > 1 ? i / (piezas.length - 1) : 0);
  const capa = (clase, extra, dx = 0, dy = 0) => `<g class="${clase}"${dx || dy ? ` transform="translate(${dx} ${dy})"` : ''}>${piezas.map((pz, i) => `<path d="${pz}" stroke-width="${f1(ancho(i) + extra)}"/>`).join('')}</g>`;
  // Sombra sobre la roca, borde, tierra y peldaños/piedras (se ponen al medir el trazo); encima, lo que falta (a trazos) y lo
  // recorrido (cálido, con su luz). Es paisaje: se ve con cualquier nivel de efectos.
  s += capa('sendero-sombra', 3, 1.5, 2.5) + capa('sendero-borde', 2.6) + capa('sendero-tierra', 0) + '<g class="sendero-detalle" id="m-piedras"></g>';
  s += `<path class="sendero" id="m-sendero" d="${d}"/><path class="sendero-luz" id="m-luzhecha" d="${d}"/><path class="sendero-hecho" id="m-hecho" d="${d}"/><path class="estela" id="m-estela" d="${d}"/>`;
  s += `<circle class="salida" cx="${f1(bx)}" cy="${f1(by)}" r="5.5"/>`;
  s += `<g id="m-campos"></g><g class="efecto-ambiente huellas" id="m-huellas"></g><g class="yo" id="m-yo"><circle class="efecto-ambiente linterna" r="38" fill="url(#m-luz)"/><circle class="yo-halo" r="15"/><circle class="yo-anillo" r="10"/><circle class="yo-punto" r="7"/></g><g id="m-etiquetas"></g><g class="fx" id="m-fx"></g>`;
  s += bosque(W, H, bx, compras, plantar);
  s += `<rect class="suelo" x="0" y="${f1(H * 0.95)}" width="${W}" height="${f1(H * 0.05 + 1)}" fill="url(#m-suelo)"/>`;
  host.innerHTML = s + '</g></svg>';
  host.style.setProperty('--luna-ilum', f1(iluminacionLunar(window.libroCielo?.faseLunar() ?? 0.5)));

  const camino = host.querySelector('#m-sendero');
  const L = camino.getTotalLength();
  const enAltura = (alt) => {
    const yObj = by - (by - c.sy - 6) * alt;
    let lo = 0, hi = L;
    for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (camino.getPointAtLength(m).y > yObj) lo = m; else hi = m; }
    return lo;
  };
  detalleSendero(host.querySelector('#m-piedras'), camino, L, by, c.sy, anchoAbajo, anchoArriba);
  const campos = esc.campos.map((m) => ({ m, p: camino.getPointAtLength(enAltura(altitud(m, esc))), cima: m === esc.cima }));
  host.querySelector('#m-campos').innerHTML = campos.map(({ m, p, cima }) =>
    `<g class="campo" data-m="${m}" transform="translate(${f1(p.x)} ${f1(p.y)})">${cima ? '<circle class="brillo-cima" cy="-28" r="50" fill="url(#m-luz)"/>' : ''}`
    // Un claro pequeño sobre el sendero, el fogón (troncos), el mástil con su banderín de cola partida y, a la derecha, la tienda o la cabaña.
    + `<ellipse class="campo-claro" cx="6" cy="1" rx="24" ry="5"/><path class="fogon" d="M-18 0.5L-6 -3M-18 -3L-6 0.5"/><line y2="-34"/><path class="banderin" d="M0 -34L24 -29.5L18.5 -25.5L24 -21L0 -20Z"/>`
    + `<g transform="translate(6 1) scale(1.4)">${icono(cima ? 3 : esc.campos.indexOf(m))}</g>${humoYFogata()}</g>`).join('');
  estado = { host, W, H, L, camino, enAltura, esc, campos, sats, meta, c, nieveMedidas, fechas, compras, caja: null };
  if (tocable) { banderas(host, campos, W, H); instalarCierre(); }
  colocar(inicio, false);
  describir(sats, etapa);
}

/**
 * Un dibujo distinto por campamento (idea 63), al pie de la bandera y a su derecha, bajo la etiqueta (ocupa de y −13 a 0):
 * tienda, cabaña, refugio con almenas y, en la cumbre, un mojón de piedras. Se elige por el orden del campamento en la montaña.
 */
function icono(i) {
  const formas = [
    '<path class="campo-ico" d="M5 0L13 -12L21 0Z"/><path class="campo-ico-d" d="M11.4 0L13 -5.5L14.6 0Z"/>',
    '<path class="campo-ico" d="M6 0V-7H20V0ZM4 -7L13 -13.5L22 -7Z"/><path class="campo-ico-d" d="M11.6 0V-4.5H14.4V0Z"/>',
    '<path class="campo-ico" d="M7 0V-9H19V0ZM7 -9V-13H9.6V-11H11.7V-13H14.3V-11H16.4V-13H19V-9Z"/><path class="campo-ico-d" d="M11.6 0V-4.5Q13 -6.4 14.4 -4.5V0Z"/>',
    '<ellipse class="campo-ico" cx="13" cy="-2.3" rx="8.4" ry="2.6"/><ellipse class="campo-ico" cx="13" cy="-6.2" rx="5.8" ry="2.3"/><ellipse class="campo-ico" cx="13" cy="-9.6" rx="3.2" ry="1.9"/>',
  ];
  return formas[Math.min(Math.max(i, 0), 3)];
}

/**
 * El bosque (idea 109): un pino por compra al pie de la montaña, por delante de los pinos de adorno. Con muchas compras cada
 * pino vale por varias (tope de 60). Usa su propio azar: la forma de la montaña no cambia. El último se planta con una
 * animación corta si la compra es de esta sesión (`plantar`).
 */
const MAX_PINOS = 60;
function bosque(W, H, bx, compras, plantar) {
  if (!(compras > 0)) return '';
  const por = Math.ceil(compras / MAX_PINOS), n = Math.ceil(compras / por);
  const rnd = azar(7);
  let s = '<g class="bosque" id="m-bosque">';
  for (let i = 0; i < n; i++) {
    // Se reparten por todo el ancho salvo la marca de salida (un pino encima la taparía): el hueco se salta, no se pierde ningún pino.
    const u = ((i + 0.5) / n) * (W - 60) + (rnd() - 0.5) * ((W - 60) / n) * 0.5;
    const x = u < bx - 30 ? u : u + 60;
    const a = H * (0.075 + rnd() * 0.035), an = a * 0.4;
    const yb = H * 1.01;
    const nuevo = plantar && i === n - 1 ? ' pino-nuevo' : '';
    s += `<path class="pino-2${nuevo}" d="M${f1(x)} ${f1(yb - a)}L${f1(x + an * 0.55)} ${f1(yb - a * 0.5)}L${f1(x + an * 0.25)} ${f1(yb - a * 0.5)}L${f1(x + an)} ${f1(yb)}L${f1(x - an)} ${f1(yb)}L${f1(x - an * 0.25)} ${f1(yb - a * 0.5)}L${f1(x - an * 0.55)} ${f1(yb - a * 0.5)}Z"/>`;
  }
  return `${s}</g>`;
}

// Tarjeta de cada campamento (idea 72). Los botones son transparentes, de 48 px, y viven FUERA del SVG (que es role="img"):
// dentro de una imagen no podrían tener nombre ni foco. La tarjeta y los botones se rehacen con cada dibujo.
const TOQUE = 48;
let abierta = null;
function banderas(host, campos, W, H) {
  const { sats, fechas } = estado;
  const caja = host.parentElement?.querySelector('#m-banderas');
  if (!caja) return;
  estado.caja = caja;
  // De arriba abajo: el orden de tabulación es el visual.
  const botones = [...campos].sort((a, b) => a.p.y - b.p.y).map(({ m, p, cima }) => {
    const t = textoCampamento(m, sats, fechas[m] ?? null, cima);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm-bandera';
    b.dataset.m = String(m);
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', 'm-tarjeta');
    b.setAttribute('aria-label', `${t.titulo}. ${t.texto}`);
    b.style.left = `${f1(Math.min(Math.max(p.x - TOQUE / 2 + 6, 0), W - TOQUE))}px`;
    b.style.top = `${f1(Math.min(Math.max(p.y - TOQUE / 2 - 16, 0), H - TOQUE))}px`;
    b.addEventListener('click', () => (abierta === m ? cerrarTarjeta() : abrirTarjeta(m)));
    return b;
  });
  const tarjeta = document.createElement('div');
  tarjeta.className = 'm-tarjeta';
  tarjeta.id = 'm-tarjeta';
  tarjeta.setAttribute('role', 'group');
  tarjeta.setAttribute('aria-labelledby', 'm-tarjeta-t');
  tarjeta.hidden = true;
  tarjeta.innerHTML = '<b id="m-tarjeta-t"></b><p id="m-tarjeta-p"></p><button type="button" class="m-tarjeta-x">Cerrar</button>';
  tarjeta.querySelector('button').addEventListener('click', () => cerrarTarjeta(true));
  caja.replaceChildren(...botones, tarjeta);
  abierta = null;
}

function abrirTarjeta(m) {
  const { caja, campos, sats, fechas, H } = estado;
  const campo = campos.find((x) => x.m === m);
  const tarjeta = caja?.querySelector('#m-tarjeta');
  if (!campo || !tarjeta) return;
  const t = textoCampamento(m, sats, fechas[m] ?? null, campo.cima);
  tarjeta.querySelector('#m-tarjeta-t').textContent = t.titulo;
  tarjeta.querySelector('#m-tarjeta-p').textContent = t.texto;
  tarjeta.dataset.estado = t.alcanzado ? 'alcanzado' : 'futuro';
  tarjeta.style.setProperty('--cx', `${f1(campo.p.x)}px`);
  const abajo = campo.p.y < H * 0.62;
  tarjeta.style.top = abajo ? `${f1(campo.p.y + 18)}px` : 'auto';
  tarjeta.style.bottom = abajo ? 'auto' : `${f1(H - campo.p.y + 46)}px`;
  tarjeta.hidden = false;
  caja.querySelectorAll('.m-bandera').forEach((b) => b.setAttribute('aria-expanded', String(Number(b.dataset.m) === m)));
  abierta = m;
}

function cerrarTarjeta(devolverFoco = false) {
  const caja = estado?.caja;
  if (abierta === null || !caja) return;
  const m = abierta;
  abierta = null;
  const tarjeta = caja.querySelector('#m-tarjeta');
  if (tarjeta) tarjeta.hidden = true;
  caja.querySelectorAll('.m-bandera').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  if (devolverFoco) caja.querySelector(`.m-bandera[data-m="${m}"]`)?.focus();
}

// Se cierra con Esc o tocando en otro sitio. Se instala una sola vez (los botones sí se rehacen con cada dibujo).
let cierreInstalado = false;
function instalarCierre() {
  if (cierreInstalado) return;
  cierreInstalado = true;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta !== null) { e.preventDefault(); cerrarTarjeta(true); } });
  document.addEventListener('pointerdown', (e) => { if (abierta !== null && !e.target.closest?.('.m-bandera, .m-tarjeta')) cerrarTarjeta(); });
}

/**
 * Dos detalles de ambiente por campamento (solo con todos los efectos; el CSS decide cuál se ve):
 * humo en los ya alcanzados y una fogata que parpadea en el siguiente. Pequeños y al pie de la bandera, lejos de la etiqueta.
 */
function humoYFogata() {
  const humo = [0, 1, 2].map(() => '<circle class="humo-bola" cx="-12" cy="-6" r="3.6"/>').join(''); // sin `style` en línea (CSP): los retrasos van en el CSS
  return `<g class="efecto-ambiente humo">${humo}</g>`
    + '<g class="efecto-ambiente fogata"><circle class="fogata-luz" cx="-12" cy="-6" r="20" fill="url(#m-luz)"/><g transform="translate(-4 0) scale(1.5)"><path class="llama" d="M-8 0C-12 -4 -9 -8 -8 -12C-7 -8 -4 -5 -8 0Z"/><path class="llama-i" d="M-8 0C-10 -2 -8 -5 -8 -7C-7 -5 -6 -3 -8 0Z"/></g></g>';
}

/**
 * Peldaños y piedras del sendero (paisaje, sin azar: la posición sale de la distancia recorrida). Un peldaño atraviesa la tierra
 * cada tanto y, alternando a cada lado del borde, una piedra pequeña; el ancho sigue a la perspectiva del camino.
 */
function detalleSendero(caja, camino, L, by, sy, abajo, arriba) {
  if (!caja) return;
  let s = '';
  for (let d = 22, i = 0; d < L - 10; d += 17, i++) {
    const a = camino.getPointAtLength(d), b = camino.getPointAtLength(Math.min(L, d + 1.5));
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n;
    const f = Math.min(1, Math.max(0, (by - a.y) / ((by - sy) || 1)));
    const w = (abajo + (arriba - abajo) * f) / 2;
    s += `<path class="peldano" d="M${f1(a.x - nx * w * 0.8)} ${f1(a.y - ny * w * 0.8)}L${f1(a.x + nx * w * 0.8)} ${f1(a.y + ny * w * 0.8)}"/>`;
    if (i % 3 === 1) {
      const lado = i % 2 ? 1 : -1, r = 1.2 + (i % 4) * 0.35 + (1 - f) * 0.8;
      s += `<ellipse class="piedra" cx="${f1(a.x + nx * (w + 2.6) * lado)}" cy="${f1(a.y + ny * (w + 2.6) * lado)}" rx="${f1(r * 1.3)}" ry="${f1(r)}"/>`;
    }
  }
  caja.innerHTML = s;
}

/** Huellas del tramo recorrido: puntitos que alternan a cada lado del sendero, hasta donde estás. Solo con todos los efectos. */
function huellas(l) {
  const { camino, host } = estado;
  const caja = host.querySelector('#m-huellas');
  if (!caja) return;
  const pasos = [];
  for (let d = 16, i = 0; d < l - 14; d += 10, i++) {
    const a = camino.getPointAtLength(d), b = camino.getPointAtLength(d + 1.5);
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    const lado = i % 2 ? 1 : -1;
    pasos.push(`<circle cx="${f1(a.x - (dy / n) * 2.2 * lado)}" cy="${f1(a.y + (dx / n) * 2.2 * lado)}" r="1.1"/>`);
  }
  caja.innerHTML = pasos.join('');
}

/** Etiquetas sin choques: a la derecha de la bandera; si choca o se sale, a la izquierda; si sigue, se oculta. */
function etiquetar(yo) {
  const { campos, W, host } = estado;
  // Cada campamento (mástil, banderín y tienda) y el punto de «Tú» ocupan su sitio: ninguna etiqueta se les encima.
  const cajas = campos.map(({ m, p }) => ({ x: p.x - 20, y: p.y - 36, w: 58, h: 40, m }));
  cajas.push({ x: yo.x - 18, y: yo.y - 18, w: 36, h: 36 });
  const choca = (b, propio) => b.x < 4 || b.x + b.w > W - 4 || cajas.some((o) => o.m !== propio && b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  // «Tú» primero: arriba a la izquierda de tu punto y, si ahí hay un campamento, en otro rincón.
  const yoOpc = [[-46, -38, 'end', -16], [10, -38, 'start', 16], [-46, 12, 'end', -16], [10, 12, 'start', 16]]
    .map(([dx, dy, a, tx]) => ({ x: yo.x + dx, y: yo.y + dy, w: 36, h: 24, anclaje: a, tx: yo.x + tx }));
  const yb = yoOpc.find((o) => !choca(o)) ?? yoOpc[0];
  cajas.push(yb);
  const prioridad = (m) => (m === estado.esc.cima ? 0 : m === estado.meta ? 1 : 2);
  const orden = [...campos].sort((a, b) => prioridad(a.m) - prioridad(b.m));
  let s = `<text class="yo-txt" x="${f1(yb.tx)}" y="${f1(yb.y + 17)}" text-anchor="${yb.anclaje}">Tú</text>`;
  for (const { m, p, cima } of orden) {
    const txt = nombreHito(m);
    const w = txt.length * 8.6 + 16;
    // Junto al banderín (a su derecha o a la izquierda del mástil), arriba de la cumbre o, si no cabe, bajo el claro.
    const derecha = { x: p.x + 27, y: p.y - 46, w, h: 22, anclaje: 'start', tx: p.x + 32 };
    const izquierda = { x: p.x - 7 - w, y: p.y - 46, w, h: 22, anclaje: 'end', tx: p.x - 12 };
    const arriba = { x: p.x - w / 2, y: p.y - 70, w, h: 22, anclaje: 'middle', tx: p.x };
    const abajo = { x: p.x + 6 - w / 2, y: p.y + 8, w, h: 22, anclaje: 'middle', tx: p.x + 6 };
    const opciones = cima ? [arriba, izquierda, derecha] : [derecha, izquierda, abajo];
    const b = opciones.find((o) => !choca(o, m));
    if (!b) continue;
    cajas.push(b);
    s += `<text class="campo-txt${cima ? ' cima' : ''}" x="${f1(b.tx)}" y="${f1(b.y + 16)}" text-anchor="${b.anclaje}">${txt}</text>`;
  }
  const caja = host.querySelector('#m-etiquetas');
  caja.innerHTML = s;
  // Cada etiqueta lleva detrás una placa redondeada (se mide el texto ya dibujado: legible sobre cualquier cielo o ladera).
  for (const t of caja.querySelectorAll('text')) {
    const bb = t.getBBox();
    if (!bb.width) continue;
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('class', t.classList.contains('yo-txt') ? 'eti-yo' : 'eti-fondo');
    r.setAttribute('x', f1(bb.x - 6)); r.setAttribute('y', f1(bb.y - 1.5));
    r.setAttribute('width', f1(bb.width + 12)); r.setAttribute('height', f1(bb.height + 3));
    r.setAttribute('rx', f1((bb.height + 3) / 2));
    caja.insertBefore(r, t);
  }
}

function colocar(sats, animado) {
  const { L, camino, enAltura, esc, host } = estado;
  const l = enAltura(altitud(sats, esc));
  const hecho = host.querySelector('#m-hecho');
  hecho.style.strokeDasharray = `${f1(L)} ${f1(L)}`;
  hecho.style.strokeDashoffset = f1(L - l);
  const luz = host.querySelector('#m-luzhecha');
  if (luz) { luz.style.strokeDasharray = hecho.style.strokeDasharray; luz.style.strokeDashoffset = hecho.style.strokeDashoffset; }
  const p = camino.getPointAtLength(l);
  host.querySelector('#m-yo').setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y)})`);
  host.querySelectorAll('.campo').forEach((g) => g.classList.toggle('alcanzado', Number(g.dataset.m) <= sats));
  // La fogata y el humo: el siguiente campamento es el primero que aún no alcanzaste.
  const sig = estado.campos.find((x) => x.m > sats)?.m;
  host.querySelectorAll('.campo').forEach((g) => g.classList.toggle('sig', Number(g.dataset.m) === sig));
  const dn = trazoNieve(estado.nieveMedidas, altitud(sats, esc));
  host.querySelectorAll('.nieve, .nieve-sombra').forEach((n) => n.setAttribute('d', dn));
  if (!animado) { etiquetar(p); huellas(l); }
  return p;
}

/**
 * Sube a "Tú" desde `desde` hasta `hasta` sats. Con movimiento reducido, salta al final.
 * `festejo` ({nivel: 'compra'|'etapa'|'hito', etapa, delta}) solo llega por una compra de esta
 * sesión: el tramo recién subido se enciende y, al llegar, la montaña celebra.
 */
export function subir(desde, hasta, ms = 2000, festejo = null) {
  if (!estado) return;
  estado.sats = hasta;
  if (sinMovimiento() || desde === hasta) { colocar(hasta, false); return; }
  estado.host.querySelector('#m-etiquetas').innerHTML = '';
  const { esc, enAltura, L, host } = estado;
  host.querySelector('#m-huellas').innerHTML = ''; // se vuelven a poner al llegar
  const a0 = altitud(desde, esc), a1 = altitud(hasta, esc);
  const estela = festejo && host.querySelector('#m-estela');
  const l0 = estela ? enAltura(a0) : 0;
  if (estela) estela.classList.add('viva');
  const t0 = performance.now();
  const paso = (t) => {
    if (estado.host !== host || !host.isConnected) return; // la escena se redibujó (resize)
    const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
    const alt = a0 + (a1 - a0) * e;
    const satsAhora = 10 ** (Math.log10(esc.base) + alt * (Math.log10(esc.cima) - Math.log10(esc.base)));
    const p = colocar(k < 1 ? satsAhora : hasta, k < 1);
    if (estela) estela.style.strokeDasharray = `0 ${f1(l0)} ${f1(Math.max(0, enAltura(alt) - l0))} ${f1(L)}`;
    if (k < 1) requestAnimationFrame(paso);
    else if (festejo) llegar(festejo, p, hasta);
  };
  requestAnimationFrame(paso);
}

// ------------------------------------------------------------------ celebración
const NS = 'http://www.w3.org/2000/svg';
function nodo(tag, attrs, padre) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  padre.appendChild(el);
  return el;
}
const retirar = (el, ms) => setTimeout(() => el.remove(), ms);

/** Pocas brasas que suben desde (x, y) y se apagan: solo transform y opacity. */
function brasas(fx, x, y, n, alcance, retraso = 0) {
  for (let i = 0; i < n; i++) {
    const g = nodo('g', { transform: `translate(${f1(x)} ${f1(y)})` }, fx);
    const c = nodo('circle', { class: 'brasa', r: f1(1.3 + Math.random() * 1.9) }, g);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
    const dist = alcance * (0.45 + Math.random() * 0.55);
    c.style.setProperty('--dx', `${f1(Math.cos(ang) * dist)}px`);
    c.style.setProperty('--dy', `${f1(Math.sin(ang) * dist)}px`);
    c.style.animationDuration = `${900 + Math.round(Math.random() * 700)}ms`;
    c.style.animationDelay = `${retraso + i * 22}ms`;
    retirar(g, retraso + 2000);
  }
}

function llegar({ nivel, etapa, delta }, p, hasta) {
  const { host, W, c, campos, enAltura, camino, esc } = estado;
  const fx = host.querySelector('#m-fx');
  const estela = host.querySelector('#m-estela');
  if (!fx) return;
  estela.classList.remove('viva');
  estela.classList.add('apaga');
  setTimeout(() => estela.classList.remove('apaga'), 1000);

  // Cada compra: brasas desde tu punto, la cifra flotando y la siguiente bandera que se agita.
  brasas(fx, p.x, p.y, nivel === 'compra' ? 9 : 14, nivel === 'compra' ? 46 : 64);
  // «+N sats» donde no choque con las etiquetas (banderas y «Tú»): se prueban varios sitios.
  const t = nodo('text', { class: 'flota' }, fx);
  t.textContent = `+${entero(delta)} sats`;
  const ocupadas = [...host.querySelectorAll('#m-etiquetas text')].map((e) => e.getBBox());
  // La cifra entra 8 px más abajo y sube 24 px mientras se apaga: se reserva todo su recorrido.
  const choca = (b) => b.x < 4 || b.x + b.width > W - 4 || b.y - 26 < 4
    || ocupadas.some((o) => b.x < o.x + o.width + 4 && b.x + b.width + 4 > o.x && b.y - 26 < o.y + o.height + 2 && b.y + b.height + 10 > o.y);
  const sitios = [[18, 22, 'start'], [-18, 22, 'end'], [0, -40, 'middle'], [18, -10, 'start'], [-18, -10, 'end'], [0, -64, 'middle'], [0, 42, 'middle']];
  for (const [dx, dy, ancla] of sitios) {
    t.setAttribute('x', f1(p.x + dx)); t.setAttribute('y', f1(p.y + dy)); t.setAttribute('text-anchor', ancla);
    if (!choca(t.getBBox())) break;
  }
  retirar(t, 1800);
  const siguiente = host.querySelector(`.campo[data-m="${campos.find((x) => x.m > hasta)?.m}"]`);
  if (siguiente) { siguiente.classList.add('agita'); setTimeout(() => siguiente.classList.remove('agita'), 1700); }
  if (nivel === 'compra') return;

  // Etapa: la bandera de la etapa se iza con un anillo de luz y el cielo respira.
  const alba = host.querySelector('#m-alba');
  alba.classList.remove('respira', 'amanece'); void alba.getBBox();
  const grande = nivel === 'hito' || nivel === 'epico';
  alba.classList.add(grande ? 'amanece' : 'respira');
  setTimeout(() => alba.classList.remove('respira', 'amanece'), 3000);
  let bandera = host.querySelector(`.campo[data-m="${etapa}"]`);
  const pe = bandera ? campos.find((x) => x.m === etapa).p : camino.getPointAtLength(enAltura(altitud(etapa, esc)));
  if (bandera) {
    bandera.classList.add('iza');
    setTimeout(() => bandera.classList.remove('iza'), 1800);
  } else {
    bandera = nodo('g', { class: 'campo alcanzado iza plantada', transform: `translate(${f1(pe.x)} ${f1(pe.y)})` }, fx);
    nodo('line', { y2: '-24' }, bandera);
    nodo('path', { class: 'banderin', d: 'M0 -24L17 -19L0 -14Z' }, bandera);
    retirar(bandera, 3200);
  }
  for (const [i, r] of [[0, 12], [1, 12]]) {
    const a = nodo('circle', { class: 'anillo', cx: f1(pe.x), cy: f1(pe.y - 20), r }, fx);
    a.style.animationDelay = `${i * 260}ms`;
    retirar(a, 2000);
  }
  cometa(fx, estado.H, c);
  if (!grande) return;

  // Hito grande (1M, 10M, 1 BTC): amanecer completo con luz sobre la cumbre.
  const rl = Math.min(W, estado.H) * 0.22;
  const luz = nodo('circle', { class: 'luz-cima', cx: f1(c.sx), cy: f1(c.sy), r: f1(rl), fill: 'url(#m-luz)' }, fx);
  retirar(luz, 3000);
  brasas(fx, c.sx, c.sy + 6, 10, rl * 0.9, 500);
  if (nivel === 'epico') epico(fx, c, W, estado.H);
}

/**
 * Cometa (idea 114): al cruzar una etapa, una raya con estela cruza el cielo de lado a lado (solo transform y opacity,
 * en CSS con la anchura de la escena). Pasa por debajo del saldo, que es HTML y va encima.
 */
function cometa(fx, H, c) {
  const y = Math.max(c.sy * 0.55, H * 0.24);
  const g = nodo('g', { class: 'cometa', transform: `translate(-60 ${f1(y)})` }, fx);
  const mover = nodo('g', { class: 'cometa-mueve' }, g);
  nodo('line', { class: 'cometa-cola', x1: -86, y1: -30, x2: 0, y2: 0 }, mover);
  nodo('circle', { class: 'cometa-cabeza', r: 3.2 }, mover);
  retirar(g, 2400);
}

/**
 * Llegar a 1 BTC (idea 8): sobre un hito grande, una aurora que ilumina todo el cielo y una lluvia de luz sobre la cumbre.
 * Ocurre una sola vez en la vida de la cuenta; todo en transform y opacity y se retira solo.
 */
function epico(fx, c, W, H) {
  const g = nodo('g', { class: 'epico' }, fx);
  [[0.1, 0.05], [0.2, 0.04], [0.3, 0.035]].forEach(([dy, amp], k) => nodo('path', { class: `aurora-epica e${k}`, d: cintaD(W, H * dy, H * amp, H * 0.2) }, g));
  for (let i = 0; i < 34; i++) {
    const gota = nodo('circle', { class: 'luz-gota', cx: f1(c.sx + (Math.random() - 0.5) * W * 0.46), cy: f1(c.sy - H * (0.1 + Math.random() * 0.12)), r: f1(1.2 + Math.random() * 1.8) }, g);
    gota.style.setProperty('--cae', `${f1(H * (0.16 + Math.random() * 0.14))}px`);
    gota.style.animationDelay = `${300 + Math.round(Math.random() * 2600)}ms`;
  }
  retirar(g, 6500);
}

function describir(sats, meta) {
  estado.host.querySelector('#m-desc').textContent = descripcionMontana(sats, meta, estado.esc.campos, estado.esc.cima) + (estado.compras ? ` Al pie crece tu bosque: un pino por compra (${estado.compras}).` : '');
}
