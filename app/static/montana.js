// La montaña de la cabecera: el saldo en sats es la altitud y los hitos son campamentos.
import { arbolesDe, escalaMontana, altitud, descripcionMontana, nombreHito, entero, textoCampamento, fechaLarga, iluminacionLunar, etapasHasta, etapaSiguiente, marcasDeEtapa, rangoEtapa, firmasDe, textoFirmantes, accionFirmas, arbolDelPrimerDia, inicialesGrabadas, fechaGrabada, lucesDelValle, piscuchasDelValle, textoValle, textoOsos } from './lib.js';
import { sinMovimiento } from './movimiento.js';
import { volcanes, torogoz, papelPicado, cohetes, clima, arbolHonor, monedaB, petroglifo, farolCumple, luciernagas, relojDeSol, monedasDelLago } from './arte.js';
import { sitiosPueblo, pueblo, llano, bordeLlano, enBorde, primerPlano, campos as camposLlano, laderaBaja } from './arte-pueblo.js';
import { OSOS, osos, sitioOsos, piesOsos, dentroDe } from './arte-osos.js';
import { escalaValle, formaValle, sitiosValle, sitiosLadera, canton, milpa, caminoReal, arbolPrimerDia, quebrada, tule, vidaLago, lucesValle, piscuchas, grabadoLuna, marDeNiebla, potrero, bandadas, zompopos, relampago, sitioRayo, alturaVolcanes } from './arte-valle.js';
const f1 = (n) => n.toFixed(1);

function azar(s) {
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** Composición según el tamaño: en móvil la cumbre baja para dejar el cielo al saldo. */
function composicion(W, H, techo, pie = 104) {
  // techo: dónde acaba el texto del saldo; la cumbre y su etiqueta quedan por debajo.
  // En móvil y tablet el botón fijo «Anotar compra» ocupa los últimos ~90 px: el sendero empieza por encima (`pie`, 104 px).
  // Cuando la escena deja libre la franja de abajo para que se asomen las pestañas (campamento 17), el botón ya no flota sobre
  // ella y el sendero puede arrancar más abajo (`pie` menor, lo da el CSS con `--pie`): la montaña casi no pierde alto.
  // Teléfono acostado (idea 64): la escena mide lo que la pantalla (poca altura), el saldo va a la izquierda y la montaña a la
  // derecha, a lo ancho; el botón «Anotar» va abajo a la izquierda, así que el sendero puede bajar hasta casi el borde.
  // (Campamento 22C) En el teléfono y la tablet el valle va delante, al pie: si sobra alto, el sendero arranca más arriba y deja una
  // franja de valle (`valle`, px) para el pueblo y el lago. Nunca a costa de la subida: el sendero conserva al menos `SUBIDA_MIN` px.
  if (H <= 520 && W >= H * 1.5 && W < 1100) return { sx: W * 0.7, sy: Math.max(H * 0.36, 92), base: [W * 0.5, H - 26], vueltas: 4, ancho: 0.2, campos: 3, sol: [W * 0.92, H * 0.3], rs: H * 0.07, lago: [W * 0.85, W * 0.11], valle: 0 };
  if (W < 700) {
    const sy = Math.max(H * 0.43, techo + 70), valle = Math.max(0, Math.min(H * 0.19, H - pie - sy - SUBIDA_MIN.tel));
    return { sx: W * 0.62, sy, base: [W * 0.14, H - pie - valle], vueltas: 5, ancho: 0.34, campos: 3, sol: [W * 0.86, H * 0.47], rs: W * 0.1, valle };
  }
  if (W < 1100) {
    const sy = Math.max(H * 0.3, techo + 70), valle = Math.max(0, Math.min(H * 0.18, H - pie - sy - SUBIDA_MIN.tab));
    return { sx: W * 0.64, sy, base: [W * 0.2, H - pie - valle], vueltas: 6, ancho: 0.27, campos: 4, sol: [W * 0.87, H * 0.3], rs: W * 0.07, valle };
  }
  // Escritorio: el pico se dimensiona por la altura y se compone en un marco centrado de hasta
  // 1600 px (2000 desde 2400 px de ancho, 2400 desde 3200), alineado con el contenido; fuera del marco solo hay cielo y cordillera.
  const marco = Math.min(W, W >= 3200 ? 2400 : W >= 2400 ? 2000 : 1600); // crece con la raíz en pantallas muy anchas (styles.css: --medio-ancho)
  const dcha = (W + marco) / 2;
  const mw = Math.min(marco, H * 1.7);
  return { sx: dcha - mw * 0.42, sy: H * 0.16, base: [dcha - mw * 0.74, H * 0.915], vueltas: 7, ancho: mw * 0.26 / W, campos: 4, sol: [dcha - mw * 0.12, H * 0.24], rs: H * 0.08, valle: 0 };
}
/** (22C) Lo mínimo que mide la subida (de la salida a la cumbre) antes de dejar sitio al valle delante. */
const SUBIDA_MIN = { tel: 252, tab: 430 };

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
  // Los mares (rediseño Fable): unas manchas tenues, fijas, que solo se ven en la parte iluminada (se recortan con ella) y un
  // borde algo más apagado (el limbo): la luna deja de ser un disco plano.
  const mar = (dx, dy, rx2, ry2) => `<ellipse cx="${f1(cx + dx * r)}" cy="${f1(cy + dy * r)}" rx="${f1(rx2 * r)}" ry="${f1(ry2 * r)}"/>`;
  const mares = mar(-0.4, -0.16, 0.3, 0.42) + mar(-0.06, -0.5, 0.32, 0.18) + mar(0.3, -0.3, 0.21, 0.17) + mar(0.44, 0.0, 0.16, 0.21) + mar(0.2, 0.22, 0.13, 0.1) + mar(-0.3, 0.5, 0.17, 0.1) + mar(0.62, -0.38, 0.07, 0.09);
  return `<circle class="luna-sombra" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/><defs><clipPath id="m-luna-luz"><path d="${luz}"${espejo}/></clipPath></defs><path class="astro" d="${luz}"${espejo}/>`
    + `<g class="luna-mares" clip-path="url(#m-luna-luz)">${mares}<circle class="luna-limbo" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.97)}"/></g>`;
}

/**
 * Luz del cielo (rediseño Fable), todo quieto (sin animación: no cuesta nada al desplazar):
 * - la **Vía Láctea**, de noche: una banda tenue en diagonal con polvo de estrellas (un solo trazo de puntos; `azar` propio);
 * - **rayos crepusculares**, al amanecer y al atardecer: cinco haces que salen del sol por detrás de la montaña y se apagan con
 *   la distancia: hacia arriba, justo antes del texto del saldo (`techo`); en escritorio su alcance no llega a la columna del
 *   saldo. Nunca aclaran el fondo de una cifra.
 * El CSS enseña una u otra según `html[data-cielo]`.
 */
function luzDelCielo(W, H, c, techo) {
  const cx = W * 0.4, cy = H * 0.2, largo = Math.hypot(W, H) * 1.15, ancho = Math.max(80, Math.min(W, H) * 0.24);
  const rnd = azar(23);
  let polvo = '';
  for (let i = 0; i < 80; i++) { const u = rnd() - 0.5, g = (rnd() + rnd() + rnd()) / 3 - 0.5; polvo += `M${f1(cx + u * largo)} ${f1(cy + g * ancho * 1.25)}h0.01`; }
  const via = `<g class="via-lactea" transform="rotate(-27 ${f1(cx)} ${f1(cy)})"><rect x="${f1(cx - largo / 2)}" y="${f1(cy - ancho / 2)}" width="${f1(largo)}" height="${f1(ancho)}" fill="url(#m-via)"/><path class="via-polvo" d="${polvo}"/></g>`;
  const [sx, sy] = c.sol, R = Math.min(Math.max(W, H) * 0.62, W >= 1100 ? W * 0.3 : Infinity);
  const haz = (grados, abre) => { const a = (grados - abre / 2) * Math.PI / 180, b = (grados + abre / 2) * Math.PI / 180; return `<path d="M${f1(sx)} ${f1(sy)}L${f1(sx + Math.cos(a) * R)} ${f1(sy + Math.sin(a) * R)}L${f1(sx + Math.cos(b) * R)} ${f1(sy + Math.sin(b) * R)}Z"/>`; };
  // El degradado es una elipse: a lo ancho llega lejos y hacia arriba se apaga justo antes del texto del saldo (sin corte seco).
  const k = Math.min(1, Math.max(60, sy - techo - 10) / R);
  const rayos = `<defs><radialGradient id="m-rayo" gradientUnits="userSpaceOnUse" cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(R)}" gradientTransform="translate(${f1(sx)} ${f1(sy)}) scale(1 ${k.toFixed(3)}) translate(${f1(-sx)} ${f1(-sy)})"><stop offset="0" class="ry-0"/><stop offset="0.22" class="ry-1"/><stop offset="1" class="ry-2"/></radialGradient></defs>`
    + `<g class="rayos" fill="url(#m-rayo)">${haz(196, 7)}${haz(218, 10)}${haz(244, 6)}${haz(268, 11)}${haz(296, 7)}${haz(322, 9)}${haz(172, 8)}</g>`;
  return via + rayos;
}

/**
 * Relieve de la montaña (rediseño Fable): la ladera dejaba de leerse como roca porque era un solo plano. Aquí van, en el mismo
 * lenguaje de facetas de los árboles y las piedras, unos espolones que bajan de la arista central: cada uno tiene un flanco en
 * sombra (el que da la espalda al astro) y otro que recibe algo de luz, y un filo fino en la cresta. En la cara iluminada, dos
 * contrafuertes con su sombra. Y al pie, un bosque ralo que sube por la falda y da escala (la montaña se ve grande).
 * Todo son puntos fijos en coordenadas de la propia ladera (u: de la arista a la silueta; v: de la cumbre al pie): no se gasta
 * `rnd()` (el bosque usa su propio `azar`), así que la silueta, el sendero y los campamentos no cambian. Tonos muy bajos: el
 * camino y los rótulos mandan.
 */
function relieve({ sx, sy, alto, izq, der, quiebre, W, H }) {
  const enY = (pts, y) => { // x de una polilínea (ordenada por y) a esa altura
    if (y <= pts[0][1]) return pts[0][0];
    for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x0 + ((x1 - x0) * (y - y0)) / Math.max(1e-6, y1 - y0); }
    return pts[pts.length - 1][0];
  };
  const L = [...izq].sort((a, b) => a[1] - b[1]), A = [[sx, sy], ...quiebre], R = [[sx, sy], ...der];
  const pt = (lado, u, v) => { const y = sy + alto * v, xa = enY(A, y), xb = enY(lado < 0 ? L : R, y); return [xa + (xb - xa) * u, y]; };
  const d = (pts) => pts.map((q, i) => `${i ? 'L' : 'M'}${f1(q[0])} ${f1(q[1])}`).join('');
  // Una malla de planos por cara: nudos fijos (u, v) y triángulos con su tono (s = sombra, l = luz; el número, cuánto).
  const cara = (lado, nudos, planos, filos) => {
    const P = Object.fromEntries(Object.entries(nudos).map(([k, [u, v]]) => [k, pt(lado, u, v)]));
    return planos.map(([a, b, c2, tono]) => `<path class="rel-${tono[0] === 's' ? 'sombra' : 'luz'} r${tono}" d="${d([P[a], P[b], P[c2]])}Z"/>`).join('')
      + filos.map((f) => `<path class="rel-filo" d="${d(f.split(' ').map((k) => P[k]))}"/>`).join('');
  };
  let s = '<g class="relieve" clip-path="url(#m-silueta)">';
  // Ladera del sendero (a la izquierda de la arista; la luz viene de la derecha): un espolón que baja de la cumbre (A0 · M1 · M3 · M5)
  // y un valle entre él y la arista (A1 · M2 · M4). Lo que mira a la izquierda queda en sombra.
  s += cara(-1, {
    A0: [0, 0], A1: [0, 0.22], A2: [0, 0.5], A3: [0, 0.78], A4: [0, 1.05],
    S1: [1, 0.3], S2: [1, 0.56], S3: [1, 0.8], S4: [1, 1.05],
    M1: [0.52, 0.19], M2: [0.38, 0.44], M3: [0.64, 0.6], M4: [0.3, 0.8], M5: [0.7, 0.9],
  }, [
    ['A0', 'A1', 'M1', 'l2'], ['A0', 'M1', 'S1', 's3'], ['A1', 'M2', 'M1', 's1'], ['A1', 'A2', 'M2', 'l1'], ['M1', 'M2', 'M3', 'l2'],
    ['M1', 'M3', 'S1', 's2'], ['S1', 'M3', 'S2', 's3'], ['A2', 'M4', 'M2', 's1'], ['A2', 'A3', 'M4', 'l1'], ['M3', 'M4', 'M5', 'l1'],
    ['M3', 'M5', 'S2', 's2'], ['S2', 'M5', 'S3', 's3'], ['M4', 'A4', 'M5', 's1'], ['S3', 'M5', 'S4', 's2'],
  ], ['A0 M1 M3 M5', 'A1 M2 M4']);
  // Cara iluminada: dos contrafuertes con la sombra abajo a la izquierda.
  s += cara(1, {
    A0: [0, 0], A1: [0, 0.22], A2: [0, 0.5], A3: [0, 0.78], A4: [0, 1.05],
    R1: [1, 0.3], R2: [1, 0.6], R3: [1, 1.05], N1: [0.5, 0.26], N2: [0.42, 0.54], N3: [0.6, 0.84],
  }, [
    ['A0', 'N1', 'A1', 'l2'], ['A1', 'N1', 'N2', 's2'], ['N1', 'R1', 'R2', 'l1'], ['A2', 'N2', 'N3', 's1'], ['N2', 'R2', 'N3', 'l1'], ['A3', 'N3', 'A4', 's1'], ['R2', 'R3', 'N3', 's1'],
  ], ['A0 N1 N2 N3']);
  // Bosque ralo de la falda: triangulitos que se van espaciando con la altura (un solo trazo).
  const rnd = azar(11), k = Math.max(0.8, Math.min(1.9, Math.min(W, H) / 520));
  let bosque = '';
  for (let i = 0; i < Math.round(W / 2.6); i++) {
    const v = 0.6 + 0.42 * rnd() ** 0.5, r1 = rnd(), r2 = rnd(), r3 = rnd(), y = sy + alto * v, t = Math.max(0, (v - 0.6) / 0.4);
    if (r2 > t ** 1.7 * 1.25) continue; // menos árboles (y más chicos) cuanto más arriba
    const x0 = enY(L, y), x1 = enY(R, y), x = x0 + (x1 - x0) * (0.03 + 0.94 * r1), a = k * (3.5 + 8 * t) * (0.75 + 0.5 * r3);
    bosque += `M${f1(x)} ${f1(y - a)}l${f1(a * 0.36)} ${f1(a)}h${f1(-a * 0.72)}Z`;
  }
  return `${s}<path class="rel-bosque" d="${bosque}"/></g>`;
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
  return una(H * 0.5, 0.8, 'n1') + una(H * 0.57, 1.1, 'n2') + una(H * 0.63, 0.6, 'n3'); // por debajo de la cumbre: asoman a los lados de la montaña y nunca tapan la meta
}
/** Dos bandas de niebla entre la sierra y la montaña (solo con todos los efectos): degradados que se desvanecen arriba y abajo. */
function niebla(W, H, y) {
  return `<g class="efecto-ambiente niebla"><rect class="niebla-a" x="${f1(-W * 0.15)}" y="${f1(y * H - H * 0.05)}" width="${f1(W * 1.3)}" height="${f1(H * 0.1)}" fill="url(#m-niebla)"/><rect class="niebla-b" x="${f1(-W * 0.15)}" y="${f1(y * H + H * 0.035)}" width="${f1(W * 1.3)}" height="${f1(H * 0.08)}" fill="url(#m-niebla)"/></g>`;
}
let estado = null;

