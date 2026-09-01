package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** Capa de persistencia de tareas. */
public interface TareaRepository extends JpaRepository<Tarea, Long> {

    List<Tarea> findByProyectoIdOrderByFechaLimiteAsc(Long proyectoId);

    Optional<Tarea> findByProyectoIdAndCodigo(Long proyectoId, String codigo);

    long countByProyectoIdAndEstado(Long proyectoId, EstadoTarea estado);

    /** Tareas de la semana mostrada en el calendario general del panel. */
    List<Tarea> findByFechaLimiteBetweenOrderByFechaLimiteAscHoraLimiteAsc(LocalDate desde, LocalDate hasta);
}
