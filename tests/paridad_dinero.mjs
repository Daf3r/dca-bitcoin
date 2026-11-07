// Calcula con lib.js lo que el servidor debe cuadrar: saldo, invertido neto y dónde están los sats (wallet y exchange).
// Entrada (stdin): [{ compras: [...], traslados: [...] }]   Salida: [{ sats, inv, wallet, exchange }]
import { resumen, ubicacionSats } from '../app/static/lib.js';

const entrada = JSON.parse(await new Promise((res) => { let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => res(s)); }));
const salida = entrada.map(({ compras, traslados }) => {
  const R = resumen(compras, null, '2026-11-06');
  const u = ubicacionSats(traslados, R.sats);
  return { sats: R.sats, inv: R.inv, wallet: u.wallet, exchange: u.exchange };
});
process.stdout.write(JSON.stringify(salida));
