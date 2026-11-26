package com.studyflow.platform.model.dto;

/** Configuracion de recordatorios tal como la muestra la pantalla de ajustes. */
public record PreferenciaRecordatorioDTO(
        Long id,
        String canal,
        String telefonoWhatsapp,
        boolean activo,
        Integer minutosAntesTarea,
        Integer minutosAntesEntrega,
        Integer minutosAntesApunte,
        String silencioDesde,
        String silencioHasta,
        /** Indica si la pasarela de WhatsApp tiene credenciales configuradas. */
        boolean pasarelaConectada
) {
}
