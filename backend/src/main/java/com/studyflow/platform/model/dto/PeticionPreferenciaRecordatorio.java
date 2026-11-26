package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Cuerpo del formulario de configuracion de recordatorios. */
public record PeticionPreferenciaRecordatorio(
        String canal,
        String telefonoWhatsapp,
        Boolean activo,
        @Min(0) @Max(43200) Integer minutosAntesTarea,
        @Min(0) @Max(43200) Integer minutosAntesEntrega,
        @Min(0) @Max(43200) Integer minutosAntesApunte,
        String silencioDesde,
        String silencioHasta
) {
}
