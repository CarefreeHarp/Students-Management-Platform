package com.studyflow.platform.model.dto;

/** Documento o entregable registrado en el proyecto. */
public record EntregableDTO(
        Long id,
        String nombre,
        String descripcion,
        String url,
        String tipo,
        String tipoEtiqueta,
        String icono,
        String estado,
        String estadoEtiqueta,
        String responsable,
        String colorResponsable,
        String tarea,
        String fechaRegistro
) {
}
