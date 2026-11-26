package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/** Cuerpo del formulario "registrar entregable". */
public record PeticionEntregable(
        @NotBlank String nombre,
        String descripcion,
        @NotBlank String url,
        String tipo,
        String estado,
        String responsable,
        Long tareaId,
        LocalDate fechaLimite
) {
    public PeticionEntregable(String nombre, String descripcion, String url, String tipo,
                             String estado, String responsable, Long tareaId) {
        this(nombre, descripcion, url, tipo, estado, responsable, tareaId, null);
    }
}
