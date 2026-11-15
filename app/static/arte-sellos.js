// El sello de lacre y el certificado de altitud (campamento 13B). Funciones puras: reciben datos de `lib.js` (`sellos`, `datosCertificado`) y
// devuelven un `<svg>` como texto; no tocan el DOM ni usan azar.
//
// CONTRATO (lo usan `historia.js` y `celebracion.js`; el dibujo es libre mientras se cumpla):
//  · `lacre(m, { grande })` → `<svg class="lacre" viewBox="0 0 100 100" aria-hidden="true" focusable="false">` con la cifra de la etapa (`m` en
//    sats: `nombreHito(m)`) en relieve sobre la cera. Se usa pequeño en «Tu historia» (≈ 56 px) y grande en la tarjeta de celebración (≈ 84–100 px).
//  · `certificado(d)` → `<svg viewBox="0 0 480 340" aria-hidden="true" focusable="false">` con los datos de `lib.datosCertificado` (`d.nombre`
//    puede ser null, `d.letras`, `d.fecha`, `d.btc`, `d.lobulos`, `d.altitud`, `d.trenzas`…). **Todo texto del usuario (el nombre) va con `esc()`**.
//  · Colores solo por variables CSS (clases del bloque «Campamento 13B» de styles.css); sin estilos en línea (la CSP los bloquea);
//    animaciones solo con transform/opacity y clase `efecto-ambiente` si son adorno.
//  · Ids de `<defs>` únicos con prefijo `s-`/`c-`: puede haber muchos sellos en la misma página, así que cada uno lleva su propia llave.
//
// El lenguaje es el de la montaña: la luz llega de arriba a la derecha, pocas piezas con intención, nada de filtros.
import { entero, etapaAnterior, nombreHito } from './lib.js';

/** Escapa un texto para meterlo dentro del SVG como texto. */
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const f1 = (n) => n.toFixed(1);
const f2 = (n) => n.toFixed(2);
const TAU = Math.PI * 2;
/** Un número fijo entre 0 y 1 para (i, k): la forma propia de cada sello, siempre la misma (no es azar). */
const fijo = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7 + 0.5) * 43758.5453; return s - Math.floor(s); };
const lin = (pts, cerrar = false) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('') + (cerrar ? 'Z' : '');
/** Un contorno suave por puntos (curvas cuadráticas entre los puntos medios): la cera no tiene esquinas. */
const suave = (pts) => {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${f1(mid(pts[n - 1], pts[0])[0])} ${f1(mid(pts[n - 1], pts[0])[1])}`;
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`; }
  return `${d}Z`;
};

// ================================================================ el sello de lacre

/** La montañita del logo (tres picos), en relieve, centrada en (cx, cy) con ancho `w`. */
const montanita = (cx, cy, w) => {
  const h = w * 0.46;
  return `M${f1(cx - w / 2)} ${f1(cy + h / 2)}L${f1(cx - w * 0.2)} ${f1(cy - h * 0.1)}L${f1(cx - w * 0.06)} ${f1(cy + h * 0.12)}L${f1(cx + w * 0.12)} ${f1(cy - h / 2)}L${f1(cx + w / 2)} ${f1(cy + h / 2)}Z`;
};

/**
 * El sello: una gota de cera aplastada (borde irregular, siempre el mismo para la misma etapa), con dos lenguas que se escurrieron
 * hacia fuera; dentro, la huella del sello (un disco hundido con su aro levantado) y la cifra en relieve.
 * `llave` hace únicos los ids; `texto` es la cifra (o null: solo la montañita).
 */
