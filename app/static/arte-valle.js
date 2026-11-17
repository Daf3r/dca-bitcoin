// Campamento 22 · el valle vivo: lo que hay al pie de la montaña. Funciones puras que devuelven SVG como texto (sin DOM, sin `rnd()` de
// la montaña: lo que necesita azar usa el suyo, con su semilla), en el mismo lenguaje de la escena: planos con luz y sombra, sin
// contornos de dibujo, cada cosa asentada en el suelo. Los colores salen del CSS (bloque «Campamento 22» al final de styles.css), que
// sigue a la hora; lo de temporada se dibuja siempre y el CSS lo enseña cuando toca (`html[data-milpa]`, `[data-navidad]`, …).
// `sitiosValle` decide dónde va cada cosa según el tamaño (en el teléfono, su propia versión: dos ranchos y menos piezas); lo coloca
// montana.js en tres capas: detrás de la montaña (`#m-v-fondo`), sobre su ladera (`#m-v-ladera`) y al pie (`#m-v-pie`).
import { facetas } from './arte.js';

const f1 = (n) => n.toFixed(1);
const P = ([x, y]) => `${f1(x)} ${f1(y)}`;
const poli = (pts) => `M${pts.map(P).join('L')}Z`;
const linea = (pts) => `M${pts.map(P).join('L')}`;
function azar(s) {
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
/** La x de una polilínea (ordenada por y) a esa altura. */
function enY(pts, y) {
  if (!pts.length) return 0;
  if (y <= pts[0][1]) return pts[0][0];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x0 + ((x1 - x0) * (y - y0)) / Math.max(1e-6, y1 - y0); }
  return pts[pts.length - 1][0];
}
/** La y de una cresta (ordenada por x) en esa x. */
function enX(pts, x) {
  if (!pts.length) return 0;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-6, x1 - x0); }
  return pts[pts.length - 1][1];
}
/** Distancia de un punto a una polilínea. */
function distLinea(px, py, pts) {
  let m = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
    m = Math.min(m, Math.hypot(px - ax - t * dx, py - ay - t * dy));
  }
  return m;
}
const cruza = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/** El tamaño de la escena: teléfono, tablet, escritorio o teléfono acostado (las mismas reglas que `composicion` en montana.js). */
export function formaValle(W, H) {
  if (H <= 520 && W >= H * 1.5 && W < 1100) return 'acostado';
  return W < 700 ? 'tel' : W < 1100 ? 'tab' : 'esc';
}

// ------------------------------------------------------------------------------------------------ dónde va cada cosa
/** La cresta de la loma del cantón (de izquierda a derecha); por debajo de ella, la loma tapa lo que haya detrás. */
function crestaLoma({ x, y, k, n }) {
  const span = (RANCHOS[n - 1][0] + ANCHO_RANCHO) * k, xa = x - 26 * k, xb = x + span + 6 * k;
  return [[-30, y + 46 * k], [xa - 44 * k, y + 20 * k], [xa - 10 * k, y + 5 * k], [x + span * 0.35, y - 1.5 * k], [xb, y + 1.5 * k], [xb + 34 * k, y + 13 * k], [xb + 96 * k, y + 44 * k]];
}
// Cada rancho en unidades (u): fachada del hastial de 11 de ancho, paredes de 7, hastial de 5 y un costado de 14 de fondo. El cantón
// son tres ranchos (dos en el teléfono) a distinto fondo y tamaño, más el pino de Navidad.
const RANCHOS = [[0, 0, 1], [27, -3.2, 0.86], [52, 0.8, 0.94]];
const ANCHO_RANCHO = 26;

/**
 * Dónde va cada pieza del valle (sin la ladera, que se coloca después con los campamentos: `sitiosLadera`). Todo en píxeles de la escena.
 * `izq`: la silueta de la montaña por la izquierda; `cresta`: la de la sierra media; `pts`: los vértices del sendero; `lago`: { cx, cy, rx, ry }.
 */
/** La escala de las piezas del valle (en el teléfono, más chicas; en escritorio crecen con la altura de la escena). */
export function escalaValle(W, H) {
  const forma = formaValle(W, H);
  return forma === 'tel' ? Math.max(0.78, Math.min(1, W / 390)) : forma === 'tab' ? 1.05 : forma === 'esc' ? Math.max(1.2, Math.min(1.75, H / 620)) : 0.72;
}
export function sitiosValle({ W, H, techo = 0, izq, der = [], cresta = [], bx, by, pts = [], lago = null, personas = 0, meses = 0, anios = 0, primera = null }) {
  const forma = formaValle(W, H);
  const k = escalaValle(W, H);
  const L = [...izq].sort((a, b) => a[1] - b[1]);
  const xIzq = (y) => enY(L, y);
  const n = forma === 'tel' ? 2 : 3;
  const ancho = (RANCHOS[n - 1][0] + ANCHO_RANCHO) * k + 16 * k; // los ranchos y, a un lado, el pino
  // El cantón va en una loma del valle, a la izquierda de la montaña (detrás de su falda): lo más abajo (más cerca) donde quepa.
  const yBajo = forma === 'tel' ? Math.min(by - 70, H * 0.84) : forma === 'tab' ? by - 66 : forma === 'esc' ? H * 0.83 : H - 44;
  const yAlto = Math.max(techo + 50, H * (forma === 'acostado' ? 0.5 : 0.5));
  let yc = null;
  for (let y = yBajo; y >= yAlto; y -= 3) if (xIzq(y) - 10 * k - 6 >= ancho) { yc = y; break; }
  if (yc === null) yc = yAlto;
  const xFin = Math.min(xIzq(yc) - 10 * k, forma === 'esc' ? xIzq(yc) - 30 * k : Infinity);
  const x0 = Math.max(6 + 16 * k, xFin - (RANCHOS[n - 1][0] + ANCHO_RANCHO) * k);
  const canton = { x: x0, y: yc, k, n, caja: [x0 - 18 * k, yc - 26 * k, x0 + (RANCHOS[n - 1][0] + ANCHO_RANCHO) * k + 4, yc + 4 * k] };
  // La milpa: al lado del cantón si cabe; si no (teléfono), en la loma, por debajo.
  // La milpa: en la ladera de la loma, a la izquierda del cantón (baja con la loma); en el teléfono, debajo de los ranchos.
  const mw = (forma === 'tel' ? 40 : 56) * k, mh = (forma === 'tel' ? 11 : 14) * k;
  let milpa;
  if (forma !== 'tel' && x0 - 24 * k - mw >= 2) milpa = { x: x0 - 24 * k - mw, y: yc + 9 * k, w: mw, h: mh, k, caida: mw * 0.22 };
  else { const y = yc + 9 * k; milpa = { x: Math.max(2, Math.min(x0 - 14 * k, xIzq(y + mh) - 8 - mw)), y, w: mw, h: mh, k, caida: mw * 0.14 }; }
  // El pino de Navidad, al lado del cantón (del lado contrario a la montaña).
  const pino = { x: x0 - 10 * k, y: yc + 2.4 * k, k };
  // El camino real sale del cantón y llega a la marca de salida (en el teléfono, solo el último tramo: el valle mide poco).
  const fin = [bx - 7, by + 1.5];
  const ini = forma === 'tel' ? [-6, by - 20 * k] : [canton.caja[2] - 6 * k, yc + 4 * k];
  const ctrl = forma === 'tel' ? [bx * 0.45, by - 2] : [ini[0] + (fin[0] - ini[0]) * 0.3, fin[1] - 6 * k];
  const camino = { ini, ctrl, fin, k, ancho: [forma === 'tel' ? 4.6 * k : 2.4 * k, (forma === 'tel' ? 7.5 : 6.5) * Math.min(k, 1.3)] };
  // El árbol del primer día, junto a la salida y del lado contrario al sendero (sin tapar la marca ni el camino que sube).
  const derecha = (pts[1]?.[0] ?? bx + 1) < bx; // ¿el sendero sale hacia la izquierda?
  const ra = (forma === 'tel' ? 26 : forma === 'acostado' ? 22 : 34) * k;
  const xa = derecha ? Math.min(W - ra * 0.7, bx + 10 + ra) : Math.max(ra * 0.55, bx - 10 - ra);
  const arbol = primera ? { x: xa, y: by + 3, k, ra, anios } : null;
  // Las luces del valle (de noche): caseríos en la sierra media y en el valle, fuera de la montaña y por debajo del saldo.
  const D = [...der].sort((a, b) => a[1] - b[1]), xDer = (y) => (D.length ? enY(D, y) : Infinity);
  const luces = lucesSitios({ W, H, techo, xIzq, xDer, cresta, n: meses, canton: canton.caja, milpa: [milpa.x - 2, milpa.y - 11 * k, milpa.x + milpa.w + 2, milpa.y + milpa.h + milpa.caida + 2], loma: crestaLoma(canton), k, forma });
  // Las piscuchas: en el cielo del valle, a la izquierda de la montaña, por debajo del saldo y de la cumbre.
  const piscuchas = piscuchasSitios({ W, H, techo, xIzq, n: personas, canton, k, sy: L[0][1] });
  // La vida del lago se coloca con el lago.
  return { forma, k, canton, milpa, pino, camino, arbol, luces, piscuchas, lago, ventanas: Math.max(0, Math.floor(personas) || 0) };
}

