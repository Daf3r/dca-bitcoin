# Segunda ronda (pedido del dueño): «Tú» como oso que sube, más ositos en el paisaje y un pueblo que vive. Lo ejecuta hacer_galeria.py
# (mismas funciones y listas: img, idea, CAMPS, FUERA…), después de las ideas 1–32 y antes de armar el HTML.

# ---------------------------------------------------------------- maquetas nuevas
img('tu-dia', 'tu-390-dia-zoom.png', '«Tú» como osito blanco con su mochila naranja, los pies sobre el punto del sendero y una pisada naranja debajo; la placa «Tú» al lado y los tres de la cumbre abajo a la derecha.', ancho=560, pie='390 px · de día (zoom)')
img('tu-escena', 'tu-390-dia.png', 'La escena entera a 390 px con «Tú» como osito y las huellas de oso en el sendero.', ancho=520, alto=True, pie='La escena entera, 390 px')
img('tu-eco', 'tu-390-eco-zoom.png', 'El eco de hace un año como el mismo osito, translúcido, junto a «hace 1 año».', ancho=560, pie='El eco de hace un año, translúcido')
img('tu-noche', 'tu-390-noche-zoom.png', 'De noche, el osito con la linterna de siempre alrededor.', ancho=560, pie='De noche, con su linterna')
img('tu-320', 'tu-320-zoom.png', 'A 320 px el osito y su pisada se leen; en la cumbre solo cabe el grande.', ancho=560, pie='320 px')
img('tu-320-grande', 'tu-320-grande-zoom.png', 'Si «Tú» fuera el grande con su ropa, a 320 px habría dos grandes iguales: uno subiendo y otro en la cumbre.', ancho=560, pie='Así NO: con la ropa del grande, dos iguales')
img('tu-1440', 'tu-1440-zoom.png', 'En escritorio, el osito más grande sobre el sendero.', ancho=560, pie='1440 px (zoom)')
img('tu-familia', 'tu-1440-familia-zoom.png', 'La familia entera sube: el chico y el del mameluco van detrás, sentados sobre el sendero, y la cumbre queda vacía.', ancho=560, pie='La familia entera sube: tapan el sendero')
img('tu-familia-390', 'tu-390-familia-zoom.png', 'La familia entera a 390 px: los de atrás quedan sobre el sendero y junto a «10M».', ancho=560, pie='… y a 390 px, junto a «10M»')
img('valle-390', 'valle-osos-390.png', 'Osos en el valle a 390 px: uno saluda desde el cayuco del lago y otro celebra en la plaza junto a la gente, en silueta.', ancho=780, pie='Osos en el valle, 390 px (11 px de alto)')
img('valle-1440', 'valle-osos-1440-par.png', 'En escritorio: uno en la plaza junto a la iglesia y otro en el cayuco.', ancho=900, pie='1440 px: la plaza y el cayuco')

