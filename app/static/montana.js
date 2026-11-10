// La montaña de la cabecera: el saldo en sats es la altitud y los hitos son campamentos.
import { escalaMontana, altitud, descripcionMontana, nombreHito, entero, textoCampamento } from './lib.js';
import { sinMovimiento } from './movimiento.js';

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
  // Escritorio: el pico se dimensiona por la altura y se compone en un marco centrado de hasta
  // 1600 px, alineado con el contenido; fuera del marco solo hay cielo y cordillera.
  const marco = Math.min(W, 1600);
  const dcha = (W + marco) / 2;
  const mw = Math.min(marco, H * 1.7);
  return { sx: dcha - mw * 0.42, sy: H * 0.16, base: [dcha - mw * 0.74, H * 0.915], vueltas: 7, ancho: mw * 0.26 / W, campos: 4, sol: [dcha - mw * 0.12, H * 0.24], rs: H * 0.08 };
}

/**
 * La luna con su fase (0 nueva, 0.25 cuarto creciente, 0.5 llena, 0.75 cuarto menguante): el disco apagado y encima la parte
 * iluminada (un semicírculo y media elipse, que es el terminador). Creciente se ilumina por la derecha; menguante, al revés.
 */
export function luna(cx, cy, r, fase) {
  const k = Math.cos(2 * Math.PI * fase); // 1 nueva, -1 llena
  const rx = Math.abs(k) * r;
  const barrido = k > 0 ? 0 : 1;
  const espejo = fase > 0.5 ? ` transform="translate(${f1(2 * cx)} 0) scale(-1 1)"` : '';
  const luz = `M${f1(cx)} ${f1(cy - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx)} ${f1(cy + r)}A${f1(rx)} ${f1(r)} 0 0 ${barrido} ${f1(cx)} ${f1(cy - r)}Z`;
  return `<circle class="luna-sombra" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/><path class="astro" d="${luz}"${espejo}/>`;
}

/** Tres nubes que cruzan despacio (solo con todos los efectos): van detrás de la montaña y por debajo del texto del saldo. */
function nubes(H) {
  const una = (x, y, k, clase) => `<g class="efecto-ambiente nube ${clase}"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(46 * k)}" ry="${f1(11 * k)}"/><ellipse cx="${f1(x + 22 * k)}" cy="${f1(y - 8 * k)}" rx="${f1(28 * k)}" ry="${f1(10 * k)}"/><ellipse cx="${f1(x - 20 * k)}" cy="${f1(y - 5 * k)}" rx="${f1(24 * k)}" ry="${f1(9 * k)}"/></g>`;
  return una(0, H * 0.33, 1, 'n1') + una(0, H * 0.4, 1.4, 'n2') + una(0, H * 0.46, 0.8, 'n3');
}
/** Dos bandas de niebla entre la sierra y la montaña (solo con todos los efectos). */
function niebla(W, H, y) {
  return `<g class="efecto-ambiente niebla"><ellipse class="niebla-a" cx="${f1(W * 0.45)}" cy="${f1(y * H)}" rx="${f1(W * 0.7)}" ry="${f1(H * 0.028)}"/><ellipse class="niebla-b" cx="${f1(W * 0.6)}" cy="${f1(y * H + H * 0.07)}" rx="${f1(W * 0.6)}" ry="${f1(H * 0.024)}"/></g>`;
}
/** Un pequeño vuelo de aves al amanecer (solo con todos los efectos): siluetas en «v» que aletean mientras cruzan. */
function aves(H) {
  // La posición va en grupos con atributo `transform`; el CSS anima las clases (un transform de CSS reemplaza al del atributo).
  const ave = (dx, dy, clase) => `<g transform="translate(${dx} ${dy})"><path class="ave-ala ${clase}" d="M0 0q4-5 8 0q4-5 8 0"/></g>`;
  return `<g transform="translate(0 ${f1(H * 0.37)})"><g class="efecto-ambiente ave">${ave(0, 0, 'a1')}${ave(-18, 9, 'a2')}${ave(-30, -4, 'a3')}</g></g>`;
}

let estado = null;

