// (Campamento 25) Los osos polares de peluche de la familia, sentados en la nieve al sol bajo la cumbre. Funciones puras que devuelven
// SVG como texto o un sitio (sin DOM, sin el `rnd()` de la montaña). Los coloca `montana.js`; los colores van en styles.css (bloque
// «Campamento 25»), por variables que siguen a la hora.
// Son tres, como los de la foto de la familia: el grande (blanco, camiseta azul marino con su parche naranja y la cinta roja cruzándole
// el pecho), el chico (crema, sin ropa) y el tercero (blanco algo más apagado, con su mameluco celeste). Si no caben los tres, se quedan
// el grande y el chico; si tampoco, el grande solo; si ni él cabe, no sale ninguno (como el grabado y el papel picado).
// Son peluches: cabeza muy ancha (más de la mitad del alto), cuerpo de huevo casi sin cuello, orejitas chicas a los lados, bracitos
// cortos hacia fuera, las patas delante y un hocico claro y grande con la nariz negra. Planos sin contornos: la cara en sombra, la cara
// al astro, un canto en tono medio que recorre el contorno del lado de la luz (así el blanco no se pierde sobre la nieve blanca), el
// hocico y los rasgos. Cada oso es un grupo con un trazo por tono, y se pintan de atrás adelante: así pueden apoyarse uno en otro.

const f1 = (n) => n.toFixed(1);
const RAD = Math.PI / 180;

/** Con `true` salen los tres osos de la familia cuando caben; con `false`, como mucho la pareja (el grande y el chico). */
export const OSOS_TRIO = true;
/** Cuánto mide el dibujo (unidades del oso) frente a la escala de la escena (`ec × 1.1`): el grande queda en unos 21 px en el teléfono. */
export const K_OSO = 0.9;
/** El orden en que se quedan: con sitio para uno, el grande; para dos, el grande y el chico; para tres, los tres. */
export const OSOS = ['grande', 'chico', 'mameluco'];
const ESCALA = { grande: 1, chico: 0.7, mameluco: 0.84 };
/** El saltito al guardar sube 4 px; la regla de sitio lo cuenta (nada sale contra el cielo ni al saltar). */
export const SALTO = 4;

