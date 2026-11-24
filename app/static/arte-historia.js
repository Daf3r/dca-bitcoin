// Los dibujos de «Tu historia» (campamentos 13 y 13B): el tronco, la constelación, la torre de piedras y la manta de añil. Funciones puras:
// reciben los datos que arma `lib.js` (`aniosTronco`, `estrellasConstelacion`, `piedrasTorre`, `semanasManta`) y devuelven un `<svg>` como texto; no tocan el DOM ni usan azar.
//
// CONTRATO (lo usa `historia.js`; el dibujo es libre mientras se cumpla):
//  · Cada función devuelve un solo `<svg viewBox="0 0 320 320" aria-hidden="true" focusable="false">` (el contenedor lleva el `role="img"`);
//    la manta, `0 0 320 H`, con el alto según sus filas.
//  · Cada pieza tocable lleva `data-anio` (anillo del tronco) o `data-i` (estrella o piedra, el índice del dato) y la clase `.pieza`.
//    (Campamento 58) La constelación por semanas (más de 600 compras) no lleva un círculo por estrella: un solo `.hc-vigia` recibe el
//    toque y `historia.js` busca la estrella más cercana.
//  · `sel` es el año (tronco) o el índice (constelación, torre de piedras) seleccionado, o null: la pieza elegida lleva además la clase `sel`.
//  · Colores solo con variables CSS (`var(--…)`) o clases del bloque «Campamento 13» de styles.css; sin estilos en línea (la CSP los
//    bloquea); animaciones solo con transform/opacity y solo con efectos «todos» (clase `efecto-ambiente`).
//  · Poco coste: el tronco, una pieza por año; la constelación, una estrella por compra hasta 600 y después una por semana (en
//    `<path>`s agrupados, no un nodo por estrella); la torre de piedras, hasta 40 piedras; la partitura, como mucho 60 figuras por año.
//    (Campamentos 57 y 58) Tope escrito: ningún dibujo pasa de `TOPE_NODOS` nodos con 10,000 compras en cinco años (`test_lib` lo
//    comprueba con cada dibujo); la manta y los estratos crecen con los años, no con las compras.
//  · La marca de «compra extra» de una pieza que junta varias va por mayoría (`lib.mayoriaExtra`) o por proporción (la veta de la
//    piedra); los textos siguen contando la cifra real.
//
// El lenguaje es el de la montaña y los árboles de honor: formas facetadas, luz que llega desde arriba a la derecha (cara iluminada,
// media luz y sombra, con un filo de luz en los bordes que miran al astro) y pocas piezas con intención. Lo que no se toca (vetas,
// luces, sombras, polvo) va en unos pocos `<path>` con `pointer-events: none`, así el toque cae siempre en la pieza de debajo.
import { fraccionAnio, hoyISO, mayoriaExtra } from './lib.js';

const f1 = (n) => n.toFixed(1);
/** (Campamentos 57 y 58) El tope de nodos de cualquier dibujo de «Tu historia» (lo comprueba `test_lib`). */
export const TOPE_NODOS = 400;
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

/**
 * Tronco: un anillo por año (el más viejo al centro). El ancho de cada anillo sale de `comprados`.
 * (Campamento 20) Con `primer` (`{ fr }`, el tronco del primer año: `lib.mesesTronco`) cada banda es un mes y lleva `data-i` en vez de
 * `data-anio`: un árbol joven, todo albura, con su corte más pequeño cuanto menos año lleva, el borde vivo desde la primera compra
 * (arriba) hasta hoy y, punteada, la vuelta que falta para cerrar su primer anillo.
 */
export function tronco(anios, { sel = null, primer = null } = {}) {
  const n = anios.length;
  if (!n) return `<svg ${MARCO}></svg>`;
  const cx = 160, cy = 152;
  const clave = (y) => (primer ? y.i : y.anio);
  const atrib = primer ? 'data-i' : 'data-anio';
  // Un árbol joven es un corte pequeño; a partir de seis años ocupa todo el sitio. En su primer año crece con el año (de 64 a 94).
  const R = primer ? 64 + 30 * Math.min(1, primer.fr) : 90 + 36 * Math.min(1, (n - 1) / 5);
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

  let s = `<svg class="h-tronco${primer ? ' h-tronco-primer' : ''}${sel != null ? ' con-sel' : ''}" ${MARCO}><defs>`
    + '<linearGradient id="h-t-brillo" x1="0.85" y1="0.1" x2="0.15" y2="0.95"><stop class="ht-b0" offset="0"/><stop class="ht-b1" offset="0.5"/><stop class="ht-b2" offset="1"/></linearGradient></defs>';
  // Sombra en el suelo y el canto del corte (el grosor de la rodaja, visto un poco desde arriba).
  s += `<ellipse class="ht-suelo" cx="${cx + 4}" cy="${f1(cy + R * 0.98 + 12)}" rx="${f1(R * 0.95)}" ry="${f1(R * 0.16)}"/>`;
  // El primer año: la vuelta que falta, punteada, del tamaño que tendrá el tronco al cumplirlo (no se toca).
  if (primer && primer.fr < 1) s += `<circle class="ht-falta" cx="${cx}" cy="${cy}" r="${f1(94 + 3)}"/>`;
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
    // Un árbol joven aún no tiene corazón; en su primer año los meses son bandas de una misma albura (no anillos de años).
    const tono = !y.completo ? 'ht-vivo' : primer ? 'ht-alb0' : k < viejo && n > 2 ? `ht-dur${k % 2}` : `ht-alb${k % 2}`;
    s += `<path class="pieza h-anillo ${tono}${clave(y) === sel ? ' sel' : ''}" ${atrib}="${clave(y)}" d="${poli(bordes[k + 1])}${poli(bordes[k], true)}" fill-rule="evenodd"/>`;
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
    // (Campamento 57) Un nudo por mes con extras (doce por anillo como mucho), en el lugar medio de las suyas: con miles de compras
    // extra, un nudo por compra sería una costra; el texto sigue contándolas todas.
    const porMes = new Map();
    for (const e of y.extras) { const m = Math.min(11, Math.floor(e.frac * 12)), o = porMes.get(m) ?? { s: 0, n: 0 }; o.s += e.frac; o.n++; porMes.set(m, o); }
    for (const o of porMes.values()) {
      const t = angulo(o.s / o.n), [x, yy] = pt(t, r0 + w * 0.5), r = Math.max(1.6, Math.min(3, w * 0.22));
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
    const fr = Math.max(0.02, primer ? primer.fr : fraccionAnio(hoyISO()));
    const pts = []; const pasos = Math.max(2, Math.ceil(fr * LADOS));
    for (let k = 0; k <= pasos; k++) pts.push(pt(angulo((k / pasos) * fr), dentro - 1.2));
    const [hx, hy] = pts.at(-1);
    s += `<path class="ht-cambium" d="${lin(pts)}"/><path class="ht-hoy" d="${punto(hx, hy)}"/><path class="ht-hoy-luz efecto-ambiente" d="${punto(hx, hy)}"/>`;
  }
  s += `<path class="ht-filo" d="${filo}"/></g>`;
  // La pieza elegida: su contorno en naranja, por encima de todo (no es tocable: el toque pasa al anillo de debajo).
  const k = anios.findIndex((y) => clave(y) === sel);
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
  // Zonas para tocar: un círculo invisible por estrella (radio 9 del dibujo, unos 20 px en un teléfono). Por semanas (campamento 58),
  // un solo vigía sobre todo el cielo: `historia.js` elige la estrella más cercana al toque.
  let toques = '<g class="hc-toques">';
  if (estrellas[0].semanal) toques += `<circle class="hc-vigia" cx="160" cy="160" r="${CIELO_R}"/>`;
  else for (const e of estrellas) toques += `<circle class="pieza h-estrella${e.i === sel ? ' sel' : ''}" data-i="${e.i}" cx="${f1(pos[e.i][0])}" cy="${f1(pos[e.i][1])}" r="9"/>`;
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
      // La compra extra: las caras de arriba de la piedra guardan una luz cálida, como una veta de cobre al sol. (Campamento 57) Con
      // varias compras en la piedra, la veta se enciende según la parte que fue extra (hasta un tercio, dos tercios o más).
      const caras = t.luz.split('Z').filter(Boolean).slice(0, 3).map((c) => `${c}Z`).join('');
      const parte = (p.nExtra ?? 1) / p.n, nivel = parte > 2 / 3 ? 3 : parte > 1 / 3 ? 2 : 1;
      if (caras) s += `<path class="hm-veta hm-v${nivel}" d="${caras}"/>`;
    }
    if (p.i === sel) marca = d;
  });
  if (marca) s += `<path class="h-marca" d="${marca}"/>`;
  return `${s}</svg>`;
}