/** La franja de nieve de la cumbre: más honda cuanto más cerca de la meta (la altitud va de 0 a 1 hasta la cumbre). */
const DIENTES = [0.95, 0.7, 1.1, 0.8, 1.15, 0.75, 1.05, 0.9];
const NIEVE_MIN = 0.55; // con la altitud en cero: una capa fina
const NIEVE_MAX = 1.5;  // llegando a la cumbre: la cumbre bien cubierta
function trazoNieve({ sx, sy, ancho, nv }, alt) {
  const hondo = nv * (NIEVE_MIN + (NIEVE_MAX - NIEVE_MIN) * Math.min(1, Math.max(0, alt)));
  let d = `M${f1(sx - ancho)} ${f1(sy - 20)}L${f1(sx + ancho)} ${f1(sy - 20)}`;
  DIENTES.forEach((k, i) => { d += `L${f1(sx + ancho - (2 * ancho * (i + 0.5)) / DIENTES.length)} ${f1(sy + hondo * k)}`; });
  return `${d}Z`;
}

/**
 * Dibuja la escena en `host` con la escala de `sats` y deja a "Tú" en `inicio` (para animar luego con subir).
 */
export function dibujarMontana(host, { sats, meta, etapa = meta, inicio = sats, techo = 0, fechas = {}, compras = 0, plantar = false, tocable = false }) {
  const W = Math.round(host.clientWidth), H = Math.round(host.clientHeight);
  if (!W || !H) return;
  const c = composicion(W, H, techo);
  const esc = escalaMontana(sats, c.campos);
  const rnd = azar(42);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="m-desc"><desc id="m-desc"></desc><defs><radialGradient id="m-luz"><stop offset="0" class="luz-0"/><stop offset="1" class="luz-1"/></radialGradient><filter id="m-bruma" x="-2%" y="-5%" width="104%" height="110%"><feGaussianBlur stdDeviation="1.6"/></filter></defs><g aria-hidden="true">`;
  host.style.setProperty('--escena-w', `${W}px`); // las nubes, la niebla y las aves cruzan en CSS: necesitan saber cuánto mide la escena
  // Capa del cielo (parallax): cielo, estrellas, fugaz, sol, luna, nubes y aves.
  s += '<g class="par par-cielo">';
  [0, 0.17, 0.31, 0.43, 0.53].forEach((b, i) => { s += `<rect class="cielo-${i}" x="0" y="${f1(b * H)}" width="${W}" height="${f1(H - b * H)}"/>`; });
  for (let i = 0; i < 46; i++) s += `<circle class="estrella t${i % 5}" cx="${f1(rnd() * W)}" cy="${f1(rnd() * H * 0.5)}" r="${f1(0.5 + rnd() * 1.1)}"/>`;
  // Estrella fugaz (muy esporádica, solo de noche y con todos los efectos): una raya corta que cruza el cielo alto.
  s += `<line class="fugaz" x1="${f1(W * 0.16)}" y1="${f1(H * 0.1)}" x2="${f1(W * 0.16 + 46)}" y2="${f1(H * 0.1 + 20)}"/>`;
  // Sol (amanecer, día y atardecer) y luna con su fase real (noche): el CSS muestra uno u otro según `html[data-cielo]`.
  s += `<g class="sol"><circle class="halo" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs * 1.7)}"/><circle class="astro" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs)}"/></g>`;
  s += `<g class="luna"><circle class="halo" cx="${f1(c.sol[0])}" cy="${f1(c.sol[1])}" r="${f1(c.rs * 1.7)}"/>${luna(c.sol[0], c.sol[1], c.rs, window.libroCielo?.faseLunar() ?? 0.5)}</g>`;
  s += nubes(H) + aves(H) + '</g>';
  // Velo cálido del cielo para las celebraciones: va antes de las montañas, así solo tiñe el cielo.
  s += `<rect class="alba" id="m-alba" x="0" y="0" width="${W}" height="${H}"/>`;
  const sierra = (base, amp, paso, clase) => {
    let d = `M0 ${H}`;
    for (let x = 0; x <= W + paso; x += paso) d += `L${f1(x)} ${f1(base * H - (Math.sin(x / (W / 3.3) + base * 9) * 0.5 + rnd() * 0.6) * amp * H)}`;
    s += `<path class="${clase}" d="${d}L${W} ${H}Z"/>`;
  };
  s += '<g class="par par-lejos">';
  sierra(c.sy / H + 0.2, 0.1, Math.max(24, W / 18), 'lejos');
  s += '</g><g class="par par-medio">';
  sierra(c.sy / H + 0.32, 0.09, Math.max(30, W / 14), 'medio');
  s += '</g>' + niebla(W, H, c.sy / H + 0.3);

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
  const silueta = `${contorno}L${f1(derX + W)} ${H}L${f1(izqX - W)} ${H}Z`;
  s += `<defs><clipPath id="m-silueta"><path d="${silueta}"/></clipPath></defs><path class="monte" d="${silueta}"/>`;
  s += `<path class="monte-sombra" d="M${f1(c.sx)} ${f1(c.sy)}${der.map((p) => `L${f1(p[0])} ${f1(p[1])}`).join('')}L${f1(derX + W)} ${H}L${f1(c.sx + W * 0.07)} ${H}L${f1(c.sx + W * 0.02)} ${f1(c.sy + H * 0.3)}Z"/>`;
  // Nieve: una franja irregular mucho más ancha que el pico, recortada por la silueta, para que
  // nunca sobresalga de las laderas.
  // Su profundidad sigue a tu altitud (`colocar` la actualiza), así que la cumbre se va cubriendo a medida que subes.
  const nieveMedidas = { sx: c.sx, sy: c.sy, ancho: Math.max(W * 0.12, 140), nv: H * 0.075 };
  s += `<path class="nieve" clip-path="url(#m-silueta)" d="${trazoNieve(nieveMedidas, altitud(inicio, esc))}"/>`;

  // Sendero en zigzag: siempre sube, así que la altura recorrida es monótona.
  const [bx, by] = c.base;
  const pts = [[bx, by]];
  for (let i = 1; i <= c.vueltas; i++) {
    const f = i / c.vueltas;
    const y = by - (by - c.sy - 6) * f;
    const a = (1 - f) * W * c.ancho + 4;
    const x = i === c.vueltas ? c.sx : i % 2 ? c.sx - a * 0.2 + W * 0.03 : c.sx - a * 1.2;
    pts.push([x, y]);
  }
  let d = `M${f1(bx)} ${f1(by)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1];
    if (i === pts.length - 1) { d += `L${f1(x)} ${f1(y)}`; break; }
    const [nx, ny] = pts[i + 1], k = 0.22;
    d += `L${f1(x + (px - x) * k)} ${f1(y + (py - y) * k)}Q${f1(x)} ${f1(y)} ${f1(x + (nx - x) * k)} ${f1(y + (ny - y) * k)}`;
  }
  s += `<path class="sendero" id="m-sendero" d="${d}"/><path class="sendero-hecho" id="m-hecho" d="${d}"/><path class="estela" id="m-estela" d="${d}"/>`;
  s += `<circle class="salida" cx="${f1(bx)}" cy="${f1(by)}" r="5.5"/>`;
  s += `<g id="m-campos"></g><g class="efecto-ambiente huellas" id="m-huellas"></g><g class="yo" id="m-yo"><circle class="efecto-ambiente linterna" r="38" fill="url(#m-luz)"/><circle class="yo-halo" r="15"/><circle class="yo-punto" r="7"/></g><g id="m-etiquetas"></g><g class="fx" id="m-fx"></g>`;
  for (let fila = 0; fila < 2; fila++) {
    const yb = H * (fila ? 1.005 : 0.975), alto = H * (fila ? 0.07 : 0.05);
    for (let x = -10; x < W + 20; x += alto * (0.55 + rnd() * 0.4)) {
      const a = alto * (0.7 + rnd() * 0.5), an = a * 0.42;
      if (Math.abs(x - bx) < 30) continue;
      s += `<path class="pino-${fila}" d="M${f1(x)} ${f1(yb - a)}L${f1(x + an)} ${f1(yb)}L${f1(x - an)} ${f1(yb)}Z"/>`;
    }
  }
  s += bosque(W, H, bx, compras, plantar);
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
  host.querySelector('#m-campos').innerHTML = campos.map(({ m, p, cima }) =>
    `<g class="campo" data-m="${m}" transform="translate(${f1(p.x)} ${f1(p.y)})">${cima ? '<circle class="brillo-cima" cy="-24" r="46" fill="url(#m-luz)"/>' : ''}<line y2="-28"/><path class="banderin" d="M0 -28L20 -22L0 -16Z"/>${icono(cima ? 3 : esc.campos.indexOf(m))}${humoYFogata()}</g>`).join('');
  estado = { host, W, H, L, camino, enAltura, esc, campos, sats, meta, c, nieveMedidas, fechas, compras, caja: null };
  if (tocable) { banderas(host, campos, W, H); instalarCierre(); }
  colocar(inicio, false);
  describir(sats, etapa);
}