// ---------------------------------------------------------------------------------------------------------------- el dibujo
// Un oso sentado, de frente, en sus unidades: el pie en (0, 0), unos 14 de ancho y 17.5 de alto (la luz llega por +x).
const arco = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + ((a1 - a0) * i) / n) * RAD; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const elipse = (cx, cy, rx, ry, n = 10) => arco(cx, cy, rx, ry, 0, 360 - 360 / n, n - 1);
/** Un plano en media luna: el arco de fuera (de `a0` a `a1`) y, de vuelta, el mismo arco `hondo` unidades hacia dentro. */
const canto = (cx, cy, rx, ry, a0, a1, hondo, n = 8) => [...arco(cx, cy, rx, ry, a0, a1, n), ...arco(cx, cy, rx - hondo, ry - hondo, a1, a0, n)];
const CAB = { x: 0, y: -12.2, rx: 7.1, ry: 5.6 }; // la cabeza, más ancha que alta
// El cuerpo, un huevo: más ancho abajo (sentado) que arriba, donde se pierde bajo la cabeza.
const HUEVO = { x: 0, y: -4.3, rx: 5, rxAbajo: 6.3, ry: 4.6 };
const huevo = (a0, a1, n, hondo = 0) => Array.from({ length: n + 1 }, (_, i) => {
  const a = (a0 + ((a1 - a0) * i) / n) * RAD, sy = Math.sin(a), rx = HUEVO.rx + ((HUEVO.rxAbajo - HUEVO.rx) * (sy + 1)) / 2 - hondo; // (`hondo` < 0: un poco por fuera)
  return [HUEVO.x + rx * Math.cos(a), HUEVO.y + (HUEVO.ry - hondo) * sy];
});
// La sombra propia: una media luna a la izquierda que acaba en una arista algo curvada (el terminador); la luz, el resto.
const terminador = (x, y, rx, ry, ancho) => [[x - rx + ancho, y - ry * 0.6], [x - rx + ancho + 0.7, y], [x - rx + ancho, y + ry * 0.6]];
const CAB_SOMBRA = [...arco(CAB.x, CAB.y, CAB.rx, CAB.ry, 112, 250, 8), ...terminador(CAB.x, CAB.y, CAB.rx, CAB.ry, 2.7)];
const CAB_LUZ = [...arco(CAB.x, CAB.y, CAB.rx, CAB.ry, -110, 112, 12), ...terminador(CAB.x, CAB.y, CAB.rx, CAB.ry, 2.7).reverse()];
const CUE_SOMBRA = [...huevo(100, 255, 8), [-2.2, -8.6], [-1.5, -4.7], [-2.2, -0.9]];
const CUE_LUZ = [...huevo(-105, 100, 12), [-2.2, -0.9], [-1.5, -4.7], [-2.2, -8.6]];
// El borde de abajo de la cabeza (la ropa empieza ahí: nunca le pasa por encima a la barbilla).
const BARBILLA = arco(CAB.x, CAB.y, CAB.rx + 0.05, CAB.ry + 0.05, 145, 35, 10);
/** Una prenda que cubre el cuerpo desde la barbilla hasta `hasta` (y, más o menos), entre los dos lados del huevo. */
const prenda = (hasta) => {
  const izq = huevo(180, 260, 6).filter(([, y]) => y < hasta && y > -9.6), der = huevo(-80, 0, 6).filter(([, y]) => y < hasta && y > -9.6);
  return [...BARBILLA.filter(([x]) => Math.abs(x) < 5.4), ...der, [6.2, hasta], [2, hasta + 0.5], [-2, hasta + 0.5], [-6.1, hasta], ...izq];
};
/** Las piezas de un oso, en el orden en que se pintan: [tono, puntos]. */
const PIEZAS = [
  // la sombra: la media luna del cuerpo y de la cabeza, el bracito y la orejita del lado de la sombra, y bajo la barbilla
  ['sombra', elipse(0, -8, 4.6, 1.5, 10)],
  ['sombra', CUE_SOMBRA],
  ['sombra', elipse(-5.6, -15.9, 1.3, 1.2, 8)],
  ['sombra', CAB_SOMBRA],
  // la luz: el resto del cuerpo y de la cabeza
  ['luz', CUE_LUZ],
  ['luz', CAB_LUZ],
  // el canto en tono medio por el lado de la luz, el otro bracito, la otra orejita y las dos patas delante
  ['medio', canto(CAB.x, CAB.y, CAB.rx + 0.15, CAB.ry + 0.15, -136, 74, 1.45, 14)], // (algo más grande que la cabeza: el contorno es suyo)
  ['medio', [...huevo(-88, 96, 14, -0.15), ...huevo(96, -88, 14, 1.35)]],
  ['medio', elipse(5.6, -15.9, 1.3, 1.2, 8)],
  ['medio', elipse(-3.3, -0.6, 2.5, 1.9, 10)],
  ['medio', elipse(3.5, -0.6, 2.5, 1.9, 10)],
];
// La cara: un hocico crema y grande con la nariz negra ovalada encima, y los ojos, dos puntitos separados; y las manitas sobre la panza
// (del mismo crema: van encima de la ropa). Mirando al cielo (con aurora), la cara sube: así se ve que levantan la cabeza.
const CARA = { hocico: [elipse(0.6, -10.4, 3.8, 2.6, 14), elipse(-2.5, -4.8, 1.9, 1.6, 10), elipse(2.8, -4.8, 1.9, 1.6, 10)], rasgos: [elipse(0.7, -11.6, 1.7, 1.12, 12), elipse(-3.1, -13.2, 0.55, 0.6, 6), elipse(4.3, -13.3, 0.55, 0.6, 6)] };
const CARA_ARRIBA = { hocico: [elipse(0.6, -12.2, 3.6, 2.3, 14), elipse(-2.5, -4.8, 1.9, 1.6, 10), elipse(2.8, -4.8, 1.9, 1.6, 10)], rasgos: [elipse(0.7, -13.3, 1.6, 1.02, 12), elipse(-3, -14.8, 0.55, 0.5, 6), elipse(4.2, -14.9, 0.55, 0.5, 6)] };
// La ropa: la camiseta azul marino del grande (con su parche) y la cinta roja que le cruza el pecho; el mameluco celeste del tercero, con
// sus mangas; en Navidad (1 dic – 6 ene; el CSS la enseña) el chico y el del mameluco se ponen una bufanda roja.
const ROPA = {
  grande: [['marino', prenda(-2.1)], ['parche', elipse(1.2, -4.4, 1.65, 0.8, 10)], ['cinta', [[-4.7, -8], [-3.7, -8.6], [5.3, -3.2], [4.6, -2.4]]]],
  mameluco: [['celeste', prenda(-0.9)]],
  chico: [],
};
const BUFANDA = [[...BARBILLA.filter(([x]) => Math.abs(x) < 5.6), ...arco(CAB.x, CAB.y, CAB.rx + 1.1, CAB.ry + 1.1, 40, 140, 8)], [[-3.2, -7.6], [-2, -7.6], [-1.7, -4.6], [-2.9, -4.4]]];
const GORRO = [[-2.1, -16.7], [2.7, -16.9], [0.4, -22.3]]; // el gorrito de cumpleaños, en la cabeza del grande
// La sombra de contacto en la nieve, hacia el lado contrario al astro (empieza bajo el cuerpo: el borde de abajo da a la sombra).
const PIE = [[-6.8, -0.4], [6.6, -0.4], [5.4, 1.6], [-2.2, 2.4], [-11, 1.6]];

