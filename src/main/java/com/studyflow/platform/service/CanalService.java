package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.*;

import java.util.List;

/** Canales de conversacion de un proyecto, sus mensajes y sus reacciones. */
public interface CanalService {

    /** Todos los canales visibles para el usuario, agrupables por proyecto. */
    List<CanalDTO> listar(Long usuarioId);

    /** Canales de un proyecto concreto, en el orden de la barra lateral. */
    List<CanalDTO> listarDeProyecto(String codigoProyecto, Long usuarioId);

    CanalDTO obtener(Long canalId, Long usuarioId);

    CanalDTO obtenerPorSlug(String codigoProyecto, String slug, Long usuarioId);

    CanalDTO crear(String codigoProyecto, Long usuarioId, PeticionCanal peticion);

    void eliminar(Long canalId);

    MensajeChatDTO publicar(Long canalId, Long usuarioId, PeticionMensajeChat peticion);

    /**
     * Anade o retira una reaccion. Si la persona ya habia reaccionado con ese
     * emoji, la pulsacion lo quita.
     */
    MensajeChatDTO alternarReaccion(Long mensajeId, Long usuarioId, String emoji);

    ResumenChatDTO resumir(Long canalId);

    List<ResumenChatDTO> historialResumenes(Long canalId);
}