/**
 * Un dibujo distinto por campamento (idea 63), al pie de la bandera y a su derecha, bajo la etiqueta (ocupa de y −13 a 0):
 * tienda, cabaña, refugio con almenas y, en la cumbre, un mojón de piedras. Se elige por el orden del campamento en la montaña.
 */
function icono(i) {
  const formas = [
    '<path class="campo-ico" d="M5 0L13 -12L21 0Z"/><path class="campo-ico-d" d="M11.4 0L13 -5.5L14.6 0Z"/>',
    '<path class="campo-ico" d="M6 0V-7H20V0ZM4 -7L13 -13.5L22 -7Z"/><path class="campo-ico-d" d="M11.6 0V-4.5H14.4V0Z"/>',
    '<path class="campo-ico" d="M7 0V-9H19V0ZM7 -9V-13H9.6V-11H11.7V-13H14.3V-11H16.4V-13H19V-9Z"/><path class="campo-ico-d" d="M11.6 0V-4.5Q13 -6.4 14.4 -4.5V0Z"/>',
    '<ellipse class="campo-ico" cx="13" cy="-2.3" rx="8.4" ry="2.6"/><ellipse class="campo-ico" cx="13" cy="-6.2" rx="5.8" ry="2.3"/><ellipse class="campo-ico" cx="13" cy="-9.6" rx="3.2" ry="1.9"/>',
  ];
  return formas[Math.min(Math.max(i, 0), 3)];
}

