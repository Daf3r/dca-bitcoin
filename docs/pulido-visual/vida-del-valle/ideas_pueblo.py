# Tercera ronda (pedido del dueño): el Pueblo de los Osos. Todos los vecinos del valle son osos polares, con su día, su semana y su
# año. Lo ejecuta hacer_galeria.py después de ideas_vida.py (mismas funciones y listas). Las ideas van desde la 100; las 1–54 no cambian
# de número. Maquetas: capturas de la app de verdad con un prototipo sin commitear (scratchpad/pueblo-osos/prototipo-pueblo-osos.patch).
PO = pathlib.Path('/tmp/claude-0/-home-user-dca-bitcoin/a4559b60-eb1b-544b-95bf-bb999d91cf6d/scratchpad/pueblo-osos')
PCAP = PO / 'cap'
PSV = json.loads((PO / 'pueblo-svgs.json').read_text())
for _k, _v in PSV['svgs'].items():
    SVGS['vp-' + _k] = _v


def pimg(k, archivo, alt, ancho=780, alto=False, pie=None, recorte=None):
    img(k, str(PCAP / archivo), alt, ancho=ancho, alto=alto, pie=pie, recorte=recorte)


# ---------------------------------------------------------------- maquetas (el prototipo corriendo en la app; hora y día con libro.hora y libro.dia)
pimg('po-antes', 'f-antes-tel-tarde-pueblo-3x.png', 'El pueblo de hoy: la gente son siluetas oscuras sin cara, junto a la iglesia y las casas.', pie='HOY · gente en silueta (390 px, ampliado)')
pimg('po-tarde', 'f-tel-tarde-pueblo-3x.png', 'El mismo pueblo con osos: el de las minutas junto a la iglesia, cinco oseznos con una pelota en la plaza, la abuela en su corredor y una vecina en la calle.', pie='CON OSOS · un miércoles a las 16:20')
pimg('po-tel', 'f-tel-tarde.png', 'La app entera a 390×844 por la tarde: el pueblo de osos al pie de la montaña y los tres peluches en la cumbre.', ancho=520, alto=True, pie='390×844 · tarde · tamaño real')
pimg('po-tel-noche', 'f-tel-noche.png', 'La app entera a 390×844 de noche: la pupusera con su brasa y un charco de luz, la iglesia encendida.', ancho=520, alto=True, pie='390×844 · 19:30')
pimg('po-tel-nb', 'f-tel-nochebuena.png', 'La app entera a 390×844 en Nochebuena: el pino, el nacimiento y los osos alrededor.', ancho=520, alto=True, pie='390×844 · Nochebuena')
pimg('po-tel-claro', 'f-tel-claro-tarde.png', 'La app en tema claro a 390×844 con el pueblo de osos.', ancho=520, alto=True, pie='390×844 · tema claro')
pimg('po-esc', 'f-esc-tarde.png', 'La app en escritorio a 1440 px por la tarde, con el pueblo de osos en la loma de la izquierda.', ancho=900, pie='1440×900 · tarde')
pimg('po-esc-1x', 'f-esc-tarde-pueblo-1x.png', 'El pueblo en escritorio a tamaño real: los osos se leen sin ampliar.', ancho=880, pie='1440 px · el pueblo a tamaño real (1×)')
pimg('po-esc-noche', 'f-esc-noche.png', 'Escritorio de noche: la pupusera, la iglesia y los faroles encendidos.', ancho=900, pie='1440×900 · 19:30')
pimg('po-esc-nb', 'f-esc-nochebuena.png', 'Escritorio en Nochebuena.', ancho=900, pie='1440×900 · Nochebuena')
pimg('po-esc-mercado', 'f-esc-mercado-pueblo-3x.png', 'Escritorio un sábado por la mañana: vendedoras con su canasto en la plaza.', ancho=880, pie='1440 px · sábado 9:30 (ampliado)')
pimg('po-tab', 'f-tab-tarde-pueblo-1x.png', 'El pueblo en una tablet de 768 px, a tamaño real.', ancho=580, pie='768 px · tamaño real')
pimg('po-320', 'f-t320-tarde-pueblo-3x.png', 'A 320 px el pueblo es más chico y «Anotar» tapa parte de la plaza, como hoy; los osos que se ven se leen.', ancho=700, pie='320×568 (ampliado)')
pimg('po-1x', 's1-1x-ampliado.png', 'Prueba de lectura a 1× sin suavizar, ampliada tres veces: a 390 px por la tarde y de noche, a 320 px y a 1440 px. Cabeza, orejas y nariz se distinguen en todos.', ancho=860, pie='La prueba dura: 1× ampliado sin suavizar (390, 320, 390 de noche, 1440)')
pimg('po-amanece', 'f-tel-amanece-pueblo-3x.png', 'Al amanecer: uno se estira en su corredor, el panadero pasa en bicicleta con su canasto y un pescador en la orilla del lago.', pie='Amanece · 6:10')
pimg('po-manana', 'f-tel-manana-pueblo-3x.png', 'Por la mañana entre semana: la vendedora con su canasto, la abuela, el campesino con sombrero y la que barre. Sin oseznos: están en la escuela.', pie='Mañana de miércoles · 9:00')
pimg('po-misa', 'f-tel-misa-pueblo-3x.png', 'Domingo por la mañana: osos de espaldas en el atrio, de camino a misa, y el padre a la puerta.', pie='Domingo · 8:30')
pimg('po-mercado', 'f-tel-mercado-pueblo-3x.png', 'Sábado por la mañana: dos vendedoras con canasto, más vecinos en la plaza, el de las minutas y el pescador.', pie='Sábado · 9:30')
pimg('po-siesta', 'f-tel-siesta-pueblo-3x.png', 'Mediodía: casi nadie; uno duerme la siesta con el sombrero en la cara y la abuela sigue en su corredor.', pie='Mediodía · 12:30')
pimg('po-noche', 'f-tel-noche-pueblo-3x.png', 'Al anochecer: la pupusera detrás de su plancha con la brasa encendida y dos esperando.', pie='Anochece · 19:30')
pimg('po-desfile', 'f-tel-desfile-pueblo-3x.png', '15 de septiembre: el abanderado, el del bombo y los vecinos en la plaza embanderada.', pie='15 de septiembre · 9:00')
pimg('po-nb', 'f-tel-nochebuena-pueblo-3x.png', 'Nochebuena: osos frente al nacimiento de siempre, oseznos con estrellitas junto al pino.', pie='Nochebuena · 21:00')
pimg('po-posada', 'f-tel-posada-dia-pueblo-3x.png', 'Un día de diciembre: el pueblo con su pino y el nacimiento, y los osos en lo suyo.', pie='13 de diciembre · 10:00')
pimg('po-duerme', 'f-tel-duerme-pueblo-3x.png', 'De madrugada: nadie en la calle; solo los faroles, la iglesia y las ventanas de siempre.', pie='Madrugada · 2:00')
pimg('po-login', 'f-login-tel.png', 'La entrada a 390×844: el mismo pueblo de osos según la hora, sin ningún dato de nadie.', ancho=520, alto=True, pie='La entrada · 390×844')
pimg('po-login-esc', 'f-login-esc.png', 'La entrada en escritorio un sábado por la mañana.', ancho=900, pie='La entrada · 1440×900')

