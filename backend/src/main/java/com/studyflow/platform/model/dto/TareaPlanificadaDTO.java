package com.studyflow.platform.model.dto;

import java.time.LocalDate;

/** Tarea propuesta por el organizador, con su ventana de trabajo. */
public record TareaPlanificadaDTO(
        Integer orden,
        String titulo,
        String descripcion,
        String etapa,
        String responsable,
        LocalDate fechaInicio,
        LocalDate fechaLimite,
        Integer diasEstimados
) {
}