/**
 * El bosque (idea 109): un pino por compra al pie de la montaña, por delante de los pinos de adorno. Con muchas compras cada
 * pino vale por varias (tope de 60). Usa su propio azar: la forma de la montaña no cambia. El último se planta con una
 * animación corta si la compra es de esta sesión (`plantar`).
 */
const MAX_PINOS = 60;
function bosque(W, H, bx, compras, plantar) {
  if (!(compras > 0)) return '';
  const por = Math.ceil(compras / MAX_PINOS), n = Math.ceil(compras / por);
  const rnd = azar(7);
  let s = '<g class="bosque" id="m-bosque">';
  for (let i = 0; i < n; i++) {
    // Se reparten por todo el ancho salvo la marca de salida (un pino encima la taparía): el hueco se salta, no se pierde ningún pino.
    const u = ((i + 0.5) / n) * (W - 60) + (rnd() - 0.5) * ((W - 60) / n) * 0.5;
    const x = u < bx - 30 ? u : u + 60;
    const a = H * (0.075 + rnd() * 0.035), an = a * 0.4;
    const yb = H * 1.01;
    const nuevo = plantar && i === n - 1 ? ' pino-nuevo' : '';
    s += `<path class="pino-2${nuevo}" d="M${f1(x)} ${f1(yb - a)}L${f1(x + an * 0.55)} ${f1(yb - a * 0.5)}L${f1(x + an * 0.25)} ${f1(yb - a * 0.5)}L${f1(x + an)} ${f1(yb)}L${f1(x - an)} ${f1(yb)}L${f1(x - an * 0.25)} ${f1(yb - a * 0.5)}L${f1(x - an * 0.55)} ${f1(yb - a * 0.5)}Z"/>`;
  }
  return `${s}</g>`;
}