function sello(llave, texto, { clase = '' } = {}) {
  const sem = texto ? [...texto].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) : 3;
  // Las lenguas de cera: dos ángulos fijos para esta etapa, mejor hacia abajo (la cera se escurre).
  const lenguas = [0.35 + fijo(sem, 1) * 1.1, 1.9 + fijo(sem, 2) * 1.3];
  const borde = [];
  const N = 44;
  for (let k = 0; k < N; k++) {
    const t = (k / N) * TAU;
    let r = 39 + 1.5 * Math.sin(3 * t + fijo(sem, 3) * 6) + 1.1 * Math.sin(5 * t + fijo(sem, 4) * 6) + 0.8 * Math.sin(9 * t + fijo(sem, 5) * 6);
    for (const [j, a] of lenguas.entries()) { let dt = Math.abs(t - a); dt = Math.min(dt, TAU - dt); r += (j ? 4.2 : 6) * Math.exp(-((dt / 0.17) ** 2)); }
    borde.push([50 + Math.cos(t) * r, 50 + Math.sin(t) * r]);
  }
  const forma = suave(borde);
  const id = (n) => `s-${n}-${llave}`;
  let s = `<svg class="lacre${clase}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs>`
    + `<radialGradient id="${id('cera')}" cx="0.64" cy="0.32" r="0.78"><stop class="lc-c0" offset="0"/><stop class="lc-c1" offset="0.55"/><stop class="lc-c2" offset="1"/></radialGradient>`
    // La huella es cóncava: oscura del lado de la luz, clara del lado contrario.
    + `<linearGradient id="${id('hondo')}" x1="0.85" y1="0.1" x2="0.2" y2="0.95"><stop class="lc-h0" offset="0"/><stop class="lc-h1" offset="1"/></linearGradient>`
    // El aro levantado es convexo: claro hacia la luz.
    + `<linearGradient id="${id('aro')}" x1="0.85" y1="0.1" x2="0.2" y2="0.95"><stop class="lc-a0" offset="0"/><stop class="lc-a1" offset="0.5"/><stop class="lc-a2" offset="1"/></linearGradient>`
    + `<radialGradient id="${id('brillo')}" cx="0.5" cy="0.5" r="0.5"><stop class="lc-b0" offset="0"/><stop class="lc-b1" offset="1"/></radialGradient>`
    + '</defs>';
  s += `<g class="lc-cuerpo"><path class="lc-sombra" d="${forma}" transform="translate(1.6 2.4)"/>`
    + `<path class="lc-cera" fill="url(#${id('cera')})" d="${forma}"/>`
    // El canto de la cera, encendido del lado del astro; y el lado en sombra.
    + `<path class="lc-canto-luz" d="${lin(borde.filter((_, k) => { const t = (k / N) * TAU; return Math.cos(t) * 0.55 - Math.sin(t) * 0.62 > 0.35; }))}"/>`
    // La huella del sello: el disco hundido, su aro levantado y un aro fino grabado dentro.
    + `<circle class="lc-aro" stroke="url(#${id('aro')})" cx="50" cy="50" r="30.5"/>`
    + `<circle class="lc-hondo" fill="url(#${id('hondo')})" cx="50" cy="50" r="28.6"/>`
    + '<circle class="lc-grab-osc" cx="50.5" cy="50.5" r="25.2"/><circle class="lc-grab-luz" cx="49.6" cy="49.6" r="25.2"/>';
  // Una corona de puntitos dentro del aro, como el granulado de una moneda.
  let granos = '';
  for (let k = 0; k < 28; k++) { const t = (k / 28) * TAU; granos += `M${f2(50 + Math.cos(t) * 27)} ${f2(50 + Math.sin(t) * 27)}h0.01`; }
  s += `<path class="lc-grano" d="${granos}"/>`;
  // El relieve: cada figura tres veces (sombra abajo a la izquierda, luz arriba a la derecha y la cera encima).
  const relieve = (fig) => `<g class="lc-rel-osc" transform="translate(-0.7 0.8)">${fig}</g><g class="lc-rel-luz" transform="translate(0.6 -0.6)">${fig}</g><g class="lc-rel">${fig}</g>`;
  let fig = '';
  if (!texto) fig = `<path d="${montanita(50, 51, 30)}"/>`;
  else {
    const btc = / BTC$/.test(texto), cifra = btc ? texto.replace(/ BTC$/, '') : texto;
    // Que la cifra quepa dentro del disco: el tamaño baja con los caracteres.
    const fs = Math.min(btc ? 22 : 20.5, 44 / (cifra.length * 0.56));
    fig = `<path d="${montanita(50, btc ? 33 : 35.5, 13)}"/>`
      + `<text class="lc-cifra" x="50" y="${f1(btc ? 55 + fs * 0.12 : 50 + fs * 0.36)}" text-anchor="middle" font-size="${f1(fs)}">${esc(cifra)}</text>`;
    if (btc) fig += '<text class="lc-unidad" x="50" y="69" text-anchor="middle">BTC</text>';
    else fig += '<path d="M43 64.5h14"/>';
  }
  s += relieve(fig);
  // El brillo especular de la cera (arriba a la derecha) y un punto de luz muy fino.
  s += `<ellipse class="lc-brillo" fill="url(#${id('brillo')})" cx="66" cy="27" rx="11" ry="5.5" transform="rotate(-38 66 27)"/>`
    + '<path class="lc-chispa" d="M71.5 22.6h0.01M28 76h0.01"/></g>';
  // El destello al caer (solo lo enciende la tarjeta de celebración).
  s += '<circle class="lc-destello" cx="50" cy="50" r="42"/>';
  return `${s}</svg>`;
}