/** La franja de nieve de la cumbre: más honda cuanto más cerca de la meta (la altitud va de 0 a 1 hasta la cumbre). */
// La línea de nieve, de derecha a izquierda: [posición a lo ancho (0 a 1), hondura]. Lenguas largas por las canales y roca que sube
// entre ellas, a pasos desiguales (antes eran ocho dientes parejos y la nieve parecía un glaseado).
const DIENTES = [[0.03, 0.6], [0.12, 0.98], [0.19, 0.7], [0.29, 1.18], [0.36, 0.84], [0.42, 0.95], [0.47, 0.62], [0.535, 1.02], [0.6, 0.68], [0.69, 1.24], [0.76, 0.86], [0.83, 1.05], [0.9, 0.7], [0.97, 0.9]];
const NIEVE_MIN = 0.55; // con la altitud en cero: una capa fina
const NIEVE_MAX = 1.5;  // llegando a la cumbre: la cumbre bien cubierta
/** (Campamento 25) Los mismos puntos que `trazoNieve`, como polígono (la regla de los osos los usa). */
function puntosNieve({ sx, sy, ancho, nv }, alt) {
  const hondo = nv * (NIEVE_MIN + (NIEVE_MAX - NIEVE_MIN) * Math.min(1, Math.max(0, alt)));
  return [[sx - ancho, sy - 120], [sx + ancho, sy - 120], ...DIENTES.map(([u, k]) => [sx + ancho - 2 * ancho * u, sy + hondo * k])];
}
function trazoNieve({ sx, sy, ancho, nv }, alt) {
  const hondo = nv * (NIEVE_MIN + (NIEVE_MAX - NIEVE_MIN) * Math.min(1, Math.max(0, alt)));
  let d = `M${f1(sx - ancho)} ${f1(sy - 120)}L${f1(sx + ancho)} ${f1(sy - 120)}`; // (arriba con holgura: el cuerno de la cumbre llega a 39 · 1.6 px)
  for (const [u, k] of DIENTES) d += `L${f1(sx + ancho - 2 * ancho * u)} ${f1(sy + hondo * k)}`;
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
/** Dónde está el lago y cuánto mide (lo usan el lago y el valle: la quebrada llega a él). */
function geoLago(c, W, H) {
  // (22C) Con la franja del valle delante (teléfono y tablet altos), el lago está en el valle, a la derecha del pueblo.
  if (c.valle > 30) return { cx: W * 0.82, cy: c.base[1] + (H - c.base[1]) * 0.5, rx: Math.min(W * 0.16, 120), ry: Math.max(9, H * 0.017) };
  const cx = c.lago ? c.lago[0] : Math.min(Math.max(c.sol[0], W * 0.2), W * 0.8), cy = W >= 1100 && !c.lago ? H * 0.9 : Math.min(H * 0.875, c.base[1] - 24); // en escritorio, al fondo del valle, tras los pinos
  return { cx, cy, rx: c.lago ? c.lago[1] : Math.min(W * 0.16, 120), ry: Math.max(8, H * 0.016) };
}
function lago(c, W, H, ventas = 0, kv = 1) {
  const { cx, cy, rx, ry } = geoLago(c, W, H);
  const reflejo = [0, 1, 2, 3].map((i) => `<ellipse class="lago-reflejo" cx="${f1(cx + (i % 2 ? 3 : -3))}" cy="${f1(cy - ry * 0.35 + i * ry * 0.42)}" rx="${f1(rx * (0.26 - i * 0.045))}" ry="${f1(Math.max(1.1, ry * 0.12))}"/>`).join('');
  const estrellas = [[-0.5, -0.2], [-0.2, 0.25], [0.45, -0.1], [0.62, 0.3], [-0.68, 0.2]].map(([x, y]) => `<circle class="lago-estrella" cx="${f1(cx + rx * x)}" cy="${f1(cy + ry * y)}" r="0.9"/>`).join('');
  // De día el sol deja una estela de luz en el agua (dos trazos finos); de noche, la luna con su fase.
  const sol = [0, 1].map((i) => `<ellipse class="lago-sol" cx="${f1(cx)}" cy="${f1(cy - ry * 0.25 + i * ry * 0.5)}" rx="${f1(rx * (0.42 - i * 0.16))}" ry="${f1(Math.max(1, ry * 0.1))}"/>`).join('');
  // La orilla no es un óvalo: un contorno irregular (sin azar: ondas fijas) que se adelgaza por los lados, como un reflejo
  // en el suelo del valle y no un plato apoyado.
  const orilla = [];
  for (let k = 0; k < 24; k++) {
    const t = (k / 24) * Math.PI * 2, onda = 1 + 0.08 * Math.sin(t * 3 + 0.6) + 0.05 * Math.sin(t * 5 + 1.3);
    orilla.push(`${k ? 'L' : 'M'}${f1(cx + Math.cos(t) * rx * onda)} ${f1(cy + Math.sin(t) * ry * (0.8 + 0.2 * Math.abs(Math.cos(t))) * onda)}`);
  }
  // (Campamento 22) El lago de época: en la seca el agua baja (`.lago-nivel` encoge en el CSS) y deja ver su playa; en la lluviosa la
  // cubre. Tule en la orilla, una garza quieta y el cayuco del pescador.
  return `<g class="lago" aria-hidden="true"><path class="lago-playa" d="${orilla.join('')}Z"/><g class="lago-nivel"><path class="lago-agua" d="${orilla.join('')}Z" fill="url(#m-lago)"/><g class="lago-luz">${sol}</g><g class="lago-luna">${reflejo}${estrellas}</g>${monedasDelLago(cx, cy, rx, ry, ventas)}<ellipse class="efecto-ambiente lago-onda" cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx * 0.6)}" ry="${f1(ry * 0.6)}"/><path class="lago-borde" d="M${f1(cx - rx * 0.85)} ${f1(cy - ry * 0.45)}Q${f1(cx)} ${f1(cy - ry * 1.25)} ${f1(cx + rx * 0.85)} ${f1(cy - ry * 0.45)}"/>${vidaLago({ cx, cy, rx, ry, k: kv })}</g>${tule({ cx, cy, rx, ry, k: kv })}<!--v-vacas--></g>`; // (22B) las vacas, en la orilla (se ponen con el valle)
}

/**
 * (Rendimiento iPhone) La escena en capas. El dibujo se sigue armando en un solo texto, como siempre: el cielo, la sierra lejana y la
 * sierra media van cada una en su `<g class="par par-…">`. Aquí, ya en el DOM, cada uno de esos grupos pasa a su propio `<svg
 * class="capa par par-…">`, hermano del principal. Motivo (medido): Safari no compone por separado los hijos de un SVG; mover un `<g>`
 * con el parallax le obligaba a repintar el dibujo entero (unos 900 nodos, a ×3) en cada fotograma del desplazamiento, y el iPhone se
 * quedaba en 24 fps con la montaña a la vista. Un `<svg>` hermano con `will-change: transform` (styles.css, solo con efectos «todos»,
 * que es cuando hay parallax) es una capa de la GPU: al deslizar solo se mueven imágenes ya pintadas y nada se repinta.
 * - El `<svg>` principal (role="img", la descripción, la montaña, el sendero, los campamentos: los datos, que no se mueven) sigue siendo
 *   el PRIMERO de `host` (lo buscan `host.querySelector('svg')`, tv.js y las pruebas con `getScreenCTM`). Las capas van detrás en el
 *   DOM, pero se pintan debajo: `z-index: -1` dentro de `host`, que aísla su propia pila (también en otro anfitrión, como la película).
 * - `#m-alba` (el velo de las celebraciones) estaba entre el cielo y las sierras: va al final de la capa del cielo (tiñe solo el cielo).
 * - Los ids no cambian y siguen siendo únicos: las capas usan los degradados (`url(#m-…)`) definidos en el `<svg>` principal.
 * - Los `<svg>` no reciben toques (`pointer-events: none`); la luna sí (sus tres toques: la moneda), y el clic sube hasta `host`.
 * - El frente (`<svg class="frente">`, justo después del principal): de `#m-luzhecha` al final, lo que cambia con el avance (ver abajo).
 * La forma, los `rnd()` y el orden de pintado no cambian: se ve igual. Orden en `host`: principal, frente, cielo, lejana, media.
 */
function enCapas(host, W, H) {
  const svg = host.querySelector('svg');
  host.style.isolation = 'isolate';
  const capas = [...svg.querySelectorAll('.par')].map((g) => {
    const capa = document.createElementNS(NS, 'svg');
    for (const [k, v] of [['viewBox', `0 0 ${W} ${H}`], ['width', W], ['height', H], ['aria-hidden', 'true'], ['focusable', 'false'], ['class', `capa ${g.getAttribute('class')}`]]) capa.setAttribute(k, v);
    g.removeAttribute('class');
    capa.append(g);
    return capa;
  });
  const alba = svg.querySelector('#m-alba');
  if (alba && capas[0]) capas[0].append(alba);
  // El frente (`<svg class="frente">`, encima del principal): de `#m-luzhecha` al final del dibujo va lo que cambia con el avance —la luz y
  // el trazo del camino recorrido, las luminarias de Navidad, las marcas de etapa, los campamentos con sus faroles, «Tú» y su rótulo, la
  // celebración (`#m-fx`), el suelo del pie y lo que va delante—. Al subir (una compra nueva) o en la película del ascenso eso cambia en
  // cada fotograma: separado, Safari repinta solo el frente (pocas piezas) y no la montaña, el valle y el pueblo, que no se mueven.
  // El orden de pintado es el mismo de siempre: el frente va justo después del principal y por encima.
  const desde = svg.querySelector('#m-luzhecha');
  if (desde) {
    const frente = document.createElementNS(NS, 'svg');
    for (const [k, v] of [['viewBox', `0 0 ${W} ${H}`], ['width', W], ['height', H], ['aria-hidden', 'true'], ['focusable', 'false'], ['class', 'frente']]) frente.setAttribute(k, v);
    const mover = [];
    for (let n = desde; n; n = n.nextSibling) mover.push(n);
    frente.append(...mover);
    svg.after(frente);
  }
  host.append(...capas);
}

/**
 * Dibuja la escena en `host` con la escala de `sats` y deja a "Tú" en `inicio` (para animar luego con subir).
 */
export function dibujarMontana(host, { sats, meta, etapa = meta, inicio = sats, techo = 0, fechas = {}, compras = 0, plantar = false, tocable = false, aurora = false, eco = null, aniv = false, lluvia = 0, memoria = 0, ventas = 0, mensajes = [], puedeEscribir = false, firmas = [], cumples = [], pie = 104, libro = false, personas = 0, iniciales = '', primera = null, meses = 0, anios = 0, pelicula = false, rotulo = null }) {
  const W = Math.round(host.clientWidth), H = Math.round(host.clientHeight);
  if (!W || !H) return;
  const c = composicion(W, H, techo, pie);
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
    + '<radialGradient id="m-sol"><stop offset="0" class="so-0"/><stop offset="0.72" class="so-1"/><stop offset="1" class="so-2"/></radialGradient>'
    + `<radialGradient id="m-halo"><stop offset="0" class="h-0"/><stop offset="0.3" class="h-1"/><stop offset="0.55" class="h-2"/><stop offset="1" class="h-3"/></radialGradient>`
    + `<radialGradient id="m-resplandor" gradientUnits="userSpaceOnUse" cx="${f1(c.sol[0])}" cy="${f1(yH * H)}" r="${f1(Math.max(W, H) * 0.75)}" gradientTransform="translate(${f1(c.sol[0])} ${f1(yH * H)}) scale(1 0.55) translate(${f1(-c.sol[0])} ${f1(-yH * H)})"><stop offset="0" class="r-0"/><stop offset="0.45" class="r-1"/><stop offset="1" class="r-2"/></radialGradient>`
    + grad('m-lejos', `gradientUnits="userSpaceOnUse" x1="0" y1="${f1((yH - 0.12) * H)}" x2="0" y2="${f1((yH + 0.12) * H)}"`, [[0, 'lj-0'], [1, 'lj-1']])
    + grad('m-medio', `gradientUnits="userSpaceOnUse" x1="0" y1="${f1((yH + 0.02) * H)}" x2="0" y2="${f1((yH + 0.26) * H)}"`, [[0, 'md-0'], [1, 'md-1']])
    + grad('m-ladera', `gradientUnits="userSpaceOnUse" x1="${f1(c.sx)}" y1="${f1(c.sy)}" x2="${f1(c.sx - W * 0.25 * lado)}" y2="${f1(H)}"`, [[0, 'ld-0'], [0.55, 'ld-1'], [1, 'ld-2']])
    // (Campamento 22B) La cara iluminada: el mismo degradado de siempre, con el vector alargado hasta el pie (las paradas de antes
    // quedan en el mismo sitio: 0.45 × 0.55 y 1 × 0.55) y una parada más, la falda baja, que toma el verde o el dorado de la época.
    + grad('m-cara', `gradientUnits="userSpaceOnUse" x1="${f1(c.sx)}" y1="${f1(c.sy)}" x2="${f1(c.sx + ((derX0 - c.sx) * 0.35) / 0.55)}" y2="${f1(H)}"`, [[0, 'cr-0'], [0.2475, 'cr-1'], [0.55, 'cr-2'], [1, 'cr-3']])
    + grad('m-nube', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'nb-0'], [1, 'nb-1']])
    + grad('m-niebla', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'nl-0'], [0.5, 'nl-1'], [1, 'nl-0']])
    + grad('m-lago', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'lg-0'], [1, 'lg-1']])
    + grad('m-suelo', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'sl-0'], [1, 'sl-1']])
    + grad('m-humo', 'x1="0" y1="1" x2="0" y2="0"', [[0, 'hm-0'], [1, 'hm-1']])
    + grad('m-ceniza', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'ce-0'], [0.75, 'ce-1']])
    + grad('m-via', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'vl-0'], [0.5, 'vl-1'], [1, 'vl-0']])
    + grad('m-aire', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'ai-0'], [0.62, 'ai-1'], [1, 'ai-0']])
    + grad('m-v-loma', 'x1="0" y1="0" x2="0" y2="1"', [[0, 'vlo-0'], [0.55, 'vlo-1'], [1, 'vlo-2']])
    + '<radialGradient id="m-v-rayo" cx="0.48" cy="0.55" r="0.62"><stop offset="0" class="ry-0"/><stop offset="0.45" class="ry-1"/><stop offset="1" class="ry-2"/></radialGradient>';
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="m-desc"><desc id="m-desc"></desc><defs><radialGradient id="m-luz"><stop offset="0" class="luz-0"/><stop offset="1" class="luz-1"/></radialGradient><radialGradient id="m-farol"><stop offset="0" class="fa-0"/><stop offset="0.42" class="fa-1"/><stop offset="1" class="fa-2"/></radialGradient><linearGradient id="m-bano" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ba-0"/><stop offset="1" class="ba-1"/></linearGradient><linearGradient id="m-aurora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="au-0"/><stop offset="0.55" class="au-1"/><stop offset="1" class="au-2"/></linearGradient><filter id="m-bruma" x="-2%" y="-5%" width="104%" height="110%"><feGaussianBlur stdDeviation="1.6"/></filter>${defs}</defs><g aria-hidden="true">`;
  host.style.setProperty('--escena-w', `${W}px`); // las nubes, la niebla y las aves cruzan en CSS: necesitan saber cuánto mide la escena
  // Capa del cielo (parallax): cielo, estrellas, fugaz, sol, luna, nubes y aves.
  s += '<g class="par par-cielo">';
  // Un solo rectángulo con el degradado de las cinco capas (antes eran cinco franjas de bordes duros) y el resplandor del horizonte bajo el astro.
  s += `<rect class="cielo-0" x="0" y="0" width="${W}" height="${H}" fill="url(#m-cielo)"/><rect class="resplandor" x="0" y="0" width="${W}" height="${H}" fill="url(#m-resplandor)"/>`;
  for (let i = 0; i < 46; i++) s += `<circle class="estrella t${i % 5}" cx="${f1(rnd() * W)}" cy="${f1(rnd() * H * 0.5)}" r="${f1(0.5 + rnd() * 1.1)}"/>`;
  // Estrella fugaz (muy esporádica, solo de noche y con todos los efectos): una raya corta que cruza el cielo alto.
  s += `<line class="fugaz" x1="${f1(W * 0.16)}" y1="${f1(H * 0.1)}" x2="${f1(W * 0.16 + 46)}" y2="${f1(H * 0.1 + 20)}"/>`;
  // Lluvia de estrellas real (idea 43): esa noche cruzan más (dos de más a los lados del máximo, cuatro la noche del máximo).
  for (let k = 0; k < Math.round(lluvia * 4); k++) { const x0 = W * (0.3 + 0.17 * k), y0 = H * (0.07 + 0.045 * ((k * 3) % 4)); s += `<line class="fugaz f${k + 2}" x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x0 + 46)}" y2="${f1(y0 + 20)}"/>`; }
  s += luzDelCielo(W, H, c, techo);
  // Sol (amanecer, día y atardecer) y luna con su fase real (noche): el CSS muestra uno u otro según `html[data-cielo]`.
  // El halo es un degradado radial (luz que se difumina), no un disco.
  const halo = `<circle class="halo" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs * 3.4)}" fill="url(#m-halo)"/>`;
  s += `<g class="sol">${halo}<circle class="astro sol-disco" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs * 0.9)}" fill="url(#m-sol)"/></g>`; // el sol, algo menor que la luna: con su halo se lee como luz, no como un disco
  s += `<g class="luna">${halo}${luna(c.sol[0], c.sol[1], c.rs, window.libroCielo?.faseLunar() ?? 0.5)}${monedaB(c.sol[0], c.sol[1], c.rs)}</g>`;
  // El torogoz cruza al amanecer por el cielo libre entre el saldo y la cumbre.
  s += (aurora ? auroraBoreal(W, H, techo) : '') + nubes(H) + torogoz(Math.min(Math.max(techo + 44, H * 0.2), c.sy - 20), W >= 1100 ? 1.45 : W >= 700 ? 1.3 : 1.2) + '<!--v-cielo--></g>';
  // Velo cálido del cielo para las celebraciones: va antes de las montañas, así solo tiñe el cielo.
  s += `<rect class="alba" id="m-alba" x="0" y="0" width="${W}" height="${H}"/>`;
  const sierra = (base, amp, paso, clase) => {
    let d = `M0 ${H}`;
    const cresta = [];
    for (let x = 0; x <= W + paso; x += paso) { const y = base * H - (Math.sin(x / (W / 3.3) + base * 9) * 0.5 + rnd() * 0.6) * amp * H; cresta.push([x, y]); d += `L${f1(x)} ${f1(y)}`; }
    s += `<path class="${clase}" d="${d}L${W} ${H}Z" fill="url(#m-${clase})"/>`;
    return cresta;
  };
  s += '<g class="par par-lejos">';
  // La sierra lejana es la cadena volcánica de Occidente (puntos fijos). Se consumen igual los números de `rnd()` que gastaba
  // la sierra genérica de antes: así la montaña principal, que viene después, conserva su forma.
  for (let x = 0, paso = Math.max(24, W / 18); x <= W + paso; x += paso) rnd();
  s += relampago(sitioRayo(W, H, (c.sy / H + 0.2) * H + H * 0.02)); // (22B) la tormenta lejana: detrás de los volcanes
  s += volcanes(W, H, (c.sy / H + 0.2) * H + H * 0.02, lado);
  s += clima(W, H, yH); // la llovizna de la tarde (época lluviosa) y el aire dorado (seca): delante de los volcanes, detrás de la montaña
  s += '</g><g class="par par-medio">';
  const crestaMedia = sierra(c.sy / H + 0.32, 0.09, Math.max(30, W / 14), 'medio');
  // (Campamento 22) Las luces del valle van en la sierra media (se mueven con ella); el cantón, en su loma, detrás de la falda de la
  // montaña. Se ponen al final (necesitan la silueta, que se calcula después para no cambiar el orden de `rnd()`).
  s += '<!--v-luces--></g>' + niebla(W, H, c.sy / H + 0.3) + '<!--v-fondo-->';

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
  // La cumbre no es una aguja: el sendero llega a un rellano (la meta) y, a su derecha, el cuerno nevado sube un poco más.
  // Así la bandera de la meta queda por debajo de la cima, dentro de la silueta, y no sobresale contra el cielo.
  // Los campamentos y el detalle de la cumbre crecen con la escena, y encogen si la montaña es baja (teléfono pequeño o acostado).
  const ec = Math.min(W >= 1100 ? 1.6 : W >= 700 ? 1.25 : 1.1, Math.max(0.74, (piso - c.sy) / 240)), ecC = ec;
  // El cuerno es la cima: sube en dos tramos desde el rellano (el escalón de la meta, que es parte de la silueta), tiene su pico
  // y baja por la cara derecha en pendiente. Su filo oeste es casi a plomo (ahí la nieve no se sostiene y asoma la roca: ver
  // `cumbre`). Todo son puntos fijos que crecen con la escena (sin `rnd()`).
  const CUERNO = [[-15, 5], [-10.5, 2.6], [-7.5, 1.5], [-7, -9], [-5, -19], [0, -26], [8, -30], [17, -39], [28, -20], [38, -4], [46, 7]];
  const enC = ([x, y]) => [c.sx + x * ecC, c.sy + y * ecC];
  const cuerno = CUERNO.map(enC);
  const N_CARA = 5; // desde este punto del cuerno hacia la derecha, la cara que mira al astro
  const picoC = cuerno[7];
  const cimaPts = [...izq.slice(0, 10), ...cuerno, ...der.filter((p) => p[0] > c.sx + 48 * ecC)];
  const contorno = cimaPts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
  const silueta = `${contorno}L${f1(derX + W)} ${H}L${f1(izqX - W)} ${H}Z`;
  // La arista central baja quebrada (roca), no en línea recta: así la cara iluminada no parece una cascada.
  const alto = piso - c.sy;
  const quiebre = [[0.012, 0.07], [0.034, 0.13], [0.018, 0.2], [0.046, 0.29], [0.03, 0.38], [0.06, 0.52], [0.05, 0.7], [0.075, 1]]
    .map(([dx, dy]) => [c.sx + W * dx, c.sy + alto * dy]);
  const arista = quiebre.map((p) => `L${f1(p[0])} ${f1(p[1])}`);
  const cara = `M${f1(c.sx)} ${f1(c.sy)}${cuerno.slice(N_CARA).map((p) => `L${f1(p[0])} ${f1(p[1])}`).join('')}${der.filter((p) => p[0] > c.sx + 48 * ecC).map((p) => `L${f1(p[0])} ${f1(p[1])}`).join('')}L${f1(derX + W)} ${H}${[...arista].reverse().join('')}Z`;
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
  s += relieve({ sx: c.sx, sy: c.sy, alto, izq, der, quiebre, W, H });
  s += `<path class="arista" d="M${f1(cuerno[6][0])} ${f1(cuerno[6][1])}${[...cuerno.slice(7), ...der.filter((p) => p[0] > c.sx + 48 * ecC).slice(0, 4)].map((p) => `L${f1(p[0])} ${f1(p[1])}`).join('')}"/>`;
  // (Campamento 22) Sobre la ladera, detrás de la nieve, del sendero y de los campamentos: la quebrada y el grabado de luna llena
  // (se ponen con los campamentos ya colocados, para esquivarlos).
  s += '<g id="m-v-ladera" clip-path="url(#m-silueta)"></g>';
  // Nieve: una franja irregular mucho más ancha que el pico, recortada por la silueta, para que
  // nunca sobresalga de las laderas.
  // Su profundidad sigue a tu altitud (`colocar` la actualiza), así que la cumbre se va cubriendo a medida que subes.
  const nieveMedidas = { sx: c.sx, sy: c.sy, ancho: Math.max(W * 0.12, 140), nv: H * 0.075 };
  const dNieve = trazoNieve(nieveMedidas, altitud(inicio, esc));
  // La nieve con luz y sombra: el lado de la arista que mira al astro brilla un poco más y el otro queda en sombra (nieve fría y
  // opaca). La cumbre (su cara en sombra, la roca del filo y el rellano) va en `cumbre`.
  s += `<defs><clipPath id="m-der"><path d="${cara}"/></clipPath></defs>`
    + `<path class="nieve" clip-path="url(#m-silueta)" d="${dNieve}"/><g clip-path="url(#m-silueta)"><path class="nieve-sombra" clip-path="url(#m-izq)" d="${dNieve}"/><path class="nieve-luz" clip-path="url(#m-der)" d="${dNieve}"/></g>`;


  const [bx, by] = c.base;
  // Sendero en zigzag: siempre sube, así que la altura recorrida es monótona.
  const pts = [[bx, by]];
  for (let i = 1; i <= c.vueltas; i++) {
    const f = i / c.vueltas;
    const y = by - (by - c.sy - 6) * f;
    const a = (1 - f) * W * c.ancho + 4;
    const x = i === c.vueltas ? c.sx : i % 2 ? c.sx - a * 0.2 + W * 0.03 : c.sx - a * 1.2;
    pts.push([x, y]);
  }
  // (Campamento 22C) El llano del valle, donde vive el pueblo, y en su borde (al pie de la montaña) el bosque de tus compras: el
  // pueblo y el lago van delante; el sendero, por encima de los pinos.
  const geoLlano = { W, H, forma: formaValle(W, H), by, bx };
  const borde = bordeLlano(geoLlano);
  s += llano(geoLlano);
  s += bosque(W, H, bx, compras, plantar, pts, borde, techo);
  s += '<!--v-campos-->'; // los campos del llano y la milpa (se ponen con el pueblo, que dice hasta dónde llegan)
  s += lago(c, W, H, ventas, escalaValle(W, H));
  s += luciernagas({ W, H, yH: c.sy }); // ambiente: luciérnagas en el valle al anochecer (campamento 15B) // 15B
  // Los pinos de adorno de antes ya no se dibujan (el primer plano los reemplaza), pero sus números de `rnd()` se siguen gastando en el
  // mismo orden: así la forma de lo que viene después no cambia. Sus x sirven de sitios para las matas del primer plano.
  const sitiosPP = [];
  for (let fila = 0; fila < 2; fila++) {
    const alto = H * (fila ? 0.07 : 0.05);
    for (let x = -10; x < W + 20; x += alto * (0.55 + rnd() * 0.4)) { rnd(); sitiosPP.push(x); }
  }
  // El pie de la escena se funde con el fondo de la página (sin el corte seco de antes); con el pueblo delante, solo el último borde.
  if (!c.valle) s += `<rect class="suelo suelo-a" x="0" y="${f1(H * 0.95)}" width="${W}" height="${f1(H * 0.05 + 1)}" fill="url(#m-suelo)"/>`;
  // (Campamento 22) El valle vivo: dónde va cada cosa (su propia versión en el teléfono). El camino real y el árbol del primer día van
  // al pie, por delante de la falda y por detrás del sendero; el cantón, su milpa, las piscuchas y las luces, detrás de la montaña.
  const lg = geoLago(c, W, H);
  const valle = sitiosValle({ W, H, techo, izq, der: [[c.sx, c.sy], ...der], cresta: crestaMedia, bx, by, pts, lago: lg, personas, meses: lucesDelValle(meses), anios, primera, astro: c.sol, volcanes: (c.sy / H + 0.2) * H + H * 0.02 - alturaVolcanes(W, H) });
  host.style.setProperty('--v-peri-d', `${f1(valle.aves.dist)}px`); // (22B) cuánto vuelan los pericos
  const solV = c.sol[0] >= c.sx ? 1 : -1;
  const arbolV = valle.arbol ? { ...valle.arbol, ...arbolDelPrimerDia(anios), sol: solV } : null;
  // (Campamento 22C) El pueblo al pie, donde arranca el sendero: la iglesia con su plaza, las casas, la gente; el camino real llega de
  // la plaza a la salida.
  const pb = sitiosPueblo({ W, H, forma: valle.forma, by, bx, pts, lago: lg, techo, sol: solV });
  if (pb.plaza) { const pzx = pb.plaza.x + 12 * pb.u; valle.camino = { ...valle.camino, ini: [pzx, pb.yg + 1.5 * pb.u], ctrl: [(pzx + bx) / 2, Math.max(by, pb.yg - 4 * pb.u)], ancho: [5 * pb.u, 3 * pb.u] }; }
  const huecosPP = [[pb.caja[0], pb.caja[2]], [lg.cx - lg.rx, lg.cx + lg.rx]];
  // Los campos del llano, entre el bosque y el pueblo; la milpa es la parcela de delante más ancha (los zompopos salen de ella).
  const ladoV = valle.forma === 'esc' || valle.forma === 'acostado';
  const cm = camposLlano({ borde, yAbajo: ladoV ? Math.min(H - 4, pb.yg + 2 * pb.u) : pb.yg - 1.5 * pb.u, x0: -6, x1: ladoV ? bx + 10 : W + 6, k: Math.max(1, pb.u * 0.55), vx: c.sx });
  const milpaV = cm.milpa ? { ...cm.milpa, k: Math.max(1, pb.u * 0.5), sol: solV } : null;
  s = s.replace('<!--v-campos-->', `<g class="v-campos" aria-hidden="true">${cm.svg}${milpaV ? milpa(milpaV) + zompopos({ milpa: milpaV, k: milpaV.k }) : ''}</g>`);
  // (22C) Las piscuchas vuelan a la izquierda de la montaña y su hilo baja a los niños de la plaza: van delante, con el pueblo.
  const kp = Math.max(1, pb.u * 0.5);
  const pisV = valle.piscuchas.slice(0, piscuchasDelValle(personas)).map((q, i) => ({ ...q, k: kp, hilo: pb.ninos[i % Math.max(1, pb.ninos.length)] ? [pb.ninos[i % pb.ninos.length][0], pb.ninos[i % pb.ninos.length][1] - 2.6 * pb.u] : q.hilo }));
  s += `<g id="m-v-pie">${caminoReal(valle.camino)}${pueblo(pb, { ventanas: personas })}${piscuchas(pisV)}${arbolV ? arbolPrimerDia(arbolV) : ''}${primerPlano({ W, H, sitios: sitiosPP, huecos: huecosPP, k: Math.max(1, pb.u * 0.62), forma: valle.forma })}</g>`;
  const { ini: cIni, fin: cFin } = valle.camino; // las cajas [x0, y0, x1, y1] del camino y del árbol: los árboles de honor y el papel picado las esquivan
  const cajasValle = [[Math.min(cIni[0], cFin[0]), Math.min(cIni[1], cFin[1]) - 8, Math.max(cIni[0], cFin[0]), Math.max(cIni[1], cFin[1]) + 4]];
  if (arbolV) cajasValle.push([arbolV.x - arbolV.ra, arbolV.y - arbolV.ra * 1.3, arbolV.x + arbolV.ra, arbolV.y + 4]);
  // (Campamento 22B) El mar de niebla del amanecer: una capa detrás de la loma y otra delante de su falda (todo detrás de la montaña).
  const mar = marDeNiebla({ W, H, canton: valle.canton, milpa: valle.milpa, k: valle.k, cresta: crestaMedia, techo });
  s = s.replace('<!--v-cielo-->', bandadas(valle.aves)).replace('<!--v-vacas-->', potrero({ vacas: valle.vacas, k: valle.k })).replace('<!--v-luces-->', lucesValle(valle.luces, valle.k, 0)).replace('<!--v-fondo-->', `<g id="m-v-fondo">${mar.atras}${canton({ ...valle.canton, sol: solV, ventanas: personas, H })}${lucesValle(valle.luces, valle.k, 1)}${mar.frente}</g>`);
  // El mismo trazo, entero (para medir la altitud y el tramo recorrido) y por tramos de zigzag (para la tierra del camino,
  // que se estrecha con la altura: más ancho abajo, más fino arriba, como visto en perspectiva).
  let d = `M${f1(bx)} ${f1(by)}`;
  const piezas = [];
  const tramos = []; // los mismos tramos (recta o curva cuadrática) con sus números ya redondeados, para medir el trazo sin el navegador
  const r1 = (n) => Number(f1(n));
  let desde = [bx, by];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1];
    if (i === pts.length - 1) { d += `L${f1(x)} ${f1(y)}`; tramos.push([r1(x), r1(y)]); piezas.push(`M${f1(desde[0])} ${f1(desde[1])}L${f1(x)} ${f1(y)}`); break; }
    const [nx, ny] = pts[i + 1], k = 0.22;
    const ax = x + (px - x) * k, ay = y + (py - y) * k, sx2 = x + (nx - x) * k, sy2 = y + (ny - y) * k;
    tramos.push([r1(ax), r1(ay)], [r1(x), r1(y), r1(sx2), r1(sy2)]);
    d += `L${f1(ax)} ${f1(ay)}Q${f1(x)} ${f1(y)} ${f1(sx2)} ${f1(sy2)}`;
    piezas.push(`M${f1(desde[0])} ${f1(desde[1])}L${f1(ax)} ${f1(ay)}Q${f1(x)} ${f1(y)} ${f1(sx2)} ${f1(sy2)}`);
    desde = [sx2, sy2];
  }
  const anchoAbajo = Math.min(12, Math.max(7, W / 60)), anchoArriba = anchoAbajo * 0.42;
  const ancho = (i) => anchoAbajo + (anchoArriba - anchoAbajo) * (piezas.length > 1 ? i / (piezas.length - 1) : 0);
  const capa = (clase, extra, dx = 0, dy = 0) => `<g class="${clase}"${dx || dy ? ` transform="translate(${dx} ${dy})"` : ''}>${piezas.map((pz, i) => `<path d="${pz}" stroke-width="${f1(ancho(i) + extra)}"/>`).join('')}</g>`;
  // El camino está tallado en la ladera: por encima queda el corte de roca (en sombra) y por debajo el talud que lo sostiene (recibe
  // la luz). Después, borde, tierra y peldaños/piedras (se ponen al medir el trazo); encima, lo que falta (a trazos) y lo
  // recorrido (cálido, con su luz). Es paisaje: se ve con cualquier nivel de efectos.
  // Sobre la nieve el camino no es de tierra: la máscara la quita ahí y queda una huella hundida en la nieve (`.sendero-nieve`).
  s += '<g id="m-terrazas" clip-path="url(#m-silueta)"></g>';
  s += `<defs><mask id="m-tierra" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><path class="nieve-mascara" d="${dNieve}" fill="#000"/></mask>`
    + `<clipPath id="m-nieve-c"><path class="nieve-clip" d="${dNieve}"/></clipPath></defs>`
    + `<g mask="url(#m-tierra)">${capa('sendero-talud', 5, 0, 3.6)}${capa('sendero-corte', 4, 0, -3.2)}${capa('sendero-borde', 2.6)}${capa('sendero-tierra', 0)}<g class="sendero-detalle" id="m-piedras"></g></g>`
    + `<g clip-path="url(#m-silueta)"><g clip-path="url(#m-nieve-c)">${capa('sendero-nieve', 0)}</g></g>`;
  s += `<path class="sendero" id="m-sendero" d="${d}"/><path class="sendero-luz" id="m-luzhecha" d="${d}"/><path class="sendero-hecho" id="m-hecho" d="${d}"/><path class="estela" id="m-estela" d="${d}"/>`;
  if (aniv) s += `<circle class="salida-aniv" cx="${f1(bx)}" cy="${f1(by)}" r="26" fill="url(#m-luz)"/>`;
  s += `<circle class="salida" cx="${f1(bx)}" cy="${f1(by)}" r="5.5"/>`;
  // Farol por cumpleaños (campamento 15B): el día de un familiar, su inicial arde en un farol junto a la marca de salida. // 15B
  { const k = W >= 1100 ? 1.6 : W >= 700 ? 1.25 : 1.1, dir = (pts[1]?.[0] ?? bx) > bx ? -1 : 1, n = Math.min(3, cumples.length), paso = Math.min(21 * k, Math.max(15 * k, ((dir < 0 ? bx : W - bx) - 34 * k) / Math.max(1, n - 1))); cumples.slice(0, 3).forEach((p, i) => { s += farolCumple({ inicial: p.inicial, x: Math.max(10 * k, Math.min(W - 10 * k, bx + dir * (24 * k + paso * i))), y: by + 2 + (i % 2) * 4 * k, k }); }); } // 15B
  // (Campamento 22C) Navidad en la subida: luminarias a los dos lados del camino que se encienden hasta donde llegaste (las de más
  // arriba esperan apagadas) y, en «Tú», una corona de foquitos. Solo del 1 de diciembre al 6 de enero (el CSS las enseña).
  s += '<g class="v-navidad nav-sendero" id="m-nav-sendero"><path class="ns-off"/><path class="ns-glow"/><path class="ns-on ns-0"/><path class="ns-on ns-1"/><path class="ns-on ns-2"/></g>';
  s += `<g id="m-osos"></g><g id="m-etapas"></g><g id="m-campos"></g><g class="efecto-ambiente huellas" id="m-huellas"></g><g class="eco" id="m-eco"></g><g class="yo" id="m-yo"><circle class="efecto-ambiente linterna" r="38" fill="url(#m-luz)"/><circle class="yo-halo" r="15"/><circle class="v-navidad yo-nav yo-nav-0" r="12.8"/><circle class="v-navidad yo-nav yo-nav-1" r="12.8"/><circle class="v-navidad yo-nav yo-nav-2" r="12.8"/><circle class="yo-anillo" r="10"/><circle class="yo-punto" r="7"/></g><g id="m-etiquetas"></g><g class="fx" id="m-fx"></g>`;
  // Reloj de sol (16A): sobre los pinos de adorno, pero detrás de los árboles de honor (antes sus piedras quedaban encima de las copas).
  const suelo = W < 1100 ? by - 4 : H * 0.93;
  s += relojDeSol(c.sx, suelo, W); // 16A
  const bordeHonor = c.valle > 30 ? borde : null;
  const evitarHonor = bordeHonor ? cajasValle : [...cajasValle, pb.caja, [lg.cx - lg.rx, lg.cy - lg.ry * 4, lg.cx + lg.rx, lg.cy + lg.ry]];
  const honor = arbolesHonor(W, H, bx, compras, plantar, pts, c.sol[0], evitarHonor, bordeHonor);
  s += `<rect class="suelo" x="0" y="${f1(H * 0.965)}" width="${W}" height="${f1(H * 0.035 + 1)}" fill="url(#m-suelo)"/>`;
  s += honor.svg; // por delante del suelo que funde el pie de la escena: sus troncos se ven
  // De temporada (el CSS los muestra solo cuando toca): papel picado en las fiestas y cohetes la noche de fin de año.
  const anio = (window.libroCielo?.dia?.() ?? '').slice(0, 4) || String(new Date().getFullYear());
  const sitio = sitioPapel(W, H, by, pts, [...honor.cajas, ...cajasValle.map(([x0, y0, x1]) => [x0, x1, y0])]);
  const sitioPapelV = sitio ? [sitio[0] - 4, sitio[2] - 6, sitio[1] + 4, sitio[2] + 36 * sitio[3]] : null; // (el grabado de luna llena lo esquiva)
  if (sitio) s += papelPicado(sitio[0], sitio[1], sitio[2], anio, sitio[3], sitio[4]); // (acostado y sin sitio libre: mejor sin tira que encima de algo)
  const altoCohete = Math.max(60, suelo - Math.max(techo + 60, c.sy + 30));
  host.style.setProperty('--cohete-alto', `${f1(altoCohete)}px`); // hasta dónde suben los silbadores
  s += cohetes(W, suelo, W >= 1100 ? 1.6 : 1.25, altoCohete);
  host.innerHTML = s + '</g></svg>';
  if (!document.documentElement.dataset.sin?.includes('capas')) enCapas(host, W, H); // (rendimiento iPhone) el cielo y las dos sierras del parallax, cada una en su <svg>: ver `enCapas` (`/medir?sin=capas`: como antes, para comparar)
  colocarReloj(host);
  host.style.setProperty('--luna-ilum', f1(iluminacionLunar(window.libroCielo?.faseLunar() ?? 0.5)));

  const camino = host.querySelector('#m-sendero');
  const L = camino.getTotalLength();
  // Rendimiento: `getPointAtLength` del navegador recorre el trazo en cada llamada y aquí se le llamaba más de dos mil veces por
  // dibujo (era, con diferencia, lo más caro de abrir la app en un teléfono). El trazo son rectas y curvas que ya conocemos: se
  // aplana una vez en una tabla y esta función la reemplaza en este elemento (todo lo demás sigue llamando a `camino.getPointAtLength`).
  camino.getPointAtLength = medidor([r1(bx), r1(by)], tramos, L);
  const enAltura = (alt) => {
    const yObj = by - (by - c.sy - 6) * alt;
    let lo = 0, hi = L;
    for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (camino.getPointAtLength(m).y > yObj) lo = m; else hi = m; }
    return lo;
  };
  detalleSendero(host.querySelector('#m-piedras'), camino, L, by, c.sy, anchoAbajo, anchoArriba);
  // Las luminarias de Navidad: una cada 15 px, alternando de lado, fuera del camino (no se confunden con las marcas de etapa ni con lo
  // que falta), lejos de la salida y de la cumbre. Se guardan con su largo para encender las que ya subiste (`colocar`).
  const navFocos = [];
  for (let l = 16, i = 0; l < L - 26; l += 15, i++) {
    const p = camino.getPointAtLength(l), a = camino.getPointAtLength(Math.max(0, l - 3)), b = camino.getPointAtLength(Math.min(L, l + 3));
    const tx = b.x - a.x, ty = b.y - a.y, m = Math.hypot(tx, ty) || 1, lado = i % 2 ? 1 : -1, off = (anchoAbajo + (anchoArriba - anchoAbajo) * (l / L)) / 2 + 3.6;
    navFocos.push({ x: p.x - (ty / m) * off * lado, y: p.y + (tx / m) * off * lado, l, c: i % 3 });
  }
  // Cada campamento mira hacia el lado donde el sendero no pasa (la tienda nunca queda encima del camino): se compara por dónde
  // llega y por dónde sigue el trazo a unos pasos de la bandera.
  const campos = esc.campos.map((m) => {
    const l = enAltura(altitud(m, esc));
    const p = camino.getPointAtLength(l);
    // Del lado donde la tienda queda más lejos del camino (se mide contra el trazo de 70 px antes y después).
    const lejania = (lado) => {
      let min = Infinity;
      for (let d = -70; d <= 70; d += 7) {
        const q = camino.getPointAtLength(Math.min(L, Math.max(0, l + d)));
        for (const dx of [DH, DH + 12]) min = Math.min(min, Math.hypot(q.x - (p.x + dx * ec * lado), q.y - (p.y - 6)));
      }
      return min;
    };
    return { m, p, cima: m === esc.cima, lado: lejania(-1) > lejania(1) + 0.5 ? -1 : 1 };
  });
  host.querySelector('#m-terrazas').innerHTML = cumbre({ e: ec, sx: c.sx, sy: c.sy, izq, quiebre, pico: picoC, nieve: nieveMedidas }) + terrazas(campos, ec, c.sol[0] >= c.sx ? 1 : -1, [c.sx, c.sy]);
  // (Campamento 22) La quebrada y el grabado de luna llena esquivan el sendero y cada campamento con su rótulo (a su lado del sendero).
  const cajasCampos0 = [];
  if (sitioPapelV) cajasCampos0.push(sitioPapelV);
  const cajasCampos = cajasCampos0.concat(campos.map(({ p, lado, cima }) => { const l = cima ? 1 : lado, x1 = p.x + l * (DH + 72) * ec; return [Math.min(p.x, x1) - 6, p.y - 38 * ec, Math.max(p.x, x1) + 6, p.y + 10]; }));
  const ladera = sitiosLadera({ W, H, sx: c.sx, sy: c.sy, izq, der, nv: nieveMedidas.nv, pts, lago: lg, cajas: cajasCampos, grabado: tocable && Boolean(iniciales) && Boolean(primera), k: valle.k });
  // (22C) La ladera baja: claros, bosquecillos y peñas, lejos del sendero y de los campamentos (detrás de la quebrada).
  const baja = laderaBaja({ W, sy: c.sy, by, L: [...izq].sort((a, b) => a[1] - b[1]), R: [[c.sx, c.sy], ...der].sort((a, b) => a[1] - b[1]), pts, cajas: cajasCampos, k: ec, sol: solV });
  host.querySelector('#m-v-ladera').innerHTML = baja + (ladera.quebrada ? quebrada(ladera.quebrada) : '') + (ladera.roca ? grabadoLuna({ ...ladera.roca, iniciales: inicialesGrabadas(iniciales), fecha: fechaGrabada(primera) }) : '');
  host.querySelector('#m-campos').innerHTML = campos.map(({ m, p, cima, lado }) => campamento(m, p, cima, cima ? 3 : esc.campos.indexOf(m), cima ? 1 : lado, ec, c.sol[0] >= c.sx ? 1 : -1)).join('');
  // Las etapas intermedias (250k, 500k…) que no son campamento van como una marca atravesada en el sendero: así se ve el avance entre
  // un campamento y el siguiente. Solo en la app (la entrada no enseña tus datos).
  // (Campamento 21) Con las etapas más juntas, solo las que caben: `lib.marcasDeEtapa` (la siguiente siempre; sin marcas pegadas
  // entre sí ni a un campamento; tope por tamaño). Las intermedias van más finas (`.menor`).
  // (Campamento 23) La película del ascenso también las dibuja (se encienden al pasarlas), aunque su escena no se toca.
  const etapas = !tocable && !pelicula ? [] : marcasDeEtapa(etapasHasta(esc.cima).filter((m) => m < esc.cima && m > esc.base && !esc.campos.includes(m)).map((m) => {
    const alt = altitud(m, esc), l = enAltura(alt), p = camino.getPointAtLength(l);
    const a = camino.getPointAtLength(Math.max(0, l - 4)), b = camino.getPointAtLength(Math.min(L, l + 4));
    return { m, p, ang: Math.atan2(b.y - a.y, b.x - a.x), mitad: (anchoAbajo * (1 - 0.58 * alt)) / 2 + 4 };
  }), { sats, campos, tope: W < 700 ? 12 : 20 });
  // (Montaña asentada) Las principales cruzan el camino y asoman a los lados; las intermedias son una muesca del ancho del camino.
  host.querySelector('#m-etapas').innerHTML = etapas.map(({ m, p, ang, mitad }) => {
    const largo = rangoEtapa(m) === 'intermedia' ? mitad - 3.2 : mitad;
    const dx = -Math.sin(ang) * largo, dy = Math.cos(ang) * largo;
    const l = `x1="${f1(p.x - dx)}" y1="${f1(p.y - dy)}" x2="${f1(p.x + dx)}" y2="${f1(p.y + dy)}"`;
    return `<g class="etapa${rangoEtapa(m) === 'intermedia' ? ' menor' : ''}" data-m="${m}"><line class="etapa-sombra" ${l}/><line class="etapa-tick" ${l}/></g>`;
  }).join('');
  // Tu eco (idea 31): un «Tú» translúcido y quieto donde estabas hace un año. Solo si de ahí hasta hoy hay camino que se vea.
  let ecoP = null, ecoTramo = null;
  if (eco && eco.sats > 0 && eco.sats < sats) {
    const le = enAltura(altitud(eco.sats, esc)), ly = enAltura(altitud(sats, esc));
    if (ly - le > 16) { ecoP = camino.getPointAtLength(le); ecoTramo = [le, ly - le]; }
  }
  // Saldo en cero (idea 50): el camino que ya recorriste queda dibujado, tenue, aunque hoy estés en el campamento base.
  const memoriaL = sats <= 0 && memoria > 0 ? enAltura(altitud(memoria, esc)) : 0;
  if (memoriaL > 4) host.querySelector('#m-eco').innerHTML = `<path class="sendero-memoria" d="${camino.getAttribute('d')}" stroke-dasharray="${f1(memoriaL)} ${f1(L)}"/>`;
  // El eco deja una estela de luz por el tramo que subiste en este año (de su sitio al tuyo).
  if (ecoP) host.querySelector('#m-eco').innerHTML = `<path class="eco-estela" d="${camino.getAttribute('d')}" stroke-dasharray="0 ${f1(ecoTramo[0])} ${f1(ecoTramo[1])} ${f1(L)}"/><g transform="translate(${f1(ecoP.x)} ${f1(ecoP.y)})"><g class="eco-fantasma"><circle class="eco-halo" r="15"/><circle class="eco-sombra" r="7.5"/><circle class="eco-anillo" r="10"/><circle class="eco-punto" r="4.2"/></g></g>`;
  instalarMoneda(host);
  estado = { host, W, H, L, camino, enAltura, esc, campos, etapas, sats, meta, c, nieveMedidas, fechas, compras, caja: null, navFocos: navFocos.filter((f) => !campos.some(({ p }) => Math.hypot(p.x - f.x, p.y - f.y) < 13 * ec) && !etapas.some(({ p }) => Math.hypot(p.x - f.x, p.y - f.y) < 9)), navN: -1, navTodas: !tocable, mensajes, puedeEscribir, firmas, techo, ec, libro, rotulo, pelicula, eco: ecoP ? { p: ecoP, sats: eco.sats } : null, valle: tocable ? { luces: lucesDelValle(meses), arbol: arbolV ? { fecha: primera, etapa: arbolV.etapa } : null } : null, osos: null };
  if (tocable) { banderas(host, campos, W, H); instalarCierre(); }
  // (Campamento 25) Los osos polares de peluche de la familia, en la nieve al sol bajo la cumbre (los tres, la pareja o uno: lo que quepa).
  // Se sientan esquivando los rótulos de «Tú» donde quedará al final de la subida (por eso se pone a «Tú» un momento ahí) y en la nieve
  // que hay al empezar una subida desde un saldo (al guardar una compra: la nieve solo crece al subir, así que no se mueven ni
  // desaparecen mientras «Tú» sube). Al abrir la app («Tú» sube desde la salida) y en la película, en la nieve de hoy: si al empezar
  // no los cubre, esperan escondidos y llegan con ella (`colocar`). Si un rótulo les cae encima, ceden: se esconden (`ocultarOsos`).
  // Ese momento en el estado final no se ve, pero lo medido fija estilos: sin transiciones hasta volver a `inicio` (si no, las marcas de
  // etapa y los faroles se apagarían con su fundido al abrir la app o al empezar una subida). El CSS las quita con `data-colocando`.
  host.dataset.colocando = '';
  try {
    colocar(sats, false);
    estado.osos = colocarOsos({ host, W, H, c, ec, esc, inicio: pelicula || inicio <= 0 ? sats : Math.min(inicio, sats), campos, nieveMedidas, camino, L, silueta: [...cimaPts, [derX + W, H], [izqX - W, H]], cara: [[c.sx, c.sy], ...cuerno.slice(N_CARA), ...der.filter((p) => p[0] > c.sx + 48 * ecC), [derX + W, H], ...[...quiebre].reverse()], aurora, cumple: cumples.length > 0 });
    if (inicio !== sats) colocar(inicio, false);
    host.getBoundingClientRect(); // (el estado de `inicio`, ya calculado sin transiciones)
  } finally { delete host.dataset.colocando; }
  describir(sats, etapa);
}