# ---------------------------------------------------------------- los campamentos nuevos (después del 34)
i_desp = next(k for k, c in enumerate(CAMPS) if c['id'] == 'despues')
CAMPS[i_desp:i_desp] = [
    {'id': 'c35', 'k': '35', 'camp': 'Campamento 35', 't': 'El Pueblo de los Osos', 'ids': [100, 101, 102, 103, 104, 105, 106, 107], 'tipo': 'vida',
     'dep': 'el campamento 30 (la 18 y la 21). Medido: cabe hoy sin subir el tope (1063 → 1071 de 1100 la noche más cargada), pero comparte ese margen con «Tú» como oso.',
     'orden': 'Toda la gente del valle pasa a ser osos polares, en «talla pueblo», con ropa de aquí y un turno para cada hora. +8 nodos por todo el pueblo. Reemplaza al osito de visita (43–44).',
     'why': 'Lo que pidió el dueño: que los habitantes sean osos. No es un oso de visita entre siluetas: es el pueblo entero. Los de la cumbre son los peluches de la familia; los del valle, los vecinos. Mismo pelo blanco, otra talla, otra ropa, otra vida.',
     'riesgo': 'Medio: cambia lo decidido en el 22C (gente en silueta) y pide una excepción pequeña a «nada se redibuja al cambiar de hora» (solo los trazos de los vecinos, unas seis veces al día). El blanco frente a la iglesia encalada se resolvió con sombra propia y ropa de color; falta verlo en un iPhone.',
     'meta': 'Navegador · 1 PR · módulo nuevo arte-vecinos.js (prototipo: 18 KB; 5.9 KB comprimido) · «Qué hay de nuevo» · textoValle dice «osos»'},
    {'id': 'c36', 'k': '36', 'camp': 'Campamento 36', 't': 'El calendario del pueblo', 'ids': [108, 109, 110, 111, 112, 113], 'tipo': 'vida',
     'dep': 'el campamento 35 (la 100 y la 102).',
     'orden': 'El domingo a misa, el sábado más plaza, el 15 de septiembre el desfile, diciembre frente al nacimiento y las estrellitas de Nochebuena. Son turnos: 0 nodos más.',
     'why': 'Originalidad según el día, sin inventar costumbres: cada fecha es otro reparto de los mismos osos. Absorbe la misa (48) y el día de plaza (53) de la ronda anterior, ya con osos.',
     'riesgo': 'Bajo en nodos; medio en cultura: la misa y el padre son figuras religiosas dibujadas como osos (el nacimiento NO se toca). Lo dudoso está marcado para que lo diga la familia.',
     'meta': 'Navegador · 1 PR (puede ir con el 35) · pruebas con libro.dia y libro.hora'},
    {'id': 'c37', 'k': '37', 'camp': 'Campamento 37', 't': 'El pueblo se mueve', 'ids': [114, 115, 116, 117, 118, 119], 'tipo': 'vida',
     'dep': 'los campamentos 30 y 35. Comparte las franjas de data-mueve con las gallinas (49), el perro (50) y el teleférico (23).',
     'orden': 'Un vecino a la vez, en su propio <svg> pequeño: la que barre, el panadero que cruza, la pelota de los oseznos. Gestos de 2 poses, a saltos.',
     'why': 'El movimiento que pediste, donde es barato: una sola figura chica en su capa, solo transform, en su franja. El resto del pueblo cambia de sitio por turnos (un salto, no una animación).',
     'riesgo': 'Medio-alto: es lo único de todo esto que puede costar fotogramas en tu iPhone. Cada gesto se mide con el banco y con «Medir este aparato»; por debajo de 55 fps con la montaña a la vista, se quita.',
     'meta': 'Navegador · 1 PR · «Qué hay de nuevo» · necesita tu medida en el iPhone'},
    {'id': 'c38', 'k': '38', 'camp': 'Campamento 38', 't': 'Lo que cambia de la app de hoy', 'ids': [120, 121, 122, 123], 'tipo': 'vida',
     'dep': 'el campamento 35.',
     'orden': 'Tres cambios chicos a cosas que ya existen (el pescador del cayuco, la descripción para lectores de pantalla, la entrada) y el pueblo de la tele. Y mi criterio de lo que NO se toca.',
     'why': 'Para que el pueblo de osos sea coherente en toda la app sin perder lo salvadoreño: los osos son los habitantes; los animales, los volcanes, los árboles y las fiestas de aquí se quedan como están.',
     'riesgo': 'Bajo. Cada cambio cita dónde se decidió lo de hoy.',
     'meta': 'Navegador · va con el 35 o después'},
]

CAMBIA = ('cambia', 'Cambia algo que ya existe')
DUDOSO = ('regla', 'Dudoso: que lo diga la familia')


def cambia(hoy, pierde, donde):
    I[-1]['cambia'] = {'hoy': hoy, 'pierde': pierde, 'donde': donde}


# ---- Campamento 35 · El Pueblo de los Osos
idea(100, 'Los vecinos son osos: la «talla pueblo»', 'si', 'M', '+8 nodos por TODO el pueblo (medido: el trazo de la gente pasa a 9 trazos, uno por tono; mil compras en Nochebuena a 390×664: 1063 → 1071 de 1100). Quietos: 0 animaciones. El módulo del prototipo: 18 KB con comentarios (5.9 KB comprimido, medido).',
     'Cada persona del pueblo pasa a ser un oso polar de pie: cabezota redonda, dos orejitas, hocico de palma y nariz oscura, con su sombra propia del lado contrario al astro. Mide 15 px en el teléfono (un osezno, 9) y 24 en escritorio. Sin contornos, como todo.',
     'app/static/arte-vecinos.js (nuevo, funciones puras) y arte-pueblo.js: pueblo() deja de dibujar persona() y pone a los vecinos en los mismos sitios (atrio, corredores, calle, plaza).',
     'Porque el dueño lo pidió y porque funciona: a 1× sin suavizar se lee «oso» a 390, a 320 y a 1440 px (maqueta). El pueblo gana caras y color sin ganar ruido: siguen siendo 5 a 8 figuras.',
     'Un trazo por tono para todos: pelo, sombra, tres colores de ropa, palma, pelo de encima (orejas sobre el sombrero, manitas sobre lo que cargan) y rasgos. Los colores siguen a la hora con las variables del pueblo (--v-blanco, --v-luz); de noche la luna los deja pálidos, no grises. La ropa NO repite la de la familia (ni azul marino con parche ni mameluco celeste): verde, rojo teja y maíz.',
     'Blanco sobre la cal de la iglesia: se separan por la sombra propia, la ropa y la sombra de contacto, pero hay que verlo en tu iPhone a pleno sol. A 320 px «Anotar» tapa media plaza (como hoy). Las pruebas del 22C que cuentan «.v-gente» cambian.',
     'Sí: es el corazón del encargo, cuesta 8 nodos y no mueve nada.',
     imgs=['po-antes', 'po-tarde', 'po-1x', 'po-esc'], poses=['vp-_trio'], badges=[CAMBIA, QUIETO], requiere=[18, 21])