// (Campamento 47, idea 24) Dormidos (de 22:00 a 5:00; el CSS los enseña): la nariz de siempre y los ojos cerrados, dos medias lunas hacia
// abajo. Un trazo por oso, en lugar de sus rasgos (que se esconden). Y (189) el sombrero de palma del grande en marzo y abril, al sol de
// mediodía: el ala no pasa del ancho de la cabeza; la copa sube algo más (montana.js mira sus puntas contra el cielo, `PUNTAS_SOMBRERO`).
const DORMIDO = [elipse(0.7, -11.6, 1.7, 1.12, 12), canto(-3.1, -13.4, 1.05, 0.72, 15, 165, 0.42, 6), canto(4.3, -13.5, 1.05, 0.72, 15, 165, 0.42, 6)];
const SOMBRERO = [elipse(0.5, -16.4, 6.3, 1.25, 14), arco(0.5, -16.7, 3.3, 2.6, 180, 360, 10)];
export const PUNTAS_SOMBRERO = [[0.5, -19.3], [-5.8, -16.4], [6.8, -16.4], [-2.8, -18.4], [3.8, -18.4]];
/** (47, idea 24) Las zetas del sueño, en (x, y) de la escena (abajo a la izquierda de la primera), con `e` px por unidad: dos Z llenas. */
const zeta = (x, y, h) => { const w = h * 0.9, t = h * 0.24; return [[x, y - h], [x + w, y - h], [x + w, y - h + t], [x + t * 1.4, y - t], [x + w, y - t], [x + w, y], [x, y], [x, y - t], [x + w - t * 1.4, y - h + t], [x, y - h + t]]; };
const ZETAS = [zeta(0, 0, 2.6), zeta(3.4, -3.6, 3.2)];
/** La caja de las zetas en sus unidades (desde el punto donde empiezan): para mirarlas contra el cielo. */
export const CAJA_ZETAS = { x0: 0, y0: -6.8, x1: 6.3, y1: 0 };
export function zetas(x, y, e) { return `<path class="oso-zz" d="${ZETAS.map((z) => d(z.map(([u, v]) => [x + u * e, y + v * e]))).join('')}"/>`; }

const TONOS = ['sombra', 'luz', 'medio', 'marino', 'celeste', 'parche', 'cinta', 'bufanda', 'hocico', 'rasgos', 'hocico-arriba', 'rasgos-arriba', 'dormido', 'gorro', 'sombrero', 'hola'];
const d = (pts) => `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`;
/** (Campamento 26) Las piezas de siempre, para dibujar a los mismos osos en otras poses en la interfaz (`arte-osos-poses.js`). */
export const PARTES = { arco, elipse, canto, CAB, PIEZAS, CARA, ROPA, BUFANDA, GORRO, PIE };

/**
 * Los osos en la escena. `lista`: [{ x, y, s, quien }] (el pie de cada uno, su escala y cuál es); `k`: escala de la escena (`ec × 1.1`).
 * Un grupo por oso (`oso oso-grande|chico|mameluco`), de atrás adelante, con un trazo por tono; la sombra de contacto de todos va aparte,
 * debajo. Con `aurora`, cada cara va también mirando arriba (el CSS enseña una u otra); con `cumple`, el grande lleva su gorrito.
 * (Campamento 47) Cada uno lleva además sus ojos cerrados (`oso-dormido`, escondidos); con `sombrero`, el grande su sombrero de palma
 * (sin gorrito); con `hola`, su brazo levantado (188); `asoma`: cuál mira hacia el pueblo cuando pasa algo abajo (229: `oso-asoma`), y
 * los que no son el grande saben hacia qué lado queda él (`oso-hacia-i` o `-d`: hacia ahí se acomodan).
 * Devuelve el contenido del grupo de los osos (decorativo: la descripción de la montaña lo dice).
 */