function lucesSitios({ W, H, techo, xIzq, xDer, cresta, n, canton, milpa, loma, k, forma }) {
  if (!n) return [];
  const rnd = azar(31), out = [];
  const abajo = forma === 'esc' ? H * 0.86 : H * 0.84;
  // Dos sitios: en la sierra media, a los dos lados de la montaña (capa 0: se mueve con la sierra) y sobre la loma del cantón, que es el
  // valle de cerca (capa 1: se dibuja con la loma). Nunca dentro de la montaña, en el cielo, en el saldo ni en las casas del cantón.
  const fuera = (x, y) => y > techo + 10 && y < abajo && x > 3 && x < W - 3 && (x < xIzq(y) - 4 || x > xDer(y) + 4) && !cruza([x - 2, y - 2, x + 2, y + 2], canton) && !cruza([x - 2, y - 2, x + 2, y + 2], milpa);
  const bajoLoma = (x, y) => x < loma.at(-1)[0] && y > enX(loma, x) - 2;
  const capa = (x, y) => {
    if (!fuera(x, y)) return -1;
    if (bajoLoma(x, y)) return y > enX(loma, x) + 3 && x < xIzq(y) - 4 ? 1 : -1;
    return y > enX(cresta, x) + 3 ? 0 : -1;
  };
  // Primero los centros de cada caserío; después, unas casas alrededor de cada uno.
  for (let intento = 0; out.length < n && intento < 2500; intento++) {
    const cx = rnd() * W, top = Math.max(techo + 10, Math.min(enX(cresta, cx), cx < loma.at(-1)[0] ? enX(loma, cx) : Infinity)), cy = top + 4 + rnd() * Math.max(4, (abajo - top) * 0.7);
    if (capa(cx, cy) < 0) continue;
    const m = 2 + Math.floor(rnd() * 5);
    for (let j = 0; j < m && out.length < n; j++) {
      const x = cx + (rnd() - 0.5) * 18 * k, y = cy + (rnd() - 0.5) * 6 * k, c = capa(x, y);
      if (c >= 0 && out.every(([a, b]) => Math.hypot(a - x, b - y) > 2.4)) out.push([x, y, c]);
    }
  }
  return out;
}

function piscuchasSitios({ W, H, techo, xIzq, n, canton, k, sy }) {
  if (!n) return [];
  const rnd = azar(29), out = [];
  const arriba = Math.max(techo + 28, sy + 34), abajo = Math.min(canton.y - 40 * k, H * 0.7);
  for (let intento = 0; out.length < n && intento < 600; intento++) {
    const y = arriba + rnd() * Math.max(10, abajo - arriba), x = 14 + rnd() * (W - 28);
    if (x > xIzq(y) - 22 * k) continue; // (vuelan por delante de la sierra: más cerca que ella)
    if (out.some(([a, b]) => Math.hypot(a - x, b - y) < 30 * k)) continue;
    out.push([x, y]);
  }
  // El hilo baja al cantón: a una casa, en orden de izquierda a derecha.
  return out.sort((a, b) => a[0] - b[0]).map(([x, y], i) => ({ x, y, k, i, hilo: [canton.x + (i % canton.n) * 26 * k + 4 * k, canton.y - 3 * k] }));
}

/**
 * Sobre la ladera (con los campamentos ya puestos): la quebrada baja de la nieve al lago por la cara que mira al astro, lejos del sendero
 * y de los hitos con sus rótulos, y el grabado de luna llena busca una roca libre. `cajas`: [x0, y0, x1, y1] de cada campamento.
 */
export function sitiosLadera({ W, H = 1e4, sx, sy, izq = [], der, nv, pts = [], lago, cajas = [], grabado = false, k = 1 }) {
  const R = [[sx, sy], ...der].sort((a, b) => a[1] - b[1]);
  const xDer = (y) => Math.min(W - 6, enY(R, y));
  const libre = (x, y, m) => distLinea(x, y, pts) > m && !cajas.some((c) => cruza([x - 4, y - 4, x + 4, y + 4], c));
  let quebrada = null, mejor = -1;
  if (lago) {
    const ys = sy + nv * 1.4, fin = [lago.cx - lago.rx * 0.18, lago.cy - lago.ry * 0.7], N = 12;
    for (const u of [0.42, 0.3, 0.56, 0.22, 0.7]) {
      const x0 = sx + u * (xDer(ys) - sx), tramo = [];
      for (let i = 0; i <= N; i++) {
        // Baja por la cara al astro y se va acercando al lago; los meandros crecen al bajar y se calman al llegar.
        const t = i / N, e = t ** 1.6, amp = (5 + 13 * Math.sin(Math.PI * t)) * k;
        tramo.push([x0 + (fin[0] - x0) * e + Math.sin(t * Math.PI * 3.2 + u * 4) * amp * (i && i < N ? 1 : 0), ys + (fin[1] - ys) * t]);
      }
      const buenos = tramo.filter(([x, y]) => libre(x, y, 22 * k) && x < xDer(y) - 4).length;
      if (buenos > mejor) { mejor = buenos; quebrada = { pts: tramo, k }; }
      if (buenos === tramo.length) break;
    }
  }
  // El grabado: en la roca baja de la montaña (en cualquiera de sus dos caras), lejos del sendero, de los campamentos y de la quebrada;
  // se prueba de abajo arriba y gana el sitio más bajo. Si no hay ninguno, no sale (es un secreto: nadie lo echa de menos).
  let roca = null;
  if (grabado && lago) {
    const g = W < 700 ? 0.82 : 1, a = 62 * k * g, b = 26 * k * g, I = [...izq].sort((p, q) => p[1] - q[1]), xIzq = (y) => Math.max(6, enY(I, y));
    const bajo = Math.min(lago.cy - lago.ry - 30 * k, (pts[0]?.[1] ?? H) - 36 * k), alto = sy + nv * 1.7;
    for (let y = bajo; y >= alto && !roca; y -= 10 * k) {
      for (const [x0, x1] of [[sx, xDer(y)], [sx, xIzq(y)]]) {
        for (const u of [0.45, 0.65, 0.28, 0.82]) {
          const x = x0 + u * (x1 - x0);
          if (x - a / 2 < Math.max(8, xIzq(y) + 4) || x + a / 2 > Math.min(xDer(y) - 6, W - 6)) continue;
          const esquinas = [[x - a / 2, y - b / 2], [x + a / 2, y - b / 2], [x - a / 2, y + b / 2], [x + a / 2, y + b / 2], [x, y]];
          if (!esquinas.every(([px, py]) => libre(px, py, 12 * k))) continue;
          if (quebrada && esquinas.filter(([px, py]) => distLinea(px, py, quebrada.pts) < 6 * k).length > 1) continue;
          roca = { x, y, k: k * g };
          break;
        }
        if (roca) break;
      }
    }
  }
  return { quebrada, roca };
}

