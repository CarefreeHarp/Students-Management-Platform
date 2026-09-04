"""
Logotipo de StudyFlow.

  · Símbolo: rayo suelto en el centro y brillos repartidos a su alrededor,
    sobre el cuadro con degradado.
  · Nombre en diagonal: «Study» arriba y «Flow» arrancando bajo la «d»,
    con la «l» sustituida por un rayo.

Los colores y proporciones salen de .brand y .brand-mark en tailwind.css.
"""
import pathlib
from collections import deque

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = pathlib.Path(__file__).parent
SALIDA = AQUI / "../../resources/static/assets/img"

ESCALA = 8
ESTRECHEZ_RAYO = 0.46      # ancho/alto del rayo; una «l» ronda 0.34
TEXTO = 18 * ESCALA                 # 144 px de cuerpo
RADIO_REL = 11 / 34                 # radio del cuadro, relativo a su lado
INICIO, FIN = (0x76, 0x75, 0xee), (0x4a, 0x4b, 0xcf)
TINTA = (0x18, 0x23, 0x38)
INDIGO = (0x5b, 0x5c, 0xe2)
LIENZO = (0xf4, 0xf6, 0xfc)

fuente = ImageFont.truetype(str(AQUI / "pjs.ttf"), TEXTO)
INTERLETRAJE = -0.7 * ESCALA


def recortar(imagen):
    """Deja la figura sin margen transparente, para medirla de verdad."""
    return imagen.crop(imagen.getbbox())


def pieza_mayor(imagen):
    """Se queda con la mancha de píxeles más grande y borra las demás.

    Al separar `bi-stars` en tres trozos, `brillo0.png` se llevó de propina un
    esquirla del brillo vecino. Antes no se veía porque el rayo pasaba justo por
    encima; con los brillos ya despejados, saldría a la vista.
    """
    alfa = imagen.getchannel("A")
    ancho = alfa.width
    lleno = [v > 8 for v in alfa.getdata()]
    visto = [False] * len(lleno)
    piezas = []
    for arranque in range(len(lleno)):
        if not lleno[arranque] or visto[arranque]:
            continue
        cola, pieza, visto[arranque] = deque([arranque]), [], True
        while cola:
            p = cola.popleft()
            pieza.append(p)
            columna = p % ancho
            vecinos = [p - ancho, p + ancho]
            if columna:
                vecinos.append(p - 1)
            if columna < ancho - 1:
                vecinos.append(p + 1)
            for v in vecinos:
                if 0 <= v < len(lleno) and lleno[v] and not visto[v]:
                    visto[v] = True
                    cola.append(v)
        piezas.append(pieza)

    mayor = set(max(piezas, key=len))
    limpia = Image.new("L", alfa.size, 0)
    limpia.putdata([v if i in mayor else 0 for i, v in enumerate(alfa.getdata())])
    figura = imagen.copy()
    figura.putalpha(limpia)
    return figura


def teñir(figura, color):
    solido = Image.new("RGBA", figura.size, color + (255,))
    solido.putalpha(figura.getchannel("A"))
    return solido


RAYO = recortar(Image.open(AQUI / "lightning-fill.png").convert("RGBA"))
BRILLOS = [recortar(pieza_mayor(Image.open(AQUI / f"brillo{i}.png").convert("RGBA")))
           for i in range(3)]

# Cada brillo: (índice, lado y posición como fracción del cuadro). Ninguno toca el
# rayo: el grande cae en el hueco de abajo a la derecha que deja la cola, y los dos
# pequeños se reparten arriba, uno a cada lado. HOLGURA comprueba que siga así.
COLOCACION = [(0, 0.26, 0.615, 0.585), (1, 0.20, 0.58, 0.15), (2, 0.14, 0.17, 0.24)]
HOLGURA = 5 / 288                   # separación mínima al rayo, en fracción del cuadro


def comprobar_holgura(lado, mascara_rayo, brillos):
    """Avisa si algún brillo se acerca al rayo más de lo permitido."""
    margen = max(1, round(lado * HOLGURA))
    ancho_rayo = mascara_rayo.filter(ImageFilter.MaxFilter(margen * 2 + 1)).getdata()
    for indice, brillo, posicion in brillos:
        capa = Image.new("L", (lado, lado), 0)
        capa.paste(brillo.getchannel("A"), posicion)
        if any(a > 8 and r > 8 for a, r in zip(capa.getdata(), ancho_rayo)):
            raise SystemExit(f"El brillo {indice} pisa el rayo: revisa COLOCACION.")


