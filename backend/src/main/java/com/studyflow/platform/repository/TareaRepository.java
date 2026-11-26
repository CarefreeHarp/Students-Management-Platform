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
    @Query("""
            select t from Tarea t where t.fechaLimite between :desde and :hasta
            and (t.proyecto.propietario.id = :usuarioId or exists (
                select i.id from Integrante i where i.proyecto = t.proyecto and i.usuario.id = :usuarioId
            ))
            order by t.fechaLimite, t.horaLimite
            """)
    List<Tarea> buscarAgenda(Long usuarioId, LocalDate desde, LocalDate hasta);
}
