/**
 * Guía de estilo: rellena las muestras leyendo lo que el navegador ya calculó.
 *
 * Ningún valor está escrito en esta página. Se consultan con getComputedStyle
 * sobre elementos pintados con las clases reales, así que si alguien cambia un
 * color en tailwind.config.js y recompila, la guía se actualiza sola en vez de
 * quedarse mintiendo.
 */
(function () {
  'use strict';

  /** «rgb(91, 92, 226)» → «#5b5ce2». Devuelve el original si no sabe leerlo. */
  function aHex(color) {
    const canal = color.match(/\d+(\.\d+)?/g);
    if (!canal || canal.length < 3) return color;
    return '#' + canal.slice(0, 3)
      .map((v) => Number(v).toString(16).padStart(2, '0'))
      .join('');
  }

  const aviso = document.getElementById('aviso-copia');
  let temporizador;

  function avisar(texto) {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { aviso.hidden = true; }, 1600);
  }

  async function copiar(valor) {
    try {
      await navigator.clipboard.writeText(valor);
      avisar('Copiado: ' + valor);
    } catch (error) {
      // El portapapeles falla sin contexto seguro o sin permiso; no es motivo
      // para dejar al usuario sin el valor.
      avisar(valor);
    }
  }

  function hacerCopiable(elemento, valor) {
    elemento.style.cursor = 'pointer';
    elemento.title = valor + ' · pulsa para copiar';
    elemento.addEventListener('click', () => copiar(valor));
  }

  // Colores planos: el hex sale del fondo ya resuelto.
  document.querySelectorAll('[data-muestra]').forEach((muestra) => {
    const hex = aHex(getComputedStyle(muestra).backgroundColor);
    const destino = muestra.parentElement.querySelector('[data-hex]');
    if (destino) destino.textContent = hex;
    hacerCopiable(muestra, hex);
  });

  // Tonos de tarjeta: el valor vive en la variable --tono, no en el fondo,
  // porque el degradado se compone después a partir de ella.
  document.querySelectorAll('[data-hex-tono]').forEach((destino) => {
    const tarjeta = destino.closest('.tarjeta-color');
    const tono = getComputedStyle(tarjeta).getPropertyValue('--tono').trim();
    destino.textContent = tono;
    hacerCopiable(tarjeta, tono);
  });

  document.querySelectorAll('[data-sombra]').forEach((muestra) => {
    hacerCopiable(muestra, getComputedStyle(muestra).boxShadow);
  });

  document.querySelectorAll('[data-radio]').forEach((muestra) => {
    const radio = getComputedStyle(muestra).borderTopLeftRadius;
    const destino = muestra.parentElement.querySelector('[data-radio-valor]');
    if (destino) destino.textContent = radio;
    hacerCopiable(muestra, radio);
  });
})();
