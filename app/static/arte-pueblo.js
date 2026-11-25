// Campamento 22C · el valle, de verdad: el pueblo al pie de la montaña, en primer plano. Funciones puras que devuelven SVG como texto
// (sin DOM ni el `rnd()` de la montaña: lo que necesita azar usa el suyo), en el lenguaje de la escena: planos con luz y sombra, sin
// contornos, cada cosa asentada en su suelo. Un trazo por tono para todo el pueblo (pocos nodos). Los colores salen del CSS (bloque
// «Campamento 22C» al final de styles.css), que sigue a la hora; lo de temporada se dibuja siempre y el CSS lo enseña cuando toca.
// `sitiosPueblo` decide dónde va cada cosa con el sitio que deja el sendero (nunca lo pisa): en el teléfono, bajo el primer tramo
// del camino; en escritorio, a la izquierda de la salida. El sendero empieza en el pueblo.
import { facetas } from './arte.js';

const f1 = (n) => n.toFixed(1);
const P = ([x, y]) => `${f1(x)} ${f1(y)}`;
const poli = (pts) => `M${pts.map(P).join('L')}Z`;
const elipse = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0Z`;
function azar(s) {
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
const punto = ([x, y]) => `M${P([x, y])}h0.01`;

// Las casas: [ancho del frente, alto de la pared, fondo, alto del tejado, color, corredor]. Colores de pueblo de aquí: cal, añil,
// ocre, rosa y verde agua (sin el de nadie: no se asocian a personas).
const COLORES = ['cal', 'anil', 'ocre', 'rosa', 'menta'];
const CASAS = [[15, 8, 9, 5.4, 1, true], [12, 7.4, 8, 5, 2, false], [16, 8.4, 9, 5.6, 0, true], [12.5, 7.6, 8, 5, 3, false], [14, 8, 9, 5.4, 4, true], [12, 7, 8, 4.8, 0, false], [13, 7.6, 8.5, 5, 2, true]];
const ALTO_IGLESIA = 40; // del suelo a la punta de la cruz (unidades)
// (Pulido del pueblo) La terraza de la fila de atrás, sobre la calle: lo más alto de una casa del frente (la cumbrera de la más alta,
// 8.4 + 5.6 + 1.1) menos 1.3, así su tejado tapa a lo sumo el pie de la fachada de atrás.
export const TERRAZA = 13.8;
// (Campamento 35) El perro echado, de perfil y mirando a la derecha, con la cabeza alzada: su pie de atrás en (0, 0); `K_PERRO` es su
// escala frente a la del pueblo. Mide `ANCHO_PERRO` unidades del pueblo (de la punta de la cola a las patas de delante).
const PERRO = [[-1.0, -0.55], [-0.3, -0.75], [0.2, -1.55], [1.4, -1.95], [2.9, -1.85], [3.6, -1.5], [3.9, -2.45], [4.0, -3.05], [4.15, -3.55], [4.5, -3.05], [4.95, -2.95], [5.75, -2.6], [5.9, -2.35], [5.5, -2.1], [4.8, -1.95], [4.45, -1.2], [5.8, -0.45], [5.85, 0], [0.3, 0], [-0.25, -0.25]];
const K_PERRO = 0.8;
export const ANCHO_PERRO = 6.9 * K_PERRO;
/** Dónde empieza el cuerpo del perro echado (su pie de atrás) desde el borde izquierdo de su caja, en unidades del pueblo. */
export const COLA_PERRO = 1.0 * K_PERRO;
/**
 * (Pulido de la iglesia y el paisaje bajo) Las piezas de una casa, como polígonos en la escena: el frente, el hastial (al lado del
 * astro), el faldón de teja con su borde, el canto del tejado de atrás, el alero, los postes del corredor, la puerta, las dos ventanas
 * y, en las casas con fogón, la chimenea sobre el faldón, de donde sale el humo. Pura: la dibuja `pueblo` y la comprueba test_lib
 * (el tejado asienta sobre la pared, la puerta y las ventanas dentro de su fachada, la chimenea sobre el tejado).
 * Escala: la puerta mide 6 unidades (un vecino oso, 6.7) y las ventanas van de 3 a 5.6, a la altura de una persona.
 */
export function piezasCasa(x, y0, s, i, u, sol = 1) {
  const [w, h, d, rh, color, corredor] = CASAS[i % CASAS.length];
  const k = u * s, ox = sol > 0 ? x : x + (w + d * 0.62) * k;
  const m = (px, py) => [ox + sol * px * k, y0 + py * k];
  const dx = d * 0.62, dy = -d * 0.24, ov = 1.4; // el fondo en perspectiva y el vuelo del alero
  const cumbrera = [m(dx / 2 - ov * 0.5, dy / 2 - h - rh), m(w + dx / 2, dy / 2 - h - rh)];
  // La chimenea: en el faldón, cerca de la cumbrera y hacia el hastial; su pie entra en el tejado y asoma 2.2 por encima de la cumbrera.
  const cx = w * 0.74 + dx * 0.4, cy = -h + 0.9 + 0.8 * (dy / 2 - rh - 0.9);
  return {
    k, color: COLORES[color], corredor, fogon: i % 3 === 0,
    sombra: [m(-1.5, 0.4), m(w + dx + 1, dy + 0.4), m(w + dx - 3, dy + 1.8), m(-4, 1.6)],
    frente: [m(0, 0), m(w, 0), m(w, -h), m(0, -h)],
    lado: [m(w, 0), m(w + dx, dy), m(w + dx, dy - h), m(w + dx / 2, dy / 2 - h - rh), m(w, -h)],
    techo: [m(-ov, -h + 0.9), m(w + ov * 0.4, -h + 0.9), cumbrera[1], cumbrera[0]],
    techoS: [cumbrera[1], m(w + dx + ov * 0.6, dy - h + 0.9), m(w + dx + ov * 0.6, dy - h + 1.8), m(w + dx / 2, dy / 2 - h - rh + 1.1), m(w + ov * 0.4, -h + 0.9), m(w + ov * 0.4, -h + 1.8)],
    teja: [m(-ov, -h + 0.9), m(w + ov * 0.4, -h + 0.9)],
    alero: [m(0, -h), m(w, -h), m(w, -h + (corredor ? h * 0.82 : 1.6)), m(0, -h + (corredor ? h * 0.82 : 1.6))],
    postes: corredor ? [0.04, 0.36, 0.68, 0.96].map((t) => [m(w * t, 0), m(w * t, -h + 0.9)]) : [],
    puerta: [m(w * 0.42, 0), m(w * 0.42 + 2.6, 0), m(w * 0.42 + 2.6, -6), m(w * 0.42, -6)],
    ventanas: [0.14, 0.76].map((t) => [m(w * t, -3), m(w * t + 2, -3), m(w * t + 2, -5.6), m(w * t, -5.6)]),
    chimenea: [m(cx - 0.65, cy + 0.6), m(cx + 0.65, cy + 0.6), m(cx + 0.65, dy / 2 - h - rh - 2.2), m(cx - 0.65, dy / 2 - h - rh - 2.2)],
    humo: m(cx, dy / 2 - h - rh - 2.6),
    luzPuerta: [...m(w * 0.42 + 1.3, 0.6), 5 * k],
    alerosCordel: [m(-ov, -h + 1), m(w + ov * 0.4, -h + 1)],
  };
}
/** La caja de una casa en la escena (pared, tejado y su fondo): [x0, y0, x1, y1]. `y0` es la cumbrera; `ym`, lo alto de la pared. */
export function cajaCasa(x, y0, s, i, u, sol = 1) {
  const [w, h, d, rh] = CASAS[i % CASAS.length], k = u * s, ancho = (w + d * 0.62) * k;
  return { x0: x - 1.4 * k, x1: x + ancho + 1.4 * k, y0: y0 - (h + rh + d * 0.12) * k, ym: y0 - h * k, y1: y0, sol };
}
/** La caja de la iglesia (torre, fachada y nave, hasta la cruz). */
export function cajaIglesia(x, s, u, yg, sol = 1) {
  const k = u * s, xa = sol > 0 ? x : x - 11 * k;
  return { x0: xa, x1: xa + 41 * k, y0: yg - 37 * k, ym: yg - 21 * k, y1: yg };
}

/**
 * Dónde va cada pieza del pueblo. `limite(xa, xb)`: la y más alta (en pantalla, la menor) que pueden alcanzar los tejados entre `xa` y
 * `xb` sin acercarse al sendero ni a la salida. Se recorre de izquierda a derecha: primero la iglesia con su plaza, luego las casas (una
 * fila delante y, donde cabe, otra detrás, más chica). Lo que no cabe se encoge o no se pone; nunca se pone encima del camino.
 */
export function sitiosPueblo({ W, H, forma, by, bx, pts = [], lago = null, techo = 0, sol = 1, ancho = null }) {
  const tel = forma === 'tel', esc = forma === 'esc', acostado = forma === 'acostado';
  // La escala: un rancho del frente mide unos 28 px en el teléfono, 30 en la tablet y 40 en escritorio.
  const u = tel ? Math.max(1.4, Math.min(2.4, W / 168)) : forma === 'tab' ? 2.5 : esc ? Math.max(2.4, Math.min(3.6, H / 225)) : 1.3;
  // La calle: en el teléfono y la tablet, a media franja del valle (delante va el primer plano); en escritorio, en el valle de la izquierda.
  const yg = esc ? H * 0.925 : acostado ? H - 12 : Math.min(H - 14, by + (H - by) * 0.75);
  const x0 = esc ? Math.max(30, bx - (ancho ?? Math.min(560, bx - 40))) : 4;
  const xMax = esc ? bx - 26 : acostado ? Math.min(bx - 18, W * 0.5) : lago ? Math.min(W - 4, lago.cx - lago.rx * 0.95) : W - 4;
  // Los puntos del sendero, cada 4 px (para medir cuánto sitio deja encima).
  const muestras = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx2, by2] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, by2 - ay) / 4));
    for (let j = 0; j <= n; j++) muestras.push([ax + ((bx2 - ax) * j) / n, ay + ((by2 - ay) * j) / n]);
  }
  const techoMin = techo + (esc ? 30 : 14);
  const limite = (xa, xb) => {
    let y = Infinity;
    for (const [x, yy] of muestras) if (x > xa - 10 && x < xb + 10) y = Math.min(y, yy);
    return y === Infinity ? techoMin : Math.max(techoMin, y - 11);
  };
  const cabe = (xa, xb, alto) => yg - alto >= limite(xa, xb) && xa >= 0 && xb <= W;
  const piezas = [];
  // Cada pieza ocupa [xa, xb]: se busca, desde el cursor, el primer sitio donde cabe (o se encoge hasta un 70 %).
  let cursor = x0;
  const colocar = (anchoU, altoU, extra = {}) => {
    for (const s of [1, 0.86, 0.72]) {
      for (let x = cursor; x + anchoU * u * s <= xMax; x += 3) {
        if (cabe(x, x + anchoU * u * s, altoU * u * s)) { cursor = x + anchoU * u * s; return { x, s, ...extra }; }
      }
    }
    return null;
  };
  // La iglesia (fachada de 20, torre de 8 a su lado y la nave que va hacia atrás) y, delante y a su lado, la plaza con el pino.
  const iglesia = colocar(30, ALTO_IGLESIA, { tipo: 'iglesia' });
  if (iglesia) piezas.push(iglesia);
  // La plaza: un hueco de 26 unidades (el pino de Navidad y, en otras fechas, su árbol), con los faroles en sus esquinas.
  const plazaU = tel || acostado ? 24 : 30;
  const plaza = colocar(plazaU, 24, { tipo: 'plaza' });
  // Lo alto de la plaza (el pino de Navidad, unas 36 unidades, y el asta de la bandera) se ajusta al sitio que deja el sendero encima.
  if (plaza) { plaza.alto = (yg - limite(plaza.x, plaza.x + plazaU * u * plaza.s)) / (u * plaza.s); piezas.push(plaza); }
  // Las casas del frente, hasta donde quepan.
  const casasFrente = [];
  for (let i = 0; i < CASAS.length; i++) {
    const [w, h, d, rh] = CASAS[i];
    cursor += 2 * u;
    const c = colocar(w + d * 0.62 + 2, h + rh + d * 0.24 + 1, { tipo: 'casa', i });
    if (!c) break;
    casasFrente.push(c);
    piezas.push(c);
  }
  // La fila de atrás (pulido del pueblo): casas más chicas en una terraza detrás de la calle, con su muro de piedra, a la altura de
  // los tejados del frente: el tejado de delante tapa a lo sumo el pie de su fachada (se ven enteras, no un tejado montado sobre
  // otro). Empieza donde acaba la iglesia (su nave, o su torre si la luz viene del otro lado): nunca detrás de ella. Donde el sendero
  // no deja sitio encima, no se pone. (Antes iba a 10 unidades de la calle, detrás de los tejados, y desde la mitad de la nave.)
  const atras = [];
  const yAtras = yg - TERRAZA * u;
  const desde = iglesia ? iglesia.x + (sol > 0 ? 41 : 30) * u * iglesia.s + 2 * u : x0;
  for (let x = desde, j = 0; x < cursor - 6 * u; j++) {
    const i = (j * 3 + 2) % CASAS.length, [w, h, d, rh] = CASAS[i], s = 0.7 - (j % 2) * 0.06;
    const xb = x + (w + d * 0.62) * u * s;
    if (xb < xMax && yAtras - (h + rh + d * 0.24) * u * s >= limite(x, xb)) atras.push({ x, s, i, y: yAtras });
    x = xb + (2 + (j % 3) * 3) * u;
  }
  const xFin = Math.max(cursor, x0 + 40);
  // Los niños de la plaza (de octubre a noviembre sostienen el hilo de las piscuchas).
  // (Campamento 35) Entre la esquina del perro y las gallinas (a 0.78 del ancho de la plaza): nadie encima de ellos.
  const anchoPlaza = tel || acostado ? 24 : 30, paso = (anchoPlaza * 0.78 - 6.6) / 5;
  const ninos = plaza ? [0, 1, 2, 3, 4, 5].map((j) => [plaza.x + (4 + j * paso) * u * plaza.s, yg + (2.6 + (j % 2) * 1.2) * u]) : [];
  // Los vecinos (osos, campamento 35) y los animales: en la calle, delante de las casas y en la plaza (`lugaresPueblo`).
  return { u, yg, x0, xFin, xMaxArbol: xMax - 6 * u, piezas, atras, plaza, iglesia, sol, forma, ninos, caja: [x0 - 4, Math.min(yg - ALTO_IGLESIA * u, yAtras - 12 * u), xFin + 4, yg + 4 * u] };
}

// ------------------------------------------------------------------------------------------------ los sitios de los vecinos
/**
 * (Campamento 35) Dónde pueden estar los vecinos osos, de izquierda a derecha: el atrio de la iglesia, los corredores de las casas
 * que lo tienen, la calle junto a las que no, los seis sitios de la plaza (los oseznos), la banca bajo el árbol de la plaza y el poste
 * del farol (donde se amarran las piscuchas cuando no hay oseznos). Cada sitio, [x, y, k] (su pie y la escala del pueblo). Solo
 * depende del sitio del pueblo: nunca de las cuentas ni de las compras.
 */
export function lugaresPueblo(sit) {
  const { u, yg, piezas, sol } = sit;
  const lug = { atrio: [], corredor: [], calle: [], plaza: [], banca: [], poste: [], portal: [], ocupado: [], perro: [], farol: [], forma: sit.forma }, delante = []; // (41) `forma`: en el teléfono, la mesa corta
  for (const q of piezas) {
    const k = u * q.s;
    if (q.tipo === 'iglesia') {
      const ox = sol > 0 ? q.x + 9 * k : q.x + 21 * k, m = (px, py) => [ox + sol * px * k, yg + py * k, k];
      // A los lados de la puerta, delante de la nave, en la puerta (el padre, el domingo: campamento 36) y delante de la torre.
      lug.atrio.push(m(16.5, 1.6), m(3.5, 2.6), m(22.5, 3.4), m(10, 1.2), m(-4.5, 3.4));
    } else if (q.tipo === 'plaza') {
      const w = (sit.forma === 'tel' || sit.forma === 'acostado' ? 24 : 30) * k, cx = q.x + w * 0.42;
      lug.banca.push([cx + w * 0.2, yg + 0.5 * k, k]);
      // (36) Frente al nacimiento de Navidad, del lado contrario al astro y con aire (no lo tapan).
      lug.portal.push([cx + w * 0.62 - sol * 14 * k, yg + 2.4 * k, k]);
      lug.poste.push([q.x + 3.6 * k, yg - 5.1 * k, k], [q.x + w - 1 * k, yg - 5.1 * k, k]);
      // (Pulido) Lo que ya ocupa la plaza y nadie pisa: el perro echado y las gallinas (ver `pueblo`). Delante de la cruz de mayo sí
      // se para la gente (así se diseñó en el campamento 34).
      const xp = q.x - 1.8 * k, kd = K_PERRO * k, xg = cx + w * 0.36;
      // (Campamento 40, idea 145) El sitio de siempre del perro (cuando el turno lo lleva a otro lado y ahí no cabe, vuelve a este) y,
      // para la fresca (139), junto al pie de cada farol de la plaza.
      lug.perro.push([xp, yg + 1.6 * k, k]);
      lug.farol.push([q.x + 3.6 * k, yg + 1.2 * k, k], [q.x + w - 1 * k, yg + 1.2 * k, k]);
      lug.ocupado.push({ x0: xp - 1.0 * kd, x1: xp + 5.9 * kd, y0: yg + 1.6 * k - 3.6 * kd, y1: yg + 1.6 * k + 0.3 * k }, { x0: xg - 0.6 * k, x1: xg + 5.2 * k, y0: yg - 1.6 * k, y1: yg + 1.6 * k });
    } else if (q.tipo === 'casa') {
      const [w, , d, , , corredor] = CASAS[q.i % CASAS.length], ox = sol > 0 ? q.x : q.x + (w + d * 0.62) * k;
      const m = (px, py) => [ox + sol * px * k, yg + py * k, k];
      // Con corredor: dos sitios en él y uno en la calle, delante (va al final de la calle); sin corredor, uno en la calle, a su lado.
      if (corredor) { lug.corredor.push(m(w * 0.7, 0.5), m(w * 0.22, 0.5)); delante.push(m(w * 0.3, 4.2)); } else lug.calle.push(m(w + 3.2, 3.4));
    }
  }
  for (const [x, y] of sit.ninos ?? []) lug.plaza.push([x, y, u]);
  lug.borde = [sit.x0, sit.xFin]; // (40) de dónde a dónde llega la calle: la fila del fin de semana no se sale de ella (ni llega al sendero)
  lug.calle.push(...delante); // primero la calle junto a las casas sin corredor; después, delante de las que lo tienen
  return lug;
}

// ------------------------------------------------------------------------------------------------ el dibujo
/**
 * El pueblo. Devuelve un solo SVG (en orden de atrás adelante): la calle y la plaza, las casas de atrás, la iglesia, las casas del
 * frente, los árboles, el pino de Navidad y el portal del nacimiento (Navidad), los faroles, los cordeles (foquitos en Navidad,
 * banderitas en las fiestas), los vecinos osos y los animales, el humo del fogón. `ventanas`: cuántas se encienden de noche (una por
 * persona). `vecinos`: el SVG de los vecinos del turno de ahora (montana.js), en su grupo `.v-vecinos`, que se rehace al cambiar de turno.
 */
export function pueblo(sit, { ventanas = 0, evitar = null, vecinos = '' } = {}) {
  const { u, yg, piezas, atras, sol } = sit;
  // Un acumulador por tono: todo el pueblo en unos pocos trazos. La fila de atrás va en los suyos (B), que se pintan antes que la
  // iglesia y que el frente: así nada de atrás queda encima de lo de delante (pulido del pueblo).
  const A = {}, B = {};
  let dest = A;
  const add = (k, d) => { dest[k] = (dest[k] ?? '') + d; };
  const sitiosVentana = [];
  const humos = [];
  const faroles = [];
  const cordeles = [];
  const charcos = []; // charcos de luz en el suelo (de noche): [x, y, radio]
  // La calle: tierra apisonada delante de las casas, de la iglesia al final del pueblo.
  add('calle', poli([[sit.x0 - 2 * u, yg + 0.4 * u], [sit.xFin + 2 * u, yg + 0.4 * u], [sit.xFin + 6 * u, yg + 5.6 * u], [sit.x0 - 6 * u, yg + 5.6 * u]]));
  // ---- una casa: frente (la pared larga, de cara), su hastial (al lado del astro), el tejado de teja, el alero y la puerta.
  const casa = (x, y0, s, i, fila) => {
    const c = piezasCasa(x, y0, s, i, u, sol);
    add('sombra', poli(c.sombra));
    add(`frente-${c.color}`, poli(c.frente));
    add(`lado-${c.color}`, poli(c.lado));
    add('techo-l', poli(c.techo));
    add('techo-s', poli(c.techoS));
    add('teja', `M${P(c.teja[0])}L${P(c.teja[1])}`); // el borde de las tejas
    // El alero echa su sombra en la pared; con corredor, la sombra es honda y hay postes.
    add('alero', poli(c.alero));
    for (const [a, b] of c.postes) add('poste', `M${P(a)}L${P(b)}`);
    // La puerta y las ventanas (en el frente; las de la fila de atrás no cuentan para las personas).
    add('puerta', poli(c.puerta));
    for (const q of c.ventanas) { if (fila === 0) sitiosVentana.push({ q, orden: sitiosVentana.length }); else add('ventana', poli(q)); }
    // El fogón: su chimenea en el tejado y, delante, de donde sale el humo (solo en la fila de delante).
    if (fila === 0 && c.fogon) { add('chimenea', poli(c.chimenea)); humos.push(c.humo); }
    if (fila === 0) charcos.push(c.luzPuerta); // la luz de la puerta en la calle
    return { techo: c.frente[3], alero: c.alerosCordel };
  };
  // ---- la iglesia: fachada encalada con su frontón barroco, la puerta en arco y el óculo; la torre con su campanario y una cúpula
  // pequeña; la nave hacia atrás con su tejado. La cruz es corta (no sobresale contra el cielo: delante tiene la montaña).
  // (Pulido de la iglesia) Asentada en su atrio de piedra (una plataforma con su grada, de la torre al canto de la fachada); la fachada
  // con su zócalo y cuatro pilastras; la nave con tres contrafuertes y la cumbrera de su tejado; la torre con su basa, una cornisa a
  // media altura y una ventanita (de noche, encendida como las otras).
  let cordelTorre = null;
  const iglesia = (x, s) => {
    const k = u * s;
    const ox = sol > 0 ? x + 9 * k : x + 21 * k; // la torre va del lado de la sombra
    const m = (px, py) => [ox + sol * px * k, yg + py * k];
    const w = 20, h = 17, dx = 12, dy = -4.6;
    add('sombra', poli([m(-9, 0.4), m(w + dx, dy + 0.4), m(w + dx - 4, dy + 2.2), m(-12, 1.8)]));
    // La nave (pared lateral, al astro) y su tejado.
    add('ig-lado', poli([m(w, -3), m(w + dx, dy - 3), m(w + dx, dy - h + 3), m(w, -h + 3)]));
    add('techo-l', poli([m(w - 0.5, -h + 3), m(w + dx, dy - h + 3), m(w + dx - 3, dy - h - 2.4), m(w - 3.5, -h - 2.4)]));
    add('ig-lado', poli([m(w, 0), m(w + dx, dy), m(w + dx, dy - 3), m(w, -3)])); // el zócalo
    // Los contrafuertes de la nave (entre las ventanas) y la cumbrera de su tejado.
    for (const tt of [0.12, 0.54, 0.94]) add('ig-torre-s', poli([m(w + dx * tt - 0.45, dy * tt), m(w + dx * tt + 0.55, dy * tt), m(w + dx * tt + 0.55, dy * tt - h + 3.4), m(w + dx * tt - 0.45, dy * tt - h + 3.4)]));
    add('techo-s', poli([m(w - 3.5, -h - 2.4), m(w + dx - 3, dy - h - 2.4), m(w + dx - 2.6, dy - h - 1.6), m(w - 3.1, -h - 1.6)]));
    // La fachada: el muro y el frontón (curvo, con su remate).
    const fr = [m(0, 0), m(w, 0), m(w, -h), m(w - 2, -h), m(w - 3.2, -h - 2.8), m(w / 2 + 2.4, -h - 4.2), m(w / 2 + 1.2, -h - 6.4), m(w / 2 - 1.2, -h - 6.4), m(w / 2 - 2.4, -h - 4.2), m(3.2, -h - 2.8), m(2, -h), m(0, -h)];
    add('ig-frente', poli(fr));
    add('ig-moldura', `M${P(m(0, -h + 0.6))}L${P(m(w, -h + 0.6))}M${P(m(0, -6.6))}L${P(m(w, -6.6))}`);
    // El relieve de la fachada y de la torre: el zócalo y las pilastras (en los cantos y a los lados de la puerta), un tono más hondo.
    const banda = (a, b, y1, y2) => poli([m(a, y1), m(b, y1), m(b, y2), m(a, y2)]);
    add('ig-relieve', banda(-8.5, w, 0, -1.4) + banda(0.2, 1.3, -1.4, -h + 0.6) + banda(w - 1.3, w - 0.2, -1.4, -h + 0.6) + banda(w / 2 - 4.3, w / 2 - 3.4, -1.4, -h + 0.6) + banda(w / 2 + 3.4, w / 2 + 4.3, -1.4, -h + 0.6));
    // La torre: cuerpo, campanario con su arco y la cúpula pequeña con su linterna.
    add('ig-torre', poli([m(-8.5, 0), m(0, 0), m(0, -h - 9), m(-8.5, -h - 9)]));
    add('ig-torre-s', poli([m(-8.5, 0), m(-6.6, 0), m(-6.6, -h - 9), m(-8.5, -h - 9)]));
    add('ig-moldura', `M${P(m(-9, -h - 0.4))}L${P(m(0.4, -h - 0.4))}M${P(m(-9, -h - 9))}L${P(m(0.4, -h - 9))}M${P(m(-8.8, -h * 0.5))}L${P(m(0.2, -h * 0.5))}`);
    add('ig-cupula', `M${P(m(-8.6, -h - 9.4))}Q${P(m(-8.4, -h - 15))} ${P(m(-4.25, -h - 15.6))}Q${P(m(-0.1, -h - 15))} ${P(m(0.1, -h - 9.4))}Z`);
    add('ig-cruz', `M${P(m(-4.25, -h - 15.4))}L${P(m(-4.25, -h - 19.8))}M${P(m(-5.6, -h - 18.4))}L${P(m(-2.9, -h - 18.4))}`);
    // Los huecos oscuros (o encendidos de noche): el arco del campanario, la puerta en arco, el óculo y dos ventanas altas.
    const arco = (cx, y0, a, alto) => `M${P(m(cx - a, y0))}L${P(m(cx - a, y0 - alto + a))}Q${P(m(cx - a, y0 - alto))} ${P(m(cx, y0 - alto))}Q${P(m(cx + a, y0 - alto))} ${P(m(cx + a, y0 - alto + a))}L${P(m(cx + a, y0))}Z`;
    add('ig-hueco', arco(-4.25, -h - 1.6, 1.9, 6));
    add('ig-portal', arco(w / 2, 0, 2.6, 8.4)); // (Campamento 52, idea 234) el portal, aparte: el sacristán lo abre y lo cierra
    add('ig-hueco', `M${P(m(w / 2 - 1.3, -h + 3))}a${f1(1.3 * k)} ${f1(1.3 * k)} 0 1 0 ${f1(2.6 * k * sol)} 0a${f1(1.3 * k)} ${f1(1.3 * k)} 0 1 0 ${f1(-2.6 * k * sol)} 0Z`);
    add('ig-campana', arco(-4.25, -h - 2.6, 0.9, 2.6));
    add('ig-ventana', arco(3.4, -9, 0.9, 4) + arco(w - 3.4, -9, 0.9, 4) + arco(w + dx * 0.35, dy * 0.35 - 7, 0.8, 4) + arco(w + dx * 0.72, dy * 0.72 - 7, 0.8, 4) + arco(-4.25, -h * 0.5 - 1.4, 0.7, 3.2));
    // El atrio: la plataforma de piedra (su piso, al frente, y su grada) donde asientan la torre y la fachada.
    add('ig-atrio', poli([m(-9.6, 0), m(w + 0.8, 0), m(w - 1.6, 1.0), m(-12, 1.0)]));
    add('ig-atrio-s', poli([m(-12, 1.0), m(w - 1.6, 1.0), m(w - 1.6, 2.1), m(-12, 2.1)]) + poli([m(w - 1.6, 1.0), m(w + 0.8, 0), m(w + 0.8, 1.1), m(w - 1.6, 2.1)]));
    // Un cordel de la torre a la plaza (foquitos o banderitas): se amarra al farol del otro lado de la plaza.
    cordelTorre = m(0.4, -h - 1);
    charcos.push([...m(w / 2, 0.8), 10 * k]);
  };
  // ---- la plaza: el empedrado, el árbol de la plaza (un mango, que en Navidad deja su sitio al pino), los faroles y el portal.
  const plaza = (x, s, alto = 40) => {
    const k = u * s, w = (sit.forma === 'tel' || sit.forma === 'acostado' ? 24 : 30) * k;
    add('plaza', `M${f1(x - 4 * k)} ${f1(yg + 1.6 * k)}L${f1(x + w + 4 * k)} ${f1(yg + 1.6 * k)}L${f1(x + w - 1 * k)} ${f1(yg - 3.2 * k)}L${f1(x + 2 * k)} ${f1(yg - 3.2 * k)}Z`);
    add('plaza-borde', `M${f1(x + 2 * k)} ${f1(yg - 3.2 * k)}L${f1(x + w - 1 * k)} ${f1(yg - 3.2 * k)}`);
    for (const fx of [x + 3.6 * k, x + w - 1 * k]) faroles.push([fx, yg - 0.6 * k, k]); // (36) el de la esquina, tras el perro
    return { cx: x + w * 0.42, w, k, alto: Math.min(1, alto / 36) };
  };
  // ---- dibujar, de atrás adelante
  dest = B;
  for (const a of atras) casa(a.x, a.y, a.s, a.i, 1);
  // El muro de la terraza: piedra baja bajo la fila de atrás (su pie asoma entre los tejados de delante).
  if (atras.length) {
    const ya = atras[0].y, xa = atras[0].x - 3 * u, xb = Math.max(...atras.map((a) => a.x + (CASAS[a.i][0] + CASAS[a.i][2] * 0.62) * u * a.s)) + 3 * u;
    add('terraza', poli([[xa, ya - 0.2 * u], [xb, ya - 0.2 * u], [xb + 1.2 * u, ya + 1.6 * u], [xa - 1.2 * u, ya + 1.6 * u]]));
  }
  dest = A;
  let pz = null, cruzMayo = ''; // (34) la cruz del Día de la Cruz
  const altos = [];
  for (const p of piezas) {
    if (p.tipo === 'iglesia') iglesia(p.x, p.s);
    else if (p.tipo === 'plaza') pz = plaza(p.x, p.s, p.alto);
    else { const r = casa(p.x, yg, p.s, p.i, 0); altos.push(r); if (altos.length % 2 === 0 && altos.length < 6) { const [a, b] = [altos[altos.length - 2], r]; cordeles.push([a.alero[1], b.alero[0]]); } }
  }
  // Las ventanas: tantas encendidas como personas con cuenta, empezando por las del frente; las demás, oscuras.
  let vent = Math.max(0, ventanas);
  for (const { q } of sitiosVentana) {
    if (vent > 0) { add('luz', poli(q)); add('halo', `M${P([(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2])}h0.01`); vent--; } else add('ventana', poli(q));
  }
  // Los faroles de la plaza: poste, brazo y la lámpara (de noche, con su luz).
  for (const [fx, fy, k] of faroles) {
    add('sombra', elipse(fx - sol * 0.5 * k, fy + 0.3 * k, 1.6 * k, 0.45 * k)); // (pulido) su pie, asentado
    charcos.push([fx, fy + 0.6 * k, 9 * k]);
    add('farol-poste', `M${f1(fx)} ${f1(fy)}L${f1(fx)} ${f1(fy - 10.5 * k)}`);
    add('farol-lampara', poli([[fx - 1.1 * k, fy - 10.4 * k], [fx + 1.1 * k, fy - 10.4 * k], [fx + 0.8 * k, fy - 12.4 * k], [fx - 0.8 * k, fy - 12.4 * k]]));
    add('farol-luz', punto([fx, fy - 11.4 * k]));
  }
  if (faroles.length >= 2) cordeles.push([[faroles[0][0], faroles[0][1] - 10 * faroles[0][2]], [faroles[1][0], faroles[1][1] - 10 * faroles[1][2]]]);
  if (cordelTorre && faroles.length) { const [fx, fy, fk] = faroles.at(-1); cordeles.unshift([cordelTorre, [fx, fy - 10 * fk]]); }
  // Los cordeles: una catenaria entre sus dos puntos; en Navidad, foquitos de tres colores; en las fiestas, banderitas.
  const rnd = azar(61);
  const foco = ['', '', ''], bandera = ['', '', ''];
  let cuerda = '';
  for (const [[ax, ay], [bx, by]] of cordeles) {
    const L = Math.hypot(bx - ax, by - ay), cae = Math.min(10 * u, L * 0.16), mx = (ax + bx) / 2, my = (ay + by) / 2 + cae;
    cuerda += `M${P([ax, ay])}Q${P([mx, my + cae])} ${P([bx, by])}`;
    const n = Math.max(3, Math.round(L / (3.4 * u)));
    for (let j = 1; j < n; j++) {
      const t = j / n, x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * mx + t * t * bx, y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * (my + cae) + t * t * by;
      foco[j % 3] += punto([x, y + 0.6 * u]);
      if (j % 2) bandera[(j >> 1) % 3] += poli([[x - 1.1 * u, y], [x + 1.1 * u, y], [x, y + 2.4 * u]]);
    }
    rnd();
  }
  // (Campamento 35) La gente del pueblo son los vecinos osos (`vecinos`, de arte-vecinos.js): ya no hay siluetas.
  // Animales quietos: un perro echado y tres gallinas. (Campamento 35) El perro, de perfil y con la cabeza alzada (el hocico, la oreja,
  // las patas de delante estiradas y la cola), para que se lea como perro y no como una mancha. (Pulido del paisaje bajo) El perro se
  // echa en la esquina de la plaza, junto a la grada del atrio (en Navidad quedaba metido en el nacimiento), y las gallinas picotean
  // donde estaba él, al otro lado de los oseznos (entre ellos parecían coletas; en diciembre, junto al portal). (36) El farol de esa
  // esquina va un poco más adentro, detrás del perro, para que su poste no le atraviese la cabeza y quepan los vecinos del atrio.
  if (pz) {
    const k = pz.k, x = pz.cx - pz.w * 0.42 - 1.8 * k, y = yg + 1.6 * k, kd = K_PERRO * k;
    add('animal', `M${PERRO.map(([px, py]) => P([x + px * kd, y + py * kd])).join('L')}Z`);
    add('perro-sombra', elipse(x + 2.4 * kd - sol * 0.6 * k, y + 0.2 * k, 3.4 * kd, 0.5 * kd)); // (40) aparte: se esconde con él cuando se va a otro sitio
    for (const [gx, gy] of [[0.4, 0.8], [2.2, 1.4], [4.0, 0.6]]) {
      const cx = pz.cx + pz.w * 0.36 + gx * k, cy = yg + gy * k;
      add('gallina', `M${P([cx - 1 * k, cy])}q${f1(0.2 * k)} ${f1(-1.6 * k)} ${f1(1.4 * k)} ${f1(-1.5 * k)}l${f1(0.5 * k)} ${f1(-0.7 * k)}l${f1(0.3 * k)} ${f1(0.7 * k)}q${f1(0.2 * k)} ${f1(1.2 * k)} ${f1(-1.2 * k)} ${f1(1.5 * k)}Z`);
    }
  }
  // (Campamento 34) El Día de la Cruz (3 de mayo): en la plaza, una cruz de palo adornada con frutas (jocotes y mangos) y una cadena
  // de papel de colores, como se hace aquí para recibir las lluvias. Su palo queda a la izquierda del perro echado (los brazos y las
  // frutas, por encima de él) y la gente de la plaza se para delante. Se dibuja siempre y montana.js la poda los demás días.
  if (pz) {
    const k = pz.k, x = pz.cx - pz.w * 0.42 - 3.4 * k, y = yg + 1.6 * k, P2 = (dx, dy) => P([x + dx * k, y + dy * k]);
    const palo = `M${P2(-0.35, 0)}L${P2(0.35, 0)}L${P2(0.35, -9)}L${P2(-0.35, -9)}ZM${P2(-2.8, -6.6)}L${P2(2.8, -6.6)}L${P2(2.8, -5.9)}L${P2(-2.8, -5.9)}Z`;
    const fruta = (fx, fy, r) => `M${P2(fx - r, fy)}a${f1(r * k)} ${f1(r * k)} 0 1 0 ${f1(2 * r * k)} 0a${f1(r * k)} ${f1(r * k)} 0 1 0 ${f1(-2 * r * k)} 0`;
    const jocotes = [[-2.4, -5.3], [2.4, -5.3], [0, -9.4]].map(([fx, fy]) => fruta(fx, fy, 0.55)).join('');
    const mangos = [[-1.2, -5.4], [1.2, -5.4], [0.7, -3.6]].map(([fx, fy]) => fruta(fx, fy, 0.6)).join('');
    const cadena = `M${P2(-2.8, -6.3)}L${P2(-2, -4.6)}L${P2(-1.2, -6.2)}L${P2(-0.4, -4.6)}L${P2(0.4, -6.2)}L${P2(1.2, -4.6)}L${P2(2, -6.2)}L${P2(2.8, -4.6)}`;
    cruzMayo = `<g class="v-cruz-mayo"><path class="v-cm-palo" d="${palo}"/><path class="v-cm-cadena" d="${cadena}" stroke-width="${f1(0.5 * u)}"/><path class="v-cm-jocote" d="${jocotes}"/><path class="v-cm-mango" d="${mangos}"/></g>`;
  }
  // Fiestas patrias (13 al 15 de septiembre): la bandera azul y blanca en su asta, en la plaza.
  let patrias = '';
  if (pz) {
    const k = pz.k, ax = pz.cx + pz.w * 0.5, ay = yg - 0.4 * k, top = ay - Math.min(24, 34 * pz.alto) * k, fw = 9 * k, fh = 5.6 * k;
    const franja = (i) => `M${P([ax, top + (fh / 3) * i])}C${P([ax + fw * 0.4, top + (fh / 3) * i - 1 * k])} ${P([ax + fw * 0.6, top + (fh / 3) * i + 1 * k])} ${P([ax + fw, top + (fh / 3) * i])}L${P([ax + fw, top + (fh / 3) * (i + 1)])}C${P([ax + fw * 0.6, top + (fh / 3) * (i + 1) + 1 * k])} ${P([ax + fw * 0.4, top + (fh / 3) * (i + 1) - 1 * k])} ${P([ax, top + (fh / 3) * (i + 1)])}Z`;
    patrias = `<path class="v-patrias v-asta" d="M${P([ax, ay])}L${P([ax, top - 1.2 * k])}" stroke-width="${f1(0.6 * k)}"/><path class="v-patrias v-bandera-azul" d="${franja(0)}${franja(2)}"/><path class="v-patrias v-bandera-blanca" d="${franja(1)}"/>`;
  }
  // El pino de Navidad de la plaza y el portal del nacimiento (solo en Navidad; el CSS lo enseña).
  let navidad = '';
  if (pz) navidad = pinoPlaza(pz.cx, yg - 0.6 * pz.k, pz.k * 1.05 * pz.alto) + portal(pz.cx + pz.w * 0.62, yg + 0.4 * pz.k, pz.k * 0.9, sol);
  // El árbol de la plaza, un maquilishuat (en febrero, todo rosado); en Navidad deja su sitio al pino.
  // (Pulido) La sombra del árbol de la plaza (o del pino) en el suelo, como la de las casas.
  if (pz) add('sombra', elipse(pz.cx - sol * 1.5 * pz.k, yg - 0.2 * pz.k, 5.2 * pz.k, 0.9 * pz.k));
  const mango = pz ? (() => { const k = pz.k, c = facetas(pz.cx, yg - 12 * k, 8.4 * k, 6.2 * k, [1, 0.93, 1.05, 0.96, 1.02, 0.91, 1.04], sol, 0.3, undefined, 0.55); return `<path class="v-flores v-flores-maqui v-sin-navidad" d="M${f1(pz.cx - 9 * k)} ${f1(yg + 0.4 * k)}Q${f1(pz.cx)} ${f1(yg - 1.4 * k)} ${f1(pz.cx + 9 * k)} ${f1(yg + 0.4 * k)}Q${f1(pz.cx)} ${f1(yg + 1.8 * k)} ${f1(pz.cx - 9 * k)} ${f1(yg + 0.4 * k)}Z"/><path class="v-pz-tronco v-sin-navidad" d="${poli([[pz.cx - 0.9 * k, yg - 0.6 * k], [pz.cx + 0.9 * k, yg - 0.6 * k], [pz.cx + 0.6 * k, yg - 8 * k], [pz.cx - 0.6 * k, yg - 8 * k]])}"/><path class="copa v-maqui v-sin-navidad" d="${c.base}"/><path class="copa-media v-maqui v-sin-navidad" d="${c.media}"/><path class="copa-luz v-maqui v-sin-navidad" d="${c.luz}"/><path class="copa-sombra v-maqui v-sin-navidad" d="${c.sombra}"/>`; })() : '';
  // El humo del fogón (ambiente, a sus horas): tres bocanadas a destiempo de la primera cocina.
  const humo = humos.slice(0, sit.forma === 'esc' ? 2 : 1).map(([hx, hy], i) => [0, 1, 2].map((j) => `<circle class="efecto-ambiente v-humos v-hu v-hu-${j}${i ? ' v-hu-b' : ''}" cx="${f1(hx)}" cy="${f1(hy)}" r="${f1((1.4 + j * 0.45) * u)}"/>`).join('')).join('');
  const sw = (n) => ` stroke-width="${f1(n * u)}"`;
  const p = (clase, k, extra = '', X = A) => (X[k] ? `<path class="${clase}" d="${X[k]}"${extra}/>` : '');
  const frentes = COLORES.map((c) => p(`v-frente v-c-${c}`, `frente-${c}`)).join('') + COLORES.map((c) => p(`v-pared-l v-c-${c}`, `lado-${c}`)).join('');
  // La fila de atrás, entera y en su orden (sombra, muro de la terraza, paredes, tejados, puertas y ventanas), antes que la iglesia.
  const filaAtras = p('v-sombra v-sombra-atras', 'sombra', '', B) + p('v-terraza', 'terraza', '', B) + COLORES.map((c) => p(`v-frente v-c-${c}`, `frente-${c}`, '', B)).join('') + COLORES.map((c) => p(`v-pared-l v-c-${c}`, `lado-${c}`, '', B)).join('')
    + p('v-alero', 'alero', '', B) + p('v-techo-l', 'techo-l', '', B) + p('v-techo-s', 'techo-s', '', B) + p('v-teja', 'teja', sw(0.6), B) + p('v-poste', 'poste', sw(0.55), B) + p('v-puerta', 'puerta', '', B) + p('v-ventana v-ventana-atras', 'ventana', '', B);
  // Los árboles de aquí, detrás de las casas (campamento 22B, idea 56, ahora en el pueblo): un maquilishuat junto a la iglesia (en
  // febrero, todo rosado) y un árbol de fuego al final de la calle (en abril, rojo). Con sus flores caídas cuando florecen.
  const arbolito = (sp, x, y, r) => {
    const fuego = sp === 'fuego', rx = r * (fuego ? 1.3 : 1), ry = r * (fuego ? 0.66 : 0.86), cy = y - r * (fuego ? 1.02 : 1.25), tw = r * 0.11;
    let tronco = poli([[x - tw, y], [x + tw, y], [x + tw * 0.7, cy + ry * 0.4], [x - tw * 0.7, cy + ry * 0.4]]);
    if (fuego) tronco += poli([[x - tw * 0.5, cy + ry * 0.9], [x - rx * 0.42, cy + ry * 0.2], [x - rx * 0.36, cy + ry * 0.05], [x, cy + ry * 0.62], [x + rx * 0.4, cy + ry * 0.08], [x + rx * 0.46, cy + ry * 0.24], [x + tw * 0.5, cy + ry * 0.9]]);
    const c = facetas(x, cy, rx, ry, fuego ? [1, 0.9, 1.06, 0.95, 1.03, 0.92, 1.05, 0.97] : [1, 0.92, 1.05, 0.96, 1.02, 0.9, 1.04], sol, fuego ? 0.1 : 0.2, undefined, fuego ? 0.5 : 0.62);
    const fx = x - sol * rx * 0.12, fr = rx * 0.95, fy = y + 0.5 * u;
    return `<path class="v-flores v-flores-${sp}" d="M${f1(fx - fr)} ${f1(fy)}Q${f1(fx)} ${f1(fy - 1.6 * u)} ${f1(fx + fr)} ${f1(fy)}Q${f1(fx)} ${f1(fy + 1.6 * u)} ${f1(fx - fr)} ${f1(fy)}Z"/><path class="v-ar-tronco" d="${tronco}"/>`
      + `<path class="copa v-${sp}" d="${c.base}"/><path class="copa-media v-${sp}" d="${c.media}"/><path class="copa-luz v-${sp}" d="${c.luz}"/><path class="copa-sombra v-${sp}" d="${c.sombra}"/>`;
  };
  // (Pulido del pueblo) Si el árbol del primer día está en ese sitio, el de fuego no se pone: sus dos troncos juntos se leían como una persona.
  const xFuego = Math.min(sit.xFin + 7 * u, (sit.xMaxArbol ?? Infinity)), rFuego = 6.6 * u * 1.3 + 2 * u;
  const fuegoV = evitar && xFuego + rFuego > evitar[0] && xFuego - rFuego < evitar[1] ? '' : arbolito('fuego', xFuego, yg + 0.6 * u, 6.6 * u); // al final de la calle, a la vista
  if (fuegoV) add('sombra', elipse(xFuego - sol * 1.6 * u, yg + 0.9 * u, 6 * u, 1.1 * u));
  // Los charcos de luz: dos trazos (el halo ancho y el centro), sin degradados (más baratos de pintar que una elipse con degradado cada uno).
  const luzSuelo = `<path class="v-charco" d="${charcos.map(([x, y, r]) => elipse(x, y, r, r * 0.32)).join('')}"/><path class="v-charco v-charco-c" d="${charcos.map(([x, y, r]) => elipse(x, y, r * 0.5, r * 0.16)).join('')}"/>`;
  return `<g class="v-canton v-pueblo" aria-hidden="true">${p('v-calle', 'calle')}${p('v-plaza', 'plaza')}${p('v-plaza-borde', 'plaza-borde', sw(0.5))}${luzSuelo}${p('v-sombra', 'sombra')}${p('v-sombra v-sombra-perro', 'perro-sombra')}${filaAtras}`
    + `${p('v-ig-lado', 'ig-lado')}${p('v-ig-frente', 'ig-frente')}${p('v-ig-torre', 'ig-torre')}${p('v-ig-relieve', 'ig-relieve')}${p('v-ig-torre-s', 'ig-torre-s')}${p('v-ig-atrio', 'ig-atrio')}${p('v-ig-atrio-s', 'ig-atrio-s')}${p('v-ig-cupula', 'ig-cupula')}${p('v-ig-moldura', 'ig-moldura', sw(0.45))}${p('v-ig-cruz', 'ig-cruz', sw(0.55))}`
    + `${frentes}${p('v-alero', 'alero')}${p('v-techo-l', 'techo-l')}${p('v-techo-s', 'techo-s')}${p('v-teja', 'teja', sw(0.6))}${p('v-chimenea', 'chimenea')}${p('v-poste', 'poste', sw(0.55))}`
    + `${p('v-puerta', 'puerta')}${p('v-ig-hueco', 'ig-hueco')}${p('v-ig-portal', 'ig-portal')}${p('v-ig-campana', 'ig-campana')}${p('v-ig-ventana', 'ig-ventana')}<path class="v-ventana" d="${A.ventana ?? ''}"/><path class="v-luz" d="${A.luz ?? ''}"/><path class="v-halo" d="${A.halo ?? ''}"${sw(4.2)}/>`
    + `${mango}${fuegoV}${navidad}`
    + `${p('v-farol-poste', 'farol-poste', sw(0.55))}${p('v-farol-lampara', 'farol-lampara')}${p('v-farol-luz', 'farol-luz', sw(3.4))}`
    + `<path class="v-cordel" d="${cuerda}"${sw(0.3)}/>${foco.map((d, j) => `<path class="v-navidad v-foco v-foco-${j}" d="${d}"${sw(1.15)}/>`).join('')}${bandera.map((d, j) => `<path class="v-fiesta v-band v-band-${j}" d="${d}"/>`).join('')}`
    + `${patrias}${cruzMayo}<g class="v-vecinos">${vecinos}</g>${p('v-animal', 'animal')}${p('v-gallina', 'gallina')}${humo}</g>`;
}

/** El pino de Navidad de la plaza: cuatro pisos en sombra y luz, una guirnalda dorada, esferas y foquitos de tres colores. Sin estrella. */
export function pinoPlaza(x, y, k) {
  const pisos = [[0, 12, 9.2], [8, 10.4, 7.6], [15, 9, 6], [21, 7.4, 4.2]]; // [desde, alto, medio ancho]
  let sombra = '', luz = '', guirnalda = '';
  const focos = ['', '', ''], esferas = ['', ''];
  let j = 0;
  for (const [y0, h, w] of pisos) {
    const base = y - (3 + y0) * k, cima = base - h * k;
    sombra += poli([[x, cima], [x - w * k, base], [x - w * 0.15 * k, base + 1.2 * k], [x, base + 0.6 * k]]);
    luz += poli([[x, cima], [x + w * k, base], [x + w * 0.2 * k, base + 1.2 * k], [x, base + 0.6 * k]]);
    // La guirnalda: una curva que cruza el piso de un lado al otro.
    guirnalda += `M${P([x - w * 0.82 * k, base - 0.6 * k])}Q${P([x, base + 1.8 * k - h * 0.25 * k])} ${P([x + w * 0.7 * k, base - h * 0.42 * k])}`;
    for (let t = 0.18; t < 0.95; t += 0.16) {
      const yy = cima + h * k * t, ww = w * k * t * 0.85;
      focos[j % 3] += punto([x + (j % 2 ? ww : -ww) * (0.3 + 0.6 * ((j * 0.37) % 1)), yy]);
      if (j % 4 === 1) esferas[j % 2] += `M${P([x + (j % 3 - 1) * ww * 0.55, yy + 0.8 * k])}a${f1(0.85 * k)} ${f1(0.85 * k)} 0 1 0 ${f1(1.7 * k)} 0a${f1(0.85 * k)} ${f1(0.85 * k)} 0 1 0 ${f1(-1.7 * k)} 0Z`;
      j++;
    }
  }
  const nav = 'v-navidad v-pino-nav';
  return `<path class="${nav} v-pn-tronco" d="${poli([[x - 1.2 * k, y], [x + 1.2 * k, y], [x + 0.9 * k, y - 3.6 * k], [x - 0.9 * k, y - 3.6 * k]])}"/>`
    + `<path class="${nav} v-pn" d="${sombra}"/><path class="${nav} v-pn-l" d="${luz}"/><path class="${nav} v-pn-guirnalda" d="${guirnalda}" stroke-width="${f1(0.55 * k)}"/>`
    + `${esferas.map((d, i) => `<path class="${nav} v-pn-esfera v-pe-${i}" d="${d}"/>`).join('')}${focos.map((d, i) => `<path class="${nav} v-pn-foco v-pf-${i}" d="${d}" stroke-width="${f1(1.25 * k)}"/>`).join('')}`
    + `<path class="${nav} v-pn-lazo" d="${poli([[x, y - 31 * k], [x - 1.8 * k, y - 32.2 * k], [x - 1.6 * k, y - 30.4 * k]])}${poli([[x, y - 31 * k], [x + 1.8 * k, y - 32.2 * k], [x + 1.6 * k, y - 30.4 * k]])}"/>`;
}

/**
 * El portal del nacimiento: una champa de palma sobre dos horcones, con la Virgen arrodillada, San José con su vara, el niño en el
 * pesebre (la luz sale de ahí), el buey y el burrito. Siluetas contra su luz cálida; de noche, con su halo.
 */
export function portal(x, y, k, sol = 1) {
  const m = (px, py) => [x + sol * px * k, y + py * k];
  const techo = poli([m(-9.5, -10.4), m(0, -14.6), m(9.5, -10.4), m(8.4, -9.2), m(0, -12.8), m(-8.4, -9.2)]);
  const palma = [-7, -4.5, -2, 0.5, 3, 5.5].map((t) => `M${P(m(t, -12.6 + Math.abs(t) * 0.42))}l${f1(sol * 0.6 * k)} ${f1(2.2 * k)}`).join('');
  const horcones = poli([m(-8.4, 0), m(-7.4, 0), m(-7.6, -9.4), m(-8.2, -9.4)]) + poli([m(7.4, 0), m(8.4, 0), m(8.2, -9.4), m(7.6, -9.4)]);
  const fondo = poli([m(-7.4, 0), m(7.4, 0), m(7.4, -9.2), m(0, -12.4), m(-7.4, -9.2)]);
  const cabeza = (cx, cy, r) => `M${P(m(cx - r, cy))}a${f1(r * k)} ${f1(r * k)} 0 1 0 ${f1(2 * r * k * sol)} 0a${f1(r * k)} ${f1(r * k)} 0 1 0 ${f1(-2 * r * k * sol)} 0Z`;
  const figuras = poli([m(-5.4, 0), m(-2.2, 0), m(-2.6, -2.6), m(-3.4, -4.2), m(-4.4, -4.2), m(-5.2, -2.6)]) + cabeza(-3.9, -4.9, 0.8) // la Virgen, arrodillada
    + poli([m(2.4, 0), m(5, 0), m(4.6, -5.6), m(3, -5.6)]) + cabeza(3.8, -6.4, 0.8) + `M${P(m(5.6, 0))}L${P(m(5.9, -7.6))}` // San José y su vara
    + poli([m(-1.6, 0), m(1.6, 0), m(1.2, -1.6), m(-1.2, -1.6)]) // el pesebre
    + poli([m(-7, -0.2), m(-6.8, -3.4), m(-8.6, -4.2), m(-9.2, -3), m(-8.2, -2.6), m(-8, -0.2)]) // el buey (asoma la cabeza)
    + poli([m(7, -0.2), m(7.2, -2.8), m(8.2, -4.8), m(8.8, -4.6), m(8.4, -3), m(9, -2.4), m(8.2, -0.2)]); // el burrito
  const nino = `M${P(m(-0.9, -1.7))}h${f1(sol * 1.8 * k)}`;
  return `<circle class="v-navidad v-belen-halo" cx="${f1(x)}" cy="${f1(y - 4 * k)}" r="${f1(15 * k)}" fill="url(#m-farol)"/>`
    + `<path class="v-navidad v-belen-fondo" d="${fondo}"/><path class="v-navidad v-belen-horcon" d="${horcones}"/><path class="v-navidad v-belen-figuras" d="${figuras}"/>`
    + `<path class="v-navidad v-belen-nino" d="${nino}" stroke-width="${f1(1.1 * k)}"/><path class="v-navidad v-belen-techo" d="${techo}"/><path class="v-navidad v-belen-palma" d="${palma}" stroke-width="${f1(0.4 * k)}"/>`;
}

/**
 * El llano del valle: el suelo donde viven el pueblo y el lago, delante del pie de la montaña. En el teléfono y la tablet es la franja
 * de abajo (de la salida al borde); en escritorio y acostado, una loma suave a la izquierda de la salida. Con su degradado (luz arriba,
 * más hondo abajo) y un filo de luz en su borde. El color de la época (verde o dorado) lo pone el CSS.
 */
function tramosLlano({ W, H, forma, by, bx }) {
  const lado = forma === 'esc' || forma === 'acostado';
  const top = lado ? Math.min(by - 4, H * (forma === 'esc' ? 0.71 : 0.74)) : by + 8;
  // Curvas cuadráticas [inicio, control, fin] del borde, de izquierda a derecha.
  return lado ? [[[-10, top], [bx * 0.55, top - 10], [bx + 30, by + 8]], [[bx + 30, by + 8], [bx + 120, by + 16], [W + 10, by + 22]]] : [[[-10, top + 6], [W * 0.42, top - 8], [W + 10, top + 4]]];
}
/** El borde del llano como polilínea (cada 6 px): lo usan el bosque, que crece en él, y el primer plano. */
export function bordeLlano(geo) {
  const out = [];
  for (const [a, c, b] of tramosLlano(geo)) {
    for (let t = 0; t <= 1; t += 1 / 40) { const v = 1 - t; out.push([v * v * a[0] + 2 * v * t * c[0] + t * t * b[0], v * v * a[1] + 2 * v * t * c[1] + t * t * b[1]]); }
  }
  return out;
}
/** La y del borde del llano en una x. */
export function enBorde(borde, x) {
  if (x <= borde[0][0]) return borde[0][1];
  for (let i = 1; i < borde.length; i++) if (x <= borde[i][0]) { const [x0, y0] = borde[i - 1], [x1, y1] = borde[i]; return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-6, x1 - x0); }
  return borde[borde.length - 1][1];
}
export function llano(geo) {
  const { W, H } = geo, tr = tramosLlano(geo), top = Math.min(...tr.map((q) => Math.min(q[0][1], q[1][1], q[2][1])));
  const borde = `M${P(tr[0][0])}${tr.map(([, c, b]) => `Q${P(c)} ${P(b)}`).join('')}`;
  return `<g class="v-llano-g" aria-hidden="true"><linearGradient id="m-v-llano" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(top)}" x2="0" y2="${f1(H)}"><stop offset="0" class="vll-0"/><stop offset="0.5" class="vll-1"/><stop offset="1" class="vll-2"/></linearGradient>`
    + `<path class="v-llano" d="${borde}L${f1(W + 10)} ${f1(H + 10)}L-10 ${f1(H + 10)}Z" fill="url(#m-v-llano)"/><path class="v-llano-filo" d="${borde}"/></g>`;
}

