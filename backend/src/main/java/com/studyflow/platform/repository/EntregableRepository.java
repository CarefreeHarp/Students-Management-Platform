package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Entregable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia del registro de entregables. */
public interface EntregableRepository extends JpaRepository<Entregable, Long> {

    List<Entregable> findByProyectoIdOrderByFechaRegistroDesc(Long proyectoId);
}
