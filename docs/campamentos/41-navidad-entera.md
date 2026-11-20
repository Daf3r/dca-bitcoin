# Campamento 41 · La Navidad entera

Experimento en `chatgpt/campamento-41`, a partir de `claude/plan-39-50` (`b3f15ab`). Escena con la hora civil de El Salvador. Los turnos de fiesta tienen prioridad sobre la misa dominical, el mercado del sábado y las vacaciones. El reloj se actualiza en el múltiplo de cinco minutos que corresponde, incluso si la página se abrió entre dos turnos.

## Qué se ve

| Fecha | Madrugada y mañana | Mediodía y tarde | Anochecer, noche y medianoche |
|---|---|---|---|
| 24 de diciembre | A las 04:30 salen el panadero y la primera vendedora. Desde las 07:00 hay compras, escalera y focos. El oso de nieve lleva bufanda cuando hay sitio. | A las 11:30 preparan la olla. Desde las 14:00 llegan el regalo y los oseznos con la pelota. El perro espera cerca del fuego. | Cena y brindis a las 17:45, misa de gallo a las 21:00 y abrazos desde las 23:40. La mesa es más corta en teléfono. Los osos miran al pueblo y alzan los brazos en el clímax. |
| 25 de diciembre | Los abrazos siguen hasta la 01:00. Quedan papelitos en la calle. A las 07:00 sale una vecina y a las 09:00 los oseznos estrenan sus carritos y su pelota. La cumbre duerme y «Tú» sigue en su carpa hasta las 09:00. | A las 12:00 hay recalentado, mesa chica y hamaca. Desde las 14:00 pasean las familias, con un osezno en hombros y una visita al nacimiento. | A las 17:45 salen las pupusas, a las 20:00 quedan las sillas y a las 22:00 se vacía la calle. Los regalos abiertos siguen junto a la familia donde caben. |
| 31 de diciembre | La primera escoba sale a las 05:00. Desde las 07:00 aparecen el tendedero, la segunda escoba y la vendedora. | A las 11:30 se ve la ropa de estreno. A las 14:00 los oseznos preparan sus volcancitos apagados y juegan. | Cena desde las 17:45, último brindis a las 22:00. De 23:00 a 00:00 los vecinos miran la torre y el perro se refugia bajo la banca. A las 23:50 la familia de la cumbre mira el cielo. |
| 1 de enero | De 00:00 a 01:00 se abrazan en parejas. Después, solo el perro y los restos en la calle. La cumbre y «Tú» descansan hasta las 09:00, cuando sale la que barre. | A las 12:00 almuerzan en casa y a las 14:00 empiezan las visitas. «Tú» saluda desde el sendero. | Conversación en la acera desde las 17:45, sillas a las 20:00 y descanso a las 22:00. |
| 6 de enero | El pueblo duerme hasta las 05:00 y a las 07:00 salen los vecinos y los oseznos de vacaciones. | Preparan las cajas a las 11:30. A las 14:00 un vecino baja los focos de la escalera, los pequeños ayudan y «Tú» levanta una mano. | Desde las 17:45 se despiden junto al nacimiento. A las 20:00 quedan las sillas y a las 22:00 el pueblo duerme. Al pasar al 7 desaparecen el pino y el nacimiento. |

Las dos medianoches conservan los cohetes de 23:50 a 00:30. El perro se queda echado y las gallinas se esconden. Las luciérnagas ceden su franja al brindis o al volcancito. En misa y ante la torre el pueblo está quieto. Los dos actores festivos usan un SVG pequeño con `transform` u `opacity` y una pose quieta para los niveles de efectos esenciales y ninguno. La montaña conserva su semilla, el orden del azar, el sendero y el lugar exacto de «Tú». Los rótulos y la nieve determinan si caben los objetos de la cumbre. No se consultan datos familiares para elegir los turnos.

## Presupuesto medido

Chromium headless 153, ventana de 390 × 664, escenario de mil compras con fecha fija 2026-11-18. Nodos con efectos esenciales, animaciones visibles con todos. Las columnas muestran **base → rama**. Los topes son 1.100 nodos en la escena, 300 en el valle, 40 en los osos y 110 animaciones en total. El dibujo principal admite 56 y el frente 16.

| Momento | Escena | Valle | Osos | Animaciones | Principal | Frente |
|---|---:|---:|---:|---:|---:|---:|
| día normal | 926 | 197 | 33 | 13 | 5 | 5 |
| noche normal | 928 | 199 | 33 | 88 | 41 | 5 |
| Nochebuena | 1030 → 1040 | 221 → 224 | 35 | 98 → 66 | 42 → 10 | 14 |
| cena del 24 | 1030 → 1055 | 221 → 238 | 35 | 101 → 70 | 45 → 13 | 14 |
| doce del 24 | 1030 → 1049 | 221 → 232 | 35 | 110 → 66 | 42 → 10 | 26 → 13 |
| Navidad | 1030 → 1048 | 221 → 232 | 35 → 36 | 110 → 66 | 42 → 10 | 26 → 13 |
| espera del 31 | 1002 → 1005 | 221 | 35 | 104 → 65 | 42 → 10 | 20 → 13 |
| Año Nuevo | 1002 → 1016 | 221 → 230 | 35 → 36 | 104 → 66 | 42 → 10 | 20 → 13 |
| tarde de lluvia | 920 | 190 | 33 | 32 | 3 | 5 |
| noche de lluvia | 920 | 191 | 33 | 102 | 55 | 5 |