/**
 * Los campos del llano: parcelas en perspectiva (verde tierno, verde hondo y la del color de la época), separadas por setos de matas,
 * entre el bosque del pie de la montaña y el pueblo. Una de ellas es la milpa (devuelve su sitio). De `x0` a `x1`.
 */
export function campos({ borde, yAbajo, x0 = -6, x1, k = 1, vx, evitar = null, ancho = Infinity, techoPueblo = -Infinity, lago = null }) {
  const rnd = azar(83);
  const tono = ['', '', '', ''];
  let surco = '', copa = '', copaL = '', tronco = '', loma = '';
  // Franjas que siguen el terreno (lomas suaves): cada franja ondula a su ritmo; entre una y otra, una hilera de árboles.
  const fr = [0, 0.36, 0.68, 1], fase = [0, 1.7, 3.1, 4.4];
  const yF = (j, x) => { const t = enBorde(borde, x) + 4 * k; return t + (yAbajo - t) * fr[j] + (j && j < 3 ? Math.sin(x / (70 * k) + fase[j]) * 5 * k : 0); };
  const curva = (j, a, b) => { const out = []; for (let x = a; x <= b + 0.1; x += Math.max(6, (b - a) / 5)) out.push([x, yF(j, x)]); return out; };
  const inclina = (x, j) => x + (x - vx) * 0.22 * fr[j];
  let milpa = null, mejor = -1;
  for (let j = 0; j < 3; j++) {
    let a = x0;
    while (a < x1) {
      const b = Math.min(x1 + 8, a + (40 + rnd() * 60) * k);
      const arriba = curva(j, a, b).map(([x, y]) => [inclina(x, j), y]), abajo = curva(j + 1, a, b).map(([x, y]) => [inclina(x, j + 1), y]);
      const t = Math.floor(rnd() * 4);
      tono[t] += poli([...arriba, ...abajo.reverse()]);
      // Surcos: en las parcelas aradas y en las de la época, rayas que siguen la loma.
      if (t >= 2) for (const s of [0.35, 0.7]) surco += `M${curva(j, a + 3 * k, b - 3 * k).map(([x, y]) => P([x + (x - vx) * 0.22 * (fr[j] + (fr[j + 1] - fr[j]) * s), y + (yF(j + 1, x) - y) * s])).join('L')}`;
      // La milpa: la parcela de delante más ancha. (Pulido del paisaje bajo) Con `evitar` (el pueblo, [x0, x1]), primero las de delante
      // que quedan fuera de él y dentro de la pantalla; si no hay, una de la franja de atrás que quede entera por encima de sus tejados
      // (`techoPueblo`, al pie del bosque); si tampoco, no hay milpa en ese tamaño. Detrás de las casas, sus matas salían entre los
      // tejados y bajo la calle parecían una cerca. Solo elige: no gasta azar (los campos se ven igual).
      // El trozo de la parcela donde puede ir: dentro de la pantalla y fuera del pueblo (el mayor de los dos lados); `crudo` deshace la
      // inclinación de la franja para medir su alto en ese trozo.
      const A = inclina(a, j), B = inclina(b, j), crudo = (X) => (X + vx * 0.22 * fr[j]) / (1 + 0.22 * fr[j]);
      let lados = [[Math.max(A, 2), Math.min(B, ancho - 2)]];
      for (const [e0, e1] of evitar ? (Array.isArray(evitar[0]) ? evitar : [evitar]) : []) lados = lados.flatMap(([s0, s1]) => [[s0, Math.min(s1, e0)], [Math.max(s0, e1), s1]]).filter(([s0, s1]) => s1 > s0);
      const [sa, sb] = evitar ? lados.reduce((u, s) => (s[1] - s[0] > u[1] - u[0] ? s : u), [0, 0]) : [A, B];
      const ra = crudo(sa), rb = crudo(sb), ya = Math.max(yF(j, ra), yF(j, rb)), yb = Math.min(yF(j + 1, ra), yF(j + 1, rb));
      // Ni en el lago: sus matas (unas 11 unidades de alto) no pueden subir hasta el agua.
      const enLago = (x0l, x1l) => lago && x0l < lago[2] + 4 && x1l > lago[0] - 4 && ya - 11 * k < lago[3] + 2 && yb > lago[1];
      const ancha = sb - sa >= 26 * k;
      // Primero un trozo fuera del pueblo (mejor delante); si no, la parcela entera de atrás que quede por encima de sus tejados.
      const sobre = evitar && j === 0 && Math.max(yF(1, a), yF(1, b)) < techoPueblo && A >= 2 && B <= ancho - 2 && !enLago(A, B);
      const valor = !evitar ? (j === 2 ? b - a : -1) : ancha && !enLago(sa, sb) ? (sb - sa) + [1e4, 2e4, 3e4][j] : sobre ? (B - A) + 5e3 : -1;
      if (valor > mejor) {
        mejor = valor;
        const [x0m, x1m] = !evitar || !(ancha && !enLago(sa, sb)) ? [A, B] : [sa, sb], y0m = Math.max(yF(j, crudo(x0m)), yF(j, crudo(x1m))), y1m = Math.min(yF(j + 1, crudo(x0m)), yF(j + 1, crudo(x1m)));
        milpa = { x: x0m + 3 * k, y: y0m + 2 * k, w: x1m - x0m - 8 * k, h: Math.max(8 * k, y1m - y0m - 4 * k), caida: 0 };
      }
      a = b;
    }
    // La loma de esta franja: un filo de luz en su borde de arriba.
    if (j) loma += `M${curva(j, x0, x1).map(([x, y]) => P([inclina(x, j), y])).join('L')}`;
    // La hilera de árboles del lindero (redondos, con su lado de luz).
    if (j) {
      for (let x = x0 + rnd() * 20 * k; x < x1; x += (11 + rnd() * 16) * k) {
        if (rnd() < 0.3) continue;
        const cx = inclina(x, j), cy = yF(j, x) - 1 * k, r = (3 + rnd() * 1.8) * k * (0.8 + fr[j] * 0.35);
        tronco += `M${P([cx, cy])}l0 ${f1(r * 1.1)}`;
        copa += `M${P([cx - r, cy])}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;
        copaL += `M${P([cx - r * 0.1, cy - r * 0.95])}a${f1(r)} ${f1(r)} 0 0 1 ${f1(r * 1.05)} ${f1(r * 0.98)}a${f1(r * 0.7)} ${f1(r * 0.7)} 0 0 0 ${f1(-r * 1.05)} ${f1(-r * 0.98)}Z`;
      }
    }
  }
  // El mar de niebla del amanecer también llena el valle de delante (campamento 22B, 5:00 a 7:30): dos velos que cubren los campos y
  // dejan asomar el pueblo y las copas. Quieto (paisaje); su opacidad la pone `--v-mar`.
  const velo = (dy, sem) => {
    const r2 = azar(sem); let d = `M${P([x0 - 10, yF(1, x0) + dy])}`;
    for (let x = x0; x <= x1 + 30; x += 26 * k) d += `Q${P([x + 13 * k, yF(1, x) + dy - (4 + r2() * 6) * k])} ${P([x + 26 * k, yF(1, x + 26 * k) + dy])}`;
    return `${d}L${P([x1 + 30, yAbajo - 2 * k])}L${P([x0 - 10, yAbajo - 2 * k])}Z`;
  };
  const svg = tono.map((d, i) => `<path class="v-parc v-parc-${i}" d="${d}"/>`).join('') + `<path class="v-surco" d="${surco}" stroke-width="${f1(0.8 * k)}"/><path class="v-loma-campo" d="${loma}" stroke-width="${f1(1.1 * k)}"/>`
    + `<path class="v-arbolito-tronco" d="${tronco}" stroke-width="${f1(0.9 * k)}"/><path class="v-arbolito" d="${copa}"/><path class="v-arbolito-l" d="${copaL}"/>`
    + `<path class="v-mar v-mar-luz v-mar-valle" d="${velo(-8 * k, 5)}"/><path class="v-mar v-mar-cuerpo v-mar-valle" d="${velo(2 * k, 9)}"/>`;
  return { svg, milpa: evitar && mejor < 0 ? null : milpa };
}

/**
 * La ladera baja de la montaña (antes, una masa casi vacía): claros de pasto, bosquecillos de pinos con su lado de luz y peñas
 * facetadas, todo lejos del sendero y de los campamentos con sus rótulos (`cajas`). Más grande y más denso cuanto más abajo
 * (perspectiva). Va en `#m-v-ladera` (recortado por la silueta), detrás de la nieve, del sendero y de los campamentos. Estático:
 * unos pocos trazos por tono. `L`/`R`: las siluetas izquierda y derecha (ordenadas por y); `pts`: los vértices del sendero.
 */
export function laderaBaja({ W, sy, by, L, R, pts = [], cajas = [], k = 1, sol = 1 }) {
  const rnd = azar(97);
  const xL = (y) => enY(L, y), xR = (y) => Math.min(W + 4, enY(R, y));
  const muestras = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by2] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by2 - ay) / 5));
    for (let j = 0; j <= n; j++) muestras.push([ax + ((bx - ax) * j) / n, ay + ((by2 - ay) * j) / n]);
  }
  const lejos = (x, y, m) => muestras.every(([a, b]) => Math.abs(a - x) > m || Math.abs(b - y) > m || Math.hypot(a - x, b - y) > m) && !cajas.some((c) => x > c[0] - 4 && x < c[2] + 4 && y > c[1] - 4 && y < c[3] + 6);
  const alto = by - sy, y0 = sy + alto * 0.42;
  let claro = '', pinoS = '', pinoL = '', pinoF = '', rocaS = '', rocaL = '', rocaT = '';
  // Claros de pasto: manchas suaves (detrás de todo).
  for (let i = 0; i < 7; i++) {
    const v = 0.5 + rnd() * 0.5, y = sy + alto * v, x = xL(y) + (xR(y) - xL(y)) * (0.08 + rnd() * 0.84), a = (16 + rnd() * 22) * k * (0.6 + v * 0.6), b = a * 0.32;
    claro += `M${f1(x - a)} ${f1(y)}Q${f1(x - a * 0.6)} ${f1(y - b * 1.3)} ${f1(x + a * 0.1)} ${f1(y - b)}Q${f1(x + a * 0.8)} ${f1(y - b * 0.9)} ${f1(x + a)} ${f1(y + b * 0.2)}Q${f1(x)} ${f1(y + b * 1.2)} ${f1(x - a)} ${f1(y)}Z`;
  }
  // Bosquecillos: centros al azar en la mitad de abajo; cada uno, unos pinos alrededor.
  const pinos = [];
  for (let g = 0; g < (W < 700 ? 14 : 20); g++) {
    const v = Math.sqrt(rnd()), y = y0 + (by - y0) * v, x = xL(y) + (xR(y) - xL(y)) * (0.04 + rnd() * 0.92);
    const n = 3 + Math.floor(rnd() * 6);
    for (let j = 0; j < n; j++) {
      const px = x + (rnd() - 0.5) * 30 * k, py = y + (rnd() - 0.5) * 9 * k, t = Math.max(0, Math.min(1, (py - y0) / (by - y0)));
      const h = (5 + 9 * t) * k * (0.75 + rnd() * 0.5);
      if (px < xL(py) + 3 || px > xR(py) - 3 || !lejos(px, py - h * 0.5, 7 + h * 0.6)) continue;
      pinos.push([px, py, h]);
    }
  }
  pinos.sort((a, b) => a[1] - b[1]);
  for (const [x, y, h] of pinos) {
    const w = h * 0.34;
    pinoS += poli([[x, y - h], [x - w, y], [x, y + 0.6]]);
    pinoL += poli([[x, y - h], [x + w, y], [x, y + 0.6]].map(([px, py]) => [x + (px - x) * sol, py]));
    if (h > 11 * k) pinoF += poli([[x, y - h * 1.02], [x - w * 0.7, y - h * 0.32], [x + w * 0.7, y - h * 0.32]]);
  }
  // Peñas facetadas: la cara al astro, la de sombra y su techo.
  for (let i = 0; i < 9; i++) {
    const v = 0.3 + rnd() * 0.6, y = sy + alto * v, x = xL(y) + (xR(y) - xL(y)) * (0.06 + rnd() * 0.88), a = (5 + rnd() * 6) * k * (0.7 + v * 0.5), h = a * (0.7 + rnd() * 0.5);
    if (!lejos(x, y - h / 2, 10 + a)) continue;
    const top = [x + (rnd() - 0.5) * a * 0.4, y - h];
    rocaS += poli([[x - a, y], top, [x + a * 0.15, y - h * 0.35], [x + a * 0.1, y + 0.5]].map(([px, py]) => [x + (px - x) * sol, py]));
    rocaL += poli([top, [x + a, y], [x + a * 0.1, y + 0.5], [x + a * 0.15, y - h * 0.35]].map(([px, py]) => [x + (px - x) * sol, py]));
    rocaT += poli([top, [x + a * 0.55, y - h * 0.55], [x + a * 0.15, y - h * 0.35]].map(([px, py]) => [x + (px - x) * sol, py]));
  }
  return `<path class="lb-claro" d="${claro}"/><path class="lb-roca-s" d="${rocaS}"/><path class="lb-roca-l" d="${rocaL}"/><path class="lb-roca-t" d="${rocaT}"/>`
    + `<path class="lb-pino-s" d="${pinoS}"/><path class="lb-pino-l" d="${pinoL}"/><path class="lb-pino-f" d="${pinoF}"/>`;
}
/** La x de una polilínea (ordenada por y) a esa altura. */
function enY(pts, y) {
  if (!pts.length) return 0;
  if (y <= pts[0][1]) return pts[0][0];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x0 + ((x1 - x0) * (y - y0)) / Math.max(1e-6, y1 - y0); }
  return pts[pts.length - 1][0];
}

