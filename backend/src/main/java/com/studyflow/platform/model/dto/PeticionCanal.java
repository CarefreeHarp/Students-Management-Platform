package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo para crear un canal dentro de un proyecto. */
public record PeticionCanal(
        @NotBlank String nombre,
        String descripcion,
        String tipo,
        Long tareaId
) {
}