La base excedía el presupuesto del frente justo durante los cohetes, una franja que el banco anterior no medía. Para mantener los fuegos, el papel picado, el aro de «Tú» y el ambiente del sendero quedan quietos durante el espectáculo. La noche lluviosa conserva una animación de margen en el principal. Los fps del emulador bajo carga no sirven para proyectar la fluidez del iPhone.

## Alcance de las ideas

Se implementaron los guiones 210–215, el abrazo 162 y las intervenciones de la cumbre, «Tú» y los animales de 216–218 para estas cinco fechas. Se reutilizaron los dibujos del prototipo que correspondían a Navidad, ajustando composiciones, cajas de colisión, escala móvil y número de osos. La animación del panadero (116), la hamaca en movimiento (199), las estrellitas que titilan (201) y el reloj ancho de la torre (203) esperan al campamento 39 según el plan. Aquí se ven el panadero, la hamaca, las estrellitas y la espera de las doce en sus posiciones quietas. El oso de nieve y la carpa cubren las fechas de este encargo. Su evolución durante el resto del mes o del año corresponde a los campamentos 47 y 48. El 6 se guardan los adornos del pueblo salvadoreño.

## Mejoras generales para otra ronda

| Dónde | Mejora propuesta | Coste estimado | Riesgo |
|---|---|---|---|
| `arte-vecinos.js` y `montana.js` | Compartir la lista de vecinos ya colocados entre el grupo quieto y su capa móvil. Hoy se calculan dos veces. | 0 nodos, 0 animaciones | Bajo. Invalidar al cambiar de tamaño y turno. |
| `banco_rendimiento.mjs` | Añadir un caso de escritorio ancho con el teleférico visible. | 0 nodos, 0 animaciones en la app. Más tiempo de prueba. | Bajo. Fijar topes propios de ese tamaño. |
| `arte-pueblo.js` | Revisar en la televisión real cuánto se distinguen la calle y las casas de atrás cuando se encienden las ventanas. | 0 nodos, 0 animaciones si basta ajustar los colores existentes. | Medio por el contraste nocturno. |

## Verificación

Las pruebas usaron datos sintéticos y `FECHA_PRUEBA=2026-11-18`. Para el bloque de interfaz y el banco de rendimiento, el servidor genera credenciales temporales.

| Comprobación | Resultado |
|---|---|
| `npm ci --prefix tests` y `npx --prefix tests playwright install chromium` | Se instalaron las dependencias. La descarga del navegador devolvió HTTP 502. Las pruebas de navegador usaron Playwright 1.63.0 con Chromium headless 153.0.8010.0. |
| `node tests/test_lib.mjs` y `python tests/test_api.py` | Pasaron 978 comprobaciones de lógica y 1.314 de API. |
| `cd tests && npx tsc -p tsconfig.json`, `npx --prefix tests biome check app/static tests` y `node tests/comprobar_recorte.mjs` | Tipos correctos, 81 archivos revisados sin avisos de Biome y 70 archivos equivalentes tras el recorte. |
| `BLOQUE="campamento 41" node tests/test_ui.mjs` | Pasaron 511 comprobaciones. También pasaron los bloques 36 y 37, con 10 cada uno. |
| `node tests/banco_rendimiento.mjs` | Los diez escenarios cumplieron los topes. La tabla de arriba compara la rama con la base a las mismas horas. |
| `SOLO=mil node tests/barrido_ui.mjs`, también con `PESTANAS=1` | Pasaron los 16 casos normales y los 64 con pestañas. |
| `node tests/rendimiento_lighthouse.mjs` | En la comparación consecutiva, la mediana de rendimiento móvil de la app fue 71 en la base y 68 en la rama. La primera corrida de la rama dio 65. La entrada obtuvo 95 en la comparación. Accesibilidad y buenas prácticas obtuvieron 100 en ambas pantallas. |

Fallo de Lighthouse en la rama:

```text
MAL la app: performance mediana 68 de 72 · 67 · 68 (mínimo 70)
```

Lighthouse señaló la pintura del mayor elemento visible y el bloqueo del hilo principal, entre otras métricas. Las mediciones compartieron máquina con otras pruebas. Sigue pendiente determinar cuánto de la diferencia es reproducible en un entorno aislado.

Se iniciaron la suite completa de interfaz y `node tests/auditoria_axe.mjs`. La sesión se interrumpió antes de recuperar sus resultados finales. Quedan sin verificar la suite completa, axe, la regresión visual contra referencias, el CI remoto, Safari, VoiceOver, el iPhone físico y la televisión física.

El ZIP de la entrega contiene 117 capturas de pantalla y 43 detalles ampliados de la plaza. Incluye los turnos de las cinco fechas, el paso al 7 de enero y la matriz de 320, 390, 768, 1440 y 2560 px, más el teléfono acostado. La matriz cruza dos temas, día y noche y tres niveles de efectos. En 360 × 640 también se comprobó que el diálogo de novedades cabe entero.