// ------------------------------------------------------------------------------------------------ el cantón (idea 45)
/**
 * Los ranchos de teja en su loma: cada uno es tres planos (el costado que mira al astro, el hastial en sombra y el tejado), con el alero
 * que echa su sombra en la pared, la puerta, las ventanas (encendidas de noche, una por persona con cuenta) y su sombra en el suelo. La
 * loma tiene su cara al astro y su cara en sombra; el patio de tierra asienta las casas. El humo del fogón es ambiente.
 * En Navidad: una guirnalda de foquitos en los aleros y el nacimiento en el nicho del rancho del medio (no cuenta como ventana).
 */
export function canton({ x, y, k, n, sol = 1, ventanas = 0, H = 900 }) {
  const A = { lomaL: '', lomaS: '', filo: '', rellano: '', canto: '', sombra: '', paredL: '', paredS: '', techoL: '', techoS: '', alero: '', puerta: '', ventana: '', luz: '', halo: '', nav: ['', '', ''], nicho: '', figuras: '', tronco: '' };
  const humos = [];
  // La loma: el lomo del valle donde vive el cantón. Sube desde la orilla de la escena, hace un rellano bajo los ranchos y baja hacia la
  // montaña (por detrás de su falda); llega hasta el pie de la escena (no flota en la bruma). Su cara izquierda queda en sombra.
  const span = (RANCHOS[n - 1][0] + ANCHO_RANCHO) * k;
  const xa = x - 26 * k, xb = x + span + 6 * k, fondo = H + 12;
  const cima = crestaLoma({ x, y, k, n });
  const suave = (pts) => `M${P(pts[0])}${pts.slice(1).map((q, i) => `Q${P(pts[i])} ${P([(pts[i][0] + q[0]) / 2, (pts[i][1] + q[1]) / 2])}`).join('')}L${P(pts[pts.length - 1])}`;
  const lomaBase = `${suave(cima)}L${f1(xb + 96 * k)} ${f1(fondo)}L-30 ${f1(fondo)}Z`;
  A.lomaS = poli([[xa - 44 * k, y + 20 * k], [xa - 10 * k, y + 5 * k], [x + 4 * k, y + 30 * k], [x - 22 * k, fondo], [-30, fondo], [-30, y + 46 * k]]);
  A.lomaL = poli([[xb, y + 1.5 * k], [xb + 34 * k, y + 13 * k], [xb + 96 * k, y + 44 * k], [xb + 96 * k, fondo], [xb + 6 * k, fondo], [x + span * 0.6, y + 26 * k]]);
  A.filo = `M${P([xa - 10 * k, y + 5 * k])}Q${P([x + span * 0.35, y - 1.5 * k])} ${P([xb, y + 1.5 * k])}`;
  // Unos árboles de patio (mango, jocote) entre los ranchos y a los lados: copas facetadas como las de los árboles de honor.
  const arboles = n > 2 ? [[x + 23 * k, y - 4.6 * k, 6], [xb + 3 * k, y + 1.5 * k, 6.6]] : [[x + 24 * k, y - 4.6 * k, 5.6], [xb + 2 * k, y + 1.5 * k, 5.4]];
  let copas = { base: '', luz: '', media: '', sombra: '', filo: '' };
  for (const [ax, ay, r] of arboles) {
    const rx = r * k, ry = r * k * 0.86, cy = ay - r * k * 1.25;
    A.tronco += poli([[ax - 0.7 * k, ay], [ax + 0.7 * k, ay], [ax + 0.5 * k, cy + ry * 0.4], [ax - 0.5 * k, cy + ry * 0.4]]);
    copas = facetas(ax, cy, rx, ry, [1, 0.92, 1.05, 0.96, 1.02, 0.9, 1.04], sol, 0.2, copas, 0.62);
  }
  // Cada rancho se asienta en su rellano: el plano de tierra apisonada y su canto en sombra (como los rellanos de los campamentos).
  RANCHOS.slice(0, n).forEach(([dx, dy, s]) => {
    const u = k * s, ox = x + dx * k, oy = y + dy * k;
    const m = (px, py) => [ox + sol * px * u, oy + py * u];
    A.rellano += poli([m(-4, 0.4), m(-1.5, -1.6), m(26.5, -6.4), m(29, -3.8), m(26, 0.2), m(13, 2.6), m(-1, 2.8)]);
    A.canto += poli([m(-4, 0.4), m(-1, 2.8), m(13, 2.6), m(26, 0.2), m(29, -3.8), m(29, -3), m(26.4, 1.2), m(13, 3.5), m(-1, 3.7), m(-4, 1.2)]);
  });
  let vent = Math.max(0, ventanas);
  const sitiosVentana = [];
  RANCHOS.slice(0, n).forEach(([dx, dy, s], i) => {
    const u = k * s, ox = x + dx * k, oy = y + dy * k;
    const m = (px, py) => [ox + sol * px * u, oy + py * u]; // local → escena (con la luz por la derecha, el costado mira al astro)
    const fw = 11, wh = 7, gh = 5, dx2 = 14, dy2 = -4.2;
    const a = m(0, 0), b = m(fw, 0), c = m(fw, -wh), d = m(0, -wh), e = m(fw / 2, -wh - gh);
    const bb = m(fw + dx2, dy2), cc = m(fw + dx2, -wh + dy2), ee = m(fw / 2 + dx2, -wh - gh + dy2);
    const vo = 1.9, vv = 1.3; // vuelo del alero
    const c2 = m(fw + vo, -wh + vv), cc2 = m(fw + dx2 + vo, -wh + dy2 + vv), d2 = m(-vo, -wh + vv);
    A.sombra += poli([m(-2.5, 0.6), a, b, bb, m(fw + dx2 + 2, dy2 + 0.4), m(dx2 - 6, dy2 + 1.6)].map(([px, py]) => [px - sol * 3.5 * u, py + 0.6 * u]));
    A.paredS += poli([a, b, c, e, d]); // el hastial, de frente y en sombra
    A.paredL += poli([b, bb, cc, c]); // el costado, al astro
    A.alero += poli([c, cc, m(fw + dx2, -wh + dy2 + 1.5), m(fw, -wh + 1.5)]); // la sombra del alero en la pared
    A.techoL += poli([e, ee, cc2, c2]);
    A.techoS += poli([d2, e, c2, m(fw + vo, -wh + vv + 0.9), e.map((v, j) => v + [0, 0.9 * u][j]), m(-vo, -wh + vv + 0.9)]); // el canto del tejado sobre el hastial
    A.puerta += poli([m(2, 0), m(4.8, 0), m(4.8, -4.6), m(2, -4.6)]);
    // Dos ventanas en el costado (siguen su inclinación); el rancho del medio lleva además el nicho del nacimiento en el hastial.
    for (const t of [0.3, 0.7]) {
      const p0 = [fw + dx2 * t - 1.3, dy2 * t - 3.2], p1 = [fw + dx2 * t + 1.3, dy2 * (t + 0.093) - 3.2];
      const q = [m(p0[0], p0[1]), m(p1[0], p1[1]), m(p1[0], p1[1] - 2.4), m(p0[0], p0[1] - 2.4)];
      sitiosVentana.push({ q, c: m(fw + dx2 * t, dy2 * t - 4.4), orden: (t > 0.5 ? 10 : 0) + i });
    }
    if (i === Math.min(1, n - 1)) {
      const nq = [m(6.2, -1.2), m(9.2, -1.2), m(9.2, -4.4), m(7.7, -5.4), m(6.2, -4.4)];
      A.nicho += poli(nq);
      const fx = (px, py) => P(m(px, py));
      // La Virgen arrodillada, San José con su vara y el pesebre (siluetas contra la luz del nicho).
      A.figuras += `M${fx(6.6, -1.2)}L${fx(7.1, -2.6)}L${fx(7.6, -1.2)}Z M${fx(7.1, -2.8)}L${fx(7.4, -3.1)}L${fx(7.1, -3.4)}L${fx(6.8, -3.1)}Z M${fx(8.2, -1.2)}L${fx(8.4, -3.4)}L${fx(8.9, -3.4)}L${fx(8.9, -1.2)}Z M${fx(8.55, -3.5)}L${fx(8.85, -3.8)}L${fx(8.55, -4.1)}L${fx(8.25, -3.8)}Z M${fx(7.4, -1.2)}L${fx(7.55, -1.8)}L${fx(8.05, -1.8)}L${fx(8.15, -1.2)}Z`;
    }
    // La guirnalda de Navidad: foquitos a lo largo del alero, tres colores que se alternan.
    for (let j = 0; j <= 8; j++) {
      const t = j / 8, p = m(fw + vo + dx2 * t, -wh + vv + dy2 * t + 0.6 + Math.sin(t * Math.PI * 4) * 0.5);
      A.nav[j % 3] += `M${P(p)}h0.01`;
    }
    for (let j = 1; j <= 3; j++) { const p = m(fw / 2 - j * 1.6, -wh - gh + j * 1.25 + 0.7); A.nav[(j + 1) % 3] += `M${P(p)}h0.01`; }
    if (i < n - 1) humos.push(m(fw / 2 + dx2 * 0.62, -wh - gh + dy2 * 0.62 - 0.6));
  });
  // Ventanas: se encienden tantas como personas con cuenta, empezando por las de delante; las demás quedan oscuras.
  sitiosVentana.sort((a, b) => a.orden - b.orden).forEach(({ q, c }) => {
    if (vent > 0) { A.luz += poli(q); A.halo += `M${P(c)}h0.01`; vent--; } else A.ventana += poli(q);
  });
  const sw = 7.5 * k;
  const humo = humos.map(([hx, hy]) => [0, 1, 2].map((j) => `<circle class="v-hu" cx="${f1(hx)}" cy="${f1(hy)}" r="${f1((1.6 + j * 0.5) * k)}"/>`).join('')).join('');
  return `<g class="v-canton" aria-hidden="true"><path class="v-loma" d="${lomaBase}" fill="url(#m-v-loma)"/><path class="v-loma-s" d="${A.lomaS}"/><path class="v-loma-l" d="${A.lomaL}"/><path class="v-loma-filo" d="${A.filo}" stroke-width="${f1(0.9 * k)}"/>`
    + `<path class="v-canto" d="${A.canto}"/><path class="v-rellano" d="${A.rellano}"/><path class="v-sombra" d="${A.sombra}"/>`
    + `<path class="v-ar-tronco" d="${A.tronco}"/><path class="copa" d="${copas.base}"/><path class="copa-media" d="${copas.media}"/><path class="copa-luz" d="${copas.luz}"/><path class="copa-sombra" d="${copas.sombra}"/>`
    + `<path class="v-pared-s" d="${A.paredS}"/><path class="v-pared-l" d="${A.paredL}"/><path class="v-alero" d="${A.alero}"/>`
    + `<path class="v-puerta" d="${A.puerta}"/><path class="v-ventana" d="${A.ventana}"/><path class="v-luz" d="${A.luz}"/><path class="v-halo" d="${A.halo}" stroke-width="${f1(sw)}"/>`
    + `<path class="v-techo-s" d="${A.techoS}"/><path class="v-techo-l" d="${A.techoL}"/>`
    + `<g class="v-navidad"><path class="v-nicho" d="${A.nicho}"/><path class="v-figuras" d="${A.figuras}"/>${A.nav.map((d, j) => `<path class="v-foco v-foco-${j}" d="${d}" stroke-width="${f1(1.25 * k)}"/>`).join('')}</g>`
    + `<g class="efecto-ambiente v-humos">${humo}</g></g>`;
}

