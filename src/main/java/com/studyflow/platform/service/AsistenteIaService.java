package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.PeticionTarea;

import java.time.LocalDate;
import java.util.List;

/**
 * Asistente de planificacion. Hoy devuelve propuestas simuladas
 * (boton "Rellenar con IA" y "Generar horarios con IA"); mas adelante
 * esta interfaz puede apuntar a un modelo real sin tocar los controladores.
 */
public interface AsistenteIaService {

    /** Propone tareas, etapas, fechas y reparto inicial para un proyecto nuevo. */
    List<PeticionTarea> proponerPlan(String descripcion, LocalDate fechaEntrega, List<String> integrantes);

    /** Texto de resumen que acompana a la propuesta. */
    String resumirContexto(String descripcion);
}
