// Campamento 35 · El Pueblo de los Osos: los vecinos del valle son osos polares (los de la cumbre son los peluches de la familia; estos,
// los vecinos: mismo pelo blanco, otra talla, otra ropa, otra vida). Funciones puras que devuelven SVG como texto (sin DOM ni el
// `rnd()` de la montaña). «Talla pueblo»: de pie, cabezota redonda, dos orejitas, hocico de palma y nariz oscura, con su sombra propia
// del lado contrario al astro; sin contornos. Todo el pueblo sale en UN trazo por tono (nueve como mucho) y sin estilos en línea.
// Orden de pintado de los tonos: pelo → sombra propia → ropa (tres colores) → palma (sombrero, canasto, escoba, delantal) → pelo de
// encima (orejas que asoman, manitas sobre lo que cargan) → rasgos (nariz, ojos, lo negro) → brasa (la plancha de la pupusera).
// Quién está dónde depende del turno (cielo.js: `turno`, por la hora y el día de El Salvador) y nunca de las cuentas ni de las compras.
const f1 = (n) => n.toFixed(1);
const RAD = Math.PI / 180;
export const TONOS = ['perro', 'pelo', 'som', 'r0', 'r1', 'r2', 'azul', 'palma', 'pelo2', 'rasgo', 'brasa']; // ('azul', solo el 15 de septiembre; 'perro', el perro escondido de la Navidad: campamento 41)
/** Cuánto mide una unidad del dibujo frente a la unidad del pueblo (`u`): el adulto queda en unas 6.7 u (una persona de antes, 7). */
export const E = 0.82;
/** La talla de un osezno frente a un adulto. */
export const OSEZNO = 0.62;
/** Cuántos vecinos caben como mucho en la escena (la pelota no cuenta): lo decide el tamaño de la pantalla, nunca las cuentas (107). */
export const MAX_VECINOS = 8;

const arco = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + ((a1 - a0) * i) / n) * RAD; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
// Una pieza: ['e', cx, cy, rx, ry] (elipse) o ['p', [[x, y]…]] (polígono) o ['a', cx, cy, r, grosor] (aro: una rueda).
const e = (cx, cy, rx, ry = rx) => ['e', cx, cy, rx, ry];
const p = (...pts) => ['p', pts];
const aro = (cx, cy, r, g) => ['a', cx, cy, r, g];
/** La media luna de sombra de una elipse, del lado contrario al astro (−x). */
const luna = (cx, cy, rx, ry, hondo = 0.42) => ['p', [...arco(cx, cy, rx, ry, 105, 255, 6), ...arco(cx - rx * hondo, cy, rx * 0.62, ry * 0.9, 250, 110, 4)]];

// ------------------------------------------------------------------------------------------------ el oso de pie, de frente
const CAB = { y: -6.15, rx: 2.3, ry: 1.95 };
const cabeza = (dx = 0, dy = 0, ojos = true) => [
  ['pelo', e(dx, CAB.y + dy, CAB.rx, CAB.ry)], ['pelo', e(dx - 1.85, CAB.y + dy - 1.6, 0.74)], ['pelo', e(dx + 1.85, CAB.y + dy - 1.6, 0.74)],
  ['som', luna(dx, CAB.y + dy, CAB.rx, CAB.ry)], ['som', e(dx - 1.85, CAB.y + dy - 1.6, 0.74)],
  ['palma', e(dx + 0.35, CAB.y + dy + 0.7, 1.12, 0.82)],
  ['rasgo', e(dx + 0.4, CAB.y + dy + 0.38, 0.6, 0.42)],
  ...(ojos ? [['rasgo', e(dx - 0.72, CAB.y + dy - 0.42, 0.27)], ['rasgo', e(dx + 1.42, CAB.y + dy - 0.42, 0.27)]] : []),
];
const cuerpo = () => [
  ['pelo', e(-1.02, -0.3, 0.9, 0.52)], ['pelo', e(1.02, -0.3, 0.9, 0.52)],
  ['pelo', e(0, -2.5, 1.95, 2.4)], ['som', luna(0, -2.5, 1.95, 2.4, 0.36)],
];
const brazos = (izq = 0, der = 0) => [ // 0 = caído; 1 = arriba
  ['pelo', izq ? e(-2.2, -4.7, 0.62, 1.3) : e(-2.05, -2.9, 0.62, 1.25)], ['som', izq ? e(-2.2, -4.7, 0.62, 1.3) : e(-2.05, -2.9, 0.62, 1.25)],
  ['pelo', der ? e(2.2, -4.7, 0.62, 1.3) : e(2.05, -2.9, 0.62, 1.25)],
];
// La ropa (un color por oso: `r`): nunca le pasa por encima a la barbilla. No repite la de la familia (ni el azul marino con su parche
// ni el mameluco celeste): verde, rojo teja y maíz.
const camisa = (r) => [[r, p([-1.1, -4.4], [1.1, -4.4], [2.6, -3.75], [2.62, -2.75], [1.95, -2.85], [1.98, -1.75], [-1.98, -1.75], [-1.95, -2.85], [-2.62, -2.75], [-2.6, -3.75])]];
const vestido = (r) => [[r, p([-1.1, -4.4], [1.1, -4.4], [2.05, -3.4], [2.55, -0.75], [-2.55, -0.75], [-2.05, -3.4])]];
const delantal = () => [['palma', p([-0.95, -3.5], [0.95, -3.5], [1.25, -1.05], [-1.25, -1.05])]];
const pantaloncito = (r) => [[r, p([-1.9, -2.6], [1.9, -2.6], [1.95, -0.9], [0.2, -0.9], [0, -1.5], [-0.2, -0.9], [-1.95, -0.9])]];
const sombrero = (dy = 0) => [ // de palma: ala ancha y copa baja; las orejas asoman a los lados de la copa
  ['palma', e(0, -7.95 + dy, 3.15, 0.6)], ['palma', p([-1.2, -7.9 + dy], [1.2, -7.9 + dy], [0.92, -9.15 + dy], [-0.92, -9.15 + dy])],
  ['pelo2', e(-1.9, -8.25 + dy, 0.6, 0.5)], ['pelo2', e(1.9, -8.25 + dy, 0.6, 0.5)],
];
const canasto = (r) => [ // el canasto en la cabeza, con lo que lleva
  ['palma', p([-1.75, -8.15], [1.75, -8.15], [1.4, -9.4], [-1.4, -9.4])], [r, e(0, -9.45, 1.3, 0.55)],
];

