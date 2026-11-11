// El cielo de la escena según la hora real de El Salvador, aplicado ANTES de pintar (script clásico y bloqueante en
// <head>, como tema.js y efectos.js). Deja en `html` los colores de la escena como variables CSS y dos marcas:
//   data-cielo  = noche | amanecer | dia | atardecer   (la franja, para elegir sol o luna, estrellas, saludo…)
//   data-tinta  = clara | oscura                        (el color de los textos que van sobre el cielo)
// Los colores se mezclan poco a poco entre franjas (ventanas de 30 a 60 minutos) y se actualizan cada 5 minutos.
// Sin dependencias: lo usan la app, la entrada y las pruebas. Para probar a otra hora: localStorage `libro.hora` = 14.5.
(() => {
  const raiz = document.documentElement;
  const ZONA = 'America/El_Salvador';
  const hex = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));

  // Una paleta por franja. Las capas del cielo (c0 arriba … c4 en el horizonte) y la montaña.
  const P = {
    noche: {
      c: ['#0a1322', '#0e1a2e', '#12213a', '#172946', '#1c3152'], astro: '#f1e8d6', halo: [241, 232, 214, 0.1], estrellas: 0.75, nube: [150, 170, 200, 0.16],
      lejos: '#1c2b45', medio: '#162139', monte: '#0f1828', sombra: '#0a111d', nieve: '#d6dce6', pino0: '#081019', pino1: '#050a11',
    },
    amanecer: {
      c: ['#fbe8cc', '#f8d9b2', '#f5c597', '#f1af7f', '#ec976a'], astro: '#fff7e8', halo: [255, 247, 232, 0.45], estrellas: 0, nube: [255, 240, 225, 0.6],
      lejos: '#d4836a', medio: '#ac5c56', monte: '#24443f', sombra: '#18302c', nieve: '#fff7ea', pino0: '#1b3832', pino1: '#10241f',
    },
    dia: {
      c: ['#7fb8ea', '#9bcaf0', '#b5daf5', '#cfe8f8', '#e4f3fb'], astro: '#fff3b0', halo: [255, 243, 176, 0.5], estrellas: 0, nube: [255, 255, 255, 0.85],
      lejos: '#9db4c8', medio: '#6f8ca3', monte: '#3c5a58', sombra: '#283f40', nieve: '#ffffff', pino0: '#294842', pino1: '#1b322f',
    },
    atardecer: {
      c: ['#241b4a', '#3f2766', '#5c2c6b', '#bd5a78', '#f0a35c'], astro: '#ffd9a0', halo: [255, 217, 160, 0.35], estrellas: 0.3, nube: [255, 205, 190, 0.4],
      lejos: '#7a4577', medio: '#4f2d66', monte: '#271a3a', sombra: '#1a1128', nieve: '#ffe3c6', pino0: '#1a1128', pino1: '#0f0a1a',
    },
  };
  // Tinta del texto sobre cada franja (los textos no se mezclan: cambian de golpe donde el cielo pasa de claro a oscuro).
  const TINTA = {
    clara: { txt: '#f3ead8', txt2: '#aab4c6', sube: '#6fd8a0', baja: '#ff958a', marca: '#ffa04a', sombra: 'rgb(5 10 20 / 0.55)' },
    oscura: { txt: '#1f1812', txt2: '#3f3128', sube: '#10592f', baja: '#93231a', marca: '#9c4a05', sombra: 'rgb(255 244 225 / 0.55)' },
  };
  // Horas (El Salvador): [desde, franja]; entre una y la siguiente, la mezcla ocupa la ventana indicada.
  const TRAMOS = [
    { h: 4.75, f: 'noche' }, { h: 5.25, f: 'amanecer' }, { h: 6.75, f: 'amanecer' }, { h: 7.25, f: 'dia' },
    { h: 16.25, f: 'dia' }, { h: 16.75, f: 'atardecer' }, { h: 18.25, f: 'atardecer' }, { h: 19.25, f: 'noche' },
  ];

  /** Hora decimal de El Salvador (0 a 24). Con `libro.hora` en localStorage, la que se pida (para probar). */
  function hora(ahora = new Date()) {
    try {
      const forzada = Number.parseFloat(localStorage.getItem('libro.hora'));
      if (forzada >= 0 && forzada < 24) return forzada;
    } catch { /* sin almacenamiento */ }
    const partes = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ahora);
    const n = (t) => Number(partes.find((p) => p.type === t).value);
    return n('hour') + n('minute') / 60;
  }
  /** La franja a la que pertenece la hora. */
  function franja(h) {
    if (h >= 19 || h < 5) return 'noche';
    if (h < 7) return 'amanecer';
    if (h < 16.5) return 'dia';
    return 'atardecer';
  }
  const mezclar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const aRgb = (v) => `rgb(${v.slice(0, 3).map(Math.round).join(' ')})`;
  /** Las dos paletas entre las que está la hora y cuánto de la segunda (0 a 1). */
  function entre(h) {
    const x = h < TRAMOS[0].h ? h + 24 : h; // la noche cruza la medianoche
    const lista = [...TRAMOS, { h: TRAMOS[0].h + 24, f: 'noche' }];
    for (let i = 0; i < lista.length - 1; i++) {
      if (x >= lista[i].h && x < lista[i + 1].h) {
        const t = (x - lista[i].h) / (lista[i + 1].h - lista[i].h);
        return [lista[i].f, lista[i + 1].f, lista[i].f === lista[i + 1].f ? 0 : t * t * (3 - 2 * t)];
      }
    }
    return ['noche', 'noche', 0];
  }
  /** Los colores de la escena a esa hora: { '--c0': 'rgb(…)', … }. */
  function colores(h) {
    const [fa, fb, t] = entre(h);
    const a = P[fa], b = P[fb];
    const c = (k) => aRgb(mezclar(hex(a[k]), hex(b[k]), t));
    const v = {};
    a.c.forEach((_, i) => { v[`--c${i}`] = aRgb(mezclar(hex(a.c[i]), hex(b.c[i]), t)); });
    Object.assign(v, {
      '--astro': c('astro'), '--halo': `rgb(${mezclar(a.halo, b.halo, t).slice(0, 3).map(Math.round).join(' ')} / ${mezclar(a.halo, b.halo, t)[3].toFixed(2)})`,
      '--halo-a': mezclar(a.halo, b.halo, t)[3].toFixed(3),
      '--estrellas': (a.estrellas + (b.estrellas - a.estrellas) * t).toFixed(2),
      '--nube': (() => { const n = mezclar(a.nube, b.nube, t); return `rgb(${n.slice(0, 3).map(Math.round).join(' ')} / ${n[3].toFixed(2)})`; })(),
      '--lejos': c('lejos'), '--medio': c('medio'), '--monte': c('monte'), '--monte-sombra': c('sombra'), '--nieve': c('nieve'),
      '--pino0': c('pino0'), '--pino1': c('pino1'),
    });
    return v;
  }
  const luminancia = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((x) => { const v = Number(x) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  /** Tinta de los textos: la que mejor se lee sobre las tres capas de arriba (donde va el saldo) a esa hora, incluso a mitad de una mezcla. */
  function tinta(h) {
    const col = colores(h);
    const ls = ['--c0', '--c1', '--c2'].map((k) => luminancia(col[k]));
    const peor = (ink) => Math.min(...ls.flatMap((l) => [contraste(luminancia(`rgb(${hex(TINTA[ink].txt).join(' ')})`), l), contraste(luminancia(`rgb(${hex(TINTA[ink].txt2).join(' ')})`), l)]));
    return peor('clara') >= peor('oscura') ? 'clara' : 'oscura';
  }
  /** Fase de la luna (0 = nueva, 0.25 = cuarto creciente, 0.5 = llena, 0.75 = cuarto menguante), con una luna nueva conocida. */
  function faseLunar(fecha = new Date()) {
    const CICLO = 29.530588853 * 864e5;
    const NUEVA = Date.UTC(2000, 0, 6, 18, 14);
    return (((fecha.getTime() - NUEVA) / CICLO) % 1 + 1) % 1;
  }
  /** «Buenos días / tardes / noches» según la hora. */
  function saludo(h) {
    return h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }

  function aplicar() {
    const h = hora();
    for (const [k, v] of Object.entries(colores(h))) raiz.style.setProperty(k, v);
    const ti = tinta(h), t = TINTA[ti];
    raiz.dataset.cielo = franja(h);
    raiz.dataset.tinta = ti;
    raiz.style.setProperty('--cielo-txt', t.txt);
    raiz.style.setProperty('--cielo-txt2', t.txt2);
    raiz.style.setProperty('--cielo-sube', t.sube);
    raiz.style.setProperty('--cielo-baja', t.baja);
    raiz.style.setProperty('--cielo-marca', t.marca);
    raiz.style.setProperty('--cielo-sombra', t.sombra); // un halo suave del color contrario: ayuda en los minutos de crepúsculo
  }
  aplicar();
  setInterval(() => { if (document.visibilityState === 'visible') aplicar(); }, 300_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') aplicar(); });
  window.libroCielo = { hora, franja, colores, tinta, faseLunar, saludo, paletas: P, tintas: TINTA, aplicar };
})();