/** El pino de Navidad del cantón: dos pisos en sombra y luz, foquitos de tres colores en guirnalda (parpadean suave solo con «todos»). Sin estrella. */
export function pinoNavidad({ x, y, k }) {
  const a = 21 * k, an = 6.6 * k;
  const piso = (y0, h, w) => [[x, y0 - h], [x + w, y0], [x - w, y0]];
  const p1 = piso(y - 4 * k, a * 0.62, an), p2 = piso(y - a * 0.42, a * 0.58, an * 0.74);
  const mitad = (t) => poli([t[0], [x, t[1][1]], t[2]]);
  const luz = `${poli([p1[0], p1[1], [x, p1[1][1]]])}${poli([p2[0], p2[1], [x, p2[1][1]]])}`;
  const focos = ['', '', ''];
  let j = 0;
  for (const [y0, h, w] of [[y - 4 * k, a * 0.62, an], [y - a * 0.42, a * 0.58, an * 0.74]]) {
    for (let t = 0.22; t < 0.98; t += 0.17) {
      const yy = y0 - h + h * t, ww = w * t * 0.92, xx = x + (j % 2 ? ww : -ww) * (0.25 + 0.7 * ((j * 0.37) % 1));
      focos[j % 3] += `M${P([xx, yy])}h0.01`;
      j++;
    }
  }
  const nav = 'v-navidad v-pino-nav'; // (sin grupo: cada trazo lleva la clase que lo enseña en Navidad)
  return `<path class="${nav} v-pn-tronco" d="${poli([[x - 1.1 * k, y], [x + 1.1 * k, y], [x + 0.8 * k, y - 5 * k], [x - 0.8 * k, y - 5 * k]])}"/>`
    + `<path class="${nav} v-pn" d="${mitad(p1)}${mitad(p2)}"/><path class="${nav} v-pn-l" d="${luz}"/>${focos.map((d, i) => `<path class="${nav} v-pn-foco v-pf-${i}" d="${d}" stroke-width="${f1(1.5 * k)}"/>`).join('')}`;
}