export function osos(lista, { k = 1, aurora = false, cumple = false, sombrero = false, hola = false, asoma = null } = {}) {
  let pie = '', cuerpos = '';
  const gx = lista.find((o) => o.quien === 'grande')?.x ?? 0;
  for (const { x, y, s = 1, quien = 'grande' } of [...lista].sort((a, b) => a.y - b.y)) {
    const e = k * s * K_OSO, T = (pts) => d(pts.map(([px, py]) => [x + px * e, y + py * e]));
    pie += T(PIE);
    const pl = {};
    const add = (tono, pts) => { pl[tono] = (pl[tono] || '') + T(pts); };
    for (const [tono, pts] of PIEZAS) add(tono, pts);
    for (const [tono, pts] of ROPA[quien] || []) add(tono, pts);
    if (quien !== 'grande') for (const pts of BUFANDA) add('bufanda', pts);
    for (const [tono, lista2] of Object.entries(CARA)) for (const pts of lista2) add(tono, pts);
    if (aurora) for (const [tono, lista2] of Object.entries(CARA_ARRIBA)) for (const pts of lista2) add(`${tono}-arriba`, pts);
    if (cumple && quien === 'grande') add('gorro', GORRO);
    for (const pts of DORMIDO) add('dormido', pts);
    if (sombrero && !cumple && quien === 'grande') for (const pts of SOMBRERO) add('sombrero', pts);
    if (hola && quien === 'grande') { add('hola', ESTIRA[0]); add('hola', ESTIRA_MANOS[0]); }
    // (Campamento 33) Los brazos alzados de estirarse, en un solo trazo y escondidos: dentro del contorno de siempre (nada sale contra el cielo).
    const brazos = [...ESTIRA, ...ESTIRA_MANOS].map(T).join('');
    const extra = `${asoma === quien ? ' oso-asoma' : ''}${quien !== 'grande' ? ` oso-hacia-${gx < x ? 'i' : 'd'}` : ''}`;
    cuerpos += `<g class="oso oso-${quien}${extra}">${TONOS.filter((t) => pl[t]).map((t) => `<path class="oso-${t}${t === 'bufanda' ? ' v-navidad' : ''}" d="${pl[t]}"/>`).join('')}<path class="oso-brazos" d="${brazos}"/></g>`;
  }
  return `<path class="oso-pie" d="${pie}"/>${cuerpos}`;
}

// ---------------------------------------------------------------------------------------------------------------- «Tú»
// (Campamento 31) «Tú» como oso que sube: un cuarto osito, blanco y sin la ropa de los tres (así no se confunde con el grande de la
// cumbre), con su mochila y sus correas naranjas (el naranja es lo tuyo) y su palito. Sentado como ellos: un peluche que alguien hace
// subir. Los pies en (0, 0): montana.js lo pone sobre el punto exacto del sendero, y esa altitud es el dato.
const MOCHILA = [...arco(-7.4, -10.6, 2.6, 2.2, 180, 300, 5), [-4.2, -12.2], [-3.8, -4.4], ...arco(-6.6, -4.6, 2.8, 2, 0, 160, 5)];
const CORREAS = [[[-4.2, -10.4], [-2.6, -10.6], [-1.4, -3.2], [-2.8, -3]], [[2.6, -10.6], [4.2, -10.4], [2.8, -3], [1.4, -3.2]]];
const PALO = [[7.6, -15.6], [8.4, -15.6], [7.6, 0.4], [6.8, 0.4]];
/** Un bracito (una cápsula de `a` a `b`, radio `r`), para los brazos alzados de la celebración. */
const capsula = ([ax, ay], [bx, by], r, n = 6) => { const ang = Math.atan2(by - ay, bx - ax) / RAD; return [...arco(bx, by, r, r, ang - 90, ang + 90, n), ...arco(ax, ay, r, r, ang + 90, ang + 270, n)]; };
const BRAZOS_ARRIBA = { luz: capsula([4.4, -7.4], [8, -15.6], 1.7), medio: capsula([-4.4, -7.4], [-8, -15.6], 1.7), hocico: [elipse(8, -15.6, 1.84, 1.7, 8), elipse(-8, -15.6, 1.84, 1.7, 8)] }; // (pulido) bracitos de peluche
/**
 * (Campamento 33) Los brazos de estirarse: en V, de los hombros a los lados de la cabeza (por fuera de ella, para que se vean sobre la
 * nieve blanca). Salen un poco del contorno del oso: montana.js comprueba sus puntas (`PUNTAS_ESTIRA`) contra la montaña y, si alguna
 * quedara contra el cielo, esos osos no se estiran. Escondidos con `display: none` (no cuentan en su caja: los rótulos ni se enteran).
 */
