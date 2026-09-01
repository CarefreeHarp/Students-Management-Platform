package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

/** Datos de un integrante enviados desde el formulario de creacion. */
public record PeticionIntegrante(
        @NotBlank String nombre,
        String contacto,
        String color
) {
}
