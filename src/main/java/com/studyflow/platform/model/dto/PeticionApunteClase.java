package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/** Cuerpo del formulario "anotar despues de clase". */
public record PeticionApunteClase(
        @NotBlank String titulo,
        String contenido,
        Long materiaId,
        LocalDate fechaClase,
        LocalDate fechaLimite,
        Boolean importante
) {
}
