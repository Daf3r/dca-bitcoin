import fs from 'node:fs';
import { chromium, servidor, abrir, OUT } from './comun.mjs';
const NS = (process.argv[2] ?? '200,1000,5000,10000').split(',').map(Number);
const nav = await chromium.launch({ args: ['--enable-precise-memory-info'] });
const res = {};
for (const N of NS) {
  const srv = await servidor(`miles${N}`, {}, '_miles_tmp.py');
  console.log(srv.err().trim());
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const { ctx, p, consola, tCarga } = await abrir(nav, srv, { w, h, dpr: 2, ls: { 'libro.pestanas': 'todo' } });
    const r = { tCarga };
    r.app = await p.evaluate(() => ({ dom: document.querySelectorAll('*').length, escena: document.querySelectorAll('#montana *').length, lista: document.querySelectorAll('#lista > li').length, listaNodos: document.querySelectorAll('#lista *').length,
      graf: document.querySelectorAll('.mercado svg *, #valor svg *').length, heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576) }));
    await p.click('#cuenta-btn'); await p.waitForTimeout(300); await p.click('[data-cuenta="historia"]'); await p.waitForTimeout(900);
    r.linea = await p.evaluate(() => ({ nodos: document.querySelectorAll('#dh-cuerpo *').length, linea: document.querySelectorAll('#dh-linea > li').length, pasaporte: document.querySelectorAll('#dh-pasaporte > li').length, medallas: document.querySelectorAll('#dh-medallas > li').length, sellos: document.querySelectorAll('#dh-sellos > li').length, hoy: !document.querySelector('#dh-hoy').hidden, peli: !document.querySelector('#dh-peli').hidden }));
    for (const v of ['tronco', 'constelacion', 'torre', 'manta', 'estratos', 'partitura']) {
      const ms = await p.evaluate(async (v) => { const t = performance.now(); document.querySelector(`#dh-vistas [data-vh="${v}"]`).click(); const t1 = performance.now(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return [Math.round(t1 - t), Math.round(performance.now() - t)]; }, v);
      await p.waitForTimeout(350);
      const d = await p.evaluate(() => { const l = document.querySelector('#dh-lienzo'); return { nodos: l.querySelectorAll('*').length, piezas: l.querySelectorAll('.pieza').length, det: document.querySelector('#dh-detalle')?.innerText.slice(0, 90) }; });
      r[v] = { ms, ...d };
      if ((N === 5000 || (N === 1000 && v === 'partitura')) ) await p.locator('#dh-objeto').screenshot({ path: `${OUT}/c-${N}-${w}-${v}.png` }).catch((e) => console.log('cap', e.message.slice(0, 80)));
    }
    r.heapMB = await p.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576));
    r.consola = consola.slice(0, 3);
    res[`${N}@${w}`] = r; console.log(N, w, 'ok');
    await ctx.close();
  }
  srv.parar();
}
fs.writeFileSync(`${OUT}/../medidasC.json`, JSON.stringify(res, null, 1));
await nav.close();