// ================================================================ la manta de añil (campamento 13B)
// Una manta teñida con añil, como las de Izalco y Suchitoto: una fila por año, una celda por semana. El añil es más hondo cuanto más
// sats tuvo esa semana (tono 1 a 4); una semana sin compras es algodón crudo, el mismo hilo sin teñir (nunca un hueco). Las compras
// extra llevan una puntada naranja en cruz (campamento 57: si más de la mitad de las de esa semana lo fueron). Lo de antes de tu primera semana no se teje; lo que falta del año son hilos sueltos (flecos).

/** Celda de cada semana real, con su rectángulo: `k` es su posición en la fila (cada fila llena el ancho, tenga 52 o 53 semanas). */
/** La semana lleva la puntada de «extra» si más de la mitad de sus compras lo fueron (campamento 57). */
const bordada = (w) => w.extra && mayoriaExtra(w.nExtra ?? 1, w.n || 1);

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
  for (const c of celdas) s += `<rect class="pieza celda tono-${c.w.tono}${bordada(c.w) ? ' extra' : ''}${c.i === sel ? ' sel' : ''}" data-i="${c.i}" x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(c.wc + 0.05)}" height="${f1(c.ch)}"/>`;

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
    if (!bordada(c.w)) continue;
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


/**
 * La manta del primer año (campamento 20, 5b): `datos` es `lib.mantaPrimerAnio`. Una sola pieza de 4 hileras de `cols` semanas, de la
 * primera semana del libro a la de su aniversario, tejida de arriba abajo como en el telar: lo tejido son las semanas reales (mismas
 * piezas tocables que la manta de siempre: `<rect class="pieza celda tono-N" data-i>`) y lo que falta es la urdimbre aún sin tejer, con
 * sus hilos que cuelgan abajo. Así unas pocas semanas ya son un retazo que se ve, y la manta no queda partida entre dos años del calendario.
 */
