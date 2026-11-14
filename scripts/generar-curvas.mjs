// Genera app/static/curvas.svg: un mosaico (800×800) de curvas de nivel muy tenues, para el fondo del tema claro («papel» que se lee
// como mapa). Son varios «cerros» con anillos de forma irregular y cerrada; ningún anillo toca el borde del mosaico, así que se repite
// sin costuras. Es determinista (sin Math.random): volver a correrlo da el mismo archivo. Uso: node scripts/generar-curvas.mjs
import { writeFileSync } from 'node:fs';

const T = 800;
let semilla = 20261114;
const azar = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 2 ** 32; };
const f1 = (n) => Math.round(n * 10) / 10;

// [cx, cy, radio máximo, anillos]
const cerros = [[190, 210, 170, 8], [590, 170, 120, 6], [610, 560, 190, 9], [215, 600, 130, 6], [400, 400, 70, 3]];
let d = '';
for (const [cx, cy, R, n] of cerros) {
  const h = [1, 2, 3].map(() => ({ a: 0.05 + azar() * 0.09, f: 0, ph: azar() * Math.PI * 2 }));
  h.forEach((q, i) => { q.f = i + 2; });
  for (let k = 1; k <= n; k++) {
    const r0 = (R * k) / n;
    const pts = [];
    const m = 28;
    for (let i = 0; i < m; i++) {
      const t = (i / m) * Math.PI * 2;
      let g = 1;
      for (const q of h) g += q.a * Math.sin(q.f * t + q.ph + k * 0.18);
      pts.push([cx + Math.cos(t) * r0 * g, cy + Math.sin(t) * r0 * g * 0.86]);
    }
    // Curva suave cerrada (Catmull-Rom a Bézier).
    let s = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < m; i++) {
      const p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
      s += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    d += `${s}Z`;
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}"><path d="${d}" fill="none" stroke="#7a5a2b" stroke-opacity="0.06" stroke-width="1.1"/></svg>\n`;
writeFileSync(new URL('../app/static/curvas.svg', import.meta.url), svg);
console.log(`curvas.svg: ${svg.length} bytes`);