# ---------------------------------------------------------------- los campamentos: «Tú» va justo después de «Hacer sitio» (la idea clave)
viejo = next(c for c in CAMPS if c['id'] == 'c31')
viejo.update({'id': 'c32', 'k': '32', 'camp': 'Campamento 32', 't': 'El teleférico del valle'})
i31 = CAMPS.index(viejo)
CAMPS[i31:i31] = [
    {'id': 'c31', 'k': '31', 'camp': 'Campamento 31', 't': '«Tú» sube como oso', 'ids': [33, 34, 35, 36, 37, 38, 39, 40, 41], 'tipo': 'vida',
     'dep': 'el campamento 30 (el banco, la 18, y el presupuesto, la 21) para el oso; la 33 (las huellas) no depende de nada.',
     'orden': 'El punto naranja pasa a ser un osito con su mochila naranja, con los pies en el punto exacto. Las huellas de oso en un solo trazo pagan el oso: la escena queda con menos nodos que hoy.',
     'why': 'La idea que pidió el dueño: el que sube eres tú. Un cuarto osito (sin la ropa de los tres, para no repetir al grande de la cumbre) con la mochila naranja, que es el color de lo tuyo; anda al subir, respira en reposo y levanta los brazos al cruzar una etapa. El dato no cambia: la altitud es la de sus pies.',
     'riesgo': 'Medio-alto: es la marca principal de la app. Cambian etiquetar (su caja de choques), las pruebas que miden «Tú» por .yo-anillo y la lista de choques de la tele. Lo chico (mini-cabecera, Diario, altímetro) se queda con el punto.',
     'meta': 'Navegador · 1 PR (o dos: las huellas primero) · «Qué hay de nuevo» · medir antes y después'},
]
CAMPS[i31 + 2:i31 + 2] = [
    {'id': 'c33', 'k': '33', 'camp': 'Campamento 33', 't': 'Más ositos en el paisaje', 'ids': [42, 43, 44, 45, 46, 47], 'tipo': 'vida',
     'dep': 'el campamento 30 (la 18 y la 21).',
     'orden': 'Los de la cumbre se estiran por la mañana y un osito de visita en el valle, uno solo, que cambia de sitio con la hora y de cosas con la fecha.',
     'why': 'Más ositos, como pidió el dueño, pero con una razón cada uno: el que visita el valle está donde está la vida a esa hora (el lago al amanecer, la plaza de mañana, la sombra del árbol de tarde) y lleva lo del día (la banderita, la piscucha, el pastel, el gorro).',
     'riesgo': 'Medio: los osos son de color y la gente del valle es silueta, así que un osito blanco se ve más que nada en el valle; por eso uno solo, chico y quieto.',
     'meta': 'Navegador · 1 PR · «Qué hay de nuevo»'},
    {'id': 'c34', 'k': '34', 'camp': 'Campamento 34', 't': 'El pueblo vive', 'ids': [48, 49, 50, 51, 52, 53, 54], 'tipo': 'vida',
     'dep': 'el campamento 30 (la 18 y la 21). El perro reparte su franja con el teleférico (la 23).',
     'orden': 'Rutinas de aquí por hora y por día: la misa del domingo, las gallinas por la mañana, el perro por la tarde y el Día de la Cruz. Uno a la vez, cada uno en su franja.',
     'why': 'Que el valle tenga su día: lo que pasa en un pueblo de verdad, sin inventar costumbres. Lo que se mueve va en su capa pequeña y en su franja de data-mueve; lo que solo cambia de sitio (la gente a misa) es un salto, no una animación.',
     'riesgo': 'Medio: cada cosa que se mueve se mide con el banco y en el iPhone; debajo de 55 fps con la montaña a la vista, se quita.',
     'meta': 'Navegador · 1 PR · «Qué hay de nuevo»'},
]

TU = ('mov', 'Se mueve · al subir')

# ---- Campamento 31 · «Tú» sube como oso
idea(33, 'Las huellas del camino, huellas de oso (en un solo trazo)', 'si', 'S', 'de 29–128 nodos a 1: 36 menos en el teléfono, 126 menos a 1440 px (medido) · solo con «todos», como hoy',
     'Los puntitos que hoy marcan el tramo recorrido pasan a ser huellas de oso (una almohadilla y tres dedos), una cada 20 px, alternando a cada lado.',
     'montana.js: huellas() (#m-huellas).',
     'Si el que sube es un oso, sus huellas son de oso. Y ahorra: hoy son un círculo por huella; juntas en un solo trazo son un nodo.',
     'huellas() arma un solo <path> con todas las huellas en vez de un <circle> por huella. Mismo color y la misma clase efecto-ambiente.',
     'A 3 px una huella de oso se lee como «pisadas», no como dibujo: está bien así. La prueba que cuente huellas cambia de círculos a un trazo.',
     'Ahorra más nodos que los que cuesta el oso, sin cambiar ninguna regla. Va primero porque paga lo demás.',
     imgs=['tu-escena'], badges=[QUIETO])
