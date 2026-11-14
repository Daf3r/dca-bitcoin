// Piezas ilustradas de la escena (campamento 12): funciones puras que devuelven trozos de SVG como texto. No miran el DOM ni
// llaman a `rnd()`: todo son puntos fijos que crecen con la escena, así que la forma de la montaña no cambia. Los colores los
// pone el CSS (siguen a la hora y al tema); la visibilidad de lo de temporada la deciden los atributos que deja cielo.js en
// <html> (`data-fiesta`, `data-epoca`, `data-cohetes`): la escena lo dibuja siempre y el CSS lo muestra solo cuando toca.

const f1 = (n) => n.toFixed(1);
const lin = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');

// ---------------------------------------------------------------- volcanes de Occidente (sierra lejana)
// Perfiles en unidades de la altura del Santa Ana (x: anchos; y: alturas; 0 es el pie). Están dibujados a mano a partir de
// fotos: el Santa Ana (Ilamatepec), ancho y con la cima truncada por su cráter; el Cerro Verde, una loma redonda; el Izalco,
// un cono casi perfecto de ceniza con la punta roma; y el Quetzaltepec (volcán de San Salvador), un macizo con El Picacho a un
// lado y la caldera del Boquerón como una meseta con su muesca.
const PERFILES = {
  'santa-ana': [[-3.3, 0], [-2.5, 0.13], [-1.8, 0.33], [-1.25, 0.56], [-0.82, 0.78], [-0.55, 0.93], [-0.42, 0.99], [-0.3, 0.97], [-0.2, 0.93],
    [0.12, 0.92], [0.24, 0.96], [0.38, 1.01], [0.52, 0.97], [0.85, 0.8], [1.35, 0.56], [2.05, 0.31], [2.85, 0.11], [3.6, 0]],
  'cerro-verde': [[-1.25, 0], [-0.85, 0.24], [-0.45, 0.41], [0, 0.47], [0.45, 0.41], [0.85, 0.24], [1.25, 0]],
  izalco: [[-1.35, 0], [-1, 0.19], [-0.65, 0.42], [-0.34, 0.65], [-0.13, 0.78], [-0.06, 0.8], [0.02, 0.775], [0.08, 0.795], [0.14, 0.78],
    [0.35, 0.65], [0.66, 0.42], [1, 0.19], [1.35, 0]],
  'san-salvador': [[-3.4, 0], [-2.5, 0.16], [-1.8, 0.38], [-1.3, 0.6], [-1, 0.75], [-0.8, 0.86], [-0.7, 0.885], [-0.58, 0.83], [-0.4, 0.785],
    [-0.1, 0.775], [0.02, 0.735], [0.16, 0.735], [0.28, 0.775], [0.62, 0.785], [0.73, 0.81], [0.9, 0.72], [1.3, 0.55], [2, 0.32], [2.7, 0.13], [3.5, 0]],
};
/** Altura de un perfil (en unidades) a `d` unidades de su centro. */
function alturaPerfil(pts, d) {
  if (d <= pts[0][0] || d >= pts[pts.length - 1][0]) return 0;
  for (let i = 1; i < pts.length; i++) {
    if (d <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (d - x0)) / (x1 - x0); }
  }
  return 0;
}

/**
 * La cadena volcánica de Occidente como sierra lejana: el Izalco, el Cerro Verde y el Santa Ana a la izquierda y el volcán de
 * San Salvador a la derecha (los lados de la escena, donde la montaña principal deja ver el horizonte). `suelo` es la línea
 * base y `lado` de qué lado está el astro (1 a la derecha): ese flanco de cada cumbre lleva un filo de luz. Devuelve la silueta
 * (una sola pieza, con el degradado de la perspectiva atmosférica), el cono del Izalco por delante (más oscuro: es ceniza) y
 * los filos de luz.
 */
