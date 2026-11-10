// Copiar con un toque: el TXID de una fila y, manteniendo pulsado el saldo, la cifra. Si el navegador no deja usar el portapapeles
// se prueba el método clásico; si tampoco, se dice (nunca falla en silencio).
import { avisar } from './avisar.js';
import { $ } from './estado.js';

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch { /* sin permiso o sin conexión segura: se prueba el método clásico */ }
  try {
    const t = document.createElement('textarea');
    t.value = texto;
    t.readOnly = true;
    t.className = 'copia-tmp';
    document.body.append(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  } catch {
    return false;
  }
}

// Mantener pulsado el saldo (o Ctrl/Cmd+C con el foco en él) copia la cifra, solo números: «1187072», «0.01187072» o «940.31».
const saldo = $('s-saldo-v');
const MS_LARGO = 650;
let temporizador = 0, copiado = false;
async function copiarSaldo() {
  const txt = ($('s-sats').querySelector('.sr')?.textContent ?? $('s-sats').textContent).replace(/[^\d.]/g, '');
  if (!txt) return;
  avisar((await copiarTexto(txt)) ? `Saldo copiado: ${txt}` : 'No se pudo copiar el saldo', null, true);
}
saldo.addEventListener('pointerdown', (e) => {
  if (e.button) return;
  copiado = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { copiado = true; copiarSaldo(); }, MS_LARGO);
});
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) saldo.addEventListener(ev, () => clearTimeout(temporizador));
// Tras una pulsación larga el «click» que sigue no debe cambiar de unidad.
saldo.addEventListener('click', (e) => { if (copiado) { e.stopImmediatePropagation(); copiado = false; } }, true);
saldo.addEventListener('contextmenu', (e) => e.preventDefault());
saldo.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); copiarSaldo(); } });