idea(34, '«Tú» es un osito con su mochila naranja', 'si', 'M', f'#m-yo de 8 a 21 nodos (+13; el oso, {NODOS.get("escala", 20)} en la pose de la interfaz, unos 11 en su versión de escena) · medido con todo puesto: la escena a 390 px de 1019 a 996 nodos, a 1440 de 1223 a 1110 (con la 33) · 0 animaciones nuevas',
     'El punto naranja de «Tú» (y de «Vamos aquí») pasa a ser un osito blanco, sentado como los de la cumbre, con su mochila y sus correas naranjas: el naranja sigue siendo lo tuyo. Sus pies están sobre el punto exacto del sendero (getPointAtLength) y debajo lleva una pisada naranja con borde de nieve, que es el dato: se lee igual a 320 px.',
     'La escena (#m-yo), en el teléfono, en escritorio, en la tele y en la película. Lo chico se queda con el punto: la mini-cabecera, el altímetro y la montañita del Diario (a 8–14 px un oso no se lee).',
     'Lo pidió el dueño: el que sube eres tú. Un cuarto osito y no el grande: con la ropa del grande, a 320 px habría dos grandes iguales (medido: en la cumbre solo cabe él).',
     'Se queda: #m-yo y su translate (colocar, subir, fotograma), la linterna, los anillos de Navidad y la placa «Tú»/«Vamos aquí». Cambia: el punto y el anillo pasan a la pisada (una elipse) y el halo a una elipse plana a sus pies. etiquetar usa la caja del oso (unos 22×24 px por encima del punto; 30×30 a 1440) en vez de 36×36 centrada, y tv.js igual en su lista de choques.',
     'Es el dato principal: la altitud es la de sus pies, sin ambigüedad (la pisada naranja la marca). Lo vigilan en test_ui las pruebas que miden «Tú» por .yo-anillo (los choques de rótulos de la línea ~105, el eco frente a «Tú» de la ~2872, la película de la ~6433 y la ~6455 y los osos de la ~6607); hay que pasarlas a la caja del oso. Con la letra o el contraste no cambia nada.',
     'Es la idea que más se va a notar del libro, y medida cabe: con las huellas de la 33, la escena tiene menos nodos que hoy.',
     imgs=['tu-dia', 'tu-320', 'tu-1440', 'tu-320-grande'], poses=['escala'], badges=[QUIETO], requiere=[18, 21])
idea(35, 'Anda mientras sube', 'si', 'S', '0 nodos · ninguna animación nueva en reposo',
     'Mientras «Tú» sube (al abrir la app, al anotar y en la película) el osito se bambolea de un lado a otro, como un peluche que alguien hace caminar: dos cuadros con steps(2), 0.32 s por paso. Al llegar, se queda quieto.',
     'El grupo del oso dentro de #m-yo.',
     'Un punto que se desliza es un dato; un osito que camina es alguien que sube.',
     'Una clase .anda en #m-yo solo mientras sube (subir y fotograma con enMarcha); @keyframes de rotate ±6° con transform-origin en los pies. Acompaña a una acción: se ve con «esenciales»; con «ninguno» no hay subida.',
     'Cuesta nada: #m-yo ya cambia de sitio en cada fotograma mientras sube (el frente ya se repinta). El bamboleo no mueve los pies: el dato sigue exacto.',
     'Le da vida al momento que más se mira, sin costo.',
     badges=[TU], requiere=[34])
idea(36, 'En reposo, respira', 'si', 'S', '0 nodos · la misma animación que hoy tiene el halo, pasada al oso',
     'Quieto, el osito respira muy suave (una escala de 1 a 1.03 desde los pies, cada 2.4 s), como hoy respira el halo naranja.',
     'El grupo del oso; el halo deja de animarse.',
     'Hoy ya hay una animación ahí (el halo); que la lleve el oso no suma nada y se siente vivo.',
     'La animación respira de .yo-halo pasa al oso, en la misma lista de la pausa al deslizar.',
     'Ninguno: misma cuenta de animaciones en el frente.',
     'Cambia de dueño una animación que ya existe.',
     badges=[TU], requiere=[34])
idea(37, 'Levanta los brazos al cruzar una etapa', 'si', 'S', '+2 nodos (los brazos arriba, escondidos) · 1.2 s, solo al cruzar',
     'Al anotar una compra que cruza una etapa o un campamento, el osito levanta los brazos al llegar, mientras los de la cumbre dan su saltito.',
     'llegar() en montana.js, con nivel «etapa» o «hito».',
     'La celebración ya enciende la montaña; el que subió también festeja.',
     'Dos brazos alzados dibujados siempre y escondidos; la clase .festeja los enseña 1.2 s (cambio a saltos, no animación). Con «ninguno», no.',
     'Que no compita con la tarjeta de la celebración: es en la escena, chico y corto.',
     'Dos nodos y el momento lo merece.',
     badges=[TU], requiere=[34])
idea(38, 'El eco de hace un año, un oso translúcido', 'si', 'S', 'el eco de 8 a 19 nodos (+11), solo cuando hay eco',
     'El fantasma de «hace 1 año» pasa a ser el mismo osito, a la mitad de opacidad, quieto en el sendero.',
     '#m-eco.',
     'Si «Tú» es un oso, tu eco también: se entiende solo «el de hace un año eras tú».',
     'El mismo dibujo del oso de la 34, con la opacidad del fantasma de hoy y su respiración (ya existe).',
     'La prueba del eco mide su distancia a «Tú» con .eco-anillo y .yo-punto: pasa a las cajas de los osos.',
     'Coherente con la 34 y barato.',
     imgs=['tu-eco'], badges=[QUIETO], requiere=[34])
