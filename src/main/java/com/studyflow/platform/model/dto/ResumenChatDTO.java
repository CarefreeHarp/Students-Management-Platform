package com.studyflow.platform.model.dto;

import java.util.List;

/** Resumen de conversacion generado por el asistente. */
public record ResumenChatDTO(
        Long id,
        String contenido,
        List<String> puntosClave,
        Integer mensajesResumidos,
        String modelo,
        String fechaGeneracion
) {
}