/**
 * (Campamento 25) Pone los osos de peluche en `#m-osos` (en el frente) si caben y devuelve { cajas, n, zona, nieve } (`nieve`: la
 * altitud desde la que la nieve dibujada los cubre; 0 si se sentaron en la de siempre o en la roca), o null. La regla es pura
 * (`arte-osos.js: sitioOsos`); aquí se le dan el sendero (cada 3 px), la meta (mojón y bandera, con 8 px de aire) y las cajas de lo que
 * se lee encima de la escena (el saldo, la cabecera, la tarjeta de la entrada, los textos de la película).
 */
function colocarOsos({ host, W, H, c, ec, esc, inicio, campos, nieveMedidas, camino, L, silueta, cara, aurora, cumple }) {
  const cima = campos.find((x) => x.cima), g = host.querySelector('#m-osos');
  if (!cima || !g) return null;
  const sendero = [];
  for (let l = 0; l <= L; l += 3) { const q = camino.getPointAtLength(l); sendero.push([q.x, q.y]); }
  const { x, y } = cima.p;
  const meta = [x - 7.5 * ec - 8, y - 24.6 * ec - 8, x + 15 * ec + 8, y + 1.5 * ec + 8];
  const hr = host.getBoundingClientRect(), cont = host.closest('.escena, .pe-escena') ?? host.parentElement;
  const textos = [...cont.querySelectorAll(':scope > .cima, :scope > .saldo, :scope > .pe-cab, :scope > .pe-cap'), ...document.querySelectorAll('.login-caja')]
    .map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height)
    .map((r) => [r.left - hr.left - 6, r.top - hr.top - 6, r.right - hr.left + 6, r.bottom - hr.top + 6]);
  // Los rótulos que ya están puestos (y «Tú»): los osos los esquivan, con 3 px de aire. El ancho de un rótulo es el que le da `etiquetar`
  // (8.2 px por letra, y algo más), no el medido: si la letra todavía no llegó, el texto mide menos y luego crecería sobre los osos.
  for (const t of host.querySelectorAll('#m-etiquetas > text, #m-etiquetas > rect, #m-yo .yo-anillo')) {
    const q = t.getBBox();
    if (!q.width) continue;
    let [a, b] = [q.x, q.x + q.width];
    if (t.tagName === 'text') { const w = Math.max(q.width, t.textContent.length * 8.6 + 8), x = Number(t.getAttribute('x')), an = t.getAttribute('text-anchor'); [a, b] = an === 'end' ? [x - w, x] : an === 'middle' ? [x - w / 2, x + w / 2] : [x, x + w]; }
    const [dx, dy] = t.closest('#m-yo') ? host.querySelector('#m-yo').getAttribute('transform').match(/-?[\d.]+/g).map(Number) : [0, 0]; // «Tú» va trasladado
    textos.push([a + dx - 3, q.y + dy - 3, b + dx + 3, q.y + q.height + dy + 3]);
  }
  // El gorrito ocupa algo más (la cabeza que mira a la aurora va dentro de la de siempre): si con él caben menos osos, se quedan sin
  // él. Antes los osos que el adorno: un cumpleaños no se lleva a dos de la cumbre.
  const geo = { W, H, sx: c.sx, sy: c.sy, ec, silueta, cara, nieveMin: puntosNieve(nieveMedidas, 0), nieveHoy: puntosNieve(nieveMedidas, altitud(inicio, esc)), sendero, meta, textos, aurora };
  let sitio = sitioOsos({ ...geo, cumple });
  if (cumple && (sitio?.lista.length ?? 0) < OSOS.length) {
    const sin = sitioOsos({ ...geo, cumple: false });
    if (sin && sin.lista.length > (sitio?.lista.length ?? 0)) { sitio = sin; cumple = false; }
  }
  if (!sitio) return null;
  g.setAttribute('class', `osos${aurora ? ' con-aurora' : ''}`);
  g.setAttribute('aria-hidden', 'true');
  g.dataset.zona = sitio.zona; // dónde se sentaron: «nieve» (la de siempre), «nieveHoy» o «cumbre» (lo leen las pruebas)
  g.innerHTML = osos(sitio.lista, { k: ec * 1.1, aurora, cumple });
  // Si se sentaron en la nieve de hoy (no en la que hay siempre), ¿desde qué altitud los cubre? Más abajo (al empezar la película, o
  // al principio de una subida que les trae la nieve) quedarían sobre la roca: esperan escondidos hasta que la nieve llega (`colocar`).
  let nieve = 0;
  if (sitio.zona === 'nieveHoy') {
    const pies = piesOsos(sitio.lista, ec * 1.1), cubre = (a) => { const pol = puntosNieve(nieveMedidas, a); return pies.every(([px, py]) => dentroDe(pol, px, py)); };
    let a = 0, b = altitud(inicio, esc);
    for (let i = 0; i < 18; i++) { const m = (a + b) / 2; if (cubre(m)) b = m; else a = m; }
    nieve = b;
  }
  return { cajas: sitio.cajas, n: sitio.lista.length, zona: sitio.zona, nieve };
}

