package com.studyflow.platform.model.dto;

/** Integrante tal como lo consume la interfaz (tarjetas y calendarios). */
public record IntegranteDTO(
        Long id,
        String nombre,
        String contacto,
        String iniciales,
        String color,
        String rol
) {
}