// ------------------------------------------------------------------------------------------------ la milpa (idea 23)
/**
 * Una parcela en la loma que sigue el año de aquí. Se dibujan las cinco etapas (cada una, pocos trazos) y el CSS enseña la del día
 * (`html[data-milpa]`): siembra (brotes en surcos de tierra fresca), jilote (matas altas con su espiga), doblada (la caña doblada
 * bajo la mazorca, secándose), tapisca (cañas secas y los tercios de la cosecha) y rastrojo (tierra seca con los tocones).
 */
export function milpa({ x, y, w, h, k, sol = 1, caida = 0 }) {
  // La parcela en perspectiva y siguiendo la loma (baja hacia la izquierda `caida` px): el borde de atrás más corto que el de delante.
  const fondo = [[x + w * 0.12, y + caida * 0.88], [x + w * 0.9, y - h * 0.22 + caida * 0.1]], frente = [[x, y + h + caida], [x + w, y + h * 0.7]];
  const en = (u, v) => [fondo[0][0] + (fondo[1][0] - fondo[0][0]) * u + ((frente[0][0] + (frente[1][0] - frente[0][0]) * u) - (fondo[0][0] + (fondo[1][0] - fondo[0][0]) * u)) * v,
    fondo[0][1] + (fondo[1][1] - fondo[0][1]) * u + ((frente[0][1] + (frente[1][1] - frente[0][1]) * u) - (fondo[0][1] + (fondo[1][1] - fondo[0][1]) * u)) * v];
  const suelo = poli([fondo[0], fondo[1], frente[1], frente[0]]);
  const filas = 4, matas = Math.max(7, Math.round(w / (5.2 * k)));
  let surcos = '', brote = '', mata = '', mataS = '', espiga = '', doblada = '', mazorca = '', tapisca = '', tercio = '', rastrojo = '';
  for (let f = 0; f < filas; f++) {
    const v = (f + 0.5) / filas;
    surcos += linea([en(0.02, v), en(0.98, v)]);
    for (let i = 0; i < matas; i++) {
      const u = (i + 0.5 + (f % 2) * 0.35) / matas;
      if (u > 0.99) continue;
      const [px, py] = en(u, v), s = k * (0.62 + 0.38 * v); // las de delante, más grandes
      brote += `M${f1(px - 1 * s)} ${f1(py - 1.3 * s)}L${f1(px)} ${f1(py)}L${f1(px + 1 * s)} ${f1(py - 1.4 * s)}`;
      const alto = 9.5 * s;
      mata += `M${f1(px)} ${f1(py)}L${f1(px + 0.3 * s)} ${f1(py - alto)}M${f1(px)} ${f1(py - alto * 0.4)}Q${f1(px + 2.6 * s * sol)} ${f1(py - alto * 0.55)} ${f1(px + 3.3 * s * sol)} ${f1(py - alto * 0.3)}`;
      mataS += `M${f1(px + 0.1 * s)} ${f1(py - alto * 0.62)}Q${f1(px - 2.6 * s * sol)} ${f1(py - alto * 0.78)} ${f1(px - 3.2 * s * sol)} ${f1(py - alto * 0.5)}`;
      espiga += `M${f1(px + 0.3 * s)} ${f1(py - alto)}l${f1(-0.9 * s)} ${f1(-1.6 * s)}M${f1(px + 0.3 * s)} ${f1(py - alto)}l${f1(0.9 * s)} ${f1(-1.5 * s)}`;
      // Doblada: la caña sube hasta la mazorca y la punta cuelga hacia abajo.
      const hb = alto * 0.62;
      doblada += `M${f1(px)} ${f1(py)}L${f1(px + 0.2 * s)} ${f1(py - hb)}L${f1(px + 2.8 * s * sol)} ${f1(py - hb + 3.6 * s)}`;
      mazorca += `M${f1(px + 0.5 * s * sol)} ${f1(py - hb + 1.1 * s)}h0.01`;
      tapisca += `M${f1(px)} ${f1(py)}L${f1(px + 0.15 * s)} ${f1(py - (i % 3 ? 4.2 : 6.4) * s)}`;
      rastrojo += `M${f1(px)} ${f1(py)}l${f1(0.4 * s)} ${f1(-1.6 * s)}`;
    }
  }
  // Los tercios de la tapisca: dos montoncitos de mazorcas al borde de la parcela, con su sombra.
  for (const [u, v] of [[0.2, 1.06], [0.62, 1.04]]) {
    const [px, py] = en(u, v), s = k;
    tercio += `M${f1(px - 3.2 * s)} ${f1(py)}Q${f1(px - 2.2 * s)} ${f1(py - 3.4 * s)} ${f1(px)} ${f1(py - 3.6 * s)}Q${f1(px + 2.4 * s)} ${f1(py - 3.4 * s)} ${f1(px + 3.2 * s)} ${f1(py)}Z`;
  }
  const g = (clase, d, extra = '') => `<path class="${clase}" d="${d}"${extra}/>`;
  const sw = (n) => ` stroke-width="${f1(n * k)}"`;
  return `${g('v-mp-suelo', suelo)}${g('v-mp-surco', surcos, sw(0.9))}`
    + g('v-mp v-mp-siembra v-mp-brote', brote, sw(0.8))
    + g('v-mp v-mp-jilote v-mp-mata-s', mataS, sw(1.2)) + g('v-mp v-mp-jilote v-mp-mata', mata, sw(1.1)) + g('v-mp v-mp-jilote v-mp-espiga', espiga, sw(0.75))
    + g('v-mp v-mp-doblada v-mp-dobl', doblada, sw(1.1)) + g('v-mp v-mp-doblada v-mp-mazorca', mazorca, sw(2))
    + g('v-mp v-mp-tapisca v-mp-cana', tapisca, sw(0.9)) + g('v-mp v-mp-tapisca v-mp-tercio', tercio)
    + g('v-mp v-mp-rastrojo v-mp-rastro', rastrojo, sw(0.8));
}

// ------------------------------------------------------------------------------------------------ el camino real (idea 46)
/** El camino de tierra del cantón a la salida: más ancho cerca, con su talud, un cerco de piedra y postes de brotón. Sin carreta. */
export function caminoReal({ ini, ctrl, fin, ancho: [a0, a1], k }) {
  const pto = (t) => { const v = 1 - t; return [v * v * ini[0] + 2 * v * t * ctrl[0] + t * t * fin[0], v * v * ini[1] + 2 * v * t * ctrl[1] + t * t * fin[1]]; };
  const N = 14, izq = [], der = [], cerco = [], postes = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, [x, y] = pto(t), [x2, y2] = pto(Math.min(1, t + 0.01)), [x1, y1] = pto(Math.max(0, t - 0.01));
    const dx = x2 - x1, dy = y2 - y1, m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m, a = (a0 + (a1 - a0) * t) / 2;
    izq.push([x + nx * a, y + ny * a]); der.push([x - nx * a, y - ny * a]);
    cerco.push([x - nx * (a + 2.2 * k), y - ny * (a + 2.2 * k)]);
    if (i % 2 === 1 && i < N - 1) postes.push([x + nx * (a + 2 * k), y + ny * (a + 2 * k), 2.6 * k * (0.6 + 0.6 * t)]);
  }
  // ¿Qué borde queda abajo (el talud que recibe luz)? El que tiene la y mayor.
  const abajo = izq[Math.floor(N / 2)][1] > der[Math.floor(N / 2)][1] ? izq : der;
  const talud = poli([...abajo, ...abajo.slice().reverse().map(([x, y], i) => [x, y + (0.8 + 1.6 * ((N - i) / N)) * k])]);
  const piedras = cerco.slice(0, -1).map(([x, y], i) => `M${f1(x)} ${f1(y)}L${f1(cerco[i + 1][0])} ${f1(cerco[i + 1][1])}`).join('');
  const palos = postes.map(([x, y, h]) => `M${f1(x)} ${f1(y)}l0 ${f1(-h)}`).join('');
  const brotes = postes.map(([x, y, h]) => `M${f1(x)} ${f1(y - h)}l${f1(-0.9 * k)} ${f1(-0.8 * k)}M${f1(x)} ${f1(y - h)}l${f1(0.9 * k)} ${f1(-0.7 * k)}`).join('');
  return `<path class="v-cm-talud" d="${talud}"/><path class="v-cm" d="${poli([...izq, ...der.reverse()])}"/>`
    + `<path class="v-cm-cerco" d="${piedras}" stroke-width="${f1(1.8 * k)}"/><path class="v-cm-poste" d="${palos}" stroke-width="${f1(0.9 * k)}"/><path class="v-cm-brote" d="${brotes}" stroke-width="${f1(0.8 * k)}"/>`;
}

