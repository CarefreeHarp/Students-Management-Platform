package com.studyflow.platform.model.dto;

import java.time.LocalDate;

/** Tarea lista para pintarse en tarjetas y calendarios. */
public record TareaDTO(
        Long id,
        String codigo,
        String titulo,
        String descripcion,
        String responsable,
        String colorResponsable,
        String etapa,
        LocalDate fechaLimite,
        String horaLimite,
        String estado,
        String estadoEtiqueta,
        boolean generadaPorIa
) {
}
