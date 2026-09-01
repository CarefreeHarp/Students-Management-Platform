package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Integrante;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de integrantes de proyecto. */
public interface IntegranteRepository extends JpaRepository<Integrante, Long> {

    List<Integrante> findByProyectoId(Long proyectoId);
}
