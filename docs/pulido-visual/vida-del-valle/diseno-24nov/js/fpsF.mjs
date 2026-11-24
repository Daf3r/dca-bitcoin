import { chromium, servidor, OUT } from './comun.mjs';
import { abrirTv } from './tvx.mjs';
const nav = await chromium.launch(); const srv = await servidor('medio');
const fps = (p) => p.evaluate(() => new Promise((res) => { let n = 0, peor = 0, u = performance.now(); const t0 = u; const f = (t) => { n++; peor = Math.max(peor, t - u); u = t; if (t - t0 < 5000) requestAnimationFrame(f); else res([Math.round(n / 5 * 10) / 10, Math.round(peor)]); }; requestAnimationFrame(f); }));
async function caso(nombre, hora, w, h, prep) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 900, hasTouch: w < 900, colorScheme: 'dark', bypassCSP: true });
  const p = await ctx.newPage();
  await p.addInitScript((hora) => { try { localStorage.setItem('libro.hora', String(hora)); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); } catch {} }, hora);
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', 'Daf3r'); await p.fill('input[autocomplete="current-password"]', 'clave-de-prueba-12');
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]); await p.waitForTimeout(2600);
  for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
  if (prep) await p.evaluate(prep);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.waitForTimeout(800);
  const a = await fps(p), b = await fps(p);
  console.log(nombre, w, 'hora', hora, 'fps', a[0], b[0], 'peor cuadro ms', Math.max(a[1], b[1]), 'anim', await p.evaluate(() => document.getAnimations().length));
  await ctx.close();
}
const capas = (n) => `(() => { const st = document.createElement('style'); st.textContent = '@keyframes zz { from { transform: translate(0,0) rotate(-2deg); } to { transform: translate(6px,-3px) rotate(2deg); } } .zz { animation: zz 14s ease-in-out infinite alternate; }'; document.head.append(st); const m = document.querySelector('#montana'); const base = m.querySelector('svg.v-capa-gallina'); for (let i = 0; i < ${n}; i++) { const c = base.cloneNode(true); c.setAttribute('class', 'zz'); c.style.cssText = 'position:absolute;display:block;opacity:1;left:' + (30 + i * 40) + 'px;top:' + (430 + (i % 3) * 60) + 'px;animation-duration:' + (12 + i * 4) + 's'; m.append(c); } })()`;
const dentro = `(() => { const st = document.createElement('style'); st.textContent = '@keyframes zz { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg); } } #m-bosque { animation: zz 14s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 50% 100%; }'; document.head.append(st); })()`;
for (const [w, h] of [[390, 844], [1440, 900]]) {
  await caso('hoy', 9, w, h);
  await caso('+6 capas pequeñas lentas', 9, w, h, capas(6));
  await caso('+12 capas pequeñas lentas', 9, w, h, capas(12));
  await caso('MAL: un <g> del dibujo grande animado', 9, w, h, dentro);
}
await caso('hoy noche', 21, 390, 844);
for (const hora of [12, 21]) { const { ctx, p } = await abrirTv(nav, srv, { w: 1920, h: 1080, hora }); const cdp = await ctx.newCDPSession(p); const s1 = await fps(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await p.waitForTimeout(600); const s6 = await fps(p); console.log('tele 1920 hora', hora, 'fps 1×', s1[0], '6×', s6[0], 'anim', await p.evaluate(() => document.getAnimations().length)); await ctx.close(); }
srv.parar(); await nav.close();
