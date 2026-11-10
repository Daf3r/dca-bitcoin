// Genera las imágenes de arranque del iPhone (`apple-touch-startup-image`, idea 40) y su bloque de <link> en index.html y login.html.
// Uso (desde la raíz; necesita Playwright de tests/): node scripts/generar-arranque.mjs
// Cuando salga un iPhone con otra pantalla, añádelo a DISPOSITIVOS y vuelve a correrlo. iOS elige la imagen por el tamaño exacto de la
// pantalla, así que cada modelo nuevo necesita su entrada. Se dibuja la misma escena nocturna de la app para que el arranque se funda con ella.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ESTATICOS = path.join(AQUI, '..', 'app', 'static');
const require = createRequire(path.join(AQUI, '..', 'tests', 'package.json'));
const { chromium } = require('playwright');

// [ancho, alto, factor de pantalla] en puntos CSS (portrait) y los modelos que lo usan
export const DISPOSITIVOS = [
  [440, 956, 3], // iPhone 16 Pro Max
  [430, 932, 3], // 15 Pro Max, 15 Plus, 14 Pro Max
  [428, 926, 3], // 14 Plus, 13 Pro Max, 12 Pro Max
  [402, 874, 3], // 16 Pro
  [393, 852, 3], // 16, 15, 15 Pro, 14 Pro
  [390, 844, 3], // 14, 13, 13 Pro, 12, 12 Pro
  [414, 896, 3], // 11 Pro Max, XS Max
  [414, 896, 2], // 11, XR
  [375, 812, 3], // X, XS, 11 Pro, 13 mini, 12 mini
  [414, 736, 3], // 8 Plus, 7 Plus, 6s Plus
  [375, 667, 2], // 8, 7, 6s, SE (2.ª y 3.ª)
  [320, 568, 2], // SE (1.ª)
];

const fuente = fs.readFileSync(path.join(ESTATICOS, 'fonts', 'fraunces.woff2')).toString('base64');
function escena(W, H) {
  // Misma paleta que el cielo de noche de cielo.js
  const c = ['#0a1322', '#0e1a2e', '#12213a', '#172946', '#1c3152'];
  const bandas = `<defs><linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">${c.map((col, i) => `<stop offset="${[0, 0.25, 0.5, 0.75, 1][i]}" stop-color="${col}"/>`).join('')}</linearGradient><linearGradient id="monte" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24395c"/><stop offset="1" stop-color="#0a1220"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#cielo)"/>`;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const estrellas = Array.from({ length: 70 }, () => `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * H * 0.5).toFixed(1)}" r="${(W * 0.0012 + rnd() * W * 0.0016).toFixed(2)}" fill="#f1e8d6" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`).join('');
  const px = W * 0.5, py = H * 0.4, base = H * 1.0, ancho = W * 0.9;
  const monte = `M${px - ancho} ${base}L${px - ancho * 0.45} ${py + (base - py) * 0.5}L${px - ancho * 0.12} ${py + (base - py) * 0.18}L${px} ${py}L${px + ancho * 0.12} ${py + (base - py) * 0.2}L${px + ancho * 0.5} ${py + (base - py) * 0.55}L${px + ancho} ${base}Z`;
  const nieve = `M${px} ${py}L${px - W * 0.06} ${py + H * 0.05}L${px - W * 0.025} ${py + H * 0.045}L${px - W * 0.005} ${py + H * 0.065}L${px + W * 0.02} ${py + H * 0.045}L${px + W * 0.07} ${py + H * 0.058}Z`;
  const luna = `<circle cx="${W * 0.8}" cy="${H * 0.14}" r="${W * 0.075}" fill="#f1e8d6" opacity="0.92"/><circle cx="${W * 0.8}" cy="${H * 0.14}" r="${W * 0.14}" fill="#f1e8d6" opacity="0.08"/>`;
  const f = W * 0.0075; // grosor de la bandera
  const bandera = `<rect x="${px - f / 2}" y="${py - H * 0.07}" width="${f}" height="${H * 0.07}" fill="#d6dce6"/><path d="M${px + f / 2} ${py - H * 0.07}l${W * 0.075} ${H * 0.016}l${-W * 0.075} ${H * 0.016}z" fill="#ff8a1f"/>`;
  const pinos = Array.from({ length: 26 }, (_, i) => {
    const x = (i / 25) * (W + 40) - 20, a = H * (0.045 + rnd() * 0.04), an = a * 0.4, yb = H * 1.01;
    return `<path d="M${x} ${yb - a}L${x + an} ${yb}L${x - an} ${yb}Z" fill="${i % 2 ? '#081019' : '#050a11'}"/>`;
  }).join('');
  const t = W * 0.085;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bandas}${estrellas}${luna}<path d="${monte}" fill="url(#monte)"/><path d="${nieve}" fill="#d6dce6"/>${bandera}${pinos}<text x="${W / 2}" y="${H * 0.895}" text-anchor="middle" font-family="Fraunces" font-size="${t}" fill="#f3ead8" font-weight="500">Libro <tspan fill="#ff8a1f" font-weight="700">DCA</tspan></text></svg>`;
}

const navegador = await chromium.launch();
const bloque = [];
try {
  for (const [w, h, d] of DISPOSITIVOS) {
    const W = w * d, H = h * d;
    const pagina = await navegador.newPage({ viewport: { width: W, height: H } });
    await pagina.setContent(`<style>@font-face{font-family:Fraunces;src:url(data:font/woff2;base64,${fuente}) format("woff2");font-weight:100 900}html,body{margin:0;background:#0a1322}svg{display:block}</style>${escena(W, H)}`);
    await pagina.evaluate(() => document.fonts.ready);
    const nombre = `arranque-${W}x${H}.png`;
    await pagina.screenshot({ path: path.join(ESTATICOS, nombre), type: 'png' });
    await pagina.close();
    bloque.push(`<link rel="apple-touch-startup-image" href="/${nombre}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)">`);
    console.log(nombre, `${(fs.statSync(path.join(ESTATICOS, nombre)).size / 1024).toFixed(0)} KB`);
  }
} finally {
  await navegador.close();
}
// Reescribe el bloque entre marcas en las dos páginas.
for (const f of ['index.html', 'login.html']) {
  const ruta = path.join(ESTATICOS, f);
  const html = fs.readFileSync(ruta, 'utf8');
  const marca = /<!-- arranque:inicio[^>]*-->[\s\S]*?<!-- arranque:fin -->/;
  const nuevo = `<!-- arranque:inicio (generado por scripts/generar-arranque.mjs) -->\n${bloque.join('\n')}\n<!-- arranque:fin -->`;
  fs.writeFileSync(ruta, marca.test(html) ? html.replace(marca, nuevo) : html.replace('<link rel="apple-touch-icon" href="/apple-touch-icon.png">', `<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n${nuevo}`));
}