export function volcanes(W, H, suelo, lado = 1) {
  const A = Math.min(H * 0.11, W * (W < 700 ? 0.14 : 0.1)); // la altura del Santa Ana: crece con la escena, sin volverse una aguja en el teléfono
  const iz = W * 0.02 + 1.35 * A;
  const sitios = W < 700
    ? { izalco: iz, 'cerro-verde': iz + 1.2 * A, 'santa-ana': iz + 2.5 * A, 'san-salvador': W - 0.4 * A }
    : { izalco: iz, 'cerro-verde': iz + 1.2 * A, 'santa-ana': iz + 2.5 * A, 'san-salvador': W * 0.88 };
  const nombres = Object.keys(sitios);
  const altura = (n, x) => alturaPerfil(PERFILES[n], (x - sitios[n]) / A) * A;
  // Entre los volcanes, lomas bajas de la cordillera (ondas fijas).
  const loma = (x) => A * (0.1 + 0.045 * Math.sin(x / (W / 6.5) + 1.1) + 0.025 * Math.sin(x / (W / 17) + 0.4));
  const paso = Math.max(2, W / 360);
  const pts = [];
  const quien = [];
  for (let x = -paso; x <= W + paso; x += paso) {
    let h = loma(x), n = '';
    for (const k of nombres) { const v = altura(k, x); if (v > h) { h = v; n = k; } }
    pts.push([x, suelo - h]);
    quien.push(n);
  }
  const silueta = `M${f1(-paso)} ${f1(H)}${pts.map(([x, y]) => `L${f1(x)} ${f1(y)}`).join('')}L${f1(W + paso)} ${f1(H)}Z`;
  // El cono del Izalco por delante: su ceniza oscura llega hasta media ladera (se recorta por abajo con un degradado del CSS).
  const izPts = PERFILES.izalco.map(([d, h]) => [sitios.izalco + d * A, suelo - h * A]);
  const cono = `${lin(izPts)}Z`;
  // Filos de luz: el flanco que mira al astro de cada cumbre, solo donde ese volcán es el que se ve (no por encima de otro).
  let filos = '';
  for (const k of ['santa-ana', 'izalco', 'san-salvador']) {
    const tramo = pts.filter(([x], i) => quien[i] === k && (x - sitios[k]) * lado > -0.05 * A && (x - sitios[k]) * lado < 1.6 * A);
    if (tramo.length > 2) filos += lin(tramo);
  }
  return `<path class="lejos" d="${silueta}" fill="url(#m-lejos)" data-volcanes="${nombres.join(' ')}"/>`
    + `<path class="volcan-ceniza" d="${cono}"/><path class="volcan-filo" d="${filos}"/>`;
}

// ---------------------------------------------------------------- torogoz
/**
 * Un torogoz (Eumomota superciliosa, el ave nacional) que cruza el cielo al amanecer: de perfil, mirando a la derecha, con su
 * cuerpo verde, la ceja turquesa, el antifaz negro, el vientre canela y la cola larga de raquetas. Aletea a ratos y planea
 * (el CSS anima el ala con `scaleY` y el vuelo con `transform`). Solo con todos los efectos.
 */
