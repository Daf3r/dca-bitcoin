// Letra grande y alto contraste, aplicados ANTES de pintar (script clásico y bloqueante en <head>, como tema.js: sin parpadeo).
// Se eligen en «Tu cuenta» y se recuerdan por dispositivo. El CSS solo mira `html[data-letra]` y `html[data-contraste="alto"]`.
//   letra:     «» (normal) · «grande» (112 %) · «muy-grande» (125 %): escala la raíz y con ella todo lo escrito en rem.
//   contraste: «auto» (sigue a `prefers-contrast: more` del sistema, también si cambia con la app abierta) · «alto» · «normal».
//   ganancia:  «» (tinta neutra con signo y flecha; lo normal) · «color» (verde y rojo): `html[data-ganancia="color"]` (campamento 17).
(() => {
  const raiz = document.documentElement;
  const leer = (clave, validos, defecto) => {
    try {
      const v = localStorage.getItem(clave);
      return validos.includes(v) ? v : defecto;
    } catch {
      return defecto;
    }
  };
  const guardar = (clave, valor, defecto) => {
    try {
      if (valor === defecto) localStorage.removeItem(clave);
      else localStorage.setItem(clave, valor);
    } catch { /* sin almacenamiento: vale solo para esta visita */ }
  };
  const sistema = matchMedia('(prefers-contrast: more)');
  const letra = () => leer('libro.letra', ['grande', 'muy-grande'], '');
  const contraste = () => leer('libro.contraste', ['alto', 'normal'], 'auto');
  const ganancia = () => leer('libro.ganancia', ['color'], '');
  function aplicar() {
    const l = letra();
    if (l) raiz.dataset.letra = l; else delete raiz.dataset.letra;
    const c = contraste();
    if (c === 'alto' || (c === 'auto' && sistema.matches)) raiz.dataset.contraste = 'alto'; else delete raiz.dataset.contraste;
    if (ganancia()) raiz.dataset.ganancia = 'color'; else delete raiz.dataset.ganancia;
  }
  sistema.addEventListener('change', aplicar);
  aplicar();
  window.libroAcc = {
    letra,
    contraste,
    ganancia,
    contrasteAlto: () => raiz.dataset.contraste === 'alto',
    fijarLetra(v) { guardar('libro.letra', v, ''); aplicar(); },
    fijarContraste(v) { guardar('libro.contraste', v, 'auto'); aplicar(); },
    fijarGanancia(v) { guardar('libro.ganancia', v, ''); aplicar(); },
  };
})();
