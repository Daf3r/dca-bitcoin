// Campamento 35 · El Pueblo de los Osos: los vecinos del valle son osos polares (los de la cumbre son los peluches de la familia; estos,
// los vecinos: mismo pelo blanco, otra talla, otra ropa, otra vida). Funciones puras que devuelven SVG como texto (sin DOM ni el
// `rnd()` de la montaña). «Talla pueblo»: de pie, cabezota redonda, dos orejitas, hocico de palma y nariz oscura, con su sombra propia
// del lado contrario al astro; sin contornos. Todo el pueblo sale en UN trazo por tono (nueve como mucho) y sin estilos en línea.
// Orden de pintado de los tonos: pelo → sombra propia → ropa (tres colores) → palma (sombrero, canasto, escoba, delantal) → pelo de
// encima (orejas que asoman, manitas sobre lo que cargan) → rasgos (nariz, ojos, lo negro) → brasa (la plancha de la pupusera).
// Quién está dónde depende del turno (cielo.js: `turno`, por la hora y el día de El Salvador) y nunca de las cuentas ni de las compras.
const f1 = (n) => n.toFixed(1);
const RAD = Math.PI / 180;
export const TONOS = ['pelo', 'som', 'r0', 'r1', 'r2', 'azul', 'palma', 'pelo2', 'rasgo', 'brasa']; // ('azul', solo el 15 de septiembre)
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

