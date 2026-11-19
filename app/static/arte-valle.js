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
export function sitiosValle({ W, H, techo = 0, izq, der = [], cresta = [], bx, by, pts = [], lago = null, personas = 0, meses = 0, anios = 0, primera = null, astro = null, volcanes = null }) {
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
  // La vida del lago se coloca con el lago. (Campamento 22B) Las vacas, en la orilla del lago con más sitio.
  const vacas = vacasSitios({ W, lago, pts, k, forma, sx: der[0]?.[0] });
  // Las bandadas (campamento 22B): el remolino de azacuanes y los pericos, en el cielo libre.
  const aves = avesSitios({ W, H, techo, cresta, forma, k, cima: der[0] ?? [W / 2, H / 2], astro, xIzq, xDer, volcanes });
  return { forma, k, canton, milpa, pino, camino, arbol, luces, piscuchas, lago, vacas, aves, ventanas: Math.max(0, Math.floor(personas) || 0) };
}

/**
 * Dónde pastan las vacas (idea 58): en la orilla del lago con más sitio, mirando al agua; una en el teléfono, dos en la tablet y tres en
 * escritorio (las que quepan). Nunca a menos de 13 unidades del sendero (ni ellas ni la garcita de atrás) ni fuera de la escena; si
 * la orilla queda cerca de una vuelta del sendero, la primera se corre un poco hacia abajo (más cerca de quien mira).
 */
export function vacasSitios({ W, lago, pts, k, forma, sx = W / 2 }) {
  if (!lago) return [];
  const n = forma === 'esc' ? 3 : forma === 'tab' ? 2 : 1, paso = 17 * k, s = forma === 'esc' ? 1.05 : 1;
  const libre = (x, y) => x > 9 * k && x < W - 9 * k && distLinea(x, y - 4 * k, pts) > 13 * k;
  let mejor = [];
  const fuera = lago.cx >= sx ? 1 : -1; // primero la orilla de afuera (la que da al campo, no a la montaña)
  for (const lado of [fuera, -fuera]) {
    for (const baja of [0, 0.9, 1.6]) {
      const x0 = lago.cx + lado * (lago.rx + 9 * k), out = [];
      for (let i = 0; i < n; i++) {
        const x = x0 + lado * i * paso, y = lago.cy + lago.ry * (0.2 + baja + 0.35 * (i % 2));
        if (!libre(x - 8 * k, y) || !libre(x + 8 * k, y) || !libre(x + lado * 11 * k, y)) break; // (y la garcita de atrás)
        out.push({ x, y, s, dir: -lado * (i === 1 ? -1 : 1) }); // miran al agua (la segunda, al otro lado)
      }
      if (out.length > mejor.length) mejor = out;
      if (mejor.length === n) return mejor;
    }
  }
  return mejor;
}

/**
 * Dónde vuelan las bandadas (idea 57). En el teléfono y la tablet, el remolino de azacuanes va sobre el valle, a la izquierda de la
 * montaña, entre el saldo y la sierra; en escritorio y acostado, entre la cumbre y el astro (la columna de la izquierda es del saldo).
 * Los pericos entran por el borde derecho, por debajo del saldo, y vuelan hacia la montaña: en el teléfono y la tablet la cruzan por
 * detrás y salen por la izquierda; en escritorio y acostado se pierden detrás de ella (`dist`: cuánto recorren): vuelan a una altura
 * donde la montaña es más ancha que la bandada, por encima de los volcanes del fondo (`volcanes`, la y de sus cumbres), y acaban todos
 * tapados por ella (si no, asomarían junto a la cumbre y se apagarían de golpe).
 */
