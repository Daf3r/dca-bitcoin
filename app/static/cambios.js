import { $, S, api } from './estado.js';
import { ofrecerAvisos } from './cuenta.js';

// «Qué hay de nuevo» (idea 158): tras una actualización, una tarjeta breve (una sola vez por persona) cuenta qué cambió. No es una ayuda:
// es un aviso corto. **Para cada versión con cambios que se vean, añade una entrada ARRIBA** con un `id` nuevo (se compara como texto
// y solo vale `[0-9a-z.-]`, hasta 40 caracteres) y 3 a 6 frases cortas, sin tecnicismos. Lo guardado por persona es el `id` de la
// última que vio (`usuarios.cambios_visto`); una cuenta nueva no ve nada «que haya cambiado» y se marca sin avisar.
export const CAMBIOS = [
  {
    id: '2026-11-p', fecha: '2026-11-18',
    items: [
      'La vista «Sats» se lee mejor: la línea se ve de punta a punta, también con muchas compras, y las cifras de las etapas tienen su propio margen.',
      'Las monedas del lago parecen monedas y el reloj de sol se distingue mejor, sin tapar los árboles.',
      'En la hoja de anotar, la regla del «Tú» fantasma marca a rayas lo que sumaría tu compra.',
      'Varios retoques de orden: medallas y sellos alineados, el Diario a lo ancho en la tablet y la hora del precio sin cortes en teléfonos pequeños.',
    ],
  },
  {
    id: '2026-11-o', fecha: '2026-11-17',
    items: [
      'Al anotar una compra, la hoja te enseña un «Tú» fantasma: dónde quedarías en el camino a tu próxima etapa.',
      'La vista «Sats» del gráfico ahora es un perfil de altitud, con las etapas rotuladas y un farol en cada campamento que cruzaste.',
      'Tras una venta o un gasto, una monedita se hunde en el lago y queda brillando: se gastó, pero sigue siendo parte de tu historia.',
      'De día, la sombra de la cumbre marca la hora en el suelo. Y el aviso de cada etapa llega por telegrama.',
    ],
  },
  {
    id: '2026-11-n', fecha: '2026-11-16',
    items: [
      'Llegó «El Diario del Libro»: una portada en el Resumen con lo que pasó, qué había hace un año, unos clasificados con humor y el pronóstico de la montaña.',
      'Ahora se pueden dejar cartas selladas para el futuro: se abren solas en una fecha o al llegar a una etapa, y toda la familia las lee cuando llega el momento.',
      'Cada campamento puede tener un mensaje: al tocar su bandera sale la frase, y también aparece en «Tu historia». Hasta que llegues, es una sorpresa.',
      'Quien no anota puede dejar una piedrita en una compra, con un toque. Quien anota las ve, y le llega un aviso.',
      'En «Tu cuenta» puedes poner tu cumpleaños: ese día el libro te saluda y la montaña enciende un farol con tu inicial.',
      'En el modo pantalla grande hay fiesta cuando se anota una compra, un sismógrafo con el precio del día y un atardecer a las 6 de la tarde.',
    ],
  },
  {
    id: '2026-11-m', fecha: '2026-11-16',
    items: [
      'Lo de debajo de la montaña ahora está en cuatro pestañas: Resumen, Gráficos, Historia y Movimientos. Una sola cosa a la vez, sin tanto scroll.',
      'Tus medallas están a la vista en el Resumen, y «Tu historia» tiene su propia pestaña (ya no hay que buscarla en «Tu cuenta»).',
      'Quité lo que se repetía: la lista de etapas, que ya cuenta tu historia, y las cifras curiosas.',
      'Si prefieres la página larga de antes, en «Tu cuenta» → «Pantalla» elige «todo junto».',
    ],
  },
  {
    id: '2026-11-l', fecha: '2026-11-15',
    items: [
      'En «Tu historia» hay dos vistas nuevas: los estratos, una capa de tierra por cada mes (las compras extra son vetas de cuarzo), y la partitura, una nota por cada compra: más aguda cuanto más caro estaba BTC ese día. Toca «Tocar este año» y suena.',
      'Cada semana en que compras se gana un sello, y se guardan en tu pasaporte de semanas. Una semana sin sello no es una falta: el pasaporte solo cuenta lo que ya hiciste.',
      'Al tocar un campamento que ya alcanzaste, su fecha aparece tallada en una piedra.',
    ],
  },
  {
    id: '2026-11-k', fecha: '2026-11-15',
    items: [
      'En «Tu historia» hay una vista nueva, la manta de añil: una celda por cada semana, más oscura cuanto más sumaste. Las semanas sin compras son algodón crudo, parte del tejido.',
      'Las compras extra llevan una puntada naranja en la manta, y lo que falta del año cuelga como flecos.',
      'Ya puedes ver tu certificado de altitud: tu saldo escrito en letras, con un grabado hecho de tus compras.',
      'Cada etapa que cruzas deja un sello de lacre en tu historia; al cruzar una nueva, el sello cae en la tarjeta de celebración.',
    ],
  },
  {
    id: '2026-11-j', fecha: '2026-11-15',
    items: [
      'En «Tu historia» puedes ver tu camino de tres maneras nuevas, además de la línea de tiempo.',
      'El tronco: un anillo por año, más ancho cuanto más sumaste; las compras extra son nudos y las ventas, grietas ya cerradas.',
      'La constelación: una estrella por compra, más brillante cuanto más grande, con las de cada año unidas en una figura.',
      'La torre de piedras: una piedra por compra, apiladas de la más vieja a la más nueva. Toca cualquier piedra para ver de qué compra es.',
    ],
  },
  {
    id: '2026-11-i', fecha: '2026-11-14',
    items: [
      'Detrás de la montaña se ven ahora los volcanes de Occidente: el Izalco, el Santa Ana y el de San Salvador.',
      'Al amanecer, de vez en cuando, cruza el cielo un torogoz.',
      'En las fiestas agostinas, las patrias y en Navidad cuelga papel picado con el año; y la noche de fin de año hay cohetes.',
      'En la época lluviosa, por la tarde, cae una llovizna detrás de la montaña; en la seca, el aire se pone dorado.',
      'Los árboles de honor, la luna-moneda y tu eco están mejor dibujados. Y si no llega el precio, en su lugar planea el mensajero.',
    ],
  },
  {
    id: '2026-11-h', fecha: '2026-11-14',
    items: [
      'En la montaña aparece tu eco: una sombra con la leyenda «hace 1 año» marca dónde estabas hace doce meses.',
      'Si tu saldo es un número especial (capicúa, todo repetido, una escalera…), una etiqueta junto a «Tu saldo» lo dice.',
      'La compra 100 planta un ceibo entre los pinos; la 500, un amate; la 1,000, un maquilishuat.',
      'Hay días con una nota: el aniversario de tu primera compra, fechas de Bitcoin y las lluvias de estrellas reales.',
      'Pasadas las 10 de la noche la página se atenúa un poco (se apaga en «Tu cuenta»). Y la luna guarda un secreto: toca tres veces.',
    ],
  },
  {
    id: '2026-11-g', fecha: '2026-11-14',
    items: [
      'En el gráfico del precio, cada compra tiene el tamaño de sus sats: una compra grande se ve grande. En el teléfono la leyenda está plegada para dejar más sitio.',
      'Al bajar por la página, la franja de arriba muestra una regla con tu punto entre la etapa anterior y la siguiente.',
      'El tema claro tiene curvas de nivel muy suaves de fondo, como un mapa.',
      'El icono de la pestaña lleva la luna real del día, y se vuelve dorado al pasar de 1 BTC.',
      'El botón «Anotar compra» tiene un degradado debajo para que el texto no se enrede con él.',
    ],
  },
  {
    id: '2026-11-f', fecha: '2026-11-14',
    items: [
      'En el sendero de la montaña ahora se ven las etapas entre un campamento y otro (250k, 500k…) como marcas, y la siguiente lleva su nombre.',
      'La tarjeta «Próximo campamento» ahora se llama «Próxima etapa», y la lista de abajo, «Etapas», para que coincidan con lo que ves en la montaña.',
      'Una compra marcada como extra ya no cuenta como la compra de la semana para tu racha ni para «Te toca comprar».',
    ],
  },
  {
    id: '2026-11-e', fecha: '2026-11-13',
    items: [
      'La app tiene un aspecto nuevo, más cálido: el cielo de la montaña cambia de color sin franjas y el sol y la luna dan una luz suave.',
      'Las montañas lejanas se pierden en la bruma, la cara que mira al sol se ilumina y las nubes y el lago se ven más naturales.',
      'El sendero es ahora un camino de tierra con tu tramo recorrido iluminado, y cada campamento es un farol junto al camino: encendido cuando ya llegaste.',
      'Las tarjetas tienen más profundidad y la letra de los títulos es más suave.',
      'En pantallas grandes, bajo tu saldo ves tu costo promedio, tu racha y cuántas compras llevas.',
      'Cada wallet tiene ahora su propio color en «Dónde están tus sats».',
    ],
  },
  {
    id: '2026-11-d', fecha: '2026-11-12',
    items: [
      'Puedes tener varias wallets: al anotar un traslado elige a cuál va, y la tarjeta «Dónde están tus sats» las reparte con sus nombres.',
      'En «Avisos en este dispositivo» hay un botón para enviarte un aviso de prueba, y el recordatorio de compra trae el botón «Anotar compra».',
      'Opcional: elige un monto y te recordamos cuando en el exchange haya más sats de ese monto, por si quieres moverlos a tu wallet (solo es un recordatorio).',
      'Quien administra puede crear un enlace de solo lectura para ver tus compras en una hoja de cálculo (Google Sheets o Excel), y revocarlo cuando quiera.',
    ],
  },
  {
    id: '2026-11-c', fecha: '2026-11-11',
    items: [
      'Ahora puedes ponerle etiquetas a tus compras («cumpleaños», «bono»…) y filtrar la lista por ellas.',
      'En «Tu cuenta» está «Sesiones abiertas»: ves en qué dispositivos está tu cuenta y puedes cerrar cualquiera con un toque.',
      'Al entrar, marca «Este dispositivo es compartido» si es una computadora o tablet de varios: la sesión se cierra sola a las 4 horas.',
      'Quien administra puede descargar todo en un solo archivo y ver el estado del sistema.',
      'La app se ve bien también con el teléfono acostado y en pantallas muy grandes.',
    ],
  },
  {
    id: '2026-11-b', fecha: '2026-11-10',
    items: [
      'La montaña ahora tiene una cima más cercana: la siguiente potencia de 10 (100k, 1M, 10M…). Al llegar, se rehace con la siguiente.',
      'Toca una bandera de la montaña para ver cuándo la alcanzaste; cada compra planta un pino al pie.',
      'En «Tu cuenta» está «Tu historia»: tus medallas de constancia y la línea de tiempo de cómo llegaste hasta aquí.',
      'Modo pantalla grande (también en «Tu cuenta»): la montaña, el saldo y el último movimiento para dejar el libro en un televisor.',
      'Sonido opcional al guardar una compra (apagado: se enciende en «Tu cuenta»).',
      'Iconos nuevos, colores por persona y una entrada que reacciona al escribir.',
    ],
  },
];
const ULTIMO = CAMBIOS[0];

const dCam = $('d-cambios');
/** ¿Falta mostrar el aviso de cambios a esta persona? (Con `null` —cuenta nueva— se marca en silencio y no hay nada que mostrar.) */
export function cambiosPendientes() {
  if (!S.rol || S.cambios === undefined) return false;
  if (S.cambios === null) { marcarVisto(); return false; }
  return S.cambios !== ULTIMO.id;
}
async function marcarVisto() {
  S.cambios = ULTIMO.id;
  try { await api('/api/cambios-visto', { metodo: 'POST', cuerpo: { id: ULTIMO.id } }); } catch { /* sin red: saldrá otra vez */ }
}
export function mostrarCambios() {
  if (dCam.open) return;
  const lista = $('cam-lista');
  lista.textContent = '';
  for (const t of ULTIMO.items) { const li = document.createElement('li'); li.textContent = t; lista.append(li); }
  dCam.showModal();
}
$('cam-ok').addEventListener('click', () => dCam.close());
dCam.addEventListener('close', async () => {
  await marcarVisto();
  ofrecerAvisos(); // lo que sigue: la oferta de avisos
});