// ------------------------------------------------------------------------------------------------ el árbol del primer día (idea 50)
/**
 * Un conacaste junto a la salida, sembrado el día de la primera compra: crece con los años del libro (retoño, joven, árbol, grande) y,
 * en la época seca, bota la hoja (el CSS ralea la copa y enseña sus ramas). Copa de sombrilla, ancha y baja, facetada como la roca.
 */
export function arbolPrimerDia({ x, y, k, ra, etapa, tam, sol = 1 }) {
  const s = tam;
  if (etapa === 'retono') {
    const h = 14 * k * (0.7 + s), L = sol;
    const hojas = [[-1, 0.62], [1, 0.48], [-0.6, 0.82], [0.7, 0.95]].map(([lx, t]) => {
      const bx2 = x + 0.4 * k, by2 = y - h * t, ex = bx2 + lx * 5 * k * (0.8 + s), ey = by2 - 2.4 * k;
      return { d: `M${f1(bx2)} ${f1(by2)}Q${f1((bx2 + ex) / 2)} ${f1(ey - 2.2 * k)} ${f1(ex)} ${f1(ey)}Q${f1((bx2 + ex) / 2)} ${f1(by2 + 0.8 * k)} ${f1(bx2)} ${f1(by2)}Z`, luz: lx * L > 0 };
    });
    return `<g class="v-arbol v-retono" aria-hidden="true"><path class="v-ar-sombra" d="M${f1(x - 6 * k)} ${f1(y + 0.6 * k)}Q${f1(x)} ${f1(y - 1.4 * k)} ${f1(x + 6 * k)} ${f1(y + 0.6 * k)}Z"/>`
      + `<path class="v-ar-tallo" d="M${f1(x)} ${f1(y)}Q${f1(x + 1.2 * k)} ${f1(y - h * 0.5)} ${f1(x + 0.4 * k)} ${f1(y - h)}" stroke-width="${f1(1.2 * k)}"/>`
      + `<g class="v-ar-copa"><path class="v-ar-hoja-s" d="${hojas.filter((q) => !q.luz).map((q) => q.d).join('')}"/><path class="v-ar-hoja-l" d="${hojas.filter((q) => q.luz).map((q) => q.d).join('')}"/></g></g>`;
  }
  // Tronco corto y grueso que se abre en ramas bajas; copa de sombrilla, mucho más ancha que alta, hecha de tres matas (la del medio
  // más alta) facetadas como la roca: así no es un hongo de un solo plato.
  const rx = ra * (0.45 + 0.55 * s), ry = rx * (etapa === 'joven' ? 0.5 : 0.36), alto = rx * (etapa === 'joven' ? 1.1 : 0.86);
  const cy = y - alto, tw = rx * 0.1 + 0.9 * k;
  const tronco = poli([[x - tw, y], [x + tw, y], [x + tw * 0.7, cy + ry * 0.7], [x - tw * 0.7, cy + ry * 0.7]]);
  const luzT = poli([[x + sol * 0.15 * tw, y], [x + sol * tw, y], [x + sol * tw * 0.7, cy + ry * 0.7], [x + sol * 0.1 * tw, cy + ry * 0.7]]);
  const ramas = [[-0.7, 0.35], [-0.36, -0.05], [0.12, -0.2], [0.5, 0.1], [0.78, 0.38]].map(([u, v]) => `M${f1(x)} ${f1(cy + ry * 1.1)}Q${f1(x + rx * u * 0.35)} ${f1(cy + ry * 0.75)} ${f1(x + rx * u)} ${f1(cy + ry * v)}`).join('');
  let c = facetas(x - rx * 0.5, cy + ry * 0.32, rx * 0.52, ry * 0.86, [1, 0.94, 1.05, 0.97, 1.02, 0.92, 1.03], sol, 0.4, undefined, 0.5);
  c = facetas(x + rx * 0.52, cy + ry * 0.26, rx * 0.5, ry * 0.84, [0.96, 1.04, 0.95, 1.02, 0.93, 1.05, 0.98], sol, 0.9, c, 0.5);
  c = facetas(x + rx * 0.02, cy - ry * 0.12, rx * 0.62, ry, [1, 0.94, 1.03, 0.97, 1.05, 0.92, 1.02, 0.98], sol, 0.15, c, 0.46);
  return `<g class="v-arbol v-${etapa}" aria-hidden="true"><path class="v-ar-sombra" d="M${f1(x - rx * 0.95)} ${f1(y + 1.2 * k)}Q${f1(x - sol * rx * 0.2)} ${f1(y - 2.4 * k)} ${f1(x + rx * 0.9)} ${f1(y + 1.2 * k)}Q${f1(x)} ${f1(y + 3.4 * k)} ${f1(x - rx * 0.95)} ${f1(y + 1.2 * k)}Z"/>`
    + `<path class="v-ar-tronco" d="${tronco}"/><path class="v-ar-tronco-l" d="${luzT}"/><path class="v-ar-ramas" d="${ramas}" stroke-width="${f1(Math.max(0.8, tw * 0.5))}"/>`
    + `<g class="v-ar-copa"><path class="copa" d="${c.base}"/><path class="copa-media" d="${c.media}"/><path class="copa-luz" d="${c.luz}"/><path class="copa-sombra" d="${c.sombra}"/><path class="copa-filo" d="${c.filo}"/></g>`
    + `<path class="v-ar-ramas v-ar-ramas-secas" d="${ramas}" stroke-width="${f1(Math.max(0.7, tw * 0.34))}"/></g>`;
}