export const alturaVolcanes = (W, H) => Math.min(H * (W < 1100 ? 0.11 : 0.12), W * (W < 700 ? 0.14 : 0.1)); // la misma cuenta que `arte.volcanes`
export function avesSitios({ W, H, techo, cresta, forma, k, cima: [sx, sy], astro, xIzq, xDer = () => W, volcanes = null }) {
  const alta = cresta.length ? Math.min(...cresta.filter(([x]) => x < W * 0.45).map((p) => p[1])) : H * 0.6;
  const ancho = forma === 'esc' || forma === 'acostado';
  const [ax, ay] = astro ?? [W * 0.85, H * 0.25];
  let aza, peri, dist;
  if (ancho) {
    aza = [(sx + ax) / 2, Math.max(sy + 30 * k, ay - H * 0.02)];
    const bandada = 80 * k, yMin = Math.max(sy + 16 * k, ay - H * 0.05), yMax = Math.max(yMin, (volcanes ?? H) - 10 * k);
    let y = yMin;
    while (y < yMax && xDer(y + 9) - xIzq(y + 9) < bandada + 24 * k) y += 3;
    peri = [W + 8 * k, Math.min(y, yMax)];
    dist = peri[0] + bandada - (xDer(peri[1] + 9) - 10 * k); // el último pájaro acaba ya detrás de la montaña
  } else {
    // (Por debajo de la cumbre: en la entrada el lienzo sube y lo de arriba queda detrás de la marca.)
    const y = Math.max(sy + 40 * k, techo + (alta - techo) * 0.42);
    aza = [Math.min(W * 0.22, (xIzq(y) || W) - 30 * k), y];
    peri = [W + 8 * k, Math.max(sy + 60 * k, techo + (alta - techo) * 0.6)];
    dist = W + 110 * k;
  }
  return { aza, peri, k, dist };
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

// ------------------------------------------------------------------------------------------------ la loma lejana (antes, el cantón)
/**
 * La loma del valle de atrás, a la izquierda de la montaña y detrás de su falda: su cara al astro, su cara en sombra y un filo de luz.
 * Sobre ella, de noche, las luces lejanas (`lucesValle`, capa 1) y, al amanecer, el mar de niebla la deja como una isla. (Campamento
 * 22C: los ranchos bajaron al pueblo del primer plano, `arte-pueblo.js`; aquí queda la loma.)
 */
export function canton({ x, y, k, n, H = 900 }) {
  const span = (RANCHOS[n - 1][0] + ANCHO_RANCHO) * k;
  const xa = x - 26 * k, xb = x + span + 6 * k, fondo = H + 12;
  const cima = crestaLoma({ x, y, k, n });
  const suave = (pts) => `M${P(pts[0])}${pts.slice(1).map((q, i) => `Q${P(pts[i])} ${P([(pts[i][0] + q[0]) / 2, (pts[i][1] + q[1]) / 2])}`).join('')}L${P(pts[pts.length - 1])}`;
  const lomaBase = `${suave(cima)}L${f1(xb + 96 * k)} ${f1(fondo)}L-30 ${f1(fondo)}Z`;
  const lomaS = poli([[xa - 44 * k, y + 20 * k], [xa - 10 * k, y + 5 * k], [x + 4 * k, y + 30 * k], [x - 22 * k, fondo], [-30, fondo], [-30, y + 46 * k]]);
  const lomaL = poli([[xb, y + 1.5 * k], [xb + 34 * k, y + 13 * k], [xb + 96 * k, y + 44 * k], [xb + 96 * k, fondo], [xb + 6 * k, fondo], [x + span * 0.6, y + 26 * k]]);
  const filo = `M${P([xa - 10 * k, y + 5 * k])}Q${P([x + span * 0.35, y - 1.5 * k])} ${P([xb, y + 1.5 * k])}`;
  return `<g class="v-loma-lejos" aria-hidden="true"><path class="v-loma" d="${lomaBase}" fill="url(#m-v-loma)"/><path class="v-loma-s" d="${lomaS}"/><path class="v-loma-l" d="${lomaL}"/><path class="v-loma-filo" d="${filo}" stroke-width="${f1(0.9 * k)}"/></g>`;
}

// ------------------------------------------------------------------------------------------------ vacas y garzas (campamento 22B, idea 58)
// Una vaca criolla de perfil (mirando a la derecha), en unidades: el suelo en y = 0 y el lomo arriba, con su giba (como las cebú de aquí)
// y la papada. De pie: el lomo y la cabeza al astro (luz) y el resto en sombra (panza, patas, cola). Echada: un bulto bajo, la cabeza alta.
const VACA_PIE = [[-5.5, -4.6], [-5.6, -6.3], [-4.6, -6.9], [-1, -6.8], [1, -7.1], [1.9, -8.1], [3, -7.8], [3.6, -7], [4.2, -7.6], [4.9, -7.5], [5.4, -6.9], [6.9, -5.2], [6.7, -4.4], [5.8, -4.3], [4.6, -4.6], [3.8, -3.7], [2.9, -3.1], [-0.6, -2.8], [-3.6, -3], [-4.9, -3.4]];
const VACA_PIE_LUZ = [[-5.6, -6.3], [-4.6, -6.9], [-1, -6.8], [1, -7.1], [1.9, -8.1], [3, -7.8], [3.6, -7], [4.2, -7.6], [4.9, -7.5], [5.4, -6.9], [6.3, -5.9], [4.9, -6.2], [3.4, -5.9], [1.6, -5.5], [-1.6, -5.2], [-4.4, -5.3], [-5.6, -5.6]];
const PATAS = [[-4.3, -3.6], [-3.1, -3.4], [1.9, -3.4], [2.9, -3.3]];
const VACA_ECHADA = [[-5.4, 0], [-5.6, -1.6], [-4.6, -3.7], [-1.2, -4.4], [1.2, -4.5], [2.1, -5.5], [3.1, -5.3], [3.7, -4.7], [4.4, -6.1], [5.2, -5.5], [6.4, -4.2], [5.6, -3.6], [4.6, -3.4], [3.8, -2.4], [4.9, -0.8], [5, 0]];
const VACA_ECHADA_LUZ = [[-5.6, -1.6], [-4.6, -3.7], [-1.2, -4.4], [1.2, -4.5], [2.1, -5.5], [3.1, -5.3], [3.7, -4.7], [4.4, -6.1], [5.2, -5.5], [5.8, -4.9], [4.4, -4.6], [2.4, -3.6], [-1.6, -3.3], [-5.3, -2.4]];
const GARCITA = [[-1.4, -2.5], [0.4, -3.1], [1.2, -3.6], [1.3, -4.6], [2.4, -4.5], [1.7, -4.1], [1.4, -3], [0.3, -2.1], [-1.2, -2]];
/**
 * Las vacas, quietas, con sus garcitas (garzas bueyeras) blancas: una en el lomo de la primera y otra a sus patas, del lado de atrás. De
 * día están de pie; de noche, echadas y sin garcitas (duermen en los árboles). Seis trazos para todas: la sombra de contacto, la luz y la
 * sombra de pie, la luz y la sombra echadas, y las garcitas. `vacas`: [{ x, y, s, dir }] (dir = hacia dónde miran).
 */
export function potrero({ vacas = [], k = 1 }) {
  if (!vacas.length) return '';
  const tr = (pts, { x, y, s, dir }, dx = 0, dy = 0) => poli(pts.map(([px, py]) => [x + dir * (px + dx) * s * k, y + (py + dy) * s * k]));
  let sombra = '', pieL = '', pieS = '', echL = '', echS = '', garcitas = '';
  vacas.forEach((v, i) => {
    const { x, y, s } = v, a = 6.6 * s * k;
    sombra += `M${f1(x - a)} ${f1(y + 0.2 * k)}a${f1(a)} ${f1(1.2 * s * k)} 0 1 0 ${f1(2 * a)} 0a${f1(a)} ${f1(1.2 * s * k)} 0 1 0 ${f1(-2 * a)} 0Z`;
    pieS += tr(VACA_PIE, v);
    for (const [px, py] of PATAS) pieS += tr([[px - 0.4, py], [px + 0.4, py], [px + 0.32, 0], [px - 0.32, 0]], v);
    pieS += tr([[-5.2, -6], [-4.8, -5.9], [-5.5, -2.5], [-5.9, -2.6]], v); // la cola
    pieL += tr(VACA_PIE_LUZ, v);
    echS += tr(VACA_ECHADA, v);
    echL += tr(VACA_ECHADA_LUZ, v);
    if (i === 0) {
      garcitas += tr(GARCITA, v, -1.4, -4.8) + tr(GARCITA, v, -9.6, 0);
      pieS += tr([[-9.72, -2.1], [-9.42, -2.1], [-9.42, 0], [-9.72, 0]], v); // sus patas
    } else if (i === 2) garcitas += tr(GARCITA, v, 9, 0);
  });
  return `<path class="v-vaca-sombra" d="${sombra}"/><path class="v-vaca v-vaca-pie v-vaca-s" d="${pieS}"/><path class="v-vaca v-vaca-pie v-vaca-l" d="${pieL}"/>`
    + `<path class="v-vaca v-vaca-echada v-vaca-s" d="${echS}"/><path class="v-vaca v-vaca-echada v-vaca-l" d="${echL}"/><path class="v-garcita" d="${garcitas}"/>`;
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
  // (22C) En Navidad, luminarias (farolitos de papel) a los dos lados del camino real, una de cada dos piedras.
  const luminarias = [...izq, ...der].filter((_, i) => i % 2 === 1).map(([x, y]) => `M${f1(x)} ${f1(y - 0.8 * k)}h0.01`).join('');
  return `<path class="v-cm-talud" d="${talud}"/><path class="v-cm" d="${poli([...izq, ...der.reverse()])}"/>`
    + `<path class="v-cm-cerco" d="${piedras}" stroke-width="${f1(1.8 * k)}"/><path class="v-cm-poste" d="${palos}" stroke-width="${f1(0.9 * k)}"/><path class="v-cm-brote" d="${brotes}" stroke-width="${f1(0.8 * k)}"/>`
    + `<path class="v-navidad v-cm-luminaria" d="${luminarias}" stroke-width="${f1(2.4 * Math.min(1.6, k))}"/>`;
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
  // (Campamento 38, idea 120) El pescador es un oso polar, como los vecinos del pueblo: cuerpo y cabeza blancos con sus orejas, el
  // hocico y el sombrero de palma, y la nariz y el ojo oscuros (mira a la lámpara). De noche, como siempre, solo la lámpara y su reflejo.
  const qx = cx + rx * 0.08, qy = cy + ry * 0.12, l = 15 * k, h = 2.2 * k;
  const casco = poli([[qx - l / 2, qy - h * 0.6], [qx + l / 2, qy - h * 0.8], [qx + l / 2 - 2.4 * k, qy + h * 0.5], [qx - l / 2 + 2 * k, qy + h * 0.5]]);
  const borda = poli([[qx - l / 2, qy - h * 0.6], [qx + l / 2, qy - h * 0.8], [qx + l / 2 - 0.6 * k, qy - h * 0.2], [qx - l / 2 + 0.6 * k, qy - h * 0.05]]);
  const px = qx - 1.2 * k, py = qy - h * 0.6;
  const ov = (x, y, a, b) => `M${f1(x - a)} ${f1(y)}a${f1(a)} ${f1(b)} 0 1 0 ${f1(2 * a)} 0a${f1(a)} ${f1(b)} 0 1 0 ${f1(-2 * a)} 0Z`;
  const oso = ov(px, py - 1.7 * k, 1.75 * k, 1.9 * k) + ov(px + 0.2 * k, py - 4.3 * k, 1.4 * k, 1.25 * k) + ov(px - 0.95 * k, py - 5.3 * k, 0.5 * k, 0.5 * k) + ov(px + 1.35 * k, py - 5.3 * k, 0.5 * k, 0.5 * k);
  const sombrero = ov(px + 0.2 * k, py - 5.55 * k, 2.5 * k, 0.45 * k) + `M${f1(px - 0.7 * k)} ${f1(py - 5.6 * k)}L${f1(px + 1.1 * k)} ${f1(py - 5.6 * k)}L${f1(px + 0.9 * k)} ${f1(py - 6.6 * k)}L${f1(px - 0.5 * k)} ${f1(py - 6.6 * k)}Z` + ov(px + 0.85 * k, py - 4.0 * k, 0.65 * k, 0.45 * k);
  const pescador = ov(px + 1.25 * k, py - 4.15 * k, 0.28 * k, 0.22 * k) + ov(px + 0.55 * k, py - 4.75 * k, 0.17 * k, 0.17 * k);
  const remo = `M${f1(px + 0.8 * k)} ${f1(py - 2.6 * k)}L${f1(px + 6.4 * k)} ${f1(qy + 2.8 * k)}`;
  const lx = qx + l / 2 - 1.6 * k, ly = qy - h - 3.4 * k;
  const cayuco = `<g class="v-cayuco"><path class="v-cy-cuerpo v-cy-remo" d="${remo}" stroke-width="${f1(0.7 * k)}"/><path class="v-cy-cuerpo v-cy-casco" d="${casco}"/><path class="v-cy-cuerpo v-cy-borda" d="${borda}"/><path class="v-cy-cuerpo v-cy-oso" d="${oso}"/><path class="v-cy-cuerpo v-cy-sombrero" d="${sombrero}"/><path class="v-cy-cuerpo v-cy-pescador" d="${pescador}M${f1(lx - 0.25 * k)} ${f1(qy - h * 0.6)}L${f1(lx - 0.25 * k)} ${f1(ly)}h${f1(0.5 * k)}L${f1(lx + 0.25 * k)} ${f1(qy - h * 0.6)}Z"/>`
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
/**
 * Los hilos de las piscuchas: de cada una a su ancla (la manita de un osezno o el poste del farol, campamento 35). Aparte de las
 * piscuchas porque cambian con el turno del pueblo (van en el grupo de los vecinos); los mismos `efecto-ambiente v-piscuchas`.
 */
export function hilosPiscuchas(lista, anclas) {
  const d = lista.map(({ x, y, k }, i) => (anclas[i] ? `M${P([x, y + k])}Q${P([(x + anclas[i][0]) / 2 + 8 * k, (y + anclas[i][1]) / 2 + 14 * k])} ${P(anclas[i])}` : '')).join('');
  return d ? `<path class="efecto-ambiente v-piscuchas v-pis-hilo" d="${d}"/>` : '';
}
export function piscuchas(lista) {
  // (Sin grupo de afuera: cada pieza lleva `efecto-ambiente v-piscuchas`; el ritmo de cada una, por clase.) Sin `hilo`, sin hilo: desde
  // el campamento 35 los pone el grupo de los vecinos (`hilosPiscuchas`), que cambia con el turno.
  if (!lista.length) return '';
  return `${hilosPiscuchas(lista, lista.map((q) => q.hilo))}${lista.map(({ x, y, k, i }) => {
    const a = 6.4 * k, b = 9.6 * k; // medio ancho y alto
    const arriba = [x, y - b * 0.42], abajo = [x, y + b * 0.58], izq = [x - a, y - b * 0.1], der = [x + a, y - b * 0.1], cruz = [x, y - b * 0.1];
    // La cola con sus moños (crucecitas sobre la misma línea).
    const cola = `M${P(abajo)}q${f1(-3 * k)} ${f1(4 * k)} 0 ${f1(7 * k)}t0 ${f1(7 * k)}t0 ${f1(6 * k)}`
      + [5, 11.5, 18].map((t) => `M${f1(x - 1.4 * k)} ${f1(y + b * 0.58 + t * k - 0.9 * k)}l${f1(2.8 * k)} ${f1(1.8 * k)}M${f1(x + 1.4 * k)} ${f1(y + b * 0.58 + t * k - 0.9 * k)}l${f1(-2.8 * k)} ${f1(1.8 * k)}`).join('');
    const ritmo = [' v-pis-r2', ' v-pis-r3', ' v-pis-r2', '', ' v-pis-r3', ''][i % 6];
    return `<g class="efecto-ambiente v-piscuchas v-pis v-pis-${i % 6}${ritmo}"><path class="v-pis-cola" d="${cola}" stroke-width="${f1(0.7 * k)}"/>`
      + `<path class="v-pis-a" d="${poli([arriba, der, abajo, cruz])}${poli([izq, arriba, cruz])}"/><path class="v-pis-b" d="${poli([izq, cruz, abajo])}"/></g>`;
  }).join('')}`;
}
// ------------------------------------------------------------------------------------------------ campamento 22B · el mar de niebla (idea 55)
/**
 * De 5:00 a 7:30 la niebla llena el valle por detrás de la montaña y la loma del cantón asoma como una isla. Dos capas: detrás de la
 * loma (tapa el pie de la sierra media, cuyos lomos asoman) y delante de su falda, por debajo de la milpa (nunca delante de la montaña,
 * el sendero ni los rótulos). Son planos, como todo en la escena: el cuerpo, opaco, y en la capa de delante una cresta que recibe la luz,
 * más tenue, que hace de borde suave. Sin degradados ni desenfoques. La opacidad la pone el CSS con `--v-mar` (cielo.js): se forma y se
 * levanta con la hora sin redibujar.
 */
export function marDeNiebla({ W, H, canton, milpa, k, cresta = [], techo = 0 }) {
  const borde = (y0, semilla, paso, alto) => {
    // Lomos redondos de distinto alto (puntos fijos con su azar propio): cada tramo se abomba hacia arriba como el lomo de una nube.
    const rnd = azar(semilla), pts = [];
    for (let x = -30; x <= W + 30 + paso; x += paso * (0.6 + rnd() * 0.8)) pts.push([x, y0 - rnd() * 2 * k]);
    return `M${P(pts[0])}${pts.slice(1).map((q, i) => `Q${P([(pts[i][0] + q[0]) / 2, Math.min(pts[i][1], q[1]) - (alto * (0.4 + rnd() * 0.9)) * k])} ${P(q)}`).join('')}`;
  };
  const fin = `L${f1(W + 30)} ${f1(H + 10)}L-30 ${f1(H + 10)}Z`;
  // La de atrás llena el valle hasta media altura de la sierra media (sus lomos más altos asoman), nunca por encima del saldo ni de las
  // casas; la de delante empieza por debajo de la milpa. Cada capa: la cresta al sol (más clara) y, unos píxeles más abajo, el cuerpo.
  const ys = cresta.map((p) => p[1]), arriba = ys.length ? Math.min(...ys) : canton.y - 40 * k, abajo = ys.length ? Math.max(...ys) : canton.y;
  const yAtras = Math.max(techo + 24, Math.min(canton.y - 18 * k, arriba + (abajo - arriba) * 0.62)), yFrente = Math.max(canton.y + 12 * k, milpa.y + milpa.h + milpa.caida + 4 * k);
  // La capa que más se ve (la de delante en el teléfono, la de atrás en los demás) lleva además su parte en sombra: la niebla de más
  // cerca, más fría, que le da hondura (sin ella era un llano blanco).
  const capa = (y0, semilla, paso, clase, hondo) => `<path class="v-mar v-mar-luz ${clase}" d="${borde(y0, semilla, paso, 6)}${fin}"/><path class="v-mar v-mar-cuerpo ${clase}" d="${borde(y0 + 4 * k, semilla + 1, paso * 1.4, 4)}${fin}"/>`
    + (hondo ? `<path class="v-mar v-mar-sombra ${clase}" d="${borde(y0 + hondo, semilla + 2, paso * 2.2, 3)}${fin}"/>` : '');
  const tel = W < 700 || (H <= 520 && W >= H * 1.5 && W < 1100);
  return { atras: capa(yAtras, 41, 34 * k, 'v-mar-atras', tel ? 0 : Math.max(20 * k, (yFrente - yAtras) * 0.42)), frente: capa(yFrente, 43, 30 * k, 'v-mar-frente', tel ? 24 * k : 0) };
}

// ------------------------------------------------------------------------------------------------ campamento 22B · aves de paso (idea 57)
/**
 * Las bandadas del cielo (ambiente, solo con «todos»; una a la vez, lo decide `data-mueve`): los azacuanes, un remolino de gavilanes
 * que planean en círculos (alas abiertas, sin aletear), y los pericos del atardecer, una banda de dardos verdes de cola larga que cruza
 * deprisa hacia la montaña. Cuatro trazos: dos medias bandadas de cada una, que el CSS mueve a destiempo. `aza`: el centro del
 * remolino; `peri`: dónde empiezan los pericos (al borde derecho).
 */
export function bandadas({ aza, peri, k = 1 }) {
  const rnd = azar(53);
  const halcones = ['', ''];
  for (let i = 0; i < 14; i++) {
    // Repartidos en una nube más alta que ancha (el remolino sube); los de atrás, más chicos; cada uno, algo ladeado.
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()), x = aza[0] + Math.cos(a) * r * 22 * k, y = aza[1] + Math.sin(a) * r * 17 * k;
    const s = (0.8 + rnd() * 0.45) * k, t = (rnd() - 0.5) * 1.4;
    halcones[i % 2] += `M${f1(x - 2.7 * s)} ${f1(y + (0.5 + t) * s)}Q${f1(x - 1.3 * s)} ${f1(y - (0.7 - t * 0.3) * s)} ${f1(x)} ${f1(y)}Q${f1(x + 1.3 * s)} ${f1(y - (0.7 + t * 0.3) * s)} ${f1(x + 2.7 * s)} ${f1(y + (0.5 - t) * s)}`;
  }
  const pericos = ['', ''];
  for (let i = 0; i < 10; i++) {
    // En fila suelta, volando a la izquierda: cabeza, cuerpo y la cola larga en punta; el ala arriba o abajo según el pájaro.
    const x = peri[0] + i * 7.5 * k + rnd() * 4 * k, y = peri[1] + Math.sin(i * 1.7) * 3 * k + rnd() * 2 * k, s = (0.9 + rnd() * 0.3) * k, ala = i % 2 ? -1 : 1;
    pericos[i % 2] += `M${f1(x)} ${f1(y)}L${f1(x + 2.2 * s)} ${f1(y - 0.6 * s)}L${f1(x + 5.8 * s)} ${f1(y + 0.5 * s)}L${f1(x + 2.2 * s)} ${f1(y + 0.6 * s)}Z`
      + `M${f1(x + 1.3 * s)} ${f1(y)}L${f1(x + 3.1 * s)} ${f1(y)}L${f1(x + 2.5 * s)} ${f1(y - ala * 2.3 * s)}Z`;
  }
  const sw = f1(0.85 * k);
  return halcones.map((d, i) => `<path class="efecto-ambiente v-ave v-aza v-av${i + 1}" d="${d}" stroke-width="${sw}"/>`).join('')
    + pericos.map((d, i) => `<path class="efecto-ambiente v-ave v-peri v-av${i + 1}" d="${d}"/>`).join('');
}

// ------------------------------------------------------------------------------------------------ campamento 22B · zompopos de mayo (idea 60)
/**
 * Del 15 al 21 de mayo, cuando se levanta la niebla, los zompopos alados salen de la tierra y suben sobre la milpa (ambiente, solo con
 * «todos»). Dos trazos de puntitos oscuros, cada uno una columna suelta, que el CSS hace subir y desvanecerse a destiempo.
 */
export function zompopos({ milpa: { x, y, w }, k = 1 }) {
  const rnd = azar(37), d = ['', ''];
  for (let i = 0; i < 18; i++) {
    const px = x + w * (0.15 + rnd() * 0.75) + (rnd() - 0.5) * 6 * k, py = y - rnd() * 32 * k;
    d[i % 2] += `M${f1(px)} ${f1(py)}h0.01`;
  }
  return d.map((t, i) => `<path class="efecto-ambiente v-zompopos v-zo${i + 1}" d="${t}" stroke-width="${f1(1.3 * Math.min(1.3, k))}"/>`).join('');
}

// ------------------------------------------------------------------------------------------------ campamento 22B · relámpagos lejanos (idea 61)
/**
 * Una tormenta lejana detrás de los volcanes (noches de la lluviosa; ambiente, solo con «todos»): un cumulonimbo con su yunque que se
 * enciende por dentro de vez en cuando, muy leve. Un solo trazo con un degradado radial (`#m-v-rayo`); los volcanes van delante y su
 * silueta se recorta contra la nube encendida. En el teléfono y la tablet, sobre el valle (izquierda); en escritorio y acostado, a la
 * derecha de la cumbre (a la izquierda está el saldo: nunca se enciende el fondo de una cifra).
 */
export function sitioRayo(W, H, base) {
  const ancho = formaValle(W, H) === 'esc' || formaValle(W, H) === 'acostado';
  const A = alturaVolcanes(W, H);
  // La base de la nube va a media ladera de los volcanes: el yunque asoma por encima de sus cumbres y lo de abajo queda tapado.
  return { x: W * (ancho ? 0.74 : 0.26), y: base - A * (ancho ? 0.8 : 0.6), ancho: W * (ancho ? 0.14 : 0.42) };
}
export function relampago({ x, y, ancho }) {
  const a = ancho / 2, h = ancho * 0.42;
  const p = (dx, dy) => `${f1(x + dx * a)} ${f1(y + dy * h)}`;
  // La base sobre el horizonte, las torres de la nube y el yunque plano arriba, más largo hacia un lado.
  const d = `M${p(-1, 0)}C${p(-1.05, -0.3)} ${p(-0.82, -0.42)} ${p(-0.64, -0.4)}C${p(-0.6, -0.7)} ${p(-0.36, -0.78)} ${p(-0.2, -0.74)}`
    + `L${p(-0.5, -0.92)}L${p(0.85, -1)}L${p(0.42, -0.8)}C${p(0.6, -0.72)} ${p(0.74, -0.5)} ${p(0.66, -0.36)}C${p(0.9, -0.36)} ${p(1.04, -0.16)} ${p(1, 0)}Z`;
  return `<path class="efecto-ambiente v-rayo" d="${d}" fill="url(#m-v-rayo)"/>`;
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
  return `<path class="v-grabado v-gr-surco" d="${marco}" stroke-width="${f1(1.1 * k)}"/>`
    + `<text class="v-grabado v-gr-texto" x="${f1(x)}" y="${f1(y - 1.2 * k)}" text-anchor="middle" font-size="${f1(8.4 * k)}" stroke-width="${f1(0.35 * k)}">${esc(iniciales)}</text>`
    + `<text class="v-grabado v-gr-texto" x="${f1(x)}" y="${f1(y + 7.4 * k)}" text-anchor="middle" font-size="${f1(5.6 * k)}" stroke-width="${f1(0.3 * k)}">${esc(fecha)}</text>`;
}
