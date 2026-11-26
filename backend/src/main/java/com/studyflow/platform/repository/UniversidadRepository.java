package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Universidad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Capa de persistencia de universidades. */
public interface UniversidadRepository extends JpaRepository<Universidad, Long> {

    Optional<Universidad> findByNombreIgnoreCase(String nombre);
}
