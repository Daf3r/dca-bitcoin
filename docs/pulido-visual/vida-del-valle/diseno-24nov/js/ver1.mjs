import { chromium, servidor, abrir, OUT } from './comun.mjs';
const nav = await chromium.launch();
const srv = await servidor('medio');
const { ctx, p } = await abrir(nav, srv, { w: 390, h: 844, hora: 9, dpr: 3 });
const r = await p.evaluate(async () => {
  const b = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  const src = [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.href).find((u) => u.includes('arte-vecinos')); const m = await import(src);
  return { campana: b('.v-ig-campana'), torre: b('.v-ig-torre'), frente: b('.v-ig-frente'), plaza: b('.v-plaza'), pelo: b('.v-vo-pelo'), caja: m.cajaVecino({ t: 'vecino', x: 0, y: 0, k: 1 }), anotar: b('#anotar'), n: document.querySelector('.v-vecinos').innerHTML.length };
});
console.log(JSON.stringify(r));
await p.screenshot({ path: `${OUT}/base-390.png`, clip: { x: 0, y: 380, width: 390, height: 464 } });
await ctx.close(); srv.parar(); await nav.close();
