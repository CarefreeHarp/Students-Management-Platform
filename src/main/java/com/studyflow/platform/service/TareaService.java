package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.TareaDTO;

import java.time.LocalDate;
import java.util.List;

/** Reglas de negocio de las tareas y su seguimiento. */
public interface TareaService {

    List<TareaDTO> listarPorProyecto(String codigoProyecto);

    TareaDTO crear(String codigoProyecto, PeticionTarea peticion);

    TareaDTO actualizar(Long tareaId, PeticionTarea peticion);

    /** Marca la tarea como completada y registra la nota de avance opcional. */
    TareaDTO marcarCompletada(Long tareaId, String nota);

    void eliminar(Long tareaId);

    /** Tareas de todos los proyectos entre dos fechas: alimenta el calendario general. */
    List<TareaDTO> agendaEntre(LocalDate desde, LocalDate hasta);
}
