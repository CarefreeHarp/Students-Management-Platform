package com.studyflow.platform.model.dto;

import java.util.List;

/** Alternativa de horario comparable en la pagina "Crear horario". */
public record HorarioDTO(
        Long id,
        String nombre,
        String descripcion,
        String tipo,
        Integer puntaje,
        Integer totalCreditos,
        boolean generadoPorIa,
        boolean seleccionado,
        List<MateriaDTO> materias
) {
}
