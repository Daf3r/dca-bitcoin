// Entrada de la app: carga los módulos (cada uno engancha sus propios eventos) y arranca. Ver CLAUDE.md, «Módulos».
import { S } from './estado.js';
import { actualizarSuave, cargarCompras, consultarPrecio } from './datos.js';
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
import { instalarParallax } from './parallax.js';
import './refrescar.js';
import './copiar.js';
import './minicab.js';
import './atajos.js';
import './indice.js';
import './pestanas.js';
import './mensajes.js';
import './firmas.js';
import './bautizo.js';
import './cumple.js';
import './anotar.js';
import { midiendo } from './medir.js';

instalarParallax();
cargarYo();
cargarCompras();
consultarPrecio();
// (Durante la prueba de «Medir este aparato», unos segundos, no se refresca nada: un repintado a mitad sería ruido en la medida.)
const aLaVista = () => document.visibilityState === 'visible' && !midiendo();
setInterval(() => aLaVista() && consultarPrecio(), 30_000);
// Compras nuevas de otros dispositivos o personas: cada minuto, solo con la app a la vista y sin hoja ni diálogo abiertos.
setInterval(() => aLaVista() && hoja.hidden && !document.querySelector('dialog[open]') && actualizarSuave(), 60_000);
// El «hace X s» del precio avanza solo, sin volver a consultar.
setInterval(() => aLaVista() && S.precio && pintarPrecio(), 5_000);
// Al volver a la pestaña: precio fresco y compras al día (la base es compartida por la familia).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  consultarPrecio();
  if (hoja.hidden && S.cargado) cargarCompras();
});
