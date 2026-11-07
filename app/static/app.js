// Entrada de la app: carga los módulos (cada uno engancha sus propios eventos) y arranca. Ver CLAUDE.md, «Módulos».
import { S } from './estado.js';
import { cargarCompras, consultarPrecio } from './datos.js';
import './avisar.js';
import { pintarPrecio } from './pintar.js';
import './mercado.js';
import './lista.js';
import { hoja } from './hoja.js';
import './reportes.js';
import './celebracion.js';
import './novedades.js';
import './csv.js';
import { cargarYo } from './cuenta.js';

cargarYo();
cargarCompras();
consultarPrecio();
setInterval(() => document.visibilityState === 'visible' && consultarPrecio(), 30_000);
// El «hace X s» del precio avanza solo, sin volver a consultar.
setInterval(() => document.visibilityState === 'visible' && S.precio && pintarPrecio(), 5_000);
// Al volver a la pestaña: precio fresco y compras al día (la base es compartida por la familia).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  consultarPrecio();
  if (hoja.hidden && S.cargado) cargarCompras();
});
