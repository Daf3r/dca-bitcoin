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
      lejos: '#1c2b45', medio: '#162139', monte: '#0f1828', sombra: '#0a111d', nieve: '#d6dce6', pino0: '#081019', pino1: '#050a11', luz: '#8ea6d8',
    },
    amanecer: {
      c: ['#fbe8cc', '#f8d9b2', '#f5c597', '#f1af7f', '#ec976a'], astro: '#fff7e8', halo: [255, 247, 232, 0.45], estrellas: 0, nube: [255, 240, 225, 0.6],
      lejos: '#d4836a', medio: '#ac5c56', monte: '#24443f', sombra: '#18302c', nieve: '#fff7ea', pino0: '#1b3832', pino1: '#10241f', luz: '#fff7e8',
    },
    dia: {
      c: ['#7fb8ea', '#9bcaf0', '#b5daf5', '#cfe8f8', '#e4f3fb'], astro: '#fff3b0', halo: [255, 243, 176, 0.5], estrellas: 0, nube: [255, 255, 255, 0.85],
      lejos: '#9db4c8', medio: '#6f8ca3', monte: '#3c5a58', sombra: '#283f40', nieve: '#ffffff', pino0: '#294842', pino1: '#1b322f', luz: '#fff3b0',
    },
    atardecer: {
      c: ['#241b4a', '#3f2766', '#5c2c6b', '#bd5a78', '#f0a35c'], astro: '#ffd9a0', halo: [255, 217, 160, 0.35], estrellas: 0.3, nube: [255, 205, 190, 0.4],
      lejos: '#7a4577', medio: '#4f2d66', monte: '#271a3a', sombra: '#1a1128', nieve: '#ffe3c6', pino0: '#1a1128', pino1: '#0f0a1a', luz: '#ffd9a0',
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
  let horaTemporal = null; // la hora que pide la tele durante su atardecer acelerado (`fijarHora`)
  function hora(ahora = new Date()) {
    if (horaTemporal !== null) return horaTemporal;
    try {
      const forzada = Number.parseFloat(localStorage.getItem('libro.hora'));
      if (forzada >= 0 && forzada < 24) return forzada;
    } catch { /* sin almacenamiento */ }
    const partes = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ahora);
    const n = (t) => Number(partes.find((p) => p.type === t).value);
    return n('hour') + n('minute') / 60;
  }
  /** Fecha AAAA-MM-DD de El Salvador. Con `libro.dia` en localStorage, la que se pida (para probar fiestas y épocas). */
  const dfDia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA });
  function dia(ahora = new Date()) {
    try {
      const f = localStorage.getItem('libro.dia');
      if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
    } catch { /* sin almacenamiento */ }
    return dfDia.format(ahora);
  }
  /** Fiestas que adornan la escena (papel picado): agostinas (1–6 ago), patrias (13–15 sep) y navidad (20–26 dic); si no, ''. */
  function fiesta(f) {
    const md = f.slice(5);
    if (md >= '08-01' && md <= '08-06') return 'agostinas';
    if (md >= '09-13' && md <= '09-15') return 'patrias';
    if (md >= '12-20' && md <= '12-26') return 'navidad';
    return '';
  }
  /** Época del año en El Salvador: lluviosa de mayo a octubre, seca el resto. */
  const epoca = (f) => (Number(f.slice(5, 7)) >= 5 && Number(f.slice(5, 7)) <= 10 ? 'lluviosa' : 'seca');
  /** Cohetes de Nochebuena y de fin de año: del 24 (y del 31) de diciembre a las 23:50 hasta las 0:30 del día siguiente. */
  function cohetes(f, h) {
    const md = f.slice(5);
    return ((md === '12-24' || md === '12-31') && h >= 23 + 50 / 60) || ((md === '12-25' || md === '01-01') && h < 0.5);
  }
  // Campamento 22 · el valle vivo. Lo que sigue al calendario de aquí; la escena lo dibuja siempre y el CSS enseña lo que toca.
  /** Navidad en el valle: del 1 de diciembre al 6 de enero (luces en los ranchos, el nacimiento y el pino con luces). */
  const navidad = (f) => f.slice(5) >= '12-01' || f.slice(5) <= '01-06';
  /** Piscuchas: con los vientos de octubre y noviembre. */
  const piscuchas = (f) => f.slice(5) >= '10-01' && f.slice(5) <= '11-30';
  /** La milpa del valle: se siembra el 1 de mayo, jilotea en julio, se dobla el 15 de agosto, se tapisca en noviembre y queda el rastrojo de diciembre a abril. */
  function milpa(f) {
    const md = f.slice(5);
    if (md >= '05-01' && md < '07-01') return 'siembra';
    if (md >= '07-01' && md < '08-15') return 'jilote';
    if (md >= '08-15' && md < '11-01') return 'doblada';
    if (md >= '11-01' && md < '12-01') return 'tapisca';
    return 'rastrojo';
  }
  /** El fogón de leña: humo de la cocina a la hora del café (5 a 7) y de la cena (18 a 20). */
  const fogon = (h) => (h >= 5 && h < 7) || (h >= 18 && h < 20);
  /** Noche de luna llena: con la luna iluminada al 97 % o más. */
  const lunaLlena = (fase) => (1 - Math.cos(2 * Math.PI * fase)) / 2 >= 0.97;
  // Campamento 22B · el valle vivo, parte 2.
  /**
   * Verde de invierno y dorado de verano (idea 54): 1 = el verde de la lluviosa, 0 = el dorado de la seca; la misma partición que
   * `epoca`, con la mezcla día a día del 1 al 14 de mayo (del dorado al verde) y del 1 al 14 de noviembre (del verde al dorado).
   */
  function verdor(f) {
    const m = Number(f.slice(5, 7)), d = Number(f.slice(8, 10));
    if (m === 5 && d <= 14) return d / 15;
    if (m === 11 && d <= 14) return 1 - d / 15;
    return m >= 5 && m <= 10 ? 1 : 0;
  }
  /** El mar de niebla del amanecer (idea 55): de 0 a 1, solo de 5:00 a 7:30. Se forma de 5:00 a 5:30, llena el valle hasta las 7 y se levanta antes de las 7:30. Sin niebla de la tarde. */
  function marNiebla(h) {
    if (h < 5 || h >= 7.5) return 0;
    if (h < 5.5) return (h - 5) / 0.5;
    return h <= 7 ? 1 : (7.5 - h) / 0.5;
  }
  /** Árboles de aquí en flor (idea 56): el maquilishuat en febrero y el árbol de fuego en abril; si no, ''. */
  const flor = (f) => ({ '02': 'maquilishuat', '04': 'fuego' })[f.slice(5, 7)] ?? '';
  /** Los azacuanes pasan del 10 al 31 de octubre (al sur: se acaban las lluvias) y del 1 al 20 de abril (de vuelta al norte). */
  const azacuanes = (f) => (f.slice(5) >= '10-10' && f.slice(5) <= '10-31') || (f.slice(5) >= '04-01' && f.slice(5) <= '04-20');
  /** Zompopos de mayo: la semana del 15 al 21 de mayo, con las primeras lluvias fuertes. */
  const zompopos = (f) => f.slice(5) >= '05-15' && f.slice(5) <= '05-21';
  // Hora de inicio en minutos civiles. La primera fila de cada fecha rige desde las 00:00.
  const GUIONES = {
    '12-24': [[0, 'duerme'], [270, 'panNavideno'], [420, 'comprasNavidad'], [690, 'olla'], [840, 'tamales'], [1065, 'cenaNavidad'], [1260, 'misaGallo'], [1420, 'abrazoNavidad']],
    '12-25': [[0, 'abrazoNavidad'], [60, 'restos'], [420, 'limpiaAcera'], [540, 'juguetes'], [720, 'recalentado'], [840, 'paseo'], [1065, 'pupusasAcera'], [1200, 'sillas'], [1320, 'duerme']],
    '12-31': [[0, 'duerme'], [300, 'primeraEscoba'], [420, 'limpieza'], [690, 'estreno'], [840, 'preparativos'], [1065, 'cenaFin'], [1320, 'ultimoBrindis'], [1380, 'esperaTorre']],
    '01-01': [[0, 'abrazoNuevo'], [60, 'restos'], [540, 'limpiaAcera'], [720, 'almuerzoCasa'], [840, 'visitas'], [1065, 'visitaAcera'], [1200, 'sillas'], [1320, 'duerme']],
    '01-06': [[0, 'duerme'], [300, 'amanece'], [420, 'mananaLibre'], [690, 'cajas'], [840, 'guardaFocos'], [1065, 'despedida'], [1200, 'sillas'], [1320, 'duerme']],
  };
  function turnoFiesta(f, h) {
    return GUIONES[f.slice(5)]?.findLast(([inicio]) => h * 60 >= inicio)?.[1];
  }
  /**
   * Lo que se mueve en el valle y en el cielo (ideas 57, 60 y 61, con el torogoz y las luciérnagas de antes): **nunca más de un animal o
   * bandada a la vez**, ni los relámpagos junto a ellos. Cada uno tiene su hora y no se pisan:
   *   torogoz       5:00–7:00 (el amanecer, como siempre)
   *   zompopos      7:30–10:00, del 15 al 21 de mayo (cuando se levanta la niebla)
   *   azacuanes     8:00–16:00, del 10 al 31 de octubre y del 1 al 20 de abril (vuelan con el calor del día)
   *   gallinas      7:00–10:00 (campamento 34; los días de zompopos y de azacuanes, quietas)
   *   teleférico   10:00–13:00 (campamento 32; solo se ve en pantallas anchas; los días de azacuanes, quieto)
   *   perro        14:00–16:30 (campamento 34; los días de azacuanes, desde las 16:00)
   *   pericos       16:30–18:00 (el atardecer: van a dormir)
   *   relámpagos    22:00–5:00, de mayo a octubre (tormentas lejanas de madrugada)
   *   luciérnagas   18:00–5:00 (antes desde las 16:30: los pericos se quedan el primer rato del atardecer); en la lluviosa, hasta las 22:00
   * Si no toca nada, ''.
   */
  function mueve(f, h) {
    const t = turnoFiesta(f, h);
    if (t === 'cenaNavidad' || t === 'cenaFin' || t === 'ultimoBrindis') return 'brindis';
    if (t === 'abrazoNavidad' || t === 'abrazoNuevo') return 'volcancito';
    if (t === 'misaGallo' || t === 'esperaTorre' || t === 'restos' || t === 'recalentado') return '';
    if (t === 'limpiaAcera') return 'barre';
    if (t === 'juguetes') return 'pelota';
    if (h >= 5 && h < 7) return 'torogoz';
    if (zompopos(f) && h >= 7.5 && h < 10) return 'zompopos';
    if (azacuanes(f) && h >= 8 && h < 16) return 'azacuanes';
    if (h >= 7 && h < 8) return 'barre'; // (37) la que barre su acera (las gallinas, desde las 8:00)
    if (h >= 8 && h < 10) return 'gallinas';
    if (h >= 10 && h < 13) return 'teleferico';
    if (h >= 14 && h < 15) return 'perro';
    if (h >= 15 && h < 16.5) return 'pelota'; // (37) la pelota de los oseznos (el perro cruza antes)
    if (h >= 16.5 && h < 18) return 'pericos';
    if (epoca(f) === 'lluviosa' && (h >= 22 || h < 5)) return 'relampagos';
    if (h >= 18 || h < 5) return 'luciernagas';
    return '';
  }
  /**
   * (Campamento 35, idea 102) El turno del Pueblo de los Osos: quién está en la calle según la hora y el día (El Salvador). Amanece
   * (5:00–7:00: el que se estira, el panadero, la que barre), mañana (hasta las 11:30; entre semana los oseznos están en la escuela,
   * salvo en vacaciones, del 15 de noviembre al 15 de enero), siesta (hasta las 14:00), tarde (hasta las 17:45: los oseznos en la
   * plaza), pupusas (hasta las 22:00: la pupusera) y duerme (22:00–5:00: nadie). Como `mueve`, lo pinta montana.js y el CSS no.
   */
  function vacaciones(f) { const md = f.slice(5); return md >= '11-15' || md <= '01-15'; }
  function turno(f, h) {
    // (Campamento 36) El calendario del pueblo: el desfile del 15 de septiembre (7:00–12:00), Nochebuena y el 31 (18:00–1:00, pasada
    // la medianoche ya es el 25 o el 1), la misa del domingo (7:30–10:00), el sábado de plaza (7:00–12:00) y, en Navidad, la posada
    // frente al nacimiento al anochecer (1 dic – 6 ene).
    const md = f.slice(5);
    if (md === '09-15' && h >= 7 && h < 12) return 'desfile';
    const especial = turnoFiesta(f, h);
    if (especial) return especial;
    if (h >= 22 || h < 5) return 'duerme';
    if (h < 7) return 'amanece';
    const sem = new Date(`${f}T12:00:00Z`).getUTCDay();
    if (sem === 0 && h >= 7.5 && h < 10) return 'misa';
    if (sem === 6 && h < 12) return 'mercado';
    if (h < 11.5) return sem >= 1 && sem <= 5 && !vacaciones(f) ? 'manana' : 'mananaLibre';
    if (h < 14) return 'siesta';
    if (h < 17.75) return 'tarde';
    return md >= '12-01' || md <= '01-06' ? 'posada' : 'pupusas';
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
      '--pino0': c('pino0'), '--pino1': c('pino1'), '--luz-roca': c('luz'),
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
  function faseLunar(fecha = ahoraVista()) {
    const CICLO = 29.530588853 * 864e5;
    const NUEVA = Date.UTC(2000, 0, 6, 18, 14);
    return (((fecha.getTime() - NUEVA) / CICLO) % 1 + 1) % 1;
  }
  /** El instante que se ve: el de ahora o, si se pidió otro día para probar (`libro.dia`), ese día a la hora del cielo (El Salvador es UTC−6). */
  function ahoraVista() {
    let forzado = '';
    try { forzado = localStorage.getItem('libro.dia') ?? ''; } catch { /* sin almacenamiento */ }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(forzado)) return new Date();
    const [a, m, d] = forzado.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d) + (hora() + 6) * 3600e3);
  }
  /** «Buenos días / tardes / noches» según la hora. */
  function saludo(h) {
    return h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }

  /** `libro.madrugada` = `0` lo apaga en este dispositivo; por defecto es automático. */
  const madrugadaPref = () => { try { return localStorage.getItem('libro.madrugada') !== '0'; } catch { return true; } };
  const madrugadaActiva = (h) => madrugadaPref() && (h >= 22 || h < 5);
  function fijarMadrugada(on) {
    try { if (on) localStorage.removeItem('libro.madrugada'); else localStorage.setItem('libro.madrugada', '0'); } catch { /* vale para esta visita */ }
    aplicar();
  }

  let diaAplicado = null; // (Campamento 30) para avisar del cambio de día
  let turnoAplicado = null; // (Campamento 35) para avisar del cambio de turno del pueblo
  function aplicar() {
    const h = hora();
    for (const [k, v] of Object.entries(colores(h))) raiz.style.setProperty(k, v);
    const ti = tinta(h), t = TINTA[ti];
    raiz.dataset.cielo = franja(h);
    // Fiestas, época del año y cohetes de fin de año: el CSS muestra lo que toque (la escena dibuja todo y se queda oculto).
    const d = dia(), fi = fiesta(d);
    // (Campamento 30) La escena dibuja solo lo de la temporada de hoy: si el día cambió con la página abierta, lo avisa para volver a dibujarla.
    const cambiaDia = diaAplicado !== null && d !== diaAplicado;
    diaAplicado = d;
    if (fi) raiz.dataset.fiesta = fi; else delete raiz.dataset.fiesta;
    raiz.dataset.epoca = epoca(d);
    raiz.toggleAttribute('data-cohetes', cohetes(d, h));
    // El valle vivo (campamento 22): la milpa, la Navidad, las piscuchas, el humo del fogón y la noche de luna llena.
    raiz.dataset.milpa = milpa(d);
    raiz.toggleAttribute('data-navidad', navidad(d));
    raiz.toggleAttribute('data-piscuchas', piscuchas(d));
    raiz.toggleAttribute('data-fogon', fogon(h));
    raiz.toggleAttribute('data-luna-llena', lunaLlena(faseLunar()));
    // El valle vivo, parte 2 (campamento 22B): el verdor del valle (variable de 0 a 1), el mar de niebla del amanecer (su espesor, de 0
    // a 1), los árboles en flor y lo que se mueve (uno a la vez); la escena lo dibuja todo y el CSS enseña lo que toca.
    raiz.style.setProperty('--v-verde', verdor(d).toFixed(3));
    const mar = marNiebla(h);
    raiz.style.setProperty('--v-mar', mar.toFixed(3));
    raiz.toggleAttribute('data-mar-niebla', mar > 0);
    const fl = flor(d), mv = mueve(d, h);
    if (fl) raiz.dataset.flor = fl; else delete raiz.dataset.flor;
    if (mv) raiz.dataset.mueve = mv; else delete raiz.dataset.mueve;
    // (Campamento 35) El turno del pueblo: si cambió con la página abierta, montana.js rehace solo sus vecinos (`libro:turno`).
    const tu = turno(d, h);
    raiz.dataset.turno = tu;
    const md = d.slice(5);
    const posfiesta = md === '12-25' || md === '01-01';
    raiz.toggleAttribute('data-carpa-fiesta', posfiesta ? (h >= 1 && h < 9) || h >= 22 : (md === '12-24' || md === '12-31') && h < 5);
    const reposo = posfiesta && h >= 1 && h < 9;
    const abrazo = tu === 'abrazoNavidad' || tu === 'abrazoNuevo';
    raiz.toggleAttribute('data-descanso-festivo', reposo);
    raiz.toggleAttribute('data-abrazo', abrazo);
    raiz.toggleAttribute('data-mira-torre', md === '12-31' && h >= 23 + 50 / 60);
    raiz.toggleAttribute('data-perro-banca', abrazo || tu === 'esperaTorre');
    if (cambiaDia && typeof window.dispatchEvent === 'function' && typeof Event === 'function') window.dispatchEvent(new Event('libro:dia'));
    if (turnoAplicado !== null && tu !== turnoAplicado && typeof window.dispatchEvent === 'function' && typeof Event === 'function') window.dispatchEvent(new Event('libro:turno'));
    turnoAplicado = tu;
    // Modo madrugada (idea 20): de 22:00 a 5:00 la página se atenúa y se calienta un poco (un velo en el CSS), para abrirla en la cama.
    raiz.toggleAttribute('data-madrugada', madrugadaActiva(h));
    // (Campamento 28) Los osos de la interfaz se duermen de 22:00 a 5:00 aunque el velo esté apagado, y las tardes (13:00 a 18:00) de la
    // época lluviosa sacan su paraguas.
    raiz.toggleAttribute('data-sueno', h >= 22 || h < 5);
    raiz.toggleAttribute('data-tarde', h >= 13 && h < 18);
    raiz.dataset.tinta = ti;
    raiz.style.setProperty('--cielo-txt', t.txt);
    raiz.style.setProperty('--cielo-txt2', t.txt2);
    raiz.style.setProperty('--cielo-sube', t.sube);
    raiz.style.setProperty('--cielo-baja', t.baja);
    raiz.style.setProperty('--cielo-marca', t.marca);
    raiz.style.setProperty('--cielo-sombra', t.sombra); // un halo suave del color contrario: ayuda en los minutos de crepúsculo
  }
  /** Un cielo a la hora que se pida (0 a 24) hasta que se llame con `null`: lo usa el atardecer acelerado de la tele (campamento 15B). */
  function fijarHora(h) {
    horaTemporal = h === null ? null : Math.min(23.99, Math.max(0, Number(h)));
    aplicar();
  }
  aplicar();
  // Todas las entradas del guion caen en múltiplos de cinco minutos, incluida medianoche.
  function programarReloj() {
    window.setTimeout?.(() => {
      if (document.visibilityState === 'visible' && horaTemporal === null) aplicar();
      programarReloj();
    }, 300_000 - Date.now() % 300_000);
  }
  programarReloj();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') aplicar(); });
  window.libroCielo = { dia, fiesta, epoca, cohetes, navidad, piscuchas, milpa, fogon, lunaLlena, verdor, marNiebla, flor, azacuanes, zompopos, mueve, turno, vacaciones, madrugadaPref, fijarMadrugada, hora, franja, colores, tinta, faseLunar, saludo, paletas: P, tintas: TINTA, aplicar, fijarHora };
})();
