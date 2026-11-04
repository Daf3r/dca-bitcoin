// La montaña de la cabecera: el saldo en sats es la altitud y los hitos son campamentos.
import { escalaMontana, altitud, nombreHito, entero } from './lib.js';

const f1 = (n) => n.toFixed(1);

function azar(s) {
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** Composición según el tamaño: en móvil la cumbre baja para dejar el cielo al saldo. */
function composicion(W, H, techo) {
  // techo: dónde acaba el texto del saldo; la cumbre y su etiqueta quedan por debajo.
  // En móvil y tablet el botón fijo «Anotar compra» ocupa los últimos ~90 px: el sendero empieza por encima.
  if (W < 700) return { sx: W * 0.62, sy: Math.max(H * 0.43, techo + 70), base: [W * 0.14, H - 104], vueltas: 5, ancho: 0.34, campos: 3, sol: [W * 0.86, H * 0.47], rs: W * 0.1 };
  if (W < 1100) return { sx: W * 0.64, sy: Math.max(H * 0.3, techo + 70), base: [W * 0.2, H - 104], vueltas: 6, ancho: 0.27, campos: 4, sol: [W * 0.87, H * 0.3], rs: W * 0.07 };
  // Escritorio: el pico se dimensiona por la altura; el resto del ancho es cielo y cordillera.
  const mw = Math.min(W, H * 1.7);
  return { sx: W - mw * 0.42, sy: H * 0.16, base: [W - mw * 0.86, H * 0.95], vueltas: 7, ancho: mw * 0.26 / W, campos: 4, sol: [W - mw * 0.12, H * 0.24], rs: H * 0.08 };
}

let estado = null;

/**
 * Dibuja la escena en `host` con la escala de `sats` y deja a "Tú" en `inicio` (para animar luego con subir).
 */
export function dibujarMontana(host, { sats, meta, inicio = sats, techo = 0 }) {
  const W = Math.round(host.clientWidth), H = Math.round(host.clientHeight);
  if (!W || !H) return;
  const c = composicion(W, H, techo);
  const esc = escalaMontana(sats, c.campos);
  const rnd = azar(42);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="m-desc"><desc id="m-desc"></desc><g aria-hidden="true">`;
  [0, 0.17, 0.31, 0.43, 0.53].forEach((b, i) => { s += `<rect class="cielo-${i}" x="0" y="${f1(b * H)}" width="${W}" height="${f1(H - b * H)}"/>`; });
  for (let i = 0; i < 46; i++) s += `<circle class="estrella" cx="${f1(rnd() * W)}" cy="${f1(rnd() * H * 0.5)}" r="${f1(0.5 + rnd() * 1.1)}"/>`;
  s += `<circle class="halo" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs * 1.7)}"/><circle class="astro" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs)}"/>`;
  const sierra = (base, amp, paso, clase) => {
    let d = `M0 ${H}`;
    for (let x = 0; x <= W + paso; x += paso) d += `L${f1(x)} ${f1(base * H - (Math.sin(x / (W / 3.3) + base * 9) * 0.5 + rnd() * 0.6) * amp * H)}`;
    s += `<path class="${clase}" d="${d}L${W} ${H}Z"/>`;
  };
  sierra(c.sy / H + 0.2, 0.1, Math.max(24, W / 18), 'lejos');
  sierra(c.sy / H + 0.32, 0.09, Math.max(30, W / 14), 'medio');

  // Montaña: ladera izquierda larga (el sendero) y cara derecha en sombra.
  const piso = H * 0.99;
  const izqX = c.base[0] - W * 0.2;
  const izq = [], der = [];
  for (let k = 0; k <= 10; k++) {
    const f = k / 10, ruido = k && k < 10;
    izq.push([izqX + (c.sx - izqX) * f + (ruido ? (rnd() - 0.5) * W * 0.025 : 0), piso - (piso - c.sy) * f ** 0.92 + (ruido ? (rnd() - 0.5) * H * 0.025 : 0)]);
  }
  const derX = c.sx + (c.sx - izqX) * 0.95;
  for (let k = 1; k <= 8; k++) {
    const f = k / 8, ruido = k < 8;
    der.push([c.sx + (derX - c.sx) * f + (ruido ? (rnd() - 0.5) * W * 0.025 : 0), c.sy + (piso * 0.97 - c.sy) * f ** 0.8 + (ruido ? (rnd() - 0.5) * H * 0.035 : 0)]);
  }
  const contorno = [...izq, ...der].map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
  s += `<path class="monte" d="${contorno}L${f1(derX + W)} ${H}L${f1(izqX - W)} ${H}Z"/>`;
  s += `<path class="monte-sombra" d="M${f1(c.sx)} ${f1(c.sy)}${der.map((p) => `L${f1(p[0])} ${f1(p[1])}`).join('')}L${f1(derX + W)} ${H}L${f1(c.sx + W * 0.07)} ${H}L${f1(c.sx + W * 0.02)} ${f1(c.sy + H * 0.3)}Z"/>`;
  const nv = H * 0.075, nw = Math.min(W * 0.07, 70);
  s += `<path class="nieve" d="M${f1(c.sx)} ${f1(c.sy)}L${f1(c.sx + nw)} ${f1(c.sy + nv)}L${f1(c.sx + nw * 0.5)} ${f1(c.sy + nv * 0.8)}L${f1(c.sx + nw * 0.15)} ${f1(c.sy + nv * 1.1)}L${f1(c.sx - nw * 0.3)} ${f1(c.sy + nv * 0.75)}L${f1(c.sx - nw * 0.65)} ${f1(c.sy + nv * 1.05)}L${f1(c.sx - nw)} ${f1(c.sy + nv * 0.95)}Z"/>`;

  // Sendero en zigzag: siempre sube, así que la altura recorrida es monótona.
  const [bx, by] = c.base;
  let d = `M${f1(bx)} ${f1(by)}`;
  for (let i = 1; i <= c.vueltas; i++) {
    const f = i / c.vueltas;
    const y = by - (by - c.sy - 6) * f;
    const a = (1 - f) * W * c.ancho + 4;
    const x = i === c.vueltas ? c.sx : i % 2 ? c.sx - a * 0.2 + W * 0.03 : c.sx - a * 1.2;
    d += `L${f1(x)} ${f1(y)}`;
  }
  s += `<path class="sendero" id="m-sendero" d="${d}"/><path class="sendero-hecho" id="m-hecho" d="${d}"/>`;
  s += `<g id="m-campos"></g><g class="yo" id="m-yo"><circle class="yo-halo" r="15"/><circle class="yo-punto" r="7"/></g><g id="m-etiquetas"></g>`;
  for (let fila = 0; fila < 2; fila++) {
    const yb = H * (fila ? 1.005 : 0.975), alto = H * (fila ? 0.07 : 0.05);
    for (let x = -10; x < W + 20; x += alto * (0.55 + rnd() * 0.4)) {
      const a = alto * (0.7 + rnd() * 0.5), an = a * 0.42;
      if (!fila && Math.abs(x - bx) < 26) continue;
      s += `<path class="pino-${fila}" d="M${f1(x)} ${f1(yb - a)}L${f1(x + an)} ${f1(yb)}L${f1(x - an)} ${f1(yb)}Z"/>`;
    }
  }
  host.innerHTML = s + '</g></svg>';

  const camino = host.querySelector('#m-sendero');
  const L = camino.getTotalLength();
  const enAltura = (alt) => {
    const yObj = by - (by - c.sy - 6) * alt;
    let lo = 0, hi = L;
    for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (camino.getPointAtLength(m).y > yObj) lo = m; else hi = m; }
    return lo;
  };
  const campos = esc.campos.map((m) => ({ m, p: camino.getPointAtLength(enAltura(altitud(m, esc))), cima: m === esc.cima }));
  host.querySelector('#m-campos').innerHTML = campos.map(({ m, p }) =>
    `<g class="campo" data-m="${m}" transform="translate(${f1(p.x)} ${f1(p.y)})"><line y2="-28"/><path class="banderin" d="M0 -28L20 -22L0 -16Z"/></g>`).join('');
  estado = { host, W, H, L, camino, enAltura, esc, campos, sats, meta, c };
  colocar(inicio, false);
  describir(sats, meta);
}

/** Etiquetas sin choques: a la derecha de la bandera; si choca o se sale, a la izquierda; si sigue, se oculta. */
function etiquetar(yo) {
  const { campos, W, host } = estado;
  const cajas = [{ x: yo.x - 34, y: yo.y - 30, w: 30, h: 18, fija: true }];
  const prioridad = (m) => (m === estado.esc.cima ? 0 : m === estado.meta ? 1 : 2);
  const orden = [...campos].sort((a, b) => prioridad(a.m) - prioridad(b.m));
  let s = `<text class="yo-txt" x="${f1(yo.x - 14)}" y="${f1(yo.y - 14)}" text-anchor="end">Tú</text>`;
  const choca = (b) => b.x < 4 || b.x + b.w > W - 4 || cajas.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  for (const { m, p, cima } of orden) {
    const txt = nombreHito(m);
    const w = txt.length * 8.6 + 6;
    const derecha = { x: p.x + 24, y: p.y - 32, w, h: 18, anclaje: 'start', tx: p.x + 26 };
    const izquierda = { x: p.x - 6 - w, y: p.y - 32, w, h: 18, anclaje: 'end', tx: p.x - 6 };
    const arriba = { x: p.x - w / 2, y: p.y - 52, w, h: 18, anclaje: 'middle', tx: p.x };
    const opciones = cima ? [arriba, izquierda, derecha] : [derecha, izquierda];
    const b = opciones.find((o) => !choca(o));
    if (!b) continue;
    cajas.push(b);
    s += `<text class="campo-txt${cima ? ' cima' : ''}" x="${f1(b.tx)}" y="${f1(b.y + 14)}" text-anchor="${b.anclaje}">${txt}</text>`;
  }
  host.querySelector('#m-etiquetas').innerHTML = s;
}

function colocar(sats, animado) {
  const { L, camino, enAltura, esc, host } = estado;
  const l = enAltura(altitud(sats, esc));
  const hecho = host.querySelector('#m-hecho');
  hecho.style.strokeDasharray = `${f1(L)} ${f1(L)}`;
  hecho.style.strokeDashoffset = f1(L - l);
  const p = camino.getPointAtLength(l);
  host.querySelector('#m-yo').setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y)})`);
  host.querySelectorAll('.campo').forEach((g) => g.classList.toggle('alcanzado', Number(g.dataset.m) <= sats));
  if (!animado) etiquetar(p);
  return p;
}

/** Sube a "Tú" desde `desde` hasta `hasta` sats. Con movimiento reducido, salta al final. */
export function subir(desde, hasta, ms = 2000) {
  if (!estado) return;
  estado.sats = hasta;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || desde === hasta) { colocar(hasta, false); return; }
  estado.host.querySelector('#m-etiquetas').innerHTML = '';
  const { esc } = estado;
  const a0 = altitud(desde, esc), a1 = altitud(hasta, esc);
  const t0 = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
    const alt = a0 + (a1 - a0) * e;
    const satsAhora = 10 ** (Math.log10(esc.base) + alt * (Math.log10(esc.cima) - Math.log10(esc.base)));
    colocar(k < 1 ? satsAhora : hasta, k < 1);
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function describir(sats, meta) {
  const pct = Math.min(100, (sats / meta) * 100);
  estado.host.querySelector('#m-desc').textContent =
    `Saldo ${entero(sats)} sats; siguiente meta ${nombreHito(meta)}, al ${pct < 10 ? pct.toFixed(1) : Math.floor(pct)} %.`;
}
