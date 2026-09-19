package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** Capa de persistencia de tareas. */
public interface TareaRepository extends JpaRepository<Tarea, Long> {

    List<Tarea> findByProyectoIdOrderByFechaLimiteAsc(Long proyectoId);

    Optional<Tarea> findByProyectoIdAndCodigo(Long proyectoId, String codigo);

    /** Serialize competing claims so only one member can take an available task. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Tarea t where t.id = :id")
    Optional<Tarea> findParaRepartoById(Long id);

    long countByProyectoIdAndEstado(Long proyectoId, EstadoTarea estado);

    /** Tareas de la semana mostrada en el calendario general del panel. */
    List<Tarea> findByFechaLimiteBetweenOrderByFechaLimiteAscHoraLimiteAsc(LocalDate desde, LocalDate hasta);
}
