package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.LocalDate;
import java.util.List;

/**
 * Peticion al organizador de proyectos: cuantas tareas se quieren y con que
 * contexto, para que el asistente reparta el trabajo y calcule los plazos.
 */
public record PeticionOrganizacion(
        String nombreProyecto,
        String descripcion,
        LocalDate fechaEntrega,
        @Min(1) @Max(20) Integer numeroTareas,
        List<String> integrantes
) {
}