def simbolo(lado):
    """Cuadro con degradado, brillos alrededor y el rayo despejado en medio."""
    degradado = Image.new("RGB", (lado, lado))
    pintor = ImageDraw.Draw(degradado)
    for i in range(lado * 2):
        t = i / (lado * 2 - 1)
        pintor.line([(i, 0), (0, i)],
                    fill=tuple(round(a + (b - a) * t) for a, b in zip(INICIO, FIN)))

    mascara = Image.new("L", (lado, lado), 0)
    ImageDraw.Draw(mascara).rounded_rectangle(
        [0, 0, lado - 1, lado - 1], round(lado * RADIO_REL), fill=255)

    cuadro = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    cuadro.paste(degradado, (0, 0), mascara)

    # Los brillos van a media opacidad, para que acompañen sin competir.
    colocados = []
    for indice, tam, bx, by in COLOCACION:
        b = round(lado * tam)
        brillo = BRILLOS[indice].resize((b, b), Image.LANCZOS)
        brillo.putalpha(brillo.getchannel("A").point(lambda v: round(v * 0.55)))
        posicion = (round(lado * bx), round(lado * by))
        cuadro.alpha_composite(brillo, posicion)
        colocados.append((indice, brillo, posicion))

    alto = round(lado * 0.66)
    ancho = round(alto * ESTRECHEZ_RAYO)
    rayo = RAYO.resize((ancho, alto), Image.LANCZOS)
    esquina = (round(lado * 0.33), (lado - alto) // 2)
    cuadro.alpha_composite(rayo, esquina)

    mascara_rayo = Image.new("L", (lado, lado), 0)
    mascara_rayo.paste(rayo.getchannel("A"), esquina)
    comprobar_holgura(lado, mascara_rayo, colocados)
    return cuadro


def avance(cadena):
    return sum(fuente.getlength(c) for c in cadena) + INTERLETRAJE * max(0, len(cadena) - 1)


def escribir(lienzo, cadena, x, y, color):
    pintor = ImageDraw.Draw(lienzo)
    for caracter in cadena:
        pintor.text((x, y), caracter, font=fuente, fill=color)
        x += fuente.getlength(caracter) + INTERLETRAJE
    return x


def logotipo(color_texto, color_rayo, fondo, nombre):
    # Alto de una «l»: el rayo la sustituye, así que comparte su altura.
    izq, arriba_l, der, abajo_l = fuente.getbbox("l")
    alto_l = abajo_l - arriba_l

    arriba_s = fuente.getbbox("Study")[1]
    # La «y» de «Study» baja 32 px bajo su base y cae justo sobre el rayo:
    # la separación entre líneas tiene que dejarla libre.
    alto_linea = round(TEXTO * 1.18)

    alto_rayo = round(alto_l * 1.18)          # sobresale un poco, como remate
    ancho_rayo = round(alto_rayo * ESTRECHEZ_RAYO)
    # El rayo se inclina: su punta baja sale hacia la izquierda y la alta hacia
    # la derecha, así que los huecos van compensados para que se vean iguales.
    hueco_izq = round(TEXTO * 0.05) + 4
    hueco_der = round(TEXTO * 0.05) - 5

    # Línea 2 arranca bajo la «d» de «Study».
    sangria = round(avance("Stu"))
    ancho_l1 = round(avance("Study"))
    ancho_l2 = round(avance("F") + hueco_izq + ancho_rayo + hueco_der + avance("ow"))
    base_l2 = alto_linea + abajo_l                       # línea base de «Flow»

    margen = round(TEXTO * 0.42)
    ancho_texto = max(ancho_l1, sangria + ancho_l2)
    alto_texto = alto_linea + fuente.getbbox("ow")[3] - arriba_s

    lado = round(alto_texto * 0.92)
    separacion = round(TEXTO * 0.55)

    ancho = margen * 2 + lado + separacion + ancho_texto
    alto = margen * 2 + max(lado, alto_texto)

    lienzo = Image.new("RGBA", (ancho, alto), fondo or (0, 0, 0, 0))
    lienzo.alpha_composite(simbolo(lado), (margen, (alto - lado) // 2))

    x0 = margen + lado + separacion
    y0 = (alto - alto_texto) // 2 - arriba_s

    escribir(lienzo, "Study", x0, y0, color_texto)

    y1 = y0 + alto_linea
    x = escribir(lienzo, "F", x0 + sangria, y1, color_texto)

    # El rayo ocupa el sitio de la «l», apoyado en la misma línea base.
    rayo = teñir(RAYO.resize((ancho_rayo, alto_rayo), Image.LANCZOS), color_rayo)
    lienzo.alpha_composite(rayo, (round(x + hueco_izq), round(y0 + base_l2 - alto_rayo)))
    escribir(lienzo, "ow", x + hueco_izq + ancho_rayo + hueco_der, y1, color_texto)

    lienzo.save(SALIDA / nombre)
    return lienzo.size


print("  transparente  ", logotipo(TINTA, INDIGO, None, "studyflow-logo.png"))
print("  fondo claro   ", logotipo(TINTA, INDIGO, LIENZO + (255,), "studyflow-logo-fondo-claro.png"))
print("  para oscuro   ", logotipo((255, 255, 255), (0x9d, 0x9e, 0xf7), None, "studyflow-logo-blanco.png"))

lado = TEXTO * 2
iso = simbolo(lado)
margen = round(lado * 0.14)
caja = Image.new("RGBA", (lado + margen * 2,) * 2, (0, 0, 0, 0))
caja.alpha_composite(iso, (margen, margen))
caja.save(SALIDA / "studyflow-isotipo.png")
print("  isotipo       ", caja.size)
