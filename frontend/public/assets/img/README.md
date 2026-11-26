# Logotipo de StudyFlow

Generado a partir de los valores reales de la interfaz (`.brand` y `.brand-mark`
en `src/main/frontend/tailwind.css`), no dibujado aparte: cuadro de 34 px con
radio 11 px, degradado 135° de `#7675ee` a `#4a4bcf`, nombre en Plus Jakarta
Sans ExtraBold a 18 px con interletraje de −0.7 px. Todo escalado ×8 para
exportar. El script que lo produce es `generar-logo.py`, en `src/main/frontend/marca/`.

## La composición

**Símbolo.** Un rayo blanco en el centro, con tres brillos a media opacidad
repartidos a su alrededor sin llegar a tocarlo: el grande ocupa el hueco de abajo
a la derecha que deja la cola del rayo y los dos pequeños se reparten arriba, uno
a cada lado. Los brillos salen del icono `bi-stars`, separado en sus tres piezas
para poder colocarlas una a una.

**Nombre en diagonal.** «Study» arriba y «Flow» abajo, arrancando justo bajo la
«d» (a 240 px del inicio, el avance exacto de «Stu»), lo que produce el escalón.
La «l» de «Flow» es un rayo en índigo `#5b5ce2`, apoyado en la misma línea base
que el resto y un 18 % más alto que una «l» normal, para que remate hacia arriba.

Ajustes que hicieron falta y conviene no deshacer:

- **Brillos despejados del rayo.** Ninguno puede acercarse a menos de 5 px (a un
  cuadro de 288 px); el script lo comprueba pixel a pixel y se planta si tocas
  `COLOCACION` y algún brillo vuelve a pisarlo.
- **`brillo0.png` se limpia al cargarlo.** Al separar `bi-stars` en tres se coló
  una esquirla suelta en esa pieza; el script se queda solo con la mancha grande.
- **Separación entre líneas de 1.18 em.** La cola de la «y» de «Study» baja 32 px
  bajo su línea base y cae justo encima del rayo. Con menos separación, chocan.
- **Rayo estrechado a 0.46 de ancho/alto.** Con su proporción natural (0.625)
  sale casi el doble de ancho que una «l» y deja de leerse como letra.
- **Huecos compensados** a los lados del rayo (+4 px a la izquierda, −5 px a la
  derecha): como se inclina, con huecos iguales se ve descentrado.

## Archivos

| Archivo | Uso |
|---|---|
| `studyflow-logo.png` | Marca completa, fondo transparente. El de uso general. |
| `studyflow-logo-fondo-claro.png` | Sobre el color de fondo de la aplicación (`#f4f6fc`). Para diapositivas y documentos. |
| `studyflow-logo-blanco.png` | Texto en blanco y rayo en lila claro, fondo transparente. Para fondos oscuros. |
| `studyflow-isotipo.png` | Solo el símbolo, cuadrado. Para avatar, favicon o espacios reducidos. |

Los tres primeros miden 1062 × 400 px; el isotipo, 368 × 368. Suficiente para
impresión a tamaño normal.

## Si cambias la marca

El logotipo y la aplicación tienen que enseñar lo mismo. Dentro de la interfaz,
el símbolo es el icono `bi-lightning-charge-fill` de `.brand-mark` (en
`login.html`, `registro.html` y la barra superior que dibuja `main.js`); aquí es
un rayo compuesto a mano porque un solo glifo no puede llevar los brillos
detrás. Si tocas el color o el icono en la hoja de estilos, vuelve a ejecutar
`src/main/frontend/marca/generar-logo.py` y actualiza también esas plantillas, o quedarán distintos.
