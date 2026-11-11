import { $, S, api } from './estado.js';
import { avisar } from './avisar.js';
import { entero, walletNetoDe } from './lib.js';
import { pintar } from './pintar.js';

// «Tus wallets» (idea 156, solo admin, dentro de «Tus datos»): las wallets además de la principal, con lo que tiene cada una y un botón para
// archivarla cuando ya no la usas (solo si está vacía: el servidor lo exige). Las wallets nuevas se crean al anotar un traslado.
export function pintarWallets() {
  const activas = S.wallets.filter((w) => !w.archivada);
  $('dd-wallets').hidden = !S.wallets.length;
  const ul = $('dd-wallets-lista');
  ul.replaceChildren(...activas.map((w) => {
    const sats = Math.max(0, walletNetoDe(S.traslados, w.id));
    const li = document.createElement('li');
    li.className = 'sis-fila ses-fila wal-fila';
    const cuerpo = document.createElement('span');
    const nombre = document.createElement('b');
    nombre.textContent = w.nombre; // siempre como texto
    const det = document.createElement('small');
    det.textContent = sats ? `Tiene ${entero(sats)} sats. Para archivarla, anota un traslado de vuelta al exchange.` : 'Vacía: se puede archivar.';
    cuerpo.append(nombre, document.createElement('br'), det);
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'ses-cerrar', textContent: 'Archivar', disabled: sats > 0 });
    b.setAttribute('aria-label', `Archivar la wallet ${w.nombre}`);
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await api(`/api/wallets/${w.id}`, { metodo: 'DELETE' });
        S.wallets = S.wallets.map((x) => (x.id === w.id ? { ...x, archivada: true } : x));
        avisar('Wallet archivada. Sus traslados quedan en la lista.', null, true);
        pintar();
      } catch (err) { avisar(`No se pudo archivar. ${err.message}`); }
      pintarWallets();
    });
    li.append(cuerpo, b);
    return li;
  }));
  if (!activas.length && S.wallets.length) ul.append(Object.assign(document.createElement('li'), { className: 'vacio', textContent: 'Todas tus wallets extra están archivadas.' }));
}
