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
  const A = Math.min(H * (W < 1100 ? 0.11 : 0.12), W * (W < 700 ? 0.14 : 0.1)); // la altura del Santa Ana: crece con la escena, sin volverse una aguja en el teléfono
  // Dónde va cada uno: en los lados que la montaña deja libres. En el teléfono y la tablet, el Izalco a la izquierda y el Santa Ana
  // asomando por la derecha; en escritorio, el volcán de San Salvador a la izquierda y el grupo de Santa Ana a la derecha, junto al sol.
  const sitios = W < 1100
    ? { izalco: W * 0.02 + 1.35 * A, 'cerro-verde': W - 1.5 * A, 'santa-ana': W - 0.25 * A }
    : { 'san-salvador': W * 0.1, 'santa-ana': W * 0.74, 'cerro-verde': W * 0.74 + 1.25 * A, izalco: W * 0.74 + 2.35 * A };
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
  for (const k of nombres.filter((n) => n !== 'cerro-verde' && sitios[n] > W * 0.05 && sitios[n] < W * 0.95)) {
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
    + '<path class="toro-varilla" d="M-12.5 1.5L-21.4 2.9M-12.4 2.1L-21.2 3.9"/>'
    + '<path class="toro-raqueta" d="M-21 2.6C-22.4 1.6-24.6 1.8-26 3.1C-24.6 4.1-22.4 3.9-21 2.6ZM-20.8 3.8C-22.2 3-24.3 3.3-25.6 4.6C-24.2 5.4-22.1 5.1-20.8 3.8Z"/>'
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
/** La silueta de la montaña del logo (la misma de la marca), como calado. */
function montanaCalada(cx, cy, u) {
  const p = [[1.5, 16.5], [9, 3.5], [13, 10], [16, 6], [22.5, 16.5]].map(([x, y]) => [cx + (x - 12) * u * 0.4, cy + (y - 10) * u * 0.4]);
  return `${lin(p)}Z`;
}

/**
 * Una tira de papel picado (fiestas agostinas, patrias y navidad): seis banderitas de papel de china colgadas de un cordel
 * entre dos estacas. Cada una tiene su doblez arriba, un borde de picos, una hilera de rombos calados y, en el centro, la
 * silueta de la montaña (las de los extremos) o una cifra del año (las cuatro del centro). Las cifras se calan con una máscara
 * (letra de las cifras de la app); como la máscara va en el espacio de cada banderita, se mueve con ella al ondear.
 * Los colores los da el CSS según `html[data-fiesta]`; el resto del año está oculta.
 */
export function papelPicado(x1, x2, y, anio, k = 1, estacas = true, id = 'm-pp') {
  const cifras = String(anio).slice(-4).split('');
  const motivos = ['m', ...cifras, 'm'];
  const n = motivos.length;
  const paso = (x2 - x1) / n;
  const fw = Math.min(paso * 0.86, 17 * k), fh = fw * 1.3, u = fw / 12;
  const comba = Math.min(12 * k, (x2 - x1) * 0.05);
  const yc = (t) => y + comba * 4 * t * (1 - t); // el cordel cuelga (parábola)
  let banderas = '', cifrasMask = '';
  motivos.forEach((m, i) => {
    const t = (i + 0.5) / n, cx = x1 + (x2 - x1) * t, top = yc(t) + 0.6 * u;
    const l = cx - fw / 2, r = cx + fw / 2, b = top + fh;
    // Borde de abajo en ondas (cinco picos redondeados).
    let d = `M${f1(l)} ${f1(top)}L${f1(r)} ${f1(top)}L${f1(r)} ${f1(b - 1.4 * u)}`;
    for (let j = 0; j < 4; j++) d += `Q${f1(r - (j + 0.5) * (fw / 4))} ${f1(b + 0.6 * u)} ${f1(r - (j + 1) * (fw / 4))} ${f1(b - 1.4 * u)}`;
    d += 'Z';
    // Hilera de rombos calados bajo el doblez y otra sobre el borde.
    for (const yy of [top + 2.4 * u, b - 3.2 * u]) for (const dx of [-3.6, -1.2, 1.2, 3.6]) d += `M${f1(cx + dx * u)} ${f1(yy - 0.75 * u)}l${f1(0.6 * u)} ${f1(0.75 * u)}l${f1(-0.6 * u)} ${f1(0.75 * u)}l${f1(-0.6 * u)} ${f1(-0.75 * u)}Z`;
    if (m === 'm') d += montanaCalada(cx, top + 7.6 * u, u);
    else cifrasMask += `<text class="pp-cifra" x="${f1(cx)}" y="${f1(top + 11.1 * u)}" font-size="${f1(9.4 * u)}" text-anchor="middle">${m}</text>`;
    banderas += `<g class="pp-bandera pp-c${i % 3}"><path fill-rule="evenodd" mask="url(#${id})" d="${d}"/><path class="pp-doblez" d="M${f1(l)} ${f1(top)}h${f1(fw)}v${f1(1.1 * u)}h${f1(-fw)}Z"/></g>`;
  });
  const alto = 30 * k + comba * 2;
  const mask = `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f1(x1 - 20)}" y="${f1(y - 40)}" width="${f1(x2 - x1 + 40)}" height="${f1(alto + 80)}"><rect x="${f1(x1 - 20)}" y="${f1(y - 40)}" width="${f1(x2 - x1 + 40)}" height="${f1(alto + 80)}" fill="#fff"/>${cifrasMask}</mask>`;
  return `<g class="papel-picado" aria-hidden="true"><defs>${mask}</defs>${estacas ? `<path class="pp-estaca" d="M${f1(x1)} ${f1(y - 3)}V${f1(y + 30 * k)}M${f1(x2)} ${f1(y - 3)}V${f1(y + 30 * k)}"/>` : ''}`
    + `<path class="pp-cordel" d="M${f1(x1)} ${f1(y)}Q${f1((x1 + x2) / 2)} ${f1(y + comba * 2)} ${f1(x2)} ${f1(y)}"/>${banderas}</g>`;
}

// ---------------------------------------------------------------- cohetes de fin de año
/**
 * Cohetes del 31 de diciembre a medianoche: dos volcancitos (fuentes de chispas que saltan del suelo) y dos silbadores que
 * suben en zigzag y revientan arriba. Cada pieza es una forma fija; el CSS la mueve (solo transform y opacity) y le da su
 * retraso con `:nth-child`. Solo con `html[data-cohetes]` y todos los efectos.
 */
export function cohetes(W, suelo, k = 1, alto = 140) {
  const volcancito = (x) => `<g class="volcancito" transform="translate(${f1(x)} ${f1(suelo)}) scale(${f1(k)})"><path class="vc-cono" d="M-3.4 0L-1.5 -7H1.5L3.4 0Z"/><path class="vc-banda" d="M-2.6 -3H2.6"/>`
    + `<g class="vc-chispas" transform="translate(0 -7)">${'<circle class="chispa" r="1.3"/>'.repeat(5)}</g></g>`;
  const silbador = (x, a) => `<g class="silbador" transform="translate(${f1(x)} ${f1(suelo)})"><g class="sb-sube"><path class="sb-estela" d="M0 0V12"/><circle class="sb-cabeza" r="1.8"/></g>`
    + `<g transform="translate(0 ${f1(-a)}) scale(${f1(k)})"><g class="sb-estallido"><path d="M0 -15V-6M0 6V15M-15 0H-6M6 0H15M-10.6 -10.6L-4.3 -4.3M4.3 4.3L10.6 10.6M-10.6 10.6L-4.3 4.3M4.3 -4.3L10.6 -10.6"/><circle r="19"/></g></g></g>`;
  return `<g class="efecto-ambiente cohetes" aria-hidden="true">${volcancito(W * 0.3)}${volcancito(W * 0.66)}${silbador(W * 0.12, alto)}${silbador(W * 0.88, alto * 0.82)}</g>`;
}

// ---------------------------------------------------------------- clima
/**
 * Época lluviosa (mayo a octubre), por la tarde: una nube cargada y una llovizna fina de 20 gotas que cae de vez en cuando
 * detrás de la montaña. Época seca: un aire dorado muy leve sobre el horizonte. Las dos son ambiente (solo con todos los
 * efectos) y el CSS decide cuál se ve por `html[data-epoca]` y la franja del día.
 */
export function clima(W, H, yH) {
  // En el teléfono y la tablet, a la izquierda (sobre el Izalco); en escritorio, a la derecha (sobre el Santa Ana): siempre en un cielo libre de texto.
  const cx = W < 1100 ? W * 0.17 : W * 0.88, cy = H * (W < 1100 ? 0.46 : 0.3), k = Math.max(0.9, Math.min(1.6, W / 500));
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
/**
 * Una copa facetada, en el mismo lenguaje que la roca de la montaña: un polígono irregular (radios fijos, sin azar) partido en
 * triángulos desde un vértice interior desplazado hacia la luz. Cada faceta toma el tono que le toca según hacia dónde mira su
 * borde: las que miran al astro van en luz, las de abajo y del otro lado en sombra; las aristas en luz llevan un filo. Devuelve
 * el contorno y tres trazos (luz, media luz y sombra), cada uno una sola pieza.
 */
function facetas(cx, cy, rx, ry, radios, L, giro = 0, acc = { base: '', luz: '', media: '', sombra: '', filo: '' }, abajo = 0.7) {
  const n = radios.length;
  // Dos anillos de vértices (el de fuera con radios irregulares fijos y uno interior a media distancia, girado medio paso) y la
  // cima: como una cúpula vista de frente. Por debajo la copa es más plana (`abajo`).
  const anillo = (k, d) => radios.map((r, i) => {
    const t = giro + ((i + d) / n) * Math.PI * 2 - Math.PI / 2, sy = Math.sin(t) > 0 ? abajo : 1;
    return [cx + Math.cos(t) * rx * r * k, cy + Math.sin(t) * ry * r * k * sy];
  });
  const v = anillo(1, 0), w = anillo(0.56, 0.5), P = [cx + L * rx * 0.08, cy - ry * 0.12];
  const lx = L * 0.55, ly = -0.62, lz = 0.56; // de dónde viene la luz (el astro, algo de frente)
  const tono = (pts, z) => {
    const mx = pts.reduce((s, p) => s + p[0], 0) / 3, my = pts.reduce((s, p) => s + p[1], 0) / 3;
    const dx = (mx - cx) / rx, dy = (my - cy) / ry;
    const d = dx * lx + dy * ly + z * lz;
    const tri = `M${f1(pts[0][0])} ${f1(pts[0][1])}L${f1(pts[1][0])} ${f1(pts[1][1])}L${f1(pts[2][0])} ${f1(pts[2][1])}Z`;
    if (d > 0.62) acc.luz += tri; else if (d > 0.4) acc.media += tri; else if (d < 0.08) acc.sombra += tri;
  };
  acc.base += `${lin(v)}Z`;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tono([w[i], v[i], v[j]], 0.25);
    tono([w[i], v[j], w[j]], 0.55);
    tono([P, w[i], w[j]], 0.85);
    // Filo de luz en el borde que mira al astro.
    const ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1], m = Math.hypot(ex, ey) || 1;
    if ((ey / m) * lx + (-ex / m) * ly > 0.5) acc.filo += `M${f1(v[i][0])} ${f1(v[i][1])}L${f1(v[j][0])} ${f1(v[j][1])}`;
  }
  return acc;
}
const copaSvg = (c) => `<path class="copa" d="${c.base}"/><path class="copa-media" d="${c.media}"/><path class="copa-luz" d="${c.luz}"/><path class="copa-sombra" d="${c.sombra}"/><path class="copa-filo" d="${c.filo}"/>`;

