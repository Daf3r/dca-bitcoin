// Banco de rendimiento de la escena (campamento 30, idea 18): mide solo y falla si algo empeora. Abre la app en el teléfono (390×664,
// Safari con sus barras) con mil compras en los momentos más cargados del año y cuenta, por capa, lo que pesa la escena.
//   Lo duro (hace fallar): los nodos de la escena (tope 1100), del valle (300) y de los osos (46; 40 hasta el campamento 47, regla reabierta con el visto bueno del dueño), con efectos «esenciales» como la
//   prueba de siempre; y las animaciones que corren A LA VISTA en cada capa, con efectos «todos», frente al presupuesto escrito en
//   docs/rendimiento.md («Presupuesto»). Lo que cuenta Chromium bajo display: none no se cuenta (WebKit lo para).
//   (Campamento 39) Cada fecha declara lo que pesa (`declara`, falla si pasa) y las pantallas anchas (1440 y 2560) tienen su tope de nodos.
//   Lo blando (solo informa, mediana de 3): el tiempo de crear la escena con la CPU 4× más lenta y los fotogramas por segundo en
//   reposo con la montaña a la vista (Chromium, CPU 4×). Varían de máquina a máquina: el iPhone de verdad lo mide «Medir este aparato».
// Uso: node tests/banco_rendimiento.mjs [--rapido]   (PYTHON=ruta/python si Flask no está en python3; BANCO_JSON=ruta guarda la tabla;
//      SOLO=texto mide solo los casos cuyo nombre lo lleva)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || 'python3';
const RAPIDO = process.argv.includes('--rapido');

/** Los topes de nodos (CLAUDE.md, «Escena y arte») y el presupuesto de animaciones a la vista por capa (docs/rendimiento.md). */
export const TOPES = { escena: 1100, valle: 300, osos: 46 }; // (47) los osos, de 40 a 46 (idea 129)
/** (Campamento 39, idea 131) El tope de la escena en pantallas anchas (escritorio y tele), por ancho: lo «solo ancho» no baja al teléfono. */
export const TOPES_ANCHO = { 1440: 1100, 1920: 1100, 2560: 1100 };
/** (Campamento D) El tope propio de la pantalla grande (#tv) a 1920×1080: animaciones a la vista en toda la escena, a cualquier hora en que está despierta. */
export const TOPE_TV = 24;
export const PRESUPUESTO = { principal: 56, frente: 16, 'par-cielo': 44, 'par-lejos': 22, 'par-medio': 4, propia: 3, total: 110 };
/** (Campamento 51, F3) Como mucho tres ambientales (`svg.v-capa-amb`) moviéndose a la vez junto al actor principal. */
export const AMBIENTALES = 3;
/**
 * Los momentos que se miden: el día y la noche de siempre, la noche más cargada (Nochebuena), la época lluviosa (la noche de lluvia es el
 * caso duro de las animaciones) y, desde el campamento 39 (idea 124), el pico del año: el 31 a las 23:55, con los cohetes. `declara`: lo
 * que esa fecha dice que pesa (nodos de la escena con «esenciales», en el teléfono); el banco falla si pesa más de lo declarado (con 6 de
 * aire, lo que varía de una carga a otra). Una fecha nueva del calendario se añade aquí con lo suyo declarado. Los datos del escenario
 * son los de un día fijo (`FECHA_PRUEBA`): nada depende de la fecha real.
 */
