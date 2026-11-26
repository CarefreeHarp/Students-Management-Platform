package com.studyflow.platform.model.dto;

import java.util.List;

/** Materia disponible del planificador de horarios. */
public record MateriaDTO(
        Long id,
        String nombre,
        String codigo,
        String profesor,
        Integer creditos,
        Integer indiceColor,
        List<BloqueHorarioDTO> bloques
) {
}