const ESTIRA = [capsula([4.4, -7.4], [7.8, -14.6], 1.6), capsula([-4.4, -7.4], [-7.8, -14.6], 1.6)];
const ESTIRA_MANOS = [elipse(7.8, -14.6, 1.75, 1.6, 8), elipse(-7.8, -14.6, 1.75, 1.6, 8)];
export const PUNTAS_ESTIRA = [[9.6, -14.6], [-9.6, -14.6], [7.8, -16.25], [-7.8, -16.25]];
/** La caja de «Tú» en sus unidades (de la mochila al palito y de las orejas a la sombra de los pies): para los rótulos y los choques. */
export const CAJA_TU = { x0: -11.2, x1: 9.9, y0: -18.2, y1: 2.5 };
/**
 * El oso de «Tú» (decorativo; la descripción de la montaña dice dónde vas). `k`: unidades → px. Un trazo por tono; los brazos alzados
 * de la celebración van dibujados y escondidos (`tu-festeja`: los enseña la clase `festeja` de #m-yo); la bufanda de Navidad
 * (`v-navidad`) y, con `cumple`, el gorrito, como los de la cumbre. `bajo`: lo que va entre su sombra y el osito (la pisada de «Tú»).
 */
export function osoTu({ k = 1, cumple = false, bajo = '' } = {}) {
  const T = (pts) => d(pts.map(([x, y]) => [x * k, y * k]));
  const pl = {};
  const add = (tono, pts) => { pl[tono] = (pl[tono] || '') + T(pts); };
  add('mochila', MOCHILA);
  for (const [tono, pts] of PIEZAS) add(tono, pts);
  for (const pts of CORREAS) add('correa', pts);
  for (const pts of BUFANDA) add('bufanda', pts);
  for (const [tono, lista2] of Object.entries(CARA)) for (const pts of lista2) add(tono, pts);
  if (cumple) add('gorro', GORRO);
  add('palo', PALO);
  const orden = ['mochila', 'sombra', 'luz', 'medio', 'correa', 'bufanda', 'hocico', 'rasgos', 'gorro', 'palo'];
  const festeja = `<g class="tu-festeja">${['luz', 'medio'].map((t) => `<path class="oso-${t}" d="${T(BRAZOS_ARRIBA[t])}"/>`).join('')}<path class="oso-hocico" d="${BRAZOS_ARRIBA.hocico.map(T).join('')}"/></g>`;
  return `<path class="oso-pie" d="${T(PIE)}"/>${bajo}<g class="oso oso-tu">${orden.filter((t) => pl[t]).map((t) => `<path class="oso-${t}${t === 'bufanda' ? ' v-navidad' : ''}" d="${pl[t]}"/>`).join('')}${festeja}</g>`;
}

// ---------------------------------------------------------------------------------------------------------------- el sitio
/** Todos los vértices de un oso (para que nada salga contra el cielo), con el gorrito si toca (el saltito lo suma la regla). */
function vertices(quien, { cumple }) {
  const pts = [...PIEZAS.flatMap(([, p]) => p), ...PIE];
  if (cumple && quien === 'grande') pts.push(...GORRO);
  return pts;
}
/**
 * Las disposiciones que se prueban, en orden (en unidades del oso grande). El grande en el centro, un poco atrás; los otros dos delante y
 * a los lados, apoyados en él (se pintan de atrás adelante, así que pueden tocarse).
 */
