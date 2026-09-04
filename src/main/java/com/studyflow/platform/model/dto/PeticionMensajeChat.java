package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo para publicar un mensaje en un chat grupal. */
public record PeticionMensajeChat(
        @NotBlank String contenido,
        String autorNombre
) {
}
