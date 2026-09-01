package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

/** Cuerpo del formulario "Crear proyecto". */
public record PeticionProyecto(
        @NotBlank String nombre,
        String descripcion,
        LocalDate fechaEntrega,
        String etapaInicial,
        String color,
        List<PeticionIntegrante> integrantes,
        List<PeticionTarea> tareas
) {
}
