import { chromium, OUT } from './comun.mjs';
const nav = await chromium.launch();
const F = 'file:///tmp/claude-0/-home-user-dca-bitcoin/a4559b60-eb1b-544b-95bf-bb999d91cf6d/scratchpad/diseno/diseno-celebracion-nodo-miles.html';
for (const [w, h, tema] of [[320, 640, 'dark'], [390, 844, 'light'], [1440, 900, 'dark'], [2560, 1440, 'light']]) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, colorScheme: tema }); const p = await ctx.newPage();
  const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(F); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { const anchos = [...document.querySelectorAll('.wrap *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.tabla') && !e.closest('svg') && !e.closest('.dm-e')).slice(0, 5).map((e) => e.tagName + '.' + e.className); return { sw: document.documentElement.scrollWidth, iw: innerWidth, alto: document.documentElement.scrollHeight, fuera: anchos, imgs: [...document.images].filter((i) => !i.complete || !i.naturalWidth).length, tot: document.images.length }; });
  console.log(w, tema, JSON.stringify(r), errs.slice(0, 3));
  if (w === 390 || w === 1440) { for (const id of ['A', 'B', 'C', 'F']) { await p.evaluate((id) => document.getElementById(id).scrollIntoView(), id); await p.waitForTimeout(250); await p.evaluate(() => document.querySelectorAll('img').forEach((i) => i.loading = 'eager')); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/art-${w}-${id}.png` }); } }
  if (w === 1440) { await p.click('#p-A1 input[value="no"]'); await p.click('#copiar').catch(() => {}); console.log(await p.evaluate(() => document.getElementById('salida').value.slice(0, 260))); for (const [id, dy] of [['F', 1500], ['C', 1700], ['B', 700]]) { await p.evaluate(([id, dy]) => { document.getElementById(id).scrollIntoView(); scrollBy(0, dy); }, [id, dy]); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/art-1440-${id}2.png` }); } }
  await ctx.close();
}
await nav.close();