// Tarjeta de cada campamento (idea 72). Los botones son transparentes, de 48 px, y viven FUERA del SVG (que es role="img"):
// dentro de una imagen no podrían tener nombre ni foco. La tarjeta y los botones se rehacen con cada dibujo.
const TOQUE = 48;
let abierta = null;
function banderas(host, campos, W, H) {
  const { sats, fechas } = estado;
  const caja = host.parentElement?.querySelector('#m-banderas');
  if (!caja) return;
  estado.caja = caja;
  // De arriba abajo: el orden de tabulación es el visual.
  const botones = [...campos].sort((a, b) => a.p.y - b.p.y).map(({ m, p, cima }) => {
    const t = textoCampamento(m, sats, fechas[m] ?? null, cima);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm-bandera';
    b.dataset.m = String(m);
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', 'm-tarjeta');
    b.setAttribute('aria-label', `${t.titulo}. ${t.texto}`);
    b.style.left = `${f1(Math.min(Math.max(p.x - TOQUE / 2 + 6, 0), W - TOQUE))}px`;
    b.style.top = `${f1(Math.min(Math.max(p.y - TOQUE / 2 - 12, 0), H - TOQUE))}px`;
    b.addEventListener('click', () => (abierta === m ? cerrarTarjeta() : abrirTarjeta(m)));
    return b;
  });
  const tarjeta = document.createElement('div');
  tarjeta.className = 'm-tarjeta';
  tarjeta.id = 'm-tarjeta';
  tarjeta.setAttribute('role', 'group');
  tarjeta.setAttribute('aria-labelledby', 'm-tarjeta-t');
  tarjeta.hidden = true;
  tarjeta.innerHTML = '<b id="m-tarjeta-t"></b><p id="m-tarjeta-p"></p><button type="button" class="m-tarjeta-x">Cerrar</button>';
  tarjeta.querySelector('button').addEventListener('click', () => cerrarTarjeta(true));
  caja.replaceChildren(...botones, tarjeta);
  abierta = null;
}

function abrirTarjeta(m) {
  const { caja, campos, sats, fechas, H } = estado;
  const campo = campos.find((x) => x.m === m);
  const tarjeta = caja?.querySelector('#m-tarjeta');
  if (!campo || !tarjeta) return;
  const t = textoCampamento(m, sats, fechas[m] ?? null, campo.cima);
  tarjeta.querySelector('#m-tarjeta-t').textContent = t.titulo;
  tarjeta.querySelector('#m-tarjeta-p').textContent = t.texto;
  tarjeta.dataset.estado = t.alcanzado ? 'alcanzado' : 'futuro';
  tarjeta.style.setProperty('--cx', `${f1(campo.p.x)}px`);
  const abajo = campo.p.y < H * 0.62;
  tarjeta.style.top = abajo ? `${f1(campo.p.y + 18)}px` : 'auto';
  tarjeta.style.bottom = abajo ? 'auto' : `${f1(H - campo.p.y + 46)}px`;
  tarjeta.hidden = false;
  caja.querySelectorAll('.m-bandera').forEach((b) => b.setAttribute('aria-expanded', String(Number(b.dataset.m) === m)));
  abierta = m;
}

function cerrarTarjeta(devolverFoco = false) {
  const caja = estado?.caja;
  if (abierta === null || !caja) return;
  const m = abierta;
  abierta = null;
  const tarjeta = caja.querySelector('#m-tarjeta');
  if (tarjeta) tarjeta.hidden = true;
  caja.querySelectorAll('.m-bandera').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  if (devolverFoco) caja.querySelector(`.m-bandera[data-m="${m}"]`)?.focus();
}

// Se cierra con Esc o tocando en otro sitio. Se instala una sola vez (los botones sí se rehacen con cada dibujo).
let cierreInstalado = false;
function instalarCierre() {
  if (cierreInstalado) return;
  cierreInstalado = true;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta !== null) { e.preventDefault(); cerrarTarjeta(true); } });
  document.addEventListener('pointerdown', (e) => { if (abierta !== null && !e.target.closest?.('.m-bandera, .m-tarjeta')) cerrarTarjeta(); });
}

/**
 * Dos detalles de ambiente por campamento (solo con todos los efectos; el CSS decide cuál se ve):
 * humo en los ya alcanzados y una fogata que parpadea en el siguiente. Pequeños y al pie de la bandera, lejos de la etiqueta.
 */
function humoYFogata() {
  const humo = [[-7, -2], [-9, -3], [-6, -2]].map(([x, y]) => `<circle class="humo-bola" cx="${x}" cy="${y}" r="3.2"/>`).join(''); // sin `style` en línea (CSP): los retrasos van en el CSS
  return `<g class="efecto-ambiente humo">${humo}</g>`
    + '<g class="efecto-ambiente fogata" transform="scale(1.5)"><path class="llama" d="M-8 0C-12 -4 -9 -8 -8 -12C-7 -8 -4 -5 -8 0Z"/><path class="llama-i" d="M-8 0C-10 -2 -8 -5 -8 -7C-7 -5 -6 -3 -8 0Z"/></g>';
}