export function mantaPrimer(datos, { sel = null } = {}) {
  const { cols, filas } = datos;
  if (!datos.celdas.length) return '<svg viewBox="0 0 320 60" aria-hidden="true" focusable="false"></svg>';
  const x0 = 10, y0 = 18, W = 300, wc = W / cols, ch = 34, alto = y0 + filas * ch, fondo = alto + 16;
  const rect = (b, e = 0) => `M${f1(b.x - e)} ${f1(b.y - e)}h${f1(b.w + 2 * e)}v${f1(b.h + 2 * e)}h${f1(-b.w - 2 * e)}Z`;
  const celdas = datos.celdas.map((w, i) => ({ w, i, x: x0 + (i % cols) * wc, y: y0 + Math.floor(i / cols) * ch }));
  const nTej = celdas.length, filasTej = Math.ceil(nTej / cols);
  // La tela: las hileras completas y la parte tejida de la hilera en curso.
  const bandas = [];
  for (let f = 0; f < filasTej; f++) bandas.push({ x: x0, y: y0 + f * ch, w: (f < filasTej - 1 ? cols : nTej - f * cols) * wc, h: ch });
  const tela = bandas.map((b) => rect(b)).join('');
  let s = `<svg class="h-manta h-manta-primer" viewBox="0 0 320 ${f1(fondo)}" aria-hidden="true" focusable="false"><defs>`
    + '<pattern id="h-a-trama" width="3" height="2.6" patternUnits="userSpaceOnUse"><path class="ha-p-luz" d="M0.15 0.25h1.2v0.75h-1.2ZM1.65 1.55h1.2v0.75h-1.2Z"/>'
    + '<path class="ha-p-sombra" d="M0 1.15h1.5v0.3H0ZM1.5 2.45h1.5v0.15H1.5ZM1.5 0h1.5v0.15H1.5ZM1.42 0v1.3h0.16V0ZM2.92 1.3v1.3h0.16V1.3Z"/></pattern>'
    + `<linearGradient id="h-a-pliegue" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x0 + W}" y2="0">`
    + '<stop class="ha-g-luz" offset="0"/><stop class="ha-g-sombra" offset="0.17"/><stop class="ha-g-luz" offset="0.36"/><stop class="ha-g-sombra" offset="0.58"/>'
    + '<stop class="ha-g-luz" offset="0.8"/><stop class="ha-g-sombra" offset="1"/></linearGradient>'
    + `<linearGradient id="h-a-luz" gradientUnits="userSpaceOnUse" x1="${x0 + W}" y1="${y0}" x2="${x0}" y2="${alto}"><stop class="ha-l0" offset="0"/><stop class="ha-l1" offset="0.5"/><stop class="ha-l2" offset="1"/></linearGradient>`
    + `<linearGradient id="h-a-fleco" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(y0)}" x2="0" y2="${f1(fondo)}"><stop class="ha-f0" offset="0"/><stop class="ha-f1" offset="0.7"/><stop class="ha-f2" offset="1"/></linearGradient>`
    + '</defs>';
  // El telar: la urdimbre de toda la pieza (hilos crudos verticales), que se ve donde aún no hay tela, y sus puntas que cuelgan abajo.
  let urdimbre = '', mano = '';
  const hilos = Math.max(2, Math.round(wc / 2.6)) * cols;
  for (let h = 0; h < hilos; h++) {
    const x = x0 + (W * (h + 0.5)) / hilos, l = 6 + 6 * fijo(h, 51), curva = (fijo(h, 52) - 0.5) * 2.2;
    urdimbre += `M${f1(x)} ${f1(y0 - 2)}V${f1(alto)}q${f1(curva)} ${f1(l * 0.5)} ${f1(curva * 0.4)} ${f1(l)}`;
    if (h % 3 === 1) mano += punto(x, alto + 1.2);
  }
  s += `<path class="ha-urdimbre ha-telar" d="${urdimbre}"/><path class="ha-manojo" d="${mano}"/>`;
  s += `<path class="ha-sombra" d="${bandas.map((b) => rect({ ...b, x: b.x + 2.2, y: b.y + 3 })).join('')}"/><path class="ha-crudo" d="${tela}"/>`;
  for (const c of celdas) s += `<rect class="pieza celda tono-${c.w.tono}${bordada(c.w) ? ' extra' : ''}${c.i === sel ? ' sel' : ''}" data-i="${c.i}" x="${f1(c.x)}" y="${f1(c.y)}" width="${f1(wc + 0.05)}" height="${f1(ch)}"/>`;
  s += '<g class="ha-sobre">';
  let jaspe = '', jaspeOsc = '';
  for (const c of celdas) {
    if (!c.w.tono) continue;
    const f = fijo(c.w.idx, 31), g = fijo(c.w.idx, 32);
    if (f > 0.42) { const x = c.x + wc * (0.2 + 0.6 * g), y = c.y + ch * (0.12 + 0.3 * f); jaspe += `M${f1(x)} ${f1(y)}v${f1(ch * (0.25 + 0.3 * g))}`; }
    if (c.w.tono >= 2 && g < 0.35) { const x = c.x + wc * (0.3 + 0.4 * f); jaspeOsc += `M${f1(x)} ${f1(c.y + ch * 0.55)}v${f1(ch * 0.3)}`; }
  }
  s += `<path class="ha-jaspe" d="${jaspe}"/><path class="ha-jaspe-osc" d="${jaspeOsc}"/>`;
  s += `<path class="ha-trama" d="${tela}"/><path class="ha-luz" d="${tela}"/><path class="ha-pliegue" d="${tela}"/>`;
  // Una pasada más gruesa entre una hilera y la siguiente (cada trimestre del libro), los orillos y la cenefa de arriba.
  let pasada = '', orillo = '';
  bandas.forEach((b, k) => {
    if (k) pasada += `M${f1(b.x)} ${f1(b.y)}H${f1(b.x + b.w)}`;
    orillo += `M${f1(b.x)} ${f1(b.y)}v${f1(b.h)}`;
    if (k === bandas.length - 1) orillo += `M${f1(b.x)} ${f1(b.y + b.h)}h${f1(b.w)}M${f1(b.x + b.w)} ${f1(b.y)}v${f1(b.h)}`;
    else orillo += `M${f1(b.x + b.w)} ${f1(b.y)}v${f1(b.h)}`;
    const sig = bandas[k + 1];
    if (sig && sig.w < b.w) orillo += `M${f1(sig.x + sig.w)} ${f1(b.y + b.h)}H${f1(b.x + b.w)}`;
  });
  s += `<path class="ha-pasada" d="${pasada}"/><path class="ha-orillo" d="${orillo}"/>`;
  const cy = y0 - 9, n = cols, paso = W / n;
  let greca = '', rombos = '';
  for (let k = 0; k < n; k++) {
    const x = x0 + k * paso, h = 6.4;
    greca += `M${f1(x)} ${f1(cy + h)}h${f1(paso * 0.12)}v-2h${f1(paso * 0.12)}v-2h${f1(paso * 0.12)}v-2h${f1(paso * 0.28)}v2h${f1(paso * 0.12)}v2h${f1(paso * 0.12)}v2Z`;
    if (paso > 7) rombos += `M${f1(x + paso)} ${f1(cy + 1.4)}l1.3 1.6l-1.3 1.6l-1.3 -1.6Z`;
  }
  s += `<path class="ha-cenefa" d="${rect({ x: x0, y: cy, w: W, h: 9 })}"/><path class="ha-greca" d="${greca}"/><path class="ha-rombo" d="${rombos}"/>`
    + `<path class="ha-trama" d="${rect({ x: x0, y: cy, w: W, h: 9 })}"/>`
    + `<path class="ha-orillo" d="M${f1(x0)} ${f1(cy)}h${f1(W)}M${f1(x0)} ${f1(cy)}v9M${f1(x0 + W)} ${f1(cy)}v9"/>`;
  let cruz = '';
  for (const c of celdas) {
    if (!bordada(c.w)) continue;
    const r = Math.min(wc, ch) * 0.3, mx = c.x + wc / 2, my = c.y + ch / 2;
    cruz += `M${f1(mx - r)} ${f1(my - r)}L${f1(mx + r)} ${f1(my + r)}M${f1(mx + r)} ${f1(my - r)}L${f1(mx - r)} ${f1(my + r)}`;
  }
  if (cruz) s += `<path class="ha-cruz-sombra" d="${cruz}"/><path class="ha-cruz" d="${cruz}"/>`;
  s += '</g>';
  const e = celdas.find((c) => c.i === sel);
  if (e) { const m = rect({ x: e.x, y: e.y, w: wc, h: ch }, 1.3); s += `<path class="ha-sel-fondo" d="${m}"/><path class="ha-sel" d="${m}"/>`; }
  return `${s}</svg>`;
}

// ================================================================ los estratos (campamento 13C)
// Un corte geológico: un bloque de tierra visto de lado y un poco desde arriba, con una capa por mes (la más vieja abajo, sobre la roca
// madre). El grosor de cada capa son los sats de ese mes; un mes sin compras es una capa delgada, nunca un hueco. Cada año tiene su
// tierra (arcilla, ocre, arena, roca…) y entre un año y otro queda una veta clara. Lo vendido o gastado desgasta la capa por la derecha
// (un nicho que el agua fue comiendo); las compras extra son vetas de cuarzo que la cruzan. Arriba, la hierba de hoy.

const TIERRAS = 6; // tonos de tierra que se turnan por año (clases he-a0 … he-a5)

