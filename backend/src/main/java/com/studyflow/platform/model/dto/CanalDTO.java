package com.studyflow.platform.model.dto;

import java.util.List;

/** Canal de un proyecto con sus mensajes, archivos y ultimo resumen. */
public record CanalDTO(
        Long id,
        String nombre,
        String slug,
        String tipo,
        String descripcion,
        String proyectoCodigo,
        String proyectoNombre,
        String color,
        Integer totalMensajes,
        Integer totalArchivos,
        String ultimaActividad,
        boolean borrable,
        List<MensajeChatDTO> mensajes,
        ResumenChatDTO ultimoResumen
) {
}
