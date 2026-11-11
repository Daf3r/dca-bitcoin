import { $, api } from './estado.js';
import { avisar } from './avisar.js';
import { hace } from './sistema.js';

// «Sesiones abiertas» (idea 152): los dispositivos donde está abierta tu cuenta, con su último uso, y un botón para cerrar cualquiera menos
// el de este dispositivo (para ese está «Salir»). El servidor solo manda un id corto, fechas y el navegador resumido: nunca un token.
const hora = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', hour: 'numeric', minute: '2-digit' });

export async function pintarSesiones() {
  const ul = $('ses-lista');
  let lista;
  try { lista = await api('/api/sesiones'); } catch (err) { ul.replaceChildren(Object.assign(document.createElement('li'), { className: 'vacio', textContent: `No se pudo cargar. ${err.message}` })); return; }
  const ahora = Math.floor(Date.now() / 1000);
  ul.replaceChildren(...lista.map((x) => {
    const li = document.createElement('li');
    li.className = 'sis-fila ses-fila';
    const cuerpo = document.createElement('span');
    const t = Object.assign(document.createElement('b'), { textContent: x.agente || 'Dispositivo' });
    cuerpo.append(t);
    if (x.actual) cuerpo.append(Object.assign(document.createElement('span'), { className: 'sis-palabra', textContent: ' · Este dispositivo' }));
    cuerpo.append(document.createElement('br'));
    const usada = x.actual ? 'en uso ahora' : `último uso ${hace(x.ultima, ahora)}`;
    const extra = x.compartida ? ` · compartido: se cierra solo a las ${hora.format(new Date(x.caduca * 1000))}` : '';
    cuerpo.append(Object.assign(document.createElement('small'), { textContent: `Entró ${hace(x.creada, ahora)} · ${usada}${extra}` }));
    li.append(cuerpo);
    if (!x.actual) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'ses-cerrar', textContent: 'Cerrar' });
      b.setAttribute('aria-label', `Cerrar la sesión de ${x.agente || 'este dispositivo'}`);
      b.addEventListener('click', async () => {
        b.disabled = true;
        try { await api(`/api/sesiones/${x.id}`, { metodo: 'DELETE' }); avisar('Sesión cerrada.', null, true); } catch (err) { avisar(`No se pudo cerrar. ${err.message}`); }
        pintarSesiones();
      });
      li.append(b);
    }
    return li;
  }));
}
