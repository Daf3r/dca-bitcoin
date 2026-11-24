import { chromium, servidor, OUT } from './comun.mjs';
export async function abrirTv(nav, srv, { w, h, hora = 12, dpr = 1, cuenta = ['Ana', 'lectora-de-prueba'] }) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.addInitScript((hora) => { try { localStorage.setItem('libro.hora', String(hora)); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch {} }, hora);
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', cuenta[0]); await p.fill('input[autocomplete="current-password"]', cuenta[1]);
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
  await p.waitForTimeout(2000);
  await p.goto(`${srv.url}/#tv`); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(3500);
  for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.waitForTimeout(600);
  return { ctx, p };
}
if (process.argv[1].endsWith('tvx.mjs')) {
  const nav = await chromium.launch(); const srv = await servidor('medio');
  const { ctx, p } = await abrirTv(nav, srv, { w: 1920, h: 1080 });
  const r = await p.evaluate(() => { const out = {}; for (const t of ['12:00', 'Coinbase', 'Último movimiento', 'Vamos aquí', '100k', 'valen', 'vs ayer']) { const e = [...document.querySelectorAll('body *')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(t)) && e.getBoundingClientRect().width > 0); let c = e, ruta = []; for (let i = 0; i < 4 && c && c !== document.body; i++) { ruta.push(`${c.tagName.toLowerCase()}${c.id ? '#' + c.id : ''}.${(c.getAttribute('class') ?? '').replace(/ /g, '.')}`); c = c.parentElement; } out[t] = ruta.join(' < '); } return out; });
  console.log(JSON.stringify(r, null, 1));
  // fps con CPU 6× más lenta (una tele modesta), de día y de noche
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const fps = () => p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / 4)); }; requestAnimationFrame(f); }));
  console.log('fps día 6×', await fps());
  await ctx.close();
  const b = await abrirTv(nav, srv, { w: 1920, h: 1080, hora: 21 });
  const c2 = await b.ctx.newCDPSession(b.p); await c2.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  console.log('fps noche 6×', await b.p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res(Math.round(n / 4)); }; requestAnimationFrame(f); })), 'anim', await b.p.evaluate(() => document.getAnimations().length));
  await b.ctx.close(); srv.parar(); await nav.close();
}