/**
 * Un campamento es UN símbolo junto al sendero: un hito de piedra con su farol («estaciones de luz»). Está tallado en el mismo lenguaje
 * que la montaña: cada piedra enseña dos caras (la que mira al astro y la que queda en sombra) y el plano de arriba, sin contornos de
 * dibujo. Se apoya en un apartadero de tierra que sale del propio sendero (así no flota en la ladera) y su luz cae en el suelo.
 * Alcanzado: el farol encendido, con su halo, su luz bajando por la piedra y sobre el suelo. Siguiente: la brasa dentro del farol
 * (y la llama viva, ambiente) con medio halo. Pendiente: la piedra apagada, tenue. `lado` = −1 lo pone al otro lado del sendero;
 * `sol` (±1) dice de qué lado llega la luz, para que la cara iluminada sea siempre la que mira al astro.
 * La cumbre es el rellano resguardado por el cuerno: un mojón pequeño con la banderita de la meta y, a su pie, el mismo farol.
 */
function campamento(m, p, cima, i, lado, ec = 1, sol = 1) {
  const luz = (cima ? 1 : lado) * sol < 0 ? ' transform="scale(-1 1)"' : ''; // dentro del grupo (quizá reflejado), ¿la luz llega por la izquierda?
  // El farol es un hueco en la propia piedra: la cámara de luz (una cara más viva que la otra) entre el fuste y la losa que lo
  // cubre. El halo y su respiración son degradados radiales (sin aros ni filtros); la llama solo vive en el siguiente campamento.
  const farol = (y, a = 2.9, xe = -0.7, h = 3.4, r = 21) => `<g class="farol" transform="translate(0 ${y})"><circle class="farol-halo" cy="${f1(-h / 2)}" r="${r}" fill="url(#m-farol)"/><circle class="efecto-ambiente humo" cy="${f1(-h / 2)}" r="${f1(r * 0.62)}" fill="url(#m-farol)"/>`
    + `<g${luz}><path class="farol-lado" d="M${-a} 0H${xe}V${-h}H${-a}Z"/><path class="farol-cuerpo" d="M${xe} 0H${a}V${-h}H${xe}Z"/></g>`
    + `<path class="efecto-ambiente fogata llama" d="M0.6 -0.3C-0.6 -1.2 -0.2 -2.2 0.6 ${f1(-h + 0.2)}C1.4 -2.2 1.8 -1.2 0.6 -0.3Z"/></g>`;
  let dentro;
  if (cima) {
    // La meta vive en el rellano tallado bajo el collado de la cumbre (ver `terrazas`): un mojón con su farol y una banderita cálida
    // y corta. Detrás tiene la nieve en sombra del cuerno y la antecima: nada asoma contra el cielo.
    const yv = RELLANO_CIMA - 6 / ec, y = (d = 0) => f1(d); // el suelo del rellano (el sendero acaba 6 px bajo la cumbre); dentro, `y(d)` es una altura sobre él
    dentro = `<g transform="translate(0 ${f1(yv)}) scale(${K_CIMA})"><ellipse class="cima-brasa" cx="-1" cy="0.2" rx="13" ry="4" fill="url(#m-farol)"/>`
      + `<g${luz}>${piedra(bloque(0, -2.8, 5, 4.3, -0.9), bloque(-5.6, -7.4, 3.9, 2.7, -0.7))}</g>${farol(-2.8, 2.7, -0.7, 2.8, 14)}${corona(-0.2, -1.2, 1.7)}`
      + `<line class="cima-mastil" x1="0.2" x2="0.2" y1="${y(-7.6)}" y2="${y(-17.5)}"/><g transform="translate(0 1.5)">`
      + `<g class="banderin cima-banderin"><path d="M0.2 ${y(-19)}C4 ${y(-20.2)} 7.2 ${y(-17.2)} 11.6 ${y(-17.9)}L9.7 ${y(-15)}L11.4 ${y(-12.3)}C7.2 ${y(-11.6)} 4 ${y(-14)} 0.2 ${y(-13.2)}Z"/>`
      + `<path class="banderin-pliegue" d="M0.2 ${y(-15.7)}C4 ${y(-16.7)} 7 ${y(-14.2)} 9.7 ${y(-15)}L11.4 ${y(-12.3)}C7.2 ${y(-11.6)} 4 ${y(-14)} 0.2 ${y(-13.2)}Z"/></g></g></g>`;
  } else {
    const ico = icono(i);
    dentro = `<g transform="translate(${DH} 0)"><ellipse class="luz-suelo" cx="-1" cy="0.6" rx="19" ry="4.6" fill="url(#m-farol)"/><g transform="scale(${K_HITO})">`
      + `<g${luz}>${ico.d}<path class="hito-bano" d="M${ico.xe} ${ico.farol}H${ico.b}L${f1(ico.b + 0.8)} ${f1(ico.farol + 8)}H${ico.xe}Z" fill="url(#m-bano)"/></g>${farol(ico.farol, ico.b - 0.5, ico.xe, 3.4, 18)}${corona(0.4, ico.farol + 3.6, 2.3)}</g></g>`;
  }
  const brillo = cima ? `<ellipse class="brillo-cima" cx="2" cy="${f1(RELLANO_CIMA - 6 / ec - 12)}" rx="24" ry="15" fill="url(#m-luz)"/>` : '';
  return `<g class="campo${cima ? ' es-cima' : ''}" data-m="${m}" transform="translate(${f1(p.x)} ${f1(p.y)})${ec !== 1 ? ` scale(${ec})` : ''}">${brillo}${lado < 0 ? `<g transform="scale(-1 1)">${dentro}</g>` : dentro}</g>`;
}