/** El sello de lacre de una etapa (`m` en sats). */
export function lacre(m, { grande = false } = {}) {
  return sello(`${Math.round(m)}${grande ? 'g' : 'p'}`, nombreHito(m), { clase: grande ? ' grande' : '' });
}

// ================================================================ el certificado de altitud

const ANCHO = 480, ALTO = 340;

/** Un punto de una curva de guilloché: un rosetón de `n` lóbulos (epitrocoide) de radio `R`, con lazo `d` y giro `fase`. */
function epitrocoide(cx, cy, R, n, d, fase, pasos) {
  // Un círculo pequeño (radio b) rueda por fuera de uno grande (radio a = n·b): la curva se cierra en una vuelta con n lóbulos.
  const b = R / (n + 1 + d), a = n * b, pts = [];
  for (let k = 0; k <= pasos; k++) {
    const t = (k / pasos) * TAU;
    const x = (a + b) * Math.cos(t) - d * b * Math.cos(((a + b) / b) * t);
    const y = (a + b) * Math.sin(t) - d * b * Math.sin(((a + b) / b) * t);
    pts.push([cx + x * Math.cos(fase) - y * Math.sin(fase), cy + x * Math.sin(fase) + y * Math.cos(fase)]);
  }
  return lin(pts);
}
/** Un anillo ondulado: radio `r` que sube y baja `amp` con `n` ondas; varias fases juntas forman una trenza. */
function onda(cx, cy, r, amp, n, fase, pasos) {
  const pts = [];
  for (let k = 0; k <= pasos; k++) { const t = (k / pasos) * TAU, rr = r + amp * Math.sin(n * t + fase); pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]); }
  return lin(pts);
}

