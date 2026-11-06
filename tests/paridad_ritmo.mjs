// Calcula con lib.js lo mismo que app/ritmo.py (ritmo, «te toca», etapas, constancia) para compararlo desde test_api.py.
// Entrada (stdin): { toca: [{fechas, hoy}], etapas: [[desde, hasta]], constancia: [{antes, despues}], nombres: [sats] }
import { constanciaCruzada, etapasCruzadas, nombreHito, resumen, tocaComprar } from '../app/static/lib.js';

const entrada = JSON.parse(await new Promise((res) => { let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => res(s)); }));
const items = (fechas) => fechas.map((fecha, i) => ({ id: i + 1, fecha, monto: 10, precio: 50000, sats: 20000, tipo: 'compra' }));

const salida = {
  toca: entrada.toca.map(({ fechas, hoy }) => {
    const R = resumen(items(fechas), null, hoy);
    const t = tocaComprar(R, hoy);
    return t ? { estado: t.estado, racha: R.racha, paso: R.paso } : null;
  }),
  etapas: entrada.etapas.map(([d, h]) => etapasCruzadas(d, h)),
  constancia: entrada.constancia.map(({ antes, despues }) => constanciaCruzada(items(antes), items(despues)).map((c) => [c.tipo, c.valor])),
  nombres: entrada.nombres.map((m) => nombreHito(m)),
};
process.stdout.write(JSON.stringify(salida));
