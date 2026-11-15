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

// ================================================================ el sello de la semana (campamento 13C)
// Un matasellos de goma, como los de un pasaporte de senderista: doble aro con el rango de la semana en microtexto, la montañita con tu
// punto a la altura que tenías esa semana y el número del sello. La tinta no es pareja (huecos fijos y un lado con menos presión), el
// sello va un poco girado y el color cambia con la estación: añil (dic–feb), verde bosque (mar–may), cobre (jun–ago) y burdeos (sep–nov).

const ESTACION = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0]; // por mes (enero = 0)
/** El sendero en zigzag por el que sube el punto dentro de la montañita del sello (de la base a la cumbre). */
const SENDA = [[32.2, 42.6], [24.6, 38.3], [32.5, 33.9], [26.4, 29.5], [28.4, 24.4]];
function enSenda(t) {
  const tramos = SENDA.slice(1).map((p, k) => Math.hypot(p[0] - SENDA[k][0], p[1] - SENDA[k][1]));
  let resto = Math.max(0, Math.min(1, t)) * tramos.reduce((a, b) => a + b, 0);
  for (let k = 0; k < tramos.length; k++) {
    if (resto <= tramos[k] || k === tramos.length - 1) { const u = Math.min(1, resto / tramos[k]), [a, b] = [SENDA[k], SENDA[k + 1]]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
    resto -= tramos[k];
  }
  return SENDA.at(-1);
}

/** Sello de una semana con compras (`lib.sellosSemana`): `grande` para la tarjeta de celebración, `nuevo` si acaba de nacer (se estampa). */
export function selloSemana(s, { grande = false, nuevo = false } = {}) {
  const k = `ss-${s.idx}${grande ? 'g' : 'p'}`, num = s.numero ?? 1;
  const tinta = ESTACION[(Number(String(s.desde ?? '').slice(5, 7)) || 1) - 1];
  const giro = (fijo(num, 1) - 0.5) * 26;
  // La presión de la mano: un lado del sello sale más cargado que el otro (la máscara pasa de blanco a gris).
  const ang = fijo(num, 2) * TAU, gx = 0.5 + Math.cos(ang) * 0.5, gy = 0.5 + Math.sin(ang) * 0.5;
  // Los huecos de la goma gastada: puntitos y un par de rayas donde no tomó la tinta (fijos por número).
  let huecos = '';
  for (let j = 0; j < 20; j++) {
    const a = fijo(num, 10 + j) * TAU, r = 5 + 25 * Math.sqrt(fijo(num, 40 + j)), rr = 0.3 + 0.75 * fijo(num, 70 + j);
    huecos += `M${f2(32 + Math.cos(a) * r - rr)} ${f2(32 + Math.sin(a) * r)}a${f2(rr)} ${f2(rr)} 0 1 0 ${f2(2 * rr)} 0a${f2(rr)} ${f2(rr)} 0 1 0 ${f2(-2 * rr)} 0Z`;
  }
  for (let j = 0; j < 2; j++) {
    const a = fijo(num, 90 + j) * TAU, b = a + 0.35 + 0.3 * fijo(num, 92 + j), r = 27.5 + 1.6 * (fijo(num, 94 + j) - 0.5);
    huecos += `M${f2(32 + Math.cos(a) * r)} ${f2(32 + Math.sin(a) * r)}A${r} ${r} 0 0 1 ${f2(32 + Math.cos(b) * r)} ${f2(32 + Math.sin(b) * r)}`;
  }
  const micro = `SEMANA · ${String(s.nombre ?? '').toUpperCase()} · LIBRO DCA ·`;
  const [px, py] = enSenda(s.altitud ?? 0);
  let o = `<svg class="sello-sem-ico ss-t${tinta}${grande ? ' grande' : ''}${nuevo ? ' nuevo' : ''}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs>`
    + `<linearGradient id="${k}-p" x1="${f2(gx)}" y1="${f2(gy)}" x2="${f2(1 - gx)}" y2="${f2(1 - gy)}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8c8c8c"/></linearGradient>`
    + `<mask id="${k}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="url(#${k}-p)"/>`
    + `<path d="${huecos}" fill="#000" stroke="#000" stroke-width="0.7" stroke-linecap="round"/></mask>`
    + `<path id="${k}-c" d="M8.2 32a23.8 23.8 0 1 1 47.6 0a23.8 23.8 0 1 1 -47.6 0"/></defs>`;
  o += `<g class="ss-tinta" mask="url(#${k}-m)" transform="rotate(${f1(giro)} 32 32)">`
    // El doble aro (el de fuera más grueso) y un segundo golpe muy tenue, corrido: la mano tembló al estampar.
    + '<circle class="ss-aro" cx="32" cy="32" r="29"/><circle class="ss-aro2" cx="32" cy="32" r="21.6"/>'
    + '<circle class="ss-eco" cx="32.7" cy="31.4" r="29"/>'
    + `<text class="ss-micro"><textPath href="#${k}-c" textLength="146" lengthAdjust="spacing">${esc(micro)}</textPath></text>`
    // La montañita (contorno, con la nieve de la cumbre), el sendero punteado y tu punto a la altura de esa semana.
    + `<path class="ss-monte" d="M16.4 43L28.2 22.4L34.2 32.2L38.8 26.2L48 43Z"/><path class="ss-nieve" d="M24.8 28.3L28.2 22.4L31.6 28L29.6 26.9L27.4 29Z"/>`
    + `<path class="ss-senda" d="${lin(SENDA)}"/><circle class="ss-yo" cx="${f1(px)}" cy="${f1(py)}" r="1.9"/>`
    + `<text class="ss-num" x="32" y="50.8" text-anchor="middle">N.º ${esc(num)}</text>`;
  if (s.extra) o += '<path class="ss-extra" d="M32 11.2Q32.5 13.1 34.4 13.6Q32.5 14.1 32 16Q31.5 14.1 29.6 13.6Q31.5 13.1 32 11.2Z"/>';
  o += '</g>';
  // El golpe al estamparse (solo se ve en la tarjeta del sello nuevo).
  if (nuevo) o += '<circle class="ss-golpe" cx="32" cy="32" r="29"/>';
  return `${o}</svg>`;
}

// ---------------------------------------------------------------------------------------------
// Campamento 15A · cartas para el futuro: el sobre con su lacre
// ---------------------------------------------------------------------------------------------
// El sobre visto por detrás (las cuatro solapas, en tonos planos: la luz llega de arriba a la derecha, así que la solapa izquierda es la
// más oscura) y en la punta de la solapa una gota de cera en el mismo lenguaje que `lacre()`: canto, huella hundida con su aro, figura en
// relieve y brillo. Papel propio y cálido en los dos temas (clases `ca-…`); la cera usa la paleta del lacre (`--lc-…`, dorada desde
// 1 BTC). Sin ids: nada de degradados ni recortes, así que pueden convivir muchos sobres en la página. El texto de la carta no existe aquí.

/** El borde de una gota de cera de radio `r` en (cx, cy); `sem` le da su forma (siempre la misma para la misma carta). Devuelve t → [x, y]. */
const gota = (cx, cy, r, sem) => {
  const lenguas = [0.5 + fijo(sem, 1) * 0.9, 2.1 + fijo(sem, 2) * 0.9];
  return (t) => {
    let q = r * (1 + 0.05 * Math.sin(3 * t + fijo(sem, 3) * 6) + 0.035 * Math.sin(5 * t + fijo(sem, 4) * 6));
    for (const [j, a] of lenguas.entries()) { let dt = Math.abs(t - a); dt = Math.min(dt, TAU - dt); q += r * (j ? 0.13 : 0.19) * Math.exp(-((dt / 0.2) ** 2)); }
    return [cx + Math.cos(t) * q, cy + Math.sin(t) * q];
  };
};
const arco = (borde, t0, t1, n) => Array.from({ length: n + 1 }, (_, k) => borde(t0 + ((t1 - t0) * k) / n));
/** La figura en relieve del sello de la carta: una montañita si se abre con una etapa, una estrella de cuatro puntas si se abre en una fecha. */
const figura = (cx, cy, r, etapa) => (etapa
  ? montanita(cx, cy + r * 0.04, r * 0.82)
  : `M${f1(cx)} ${f1(cy - r * 0.48)}Q${f1(cx + r * 0.08)} ${f1(cy - r * 0.08)} ${f1(cx + r * 0.48)} ${f1(cy)}Q${f1(cx + r * 0.08)} ${f1(cy + r * 0.08)} ${f1(cx)} ${f1(cy + r * 0.48)}`
    + `Q${f1(cx - r * 0.08)} ${f1(cy + r * 0.08)} ${f1(cx - r * 0.48)} ${f1(cy)}Q${f1(cx - r * 0.08)} ${f1(cy - r * 0.08)} ${f1(cx)} ${f1(cy - r * 0.48)}Z`);
/** El sello entero (sin romper). */
const ceraEntera = (cx, cy, r, sem, etapa) => {
  const borde = gota(cx, cy, r, sem);
  const forma = suave(arco(borde, 0, TAU, 36).slice(0, 36));
  return `<g class="ca-cera"><path class="lc-sombra" d="${forma}" transform="translate(0.9 1.5)"/><path class="ca-cera-c" d="${forma}"/>`
    + `<path class="ca-cera-luz" d="${lin(arco(borde, -1.45, 0.25, 10))}"/>`
    + `<circle class="ca-hondo" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.66)}"/>`
    + `<circle class="ca-aro" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.74)}" pathLength="100"/>`
    + `<path class="lc-rel-osc" d="${figura(cx, cy, r * 0.62, etapa)}" transform="translate(-0.5 0.6)"/><path class="lc-rel-luz" d="${figura(cx, cy, r * 0.62, etapa)}" transform="translate(0.4 -0.4)"/>`
    + `<path class="lc-rel" d="${figura(cx, cy, r * 0.62, etapa)}"/>`
    + `<ellipse class="ca-brillo" cx="${f1(cx + r * 0.42)}" cy="${f1(cy - r * 0.5)}" rx="${f1(r * 0.24)}" ry="${f1(r * 0.12)}" transform="rotate(-38 ${f1(cx + r * 0.42)} ${f1(cy - r * 0.5)})"/></g>`;
};

/** El sobre de una carta aún sellada (`c`: la carta; su id solo cambia la forma de la cera y su giro; la figura dice si espera una etapa o una fecha). */
export function cartaSellada(c = {}) {
  const sem = Number(c.id ?? 1) * 13 + 5;
  const giro = (fijo(sem, 7) - 0.5) * 24;
  const etapa = c.abre_sats != null && !c.abre_fecha;
  return `<svg class="carta-ico sellada" viewBox="0 0 96 72" aria-hidden="true" focusable="false">`
    + '<rect class="ca-sombra" x="6" y="11" width="88" height="57" rx="3.5"/>'
    + '<rect class="ca-papel" x="4" y="8" width="88" height="57" rx="3.5"/>'
    + '<path class="ca-solapa-i" d="M5 10L45 41L5 63Z"/><path class="ca-solapa-d" d="M91 10L51 41L91 63Z"/>'
    + '<path class="ca-solapa-b" d="M6 64.5L48 36L90 64.5Z"/>'
    // La solapa de arriba cierra el sobre y proyecta su sombra sobre las demás.
    + '<path class="ca-pliegue" d="M5.5 9.5L48 48.5L90.5 9.5Z"/>'
    + '<path class="ca-solapa-a" d="M5 9L48 45.5L91 9Z"/>'
    + '<path class="ca-borde-solapa" d="M5 9L48 45.5L91 9"/>'
    + '<path class="ca-filo" d="M7.5 8.4H88.5M50 43.8L90 10.2"/>'
    + '<path class="ca-canto" d="M7.5 8h81a3.5 3.5 0 0 1 3.5 3.5v50a3.5 3.5 0 0 1 -3.5 3.5h-81a3.5 3.5 0 0 1 -3.5 -3.5v-50a3.5 3.5 0 0 1 3.5 -3.5Z"/>'
    + `<g transform="rotate(${f1(giro)} 48 45)">${ceraEntera(48, 45, 11.5, sem, etapa)}</g></svg>`;
}

/** Media gota de cera rota: `lado` -1 (izquierda) o 1 (derecha); la grieta es la misma en las dos mitades. */
const mitadCera = (cx, cy, r, sem, lado) => {
  const borde = gota(cx, cy, r, sem);
  const grieta = [borde(-Math.PI / 2), [cx + 1.4, cy - r * 0.5], [cx - 1.6, cy - r * 0.08], [cx + 1.2, cy + r * 0.38], [cx - 0.6, cy + r * 0.7], borde(Math.PI / 2)];
  const cuerpo = lado < 0 ? [...grieta, ...arco(borde, Math.PI / 2, 1.5 * Math.PI, 14).slice(1, -1)] : [...grieta, ...arco(borde, Math.PI / 2, -Math.PI / 2, 14).slice(1, -1)];
  const hondo = (t) => [cx + Math.cos(t) * r * 0.64, cy + Math.sin(t) * r * 0.64];
  const aro = lado < 0 ? arco(hondo, 1.9, 4.2, 10) : arco(hondo, 1.25, -1.15, 10);
  return `<path class="lc-sombra" d="${lin(cuerpo, true)}" transform="translate(0.8 1.3)"/><path class="ca-cera-c" d="${lin(cuerpo, true)}"/>`
    // Lo que queda de la huella: medio aro hundido en cada mitad.
    + `<path class="ca-aro-roto" d="${lin(aro)}"/>`
    + `<path class="ca-cera-luz" d="${lin(lado > 0 ? arco(borde, -1.4, 0.2, 8) : arco(borde, -2.3, -1.7, 4))}"/>`
    + `<path class="ca-rotura" d="${lin(grieta)}"/>`;
};

/** La carta abierta: la solapa levantada, la carta asomando y el lacre partido en dos. `abriendo` (solo la primera lectura) anima la rotura. */
export function cartaAbierta({ abriendo = false } = {}) {
  const sem = 31;
  let lineas = '';
  for (const [y, a, b] of [[25, 24, 72], [31, 24, 70], [37, 24, 72], [43, 24, 64], [49, 24, 71]]) lineas += `M${a} ${y}H${b}`;
  return `<svg class="carta-ico abierta${abriendo ? ' abriendo' : ''}" viewBox="0 0 96 84" aria-hidden="true" focusable="false">`
    + '<rect class="ca-sombra" x="6" y="37" width="88" height="45" rx="3.5"/>'
    // El interior del sobre y la solapa abierta hacia arriba (se ve su cara de dentro).
    + '<path class="ca-solapa-abierta" d="M4 35L48 7L92 35Z"/><path class="ca-filo" d="M48 7.6L89 34"/>'
    + '<rect class="ca-dentro" x="4" y="34" width="88" height="46" rx="3.5"/>'
    // La carta, que sube al abrirse.
    + `<g class="ca-carta"><rect class="ca-hoja" x="15" y="14" width="66" height="58" rx="1.5"/><path class="ca-renglon" d="${lineas}"/>`
    + '<path class="ca-firma" d="M54 55q3 -5 5 -1t5 -1q2 -3 4 0"/></g>'
    // El bolsillo: las solapas de los lados y la de abajo, por delante de la carta.
    + '<path class="ca-solapa-i" d="M4 35L46 59L4 80Z"/><path class="ca-solapa-d" d="M92 35L50 59L92 80Z"/>'
    + '<path class="ca-solapa-b" d="M5 80L48 55L91 80Z"/>'
    + '<path class="ca-canto" d="M4 37.5V76.5a3.5 3.5 0 0 0 3.5 3.5h81a3.5 3.5 0 0 0 3.5 -3.5V37.5M4 35L48 7L92 35"/>'
    // El lacre roto: una mitad se quedó a cada lado (la de fuera fija la posición; la de dentro es la que se anima).
    + `<g transform="translate(-4.6 1.4) rotate(-17 48 58)"><g class="ca-mitad ca-mitad-i">${mitadCera(48, 58, 10.5, sem, -1)}</g></g>`
    + `<g transform="translate(4.8 2.4) rotate(14 48 58)"><g class="ca-mitad ca-mitad-d">${mitadCera(48, 58, 10.5, sem, 1)}</g></g>`
    + (abriendo ? '<circle class="ca-destello" cx="48" cy="59" r="12"/><path class="ca-migas" d="M41 50h0.01M57 52h0.01M45 70h0.01M55 68h0.01"/>' : '')
    + '</svg>';
}
