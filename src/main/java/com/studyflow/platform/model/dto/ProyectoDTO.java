package com.studyflow.platform.model.dto;

import java.time.LocalDate;
import java.util.List;

/** Proyecto con su equipo, tareas y porcentaje de avance calculado. */
public record ProyectoDTO(
        Long id,
        String codigo,
        String nombre,
        String descripcion,
        LocalDate fechaEntrega,
        String color,
        String etapaActual,
        int progreso,
        List<IntegranteDTO> integrantes,
        List<TareaDTO> tareas
) {
}
