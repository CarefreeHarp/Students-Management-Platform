package com.studyflow.platform.model.dto;

import java.util.List;

/** Mensaje de un canal, con sus reacciones y sus archivos adjuntos. */
public record MensajeChatDTO(
        Long id,
        String autorNombre,
        String autorColor,
        String iniciales,
        String contenido,
        String fechaEnvio,
        boolean generadoPorIa,
        boolean propio,
        List<ReaccionDTO> reacciones,
        List<ArchivoAdjuntoDTO> adjuntos
) {
}