idea(39, 'Su bufanda en Navidad y su gorrito en un cumpleaños', 'si', 'S', '+2 nodos',
     'Del 1 de diciembre al 6 de enero el osito de «Tú» lleva la bufanda roja de los otros; el día de un cumpleaños de la familia, el gorrito naranja. Como los de la cumbre.',
     'El oso de la 34.',
     'Ya lo hacen los tres de la cumbre; el que sube no se queda sin.',
     'Dibujados siempre (v-navidad) y el gorrito con cumpleHoy, como en la cumbre.',
     'Ninguno.',
     'Es lo mismo que la cumbre.',
     badges=[QUIETO], requiere=[34])
idea(40, 'El equipo según el campamento: cuerda desde 1M, piolet desde 10M', 'despues', 'S', '+2–3 nodos',
     'El osito suma equipo al pasar campamentos: un rollo de cuerda en la mochila desde 1M y un piolet desde 10M.',
     'El oso de la 34.',
     'Contaría la altura con objetos, como la nieve que crece.',
     'Dibujados siempre y enseñados por clase según el campamento alcanzado.',
     'A 22 px un rollo de cuerda o un piolet son 2–3 px: sin maqueta no sé si se leen. Y que no se sienta como premio por comprar más.',
     'Después: primero una maqueta a 22 px; si no se lee, no vale la pena.',
     badges=[QUIETO], requiere=[34])
idea(41, 'Se detiene un instante en cada campamento que pasa', 'despues', 'S', '0 nodos',
     'Al subir, el osito se para un momento (0.25 s) en cada campamento ya alcanzado que cruza, como para mirar el paisaje, y sigue.',
     'subir() y la película.',
     'Hace del ascenso un camino con paradas.',
     'Una pausa en la curva de la subida en cada campamento cruzado; la altitud final no cambia.',
     'Cambia el tiempo de la subida (1.4–2 s) y el de la película (15 s), que las pruebas miden; con varios campamentos, la subida se alarga.',
     'Después: bonito, pero toca el tiempo de lo que ya está medido.',
     badges=[TU], requiere=[34])

# ---- Campamento 33 · Más ositos en el paisaje
idea(42, 'Los de la cumbre se estiran por la mañana', 'si', 'S', '+6 nodos (brazos arriba de los tres, escondidos) · cambios a saltos, no animación',
     'De 7:00 a 8:00, cada cinco minutos, los tres de la cumbre levantan los brazos dos segundos, uno tras otro, como quien se estira al despertar.',
     'arte-osos.js (los osos de la cumbre).',
     'La cumbre amanece con ellos; es lo primero que se ve si abres la app temprano.',
     'Los brazos alzados van dibujados y escondidos; cielo.js deja data-manana de 7 a 8 y un temporizador pone la clase .estira dos segundos cada cinco minutos (dos repintados del frente, no un repintado por fotograma). Solo con «todos».',
     'Que no coincida con el torogoz (5–7): por eso empieza a las 7. Las manos alzadas quedan dentro de su caja (lo comprueba colocarOsos, como el saltito).',
     'Mucha vida por casi nada: seis nodos y dos repintados cada cinco minutos.',
     badges=[('barata', 'Cambia a saltos')], requiere=[18, 21])
idea(43, 'Un osito de visita en el valle, según la hora', 'si', 'M', 'unos 12 nodos en el valle (de 217–223 a ~235, tope 300) · se cambia de sitio con la franja (un repintado por cambio)',
     'Un solo osito de peluche visita el valle y está donde está la vida a cada hora: en el cayuco del lago al amanecer (5:30–8), en la plaza con la gente por la mañana (8–12), a la sombra del árbol del pueblo por la tarde (13–17). De noche no está (se fue a dormir).',
     'arte-valle.js y arte-pueblo.js (los sitios), un solo dibujo que el CSS mueve.',
     'El dueño quiere más ositos. Antes lo descarté porque repetían a los de la cumbre y eran uno más moviéndose; uno solo de visita, quieto, que sigue la hora como el resto del valle, no tiene ese problema.',
     'Un solo grupo con sus tres posiciones en variables (--xa, --ya…) que calcula el valle al dibujarse; data-franja (cielo.js) elige cuál con transform. Nada se redibuja.',
     'Los osos son de color y la gente del valle es silueta: un osito blanco se ve más que nada en el valle (maqueta). Por eso uno solo y del blanco apagado del mameluco. A 390 px mide 11 px: se lee como osito, justo.',
     'Uno solo y con una razón para estar en cada sitio.',
     imgs=['valle-390', 'valle-1440'], badges=[('barata', 'Cambia de sitio a saltos')], requiere=[18, 21])
