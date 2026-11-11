import { avisar } from './avisar.js';
import { $, R, S, api, normalizar } from './estado.js';
import { pintar } from './pintar.js';

// -------------------------------------------------------------------- CSV
$('csv-in').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  try {
    const r = await api('/api/import', { metodo: 'POST', cuerpo: await archivo.text(), tipo: 'text/csv' });
    const antes = R.sats;
    S.compras = (await api('/api/compras')).map(normalizar);
    pintar({ montana: true, desde: antes });
    const omit = r.omitidas.length;
    avisar(`Importadas: ${r.nuevas} · repetidas: ${r.repetidas} · omitidas: ${omit}` + (omit ? `. ${r.omitidas.slice(0, 3).join('. ')}${omit > 3 ? '…' : ''}` : '.'));
  } catch (err) {
    avisar(`No se pudo importar. ${err.message}`);
  }
});

// Importar traslados (idea 47): el mismo estilo que las compras; el servidor rechaza el archivo entero si dejaría la wallet en negativo.
$('tras-in').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  try {
    const r = await api('/api/traslados/import', { metodo: 'POST', cuerpo: await archivo.text(), tipo: 'text/csv' });
    S.traslados = await api('/api/traslados');
    pintar();
    const omit = r.omitidos.length;
    avisar(`Traslados importados: ${r.nuevos} · repetidos: ${r.repetidos} · omitidos: ${omit}` + (omit ? `. ${r.omitidos.slice(0, 3).join('. ')}${omit > 3 ? '…' : ''}` : '.'));
  } catch (err) {
    avisar(`No se pudo importar. ${err.message}`);
  }
});
