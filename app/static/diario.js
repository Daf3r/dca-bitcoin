import { diario, textoDiario } from './lib.js';
import { miniMontana } from './arte.js';
import { $, R, S } from './estado.js';

// El Diario del Libro (campamento 15A, idea 46): una portada con lo que pasó, para todos (también los lectores). Es una tarjeta del
// Resumen. Se arma con datos que ya existen (`lib.diario`); sin sección de «quién abrió y cuándo»: eso se sentiría como vigilancia.
export function pintarDiario() {
  const caja = $('diario');
  const d = S.cargado && R?.items && R.nCompras ? diario(R) : null;
  caja.hidden = !d;
  if (!d) return;
  $('dia-edicion').textContent = `${d.edicion} · edición n.º ${d.numero}`;
  $('t-diario').textContent = d.titular;
  $('dia-sub').textContent = d.sub;
  const grab = $('dia-grabado');
  grab.innerHTML = miniMontana({ altitud: d.altitud });
  grab.setAttribute('aria-label', `Grabado de la montaña: vas al ${Math.round(d.altitud * 100)} % de la altura de la cima.`);
  $('dia-hace-b').hidden = !d.haceUnAnio;
  $('dia-hace').textContent = d.haceUnAnio?.texto ?? '';
  const lista = $('dia-clasif');
  lista.textContent = '';
  for (const t of d.clasificados) {
    const li = document.createElement('li');
    const m = /^(SE [A-ZÁÉÍÓÚÑ]+)(.*)$/.exec(t); // «SE BUSCAN», «SE OFRECE»…: el encabezado del aviso va aparte (para darle su estilo)
    if (m) { const b = document.createElement('b'); b.textContent = m[1]; li.append(b, document.createTextNode(m[2])); } else li.textContent = t;
    lista.append(li);
  }
  $('dia-pron').textContent = d.pronostico;
  caja.setAttribute('aria-description', textoDiario(d));
}