const DISPOSICION = {
  1: [[{ quien: 'grande', dx: 0, dy: 0 }]],
  2: [
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'chico', dx: 9.4, dy: 3.4 }],
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'chico', dx: -9.4, dy: 3.4 }],
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'chico', dx: 6.4, dy: 6.8 }],
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'chico', dx: -6.4, dy: 6.8 }],
  ],
  3: [
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'mameluco', dx: -10.2, dy: 2.4 }, { quien: 'chico', dx: 9.4, dy: 3.4 }],
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'chico', dx: -9.4, dy: 3.4 }, { quien: 'mameluco', dx: 10.2, dy: 2.4 }],
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'mameluco', dx: -10.2, dy: 2.4 }, { quien: 'chico', dx: 6.4, dy: 6.8 }],
    [{ quien: 'grande', dx: 0, dy: 0 }, { quien: 'mameluco', dx: 10.2, dy: 2.4 }, { quien: 'chico', dx: 18.6, dy: 5 }],
  ],
};
/** La caja de los osos ya puestos (con la sombra, el saltito, el gorrito y la cabeza que mira arriba), en la escena. */
export function cajaOsos(lista, k, opc = {}) {
  const cs = lista.map(({ x, y, s, quien }) => { const e = k * s * K_OSO, v = [...vertices(quien, opc), ...PIE]; return [Math.min(...v.map((p) => x + p[0] * e)), Math.min(...v.map((p) => y + p[1] * e)) - SALTO, Math.max(...v.map((p) => x + p[0] * e)), Math.max(...v.map((p) => y + p[1] * e))]; });
  return [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[2])), Math.max(...cs.map((c) => c[3]))];
}

/** Donde se apoya un oso (en sus unidades): los dos lados del asiento y el centro, algo más abajo. Son los que deben quedar en su zona. */
const APOYO = [[-4.8, 0.4], [4.8, 0.4], [0, 0.8]];
/** Los puntos de apoyo de unos osos ya puestos, en la escena. */
export function piesOsos(lista, k) {
  return lista.flatMap(({ x, y, s }) => { const e = k * s * K_OSO; return APOYO.map(([u, v]) => [x + u * e, y + v * e]); });
}

/** ¿El punto (x, y) está dentro del polígono `pts`? (Par e impar, como `sitioOsos`.) */
export function dentroDe(pts, x, y) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/**
 * Dónde se sientan (todo en coordenadas de la escena). Busca cerca de un punto de la nieve al sol bajo la cumbre y prueba, por este
 * orden, la nieve que hay siempre (la de la altitud cero), la nieve de hoy y la roca de la cara al sol justo bajo la cumbre; y los tres
 * osos, la pareja y uno solo. Cada oso: los pies en esa zona; todos sus vértices (con el saltito, el gorrito y la cabeza que mira
 * arriba) dentro de la montaña con 2 px de aire; a 12 px o más del sendero; fuera de la meta (mojón y bandera, con su aire) y de las
 * cajas de texto (`textos`: el saldo, la cabecera, la tarjeta de la entrada). Devuelve { lista, zona, caja, cajas } o null (`caja`:
 * la de todos; `cajas`: la de cada uno, con su sombra, su saltito y su gorrito: con ellas se decide si un rótulo los pisa).
 * geo: { W, H, sx, sy, ec, silueta, cara, nieveMin, nieveHoy, sendero, meta, textos, trio, aurora, cumple }
 */
