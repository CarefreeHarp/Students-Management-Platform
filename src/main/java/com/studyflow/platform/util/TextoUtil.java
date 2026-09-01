package com.studyflow.platform.util;

import java.text.Normalizer;
import java.util.Locale;

/** Utilidades de texto compartidas por la capa de servicio. */
public final class TextoUtil {

    private TextoUtil() {
    }

    /** Convierte "Rediseño de la app" en "redisenio-de-la-app" para usarlo en URLs. */
    public static String aSlug(String valor) {
        if (valor == null || valor.isBlank()) {
            return "proyecto";
        }
        String sinTildes = Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug = sinTildes.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isBlank() ? "proyecto" : slug;
    }

    /** Iniciales de un nombre, usadas en los avatares del equipo. */
    public static String iniciales(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return "?";
        }
        String[] partes = nombre.trim().split("\\s+");
        StringBuilder resultado = new StringBuilder();
        for (int i = 0; i < Math.min(2, partes.length); i++) {
            resultado.append(Character.toUpperCase(partes[i].charAt(0)));
        }
        return resultado.toString();
    }
}
