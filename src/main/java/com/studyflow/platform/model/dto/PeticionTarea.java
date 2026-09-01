package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/** Datos de una tarea enviados desde los formularios de proyecto. */
public record PeticionTarea(
        @NotBlank String titulo,
        String descripcion,
        String responsable,
        String etapa,
        LocalDate fechaLimite,
        String horaLimite,
        String estado
) {
}
