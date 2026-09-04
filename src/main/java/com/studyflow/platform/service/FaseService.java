package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.DiagramaFasesDTO;
import com.studyflow.platform.model.dto.TareaFaseDTO;

import java.util.List;

/**
 * Diagrama de fases del proyecto: dependencias entre tareas, reparto
 * voluntario y cambio de estado.
 */
public interface FaseService {

    /** Tareas agrupadas por etapa, con sus dependencias y bloqueos. */
    DiagramaFasesDTO diagrama(String codigoProyecto);

    /** Declara que una tarea depende de otra, evitando ciclos. */
    TareaFaseDTO agregarDependencia(Long tareaId, Long dependeDeId);

    TareaFaseDTO quitarDependencia(Long tareaId, Long dependeDeId);

    /** El usuario actual toma una tarea disponible. */
    TareaFaseDTO reclamar(Long tareaId, Long usuarioId);

    /** Devuelve la tarea al conjunto de disponibles. */
    TareaFaseDTO liberar(Long tareaId);

    /** Cambia el estado: sin empezar, en proceso, en revision o terminada. */
    TareaFaseDTO cambiarEstado(Long tareaId, String estado);

    /** Tareas sin responsable y sin dependencias pendientes. */
    List<TareaFaseDTO> disponibles(String codigoProyecto);
}
