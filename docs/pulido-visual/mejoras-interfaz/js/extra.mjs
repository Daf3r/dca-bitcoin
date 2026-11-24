// Medidas que faltaban tras la revisión: el botón de escritorio sobre la lista (varias posiciones), el ritmo vertical,
// las marcas de la guía, el contraste del filo naranja en claro y una captura de la tele. Sale a cap/extra.json.
import fs from 'node:fs';
import { chromium, servidor, abrir, OUT } from './comun.mjs';
const b = await chromium.launch();
const srv = await servidor('anio');
const E = {};
const tab = async (p, t) => { await p.click(`#pestanas button[data-pestana="${t}"]`); await p.waitForTimeout(700); };
{ // 304: ¿en cuántas posiciones del desplazamiento el botón tapa texto de una fila?
  const { ctx, p } = await abrir(b, srv, { w: 1440, tema: 'oscuro', efectos: 'todos' });
  await tab(p, 'movimientos');
  for (let k = 0; k < 3; k++) { const v = p.locator('#ver-todas'); if (await v.isVisible()) { await v.click(); await p.waitForTimeout(400); } }
  const ini = await p.evaluate(() => Math.round(document.querySelector('#lista').getBoundingClientRect().top + scrollY));
  const fin = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let n = 0, tapa = 0; const pos = [];
  for (let y = ini - 100; y <= fin; y += 37) {
    await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60); n++;
    const t = await p.evaluate(() => { const a = document.querySelector('#anotar').getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('#anotar')); const hojas = [...document.querySelectorAll('#lista li[data-clave] *')].filter((e) => !e.children.length && e.textContent.trim() && e.checkVisibility() && !e.closest('.sr')); return { pos: cs.position, top: cs.top, tapa: hojas.filter((e) => { const q = e.getBoundingClientRect(); return q.top < a.bottom - 2 && q.bottom > a.top + 2 && q.left < a.right - 2 && q.right > a.left + 2; }).length }; });
    if (t.tapa) tapa++; pos.push(t.tapa); E.anotarCss = [t.pos, t.top];
  }
  E.anotarPisa = { posiciones: n, conTextoTapado: tapa, desde: ini - 100, hasta: fin };
  await ctx.close();
}
for (const w of [390, 1440]) { // ritmo vertical: huecos entre bloques seguidos del Resumen y de Gráficos
  const { ctx, p } = await abrir(b, srv, { w, tema: 'oscuro', efectos: 'todos' });
  E[`ritmo-${w}`] = {};
  for (const t of ['resumen', 'graficos', 'movimientos']) {
    await tab(p, t);
    E[`ritmo-${w}`][t] = await p.evaluate(() => { const bs = [...document.querySelectorAll('#principal [data-p], #principal .rep, #principal .tarjeta')].filter((e) => e.checkVisibility() && e.offsetHeight > 24 && !e.matches('nav') && getComputedStyle(e).display !== 'contents').map((e) => ({ id: e.id || e.className.split(' ')[0], q: e.getBoundingClientRect() })); const o = []; for (const a of bs) { let mejor = null; for (const c of bs) { if (c === a) continue; if (c.q.top >= a.q.bottom - 1 && c.q.left < a.q.right && c.q.right > a.q.left) { if (!mejor || c.q.top < mejor.q.top) mejor = c; } } if (mejor && !bs.some((x) => x !== a && x !== mejor && x.q.top < a.q.top + 1 && x.q.bottom > mejor.q.bottom - 1 && x.q.left <= a.q.left && x.q.right >= a.q.right)) o.push([Math.round(mejor.q.top - a.q.bottom), `${a.id}→${mejor.id}`]); } return o; });
  }
  await ctx.close();
}
for (const tema of ['oscuro', 'claro']) { // la guía: cuántas marcas ✓ y ✗; y el naranja contra --s1
  const { ctx, p } = await abrir(b, srv, { w: 1440, tema, efectos: 'todos' });
  E[`naranja-${tema}`] = await p.evaluate(() => { const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v = (c.startsWith('color(') ? v * 255 : v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); }; const d = document.createElement('i'); document.body.append(d); const col = (v) => { d.style.color = `var(${v})`; return getComputedStyle(d).color; }; const c = (a, b2) => { const x = lum(col(a)), y = lum(col(b2)); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); }; const r = { naranjaVsS1: c('--naranja', '--s1'), naranjaVsFondo: c('--naranja', '--fondo'), txt2VsS2: c('--txt2', '--s2'), txt2VsS1: c('--txt2', '--s1') }; d.remove(); return r; });
  await p.goto(`${srv.url}/guia`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  E[`guia-${tema}`] = await p.evaluate(() => { const t = document.body.innerText; return { si: (t.match(/✓/g) ?? []).length, no: (t.match(/✗/g) ?? []).length, muestra: (t.match(/[^\n]*[✓✗][^\n]*/g) ?? []).slice(0, 4) }; });
  if (tema === 'oscuro') await p.screenshot({ path: `${OUT}/b-guia-1440.png`, fullPage: true });
  await ctx.close();
}
{ // la tele
  const { ctx, p } = await abrir(b, srv, { w: 1440, tema: 'oscuro', efectos: 'todos' });
  await p.goto(`${srv.url}/#tv`, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  E.tele = await p.evaluate(() => ({ tv: document.documentElement.dataset.tv, botones: [...document.querySelectorAll('button')].filter((x) => x.checkVisibility() && x.getBoundingClientRect().width > 0).map((x) => x.id || x.textContent.trim().slice(0, 20)) }));
  await p.screenshot({ path: `${OUT}/b-tele-1440.png` });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/extra.json`, JSON.stringify(E, null, 1));
srv.parar(); await b.close(); console.log(JSON.stringify(E).slice(0, 3500));
