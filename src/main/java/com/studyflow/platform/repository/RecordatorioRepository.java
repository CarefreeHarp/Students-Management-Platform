package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Recordatorio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

/** Capa de persistencia de recordatorios. */
public interface RecordatorioRepository extends JpaRepository<Recordatorio, Long> {

    List<Recordatorio> findByUsuarioIdAndEnviadoFalseAndFechaHoraBefore(Long usuarioId, LocalDateTime limite);
}