/** (Campamento 41) Las piezas de un oso movidas (`dx`, `dy`): para los que van de dos en dos (el abrazo) o en alto (la escalera, en hombros). */
const mv = (ps, dx, dy = 0) => ps.map(([t, q]) => [t, q[0] === 'p' ? ['p', q[1].map(([x, y]) => [x + dx, y + dy])] : [q[0], q[1] + dx, q[2] + dy, ...q.slice(3)]]);
// (Campamento 41) El perro de la plaza, echado (el mismo de arte-pueblo.js, en unidades de vecino): con los cohetes se esconde bajo el
// árbol de la plaza, y el 25 a mediodía, bajo la mesa del recalentado (el de siempre se esconde con el CSS esos turnos).
const PERRO_V = [[-1.0, -0.55], [-0.3, -0.75], [0.2, -1.55], [1.4, -1.95], [2.9, -1.85], [3.6, -1.5], [3.9, -2.45], [4.0, -3.05], [4.15, -3.55], [4.5, -3.05], [4.95, -2.95], [5.75, -2.6], [5.9, -2.35], [5.5, -2.1], [4.8, -1.95], [4.45, -1.2], [5.8, -0.45], [5.85, 0], [0.3, 0], [-0.25, -0.25]].map(([x, y]) => [x * 0.976, y * 0.976]);
/** Los personajes (101): cada uno, una lista de [tono, pieza] en sus unidades (el pie en 0, 0; el astro por +x). `r` = su color de ropa. */
const TIPOS = {
  campesino: (r) => [...cuerpo(), ...brazos(), ...camisa(r), ...cabeza(), ...sombrero()],
  vendedora: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...delantal(), ...cabeza(), ...canasto('r1')],
  vecina: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...cabeza()],
  vecino: (r) => [...cuerpo(), ...brazos(), ...camisa(r), ...cabeza()],
  // el que se estira al amanecer: los dos brazos arriba
  estira: (r) => [...cuerpo(), ...brazos(1, 1), ...camisa(r).map(([t, [, pts]]) => [t, ['p', pts.filter(([x, y]) => !(Math.abs(x) > 2.2 && y > -3.5))]]), ...cabeza(0, 0.15)],
  // la abuela en su taburete del corredor, con su rebozo (sentada: más baja)
  abuela: (r) => [
    ['rasgo', p([-1.9, 0], [-1.5, 0], [-1.6, -1.2], [1.6, -1.2], [1.5, 0], [1.9, 0], [2.0, -1.6], [-2.0, -1.6])],
    ['pelo', e(0, -3.1, 2.05, 1.85)], ['pelo', e(-1.15, -1.15, 0.9, 0.55)], ['pelo', e(1.15, -1.15, 0.9, 0.55)],
    [r, p([-1.15, -4.55], [1.15, -4.55], [2.45, -3.3], [2.2, -1.9], [0, -2.5], [-2.2, -1.9], [-2.45, -3.3])],
    ...cabeza(0, 0.55),
  ],
  // con la escoba: el palo en diagonal y las cerdas; la manita encima
  escoba: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...delantal(), ...cabeza(),
    ['palma', p([2.3, -4.9], [2.7, -4.9], [4.0, -0.9], [3.6, -0.9])], ['palma', p([3.3, -1.0], [4.4, -1.0], [4.9, 0.1], [3.2, 0.1])], ['pelo2', e(2.75, -3.2, 0.6, 0.55)]],
  // el osezno (lo escala `OSEZNO`), con su pantaloncito
  osezno: (r) => [...cuerpo(), ...brazos(), ...pantaloncito(r), ...cabeza(0, 0, false)],
  // el osezno con el brazo arriba: sostiene el hilo de su piscucha (o saluda)
  oseznoArriba: (r) => [...cuerpo(), ...brazos(0, 1), ...pantaloncito(r), ...cabeza(0, 0, false)],
  // la pelota de los oseznos
  pelota: () => [['r1', e(0, -0.75, 0.75)]],
  // (Campamento 36) de espaldas, de camino a misa o mirando el nacimiento (sin cara: la nuca y las orejas)
  espaldas: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ['pelo', e(0, CAB.y, CAB.rx, CAB.ry)], ['pelo', e(-1.85, CAB.y - 1.6, 0.74)], ['pelo', e(1.85, CAB.y - 1.6, 0.74)], ['som', luna(0, CAB.y, CAB.rx, CAB.ry)], ['pelo', e(0, -0.9, 0.5, 0.42)]],
  // (36, idea 109) el padre a la puerta de la iglesia, el domingo: sotana negra y alzacuellos
  cura: () => [...cuerpo(), ...brazos(), ['rasgo', p([-1.1, -4.4], [1.1, -4.4], [2.6, -3.75], [2.62, -2.75], [2.0, -2.85], [2.4, -0.45], [-2.4, -0.45], [-2.0, -2.85], [-2.62, -2.75], [-2.6, -3.75])], ['pelo2', p([-0.5, -4.4], [0.5, -4.4], [0.4, -3.95], [-0.4, -3.95])], ...cabeza()],
  // (36) el abanderado del 15 de septiembre: el asta y la bandera azul, blanca y azul, sin escudo (el blanco, del pelo de encima)
  abanderado: (r) => [...cuerpo(), ...brazos(0, 1), ...camisa(r), ...cabeza(),
    ['rasgo', p([2.45, -11.6], [2.75, -11.6], [2.75, -3.3], [2.45, -3.3])], ['azul', p([2.75, -11.5], [6.6, -11.3], [6.6, -8.5], [2.75, -8.7])], ['pelo2', p([2.75, -10.55], [6.6, -10.35], [6.6, -9.45], [2.75, -9.65])]],
  // (36) el del bombo de la banda de paz
  bombo: (r) => [...cuerpo(), ...brazos(), ...camisa(r), ...cabeza(), ['azul', e(0, -2.3, 1.95, 1.95)], ['pelo2', e(0, -2.3, 1.45, 1.45)], ['rasgo', p([-2.6, -3.3], [-0.9, -2.6], [-1.0, -2.3], [-2.7, -3.0])]],
  // (36, idea 113) en Nochebuena y el 31, el osezno con su estrellita encendida (quieta: no titila)
  oseznoLuz: (r) => [...cuerpo(), ...brazos(0, 1), ...pantaloncito(r), ...cabeza(0, 0, false), ['rasgo', p([2.15, -7.4], [2.35, -7.4], [2.35, -5.6], [2.15, -5.6])], ['brasa', e(2.25, -7.9, 0.7)]],
  // la pupusera detrás de su plancha (la plancha y su mesa, en negro; las pupusas, de masa; la brasa, encendida)
  pupusera: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...delantal(), ...cabeza(),
    ['rasgo', p([-3.6, -3.1], [3.6, -3.1], [3.6, -2.5], [3.0, -2.5], [3.0, 0], [2.6, 0], [2.6, -2.5], [-2.6, -2.5], [-2.6, 0], [-3.0, 0], [-3.0, -2.5], [-3.6, -2.5])],
    ['palma', e(-1.9, -3.3, 0.75, 0.3)], ['palma', e(0.1, -3.3, 0.75, 0.3)], ['palma', e(2.0, -3.3, 0.75, 0.3)], ['pelo2', e(1.2, -3.75, 0.6, 0.5)], ['brasa', e(0, -1.9, 2.2, 0.45)]],
  // el panadero en su bicicleta, con el canasto del pan atrás (de perfil: mira hacia +x)
  panadero: (r) => [
    ['rasgo', aro(-2.6, -1.35, 1.35, 0.3)], ['rasgo', aro(2.9, -1.35, 1.35, 0.3)],
    ['rasgo', p([-2.6, -1.5], [-0.6, -3.5], [2.2, -3.4], [2.9, -1.4], [2.6, -1.3], [2.0, -3.1], [-0.4, -3.2], [0.4, -1.3], [0.1, -1.2], [-0.7, -3.0], [-2.4, -1.2])],
    ['pelo', e(-0.3, -4.9, 1.6, 1.9)], ['som', luna(-0.3, -4.9, 1.6, 1.9, 0.36)], ['pelo', e(0.2, -2.3, 0.6, 1.1)],
    [r, p([-1.5, -6.3], [0.9, -6.3], [1.6, -5.4], [1.4, -3.9], [-1.7, -3.9])], ['pelo', e(1.6, -4.6, 1.2, 0.5)],
    ['pelo', e(0.5, -8.0, 2.0, 1.75)], ['pelo', e(-0.5, -9.55, 0.7)], ['som', luna(0.5, -8.0, 2.0, 1.75)], ['pelo', e(2.3, -7.6, 0.95, 0.75)],
    ['rasgo', e(3.05, -7.75, 0.42, 0.36)], ['rasgo', e(1.35, -8.45, 0.25)],
    ['palma', p([-4.6, -4.4], [-1.9, -4.4], [-2.2, -2.9], [-4.3, -2.9])], ['palma', e(-3.25, -4.5, 1.25, 0.6)],
  ],
  // la siesta del mediodía: sentado en el suelo, la cabeza caída y el sombrero sobre los ojos
  siesta: (r) => [
    ['pelo', e(0, -2.0, 2.0, 1.95)], ['som', luna(0, -2.0, 2.0, 1.95, 0.36)], ['pelo', e(-1.5, -0.35, 1.25, 0.5)], ['pelo', e(1.7, -0.35, 1.25, 0.5)],
    [r, p([-1.15, -3.8], [1.15, -3.8], [2.35, -2.8], [2.0, -1.2], [-2.0, -1.2], [-2.35, -2.8])],
    ['pelo', e(0.3, -4.9, CAB.rx, CAB.ry)], ['pelo', e(-1.55, -6.5, 0.74)], ['pelo', e(2.15, -6.5, 0.74)], ['som', luna(0.3, -4.9, CAB.rx, CAB.ry)],
    ['palma', e(0.75, -4.05, 1.05, 0.75)], ['rasgo', e(0.85, -4.3, 0.55, 0.38)],
    ['palma', p([-2.7, -5.9], [3.5, -5.2], [3.4, -4.7], [-2.8, -5.4])], ['palma', p([-0.8, -5.7], [1.6, -5.4], [1.3, -6.6], [-0.4, -6.85])],
    ['pelo2', e(-1.6, -6.45, 0.55, 0.45)], ['pelo2', e(2.2, -6.2, 0.55, 0.45)],
  ],
  // ---- (Campamento 41) La Navidad entera: los personajes de las maquetas aprobadas (prototipo v4), en la misma talla y los mismos tonos.
  sentado: (r) => [
    ['rasgo', p([-2.3, 0], [-1.9, 0], [-1.9, -1.2], [1.6, -1.2], [1.5, 0], [1.9, 0], [2.0, -1.6], [-1.9, -1.6], [-1.9, -5.4], [-2.3, -5.4])],
    ['pelo', e(0, -3.1, 2.05, 1.85)], ['pelo', e(-1.15, -1.15, 0.9, 0.55)], ['pelo', e(1.15, -1.15, 0.9, 0.55)], ['som', luna(0, -3.1, 2.05, 1.85, 0.36)],
    [r, p([-1.1, -4.55], [1.1, -4.55], [2.3, -3.6], [2.1, -2.3], [-2.1, -2.3], [-2.3, -3.6])], ['pelo', e(2.0, -2.5, 0.6, 1.0)], ['pelo', e(-2.0, -2.5, 0.6, 1.0)],
    ...cabeza(0, 0.55)],
  huacal: (r) => [...cuerpo(), ...brazos(), ...camisa(r), ...cabeza(), ['palma', p([0.9, -3.5], [3.0, -3.5], [2.6, -2.5], [1.3, -2.5])], ['pelo2', e(1.95, -2.5, 0.6, 0.45)]],
  matate: (r) => [...cuerpo(), ...brazos(), ...camisa(r), ...cabeza(), ...sombrero(), ['palma', p([1.2, -3.4], [3.4, -3.4], [3.2, -1.0], [1.4, -1.0])], ['r2', e(1.8, -3.5, 0.5, 0.8)], ['r2', e(2.8, -3.6, 0.5, 0.8)], ['rasgo', p([-1.3, -4.3], [-0.9, -4.3], [1.9, -3.2], [1.5, -3.0])]],
  tendedero: () => [['rasgo', p([-7.2, 0], [-6.85, 0], [-6.85, -6.7], [-7.2, -6.7])], ['rasgo', p([6.85, 0], [7.2, 0], [7.2, -6.7], [6.85, -6.7])], ['rasgo', p([-7, -6.45], [7, -6.25], [7, -6.1], [-7, -6.3])],
    ['r1', p([-5.6, -6.25], [-3.7, -6.2], [-3.9, -3.6], [-5.4, -3.6])], ['pelo2', p([-3.0, -6.2], [0.4, -6.15], [0.4, -2.8], [-3.0, -2.8])], ['r2', p([1.2, -6.15], [2.9, -6.1], [3.3, -4.0], [0.9, -4.0])], ['r0', p([3.9, -6.1], [5.7, -6.05], [5.5, -3.3], [4.1, -3.3])]],
  abrazo: (r) => [...mv([...cuerpo(), ...vestido(r), ...cabeza(0.35, 0)], -1.9), ...mv([...cuerpo(), ...camisa('r2'), ...cabeza(-0.35, 0)], 1.9), ['pelo2', e(0, -3.5, 1.7, 0.55)]],
  mesa: () => [['rasgo', p([-7.6, 0], [-7.2, 0], [-7.2, -2.4], [7.2, -2.4], [7.2, 0], [7.6, 0], [7.6, -2.9], [-7.6, -2.9])], ['pelo2', p([-7.9, -3.4], [7.9, -3.4], [7.9, -2.3], [-7.9, -2.3])],
    ['r1', e(-5.2, -3.7, 0.9, 0.35)], ['r2', e(-2.2, -3.7, 0.9, 0.35)], ['r0', e(0.8, -3.7, 0.9, 0.35)], ['r2', e(3.6, -3.7, 0.9, 0.35)], ['palma', p([5.2, -5.2], [6.4, -5.2], [6.6, -3.5], [5.0, -3.5])], ['brasa', e(-0.7, -4.6, 0.3, 0.55)]],
  brindis: (r) => [...cuerpo(), ...brazos(0, 1), ...camisa(r), ...cabeza(), ['palma', p([1.9, -6.9], [2.7, -6.9], [2.55, -5.9], [2.05, -5.9])]],
  regalo: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...cabeza(), ['r1', p([0.2, -3.9], [2.6, -3.9], [2.6, -1.9], [0.2, -1.9])], ['r2', p([1.2, -3.9], [1.6, -3.9], [1.6, -1.9], [1.2, -1.9])], ['r2', p([0.6, -4.5], [1.4, -3.9], [2.2, -4.5], [1.4, -4.1])], ['pelo2', e(0.2, -2.6, 0.5, 0.45)]],
  oseznoJuguete: (r) => [...cuerpo(), ...brazos(), ...pantaloncito(r), ...cabeza(0, 0, false), ['rasgo', p([2.2, -2.6], [2.35, -2.6], [4.0, -0.9], [3.85, -0.9])], ['r1', p([3.4, -1.9], [6.4, -1.9], [6.4, -0.7], [3.4, -0.7])], ['rasgo', e(4.1, -0.45, 0.5)], ['rasgo', e(5.8, -0.45, 0.5)]],
  volcancito: () => [['r1', p([-0.7, 0], [0.7, 0], [0.25, -1.5], [-0.25, -1.5])], ['brasa', p([-0.2, -1.5], [0.2, -1.5], [1.3, -4.2], [0.3, -2.8], [0, -4.9], [-0.3, -2.8], [-1.3, -4.2])]],
  hombros: (r) => [...cuerpo(), ...brazos(1, 1), ...camisa(r), ...cabeza(), ...mv([['pelo', e(0, -2.5, 1.95, 2.4)], ...pantaloncito('r1'), ...cabeza(0, 0, false)].map(([t, q]) => [t, q[0] === 'p' ? ['p', q[1].map(([x, y]) => [x * 0.62, y * 0.62])] : [q[0], q[1] * 0.62, q[2] * 0.62, q[3] * 0.62, (q[4] ?? q[3]) * 0.62]]), 0, -7.6)],
  escalera: (r) => [['palma', p([-2.2, 0], [-1.8, 0], [-0.4, -11], [-0.8, -11])], ['palma', p([1.2, 0], [1.6, 0], [0.6, -11], [0.2, -11])], ['palma', p([-1.7, -2.6], [1.3, -2.6], [1.25, -2.2], [-1.65, -2.2])], ['palma', p([-1.3, -5.4], [1.0, -5.4], [0.95, -5.0], [-1.25, -5.0])], ['palma', p([-1.0, -8.2], [0.8, -8.2], [0.75, -7.8], [-0.95, -7.8])],
    ...mv([...cuerpo(), ...brazos(1, 1), ...camisa(r), ...cabeza()], 0, -5.2)],
  tamales: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...delantal(), ...cabeza(),
    ['rasgo', p([-2.8, -3.4], [2.8, -3.4], [2.3, -0.9], [-2.3, -0.9])], ['rasgo', e(0, -3.4, 2.9, 0.55)], ['r0', e(-1.0, -3.7, 1.1, 0.5)], ['r0', e(0.9, -3.8, 1.1, 0.5)], ['brasa', e(0, -0.5, 2.5, 0.5)], ['pelo2', e(1.9, -4.3, 0.6, 0.5)]],
  polvora: () => [['r1', p([-4, -0.3], [-3.2, -0.5], [-3.0, 0], [-3.8, 0.1])], ['palma', p([-1.2, -0.4], [-0.3, -0.2], [-0.5, 0.2], [-1.3, 0])], ['r1', p([1.4, -0.5], [2.3, -0.3], [2.1, 0.1], [1.3, 0])], ['palma', p([3.6, -0.2], [4.4, -0.4], [4.5, 0.1], [3.7, 0.2])], ['rasgo', p([-2.2, 0.3], [-1.6, 0.2], [-1.5, 0.6], [-2.1, 0.6])]],
  // la mesa de la cena en el teléfono: la versión corta (cuatro platos no caben en su calle)
  mesaCorta: () => [['rasgo', p([-4.4, 0], [-4.0, 0], [-4.0, -2.4], [4.0, -2.4], [4.0, 0], [4.4, 0], [4.4, -2.9], [-4.4, -2.9])], ['pelo2', p([-4.7, -3.4], [4.7, -3.4], [4.7, -2.3], [-4.7, -2.3])],
    ['r1', e(-2.6, -3.7, 0.9, 0.35)], ['r2', e(0.4, -3.7, 0.9, 0.35)], ['palma', p([2.2, -5.2], [3.4, -5.2], [3.6, -3.5], [2.0, -3.5])], ['brasa', e(-1.1, -4.6, 0.3, 0.55)]],
  // el 31 por la tarde, los volcancitos que preparan los oseznos (apagados: sin chispas)
  volcancitoApagado: () => [['r1', p([-0.7, 0], [0.7, 0], [0.25, -1.5], [-0.25, -1.5])], ['pelo2', p([-0.55, -0.55], [0.55, -0.55], [0.48, -0.8], [-0.48, -0.8])]],
  // el perro de la plaza, echado donde se esconde
  perroEchado: () => [['perro', p(...PERRO_V)]],
  // ---- (Campamento 40) El día entero del pueblo: los personajes de las maquetas aprobadas (prototipo v4), en la misma talla y tonos.
  // (136) la tortillera del mediodía: su comal redondo sobre la hornilla de barro, la brasa debajo y las tortillas (de día; no es la
  // plancha de la pupusera)
  tortillera: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...delantal(), ...cabeza(),
    ['palma', p([-3.1, 0], [-2.7, -2.3], [2.7, -2.3], [3.1, 0])], ['rasgo', e(0, -2.45, 3.2, 0.45)],
    ['pelo2', e(-1.6, -2.8, 0.85, 0.3)], ['pelo2', e(0.3, -2.8, 0.85, 0.3)], ['brasa', e(0, -0.75, 1.3, 0.5)], ['pelo2', e(1.3, -4.0, 0.62, 0.5)], ['pelo2', e(2.1, -3.75, 0.62, 0.5)]],
  // (137) el osezno a la salida de la escuela, con su bolsón cruzado
  oseznoBolson: (r) => [...cuerpo(), ...brazos(), ...pantaloncito(r), ...cabeza(0, 0, false),
    ['rasgo', p([-1.3, -4.3], [-0.9, -4.3], [1.9, -2.3], [1.5, -2.1])], ['palma', p([0.9, -2.7], [3.0, -2.7], [3.0, -0.8], [0.9, -0.8])]],
  // (138) la siesta en hamaca: sus dos postes, la hamaca y el de la siesta acostado con el sombrero en la cara (quieta: mecerse es la 199)
  hamaca: (r) => [['rasgo', p([-6.4, 0], [-6.0, 0], [-6.0, -5.6], [-6.4, -5.6])], ['rasgo', p([6.0, 0], [6.4, 0], [6.4, -5.6], [6.0, -5.6])],
    [r, p([-6.1, -5.3], [-4, -3.0], [0, -1.7], [4, -3.0], [6.1, -5.3], [6.1, -4.5], [4, -1.9], [0, -0.7], [-4, -1.9], [-6.1, -4.5])],
    ['pelo', e(0.6, -3.0, 2.7, 1.15)], ['pelo', e(-3.0, -3.7, 1.55, 1.35)], ['pelo', e(-4.1, -4.75, 0.6)], ['som', luna(-3.0, -3.7, 1.55, 1.35)], ['pelo', e(3.3, -3.3, 0.9, 0.55)],
    ['palma', p([-4.4, -4.6], [-1.6, -4.9], [-1.7, -4.3], [-4.3, -4.0])], ['palma', e(-2.9, -4.95, 0.9, 0.6)]],
  // (143) el jueves, en el tendedero van los uniformes de la escuela: camisas blancas y pantalones oscuros (el lunes, las sábanas:
  // `tendedero`, el mismo del 31)
  tendederoJueves: () => [['rasgo', p([-7.2, 0], [-6.85, 0], [-6.85, -6.7], [-7.2, -6.7])], ['rasgo', p([6.85, 0], [7.2, 0], [7.2, -6.7], [6.85, -6.7])], ['rasgo', p([-7, -6.45], [7, -6.25], [7, -6.1], [-7, -6.3])],
    ['pelo2', p([-6.2, -6.3], [-3.6, -6.25], [-3.3, -5.5], [-3.9, -5.3], [-3.9, -3.9], [-5.9, -3.9], [-5.9, -5.3], [-6.5, -5.5])], ['rasgo', p([-2.6, -6.2], [-0.8, -6.2], [-0.9, -3.2], [-1.5, -3.2], [-1.7, -4.6], [-1.9, -3.2], [-2.5, -3.2])],
    ['pelo2', p([0.2, -6.15], [2.8, -6.1], [3.1, -5.4], [2.5, -5.2], [2.5, -3.8], [0.5, -3.8], [0.5, -5.2], [-0.1, -5.4])], ['rasgo', p([3.8, -6.1], [5.6, -6.05], [5.5, -3.3], [4.9, -3.3], [4.7, -4.6], [4.5, -3.3], [3.9, -3.3])]],
  // (143) donde la calle es corta (el teléfono, el escritorio de un solo corredor), el tendedero corto: el mismo, más estrecho
  tendederoCorto: () => TIPOS.tendedero().map(([t, q]) => [t, ['p', q[1].map(([x, y]) => [x * 0.55, y])]]),
  tendederoJuevesCorto: () => TIPOS.tendederoJueves().map(([t, q]) => [t, ['p', q[1].map(([x, y]) => [x * 0.55, y])]]),
  // los oseznos de espaldas (la espera del 31, mirando la torre): su pantaloncito y la nuca
  oseznoEspaldas: (r) => [...cuerpo(), ...brazos(), ...pantaloncito(r), ['pelo', e(0, CAB.y, CAB.rx, CAB.ry)], ['pelo', e(-1.85, CAB.y - 1.6, 0.74)], ['pelo', e(1.85, CAB.y - 1.6, 0.74)], ['som', luna(0, CAB.y, CAB.rx, CAB.ry)]],
};
/** (Campamento 41) Lo que no es un vecino sino una cosa en el suelo: sin sombra de pie, no cuenta entre los ocho y no aparta a nadie. */
export const COSAS = new Set(['pelota', 'mesa', 'mesaCorta', 'volcancito', 'volcancitoApagado', 'polvora', 'tendedero', 'tendederoJueves', 'tendederoCorto', 'tendederoJuevesCorto', 'perroEchado']);
/** (Campamento 40) Sin sombra de pie, pero sí es un vecino (cuenta y aparta a los demás): la hamaca, con sus postes y el que duerme en ella. */
const SIN_PIE = new Set(['hamaca']);
export const PERSONAJES = Object.keys(TIPOS);
// La caja de cada personaje en sus unidades (de todas sus piezas): para que dos vecinos nunca se monten uno sobre otro.
const CAJAS = Object.fromEntries(Object.entries(TIPOS).map(([t, fn]) => {
  const c = { x0: 0, x1: 0, y0: 0 };
  for (const [, q] of fn('r0')) {
    const pts = q[0] === 'p' ? q[1] : q[0] === 'e' ? [[q[1] - q[3], q[2] - q[4]], [q[1] + q[3], q[2] + q[4]]] : [[q[1] - q[3], q[2] - q[3]], [q[1] + q[3], q[2] + q[3]]];
    for (const [x, y] of pts) { c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); }
  }
  return [t, c];
}));
/** La caja de un vecino puesto en la escena: { x0, x1, y0, y1 }. */
export function cajaVecino({ t, x, y, k, f = 1, s = 1 }) {
  const kk = k * s * E, c = CAJAS[t], a = x + f * c.x0 * kk, b = x + f * c.x1 * kk;
  return { x0: Math.min(a, b), x1: Math.max(a, b), y0: y + c.y0 * kk, y1: y };
}