cambia('Siluetas oscuras de persona, sin cara: con sombrero, con canasta, con un niño; seis niños en la plaza. Un solo trazo (.v-gente).',
       'La discreción de la silueta: el pueblo llama más la atención (blanco y color donde había sombra). Y 8 nodos del margen.',
       'docs/campamentos/22c-valle-de-verdad.md («gente quieta en silueta»; «Gente y animales quietos»: lo de quietos se respeta aquí) y 22-valle-vivo.md. Pruebas: test_lib y test_ui del bloque 22C, y el tope de 300 del valle (hoy 221).')

idea(101, 'El reparto: oficios y gente de aquí', 'si', 'M', '0 nodos más (van en los mismos 9 trazos). Cada personaje, de 4 a 9 piezas dentro de esos trazos.',
     'Doce vecinos para empezar: el campesino con sombrero de palma, la vendedora con su canasto en la cabeza y su delantal, la abuela en su taburete del corredor con su rebozo, la que barre la acera, el vecino y la vecina, el osezno (y el osezno con el brazo arriba, que sostiene el hilo de la piscucha), el que se estira al amanecer, el de la siesta con el sombrero en la cara, la pupusera y el panadero en bicicleta.',
     'arte-vecinos.js: una tabla de personajes; cada uno, una lista de piezas en sus unidades.',
     'Un pueblo se reconoce por lo que hace su gente. Todo lo que cargan es de aquí y se lee a 15 px: sombrero, canasto, escoba, plancha, bicicleta.',
     'Personaje nuevo = unas líneas en la tabla y su prueba (sin style, sin NaN, piezas acotadas). Mira a la izquierda o a la derecha sin redibujarlo; la sombra propia sigue al astro, no a la mirada.',
     'Que no se vuelva un catálogo: en pantalla nunca hay más de 8. El taburete de la abuela y la escoba son lo más fino (1 px en el teléfono).',
     'Sí: sin reparto no hay pueblo.',
     poses=['vp-campesino', 'vp-vendedora', 'vp-abuela', 'vp-escoba', 'vp-vecino', 'vp-vecina', 'vp-osezno', 'vp-oseznoArriba', 'vp-estira', 'vp-siesta', 'vp-pupusera', 'vp-panadero'], badges=[QUIETO], requiere=[100])

idea(102, 'El pueblo tiene turnos: quién está según la hora', 'si', 'M', '0 nodos más. Un cambio de turno reescribe el «d» de 9 trazos (un repintado del dibujo grande, como cuando cielo.js cambia los colores); unas 6 veces al día. Sin medir en WebKit.',
     'Seis turnos al día: amanece (5–7: el que se estira, el panadero, la que barre), mañana (7–11:30), siesta (11:30–14: casi nadie), tarde (14–17:45: los oseznos en la plaza), anochece (17:45–22: la pupusera) y duerme (22–5: nadie). Con la app abierta, al cambiar de turno los vecinos cambian de sitio de un salto.',
     'arte-vecinos.js: turno(hora, día) y reparto(sitios, turno), puras y probadas en test_lib para cada media hora de un año (como «mueve»). montana.js los pinta; cielo.js avisa del cambio de turno.',
     'Es la «originalidad según la hora» sin una sola animación: el pueblo no es el mismo a las 6 que a las 4 de la tarde.',
     'Dos maneras. (A) La que propongo: se dibuja solo el turno de ahora y, al cambiar, se reescriben esos 9 trazos. (B) Dentro de la regla: se dibujan todos los turnos y el CSS enseña uno; cuesta unos 8 nodos por turno (6 turnos: +40), que hoy no caben.',
     'La (A) es una excepción a «nada se redibuja al cambiar de hora» (CLAUDE.md, «Escena y arte»): pequeña, acotada a un grupo y a seis veces al día, pero es una regla. La idea 19 de «Hacer sitio» ya abre la misma puerta para el día.',
     'Sí, con la (A): cero nodos y el pueblo vive. Si prefieres no tocar la regla, la (B) con solo tres turnos (día, tarde, noche: +16 nodos) tras «Hacer sitio».',
     imgs=['po-amanece', 'po-manana', 'po-siesta', 'po-tarde', 'po-noche', 'po-duerme'], badges=[REGLA, QUIETO], requiere=[100])

idea(103, 'De noche el pueblo duerme', 'si', 'S', '0 nodos (de 22:00 a 5:00 no se dibuja ningún vecino: la escena pesa 8 nodos menos).',
     'De 22:00 a 5:00 no hay nadie en la calle. Quedan los faroles, la iglesia y las ventanas encendidas de siempre (una por persona con cuenta, sin cambios). El perro sigue echado.',
     'El turno «duerme» de la 102.', 'Es lo más de oso y lo más de pueblo: de noche se duerme. Y de madrugada la escena queda más ligera, que es cuando el modo madrugada ya la atenúa.',
     'Nada que dibujar.', 'Las ventanas siguen contando personas con cuenta: no se enciende ni se apaga ninguna por los osos (privacidad).',
     'Sí: gratis y con sentido.', imgs=['po-duerme'], badges=[QUIETO], requiere=[102])

idea(104, 'Los oseznos: a la escuela por la mañana, a la plaza por la tarde', 'si', 'S', '0 nodos más · la pelota es una pieza dentro del trazo rojo.',
     'Los seis niños de la plaza pasan a ser oseznos. Entre semana por la mañana no están (están en la escuela); por la tarde salen cinco con una pelota; sábado y domingo, desde la mañana. En octubre y noviembre sostienen el hilo de su piscucha, como hoy.',
     'reparto(): la plaza. El hilo de la piscucha baja a la manita del osezno con el brazo arriba.',
     'Un pueblo sin niños a media mañana y lleno a las cuatro es un pueblo de verdad. Reemplaza a la 52 (niños jugando) sin su capa: quietos.',
     'El día de la semana sale de lib.hoyISO (El Salvador). Vacaciones (de mediados de noviembre a enero): todo el día.',
     'Hoy está decidido que «los niños están todo el año»: aquí faltan las mañanas de escuela. Las piscuchas siguen con los colores de siempre, no del avatar.',
     'Sí: es la diferencia entre un decorado y un pueblo.', imgs=['po-tarde', 'po-manana'], poses=['vp-osezno', 'vp-oseznoArriba'], badges=[CAMBIA, QUIETO], requiere=[102])
