// Los dibujos de «Tu historia» (campamentos 13 y 13B): el tronco, la constelación, la torre de piedras y la manta de añil. Funciones puras:
// reciben los datos que arma `lib.js` (`aniosTronco`, `estrellasConstelacion`, `piedrasTorre`, `semanasManta`) y devuelven un `<svg>` como texto; no tocan el DOM ni usan azar.
//
// CONTRATO (lo usa `historia.js`; el dibujo es libre mientras se cumpla):
//  · Cada función devuelve un solo `<svg viewBox="0 0 320 320" aria-hidden="true" focusable="false">` (el contenedor lleva el `role="img"`);
//    la manta, `0 0 320 H`, con el alto según sus filas.
//  · Cada pieza tocable lleva `data-anio` (anillo del tronco) o `data-i` (estrella o piedra, el índice del dato) y la clase `.pieza`.
//  · `sel` es el año (tronco) o el índice (constelación, torre de piedras) seleccionado, o null: la pieza elegida lleva además la clase `sel`.
//  · Colores solo con variables CSS (`var(--…)`) o clases del bloque «Campamento 13» de styles.css; sin estilos en línea (la CSP los
//    bloquea); animaciones solo con transform/opacity y solo con efectos «todos» (clase `efecto-ambiente`).
//  · Poco coste: el tronco, una pieza por año; la constelación hasta 1,000 estrellas (usa `<path>`s agrupados, no un nodo pesado por
//    estrella); la torre de piedras, hasta 40 piedras.
//
// El lenguaje es el de la montaña y los árboles de honor: formas facetadas, luz que llega desde arriba a la derecha (cara iluminada,
// media luz y sombra, con un filo de luz en los bordes que miran al astro) y pocas piezas con intención. Lo que no se toca (vetas,
// luces, sombras, polvo) va en unos pocos `<path>` con `pointer-events: none`, así el toque cae siempre en la pieza de debajo.
import { fraccionAnio, hoyISO } from './lib.js';

const f1 = (n) => n.toFixed(1);
const MARCO = 'viewBox="0 0 320 320" aria-hidden="true" focusable="false"';
const lin = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');
const TAU = Math.PI * 2;
/** Un número fijo entre 0 y 1 para (i, k): da a cada pieza su forma propia, siempre la misma (no es azar). */
const fijo = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7 + 0.5) * 43758.5453; return s - Math.floor(s); };
/** Un punto (o varios) como trazo de largo casi cero con puntas redondas: miles de estrellas caben en un solo `<path>`. */
const punto = (x, y) => `M${f1(x)} ${f1(y)}h0.01`;
// De dónde viene la luz (como en `arte.js: facetas`): de la derecha, desde arriba y algo de frente.
const LX = 0.55, LY = -0.62, LZ = 0.56;

/**
 * Triángulos en tres tonos (luz, media luz, sombra) para un polígono convexo: dos anillos de vértices (el de fuera y uno interior,
 * girado medio paso) y un vértice alto desplazado hacia la luz, como una piedra tallada. Mismo criterio que la copa de los árboles.
 */
function tallar(v, cx, cy, rx, ry, acc) {
  const n = v.length;
  const w = v.map((_, i) => { const a = v[i], b = v[(i + 1) % n]; return [cx + ((a[0] + b[0]) / 2 - cx) * 0.6, cy + ((a[1] + b[1]) / 2 - cy) * 0.6]; });
  const P = [cx + rx * 0.14, cy - ry * 0.2];
  const tono = (pts, z) => {
    const mx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, my = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
    const d = ((mx - cx) / rx) * LX + ((my - cy) / ry) * LY + z * LZ;
    const tri = `M${f1(pts[0][0])} ${f1(pts[0][1])}L${f1(pts[1][0])} ${f1(pts[1][1])}L${f1(pts[2][0])} ${f1(pts[2][1])}Z`;
    if (d > 0.6) acc.luz += tri; else if (d > 0.38) acc.media += tri; else if (d < 0.02) acc.sombra += tri;
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, wp = w[(i + n - 1) % n];
    tono([wp, v[i], w[i]], 0.15);
    tono([wp, w[i], P], 0.8);
    tono([w[i], v[i], v[j]], 0.15);
    const ex = v[j][0] - v[i][0], ey = v[j][1] - v[i][1], m = Math.hypot(ex, ey) || 1;
    if ((ey / m) * LX + (-ex / m) * LY > 0.45) acc.filo += `M${f1(v[i][0])} ${f1(v[i][1])}L${f1(v[j][0])} ${f1(v[j][1])}`;
  }
}

// ================================================================ el tronco
const LADOS = 40; // cada anillo es un polígono de 40 lados: se lee redondo, pero de cerca es tallado como la roca

