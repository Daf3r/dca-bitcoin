// Comprueba la página de propuestas: sin desplazamiento horizontal, sin errores, y que elegir cambia el texto para copiar.
// Uso: node valida.mjs ruta/a/propuestas-interfaz.html [carpeta de salida de capturas]
import { createRequire } from 'node:module';
const require = createRequire('/home/user/dca-bitcoin/tests/package.json');
const { chromium } = require('playwright');
const [archivo, salida] = process.argv.slice(2);
const b = await chromium.launch();
let mal = 0;
for (const [w, h, tema] of [[390, 844, 'dark'], [390, 844, 'light'], [320, 568, 'dark'], [1440, 900, 'light'], [1440, 900, 'dark']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: tema, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const err = [];
  p.on('pageerror', (e) => err.push(e.message)); p.on('console', (m) => m.type() === 'error' && err.push(m.text()));
  await p.goto(`file://${archivo}`); await p.evaluate(() => { for (const i of document.images) i.loading = 'eager'; }); await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ desborde: document.documentElement.scrollWidth - innerWidth, tarjetas: document.querySelectorAll('.card[data-id]').length, imgs: document.images.length, rotas: [...document.images].filter((i) => !i.complete || !i.naturalWidth).length, sinAlt: [...document.images].filter((i) => !i.alt).length, anchas: [...document.querySelectorAll('.wrap *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length }));
  await p.locator('#p-311 input[value="si"]').check();
  await p.evaluate(() => { document.getElementById('extra').open = true; });
  const t = await p.inputValue('#salida');
  const ok = r.desborde <= 0 && r.rotas === 0 && r.sinAlt === 0 && r.anchas === 0 && !err.length && /SÍ: .*311/.test(t) && /311 → sí/.test(t);
  if (!ok) mal++;
  console.log(w, tema, JSON.stringify(r), err.slice(0, 2), ok ? 'bien' : 'MAL', t.split('\n')[1].slice(0, 80));
  if (salida) { await p.evaluate(() => { document.getElementById('extra').open = false; }); await p.locator('#p-311 input[value="despues"]').check(); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${salida}/v-${w}-${tema}-arriba.png` }); await p.locator('#p-300').scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, 0)); await p.screenshot({ path: `${salida}/v-${w}-${tema}-300.png` }); await p.locator('#aud').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${salida}/v-${w}-${tema}-aud.png` }); }
  await ctx.close();
}
await b.close();
process.exit(mal ? 1 : 0);
