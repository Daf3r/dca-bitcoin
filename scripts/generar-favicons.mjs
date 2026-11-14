// Genera los iconos de pestaña con la luna del día: app/static/icon-luna-0..7.svg (las ocho fases) e icon-oro-0..7.svg (lo mismo con
// la cumbre dorada, para quien pasa de 1 BTC). El navegador no deja usar datos en línea como icono (la CSP solo permite 'self'), así que
// son archivos fijos y `favicon.js` elige uno según la fase real. Uso: node scripts/generar-favicons.mjs
import { writeFileSync } from 'node:fs';

const CX = 24, CY = 9, R = 3.2;
function luminosa(k) {
  const f = k / 8; // 0 nueva · 0.25 cuarto creciente · 0.5 llena · 0.75 cuarto menguante
  if (k === 0) return '';
  if (k === 4) return `<circle class="l" cx="${CX}" cy="${CY}" r="${R}"/>`;
  const rx = (R * Math.abs(Math.cos(2 * Math.PI * f))).toFixed(2);
  const crece = f < 0.5;
  const gibosa = k === 3 || k === 5;
  const lado = crece ? 1 : 0; // 1 = ilumina la derecha
  // Del polo norte al sur por el borde iluminado y de vuelta por el terminador.
  const sweepTerminador = crece ? (gibosa ? 1 : 0) : (gibosa ? 0 : 1);
  return `<path class="l" d="M${CX} ${CY - R}A${R} ${R} 0 0 ${lado} ${CX} ${CY + R}A${rx} ${R} 0 0 ${sweepTerminador} ${CX} ${CY - R}Z"/>`;
}
for (const oro of [false, true]) {
  for (let k = 0; k < 8; k++) {
    const bandera = oro ? '#f0b429' : '#ff8a1f';
    const nieve = oro ? '#f7e3a1' : '#d6dce6';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.f{fill:#0e1a2e}.l{fill:#f1e8d6}.m{fill:#1c3152}.o{fill:#27405f}@media (prefers-color-scheme:light){.f{fill:#fbe8cc}.l{fill:#ffb347}.m{fill:#2b4a78}.o{fill:#ecd2a8}}</style><rect class="f" width="32" height="32" rx="7"/><circle class="o" cx="${CX}" cy="${CY}" r="${R}"/>${luminosa(k)}<path class="m" d="M2 30 14 10l6 9 3-4 7 15Z"/><path d="M14 10l2.6 4.3-1.5-.6-1.1 1.4-1.2-1.3-1.4.4Z" fill="${nieve}"/><path d="M14 10V4.5l5 1.6-5 1.6" fill="${bandera}" stroke="${bandera}" stroke-width="1" stroke-linejoin="round"/></svg>\n`;
    writeFileSync(new URL(`../app/static/icon-${oro ? 'oro' : 'luna'}-${k}.svg`, import.meta.url), svg);
  }
}
console.log('16 iconos generados');