idea(44, 'Lo que lleva el de visita según la fecha', 'si', 'S', '+1–3 nodos por cosa, escondidos salvo su día',
     'El osito de visita lleva la banderita en las fiestas patrias, una piscucha en la temporada de piscuchas (octubre y noviembre, como las del valle), un pastel en el cumpleaños de alguien de la familia (sin decir de quién) y el gorro rojo en Navidad.',
     'El oso de la 43.',
     'El valle ya celebra esas fechas; el osito se suma con algo en las manos.',
     'Dibujados siempre y enseñados por data-fiesta, data-piscuchas, data-navidad y cumpleHoy (ya existen).',
     'Privacidad: el pastel no dice de quién es, como el gorrito de la cumbre.',
     'Barato y cariñoso.',
     badges=[QUIETO], requiere=[43])
idea(45, 'Uno de la cumbre baja y sube un trecho de nieve al mediodía', 'despues', 'L', 'una capa propia para el que camina · su ruta, medida contra rótulos, sendero y cielo',
     'A mediodía, uno de los tres se levanta, baja unos pasos por la nieve y vuelve a sentarse.',
     'Los osos de la cumbre.',
     'Sería el momento más vivo de la cumbre.',
     'El que camina pasaría a una capa propia (moverlo dentro del frente repinta todo en Safari) y su ruta tendría que medirse con colocarOsos en cada tamaño.',
     'Caro: una ruta segura que cambia con la nieve, los rótulos y «Tú». La versión barata es la 42 (estirarse).',
     'Después: increíble pero caro; primero la 42.',
     badges=[MUEVE], requiere=[18, 21])
idea(46, 'Un nacimiento de osos en Navidad', 'despues', 'S', 'unos 8 nodos, solo del 1 de diciembre al 6 de enero',
     'En el nacimiento del valle, osos de peluche en vez de figuras.',
     'El nacimiento de la Navidad del valle (ya existe).',
     'Sería la Navidad más «de la familia».',
     'Dibujado siempre y enseñado con data-navidad.',
     'Es una escena de fe: con osos podría no gustarle a todos en la familia. Que lo decidan ustedes.',
     'Después: solo si la familia está de acuerdo.',
     badges=[QUIETO], requiere=[18, 21])
idea(47, 'El oso cartero el día que se abre una carta', 'despues', 'S', 'unos 6 nodos',
     'El día que se abre una carta para el futuro, el osito de visita lleva un sobre lacrado.',
     'El oso de la 43.',
     'Una carta que llega merece un cartero.',
     'Con la fecha de apertura de las cartas (capsulas).',
     'Privacidad: la escena es igual para todos, así que diría a toda la familia que hoy se abrió una carta. Los textos sellados no viajan, pero la fecha sí se vería.',
     'Después: hay que decidir si esa fecha puede verse.',
     badges=[QUIETO], requiere=[43])

# ---- Campamento 34 · El pueblo vive
idea(48, 'El domingo, misa: la gente en el atrio y la puerta abierta', 'si', 'S', '+2 nodos (la puerta abierta) · un cambio de sitio, no una animación',
     'Los domingos de 7:00 a 8:00 y de 17:00 a 18:00 la gente del pueblo está junto al atrio de la iglesia y la puerta de la iglesia está abierta.',
     'arte-pueblo.js (la iglesia y la gente).',
     'La misa del domingo es de lo más seguro de un pueblo de aquí, y cambia el pueblo sin moverse nada.',
     'cielo.js deja data-domingo y data-misa; el CSS mueve el grupo de la gente con transform y enseña la puerta abierta. Nada se redibuja.',
     'Ninguno; que la gente no tape el camino ni la plaza en el teléfono (se mide).',
     'Real, barato y se ve cada semana.',
     badges=[('barata', 'Cambia a saltos')], requiere=[18, 21])
idea(49, 'Las gallinas picotean por la mañana', 'si', 'M', 'las gallinas de hoy pasan a su capa pequeña (+1 <svg>) · 7:00–10:00',
     'Las gallinas que ya están en el pueblo picotean el suelo por la mañana: bajan la cabeza a saltos (steps), cada pocos segundos, de una en una.',
     'arte-pueblo.js (v-gallina) y montana.js (su capa).',
     'Es lo primero que se mueve en un pueblo de mañana, y ya están dibujadas.',
     'Su propio <svg> pequeño con will-change: transform; efecto-ambiente y en la lista de la pausa al deslizar. data-mueve: de 7 a 10, salvo los días de zompopos (15–21 de mayo) y de azacuanes (octubre y abril).',
     'Repinta solo su capa pequeña. Medir antes y después con el banco y en el iPhone.',
     'Vida de verdad con dibujos que ya existen.',
     badges=[MUEVE], requiere=[18, 21])