export function sitioOsos(geo) {
  const { W, H, sx, sy, ec, silueta, cara, nieveMin, nieveHoy, sendero = [], meta = null, textos = [], trio = OSOS_TRIO, aurora = false, cumple = false } = geo;
  const k = ec * 1.1, opc = { aurora, cumple };
  const nv = H * 0.075;
  // La ventana de búsqueda. Para que sea barata (se llama en cada dibujo de la montaña): cada polígono se indexa por filas (solo las
  // aristas que cruzan cada fila) y cada punto se resuelve una sola vez, cuando hace falta (una rejilla de 1 px que se llena sola).
  const x0 = Math.floor(sx - 24 * ec), x1 = Math.ceil(Math.min(W - 2, sx + 110 * ec)), y0 = Math.floor(sy - 45 * ec), y1 = Math.ceil(Math.min(H - 2, sy + 1.8 * nv + 24));
  const ancho = x1 - x0 + 1, alto = y1 - y0 + 1;
  if (ancho <= 0 || alto <= 0) return null;
  const zona = (pts) => {
    const filas = Array.from({ length: alto }, () => []);
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      const a = Math.max(0, Math.ceil(Math.min(yi, yj) - y0)), b = Math.min(alto - 1, Math.floor(Math.max(yi, yj) - y0));
      for (let r = a; r <= b; r++) filas[r].push([xi, yi, xj, yj]);
    }
    const g = new Int8Array(ancho * alto).fill(-1);
    return (x, y) => {
      const i = Math.round(x) - x0, j = Math.round(y) - y0;
      if (i < 0 || j < 0 || i >= ancho || j >= alto) return false;
      const n = j * ancho + i;
      if (g[n] < 0) {
        const px = x0 + i, py = y0 + j;
        let dentro = false;
        for (const [xa, ya, xb, yb] of filas[j]) if ((ya > py) !== (yb > py) && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) dentro = !dentro;
        g[n] = dentro ? 1 : 0;
      }
      return g[n] === 1;
    };
  };
  const enMonte = zona(silueta), enCara = zona(cara), enMin = zona(nieveMin), enHoy = zona(nieveHoy);
  const senda = sendero.filter(([x, y]) => x > x0 - 20 && x < x1 + 20 && y > y0 - 20 && y < y1 + 20);
  const cajas = [...(meta ? [meta] : []), ...textos];
  const pies = {
    nieve: (x, y) => enMin(x, y) && enCara(x, y),
    nieveHoy: (x, y) => enHoy(x, y) && enCara(x, y),
    cumbre: (x, y) => enCara(x, y) && enMonte(x, y) && y < sy + (H - sy) * 0.3,
  };
  const borde = Object.fromEntries(OSOS.map((q) => [q, contorno(vertices(q, opc))]));
  // Lo que ocupa cada oso (en sus unidades, con su sombra): la misma caja con que después se decide si un rótulo lo pisa.
  const ext = Object.fromEntries(OSOS.map((q) => { const v = vertices(q, opc); return [q, [Math.min(...v.map((p) => p[0])), Math.min(...v.map((p) => p[1])), Math.max(...v.map((p) => p[0])), Math.max(...v.map((p) => p[1]))]]; }));
  /** ¿Cabe un oso (su pie en x, y) en la zona `z`? Primero lo barato (bordes, cajas, pies), después el sendero y el cielo. */
  const cabe = (x, y, s, quien, z) => {
    const e = k * s * K_OSO, [u0, v0, u1, v1] = ext[quien];
    const b0 = x + u0 * e, b1 = y + v0 * e - SALTO, b2 = x + u1 * e, b3 = y + v1 * e;
    if (b0 < 4 || b2 > W - 4 || b1 < 2 || b3 > H - 4) return false;
    for (const c of cajas) if (b0 < c[2] && b2 > c[0] && b1 < c[3] && b3 > c[1]) return false;
    for (const [u, v] of APOYO) if (!pies[z](x + u * e, y + v * e)) return false;
    for (const [px, py] of senda) { const dx = Math.max(b0 - px, 0, px - b2), dy = Math.max(b1 + SALTO - py, 0, py - b3); if (dx * dx + dy * dy < 144) return false; }
    for (const [vx, vy] of borde[quien]) if (!enMonte(x + vx * e, y + vy * e - SALTO - 2)) return false;
    return true;
  };
  // Candidatos cada 2 px, del más cercano al más lejano de un punto de la nieve al sol, abajo a la derecha de la meta. El grande está en
  // el candidato en todas las disposiciones: se prueba una vez por candidato y zona (y se recuerda), y solo después los demás.
  const cx = sx + 34 * ec, cy = sy + 22 * ec, cand = [];
  for (let y = y0 + 20; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) cand.push([x, y, (x - cx) ** 2 + (y - cy) ** 2]);
  cand.sort((a, b) => a[2] - b[2]);
  const ZONAS = ['nieve', 'nieveHoy', 'cumbre'];
  const grande = Object.fromEntries(ZONAS.map((z) => [z, new Int8Array(cand.length).fill(-1)]));
  for (const n of trio ? [3, 2, 1] : [2, 1]) {
    for (const z of ZONAS) {
      for (let ci = 0; ci < cand.length; ci++) {
        const [x, y] = cand[ci];
        if (grande[z][ci] < 0) grande[z][ci] = cabe(x, y, 1, 'grande', z) ? 1 : 0;
        if (!grande[z][ci]) continue;
        for (const disp of DISPOSICION[n]) {
          if (!disp.every(({ quien, dx, dy }) => quien === 'grande' || cabe(x + dx * k * K_OSO, y + dy * k * K_OSO, ESCALA[quien], quien, z))) continue;
          const lista = disp.map(({ quien, dx, dy }) => ({ x: x + dx * k * K_OSO, y: y + dy * k * K_OSO, s: ESCALA[quien], quien }));
          return { lista, zona: z, caja: cajaOsos(lista, k, opc), cajas: lista.map((o) => cajaOsos([o], k, opc)) };
        }
      }
    }
  }
  return null;
}

