package com.studyflow.platform.model.dto;

/** Archivo compartido en un canal. */
public record ArchivoAdjuntoDTO(
        Long id,
        String nombre,
        String tipoMime,
        String tamano,
        boolean esImagen,
        String url,
        String subidoPor,
        String fechaSubida,
        String canal
) {
}