/** Huellas del tramo recorrido: puntitos que alternan a cada lado del sendero, hasta donde estás. Solo con todos los efectos. */
function huellas(l) {
  const { camino, host } = estado;
  const caja = host.querySelector('#m-huellas');
  if (!caja) return;
  const pasos = [];
  for (let d = 16, i = 0; d < l - 14; d += 10, i++) {
    const a = camino.getPointAtLength(d), b = camino.getPointAtLength(d + 1.5);
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    const lado = i % 2 ? 1 : -1;
    pasos.push(`<circle cx="${f1(a.x - (dy / n) * 3.4 * lado)}" cy="${f1(a.y + (dx / n) * 3.4 * lado)}" r="1.5"/>`);
  }
  caja.innerHTML = pasos.join('');
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
  // La fogata y el humo: el siguiente campamento es el primero que aún no alcanzaste.
  const sig = estado.campos.find((x) => x.m > sats)?.m;
  host.querySelectorAll('.campo').forEach((g) => g.classList.toggle('sig', Number(g.dataset.m) === sig));
  host.querySelector('.nieve')?.setAttribute('d', trazoNieve(estado.nieveMedidas, altitud(sats, esc)));
  if (!animado) { etiquetar(p); huellas(l); }
  return p;
}

/**
 * Sube a "Tú" desde `desde` hasta `hasta` sats. Con movimiento reducido, salta al final.
 * `festejo` ({nivel: 'compra'|'etapa'|'hito', etapa, delta}) solo llega por una compra de esta
 * sesión: el tramo recién subido se enciende y, al llegar, la montaña celebra.
 */
export function subir(desde, hasta, ms = 2000, festejo = null) {
  if (!estado) return;
  estado.sats = hasta;
  if (sinMovimiento() || desde === hasta) { colocar(hasta, false); return; }
  estado.host.querySelector('#m-etiquetas').innerHTML = '';
  const { esc, enAltura, L, host } = estado;
  host.querySelector('#m-huellas').innerHTML = ''; // se vuelven a poner al llegar
  const a0 = altitud(desde, esc), a1 = altitud(hasta, esc);
  const estela = festejo && host.querySelector('#m-estela');
  const l0 = estela ? enAltura(a0) : 0;
  if (estela) estela.classList.add('viva');
  const t0 = performance.now();
  const paso = (t) => {
    if (estado.host !== host || !host.isConnected) return; // la escena se redibujó (resize)
    const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
    const alt = a0 + (a1 - a0) * e;
    const satsAhora = 10 ** (Math.log10(esc.base) + alt * (Math.log10(esc.cima) - Math.log10(esc.base)));
    const p = colocar(k < 1 ? satsAhora : hasta, k < 1);
    if (estela) estela.style.strokeDasharray = `0 ${f1(l0)} ${f1(Math.max(0, enAltura(alt) - l0))} ${f1(L)}`;
    if (k < 1) requestAnimationFrame(paso);
    else if (festejo) llegar(festejo, p, hasta);
  };
  requestAnimationFrame(paso);
}

// ------------------------------------------------------------------ celebración
const NS = 'http://www.w3.org/2000/svg';
function nodo(tag, attrs, padre) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  padre.appendChild(el);
  return el;
}
const retirar = (el, ms) => setTimeout(() => el.remove(), ms);

/** Pocas brasas que suben desde (x, y) y se apagan: solo transform y opacity. */
function brasas(fx, x, y, n, alcance, retraso = 0) {
  for (let i = 0; i < n; i++) {
    const g = nodo('g', { transform: `translate(${f1(x)} ${f1(y)})` }, fx);
    const c = nodo('circle', { class: 'brasa', r: f1(1.3 + Math.random() * 1.9) }, g);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
    const dist = alcance * (0.45 + Math.random() * 0.55);
    c.style.setProperty('--dx', `${f1(Math.cos(ang) * dist)}px`);
    c.style.setProperty('--dy', `${f1(Math.sin(ang) * dist)}px`);
    c.style.animationDuration = `${900 + Math.round(Math.random() * 700)}ms`;
    c.style.animationDelay = `${retraso + i * 22}ms`;
    retirar(g, retraso + 2000);
  }
}