/** Estratos: `lista` = `lib.estratosMes`. Cada capa tocable es un `<path class="pieza he-capa">` con `data-i`. */
export function estratos(lista, { sel = null } = {}) {
  const n = lista.length;
  if (!n) return `<svg class="h-estratos" ${MARCO}></svg>`;
  const DX = 30, DY = -17; // la profundidad del bloque (su cara de arriba y su costado se ven hacia arriba a la derecha)
  // Con pocos meses el bloque es una muestra pequeña y centrada (con más roca madre debajo, para que siga leyéndose como un bloque).
  const W = 150 + 104 * Math.min(1, (n - 1) / 11);
  const pesos = lista.map((e) => 0.24 + 0.76 * e.espesor);
  const suma = pesos.reduce((a, b) => a + b, 0);
  const u = Math.min(30, 192 / suma), H = u * suma;
  const roca = Math.max(20, 100 - H);
  const xL = (320 - W - DX) / 2, xR = xL + W;
  const yT = 152 - (DY + H + roca) / 2; // arriba de la capa más nueva
  const yB = yT + H; // abajo de la más vieja: empieza la roca madre
  // Dónde va cada capa: de abajo arriba.
  const capas = [];
  let y = yB;
  lista.forEach((e, k) => { const h = pesos[k] * u; capas.push({ e, y0: y - h, y1: y, h }); y -= h; });
  const anio0 = lista[0].anio;
  // Los estratos no son reglas: todas las juntas ondulan igual (un pliegue suave y un buzamiento leve), así nunca se cruzan.
  const A = Math.min(3.4, 1.2 + H * 0.012);
  // Impar respecto al centro (sube a un lado lo que baja al otro): así el centro de cada capa cae siempre dentro de ella.
  const ola = (x) => { const t = (x - xL) / W - 0.5; return A * (0.7 * Math.sin(t * TAU) + 0.28 * Math.sin(t * TAU * 2.4)) - 2.2 * t; };
  const PASOS = 14;
  const xs = Array.from({ length: PASOS + 1 }, (_, k) => xL + (W * k) / PASOS);
  /** Una junta ondulada a la altura `y` (de izquierda a derecha, o al revés). */
  const junta = (y, rev = false, x0 = xL, x1 = xR) => (rev ? [...xs].reverse() : xs).filter((x) => x >= x0 - 0.01 && x <= x1 + 0.01).map((x) => [x, y + ola(x)]);
  /** La banda entre dos juntas (el frente de una capa). */
  const banda = (y0, y1, e = 0) => `${lin([...junta(y0 - e).map(([x, y], k, a) => [k === 0 ? x - e : k === a.length - 1 ? x + e : x, y]), ...junta(y1 + e, true).map(([x, y], k, a) => [k === 0 ? x + e : k === a.length - 1 ? x - e : x, y])])}Z`;
  const oR = ola(xR);
  const lado = (y0, y1) => `M${f1(xR)} ${f1(y0 + oR)}L${f1(xR + DX)} ${f1(y0 + oR + DY)}V${f1(y1 + oR + DY)}L${f1(xR)} ${f1(y1 + oR)}Z`;

  let s = `<svg class="h-estratos" ${MARCO}><defs>`
    + `<linearGradient id="h-e-luz" gradientUnits="userSpaceOnUse" x1="${f1(xR)}" y1="${f1(yT)}" x2="${f1(xL)}" y2="${f1(yB + roca)}"><stop class="he-l0" offset="0"/><stop class="he-l1" offset="0.45"/><stop class="he-l2" offset="1"/></linearGradient>`
    + `<linearGradient id="h-e-lado" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(yT + DY)}" x2="0" y2="${f1(yB + roca)}"><stop class="he-d0" offset="0"/><stop class="he-d1" offset="1"/></linearGradient>`
    + '<radialGradient id="h-e-suelo" cx="0.5" cy="0.5" r="0.5"><stop class="he-s0" offset="0"/><stop class="he-s1" offset="1"/></radialGradient>'
    + '</defs>';
  // La sombra del bloque sobre el suelo.
  const yS = yB + roca;
  s += `<ellipse class="he-suelo" cx="${f1(xL + W / 2 + DX * 0.35)}" cy="${f1(yS + 2)}" rx="${f1(W * 0.66 + DX * 0.5)}" ry="${f1(10 + W * 0.04)}"/>`;

  // La roca madre: el pie del bloque, gris y tallada (no es un mes: no se toca).
  s += `<path class="he-roca" d="${lin([...junta(yB), [xR, yS], [xL, yS]])}Z"/><path class="he-roca-lado" d="M${f1(xR)} ${f1(yB + oR)}L${f1(xR + DX)} ${f1(yB + oR + DY)}V${f1(yS + DY)}L${f1(xR)} ${f1(yS)}Z"/>`;
  // La roca madre en bloques: juntas casi verticales, y en cada bloque una cara de luz (arriba a la derecha) y una de sombra.
  let grieta = '', facR = '', facS = '';
  const nb = Math.max(3, Math.round(W / 46));
  let xa = xL;
  for (let k = 0; k <= nb; k++) {
    const xb = k === nb ? xR : xL + (W * (k + 0.35 + 0.3 * fijo(k, 61))) / (nb + 0.6);
    const top = (x) => yB + ola(x) + 1;
    if (k < nb) grieta += `M${f1(xb)} ${f1(yS)}L${f1(xb + 2.5 * (fijo(k, 63) - 0.5))} ${f1((top(xb) + yS) / 2)}L${f1(xb + 1.5 * (fijo(k, 64) - 0.5))} ${f1(top(xb))}`;
    // Cada bloque, tallado: un plano de luz arriba a la derecha y una cuña de sombra abajo a la izquierda.
    const w = xb - xa, hh = yS - top(xb), f = fijo(k, 65);
    facR += `${lin([[xa + w * (0.35 + 0.15 * f), top(xa + w * 0.4) + 0.4], [xb - 1, top(xb - 1) + 0.4], [xb - 1, top(xb) + hh * (0.4 + 0.2 * f)], [xa + w * (0.62 + 0.1 * f), top(xa + w * 0.6) + hh * 0.3]])}Z`;
    facS += `${lin([[xa + 1, top(xa + 1) + hh * (0.45 + 0.2 * fijo(k, 66))], [xa + w * (0.4 + 0.15 * f), yS], [xa + 1, yS]])}Z`;
    xa = xb;
  }
  s += `<path class="he-roca-cara" d="${facR}"/><path class="he-roca-sombra" d="${facS}"/><path class="he-roca-grieta" d="${grieta}"/>`;

  // El costado del bloque: una banda por año (los meses de un año están juntos), en su misma tierra, iluminado.
  const porAnio = new Map();
  for (const c of capas) { const a = porAnio.get(c.e.anio); if (a) a.y0 = c.y0; else porAnio.set(c.e.anio, { y0: c.y0, y1: c.y1 }); }
  for (const [a, r] of porAnio) s += `<path class="he-lado he-a${(a - anio0) % TIERRAS}" d="${lado(r.y0, r.y1)}"/>`;
  let juntas = '', vetasLado = '';
  capas.forEach((c, k) => {
    if (!k) return;
    const nuevoAnio = c.e.anio !== capas[k - 1].e.anio;
    const d = `M${f1(xR)} ${f1(c.y1 + oR)}l${DX} ${DY}`;
    if (nuevoAnio) vetasLado += d; else if (c.h > 1.6) juntas += d;
  });
  s += `<path class="he-lado-sombra" d="${lado(yT, yS)}"/><path class="he-junta" d="${juntas}"/><path class="he-veta-lado" d="${vetasLado}"/>`;

  // La cara de arriba: la tierra de hoy, con su hierba.
  const cima = `${lin([...junta(yT), ...junta(yT, true).map(([x, y]) => [x + DX, y + DY])])}Z`;
  s += `<path class="he-cima" d="${cima}"/>`;

  // Las capas: el frente de cada mes es la pieza tocable.
  for (const c of capas) {
    const a = (c.e.anio - anio0) % TIERRAS, par = Number(c.e.mes.slice(5)) % 2;
    s += `<path class="pieza he-capa he-a${a}${par ? ' he-par' : ''}${c.e.i === sel ? ' sel' : ''}" data-i="${c.e.i}" d="${banda(c.y0, c.y1 + 0.05)}"/>`;
  }

  // Encima de las capas (sin recibir el toque): la textura, las vetas entre años, la erosión, el cuarzo, la luz y la hierba.
  s += '<g class="he-sobre">';
  let grano = '', lamina = '', veta = '', nicho = '', labio = '', cuarzo = '', cuarzoLuz = '', destellos = '', regla = '';
  capas.forEach((c, k) => {
    const { e, y0, y1, h } = c;
    // Textura: guijarros y láminas finas en las capas que tienen sitio (fijos por mes).
    if (h > 4.5) {
      const nn = Math.min(4, Math.floor(h / 4));
      for (let j = 0; j < nn; j++) {
        const gx = xL + 6 + (W - 12) * fijo(e.i * 5 + j, 71), gy = y0 + ola(gx) + h * (0.25 + 0.5 * fijo(e.i * 5 + j, 72)), r = Math.min(h * 0.18, 0.7 + 1.6 * fijo(e.i * 5 + j, 73));
        grano += `M${f1(gx - r)} ${f1(gy)}a${f1(r)} ${f1(r * 0.7)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r * 0.7)} 0 1 0 ${f1(-2 * r)} 0Z`;
      }
      const lx = xL + W * (0.08 + 0.5 * fijo(e.i, 74)), lw = W * (0.18 + 0.25 * fijo(e.i, 76)), lf = h * (0.35 + 0.3 * fijo(e.i, 75));
      lamina += lin(junta(y0 + lf, false, lx, lx + lw));
      if (h > 10) lamina += lin(junta(y0 + lf + h * 0.22, false, lx + W * 0.24, lx + W * 0.46));
    }
    // La veta clara entre un año y el siguiente, y su muesca en la regla de la izquierda.
    if (k && e.anio !== capas[k - 1].e.anio) {
      veta += lin(junta(y1));
      regla += `M${f1(xL - 4)} ${f1(y1 + ola(xL))}h-7`;
    }
    // La erosión: un nicho que entra por la derecha, tan ancho como lo vendido o gastado ese mes.
    if (e.erosion > 0) {
      const eh = Math.max(4, e.erosion * W * 0.34), a0 = y0 + oR, a1 = y1 + oR, m = a0 + h * 0.5;
      const d = `M${f1(xR)} ${f1(a0 + h * 0.08)}C${f1(xR - eh * 0.55)} ${f1(a0 + h * 0.1)} ${f1(xR - eh)} ${f1(m - h * 0.2)} ${f1(xR - eh)} ${f1(m)}`
        + `S${f1(xR - eh * 0.4)} ${f1(a1 - h * 0.04)} ${f1(xR)} ${f1(a1 - h * 0.02)}`;
      nicho += `${d}Z`;
      labio += d;
    }
    // El cuarzo de las compras extra: una veta de cristal que cruza la capa en diagonal, con su filo de luz y un destello.
    for (let j = 0; j < Math.min(3, e.nExtras); j++) {
      // Las vetas se meten un poco en las capas vecinas (así se ven aunque el mes sea delgado).
      const t = 0.18 + 0.64 * fijo(e.i * 3 + j, 81), x0 = xL + (W - 20) * t, sl = Math.min(10, 4 + h * 0.6), w = 1.4 + Math.min(2.2, h * 0.12);
      const top = y0 + ola(x0) - 2.6, bot = y1 + ola(x0 + sl) + 2.6;
      cuarzo += `M${f1(x0 - w)} ${f1(top)}L${f1(x0 + w)} ${f1(top)}L${f1(x0 + sl * 0.55 + w * 0.6)} ${f1((top + bot) / 2)}L${f1(x0 + sl + w)} ${f1(bot)}L${f1(x0 + sl - w)} ${f1(bot)}L${f1(x0 + sl * 0.55 - w * 0.7)} ${f1((top + bot) / 2)}Z`;
      cuarzoLuz += `M${f1(x0 + w * 0.6)} ${f1(top + 0.4)}L${f1(x0 + sl * 0.55 + w * 0.3)} ${f1((top + bot) / 2)}`;
      const dl = 2.6 + Math.min(2.4, h * 0.2);
      destellos += destello(x0 + sl * 0.55, (top + bot) / 2, dl, dl * 0.18);
    }
  });
  s += `<path class="he-grano" d="${grano}"/><path class="he-lamina" d="${lamina}"/>`
    + `<path class="he-luz" d="${banda(yT, yB)}"/>`
    + `<path class="he-nicho" d="${nicho}"/><path class="he-nicho-labio" d="${labio}"/><path class="he-veta" d="${veta}"/>`
    + `<path class="he-cuarzo" d="${cuarzo}"/><path class="he-cuarzo-luz" d="${cuarzoLuz}"/><path class="he-destello" d="${destellos}"/>`;
  // El canto del bloque: el filo de luz de la esquina que mira al astro y el borde de arriba.
  s += `<path class="he-filo" d="M${f1(xR)} ${f1(yS)}V${f1(yT + oR)}L${f1(xR + DX)} ${f1(yT + oR + DY)}"/>`;
  // La regla de la izquierda: una muesca por cada cambio de año, sin texto (los años los dice el texto de abajo).
  const oL = ola(xL);
  s += `<path class="he-regla" d="M${f1(xL - 4)} ${f1(yT + oL)}V${f1(yB + oL)}${regla}M${f1(xL - 4)} ${f1(yT + oL)}h-4M${f1(xL - 4)} ${f1(yB + oL)}h-4"/>`;
  // La hierba de hoy: matas en el borde de delante y unas pocas sobre la cara de arriba; el borde de la capa en curso, vivo.
  let hierba = '';
  const matas = Math.round(W / 9);
  for (let k = 0; k < matas; k++) {
    const hx = xL + 3 + ((W - 6) * (k + fijo(k, 91) * 0.6)) / matas, a = 2.2 + 2.6 * fijo(k, 92);
    const hy = yT + ola(hx) + 0.6;
    hierba += `M${f1(hx - 1.6)} ${f1(hy)}l${f1(0.6)} ${f1(-a)}M${f1(hx)} ${f1(hy)}l${f1(0.4 + fijo(k, 93))} ${f1(-a * 1.3)}M${f1(hx + 1.4)} ${f1(hy)}l${f1(1.2)} ${f1(-a * 0.8)}`;
  }
  for (let k = 0; k < 7; k++) {
    const t = fijo(k, 94), d = 0.25 + 0.6 * fijo(k, 95), bx = xL + 10 + (W - 20) * t, hx = bx + DX * d, hy = yT + ola(bx) + DY * d;
    hierba += `M${f1(hx)} ${f1(hy)}l-0.8 -2.4M${f1(hx + 1)} ${f1(hy)}l0.4 -3M${f1(hx + 2)} ${f1(hy)}l1 -2.2`;
  }
  s += `<path class="he-hierba" d="${hierba}"/>`;
  const ult = capas.at(-1);
  if (ult.e.enCurso) { const v = lin(junta(yT + 0.4)); s += `<path class="he-vivo" d="${v}l${DX} ${DY}"/><path class="he-vivo-luz efecto-ambiente" d="${v}"/>`; }
  s += '</g>';

  // La capa elegida: un marco naranja con un filo oscuro y una flecha en la regla (no reciben el toque).
  const c = capas.find((x) => x.e.i === sel);
  if (c) {
    const m = banda(c.y0, c.y1, 1.2), ym = (c.y0 + c.y1) / 2 + ola(xL);
    s += `<path class="he-sel-fondo" d="${m}"/><path class="he-sel" d="${m}"/>`
      + `<path class="he-sel-flecha" d="M${f1(xL - 16)} ${f1(ym - 4.5)}L${f1(xL - 8)} ${f1(ym)}L${f1(xL - 16)} ${f1(ym + 4.5)}Z"/>`;
  }
  return `${s}</svg>`;
}

