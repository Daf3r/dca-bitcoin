// (Campamento 59) El arte de la fiesta del hito: funciones puras que devuelven SVG como texto, sin DOM. Los colores los pone el CSS
// (clases `fi-…`, con las variables que mueve la hora); nada de estilo en línea. Cada pieza que se mueve devuelve su caja [x, y, w, h]
// en píxeles de la escena: montana.js la pone en su propia capa pequeña (un <svg> hermano del principal) y la mueve entera.

const f1 = (n) => n.toFixed(1);
/** Un azar con semilla (el de la escena, `rnd()`, no se toca: la forma de la montaña no cambia). */
function azar(s) {
  let x = s >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
}
const circulo = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;

/**
 * Las ondas de la campana de la torre: tres arcos sobre la campana y su destello. (x, y): el centro de la campana; `k`: la escala del
 * pueblo. La capa entera late (escala y opacidad) una vez por toque. Dos trazos.
 * @param {number} x
 * @param {number} y
 * @param {number} k
 */
export function ondasCampana(x, y, k) {
  let d = '';
  for (let i = 1; i <= 3; i++) { const r = (2 + i * 2.2) * k; d += `M${f1(x - r * 0.8)} ${f1(y - r * 0.6)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r * 0.8)} ${f1(y - r * 0.6)}`; }
  const R = 9.4 * k;
  return { caja: [x - R, y - R * 1.05, 2 * R, R * 1.5], svg: `<path class="fi-onda" d="${d}"/><path class="fi-campana" d="${circulo(x, y, 1.1 * k)}"/>` };
}

/**
 * Los farolitos de papel que suben de la plaza: `n` (1 a 7) en una nube alrededor de (cx, cy), cada uno su halo, su cuerpo y su llama,
 * todos en tres trazos (uno por tono). La capa sube entera (transform). `semilla`: el mismo reparto en cada aparato.
 * @param {number} n
 * @param {number} cx
 * @param {number} cy
 * @param {number} k
 * @param {number} [semilla]
 */
export function farolitos(n, cx, cy, k, semilla = 59) {
  const r = azar(semilla);
  let halos = '', cuerpos = '', llamas = '', x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + r() * 0.8, dist = n > 1 ? (3 + r() * 6) * k : 0;
    const x = cx + Math.cos(a) * dist * 1.6, y = cy + Math.sin(a) * dist - i * 1.2 * k, e = k * (0.55 + r() * 0.25);
    halos += circulo(x, y, 4.2 * e);
    cuerpos += `M${f1(x - 1.6 * e)} ${f1(y - 2.2 * e)}h${f1(3.2 * e)}l${f1(0.6 * e)} ${f1(3.9 * e)}h${f1(-4.4 * e)}Z`;
    llamas += `M${f1(x - 0.8 * e)} ${f1(y + 2 * e)}h${f1(1.6 * e)}v${f1(0.8 * e)}h${f1(-1.6 * e)}Z`;
    x0 = Math.min(x0, x - 4.4 * e); x1 = Math.max(x1, x + 4.4 * e); y0 = Math.min(y0, y - 4.4 * e); y1 = Math.max(y1, y + 4.4 * e);
  }
  return { caja: [x0, y0, x1 - x0, y1 - y0], svg: `<path class="fi-halo" d="${halos}"/><path class="fi-cuerpo" d="${cuerpos}"/><path class="fi-llama" d="${llamas}"/>` };
}

/**
 * Una palma de cohete: `rayos` rayos desde el centro y una chispa al final de cada uno, en dos trazos. (x, y): el centro; `r`: el radio;
 * `c`: el color (0–3, clases `fi-c0`…`fi-c3`). La capa estalla entera (escala y opacidad).
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} c
 * @param {number} [rayos]
 */
export function palma(x, y, r, c, rayos = 12) {
  let d = '', pts = '';
  for (let i = 0; i < rayos; i++) {
    const a = (i / rayos) * Math.PI * 2 + 0.2, r0 = r * 0.28, r1 = r * (0.78 + 0.11 * ((i * 7) % 3));
    d += `M${f1(x + Math.cos(a) * r0)} ${f1(y + Math.sin(a) * r0)}L${f1(x + Math.cos(a) * r1)} ${f1(y + Math.sin(a) * r1 + r * 0.06)}`;
    const px = x + Math.cos(a) * r1 * 1.12, py = y + Math.sin(a) * r1 * 1.12 + r * 0.1;
    pts += `M${f1(px - 0.9)} ${f1(py)}h1.8`;
  }
  const R = r * 1.25 + 2;
  return { caja: [x - R, y - R, 2 * R, 2 * R], svg: `<path class="fi-rayos fi-c${c % 4}" d="${d}"/><path class="fi-chispas" d="${pts}"/>` };
}

/**
 * El farol del hito: un farolito de papel colgado de un cordel entre los dos faroles de la plaza, encendido hasta la medianoche del día
 * de la fiesta. Sin cifra ni nombre. (x0, x1): los postes; `y`: la altura de sus faroles; `k`: la escala. Tres trazos, quietos.
 * @param {number} x0
 * @param {number} x1
 * @param {number} y
 * @param {number} k
 */
export function farolHito(x0, x1, y, k) {
  const x = (x0 + x1) / 2, yc = y + 2.2 * k, yf = yc + 1.2 * k;
  const cordel = `M${f1(x0)} ${f1(y)}Q${f1(x)} ${f1(y + 4.4 * k)} ${f1(x1)} ${f1(y)}M${f1(x)} ${f1(yc)}v${f1(1.2 * k)}`;
  const cuerpo = `M${f1(x - 1.5 * k)} ${f1(yf)}h${f1(3 * k)}l${f1(0.55 * k)} ${f1(3.4 * k)}h${f1(-4.1 * k)}Z`;
  return `<g class="v-farol-hito" aria-hidden="true"><path class="fi-halo" d="${circulo(x, yf + 1.8 * k, 4.6 * k)}"/><path class="fi-cordel" d="${cordel}"/><path class="fi-cuerpo" d="${cuerpo}"/></g>`;
}