/** El trazo de una pieza ya puesta en la escena. `m`: (x, y) de unidades a píxeles; `k`: escala. */
function trazo(pieza, m, k) {
  if (pieza[0] === 'e') {
    const [, cx, cy, rx, ry] = pieza, [x, y] = m(cx, cy), a = Math.max(0.1, rx * k), b = Math.max(0.1, ry * k);
    return `M${f1(x - a)} ${f1(y)}a${f1(a)} ${f1(b)} 0 1 0 ${f1(2 * a)} 0a${f1(a)} ${f1(b)} 0 1 0 ${f1(-2 * a)} 0Z`;
  }
  if (pieza[0] === 'a') { // un aro: la elipse de fuera y la de dentro en sentido contrario (el hueco, con la regla de siempre)
    const [, cx, cy, r, g] = pieza, [x, y] = m(cx, cy), a = r * k, b = Math.max(0.1, (r - g) * k);
    return `M${f1(x - a)} ${f1(y)}a${f1(a)} ${f1(a)} 0 1 0 ${f1(2 * a)} 0a${f1(a)} ${f1(a)} 0 1 0 ${f1(-2 * a)} 0ZM${f1(x - b)} ${f1(y)}a${f1(b)} ${f1(b)} 0 1 1 ${f1(2 * b)} 0a${f1(b)} ${f1(b)} 0 1 1 ${f1(-2 * b)} 0Z`;
  }
  return `M${pieza[1].map(([px, py]) => m(px, py).map(f1).join(' ')).join('L')}Z`;
}