// ================================================================ la partitura (campamento 13C; campamentos 57 y 58)
// Una pauta por año: cuanto más caro estaba BTC, más aguda la nota. La clave es la montañita del logo. Tres alturas
// (`lib.figurasPartitura` y `lib.figurasTodos`):
//  · por días (hasta 60 notas en el año): una cabeza por día de compra, repartidas por cantidad y no por calendario (las del mismo
//    día son un acorde con su «×n»); las de un mismo mes van unidas por su barra, como corcheas, y cada mes lleva su nombre encima.
//  · por semanas (más de 60): una figura por semana en cuatro pautas de catorce semanas. La barra es el rango de precios de la
//    semana; la cabeza, su nota del medio, más grande con más compras, y el número debajo, cuántas. Una rayita es una semana sin compras.
//    La semana elegida se abre debajo, día por día (sin piezas tocables: se lee en el texto).
//  · todos los años: una pauta por año y una figura por mes, del mismo modo.
// La marca de «extra» va por mayoría: la cabeza naranja si más de la mitad de lo que junta fue extra (sin aros).

const PASO_P = 6; // media distancia entre dos líneas de la pauta
const SISTEMA = 112; // alto de cada sistema (pauta con sus líneas adicionales y sus plicas)
const X0P = 56, X1P = 308; // donde empiezan las notas (tras la clave) y donde acaba la pauta
const PASO_C = 3.4, SISTEMA_C = 74, X0C = 44; // la pauta compacta de las figuras por semana y por mes
const POR_SISTEMA = 14; // semanas por pauta (cuatro pautas: hasta 56 semanas, y un año tiene como mucho 54)
const MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA_C = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Una cabeza de nota: una elipse inclinada (dos arcos), como las de una partitura grabada. */
function cabeza(x, y, rx, ry) {
  const t = (-22 * Math.PI) / 180, dx = rx * Math.cos(t), dy = rx * Math.sin(t);
  return `M${f1(x - dx)} ${f1(y - dy)}a${f1(rx)} ${f1(ry)} -22 1 0 ${f1(2 * dx)} ${f1(2 * dy)}a${f1(rx)} ${f1(ry)} -22 1 0 ${f1(-2 * dx)} ${f1(-2 * dy)}Z`;
}

