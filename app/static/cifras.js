// Cifras secundarias con su forma corta para teléfonos muy pequeños (≤ 359 px de ancho), sin medir nada en JS.
// Se escriben las dos formas y el CSS (`.c-l` / `.c-c`) muestra una u otra; la que no se ve no existe para los lectores de pantalla.
// OJO: `textContent` trae las dos; para lo visible, `innerText`. El saldo grande nunca se abrevia: esto es solo para cifras secundarias.

/** Añade a `padre` el texto `largo` y su forma `corto`. */
export function dual(padre, largo, corto) {
  const l = document.createElement('span');
  l.className = 'c-l';
  l.textContent = largo;
  const c = document.createElement('span');
  c.className = 'c-c';
  c.textContent = corto;
  padre.append(l, c);
  return padre;
}