cambia('Seis niños en silueta en la plaza, todo el año y a toda hora; de octubre a noviembre con el hilo de la piscucha.',
       'Los niños ya no están siempre: las mañanas de lunes a viernes la plaza queda sin ellos (y sin hilo que baje a nadie: en octubre y noviembre el hilo bajaría a un poste de la plaza esas horas).',
       'docs/campamentos/22c-valle-de-verdad.md, «Decidido»: «los niños están todo el año y en octubre y noviembre sostienen las piscuchas».')

idea(105, 'La pupusera, al anochecer', 'si', 'S', '+1 nodo (la brasa) y un charco de luz más dentro del trazo de charcos que ya existe.',
     'De 17:45 a 22:00, una osa con delantal detrás de su plancha, la brasa encendida y tres pupusas encima; un vecino y un osezno esperan. Su luz cae en la calle como la de las puertas.',
     'reparto(): la calle, junto a la primera casa sin corredor.', 'Es la cena de aquí, y la app ya cuenta en pupusas. De noche el pueblo brilla «por lo público» (22C): esto es público.',
     'La brasa es un trazo propio que no sigue a la hora (como las ventanas). El humo del fogón que ya existe sale a sus horas; no se añade otro.',
     'Que nadie lea un negocio que «vende»: no hay rótulo ni precio; es una plancha y gente esperando.',
     'Sí: es la estampa de la noche.', imgs=['po-noche', 'po-esc-noche'], poses=['vp-pupusera'], badges=[QUIETO], requiere=[102])

idea(106, 'El panadero en bicicleta, al amanecer', 'si', 'S', '0 nodos más (quieto, en el turno de amanecer).',
     'De 5:00 a 7:00, un oso de perfil en su bicicleta con el canasto del pan atrás, parado en la calle.', 'reparto(): la calle.',
     'El pan francés que llega en bicicleta al amanecer es de aquí. Y es el único personaje de perfil: da variedad.',
     'Las ruedas son aros rellenos (sin stroke), en el trazo de rasgos.', 'Las ruedas miden 5 px en el teléfono: se leen como aros a 3× y como dos puntos a 1×. Que cruce la calle es la 116.',
     'Sí.', imgs=['po-amanece'], poses=['vp-panadero'], badges=[QUIETO], requiere=[102])

idea(107, 'Cuántos caben: el pueblo según la pantalla', 'si', 'S', '0 nodos (es una regla).',
     'En el teléfono, hasta 8 figuras (contando oseznos); en la tablet, 8; en escritorio, las mismas, un 50 % más grandes; en la tele, las mismas. A 320×568 y a 390×664 «Anotar» tapa parte de la plaza, como hoy. El número depende solo del tamaño de la pantalla: nunca de cuántas cuentas hay ni de las compras.',
     'reparto(…, n).', 'Más de ocho a 15 px es una mancha; y un pueblo cuyo tamaño dijera algo de la familia rompería la privacidad.',
     'Los sitios salen de las casas que caben (sitiosPueblo): si una casa no cabe, su vecino no sale.', 'Si un día se quiere «un oso por persona»: no. Las ventanas ya cuentan personas; los osos no cuentan nada.',
     'Sí: es la regla que mantiene limpio todo lo demás.', imgs=['po-320', 'po-tab', 'po-esc-1x'], badges=[QUIETO], requiere=[100])

# ---- Campamento 36 · El calendario del pueblo
idea(108, 'El domingo, a misa', 'si', 'S', '0 nodos (un turno: domingo de 7:30 a 10:00).',
     'El domingo por la mañana los vecinos están en el atrio, de espaldas (se les ve la nuca y las orejas), camino de la puerta; uno lleva a su osezno de la mano.',
     'El turno «misa».', 'Es la 48 de la ronda anterior, ahora con osos: lo más reconocible de un domingo de pueblo.',
     'El personaje «de espaldas» son 4 piezas.', 'Dibujar feligreses como osos es tierno, no burla; aun así es religión: si a la familia no le suena bien, se quita solo este turno. La puerta abierta (la otra mitad de la 48) sigue siendo +2 nodos.',
     'Sí.', imgs=['po-misa'], poses=['vp-espaldas'], badges=[QUIETO], requiere=[102])

idea(109, 'El padre, a la puerta de la iglesia', 'despues', 'S', '0 nodos (una figura más en el turno de misa).',
     'Un oso con sotana negra y alzacuellos a la puerta, el domingo.', 'El turno «misa».', 'Completa la estampa.',
     'La sotana va en el trazo de rasgos.', 'Un sacerdote dibujado como oso de peluche puede no gustar. Está en la maqueta del domingo para que lo veas.',
     'Después: que lo diga la familia. La misa (108) se entiende sin él.', imgs=['po-misa'], poses=['vp-cura'], badges=[DUDOSO], requiere=[108])

idea(110, 'El sábado, más plaza', 'si', 'S', '0 nodos (un turno: sábado de 7:00 a 12:00).',
     'El sábado por la mañana hay más gente en la plaza: dos vendedoras con canasto, vecinos y un osezno.', 'El turno «mercado».',
     'Que el fin de semana se note. Es la 53 (el tiangue) sin puestos ni toldos: solo más vecinos.',
     'Otro reparto de los mismos personajes.', 'El día de plaza cambia de pueblo en pueblo y «tiangue» no se dice en todos lados: por eso no hay rótulo ni puestos, y el día se puede cambiar en una línea.',
     'Sí, en esta versión sobria.', imgs=['po-mercado', 'po-esc-mercado'], badges=[QUIETO], requiere=[102])

idea(111, 'El 15 de septiembre, el desfile', 'si', 'S', '+1 nodo ese día (el azul de la bandera y del bombo).',
     'De 7:00 a 12:00 del 15 de septiembre: un abanderado con la azul y blanco, el del bombo de la banda de paz y los vecinos mirando, en la plaza que ya se embandera.',
     'El turno «desfile».', 'Las fiestas patrias ya adornan la plaza (22C); faltaba quien desfilara.',
     'La bandera del abanderado usa el azul de la del asta.', 'La bandera se dibuja con respeto: franjas azul, blanca y azul, sin escudo (a ese tamaño sería una mancha), nunca en el suelo. Quietos: nadie marcha.',
     'Sí.', imgs=['po-desfile'], poses=['vp-abanderado', 'vp-bombo'], badges=[QUIETO], requiere=[102])