idea(50, 'El perro cruza la plaza por la tarde', 'si', 'M', 'unos 6 nodos en su capa pequeña · 14:00–16:30',
     'Un perro, en silueta como la gente, cruza la plaza despacio una vez cada tanto y se echa a la sombra.',
     'El pueblo, en su capa propia.',
     'Todo pueblo tiene su perro de la plaza.',
     'Su <svg> pequeño, solo transform; efecto-ambiente y en la pausa al deslizar. data-mueve de 14:00 a 16:30; en escritorio el teleférico (23) pasa a 10:00–13:00 para que no coincidan.',
     'Uno a la vez: con el teleférico, cada uno en su franja.',
     'Lo más querido de un pueblo, con una sola capa chica.',
     badges=[MUEVE], requiere=[18, 21])
idea(51, 'El Día de la Cruz (3 de mayo)', 'si', 'S', 'unos 4 nodos, solo ese día',
     'El 3 de mayo, frente a una casa del pueblo, una cruz de palo adornada con frutas y cadenas de papel, como se hace aquí.',
     'arte-pueblo.js.',
     'Es una costumbre salvadoreña de verdad y anuncia las lluvias: encaja con un valle que ya sigue el calendario.',
     'Dibujada siempre y enseñada con una marca de cielo.js para el 3 de mayo.',
     'Que se dibuje con respeto y pequeña.',
     'Real, de un día, y barata.',
     badges=[QUIETO], requiere=[18, 21])
idea(52, 'Niños jugando en la plaza al salir de la escuela', 'despues', 'M', 'unos 8 nodos en su capa · 15:00–17:00',
     'Dos niños en silueta juegan con una pelota en la plaza a la salida de la escuela, entre semana.',
     'El pueblo.',
     'La plaza a esa hora es de los niños.',
     'Su capa pequeña y su franja.',
     'Choca con la franja del perro (14–16:30) y de los pericos (16:30–18): habría que repartir la tarde.',
     'Después: primero el perro; si hay sitio en el teatro, los niños.',
     badges=[MUEVE], requiere=[18, 21])
idea(53, 'El tiangue (día de mercado)', 'despues', 'S', 'unos 6 nodos',
     'Un día a la semana, toldos de colores en la plaza.',
     'La plaza.',
     'El mercado es el corazón de un pueblo.',
     'Dibujado siempre y enseñado ese día.',
     'Dudoso: el día de tiangue cambia de pueblo en pueblo (no es «el jueves» en todos). No quiero inventar una costumbre; dime qué día es el de ustedes.',
     'Después: solo si me dices el día.',
     badges=[QUIETO], requiere=[18, 21])
idea(54, 'Los garrobos al sol al mediodía', 'despues', 'S', 'unos 2 nodos',
     'En las piedras del camino, un garrobo tomando el sol a mediodía, en la época seca.',
     'El primer plano del valle.',
     'Es un animal de aquí, muy de mediodía.',
     'Dibujado siempre, enseñado por la hora y la época.',
     'A ese tamaño un garrobo es una rayita: se lee solo en escritorio.',
     'Después: solo en escritorio y con maqueta.',
     badges=[QUIETO], requiere=[18, 21])

# ---------------------------------------------------------------- lo descartado nuevo (y lo que cambia del de antes)
for k, (t, p) in enumerate(FUERA):
    if t.startswith('Osos en el valle según la temporada'):
        FUERA[k] = ('Muchos osos en el valle a la vez', 'Uno solo de visita (43) sí; varios a la vez serían ruido y competirían con la gente, que es silueta.')
