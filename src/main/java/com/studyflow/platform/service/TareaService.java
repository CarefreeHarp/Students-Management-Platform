package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.TareaDTO;
import com.studyflow.platform.model.entity.ArchivoTarea;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/** Reglas de negocio de las tareas y su seguimiento. */
public interface TareaService {

    List<TareaDTO> listarPorProyecto(String codigoProyecto);

    TareaDTO crear(String codigoProyecto, PeticionTarea peticion);

    TareaDTO actualizar(Long tareaId, PeticionTarea peticion);

    /** Cierra la tarea dejando un resultado escrito, un archivo, o ambos. */
    TareaDTO marcarCompletada(Long tareaId, String resultado, MultipartFile archivo);

    /** Archivo adjuntado como evidencia del resultado de una tarea. */
    ArchivoTarea archivoResultado(Long tareaId);

    Resource contenidoResultado(Long tareaId);

    void eliminar(Long tareaId);

    /** Tareas de todos los proyectos entre dos fechas: alimenta el calendario general. */
    List<TareaDTO> agendaEntre(LocalDate desde, LocalDate hasta);
}
