package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.RegistroAvance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de la bitacora de avance. */
public interface RegistroAvanceRepository extends JpaRepository<RegistroAvance, Long> {

    List<RegistroAvance> findByProyectoIdOrderByFechaRegistroDesc(Long proyectoId);
}
