package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.ApunteClase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de los apuntes tomados despues de clase. */
public interface ApunteClaseRepository extends JpaRepository<ApunteClase, Long> {

    List<ApunteClase> findByUsuarioIdOrderByFechaClaseDesc(Long usuarioId);

    List<ApunteClase> findByUsuarioIdAndResueltoFalseOrderByFechaLimiteAsc(Long usuarioId);

    List<ApunteClase> findByMateriaIdOrderByFechaClaseDesc(Long materiaId);
}