FUERA[0:0] = [
    ('«Tú» como el grande, con su ropa', 'A 320 px en la cumbre solo cabe el grande: habría dos grandes iguales, uno subiendo y otro sentado (maqueta). Por eso «Tú» es un cuarto osito con la mochila naranja.'),
    ('La familia entera sube por el sendero', 'Medido a 1440 y 390 px: el chico y el del mameluco quedan sentados sobre el sendero (nada va sobre el sendero) y junto a los rótulos, y la cumbre queda vacía, que es la composición decidida del campamento 25.'),
    ('Los tres de la cumbre te esperan y se acercan al borde cuando estás cerca', '«Te esperan» empuja a llegar, es decir, a comprar; y moverlos rompe dónde se sientan (colocarOsos). Están ahí, sin reaccionar a tu altitud.'),
    ('Se resbala y se levanta cuando baja el saldo', 'El saldo solo baja con una venta o un traslado, que son decisiones tuyas; un resbalón las comentaría. La app informa y no opina.'),
    ('Cruza una cuerda o un puente colgante entre dos peñas', 'Cambiaría la forma de la montaña y del sendero, que no se toca.'),
    ('Planta la banderita de cada etapa o deja su huella en el rellano', 'Las marcas de etapa siguen «Para el arte de la montaña» (decidido); las huellas ya van en el camino (33).'),
    ('Patinar en el lago helado de madrugada', 'Aquí el lago no se hiela, y la escena sigue lo real.'),
    ('Nubes con forma de oso', 'Si no se lee, es ruido; si se lee, es un chiste pegado en el cielo.'),
    ('Osos en las ventanas (la iglesia, la tienda)', 'Las ventanas encendidas cuentan a las personas con cuenta: un oso en una ventana se leería como alguien.'),
    ('El pregón y el vendedor con su carretón', 'La carreta ya se descartó y el pregón es un sonido (los sonidos del paisaje, también).'),
]

GALERIA.insert(1, ('escala', '«Tú», subiendo', 'Ideas 34–39'))

RESUMEN[:] = [
    'Ocho poses de los mismos tres osos (22–39 nodos cada una) para los huecos de la interfaz (campamentos 26–29): no añaden ni un nodo a la escena, por eso van primero.',
    '«Hacer sitio» (30) mide antes de tocar: un banco que falla solo, no dibujar lo de otra temporada (unos 130 nodos un día normal y 29 en Nochebuena; cambia una regla) y juntar trazos (hasta 69).',
    '«Tú» sube como oso (31): un cuarto osito con su mochila naranja, los pies en el punto exacto y una pisada naranja debajo; anda al subir, respira quieto, festeja al cruzar una etapa. Con sus huellas de oso en un solo trazo, la escena queda con menos nodos que hoy (390 px: de 1019 a 996).',
    'Más vida, una cosa a la vez y cada una en su franja: el teleférico en escritorio (32), los de la cumbre que se estiran a las 7, un osito de visita en el valle según la hora y la fecha (33), la misa del domingo, las gallinas, el perro y el Día de la Cruz (34).',
    'No: la familia entera subiendo (tapa el sendero), «te esperan» (empuja), resbalar cuando baja el saldo, el lago helado, nubes con forma de oso, y el teleférico a la cumbre o en el teléfono.',
]
LEADPLAN = ('Cada campamento es un PR aparte, con sus pruebas y la definición de terminado completa. Los cuatro primeros son solo interfaz (0 nodos en la escena) y se pueden hacer ya; '
            'el 30 prepara la escena con medidas, y del 31 al 34 —«Tú» como oso, el teleférico, más ositos y el pueblo— dependen de él. Lo de «después» solo entra si lo marcas.')

DATOS['bloques'].insert(4, {
    't': '«Tú» como oso, medido (maquetas sobre la app, efectos «todos»)',
    'p': 'Con el dibujo de la interfaz (20 nodos); la versión de escena sería más ligera (unos 11, como cada oso de la cumbre). Con «esenciales» no hay huellas: ahí el oso suma +13 y cabe con lo que libera el 30.',
    'cab': ['Caso', 'Escena', '«Tú» (#m-yo)', 'Huellas', 'Eco'],
    'filas': [['390×844, largo, de día', '1019 → <b>996</b>', '8 → 21', '38 → 2', '—'],
              ['390×844, eco', '994 → <b>982</b>', '8 → 21', '38 → 2', '8 → 19'],
              ['320×568', '971 → <b>957</b>', '8 → 21', '29 → 2', '—'],
              ['1440×900', '1223 → <b>1110</b>', '8 → 21', '128 → 2', '—'],
              ['390×664, mil', '1063 → <b>1038</b>', '8 → 21', '40 → 2', '—']]})