function llegar({ nivel, etapa, delta }, p, hasta) {
  const { host, W, c, campos, enAltura, camino, esc } = estado;
  const fx = host.querySelector('#m-fx');
  const estela = host.querySelector('#m-estela');
  if (!fx) return;
  estela.classList.remove('viva');
  estela.classList.add('apaga');
  setTimeout(() => estela.classList.remove('apaga'), 1000);

  // Cada compra: brasas desde tu punto, la cifra flotando y la siguiente bandera que se agita.
  brasas(fx, p.x, p.y, nivel === 'compra' ? 9 : 14, nivel === 'compra' ? 46 : 64);
  // «+N sats» donde no choque con las etiquetas (banderas y «Tú»): se prueban varios sitios.
  const t = nodo('text', { class: 'flota' }, fx);
  t.textContent = `+${entero(delta)} sats`;
  const ocupadas = [...host.querySelectorAll('#m-etiquetas text')].map((e) => e.getBBox());
  // La cifra entra 8 px más abajo y sube 24 px mientras se apaga: se reserva todo su recorrido.
  const choca = (b) => b.x < 4 || b.x + b.width > W - 4 || b.y - 26 < 4
    || ocupadas.some((o) => b.x < o.x + o.width + 4 && b.x + b.width + 4 > o.x && b.y - 26 < o.y + o.height + 2 && b.y + b.height + 10 > o.y);
  const sitios = [[18, 22, 'start'], [-18, 22, 'end'], [0, -40, 'middle'], [18, -10, 'start'], [-18, -10, 'end'], [0, -64, 'middle'], [0, 42, 'middle']];
  for (const [dx, dy, ancla] of sitios) {
    t.setAttribute('x', f1(p.x + dx)); t.setAttribute('y', f1(p.y + dy)); t.setAttribute('text-anchor', ancla);
    if (!choca(t.getBBox())) break;
  }
  retirar(t, 1800);
  const siguiente = host.querySelector(`.campo[data-m="${campos.find((x) => x.m > hasta)?.m}"]`);
  if (siguiente) { siguiente.classList.add('agita'); setTimeout(() => siguiente.classList.remove('agita'), 1700); }
  if (nivel === 'compra') return;

  // Etapa: la bandera de la etapa se iza con un anillo de luz y el cielo respira.
  const alba = host.querySelector('#m-alba');
  alba.classList.remove('respira', 'amanece'); void alba.getBBox();
  alba.classList.add(nivel === 'hito' ? 'amanece' : 'respira');
  setTimeout(() => alba.classList.remove('respira', 'amanece'), 3000);
  let bandera = host.querySelector(`.campo[data-m="${etapa}"]`);
  const pe = bandera ? campos.find((x) => x.m === etapa).p : camino.getPointAtLength(enAltura(altitud(etapa, esc)));
  if (bandera) {
    bandera.classList.add('iza');
    setTimeout(() => bandera.classList.remove('iza'), 1800);
  } else {
    bandera = nodo('g', { class: 'campo alcanzado iza plantada', transform: `translate(${f1(pe.x)} ${f1(pe.y)})` }, fx);
    nodo('line', { y2: '-24' }, bandera);
    nodo('path', { class: 'banderin', d: 'M0 -24L17 -19L0 -14Z' }, bandera);
    retirar(bandera, 3200);
  }
  for (const [i, r] of [[0, 12], [1, 12]]) {
    const a = nodo('circle', { class: 'anillo', cx: f1(pe.x), cy: f1(pe.y - 20), r }, fx);
    a.style.animationDelay = `${i * 260}ms`;
    retirar(a, 2000);
  }
  if (nivel !== 'hito') return;

  // Hito grande (1M, 10M, 1 BTC): amanecer completo con luz sobre la cumbre.
  const rl = Math.min(W, estado.H) * 0.22;
  const luz = nodo('circle', { class: 'luz-cima', cx: f1(c.sx), cy: f1(c.sy), r: f1(rl), fill: 'url(#m-luz)' }, fx);
  retirar(luz, 3000);
  brasas(fx, c.sx, c.sy + 6, 10, rl * 0.9, 500);
}

function describir(sats, meta) {
  estado.host.querySelector('#m-desc').textContent = descripcionMontana(sats, meta, estado.esc.campos, estado.esc.cima) + (estado.compras ? ` Al pie crece tu bosque: un pino por compra (${estado.compras}).` : '');
}
