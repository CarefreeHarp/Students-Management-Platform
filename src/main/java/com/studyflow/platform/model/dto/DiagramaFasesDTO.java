package com.studyflow.platform.model.dto;

import java.util.List;

/** Diagrama de fases del proyecto: columnas por etapa y tareas con dependencias. */
public record DiagramaFasesDTO(
        String proyectoCodigo,
        String proyectoNombre,
        List<FaseDTO> fases,
        /** Tareas sin responsable y sin bloqueos, listas para que alguien las tome. */
        List<TareaFaseDTO> disponibles
) {

    /** Una columna del diagrama. */
    public record FaseDTO(String nombre, Integer orden, List<TareaFaseDTO> tareas) {
    }
}