/** Los personajes (101): cada uno, una lista de [tono, pieza] en sus unidades (el pie en 0, 0; el astro por +x). `r` = su color de ropa. */
function colocarPiezas(piezas, dx, dy = 0, escala = 1) {
  return piezas.map(([tono, pieza]) => {
    const [tipo, x, y, ...radios] = pieza;
    if (tipo === 'p') return [tono, ['p', x.map(([a, b]) => [dx + a * escala, dy + b * escala])]];
    return [tono, [tipo, dx + x * escala, dy + y * escala, ...radios.map((r) => r * escala)]];
  });
}
const OBJETOS = new Set(['mesa', 'pelota', 'polvora', 'volcancito', 'cono', 'caja', 'tendedero', 'gallo']);
const TIPOS = {
  sentado: (r) => [
    ['rasgo', p([-2.3, 0], [-1.9, 0], [-1.9, -1.2], [1.6, -1.2], [1.5, 0], [1.9, 0], [2.0, -1.6], [-1.9, -1.6], [-1.9, -5.4], [-2.3, -5.4])],
    ['pelo', e(0, -3.1, 2.05, 1.85)], ['pelo', e(-1.15, -1.15, 0.9, 0.55)], ['pelo', e(1.15, -1.15, 0.9, 0.55)], ['som', luna(0, -3.1, 2.05, 1.85, 0.36)],
    [r, p([-1.1, -4.55], [1.1, -4.55], [2.3, -3.6], [2.1, -2.3], [-2.1, -2.3], [-2.3, -3.6])], ['pelo', e(2.0, -2.5, 0.6, 1.0)], ['pelo', e(-2.0, -2.5, 0.6, 1.0)],
    ...cabeza(0, 0.55)],
  tendedero: () => [['rasgo', p([-7.2, 0], [-6.85, 0], [-6.85, -6.7], [-7.2, -6.7])], ['rasgo', p([6.85, 0], [7.2, 0], [7.2, -6.7], [6.85, -6.7])], ['rasgo', p([-7, -6.45], [7, -6.25], [7, -6.1], [-7, -6.3])],
    ['r1', p([-5.6, -6.25], [-3.7, -6.2], [-3.9, -3.6], [-5.4, -3.6])], ['pelo2', p([-3.0, -6.2], [0.4, -6.15], [0.4, -2.8], [-3.0, -2.8])], ['r2', p([1.2, -6.15], [2.9, -6.1], [3.3, -4.0], [0.9, -4.0])], ['r0', p([3.9, -6.1], [5.7, -6.05], [5.5, -3.3], [4.1, -3.3])]],
  abrazo: (r) => [...colocarPiezas([...cuerpo(), ...vestido(r), ...cabeza(0.35, 0)], -1.9), ...colocarPiezas([...cuerpo(), ...camisa('r2'), ...cabeza(-0.35, 0)], 1.9), ['pelo2', e(0, -3.5, 1.7, 0.55)]],
  hamaca: (r) => [['rasgo', p([-6.4, 0], [-6.0, 0], [-6.0, -5.6], [-6.4, -5.6])], ['rasgo', p([6.0, 0], [6.4, 0], [6.4, -5.6], [6.0, -5.6])],
    [r, p([-6.1, -5.3], [-4, -3.0], [0, -1.7], [4, -3.0], [6.1, -5.3], [6.1, -4.5], [4, -1.9], [0, -0.7], [-4, -1.9], [-6.1, -4.5])],
    ['pelo', e(0.6, -3.0, 2.7, 1.15)], ['pelo', e(-3.0, -3.7, 1.55, 1.35)], ['pelo', e(-4.1, -4.75, 0.6)], ['som', luna(-3.0, -3.7, 1.55, 1.35)], ['pelo', e(3.3, -3.3, 0.9, 0.55)],
    ['palma', p([-4.4, -4.6], [-1.6, -4.9], [-1.7, -4.3], [-4.3, -4.0])], ['palma', e(-2.9, -4.95, 0.9, 0.6)]],
  gallo: () => [['rasgo', p([-1.6, -1.0], [-1.9, -2.8], [-1.2, -2.0], [-0.2, -2.2], [0.5, -3.4], [1.1, -3.6], [1.6, -3.1], [1.2, -2.9], [1.1, -1.6], [0.3, -0.8], [0.3, 0], [0, 0], [0, -0.8], [-0.9, -0.8])], ['r1', p([0.5, -3.5], [0.8, -4.1], [1.1, -3.6], [1.4, -4.0], [1.5, -3.3])]],
  mesa: () => [['rasgo', p([-7.6, 0], [-7.2, 0], [-7.2, -2.4], [7.2, -2.4], [7.2, 0], [7.6, 0], [7.6, -2.9], [-7.6, -2.9])], ['pelo2', p([-7.9, -3.4], [7.9, -3.4], [7.9, -2.3], [-7.9, -2.3])],
    ['r1', e(-5.2, -3.7, 0.9, 0.35)], ['r2', e(-2.2, -3.7, 0.9, 0.35)], ['r0', e(0.8, -3.7, 0.9, 0.35)], ['r2', e(3.6, -3.7, 0.9, 0.35)], ['palma', p([5.2, -5.2], [6.4, -5.2], [6.6, -3.5], [5.0, -3.5])], ['brasa', e(-0.7, -4.6, 0.3, 0.55)]],
  brindis: (r) => [...cuerpo(), ...brazos(0, 1), ...camisa(r), ...cabeza(), ['palma', p([1.9, -6.9], [2.7, -6.9], [2.55, -5.9], [2.05, -5.9])]],
  regalo: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...cabeza(), ['r1', p([0.2, -3.9], [2.6, -3.9], [2.6, -1.9], [0.2, -1.9])], ['r2', p([1.2, -3.9], [1.6, -3.9], [1.6, -1.9], [1.2, -1.9])], ['r2', p([0.6, -4.5], [1.4, -3.9], [2.2, -4.5], [1.4, -4.1])], ['pelo2', e(0.2, -2.6, 0.5, 0.45)]],
  oseznoJuguete: (r) => [...cuerpo(), ...brazos(), ...pantaloncito(r), ...cabeza(0, 0, false), ['rasgo', p([2.2, -2.6], [2.35, -2.6], [4.0, -0.9], [3.85, -0.9])], ['r1', p([3.4, -1.9], [6.4, -1.9], [6.4, -0.7], [3.4, -0.7])], ['rasgo', e(4.1, -0.45, 0.5)], ['rasgo', e(5.8, -0.45, 0.5)]],
  volcancito: () => [['r1', p([-0.7, 0], [0.7, 0], [0.25, -1.5], [-0.25, -1.5])], ['brasa', p([-0.2, -1.5], [0.2, -1.5], [1.3, -4.2], [0.3, -2.8], [0, -4.9], [-0.3, -2.8], [-1.3, -4.2])]],
  escalera: (r) => [['palma', p([-2.2, 0], [-1.8, 0], [-0.4, -11], [-0.8, -11])], ['palma', p([1.2, 0], [1.6, 0], [0.6, -11], [0.2, -11])], ['palma', p([-1.7, -2.6], [1.3, -2.6], [1.25, -2.2], [-1.65, -2.2])], ['palma', p([-1.3, -5.4], [1.0, -5.4], [0.95, -5.0], [-1.25, -5.0])], ['palma', p([-1.0, -8.2], [0.8, -8.2], [0.75, -7.8], [-0.95, -7.8])],
    ...colocarPiezas([...cuerpo(), ...brazos(1, 1), ...camisa(r), ...cabeza()], 0, -5.2)],
  tamales: (r) => [...cuerpo(), ...brazos(), ...vestido(r), ...delantal(), ...cabeza(),
    ['rasgo', p([-2.8, -3.4], [2.8, -3.4], [2.3, -0.9], [-2.3, -0.9])], ['rasgo', e(0, -3.4, 2.9, 0.55)], ['r0', e(-1.0, -3.7, 1.1, 0.5)], ['r0', e(0.9, -3.8, 1.1, 0.5)], ['brasa', e(0, -0.5, 2.5, 0.5)], ['pelo2', e(1.9, -4.3, 0.6, 0.5)]],
  polvora: () => [['r1', p([-4, -0.3], [-3.2, -0.5], [-3.0, 0], [-3.8, 0.1])], ['palma', p([-1.2, -0.4], [-0.3, -0.2], [-0.5, 0.2], [-1.3, 0])], ['r1', p([1.4, -0.5], [2.3, -0.3], [2.1, 0.1], [1.3, 0])], ['palma', p([3.6, -0.2], [4.4, -0.4], [4.5, 0.1], [3.7, 0.2])], ['rasgo', p([-2.2, 0.3], [-1.6, 0.2], [-1.5, 0.6], [-2.1, 0.6])]],
  cono: () => [['r1', p([-1, 0], [1, 0], [0, -2.2])]],
  caja: () => [['palma', p([-2.3, 0], [2.3, 0], [2.3, -2.1], [-2.3, -2.1])], ['r1', p([-1.9, -2.1], [-2.6, -3.1], [-0.7, -2.8], [0, -2.1])]],
  hombros: (r) => [...cuerpo(), ...brazos(1, 1), ...camisa(r), ...cabeza(), ...colocarPiezas([...cuerpo(), ...pantaloncito('r1'), ...cabeza(0, 0, false)], 0, -7.8, OSEZNO)],
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
};
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
    if (!OBJETOS.has(t)) pie += `M${f1(x - 2.2 * kk)} ${f1(y)}L${f1(x + 2.2 * kk)} ${f1(y)}L${f1(x + (1.4 - sol * 2.6) * kk)} ${f1(y + 0.85 * kk)}L${f1(x - (1.4 + sol * 2.6) * kk)} ${f1(y + 0.7 * kk)}Z`;
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
/**
 * Quién está dónde. `lug`: los sitios del pueblo (`lugaresPueblo`: { atrio, corredor, calle, plaza, banca }, cada uno [[x, y, k]…]);
 * `t`: el turno (cielo.js: `turno`). `hilos`: cuántas piscuchas vuelan (de octubre a noviembre): esos oseznos de la plaza, cuando
 * están, llevan el brazo arriba y miran hacia ellas. Nunca más de `n` figuras (la pelota no cuenta) y nunca según las cuentas.
 */
