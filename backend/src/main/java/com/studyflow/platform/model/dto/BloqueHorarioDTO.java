package com.studyflow.platform.model.dto;

/** Franja semanal de una materia. */
public record BloqueHorarioDTO(
        Long id,
        String dia,
        String horaInicio,
        String horaFin,
        String aula
) {
}
