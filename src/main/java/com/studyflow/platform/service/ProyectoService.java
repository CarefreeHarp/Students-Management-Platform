package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.PeticionIntegrante;
import com.studyflow.platform.model.dto.PeticionFases;
import com.studyflow.platform.model.dto.PeticionProyecto;
import com.studyflow.platform.model.dto.ProyectoDTO;
import com.studyflow.platform.model.entity.Proyecto;

import java.util.List;

/** Reglas de negocio de la gestion de proyectos. */
public interface ProyectoService {

    List<ProyectoDTO> listarDeUsuario(Long usuarioId);

    ProyectoDTO obtenerPorCodigo(String codigo);

    Proyecto obtenerEntidadPorCodigo(String codigo);

    ProyectoDTO crear(PeticionProyecto peticion, Long usuarioId);

    ProyectoDTO actualizarIntegrantes(String codigo, List<PeticionIntegrante> integrantes);

    ProyectoDTO actualizarReparto(String codigo, String modoReparto, Long usuarioId);

    /** Reconciles the ordered phases without orphaning tasks from their current phase. */
    ProyectoDTO actualizarFases(String codigo, PeticionFases peticion, Long usuarioId);

    void eliminar(String codigo);

    /** Porcentaje de tareas completadas del proyecto. */
    int calcularProgreso(String codigo);
}