/**
 * (22C) La corona de Navidad de un hito: un aro de ramas verdes con tres esferas y un lazo rojo, colgada bajo el farol. Solo del 1 de
 * diciembre al 6 de enero (el CSS la enseña). En unidades del hito.
 */
function corona(x, y, r) {
  const bolas = [-2.4, -0.6, 0.9].map((a) => `M${f1(x + Math.cos(a) * r - 0.55)} ${f1(y + Math.sin(a) * r)}a0.55 0.55 0 1 0 1.1 0a0.55 0.55 0 1 0 -1.1 0Z`).join('');
  return `<g class="v-navidad nav-hito"><circle class="nh-corona" cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}"/><path class="nh-bola" d="${bolas}"/>`
    + `<path class="nh-lazo" d="M${f1(x)} ${f1(y + r)}l-1.3 -0.8l0.2 1.6ZM${f1(x)} ${f1(y + r)}l1.3 -0.8l-0.2 1.6ZM${f1(x - 0.3)} ${f1(y + r)}l-0.5 1.9h0.5l0.3 -1.9ZM${f1(x + 0.3)} ${f1(y + r)}l0.5 1.9h-0.5l-0.3 -1.9Z"/></g>`;
}
/** A cuántas unidades del sendero se planta el hito de un campamento (hacia el lado libre) y a qué altura, bajo la cumbre, queda su rellano. */
const DH = 15, RELLANO_CIMA = 4.2, K_HITO = 1.2, K_CIMA = 1.25; // (K_HITO: cuánto se agranda el hito sobre su rellano)

/**
 * La cumbre (montaña asentada, tercera ronda): UN pico nevado. Todo en unidades de la cumbre (×`e`) desde el final del sendero.
 * - El rellano de la meta es un escalón de la propia silueta (`CUERNO`): su suelo de nieve (`RELLANO_PLANO`, en `terrazas`) nace en
 *   el filo oeste y se pierde, sin punta, en la cara del cuerno; debajo, su canto de roca (`.cn-canto`), que adelgaza hasta nada.
 * - El cuerno es nieve: su cara que mira al astro, blanca (la de siempre, con su faceta de luz), y la otra, nieve fría y opaca
 *   (`.cn-sombra`, el mismo tono que la nieve en sombra de la ladera), hasta una arista que baja del pico y se une a la arista
 *   central de la montaña. La bandera y el mojón quedan delante de esa nieve en sombra, nunca contra el cielo.
 * - La roca asoma solo donde la nieve no se sostiene: por el filo oeste, casi a plomo, del cuerno (una franja estrecha) y, bajo el
 *   rellano, por la arista oeste hasta la línea de nieve (`.cn-roca`, con el mismo degradado que la ladera: es la misma roca y por
 *   debajo de la nieve se pierde en ella). Va unida al filo de la silueta y nunca cruza la arista central: no hay islas ni torres.
 * - Dos planos en la nieve en sombra le dan volumen: uno algo más oscuro en la ladera, bajo el rellano (`.cn-pliegue`), y otro más
 *   claro bajo el pico, que recibe la luz del cielo (`.cn-bisel`). Todo en tonos planos, como las facetas de la roca.
 * Todo va recortado por la nieve (`#m-nieve-c`), así que sigue a la altitud cuando `colocar` la cambia. Sin `rnd()`.
 */