// ------------------------------------------------------------------------------------------------ la quebrada (idea 48)
/** La quebrada baja de la nieve al lago: llena y brillante en la época lluviosa, un hilo entre piedras en la seca (`html[data-epoca]`). */
export function quebrada({ pts, k }) {
  // Una cinta que se ensancha al bajar (no un trazo de ancho fijo, que se leía como un cable): el cauce tallado (más ancho, en sombra),
  // el agua y, en la lluviosa, sus brillos cortos; en la seca, un hilo con charquitos y piedras secas a los lados.
  const N = pts.length - 1;
  const lado = (ancho, k2 = 1) => {
    const L = [], R = [];
    pts.forEach(([x, y], i) => {
      const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(N, i + 1)], dx = bx - ax, dy = by - ay, m = Math.hypot(dx, dy) || 1;
      const a = ancho(i / N) * k2 / 2;
      L.push([x - (dy / m) * a, y + (dx / m) * a]); R.push([x + (dy / m) * a, y - (dx / m) * a]);
    });
    const curva = (q) => `${P(q[0])}${q.slice(1).map((r, i) => `Q${P(q[i])} ${P([(q[i][0] + r[0]) / 2, (q[i][1] + r[1]) / 2])}`).join('')}L${P(q[N])}`;
    return `M${curva(L)}L${curva(R.reverse()).slice(0)}Z`;
  };
  const cauce = lado((t) => (2.2 + 4.2 * t) * k);
  const llena = lado((t) => (0.9 + 2.9 * t) * k);
  const hilo = lado((t) => (0.5 + 0.9 * t) * k);
  const brillos = pts.slice(1, -1).map(([x, y], i) => { const [nx, ny] = pts[i + 2]; return `M${P([x, y])}L${P([x + (nx - x) * 0.32, y + (ny - y) * 0.32])}`; }).join('');
  const piedras = pts.slice(1, -1).flatMap(([x, y], i) => [[x + (i % 2 ? 2.6 : -2.8) * k, y + 1.4 * k, 1.1], [x + (i % 2 ? -2.2 : 2.4) * k, y + 3.8 * k, 0.8]]).map(([x, y, r]) => `M${f1(x - r * k)} ${f1(y)}a${f1(r * k)} ${f1(r * k * 0.7)} 0 1 0 ${f1(2 * r * k)} 0a${f1(r * k)} ${f1(r * k * 0.7)} 0 1 0 ${f1(-2 * r * k)} 0Z`).join('');
  const charcos = pts.filter((_, i) => i % 3 === 2).map(([x, y]) => `M${f1(x - 2 * k)} ${f1(y)}a${f1(2 * k)} ${f1(1 * k)} 0 1 0 ${f1(4 * k)} 0a${f1(2 * k)} ${f1(1 * k)} 0 1 0 ${f1(-4 * k)} 0Z`).join('');
  // Arriba es un hilo que nace bajo la nieve y casi no se ve; se hace agua al bajar (un degradado a lo largo de la quebrada).
  const y0 = pts[0][1], y1 = pts[N][1];
  return `<linearGradient id="m-v-q" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(y0)}" x2="0" y2="${f1(y1)}"><stop offset="0" class="vq-0"/><stop offset="0.7" class="vq-1"/></linearGradient><path class="v-q-cauce" d="${cauce}"/>`
    + `<path class="v-q-llena v-q-agua" d="${llena}" fill="url(#m-v-q)"/><path class="v-q-llena v-q-brillo" d="${brillos}" stroke-width="${f1(0.7 * k)}"/>`
    + `<path class="v-q-hilo v-q-piedra" d="${piedras}"/><path class="v-q-hilo v-q-agua" d="${hilo}${charcos}" fill="url(#m-v-q)"/>`;
}

// ------------------------------------------------------------------------------------------------ el lago con vida (idea 49)
/** Tule en las orillas (fuera del agua que crece y baja con la época). */
export function tule({ cx, cy, rx, ry, k }) {
  let luz = '', som = '', cab = '';
  for (const [u, n] of [[-0.86, 6], [0.78, 5]]) {
    for (let i = 0; i < n; i++) {
      const x = cx + rx * u + (i - n / 2) * 1.5 * k, y = cy + ry * (0.1 + (i % 2) * 0.25), h = (7 + ((i * 7) % 5)) * k, inc = (i - n / 2) * 0.35 * k;
      const d = `M${f1(x)} ${f1(y)}Q${f1(x + inc * 0.4)} ${f1(y - h * 0.6)} ${f1(x + inc)} ${f1(y - h)}`;
      if (i % 2) luz += d; else som += d;
      if (i % 3 === 1) cab += `M${f1(x + inc * 0.9)} ${f1(y - h * 0.9)}l${f1(inc * 0.1)} ${f1(-2.2 * k)}`;
    }
  }
  return `<path class="v-tule v-tu-s" d="${som}" stroke-width="${f1(0.9 * k)}"/><path class="v-tule v-tu-l" d="${luz}" stroke-width="${f1(0.9 * k)}"/><path class="v-tule v-tu-cab" d="${cab}" stroke-width="${f1(1.5 * k)}"/>`;
}
/**
 * La garza quieta en la orilla y el cayuco del pescador. De noche no hay garza y del cayuco solo se ven su lámpara y su reflejo; al
 * amanecer el pescador rema (ambiente, solo con «todos»).
 */
export function vidaLago({ cx, cy, rx, ry, k }) {
  const gx = cx - rx * 0.62, gy = cy - ry * 0.05, s = k;
  const cuerpo = `M${f1(gx - 3.6 * s)} ${f1(gy - 6.4 * s)}Q${f1(gx - 0.4 * s)} ${f1(gy - 8.6 * s)} ${f1(gx + 2.6 * s)} ${f1(gy - 6.6 * s)}Q${f1(gx + 1.4 * s)} ${f1(gy - 4.2 * s)} ${f1(gx - 1.2 * s)} ${f1(gy - 4.4 * s)}Z`;
  const sombraG = `M${f1(gx - 3.6 * s)} ${f1(gy - 6.4 * s)}Q${f1(gx - 0.6 * s)} ${f1(gy - 5.2 * s)} ${f1(gx + 2.6 * s)} ${f1(gy - 6.6 * s)}Q${f1(gx + 1.4 * s)} ${f1(gy - 4.2 * s)} ${f1(gx - 1.2 * s)} ${f1(gy - 4.4 * s)}Z`;
  const cuello = `M${f1(gx + 2 * s)} ${f1(gy - 7 * s)}Q${f1(gx + 3.6 * s)} ${f1(gy - 9.4 * s)} ${f1(gx + 2.4 * s)} ${f1(gy - 11.6 * s)}Q${f1(gx + 2.2 * s)} ${f1(gy - 12.8 * s)} ${f1(gx + 3.4 * s)} ${f1(gy - 12.8 * s)}`;
  const pico = `M${f1(gx + 3.2 * s)} ${f1(gy - 13.1 * s)}L${f1(gx + 6 * s)} ${f1(gy - 12.4 * s)}L${f1(gx + 3.2 * s)} ${f1(gy - 12.4 * s)}Z`;
  const patas = `M${f1(gx - 0.4 * s)} ${f1(gy - 4.5 * s)}L${f1(gx - 0.2 * s)} ${f1(gy)}M${f1(gx + 0.6 * s)} ${f1(gy - 4.5 * s)}L${f1(gx + 1 * s)} ${f1(gy)}`;
  const reflejo = `M${f1(gx - 3 * s)} ${f1(gy + 1.2 * s)}Q${f1(gx)} ${f1(gy + 3.4 * s)} ${f1(gx + 2.4 * s)} ${f1(gy + 1.4 * s)}`;
  const garza = `<path class="v-garza v-gz-pata" d="${patas}" stroke-width="${f1(0.55 * s)}"/><path class="v-garza v-gz-reflejo" d="${reflejo}" stroke-width="${f1(1.4 * s)}"/><path class="v-garza v-gz-cuello" d="${cuello}" stroke-width="${f1(1.1 * s)}"/>`
    + `<path class="v-garza v-gz" d="${cuerpo}"/><path class="v-garza v-gz-s" d="${sombraG}"/><path class="v-garza v-gz-pico" d="${pico}"/>`;
  // El cayuco: casco de madera (borda clara y costado en sombra), el pescador sentado con su sombrero, el remo y la lámpara.
  const qx = cx + rx * 0.08, qy = cy + ry * 0.12, l = 15 * k, h = 2.2 * k;
  const casco = poli([[qx - l / 2, qy - h * 0.6], [qx + l / 2, qy - h * 0.8], [qx + l / 2 - 2.4 * k, qy + h * 0.5], [qx - l / 2 + 2 * k, qy + h * 0.5]]);
  const borda = poli([[qx - l / 2, qy - h * 0.6], [qx + l / 2, qy - h * 0.8], [qx + l / 2 - 0.6 * k, qy - h * 0.2], [qx - l / 2 + 0.6 * k, qy - h * 0.05]]);
  const px = qx - 1.2 * k, py = qy - h * 0.6;
  const pescador = `M${f1(px - 1.6 * k)} ${f1(py)}L${f1(px - 1.1 * k)} ${f1(py - 4.2 * k)}L${f1(px + 1.1 * k)} ${f1(py - 4.2 * k)}L${f1(px + 1.6 * k)} ${f1(py)}Z`
    + `M${f1(px - 2.6 * k)} ${f1(py - 4.4 * k)}L${f1(px + 2.6 * k)} ${f1(py - 4.4 * k)}L${f1(px + 1 * k)} ${f1(py - 5.7 * k)}L${f1(px - 1 * k)} ${f1(py - 5.7 * k)}Z`;
  const remo = `M${f1(px + 0.8 * k)} ${f1(py - 2.6 * k)}L${f1(px + 6.4 * k)} ${f1(qy + 2.8 * k)}`;
  const lx = qx + l / 2 - 1.6 * k, ly = qy - h - 3.4 * k;
  const cayuco = `<g class="v-cayuco"><path class="v-cy-cuerpo v-cy-remo" d="${remo}" stroke-width="${f1(0.7 * k)}"/><path class="v-cy-cuerpo v-cy-casco" d="${casco}"/><path class="v-cy-cuerpo v-cy-borda" d="${borda}"/><path class="v-cy-cuerpo v-cy-pescador" d="${pescador}M${f1(lx - 0.25 * k)} ${f1(qy - h * 0.6)}L${f1(lx - 0.25 * k)} ${f1(ly)}h${f1(0.5 * k)}L${f1(lx + 0.25 * k)} ${f1(qy - h * 0.6)}Z"/>`
    + `<circle class="v-cy-halo" cx="${f1(lx)}" cy="${f1(ly)}" r="${f1(9 * k)}" fill="url(#m-farol)"/><circle class="v-cy-lampara" cx="${f1(lx)}" cy="${f1(ly)}" r="${f1(1 * k)}"/>`
    + `<path class="v-cy-reflejo" d="M${f1(lx)} ${f1(qy + h * 0.9)}l0 ${f1(5.5 * k)}" stroke-width="${f1(1.3 * k)}"/></g>`;
  return garza + cayuco;
}