export function torogoz(y, k = 1) {
  return `<g transform="translate(0 ${f1(y)})"><g class="efecto-ambiente ave torogoz"><g class="toro-bota"><g transform="scale(${f1(k * 1.15)})">`
    // La cola: las plumas cortas, las varillas desnudas y las dos raquetas de la punta.
    + '<path class="toro-cola" d="M-5.5 0.4L-13 1.2L-12.4 2.7L-5.2 1.9Z"/>'
    + '<path class="toro-varilla" d="M-12.5 1.6L-22.5 3.1M-12.4 2.2L-21.8 4.9"/>'
    + '<path class="toro-raqueta" d="M-21.3 2.9C-22.6 1.7-25 1.9-26.2 3.2C-25 4.1-22.6 4.1-21.3 2.9ZM-20.7 4.7C-21.8 3.8-24 4.3-25 5.7C-23.7 6.4-21.6 6-20.7 4.7Z"/>'
    // El ala de atrás (más oscura) y el cuerpo con su vientre canela.
    + '<path class="toro-ala toro-ala-lejos" d="M2.2 -1.3C0.4 -4.4 -2.2 -7 -5.2 -8.4C-3.6 -5.6 -2.6 -3 -2.2 -0.6Z"/>'
    + '<path class="toro-cuerpo" d="M7.6 -1.6C5.6 -3.6 -1.4 -3.2 -6 0.3C-1.6 2.9 4.6 3 7.6 1.1Z"/>'
    + '<path class="toro-vientre" d="M6.2 1.2C3 2.7 -1.6 2.5 -5 0.9C-1.3 1.5 2.8 1.3 6.2 1.2Z"/>'
    // La cabeza, el pico curvo, el antifaz y la ceja turquesa que le da nombre.
    + '<circle class="toro-cuerpo" cx="7.7" cy="-0.4" r="2.7"/>'
    + '<path class="toro-pico" d="M10 -0.9C11.6 -0.9 13 -0.3 14 0.9C12.6 0.5 11.2 0.6 10 0.8Z"/>'
    + '<path class="toro-antifaz" d="M5.6 -0.5L10.2 -0.3"/>'
    + '<path class="toro-ceja" d="M5.5 -1.9Q7.8 -3.3 10.1 -1.7"/>'
    // El ala de delante: verde arriba y turquesa en las plumas de vuelo.
    + '<path class="toro-ala" d="M3.6 -1C1.6 -5 -1.6 -8.6 -5.6 -10.6C-4 -6.8 -2.6 -3.4 -1.8 -0.2Z"/>'
    + '</g></g></g></g>';
}

// ---------------------------------------------------------------- papel picado
// Cifras de esténcil (como las que se recortan en el papel): siete segmentos con puentes entre ellos. Caja de 5 × 8.
const SEGMENTOS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function cifraCalada(c, x0, y0, u) {
  const t = 1.35, w = 5, h = 8, g = 0.32; // grueso, ancho, alto y puente (en unidades)
  const v = (h - 3 * t) / 2;
  const R = { a: [0, 0, w, t], g: [0, (h - t) / 2, w, t], d: [0, h - t, w, t], f: [0, t, t, v], b: [w - t, t, t, v], e: [0, (h + t) / 2, t, v], c: [w - t, (h + t) / 2, t, v] };
  return [...(SEGMENTOS[c] ?? '')].map((s) => {
    let [x, y, ww, hh] = R[s];
    if (ww > hh) { x += g; ww -= 2 * g; } else { y += g; hh -= 2 * g; }
    const X = x0 + x * u, Y = y0 + y * u;
    return `M${f1(X)} ${f1(Y)}h${f1(ww * u)}v${f1(hh * u)}h${f1(-ww * u)}Z`;
  }).join('');
}
/** La silueta de la montaña del logo (la misma de la marca), como calado. */
function montanaCalada(cx, cy, u) {
  const p = [[1.5, 16.5], [9, 3.5], [13, 10], [16, 6], [22.5, 16.5]].map(([x, y]) => [cx + (x - 12) * u * 0.36, cy + (y - 10) * u * 0.36]);
  return `${lin(p)}Z`;
}

/**
 * Una tira de papel picado (fiestas agostinas, patrias y navidad): seis banderitas colgadas de un cordel entre dos estacas.
 * Las de los extremos llevan calada la silueta de la montaña y las cuatro del centro, una cifra del año cada una. Los
 * colores los da el CSS según `html[data-fiesta]`; oculta el resto del año.
 */