const RELLANO_PLANO = [[-10.5, 2.6], [-7.5, 1.5], [6, 1.3], [14, 2.4], [7, 5.4], [-4.5, 7]];
function cumbre({ e, sx, sy, izq, quiebre, pico, nieve }) {
  const P = ([x, y]) => [sx + x * e, sy + y * e];
  const d = (pts) => `M${pts.map((q) => q.map(f1).join(' ')).join('L')}Z`;
  const q0 = quiebre[0], abajo = (q0[1] - sy) / e;
  // La cara en sombra del cuerno, hasta la arista que baja del pico y se une a la central (lo de más abajo ya es `.nieve-sombra`).
  const sombra = d([P([-60, -70]), P([17.3, -70]), P([17, -39]), P([17, -20]), P([16, 2]), P([12, 11]), q0, P([-60, abajo])]);
  // La roca: el filo oeste del cuerno (la franja se pierde en un punto bajo la cima) y la arista oeste, del rellano a la línea de nieve.
  let roca = d([[-40, 2], [-40, -45], [-1, -28], [1.5, -25.5], [-0.5, -20.5], [-1.5, -15], [-3, -11.5], [-2, -6], [-3.5, -2], [-4, 1.5]].map(P));
  const filo = [P([-15, 5]), ...izq.filter((q) => q[1] > sy + 6 * e && q[1] < sy + nieve.nv * 2.2).sort((a, b) => a[1] - b[1])];
  const anchos = [2.5, 3.6, 6.5, 3.6, 7.5, 4.5, 8]; // (nace fina bajo el canto del rellano)
  roca += d([...filo.map(([x, y]) => [x - 60, y]), ...filo.map(([x, y], i) => [x + anchos[i % anchos.length] * e, y]).reverse()]);
  // El canto del escalón: grueso bajo el mojón, adelgaza hasta nada donde el rellano se pierde en la cara del cuerno.
  const canto = d([[-15, 4.6], [-10.5, 2.6], [-4.5, 7], [7, 5.4], [14, 2.4], [12.4, 5.2], [7.5, 8.2], [1, 9.6], [-5, 10.4], [-9.5, 8], [-12.5, 5.6], [-16, 6.4]].map(P));
  const pliegue = d([[-13, 4], [-70, 96], [-34, 88], [-9, 14]].map(P));
  // Y arriba, bajo el pico, un plano de la cara en sombra que recibe la luz del cielo (más claro): el cuerno tiene volumen.
  const bisel = d([[17, -39], [8, -30], [13.5, -19.5], [17, -20.5]].map(P));
  // La faceta de luz de la cara blanca: un plano más claro que baja del pico hacia el astro.
  const faceta = d([pico, [pico[0] + nieve.ancho * 0.3, pico[1] + nieve.nv * 2.3], [pico[0] + nieve.ancho * 0.03, pico[1] + nieve.nv * 2.3]]);
  return `<g class="cumbre" clip-path="url(#m-nieve-c)"><path class="cn-sombra" d="${sombra}"/><path class="cn-pliegue" d="${pliegue}"/><path class="cn-bisel" d="${bisel}"/><path class="nieve-faceta" d="${faceta}"/>`
    + `<path class="cn-roca" fill="url(#m-ladera)" d="${roca}"/><path class="cn-canto" d="${canto}"/></g>`;
}

/**
 * Los rellanos (Montaña: campamentos asentados). Cada campamento se asienta en una repisa tallada en la ladera: el suelo (el plano que
 * más luz recibe), el corte de roca que queda detrás (en sombra, con una cara que recibe algo de luz), la roca que lo sostiene por
 * debajo y la sombra que echa sobre la ladera. La repisa sigue hacia fuera, cada vez más fina, hasta donde llega el rótulo del
 * campamento, que se apoya en ella. El sendero pasa por encima. La sombra del hito cae en el suelo, al lado contrario del astro.
 * Es terreno, no un dibujo del campamento: va en coordenadas de la escena, recortado por la silueta, con un trazo por tono para
 * todos los campamentos (pocos nodos) y no se apaga con los campamentos pendientes. En la cumbre, el rellano está tallado en la nieve.
 */
function terrazas(campos, e, sol, [sx, sy]) {
  const t = { sombra: '', pie: '', corte: '', corteLuz: '', muro: '', suelo: '', nieve: '' };
  for (const { p, cima, lado } of campos) {
    if (cima) {
      // La cumbre: el suelo de nieve del rellano (nace en la silueta y se pierde en la cara del cuerno) y la sombra del mojón. Su canto
      // de roca, la cara en sombra del cuerno y la roca del filo van en `cumbre`.
      const d = (pts) => `M${pts.map(([x, y]) => `${f1(sx + x * e)} ${f1(sy + y * e)}`).join('L')}Z`, r = RELLANO_CIMA;
      t.nieve += d(RELLANO_PLANO);
      t.pie += d([[-5.6, r + 0.2], [5.8, r + 0.2], [5.8 - sol * 10, r + 1.7], [-5.6 - sol * 10, r + 1.7]]);
      continue;
    }
    const d = (pts) => `M${pts.map(([x, y]) => `${f1(p.x + x * lado * e)} ${f1(p.y + y * e)}`).join('L')}Z`;
    const s = sol * lado; // +1: el astro queda hacia +x (hacia fuera del sendero)
    t.corte += d([[-3, -2.8], [1, -10.5], [9, -15.5], [20, -14], [27, -9], [33, -2.8]]);
    t.corteLuz += s > 0 ? d([[-3, -2.8], [1, -10.5], [9, -15.5], [8, -2.8]]) : d([[20, -14], [27, -9], [33, -2.8], [21, -2.8]]);
    t.suelo += losa(d, -8, REPISA)[0];
    t.muro += losa(d, -8, REPISA)[1];
    t.sombra += d([[-9, 3.4], [-4, 6.6], [10, 7], [24, 6.2], [REPISA + 2, 3.4], [REPISA - 1 - s * 3, 9], [20 - s * 4, 12.5], [4 - s * 4, 12], [-7 - s * 2, 8.4]]);
    t.pie += d([[DH - 6.6, 0.1], [DH + 6.6, 0.1], [DH + 6.6 - s * 13, 2], [DH - 6.6 - s * 13, 2]]);
  }
  return `<path class="tz-sombra" d="${t.sombra}"/><path class="tz-corte" d="${t.corte}"/><path class="tz-corte-luz" d="${t.corteLuz}"/><path class="tz-muro" d="${t.muro}"/>`
    + `<path class="tz-muro" id="m-repisa-m"/><path class="tz-suelo" d="${t.suelo}"/><path class="tz-suelo" id="m-repisa"/>`
    + `<path class="tz-nieve cn-rellano" d="${t.nieve}"/><g clip-path="url(#m-nieve-c)"><path class="tz-nieve" d="${t.suelo}"/></g><path class="tz-pie" d="${t.pie}"/>`;
}

/**
 * Una losa de la repisa de un campamento, de `x0` a `x1` (unidades del campamento, hacia fuera del sendero): el plano de arriba y su
 * canto de frente (la cara vertical, en sombra, con el borde de abajo quebrado como roca). Acaba roma, sin punta. `d` pasa los puntos
 * a la escena. La usan `terrazas` (la repisa) y `etiquetar` (el tramo que la alarga bajo el rótulo): mismas alturas, así casan.
 */
const REPISA = 34;
function losa(d, x0, x1) {
  const m = (x0 + x1) / 2;
  return [
    d([[x0, -0.2], [x0 + 5, -2.8], [x1, -2.8], [x1 + 2.4, -0.8], [x1 + 0.6, 1.5], [x0 + 4, 1.8]]),
    d([[x0, -0.2], [x0 + 4, 1.8], [x1 + 0.6, 1.5], [x1 + 2.4, -0.8], [x1 + 1.8, 2], [x1 - 2.5, 3.6], [m + 9, 3.2], [m + 4, 5.4], [m - 4, 4.6], [x0 + 12, 7], [x0 + 6, 5.6], [x0 + 2, 6.6], [x0 - 1, 3.2]]),
  ];
}

/**
 * Una pieza de piedra vista de tres cuartos, con la luz por la derecha: la cara en sombra (de −a a la arista `xe`), la cara iluminada
 * (de la arista a +a) y el plano de arriba. `y0` es la base y `y1` la cabeza; `a` y `b`, el medio ancho abajo y arriba. Devuelve los
 * tres trazos; `piedra` junta los de varias piezas en tres caminos (así un hito entero son tres nodos).
 */
function bloque(y0, y1, a, b, xe) {
  return [`M${-a} ${y0}L${-b} ${y1}H${xe}V${y0}Z`, `M${xe} ${y0}V${y1}H${b}L${a} ${y0}Z`, `M${-b} ${y1}L${f1(-b + 0.9)} ${f1(y1 - 1)}H${f1(b - 0.5)}L${b} ${y1}Z`];
}
const piedra = (...piezas) => `<path class="hito-sombra" d="${piezas.map((x) => x[0]).join('')}"/><path class="campo-ico" d="${piezas.map((x) => x[1]).join('')}"/><path class="hito-techo" d="${piezas.map((x) => x[2]).join('')}"/>`;

/**
 * Un hito distinto por campamento (idea 63), cada uno algo más alto que el anterior: un mojón, un pilar y un obelisco. Todos son un
 * zócalo, un fuste, el hueco del farol y la losa que lo cubre, en el mismo lenguaje (caras con luz y sombra). El origen es el pie;
 * `farol` es el suelo del hueco; `b` y `xe`, el medio ancho y la arista de la piedra ahí (para la cámara y la luz que baja por la cara).
 */
function icono(i) {
  const forma = (zoc, fuste, a, b, tapa) => ({ farol: -fuste, b, xe: -0.8,
    d: piedra(bloque(0, -zoc, 6.8, 6, -1.2), bloque(-zoc, -fuste, a, b, -0.8), bloque(-fuste - 3.4, -fuste - 3.4 - tapa, b + 1.1, b - 0.5, -0.8)) });
  return [forma(4.4, 7.6, 5, 4.2, 2.4), forma(3, 11.6, 4.7, 3.8, 2.4), forma(2.6, 15.4, 4.8, 3.3, 2.6)][Math.min(Math.max(i, 0), 2)];
}

/**
 * El bosque (idea 109): un pino por compra al pie de la montaña, por delante de los pinos de adorno. Con muchas compras cada
 * pino vale por varias (tope de 60). Usa su propio azar: la forma de la montaña no cambia. El último se planta con una
 * animación corta si la compra es de esta sesión (`plantar`).
 */
const MAX_PINOS = 60;
function bosque(W, H, bx, compras, plantar, pts = [], borde = [], techo = 0) {
  if (!(compras > 0)) return '';
  const por = Math.ceil(compras / MAX_PINOS), n = Math.ceil(compras / por);
  const rnd = azar(7);
  // (Campamento 22C) El bosque crece en el borde del llano, al pie de la montaña, detrás del pueblo y del lago (antes era una fila de
  // pinos iguales delante de todo). Cada pino mide lo que deja el sendero por encima (nunca lo toca) y nunca sube al saldo.
  const muestras = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [qx, qy] = pts[i], m = Math.max(1, Math.ceil(Math.hypot(qx - ax, qy - ay) / 4));
    for (let j = 0; j <= m; j++) muestras.push([ax + ((qx - ax) * j) / m, ay + ((qy - ay) * j) / m]);
  }
  const hueco = Math.min(H * 0.07, 54);
  const focos = ['', '', ''];
  let s = '<g class="bosque" id="m-bosque">';
  for (let i = 0; i < n; i++) {
    // Se reparten por todo el ancho salvo la marca de salida (un pino encima la taparía): el hueco se salta, no se pierde ningún pino.
    const u = ((i + 0.5) / n) * (W - 36) + (rnd() - 0.5) * ((W - 36) / n) * 0.8;
    const x = u < bx - 18 ? u : u + 36;
    const yb = enBorde(borde, x) + 3 + rnd() * 5;
    let a = hueco * (0.62 + rnd() * 0.5);
    const an0 = a * 0.36;
    for (const [mx, my] of muestras) if (Math.abs(mx - x) < an0 + 5 && my < yb) a = Math.min(a, yb - my - 7);
    a = Math.max(6, Math.min(a, yb - techo - 8));
    const an = a * 0.36;
    const nuevo = plantar && i === n - 1 ? ' pino-nuevo' : '';
    // (Navidad) Uno de cada dos pinos lleva foquitos: tres, en zigzag, de colores que se alternan.
    if (i % 2 === 0 && a > 12) for (const [t, dx] of [[0.32, -0.5], [0.56, 0.42], [0.8, -0.3]]) focos[(i + Math.round(t * 10)) % 3] += `M${f1(x + dx * an * (1 - t * 0.6))} ${f1(yb - a * (1 - t) - 1)}h0.01`;
    s += `<path class="pino-2${i % 3 === 1 ? ' pino-2b' : ''}${nuevo}" d="M${f1(x)} ${f1(yb - a)}L${f1(x + an * 0.55)} ${f1(yb - a * 0.5)}L${f1(x + an * 0.25)} ${f1(yb - a * 0.5)}L${f1(x + an)} ${f1(yb)}L${f1(x - an)} ${f1(yb)}L${f1(x - an * 0.25)} ${f1(yb - a * 0.5)}L${f1(x - an * 0.55)} ${f1(yb - a * 0.5)}Z"/>`;
  }
  return `${s}</g><g class="v-navidad nav-bosque">${focos.map((d, i) => `<path class="nb-foco nb-${i}" d="${d}"/>`).join('')}</g>`;
}

/** La luna-moneda (idea 45): tres toques seguidos a la luna y por un instante es una moneda ₿ con su fase. Solo de noche, solo con el puntero. */
const tocaLuna = new WeakSet();
function instalarMoneda(host) {
  if (tocaLuna.has(host)) return;
  tocaLuna.add(host);
  let n = 0, t0 = 0;
  host.addEventListener('click', (e) => {
    const luna = e.target.closest?.('.luna');
    if (!luna || document.documentElement.dataset.cielo !== 'noche') return;
    const ahora = Date.now();
    n = ahora - t0 < 1200 ? n + 1 : 1;
    t0 = ahora;
    if (n < 3) return;
    n = 0;
    luna.classList.add('moneda');
    setTimeout(() => luna.classList.remove('moneda'), sinMovimiento() ? 1400 : 1600);
  });
}

/**
 * Árboles de honor (idea 52): la compra n.º 100 planta un ceibo, la 500 un amate y la 1,000 un maquilishuat, más grandes que los
 * pinos y en sitios fijos entre ellos (sin azar: la forma de la montaña y del bosque no cambia). Formas sencillas, de dos o tres
 * piezas; el color sale del CSS.
 */
function arbolesHonor(W, H, bx, compras, plantar, pts, solX, evitar = [], borde = null) {
  // (22C) Con la franja del valle delante (teléfono y tablet altos), los árboles de honor crecen al pie de la montaña, en el borde del
  // llano, con el bosque (más chicos: están más lejos), y no delante del pueblo ni del lago.
  const ybDe = (x) => (borde ? enBorde(borde, x) + 8 : H * 0.955), escala = borde ? 0.72 : 1;
  // ¿Pasa el sendero por la caja de un árbol de ancho `a` y alto `h` centrado en x? (se mira cada tramo del zigzag a trozos)
  const tapa = (x, a, h) => pts.some(([x1, y1], i) => i && [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].some((k) => {
    const px = pts[i - 1][0] + (x1 - pts[i - 1][0]) * k, py = pts[i - 1][1] + (y1 - pts[i - 1][1]) * k;
    return Math.abs(px - x) < a && py > ybDe(x) - h - 6 && py < ybDe(x) + 4;
  }));
  const usados = [], cajas = [];
  let s = '';
  // Tamaño: por la altura de la escena, sin pasar de lo que cabe a lo ancho (en el teléfono la escena es alta y estrecha).
  // `a` es media copa: el ceibo es una sombrilla ancha, el maquilishuat una copa rala y estrecha.
  const base = Math.min(H, W * 1.3);
  for (const tipo of arbolesDe(compras)) {
    const h = base * escala * (tipo === 'ceibo' ? 0.15 : tipo === 'amate' ? 0.12 : 0.115), a = h * (tipo === 'ceibo' ? 0.75 : tipo === 'amate' ? 0.64 : 0.42);
    // Primero los sitios de siempre (de derecha a izquierda); si ninguno está libre, cualquier otro hueco del pie que no pise el
    // sendero ni otro árbol; y si tampoco, el que quede más lejos de los demás.
    const sitios = [0.88, 0.7, 0.54, 0.38, 0.22, 0.1, 0.94, 0.8, 0.62, 0.46, 0.3, 0.16, 0.05].map((f) => W * f).filter((c) => c > a * 0.6 && c < W - a * 0.6 && Math.abs(c - bx) > a + 12);
    const lejos = (c) => Math.min(Infinity, ...usados.map(([u, au]) => Math.abs(u - c) - (a + au) * 0.9));
    const libreValle = (c) => !evitar.some((b) => b[0] < c + a && b[2] > c - a && b[3] > ybDe(c) - h && b[1] < ybDe(c)); // (campamento 22) ni el camino real ni el árbol del primer día (22C: ni el pueblo ni el lago)
    const x = sitios.find((c) => !tapa(c, a, h) && lejos(c) > 0 && libreValle(c)) ?? sitios.find((c) => !tapa(c, a, h) && lejos(c) > 0) ?? sitios.find((c) => lejos(c) > 0) ?? [...sitios].sort((p, q) => lejos(q) - lejos(p))[0] ?? W * 0.9;
    usados.push([x, a]);
    const yb = ybDe(x);
    cajas.push([x - a, x + a, yb - h]);
    const nuevo = plantar && ((tipo === 'ceibo' && compras === 100) || (tipo === 'amate' && compras === 500) || (tipo === 'maquilishuat' && compras === 1000)) ? ' pino-nuevo' : '';
    s += `<g class="arbol-honor ${tipo}${nuevo}">${arbolHonor(tipo, x, yb, h, solX >= x ? 1 : -1)}</g>`;
  }
  return { svg: s, cajas };
}

