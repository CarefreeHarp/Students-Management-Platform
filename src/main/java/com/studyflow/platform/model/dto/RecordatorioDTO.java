package com.studyflow.platform.model.dto;

/** Recordatorio programado tal como se lista en la interfaz. */
public record RecordatorioDTO(
        Long id,
        String tipo,
        String tipoEtiqueta,
        String canal,
        String estado,
        String titulo,
        String mensaje,
        String fechaHora,
        String fechaVencimiento,
        String proyecto,
        String errorEnvio
) {
}
