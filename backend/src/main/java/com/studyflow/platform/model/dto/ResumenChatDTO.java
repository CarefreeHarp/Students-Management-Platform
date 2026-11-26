package com.studyflow.platform.model.dto;

import java.util.List;

/** Resumen de conversación generado localmente a partir de los mensajes del canal. */
public record ResumenChatDTO(
        Long id,
        String contenido,
        List<String> puntosClave,
        Integer mensajesResumidos,
        String modelo,
        String fechaGeneracion
) {
}