/** La clave: la montañita del logo, alta como la pauta (`P` es su media distancia), con el sendero que la sube y el sol de la cumbre. */
function clave(x, yc, P = PASO_P) {
  // Ancha como el logo (no una aguja): del pie, bajo la pauta, a la cumbre, sobre la quinta línea; el sol junto al hombro derecho.
  const k = 1.22 * Math.min(1, (P / PASO_P) * 1.25), X = (d) => x + d * k;
  const yb = yc + 4.3 * P, yp = yc - 4.5 * P;
  const pts = [[X(-1), yb], [X(6), yc + 0.8 * P], [X(12.5), yp], [X(17.5), yc - 1.4 * P], [X(21), yc - 2.6 * P], [X(30), yb]];
  const nieve = `M${f1(X(9.2))} ${f1(yc - 2.3 * P)}L${f1(X(12.5))} ${f1(yp)}L${f1(X(15.4))} ${f1(yc - 2.5 * P)}L${f1(X(13.6))} ${f1(yc - 2 * P)}L${f1(X(12))} ${f1(yc - 2.7 * P)}Z`;
  const sendero = `M${f1(X(15))} ${f1(yb - 1.2)}L${f1(X(8))} ${f1(yc + 2.2 * P)}L${f1(X(16))} ${f1(yc + 0.4 * P)}L${f1(X(11))} ${f1(yc - 1.2 * P)}`;
  return { cuerpo: `${lin(pts)}Z`, nieve, sendero, sol: `M${f1(X(24.5))} ${f1(yc - 4.6 * P)}h0.01` };
}

/** El papel, las cinco líneas de cada pauta, sus barras y sus claves; `S` pautas con centro `yc(j)`. */
function pautas(S, H, yN, yc, P, x0) {
  let s = `<svg class="h-partitura" viewBox="0 0 320 ${H}" aria-hidden="true" focusable="false"><defs>`
    + '<linearGradient id="h-p-papel" x1="0.9" y1="0" x2="0.1" y2="1"><stop class="hp-p0" offset="0"/><stop class="hp-p1" offset="0.6"/><stop class="hp-p2" offset="1"/></linearGradient>'
    + '</defs>';
  s += `<rect class="hp-sombra" x="4" y="5" width="314" height="${H - 5}" rx="9"/><rect class="hp-papel" x="1" y="1" width="314" height="${H - 5}" rx="9"/>`;
  let lineas = '', barras = '';
  const claves = { cuerpo: '', nieve: '', sendero: '', sol: '' };
  for (let j = 0; j < S; j++) {
    for (const p of [2, 4, 6, 8, 10]) lineas += `M12 ${f1(yN(j, p))}H${X1P}`;
    barras += `M12 ${f1(yN(j, 10))}V${f1(yN(j, 2))}`;
    if (j < S - 1) barras += `M${X1P} ${f1(yN(j, 10))}V${f1(yN(j, 2))}`;
    const c = clave(15, yc(j), P);
    for (const k of Object.keys(claves)) claves[k] += c[k];
  }
  s += `<path class="hp-linea" d="${lineas}"/><path class="hp-barra" d="${barras}"/><path class="hp-fin" d="M${X1P - 5} ${f1(yN(S - 1, 10))}V${f1(yN(S - 1, 2))}"/>`
    + `<path class="hp-final" d="M${X1P - 1.2} ${f1(yN(S - 1, 10))}V${f1(yN(S - 1, 2))}"/>`
    + `<path class="hp-clave" d="${claves.cuerpo}"/><path class="hp-clave-nieve" d="${claves.nieve}"/><path class="hp-clave-sendero" d="${claves.sendero}"/><path class="hp-clave-sol" d="${claves.sol}"/>`;
  return { s, x0 };
}

/**
 * Partitura: `fig` = lo que dan `lib.figurasPartitura` (un año, por días o por semanas) o `lib.figurasTodos` (todos los años, por
 * meses). Cada figura tocable es una `.pieza.hp-toque` con `data-i` (su índice en `fig.figuras`, el mismo que suena con «Tocar»):
 * un círculo sobre la cabeza por días; una columna de pauta entera por semanas y por meses (no se tapan entre sí).
 */
