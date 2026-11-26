package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A phase as edited from the project dependency diagram. */
public record PeticionFase(
        Long id,
        @NotBlank(message = "es obligatorio")
        @Size(max = 60, message = "no puede superar 60 caracteres")
        String nombre
) {
}
