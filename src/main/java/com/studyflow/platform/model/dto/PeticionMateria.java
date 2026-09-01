package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo del formulario "Anadir materia" del planificador de horarios. */
public record PeticionMateria(
        @NotBlank String nombre,
        String codigo,
        String profesor,
        Integer creditos,
        String dia,
        String horaInicio,
        String horaFin,
        String aula
) {
}