idea(112, 'En diciembre, osos frente al nacimiento (el nacimiento no cambia)', 'si', 'S', '0 nodos.',
     'Del 1 de diciembre al 6 de enero, al anochecer, una osa y su osezno miran el portal. La Virgen, San José, el niño, el buey y el burrito siguen siendo los de siempre.',
     'El turno de anochecer en Navidad.', 'Los osos visitan el nacimiento; no lo reemplazan. Es mi alternativa a la 46 (un nacimiento de osos), que tocaría figuras sagradas.',
     'Su sitio se calcula junto al portal, del lado contrario al astro, para no taparlo.', 'En la maqueta de Nochebuena todavía quedan muy pegados al portal: hay que darles 2–3 px más de aire.',
     'Sí; y la 46 la dejaría en «no» si se hace esta.', imgs=['po-nb', 'po-posada'], badges=[QUIETO], requiere=[102])

idea(113, 'Nochebuena y el 31: estrellitas', 'si', 'S', '+1 nodo esas dos noches (las chispas, en el trazo de la brasa). Quietas; titilar con «todos» sería una animación más (no la propongo).',
     'El 24 y el 31 de diciembre, de 18:00 a 1:00, los oseznos de la plaza llevan una estrellita encendida (la luz de bengala de los niños) y los vecinos están en la calle. Los cohetes de las 23:50 siguen como están.',
     'El turno «nochebuena».', 'Las estrellitas en la mano de los niños son la Nochebuena de aquí tanto como los cohetes.',
     'Una chispa por osezno, en el trazo que no sigue a la hora.', 'A 9 px la estrellita es un punto de luz: se lee por el conjunto, no sola.',
     'Sí.', imgs=['po-nb', 'po-esc-nb'], poses=['vp-oseznoLuz'], badges=[QUIETO], requiere=[102])

# ---- Campamento 37 · El pueblo se mueve
idea(114, 'La capa del vecino: un solo <svg> chico para el que se mueve', 'si', 'M', 'unos 8–10 nodos (un <svg> de unos 30×30 px con un oso), reutilizado por todos los gestos. Estimado, sin medir: una capa compuesta de menos de 4 KB de memoria.',
     'La pieza que hace posible todo lo demás de este campamento: el vecino que se mueve no vive en el dibujo grande sino en su propio <svg> pequeño, hermano del principal, y lo único que cambia es el transform de ese elemento.',
     'montana.js: enCapas, junto al frente. Va por encima del dibujo grande y por debajo del frente.',
     'En Safari, mover un grupo dentro del SVG repinta el SVG entero (docs/rendimiento.md). Con capa propia, el pueblo y la montaña no se repintan.',
     'Un solo actor a la vez: el turno dice quién es. Lleva efecto-ambiente (solo con «todos») y entra en la pausa al deslizar.',
     'Va encima del dibujo grande: el actor no puede pasar por detrás de un farol ni del primer plano. Por eso solo se mueve en la franja de calle libre, delante de todo lo del pueblo. La tele debe contarlo como obstáculo.',
     'Sí, si quieres movimiento: sin esta pieza, cada gesto costaría repintar la escena.', poses=['vp-escoba'], badges=[MUEVE], requiere=[18, 21, 100])

idea(115, 'La que barre la acera', 'si', 'S', '0 nodos más (usa la capa de la 114) · 2 poses a saltos, un cambio cada 0.6 s.',
     'De 7:00 a 8:00, la osa de la escoba se mece dos o tres grados a un lado y al otro, a saltos: barre.', 'La capa del vecino.',
     'Es el gesto más barato y más de pueblo a esa hora.', 'steps(2) sobre el transform del <svg>. Con «esenciales» o «ninguno», quieta con su escoba (como en el turno).',
     'Su franja toca la de las gallinas (49, de 7:00 a 10:00): propongo que las gallinas empiecen a las 8:00.',
     'Sí.', poses=['vp-escoba'], badges=[MUEVE], requiere=[114])

idea(116, 'El panadero cruza la calle', 'despues', 'M', '0 nodos más (la capa de la 114) · una pasada de 9 s cada 40 s.',
     'De 7:00 a 7:30 (la franja del amanecer, de 5:00 a 7:00, es del torogoz) el panadero cruza la calle en su bicicleta.', 'La capa del vecino, de lado a lado de la calle.',
     'Es el movimiento más vistoso del reparto.', 'translate del <svg>, a saltos en el teléfono.',
     'Cruza por delante de los faroles y de los vecinos quietos (la capa va encima): hay que ver si se nota. Y comparte hora con la que barre: uno u otro cada día.',
     'Después: primero la 115, que es más barata, y medir.', poses=['vp-panadero'], badges=[MUEVE], requiere=[114])

idea(117, 'La pelota de los oseznos', 'si', 'S', '0 nodos más (la pelota es el actor de la capa: 1 trazo) · un bote cada 1.2 s, a saltos.',
     'De 15:00 a 16:30, la pelota bota entre los oseznos de la plaza.', 'La capa del vecino (aquí, de la pelota).',
     'Con un punto rojo que bota, cinco oseznos quietos parecen jugar. Es la 52 en barato.', 'translateY con steps; los oseznos no se mueven.',
     'De 14:00 a 16:30 es del perro (50): la pelota le pide la franja de 15:00 a 16:30, o van en días alternos. Los días de azacuanes (octubre y abril, hasta las 16:00), quieta.',
     'Sí.', poses=['vp-osezno', 'vp-_pelota', 'vp-oseznoArriba'], badges=[MUEVE], requiere=[114, 104])

idea(118, 'La ronda: un gesto tras otro, nunca dos a la vez', 'despues', 'M', '0 nodos · cambia cómo se entiende una regla.',
     'En vez de repartir el día en franjas fijas (cada vez quedan menos), dentro del pueblo los gestos se turnan: barre 10 s, pausa, pelota 10 s, pausa… Nunca dos a la vez.', 'cielo.js (data-mueve) y el CSS de la capa.',
     'Las franjas se acaban: torogoz, gallinas, teleférico, perro, pericos, luciérnagas y relámpagos ya llenan el día.', 'Un solo ciclo largo de CSS con cada gesto en su ventana.',
     '«Uno a la vez» se decidió por franjas (22B): esto lo relaja a «uno a la vez, en secuencia». Las bandadas del cielo seguirían por franjas.',
     'Después: solo si, ya con dos o tres gestos, las franjas se quedan cortas.', badges=[REGLA], requiere=[114])

idea(119, 'El pueblo saluda cuando guardas una compra', 'despues', 'S', '+2 nodos (los brazos arriba, escondidos) · 1 s, al guardar.',
     'Al guardar una compra nueva, además del saltito de los de la cumbre, dos vecinos levantan el brazo un segundo.', 'El turno de ahora, con la pose del brazo arriba.',
     'Acompaña a una acción, como el saltito.', 'Un cambio de pose, no una animación.',
     'Regla del valle: «nada depende de si se compró». El saltito ya responde; dos celebraciones compiten con la subida de «Tú» y con el aviso.',
     'Después (casi no): el saltito de la familia basta.', badges=[REGLA], requiere=[100])