export function reparto(lug, t, { n = MAX_VECINOS, hilos = 0 } = {}) {
  const L = [];
  const en = (sitio, i, tipo, extra = {}) => { const q = lug[sitio]?.[i]; if (q) L.push({ t: tipo, x: q[0] + (extra.dx ?? 0) * q[2], y: q[1] + (extra.dy ?? 0) * q[2], k: q[2], ...extra }); };
  const oseznos = (cuantos, tipo = null) => {
    for (let i = 0; i < cuantos; i++) {
      const hilo = !tipo && i < hilos;
      en('plaza', i, tipo ?? (hilo || i % 3 === 1 ? 'oseznoArriba' : 'osezno'), { s: OSEZNO, r: i, f: hilo || i % 2 === 0 ? 1 : -1, hilo });
    }
  };
  if (t === 'amanece') { en('corredor', 0, 'estira', { r: 2 }); en('calle', 0, 'panadero', { r: 1 }); en('corredor', 1, 'escoba', { r: 0, f: -1 }); }
  // (37) `actor`: el que se mueve en su propia capa (montana.js), en su franja de data-mueve: la que barre de 7:00 a 8:00 y la pelota de
  // los oseznos de 15:00 a 16:30. Uno a la vez.
  else if (t === 'manana') { en('atrio', 0, 'vendedora', { r: 0 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 0, 'campesino', { r: 1 }); en('corredor', 1, 'escoba', { r: 1, actor: 'barre' }); en('calle', 1, 'vecina', { r: 2, f: -1 }); }
  else if (t === 'mananaLibre') { en('atrio', 0, 'vendedora', { r: 0 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 0, 'campesino', { r: 1 }); en('calle', 1, 'vecina', { r: 2, f: -1 }); oseznos(4); }
  else if (t === 'siesta') { en('banca', 0, 'siesta', { r: 1 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 1, 'vendedora', { r: 0, f: -1 }); }
  else if (t === 'tarde') { en('corredor', 0, 'abuela', { r: 2 }); oseznos(5); en('plaza', 2, 'pelota', { dx: 1.7, dy: -0.2, actor: 'pelota' }); en('calle', 0, 'vecina', { r: 1 }); en('calle', 1, 'campesino', { r: 2, f: -1 }); }
  else if (t === 'pupusas' || t === 'posada') {
    // (36, idea 112) En Navidad, al anochecer, además una osa y su osezno miran el nacimiento (de espaldas; el nacimiento no cambia).
    if (t === 'posada') { en('portal', 0, 'espaldas', { r: 0 }); en('portal', 0, 'osezno', { r: 2, s: OSEZNO, dx: 3.2, dy: 0.5 }); }
    en('calle', 0, 'pupusera', { r: 0 }); en('calle', 0, 'vecino', { r: 2, dx: 6.2, f: -1 }); en('calle', 0, 'osezno', { r: 1, s: OSEZNO, dx: 9.6, f: -1 }); en('corredor', 0, 'abuela', { r: 2 }); en('atrio', 1, 'vecina', { r: 1 });
  }
  // ---- (Campamento 36) El calendario del pueblo: cada fecha, otro reparto de los mismos osos.
  // El domingo, a misa (108): de espaldas camino de la puerta, un vecino con su osezno de la mano y el padre a la puerta (109).
  else if (t === 'misa') { en('atrio', 3, 'cura', {}); en('atrio', 0, 'espaldas', { r: 0 }); en('atrio', 1, 'espaldas', { r: 2 }); en('atrio', 4, 'vecino', { r: 1 }); en('atrio', 4, 'osezno', { r: 0, s: OSEZNO, dx: 3.1 }); en('corredor', 0, 'abuela', { r: 1 }); en('calle', 0, 'campesino', { r: 2, f: -1 }); }
  // El sábado, más plaza (110): dos vendedoras con su canasto, vecinos y un osezno; sin puestos ni rótulos.
  else if (t === 'mercado') { en('atrio', 0, 'vendedora', { r: 0 }); en('plaza', 0, 'vendedora', { r: 2, f: -1 }); en('plaza', 2, 'campesino', { r: 1 }); en('plaza', 4, 'vecina', { r: 0 }); en('plaza', 5, 'osezno', { r: 1, s: OSEZNO, dx: 0.8 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 1, 'vecina', { r: 1, f: -1 }); }
  // El 15 de septiembre, el desfile (111): el abanderado con la azul y blanco, el del bombo de la banda de paz y los vecinos mirando.
  else if (t === 'desfile') { en('calle', 0, 'abanderado', { r: 0, f: -1 }); en('plaza', 1, 'bombo', { r: 0 }); en('plaza', 3, 'oseznoArriba', { r: 0, s: OSEZNO }); en('plaza', 5, 'vecino', { r: 0 }); en('atrio', 0, 'vecina', { r: 2 }); en('atrio', 0, 'osezno', { r: 1, s: OSEZNO, dx: 3 }); en('corredor', 0, 'abuela', { r: 2 }); en('calle', 1, 'campesino', { r: 1, f: -1 }); }
  else {
    // Las piezas principales se colocan primero. Un abrazo y un oso en hombros cuentan como dos.
    const calle = (tipo, i = 0, extra = {}) => en('calle', i, tipo, extra);
    const atrio = (tipo, i = 0, extra = {}) => en('atrio', i, tipo, extra);
    const plaza = (tipo, i, extra = {}) => en('plaza', i, tipo, extra);
    const corredor = (tipo, i = 0, extra = {}) => en('corredor', i, tipo, extra);
    const pelota = () => plaza('pelota', 2, { dx: 1.7, dy: -0.2, actor: 'pelota' });
    switch (t) {
      case 'panNavideno':
        calle('panadero', 0, { r: 1 }); corredor('escoba', 1); atrio('vendedora'); plaza('gallo', 4); break;
      case 'comprasNavidad':
        calle('escalera'); atrio('vendedora'); plaza('vendedora', 0, { r: 2 }); calle('regalo', 1);
        corredor('escoba', 1, { actor: 'barre' }); oseznos(3); break;
      case 'olla':
      case 'tamales':
        calle('tamales'); atrio('regalo', 1); calle('vecina', 1, { r: 2 });
        if (t === 'tamales') { oseznos(4); pelota(); } else corredor('vendedora');
        break;
      case 'cenaNavidad':
      case 'cenaFin':
      case 'ultimoBrindis':
        calle('mesa', 0, { s: lug.compacto ? 0.68 : 1 });
        calle('brindis', 0, { dx: lug.compacto ? 7 : 10, r: 1, f: -1, actor: 'brindis' });
        atrio('brindis', 1, { r: 2 }); oseznos(t === 'ultimoBrindis' ? 2 : 3, 'oseznoLuz');
        corredor(t === 'cenaNavidad' ? 'abuela' : 'sentado');
        if (t === 'cenaNavidad') en('portal', 0, 'espaldas');
        break;
      case 'misaGallo':
      case 'esperaTorre':
        if (t === 'misaGallo') atrio('cura', 3);
        for (const i of [0, 1, 2, 4]) atrio('espaldas', i, { r: i });
        calle('espaldas'); calle('espaldas', 1, { r: 1 });
        plaza('espaldas', 3, { s: OSEZNO }); break;
      case 'abrazoNavidad':
      case 'abrazoNuevo':
        calle('abrazo'); atrio('abrazo', 1, { r: 1 });
        plaza('volcancito', 0, { actor: 'volcancito' });
        plaza('oseznoLuz', 3, { r: 1, s: OSEZNO });
        if (t === 'abrazoNavidad') calle('regalo', 1, { r: 2 });
        plaza('oseznoArriba', 5, { s: OSEZNO }); break;
      case 'restos':
      case 'limpiaAcera':
        calle('polvora'); plaza('polvora', 2);
        if (t === 'limpiaAcera') corredor('escoba', 1, { actor: 'barre' });
        break;
      case 'juguetes':
        plaza('oseznoJuguete', 1, { s: OSEZNO }); plaza('oseznoJuguete', 4, { s: OSEZNO, f: -1 });
        pelota(); calle('sentado'); corredor('abuela'); break;
      case 'recalentado':
        calle('mesa', 0, { s: 0.65 }); atrio('sentado', 1); corredor('hamaca', 0, { r: 1 }); break;
      case 'paseo':
        calle('hombros'); en('portal', 0, 'espaldas'); calle('vecina', 1); oseznos(3); break;
      case 'pupusasAcera':
      case 'visitaAcera':
      case 'sillas':
        calle('sentado'); corredor('abuela', 0, { r: 2 }); atrio('sentado', 1, { r: 1 });
        if (t === 'pupusasAcera') calle('pupusera', 1);
        if (t === 'visitaAcera') calle('vecina', 1);
        break;
      case 'primeraEscoba':
      case 'limpieza':
        calle('escoba', 0, { r: 1, actor: 'barre' });
        if (t === 'limpieza') { calle('tendedero', 1); corredor('escoba', 1); atrio('vendedora'); }
        break;
      case 'estreno':
      case 'preparativos':
        plaza('cono', 1); calle('vecina', 0, { r: 2 }); atrio('vecino', 1, { r: 1 });
        oseznos(t === 'estreno' ? 2 : 4); if (t === 'preparativos') pelota(); break;
      case 'almuerzoCasa':
      case 'visitas':
        corredor('abuela'); calle(t === 'visitas' ? 'hombros' : 'sentado'); atrio('vecina', 1);
        if (t === 'visitas') { corredor('vecino', 1); oseznos(2); }
        break;
      case 'cajas':
      case 'guardaFocos':
      case 'despedida':
        calle(t === 'guardaFocos' ? 'escalera' : 'vecino');
        calle('caja', 0, { dx: 4 }); oseznos(t === 'guardaFocos' ? 4 : 2);
        if (t === 'despedida') en('portal', 0, 'espaldas');
        break;
    }
  }
  // 'duerme' (22:00–5:00): nadie en la calle (103).
  // Nadie se monta sobre otro: en el orden del reparto, quien cae encima de alguien ya puesto no sale (como mucho se rozan).
  // Los oseznos de la plaza van en corro, escalonados (unos un paso más adelante): entre ellos sí se rozan. (Pulido) Tampoco se para
  // nadie sobre el perro, las gallinas o la cruz (`lug.ocupado`): un adulto da unos pasos a un lado (3 o 6 unidades) o no sale.
  const puestos = [...(lug.ocupado ?? [])], m = 0.35;
  let figuras = 0;
  const choca = (c, roce) => puestos.some((q) => !(c.osezno && q.osezno) && c.x0 < q.x1 - roce && c.x1 > q.x0 + roce && c.y0 < q.y1 - roce && c.y1 > q.y0 + roce);
  const fuera = [];
  for (const v of L) {
    if (v.t === 'pelota') { fuera.push(v); continue; }
    const cuenta = OBJETOS.has(v.t) ? 0 : (v.t === 'abrazo' || v.t === 'hombros') ? 2 : 1;
    if (figuras + cuenta > n) continue;
    const roce = m * v.k, adulto = (v.s ?? 1) >= 1;
    const d = (adulto ? [0, 3, -3, 6, -6] : [0]).find((dx) => !choca({ ...cajaVecino({ ...v, x: v.x + dx * v.k }), osezno: !adulto }, roce));
    if (d === undefined) continue;
    const w = { ...v, x: v.x + d * v.k };
    puestos.push({ ...cajaVecino(w), osezno: !adulto });
    fuera.push(w);
    figuras += cuenta;
  }
  return fuera;
}
/** El charco de luz de la plancha de la pupusera (de noche, como la luz de las puertas): [x, y, radio] o null si no está. */
export function luzPupusa(lista) {
  const v = lista.find((q) => q.t === 'pupusera');
  return v ? [v.x, v.y + 0.4 * v.k, 8 * v.k] : null;
}
