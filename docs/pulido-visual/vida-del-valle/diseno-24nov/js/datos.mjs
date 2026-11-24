import fs from 'node:fs';
import { chromium, servidor, abrir, OUT } from './comun.mjs';
const nav = await chromium.launch();
for (const N of [200, 1000, 5000, 10000]) {
  const srv = await servidor(`miles${N}`, {}, '_miles_tmp.py');
  const { ctx, p } = await abrir(nav, srv, { w: 390, h: 844, espera: 1500 });
  const r = await p.evaluate(async () => {
    const t = performance.now(); const x = await fetch('/api/compras'); const txt = await x.text(); const ms = Math.round(performance.now() - t);
    const e = performance.getEntriesByType('resource').filter((e) => e.name.includes('/api/compras')).at(-1);
    return { txt, ms, bytes: txt.length, wire: e?.transferSize };
  });
  if (N !== 10000) fs.writeFileSync(`${OUT}/../datos${N}.json`, r.txt);
  let peli = null;
  if (N >= 5000) {
    await p.click('#cuenta-btn'); await p.waitForTimeout(300); await p.click('[data-cuenta="historia"]'); await p.waitForTimeout(700);
    peli = await p.evaluate(async () => { const t = performance.now(); document.querySelector('#dh-peli-ver').click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const ms = Math.round(performance.now() - t); await new Promise((r) => setTimeout(r, 1500)); return { ms, nodos: document.querySelectorAll('.pe-montana *').length, dom: document.querySelectorAll('*').length }; }).catch((e) => String(e).slice(0, 100));
  }
  console.log(N, r.ms, 'ms', r.bytes, 'bytes', r.wire, 'en red', JSON.stringify(peli));
  await ctx.close(); srv.parar();
}
await nav.close();
