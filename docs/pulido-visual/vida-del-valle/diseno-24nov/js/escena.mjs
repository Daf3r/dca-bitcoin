import { chromium, servidor, abrir, OUT } from './comun.mjs';
const nav = await chromium.launch();
const srv = await servidor('medio');
for (const [w, h] of [[320, 568], [390, 844], [1440, 900], [2560, 1440]]) {
  const { ctx, p } = await abrir(nav, srv, { w, h, hora: 12 });
  const r = await p.evaluate(async () => {
    const b = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
    const src = [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.href).find((u) => u.includes('arte-vecinos')); const m = await import(src);
    return { montana: b('#montana'), svg: b('#montana svg'), vb: document.querySelector('#montana svg')?.getAttribute('viewBox'), pueblo: b('.v-pueblo'), plaza: b('.v-plaza'), vecinos: b('.v-vecinos'), tu: b('.yo-anillo'), cumbre: b('.cumbre'), osos: b('.osos-cumbre, .osos, [class*="oso-c"]'), saldo: b('.saldo-d'), dock: b('.dock, #dock'),
      svgs: [...document.querySelectorAll('#montana > *')].map((e) => `${e.tagName}.${e.getAttribute('class')}`).slice(0, 14), tipos: m.PERSONAJES, anim: document.getAnimations().length, nodos: document.querySelectorAll('#montana *').length };
  });
  console.log(w, h, JSON.stringify(r));
  await ctx.close();
}
srv.parar(); await nav.close();
