import { chromium, servidor, abrir, OUT } from './comun.mjs';
export async function emocion(p, o) {
  return p.evaluate(async (o) => {
    const NS = 'http://www.w3.org/2000/svg';
    const M = document.querySelector('#montana').getBoundingClientRect();
    const caja = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x - M.x, y: r.y - M.y, w: r.width, h: r.height }; };
    const src = [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.href).find((u) => u.includes('arte-vecinos')); const V = await import(src);
    const pl = caja('.v-plaza'), ch = caja('.v-teja') ?? caja('.v-chimenea'), cu = caja('.cumbre'), os = [...document.querySelectorAll('.osos .oso')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x - M.x, y: r.y - M.y, w: r.width, h: r.height }; }).filter((r) => r.w > 0);
    const s = pl.w / 74, k = 2.0 * s, cx = pl.x + pl.w * 0.52, cy = pl.y + pl.h * 0.45, H = 6.96 * k;
    let L = [];
    if (o.estado === 'fresco') L = [{ t: 'vecina', x: cx - 22 * s, y: cy, k, r: 1 }, { t: 'vecino', x: cx + 14 * s, y: cy + 1 * s, k, r: 2, f: -1 }, { t: 'osezno', x: cx + 26 * s, y: cy + 2 * s, k, r: 0, s: 0.72, f: -1 }];
    if (o.estado === 'abrigo' || o.estado === 'manta') L = [{ t: 'pupusera', x: cx - 4 * s, y: cy - 1 * s, k, r: 1 }, { t: 'vecina', x: cx - 24 * s, y: cy + 1 * s, k, r: 0 }, { t: 'osezno', x: cx - 15 * s, y: cy + 3 * s, k, r: 2, s: 0.72 }, { t: 'vecino', x: cx + 18 * s, y: cy, k, r: 2, f: -1 }, { t: 'abuela', x: cx + 30 * s, y: cy + 2 * s, k, r: 0, f: -1 }];
    if (o.estado === 'aire') L = [{ t: 'vecina', x: cx - 30 * s, y: cy + 1 * s, k, r: 1 }, { t: 'osezno', x: cx - 8 * s, y: cy + 2 * s, k, r: 0, s: 0.72 }, { t: 'pelota', x: cx + 1 * s, y: cy - 6 * s, k, r: 0 }, { t: 'osezno', x: cx + 10 * s, y: cy + 2 * s, k, r: 2, s: 0.72, f: -1 }, { t: 'abuela', x: cx + 30 * s, y: cy, k, r: 2, f: -1 }, { t: 'vecino', x: cx + 46 * s, y: cy + 2 * s, k, r: 0, f: -1 }, { t: 'escoba', x: cx - 48 * s, y: cy + 1 * s, k, r: 2 }];
    const g = document.querySelector('.v-vecinos');
    if (L.length) { g.innerHTML = V.svgVecinos(L); for (const e of document.querySelectorAll('.v-capa-animal')) e.style.display = 'none'; }
    document.querySelector('#maq')?.remove();
    const svg = document.createElementNS(NS, 'svg'); svg.id = 'maq'; svg.setAttribute('viewBox', `0 0 ${M.width} ${M.height}`); svg.setAttribute('width', M.width); svg.setAttribute('height', M.height);
    svg.style.position = 'absolute'; svg.style.left = '0'; svg.style.top = '0'; svg.style.pointerEvents = 'none'; svg.style.zIndex = '3';
    let h = '';
    const COL = ['#c8452f', '#2f5fa8', '#e3a92a', '#2e8b62', '#7a4fa0'];
    if (['fresco', 'abrigo', 'manta'].includes(o.estado)) { // bufandas: una banda al cuello y su punta
      let i = 0; for (const v of L) { if (v.t === 'pelota') continue; const hh = H * (v.s ?? 1), y = v.y - hh * 0.49, f = v.f ?? 1; h += `<path d="M${v.x - hh * 0.2} ${y - hh * 0.05}h${hh * 0.4}v${hh * 0.1}h${-hh * 0.4}ZM${v.x + f * hh * 0.08} ${y}h${hh * 0.11}v${hh * 0.24}h${-hh * 0.11}Z" fill="${COL[i++ % 5]}"/>`; } }
    if (['abrigo', 'manta', 'fresco'].includes(o.estado) && ch) { const n = o.estado === 'fresco' ? 1 : 3; for (let i = 0; i < n; i++) { const x = ch.x + ch.w * (0.15 + 0.35 * i), y = ch.y - 1 * s; h += `<path d="M${x} ${y}q${3 * s} ${-4 * s} ${-1 * s} ${-9 * s}t${1 * s} ${-9 * s}t${-2 * s} ${-8 * s}" fill="none" stroke="#f3efe6" stroke-width="${2.2 * s}" stroke-linecap="round" opacity="0.5"/>`; } }
    if (['abrigo', 'manta'].includes(o.estado)) { const x = cx - 4 * s; h += `<path d="M${x} ${cy - 16 * s}q${2 * s} ${-3 * s} 0 ${-6 * s}t0 ${-6 * s}" fill="none" stroke="#fff" stroke-width="${0.9 * s}" stroke-linecap="round" opacity="0.6"/><circle cx="${cx - 2 * s}" cy="${pl.y - 16 * s}" r="${8 * s}" fill="#ff9a3c" opacity="0.25"/><path d="M${cx - 4.2 * s} ${pl.y - 19 * s}h${4.4 * s}l${0.8 * s} ${5.2 * s}h${-6 * s}Z" fill="#ffcf8a" stroke="#b86a1c" stroke-width="${0.4 * s}"/>`; }
    if (o.estado === 'manta' && os.length) { const x0 = Math.min(...os.map((r) => r.x)), x1 = Math.max(...os.map((r) => r.x + r.w)), y1 = Math.max(...os.map((r) => r.y + r.h)), y0 = Math.min(...os.map((r) => r.y)), w = x1 - x0, hh = y1 - y0, ym = y0 + hh * 0.5;
      h += `<path d="M${x0 - w * 0.04} ${y1}L${x0 + w * 0.04} ${ym + hh * 0.06}Q${x0 + w * 0.5} ${ym - hh * 0.12} ${x1 - w * 0.04} ${ym + hh * 0.06}L${x1 + w * 0.04} ${y1}Z" fill="#2f4f96"/><path d="M${x0 + w * 0.02} ${ym + hh * 0.22}Q${x0 + w * 0.5} ${ym + hh * 0.04} ${x1 - w * 0.02} ${ym + hh * 0.22}M${x0 - w * 0.01} ${ym + hh * 0.38}Q${x0 + w * 0.5} ${ym + hh * 0.2} ${x1 + w * 0.01} ${ym + hh * 0.38}" fill="none" stroke="#e9e2d2" stroke-width="${Math.max(1, hh * 0.035)}"/>`; }
    if (o.estado === 'aire') { // ropa tendida entre dos casas y dos piscuchas más
      if (ch) { const x0 = ch.x + ch.w * 0.05, x1 = ch.x + ch.w * 0.6, y = ch.y + 13 * s; h += `<path d="M${x0} ${y}Q${(x0 + x1) / 2} ${y + 5 * s} ${x1} ${y - 1 * s}" fill="none" stroke="#efe7d8" stroke-width="${0.5 * s}"/>`; for (let i = 0; i < 6; i++) { const t = (i + 0.7) / 7, x = x0 + (x1 - x0) * t, yy = y + 4.4 * s * Math.sin(Math.PI * t); h += `<path d="M${x - 2 * s} ${yy}h${4 * s}v${(4 + (i % 2) * 2) * s}h${-4 * s}Z" fill="${['#fffdf8', COL[1], COL[2], '#fffdf8', COL[0], COL[3]][i]}"/>`; } }
      const kite = (x, y, c, e) => `<path d="M${x} ${y - 9 * e}L${x + 6 * e} ${y}L${x} ${y + 9 * e}L${x - 6 * e} ${y}Z" fill="${c}"/><path d="M${x} ${y + 9 * e}q${4 * e} ${8 * e} ${-2 * e} ${16 * e}t${-1 * e} ${14 * e}" fill="none" stroke="${c}" stroke-width="${0.9 * e}"/><path d="M${x} ${y}L${cx + 4 * s} ${cy - 9 * s}" stroke="#fff" stroke-width="0.5" opacity="0.6"/>`;
      h += kite(pl.x + pl.w * 1.9, cu.y + cu.h * 0.75, COL[2], s * 1.1) + kite(pl.x + pl.w * 0.2, cu.y + cu.h * 1.05, COL[3], s * 0.9); }
    svg.innerHTML = h; document.querySelector('#montana').appendChild(svg);
    return { nuevos: svg.querySelectorAll('*').length, osos: os.length, ch: !!ch };
  }, o);
}
if (process.argv[1].endsWith('maqE.mjs')) {
  const nav = await chromium.launch(); const srv = await servidor('medio');
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const { ctx, p } = await abrir(nav, srv, { w, h, hora: 16, dpr: w <= 390 ? 2 : 1, tema: 'oscuro', efectos: 'esenciales' });
    for (const e of ['calma', 'fresco', 'abrigo', 'manta', 'aire']) { const r = await emocion(p, { estado: e }); await p.waitForTimeout(100); await p.screenshot({ path: `${OUT}/e-${w}-${e}.png` }); console.log(w, e, JSON.stringify(r)); }
    await ctx.close();
  }
  srv.parar(); await nav.close();
}