/** Tronco: un anillo por año (el más viejo al centro). El ancho de cada anillo sale de `comprados`. */
export function tronco(anios, { sel = null } = {}) {
  const n = anios.length;
  if (!n) return `<svg ${MARCO}></svg>`;
  const cx = 160, cy = 152;
  // Un árbol joven es un corte pequeño; a partir de seis años ocupa todo el sitio.
  const R = 90 + 36 * Math.min(1, (n - 1) / 5);
  const corteza = Math.max(8, R * 0.075), medula = Math.max(4.5, R * 0.05);
  const dentro = R - corteza;
  const max = Math.max(1, ...anios.map((y) => y.comprados));
  const pesos = anios.map((y) => 0.2 + 0.8 * (y.comprados / max));
  const suma = pesos.reduce((a, b) => a + b, 0);
  const bordes = [medula];
  for (const p of pesos) bordes.push(bordes.at(-1) + (p / suma) * (dentro - medula));
  // Ningún tronco es un círculo: algo ovalado, con la médula corrida hacia un lado (los anillos son más anchos del lado del sol).
  const forma = (t) => 1 + 0.03 * Math.sin(2 * t + 0.7) + 0.02 * Math.sin(3 * t + 2.1) + 0.01 * Math.sin(5 * t + 0.4);
  const pt = (t, r) => { const k = 1 - r / R; return [cx - 6 * k + Math.cos(t) * r * forma(t), cy + 4 * k + Math.sin(t) * r * forma(t)]; };
  const angulo = (frac) => frac * TAU - Math.PI / 2; // enero arriba, en el sentido del reloj
  const poli = (r, rev = false) => { const pts = []; for (let k = 0; k < LADOS; k++) pts.push(pt(((rev ? LADOS - k : k) / LADOS) * TAU, r)); return `${lin(pts)}Z`; };

  let s = `<svg class="h-tronco${sel != null ? ' con-sel' : ''}" ${MARCO}><defs>`
    + '<linearGradient id="h-t-brillo" x1="0.85" y1="0.1" x2="0.15" y2="0.95"><stop class="ht-b0" offset="0"/><stop class="ht-b1" offset="0.5"/><stop class="ht-b2" offset="1"/></linearGradient></defs>';
  // Sombra en el suelo y el canto del corte (el grosor de la rodaja, visto un poco desde arriba).
  s += `<ellipse class="ht-suelo" cx="${cx + 4}" cy="${f1(cy + R * 0.98 + 12)}" rx="${f1(R * 0.95)}" ry="${f1(R * 0.16)}"/>`;
  const canto = []; for (let k = 0; k <= LADOS / 2; k++) { const t = (k / (LADOS / 2)) * Math.PI; const [x, y] = pt(t, R); canto.push([x, y + 7]); }
  for (let k = LADOS / 2; k >= 0; k--) canto.push(pt((k / (LADOS / 2)) * Math.PI, R * 0.995));
  s += `<path class="ht-canto" d="${lin(canto)}Z"/>`;

  // Corteza: placas facetadas entre el último anillo y el borde, cada una con el tono que le toca según mire o no a la luz.
  let placa = { luz: '', media: '', sombra: '' }, grietasC = '', filo = '';
  for (let k = 0; k < LADOS; k++) {
    const t0 = (k / LADOS) * TAU, t1 = ((k + 1) / LADOS) * TAU, tm = (t0 + t1) / 2;
    const ro = R * (1 + 0.025 * (fijo(k, 3) - 0.5));
    const q = [pt(t0, dentro), pt(t0, ro), pt(t1, ro), pt(t1, dentro)];
    const d = Math.cos(tm) * LX + Math.sin(tm) * LY;
    const tri = `${lin(q)}Z`;
    if (d > 0.45) placa.luz += tri; else if (d > 0.05) placa.media += tri; else if (d < -0.45) placa.sombra += tri;
    if (k % 2 === 0) { const a = pt(t0, dentro + corteza * 0.15), b = pt(t0 + 0.02, ro * 0.995); grietasC += `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; }
    if (d > 0.35) { const a = pt(t0, ro), b = pt(t1, ro); filo += `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; }
  }
  s += `<path class="ht-corteza" d="${poli(R)}${poli(dentro, true)}" fill-rule="evenodd"/>`
    + `<path class="ht-c-media" d="${placa.media}"/><path class="ht-c-luz" d="${placa.luz}"/><path class="ht-c-sombra" d="${placa.sombra}"/>`
    + `<path class="ht-c-grieta" d="${grietasC}"/>`;

  // Los anillos: el corazón (los años de dentro) es más oscuro que la albura; el año en curso es madera viva, más clara.
  const viejo = Math.max(1, Math.round(n * 0.55));
  anios.forEach((y, k) => {
    const tono = !y.completo ? 'ht-vivo' : k < viejo && n > 2 ? `ht-dur${k % 2}` : `ht-alb${k % 2}`;
    s += `<path class="pieza h-anillo ${tono}${y.anio === sel ? ' sel' : ''}" data-anio="${y.anio}" d="${poli(bordes[k + 1])}${poli(bordes[k], true)}" fill-rule="evenodd"/>`;
  });
  // La médula: una estrellita de cinco puntas, como la de muchos árboles de verdad, con su brillo.
  const [mx, my] = pt(0, 0), med = [];
  for (let k = 0; k < 10; k++) { const t = (k / 10) * TAU - Math.PI / 2, r = k % 2 ? medula * 0.62 : medula * 0.85; med.push([mx + Math.cos(t) * r, my + Math.sin(t) * r]); }
  s += `<path class="ht-medula" d="${lin(med)}Z"/>`;
  // La madera tardía de cada año cerrado (la línea oscura del anillo) y una veta fina dentro de cada uno.
  let tardia = '', veta = '';
  anios.forEach((y, k) => {
    if (y.completo) tardia += poli(bordes[k + 1]);
    const w = bordes[k + 1] - bordes[k];
    // Más vetas cuanto más ancho el anillo (un año solo, o uno muy grande, no queda liso).
    const vetas = w > 40 ? [0.22, 0.42, 0.6, 0.76, 0.9] : w > 18 ? [0.35, 0.65, 0.86] : w > 5 ? [0.55] : [];
    for (const f of vetas) veta += poli(bordes[k] + w * f);
  });
  // Radios de la médula: unas pocas líneas que cruzan los anillos, como en un corte de verdad.
  let radios = '';
  for (let k = 0; k < 11; k++) { const t = (k / 11) * TAU + 0.3 * fijo(k, 1); const a = pt(t, medula * 1.8), b = pt(t, dentro * (0.82 + 0.15 * fijo(k, 2))); radios += `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; }
  s += `<g class="ht-sobre"><path class="ht-veta" d="${veta}"/><path class="ht-radio" d="${radios}"/><path class="ht-tardia" d="${tardia}"/>`
    + `<path class="ht-luz" d="${poli(dentro)}"/>`;

  // Ventas: grietas que ya cerraron (una línea fina y su labio de luz al lado, nada que alarme).
  let grieta = '', labio = '';
  // Compras extra: nudos (un ojo oscuro en la madera, con una brasa cálida).
  let nudo = '', brasa = '', nucleo = '';
  anios.forEach((y, k) => {
    const r0 = bordes[k], r1 = bordes[k + 1], w = r1 - r0;
    for (const v of y.ventas) {
      const t = angulo(v.frac), a = pt(t, r0 + w * 0.1), m = pt(t + 0.012, r0 + w * 0.55), b = pt(t - 0.004, Math.min(dentro - 1, r1 + w * 0.45));
      grieta += `M${f1(a[0])} ${f1(a[1])}L${f1(m[0])} ${f1(m[1])}L${f1(b[0])} ${f1(b[1])}`;
      labio += `M${f1(a[0] + 0.9)} ${f1(a[1] - 0.6)}L${f1(m[0] + 0.9)} ${f1(m[1] - 0.6)}L${f1(b[0] + 0.9)} ${f1(b[1] - 0.6)}`;
    }
    for (const e of y.extras) {
      const t = angulo(e.frac), [x, yy] = pt(t, r0 + w * 0.5), r = Math.max(1.6, Math.min(3, w * 0.22));
      // Un nudo de verdad, visto en el corte: un ojal oscuro con su aro de madera más clara y una brasa cálida alrededor.
      nudo += `M${f1(x - r)} ${f1(yy)}a${f1(r)} ${f1(r * 0.86)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r * 0.86)} 0 1 0 ${f1(-2 * r)} 0Z`;
      brasa += punto(x, yy);
      nucleo += punto(x - r * 0.25, yy - r * 0.25);
    }
  });
  s += `<path class="ht-grieta" d="${grieta}"/><path class="ht-labio" d="${labio}"/>`
    + `<path class="ht-nudo-luz" d="${brasa}"/><path class="ht-nudo" d="${nudo}"/><path class="ht-nudo-brillo" d="${nucleo}"/>`;
  // El borde vivo: el cámbium del año en curso, encendido desde enero hasta hoy, con una chispa en el día de hoy.
  const ult = anios.at(-1);
  if (!ult.completo) {
    const fr = Math.max(0.02, fraccionAnio(hoyISO()));
    const pts = []; const pasos = Math.max(2, Math.ceil(fr * LADOS));
    for (let k = 0; k <= pasos; k++) pts.push(pt(angulo((k / pasos) * fr), dentro - 1.2));
    const [hx, hy] = pts.at(-1);
    s += `<path class="ht-cambium" d="${lin(pts)}"/><path class="ht-hoy" d="${punto(hx, hy)}"/><path class="ht-hoy-luz efecto-ambiente" d="${punto(hx, hy)}"/>`;
  }
  s += `<path class="ht-filo" d="${filo}"/></g>`;
  // La pieza elegida: su contorno en naranja, por encima de todo (no es tocable: el toque pasa al anillo de debajo).
  const k = anios.findIndex((y) => y.anio === sel);
  if (k >= 0) s += `<path class="h-marca" d="${poli(bordes[k + 1])}${poli(bordes[k], true)}" fill-rule="evenodd"/>`;
  return `${s}</svg>`;
}

// ================================================================ la constelación
const CIELO_R = 152, ESTRELLAS_R = 134;

/** El polvo del cielo: siempre el mismo (sale de la posición, no del azar), más denso hacia una banda como la Vía Láctea. */
function polvo() {
  let fino = '', medio = '';
  for (let k = 0; k < 170; k++) {
    const t = fijo(k, 7) * TAU, r = Math.sqrt(fijo(k, 8)) * (CIELO_R - 6);
    let x = 160 + Math.cos(t) * r, y = 160 + Math.sin(t) * r;
    // La mitad se junta hacia la banda diagonal.
    if (k % 2) { const d = (x - 160) * 0.6 - (y - 160) * 0.8; x -= d * 0.6 * 0.55; y += d * 0.8 * 0.55; }
    if (k % 5 === 0) medio += punto(x, y); else fino += punto(x, y);
  }
  return `<path class="hc-polvo" d="${fino}"/><path class="hc-polvo2" d="${medio}"/>`;
}

/** Destello de cuatro puntas, relleno: largo `l`, cintura `c`. */
const destello = (x, y, l, c) => `M${f1(x)} ${f1(y - l)}Q${f1(x + c)} ${f1(y - c)} ${f1(x + l)} ${f1(y)}Q${f1(x + c)} ${f1(y + c)} ${f1(x)} ${f1(y + l)}Q${f1(x - c)} ${f1(y + c)} ${f1(x - l)} ${f1(y)}Q${f1(x - c)} ${f1(y - c)} ${f1(x)} ${f1(y - l)}Z`;

/** Constelación: una estrella por compra, en `x`/`y` (0 a 1) con brillo `mag`. */
export function constelacion(estrellas, { sel = null } = {}) {
  let s = `<svg class="h-const${estrellas.length > 300 ? ' densa' : ''}" ${MARCO}><defs>`
    + '<radialGradient id="h-c-cielo" cx="0.42" cy="0.34" r="0.75"><stop class="hc-s0" offset="0"/><stop class="hc-s1" offset="0.55"/><stop class="hc-s2" offset="1"/></radialGradient>'
    + '<radialGradient id="h-c-via" cx="0.5" cy="0.5" r="0.5"><stop class="hc-v0" offset="0"/><stop class="hc-v1" offset="1"/></radialGradient>'
    + `<clipPath id="h-c-disco"><circle cx="160" cy="160" r="${CIELO_R}"/></clipPath></defs>`;
  s += `<circle class="hc-cielo" cx="160" cy="160" r="${CIELO_R}"/>`
    + `<g clip-path="url(#h-c-disco)"><ellipse class="hc-via" cx="160" cy="160" rx="190" ry="54" transform="rotate(-37 160 160)"/>${polvo()}</g>`;
  // El borde del planisferio: un aro fino y doce marcas, una por mes.
  let marcas = '';
  for (let k = 0; k < 12; k++) { const t = (k / 12) * TAU - Math.PI / 2, a = CIELO_R - 2, b = CIELO_R - (k % 3 ? 6 : 10); marcas += `M${f1(160 + Math.cos(t) * a)} ${f1(160 + Math.sin(t) * a)}L${f1(160 + Math.cos(t) * b)} ${f1(160 + Math.sin(t) * b)}`; }
  s += `<circle class="hc-aro" cx="160" cy="160" r="${CIELO_R - 0.75}"/><circle class="hc-aro2" cx="160" cy="160" r="${CIELO_R - 14}"/><path class="hc-marca" d="${marcas}"/>`;
  if (!estrellas.length) return `${s}</svg>`;
  // La espiral de girasol de `lib.js` es muy regular: cada estrella se corre un poco (fijo, por su índice, dentro de su sitio) para
  // que se lea como un cielo y no como una rejilla.
  const paso = ESTRELLAS_R * Math.sqrt(Math.PI / Math.max(estrellas.length, 120)), n = estrellas.length;
  const pos = estrellas.map((e) => {
    const j = paso * 0.36 * Math.sqrt(fijo(e.i, 21)), t = fijo(e.i, 22) * TAU;
    return [160 + (e.x - 0.5) * 2 * ESTRELLAS_R + Math.cos(t) * j, 160 + (e.y - 0.5) * 2 * ESTRELLAS_R + Math.sin(t) * j];
  });

  // Las figuras: por año, sus estrellas más brillantes (hasta 7) unidas en cadena por cercanía, empezando por la primera del año.
  const porAnio = new Map();
  for (const e of estrellas) { if (!porAnio.has(e.anio)) porAnio.set(e.anio, []); porAnio.get(e.anio).push(e); }
  let lineas = '';
  for (const lista of porAnio.values()) {
    const top = [...lista].sort((a, b) => b.mag - a.mag || a.i - b.i).slice(0, 7).sort((a, b) => a.i - b.i);
    const libres = top.slice(1); let act = top[0];
    while (libres.length) {
      let mejor = 0, dm = Infinity;
      libres.forEach((e, j) => { const d = Math.hypot(pos[e.i][0] - pos[act.i][0], pos[e.i][1] - pos[act.i][1]); if (d < dm) { dm = d; mejor = j; } });
      const sig = libres.splice(mejor, 1)[0];
      if (dm < 80) {
        // La línea no toca las estrellas: se queda a 3.5 de cada una, como en las cartas del cielo.
        const [x0, y0] = pos[act.i], [x1, y1] = pos[sig.i], u = 3.5 / (dm || 1);
        if (dm > 9) lineas += `M${f1(x0 + (x1 - x0) * u)} ${f1(y0 + (y1 - y0) * u)}L${f1(x1 - (x1 - x0) * u)} ${f1(y1 - (y1 - y0) * u)}`;
      }
      act = sig;
    }
  }
  s += `<path class="hc-linea" d="${lineas}"/>`;
  // Las estrellas en tres grupos por brillo (un path cada uno), los halos de las extra y los destellos de las más brillantes.
  let tenue = '', media = '', viva = '', halo = '', calido = '', nucleoC = '', brillo = '';
  for (const e of estrellas) {
    const [x, y] = pos[e.i], p = punto(x, y);
    if (e.extra) { calido += p; nucleoC += p; continue; }
    if (e.mag < 0.38) tenue += p; else if (e.mag < 0.7) media += p; else viva += p;
  }
  // Las destacadas (con destello de cuatro puntas y halo): las más brillantes, hasta 14 y separadas entre sí, para que no se amontonen.
  const orden = [...estrellas].sort((a, b) => b.mag - a.mag || b.i - a.i);
  const destacadas = [];
  for (const e of orden) {
    if (destacadas.length >= Math.max(1, Math.min(14, Math.round(n * 0.05)))) break;
    if (destacadas.every((o) => Math.hypot(pos[o.i][0] - pos[e.i][0], pos[o.i][1] - pos[e.i][1]) > 30)) destacadas.push(e);
  }
  for (const e of destacadas) { const [x, y] = pos[e.i], l = 4.5 + 6 * e.mag; brillo += destello(x, y, l, l * 0.15); halo += punto(x, y); }
  s += `<path class="hc-halo" d="${halo}"/><path class="hc-calido" d="${calido}"/>`
    + `<path class="hc-tenue" d="${tenue}"/><path class="hc-media" d="${media}"/><path class="hc-viva" d="${viva}"/>`
    + `<path class="hc-destello" d="${brillo}"/><path class="hc-nucleo-c" d="${nucleoC}"/>`;
  // Titileo (solo con todos los efectos): doce estrellas como mucho, de las destacadas, en cuatro ritmos.
  s += '<g class="efecto-ambiente hc-titilan">';
  destacadas.slice(0, 12).forEach((e, k) => { const [x, y] = pos[e.i]; s += `<path class="hc-titila tw${k % 4}" d="${destello(x, y, 3 + 5 * e.mag, 0.8)}"/>`; });
  s += '</g>';
  // Zonas para tocar: un círculo invisible por estrella (radio 9 del dibujo, unos 20 px en un teléfono).
  let toques = '<g class="hc-toques">';
  for (const e of estrellas) toques += `<circle class="pieza h-estrella${e.i === sel ? ' sel' : ''}" data-i="${e.i}" cx="${f1(pos[e.i][0])}" cy="${f1(pos[e.i][1])}" r="9"/>`;
  s += `${toques}</g>`;
  if (sel != null && pos[sel]) {
    const [x, y] = pos[sel];
    s += `<path class="h-marca-c" d="M${f1(x - 13)} ${f1(y)}h-6M${f1(x + 13)} ${f1(y)}h6M${f1(x)} ${f1(y - 13)}v-6M${f1(x)} ${f1(y + 13)}v6"/>`;
  }
  return `${s}</svg>`;
}

// ================================================================ la torre de piedras

/** Una piedra: un polígono de 6 a 8 vértices fijos para su índice, algo más plano abajo (se asienta) y un poco ladeado. */
function contornoPiedra(i, cx, cy, w, h) {
  const m = 6 + (i % 3), giro = fijo(i, 1) * 0.9, ladeo = (fijo(i, 2) - 0.5) * 0.16;
  const v = [];
  for (let k = 0; k < m; k++) {
    const t = giro + (k / m) * TAU, r = 0.9 + 0.2 * fijo(i, k + 10);
    let x = Math.cos(t) * r * w / 2, y = Math.sin(t) * r * h / 2;
    if (y > 0) y *= 0.82; // la base se aplana
    v.push([cx + x * Math.cos(ladeo) - y * Math.sin(ladeo), cy + x * Math.sin(ladeo) + y * Math.cos(ladeo)]);
  }
  return v;
}

/**
 * Dónde va cada piedra. Con pocas (hasta 6), una columna en equilibrio, como las torres de piedras de los senderos; con más, un montón en
 * hileras que se angostan hacia arriba (la apacheta), de la más vieja abajo a la izquierda a la más nueva arriba.
 */
function colocar(piedras) {
  const n = piedras.length;
  const caja = piedras.map((p) => { const w = 0.5 + 0.5 * p.tam; return { w, h: w * (0.5 + 0.12 * fijo(p.i, 5)) }; });
  const out = [];
  if (n <= 6) {
    let y = 0;
    piedras.forEach((p, k) => {
      const { w, h } = caja[k];
      const dx = k ? (fijo(p.i, 6) - 0.5) * 0.12 * caja[k - 1].w : 0;
      out.push({ x: (out[k - 1]?.x ?? 0) * 0.5 + dx, yb: y, w, h });
      y -= h * 0.84;
    });
  } else {
    // Hileras de arriba abajo: 1, 1, 2, 2, 3, 3… hasta que quepan todas; lo que sobra se quita de las de abajo.
    const caps = [];
    for (let c = 1, tot = 0; tot < n; c++) for (let r = 0; r < 2 && tot < n + 0; r++) { caps.push(c); tot += c; }
    let sobra = caps.reduce((a, b) => a + b, 0) - n;
    caps.reverse();
    for (let k = 0; sobra > 0; k = (k + 1) % caps.length) if (caps[k] > 1) { caps[k]--; sobra--; }
    caps.sort((a, b) => b - a);
    let idx = 0, yb = 0;
    caps.forEach((c, fila) => {
      const grupo = caja.slice(idx, idx + c);
      const ancho = grupo.reduce((a, g) => a + g.w * 0.86, 0);
      let x = -ancho / 2 + (fila % 2 ? 0.08 : -0.05);
      let alto = 0;
      grupo.forEach((g, j) => {
        const cxp = x + g.w * 0.43, borde = c > 1 ? Math.abs(j - (c - 1) / 2) / ((c - 1) / 2) : 0;
        out.push({ x: cxp, yb: yb + borde * borde * g.h * 0.16 + (fijo(idx + j, 9) - 0.5) * g.h * 0.12, w: g.w, h: g.h });
        x += g.w * 0.86;
        alto = Math.max(alto, g.h);
      });
      idx += c;
      yb -= alto * 0.68;
    });
  }
  return out;
}

/** Torre de piedras: una piedra por compra (o por grupo), de la más vieja abajo a la más nueva arriba; `tam` (0.35 a 1) es su tamaño. */
export function torre(piedras, { sel = null } = {}) {
  const suelo = 258;
  let s = `<svg class="h-torre" ${MARCO}><defs>`
    + '<linearGradient id="h-m-cielo" x1="0" y1="0" x2="0" y2="1"><stop class="hm-s0" offset="0"/><stop class="hm-s1" offset="0.62"/><stop class="hm-s2" offset="1"/></linearGradient>'
    + '<radialGradient id="h-m-sombra" cx="0.5" cy="0.5" r="0.5"><stop class="hm-o0" offset="0"/><stop class="hm-o1" offset="1"/></radialGradient>'
    + '<clipPath id="h-m-disco"><circle cx="160" cy="160" r="152"/></clipPath></defs>';
  // El fondo: un medallón de cielo suave con dos sierras lejanas facetadas y la loma donde se apila la torre de piedras.
  s += '<g clip-path="url(#h-m-disco)"><rect class="hm-cielo" x="0" y="0" width="320" height="320"/>'
    + `<path class="hm-lejos" d="M0 ${suelo - 34}L38 ${suelo - 70}L64 ${suelo - 58}L96 ${suelo - 92}L128 ${suelo - 52}L150 ${suelo - 40}L190 ${suelo - 46}L224 ${suelo - 84}L252 ${suelo - 66}L284 ${suelo - 98}L320 ${suelo - 60}V320H0Z"/>`
    + `<path class="hm-lejos-luz" d="M96 ${suelo - 92}L128 ${suelo - 52}L112 ${suelo - 50}ZM284 ${suelo - 98}L320 ${suelo - 60}L300 ${suelo - 58}ZM224 ${suelo - 84}L252 ${suelo - 66}L240 ${suelo - 60}Z"/>`
    + `<path class="hm-medio" d="M0 ${suelo - 10}L44 ${suelo - 30}L86 ${suelo - 18}L120 ${suelo - 26}L200 ${suelo - 22}L246 ${suelo - 36}L288 ${suelo - 20}L320 ${suelo - 26}V320H0Z"/>`
    + `<path class="hm-loma" d="M0 ${suelo + 12}Q70 ${suelo - 4} 160 ${suelo - 1}T320 ${suelo + 14}V320H0Z"/>`
    + `<path class="hm-loma-filo" d="M0 ${suelo + 12}Q70 ${suelo - 4} 160 ${suelo - 1}T320 ${suelo + 14}"/></g>`
    + '<circle class="hm-aro" cx="160" cy="160" r="151.25"/>';
  if (!piedras.length) return `${s}</svg>`;

  // Escala: que la torre de piedras quepa (hasta 210 de alto y 220 de ancho) y que una sola piedra no sea enorme.
  const lugar = colocar(piedras);
  const alto = Math.max(...lugar.map((l) => -l.yb + l.h)), ancho = Math.max(...lugar.map((l) => Math.abs(l.x) + l.w / 2)) * 2;
  const U = Math.min(124, 196 / alto, 220 / ancho);
  const pos = lugar.map((l) => ({ cx: 160 + l.x * U, cy: suelo + 3 + l.yb * U - l.h * U * 0.44, w: l.w * U, h: l.h * U }));
  const base = Math.max(...pos.map((p) => Math.abs(p.cx - 160) + p.w / 2));
  // Sombra de contacto en la loma y un par de guijarros sueltos a los lados (no son compras: no se tocan).
  s += `<ellipse class="hm-contacto" cx="${f1(164)}" cy="${f1(suelo + 2)}" rx="${f1(base * 1.25 + 8)}" ry="${f1(Math.max(5, base * 0.16))}"/>`;
  const acc = { luz: '', media: '', sombra: '', filo: '' };
  let guijarros = '';
  for (const [k, gx, gw] of [[101, Math.max(48, 160 - base - 20), 13], [102, Math.min(262, 160 + base + 16), 9], [103, Math.min(276, 160 + base + 29), 6]]) {
    const gy = suelo + 2 + Math.abs(gx - 160) * 0.05;
    const v = contornoPiedra(k, gx, gy - gw * 0.15, gw, gw * 0.55);
    guijarros += `${lin(v)}Z`;
    tallar(v, gx, gy - gw * 0.15, gw / 2, gw * 0.275, acc);
  }
  s += `<path class="hm-guijarro" d="${guijarros}"/>`;
  // Las piedras, de abajo arriba: el contorno es la pieza tocable (con su tono propio) y sus facetas van justo encima (sin recibir
  // el toque), así la piedra de arriba tapa de verdad a la de abajo.
  s += `<path class="hm-guijarro-luz" d="${acc.luz}"/><path class="hm-guijarro-sombra" d="${acc.sombra}"/>`;
  let marca = '';
  piedras.forEach((p, k) => {
    const { cx, cy, w, h } = pos[k];
    const v = contornoPiedra(p.i, cx, cy, w, h);
    const d = `${lin(v)}Z`;
    const t = { luz: '', media: '', sombra: '', filo: '' };
    tallar(v, cx, cy, w / 2, h / 2, t);
    s += `<path class="pieza h-piedra hp-${p.i % 4}${p.extra ? ' hp-extra' : ''}${p.i === sel ? ' sel' : ''}" data-i="${p.i}" d="${d}"/>`
      + `<path class="hm-media" d="${t.media}"/><path class="hm-luz" d="${t.luz}"/><path class="hm-sombra" d="${t.sombra}"/><path class="hm-filo" d="${t.filo}"/>`;
    if (p.extra) {
      // La compra extra: las caras de arriba de la piedra guardan una luz cálida, como una veta de cobre al sol.
      const caras = t.luz.split('Z').filter(Boolean).slice(0, 3).map((c) => `${c}Z`).join('');
      if (caras) s += `<path class="hm-veta" d="${caras}"/>`;
    }
    if (p.i === sel) marca = d;
  });
  if (marca) s += `<path class="h-marca" d="${marca}"/>`;
  return `${s}</svg>`;
}

// ================================================================ la manta de añil (campamento 13B)
// Una manta teñida con añil, como las de Izalco y Suchitoto: una fila por año, una celda por semana. El añil es más hondo cuanto más
// sats tuvo esa semana (tono 1 a 4); una semana sin compras es algodón crudo, el mismo hilo sin teñir (nunca un hueco). Las compras
// extra llevan una puntada naranja en cruz. Lo de antes de tu primera semana no se teje; lo que falta del año son hilos sueltos (flecos).

/** Celda de cada semana real, con su rectángulo: `k` es su posición en la fila (cada fila llena el ancho, tenga 52 o 53 semanas). */
function tejer(datos) {
  const filas = datos.anios.length;
  const ch = Math.min(30, 8 + 96 / filas); // alto de cada fila: con pocos años, bandas anchas; con doce, más finas
  const y0 = 14; // arriba: la cenefa
  const indice = new Map(datos.celdas.map((x, i) => [x.idx, i]));
  // Con un solo año (las primeras semanas), la tela es solo lo que va de tu primera semana a fin de año: se teje más grande y centrada
  // (hasta cuatro veces el ancho normal), así una sola semana es un retazo que se ve, con el resto del año en hilos esperando.
  const uno = filas === 1 ? datos.anios[0].semanas.filter((w) => !w.antes) : null;
  const wUno = uno ? Math.min(300 / uno.length, 22.6) : 0;
  const bandas = [], celdas = [], flecos = [];
  datos.anios.forEach((a, fila) => {
    const n = a.semanas.length, y = y0 + fila * ch;
    const wc = uno ? wUno : 300 / n, x0 = uno ? 160 - (uno.length * wUno) / 2 : 10, k0 = uno ? n - uno.length : 0;
    let ini = null, fin = null, finFleco = null;
    a.semanas.forEach((w, k) => {
      const x = x0 + (k - k0) * wc;
      if (w.antes) return;
      ini ??= x;
      if (w.futura) { flecos.push({ x, y, wc, k }); finFleco = x + wc; return; }
      fin = x + wc;
      celdas.push({ w, i: indice.get(w.idx), x, y, wc, ch });
    });
    if (fin != null) bandas.push({ x: ini, y, w: fin - ini, h: ch, hasta: finFleco ?? fin });
  });
  return { ch, y0, bandas, celdas, flecos, alto: y0 + filas * ch };
}

/** Manta: `datos` es `lib.semanasManta`. Cada semana tocable es un `<rect class="pieza celda tono-N">` con `data-i` (su índice en `datos.celdas`). */
export function manta(datos, { sel = null } = {}) {
  if (!datos.celdas.length) return '<svg viewBox="0 0 320 60" aria-hidden="true" focusable="false"></svg>';
  const { ch, y0, bandas, celdas, flecos, alto } = tejer(datos);
  const x0 = Math.min(...bandas.map((b) => b.x)), W = Math.max(...bandas.map((b) => b.hasta)) - x0;
  const fondo = alto + (flecos.length ? 15 : 7);
  const rect = (b, e = 0) => `M${f1(b.x - e)} ${f1(b.y - e)}h${f1(b.w + 2 * e)}v${f1(b.h + 2 * e)}h${f1(-b.w - 2 * e)}Z`;
  // La tela entera (una banda por año): el fondo crudo, la sombra que deja sobre la mesa y las capas que van encima.
  const tela = bandas.map((b) => rect(b)).join('');
  let s = `<svg class="h-manta" viewBox="0 0 320 ${f1(fondo)}" aria-hidden="true" focusable="false"><defs>`
    // La trama: hilos de la trama que pasan por encima y por debajo de la urdimbre (un tejido llano visto de cerca).
    + '<pattern id="h-a-trama" width="3" height="2.6" patternUnits="userSpaceOnUse"><path class="ha-p-luz" d="M0.15 0.25h1.2v0.75h-1.2ZM1.65 1.55h1.2v0.75h-1.2Z"/>'
    + '<path class="ha-p-sombra" d="M0 1.15h1.5v0.3H0ZM1.5 2.45h1.5v0.15H1.5ZM1.5 0h1.5v0.15H1.5ZM1.42 0v1.3h0.16V0ZM2.92 1.3v1.3h0.16V1.3Z"/></pattern>'
    // Los pliegues: la tela no está tensa, cae en ondas suaves (luz y sombra a lo ancho, muy leves).
    + `<linearGradient id="h-a-pliegue" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x0 + W}" y2="0">`
    + '<stop class="ha-g-luz" offset="0"/><stop class="ha-g-sombra" offset="0.17"/><stop class="ha-g-luz" offset="0.36"/><stop class="ha-g-sombra" offset="0.58"/>'
    + '<stop class="ha-g-luz" offset="0.8"/><stop class="ha-g-sombra" offset="1"/></linearGradient>'
    + `<linearGradient id="h-a-luz" gradientUnits="userSpaceOnUse" x1="${x0 + W}" y1="${y0}" x2="${x0}" y2="${alto}"><stop class="ha-l0" offset="0"/><stop class="ha-l1" offset="0.5"/><stop class="ha-l2" offset="1"/></linearGradient>`
    + `<linearGradient id="h-a-fleco" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(alto - ch)}" x2="0" y2="${f1(fondo)}"><stop class="ha-f0" offset="0"/><stop class="ha-f1" offset="0.55"/><stop class="ha-f2" offset="1"/></linearGradient>`
    + '</defs>';
  s += `<path class="ha-sombra" d="${bandas.map((b) => rect({ ...b, x: b.x + 2.2, y: b.y + 3 })).join('')}"/>`;
  s += `<path class="ha-crudo" d="${tela}"/>`;

  // Las semanas: el color de cada una es su tono de añil (o el crudo); son las piezas tocables.
  for (const c of celdas) s += `<rect class="pieza celda tono-${c.w.tono}${c.w.extra ? ' extra' : ''}${c.i === sel ? ' sel' : ''}" data-i="${c.i}" x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(c.wc + 0.05)}" height="${f1(c.ch)}"/>`;

  s += '<g class="ha-sobre">';
  // Jaspe: el añil teñido con reserva no queda parejo; unas vetas claras, fijas para cada semana, como el hilo que no tomó el tinte.
  let jaspe = '', jaspeOsc = '';
  for (const c of celdas) {
    if (!c.w.tono) continue;
    const f = fijo(c.w.idx, 31), g = fijo(c.w.idx, 32);
    if (f > 0.42) { const x = c.x + c.wc * (0.2 + 0.6 * g), y = c.y + c.ch * (0.12 + 0.3 * f); jaspe += `M${f1(x)} ${f1(y)}v${f1(c.ch * (0.25 + 0.3 * g))}`; }
    if (c.w.tono >= 2 && g < 0.35) { const x = c.x + c.wc * (0.3 + 0.4 * f); jaspeOsc += `M${f1(x)} ${f1(c.y + c.ch * 0.55)}v${f1(c.ch * 0.3)}`; }
  }
  s += `<path class="ha-jaspe" d="${jaspe}"/><path class="ha-jaspe-osc" d="${jaspeOsc}"/>`;
  // Encima de todo lo tejido: la trama, la caída de la luz (de arriba a la derecha) y los pliegues.
  s += `<path class="ha-trama" d="${tela}"/><path class="ha-luz" d="${tela}"/><path class="ha-pliegue" d="${tela}"/>`;
  // Una pasada más gruesa entre un año y el siguiente, como el cambio de madeja.
  let pasada = '';
  bandas.forEach((b, k) => { if (k) pasada += `M${f1(Math.max(b.x, bandas[k - 1].x))} ${f1(b.y)}H${f1(Math.min(b.x + b.w, bandas[k - 1].x + bandas[k - 1].w))}`; });
  s += `<path class="ha-pasada" d="${pasada}"/>`;
  // Los orillos: el borde de la tela, un hilo más firme a los lados de cada fila y abajo.
  let orillo = '';
  bandas.forEach((b, k) => {
    orillo += `M${f1(b.x)} ${f1(b.y)}v${f1(b.h)}M${f1(b.x + b.w)} ${f1(b.y)}v${f1(b.h)}`;
    const sig = bandas[k + 1];
    // Lo que no tiene otra fila debajo (o encima) también es orilla.
    if (!sig) orillo += `M${f1(b.x)} ${f1(b.y + b.h)}h${f1(b.w)}`;
    else if (sig.x + sig.w < b.x + b.w) orillo += `M${f1(sig.x + sig.w)} ${f1(b.y + b.h)}H${f1(b.x + b.w)}`;
    const ant = bandas[k - 1];
    if (ant && ant.x > b.x) orillo += `M${f1(b.x)} ${f1(b.y)}H${f1(ant.x)}`;
  });
  s += `<path class="ha-orillo" d="${orillo}"/>`;

  // La cenefa: el remate tejido de arriba, sobre la primera fila; una greca de escalones (como las de los textiles de aquí) en añil.
  const b0 = { ...bandas[0], w: bandas[0].hasta - bandas[0].x }, cy = b0.y - 9, n = Math.max(1, Math.round(b0.w / 12)), paso = b0.w / n;
  let greca = '', rombos = '';
  for (let k = 0; k < n; k++) {
    const x = b0.x + k * paso, h = 6.4;
    // Escalones que suben y bajan (una pirámide de tres pasos) y, en medio de cada hueco, un rombo pequeño.
    greca += `M${f1(x)} ${f1(cy + h)}h${f1(paso * 0.12)}v-2h${f1(paso * 0.12)}v-2h${f1(paso * 0.12)}v-2h${f1(paso * 0.28)}v2h${f1(paso * 0.12)}v2h${f1(paso * 0.12)}v2Z`;
    if (paso > 7) rombos += `M${f1(x + paso)} ${f1(cy + 1.4)}l1.3 1.6l-1.3 1.6l-1.3 -1.6Z`;
  }
  s += `<path class="ha-cenefa" d="${rect({ x: b0.x, y: cy, w: b0.w, h: 9 })}"/><path class="ha-greca" d="${greca}"/><path class="ha-rombo" d="${rombos}"/>`
    + `<path class="ha-trama" d="${rect({ x: b0.x, y: cy, w: b0.w, h: 9 })}"/>`
    + `<path class="ha-orillo" d="M${f1(b0.x)} ${f1(cy)}h${f1(b0.w)}M${f1(b0.x)} ${f1(cy)}v9M${f1(b0.x + b0.w)} ${f1(cy)}v9"/>`;
  // Los flecos: las semanas que aún no llegan son la urdimbre todavía sin tejer, hilos crudos que cuelgan sueltos y se juntan en
  // pequeños manojos (no son faltas: así se ve una manta en el telar).
  if (flecos.length) {
    let hilo = '', mano = '';
    let j = 0;
    for (const f of flecos) {
      const hilos = Math.max(1, Math.round(f.wc / 2.6));
      for (let h = 0; h < hilos; h++, j++) {
        const x = f.x + (f.wc * (h + 0.5)) / hilos, l = 7 + 5 * fijo(j, 51), curva = (fijo(j, 52) - 0.5) * 2.4, yb = f.y + ch;
        hilo += `M${f1(x)} ${f1(f.y + 0.6)}V${f1(yb)}q${f1(curva)} ${f1(l * 0.5)} ${f1(curva * 0.4)} ${f1(l)}`;
        if (j % 3 === 1) mano += punto(x, yb + 1.2);
      }
    }
    s += `<path class="ha-urdimbre" d="${hilo}"/><path class="ha-manojo" d="${mano}"/>`;
  }

  // El bordado de las compras extra: una puntada en cruz, naranja, con su sombra para que se lea sobre el crudo y sobre el añil oscuro.
  let cruz = '';
  for (const c of celdas) {
    if (!c.w.extra) continue;
    const r = Math.min(c.wc, c.ch) * 0.3, mx = c.x + c.wc / 2, my = c.y + c.ch / 2;
    cruz += `M${f1(mx - r)} ${f1(my - r)}L${f1(mx + r)} ${f1(my + r)}M${f1(mx + r)} ${f1(my - r)}L${f1(mx - r)} ${f1(my + r)}`;
  }
  if (cruz) s += `<path class="ha-cruz-sombra" d="${cruz}"/><path class="ha-cruz" d="${cruz}"/>`;
  s += '</g>';
  // La semana elegida: un marco naranja con un filo oscuro, por encima de todo (no recibe el toque).
  const e = celdas.find((c) => c.i === sel);
  if (e) {
    const m = rect({ x: e.x, y: e.y, w: e.wc, h: e.ch }, 1.3);
    s += `<path class="ha-sel-fondo" d="${m}"/><path class="ha-sel" d="${m}"/>`;
  }
  return `${s}</svg>`;
}
