package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo del formulario "registrar entregable". */
public record PeticionEntregable(
        @NotBlank String nombre,
        String descripcion,
        @NotBlank String url,
        String tipo,
        String estado,
        String responsable,
        Long tareaId
) {
}
