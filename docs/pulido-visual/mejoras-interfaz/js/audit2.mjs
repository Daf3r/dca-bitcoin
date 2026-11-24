import { chromium, servidor, abrir, OUT } from './comun.mjs';
const b = await chromium.launch();
const n = (s) => `${OUT}/b-${s}.png`;
const tab = async (p, t) => { await p.click(`#pestanas button[data-pestana="${t}"]`); await p.waitForTimeout(700); await p.evaluate(() => document.activeElement?.blur()); };
// Entrada
{
  const srv = await servidor('anio');
  for (const [w, tema] of [[390, 'oscuro'], [1440, 'claro'], [320, 'oscuro']]) { const { ctx, p } = await abrir(b, srv, { w, tema, soloLogin: true, efectos: 'todos' }); await p.waitForTimeout(1200); await p.screenshot({ path: n(`login-${w}-${tema}`) }); await ctx.close(); }
  // ¿«Saltar al contenido» sale al tocar una pestaña con el dedo?
  { const { ctx, p } = await abrir(b, srv, { w: 390, tema: 'oscuro', efectos: 'todos' }); await p.tap('#pestanas button[data-pestana="graficos"]'); await p.waitForTimeout(800); console.log('saltar tras tap:', await p.evaluate(() => { const s = document.querySelector('.saltar'); const q = s.getBoundingClientRect(); return [document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName, Math.round(q.top), s.matches(':focus')]; })); await ctx.close(); }
  // Lectora
  { const { ctx, p } = await abrir(b, srv, { w: 390, tema: 'claro', lector: true, efectos: 'todos' }); await p.screenshot({ path: n('lectora-390-vista') }); await p.click('#cuenta-btn'); await p.waitForTimeout(500); await p.screenshot({ path: n('lectora-390-cuenta') }); await ctx.close(); }
  // Alto contraste y letra muy grande
  { const { ctx, p } = await abrir(b, srv, { w: 390, tema: 'oscuro', efectos: 'todos', ls: { 'libro.contraste': 'alto', 'libro.letra': 'muy-grande' } }); await p.screenshot({ path: n('ac-390-vista') }); await tab(p, 'movimientos'); await p.screenshot({ path: n('ac-390-mov') }); await p.click('#cuenta-btn'); await p.waitForTimeout(500); await p.screenshot({ path: n('ac-390-cuenta') }); await ctx.close(); }
  // Tablet y 2560
  { const { ctx, p } = await abrir(b, srv, { w: 768, tema: 'claro', efectos: 'todos' }); await tab(p, 'movimientos'); await p.screenshot({ path: n('768-mov') }); await p.click('#cuenta-btn'); await p.waitForTimeout(500); await p.screenshot({ path: n('768-cuenta') }); await ctx.close(); }
  { const { ctx, p } = await abrir(b, srv, { w: 2560, tema: 'oscuro', efectos: 'todos' }); await p.screenshot({ path: n('2560-vista') }); await tab(p, 'movimientos'); await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(300); await p.screenshot({ path: n('2560-mov') }); await ctx.close(); }
  // Guía y tele
  { const { ctx, p } = await abrir(b, srv, { w: 1440, tema: 'oscuro', efectos: 'todos' }); await p.goto(`${srv.url}/guia`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await p.screenshot({ path: n('guia-1440'), fullPage: true });
    console.log('guia contraste:', await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /✗/.test(e.textContent)).map((e) => e.closest('li, div, tr')?.textContent.trim().slice(0, 60))));
    console.log('guia secciones:', await p.evaluate(() => [...document.querySelectorAll('h2')].map((h) => h.textContent)));
    await ctx.close(); }
  { const { ctx, p } = await abrir(b, srv, { w: 1440, tema: 'claro', efectos: 'todos' }); await p.goto(`${srv.url}/guia`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); console.log('guia claro ✗:', await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /✗/.test(e.textContent)).map((e) => e.closest('li, div, tr')?.textContent.trim().slice(0, 60)))); await ctx.close(); }
  srv.parar();
}
for (const esc of ['vacio', 'sinprecio', 'sinhist']) {
  const srv = await servidor(esc);
  const { ctx, p } = await abrir(b, srv, { w: 390, tema: 'oscuro', efectos: 'todos' });
  await p.screenshot({ path: n(`${esc}-390-resumen`), fullPage: true });
  await tab(p, 'graficos'); await p.screenshot({ path: n(`${esc}-390-graficos`), fullPage: true });
  await tab(p, 'movimientos'); await p.screenshot({ path: n(`${esc}-390-mov`), fullPage: true });
  await ctx.close(); srv.parar();
}
await b.close(); console.log('ok');
