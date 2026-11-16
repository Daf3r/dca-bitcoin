// Calcula con lib.js lo mismo que app/ritmo.py (ritmo, «te toca», etapas, constancia, el titular del Diario) para compararlo desde test_api.py.
// Entrada (stdin): { toca: [{fechas, hoy}], etapas: [[desde, hasta]], constancia: [{antes, despues}], nombres: [sats], diario: [{movs, hoy}], escalera: tope }
import { caidaGrande, constanciaCruzada, diario, etapaCelebrada, etapasCruzadas, etapasHasta, montoHabitual, nombreHito, rangoEtapa, reposicion, resumen, tocaComprar } from '../app/static/lib.js';

const entrada = JSON.parse(await new Promise((res) => { let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => res(s)); }));
const items = (fechas) => fechas.map((fecha, i) => ({ id: i + 1, fecha, monto: 10, precio: 50000, sats: 20000, tipo: 'compra' }));

const salida = {
  toca: entrada.toca.map(({ fechas, hoy }) => {
    const R = resumen(items(fechas), null, hoy);
    const t = tocaComprar(R, hoy);
    return t ? { estado: t.estado, racha: R.racha, paso: R.paso } : null;
  }),
  etapas: entrada.etapas.map(([d, h]) => etapasCruzadas(d, h)),
  // Campamento 21: la escalera entera, el rango de cada etapa y la que se celebra al cruzar varias.
  escalera: etapasHasta(entrada.escalera ?? 1e12).map((m) => [m, rangoEtapa(m)]),
  celebrada: entrada.etapas.map(([d, h]) => etapaCelebrada(d, h) ?? null),
  constancia: entrada.constancia.map(({ antes, despues }) => constanciaCruzada(items(antes), items(despues)).map((c) => [c.tipo, c.valor])),
  nombres: entrada.nombres.map((m) => nombreHito(m)),
  caida: (entrada.caida ?? []).map(({ historico, vivo, hoy }) => caidaGrande(historico, vivo, hoy)),
  reposicion: (entrada.reposicion ?? []).map(({ movs, vivo, hoy }) => {
    const R = resumen(movs.map((m, i) => ({ id: i + 1, precio: (m.monto * 1e8) / m.sats, ...m })), null, hoy);
    const r = reposicion(R, vivo);
    return { habitual: montoHabitual(R.items), r: r && { monto: r.monto, antes: r.antes, despues: r.despues }, inv: R.inv, sats: R.sats };
  }),
  // El Diario del domingo (campamento 19): de qué fue la semana y su titular sin cifras.
  diario: (entrada.diario ?? []).map(({ movs, hoy }) => {
    const d = diario(resumen(movs.map((m) => ({ monto: 10, precio: (10 * 1e8) / m.sats, ...m })), null, hoy), hoy);
    return d ? { clase: d.clase, aviso: d.aviso } : null;
  }),
};
process.stdout.write(JSON.stringify(salida));
