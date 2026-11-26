package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Horario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de alternativas de horario. */
public interface HorarioRepository extends JpaRepository<Horario, Long> {

    List<Horario> findByUsuarioIdOrderByPuntajeDesc(Long usuarioId);
}
