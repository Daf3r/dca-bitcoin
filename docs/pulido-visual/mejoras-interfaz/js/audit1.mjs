import { chromium, servidor, abrir, OUT } from './comun.mjs';
const b = await chromium.launch();
const srv = await servidor('anio');
const cierra = async (p) => { for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
const combos = [[390, 'oscuro'], [390, 'claro'], [1440, 'oscuro'], [1440, 'claro'], [320, 'oscuro'], [768, 'claro'], [2560, 'oscuro']];
for (const [w, tema] of combos) {
  const { ctx, p, consola } = await abrir(b, srv, { w, tema });
  const n = (s) => `${OUT}/a-${w}-${tema}-${s}.png`;
  for (const t of ['resumen', 'graficos', 'historia', 'movimientos']) {
    await p.click(`#pestanas button[data-pestana="${t}"]`); await p.waitForTimeout(700);
    if (t === 'resumen') { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200); await p.screenshot({ path: n('0-vista') }); }
    await p.screenshot({ path: n(t), fullPage: true });
    if (w === 390 || w === 1440) { await p.evaluate(() => { const c = document.querySelector('#pestanas'); const e = document.querySelector('.escena'); scrollTo(0, (e?.offsetHeight ?? 600) - 60); }); await p.waitForTimeout(300); await p.screenshot({ path: n(`${t}-v`) }); }
  }
  if (w !== 2560 && w !== 768) {
    await p.evaluate(() => scrollTo(0, 0));
    await p.click('#anotar'); await p.waitForTimeout(700); await p.screenshot({ path: n('hoja') });
    await p.fill('#h-sats', '30000').catch(() => {}); await p.waitForTimeout(400);
    await p.evaluate(() => { const d = document.querySelector('#h-avanzado'); if (d) d.open = true; });
    await p.waitForTimeout(300);
    const hoja = p.locator('#hoja');
    await p.screenshot({ path: n('hoja-llena') });
    await p.evaluate(() => { const h = document.querySelector('#hoja .hoja-panel') ?? document.querySelector('#hoja'); for (const e of [h, ...h.querySelectorAll('*')]) if (e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop = 9999; } });
    await p.waitForTimeout(300); await p.screenshot({ path: n('hoja-llena2') });
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); await cierra(p);
    await p.click('#cuenta-btn'); await p.waitForTimeout(600); await p.screenshot({ path: n('cuenta') });
    await p.evaluate(() => { const d = document.querySelector('#d-cuenta'); for (const e of [d, ...d.querySelectorAll('*')]) if (e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== 'visible') e.scrollTop = 9999; });
    await p.waitForTimeout(300); await p.screenshot({ path: n('cuenta2') });
    for (const [id, nom] of [['dc-avisos-btn', 'avisos'], ['dc-datos-btn', 'datos'], ['dc-sistema-btn', 'sistema'], ['dc-sesiones-btn', 'sesiones'], ['dc-historial', 'historial']]) {
      if (w !== 390 && w !== 1440) break;
      if (tema === 'claro' && w === 1440) break;
      await cierra(p); await p.click('#cuenta-btn'); await p.waitForTimeout(400);
      await p.click(`#${id}`).catch((e) => console.log('no', id)); await p.waitForTimeout(600); await p.screenshot({ path: n(`cuenta-${nom}`) });
    }
    await cierra(p);
    await p.click('#pestanas button[data-pestana="movimientos"]'); await p.waitForTimeout(500);
    await p.locator('#lista li[data-clave] .fila, #lista li[data-clave]').first().click().catch(() => console.log('sin fila')); await p.waitForTimeout(600); await p.screenshot({ path: n('comprobante') });
  }
  if (consola.length) console.log(w, tema, consola.slice(0, 3));
  await ctx.close();
}
srv.parar();
await b.close();
console.log('ok');
