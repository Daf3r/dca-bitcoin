# Campamento 29 · Detalles con cariño

Reglas vigentes e índice: [CLAUDE.md](../../CLAUDE.md). Las poses: [26-osos-en-la-interfaz.md](26-osos-en-la-interfaz.md).

## Campamento 29 · Detalles con cariño (Fase 3 de los osos, ideas 15–17)
Tres lugares de la familia y de la sala, con los osos quietos. No toca la escena.

- **El libro de cumbre** (idea 15, `firmas.js`): junto a «Libro de cumbre», una huella de oso (`huella({ tam: 20 })`, un solo trazo) del color de la tinta del cuaderno (`--fi-tinta2`), como si los de la cumbre también firmaran. Se pone una vez; no cambia el alto ni el foco.
- **La tele dormida** (idea 16, `tv.js: dormir`): de 23:00 a 5:00, bajo la hora, la luna y «La tele duerme hasta las 5:00», los tres durmiendo (`pose('duermen', { tam: 150, plantar: false })`), muy tenues (opacidad 0.42). Van **dentro de `#tvn-caja`**, así que se corren con la hora cada 5 minutos (no marcan la pantalla) y no se animan. La noche de la tele es siempre oscura: el dibujo toma los tonos del tema oscuro aunque la app esté en claro. En diciembre, el grande duerme con su gorro de Navidad.
- **El teleférico de la película** (idea 17, `historia.js`, `teleferico()` en `arte-osos-poses.js`, 29 nodos): en la tarjeta de «La película del ascenso» de «Tu historia», una cabina roja colgada de su cable con los tres asomados a la ventana (de madrugada, con los ojos cerrados). Es la variante (c) del análisis del teleférico: la idea del hermano del dueño **sin tocar la montaña**. A la derecha del texto; desde 700 px, entre el texto y el botón; con menos de 380 px, más chica (56 px) y encima. El botón «Ver la película» no cambia (48 px, el foco igual).

### Verificado
- `test_lib`: la cabina es decorativa, sin estilos en línea, con los tres, su ventana, techo y cable (y sus ojos de madrugada).
- Bloque «campamento 29» de `test_ui`: la huella del color de la tinta y una sola al volver a abrir el libro; la tele a las 23:30 con los tres dormidos bajo la hora, tenues, una sola vez; la tarjeta de la película a 320, 390, 768 y 1440 px con la cabina dentro de la tarjeta, sin tocar el botón (≥ 48 px) y sin desplazamiento de lado.
- «Qué hay de nuevo» (`2026-12-g`) cuenta también el teleférico y la tele: cabe en 360×640 (586 px).
- Capturas del libro de cumbre (390 claro, 1440 oscuro), la tarjeta de la película (320, 390 y 1440, claro y oscuro) y la tele dormida a 1920.

### Sin probar aquí
- La tele de verdad en la sala, de noche (que los osos se vean tenues y no brillen); iPhone real y Safari.
