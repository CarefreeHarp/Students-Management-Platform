package com.studyflow.platform.model.dto;

import java.util.List;

/** Project phases and task dependency branches. */
public record DiagramaFasesDTO(
        String proyectoCodigo,
        String proyectoNombre,
        List<FaseDTO> fases,
        /** Tareas sin responsable y sin bloqueos, listas para que alguien las tome. */
        List<TareaFaseDTO> disponibles,
        String modoReparto,
        boolean puedeConfigurarReparto,
        /** The project owner can create, rename, reorder and remove empty phases. */
        boolean puedeConfigurarFases
) {

    /** A phase in the vertical project graph. */
    public record FaseDTO(Long id, String nombre, Integer orden, List<TareaFaseDTO> tareas) {
    }
}