const CASOS = [
  // (Campamento 52) +1 en cada fecha: el portal de la iglesia va en su propio trazo (el sacristán lo abre y lo cierra); los vecinos con
  // oficio usan los tonos de siempre (en algún turno, uno más que antes: +2 como mucho).
  // (Campamento 40) +1 en cada fecha: la sombra del perro va en su propio trazo (se esconde con él cuando se echa en otro sitio).
  // (Campamento 51) Las capas de los ambientales suman tres nodos a cada fecha (las del humo y del cayuco, y el grupo que guarda la
  // transformación del cayuco en el lago): de ahí que cada `declara` suba 3 desde el 39 y el 41.
  { caso: 'día normal', dia: '2026-11-25', hora: 12, declara: 827 },
  // (Campamento 51) Las franjas del día en que se mueve alguien del pueblo (la que barre, las gallinas, el perro, la pelota) y el
  // anochecer del fogón: con los ambientales (F3) junto al actor, que es lo que el director reparte.
  // (Campamento 53A) La neblina del amanecer (53B: de 5:00 a 9:00 y, fina, por la tarde): quieta; en el teléfono, dos bancos de degradado (los jirones y la bruma del pueblo, solo en escritorio) (ningún caso caía en su franja).
  { caso: 'amanecer, neblina', dia: '2026-11-25', hora: 6, declara: 828 },
  { caso: 'día, barre', dia: '2026-11-25', hora: 7.5, declara: 820 },
  { caso: 'día, gallinas', dia: '2026-11-25', hora: 8.5, declara: 820 },
  { caso: 'día, perro', dia: '2026-11-25', hora: 14.5, declara: 830 },
  { caso: 'día, pelota', dia: '2026-11-25', hora: 15.5, declara: 830 },
  { caso: 'anochecer, fogón', dia: '2026-11-25', hora: 19, declara: 824 },
  { caso: 'noche normal', dia: '2026-11-25', hora: 21, declara: 822 },
  { caso: 'Nochebuena', dia: '2026-12-24', hora: 21, declara: 896 },
  { caso: 'tarde de lluvia', dia: '2026-07-10', hora: 15, declara: 839 },
  { caso: 'noche de lluvia', dia: '2026-07-10', hora: 21, declara: 840 },
  // El pico del año: los cohetes (14 animaciones, en el frente) solo de 23:50 a 0:30 del 24 y del 31; esos 40 minutos el frente admite 28
  // (medido el 24 nov 2026: 26 en Nochebuena, con el papel picado de la fiesta; ya era así antes del 39, solo que el banco no lo medía).
  { caso: 'Nochebuena, cohetes', dia: '2026-12-24', hora: 23.92, declara: 937, frente: 28 },
  { caso: '31 dic, cohetes', dia: '2026-12-31', hora: 23.92, declara: 901, frente: 28 },
  // (Campamento 41) La Navidad entera: un turno de cada fecha nueva (los demás pesan lo mismo: otro reparto de los mismos trazos).
  { caso: 'Nochebuena, cena', dia: '2026-12-24', hora: 19, declara: 906 },
  { caso: '25 dic, estrenos', dia: '2026-12-25', hora: 9.5, declara: 897 },
  { caso: '31 dic, la espera', dia: '2026-12-31', hora: 23.58, declara: 867 },
  { caso: '1 ene, las doce', dia: '2027-01-01', hora: 0.5, declara: 907, frente: 28 },
  { caso: '6 ene, se guarda', dia: '2027-01-06', hora: 15.2, declara: 864 },
  // (Campamento 40) El día entero del pueblo: un día de escuela de la seca (miércoles 10 de febrero de 2027), un lunes de ropa tendida y
  // un viernes de pupusas. Ninguno mueve a nadie nuevo: otro reparto de los mismos trazos.
  { caso: 'antes del alba', dia: '2027-02-10', hora: 4.75, declara: 811 },
  { caso: 'mediodía, tortillas', dia: '2027-02-10', hora: 11.75, declara: 818 },
  { caso: 'mediodía, salida de la escuela', dia: '2027-02-10', hora: 12.25, declara: 818 },
  { caso: 'siesta, la hamaca', dia: '2027-02-10', hora: 13, declara: 817 }, // (45) +1: el verde del garrobo al sol (la hamaca y su ropa van en su capa)
  { caso: 'la vuelta del cantón', dia: '2027-02-10', hora: 16.75, declara: 821 },
  { caso: 'la fresca', dia: '2027-02-10', hora: 21, declara: 813 },
  { caso: 'lunes, ropa tendida', dia: '2027-02-08', hora: 9, declara: 828 },
  { caso: 'viernes, pupusas', dia: '2027-02-12', hora: 19, declara: 815 },
  // (Campamento 59) La fiesta del hito, medida en su clímax («Probar la celebración», que usa el mismo código): la campana, los
  // farolitos y los cohetes, cada uno en su capa pequeña, mientras dura (unos +12 nodos en el clímax; el resto de la diferencia con
  // el día normal es la escena de la prueba, que se dibuja con el saldo inventado de cada nivel); los vecinos de la fiesta son otro
  // reparto de los mismos trazos. Lo ambiental espera (0 ambientales). En Nochebuena a las 23:55 (el pico) la fiesta no repite el
  // saltito de la cumbre: el frente ya lleva los cohetes del calendario. `fiesta`: el botón; `en`: cuándo se mide (ms
  // tras el clic: la subida de «Tú», 1.4 s, y el clímax, 10 s en un campamento y 5 s en una principal o el halving).
  // (Campamento 49) El pueblo se mueve 2: el panadero que cruza (6:00–7:00), la tortillera que palmea, la campana de las doce, la hamaca
  // de la siesta y las estrellitas de Nochebuena; cada uno en su capa (la campana, todo el día: +1 nodo en cada fecha; la abuela de la
  // ronda, con la que barre y con la pelota: +6 a +7 en los turnos de la mañana de escuela y de la tarde, aunque la ronda esté quieta).
  { caso: 'amanecer, el panadero cruza', dia: '2027-02-10', hora: 6.5, declara: 819 },
  { caso: 'mediodía, la campana', dia: '2027-02-10', hora: 12.02, declara: 818 },
  { caso: 'siesta, la hamaca se mece', dia: '2027-02-10', hora: 13.5, declara: 817 }, // (45) +1: el garrobo
  { caso: 'fiesta del hito, tarde', dia: '2026-11-25', hora: 16, declara: 870, fiesta: 'hito', en: 12_400 },
  { caso: 'fiesta del hito, noche de lluvia', dia: '2026-07-10', hora: 23, declara: 867, fiesta: 'hito', en: 12_400 },
  { caso: 'fiesta del hito, tarde de lluvia', dia: '2026-07-10', hora: 15, declara: 877, fiesta: 'hito', en: 12_400 },
  { caso: 'fiesta del hito, Nochebuena 23:55', dia: '2026-12-24', hora: 23.92, declara: 977, frente: 28, fiesta: 'hito', en: 12_400 },
  { caso: 'fiesta de etapa con sello', dia: '2026-11-25', hora: 10, declara: 849, fiesta: 'etapa', en: 7400 },
  { caso: 'fiesta del halving', dia: '2026-11-25', hora: 10, declara: 829, fiesta: 'halving', en: 5800 },
  // (Campamento 47) +4 en cada fecha: los ojos cerrados de los osos (un trazo por oso, escondidos de día) y sus zetas.
  // (Campamento 48) +8 en cada fecha (+11 en la lluviosa): la carpa y la mochila de espaldas de «Tú» (escondidas según la hora), su equipo y sus parches (mil compras) y el capote.
  // (Campamento 47) Los osos de la cumbre: sus poses quietas (cielo.js: CUMBRE, 0 animaciones) y lo plantado a su lado según el día
  // (fuera de su grupo). Los ojos cerrados van siempre dibujados (+3 nodos en los osos y en cada fecha); las zetas, +1 si caben.
  { caso: 'madrugada, duermen', dia: '2026-11-25', hora: 23, declara: 812 },
  { caso: 'atardecer, de espaldas', dia: '2026-11-25', hora: 17.75, declara: 824 },
  { caso: 'abril, sombrero', dia: '2027-04-14', hora: 12, declara: 819 },
  { caso: 'diciembre, oso de nieve', dia: '2026-12-10', hora: 12, declara: 870 },
  // (Campamento 42) Las fiestas del resto del año: el momento grande de cada fecha (otro reparto de los mismos trazos; lo que sube es
  // algún tono que un día cualquiera no sale a esa hora: la brasa de los farolitos y las velitas, el rojo de la piñata).
  { caso: 'Ramos, misa con palmas', dia: '2026-03-29', hora: 8.5, declara: 814 },
  { caso: 'Viernes Santo, en silencio', dia: '2027-03-26', hora: 12, declara: 811 },
  { caso: 'Sábado de Gloria, al lago', dia: '2026-04-04', hora: 9, declara: 813 },
  { caso: '10 de mayo, las mañanitas', dia: '2026-05-10', hora: 6, declara: 813 },
  { caso: '10 de mayo, la mesa', dia: '2026-05-10', hora: 12.5, declara: 814 },
  { caso: 'Día del Padre, en hombros', dia: '2026-06-17', hora: 15.5, declara: 814 },
  { caso: '6 de agosto, la misa', dia: '2026-08-06', hora: 8.5, declara: 846 },
  { caso: '5 de agosto, la plaza de noche', dia: '2026-08-05', hora: 19, declara: 846 },
  { caso: '14 sept, los farolitos', dia: '2026-09-14', hora: 19, declara: 845 },
  { caso: '15 sept, se guarda la bandera', dia: '2026-09-15', hora: 16, declara: 847 },
  { caso: 'Día del Niño, la piñata', dia: '2026-10-01', hora: 15.5, declara: 826 },
  { caso: '2 nov, las velitas', dia: '2026-11-02', hora: 19, declara: 824 },
  { caso: '12 dic, los inditos', dia: '2026-12-12', hora: 8, declara: 863 },
  { caso: '14 sept, la banderita', dia: '2026-09-14', hora: 15, declara: 854 },
  // (Campamento 43) Las temporadas del pueblo: un momento de cada una (otro reparto de los mismos trazos). La milpa con su gente, +2
  // frente a la base: el milpero trae a esa hora dos tonos que el pueblo no tenía (su camisa de maíz y la manita sobre su herramienta).
  { caso: 'marzo, los mangos', dia: '2027-03-14', hora: 10.5, declara: 812 },
  { caso: 'mayo, la siembra', dia: '2026-05-06', hora: 8.5, declara: 853 },
  { caso: 'agosto, la dobla', dia: '2026-08-19', hora: 8.5, declara: 854 },
  { caso: 'noviembre, la tapisca', dia: '2026-11-04', hora: 8.5, declara: 839 },
  { caso: 'julio, la atolada', dia: '2026-07-18', hora: 17, declara: 818 },
  { caso: 'diciembre, la posada', dia: '2026-12-18', hora: 19, declara: 864 },
  { caso: 'domingo, la mejenga', dia: '2027-02-14', hora: 15.5, declara: 815 },
  { caso: 'luna llena, los cuentos', dia: '2027-02-20', hora: 20.25, declara: 811 },
  // (Campamento 45) Los animales de aquí: el de la hora en la plaza (el gallo, el garrobo de la seca, los zanates y, una noche de cada
  // cuatro, el tecolote), en los trazos de los vecinos; y las poses quietas del valle (las vacas echadas a mediodía, la garza en la otra
  // orilla por la tarde: 0 nodos, ya estaban dibujadas). Lo que sube es algún tono que el pueblo no tenía a esa hora.
  { caso: 'el gallo', dia: '2026-11-25', hora: 5.5, declara: 828 },
  { caso: 'el garrobo, vacas echadas', dia: '2027-02-10', hora: 13, declara: 817 },
  { caso: 'los zanates', dia: '2026-11-25', hora: 18, declara: 824 },
  { caso: 'el tecolote', dia: '2026-11-28', hora: 23, declara: 814 }, // +2 frente a una noche sin él: su trazo oscuro y sus ojos
  { caso: 'el gallo en Navidad', dia: '2026-12-10', hora: 5.5, declara: 871 },
  // (Campamento 46) Luna y estrellas: la figura del cielo de aquí (las mismas 46 estrellas recolocadas: 0 nodos), el conejo (los mismos
  // mares: 0), el lucero (un trazo: **+1 en cada fecha de este banco**, que es lo único que sube; solo los días que lo hay, casi todo el
  // año), la luna cobriza de un eclipse (un color: 0) y las Gemínidas (la cara que mira arriba, dibujada esas noches: +2 en los osos).
  { caso: 'el Alacrán', dia: '2026-07-15', hora: 21, declara: 814 },
  { caso: 'el lucero de la tarde', dia: '2026-08-15', hora: 18, declara: 817 },
  { caso: 'el lucero de la mañana', dia: '2026-11-26', hora: 5.25, declara: 828 },
  { caso: 'Gemínidas, miran arriba', dia: '2026-12-14', hora: 23, declara: 859 },
  { caso: 'eclipse de luna', dia: '2029-06-25', hora: 21, declara: 836 },
  // (Campamento 44) Lluvia y verano. La llovizna (la nube cargada y sus 20 gotas) se poda los días que no llueve por la tarde, también los
  // de la seca (antes se escondía con el CSS): **−23 nodos en cada fecha** sin lluvia. La tarde de lluvia (paraguas, hoja de huerta, los
  // oseznos bajo el corredor) es otro reparto de los mismos trazos y sin la pelota (−2 animaciones); los charcos, en los tonos de siempre;
  // la canícula, sin llovizna (−23 nodos y −20 animaciones); el cerco de la luna, solo CSS (0).
  { caso: 'tarde de lluvia, paraguas', dia: '2026-09-09', hora: 15.5, declara: 838 },
  { caso: 'al escampar, charcos', dia: '2026-09-09', hora: 18, declara: 841 },
  { caso: 'la canícula', dia: '2026-07-22', hora: 15.5, declara: 824 },
  { caso: 'el cerco de la luna', dia: '2026-09-22', hora: 21, declara: 837 },
  // (Campamento E) El ánimo del valle según la semana del precio (`animo`: lo fuerza `libro.animo`): otro reparto de los mismos vecinos
  // (sentados de dos en dos si baja; la ropa tendida y vecinos de paseo si sube). Un miércoles de escuela por la mañana (la que barre ya
  // acabó: 10:00) y en la tarde de la pelota; los cinco estados, cada uno con lo suyo declarado (un tono de más es un trazo más).
  ...['calma', 'fresco', 'abrigo', 'aire', 'plaza'].flatMap((animo) => [
    { caso: `ánimo ${animo}, mañana`, dia: '2027-02-10', hora: 10, animo, declara: 851 },
    { caso: `ánimo ${animo}, pelota`, dia: '2027-02-10', hora: 15.5, animo, declara: 853 },
  ]),
];
/** (Campamento 39, idea 131) Las pantallas anchas (escritorio 1440×900 y tele 2560×1440): solo los nodos, frente a `TOPES_ANCHO`. */
const ANCHOS = [[1440, 900], [1920, 1080], [2560, 1440]].flatMap(([w, h]) => [
  { caso: `Nochebuena ${w}`, dia: '2026-12-24', hora: 21, w, h },
  { caso: `31 dic ${w}`, dia: '2026-12-31', hora: 23.92, w, h },
  // (42) los farolitos del 14 de septiembre y las velitas del 2 de noviembre, de noche
  { caso: `14 sept ${w}`, dia: '2026-09-14', hora: 19, w, h },
  { caso: `2 nov ${w}`, dia: '2026-11-02', hora: 19, w, h },
  // (43) la posada de diciembre, la mejenga del domingo y la siembra (la milpa, donde cabe)
  { caso: `posada ${w}`, dia: '2026-12-18', hora: 19, w, h },
  { caso: `mejenga ${w}`, dia: '2027-02-14', hora: 15.5, w, h },
  { caso: `siembra ${w}`, dia: '2026-05-06', hora: 8.5, w, h },
  // (45) el tecolote (la noche) y el garrobo con las vacas echadas (la siesta)
  { caso: `tecolote ${w}`, dia: '2026-11-28', hora: 23, w, h },
  { caso: `garrobo ${w}`, dia: '2027-02-10', hora: 13, w, h },
  // (46) las Gemínidas (la cumbre mira arriba) y el lucero de la tarde
  { caso: `Gemínidas ${w}`, dia: '2026-12-14', hora: 23, w, h },
  { caso: `lucero ${w}`, dia: '2026-08-15', hora: 18, w, h },
  // (44) la tarde de lluvia, los charcos y el cerco de la luna
  { caso: `lluvia ${w}`, dia: '2026-09-09', hora: 15.5, w, h },
  { caso: `charcos ${w}`, dia: '2026-09-09', hora: 18, w, h },
  { caso: `cerco ${w}`, dia: '2026-09-22', hora: 21, w, h },
  // (E) con el valle en «plaza» y en «abrigo» (los que más vecinos sacan), un día cualquiera por la mañana
  { caso: `ánimo plaza ${w}`, dia: '2027-02-10', hora: 10, w, h, animo: 'plaza' },
  { caso: `ánimo abrigo ${w}`, dia: '2027-02-10', hora: 10, w, h, animo: 'abrigo' },
]);
/**
 * (Campamento 49, idea 275) Los principales a la vez en pantallas anchas, con «todos»: hasta dos (uno del pueblo y la cabina del
 * teleférico, lejos de la plaza); en el teléfono, uno. Se cuentan las capas que se mueven de verdad (la abuela de la ronda no: va en
 * secuencia con el actor, nunca a la vez), y cada capa sigue con su presupuesto.
 */