/**
 * Los vecinos. `lista`: [{ t, x, y, k, r = 0, f = 1, s = 1 }] (personaje, su pie, la escala del pueblo, su color de ropa 0–2, hacia
 * dónde mira y su talla: un osezno, `OSEZNO`). `sol`: ±1, de dónde viene la luz (la sombra propia va al otro lado, no a la mirada).
 * Devuelve { tonos: { pelo, som, r0, r1, r2, palma, pelo2, rasgo, brasa }, pie } con los trazos acumulados (uno por tono para todos).
 */
export function vecinos(lista, { sol = 1 } = {}) {
  const tonos = Object.fromEntries(TONOS.map((t) => [t, '']));
  let pie = '';
  for (const { t, x, y, k, r = 0, f = 1, s = 1 } of [...lista].sort((a, b) => a.y - b.y)) {
    const kk = k * s * E, piezas = TIPOS[t]?.(`r${r % 3}`) ?? [];
    const m = (px, py) => [x + f * px * kk, y + py * kk];
    const mSom = (px, py) => [x + sol * px * kk, y + py * kk];
    for (const [tono, pieza] of piezas) tonos[tono] += trazo(pieza, tono === 'som' ? mSom : m, kk);
    if (!COSAS.has(t) && !SIN_PIE.has(t)) pie += `M${f1(x - 2.2 * kk)} ${f1(y)}L${f1(x + 2.2 * kk)} ${f1(y)}L${f1(x + (1.4 - sol * 2.6) * kk)} ${f1(y + 0.85 * kk)}L${f1(x - (1.4 + sol * 2.6) * kk)} ${f1(y + 0.7 * kk)}Z`;
  }
  return { tonos, pie };
}
/** Los vecinos como SVG: la sombra de contacto y un trazo por tono (los vacíos no salen). Clases `v-vo-…`. */
export function svgVecinos(lista, { sol = 1 } = {}) {
  const { tonos, pie } = vecinos(lista, { sol });
  return (pie ? `<path class="v-vo-pie" d="${pie}"/>` : '') + TONOS.filter((t) => tonos[t]).map((t) => `<path class="v-vo-${t}" d="${tonos[t]}"/>`).join('');
}
/** La manita alzada de un vecino con el brazo arriba (la que sostiene el hilo de la piscucha), en la escena. */
export function manoDe({ x, y, k, f = 1, s = 1 }) {
  const kk = k * s * E;
  return [x + f * 2.2 * kk, y - 5.7 * kk];
}

