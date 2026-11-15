// Los tres dibujos de «Tu historia» (campamento 13): el tronco, la constelación y el mojón. Funciones puras: reciben los datos que arma
// `lib.js` (`aniosTronco`, `estrellasConstelacion`, `piedrasMojon`) y devuelven un `<svg>` como texto; no tocan el DOM ni usan azar.
//
// CONTRATO (lo usa `historia.js`; el dibujo es libre mientras se cumpla):
//  · Cada función devuelve un solo `<svg viewBox="0 0 320 320" aria-hidden="true" focusable="false">` (el contenedor lleva el `role="img"`).
//  · Cada pieza tocable lleva `data-anio` (anillo del tronco) o `data-i` (estrella o piedra, el índice del dato) y la clase `.pieza`.
//  · `sel` es el año (tronco) o el índice (constelación, mojón) seleccionado, o null: la pieza elegida lleva además la clase `sel`.
//  · Colores solo con variables CSS (`var(--…)`) o clases del bloque «Campamento 13» de styles.css; sin estilos en línea (la CSP los
//    bloquea); animaciones solo con transform/opacity y solo con efectos «todos» (clase `efecto-ambiente`).
//  · Poco coste: el tronco, una pieza por año; la constelación hasta 1,000 estrellas (usa `<path>`s agrupados, no un nodo pesado por
//    estrella); el mojón, hasta 40 piedras.
const f1 = (n) => n.toFixed(1);
const MARCO = 'viewBox="0 0 320 320" aria-hidden="true" focusable="false"';

/** Tronco: un anillo por año (el más viejo al centro). El ancho de cada anillo sale de `comprados`. */
export function tronco(anios, { sel = null } = {}) {
  const max = Math.max(1, ...anios.map((y) => y.comprados));
  let r = 10, s = `<svg ${MARCO}>`;
  for (const y of anios) {
    const w = 6 + 18 * (y.comprados / max);
    r += w / 2;
    s += `<circle class="pieza anillo${y.anio === sel ? ' sel' : ''}" data-anio="${y.anio}" cx="160" cy="160" r="${f1(r)}" fill="none" stroke-width="${f1(w)}"/>`;
    r += w / 2 + 2;
  }
  return `${s}</svg>`;
}

/** Constelación: una estrella por compra, en `x`/`y` (0 a 1) con brillo `mag`. */
export function constelacion(estrellas, { sel = null } = {}) {
  let s = `<svg ${MARCO}>`;
  for (const e of estrellas) s += `<circle class="pieza estrella${e.i === sel ? ' sel' : ''}" data-i="${e.i}" cx="${f1(10 + e.x * 300)}" cy="${f1(10 + e.y * 300)}" r="${f1(1 + 3 * e.mag)}"/>`;
  return `${s}</svg>`;
}

/** Mojón: una piedra por compra (o por grupo), de la más vieja abajo a la más nueva arriba; `tam` (0.35 a 1) es su tamaño. */
export function mojon(piedras, { sel = null } = {}) {
  let y = 310, s = `<svg ${MARCO}>`;
  const alto = Math.min(26, 280 / Math.max(1, piedras.length));
  for (const p of piedras) {
    const w = 40 + 120 * p.tam;
    y -= alto * 0.9;
    s += `<ellipse class="pieza piedra${p.i === sel ? ' sel' : ''}" data-i="${p.i}" cx="160" cy="${f1(y)}" rx="${f1(w / 2)}" ry="${f1(alto / 2)}"/>`;
  }
  return `${s}</svg>`;
}