const PRINCIPALES = { tel: 1, ancho: 2 };
const DOS_FOCOS = [[390, 664], [1440, 900], [1920, 1080], [2560, 1440]].flatMap(([w, h]) => [
  { caso: `dos focos ${w}, barre`, dia: '2027-02-10', hora: 7.5, w, h },
  { caso: `dos focos ${w}, campana`, dia: '2027-02-10', hora: 12.02, w, h },
  { caso: `dos focos ${w}, hamaca`, dia: '2027-02-10', hora: 13.5, w, h },
]);
/**
 * (Campamento D) La pantalla grande (#tv) a 1920×1080, el monitor de la casa: sus momentos más cargados mientras está despierta (de 23:00
 * a 5:00 duerme y la escena se pausa). Nodos frente a `TOPES_ANCHO` y animaciones a la vista (con «todos») frente a `TOPE_TV`.
 */
const TELE = [
  { caso: 'tele día', dia: '2026-11-25', hora: 12 },
  { caso: 'tele anochecer', dia: '2026-11-25', hora: 19 },
  { caso: 'tele noche', dia: '2026-11-25', hora: 21 },
  { caso: 'tele tarde de lluvia', dia: '2026-07-10', hora: 15 },
  { caso: 'tele noche de lluvia', dia: '2026-07-10', hora: 21 },
  { caso: 'tele Nochebuena, cena', dia: '2026-12-24', hora: 19 },
  { caso: 'tele Nochebuena', dia: '2026-12-24', hora: 21 },
  { caso: 'tele día, ánimo plaza', dia: '2027-02-10', hora: 10, animo: 'plaza' }, // (E)
  { caso: 'tele tarde, ánimo abrigo', dia: '2027-02-10', hora: 15.5, animo: 'abrigo' },
  { caso: 'tele 14 sept, los farolitos', dia: '2026-09-14', hora: 19 }, // (42)
  { caso: 'tele Día del Niño, la piñata', dia: '2026-10-01', hora: 15.5 },
  { caso: 'tele posada', dia: '2026-12-18', hora: 19 }, // (43)
  { caso: 'tele mejenga', dia: '2027-02-14', hora: 15.5 },
  { caso: 'tele garrobo', dia: '2027-02-10', hora: 13 }, // (45)
  { caso: 'tele zanates', dia: '2026-11-25', hora: 18 },
  { caso: 'tele lucero de la tarde', dia: '2026-08-15', hora: 18 }, // (46)
  { caso: 'tele charcos', dia: '2026-09-09', hora: 18 }, // (44)
  { caso: 'tele cerco de la luna', dia: '2026-09-22', hora: 21 },
];

