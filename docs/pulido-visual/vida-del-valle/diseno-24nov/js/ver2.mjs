import { chromium, OUT } from './comun.mjs';
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); const p = await ctx.newPage();
await p.goto('file:///tmp/claude-0/-home-user-dca-bitcoin/a4559b60-eb1b-544b-95bf-bb999d91cf6d/scratchpad/diseno/diseno-celebracion-nodo-miles.html'); await p.waitForTimeout(500);
await p.locator('.protos').screenshot({ path: `${OUT}/art-protos.png` });
await p.locator('#dms').scrollIntoViewIfNeeded(); await p.waitForTimeout(2600); await p.locator('#dms').screenshot({ path: `${OUT}/art-demos.png` });
await p.locator('.hgs').screenshot({ path: `${OUT}/art-hist.png` });
await ctx.close(); await nav.close();