export function papelPicado(x1, x2, y, anio, k = 1) {
  const cifras = String(anio).slice(-4).split('');
  const motivos = ['m', ...cifras, 'm'];
  const n = motivos.length;
  const fw = 15 * k, fh = 19 * k, u = fw / 12;
  const comba = Math.min(14, (x2 - x1) * 0.06);
  const yc = (t) => y + comba * 4 * t * (1 - t); // el cordel cuelga (parábola)
  let s = `<g class="papel-picado" aria-hidden="true"><path class="pp-estaca" d="M${f1(x1)} ${f1(y - 3)}V${f1(y + 34 * k)}M${f1(x2)} ${f1(y - 3)}V${f1(y + 34 * k)}"/>`;
  s += `<path class="pp-cordel" d="M${f1(x1)} ${f1(y)}Q${f1((x1 + x2) / 2)} ${f1(y + comba * 2)} ${f1(x2)} ${f1(y)}"/>`;
  let doblez = '';
  motivos.forEach((m, i) => {
    const t = (i + 0.5) / n, cx = x1 + (x2 - x1) * t, top = yc(t);
    const l = cx - fw / 2, r = cx + fw / 2, b = top + fh;
    // El borde de abajo, en picos; un ribete de tres triángulos calados arriba del borde.
    const picos = [0, 1, 2, 3, 4].map((j) => `L${f1(r - (j + 0.5) * (fw / 5))} ${f1(b - (j % 2 ? 0 : 1.6 * u))}`).join('');
    let d = `M${f1(l)} ${f1(top)}L${f1(r)} ${f1(top)}L${f1(r)} ${f1(b - 1.6 * u)}${picos}L${f1(l)} ${f1(b - 1.6 * u)}Z`;
    const yr = b - 3.6 * u;
    for (const dx of [-3.2, 0, 3.2]) d += `M${f1(cx + dx * u - 0.9 * u)} ${f1(yr)}L${f1(cx + dx * u + 0.9 * u)} ${f1(yr)}L${f1(cx + dx * u)} ${f1(yr + 1.2 * u)}Z`;
    d += m === 'm' ? montanaCalada(cx, top + 7.6 * u, u) : cifraCalada(m, cx - 2.5 * u, top + 2.2 * u, u * 1.02);
    s += `<g class="pp-bandera pp-c${i % 3}"><path fill-rule="evenodd" d="${d}"/></g>`;
    doblez += `M${f1(l)} ${f1(top)}h${f1(fw)}v${f1(1.2 * u)}h${f1(-fw)}Z`;
  });
  return `${s}<path class="pp-doblez" d="${doblez}"/></g>`;
}

// ---------------------------------------------------------------- cohetes de fin de año
/**
 * Cohetes del 31 de diciembre a medianoche: dos volcancitos (fuentes de chispas que saltan del suelo) y dos silbadores que
 * suben en zigzag y revientan arriba. Cada pieza es una forma fija; el CSS la mueve (solo transform y opacity) y le da su
 * retraso con `:nth-child`. Solo con `html[data-cohetes]` y todos los efectos.
 */
export function cohetes(W, H, suelo, k = 1) {
  const volcancito = (x) => `<g class="volcancito" transform="translate(${f1(x)} ${f1(suelo)}) scale(${f1(k)})"><path class="vc-cono" d="M-3 0L-1.4 -6H1.4L3 0Z"/>`
    + `<g class="vc-chispas" transform="translate(0 -6)">${'<circle class="chispa" r="1.1"/>'.repeat(5)}</g></g>`;
  const silbador = (x, alto) => `<g class="silbador" transform="translate(${f1(x)} ${f1(suelo)})"><g class="sb-sube"><path class="sb-estela" d="M0 0V9"/><circle class="sb-cabeza" r="1.5"/></g>`
    + `<g transform="translate(0 ${f1(-alto)})"><g class="sb-estallido"><path d="M0 -9V-4M0 4V9M-9 0H-4M4 0H9M-6.4 -6.4L-3 -3M3 3L6.4 6.4M-6.4 6.4L-3 3M3 -3L6.4 -6.4"/><circle r="12"/></g></g></g>`;
  const alto = Math.min(H * 0.22, 170);
  return `<g class="efecto-ambiente cohetes" aria-hidden="true">${volcancito(W * 0.22)}${volcancito(W * 0.71)}${silbador(W * 0.38, alto)}${silbador(W * 0.86, alto * 0.82)}</g>`;
}