/**
 * El primer plano (lo más cerca de quien mira): matas, magueyes, zacate y, en las orillas, árboles altos que enmarcan la escena. Más
 * oscuro y más saturado que el valle (es lo más cercano). Delante del pueblo y del lago queda bajo (solo zacate y alguna mata): se
 * ve todo. `sitios`: las x de los pinos de adorno de antes (siguen gastando el `rnd()` de la montaña); `huecos`: [xa, xb] donde va bajo.
 */
export function primerPlano({ W, H, sitios = [], huecos = [], k = 1, forma = 'tel' }) {
  const rnd = azar(71);
  const enHueco = (x, m = 0) => huecos.some(([a, b]) => x > a - m && x < b + m);
  let zacate = '', zacateL = '', mata = '', mataL = '', arbol = '', arbolL = '', maguey = '', flor = '', pascua = '', pascuaC = '';
  // El zacate: matojos a lo largo de todo el borde.
  for (let x = -4; x < W + 6; x += (4.5 + rnd() * 5) * k) {
    const y = H + 1 - rnd() * 3 * k, h = (enHueco(x) ? 3.5 : 6) * k * (0.7 + rnd() * 0.7);
    const d = `M${f1(x - 2 * k)} ${f1(y)}L${f1(x - 1.2 * k)} ${f1(y - h * 0.7)}L${f1(x - 0.4 * k)} ${f1(y - 1.5 * k)}L${f1(x + 0.3 * k)} ${f1(y - h)}L${f1(x + 1 * k)} ${f1(y - 1.4 * k)}L${f1(x + 1.9 * k)} ${f1(y - h * 0.6)}L${f1(x + 2.3 * k)} ${f1(y)}Z`;
    if (rnd() < 0.35) zacateL += d; else zacate += d;
  }
  // Matas redondas y magueyes donde no estorban; árboles altos solo en las orillas (lejos de los huecos).
  for (const x of sitios) {
    const r = rnd(), y = H + 2 - rnd() * 4 * k;
    const bajo = enHueco(x, 8 * k) ? 0.5 : 1; // delante del pueblo y del lago, solo matas bajas (se ve todo)
    if (bajo < 1 && r >= 0.5) { if (r < 0.75) flor += `M${P([x, y - 3 * k])}h0.01`; continue; }
    if (r < 0.5) {
      const a = (7 + rnd() * 7) * k * bajo, b = a * (0.55 + rnd() * 0.2);
      mata += `M${f1(x - a)} ${f1(y)}Q${f1(x - a * 1.05)} ${f1(y - b * 1.2)} ${f1(x - a * 0.25)} ${f1(y - b * 1.35)}Q${f1(x + a * 0.2)} ${f1(y - b * 2)} ${f1(x + a * 0.7)} ${f1(y - b * 1.25)}Q${f1(x + a * 1.1)} ${f1(y - b * 0.9)} ${f1(x + a)} ${f1(y)}Z`;
      mataL += `M${f1(x - a * 0.1)} ${f1(y - b * 1.15)}Q${f1(x + a * 0.25)} ${f1(y - b * 1.85)} ${f1(x + a * 0.68)} ${f1(y - b * 1.2)}Q${f1(x + a * 0.8)} ${f1(y - b * 0.9)} ${f1(x + a * 0.45)} ${f1(y - b * 0.85)}Z`;
      if (rnd() < 0.5) flor += `M${P([x - a * 0.4, y - b * 1.1])}h0.01M${P([x + a * 0.3, y - b * 1.5])}h0.01`;
      // En Navidad las matas son flor de pascua: estrellas de brácteas rojas con su centro dorado.
      // (Una estrella de seis puntas por flor: un solo polígono, pocos segmentos.)
      for (const [fx, fy, fr] of [[x - a * 0.3, y - b * 1.3, 3], [x + a * 0.32, y - b * 1.5, 3.3]]) {
        const rr = fr * k;
        pascua += poli(Array.from({ length: 12 }, (_, j) => { const t = (j / 12) * Math.PI * 2 + fx, q = j % 2 ? 0.42 : 1; return [fx + Math.cos(t) * rr * q, fy + Math.sin(t) * rr * q]; }));
        pascuaC += `M${P([fx, fy])}h0.01`;
      }
    } else if (r < 0.72) {
      // Un maguey: hojas largas en abanico.
      const h = (9 + rnd() * 6) * k;
      for (const [dx, t] of [[-1, 0.55], [-0.55, 0.85], [0, 1], [0.6, 0.8], [1, 0.5]]) maguey += `M${f1(x - 1.2 * k)} ${f1(y)}Q${f1(x + dx * h * 0.25)} ${f1(y - h * t * 0.6)} ${f1(x + dx * h * 0.5)} ${f1(y - h * t)}Q${f1(x + dx * h * 0.2)} ${f1(y - h * t * 0.4)} ${f1(x + 1.2 * k)} ${f1(y)}Z`;
    } else if (!enHueco(x, 30 * k) && (x < W * (forma === 'esc' ? 0.05 : 0.09) || x > W * (forma === 'esc' ? 0.95 : 0.91))) {
      // Un árbol de la orilla: un pino de tres pisos, alto (enmarca), con su lado de luz.
      const h = (30 + rnd() * 26) * k * (forma === 'esc' ? 1.1 : 1), w = h * 0.3;
      for (const [y0, hh, ww] of [[0.18, 0.5, 1], [0.42, 0.42, 0.8], [0.62, 0.38, 0.58]]) {
        const base = y - h * y0, cima = base - h * hh;
        arbol += poli([[x, cima], [x - w * ww, base], [x + w * ww, base]]);
        arbolL += poli([[x, cima], [x + w * ww, base], [x + w * ww * 0.2, base]]);
      }
      arbol += poli([[x - 1 * k, y], [x + 1 * k, y], [x + 0.8 * k, y - h * 0.2], [x - 0.8 * k, y - h * 0.2]]);
    }
  }
  return `<g class="v-primer" aria-hidden="true"><path class="v-pp-arbol" d="${arbol}"/><path class="v-pp-arbol-l" d="${arbolL}"/><path class="v-pp-mata" d="${mata}"/><path class="v-pp-mata-l" d="${mataL}"/>`
    + `<path class="v-pp-maguey" d="${maguey}"/><path class="v-pp-zacate" d="${zacate}"/><path class="v-pp-zacate-l" d="${zacateL}"/><path class="v-pp-flor v-sin-navidad" d="${flor}" stroke-width="${f1(2 * k)}"/>`
    + `<path class="v-navidad v-pascua" d="${pascua}"/><path class="v-navidad v-pascua-c" d="${pascuaC}" stroke-width="${f1(1.3 * k)}"/></g>`;
}