# ---- Campamento 38 · Lo que cambia de la app de hoy
idea(120, 'El pescador del cayuco, un oso', 'si', 'S', '+1–2 nodos, estimado sin prototipo (su cabeza blanca y su nariz; el sombrero ya existe).',
     'El pescador sentado en el cayuco del lago pasa a ser un oso con su sombrero. De noche, como hoy, solo se ven la lámpara y su reflejo. En la maqueta hay además uno pescando en la orilla: ese sería opcional (+0, va en los trazos del pueblo).',
     'arte-valle.js: vidaLago.', 'Si todos los habitantes son osos, el del cayuco también. Y un oso polar pescando es lo más natural del mundo.',
     'Los colores del cayuco no cambian.', 'El de la orilla debe guardar los 13 px del sendero, como las vacas; en el teléfono puede no caber.',
     'Sí al del cayuco; el de la orilla, solo donde quepa.', imgs=['po-amanece', 'po-mercado'], poses=['vp-pescador'], badges=[CAMBIA, QUIETO], requiere=[100])
cambia('Un pescador humano en silueta con sombrero, sentado en el cayuco, con su remo y su lámpara.', 'Nada que se note: la figura mide 6–8 px.',
       'docs/campamentos/22-valle-vivo.md («el cayuco con el pescador, su remo y su lámpara»; al amanecer rema: eso no cambia). Pruebas: bloque 22 de test_ui.')

idea(121, 'La descripción de la montaña dice «osos»', 'si', 'S', '0 nodos · un texto.',
     'La descripción del valle para lectores de pantalla añade una frase: los vecinos del pueblo son osos polares. Sin tutear.', 'lib.js: textoValle.',
     'Lo decorativo va con aria-hidden; lo que se ve tiene que estar en la descripción.', 'Una frase, con su prueba en test_lib.',
     'Sin tutear y sin nombres: «En el pueblo, los vecinos son osos polares».', 'Sí: va con la 100.', badges=[CAMBIA, QUIETO], requiere=[100])
cambia('textoValle describe el pueblo con su iglesia, su plaza y sus casas de colores; de la gente no dice nada.', 'Nada.', 'docs/campamentos/22c-valle-de-verdad.md («Fuera de los bloques propios»: lib.js — textoValle) y la voz del lector (17, 20).')

idea(122, 'La entrada enseña el pueblo de osos', 'si', 'S', '0 nodos más que en la app.',
     'La entrada ya dibuja el pueblo; con esto, quien llega ve a los osos en su turno (por la hora y el día, nada más). Sin gorritos de cumpleaños, sin aurora, sin nada que venga de la familia.',
     'login: la misma escena.', 'Es la primera impresión, y no cuesta nada.', 'El turno solo mira la hora y el día de El Salvador.',
     'La entrada no enseña ningún dato: el número de osos no depende de las cuentas (107) y las ventanas siguen apagadas ahí, como hoy.',
     'Sí.', imgs=['po-login-esc'], badges=[CAMBIA, QUIETO], requiere=[100])
cambia('La entrada dibuja el pueblo con su gente en silueta, sin ventanas encendidas.', 'Nada.', 'docs/interfaz.md («Entrada») y docs/campamentos/22c-valle-de-verdad.md (la entrada con las luminarias y sin ventanas).')

idea(123, 'El pueblo de la tele, con su propia composición', 'despues', 'L', 'sin medir.',
     'En la tele de la sala el pueblo podría ser más ancho (más casas, la plaza entera) y los osos, de 30–40 px.', 'tv.js y sitiosPueblo.',
     'En la tele es donde mejor se verían.', 'Otra forma de valle para pantallas de sala.',
     'Es la T3 de la auditoría final («solo con una tele delante») y el saldo de la tele nunca toca la montaña.',
     'Después: con la tele delante.', badges=[QUIETO], requiere=[100])

# ---------------------------------------------------------------- lo que esta ronda cambia de las anteriores
for _n, _nota in [(43, ' Si se hace el Pueblo de los Osos (100), esta idea sobra: ya no hay un oso de visita, son todos.'),
                  (44, ' Con el Pueblo de los Osos (100), lo de cada fecha lo llevan los vecinos (campamento 36).'),
                  (48, ' Con osos, es la 108.'), (52, ' Con osos y sin capa propia, es la 104 (y su pelota, la 117).'), (53, ' En versión sobria y con osos, es la 110.'),
                  (46, ' Mi alternativa, sin tocar las figuras: la 112 (los osos visitan el nacimiento de siempre). Si se hace la 112, esta la dejaría sin hacer: cambiar a la Virgen, San José y el niño por osos es lo único de todo esto que podría ofender.')]:
    _i = next(i for i in I if i['n'] == _n)
    _i['porRec'] += _nota
for _n in (43, 44, 48):
    _i = next(i for i in I if i['n'] == _n)
    _i['rec'] = 'despues'
    _i['badges'].append(['despues', 'La reemplaza la ' + {43: '100', 44: '100 y el campamento 36', 48: '108'}[_n]])

for k, (t, p) in enumerate(FUERA):
    if t.startswith('Muchos osos en el valle a la vez'):
        FUERA[k] = ('Osos Y gente a la vez en el pueblo', 'O siluetas o osos: mezclados, el oso blanco parece un disfraz entre personas. Si se hace la 100, son todos.')
    if t.startswith('Un oso junto al mensajero cuando no hay precio'):
        FUERA[k] = ('Un oso junto al mensajero cuando no hay precio, o en su lugar', 'El zopilote es el mensajero de aquí; dos dibujos en la píldora del precio sobran, y cambiarlo por un oso quitaría algo salvadoreño. El zopilote se queda.')
    if t.startswith('Dibujar solo lo de la hora de ahora y redibujar en cada franja'):
        FUERA[k] = ('Dibujar solo lo de la hora de ahora y redibujar TODA la escena en cada franja', 'Rompe «nada se redibuja al cambiar de hora» y redibujar mil nodos con la app abierta sería un tirón. La 102 pide una excepción mucho más chica: solo los nueve trazos de los vecinos, unas seis veces al día.')
    if t.startswith('El pregón y el vendedor con su carretón'):
        FUERA[k] = ('El pregón y el de las minutas con su carretón', 'El pregón es un sonido (descartados). El carretón de mano sale en dos maquetas (tarde y sábado) para que lo veas, pero la carreta se descartó y esto se le parece: fuera salvo que lo pidas; en su sitio iría un vecino más.')
