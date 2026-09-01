package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.PeticionIntegrante;
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

    void eliminar(String codigo);

    /** Porcentaje de tareas completadas del proyecto. */
    int calcularProgreso(String codigo);
}
