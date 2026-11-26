package com.studyflow.platform.model.dto;

import java.util.List;

/** Resumen guardado de los mensajes de un canal. */
public record ResumenChatDTO(
        Long id,
        String contenido,
        List<String> puntosClave,
        Integer mensajesResumidos,
        String modelo,
        String fechaGeneracion
) {
}