/**
 * Los árboles de honor, facetados como la montaña. `L` es de qué lado viene la luz (1 = desde la derecha).
 * - Ceibo (compra 100): tronco recto y gris con dos aletones en la base y la copa en sombrilla: dos pisos anchos y planos.
 * - Amate (500): tronco macizo que se tuerce y se abre en brazos, raíces aéreas y una copa enorme y redonda.
 * - Maquilishuat (1,000): tronco esbelto en «V» y racimos rosados como gemas; al pie, una alfombra de flores; con todos los
 *   efectos caen tres pétalos de vez en cuando.
 */
export function arbolHonor(tipo, x, yb, h, L = 1) {
  const sombraTronco = (d) => `<path class="tronco-sombra" d="${d}"/>`;
  if (tipo === 'ceibo') {
    const t = h * 0.05, yt = yb - h * 0.68;
    // Tronco con aletones: el lado en sombra es una faceta propia y cada aletón lleva su cara iluminada y su cara oscura.
    const tronco = lin([[x - t * 4.4, yb], [x - t * 1.2, yb - h * 0.16], [x - t * 0.75, yt], [x + t * 0.75, yt], [x + t * 1.2, yb - h * 0.16], [x + t * 4.4, yb]]) + 'Z';
    const oscura = lin([[x - L * t * 4.4, yb], [x - L * t * 1.2, yb - h * 0.16], [x - L * t * 0.75, yt], [x, yt], [x + L * t * 0.1, yb - h * 0.2], [x - L * t * 0.4, yb]]) + 'Z'
      + lin([[x + L * t * 0.7, yb], [x + L * t * 0.35, yb - h * 0.12], [x + L * t * 1.9, yb]]) + 'Z';
    const ramas = `M${f1(x)} ${f1(yt + 3)}L${f1(x - h * 0.2)} ${f1(yt - h * 0.06)}L${f1(x - h * 0.42)} ${f1(yt - h * 0.075)}M${f1(x)} ${f1(yt + 3)}L${f1(x + h * 0.22)} ${f1(yt - h * 0.05)}L${f1(x + h * 0.44)} ${f1(yt - h * 0.09)}M${f1(x)} ${f1(yt)}L${f1(x + L * h * 0.04)} ${f1(yt - h * 0.17)}`;
    const c = facetas(x, yb - h * 0.76, h * 0.6, h * 0.1, [1, 0.62, 0.95, 0.7, 1.05, 0.9, 1.25, 1.1, 1.3, 1.15, 1.25, 1.05], L, 0.1);
    facetas(x - L * h * 0.05, yb - h * 0.9, h * 0.38, h * 0.085, [1, 0.7, 1, 0.75, 1.1, 1, 1.25, 1.15, 1.2, 1.05], L, 0.3, c);
    return `<path class="tronco" d="${tronco}"/>${sombraTronco(oscura)}<path class="rama" d="${ramas}"/>${copaSvg(c)}`;
  }
  if (tipo === 'amate') {
    const t = h * 0.08;
    // Tronco corto y macizo que se tuerce: sus caras son facetas (la de la luz y la de la sombra se cruzan al subir).
    const tronco = lin([[x - t * 2.6, yb], [x - t * 1.1, yb - h * 0.1], [x - t * 1.2, yb - h * 0.3], [x - t * 3.4, yb - h * 0.52], [x - t * 2.3, yb - h * 0.56],
      [x - t * 0.3, yb - h * 0.42], [x + t * 0.2, yb - h * 0.58], [x + t * 1.2, yb - h * 0.58], [x + t * 0.9, yb - h * 0.44], [x + t * 3.1, yb - h * 0.52], [x + t * 3.5, yb - h * 0.46],
      [x + t * 1.3, yb - h * 0.3], [x + t * 1.1, yb - h * 0.1], [x + t * 2.8, yb]]) + 'Z';
    const giro = lin([[x - L * t * 2.6, yb], [x - L * t * 1.1, yb - h * 0.1], [x - L * t * 1.2, yb - h * 0.3], [x - L * t * 3.4, yb - h * 0.52], [x - L * t * 2.3, yb - h * 0.56],
      [x - L * t * 0.3, yb - h * 0.42], [x + L * t * 0.4, yb - h * 0.25], [x - L * t * 0.2, yb - h * 0.1], [x + L * t * 0.2, yb]]) + 'Z';
    const raices = `M${f1(x - h * 0.34)} ${f1(yb - h * 0.44)}V${f1(yb - h * 0.16)}M${f1(x - h * 0.25)} ${f1(yb - h * 0.42)}V${f1(yb - h * 0.27)}M${f1(x + h * 0.3)} ${f1(yb - h * 0.43)}V${f1(yb - h * 0.2)}M${f1(x + h * 0.38)} ${f1(yb - h * 0.45)}V${f1(yb - h * 0.33)}`;
    const c = facetas(x, yb - h * 0.62, h * 0.62, h * 0.4, [1, 0.94, 1.03, 0.95, 1.05, 0.97, 1.02, 0.93, 1.04, 0.96, 1.03, 0.94, 1.05, 0.96, 1.02, 0.95], L, 0.1, undefined, 0.55);
    return `<path class="rama raiz" d="${raices}"/><path class="tronco" d="${tronco}"/>${sombraTronco(giro)}${copaSvg(c)}`;
  }
  // Maquilishuat: el tronco esbelto, sus brazos y los racimos de flor (gemas rosadas) con huecos entre ellos.
  const t = h * 0.03, yr = yb - h * 0.42;
  const tronco = lin([[x - t * 1.7, yb], [x - t, yr], [x + t, yr], [x + t * 1.7, yb]]) + 'Z';
  const racimos = [[-0.24, 0.64, 0.13], [0.22, 0.69, 0.12], [-0.04, 0.83, 0.15], [0.29, 0.89, 0.1], [-0.31, 0.87, 0.1], [0.07, 0.99, 0.085]];
  const brazos = racimos.slice(0, 5).map(([dx, dy]) => `M${f1(x)} ${f1(yr + 1)}L${f1(x + dx * h * 0.45)} ${f1(yb - h * (dy * 0.75))}L${f1(x + dx * h * 0.85)} ${f1(yb - h * (dy - 0.03))}`).join('');
  const c = { base: '', luz: '', media: '', sombra: '', filo: '' };
  racimos.forEach(([dx, dy, r], i) => facetas(x + dx * h, yb - dy * h, r * h, r * h * 0.8, [[1, 0.8, 1.1, 0.85, 1, 0.9], [0.9, 1.1, 0.8, 1, 0.95, 1.05]][i % 2], L, i * 0.5, c));
  const caidas = [-0.36, -0.24, -0.13, -0.03, 0.08, 0.17, 0.28, 0.38].map((dx, i) => `M${f1(x + dx * h)} ${f1(yb - 1 - (i % 3) * 1.1)}l${f1(h * 0.018)} ${f1(-h * 0.01)}l${f1(h * 0.018)} ${f1(h * 0.01)}Z`).join('');
  // Pétalos que caen (ambiente): tres rombos que bajan girando desde la copa.
  const petalos = [[-0.2, 0.62], [0.18, 0.66], [0.02, 0.78]].map(([dx, dy]) => `<path class="petalo" d="M${f1(x + dx * h)} ${f1(yb - dy * h)}l2.2 -1.2l2.2 1.2l-2.2 1.2Z"/>`).join('');
  return `<path class="tronco" d="${tronco}"/>${sombraTronco(lin([[x + L * t * 0.1, yb], [x, yr], [x - L * t, yr], [x - L * t * 1.7, yb]]) + 'Z')}<path class="rama" d="${brazos}"/>`
    + `${copaSvg(c)}<path class="flores-caidas" d="${caidas}"/><g class="efecto-ambiente petalos">${petalos}</g>`;
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

// ---------------------------------------------------------------------------------------------
// Campamento 13C · petroglifo del campamento alcanzado. (PROVISIONAL: dibujo mínimo para probar la integración.)
// ---------------------------------------------------------------------------------------------
/** La piedra tallada de la tarjeta de un campamento alcanzado: `cifra` («1M», «1 BTC»), `titulo` y `fecha` ya escrita («4 sept 2026»). */
export function petroglifo({ cifra, titulo, fecha, cima = false }) {
  return `<svg viewBox="0 0 240 120" aria-hidden="true" focusable="false"><rect x="4" y="4" width="232" height="112" rx="14" fill="var(--s2)" stroke="var(--s3)"/><text x="120" y="60" text-anchor="middle" font-size="34" fill="var(--txt)">${cifra}</text><text x="120" y="92" text-anchor="middle" font-size="14" fill="var(--txt2)">${fecha}</text></svg>`;
}