/** El marco: una banda de ondas trenzadas a lo largo de cada lado (tantas hebras como diga tu racha), con rosetas en las esquinas. */
function marco(hebras) {
  const m = 21, amp = 4.6; // el centro de la banda y su media anchura
  const lados = [[[m + 13, m], [ANCHO - m - 13, m]], [[ANCHO - m, m + 13], [ANCHO - m, ALTO - m - 13]], [[ANCHO - m - 13, ALTO - m], [m + 13, ALTO - m]], [[m, ALTO - m - 13], [m, m + 13]]];
  let d = '', d2 = '';
  for (const [[ax, ay], [bx, by]] of lados) {
    const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, ondas = Math.round(L / 13), pasos = Math.min(380, ondas * 12);
    for (let h = 0; h < hebras; h++) {
      const pts = [];
      for (let k = 0; k <= pasos; k++) {
        const s = k / pasos, o = amp * Math.sin(s * ondas * TAU + (h / hebras) * TAU) * Math.sin(Math.PI * Math.min(1, s * 12, (1 - s) * 12) / 2);
        pts.push([ax + ux * L * s - uy * o, ay + uy * L * s + ux * o]);
      }
      if (h % 2) d2 += lin(pts); else d += lin(pts);
    }
  }
  let rosas = '';
  for (const [x, y] of [[m, m], [ANCHO - m, m], [ANCHO - m, ALTO - m], [m, ALTO - m]]) {
    rosas += epitrocoide(x, y, 10, 6, 0.9, 0, 120) + epitrocoide(x, y, 10, 6, 0.9, Math.PI / 6, 120);
  }
  return `<path class="c-hebra" d="${d}"/><path class="c-hebra c-hebra-b" d="${d2}"/><path class="c-rosa" d="${rosas}"/>`
    + `<rect class="c-filete" x="${m - 8}" y="${m - 8}" width="${ANCHO - 2 * (m - 8)}" height="${ALTO - 2 * (m - 8)}" rx="4"/>`
    + `<rect class="c-filete" x="${m + 8}" y="${m + 8}" width="${ANCHO - 2 * (m + 8)}" height="${ALTO - 2 * (m + 8)}" rx="2"/>`;
}

/** Parte un texto largo en dos líneas por el espacio más cercano a la mitad. */
function partir(t) {
  const mitad = t.length / 2;
  let mejor = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (mejor < 0 || Math.abs(i - mitad) < Math.abs(mejor - mitad))) mejor = i;
  return mejor < 0 ? [t] : [t.slice(0, mejor), t.slice(mejor + 1)];
}