const puertoLibre = () => new Promise((res) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
async function servidor(escenario) {
  const port = await puertoLibre();
  const hijo = spawn(PYTHON, [path.join(AQUI, 'servidor_prueba.py'), String(port), escenario], { stdio: 'ignore', env: { ...process.env, FECHA_PRUEBA: process.env.FECHA_PRUEBA || '2026-11-20' } });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${url}/healthz`)).ok) return { url, parar: () => hijo.kill() }; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  hijo.kill();
  throw new Error(`no arrancó el escenario ${escenario}`);
}

async function abrir(navegador, srv, dia, hora, efectos, ancho = null, tv = false, animo = null) {
  const ctx = ancho ? await navegador.newContext({ viewport: { width: ancho[0], height: ancho[1] } }) : await navegador.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 664 } });
  const p = await ctx.newPage();
  await p.addInitScript(([d, h, e, a]) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.efectos', e); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.madrugada', '0'); if (a) localStorage.setItem('libro.animo', a); } catch { /* sin almacenamiento */ } }, [dia, hora, efectos, animo]);
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', 'Daf3r');
  await p.fill('input[autocomplete="current-password"]', 'clave-de-prueba-12');
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
  if (tv) { await p.goto(`${srv.url}/#tv`); await p.reload({ waitUntil: 'networkidle' }); } // (D) la pantalla grande
  await p.waitForTimeout(4000); // la subida de «Tú», las letras y los osos ya en su sitio
  for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.evaluate(() => window.scrollTo(0, 0));
  return { ctx, p };
}

/** Nodos (como los cuenta test_ui) y animaciones a la vista por capa. */
const medir = (p) => p.evaluate(() => {
  const host = document.getElementById('montana');
  const valle = [...host.querySelectorAll('svg *')].filter((e) => !e.closest('defs') && (e.closest('[id^="m-v-"]') || [...e.classList].some((c) => c.startsWith('v-')) || e.matches('.lago-playa, .lago-nivel'))).length;
  const osos = host.querySelector('#m-osos') ? host.querySelector('#m-osos').querySelectorAll('*').length + 1 : 0;
  const escondido = (e) => { for (let x = e; x && x !== host; x = x.parentElement) if (getComputedStyle(x).display === 'none') return true; return false; };
  const anim = {}, ambientales = new Set();
  // (Campamento 51) Cada capa propia (un <svg> pequeño, hermano del principal: la cabina, una gallina, el perro, el vecino del turno, un
  // ambiental) cuenta por separado: el presupuesto es de 3 por capa, no de 3 entre todas. Su clave: `propia:` y su primera clase propia.
  const GENERICAS = new Set(['', 'efecto-ambiente', 'v-capa-amb', 'v-capa-animal', 'v-capa-vecino', 'fiesta-capa']);
  const propia = (svg) => `propia:${(svg?.getAttribute('class') ?? '?').split(/\s+/).filter((k) => !GENERICAS.has(k)).join('.') || '?'}`;
  for (const a of document.getAnimations()) {
    const t = a.effect?.target;
    if (!t || !host.contains(t) || a.playState !== 'running' || escondido(t)) continue;
    const svg = t.closest('svg'), c = svg?.getAttribute('class') ?? '';
    if (svg?.classList.contains('v-capa-amb')) ambientales.add(svg); // (51) el humo, en la pausa de sus bocanadas, sigue siendo un ambiental
    if (Number(getComputedStyle(t).opacity) === 0) continue;
    const capa = !svg || svg.parentElement !== host ? propia(svg) : /\bfrente\b/.test(c) ? 'frente' : (c.match(/par-\w+/)?.[0] ?? (svg === host.querySelector(':scope > svg') ? 'principal' : propia(svg)));
    anim[capa] = (anim[capa] ?? 0) + 1;
  }
  // (49, 275) Los principales que se mueven: cada capa de actor cuenta uno (las tres gallinas, una; el perro que anda, uno).
  const principales = new Set();
  for (const a of document.getAnimations()) {
    const t = a.effect?.target, svg = t?.closest?.('svg');
    if (!t || !host.contains(t) || a.playState !== 'running' || escondido(t) || !svg || svg.parentElement !== host || svg.classList.contains('v-ronda')) continue;
    const c = svg.classList;
    const id = c.contains('tele-cabina') ? 'teleferico' : c.contains('v-capa-gallina') ? 'gallinas' : c.contains('v-capa-perro') ? 'perro' : c.contains('v-capa-vecino') || c.contains('v-capa-campana') || c.contains('v-capa-camina') ? [...c].find((k) => k.startsWith('v-actor-') || k === 'v-capa-campana' || k === 'v-capa-camina') : null;
    if (id) principales.add(id);
  }
  return { escena: host.querySelectorAll('*').length, valle, osos, anim, ambientales: ambientales.size, principales: [...principales] };
});

/** Lo blando: crear la escena (CPU 4×) y fotogramas en reposo con la montaña a la vista (CPU 4×), mediana de 3. */
async function blando(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await p.evaluate(async () => {
    const host = document.getElementById('montana'), html = host.innerHTML;
    const crear = () => { const d = document.createElement('div'); d.className = 'montana'; d.style.cssText = 'position:absolute;left:-9999px;width:390px;height:600px'; document.body.append(d); const t0 = performance.now(); for (let k = 0; k < 5; k++) { d.innerHTML = html; d.getBoundingClientRect(); } const ms = (performance.now() - t0) / 5; d.remove(); return ms; };
    const fps = () => new Promise((res) => { const t = []; const f = (x) => { t.push(x); if (x - t[0] < 2000) requestAnimationFrame(f); else res((t.length - 1) / ((t.at(-1) - t[0]) / 1000)); }; requestAnimationFrame(f); });
    const med = (xs) => xs.sort((a, b) => a - b)[1];
    const c = [crear(), crear(), crear()], f = [await fps(), await fps(), await fps()];
    return { crearMs: Math.round(med(c) * 10) / 10, fps: Math.round(med(f) * 10) / 10 };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return r;
}

/**
 * (Campamento 51, idea 225) El mapa del día del director (cielo.js: `mapaDelDia`): lo que cada tramo declara que pone en capas pequeñas.
 * Se lee para todo un año (teléfono y pantalla ancha) y falla si un tramo se pasa: más de tres ambientales o una capa con más animaciones
 * que las de su presupuesto. En cada caso medido, los ambientales que se mueven deben ser los que el mapa declara a esa hora.
 */
function cargarCielo() {
  const raiz = { dataset: {}, toggleAttribute() {}, style: { setProperty() {} } };
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, setInterval() {}, Intl, Date, Math, Number, Object };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(AQUI, '..', 'app', 'static', 'cielo.js'), 'utf8'), ctx);
  return ctx.window.libroCielo;
}
const CIELO = cargarCielo();
const fallosMapa = [];
if (CIELO.mapaDelDia) {
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 864e5) {
    const f = new Date(t).toISOString().slice(0, 10);
    for (const ancho of [false, true]) for (const tr of CIELO.mapaDelDia(f, ancho)) {
      if (tr.capasAmb > AMBIENTALES) fallosMapa.push(`mapa ${f} ${tr.desde.toFixed(2)} h${ancho ? ' (ancho)' : ''}: ${tr.capasAmb} ambientales > ${AMBIENTALES}`);
      if (tr.cumbre && !CIELO.cumbre?.some((c) => c.id === tr.cumbre && c.pesa.anim === 0)) fallosMapa.push(`mapa ${f} ${tr.desde.toFixed(2)} h: la pose de la cumbre «${tr.cumbre}» no está declarada sin animaciones`); // (47)
      for (const id of (tr.tu || '').split(' ').filter(Boolean)) if (!CIELO.tu?.some((t) => t.id === id && t.pesa.anim === 0 && t.pesa.capas === 0)) fallosMapa.push(`mapa ${f} ${tr.desde.toFixed(2)} h: la pose de «Tú» «${id}» no está declarada sin capas ni animaciones`); // (48)
      if (tr.anim > PRESUPUESTO.propia) fallosMapa.push(`mapa ${f} ${tr.desde.toFixed(2)} h: una capa con ${tr.anim} animaciones > ${PRESUPUESTO.propia}`);
    }
  }
}
/** Los ambientales que el mapa declara en el teléfono para ese momento. */
const ambientalesDeclarados = (dia, hora) => (CIELO.mapaDelDia ? CIELO.mapaDelDia(dia).findLast((x) => x.desde <= hora)?.capasAmb ?? 0 : 0);

