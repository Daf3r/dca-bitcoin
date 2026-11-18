// Atajos de teclado para la computadora: A anotar, T cambiar el tema, U cambiar la unidad del saldo y / para buscar en la lista.
// Son teclas sueltas (WCAG 2.1.4), así que se pueden apagar en «Tu cuenta», y no hacen nada con Ctrl/Cmd/Alt, dentro de un campo de
// texto, con una hoja o un diálogo abierto, ni con una tecla que se queda pulsada. La lista de atajos está en «Tu cuenta».
import { $, esAdmin } from './estado.js';
import { siguienteTema } from './cuenta.js';
import { abrirHoja, hoja } from './hoja.js';

const CLAVE = 'libro.atajos';
export const atajosActivos = () => { try { return localStorage.getItem(CLAVE) !== '0'; } catch { return true; } };
export function fijarAtajos(si) {
  try { if (si) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, '0'); } catch { /* vale para esta visita */ }
}

// (Pulido final) En un aparato táctil el interruptor y la lista de atajos no salen en «Tu cuenta» hasta que se teclea una letra fuera
// de un campo de texto: eso solo pasa con un teclado físico (el de la pantalla solo aparece dentro de un campo), y desde ahí los atajos
// pueden dispararse, así que su interruptor tiene que estar a la vista.
document.addEventListener('keydown', (e) => {
  if (e.key?.length === 1 && !e.target.closest?.('input, textarea, select, [contenteditable="true"]')) document.documentElement.dataset.teclado = '';
});
document.addEventListener('keydown', (e) => {
  if (!atajosActivos() || e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!hoja.hidden || document.querySelector('dialog[open]')) return;
  if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  const tecla = e.key.length === 1 ? e.key.toLowerCase() : '';
  if (tecla === 'a' && esAdmin()) { e.preventDefault(); abrirHoja(); } else if (tecla === 't') { e.preventDefault(); siguienteTema(); } else if (tecla === 'u') { e.preventDefault(); $('s-saldo-v').click(); } else if (tecla === '/' && !$('l-ctl').hidden) {
    e.preventDefault();
    $('l-buscar').focus();
  }
});
