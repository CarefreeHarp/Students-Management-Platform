package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.PeticionOrganizacion;
import com.studyflow.platform.model.dto.PlanOrganizadoDTO;
import com.studyflow.platform.model.dto.ProyectoDTO;

/**
 * Organizador de proyectos: reparte el trabajo en el numero de tareas indicado
 * y calcula el plazo de cada una hasta la fecha de entrega.
 */
public interface OrganizadorProyectoService {

    /** Propone un plan sin guardarlo, para previsualizarlo en el formulario. */
    PlanOrganizadoDTO proponerPlan(PeticionOrganizacion peticion);

    /** Aplica un plan nuevo sobre un proyecto existente, reemplazando sus tareas. */
    ProyectoDTO organizarProyecto(String codigoProyecto, int numeroTareas);
}