// ---------------------------------------------------------------- clima
/**
 * Época lluviosa (mayo a octubre), por la tarde: una nube cargada y una llovizna fina de 20 gotas que cae de vez en cuando
 * detrás de la montaña. Época seca: un aire dorado muy leve sobre el horizonte. Las dos son ambiente (solo con todos los
 * efectos) y el CSS decide cuál se ve por `html[data-epoca]` y la franja del día.
 */
export function clima(W, H, yH) {
  const cx = W * 0.17, cy = H * 0.46, k = Math.max(0.9, Math.min(1.6, W / 500));
  const p = (dx, dy) => `${f1(cx + dx * k)} ${f1(cy + dy * k)}`;
  const nube = `M${p(-70, 0)}C${p(-80, 0)} ${p(-78, -12)} ${p(-62, -13)}C${p(-60, -28)} ${p(-34, -32)} ${p(-24, -20)}C${p(-16, -38)} ${p(16, -40)} ${p(22, -22)}`
    + `C${p(34, -30)} ${p(56, -24)} ${p(54, -11)}C${p(72, -12)} ${p(78, 0)} ${p(64, 0)}Z`;
  let gotas = '';
  for (let i = 0; i < 20; i++) {
    const x = cx + (-62 + ((i * 37) % 120)) * k, y = cy + (2 + ((i * 13) % 9)) * k;
    gotas += `<path class="gota" d="M${f1(x)} ${f1(y)}l-1.6 7"/>`;
  }
  return `<g class="efecto-ambiente clima-lluvia" aria-hidden="true"><path class="nube-cargada" d="${nube}"/><g class="gotas">${gotas}</g></g>`
    + `<rect class="efecto-ambiente aire-seco" x="0" y="${f1((yH - 0.2) * H)}" width="${W}" height="${f1(H * 0.32)}" fill="url(#m-aire)"/>`;
}

// ---------------------------------------------------------------- árboles de honor
/** Una copa de lóbulos (como un cúmulo): `n` lomos alrededor de una elipse. Puntos fijos, sin azar. */
function lobos(cx, cy, rx, ry, n, k = 0.3, fase = 0) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = fase + (i / n) * Math.PI * 2, x = cx + Math.cos(t) * rx, y = cy + Math.sin(t) * ry;
    if (!i) { d = `M${f1(x)} ${f1(y)}`; continue; }
    const tm = fase + ((i - 0.5) / n) * Math.PI * 2, o = 1 + k * (0.8 + 0.4 * ((i * 7) % 3) / 2);
    d += `Q${f1(cx + Math.cos(tm) * rx * o)} ${f1(cy + Math.sin(tm) * ry * o)} ${f1(x)} ${f1(y)}`;
  }
  return `${d}Z`;
}

/**
 * Los árboles de honor con su carácter. `L` es de qué lado viene la luz (1 = desde la derecha): la copa se aclara de ese lado
 * y se oscurece por debajo; el tronco lleva su lado en sombra. Cada uno, menos de 12 piezas.
 * - Ceibo (compra 100): tronco recto y gris con aletones en la base y la copa en sombrilla, en pisos anchos y planos.
 * - Amate (500): tronco grueso y retorcido que se abre en ramas, raíces aéreas y una copa enorme y redonda.
 * - Maquilishuat (1,000): tronco esbelto que se abre en «V» y una copa rala de racimos rosados, con flores caídas al pie.
 */