FUERA[0:0] = [
    ('Los animales de aquí, como osos (torogoz, pericos, azacuanes, garzas, vacas, perro, gallinas, zompopos, luciérnagas)', 'No. Los osos son los habitantes; la fauna es el país. Un pueblo de osos con su perro, sus gallinas y sus vacas es más pueblo, y el torogoz no se toca.'),
    ('Un oso de color distinto por persona (el avatar)', 'No. Un oso «de Ana» en el pueblo diría dónde está Ana; y en la cabecera el avatar es la inicial con su color, que se lee mejor a 24 px. Los osos no son nadie.'),
    ('Tantos osos como personas con cuenta', 'No: las ventanas ya cuentan personas. El número de osos depende solo de la pantalla.'),
    ('Los tres de la cumbre bajan al pueblo en las fiestas', 'No: su sitio costó decidirlo (campamento 25) y la cumbre no se reabre. Los peluches de la familia arriba, los vecinos abajo: esa separación es la idea.'),
    ('Osos con iglú o pescando en el hielo', 'Como el lago helado: aquí no hay hielo y la escena sigue lo real. Son osos polares que viven en un pueblo de El Salvador; lo polar es su pelo, no su paisaje.'),
    ('El farolero que enciende los faroles al atardecer', 'No es una costumbre de aquí que yo pueda afirmar, y los faroles ya se encienden solos con la hora. Además, su hora (18:00) es de las luciérnagas.'),
    ('Las medallas, los sellos y el farolito de cumpleaños, con osos', 'Se quedan: las medallas son de constancia, el sello de 1 BTC ya lleva la cara del oso (25) y el farolito es de la persona que cumple, no del pueblo.'),
    ('Una piñata en la plaza el día de un cumpleaños de la familia', 'Diría en el pueblo (que también sale en la entrada) que hoy cumple alguien. El gorrito del oso grande ya lo dice, y nunca en la entrada.'),
    ('Osos con flores el 2 de noviembre', 'Enflorar es de aquí, pero es un día de duelo para muchas familias; un peluche con flores puede caer mal. Fuera salvo que la familia lo pida.'),
    ('El oso de la campana, o un oso que se asoma a la torre', 'La campana del mediodía ya es la 25; un oso arriba en la torre quedaría contra el cielo en escritorio.'),
]

GALERIA.append(('vp-_trio', 'Los vecinos (talla pueblo)', 'Ideas 100–113'))
NODOS['vp-_trio'] = 9

# Los campamentos 33 y 34 de la ronda anterior: lo que el pueblo de osos reemplaza ya no va en su resumen.
_c33 = next(c for c in CAMPS if c['id'] == 'c33')
_c33['orden'] = 'Los de la cumbre se estiran por la mañana. El osito de visita (43–44) queda en «después»: si se hace el Pueblo de los Osos (35), sobra.'
_c33['why'] = 'Más ositos, cada uno con su razón. De esta ronda queda propuesto el estirarse de los de la cumbre; el osito de visita del valle lo reemplaza el pueblo entero (campamento 35).'
_c34 = next(c for c in CAMPS if c['id'] == 'c34')
_c34['orden'] = 'Los animales del pueblo: las gallinas por la mañana, el perro por la tarde, y el Día de la Cruz. La misa (48), los niños (52) y el día de plaza (53) pasan, con osos, a los campamentos 35 y 36.'
_b = next(b for b in DATOS['bloques'] if b['t'].startswith('El teatro propuesto'))
_b['t'] = 'El teatro de la ronda anterior (data-mueve)'
_b['p'] += ' OJO: con el Pueblo de los Osos este horario cambia (las gallinas desde las 8:00, el perro hasta las 15:00, la misa el domingo de 7:30 a 10:00): el vigente es «La agenda» de la sección del pueblo.'

# ---------------------------------------------------------------- la sección propia del pueblo
PUEBLO = {
    'lead': 'Mi propuesta de arte: dos familias de osos que no se confunden. Arriba, en la nieve, los tres peluches de tu familia: sentados, grandes, con su ropa de la foto. Abajo, en el valle, los vecinos: de pie, más chicos, con ropa de pueblo y algo en las manos. El mismo pelo blanco los une; todo lo demás los separa. Y el pueblo tiene horario: no se mueve casi nada, pero nunca está igual.',
    'personajes': [
        ('campesino', 'El campesino', 'Sombrero de palma; las orejas asoman'),
        ('vendedora', 'La vendedora', 'Canasto en la cabeza, delantal'),
        ('abuela', 'La abuela', 'En su taburete del corredor, con rebozo'),
        ('escoba', 'La que barre', 'Barre su acera temprano'),
        ('osezno', 'El osezno', 'Talla 0.62; sin ojos a ese tamaño'),
        ('oseznoArriba', 'El de la piscucha', 'El brazo arriba sostiene el hilo'),
        ('estira', 'El que se estira', 'Al amanecer, en su corredor'),
        ('siesta', 'El de la siesta', 'El sombrero sobre los ojos'),
        ('pupusera', 'La pupusera', 'Plancha, brasa y tres pupusas'),
        ('panadero', 'El panadero', 'De perfil, con el canasto del pan'),
        ('espaldas', 'Camino a misa', 'De espaldas: nuca y orejas'),
        ('abanderado', 'El abanderado', '15 de septiembre'),
        ('bombo', 'El del bombo', 'La banda de paz'),
        ('oseznoLuz', 'Con su estrellita', 'Nochebuena y el 31'),
        ('pescador', 'El pescador', 'En la orilla, con su caña'),
        ('cura', 'El padre', 'Dudoso: lo decide la familia'),
        ('minutero', 'El de las minutas', 'Fuera: se parece a la carreta'),
    ],
    'nodos': PSV['nodos'],
    'real_alto': ['po-tel', 'po-tel-claro', 'po-tel-noche', 'po-tel-nb', 'po-login'],
    'real_ancho': ['po-esc', 'po-esc-noche', 'po-esc-nb'],
    'dia': ['po-amanece', 'po-manana', 'po-siesta', 'po-tarde', 'po-noche', 'po-duerme', 'po-misa', 'po-mercado', 'po-desfile', 'po-nb'],
    'agenda': {
        'cab': ['Cuándo', 'Quién está (quietos: es un turno)', 'Qué se mueve (uno a la vez)', 'Choca con'],
        'filas': [
            ['5:00–7:00', 'El que se estira, el panadero, la que barre (106)', 'El torogoz (ya existe)', '—'],
            ['7:00–8:00', 'La vendedora, la abuela, el campesino, la que barre', '<b>La que barre (115)</b>', 'Las gallinas (49): que empiecen a las 8'],
            ['8:00–11:30', 'Lo mismo; sábado, más plaza (110); domingo, misa hasta las 10 (108)', 'Las gallinas (49); el teleférico (23) desde las 10', 'Zompopos (15–21 de mayo) y azacuanes (octubre y abril)'],
            ['11:30–14:00', 'Casi nadie: el de la siesta y la abuela', 'La campana a las 12 (25, después); el teleférico hasta las 13', '—'],
            ['14:00–17:45', 'Los oseznos y su pelota, la abuela, vecinos (104)', 'El perro (50) hasta las 15; <b>la pelota (117)</b> de 15:00 a 16:30; los pericos desde las 16:30', 'El perro cede hora y media'],
            ['17:45–22:00', 'La pupusera y quien espera (105); en diciembre, frente al nacimiento (112)', 'Las luciérnagas (ya existen)', '—'],
            ['22:00–5:00', 'Nadie: el pueblo duerme (103)', 'Luciérnagas o relámpagos (ya existen)', '—'],
            ['15 de septiembre, 7–12', 'El desfile (111)', 'Nada nuevo', '—'],
            ['24 y 31 de diciembre, 18–1', 'Estrellitas y vecinos en la calle (113)', 'Los cohetes a las 23:50 (ya existen)', '—'],
        ],
    },
    'criterio': [
        ('Los osos son los habitantes, no el país', 'Se quedan como están: los volcanes, la iglesia y las casas de colores, el torogoz, los pericos, los azacuanes, las garzas y garcitas, las vacas, el perro y las gallinas, los zompopos, las luciérnagas, la milpa, el maquilishuat, el árbol de fuego, las piscuchas, el papel picado y los cohetes. Y el zopilote mensajero.'),
        ('Dos familias, nunca mezcladas', 'Los tres de la cumbre son los peluches de tu familia y no bajan. Los vecinos no llevan su ropa, no saltan con tus compras y no son nadie: ni un oso por persona, ni colores de avatar.'),
        ('Lo sagrado no se dibuja como oso', 'El nacimiento sigue con sus figuras. Los osos van a misa y miran el portal; el padre queda en «después» para que lo diga la familia.'),
        ('Quietos por defecto', 'El pueblo cambia por turnos (un salto unas seis veces al día). Moverse, uno solo, chico, en su capa, con efectos «todos», y medido en tu iPhone.'),
        ('Nada sobre el dato', 'Nada del pueblo depende de comprar, de quién abrió ni de cuántos son. Depende de la hora, del día y del tamaño de la pantalla.'),
        ('Lo que no pude probar', 'iPhone real y Safari: el blanco de los osos frente a la cal a pleno sol, los rasgos de 1 px en pantalla densa y cualquier cosa que se mueva. Los milisegundos y la memoria de la capa del vecino son estimados, no medidas.'),
    ],
    'medido': {
        'cab': ['Caso (mil compras, 390×664)', 'Hoy', 'Con el pueblo de osos', 'Con el pescador de la orilla'],
        'filas': [['Nochebuena, 21:00', '1063', '<b>1071</b> (+8)', '—'], ['Un miércoles, 16:20', '1063', '<b>1071</b> (+8)', '1078 (+7)'], ['15 de septiembre, 9:00', '1063', '<b>1072</b> (+9)', '—'], ['De madrugada (duerme; derivado, no medido)', '1063', '<b>1063</b> (0)', '—']],
        'p': 'Nodos de toda la escena, contados en la app con el prototipo (todos los elementos SVG dentro de #montana; tope: 1100). El campamento 25 anotó 1076 para esta misma noche con el contador de test_ui: con esa cuenta serían unos 1084, también dentro del tope. El pueblo pasa de 79–81 a 87–90 nodos; el valle sigue lejos de su tope de 300. El pescador de la orilla, en el prototipo, va en trazos aparte (+7); integrado en los del pueblo costaría 0.',
    },
}