// ------------------------------------------------------------------------------------------------ el reparto según el turno (101–107)
/** El número del día (desde el lunes 1 de enero de 2024) de una fecha AAAA-MM-DD; 0 si no hay fecha. */
const numDia = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(f ?? '') ? Math.round((Date.parse(`${f}T00:00:00Z`) - Date.UTC(2024, 0, 1)) / 864e5) : 0);
/**
 * (Campamento 40, idea 141) La carta del día de un turno: cuál de sus `n` repartos parecidos toca hoy (0 a n−1). Lo decide solo la fecha
 * (nunca la cuenta ni las compras): igual para toda la familia. Gira de un día al siguiente, así que **hoy nunca es como ayer**, y con
 * dos o tres cartas tampoco como el mismo día de la semana pasada (7 no es múltiplo de 2 ni de 3). Cada turno empieza en otra carta (su
 * `sal`), para que no cambien todos a la vez. Sin fecha (las pruebas de siempre, la entrada sin día), la carta 0: el reparto de antes.
 * @param {string} dia
 * @param {string} t
 * @param {number} n
 */
export function carta(dia, t, n) {
  if (!dia || n < 2) return 0;
  const sal = [...t].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (((numDia(dia) + sal) % n) + n) % n;
}
/** (Campamento 40, idea 145) Los turnos en que el perro se echa en otro sitio (dibujado con los vecinos; el de siempre se esconde). */
export const PERRO_TURNOS = ['alba', 'amanece', 'manana', 'tortillas', 'salida', 'siesta', 'pupusas', 'posada', 'fresca'];
/**
 * Quién está dónde. `lug`: los sitios del pueblo (`lugaresPueblo`: { atrio, corredor, calle, plaza, banca }, cada uno [[x, y, k]…]);
 * `t`: el turno (cielo.js: `turno`). `hilos`: cuántas piscuchas vuelan (de octubre a noviembre): esos oseznos de la plaza, cuando
 * están, llevan el brazo arriba y miran hacia ellas. Nunca más de `n` figuras (la pelota no cuenta) y nunca según las cuentas.
 * (Campamento 40) `dia`: la fecha (la carta del día, 141; el tendedero de los lunes y jueves, 143; la fila del fin de semana, 142);
 * `escuela`: si ese día hay escuela (cielo.js: `escuela`); `canton`: [x, y, k, f], dónde va hoy por el camino real la que baja del
 * cantón (144; montana.js lo saca de la hora al dibujar el turno), o null.
 */