/**
 * Dónde cuelga el papel picado: el primer sitio de la lista que no cruza el sendero ni un árbol de honor. Al pie de la escena, por
 * encima del botón «Anotar» en el teléfono y la tablet y lejos de los rótulos (que van más arriba). Devuelve [x1, x2, y, escala, estacas].
 */
function sitioPapel(W, H, by, pts, cajas) {
  const acostado = H <= 520 && W >= H * 1.5 && W < 1100; // teléfono acostado: «Anotar» va abajo a la izquierda, solo cabe a la derecha
  const opciones = acostado ? [[0.74, 0.97, by - 64, 1], [0.56, 0.78, by - 50, 1]] : W < 700 ? [[0.6, 0.96, by - 66, 1], [0.04, 0.36, by - 78, 1]]
    : W < 1100 ? [[0.66, 0.94, by - 84, 1.2], [0.04, 0.3, by - 92, 1.2], [0.45, 0.7, by - 70, 1.2]]
      : [[0.64, 0.8, H * 0.8, 1.5], [0.83, 0.97, H * 0.82, 1.5], [0.02, 0.17, H * 0.87, 1.5]];
  const libre = ([f1x, f2x, y, k]) => {
    const x1 = W * f1x, x2 = W * f2x, y2 = y + 34 * k;
    const camino = pts.some(([px, py], i) => i && [0, 0.25, 0.5, 0.75, 1].some((t) => {
      const qx = pts[i - 1][0] + (px - pts[i - 1][0]) * t, qy = pts[i - 1][1] + (py - pts[i - 1][1]) * t;
      return qx > x1 - 6 && qx < x2 + 6 && qy > y - 14 && qy < y2 + 10;
    }));
    return !camino && cajas.every(([a, b, top]) => b < x1 - 6 || a > x2 + 6 || top > y2);
  };
  const o = opciones.find(libre);
  if (o) return [W * o[0], W * o[1], o[2], o[3], true];
  // Sin un sitio libre (muchos árboles de honor): el cordel va de la copa de un árbol a la del siguiente, sin estacas.
  const [c1, c2] = [...cajas].sort((p, q) => p[0] - q[0]).slice(-2);
  if (c2 && W >= 700 && !acostado) { const xa = (c1[0] + c1[1]) / 2, xb = (c2[0] + c2[1]) / 2; return [Math.min(xa, xb), Math.max(xa, xb), Math.max(c1[2], c2[2]) + 6, opciones[0][3], false]; }
  return acostado ? null : [W * opciones[0][0], W * opciones[0][1], opciones[0][2], opciones[0][3], true];
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
  const botones = [...campos].sort((a, b) => a.p.y - b.p.y).map(({ m, p, cima, lado }) => {
    const t = textoCampamento(m, sats, fechas[m] ?? null, cima, estado.libro);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm-bandera';
    b.dataset.m = String(m);
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', 'm-tarjeta');
    b.setAttribute('aria-label', `${t.titulo}. ${t.texto}`);
    const e = estado.ec || 1;
    b.style.left = `${f1(Math.min(Math.max(p.x + (cima ? 3 : DH * lado) * e - TOQUE / 2, 0), W - TOQUE))}px`;
    b.style.top = `${f1(Math.min(Math.max(p.y - TOQUE / 2 - (cima ? 5 : 11) * e, 0), H - TOQUE))}px`;
    b.addEventListener('click', () => (abierta === m ? cerrarTarjeta() : abrirTarjeta(m)));
    return b;
  });
  const tarjeta = document.createElement('div');
  tarjeta.className = 'm-tarjeta';
  tarjeta.id = 'm-tarjeta';
  tarjeta.setAttribute('role', 'group');
  tarjeta.setAttribute('aria-labelledby', 'm-tarjeta-t');
  tarjeta.hidden = true;
  tarjeta.innerHTML = '<div class="m-pet" aria-hidden="true"></div><b id="m-tarjeta-t"></b><p id="m-tarjeta-p"></p><p class="m-mensaje" id="m-mensaje" hidden></p><small class="m-mensaje-nota" id="m-mensaje-nota" hidden></small><button type="button" class="m-firmas" id="m-firmas" hidden><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-libro"/></svg><span class="m-firmas-t"><span class="m-firmas-k">Libro de cumbre</span><span class="m-firmas-r" id="m-firmas-r"></span></span></button><button type="button" class="m-tarjeta-escribir" id="m-escribir" hidden></button><button type="button" class="m-tarjeta-x">Cerrar</button>';
  tarjeta.querySelector('.m-tarjeta-x').addEventListener('click', () => cerrarTarjeta(true));
  // El dueño escribe o cambia el mensaje de la bandera: la montaña solo avisa (mensajes.js abre el cuadro).
  tarjeta.querySelector('#m-escribir').addEventListener('click', () => { if (abierta !== null) document.dispatchEvent(new CustomEvent('libro:mensaje', { detail: { hito: abierta } })); });
  // El libro de cumbre (campamento 19): leer y firmar es de toda la familia; firmas.js abre el libro (la montaña solo avisa).
  tarjeta.querySelector('#m-firmas').addEventListener('click', () => {
    if (abierta === null) return;
    document.dispatchEvent(new CustomEvent('libro:firmas', { detail: { hito: abierta, alcanzado: estado.sats >= abierta } }));
  });
  caja.replaceChildren(...botones, tarjeta);
  abierta = null;
}

function abrirTarjeta(m) {
  const { caja, campos, sats, fechas, H } = estado;
  const campo = campos.find((x) => x.m === m);
  const tarjeta = caja?.querySelector('#m-tarjeta');
  if (!campo || !tarjeta) return;
  const t = textoCampamento(m, sats, fechas[m] ?? null, campo.cima, estado.libro);
  tarjeta.querySelector('#m-tarjeta-t').textContent = t.titulo;
  tarjeta.querySelector('#m-tarjeta-p').textContent = t.texto;
  tarjeta.dataset.estado = t.alcanzado ? 'alcanzado' : 'futuro';
  // Un campamento alcanzado, con su fecha conocida, se «talla» en piedra (campamento 13C); el texto de siempre queda para los lectores.
  const fecha = fechas[m] ?? null, piedra = Boolean(t.alcanzado && fecha);
  tarjeta.querySelector('.m-pet').innerHTML = piedra ? petroglifo({ cifra: nombreHito(m), titulo: t.titulo, fecha: fechaLarga(fecha), cima: campo.cima }) : '';
  tarjeta.classList.toggle('con-piedra', piedra);
  // El mensaje del dueño en esa bandera (15A): lo ven todos cuando el campamento ya se alcanzó; antes llega sellado (sin texto).
  const msg = (estado.mensajes ?? []).find((x) => x.hito === m);
  const pM = tarjeta.querySelector('#m-mensaje'), bE = tarjeta.querySelector('#m-escribir');
  pM.hidden = !msg;
  pM.dataset.sellado = msg?.sellado ? '1' : '';
  pM.textContent = !msg ? '' : msg.sellado ? 'Hay un mensaje esperándote en este campamento.' : msg.texto;
  // El dueño ve el de un campamento por alcanzar: la aclaración va aparte (fuera de la cita).
  const nota = tarjeta.querySelector('#m-mensaje-nota');
  nota.hidden = !(msg && !msg.sellado && !t.alcanzado);
  nota.textContent = nota.hidden ? '' : 'Se revelará a los demás cuando lleguen a este campamento.';
  bE.hidden = !estado.puedeEscribir;
  bE.textContent = msg ? 'Cambiar el mensaje' : 'Escribir un mensaje';
  pintarFirmasTarjeta(m);
  tarjeta.style.setProperty('--cx', `${f1(campo.p.x)}px`);
  const abajo = campo.p.y < H * 0.62;
  tarjeta.style.top = abajo ? `${f1(campo.p.y + 18)}px` : 'auto';
  tarjeta.style.bottom = abajo ? 'auto' : `${f1(H - campo.p.y + 46)}px`;
  tarjeta.hidden = false;
  // La tarjeta (con la piedra, la cinta del mensaje y los botones del dueño) puede ser alta: si abajo no cabe sin tapar «Anotar compra»,
  // se abre hacia arriba; y si tampoco cabe arriba, se queda donde más espacio hay.
  if (abajo) {
    const alto = tarjeta.getBoundingClientRect().height, limite = H - 76;
    if (campo.p.y + 18 + alto > limite && campo.p.y - 46 - alto > 8) { tarjeta.style.top = 'auto'; tarjeta.style.bottom = `${f1(H - campo.p.y + 46)}px`; }
  }
  caja.querySelectorAll('.m-bandera').forEach((b) => b.setAttribute('aria-expanded', String(Number(b.dataset.m) === m)));
  abierta = m;
}

/**
 * El libro de cumbre en la tarjeta (campamento 19): quién firmó y qué se puede hacer. Sale en un campamento al que el libro ya llegó o, si
 * el saldo bajó después, cuando ya tiene firmas (se pueden leer). La cumbre no tiene libro: nunca se alcanza (al llegar, la montaña sube).
 */
function pintarFirmasTarjeta(m) {
  const b = estado?.caja?.querySelector('#m-firmas');
  if (!b) return;
  const fs = firmasDe(estado.firmas, m), alcanzado = estado.sats >= m;
  b.hidden = !(alcanzado || fs.length);
  if (b.hidden) return;
  b.querySelector('#m-firmas-r').textContent = `${textoFirmantes(fs)} · ${accionFirmas(fs, alcanzado)}`;
}
/** Firmas nuevas (alguien firmó, o llegó la actualización de cada minuto): se pintan en la tarjeta abierta sin redibujar la montaña. */
export function actualizarFirmas(firmas) {
  if (!estado) return;
  estado.firmas = firmas;
  if (abierta !== null) pintarFirmasTarjeta(abierta);
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
  // Con un cuadro abierto encima (escribir el mensaje, el libro de cumbre) la tarjeta se queda: al cerrarlo, el foco vuelve a su botón. Tocar
  // el aviso de abajo («Deshacer» una firma) tampoco la cierra.
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta !== null && !document.querySelector('dialog[open]')) { e.preventDefault(); cerrarTarjeta(true); } });
  document.addEventListener('pointerdown', (e) => { if (abierta !== null && !e.target.closest?.('.m-bandera, .m-tarjeta, dialog, #aviso')) cerrarTarjeta(); });
}

/**
 * Dos detalles de ambiente por campamento (solo con todos los efectos; el CSS decide cuál se ve):
 * humo en los ya alcanzados y una fogata que parpadea en el siguiente. Pequeños y al pie de la bandera, lejos de la etiqueta.
 */
/**
 * Mide un trazo hecho de rectas y curvas cuadráticas sin preguntar al navegador: lo aplana en una polilínea fina (24 pasos por
 * curva) con su longitud acumulada y devuelve `(l) => { x, y }`, el punto a esa distancia del inicio (búsqueda binaria e
 * interpolación). `largo` es la longitud que da el navegador: la tabla se escala a ella, así las distancias coinciden con las
 * de `stroke-dasharray`. El error frente a `getPointAtLength` es de centésimas de píxel.
 */