export function arbolHonor(tipo, x, yb, h, L = 1) {
  const sh = (d) => `<path class="tronco-sombra" d="${d}"/>`;
  if (tipo === 'ceibo') {
    const t = h * 0.045, yt = yb - h * 0.66;
    const tronco = `M${f1(x - t * 4)} ${f1(yb)}Q${f1(x - t * 1.3)} ${f1(yb - h * 0.03)} ${f1(x - t * 1.1)} ${f1(yb - h * 0.17)}L${f1(x - t * 0.8)} ${f1(yt)}L${f1(x + t * 0.8)} ${f1(yt)}L${f1(x + t * 1.1)} ${f1(yb - h * 0.17)}Q${f1(x + t * 1.3)} ${f1(yb - h * 0.03)} ${f1(x + t * 4)} ${f1(yb)}Z`;
    // Los aletones: dos cuchillas de raíz que se ven de frente, con su cara en sombra.
    const aletas = `M${f1(x - t * 0.2)} ${f1(yb)}L${f1(x - t * 0.5)} ${f1(yb - h * 0.13)}L${f1(x + t * 0.4)} ${f1(yb)}ZM${f1(x - L * t * 2.6)} ${f1(yb)}Q${f1(x - L * t * 1.2)} ${f1(yb - h * 0.02)} ${f1(x - L * t * 0.9)} ${f1(yb - h * 0.14)}L${f1(x - L * t * 0.2)} ${f1(yb - h * 0.2)}L${f1(x)} ${f1(yt)}L${f1(x - L * t * 0.8)} ${f1(yt)}L${f1(x - L * t * 1.1)} ${f1(yb - h * 0.17)}Q${f1(x - L * t * 1.3)} ${f1(yb - h * 0.03)} ${f1(x - L * t * 4)} ${f1(yb)}Z`;
    const ramas = `M${f1(x)} ${f1(yt + 2)}Q${f1(x - h * 0.1)} ${f1(yt - h * 0.06)} ${f1(x - h * 0.4)} ${f1(yt - h * 0.07)}M${f1(x)} ${f1(yt + 2)}Q${f1(x + h * 0.12)} ${f1(yt - h * 0.05)} ${f1(x + h * 0.42)} ${f1(yt - h * 0.09)}M${f1(x)} ${f1(yt)}L${f1(x + L * h * 0.03)} ${f1(yt - h * 0.18)}`;
    // Dos pisos de copa: anchos, planos y de borde ondulado (la sombrilla del ceibo).
    const p1 = [x, yb - h * 0.75, h * 0.56, h * 0.075], p2 = [x - L * h * 0.05, yb - h * 0.875, h * 0.36, h * 0.07];
    const copa = lobos(...p1, 11, 0.42, 0.2) + lobos(...p2, 9, 0.42, 0.5);
    const sombra = lobos(p1[0], p1[2] * 0 + p1[1] + h * 0.03, p1[2] * 0.96, p1[3] * 0.8, 11, 0.3, 0.1) + lobos(p2[0], p2[1] + h * 0.028, p2[2] * 0.94, p2[3] * 0.8, 9, 0.3, 0.4);
    const luz = lobos(p1[0] + L * h * 0.12, p1[1] - h * 0.022, p1[2] * 0.55, p1[3] * 0.55, 7, 0.35, 0.3) + lobos(p2[0] + L * h * 0.07, p2[1] - h * 0.02, p2[2] * 0.55, p2[3] * 0.55, 6, 0.35, 0.6);
    return `<path class="tronco" d="${tronco}"/>${sh(aletas)}<path class="rama" d="${ramas}"/><path class="copa-sombra" d="${sombra}"/><path class="copa" d="${copa}"/><path class="copa-luz" d="${luz}"/>`;
  }
  if (tipo === 'amate') {
    const t = h * 0.075;
    // Un tronco corto y macizo que se retuerce y se abre en tres brazos, con las raíces que se agarran al suelo.
    const tronco = `M${f1(x - t * 2.4)} ${f1(yb)}C${f1(x - t * 0.9)} ${f1(yb - h * 0.05)} ${f1(x - t * 1.6)} ${f1(yb - h * 0.2)} ${f1(x - t * 0.7)} ${f1(yb - h * 0.33)}`
      + `C${f1(x - t * 1.6)} ${f1(yb - h * 0.42)} ${f1(x - t * 2.6)} ${f1(yb - h * 0.47)} ${f1(x - t * 3.2)} ${f1(yb - h * 0.55)}L${f1(x - t * 2.3)} ${f1(yb - h * 0.57)}`
      + `C${f1(x - t * 1.4)} ${f1(yb - h * 0.5)} ${f1(x - t * 0.6)} ${f1(yb - h * 0.47)} ${f1(x - t * 0.1)} ${f1(yb - h * 0.6)}L${f1(x + t * 0.8)} ${f1(yb - h * 0.6)}`
      + `C${f1(x + t * 0.9)} ${f1(yb - h * 0.5)} ${f1(x + t * 1.8)} ${f1(yb - h * 0.48)} ${f1(x + t * 3)} ${f1(yb - h * 0.54)}L${f1(x + t * 3.4)} ${f1(yb - h * 0.49)}`
      + `C${f1(x + t * 2)} ${f1(yb - h * 0.42)} ${f1(x + t * 0.9)} ${f1(yb - h * 0.36)} ${f1(x + t * 1.1)} ${f1(yb - h * 0.25)}C${f1(x + t * 1.3)} ${f1(yb - h * 0.12)} ${f1(x + t * 0.8)} ${f1(yb - h * 0.04)} ${f1(x + t * 2.6)} ${f1(yb)}Z`;
    // La torsión: una franja de sombra en espiral sobre el lado contrario a la luz.
    const giro = `M${f1(x - L * t * 0.2)} ${f1(yb)}C${f1(x - L * t * 1.4)} ${f1(yb - h * 0.08)} ${f1(x + L * t * 0.2)} ${f1(yb - h * 0.2)} ${f1(x - L * t * 0.5)} ${f1(yb - h * 0.34)}L${f1(x - L * t * 0.9)} ${f1(yb - h * 0.3)}C${f1(x - L * t * 0.6)} ${f1(yb - h * 0.2)} ${f1(x - L * t * 1.8)} ${f1(yb - h * 0.1)} ${f1(x - L * t * 1.8)} ${f1(yb)}Z`;
    const raices = `M${f1(x - h * 0.3)} ${f1(yb - h * 0.46)}V${f1(yb - h * 0.2)}M${f1(x - h * 0.22)} ${f1(yb - h * 0.44)}V${f1(yb - h * 0.29)}M${f1(x + h * 0.27)} ${f1(yb - h * 0.45)}V${f1(yb - h * 0.24)}`;
    const cy = yb - h * 0.66, rx = h * 0.6, ry = h * 0.34;
    const copa = lobos(x, cy, rx, ry, 13, 0.2, 0.15);
    const sombra = lobos(x - L * h * 0.03, cy + h * 0.09, rx * 0.92, ry * 0.7, 11, 0.2, 0.3);
    const luz = lobos(x + L * rx * 0.25, cy - ry * 0.3, rx * 0.5, ry * 0.5, 9, 0.24, 0.1) + lobos(x - L * rx * 0.35, cy - ry * 0.45, rx * 0.22, ry * 0.25, 6, 0.3, 0.4);
    return `<path class="rama raiz" d="${raices}"/><path class="tronco" d="${tronco}"/>${sh(giro)}<path class="copa-sombra" d="${sombra}"/><path class="copa" d="${copa}"/><path class="copa-luz" d="${luz}"/>`;
  }
  // Maquilishuat: el tronco esbelto, sus tres brazos y los racimos de flor con huecos entre ellos.
  const t = h * 0.028, yr = yb - h * 0.4;
  const tronco = `M${f1(x - t * 1.6)} ${f1(yb)}L${f1(x - t)} ${f1(yr)}L${f1(x + t)} ${f1(yr)}L${f1(x + t * 1.6)} ${f1(yb)}Z`;
  const racimos = [[-0.24, 0.66, 0.13], [0.22, 0.7, 0.12], [-0.04, 0.84, 0.15], [0.27, 0.9, 0.09], [-0.3, 0.88, 0.09], [0.07, 0.99, 0.08]];
  const brazos = racimos.slice(0, 5).map(([dx, dy]) => `M${f1(x)} ${f1(yr + 1)}Q${f1(x + dx * h * 0.25)} ${f1(yb - h * (dy * 0.65))} ${f1(x + dx * h * 0.85)} ${f1(yb - h * (dy - 0.02))}`).join('');
  const copa = racimos.map(([dx, dy, r], i) => lobos(x + dx * h, yb - dy * h, r * h, r * h * 0.78, 7, 0.32, i * 0.7)).join('');
  const sombra = racimos.map(([dx, dy, r], i) => lobos(x + dx * h - L * r * h * 0.1, yb - dy * h + r * h * 0.32, r * h * 0.86, r * h * 0.55, 6, 0.3, i)).join('');
  const luz = racimos.map(([dx, dy, r], i) => lobos(x + dx * h + L * r * h * 0.32, yb - dy * h - r * h * 0.3, r * h * 0.42, r * h * 0.32, 5, 0.35, i * 0.4)).join('');
  // Flores caídas al pie: una alfombra rosa, más tupida bajo la copa.
  const caidas = [-0.34, -0.22, -0.12, -0.02, 0.09, 0.18, 0.3, 0.4].map((dx, i) => `M${f1(x + dx * h)} ${f1(yb - 1 - (i % 3) * 1.2)}a${f1(h * 0.022)} ${f1(h * 0.012)} 0 1 0 0.1 0Z`).join('');
  return `<path class="tronco" d="${tronco}"/>${sh(`M${f1(x + L * t * 0.1)} ${f1(yb)}L${f1(x + L * t * 0.05)} ${f1(yr)}L${f1(x - L * t)} ${f1(yr)}L${f1(x - L * t * 1.6)} ${f1(yb)}Z`)}<path class="rama" d="${brazos}"/>`
    + `<path class="copa-sombra" d="${sombra}"/><path class="copa" d="${copa}"/><path class="copa-luz" d="${luz}"/><path class="flores-caidas" d="${caidas}"/>`;
}