// ------------------------------------------------------------------------------------------------ luces, piscuchas y grabado
/** Las luces del valle (idea 47): un punto cálido y quieto por mes del libro, en caseríos; dos trazos (las lejanas, más chicas). */
export function lucesValle(puntos, k = 1, capa = 0) {
  const d = puntos.filter((p) => p[2] === capa).map((p) => `M${P(p)}h0.01`).join('');
  return `<path class="v-luces ${capa ? 'v-luz-cerca' : 'v-luz-lejos'}" d="${d}" stroke-width="${f1((capa ? 2.1 : 1.5) * Math.min(1.2, k))}"/>`;
}
/** Las piscuchas (idea 22): una por persona con cuenta, de colores de aquí (no el de nadie: ninguna se puede asociar a una persona). */
export function piscuchas(lista) {
  const hilos = lista.map(({ x, y, k, hilo }) => `M${P([x, y + k])}Q${P([(x + hilo[0]) / 2 + 8 * k, (y + hilo[1]) / 2 + 14 * k])} ${P(hilo)}`).join('');
  return `<g class="efecto-ambiente v-piscuchas" aria-hidden="true"><path class="v-pis-hilo" d="${hilos}"/>${lista.map(({ x, y, k, i }) => {
    const a = 6.4 * k, b = 9.6 * k; // medio ancho y alto
    const arriba = [x, y - b * 0.42], abajo = [x, y + b * 0.58], izq = [x - a, y - b * 0.1], der = [x + a, y - b * 0.1], cruz = [x, y - b * 0.1];
    // La cola con sus moños (crucecitas sobre la misma línea).
    const cola = `M${P(abajo)}q${f1(-3 * k)} ${f1(4 * k)} 0 ${f1(7 * k)}t0 ${f1(7 * k)}t0 ${f1(6 * k)}`
      + [5, 11.5, 18].map((t) => `M${f1(x - 1.4 * k)} ${f1(y + b * 0.58 + t * k - 0.9 * k)}l${f1(2.8 * k)} ${f1(1.8 * k)}M${f1(x + 1.4 * k)} ${f1(y + b * 0.58 + t * k - 0.9 * k)}l${f1(-2.8 * k)} ${f1(1.8 * k)}`).join('');
    return `<g class="v-pis v-pis-${i % 6}"><path class="v-pis-cola" d="${cola}" stroke-width="${f1(0.7 * k)}"/>`
      + `<path class="v-pis-a" d="${poli([arriba, der, abajo, cruz])}${poli([izq, arriba, cruz])}"/><path class="v-pis-b" d="${poli([izq, cruz, abajo])}"/></g>`;
  }).join('')}</g>`;
}
/**
 * El grabado de las noches de luna llena (idea 27): en la roca, las iniciales de la familia y la fecha de la primera compra, dentro de un
 * cartucho como los petroglifos. Dos copias: el surco (oscuro) y su filo de luz de luna. Nadie lo explica.
 */
export function grabadoLuna({ x, y, k, iniciales, fecha }) {
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const a = 31 * k, b = 13 * k;
  const marco = `M${f1(x - a)} ${f1(y - b * 0.4)}Q${f1(x - a * 1.02)} ${f1(y - b)} ${f1(x - a * 0.7)} ${f1(y - b * 1.05)}L${f1(x + a * 0.72)} ${f1(y - b * 0.98)}Q${f1(x + a * 1.03)} ${f1(y - b * 0.9)} ${f1(x + a)} ${f1(y - b * 0.3)}`
    + `L${f1(x + a * 0.98)} ${f1(y + b * 0.5)}Q${f1(x + a)} ${f1(y + b * 1.02)} ${f1(x + a * 0.66)} ${f1(y + b)}L${f1(x - a * 0.7)} ${f1(y + b * 1.04)}Q${f1(x - a * 1.03)} ${f1(y + b * 0.95)} ${f1(x - a)} ${f1(y + b * 0.4)}Z`;
  return `<g class="v-grabado" aria-hidden="true"><path class="v-gr-surco" d="${marco}" stroke-width="${f1(1.1 * k)}"/>`
    + `<text class="v-gr-texto" x="${f1(x)}" y="${f1(y - 1.2 * k)}" text-anchor="middle" font-size="${f1(8.4 * k)}" stroke-width="${f1(0.35 * k)}">${esc(iniciales)}</text>`
    + `<text class="v-gr-texto" x="${f1(x)}" y="${f1(y + 7.4 * k)}" text-anchor="middle" font-size="${f1(5.6 * k)}" stroke-width="${f1(0.3 * k)}">${esc(fecha)}</text></g>`;
}
