package com.studyflow.platform.model.dto;

import java.time.LocalDate;

/** Apunte tomado despues de una clase. */
public record ApunteClaseDTO(
        Long id,
        String titulo,
        String contenido,
        String materia,
        Integer indiceColorMateria,
        LocalDate fechaClase,
        LocalDate fechaLimite,
        boolean importante,
        boolean resuelto
) {
}