// ---------------------------------------------------------------- la luna-moneda
/**
 * La moneda ₿ que sale de la luna: un canto (el grosor que se ve de lado), la cara con su borde en relieve y el signo con sus
 * dos barritas arriba y abajo, grabado (una sombra debajo y el trazo claro encima), y un brillo que la cruza al terminar de girar.
 * En unidades del radio de la luna.
 */
export function monedaB(cx, cy, r, id = 'm-moneda-c') {
  const signo = 'M-0.28 -0.5V0.5M-0.28 -0.5H0.08C0.42 -0.5 0.42 -0.03 0.08 -0.03H-0.28M0.08 -0.03H0.16C0.52 -0.03 0.52 0.5 0.16 0.5H-0.28'
    + 'M-0.12 -0.66V-0.5M0.08 -0.66V-0.5M-0.12 0.5V0.66M0.08 0.5V0.66';
  return `<g class="moneda-b" transform="translate(${f1(cx)} ${f1(cy)}) scale(${f1(r)})"><g class="moneda-gira">`
    + `<defs><clipPath id="${id}"><circle r="0.92"/></clipPath></defs>`
    + '<circle class="moneda-canto" cx="0.07" r="0.98"/><circle class="moneda-disco" r="0.96"/><circle class="moneda-cara" r="0.82"/>'
    + '<circle class="moneda-relieve" r="0.74"/>'
    + `<path class="moneda-grabado" transform="translate(0.035 0.045)" d="${signo}"/><path class="moneda-signo" d="${signo}"/>`
    + `<g clip-path="url(#${id})"><path class="moneda-brillo" d="M-0.5 -1.2L-0.2 -1.2L-0.9 1.2L-1.2 1.2Z"/></g></g></g>`;
}
