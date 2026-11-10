import { fechaLarga, historia, medallas } from './lib.js';
import { ico, ilustracion, medalla } from './iconos.js';
import { $, R } from './estado.js';

// «Tu historia» (ideas 37 y 38): en «Tu cuenta», las medallas de constancia y la línea de tiempo de cómo llegaste hasta aquí.
// Todo sale de datos que ya existen (ver `lib.historia` y `lib.medallas`). El texto de las compras (notas) entra con `textContent`.
const nodo = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };

export function pintarHistoria() {
  const lista = $('dh-linea'), med = $('dh-medallas');
  lista.textContent = '';
  med.textContent = '';
  $('dh-vacio').hidden = R.nCompras > 0;
  if (!R.nCompras) $('dh-vacio').innerHTML = `${ilustracion('montana')}Tu historia empieza con tu primera compra.`;
  $('dh-cuerpo').hidden = !R.nCompras;
  if (!R.nCompras) return;
  for (const m of medallas(R)) {
    const li = nodo('li', `medalla ${m.ganada ? 'ganada' : 'bloq'}`);
    li.insertAdjacentHTML('beforeend', medalla(m));
    li.append(nodo('b', null, m.titulo), nodo('small', null, m.ganada ? fechaLarga(m.fecha) : `Próxima: te ${m.falta === 1 ? 'falta' : 'faltan'} ${m.falta} ${m.tipo === 'compras' ? (m.falta === 1 ? 'compra' : 'compras') : (m.falta === 1 ? 'mes' : 'meses')}`));
    med.append(li);
  }
  const { eventos, extrasOcultas } = historia(R);
  for (const e of eventos) {
    const li = nodo('li', `h-ev h-${e.clase}`);
    const t = nodo('time', null, fechaLarga(e.fecha));
    t.dateTime = e.fecha;
    const cuerpo = nodo('div');
    const tit = nodo('strong');
    if (e.clase === 'extra') tit.insertAdjacentHTML('beforeend', `${ico('rayo')} `);
    tit.append(document.createTextNode(e.titulo));
    cuerpo.append(tit);
    if (e.detalle) cuerpo.append(nodo('p', null, e.detalle));
    li.append(t, cuerpo);
    lista.append(li);
  }
  if (extrasOcultas) lista.insertBefore(nodo('li', 'h-mas', `Y ${extrasOcultas} compras extra más, más antiguas.`), lista.lastElementChild);
}
