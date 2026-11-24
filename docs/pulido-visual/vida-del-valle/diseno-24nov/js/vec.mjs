import fs from 'node:fs';
const V = await import('/home/user/diseno-wt/app/static/arte-vecinos.js');
const out = {};
for (const t of V.PERSONAJES) { const c = V.cajaVecino({ t, x: 0, y: 0, k: 4 }); const w = Math.max(-c.x0, c.x1) + 2; out[t] = { svg: V.svgVecinos([{ t, x: 0, y: 0, k: 4 }]), x0: -w, w: 2 * w, y0: c.y0 - 2, h: -c.y0 + 5 }; }
fs.writeFileSync('vec.json', JSON.stringify(out));
console.log(Object.entries(out).map(([k, v]) => `${k}:${v.svg.length}`).join(' '));
