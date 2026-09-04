package com.studyflow.platform.model.dto;

import java.util.List;

/**
 * Resultado del organizador: el plan completo con sus tareas y plazos,
 * mas la explicacion que acompanara a la propuesta en la interfaz.
 */
public record PlanOrganizadoDTO(
        String resumen,
        String modelo,
        Integer numeroTareas,
        Integer diasDisponibles,
        List<TareaPlanificadaDTO> tareas
) {
}