/** La envolvente convexa de unos puntos, con el punto medio de cada lado (para mirar el cielo con pocos puntos y sin huecos). */
function contorno(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lado = (lista) => { const h = []; for (const q of lista) { while (h.length >= 2 && giro(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); } h.pop(); return h; };
  const hull = [...lado(p), ...lado([...p].reverse())];
  return hull.flatMap((q, i) => { const r = hull[(i + 1) % hull.length]; return [q, [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2]]; });
}

// ---------------------------------------------------------------------------------------------------------------- lo que se clava al lado
// (Campamento 47, ideas 185, 26 y 190) Lo que se planta en la nieve junto a los osos, fuera de su grupo (no gasta su tope): el oso de
// nieve de diciembre, que crece con los días; el paraguas celeste de las tardes de la lluviosa y la banderita azul y blanca del 13 al 15
// de septiembre (las mismas formas y colores que las de la interfaz, campamento 28). En sus unidades, el pie en (0, 0); `e`: px por unidad.
/** La etapa del oso de nieve ese día (AAAA-MM-DD): 1 una bola (1–7 dic), 2 dos (8–15), 3 con orejas (16–23), 4 con su bufanda (del 24 al 6 de enero); 0 si no toca. */
export function etapaOsoNieve(dia) {
  const m = dia.slice(5, 7), n = Number(dia.slice(8, 10));
  if (m === '01') return n <= 6 ? 4 : 0;
  if (m !== '12') return 0;
  return n < 8 ? 1 : n < 16 ? 2 : n < 24 ? 3 : 4;
}
/**
 * Una pieza plantada (`tipo`: 'nieve' | 'paraguas' | 'bandera') con el pie en (x, y): { svg, pts } (`pts`: sus vértices en la escena,
 * para mirarlos contra el cielo, el sendero y los rótulos). `etapa`: la del oso de nieve. Trazos con clase `c-plantado` y la suya.
 */
export function plantado(tipo, x, y, e, etapa = 4) {
  const T = (pts) => pts.map(([u, v]) => [x + u * e, y + v * e]);
  const pts = [];
  const trazo = (clase, lista) => { for (const p of lista) pts.push(...T(p)); return `<path class="c-plantado ${clase}" aria-hidden="true" d="${lista.map((p) => d(T(p))).join('')}"/>`; };
  if (tipo === 'nieve') {
    const bolas = [elipse(0, -3.3, 4.3, 3.4, 14), ...(etapa >= 2 ? [elipse(0.2, -8.9, 3, 2.7, 12)] : []), ...(etapa >= 3 ? [elipse(-2.1, -11.2, 0.95, 0.9, 8), elipse(2.5, -11.2, 0.95, 0.9, 8)] : [])];
    const sombra = [canto(0, -3.3, 4.3, 3.4, 115, 245, 1.5, 8), ...(etapa >= 2 ? [canto(0.2, -8.9, 3, 2.7, 115, 245, 1.1, 8)] : []), [[-3.4, -0.6], [3.6, -0.6], [2.4, 0.9], [-9, 1.1]]];
    const bufanda = [[[-2.7, -6.5], [3.1, -6.5], [3.2, -5.4], [-2.8, -5.4]], [[1.6, -5.6], [2.7, -5.6], [3.1, -3.2], [2.1, -3]]];
    return { svg: trazo('c-nieve-oso', bolas) + trazo('c-nieve-oso c-nieve-sombra', sombra) + (etapa >= 4 ? trazo('c-nieve-oso c-nieve-bufanda', bufanda) : ''), pts };
  }
  if (tipo === 'paraguas') {
    const tela = [...arco(0, -12, 6.2, 5.2, 180, 360, 10), [5.2, -11.2], [3.6, -12], [2, -11.2], [0, -12], [-2, -11.2], [-3.6, -12], [-5.2, -11.2]];
    return { svg: trazo('c-lluvia c-paraguas-palo', [[[-0.3, -17.4], [0.3, -17.4], [0.3, 0.4], [-0.3, 0.4]]]) + trazo('c-lluvia c-paraguas', [tela]), pts };
  }
  const azul = [[[-0.25, -13], [0.25, -13], [0.25, 0.4], [-0.25, 0.4]], [[0.25, -13], [6, -13.2], [6, -12], [0.25, -11.8]], [[0.25, -10.2], [6, -10.4], [6, -9.2], [0.25, -9]]];
  return { svg: trazo('c-patria c-bandera', azul) + trazo('c-patria c-bandera-b', [[[0.25, -11.8], [6, -12], [6, -10.4], [0.25, -10.2]]]), pts };
}
