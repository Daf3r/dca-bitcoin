import fs from 'node:fs';
import { chromium, servidor, OUT } from './comun.mjs';
const nav = await chromium.launch(); const srv = await servidor('medio');
const res = {};
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); if (!localStorage.getItem('libro.hora')) localStorage.setItem('libro.hora', '12'); } catch {} });
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', 'Daf3r'); await p.fill('input[autocomplete="current-password"]', 'clave-de-prueba-12');
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]); await p.waitForTimeout(2000);
  for (let hora = 0; hora < 24; hora += 0.5) {
    await p.evaluate((h) => localStorage.setItem('libro.hora', String(h)), hora);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
    for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
    const r = await p.evaluate(() => {
      const d = document.documentElement.dataset; const M = document.querySelector('#montana');
      const an = document.getAnimations().filter((a) => a.effect?.target && M.contains(a.effect.target) && a.playState === 'running').map((a) => { const t = a.effect.getTiming(), e = a.effect.target, b = e.getBoundingClientRect(); const kf = a.effect.getKeyframes(); return { n: a.animationName ?? 'tr', dur: Math.round(t.duration), inf: t.iterations === Infinity, cls: (e.getAttribute('class') ?? e.tagName).slice(0, 40), tam: Math.round(Math.max(b.width, b.height)), props: [...new Set(kf.flatMap((k) => Object.keys(k)))].filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x)).join('+'), vis: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth }; });
      return { mueve: d.mueve ?? null, turno: d.turno ?? null, cielo: d.cielo ?? null, an };
    });
    (res[w] ??= {})[hora] = r;
  }
  await ctx.close(); console.log(w, 'ok');
}
fs.writeFileSync(`${OUT}/../audF.json`, JSON.stringify(res));
srv.parar(); await nav.close();