DATOS['bloques'].insert(5, {
    't': 'El teatro propuesto (data-mueve): una cosa a la vez',
    'p': 'Lo que ya existe, en normal; lo nuevo, en negrita. Lo que solo cambia de sitio o de pose a saltos (la misa, el osito de visita, el estirarse) no cuenta como algo en movimiento.',
    'cab': ['Franja', 'Qué se mueve', 'Días'],
    'filas': [['5:00–7:00', 'El torogoz', 'Todos'], ['7:00–8:00', '<b>Los de la cumbre se estiran (a saltos)</b>', 'Todos'],
              ['7:00–10:00', '<b>Las gallinas</b>', 'Salvo zompopos (15–21 mayo, 7:30–10) y azacuanes (octubre y abril, desde las 8)'],
              ['10:00–13:00', '<b>El teleférico</b> (solo escritorio)', 'Salvo azacuanes'], ['14:00–16:30', '<b>El perro</b>', 'Salvo azacuanes (hasta las 16)'],
              ['16:30–18:00', 'Los pericos', 'Todos'], ['18:00–5:00', 'Las luciérnagas', 'Todos'], ['22:00–5:00', 'Los relámpagos', 'Mayo a octubre'],
              ['Domingo 7–8 y 17–18', '<b>La misa (la gente cambia de sitio)</b>', 'Domingos']]})

MOV['filas'] += [
    ['<b>35</b> · «Tú» anda al subir', 'Bamboleo de 2 cuadros mientras sube', 'Dentro de #m-yo (ya se mueve en cada fotograma al subir)', 'Solo mientras sube', 'Nada nuevo: el frente ya se repinta al subir', '<span class="si-b">Sí, sin re-optimizar</span>'],
    ['<b>36</b> · «Tú» respira', 'Escala suave, 2.4 s', 'La animación del halo, pasada al oso', 'Siempre (pausa al deslizar)', 'La misma que hoy', '<span class="si-b">Sí, sin re-optimizar</span>'],
    ['<b>37, 42</b> · Brazos arriba', 'Cambio de pose a saltos (2 repintados)', 'El frente', 'Al cruzar una etapa · 7:00–8:00', 'Como el saltito', '<span class="si-b">Sí, barato</span>'],
    ['<b>43</b> · El osito de visita', 'Cambia de sitio con la franja', 'Un repintado por cambio', 'Amanecer, mañana, tarde', 'Nada', '<span class="si-b">Sí, barato</span>'],
    ['<b>48</b> · La misa del domingo', 'La gente cambia de sitio', 'Un repintado por cambio', 'Domingo 7–8 y 17–18', 'Nada', '<span class="si-b">Sí, barato</span>'],
    ['<b>49</b> · Las gallinas', 'Picotean a saltos', 'Su propio <svg> pequeño', '7:00–10:00', 'Menos que las piscuchas (que hoy se mueven dentro del dibujo grande)', '<span class="de-b">Tras «Hacer sitio»</span>'],
    ['<b>50</b> · El perro', 'Cruza la plaza', 'Su propio <svg> pequeño', '14:00–16:30', 'Como el torogoz', '<span class="de-b">Tras «Hacer sitio»</span>'],
]
MOV['reglas'][4] = ('Obliga a hacer sitio', 'Todo lo nuevo que se mueva en la escena o le sume nodos: «Tú» como oso, el teleférico, los osos del paisaje y el pueblo (31 a 34). Por eso van después del 30.')

NOTA = ('<b>Lo que necesito de ti:</b> los números que no quieres (o los de «después» que sí), con el texto que arma la barra de abajo. '
        'Y lo que solo puedes ver tú: «Tú» como oso en tu iPhone (que se lea a primera vista dónde vas), la 16 con la tele de noche, y la 23 y la 49–50 con «Medir este aparato». '
        'Para la 46 (nacimiento de osos) y la 53 (el día de tiangue), tu palabra y la de la familia.')

# El teleférico (23) deja la tarde al perro (50): de 10:00 a 13:00.
i23 = next(i for i in I if i['n'] == 23)
for k in ('como',):
    assert 'de 10:00 a 16:30 (los días de azacuanes, de 16:00 a 16:30)' in i23[k]
    i23[k] = i23[k].replace('de 10:00 a 16:30 (los días de azacuanes, de 16:00 a 16:30)', 'de 10:00 a 13:00 (la tarde es del perro, la 50; los días de azacuanes, quieta)')
vb = next(v for v in TELE['variantes'] if v['k'] == 'b')
vb['ps'] = [p.replace('Se mueve de 10:00 a 16:30', 'Se mueve de 10:00 a 13:00') for p in vb['ps']]
for f in MOV['filas']:
    if f[0].startswith('<b>23</b>'):
        f[3] = 'De 10:00 a 13:00 (los días de azacuanes, quieta); solo con «todos»'
