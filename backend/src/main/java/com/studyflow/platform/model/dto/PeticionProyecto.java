package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.util.List;

/** Cuerpo del formulario "Crear proyecto". */
public record PeticionProyecto(
        @NotBlank(message = "es obligatorio") String nombre,
        @NotBlank(message = "es obligatoria") String descripcion,
        @NotNull(message = "es obligatoria") LocalDate fechaEntrega,
        String etapaInicial,
        String color,
        List<PeticionIntegrante> integrantes,
        List<PeticionTarea> tareas,
        List<String> etapas,
        @NotBlank(message = "es obligatorio")
        @Pattern(regexp = "asignado|libre", message = "debe ser asignado o libre") String modoReparto
) {
    /** Preserve clients and seed fixtures that predate configurable assignment. */
    public PeticionProyecto(String nombre, String descripcion, LocalDate fechaEntrega,
                            String etapaInicial, String color, List<PeticionIntegrante> integrantes,
                            List<PeticionTarea> tareas) {
        this(nombre, descripcion, fechaEntrega, etapaInicial, color, integrantes, tareas, null, "asignado");
    }

    public PeticionProyecto(String nombre, String descripcion, LocalDate fechaEntrega,
                            String etapaInicial, String color, List<PeticionIntegrante> integrantes,
                            List<PeticionTarea> tareas, String modoReparto) {
        this(nombre, descripcion, fechaEntrega, etapaInicial, color, integrantes, tareas, null, modoReparto);
    }
}