/** Certificado de altitud: `d` es `lib.datosCertificado`. Un grabado como el de un diploma, con un guilloché hecho de tus datos. */
export function certificado(d) {
  const lob = Math.max(3, Math.min(48, Math.round(d.lobulos || 3)));
  const alt = Math.max(0, Math.min(1, d.altitud || 0));
  const trenzas = Math.max(1, Math.min(12, Math.round(d.trenzas || 1)));
  const hebras = 2 + Math.min(4, Math.floor(trenzas / 3)); // 2 a 6 hebras en el marco
  const cx = 240, cy = 180, R = 62 + 58 * alt; // el rosetón crece con tu altitud
  const pasos = Math.min(400, Math.max(180, lob * 8));
  let s = `<svg class="certificado" viewBox="0 0 ${ANCHO} ${ALTO}" aria-hidden="true" focusable="false"><defs>`
    + '<radialGradient id="c-papel" cx="0.5" cy="0.45" r="0.72"><stop class="c-p0" offset="0"/><stop class="c-p1" offset="0.7"/><stop class="c-p2" offset="1"/></radialGradient>'
    + `<path id="c-micro" d="M44 37H436Q443 37 443 44V296Q443 303 436 303H44Q37 303 37 296V44Q37 37 44 37Z"/>`
    + `<clipPath id="c-dentro"><rect x="30" y="30" width="${ANCHO - 60}" height="${ALTO - 60}"/></clipPath>`
    + '</defs>';
  s += `<rect class="c-papel" x="0" y="0" width="${ANCHO}" height="${ALTO}" rx="10"/>`;
  s += marco(hebras);
  // El microtexto que rodea el campo, como en los billetes (decoración: los lectores leen la descripción del diálogo).
  s += `<text class="c-micro"><textPath href="#c-micro">${'LIBRO DCA · ALTITUD · '.repeat(40)}</textPath></text>`;

  // El rosetón: tantos lóbulos como compras (de 3 a 48), su tamaño por tu altitud y una trenza por cada tramo de tu racha.
  let rosa = '', rosaB = '', trenza = '';
  for (let k = 0; k < 3; k++) rosa += epitrocoide(cx, cy, R * 0.98, lob, 1.25, (k / 3) * (TAU / lob), pasos);
  for (let k = 0; k < 2; k++) rosaB += epitrocoide(cx, cy, R * 0.6, lob, 0.85, (k + 0.5) / 2 * (TAU / lob), pasos);
  const nt = Math.min(6, 1 + Math.ceil(trenzas / 2));
  for (let k = 0; k < nt; k++) trenza += onda(cx, cy, R * 1.12, R * 0.045, lob * 2, (k / nt) * TAU, Math.min(400, lob * 16));
  s += `<g class="c-guilloche" clip-path="url(#c-dentro)"><path class="c-rosa-a" d="${rosa}"/><path class="c-rosa-b" d="${rosaB}"/><path class="c-trenza" d="${trenza}"/>`
    + `<circle class="c-rosa-c" cx="${cx}" cy="${cy}" r="${f1(R * 0.22)}"/></g>`;

  // Los textos: el título, a quién, el saldo en letras (una o dos líneas, el tamaño baja con el largo) y la cifra.
  const nombre = esc(d.nombre ?? 'Libro DCA');
  s += '<text class="c-titulo" x="240" y="78" text-anchor="middle">Certificado de altitud</text>'
    + '<path class="c-regla" d="M168 92H226M254 92H312M240 87l4 5l-4 5l-4 -5Z"/>'
    + `<text class="c-pre" x="240" y="114" text-anchor="middle">${d.nombre ? 'Se hace constar que' : 'Se hace constar que el'}</text>`
    + `<text class="c-nombre" x="240" y="140" text-anchor="middle">${nombre}</text>`
    + '<text class="c-pre" x="240" y="162" text-anchor="middle">ha subido, compra a compra, hasta</text>';
  const letras = String(d.letras ?? '');
  const ancho = (t, fs) => t.length * fs * 0.5; // Fraunces mide unos 0.5 em por letra
  let lineas = [letras], fs = 20;
  if (ancho(letras, fs) > 360) { lineas = partir(letras); fs = Math.max(11, Math.min(18, 360 / (Math.max(...lineas.map((l) => l.length)) * 0.5))); }
  const y0 = lineas.length === 1 ? 194 : 186;
  lineas.forEach((l, k) => { s += `<text class="c-letras" x="240" y="${f1(y0 + k * fs * 1.2)}" text-anchor="middle" font-size="${f1(fs)}">${esc(l)}</text>`; });
  const yC = y0 + (lineas.length - 1) * fs * 1.2 + 22;
  s += `<text class="c-cifra" x="240" y="${f1(yC)}" text-anchor="middle">${esc(entero(d.sats ?? 0))} sats · ${esc(d.btc)} BTC</text>`;

  // Abajo: la fecha a la izquierda, la constancia a la derecha y, al centro, el sello de lacre de tu última etapa.
  const pie = 266;
  s += `<path class="c-linea" d="M70 ${pie}H178M302 ${pie}H410"/>`
    + `<text class="c-dato" x="124" y="${pie - 6}" text-anchor="middle">${esc(d.fecha)}</text>`
    + `<text class="c-rotulo" x="124" y="${pie + 12}" text-anchor="middle">FECHA</text>`
    + `<text class="c-dato" x="356" y="${pie - 6}" text-anchor="middle">${esc(entero(d.nCompras ?? 0))} ${d.nCompras === 1 ? 'compra' : 'compras'}${d.racha > 1 ? ` · racha de ${esc(d.racha)}` : ''}</text>`
    + `<text class="c-rotulo" x="356" y="${pie + 12}" text-anchor="middle">CONSTANCIA</text>`;
  const etapa = etapaAnterior(d.sats ?? 0);
  const sel = sello('cert', etapa ? nombreHito(etapa) : null, { clase: ' c-sello' });
  s += `<g transform="translate(206 ${pie - 40}) rotate(-8 34 34) scale(0.68)">${sel.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`;
  return `${s}</svg>`;
}
