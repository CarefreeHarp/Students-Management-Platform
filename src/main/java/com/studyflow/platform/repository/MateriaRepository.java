package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Materia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de materias del planificador de horarios. */
public interface MateriaRepository extends JpaRepository<Materia, Long> {

    List<Materia> findByUsuarioIdOrderByNombreAsc(Long usuarioId);

    void deleteByUsuarioId(Long usuarioId);
}
