// Tema claro u oscuro, aplicado ANTES de pintar (script clásico y bloqueante en <head>: sin parpadeo).
// «automático» sigue al teléfono, también si cambia con la app abierta; «claro» y «oscuro» se recuerdan por
// dispositivo. El CSS solo mira `html[data-tema]`: este script lo deja siempre en «claro» u «oscuro».
(() => {
  const CLAVE = 'libro.tema';
  const raiz = document.documentElement;
  const sistema = matchMedia('(prefers-color-scheme: light)');
  const FONDO = { claro: '#fbe8cc', oscuro: '#0a1322' }; // color de la barra del navegador
  const preferencia = () => {
    try {
      const v = localStorage.getItem(CLAVE);
      return v === 'claro' || v === 'oscuro' ? v : 'auto';
    } catch {
      return 'auto';
    }
  };
  function aplicar() {
    const pref = preferencia();
    const tema = pref === 'auto' ? (sistema.matches ? 'claro' : 'oscuro') : pref;
    raiz.dataset.tema = tema;
    for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
      m.removeAttribute('media');
      m.setAttribute('content', FONDO[tema]);
    }
  }
  function fijar(pref) {
    try {
      if (pref === 'claro' || pref === 'oscuro') localStorage.setItem(CLAVE, pref);
      else localStorage.removeItem(CLAVE);
    } catch { /* sin almacenamiento: vale solo para esta visita */ }
    aplicar();
  }
  sistema.addEventListener('change', aplicar);
  aplicar();
  window.libroTema = { preferencia, fijar };
})();