export function reparto(lug, t, { n = MAX_VECINOS, hilos = 0, dia = '', escuela = true, canton = null } = {}) {
  const L = [];
  const en = (sitio, i, tipo, extra = {}) => { const q = lug[sitio]?.[i]; if (q) L.push({ t: tipo, x: q[0] + (extra.dx ?? 0) * q[2], y: q[1] + (extra.dy ?? 0) * q[2], k: q[2], ...extra }); };
  const oseznos = (cuantos, tipo = null) => {
    for (let i = 0; i < cuantos; i++) {
      const hilo = !tipo && i < hilos;
      en('plaza', i, tipo ?? (hilo || i % 3 === 1 ? 'oseznoArriba' : 'osezno'), { s: OSEZNO, r: i, f: hilo || i % 2 === 0 ? 1 : -1, hilo });
    }
  };
  // (40, 145) El perro de hoy: a su lado de alguien (`perro(sitio, i, dx)`) o bajo la hamaca (`bajo`). Se pone al final, donde quepa sin
  // que nadie quede encima; si no cabe, en su sitio de siempre. Así, en sus turnos, el perro siempre va con los vecinos.
  let perroHoy = null;
  const perro = (sitio, i, dx = 0, extra = {}) => { const q = lug[sitio]?.[i]; perroHoy = q ? { x: q[0] + dx * q[2], y: q[1] + (extra.dy ?? 0) * q[2], k: q[2], bajo: Boolean(extra.bajo) } : null; };
  const c = (m) => carta(dia, t === 'vuelta' ? 'tarde' : t === 'salida' ? 'tortillas' : t, m); // la vuelta y la salida siguen la carta de su turno de antes
  const md = (dia || '').slice(5), sem = dia ? new Date(`${dia}T12:00:00Z`).getUTCDay() : -1;
  const navidad = Boolean(md) && (md >= '12-01' || md <= '01-06');
  // (40, 144) La que baja del cantón por el camino real (de 5:30 a 7:00) y vuelve a subir (de 16:00 a 17:30); va al final de la lista.
  const delCanton = () => { if (canton) L.push({ t: 'vendedora', x: canton[0], y: canton[1], k: canton[2], r: 1, f: canton[3], canton: true }); };
  if (t === 'alba') { en('calle', 0, 'panadero', { r: 1 }); perro('calle', 0, -8.5); } // (140) antes del alba, el panadero carga su canasto
  else if (t === 'amanece') {
    en('corredor', 0, 'estira', { r: 2 }); en('calle', 0, 'panadero', { r: 1 });
    if (c(2)) en('calle', 1, 'escoba', { r: 0, f: -1 }); else en('corredor', 1, 'escoba', { r: 0, f: -1 });
    perro('calle', 0, -8.5); delCanton(); // (145) el perro sigue al panadero un trecho
  }
  // (37) `actor`: el que se mueve en su propia capa (montana.js), en su franja de data-mueve: la que barre de 7:00 a 8:00 y la pelota de
  // los oseznos de 15:00 a 16:30. Uno a la vez.
  else if (t === 'manana') {
    // (40, 141) Tres repartos: el de siempre; la vendedora en la plaza platicando con una vecina; la abuela con visita.
    const k = c(3);
    if (k === 1) { en('plaza', 1, 'vendedora', { r: 0 }); en('plaza', 1, 'vecina', { r: 2, dx: 3.8, f: -1 }); } else en('atrio', 0, 'vendedora', { r: 0 });
    en('corredor', 0, 'abuela', { r: 2 }); en('corredor', 1, 'escoba', { r: 1, actor: 'barre' }); // la que barre, antes que la visita: nunca se queda fuera
    if (k === 2) en('corredor', 0, 'sentado', { r: 0, dx: 4.6, f: -1 });
    en('calle', k === 2 ? 1 : 0, 'campesino', { r: 1, f: k === 2 ? -1 : 1 });
    if (k === 0) en('calle', 1, 'vecina', { r: 2, f: -1 });
    if (k === 1) perro('calle', 0, -5.5); else perro('perro', 0);
  }
  else if (t === 'mananaLibre') {
    const k = c(2);
    en(k ? 'atrio' : 'atrio', k ? 1 : 0, 'vendedora', { r: 0 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', k, 'campesino', { r: 1, f: k ? -1 : 1 }); en('calle', 1 - k, 'vecina', { r: 2, f: k ? 1 : -1 }); oseznos(4);
  }
  // (40, 136 y 137) A mediodía, la tortillera en la calle (donde de noche se pone la pupusera) y alguien que espera sus tortillas; a las
  // 12:00, los días de escuela, los oseznos salen con su bolsón (el perro los espera); sin escuela, juegan en la plaza.
  else if (t === 'tortillas' || t === 'salida') {
    const k = c(3);
    en('calle', 0, 'tortillera', { r: 0 }); en('calle', 0, ['vecino', 'vecina', 'campesino'][k], { r: [2, 1, 0][k], dx: 6.4, f: -1 });
    en('corredor', 0, 'abuela', { r: 2 }); en('atrio', 1, k === 1 ? 'vendedora' : 'vecina', { r: 1 });
    if (t === 'salida') { for (let i = 0; i < 4; i++) en('plaza', i, 'oseznoBolson', { s: OSEZNO, r: i, f: i % 2 ? -1 : 1 }); perro('plaza', 4, 1.5); }
    else { if (!escuela) oseznos(3); if (k === 1) perro('calle', 0, -5.5); else perro('perro', 0); }
  }
  // (40, 138) La siesta en hamaca, bajo el árbol de la plaza, con el perro echado debajo. En Navidad el árbol es el pino y está el
  // nacimiento: el de la siesta duerme sentado en la banca, como antes, y el perro en su sitio.
  else if (t === 'siesta') {
    if (navidad) { en('banca', 0, 'siesta', { r: 1 }); perro('perro', 0); } else { en('banca', 0, 'hamaca', { r: 1, dy: 0.4 }); perro('banca', 0, -2.6, { dy: 0.5, bajo: true }); }
    en('corredor', 0, 'abuela', { r: 2 });
    if (c(2)) en('atrio', 1, 'vecina', { r: 1 }); else en('calle', 1, 'vendedora', { r: 0, f: -1 });
  }
  else if (t === 'tarde' || t === 'vuelta') {
    // (40, 141) Tres repartos de la tarde; la vuelta (16:00–17:45) es la misma tarde con la del cantón subiendo.
    const k = c(3);
    en('corredor', 0, 'abuela', { r: 2 });
    if (k === 2) en('corredor', 0, 'sentado', { r: 1, dx: 4.6, f: -1 });
    oseznos(5); en('plaza', 2, 'pelota', { dx: 1.7, dy: -0.2, actor: 'pelota' });
    if (k === 0) { en('calle', 0, 'vecina', { r: 1 }); en('calle', 1, 'campesino', { r: 2, f: -1 }); }
    else if (k === 1) { en('calle', 0, 'vecino', { r: 0 }); en('atrio', 1, 'vecina', { r: 2 }); }
    else en('calle', 0, 'campesino', { r: 1 });
    if (t === 'vuelta') delCanton();
  }
  else if (t === 'pupusas' || t === 'posada') {
    // (36, idea 112) En Navidad, al anochecer, además una osa y su osezno miran el nacimiento (de espaldas; el nacimiento no cambia).
    if (t === 'posada') { en('portal', 0, 'espaldas', { r: 0 }); en('portal', 0, 'osezno', { r: 2, s: OSEZNO, dx: 3.2, dy: 0.5 }); }
    const k = c(2);
    en('calle', 0, 'pupusera', { r: 0 }); en('calle', 0, k ? 'vecina' : 'vecino', { r: k ? 1 : 2, dx: 6.2, f: -1 }); en('calle', 0, 'osezno', { r: 1, s: OSEZNO, dx: 9.6, f: -1 });
    // (40, 142, fundida en la 141) Viernes, sábado y domingo hay más fila donde la pupusera (hasta los ocho de siempre).
    if ([5, 6, 0].includes(sem)) { // del otro lado de la plancha (hacia la plaza) y, si ahí no caben, detrás de los que esperan; sin salirse de la calle
      for (const [tipo, r, dx, dx2, s] of [['campesino', 0, -6.6, 12.6, 1], ['vecina', 2, -10, 15.8, 1], ['osezno', 0, -13, 19, OSEZNO]]) en('calle', 0, tipo, { r, s, dx, f: 1, fila: true, otro: dx2 - dx });
    }
    en('corredor', 0, 'abuela', { r: 2 }); en('atrio', 1, k ? 'vecino' : 'vecina', { r: 1 });
    perro('calle', 0, -6); // (145) junto a la pupusera, esperando
  }
  // (40, 139) La fresca: de 20:00 a 22:00 los vecinos sacan su silla a la acera (uno junto al farol de la plaza, que de noche se ve); los
  // oseznos ya están adentro.
  else if (t === 'fresca') {
    const k = c(2);
    en('corredor', 0, 'abuela', { r: 2 }); en('calle', 0, 'sentado', { r: 0 }); en('calle', 0, 'sentado', { r: 1, dx: 5.6, f: -1 }); en('calle', 1, 'sentado', { r: 2, f: -1 });
    en('farol', k, 'sentado', { r: 1, dx: k ? -2.6 : 2.6, f: k ? -1 : 1 }); en('atrio', 1, 'vecina', { r: 1 });
    if (!k) en('atrio', 0, 'vecino', { r: 0, f: -1 });
    perro('calle', 0, -5.5);
  }
  // ---- (Campamento 36) El calendario del pueblo: cada fecha, otro reparto de los mismos osos.
  // El domingo, a misa (108): de espaldas camino de la puerta, un vecino con su osezno de la mano y el padre a la puerta (109).
  else if (t === 'misa') { en('atrio', 3, 'cura', {}); en('atrio', 0, 'espaldas', { r: 0 }); en('atrio', 1, 'espaldas', { r: 2 }); en('atrio', 4, 'vecino', { r: 1 }); en('atrio', 4, 'osezno', { r: 0, s: OSEZNO, dx: 3.1 }); en('corredor', 0, 'abuela', { r: 1 }); en('calle', 0, 'campesino', { r: 2, f: -1 }); }
  // El sábado, más plaza (110): dos vendedoras con su canasto, vecinos y un osezno; sin puestos ni rótulos.
  else if (t === 'mercado') { en('atrio', 0, 'vendedora', { r: 0 }); en('plaza', 0, 'vendedora', { r: 2, f: -1 }); en('plaza', 2, 'campesino', { r: 1 }); en('plaza', 4, 'vecina', { r: 0 }); en('plaza', 5, 'osezno', { r: 1, s: OSEZNO, dx: 0.8 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 1, 'vecina', { r: 1, f: -1 }); }
  // El 15 de septiembre, el desfile (111): el abanderado con la azul y blanco, el del bombo de la banda de paz y los vecinos mirando.
  else if (t === 'desfile') { en('calle', 0, 'abanderado', { r: 0, f: -1 }); en('plaza', 1, 'bombo', { r: 0 }); en('plaza', 3, 'oseznoArriba', { r: 0, s: OSEZNO }); en('plaza', 5, 'vecino', { r: 0 }); en('atrio', 0, 'vecina', { r: 2 }); en('atrio', 0, 'osezno', { r: 1, s: OSEZNO, dx: 3 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 1, 'campesino', { r: 1, f: -1 }); }
  // (Nochebuena y el 31 de 18:00 a 1:00, con los oseznos y su estrellita (113), pasó a la cena del campamento 41: `nb-cena`, `f31-cena`.)
  // ---- (Campamento 41) La Navidad entera (24, 25, 31, 1 y 6): cada fecha, su guion por turnos (cielo.js: turno), de la madrugada a la
  // medianoche; los mismos osos y los mismos trazos (0 nodos). El actor de cada turno (uno a la vez) va en su capa: la que barre, la
  // pelota, el que brinda en la cena y el volcancito que chispea a las doce. Las cosas (`COSAS`) no cuentan entre los ocho.
  else if (t === 'nb-madruga') { en('calle', 0, 'panadero', { r: 1 }); en('corredor', 1, 'escoba', { r: 0, f: -1 }); en('atrio', 0, 'vendedora', { r: 2 }); en('corredor', 0, 'estira', { r: 2 }); }
  else if (t === 'nb-compras') { en('atrio', 0, 'vendedora', { r: 0 }); en('plaza', 0, 'vendedora', { r: 2, f: -1 }); en('calle', 1, 'escalera', { r: 0 }); en('calle', 0, 'matate', { r: 2 }); en('plaza', 2, 'huacal', { r: 1 }); en('corredor', 1, 'escoba', { r: 1, actor: 'barre' }); en('corredor', 0, 'abuela', { r: 2 }); en('plaza', 4, 'oseznoArriba', { s: OSEZNO, r: 1 }); }
  else if (t === 'nb-tamales') { en('calle', 0, 'tamales', { r: 0 }); en('calle', 0, 'sentado', { r: 2, dx: 6.4, f: -1 }); en('atrio', 1, 'regalo', { r: 0 }); en('calle', 1, 'vecina', { r: 1, f: -1 }); en('corredor', 0, 'abuela', { r: 2 }); oseznos(3); en('plaza', 2, 'pelota', { dx: 1.7, dy: -0.2, actor: 'pelota' }); }
  else if (t === 'nb-cena' || t === 'f31-cena') {
    en('calle', 0, lug.forma === 'tel' || lug.forma === 'acostado' ? 'mesaCorta' : 'mesa', { dx: 3 });
    en('calle', 0, t === 'nb-cena' ? 'sentado' : 'brindis', { r: 0, dx: -6.5 }); en('calle', 0, 'brindis', { r: 1, dx: 12.5, f: -1, actor: 'brinda' });
    en('calle', 1, t === 'nb-cena' ? 'brindis' : 'sentado', { r: 2, f: -1 }); en('corredor', 0, 'abuela', { r: 2 }); oseznos(3, 'oseznoLuz');
    if (t === 'nb-cena') en('portal', 0, 'espaldas', { r: 0 }); else en('atrio', 1, 'vecina', { r: 1 });
  }
  else if (t === 'nb-misa') { en('atrio', 3, 'cura', {}); for (const [i, r] of [[0, 0], [1, 2], [4, 1], [2, 0]]) en('atrio', i, 'espaldas', { r }); en('calle', 0, 'vecino', { r: 2, f: -1 }); en('calle', 0, 'osezno', { s: OSEZNO, r: 1, dx: -3.2 }); en('corredor', 0, 'abuela', { r: 2 }); }
  else if (t === 'nb-doce' || t === 'f31-doce') {
    en('calle', 0, 'abrazo', { r: 0 }); en('atrio', 1, 'abrazo', { r: 1 }); if (t === 'nb-doce') en('calle', 1, 'regalo', { r: 2, f: -1 }); else en('calle', 1, 'abrazo', { r: 2, f: -1 });
    en('plaza', 1, 'oseznoArriba', { s: OSEZNO, r: 0 }); en('plaza', 3, 'oseznoLuz', { s: OSEZNO, r: 2, f: -1 }); en('plaza', 4, 'oseznoArriba', { s: OSEZNO, r: 1, f: -1 }); en('corredor', 0, 'abuela', { r: 2 });
    en('plaza', 0, 'volcancito', {}); en('plaza', 5, 'volcancito', { dx: 1, actor: 'chispea' }); en('banca', 0, 'perroEchado', { dx: -2.6, dy: 0.3 });
  }
  else if (t === 'n25-polvora') { en('calle', 0, 'polvora', {}); en('plaza', 2, 'polvora', {}); en('corredor', 1, 'escoba', { r: 1, actor: 'barre' }); }
  else if (t === 'n25-estrena') { for (let i = 0; i < 5; i++) en('plaza', i, i % 2 ? 'oseznoJuguete' : 'osezno', { s: OSEZNO, r: i, f: i % 2 ? 1 : -1 }); en('plaza', 2, 'pelota', { dx: 1.7, dy: -0.2, actor: 'pelota' }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 0, 'sentado', { r: 1 }); en('calle', 1, 'vecina', { r: 0, f: -1 }); }
  else if (t === 'n25-recalentado') { en('calle', 0, lug.forma === 'tel' || lug.forma === 'acostado' ? 'mesaCorta' : 'mesa', { dx: 3 }); en('calle', 0, 'perroEchado', { dx: 1, dy: 0.2 }); en('calle', 0, 'sentado', { r: 0, dx: -6.5 }); en('calle', 0, 'sentado', { r: 1, dx: 12.5, f: -1 }); en('calle', 1, 'vecina', { r: 2, f: -1 }); en('banca', 0, 'siesta', { r: 1 }); en('corredor', 0, 'abuela', { r: 2 }); }
  else if (t === 'n25-paseo') { en('calle', 0, 'hombros', { r: 0 }); en('calle', 0, 'vecina', { r: 1, dx: 5.2 }); en('portal', 0, 'espaldas', { r: 2 }); en('portal', 0, 'osezno', { s: OSEZNO, r: 0, dx: 3.2, dy: 0.5 }); en('atrio', 0, 'vecino', { r: 2 }); en('atrio', 0, 'oseznoJuguete', { s: OSEZNO, r: 1, dx: 3.4 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 1, 'sentado', { r: 2, f: -1 }); }
  else if (t === 'n25-fresca' || t === 'e1-fresca') { en('calle', 0, t === 'n25-fresca' ? 'pupusera' : 'sentado', { r: 0 }); en('calle', 0, 'sentado', { r: 1, dx: 5.6, f: -1 }); en('calle', 1, 'sentado', { r: 2, f: -1 }); en('corredor', 0, 'abuela', { r: 2 }); en('atrio', 1, 'vecina', { r: 1 }); en('atrio', 0, 'vecino', { r: 0, f: -1 }); }
  else if (t === 'f31-limpia') { en('corredor', 1, 'escoba', { r: 1, actor: 'barre' }); en('corredor', 0, 'tendedero', { dx: -1, dy: -0.4 }); en('atrio', 0, 'vendedora', { r: 0 }); en('calle', 0, 'escoba', { r: 2, f: -1 }); en('calle', 1, 'vecina', { r: 2, f: -1 }); en('plaza', 1, 'osezno', { s: OSEZNO, r: 0 }); en('plaza', 3, 'oseznoArriba', { s: OSEZNO, r: 1, f: -1 }); }
  else if (t === 'f31-estreno') { en('atrio', 0, 'vecina', { r: 1 }); en('calle', 0, 'vecino', { r: 0 }); en('calle', 1, 'campesino', { r: 2, f: -1 }); en('corredor', 0, 'abuela', { r: 2 }); oseznos(3); en('plaza', 0, 'volcancitoApagado', { dx: 2.6 }); en('plaza', 4, 'volcancitoApagado', { dx: -2.4 }); en('plaza', 2, 'pelota', { dx: 1.7, dy: -0.2, actor: 'pelota' }); }
  else if (t === 'f31-espera') { for (const [i, r] of [[0, 0], [1, 1], [2, 2], [4, 0]]) en('atrio', i, 'espaldas', { r }); en('calle', 0, 'espaldas', { r: 1 }); en('plaza', 1, 'oseznoEspaldas', { s: OSEZNO, r: 0 }); en('plaza', 3, 'oseznoEspaldas', { s: OSEZNO, r: 2 }); en('corredor', 0, 'abuela', { r: 2 }); en('plaza', 5, 'volcancitoApagado', { dx: 1 }); en('banca', 0, 'perroEchado', { dx: -2.6, dy: 0.3 }); }
  else if (t === 'e1-polvora') { en('calle', 0, 'polvora', {}); en('plaza', 2, 'polvora', {}); en('calle', 1, 'polvora', { dx: -2 }); }
  else if (t === 'e1-barre') { en('corredor', 1, 'escoba', { r: 0 }); en('plaza', 2, 'polvora', {}); en('corredor', 0, 'abuela', { r: 2 }); }
  else if (t === 'e1-visitas') { en('calle', 0, 'vecina', { r: 0 }); en('calle', 0, 'osezno', { s: OSEZNO, r: 1, dx: 3.1 }); en('calle', 1, 'vecino', { r: 2, f: -1 }); en('corredor', 0, 'abuela', { r: 2 }); en('corredor', 1, 'vecina', { r: 1, f: -1 }); oseznos(2); en('plaza', 2, 'pelota', { dx: 1.7, dy: -0.2, actor: 'pelota' }); }
  else if (t === 'e6-guarda') { en('plaza', 0, 'escalera', { r: 0, dx: -2 }); en('plaza', 2, 'oseznoArriba', { s: OSEZNO, r: 1, f: -1 }); en('plaza', 3, 'osezno', { s: OSEZNO, r: 2 }); en('calle', 0, 'vecina', { r: 1 }); en('corredor', 0, 'abuela', { r: 2 }); en('atrio', 0, 'vendedora', { r: 0 }); }
  // 'duerme' (22:00–5:00): nadie en la calle (103).
  // Nadie se monta sobre otro: en el orden del reparto, quien cae encima de alguien ya puesto no sale (como mucho se rozan).
  // Los oseznos de la plaza van en corro, escalonados (unos un paso más adelante): entre ellos sí se rozan. (Pulido) Tampoco se para
  // nadie sobre el perro, las gallinas o la cruz (`lug.ocupado`): un adulto da unos pasos a un lado (3 o 6 unidades) o no sale.
  const puestos = [...(lug.ocupado ?? [])], m = 0.35;
  let figuras = 0;
  const choca = (c, roce) => puestos.some((q) => !(c.osezno && q.osezno) && c.x0 < q.x1 - roce && c.x1 > q.x0 + roce && c.y0 < q.y1 - roce && c.y1 > q.y0 + roce);
  const fuera = [];
  for (const v of L) {
    if (COSAS.has(v.t)) { fuera.push(v); continue; }
    if (figuras >= n) continue;
    const roce = m * v.k, adulto = (v.s ?? 1) >= 1;
    const d = (adulto ? [0, 3, -3, 6, -6] : [0]).find((dx) => !choca({ ...cajaVecino({ ...v, x: v.x + dx * v.k }), osezno: !adulto }, roce));
    if (d === undefined) continue;
    const w = { ...v, x: v.x + d * v.k };
    if (v.fila && lug.borde) { // (40, 142) la fila, dentro de la calle; si no cabe de un lado, del otro
      const dentro = (q) => { const cj = cajaVecino(q); return cj.x0 >= lug.borde[0] && cj.x1 <= lug.borde[1]; };
      if (!dentro(w)) {
        const o = { ...v, x: v.x + v.otro * v.k, f: -1, fila: false };
        if (!dentro(o) || choca({ ...cajaVecino(o), osezno: !adulto }, roce)) continue;
        Object.assign(w, o);
      }
    }
    puestos.push({ ...cajaVecino(w), osezno: !adulto });
    fuera.push(w);
    figuras++;
  }
  // (40, 145) El perro de hoy, el último: donde quepa sin que nadie le quede encima (o bajo la hamaca, a propósito); si no, en su sitio.
  if (perroHoy && PERRO_TURNOS.includes(t)) {
    const v = { t: 'perroEchado', x: perroHoy.x, y: perroHoy.y, k: perroHoy.k }, cj = cajaVecino(v);
    const s0 = lug.perro?.[0];
    if (perroHoy.bajo || !choca(cj, m * v.k)) { fuera.push(v); puestos.push(cj); } else if (s0) fuera.push({ t: 'perroEchado', x: s0[0], y: s0[1], k: s0[2] });
  }
  // (40, 143) Lunes y jueves, la ropa tendida (el lunes, sábanas; el jueves, los uniformes de la escuela) de la mañana a las 16:00; en la
  // lluviosa se recoge al empezar la siesta, antes del aguacero. Delante de una casa con corredor donde no tape a nadie; si no cabe, no sale.
  const lluviosa = Boolean(md) && md.slice(0, 2) >= '05' && md.slice(0, 2) <= '10';
  if ((sem === 1 || sem === 4) && (['manana', 'mananaLibre', 'tortillas', 'salida'].includes(t) || (!lluviosa && ['siesta', 'tarde'].includes(t)))) {
    const tipo = sem === 1 ? 'tendedero' : 'tendederoJueves';
    const sitios = [...(lug.corredor ?? []).slice(2), ...[...(lug.calle ?? [])].reverse(), ...(lug.corredor ?? []).slice(0, 2)];
    // Primero el largo, sin moverlo; si no cabe en ningún sitio, el corto, con unos pasos a un lado si hace falta.
    const prueba = [...sitios.map((q) => [q, tipo, 0]), ...sitios.flatMap((q) => [0, -3, 3, -6, 6].map((dx) => [q, `${tipo}Corto`, dx]))];
    for (const [q, tt, dx] of prueba) {
      const v = { t: tt, x: q[0] + dx * q[2], y: q[1] - 0.4 * q[2], k: q[2] }, cj = cajaVecino(v);
      if (!choca(cj, m * v.k)) { fuera.push(v); break; }
    }
  }
  return fuera;
}
/** El charco de luz de la plancha de la pupusera (de noche, como la luz de las puertas): [x, y, radio] o null si no está. */
export function luzPupusa(lista) {
  const v = lista.find((q) => q.t === 'pupusera');
  return v ? [v.x, v.y + 0.4 * v.k, 8 * v.k] : null;
}
