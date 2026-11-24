import { chromium, servidor, abrir, OUT } from './comun.mjs';
import { abrirTv } from './tvx.mjs';
import { fiesta } from './maqA.mjs';
import { emocion } from './maqE.mjs';
const nav = await chromium.launch();
const propuesta = (p, o = {}) => p.evaluate((o) => {
  for (const e of document.querySelectorAll('#precio-meta')) e.style.display = 'none';
  for (const e of document.querySelectorAll('#s-valor *')) if (/ya se realiz/.test(e.textContent) && e.children.length < 3) { e.style.display = 'none'; const a = e.previousElementSibling; if (a && a.textContent.trim() === '·') a.style.display = 'none'; }
  for (const e of document.querySelectorAll('#m-etiquetas text')) { const f = parseFloat(getComputedStyle(e).fontSize); e.style.fontSize = `${f * 1.6}px`; }
  const g = document.querySelector('.v-pueblo'), b = g.getBBox(); g.setAttribute('transform', `translate(${b.x} ${b.y + b.height}) scale(${o.k ?? 1.55}) translate(${-b.x} ${-(b.y + b.height)})`);
  for (const e of document.querySelectorAll('.v-capa-animal, .tele-cabina')) e.style.display = 'none';
  if (o.bloque) { const u = document.querySelector('#tv-ultimo'), c = u.cloneNode(true); c.id = 'tv-bloque'; c.querySelector('#tvu-k').textContent = 'Último bloque'; c.querySelector('#tvu-k').removeAttribute('id'); const r = u.getBoundingClientRect(); [...c.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.classList.contains('tvu-k'))).forEach((n) => n.remove()); c.append(document.createTextNode(' 976,431 · hace 4 min')); u.parentElement.append(c); c.style.top = `${r.bottom - u.parentElement.getBoundingClientRect().top + 14}px`; }
}, o);
// D · la tele
{ const srv = await servidor('miles5000', {}, '_miles_tmp.py');
  for (const [dpr, tag] of [[1, '1920'], [2, '3840']]) { const { ctx, p } = await abrirTv(nav, srv, { w: 1920, h: 1080, dpr }); await propuesta(p, { bloque: 1 }); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/d-prop-${tag}.png` }); await ctx.close(); }
  { const { ctx, p } = await abrirTv(nav, srv, { w: 1920, h: 1080, hora: 18.7 }); await propuesta(p, {}); const r = await fiesta(p, { vecinos: 'arriba', faroles: 7, sube: 0.8, cohetes: 5, estela: 1, noche: true }); console.log('tv fiesta', JSON.stringify(r).slice(0, 80)); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/d-fiesta-1920.png` }); await ctx.close(); }
  srv.parar(); }
// B · el bloque en el valle, y E otra vez
{ const srv = await servidor('medio');
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const { ctx, p } = await abrir(nav, srv, { w, h, hora: 16, dpr: w <= 390 ? 2 : 1, efectos: 'esenciales' });
    for (const [n, o] of [['comun', { ondas: 1 }], ['mil', { ondas: 3, faroles: 1, sube: 0.35 }], ['halving', { ondas: 3, vecinos: 'rueda', faroles: 4, sube: 0.6, cohetes: 1 }]]) { await fiesta(p, o); await p.waitForTimeout(100); await p.screenshot({ path: `${OUT}/b-${w}-${n}.png` }); }
    await p.reload(); await p.waitForTimeout(2600); for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
    for (const e of ['calma', 'fresco', 'abrigo', 'manta', 'aire']) { const r = await emocion(p, { estado: e }); await p.waitForTimeout(100); await p.screenshot({ path: `${OUT}/e-${w}-${e}.png` }); }
    await ctx.close(); }
  srv.parar(); }
await nav.close(); console.log('fin');