const navegador = await chromium.launch();
const srv = await servidor('mil');
const filas = [], fallos = [...fallosMapa];
try {
  // (59) `SOLO=texto`: solo los casos cuyo nombre lo lleva (para medir uno a mano; el CI los corre todos).
  for (const { caso: nombre, dia, hora, declara, frente, fiesta, en, animo } of CASOS.filter((c) => !process.env.SOLO || c.caso.includes(process.env.SOLO))) {
    const pres = { ...PRESUPUESTO, ...(frente ? { frente } : {}) };
    // (59) La fiesta: se lanza con «Probar la celebración» y se mide en su clímax.
    const festejar = async (p) => { if (!fiesta) return; await p.evaluate((f) => document.querySelector(`[data-previa="${f}"]`).click(), fiesta); await p.waitForTimeout(en); };
    let { ctx, p } = await abrir(navegador, srv, dia, hora, 'esenciales', null, false, animo);
    await festejar(p);
    const n = await medir(p);
    await ctx.close();
    ({ ctx, p } = await abrir(navegador, srv, dia, hora, 'todos', null, false, animo));
    await festejar(p);
    const t = await medir(p);
    if (fiesta) n.escena = Math.max(n.escena, t.escena); // con «todos» la fiesta lleva más piezas (los farolitos y todos los cohetes)
    const b = RAPIDO || fiesta ? {} : await blando(ctx, p);
    await ctx.close();
    const total = Object.values(t.anim).reduce((a, x) => a + x, 0);
    filas.push({ caso: nombre, escena: n.escena, valle: n.valle, osos: n.osos, escenaTodos: t.escena, animaciones: t.anim, ambientales: t.ambientales, total, ...b });
    for (const k of ['escena', 'valle', 'osos']) if (n[k] > TOPES[k]) fallos.push(`${nombre}: ${k} ${n[k]} > ${TOPES[k]}`);
    if (declara != null && n.escena > declara + 6) fallos.push(`${nombre}: la escena pesa ${n.escena} nodos y la fecha declara ${declara} (+6)`);
    for (const [capa, x] of Object.entries(t.anim)) if (x > (pres[capa] ?? pres.propia)) fallos.push(`${nombre}: ${x} animaciones a la vista en «${capa}» > ${pres[capa] ?? pres.propia}`);
    if (t.ambientales > AMBIENTALES) fallos.push(`${nombre}: ${t.ambientales} ambientales moviéndose a la vez > ${AMBIENTALES}`);
    if (t.ambientales !== (fiesta ? 0 : ambientalesDeclarados(dia, hora))) fallos.push(`${nombre}: se mueven ${t.ambientales} ambientales y el mapa del día declara ${ambientalesDeclarados(dia, hora)}`);
    if (total > PRESUPUESTO.total) fallos.push(`${nombre}: ${total} animaciones a la vista > ${PRESUPUESTO.total}`);
  }
  for (const { caso: nombre, dia, hora, w, h, animo } of ANCHOS.filter((c) => !process.env.SOLO || c.caso.includes(process.env.SOLO))) {
    const { ctx, p } = await abrir(navegador, srv, dia, hora, 'esenciales', [w, h], false, animo);
    const n = await medir(p);
    await ctx.close();
    filas.push({ caso: nombre, escena: n.escena, valle: n.valle, osos: n.osos, animaciones: {}, total: 0, ancho: true });
    if (n.escena > TOPES_ANCHO[w]) fallos.push(`${nombre}: escena ${n.escena} > ${TOPES_ANCHO[w]} (tope de pantallas anchas)`);
  }
  for (const { caso: nombre, dia, hora, w, h } of DOS_FOCOS.filter((c) => !process.env.SOLO || c.caso.includes(process.env.SOLO))) {
    const { ctx, p } = await abrir(navegador, srv, dia, hora, 'todos', [w, h]);
    const t = await medir(p);
    await ctx.close();
    const total = Object.values(t.anim).reduce((a, x) => a + x, 0), tope = w >= 1100 ? PRINCIPALES.ancho : PRINCIPALES.tel;
    filas.push({ caso: nombre, escena: t.escena, valle: t.valle, osos: t.osos, animaciones: t.anim, total, principales: t.principales, focos: true });
    if (t.principales.length > tope) fallos.push(`${nombre}: ${t.principales.length} principales a la vez (${t.principales.join(', ')}) > ${tope}`);
    if (w >= 1100 && t.principales.length < 2) fallos.push(`${nombre}: en pantalla ancha se esperaban dos principales (${t.principales.join(', ')})`);
    if (t.escena > (TOPES_ANCHO[w] ?? TOPES.escena)) fallos.push(`${nombre}: escena ${t.escena}`);
    for (const [capa, x] of Object.entries(t.anim)) if (x > (PRESUPUESTO[capa] ?? PRESUPUESTO.propia)) fallos.push(`${nombre}: ${x} animaciones a la vista en «${capa}»`);
  }
  for (const { caso: nombre, dia, hora, animo } of TELE.filter((c) => !process.env.SOLO || c.caso.includes(process.env.SOLO))) {
    const { ctx, p } = await abrir(navegador, srv, dia, hora, 'todos', [1920, 1080], true, animo);
    const t = await medir(p);
    await ctx.close();
    const total = Object.values(t.anim).reduce((a, x) => a + x, 0);
    filas.push({ caso: nombre, escena: t.escena, valle: t.valle, osos: t.osos, animaciones: t.anim, total, tele: true });
    if (t.escena > TOPES_ANCHO[1920]) fallos.push(`${nombre}: escena ${t.escena} > ${TOPES_ANCHO[1920]}`);
    if (total > TOPE_TV) fallos.push(`${nombre}: ${total} animaciones a la vista > ${TOPE_TV} (tope de la pantalla grande)`);
  }
} finally {
  srv.parar();
  await navegador.close();
}
console.log('caso               escena  valle  osos  (con «todos»)  animaciones a la vista por capa                     crear (4×)  fps (4×)');
for (const f of filas) {
  const capas = Object.entries(f.animaciones).map(([k, v]) => `${k} ${v}`).join(' · ') + (f.ambientales ? ` (ambientales: ${f.ambientales})` : '');
  if (f.focos) { console.log(`${f.caso.padEnd(18)} ${String(f.escena).padStart(6)} ${String(f.valle).padStart(6)} ${String(f.osos).padStart(5)}   («todos»: principales ${f.principales.join(' + ') || '—'}; ${f.total} animaciones a la vista)`); continue; }
  if (f.tele) { console.log(`${f.caso.padEnd(18)} ${String(f.escena).padStart(6)} ${String(f.valle).padStart(6)} ${String(f.osos).padStart(5)}   (pantalla grande 1920×1080, «todos»: ${f.total} animaciones a la vista, tope ${TOPE_TV})`); continue; }
  if (f.ancho) { console.log(`${f.caso.padEnd(18)} ${String(f.escena).padStart(6)} ${String(f.valle).padStart(6)} ${String(f.osos).padStart(5)}   (pantalla ancha: solo nodos, tope ${TOPES_ANCHO[f.caso.split(' ').at(-1)]})`); continue; }
  console.log(`${f.caso.padEnd(18)} ${String(f.escena).padStart(6)} ${String(f.valle).padStart(6)} ${String(f.osos).padStart(5)} ${String(f.escenaTodos).padStart(14)}  ${`${f.total}: ${capas}`.padEnd(50)} ${f.crearMs != null ? `${f.crearMs} ms`.padStart(10) : ''} ${f.fps != null ? String(f.fps).padStart(9) : ''}`);
}
if (process.env.BANCO_JSON) fs.writeFileSync(process.env.BANCO_JSON, JSON.stringify(filas, null, 1));
if (fallos.length) {
  console.log(`\nFALLA (${fallos.length}):\n- ${fallos.join('\n- ')}`);
  process.exit(1);
}
console.log('\nOK: dentro de los topes de nodos y del presupuesto de animaciones.');
