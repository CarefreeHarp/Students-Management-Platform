package com.studyflow.platform.model.dto;

import java.time.LocalDate;
import java.util.List;

/** Tarea vista desde el diagrama de fases, con sus dependencias. */
public record TareaFaseDTO(
        Long id,
        String titulo,
        String descripcion,
        String etapa,
        Integer ordenEtapa,
        String estado,
        String estadoEtiqueta,
        String responsable,
        String colorResponsable,
        LocalDate fechaLimite,
        /** Identificadores de las tareas que deben terminarse antes. */
        List<Long> dependencias,
        /** Títulos de las dependencias que aún bloquean esta tarea. */
        List<String> bloqueantes,
        /** Nadie la ha tomado y sus dependencias están listas. */
        boolean disponible
) {
}
