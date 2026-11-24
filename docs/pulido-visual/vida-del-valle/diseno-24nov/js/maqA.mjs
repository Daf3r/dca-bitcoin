import { chromium, servidor, abrir, OUT } from './comun.mjs';
// La maqueta: sobre la app de verdad, se cambian los vecinos del turno por los de la fiesta (arte-vecinos.js real) y se añade una capa con lo nuevo.
export async function fiesta(p, o) {
  return p.evaluate(async (o) => {
    const NS = 'http://www.w3.org/2000/svg';
    const caja = (s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); const m = document.querySelector('#montana').getBoundingClientRect(); return { x: r.x - m.x, y: r.y - m.y, w: r.width, h: r.height }; };
    const src = [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.href).find((u) => u.includes('arte-vecinos')); const V = await import(src);
    const pl = caja('.v-plaza'), ca = caja('.v-ig-campana'), cu = caja('.cumbre'), tu = caja('.yo-anillo'), mo = caja('#montana');
    const s = o.s ?? pl.w / 74, k = 2.0 * s * (o.kOso ?? 1), cx = pl.x + pl.w * 0.52, cy = pl.y + pl.h * 0.45;
    // --- los vecinos de la fiesta
    const L = [];
    const rueda = (tipos, rx, ry) => tipos.forEach((t, i) => { const a = (i / tipos.length) * Math.PI * 2 + 0.4; const y = cy + Math.sin(a) * ry; L.push({ t: Math.sin(a) > 0.35 ? 'espaldas' : t, x: cx + Math.cos(a) * rx, y, k, r: i, f: Math.cos(a) > 0 ? -1 : 1, s: /osezno/.test(t) ? 0.72 : 1 }); });
    if (o.vecinos === 'salen') { L.push({ t: 'vecina', x: cx - 20 * s, y: cy, k, r: 1 }, { t: 'osezno', x: cx - 10 * s, y: cy + 2 * s, k, r: 0, s: 0.72 }, { t: 'vecino', x: cx + 16 * s, y: cy - 1 * s, k, r: 2, f: -1 }, { t: 'abuela', x: cx + 34 * s, y: cy + 1 * s, k, r: 0, f: -1 }); }
    if (o.vecinos === 'rueda') rueda(['vecina', 'osezno', 'vecino', 'abuela', 'oseznoLuz', 'vecina', 'vecino', 'osezno'], 27 * s, 4.6 * s), L.push({ t: 'bombo', x: cx + 44 * s, y: cy - 1 * s, k, r: 1, f: -1 });
    if (o.vecinos === 'arriba') rueda(['oseznoArriba', 'estira', 'oseznoArriba', 'estira', 'oseznoArriba', 'estira', 'oseznoArriba', 'estira'], 27 * s, 4.6 * s), L.push({ t: 'bombo', x: cx + 44 * s, y: cy - 1 * s, k, r: 1, f: -1 });
    if (o.vecinos === 'tres') L.push({ t: 'oseznoArriba', x: cx - 10 * s, y: cy + 1 * s, k, r: 0, s: 0.72 }, { t: 'estira', x: cx + 2 * s, y: cy, k, r: 1 }, { t: 'oseznoArriba', x: cx + 13 * s, y: cy + 1 * s, k, r: 2, s: 0.72 });
    if (o.vecinos === 'chocolate') L.push({ t: 'pupusera', x: cx - 4 * s, y: cy - 1 * s, k, r: 1 }, { t: 'vecina', x: cx - 24 * s, y: cy + 1 * s, k, r: 0 }, { t: 'osezno', x: cx - 15 * s, y: cy + 3 * s, k, r: 2, s: 0.72 }, { t: 'vecino', x: cx + 18 * s, y: cy, k, r: 2, f: -1 }, { t: 'abuela', x: cx + 30 * s, y: cy + 2 * s, k, r: 0, f: -1 }, { t: 'osezno', x: cx + 40 * s, y: cy + 3 * s, k, r: 1, f: -1, s: 0.72 });
    const g = document.querySelector('.v-vecinos');
    if (o.vecinos) { g.innerHTML = V.svgVecinos(L); for (const e of document.querySelectorAll('.v-capa-animal, .v-animal, .v-gallina')) e.style.display = 'none'; }
    const nVec = g.querySelectorAll('*').length;
    // --- la capa nueva
    document.querySelector('#maq')?.remove();
    const svg = document.createElementNS(NS, 'svg'); svg.id = 'maq'; svg.setAttribute('viewBox', `0 0 ${mo.w} ${mo.h}`); svg.setAttribute('width', mo.w); svg.setAttribute('height', mo.h);
    svg.style.position = 'absolute'; svg.style.left = '0'; svg.style.top = '0'; svg.style.pointerEvents = 'none'; svg.style.zIndex = '3';
    const noche = o.noche; let h = '';
    const ORO = noche ? '#ffd27a' : '#f2b84b', BL = noche ? '#fff6e0' : '#ffffff', AN = noche ? '#a9c0ff' : '#5f7fd6', NA = '#ff9a3c';
    if (o.ondas) { const x = ca.x + ca.w / 2, y = ca.y + ca.h / 2; for (let i = 1; i <= o.ondas; i++) { const r = (5 + i * 5.5) * s; h += `<path d="M${x - r * 0.8} ${y - r * 0.6}A${r} ${r} 0 0 1 ${x + r * 0.8} ${y - r * 0.6}" fill="none" stroke="${ORO}" stroke-width="${1.5 * s}" stroke-linecap="round" opacity="${1 - i * 0.22}"/>`; } h += `<ellipse cx="${x}" cy="${y}" rx="${ca.w * 0.9}" ry="${ca.h * 0.8}" fill="${ORO}" opacity="0.85"/>`; }
    // los farolitos: de la plaza hacia el cielo, en una curva suave; `sube` 0..1
    if (o.faroles) { let halos = '', cuerpos = '', llamas = ''; const n = o.faroles, x1 = tu.x - 62 * s, y1 = tu.y - 30 * s;
      for (let i = 0; i < n; i++) { const t = Math.max(0, Math.min(1, o.sube - i * (0.5 / n) + 0.12 * Math.sin(i * 7))); const x = cx + (x1 - cx) * t ** (o.curva ?? 1.7) + Math.sin(i * 2.4 + t * 5) * 9 * s * (0.5 + t), y = (pl.y - 14 * s) + (y1 - (pl.y - 14 * s)) * t ** 0.9 + Math.cos(i * 3.1) * 10 * s, e = s * (1 - 0.4 * Math.min(1, t)) * 1.9 * (mo.w < 700 ? 1.15 : 1);
        halos += `M${x - 6 * e} ${y}a${6 * e} ${6 * e} 0 1 0 ${12 * e} 0a${6 * e} ${6 * e} 0 1 0 ${-12 * e} 0Z`;
        cuerpos += `M${x - 1.9 * e} ${y - 2.6 * e}h${3.8 * e}l${0.7 * e} ${4.6 * e}h${-5.2 * e}Z`; llamas += `M${x - 0.9 * e} ${y + 2.4 * e}h${1.8 * e}v${0.9 * e}h${-1.8 * e}Z`; }
      h += `<path d="${halos}" fill="${NA}" opacity="${noche ? 0.3 : 0.2}"/><path d="${cuerpos}" fill="${noche ? '#ffcf8a' : '#ffb45c'}" stroke="#b86a1c" stroke-width="${0.35 * s}"/><path d="${llamas}" fill="#fff3c4"/>`; }
    // los cohetes: palmas sobre la montaña
    const palma = (x, y, r, col, n = 12, f = 1) => { let d = '', pts = ''; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.2, r0 = r * 0.28 * f, r1 = r * (0.78 + 0.22 * ((i * 7) % 3) / 2) * f; d += `M${x + Math.cos(a) * r0} ${y + Math.sin(a) * r0}L${x + Math.cos(a) * r1} ${y + Math.sin(a) * r1 + r * 0.06}`; pts += `M${x + Math.cos(a) * r1 * 1.12 - 1.1 * s} ${y + Math.sin(a) * r1 * 1.12 + r * 0.1}h${2.2 * s}`; }
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${1.5 * s}" stroke-linecap="round" opacity="${f < 1 ? 0.55 : 0.95}"/><path d="${pts}" fill="none" stroke="${BL}" stroke-width="${2.2 * s}" stroke-linecap="round" opacity="0.9"/>`; };
    if (o.cohetes) { const tar = [...document.querySelectorAll('#hito-cel:not([hidden]) > *')].map((e) => e.getBoundingClientRect().bottom - document.querySelector('#montana').getBoundingClientRect().y).filter((v) => v > 0); const txt = caja('.saldo'); const techo = Math.max(mo.w < 1100 ? txt.y + txt.h : 0, ...tar) + 8;
      const X = tu.x + tu.w / 2, Y = tu.y, e = mo.w < 700 ? 1.25 : 1;
      const px = cu.x + cu.w * 0.5, py = cu.y;
      const P = o.tv ? [[px + 95 * s, py + 42 * s, 30 * s, ORO, 14, 1], [px + 195 * s, py + 80 * s, 24 * s, AN, 12, 1], [px - 66 * s, py + 104 * s, 22 * s, NA, 12, 1], [px + 70 * s, py + 130 * s, 17 * s, BL, 10, 0.7], [px + 270 * s, py + 36 * s, 15 * s, AN, 10, 0.7]] : (mo.w >= 1100 ? [[px - 110 * s * 0.56, py + 46, 30 * s, ORO, 14, 1], [px + 105 * s * 0.56, py + 36, 26 * s, AN, 12, 1], [px - 10, Math.max(40 * s, py + 22), 36 * s, NA, 16, 1], [px + 170 * s * 0.56, py + 78, 17 * s, BL, 10, 0.7], [px - 190 * s * 0.56, py + 92, 15 * s, AN, 10, 0.7]]
        : [[X - 100 * s * e, Y + 10 * s, 30 * s * e, ORO, 14, 1], [X + 95 * s * e, Y + 30 * s, 26 * s * e, AN, 12, 1], [X + 8 * s, Y - 96 * s * e, 36 * s * e, NA, 16, 1], [X - 150 * s * e, Y + 110 * s, 18 * s * e, BL, 10, 0.7], [X + 84 * s * e, Y + 150 * s, 16 * s * e, AN, 10, 0.7]].filter((q) => q[1] - q[2] > techo));
      for (const q of P.slice(0, o.cohetes)) { const y = q[1]; h += palma(q[0], y, q[2], q[3], q[4], q[5]); if (o.estela) h += `<path d="M${q[0]} ${y + q[2] * 1.2}V${y + q[2] * 2.4}" stroke="${BL}" stroke-width="${0.9 * s}" stroke-dasharray="${1.5 * s} ${3 * s}" opacity="0.5"/>`; } }
    // el farol del hito: una luz que se queda en la plaza hasta la medianoche
    if (o.farolHito) { const x = cx - 2 * s, y = pl.y - 16 * s; h += `<circle cx="${x}" cy="${y}" r="${9 * s}" fill="${NA}" opacity="0.28"/><path d="M${x - 2.4 * s} ${y - 3 * s}h${4.8 * s}l${0.9 * s} ${5.6 * s}h${-6.6 * s}Z" fill="#ffcf8a" stroke="#b86a1c" stroke-width="${0.4 * s}"/><path d="M${x} ${y - 3 * s}v${-3 * s}M${x - 22 * s} ${y - 6 * s}Q${x} ${y - 3 * s} ${x + 24 * s} ${y - 7 * s}" fill="none" stroke="${noche ? '#c9cedb' : '#5a4a3a'}" stroke-width="${0.5 * s}"/>`; }
    // el vaho del chocolate
    if (o.vaho) h += `<path d="M${cx - 4 * s} ${cy - 16 * s}q${2 * s} ${-3 * s} 0 ${-6 * s}t0 ${-6 * s}M${cx - 1 * s} ${cy - 15 * s}q${2 * s} ${-3 * s} 0 ${-5 * s}" fill="none" stroke="${BL}" stroke-width="${0.9 * s}" stroke-linecap="round" opacity="0.6"/>`;
    for (const e of document.querySelectorAll('#aviso, .aviso')) e.style.visibility = 'hidden'; svg.innerHTML = h; document.querySelector('#montana').appendChild(svg);
    return { nuevos: svg.querySelectorAll('*').length, nVec, s: Math.round(s * 100) / 100, pl, cu };
  }, o);
}
export const previa = (p, nivel) => p.evaluate((n) => document.querySelector(`[data-previa="${n}"]`).click(), nivel);
const CUADROS = {
  f1: { ondas: 3, vecinos: 'salen' },
  f2: { ondas: 1, vecinos: 'rueda', faroles: 7, sube: 0.22 },
  f3: { vecinos: 'arriba', faroles: 7, sube: 0.8, cohetes: 5, estela: 1, previa: 'hito' },
  f4: { vecinos: 'chocolate', faroles: 7, sube: 1.25, farolHito: 1, vaho: 1 },
  pri: { vecinos: 'arriba', faroles: 3, sube: 0.7, cohetes: 1, estela: 1, previa: 'etapa' },
  int: { ondas: 1, vecinos: 'tres', faroles: 1, sube: 0.45, previa: 'paso' },
};
if (process.argv[1].endsWith('maqA.mjs')) {
  const nav = await chromium.launch();
  const srv = await servidor('medio');
  const plan = [[390, 844, 18.7, ['f1', 'f2', 'f3', 'f4', 'pri', 'int']], [390, 844, 12, ['f3']], [1440, 900, 18.7, ['f2', 'f3']], [320, 568, 18.7, ['f3']], [2560, 1440, 18.7, ['f3']], [1440, 900, 12, ['f3']]];
  for (const [w, h, hora, cs] of plan) {
    const { ctx, p, consola } = await abrir(nav, srv, { w, h, hora, dpr: w <= 390 ? 2 : 1, tema: hora === 12 ? 'claro' : 'oscuro', efectos: 'esenciales' });
    for (const c of cs) {
      const o = { ...CUADROS[c], noche: hora > 18 };
      if (o.previa) { await previa(p, o.previa); await p.waitForTimeout(350 + 1400 + (o.previa === 'paso' ? 500 : 900)); }
      const r = await fiesta(p, o);
      await p.waitForTimeout(120);
      await p.screenshot({ path: `${OUT}/a-${w}-${hora === 12 ? 'dia' : 'tarde'}-${c}.png` });
      console.log(w, hora, c, JSON.stringify(r).slice(0, 160), consola.slice(0, 2));
      if (o.previa) await p.waitForTimeout(o.previa === 'hito' ? 5200 : 4200);
    }
    await ctx.close();
  }
  srv.parar(); await nav.close();
}
