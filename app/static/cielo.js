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
  /**
   * (Campamento 39, idea 125) Los cohetes se dibujan solo en su hora: se ponen a las 23:40 del 24 y del 31 y se quitan a las 0:40 del 25 y
   * del 1 (diez minutos antes y después de que se vean, en un momento quieto). El resto de esos cuatro días, su grupo va vacío.
   */
  function cohetesPuestos(f, h) {
    const md = f.slice(5);
    return ((md === '12-24' || md === '12-31') && h >= 23 + 40 / 60) || ((md === '12-25' || md === '01-01') && h < 40 / 60);
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
  /**
   * La neblina (idea 55; campamento 53B: otro ritmo), de 0 a 1. De mañana: se forma despacio de 5:00 a 6:30, llena el valle hasta las
   * 7:00 y se levanta poco a poco hasta las 9:00. Al caer la tarde vuelve fina (hasta `NIEBLA_TARDE`), si se da el día `f`: en la
   * lluviosa, de 16:30 a 18:30; en la seca, de 17:30 a 19:00 (se va antes de la noche: a las 19:00 se encienden las luces del valle,
   * que se pintan debajo de ella). Sin día, solo la de la mañana.
   */
  const NIEBLA_TARDE = 0.4;
  function marNiebla(h, f) {
    // Espesa pronto y aguanta: lo que falta para estar llena, al cuadrado (a medias es un velo turbio; así dura poco).
    if (h >= 5 && h < 9) return 1 - (h < 6.5 ? (6.5 - h) / 1.5 : h <= 7 ? 0 : (h - 7) / 2) ** 2;
    if (!f) return 0;
    const [a, b] = verdor(f) >= 0.5 ? [16.5, 18.5] : [17.5, 19];
    return h > a && h < b ? NIEBLA_TARDE * Math.min(1, (h - a) / 0.75, (b - h) / 0.75) : 0;
  }
  /** Árboles de aquí en flor (idea 56): el maquilishuat en febrero y el árbol de fuego en abril; si no, ''. */
  const flor = (f) => ({ '02': 'maquilishuat', '04': 'fuego' })[f.slice(5, 7)] ?? '';
  /** Los azacuanes pasan del 10 al 31 de octubre (al sur: se acaban las lluvias) y del 1 al 20 de abril (de vuelta al norte). */
  const azacuanes = (f) => (f.slice(5) >= '10-10' && f.slice(5) <= '10-31') || (f.slice(5) >= '04-01' && f.slice(5) <= '04-20');
  /** Zompopos de mayo: la semana del 15 al 21 de mayo, con las primeras lluvias fuertes. */
  const zompopos = (f) => f.slice(5) >= '05-15' && f.slice(5) <= '05-21';
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
    // (Campamento 51, idea 226) El movimiento tiene un solo dueño: si el foco del momento trae a alguien que se mueve (la fiesta de
    // Navidad: campamento 41; los zompopos y los azacuanes), es ese; si no, el de la rutina de siempre, que cede su franja.
    // El primero de la tabla (`FOCOS`, por orden de rareza) que está y trae a alguien que se mueve; un foco quieto (la misa) no la quita.
    for (const fo of FOCOS) {
      const m = fo.mueve && fo.cuando(f, h) ? fo.mueve(f, h) : null;
      if (m !== null) return m;
    }
    return mueveRutina(f, h);
  }
  /** (Campamento 51) Lo que se mueve un día cualquiera, franja por franja (la rutina): el reparto de siempre, sin los focos. */
  function mueveRutina(f, h) {
    // (Campamento 49) Cada franja nueva nombra a un actor solo si está en la calle ese rato (`hayActor`): el lunes no hay panadero, el
    // sábado la tortillera hace tamales, en Navidad no hay hamaca y los días de fiesta mandan sus turnos.
    if (h >= 6 && h < 7 && hayActor(f, h, 'cruza')) return 'cruza'; // (116) el panadero cruza en su bicicleta (el torogoz, de 5 a 6)
    if (h >= 5 && h < 7) return 'torogoz';
    if (h >= 7 && h < 8) return 'barre'; // (37) la que barre su acera (las gallinas, desde las 8:00)
    if (h >= 8 && h < 10) return 'gallinas';
    // (25) A las 12:00 la campana de la torre se mece cinco minutos (el grano del director: `aplicar` mira cada cinco); la tortillera espera.
    if (h >= 12 && h < 12 + 5 / 60) return 'campana';
    if (h >= 11.5 && h < 12.5 && hayActor(f, h, 'palmea')) return 'palmea'; // (200) la tortillera palmea
    if (h >= 13 && h < 14 && hayActor(f, h, 'hamaca')) return 'hamaca'; // (199) la hamaca de la siesta se mece
    if (h >= 10 && h < 13) return 'teleferico';
    if (h >= 14 && h < 15) return 'perro';
    if (h >= 15 && h < 16.5) return 'pelota'; // (37) la pelota de los oseznos (el perro cruza antes)
    if (h >= 16.5 && h < 18) return 'pericos';
    if (epoca(f) === 'lluviosa' && (h >= 22 || h < 5)) return 'relampagos';
    if (h >= 18 || h < 5) return 'luciernagas';
    return '';
  }
  /**
   * (Campamento 49) ¿Está en la calle el actor de esa franja? Lo mismo que pide arte-vecinos.js (`reparto`) para marcarlo: el panadero en
   * el amanecer (salvo el lunes), la tortillera con su comal a mediodía (el sábado, tamales: no palmea) y la hamaca de la siesta (en
   * Navidad duerme en la banca). Una prueba recorre el año y comprueba que el reparto lo trae.
   */
  function hayActor(f, h, a) {
    const t = turno(f, h);
    if (a === 'cruza') return t === 'amanece' && semana(f) !== 1;
    if (a === 'palmea') return (t === 'tortillas' || t === 'salida') && semana(f) !== 6;
    if (a === 'hamaca') return t === 'siesta' && !navidad(f);
    return false;
  }
  /** (Campamento 49, idea 275) Los actores del pueblo: con uno de ellos de principal, en pantallas anchas cabe un segundo en otra zona. */
  const DEL_PUEBLO = new Set(['cruza', 'barre', 'gallinas', 'campana', 'palmea', 'hamaca', 'perro', 'pelota', 'mece']); // (42) la piñata del Día del Niño
  /**
   * (Campamento 49, idea 275, aprobada por el dueño el 25 nov 2026) El segundo principal, solo desde 1100 px (lo enseña el CSS bajo su
   * media query; en el teléfono no hay cabina): mientras el principal es del pueblo, de día (7:00–16:30), la cabina del teleférico cruza
   * el valle, lejos de la plaza. '' si no toca. Nunca dos en el pueblo, nunca dos en el cielo.
   */
  function mueve2(f, h) {
    return h >= 7 && h < 16.5 && DEL_PUEBLO.has(mueve(f, h)) ? 'teleferico' : '';
  }
  /**
   * (Campamento 41, idea 210) La franja de lo que se mueve en las fiestas de Navidad: la noche del 24 y del 31 es de la fiesta (las
   * luciérnagas descansan): de 17:45 brinda uno en la cena (hasta las 21:00 del 24, que se va a misa, y las 23:00 del 31, que se espera
   * quieto), y de 23:40 a 1:00 (el 31, desde las 0:00) chispea un volcancito en la plaza; los cohetes son ambiente, como siempre. El 25,
   * de 9:00 a 12:00, la pelota nueva de los oseznos. `null`: lo de un día cualquiera.
   */
  function mueveFiesta(f, h) {
    const md = f.slice(5);
    if ((md === '12-24' || md === '12-31') && h >= 17.75) {
      if (h < (md === '12-24' ? 21 : 23)) return 'brinda';
      return md === '12-24' && h >= 23 + 40 / 60 ? 'chispea' : 'fiesta';
    }
    if ((md === '12-25' || md === '01-01') && h < 1) return 'chispea';
    if (md === '12-25' && h >= 9 && h < 12) return 'pelota';
    return null;
  }
  /**
   * (Campamento 41, ideas 210–215) La Navidad entera: cada fecha, su guion por turnos, de la madrugada a la medianoche (el de un día
   * cualquiera no corre ese día). Nochebuena (24): el pan de madrugada, las compras y los adornos, los tamales, la cena con su brindis,
   * la misa de gallo y, de 23:40 a 1:00, los abrazos y los regalos. Navidad (25): nadie hasta las 7:00, la pólvora y la que barre, los
   * estrenos, el recalentado, el paseo y la fresca. El 31: la limpieza, el estreno, la cena, la espera (de 23:00, todos de espaldas
   * mirando la torre) y el abrazo de las doce (162). El 1: nadie hasta las 9:00, la que barre, las visitas y la fresca. El 6, de 14:00 a
   * 17:45, se guarda la Navidad. '' si no es uno de esos ratos.
   */
  function turnoFiesta(md, h) {
    if (md === '12-24') return h >= 23 + 40 / 60 ? 'nb-doce' : h >= 21 ? 'nb-misa' : h >= 17.75 ? 'nb-cena' : h >= 11.5 ? 'nb-tamales' : h >= 7 ? 'nb-compras' : h >= 4.5 ? 'nb-madruga' : 'duerme';
    if (md === '12-25') return h < 1 ? 'nb-doce' : h < 7 ? 'duerme' : h < 9 ? 'n25-polvora' : h < 12 ? 'n25-estrena' : h < 14 ? 'n25-recalentado' : h < 17.75 ? 'n25-paseo' : h < 22 ? 'n25-fresca' : 'duerme';
    if (md === '12-31') return h < 5 ? 'duerme' : h < 11.5 ? 'f31-limpia' : h < 17.75 ? 'f31-estreno' : h < 23 ? 'f31-cena' : 'f31-espera';
    if (md === '01-01') return h < 1 ? 'f31-doce' : h < 9 ? 'e1-polvora' : h < 12 ? 'e1-barre' : h < 17.75 ? 'e1-visitas' : h < 22 ? 'e1-fresca' : 'duerme';
    if (md === '01-06' && h >= 14 && h < 17.75) return 'e6-guarda';
    return '';
  }
  /** (Campamento 41) El día de fiesta de la Navidad entera ('' si no lo es): `html[data-festivo]`, para lo que dura el día entero (los regalos del 25). */
  const festivo = (f) => ({ '12-24': 'nochebuena', '12-25': 'navidad', '12-31': 'fin', '01-01': 'anio', '01-06': 'reyes' })[f.slice(5)] ?? '';
  // ---------------------------------------------------------------------------------------------------- (Campamento 42) las fiestas del año
  /**
   * (Campamento 42) Las costumbres del resto del año, una línea cada una: con `false`, ese día vuelve a ser un día cualquiera (su turno, su
   * foco, su frase y lo que se mueve). Las religiosas y la de Difuntos las puede apagar la familia aquí sin tocar nada más.
   */
  const COSTUMBRES = {
    ramos: true, // 149 · Domingo de Ramos: a misa con su palma (religiosa)
    santos: true, // 150 · Jueves y Viernes Santo: el pueblo en silencio, sin juegos, sin escoba ni campana (religiosa)
    gloria: true, // 151 · Sábado de Gloria y Domingo de Pascua: los oseznos al lago con su llanta
    madre: true, // 153 · 10 de mayo: las mañanitas y los oseznos con su flor
    padre: true, // 219 · 17 de junio: papás en hombros y la pelota
    agostinas: true, // 156 · 5 y 6 de agosto: el pueblo estrena (sin rueda)
    misaAgosto: true, // 156 · la misa de la mañana del 6 de agosto (religiosa; con `false`, el 6 por la mañana se adorna como el 5)
    patrias: true, // 157 y 220 · el 14 y el 15 de septiembre: la antorcha, los farolitos, las banderitas (el desfile del 36 sigue igual)
    nino: true, // 158 · 1 de octubre, Día del Niño: la piñata
    difuntos: true, // 159 · 1 y 2 de noviembre: flores y, al anochecer del 2, las velitas (día de duelo para muchas familias)
    inditos: true, // 160 · 12 de diciembre: los oseznos de inditos a la iglesia (religiosa)
    // (Campamento 43) Las temporadas del pueblo (lo que cambia con la época, no con una fecha): con `false`, ese rato es el de siempre.
    mangos: true, // 152 · marzo y abril, las mañanas sin escuela y el sábado de plaza: un osezno baja mangos con su vara bajo el árbol de la plaza
    milpa: true, // 154 · las dos primeras semanas de la siembra, la dobla y la tapisca, de 6:00 a 10:00: el milpero y otro trabajan la milpa
    atolada: true, // 155 · los sábados de julio y agosto, de 16:00 a 17:45: la olla del atol en la calle y los oseznos con su elote
    posadas: true, // 161 · del 16 al 23 de diciembre, de 18:30 a 20:00: la posada, cada noche frente a otra casa (religiosa)
    mejenga: true, // 163 · los domingos de 15:00 a 16:30 (fuera de la Navidad): las porterías de palo y los oseznos jugando en la plaza
    cuentos: true, // 164 · las noches de luna llena, de 20:00 a 20:30: la abuela en la plaza y los oseznos sentados en rueda
    // (Campamento 45) Los animales de aquí, quietos (con `false`, ese animal no sale y ese rato es el de siempre).
    gallo: true, // 172 · de 5:00 a 6:00, el gallo en la plaza
    garrobo: true, // 54 · en la época seca, de 11:00 a 14:00, un garrobo al sol en la plaza
    zanates: true, // 172 · de 17:30 a 18:30, tres zanates en fila en el suelo de la plaza
    tecolote: true, // 173 · una noche de cada cuatro (nunca con luna llena ni en Navidad), el tecolote en la rama del árbol de la plaza (en algunos lugares es de mal agüero)
    vacas: true, // 174 · de 11:30 a 14:00, las vacas del potrero echadas
    garza: true, // 175 · la garza pesca en una orilla del lago por la mañana y en la otra por la tarde
    // (Campamento 46) La luna y las estrellas (con `false`, el cielo de siempre).
    conejo: true, // 179 · las noches de luna llena, los mares de la luna dibujan el conejo
    estrellas: true, // 180 · unas veinte de las 46 estrellas como en el cielo de aquí: Orión y las Cabritas (noviembre–marzo), el Alacrán (mayo–agosto)
    geminidas: true, // 181 · las noches del 13 y del 14 de diciembre los osos de la cumbre miran las estrellas fugaces en vez de dormir
    lucero: true, // 182 · Venus, el lucero de la tarde o de la mañana, cuando toca de verdad
    eclipse: true, // 183 · la luna cobriza en los eclipses totales que se ven desde aquí (tabla de la NASA)
  };
  /**
   * (Campamento 42) El domingo de Pascua de un año (AAAA-MM-DD), con el cálculo gregoriano de siempre (Meeus/Jones/Butcher). Es la misma
   * función que lib.js (`pascua`; cielo.js no puede importarla): `test_lib` comprueba que dan lo mismo en cuatro siglos.
   */
  function pascua(anio) {
    const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4, g = Math.floor((8 * b + 13) / 25);
    const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 19 * l) / 433);
    const mes = Math.floor((hh + l - 7 * m + 90) / 25), diaM = (hh + l - 7 * m + 33 * mes + 19) % 32;
    return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(diaM).padStart(2, '0')}`;
  }
  const masDias = (f, n) => new Date(Date.parse(`${f}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  /**
   * (Campamento 42) La fiesta del resto del año de una fecha ('' si no hay o si su costumbre está apagada): Semana Santa (Ramos, Jueves y
   * Viernes Santo, Sábado de Gloria, Pascua: la fecha sale de `pascua`), el 10 de mayo, el 17 de junio, el 5 y el 6 de agosto, el 14 y el
   * 15 de septiembre, el 1 de octubre, el 1 y el 2 de noviembre y el 12 de diciembre. La Navidad (41) va aparte (`festivo`).
   */
  function fiestaDelAnio(f) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f ?? '')) return '';
    const md = f.slice(5), p = pascua(Number(f.slice(0, 4))), C = COSTUMBRES;
    if (f === masDias(p, -7)) return C.ramos ? 'ramos' : '';
    if (f === masDias(p, -3) || f === masDias(p, -2)) return C.santos ? (f === masDias(p, -3) ? 'jueves' : 'viernes') : '';
    if (f === masDias(p, -1) || f === p) return C.gloria ? (f === p ? 'pascua' : 'gloria') : '';
    const fijas = { '05-10': ['madre', C.madre], '06-17': ['padre', C.padre], '08-05': ['agosto5', C.agostinas], '08-06': ['agosto6', C.agostinas], '09-14': ['antorcha', C.patrias], '09-15': ['patria', C.patrias], '10-01': ['nino', C.nino], '11-01': ['difuntos1', C.difuntos], '11-02': ['difuntos2', C.difuntos], '12-12': ['inditos', C.inditos] };
    const x = fijas[md];
    return x?.[1] ? x[0] : '';
  }
  /**
   * (Campamento 42, ideas 149–160 y 219–220) El guion de cada fiesta del resto del año: sus turnos pasan delante de los de un día
   * cualquiera (también un domingo o un sábado, como en la Navidad); donde el diseño dice «lo de siempre», '' (corre el turno normal).
   * Va aparte de `turnoFiesta` a propósito: las luces del pueblo y la puerta de la iglesia siguen su horario de siempre (solo las noches
   * de la Navidad se quedan encendidas) y el foco de la Navidad no se entera de estas fechas.
   */
  function turnoDelAnio(f, h) {
    const fa = fiestaDelAnio(f);
    if (!fa || h >= 22 || h < 5) return '';
    if (fa === 'ramos') return h >= 7 && h < 10 ? 'sr-ramos' : h >= 10 && h < 11.5 ? 'sr-vuelta' : '';
    if (fa === 'jueves' || fa === 'viernes') return h >= 7 && h < 20 ? 'ss-silencio' : '';
    if (fa === 'gloria' || fa === 'pascua') return fa === 'pascua' && h < 10 ? '' : h >= 7 && h < 11.5 ? 'sg-lago' : h >= 11.5 && h < 16 ? 'sg-solo' : h >= 16 && h < 17.75 ? 'sg-vuelven' : '';
    if (fa === 'madre') return h >= 5.5 && h < 7 ? 'm10-mananitas' : h >= 7 && h < 11.5 ? 'm10-flores' : h >= 11.5 && h < 14 ? 'm10-mesa' : h >= 14 && h < 17.75 ? 'm10-visita' : '';
    if (fa === 'padre') return h >= 14 && h < 17.75 ? 'p17-hombros' : '';
    if (fa === 'agosto5' || fa === 'agosto6') {
      if (fa === 'agosto6' && COSTUMBRES.misaAgosto && h >= 7.5 && h < 10) return 'ag-misa';
      return h >= 7 && h < 11.5 ? 'ag-adorna' : h >= 11.5 && h < 14 ? 'ag-almuerzo' : h >= 14 && h < 17.75 ? 'ag-elotes' : h >= 17.75 ? 'ag-plaza' : '';
    }
    if (fa === 'antorcha') return h >= 7 && h < 11.5 ? 'p14-hacen' : h >= 16 && h < 17.75 ? 'p14-antorcha' : h >= 17.75 && h < 20 ? 'p14-farolitos' : '';
    if (fa === 'patria') return h < 7 ? 'p15-banderitas' : h >= 12 && h < 15 ? 'p15-plaza' : h >= 15 && h < 17.75 ? 'p15-guarda' : '';
    if (fa === 'nino') return h >= 7 && h < 11.5 ? 'n1-cuelga' : h >= 11.5 && h < 15 ? 'n1-plaza' : h >= 15 && h < 17 ? 'n1-pinata' : h >= 17 && h < 20 ? 'n1-dulces' : '';
    if (fa === 'difuntos1' || fa === 'difuntos2') return h >= 6 && h < 11.5 ? 'd-flores' : h >= 11.5 && h < 15 ? 'd-vacio' : h >= 15 && h < 17.75 ? 'd-vuelven' : fa === 'difuntos2' && h >= 17.75 ? 'd-velitas' : '';
    if (fa === 'inditos') return h >= 6 && h < 11.5 ? 'i12-iglesia' : h >= 11.5 && h < 15 ? 'i12-plaza' : h >= 15 && h < 17.75 ? 'i12-vuelta' : '';
    return '';
  }
  /**
   * (Campamento 42) Lo que se mueve en las fiestas del año: casi siempre lo de un día cualquiera (null). Jueves y Viernes Santo no se
   * barre, no se juega a la pelota y la campana de las doce calla (`fiesta`: nadie del pueblo se mueve; los azacuanes, si es su día,
   * vuelan igual); el anochecer del 2 de noviembre, con las velitas, todo quieto (las luciérnagas descansan); y el 1 de octubre, de
   * 15:00 a 17:00, la piñata se mece (`mece`, en su capa, en lugar de la pelota).
   */
  function mueveAnio(f, h) {
    const fa = fiestaDelAnio(f);
    if ((fa === 'jueves' || fa === 'viernes') && ((h >= 7 && h < 8) || (h >= 12 && h < 12 + 5 / 60) || (h >= 15 && h < 16.5))) return azacuanes(f) && h >= 8 && h < 16 ? null : 'fiesta';
    if (fa === 'difuntos2' && h >= 17.75 && h < 22) return 'fiesta';
    if (fa === 'nino' && h >= 15 && h < 17) return 'mece';
    return null;
  }
  /** (Campamento 42) Lo que cuenta la línea de hoy de cada fiesta del año (una frase, sin «tú» y sin mandar nada). */
  const FRASE_ANIO = {
    ramos: 'Es Domingo de Ramos: por la mañana los vecinos van a misa con su palma.',
    jueves: 'Es Jueves Santo: el pueblo está en silencio.',
    viernes: 'Es Viernes Santo: el pueblo está en silencio.',
    gloria: 'Es Sábado de Gloria: los oseznos se van al lago con su llanta.',
    pascua: 'Es Domingo de Pascua: después de misa, los oseznos van al lago con su llanta.',
    madre: 'Es 10 de mayo: en el pueblo hay mañanitas y oseznos con su flor.',
    padre: 'Es Día del Padre: por la tarde hay oseznos en hombros en el pueblo.',
    agosto5: 'Son las fiestas de agosto: el pueblo se adorna y por la tarde hay elotes locos.',
    agosto6: 'Es 6 de agosto, día del Divino Salvador del Mundo: fiesta en el pueblo.',
    antorcha: 'Es 14 de septiembre: llega la antorcha y al anochecer salen los farolitos.',
    nino: 'Es Día del Niño: por la tarde hay piñata en la plaza.',
    difuntos1: 'Es 1 de noviembre: los vecinos llevan flores y coronas de papel.',
    difuntos2: 'Es Día de los Difuntos: flores por la mañana y velitas al anochecer.',
    inditos: 'Es 12 de diciembre: los oseznos van a la iglesia vestidos de inditos.',
  };
  // ---------------------------------------------------------------------------------------------------- (Campamento 43) las temporadas
  /** (43, idea 152) La temporada de mangos: marzo y abril. */
  const mangos = (f) => COSTUMBRES.mangos && ['03', '04'].includes(f.slice(5, 7));
  /** (43, idea 155) La atolada: los sábados de julio y agosto (cuando hay elote). */
  const atolada = (f) => COSTUMBRES.atolada && ['07', '08'].includes(f.slice(5, 7)) && semana(f) === 6;
  /** (43, idea 161) Las posadas: del 16 al 23 de diciembre; la noche de la posada (0 a 7), o −1. */
  const posadaDe = (f) => (COSTUMBRES.posadas && f.slice(5) >= '12-16' && f.slice(5) <= '12-23' ? Number(f.slice(8, 10)) - 16 : -1);
  /**
   * (43, idea 154) La faena de la milpa de una fecha: las dos primeras semanas de cada etapa (`milpa`) hay alguien trabajándola: la
   * siembra (1–14 de mayo, con el chuzo), la dobla (15–28 de agosto) y la tapisca (1–14 de noviembre, con su matate). '' si no.
   */
  function faenaDelDia(f) {
    if (!COSTUMBRES.milpa) return '';
    const md = f.slice(5);
    if (md >= '05-01' && md <= '05-14') return 'siembra';
    if (md >= '08-15' && md <= '08-28') return 'dobla';
    if (md >= '11-01' && md <= '11-14') return 'tapisca';
    return '';
  }
  /** (43) Las mañanas de un día cualquiera (los días de fiesta, su guion manda: en la milpa no hay nadie). */
  const MANANAS = ['amanece', 'manana', 'mananaLibre', 'misa', 'mercado'];
  /** (43, 154) La gente de la milpa ahora: la faena del día de 6:00 a 10:00, si el turno es una mañana de siempre; si no, ''. */
  const milpaConGente = (f, h) => (h >= 6 && h < 10 && MANANAS.includes(turno(f, h)) ? faenaDelDia(f) : '');
  /**
   * (Campamento 43) Lo que la temporada pone en el reparto de ese momento, aparte del turno (lo pasa montana.js a arte-vecinos.js:
   * `reparto`): `milpa`, la faena de la milpa ('' si nadie), y `mangos`, si el sábado de plaza de marzo y abril se bajan mangos.
   */
  const temporadaDelPueblo = (f, h) => ({ milpa: milpaConGente(f, h), mangos: mangos(f) && turno(f, h) === 'mercado' });
  /** (43) La temporada del momento, para el foco ('' si no hay): los mangos, la atolada o la milpa. */
  function temporadaAhora(f, h) {
    const t = turno(f, h);
    if (t === 'tp-mangos' || (t === 'mercado' && mangos(f))) return 'mangos';
    if (t === 'tp-atolada') return 'atolada';
    return milpaConGente(f, h) ? 'milpa' : '';
  }
  /** (43) Lo que cuenta la línea de hoy el primer día de cada temporada (una frase, sin «tú» y sin mandar nada). */
  function fraseTemporada(f) {
    const md = f.slice(5);
    if (md === '03-01' && mangos(f)) return 'Es temporada de mangos: los días sin escuela, un osezno los baja con su vara en la plaza.';
    if (md === '05-01' && faenaDelDia(f)) return 'Empieza la siembra: estas mañanas siembran la milpa del valle.';
    if (md === '08-15' && faenaDelDia(f)) return 'Es tiempo de doblar la milpa: estas mañanas hay gente en ella.';
    if (md === '11-03' && faenaDelDia(f)) return 'Es la tapisca: estas mañanas cosechan la milpa del valle.';
    if (atolada(f) && md <= '07-07') return 'Es sábado de atolada: por la tarde hay atol de elote en el pueblo.';
    return null;
  }
  // ---------------------------------------------------------------------------------------------------- (Campamento 45) los animales de aquí
  /** (45) Un sorteo de 0 a n−1 por fecha (revuelto, como `bitSemana`): igual en todos los aparatos, sin guardar nada. */
  const sorteo = (f, n) => { let x = (Math.round(Date.parse(`${f}T00:00:00Z`) / 864e5) * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x % n; };
  /**
   * (Campamento 45, ideas 172, 54 y 173; la 172 de la v5: «el reloj de los animales») El animal de la hora en la plaza, uno a la vez y
   * quieto (va en los trazos de los vecinos: arte-vecinos.js, `reparto`): el gallo de 5:00 a 6:00, un garrobo al sol de 11:00 a 14:00 en
   * la época seca, tres zanates en fila de 17:30 a 18:30 y, cuando el pueblo duerme, una noche de cada cuatro, el tecolote en la rama baja
   * del árbol de la plaza (nunca con luna llena ni en Navidad: el árbol es entonces el pino). La noche es la de la fecha de la tarde
   * (pasada la medianoche, la del día antes). Se mira la hora al dibujar el turno y, desde el 46 (encargo del dueño), su cambio también avisa (`libro:turno`, en
   * `aplicar`): con la página abierta, cada animal llega y se va a su hora (con el reloj de cinco minutos de `aplicar`). '' si no toca.
   */
  function animalDelPueblo(f, h) {
    const C = COSTUMBRES;
    if (h >= 5 && h < 6) return C.gallo ? 'gallo' : '';
    if (h >= 11 && h < 14) return C.garrobo && epoca(f) === 'seca' ? 'garrobo' : '';
    if (h >= 17.5 && h < 18.5) return C.zanates ? 'zanates' : '';
    if (h >= 22 || h < 4.5) {
      const noche = h < 4.5 ? diaAntes(f) : f;
      return C.tecolote && turno(f, h) === 'duerme' && !navidad(f) && !navidad(noche) && !lunaDeLaNoche(noche) && sorteo(noche, 4) === 0 ? 'tecolote' : '';
    }
    return '';
  }
  // ---------------------------------------------------------------------------------------------------- (Campamento 46) luna y estrellas
  /** La noche de una fecha y hora: la de la tarde (antes del mediodía, la del día antes). */
  const nocheDe = (f, h) => (h < 12 ? diaAntes(f) : f);
  /** (179) El conejo en la luna: las noches de luna llena (la misma regla del director: la luna de las 21:00 de esa noche). */
  const conejo = (f, h) => COSTUMBRES.conejo && lunaDeLaNoche(nocheDe(f, h));
  /**
   * (180) La figura del cielo de aquí que se ve esa temporada al anochecer: Orión con las Siete Cabritas (las Pléyades) y Aldebarán, de
   * noviembre a marzo; el Alacrán (Escorpio), de mayo a agosto; los demás meses, las estrellas de siempre (''). El dibujo, en arte.js.
   */
  const figuraDelCielo = (f) => { if (!COSTUMBRES.estrellas) return ''; const m = Number(f.slice(5, 7)); return m >= 11 || m <= 3 ? 'orion' : m >= 5 && m <= 8 ? 'alacran' : ''; };
  /** (181) Las noches de las Gemínidas (del 13 y del 14 de diciembre, de 19:00 a 5:00): los de la cumbre miran el cielo. */
  const geminidas = (f, h) => COSTUMBRES.geminidas && (h >= 19 || h < 5) && ['12-13', '12-14'].includes(nocheDe(f, h).slice(5));
  /**
   * (182) Venus, el lucero: de la mañana desde una conjunción inferior hasta la superior siguiente y de la tarde de la superior a la
   * inferior, menos los días en que el sol lo tapa (8 alrededor de la inferior, 40 alrededor de la superior). Las conjunciones publicadas
   * (inferior: 23 mar 2025, 24 oct 2026, 1 jun 2028, 6 ene 2030; superior: 6 ene 2026, 11 ago 2027, 23 mar 2029); fuera de la tabla, el
   * ciclo de 583.92 días desde la más cercana. 'manana', 'tarde' o ''.
   */
  const CONJUNCIONES = [['2025-03-23', 'i'], ['2026-01-06', 's'], ['2026-10-24', 'i'], ['2027-08-11', 's'], ['2028-06-01', 'i'], ['2029-03-23', 's'], ['2030-01-06', 'i']];
  function lucero(f) {
    if (!COSTUMBRES.lucero) return '';
    const t = Date.parse(`${f}T12:00:00Z`) / 864e5, CICLO = 583.92, ref = Date.parse(`${CONJUNCIONES[0][0]}T12:00:00Z`) / 864e5;
    const fase = (((t - ref) % CICLO) + CICLO) % CICLO; // días desde la conjunción inferior (con el ciclo medio)
    // Con la tabla, el día exacto: la última conjunción antes de la fecha y la siguiente.
    const ts = CONJUNCIONES.map(([d, k]) => [Date.parse(`${d}T12:00:00Z`) / 864e5, k]);
    let antes = null, despues = null;
    for (const c of ts) { if (c[0] <= t) antes = c; else if (!despues) despues = c; }
    if (!antes || !despues) {
      if (fase < 8 || fase > CICLO - 8 || Math.abs(fase - CICLO / 2) < 40) return '';
      return fase < CICLO / 2 ? 'manana' : 'tarde';
    }
    const margen = (c) => (c[1] === 'i' ? 8 : 40);
    if (t - antes[0] < margen(antes) || despues[0] - t < margen(despues)) return '';
    return antes[1] === 'i' ? 'manana' : 'tarde';
  }
  /** (182) El lucero a esta hora: el de la tarde de 17:30 a 20:30 y el de la mañana de 4:00 a 6:30 (`html[data-lucero]`). */
  const luceroAhora = (f, h) => { const l = lucero(f); return (l === 'tarde' && h >= 17.5 && h < 20.5) || (l === 'manana' && h >= 4 && h < 6.5) ? l : ''; };
  /**
   * (183) Los eclipses totales de luna que se ven desde aquí, con la hora de la totalidad en El Salvador (UTC−6). De la tabla de la NASA
   * («Lunar Eclipses: 2021–2030» y «2031–2040», eclipse.gsfc.nasa.gov): el máximo en TD menos 6 horas y la mitad de la totalidad a cada
   * lado; solo los que tienen la totalidad de noche aquí (los de 2029-12-20, 2036-02-11 y 2040-05-26 caen de día o con la luna puesta).
   * [fecha local, desde, hasta]. `html[data-eclipse]`: la luna se pone cobriza esos minutos.
   */
  const ECLIPSES = [['2029-06-25', 20.54, 22.24], ['2033-10-08', 4.28, 5.6], ['2036-08-06', 20.08, 21.67]];
  const eclipse = (f, h) => COSTUMBRES.eclipse && ECLIPSES.some(([d, a, b]) => d === f && h >= a && h < b);
  /**
   * (Campamento 45, ideas 174 y 175) Lo del valle que cambia con la hora sin que nada se mueva: poses quietas que enseña el CSS
   * (`html[data-valle]`, separadas por espacios), como las de la cumbre (0 capas, 0 animaciones; ya están dibujadas):
   *   vacas  11:30–14:00 (174): las vacas del potrero, echadas (la pose de la noche)
   *   garza  12:00–19:00 (175): la garza pesca en la otra orilla del lago (de noche no hay garza)
   */
  const VALLE = [
    { id: 'vacas', cuando: (_f, h) => COSTUMBRES.vacas && h >= 11.5 && h < 14, pesa: { capas: 0, anim: 0 } },
    { id: 'garza', cuando: (_f, h) => COSTUMBRES.garza && h >= 12 && h < 19, pesa: { capas: 0, anim: 0 } },
  ];
  const poseValle = (f, h) => VALLE.filter((v) => v.cuando(f, h)).map((v) => v.id).join(' ');
  /**
   * (Campamento 35, idea 102) El turno del Pueblo de los Osos: quién está en la calle según la hora y el día (El Salvador). Amanece
   * (5:00–7:00: el que se estira, el panadero, la que barre), mañana (hasta las 11:30; entre semana los oseznos están en la escuela,
   * salvo en vacaciones, del 15 de noviembre al 15 de enero), siesta (hasta las 14:00), tarde (hasta las 17:45: los oseznos en la
   * plaza), pupusas (hasta las 22:00: la pupusera) y duerme (22:00–5:00: nadie). Como `mueve`, lo pinta montana.js y el CSS no.
   */
  function vacaciones(f) { const md = f.slice(5); return md >= '11-15' || md <= '01-15'; }
  /** (Campamento 40) ¿Hay escuela ese día? Entre semana, fuera de vacaciones y no el 15 de septiembre (es feriado: hay desfile). */
  function escuela(f) { const sem = new Date(`${f}T12:00:00Z`).getUTCDay(); return sem >= 1 && sem <= 5 && !vacaciones(f) && f.slice(5) !== '09-15'; }
  function turno(f, h) {
    // (Campamento 36) El calendario del pueblo: el desfile del 15 de septiembre (7:00–12:00), Nochebuena y el 31 (18:00–1:00, pasada
    // la medianoche ya es el 25 o el 1), la misa del domingo (7:30–10:00), el sábado de plaza (7:00–12:00) y, en Navidad, la posada
    // frente al nacimiento al anochecer (1 dic – 6 ene).
    const md = f.slice(5);
    if (md === '09-15' && h >= 7 && h < 12) return 'desfile';
    // (Campamento 41) La Navidad entera: el 24, 25, 31 y 1 el día entero es de la fiesta; el 6, su tarde (antes, del 24 y el 31 solo había
    // una estampa de 18:00 a 1:00, `nochebuena`).
    const fi = turnoFiesta(md, h);
    if (fi) return fi;
    // (Campamento 42) Las fiestas del resto del año (Semana Santa, el 10 de mayo, agosto, septiembre, el Día del Niño, Difuntos, el 12 de
    // diciembre): su guion pasa delante del de un día cualquiera (también de la misa del domingo y del sábado de plaza).
    const fa = turnoDelAnio(f, h);
    if (fa) return fa;
    // (Campamento 40) El día entero del pueblo: antes del alba el panadero (4:30, idea 140), a mediodía la tortillera (11:30, 136) y,
    // los días de escuela, la salida (12:00–12:30, 137), la siesta en hamaca (12:30, 138), la vuelta del cantón (16:00, 144: también
    // es cuando se recoge la ropa tendida, 143) y la fresca (20:00–22:00, 139). Cada cambio de turno rehace solo `.v-vecinos`.
    if (h >= 22 || h < 4.5) return 'duerme';
    if (h < 5) return 'alba';
    if (h < 7) return 'amanece';
    const sem = new Date(`${f}T12:00:00Z`).getUTCDay();
    if (sem === 0 && h >= 7.5 && h < 10) return 'misa';
    if (sem === 6 && h < 12) return 'mercado';
    // (Campamento 43) Las temporadas del pueblo: otros turnos de los mismos osos, dentro de los de siempre (las fiestas de arriba mandan).
    // Marzo y abril, las mañanas sin escuela, los mangos (152); el domingo de 15:00 a 16:30, la mejenga (163); los sábados de julio y
    // agosto, la atolada (155); del 16 al 23 de diciembre, de 18:30, la posada (161); y las noches de luna llena, de 20:00 a 20:30, los
    // cuentos en la plaza (164). La milpa con su gente (154) no es un turno: va con el de la mañana (`temporadaDelPueblo`).
    if (h < 11.5) return escuela(f) ? 'manana' : mangos(f) ? 'tp-mangos' : 'mananaLibre';
    if (h < 12.5) return h >= 12 && escuela(f) ? 'salida' : 'tortillas';
    if (h < 14) return 'siesta';
    if (sem === 0 && h >= 15 && h < 16.5 && COSTUMBRES.mejenga && !navidad(f)) return 'tp-mejenga';
    if (h < 16) return 'tarde';
    if (h < 17.75) return atolada(f) ? 'tp-atolada' : 'vuelta';
    if (h < 20) return md >= '12-01' || md <= '01-06' ? (h >= 18.5 && posadaDe(f) >= 0 ? 'tp-posada' : 'posada') : 'pupusas';
    if (h < 20.5 && COSTUMBRES.cuentos && lunaDeLaNoche(f)) return 'tp-cuentos';
    return 'fresca';
  }
  /**
   * (Campamento 40, idea 146) Las sombras del pueblo siguen al sol, por turnos (no cada minuto): largas al amanecer y en la vuelta de
   * la tarde, cortas a mediodía, como siempre el resto. Lo enseña el CSS (`html[data-sombra]`) sobre los trazos que ya existen.
   */
  function sombraDelPueblo(h) {
    if ((h >= 5 && h < 7) || (h >= 16 && h < 17.75)) return 'larga';
    if (h >= 11.5 && h < 14) return 'corta';
    return '';
  }
  /**
   * (Campamento 40, idea 147) Las luces del pueblo se encienden una a una: a las 17:45 los faroles, a las 18:00 la iglesia y a las 18:15
   * las ventanas; a las 22:00 (el pueblo se duerme) se apagan las ventanas y a las 23:00 la iglesia (los faroles, toda la noche). Antes
   * (16:30–17:45) aún no hay ninguna; los ratos de fiesta de la Navidad entera, todas. `html[data-luces]`: 'ninguna', 'faroles', 'iglesia' o '' (como siempre: todas las que tocan).
   */
  function lucesDelPueblo(f, h) {
    // La noche de fiesta (la misa de gallo, la espera del 31, los abrazos de las doce) el pueblo no se apaga: todas las luces.
    const fi = turnoFiesta(f.slice(5), h);
    if (fi && fi !== 'duerme') return '';
    // (Campamento 52, ideas 140 y 231) De 4:30 a 5:00 la única luz del pueblo es el horno del panadero (los faroles, apagados); el lunes
    // descansa: solo los faroles, como antes.
    if (h >= 4.5 && h < 5) return semana(f) === 1 ? 'faroles' : 'horno';
    if (h >= 16.5 && h < 17.75) return 'ninguna';
    // (52, ideas 147 y 234) Las luces van detrás del sacristán: a las 17:45 enciende la iglesia (`templo`: solo ella), a las 18:00 los
    // faroles y a las 18:15 las ventanas.
    if (h >= 17.75 && h < 18) return 'templo';
    if (h >= 23 || h < 5) return 'faroles';
    if ((h >= 18 && h < 18.25) || (h >= 22 && h < 23)) return 'iglesia';
    return '';
  }
  /**
   * (Campamento 52, idea 234) La puerta de la iglesia: el sacristán la abre a las 5:30 y la cierra a las 21:00 (las noches de fiesta de la
   * Navidad entera se queda abierta). `html[data-puerta="cerrada"]`: el portal pasa de la luz de dentro a la madera de la puerta.
   */
  function puertaIglesia(f, h) {
    const fi = turnoFiesta(f.slice(5), h);
    if (fi && fi !== 'duerme') return '';
    return h >= 21 || h < 5.5 ? 'cerrada' : '';
  }
  // ---------------------------------------------------------------------------------------------------- (Campamento 51) el director
  /**
   * (Campamento 51, idea 224) La escalera de rareza: cada cuánto pasa algo. Lo de cada día es chico y callado; cuanto más raro, más
   * grande puede ser. El director elige por este orden (lo más raro primero) y cada idea nueva del valle declara su peldaño.
   */
  const RAREZA = ['dia', 'semana', 'mes', 'anio', 'anios'];
  /** El día de la semana (0 = domingo) de una fecha AAAA-MM-DD. */
  const semana = (f) => new Date(`${f}T12:00:00Z`).getUTCDay();
  /** (51) La luna de una noche: la de las 21:00 de El Salvador de esa fecha (las 3:00 UTC del día siguiente). */
  const lunaDeLaNoche = (f) => lunaLlena(faseLunar(new Date(Date.parse(`${f}T00:00:00Z`) + 27 * 3600e3)));
  const NAVIDAD_FRASE = {
    '12-24': 'Es Nochebuena en el pueblo: por la tarde hay cena en la calle y, de noche, misa de gallo.',
    '12-25': 'Es Navidad en el pueblo: por la mañana los oseznos estrenan.',
    '12-31': 'Es el último día del año en el pueblo: de noche todos esperan las doce.',
    '01-01': 'Es Año Nuevo en el pueblo: hasta media mañana nadie sale a la calle.',
    '01-06': 'Es 6 de enero: por la tarde el pueblo guarda la Navidad.',
  };
  /**
   * (Campamento 51, ideas 223 y 224) Los focos del valle, en una línea cada uno: cuándo está (`cuando`: fecha y hora; `delDia`: si
   * ese día lo tiene en algún momento), su peldaño en la escalera, a quién trae que se mueva (`mueve`, si alguien: la franja de
   * `data-mueve` que pasa delante de la de la rutina, idea 226) y lo que pesa (`pesa`: nodos y animaciones de más; un turno es otro
   * reparto de los mismos trazos, 0). `frase`: lo que cuenta la línea de hoy (idea 228), solo en los raros (de mes o más raros) y,
   * en lo que dura semanas (los zompopos, los azacuanes), solo el primer día: un aviso cada día dejaría de ser raro.
   * El orden es el de mando: la fiesta del día, lo raro de temporada, lo del mes, las costumbres de la semana y, si no hay nada, la
   * rutina (`rutinaDelDia`). Las visitas (55) y las historias de varios días (53) entrarán aquí, cada una con su línea.
   */
  const FOCOS = [
    { id: 'navidad', rareza: 'anio', delDia: (f) => Boolean(festivo(f)), cuando: (f, h) => turnoFiesta(f.slice(5), h) !== '' || mueveFiesta(f, h) !== null, mueve: mueveFiesta, pesa: { nodos: 0, anim: 0 }, frase: (f) => NAVIDAD_FRASE[f.slice(5)] ?? null },
    { id: 'desfile', rareza: 'anio', delDia: (f) => f.slice(5) === '09-15', cuando: (f, h) => f.slice(5) === '09-15' && h >= 7 && h < 12, pesa: { nodos: 0, anim: 0 }, frase: () => 'Es 15 de septiembre: por la mañana el pueblo tiene su desfile.' },
    // (Campamento 42) Las fiestas del resto del año: su guion por turnos y, si algo se mueve distinto, su franja (`mueveAnio`).
    { id: 'fiestas', rareza: 'anio', delDia: (f) => Boolean(fiestaDelAnio(f)), cuando: (f, h) => turnoDelAnio(f, h) !== '' || mueveAnio(f, h) !== null, mueve: mueveAnio, pesa: { nodos: 0, anim: 0 }, frase: (f) => FRASE_ANIO[fiestaDelAnio(f)] ?? null },
    { id: 'cruz', rareza: 'anio', delDia: (f) => f.slice(5) === '05-03', cuando: (f) => f.slice(5) === '05-03', pesa: { nodos: 0, anim: 0 }, frase: () => 'Es Día de la Cruz: en el pueblo hay una cruz adornada con frutas.' },
    { id: 'zompopos', rareza: 'anio', delDia: zompopos, cuando: (f, h) => zompopos(f) && h >= 7.5 && h < 10, mueve: () => 'zompopos', pesa: { nodos: 0, anim: 0 }, frase: (f) => (f.slice(5) === '05-15' ? 'Empieza la semana de los zompopos de mayo: por las mañanas salen en el valle.' : null) },
    { id: 'azacuanes', rareza: 'anio', delDia: azacuanes, cuando: (f, h) => azacuanes(f) && h >= 8 && h < 16, mueve: () => 'azacuanes', pesa: { nodos: 0, anim: 0 }, frase: (f) => (['10-10', '04-01'].includes(f.slice(5)) ? 'Llegan los azacuanes: estos días pasan sobre el valle a mediodía.' : null) },
    // (Campamento 43) Las temporadas del pueblo: los mangos, la atolada y la milpa con su gente (otros repartos; nada se mueve distinto).
    { id: 'temporada', rareza: 'anio', delDia: (f) => mangos(f) || atolada(f) || Boolean(faenaDelDia(f)), cuando: (f, h) => temporadaAhora(f, h) !== '', pesa: { nodos: 0, anim: 0 }, frase: fraseTemporada },
    // (43, idea 161) Desde las 18:30 del 16 al 23 de diciembre, la posada es la de los farolitos (`tp-posada`): la frase, el primer día.
    { id: 'posada', rareza: 'anio', delDia: (f) => navidad(f) && !['12-24', '12-25', '12-31', '01-01'].includes(f.slice(5)), cuando: (f, h) => ['posada', 'tp-posada'].includes(turno(f, h)), pesa: { nodos: 0, anim: 0 }, frase: (f) => (posadaDe(f) === 0 ? 'Empiezan las posadas: cada noche, hasta el 23, un grupito con farolitos llega a una casa del pueblo.' : null) },
    { id: 'luna', rareza: 'mes', delDia: lunaDeLaNoche, cuando: (f, h) => (h >= 19 || h < 5) && lunaDeLaNoche(h < 5 ? diaAntes(f) : f), pesa: { nodos: 0, anim: 0 }, frase: (f) => (lunaDeLaNoche(diaAntes(f)) ? null : 'Esta noche hay luna llena sobre el valle.') },
    { id: 'misa', rareza: 'semana', delDia: (f) => semana(f) === 0, cuando: (f, h) => turno(f, h) === 'misa', pesa: { nodos: 0, anim: 0 } },
    { id: 'mercado', rareza: 'semana', delDia: (f) => semana(f) === 6, cuando: (f, h) => turno(f, h) === 'mercado', pesa: { nodos: 0, anim: 0 } },
    // (Campamento 43, idea 163) El domingo por la tarde, la mejenga: la pelota que bota es la de siempre (la franja `pelota`).
    { id: 'mejenga', rareza: 'semana', delDia: (f) => semana(f) === 0 && COSTUMBRES.mejenga && !navidad(f), cuando: (f, h) => turno(f, h) === 'tp-mejenga', pesa: { nodos: 0, anim: 0 } },
  ];
  /**
   * (Campamento 51) Choques declarados: los días en que dos focos raros (de mes o más) pueden estar a la vez, y quién manda (el primero
   * de la tabla). La luna llena cae a veces en Navidad (el 24 de diciembre de 2026, por ejemplo), en una noche de posada o el Día de la
   * Cruz: manda la fiesta.
   * Los zompopos y los azacuanes son de día y la luna de noche: no se pisan. Una prueba recorre el año y falla con un choque no declarado.
   */
  // (Campamento 42) Las fiestas del año caen a veces en luna llena (el anochecer del 14 de septiembre, el del 2 de noviembre, las noches
  // de agosto) y Semana Santa, a veces, en los días de azacuanes (del 1 al 20 de abril): manda la fiesta, y los azacuanes vuelan igual.
  // (Campamento 43) La temporada de mangos cae en los días de azacuanes (del 1 al 20 de abril) y la siembra en el Día de la Cruz: manda
  // el primero (los azacuanes vuelan igual; la cruz sigue en el pueblo y la milpa tiene su gente).
  const CHOQUES = [['navidad', 'luna'], ['posada', 'luna'], ['cruz', 'luna'], ['fiestas', 'luna'], ['fiestas', 'azacuanes'], ['cruz', 'temporada'], ['azacuanes', 'temporada']];
  function diaAntes(f) { return new Date(Date.parse(`${f}T12:00:00Z`) - 864e5).toISOString().slice(0, 10); }
  /**
   * (Campamento 51, idea 227) La rutina del día, cuando no hay nada raro: a quién se fija uno hoy en el pueblo. Una baraja fija de seis
   * (`RUTINAS`) que gira cada semana: el día `i` de la semana `w` (desde un lunes) toca `RUTINAS[(i mod 6 + s_w) mod 6]`, con
   * `s_w = (2w + b_w) mod 6` y `b_w` (0 o 1) de una semilla por semana. Así, sin guardar nada y igual en todos los aparatos: hoy no es
   * ayer, tampoco el mismo día de la semana pasada, y cada semana tiene al menos seis distintas. Todas existen cada día (son la rutina
   * de siempre: se cuenta la que toca, no se dibuja nada); la misa del domingo, el sábado de plaza y las fiestas no entran en la baraja.
   */
  const RUTINAS = ['barre', 'gallinas', 'pescador', 'perro', 'pelota', 'fogon'];
  const FRASE_RUTINA = {
    barre: 'Temprano, una vecina barre su acera en el pueblo.',
    gallinas: 'Por la mañana, las gallinas picotean en la plaza del pueblo.',
    pescador: 'En el lago, el pescador anda en su cayuco.',
    perro: 'Por la tarde, el perro de la plaza la cruza y se echa en su esquina.',
    pelota: 'Por la tarde, los oseznos juegan con su pelota en la plaza.',
    fogon: 'De una chimenea del pueblo sale el humo del fogón.',
  };
  const LUNES0 = Date.UTC(2024, 0, 1); // un lunes
  /** Una semilla de 0 o 1 por semana (un entero sin signo, revuelto): igual en todos los aparatos. */
  const bitSemana = (w) => { let x = (w * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x & 1; };
  function rutinaDelDia(f) {
    const d = Math.round((Date.parse(`${f}T00:00:00Z`) - LUNES0) / 864e5), w = Math.floor(d / 7), i = d - w * 7;
    const s = (((2 * w + bitSemana(w)) % 6) + 6) % 6;
    return RUTINAS[((i % 6) + s) % 6];
  }
  /**
   * (Campamento 51, F3 del diseño) Los ambientales: hasta tres cosas lentas y baratas junto al actor principal (la excepción acotada a
   * «uno en movimiento a la vez»). Cada uno, en su capa pequeña (montana.js: `ambientalesDelValle`), solo transform y opacidad, ciclo de
   * 12 s o más, recorrido de 20 px o menos y sin cruzar la escena; solo con «todos» y solo a su hora (si el CSS no lo enseña, no corre):
   *   humo     5:00–20:00: el fogón de una chimenea (dos en pantallas anchas) todo el día, no solo a la hora del café y de la cena
   *   cayuco   5:00–16:30: el cayuco a la deriva en el lago también de día (al amanecer, además, el pescador rema)
   *   estrellitas  (49) la noche del 24 y del 31, 18:00–1:00: las de los oseznos titilan
   * De noche, ninguno (salvo las estrellitas de esas dos noches). `pesa`: las capas que pone cada uno (las del escritorio entre paréntesis) y sus animaciones por capa.
   */
  const AMBIENTALES = [
    { id: 'humo', cuando: (_f, h) => h >= 5 && h < 20, pesa: { capas: 1, capasAncho: 2, anim: 3 } },
    { id: 'cayuco', cuando: (_f, h) => h >= 5 && h < 16.5, pesa: { capas: 1, capasAncho: 1, anim: 2 } },
    // (Campamento 49, idea 201) Las estrellitas de los oseznos titilan en la cena de Nochebuena y del 31 y en los abrazos de las doce
    // (18:00–1:00): una capa, una animación de opacidad, ciclo de 12 s. Las dos noches más cargadas del año, sin un nodo en el dibujo grande.
    { id: 'estrellitas', cuando: (f, h) => (h >= 18 || h < 1) && ['nb-cena', 'f31-cena', 'nb-doce', 'f31-doce'].includes(turno(f, h)), pesa: { capas: 1, capasAncho: 1, anim: 1 } },
  ];
  const MAX_AMBIENTALES = 3;
  /** (51) Los ambientales de ese momento (ids), como mucho tres capas. */
  const ambiente = (f, h) => AMBIENTALES.filter((a) => a.cuando(f, h)).map((a) => a.id);
  /**
   * (Campamento 47) Los osos de la cumbre según la hora: una pose quieta que enseña el CSS (`html[data-cumbre]`), a saltos y sin nada
   * que se mueva (0 capas, 0 animaciones; la declara el director y la lee el banco):
   *   estrellas las noches del 13 y del 14 de diciembre, 19:00–5:00 (46, idea 181): miran arriba, a las Gemínidas (no duermen)
   *   duermen   22:00–5:00 (24): ojos cerrados y sus zetas; no en las noches de fiesta (el 24 y el 31 esperan las doce despiertos)
   *   espaldas  17:30–18:15 (184): de espaldas, mirando bajar el sol
   *   sol       marzo y abril, 10:00–15:00 (189): el grande con su sombrero de palma
   * `ninguno` (''): la de siempre. La fiesta del hito (59) los despierta (aplicar).
   */
  const CUMBRE = [
    // (Campamento 46, idea 181) Las noches de las Gemínidas no duermen: miran el cielo (antes que «duermen»: `find` toma la primera).
    { id: 'estrellas', cuando: (f, h) => geminidas(f, h), pesa: { capas: 0, anim: 0 } },
    { id: 'duermen', cuando: (f, h) => (h >= 22 || h < 5) && !/^(nb-(cena|misa|doce)|f31-(cena|espera|doce)|n25-polvora|e1-polvora)$/.test(turno(f, h)), pesa: { capas: 0, anim: 0 } },
    { id: 'espaldas', cuando: (_f, h) => h >= 17.5 && h < 18.25, pesa: { capas: 0, anim: 0 } },
    { id: 'sol', cuando: (f, h) => ['03', '04'].includes(f.slice(5, 7)) && h >= 10 && h < 15, pesa: { capas: 0, anim: 0 } },
  ];
  const poseCumbre = (f, h) => CUMBRE.find((c) => c.cuando(f, h))?.id ?? '';
  /**
   * (Campamento 48) «Tú» según la hora: poses quietas que enseña el CSS (`html[data-tu]`, varias separadas por espacios), a saltos y
   * sin nada que se mueva (0 capas, 0 animaciones; las declara el director y las lee el banco). Mientras «Tú» anda o festeja, el osito
   * de siempre (el CSS les cede):
   *   carpa     22:00–5:00 (191): acampa en su sitio, con la luz dentro; no las noches de fiesta (como los de la cumbre)
   *   espaldas  17:30–18:15 (193): mira bajar el sol de espaldas, con la mochila al frente (a la misma hora que los de la cumbre)
   *   capote    época lluviosa, 14:00–17:45 (192): su capote amarillo
   * La fiesta del hito (59) las quita (aplicar).
   */
  const TU = [
    { id: 'carpa', cuando: (f, h) => (h >= 22 || h < 5) && !/^(nb-(cena|misa|doce)|f31-(cena|espera|doce)|n25-polvora|e1-polvora)$/.test(turno(f, h)), pesa: { capas: 0, anim: 0 } },
    { id: 'espaldas', cuando: (_f, h) => h >= 17.5 && h < 18.25, pesa: { capas: 0, anim: 0 } },
    { id: 'capote', cuando: (f, h) => epoca(f) === 'lluviosa' && h >= 14 && h < 17.75, pesa: { capas: 0, anim: 0 } },
  ];
  const poseTu = (f, h) => TU.filter((t) => t.cuando(f, h)).map((t) => t.id).join(' ');
  /**
   * (Campamento 47) Los gestos a saltos de los de la cumbre (como estirarse a las 7, campamento 33): de 8:05 a 17:25, cada diez minutos (a las
   * y cinco: las horas en punto quedan quietas), uno de los tres seis segundos (montana.js pone la clase; el CSS lo enseña solo con «todos»): `mira` (el que da al pueblo mira hacia
   * abajo), `acomoda` (los otros dos se recuestan en el grande) o `estira` (el grande se estira). Ninguna animación: un cambio al empezar
   * y otro al acabar. null si a esa hora no toca (o si tienen otra pose).
   */
  const GESTOS_CUMBRE = ['mira', 'acomoda', 'estira'];
  function gestoDeLosOsos(f, h) {
    if (h < 8 || h >= 17.5 || Math.floor(h * 60 + 1e-9) % 10 !== 5 || !['', 'sol'].includes(poseCumbre(f, h))) return null;
    return GESTOS_CUMBRE[Math.floor(h * 6 + 1e-9) % 3];
  }
  /** (51, idea 223) El foco del momento: el primero de la tabla que está; si no, la rutina del día. */
  function foco(f, h) {
    return FOCOS.find((fo) => fo.cuando(f, h)) ?? { id: 'rutina', rareza: 'dia', rutina: rutinaDelDia(f) };
  }
  /**
   * (Campamento 51, idea 223) El director del valle: con la fecha y la hora, qué se ve. Pura y sin guardar nada (lo mismo en todos los
   * aparatos). { foco, rareza, rutina, turno, mueve, ambiente }: el foco del momento (o 'rutina'), su peldaño, la rutina del día, el
   * turno del pueblo (`turno`), lo que se mueve (`mueve`: uno, el del foco si trae a alguien), el segundo principal de las pantallas
   * anchas (`mueve2`, campamento 49) y los ambientales (hasta tres). (45) `animal`: el de la hora en la plaza; `valle`: las poses
   * quietas del potrero y del lago.
   */
  function director(f, h) {
    const fo = foco(f, h);
    return { foco: fo.id, rareza: fo.rareza, rutina: rutinaDelDia(f), turno: turno(f, h), mueve: mueve(f, h), mueve2: mueve2(f, h), ambiente: ambiente(f, h), cumbre: poseCumbre(f, h), tu: poseTu(f, h), animal: animalDelPueblo(f, h), valle: poseValle(f, h) };
  }
  /**
   * (Campamento 51, idea 228) La frase del foco para la línea de hoy: solo si ese día tiene algo raro (de mes o más raro), la del
   * primero de la tabla; si no, null (los días de rutina no hay aviso: lo común es callado). Sin «tú» y sin verbos de mandar.
   */
  function fraseDelFoco(f) {
    for (const fo of FOCOS) if (RAREZA.indexOf(fo.rareza) >= 2 && fo.frase && fo.delDia(f)) { const t = fo.frase(f); if (t) return t; }
    return null;
  }
  /**
   * (Campamento 51, idea 225) Lo que pesa el que se mueve, si va en capas pequeñas (montana.js): cuántas capas y cuántas animaciones en
   * cada una. Lo que se mueve en el dibujo grande o en el cielo (el torogoz, las bandadas, las luciérnagas, el relámpago) lo mide el
   * banco por capa; aquí solo lo de las capas propias, que es lo que se reparte con los ambientales.
   */
  const PESO_MUEVE = {
    barre: { capas: 2, anim: 1 }, pelota: { capas: 2, anim: 1 }, brinda: { capas: 1, anim: 1 }, chispea: { capas: 1, anim: 1 },
    gallinas: { capas: 3, anim: 1 }, perro: { capas: 2, anim: 1 }, teleferico: { capas: 0, capasAncho: 1, anim: 1 },
    // (Campamento 49) El panadero que cruza, las manos de la tortillera, la campana y la hamaca, cada uno en su capa; la que barre y la
    // pelota llevan además la abuela de la ronda (118: otra capa, en la misma fase, nunca a la vez). El que camina al cambiar de turno
    // (204) no es del calendario: unos segundos, unas diez veces al día, es el actor principal (`data-camina`; lo demás del pueblo espera).
    cruza: { capas: 1, anim: 1 }, palmea: { capas: 1, anim: 1 }, campana: { capas: 1, anim: 1 }, hamaca: { capas: 1, anim: 1 }, camina: { capas: 1, anim: 1 },
    mece: { capas: 1, anim: 1 }, // (Campamento 42) la piñata del Día del Niño, en su capa, de 15:00 a 17:00 (en lugar de la pelota)
    // (Campamento 59) La fiesta del hito: no es del calendario (no sale en el mapa del día), sale al cruzar una etapa por primera vez o el
    // día del halving, y mientras dura (30 s como mucho) es el actor principal: la campana, los farolitos y cada cohete, cada uno en su
    // capa y con una animación; en el clímax, los farolitos y hasta cinco cohetes (tres en el teléfono). Lo ambiental espera.
    'fiesta-hito': { capas: 7, capasAncho: 7, anim: 1 },
  };
  /**
   * (Campamento 51, idea 225) El mapa del día: cada tramo en que cambia algo (el turno, el foco, lo que se mueve o los ambientales), de
   * cinco en cinco minutos, con lo que pesa en capas pequeñas: `capas` (las del actor y las de los ambientales) y `anim` (la capa más
   * cargada). Lo enseña la guía (junto al almanaque) y lo lee el banco de rendimiento, que falla si un tramo se pasa.
   */
  function mapaDelDia(f, ancho = false) {
    const t = [];
    for (let q = 0; q < 288; q++) {
      const h = q / 12, dr = director(f, h), clave = `${dr.turno}|${dr.foco}|${dr.mueve}|${dr.mueve2}|${dr.ambiente.join(' ')}|${dr.cumbre}|${dr.tu}|${dr.animal}|${dr.valle}`;
      if (t.length && t.at(-1).clave === clave) continue;
      const pm = PESO_MUEVE[dr.mueve], amb = dr.ambiente.map((id) => AMBIENTALES.find((a) => a.id === id).pesa);
      // (49, 275) En pantallas anchas, el segundo principal suma su capa.
      const p2 = ancho && dr.mueve2 ? PESO_MUEVE[dr.mueve2] : null, capas2 = p2 ? (p2.capasAncho ?? p2.capas) : 0;
      const capasAmb = amb.reduce((s, p) => s + (ancho ? p.capasAncho : p.capas), 0), capasMueve = pm ? (ancho ? (pm.capasAncho ?? pm.capas) : pm.capas) : 0;
      t.push({ clave, desde: h, ...dr, principales: (dr.mueve ? 1 : 0) + (p2 ? 1 : 0), capasAmb, capas: capasAmb + capasMueve + capas2, anim: Math.max(0, ...amb.map((p) => p.anim), capasMueve ? pm.anim : 0, p2 ? p2.anim : 0) });
    }
    return t.map((x, i) => ({ ...x, hasta: t[i + 1]?.desde ?? 24 }));
  }
  /** (51, idea 228) La frase de la rutina del día, para la descripción de la montaña (lectores de pantalla). */
  const fraseRutina = (f) => FRASE_RUTINA[rutinaDelDia(f)];
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

  // (Campamento 59) Con la fiesta del hito en marcha (fiesta.js), `data-mueve` es `fiesta-hito` y no hay ambientales: la fiesta es el
  // actor principal unos segundos. Vive aquí porque `aplicar` reescribe los dos atributos cada cinco minutos y al volver a la página.
  let fiestaHitoViva = false;
  function fiestaHito(on) { fiestaHitoViva = Boolean(on); aplicar(); }
  let diaAplicado = null; // (Campamento 30) para avisar del cambio de día
  let turnoAplicado = null; // (Campamento 35) para avisar del cambio de turno del pueblo
  let animalAplicado = ''; // (Campamento 46) y del animal de la hora
  let cohetesAplicados = null; // (Campamento 39) para poner o quitar los cohetes en su hora
  function aplicar() {
    const h = hora();
    for (const [k, v] of Object.entries(colores(h))) raiz.style.setProperty(k, v);
    const ti = tinta(h), t = TINTA[ti];
    raiz.dataset.cielo = franja(h);
    // Fiestas, época del año y cohetes de fin de año: el CSS muestra lo que toque (la escena dibuja todo y se queda oculto).
    const d = dia(), fi = fiesta(d);
    // (Campamento 30) La escena dibuja solo lo de la temporada de hoy: si el día cambió con la página abierta, lo avisa para volver a dibujarla.
    if (diaAplicado !== null && d !== diaAplicado && typeof window.dispatchEvent === 'function' && typeof Event === 'function') window.dispatchEvent(new Event('libro:dia'));
    diaAplicado = d;
    if (fi) raiz.dataset.fiesta = fi; else delete raiz.dataset.fiesta;
    raiz.dataset.epoca = epoca(d);
    raiz.toggleAttribute('data-cohetes', cohetes(d, h));
    // (Campamento 39) A las 23:40 y a las 0:40, montana.js pone o quita lo de dentro de los cohetes (`libro:cohetes`).
    const cp = cohetesPuestos(d, h);
    if (cohetesAplicados !== null && cp !== cohetesAplicados && typeof window.dispatchEvent === 'function' && typeof Event === 'function') window.dispatchEvent(new Event('libro:cohetes'));
    cohetesAplicados = cp;
    // El valle vivo (campamento 22): la milpa, la Navidad, las piscuchas, el humo del fogón y la noche de luna llena.
    raiz.dataset.milpa = milpa(d);
    raiz.toggleAttribute('data-navidad', navidad(d));
    raiz.toggleAttribute('data-piscuchas', piscuchas(d));
    raiz.toggleAttribute('data-fogon', fogon(h));
    raiz.toggleAttribute('data-luna-llena', lunaLlena(faseLunar()));
    // El valle vivo, parte 2 (campamento 22B): el verdor del valle (variable de 0 a 1), el mar de niebla del amanecer (su espesor, de 0
    // a 1), los árboles en flor y lo que se mueve (uno a la vez); la escena lo dibuja todo y el CSS enseña lo que toca.
    raiz.style.setProperty('--v-verde', verdor(d).toFixed(3));
    const mar = marNiebla(h, d);
    raiz.style.setProperty('--v-mar', mar.toFixed(3));
    raiz.toggleAttribute('data-mar-niebla', mar > 0);
    const fl = flor(d), mv = fiestaHitoViva ? 'fiesta-hito' : mueve(d, h);
    if (fl) raiz.dataset.flor = fl; else delete raiz.dataset.flor;
    if (mv) raiz.dataset.mueve = mv; else delete raiz.dataset.mueve;
    // (Campamento 49, idea 275) El segundo principal de las pantallas anchas (el CSS lo enseña solo desde 1100 px); con la fiesta, nada.
    const mv2 = fiestaHitoViva ? '' : mueve2(d, h);
    if (mv2) raiz.dataset.mueve2 = mv2; else delete raiz.dataset.mueve2;
    // (Campamento 51) El director: el foco del momento (`data-foco`, lo lee el CSS y la descripción) y los ambientales que van junto al
    // actor (`data-ambiente`, hasta tres, separados por espacios: el CSS enseña cada capa con `~=`).
    const fo = foco(d, h), amb = fiestaHitoViva ? [] : ambiente(d, h);
    raiz.dataset.foco = fo.id === 'rutina' ? `rutina-${fo.rutina}` : fo.id;
    if (amb.length) raiz.dataset.ambiente = amb.join(' '); else delete raiz.dataset.ambiente;
    // (Campamento 35) El turno del pueblo: si cambió con la página abierta, montana.js rehace solo sus vecinos (`libro:turno`).
    const tu = turno(d, h);
    raiz.dataset.turno = tu;
    // (Campamento 40) Las sombras del pueblo (146) y sus luces una a una (147): el CSS enseña lo que toca, nada se redibuja.
    const so = sombraDelPueblo(h), lu = lucesDelPueblo(d, h);
    if (so) raiz.dataset.sombra = so; else delete raiz.dataset.sombra;
    if (lu) raiz.dataset.luces = lu; else delete raiz.dataset.luces;
    if (puertaIglesia(d, h)) raiz.dataset.puerta = 'cerrada'; else delete raiz.dataset.puerta; // (52, 234)
    const fe = festivo(d);
    if (fe) raiz.dataset.festivo = fe; else delete raiz.dataset.festivo;
    // (Campamento 46, encargo del dueño del 26 nov 2026) También cuando cambia el animal de la hora (el gallo se va a las 6:00, el garrobo
    // llega a las 11:00, los zanates a las 17:30 y se van a las 18:30): un solo aviso aunque cambien los dos a la vez.
    const an = animalDelPueblo(d, h);
    if (turnoAplicado !== null && (tu !== turnoAplicado || an !== animalAplicado) && typeof window.dispatchEvent === 'function' && typeof Event === 'function') window.dispatchEvent(new Event('libro:turno'));
    turnoAplicado = tu;
    animalAplicado = an;
    // (Campamento 46) El lucero a su hora (182) y la luna cobriza de un eclipse (183): el CSS los enseña, nada se redibuja.
    const lz = luceroAhora(d, h);
    if (lz) raiz.dataset.lucero = lz; else delete raiz.dataset.lucero;
    raiz.toggleAttribute('data-eclipse', eclipse(d, h));
    // Modo madrugada (idea 20): de 22:00 a 5:00 la página se atenúa y se calienta un poco (un velo en el CSS), para abrirla en la cama.
    raiz.toggleAttribute('data-madrugada', madrugadaActiva(h));
    // (Campamento 28) Los osos de la interfaz se duermen de 22:00 a 5:00 aunque el velo esté apagado, y las tardes (13:00 a 18:00) de la
    // época lluviosa sacan su paraguas.
    raiz.toggleAttribute('data-sueno', h >= 22 || h < 5);
    raiz.toggleAttribute('data-tarde', h >= 13 && h < 18);
    // (Campamento 47) La pose de los osos de la cumbre (duermen, de espaldas, con sombrero); la fiesta del hito los despierta.
    const cu = fiestaHitoViva ? '' : poseCumbre(d, h);
    if (cu) raiz.dataset.cumbre = cu; else delete raiz.dataset.cumbre;
    // (Campamento 48) Las poses de «Tú» (acampa, de espaldas, con capote); la fiesta del hito también lo despierta.
    const pt = fiestaHitoViva ? '' : poseTu(d, h);
    if (pt) raiz.dataset.tu = pt; else delete raiz.dataset.tu;
    // (Campamento 45) Las vacas echadas a mediodía y la garza en la otra orilla por la tarde (poses quietas: nada se redibuja).
    const pv = poseValle(d, h);
    if (pv) raiz.dataset.valle = pv; else delete raiz.dataset.valle;
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
  setInterval(() => { if (document.visibilityState === 'visible' && horaTemporal === null) aplicar(); }, 300_000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') aplicar(); });
  window.libroCielo = { dia, fiesta, epoca, cohetes, cohetesPuestos, festivo, turnoFiesta, pascua, fiestaDelAnio, turnoDelAnio, mueveAnio, costumbres: COSTUMBRES, temporadaDelPueblo, temporadaAhora, faenaDelDia, posadaDe, navidad, piscuchas, milpa, fogon, lunaLlena, verdor, marNiebla, flor, azacuanes, zompopos, mueve, mueveRutina, mueve2, hayActor, turno, escuela, sombraDelPueblo, lucesDelPueblo, puertaIglesia,
    director, foco, conejo, figuraDelCielo, geminidas, lucero, luceroAhora, eclipse, eclipses: ECLIPSES, poseCumbre, cumbre: CUMBRE, poseTu, tu: TU, animalDelPueblo, poseValle, valle: VALLE, sorteo, gestoDeLosOsos, gestosCumbre: GESTOS_CUMBRE, rutinaDelDia, ambiente, fraseDelFoco, fraseRutina, focos: FOCOS, choques: CHOQUES, rareza: RAREZA, rutinas: RUTINAS, ambientales: AMBIENTALES, maxAmbientales: MAX_AMBIENTALES, mapaDelDia, pesoMueve: PESO_MUEVE, fiestaHito, vacaciones, madrugadaPref, fijarMadrugada, hora, franja, colores, tinta, faseLunar, saludo, paletas: P, tintas: TINTA, aplicar, fijarHora };
})();