export function partitura(fig, { sel = null } = {}) {
  const figuras = fig?.figuras ?? [];
  if (fig?.modo === 'semana' || fig?.modo === 'todos') return resumen(fig, sel);
  const F = figuras.length;
  const S = Math.max(1, Math.ceil(F / 16)); // sistemas: hasta 16 figuras en cada uno
  const H = Math.max(150, 24 + S * SISTEMA);
  const yc = (j) => 12 + SISTEMA / 2 + j * SISTEMA + (S === 1 ? (H - 24 - SISTEMA) / 2 : 0);
  const yN = (j, p) => yc(j) - (p - 6) * PASO_P;
  const ancho = X1P - X0P - 10;
  let { s } = pautas(S, H, yN, yc, PASO_P, X0P);
  const por = Math.max(1, Math.ceil(F / S));
  // Dónde va cada figura: su sistema y su lugar en él por orden (no por calendario), y su y por su nota.
  const pos = figuras.map((f, k) => {
    const j = Math.floor(k / por), q = k - j * por;
    return { f, j, x: X0P + 5 + ((q + 0.5) / por) * ancho, y: yN(j, f.paso), mes: f.mes };
  });
  const rx = 4.2, ry = rx * 0.72;
  // Los meses: una barra entre dos figuras de meses distintos y el nombre del mes sobre la primera de cada uno.
  let barras = '', etiquetas = '', numeros = '';
  pos.forEach((p, k) => {
    const a = pos[k - 1];
    if (a && a.j === p.j && a.mes !== p.mes) barras += `M${f1((a.x + p.x) / 2)} ${f1(yN(p.j, 10))}V${f1(yN(p.j, 2))}`;
    if (!a || a.j !== p.j || a.mes !== p.mes) etiquetas += `<text class="hp-eti" x="${f1(p.x - rx)}" y="${f1(yN(p.j, 12.8))}">${MES_C[p.mes]}</text>`;
    if (p.f.n > 1) numeros += `<text class="hp-num" x="${f1(p.x)}" y="${f1(yN(p.j, -0.9))}" text-anchor="middle">×${p.f.n}</text>`;
  });
  s += `<path class="hp-barra" d="${barras}"/>`;

  // Las plicas y las barras: las figuras de un mismo mes van unidas; una sola en su mes es una negra.
  const L = 3.4 * PASO_P;
  let plicas = '', vigas = '', adicionales = '', cabezas = '', extras = '';
  const grupos = [];
  // Un mismo mes va unido, salvo un salto muy grande (más de una octava): ahí cada nota lleva su plica, como en un grabado cuidado.
  for (const p of pos) {
    const g = grupos.at(-1);
    const junto = g && g[0].j === p.j && g[0].mes === p.mes && Math.max(p.f.paso, ...g.map((q) => q.f.paso)) - Math.min(p.f.paso, ...g.map((q) => q.f.paso)) <= 7;
    if (junto) g.push(p); else grupos.push([p]);
  }
  for (const g of grupos) {
    const media = g.reduce((a, p) => a + p.f.paso, 0) / g.length, abajo = media >= 6, sx = abajo ? -rx * 0.86 : rx * 0.86;
    if (g.length === 1) {
      const p = g[0], ab = p.f.paso >= 6, sx1 = ab ? -rx * 0.86 : rx * 0.86;
      plicas += `M${f1(p.x + sx1)} ${f1(p.y)}V${f1(p.y + (ab ? L : -L))}`;
      continue;
    }
    // La barra: con la pendiente de la primera a la última (moderada) y lo bastante lejos para que todas las plicas la alcancen.
    const a = g[0], b = g.at(-1), xa = a.x + sx, xb = b.x + sx;
    const pend = Math.max(-0.22, Math.min(0.22, (b.y - a.y) / Math.max(1, xb - xa)));
    const base = g.map((p) => (abajo ? p.y + L * 0.85 : p.y - L * 0.85) - pend * (p.x + sx - xa));
    const c0 = abajo ? Math.max(...base) : Math.min(...base);
    const yv = (x) => c0 + pend * (x - xa);
    for (const p of g) plicas += `M${f1(p.x + sx)} ${f1(p.y)}V${f1(yv(p.x + sx))}`;
    const t = 2.4, dir = abajo ? -1 : 1;
    const viga = (off) => `M${f1(xa - 0.5)} ${f1(yv(xa) + off)}L${f1(xb + 0.5)} ${f1(yv(xb) + off)}L${f1(xb + 0.5)} ${f1(yv(xb) + off + dir * t)}L${f1(xa - 0.5)} ${f1(yv(xa) + off + dir * t)}Z`;
    vigas += viga(0);
    if (g.length >= 4) vigas += viga(dir * 4.2); // semicorcheas: una segunda barra
  }
  // Las líneas adicionales (el do de abajo y el la de arriba) y las cabezas: naranja si la mayoría de las compras de ese día fue extra.
  for (const p of pos) {
    if (p.f.paso <= 0 || p.f.paso >= 12) adicionales += `M${f1(p.x - rx - 2.6)} ${f1(p.y)}h${f1(2 * rx + 5.2)}`;
    if (p.f.extra) extras += cabeza(p.x, p.y, rx, ry); else cabezas += cabeza(p.x, p.y, rx, ry);
  }
  s += `<path class="hp-adicional" d="${adicionales}"/><path class="hp-plica" d="${plicas}"/><path class="hp-viga" d="${vigas}"/>`
    + `<path class="hp-cabeza" d="${cabezas}"/><path class="hp-cabeza hp-extra" d="${extras}"/>${etiquetas}${numeros}`;
  // Las zonas para tocar: un círculo por figura (invisible; se enciende al elegirla o mientras suena).
  s += '<g class="hp-toques">';
  for (const p of pos) s += `<circle class="pieza hp-toque${p.f.i === sel ? ' sel' : ''}" data-i="${p.f.i}" cx="${f1(p.x)}" cy="${f1(p.y)}" r="9"/>`;
  return `${s}</g></svg>`;
}

/** Una figura resumen: la barra del rango de su nota, la cabeza en la del medio (más grande con más compras) y su cantidad debajo. */
function figuraResumen(f, x, yN, j, rmax, acc, numMin) {
  if (f.pasoMax > f.pasoMin) acc.rango += `M${f1(x)} ${f1(yN(j, f.pasoMax))}V${f1(yN(j, f.pasoMin))}`;
  const r = Math.min(rmax, 2.5 + 0.8 * Math.sqrt(f.n - 1)), y = yN(j, f.paso);
  acc[f.extra ? 'ex' : 'no'] += cabeza(x, y, r, r * 0.74);
  if (f.paso <= 0 || f.paso >= 12) acc.adicional += `M${f1(x - r - 2)} ${f1(y)}h${f1(2 * r + 4)}`;
  if (f.n >= numMin) acc.num += `<text class="hp-num" x="${f1(x)}" y="${f1(yN(j, -2.6))}" text-anchor="middle">${f.n}</text>`;
}
const juntar = (acc) => `<path class="hp-rango" d="${acc.rango}"/><path class="hp-adicional" d="${acc.adicional}"/><path class="hp-cabeza" d="${acc.no}"/><path class="hp-cabeza hp-extra" d="${acc.ex}"/>`
  + `<path class="hp-sil" d="${acc.sil}"/>${acc.num}`;
const nuevoAcc = () => ({ rango: '', adicional: '', no: '', ex: '', sil: '', num: '' });
const fechaUTC = (anio, dia) => new Date(Date.UTC(anio, 0, 1 + dia));