RESUMEN[:] = [
    'Ocho poses de los tres osos de la familia para los huecos de la interfaz (campamentos 26–29): ni un nodo en la escena, por eso van primero.',
    '«Hacer sitio» (30) mide antes de tocar; «Tú» sube como oso con su mochila naranja (31) y, con sus huellas en un solo trazo, la escena queda con menos nodos que hoy.',
    'NUEVO · El Pueblo de los Osos (35): toda la gente del valle pasa a ser osos polares en «talla pueblo», con ropa y oficios de aquí. Cuesta 8 nodos por todo el pueblo (medido: 1063 → 1071 de 1100) y no mueve nada. Cambia lo decidido en el 22C: va marcado.',
    'NUEVO · El pueblo tiene horario (35–36): seis turnos al día, la escuela, la misa del domingo, el sábado de plaza, el 15 de septiembre, diciembre y las estrellitas. Cada uno es otro reparto de los mismos osos: 0 nodos. Pide una excepción pequeña a «nada se redibuja al cambiar de hora».',
    'NUEVO · Moverse, uno a la vez y en su capa (37): la que barre y la pelota de los oseznos; lo demás, después de medir en tu iPhone. Y lo salvadoreño no se toca (38): los osos son los habitantes; el torogoz, el zopilote, las vacas, el perro y el nacimiento se quedan.',
]
LEADPLAN = ('Cada campamento es un PR aparte, con sus pruebas y la definición de terminado completa. Los cuatro primeros son solo interfaz (0 nodos en la escena); el 30 prepara la escena con medidas; '
            'del 31 al 34, «Tú» como oso, el teleférico y la vida de la ronda anterior; y del 35 al 38, el Pueblo de los Osos, que reemplaza al osito de visita (43–44) y absorbe la misa (48), los niños (52) y el día de plaza (53). '
            'Si solo pudiera hacerse una cosa de la escena, haría el 35.')
NOTA = ('<b>Lo que necesito de ti:</b> los números que no quieres (o los de «después» que sí), con el texto que arma la barra de abajo. '
        'Tres decisiones tuyas del pueblo: si la gente pasa a osos (100, cambia el 22C), si aceptas que los vecinos se redibujen al cambiar de turno (102) y lo religioso (108 la misa, 109 el padre). '
        'Y lo que solo puedes ver tú: «Tú» y los vecinos en tu iPhone a pleno sol, la 16 con la tele de noche, y todo lo que se mueve (23, 49–50, 115–117) con «Medir este aparato».')

MOV['filas'] += [
    ['<b>102</b> · Los turnos del pueblo', 'Los vecinos cambian de sitio (se reescriben 9 trazos)', 'Un repintado del dibujo grande por cambio', 'Unas 6 veces al día', 'Como un cambio de color de cielo.js', '<span class="si-b">Sí, barato</span> (cambia una regla)'],
    ['<b>115</b> · La que barre', 'Se mece a saltos (2 poses)', 'La capa del vecino (114): un <svg> de ~30 px', '7:00–8:00', 'Menos que una piscucha', '<span class="de-b">Tras «Hacer sitio»</span>'],
    ['<b>117</b> · La pelota', 'Bota a saltos', 'La misma capa (1 trazo)', '15:00–16:30', 'Menos que una luciérnaga', '<span class="de-b">Tras «Hacer sitio»</span>'],
    ['<b>116</b> · El panadero cruza', 'Cruza la calle', 'La misma capa', '7:00–7:30', 'Como el torogoz, más chico', '<span class="de-b">Después de medir la 115</span>'],
]