function medidor(inicio, tramos, largo) {
  const xs = [inicio[0]], ys = [inicio[1]], ls = [0];
  const hasta = (x, y) => { const i = xs.length - 1; ls.push(ls[i] + Math.hypot(x - xs[i], y - ys[i])); xs.push(x); ys.push(y); };
  for (const t of tramos) {
    if (t.length === 2) { hasta(t[0], t[1]); continue; }
    const x0 = xs[xs.length - 1], y0 = ys[ys.length - 1], [cx, cy, x1, y1] = t;
    for (let k = 1; k <= 24; k++) { const u = k / 24, v = 1 - u; hasta(v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1); }
  }
  const n = xs.length - 1, total = ls[n] || 1, escala = total / (largo || total);
  return (l) => {
    const d = Math.min(total, Math.max(0, (Number(l) || 0) * escala));
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ls[m] <= d) lo = m; else hi = m; }
    const f = (d - ls[lo]) / ((ls[hi] - ls[lo]) || 1);
    return { x: xs[lo] + (xs[hi] - xs[lo]) * f, y: ys[lo] + (ys[hi] - ys[lo]) * f };
  };
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
function etiquetar(yo, sats = estado.sats) {
  const { campos, W, host } = estado;
  // Cada campamento (mástil, banderín y tienda) y el punto de «Tú» ocupan su sitio: ninguna etiqueta se les encima.
  const e = estado.ec || 1;
  const cajas = campos.map(({ m, p, cima, lado }) => (cima ? { x: p.x - 12 * e, y: p.y - 26 * e, w: 34 * e, h: 34 * e, m } : { x: p.x + (lado < 0 ? -32 : 0) * e, y: p.y - 38 * e, w: 32 * e, h: 42 * e, m }));
  cajas.push({ x: yo.x - 18, y: yo.y - 18, w: 36, h: 36 });
  if (estado.eco) cajas.push({ x: estado.eco.p.x - 12, y: estado.eco.p.y - 12, w: 24, h: 24 });
  // Las marcas de etapa también ocupan su sitio (solo la siguiente lleva rótulo).
  for (const { m, p } of estado.etapas || []) cajas.push({ x: p.x - 9, y: p.y - 9, w: 18, h: 18, m, fina: rangoEtapa(m) === 'intermedia' });
  // En el teléfono y la tablet el saldo ocupa todo el ancho de arriba: ninguna etiqueta sube por encima de él.
  const techoEt = W < 1100 && !estado.c.lago ? (estado.techo || 0) + 4 : 0;
  // (Campamento 23) En la película «Tú» empieza al pie, junto a la salida: ningún rótulo baja hasta el suelo que funde la escena (no se leería).
  const suelo = estado.pelicula ? estado.H * 0.95 - 2 : Infinity;
  const choca = (b, propio) => b.x < 4 || b.x + b.w > W - 4 || b.y < Math.max(4, techoEt) || b.y + b.h > suelo || cajas.some((o) => o.m !== propio && b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  // «Tú» primero: arriba a la izquierda de tu punto y, si ahí hay un campamento, en otro rincón.
  // El rótulo del punto: «Tú» para quien anota y «Vamos aquí» para quien solo mira (no es esa persona la que sube). La caja mide
  // lo que el texto (36 px para «Tú», como siempre) y se aparta lo mismo del punto.
  // (Campamento 23) La película del ascenso pone el suyo («Íbamos aquí» los días de antes, para quien solo mira).
  const rotulo = estado.rotulo ?? (estado.libro ? 'Vamos aquí' : 'Tú');
  const wYo = rotulo !== 'Tú' ? rotulo.length * 7.4 + 16 : 36;
  const yoOpc = [[-46, -38, 'end', -16], [10, -38, 'start', 16], [-46, 12, 'end', -16], [10, 12, 'start', 16], [-54, -8, 'end', -24], [18, -8, 'start', 24], [-18, -64, 'middle', 0], [-18, 26, 'middle', 0]]
    .map(([dx, dy, a, tx]) => ({ x: a === 'end' ? yo.x + dx + 36 - wYo : a === 'middle' ? yo.x - wYo / 2 : yo.x + dx, y: yo.y + dy, w: wYo, h: 24, anclaje: a, tx: yo.x + tx }));
  // (Con `middle` la caja ya va centrada: dx = −18.)
  // «Vamos aquí» es más largo que «Tú»: además se aparta del propio sendero (unas muestras del trazo a cada lado del punto).
  const senda = [];
  if (rotulo !== 'Tú') {
    const l = estado.enAltura(altitud(sats, estado.esc));
    for (let d = -84; d <= 84; d += 12) {
      if (Math.abs(d) < 12 || l + d < 0 || l + d > estado.L) continue;
      const q = estado.camino.getPointAtLength(l + d);
      senda.push({ x: q.x - 5, y: q.y - 5, w: 10, h: 10 });
    }
  }
  const pisaSenda = (b) => senda.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  const yb = yoOpc.find((o) => !choca(o) && !pisaSenda(o)) ?? yoOpc.find((o) => !choca(o)) ?? yoOpc[0];
  cajas.push(yb);
  const prioridad = (m) => (m === estado.esc.cima ? 0 : m === estado.meta ? 1 : 2);
  const orden = [...campos].sort((a, b) => prioridad(a.m) - prioridad(b.m));
  let repisa = '', repisaM = '';
  let s = `<text class="yo-txt" x="${f1(yb.tx)}" y="${f1(yb.y + 17)}" text-anchor="${yb.anclaje}">${rotulo}</text>`;
  for (const { m, p, cima, lado } of orden) {
    const txt = nombreHito(m);
    const w = txt.length * 8.2 + 6;
    // Un letrero junto al campamento: por fuera (del lado de la tienda), encima, del otro lado del camino o debajo.
    // El rótulo es texto con un halo suave sobre la roca, junto al hito: por fuera del camino, al otro lado, encima o debajo.
    // El de un campamento se apoya en su repisa (que sigue hasta ahí: ver `terrazas`); el de la cumbre, pegado a la antecima.
    const xc = cima ? p.x : p.x + DH * lado * e;
    const yt = cima ? p.y - 24 * e : p.y - 19 - 2.6 * e;
    const dx = (cima ? 19 : 16) * e;
    const fuera = { x: lado > 0 || cima ? xc + dx : xc - dx - w, y: yt, w, h: 20, anclaje: lado > 0 || cima ? 'start' : 'end', tx: lado > 0 || cima ? xc + dx + 3 : xc - dx - 3 };
    const otro = { x: lado > 0 || cima ? xc - dx - w : xc + dx, y: yt, w, h: 20, anclaje: lado > 0 || cima ? 'end' : 'start', tx: lado > 0 || cima ? xc - dx - 3 : xc + dx + 3 };
    const encima = { x: xc - w / 2, y: p.y - (cima ? 52 : 46) * e, w, h: 20, anclaje: 'middle', tx: xc };
    const abajo = { x: xc - w / 2, y: p.y + 6 * e, w, h: 20, anclaje: 'middle', tx: xc };
    const opciones = cima ? [otro, encima, fuera] : [fuera, otro, encima, abajo];
    const b = opciones.find((o) => !choca(o, m));
    if (!b) continue;
    cajas.push(b);
    if (b === fuera && !cima) { // el rótulo se apoya en la repisa de su campamento: la losa sigue, igual de gruesa, hasta él
      const fin = (b.w + dx + DH * e) / e + 1.5, q = (pts) => `M${pts.map(([x, y]) => `${f1(p.x + x * lado * e)} ${f1(p.y + y * e)}`).join('L')}Z`;
      const [arriba, canto] = losa(q, REPISA - 9, fin);
      repisa += arriba; repisaM += canto;
    }
    s += `<text class="campo-txt${cima ? ' cima' : ''}" x="${f1(b.tx)}" y="${f1(b.y + 15)}" text-anchor="${b.anclaje}">${txt}</text>`;
  }
  // El rótulo del eco, pequeño y sin placa, donde quepa (si no cabe, el eco queda sin letrero: la descripción de la montaña lo dice).
  if (estado.eco) {
    const q = estado.eco.p, w = 62;
    const opc = [
      { x: q.x + 13, y: q.y - 9, w, h: 18, anclaje: 'start', tx: q.x + 15 },
      { x: q.x - 13 - w, y: q.y - 9, w, h: 18, anclaje: 'end', tx: q.x - 15 },
      { x: q.x - w / 2, y: q.y - 32, w, h: 18, anclaje: 'middle', tx: q.x },
      { x: q.x - w / 2, y: q.y + 12, w, h: 18, anclaje: 'middle', tx: q.x },
    ];
    const b = opc.find((o) => !choca(o, 'eco'));
    if (b) { cajas.push(b); s += `<text class="eco-txt" x="${f1(b.tx)}" y="${f1(b.y + 13)}" text-anchor="${b.anclaje}">hace 1 año</text>`; }
  }
  // La siguiente etapa, si no es un campamento: su rótulo junto a la marca (a la derecha, a la izquierda, encima o debajo). (Campamento 21)
  // Con las etapas más juntas la siguiente suele ir pegada a «Tú»: si su rótulo no cabe, lo lleva la siguiente con sello.
  const sigs = [(estado.etapas || []).find((x) => x.m === etapaSiguiente(sats)), (estado.etapas || []).find((x) => x.m > sats && rangoEtapa(x.m) !== 'intermedia')];
  host.querySelectorAll('#m-etapas .etapa[visibility]').forEach((g) => g.removeAttribute('visibility'));
  for (const eSig of sigs.filter((x, i) => x && sigs.indexOf(x) === i)) {
    const txt = nombreHito(eSig.m), w = txt.length * 8.2 + 6, p = eSig.p;
    const opciones = [
      { x: p.x + 12 * e, y: p.y - 10, w, h: 20, anclaje: 'start', tx: p.x + 12 * e + 3 },
      { x: p.x - 12 * e - w, y: p.y - 10, w, h: 20, anclaje: 'end', tx: p.x - 12 * e - 3 },
      { x: p.x - w / 2, y: p.y - 30 * e, w, h: 20, anclaje: 'middle', tx: p.x },
      { x: p.x - w / 2, y: p.y + 10 * e, w, h: 20, anclaje: 'middle', tx: p.x },
    ];
    // El rótulo de la etapa puede ir sobre una marca fina (intermedia), que entonces se esconde: el rótulo manda.
    const sinFinas = cajas.filter((o) => !o.fina || o.m === eSig.m);
    const chocaEt = (b) => b.x < 4 || b.x + b.w > W - 4 || b.y < Math.max(4, techoEt) || sinFinas.some((o) => o.m !== eSig.m && b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const b = opciones.find((o) => !chocaEt(o));
    if (b) {
      s += `<text class="campo-txt etapa-txt" x="${f1(b.tx)}" y="${f1(b.y + 15)}" text-anchor="${b.anclaje}">${txt}</text>`;
      for (const o of cajas) if (o.fina && o.m !== eSig.m && b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y) host.querySelector(`#m-etapas .etapa[data-m="${o.m}"]`)?.setAttribute('visibility', 'hidden');
      break;
    }
  }
  const caja = host.querySelector('#m-etiquetas');
  caja.innerHTML = s;
  host.querySelector('#m-repisa')?.setAttribute('d', repisa);
  host.querySelector('#m-repisa-m')?.setAttribute('d', repisaM);
  ocultarOsos(yo);
  // Cada etiqueta lleva detrás una placa redondeada (se mide el texto ya dibujado: legible sobre cualquier cielo o ladera).
  for (const t of caja.querySelectorAll('text.yo-txt')) {
    const bb = t.getBBox();
    if (!bb.width) continue;
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('class', 'eti-yo');
    r.setAttribute('x', f1(bb.x - 6)); r.setAttribute('y', f1(bb.y - 1.5));
    r.setAttribute('width', f1(bb.width + 12)); r.setAttribute('height', f1(bb.height + 3));
    r.setAttribute('rx', f1((bb.height + 3) / 2));
    caja.insertBefore(r, t);
  }
}

/**
 * (Campamento 25) «El oso cede»: si un rótulo (o la placa de «Tú», o «Tú») cae sobre los osos, se esconden ese rato; un rótulo nunca
 * se pierde por ellos. Se mira cada vez que se ponen los rótulos (al llegar «Tú» a su sitio), no en cada fotograma.
 */
function ocultarOsos(yo) {
  const g = estado.osos && estado.host.querySelector('#m-osos');
  if (!g) return;
  const rotulos = [...estado.host.querySelectorAll('#m-etiquetas > text, #m-etiquetas > rect')].map((t) => t.getBBox()).filter((q) => q.width > 0);
  rotulos.push({ x: yo.x - 10, y: yo.y - 10, width: 20, height: 20 });
  const pisa = estado.osos.cajas.some(([a, b, c, d]) => rotulos.some((q) => q.x < c && q.x + q.width > a && q.y < d && q.y + q.height > b));
  if (pisa) g.setAttribute('visibility', 'hidden'); else g.removeAttribute('visibility');
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
  const sigEtapa = etapaSiguiente(sats);
  host.querySelectorAll('.etapa').forEach((g) => { g.classList.toggle('alcanzada', Number(g.dataset.m) <= sats); g.classList.toggle('sig', Number(g.dataset.m) === sigEtapa); });
  // Rendimiento: la nieve se usa de máscara y de recorte, así que cada cambio de su trazo obliga a volver a pintar medio monte.
  // Mientras «Tú» sube se actualiza por escalones (16 en toda la montaña, no en cada fotograma) y, si no cambió, no se toca;
  // al llegar (`animado` falso) queda con su valor exacto.
  const altN = altitud(sats, esc);
  const dn = trazoNieve(estado.nieveMedidas, animado ? Math.round(altN * 16) / 16 : altN);
  if (dn !== estado.dNieve) {
    estado.dNieve = dn;
    host.querySelectorAll('.nieve, .nieve-sombra, .nieve-luz, .nieve-mascara, .nieve-clip').forEach((n) => n.setAttribute('d', dn));
  }
  // (Campamento 25) Los osos sentados en la nieve de hoy esperan escondidos mientras la nieve dibujada no los cubre.
  // Con la altitud exacta, no la de los escalones de la nieve (si no, unos osos ya visibles parpadearían al empezar a subir), y con un
  // fundido solo si «Tú» va subiendo (al dibujar, o al saltar con el deslizador de la película, quedan ya como deben).
  const go = estado.osos && host.querySelector('#m-osos');
  if (go) {
    const sin = altN < estado.osos.nieve - 1e-9;
    if (sin !== go.classList.contains('sin-nieve')) { go.toggleAttribute('data-fundido', Boolean(animado)); go.classList.toggle('sin-nieve', sin); }
  }
  luminarias(l);
  if (!animado) { etiquetar(p, sats); huellas(l); }
  return p;
}

/** (22C) Las luminarias de Navidad del sendero: encendidas hasta `l` (en la entrada, todas: no dicen nada de nadie). */
function luminarias(l) {
  const { navFocos, host, navTodas } = estado;
  if (!navFocos?.length) return;
  const n = navTodas ? navFocos.length : navFocos.filter((f) => f.l <= l + 2).length;
  if (n === estado.navN) return;
  estado.navN = n;
  const d = (lista) => lista.map((f) => `M${f1(f.x)} ${f1(f.y)}h0.01`).join('');
  const on = navFocos.slice(0, n), g = host.querySelector('#m-nav-sendero');
  if (!g) return;
  g.querySelector('.ns-off').setAttribute('d', d(navFocos.slice(n)));
  g.querySelector('.ns-glow').setAttribute('d', d(on));
  for (const c of [0, 1, 2]) g.querySelector(`.ns-${c}`).setAttribute('d', d(on.filter((f) => f.c === c)));
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
  estado.host.querySelectorAll('#m-etapas .etapa[visibility]').forEach((g) => g.removeAttribute('visibility')); // sin rótulos, se ven todas (campamento 21)
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

/** (Campamento 23) La escala de la escena dibujada en `host` (base y cumbre: la película mide la altitud con ella), o null si ya no es la suya. */
export const escalaDe = (host) => (estado?.host === host ? estado.esc : null);
/**
 * (Campamento 23) Un fotograma de la película del ascenso: «Tú» donde estaba el saldo ese día, sobre la montaña de hoy (la escala no
 * cambia). Mientras se mueve (`quieto` falso) va sin su rótulo ni sus huellas, como al subir; quieto, con todo (`rotulo` es el suyo).
 * Los campamentos que pasa al avanzar encienden su farol (`iza`) y el bosque crece con las compras que llevaba (`compras`: los pinos
 * y los árboles de honor que aún no había se esconden). No hace nada si la escena ya no es la de `host` (se redibujó o se cerró).
 */
export function fotograma(host, sats, { compras = null, quieto = false, rotulo = null } = {}) {
  if (!estado || estado.host !== host || !host.isConnected) return;
  estado.rotulo = rotulo;
  if (!quieto && !estado.enMarcha) {
    host.querySelectorAll('#m-etiquetas .yo-txt, #m-etiquetas .eti-yo').forEach((e) => e.remove());
    host.querySelector('#m-huellas').innerHTML = '';
    host.querySelectorAll('#m-etapas .etapa[visibility]').forEach((g) => g.removeAttribute('visibility'));
  }
  estado.enMarcha = !quieto;
  const antes = estado.satsFoto;
  colocar(sats, !quieto);
  if (antes != null && sats > antes) {
    for (const g of host.querySelectorAll('.campo')) {
      const m = Number(g.dataset.m);
      if (m > antes && m <= sats) { g.classList.add('iza'); setTimeout(() => g.classList.remove('iza'), 1800); }
    }
  }
  estado.satsFoto = sats;
  if (compras == null || !(estado.compras > 0)) return;
  const por = Math.ceil(estado.compras / MAX_PINOS), vis = Math.ceil(compras / por);
  if (vis === estado.pinosVis) return;
  estado.pinosVis = vis;
  host.querySelectorAll('#m-bosque path').forEach((p, i) => p.classList.toggle('pe-fuera', i >= vis));
  for (const [tipo, desde] of [['ceibo', 100], ['amate', 500], ['maquilishuat', 1000]]) host.querySelector(`.arbol-honor.${tipo}`)?.classList.toggle('pe-fuera', compras < desde);
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
  // (Campamento 25) Y los osos de la cumbre dan un saltito (0.9 s, solo transform; el CSS lo apaga con efectos «ninguno»).
  const os = host.querySelector('#m-osos.osos');
  if (os) {
    if (os.classList.contains('salta')) { os.classList.remove('salta'); os.getBoundingClientRect(); } // otro saltito seguido: que empiece de nuevo
    os.classList.add('salta');
    setTimeout(() => os.classList.remove('salta'), 1200);
  }
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
  const lb = estado.libro; // para quien solo mira, el que sube es el libro (campamento 17)
  estado.host.querySelector('#m-desc').textContent = descripcionMontana(sats, meta, estado.esc.campos, estado.esc.cima, lb) + (estado.compras ? ` Al pie crece ${lb ? 'el bosque del libro' : 'tu bosque'}: un pino por compra (${estado.compras}).` : '')
    + (arbolesDe(estado.compras).length ? ` Entre los pinos crecen ${lb ? 'los' : 'tus'} árboles de honor: ${arbolesDe(estado.compras).map((t) => ({ ceibo: 'un ceibo', amate: 'un amate', maquilishuat: 'un maquilishuat' })[t]).join(', ')}.` : '')
    + (estado.eco ? ` ${lb ? 'El eco' : 'Tu eco'}, una sombra quieta en el sendero, marca dónde ${lb ? 'estaba el libro' : 'estabas'} hace un año: ${entero(estado.eco.sats)} sats.` : '')
    + (estado.valle ? ` ${textoValle(estado.valle)}` : '')
    + (estado.osos ? ` ${textoOsos(estado.osos.n)}` : '');
}

// ---------------------------------------------------------------- campamento 16A
/** La sombra de la cumbre según la hora de El Salvador (de 6 a 18; fuera de ahí no hay sombra). Cada piedrita es una hora. */
export function colocarReloj(host = document.querySelector('.montana')) {
  const g = host?.querySelector('.reloj');
  const sombra = g?.querySelector('.reloj-sombra');
  if (!g || !sombra) return;
  const h = window.libroCielo?.hora?.() ?? 12;
  if (h < 6 || h > 18) { sombra.setAttribute('d', ''); return; }
  const sx = Number(g.dataset.sx), gy = Number(g.dataset.gy), alcance = Number(g.dataset.alcance);
  const punta = sx + ((h - 12) / 5) * alcance, ancho = 3.2;
  sombra.setAttribute('d', `M${sx.toFixed(1)} ${(gy - ancho).toFixed(1)}L${punta.toFixed(1)} ${gy.toFixed(1)}L${sx.toFixed(1)} ${(gy + ancho).toFixed(1)}Z`);
}
setInterval(() => { if (document.visibilityState === 'visible') colocarReloj(); }, 300_000);

/** Tras una venta (idea 40): la última monedita del lago cae desde arriba y se queda brillando en el fondo. */
export function hundirMoneda() {
  const m = [...document.querySelectorAll('.lago-moneda')].at(-1);
  if (!m) return;
  m.classList.remove('hunde'); void m.getBoundingClientRect(); m.classList.add('hunde');
  setTimeout(() => m.classList.remove('hunde'), 2200);
}
