import { chromium, servidor, OUT } from './comun.mjs';
const nav = await chromium.launch();
for (const [esc, arch] of [['miles5000', '_miles_tmp.py'], ['medio', 'servidor_prueba.py']]) {
  const srv = await servidor(esc, {}, arch);
  for (const [w, h] of [[1920, 1080], [3840, 2160]]) for (const hora of esc === 'medio' && w === 1920 ? [12, 20] : esc === 'medio' ? [] : [12]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' });
    const p = await ctx.newPage();
    const consola = []; p.on('pageerror', (e) => consola.push(e.message));
    await p.addInitScript((hora) => { try { localStorage.setItem('libro.hora', String(hora)); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch {} }, hora);
    await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
    await p.fill('input[autocomplete="username"]', 'Ana'); await p.fill('input[autocomplete="current-password"]', 'lectora-de-prueba');
    await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
    await p.waitForTimeout(2500);
    for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    await p.goto(`${srv.url}/#tv`); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(4000);
    for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && c.visibility !== 'hidden' && Number(c.opacity) > 0.05; };
      const textos = [];
      for (const e of document.querySelectorAll('body *')) { if (e.closest('svg') && e.tagName !== 'text') continue; const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim(); if (t && vis(e) && !e.closest('[hidden]')) { const r = e.getBoundingClientRect(); textos.push([Math.round(parseFloat(getComputedStyle(e).fontSize)), t.slice(0, 40), Math.round(r.height)]); } }
      const vistos = new Set(); const tx = textos.filter(([f, t]) => { const k = f + t; if (vistos.has(k) || /^[0-9,.]$/.test(t)) return false; vistos.add(k); return true; }).sort((a, b) => a[0] - b[0]);
      return { tv: document.documentElement.dataset.tv ?? null, raiz: getComputedStyle(document.documentElement).fontSize, nodos: document.querySelectorAll('#montana *').length, dom: document.querySelectorAll('*').length, anim: document.getAnimations().length, animInf: document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity).length, tx };
    });
    console.log(esc, w, hora, JSON.stringify(r), consola.slice(0, 2));
    await p.screenshot({ path: `${OUT}/tv-${esc}-${w}-${hora}.png` });
    await ctx.close();
  }
  srv.parar();
}
await nav.close();