/** Las figuras por semana (un año) o por mes (todos los años), en pautas compactas; con una semana elegida, sus días debajo. */
function resumen(fig, sel) {
  const figuras = fig.figuras, todos = fig.modo === 'todos';
  const S = todos ? Math.max(1, fig.anios.length) : 4;
  const slots = todos ? 12 : POR_SISTEMA;
  const elegida = !todos && sel != null ? figuras[sel] : null;
  // Por semanas, el sitio de la semana abierta se guarda siempre (vacío hasta elegir una): elegir no mueve lo de debajo, ni ‹ ›.
  const H = 20 + S * SISTEMA_C + (todos ? 0 : SISTEMA_C + 22);
  const yc = (j) => 14 + SISTEMA_C / 2 + j * SISTEMA_C + (j >= S ? 12 : 0);
  const yN = (j, p) => yc(j) - (p - 6) * PASO_C;
  const ancho = (X1P - X0C - 10) / slots;
  let { s } = pautas(S, H, yN, yc, PASO_C, X0C);
  const xDe = (k) => X0C + 4 + (k + 0.5) * ancho;
  const lugar = (f) => (todos ? { j: f.fila, k: f.col } : { j: Math.floor(f.col / POR_SISTEMA), k: f.col % POR_SISTEMA });
  // Qué dice cada pauta: el año (todos) o sus meses (por semanas, de la primera a la última semana que le tocan).
  let eti = '';
  if (todos) fig.anios.forEach((a, j) => { eti += `<text class="hp-eti" x="${X1P}" y="${f1(yN(j, 13.6))}" text-anchor="end">${a}</text>`; });
  else {
    const lunes = -((fechaUTC(fig.anio, 0).getUTCDay() + 6) % 7); // el lunes de la semana del 1 de enero, en días desde el 1 de enero
    const fin = (Date.UTC(fig.anio + 1, 0, 1) - Date.UTC(fig.anio, 0, 1)) / 864e5 - 1;
    for (let j = 0; j < S; j++) {
      const d0 = Math.max(0, lunes + j * POR_SISTEMA * 7), d1 = Math.min(fin, lunes + (j + 1) * POR_SISTEMA * 7 - 1);
      if (d0 > fin) continue;
      const m0 = fechaUTC(fig.anio, d0).getUTCMonth(), m1 = fechaUTC(fig.anio, d1).getUTCMonth();
      eti += `<text class="hp-eti" x="${X1P}" y="${f1(yN(j, 13.6))}" text-anchor="end">${m0 === m1 ? MES_C[m0] : `${MES_C[m0]} – ${MES_C[m1]}`}</text>`;
    }
  }
  const acc = nuevoAcc();
  let toques = '', marco = '';
  // Las rayitas de silencio: los huecos entre la primera figura y la última.
  const ocupado = new Set(figuras.map((f) => { const l = lugar(f); return l.j * slots + l.k; }));
  if (figuras.length) {
    const a = lugar(figuras[0]), b = lugar(figuras.at(-1));
    for (let q = a.j * slots + a.k + 1; q < b.j * slots + b.k; q++) if (!ocupado.has(q)) { const x = xDe(q % slots); acc.sil += `M${f1(x - 2.2)} ${f1(yN(Math.floor(q / slots), 6))}h4.4`; }
  }
  for (const f of figuras) {
    const { j, k } = lugar(f), x = xDe(k);
    figuraResumen(f, x, yN, j, todos ? 6 : 5.4, acc, todos ? 1 : 2);
    toques += `<rect class="pieza hp-toque hp-col${f.i === sel ? ' sel' : ''}" data-i="${f.i}" x="${f1(x - ancho / 2)}" y="${f1(yN(j, 14))}" width="${f1(ancho)}" height="${f1(18 * PASO_C)}" rx="4"/>`;
  }
  // La semana elegida, abierta día por día (solo se mira: el detalle se lee en el texto de debajo). Sin elegir, su pauta vacía y una pista.
  if (!todos && !elegida) {
    let lineas = '';
    for (const p of [2, 4, 6, 8, 10]) lineas += `M12 ${f1(yN(S, p))}H${X1P}`;
    s += `<g class="hp-semana hp-vacia"><path class="hp-corte" d="M20 ${f1(yc(S) - SISTEMA_C / 2 - 2)}H${X1P - 8}"/><path class="hp-linea" d="${lineas}"/>`
      + `<text class="hp-eti" x="${f1((X0C + X1P) / 2)}" y="${f1(yN(S, -5.4))}" text-anchor="middle">toca una semana para verla día por día</text></g>`;
  }
  if (elegida) {
    const j = S, dias = (Date.UTC(...ymd(elegida.hasta)) - Date.UTC(...ymd(elegida.desde))) / 864e5 + 1;
    const anchoD = (X1P - X0C - 10) / 7, d0 = new Date(Date.UTC(...ymd(elegida.desde)));
    const dAcc = nuevoAcc();
    let dEti = '';
    for (let k = 0; k < dias; k++) {
      const d = new Date(d0.getTime() + k * 864e5), iso = d.toISOString().slice(0, 10), x = X0C + 4 + (k + 0.5) * anchoD;
      dEti += `<text class="hp-eti hp-dia" x="${f1(x)}" y="${f1(yN(j, -5.4))}" text-anchor="middle">${DIA_C[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()}</text>`;
      const g = elegida.notas.filter((nt) => nt.fecha === iso);
      if (!g.length) continue;
      const ps = g.map((nt) => nt.paso).sort((a, b) => a - b), nEx = g.filter((nt) => nt.extra).length;
      figuraResumen({ n: g.length, paso: ps[Math.floor((ps.length - 1) / 2)], pasoMin: ps[0], pasoMax: ps.at(-1), extra: nEx * 2 > g.length }, x, yN, j, 5.4, dAcc, 2);
    }
    let lineas = '';
    for (const p of [2, 4, 6, 8, 10]) lineas += `M12 ${f1(yN(j, p))}H${X1P}`;
    const c = clave(15, yc(j), PASO_C);
    s += `<g class="hp-semana"><path class="hp-corte" d="M20 ${f1(yc(j) - SISTEMA_C / 2 - 2)}H${X1P - 8}"/><path class="hp-linea" d="${lineas}"/>`
      + `<path class="hp-barra" d="M12 ${f1(yN(j, 10))}V${f1(yN(j, 2))}M${X1P} ${f1(yN(j, 10))}V${f1(yN(j, 2))}"/>`
      + `<path class="hp-clave" d="${c.cuerpo}"/><path class="hp-clave-nieve" d="${c.nieve}"/>${juntar(dAcc)}${dEti}</g>`;
    const { j: js, k: ks } = lugar(elegida);
    marco = `<path class="hp-lazo" d="M${f1(xDe(ks))} ${f1(yN(js, -2.6) + 3)}V${f1(yc(S) - SISTEMA_C / 2 - 2)}"/>`;
  }
  s += eti + juntar(acc) + marco;
  return `${s}<g class="hp-toques">${toques}</g></svg>`;
}
/** «2026-11-03» → [2026, 10, 3] (para `Date.UTC`). */
const ymd = (f) => { const [y, m, d] = f.split('-').map(Number); return /** @type {[number, number, number]} */ ([y, m - 1, d]); };
