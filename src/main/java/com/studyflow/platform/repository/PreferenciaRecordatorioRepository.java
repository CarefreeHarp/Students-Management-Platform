package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.PreferenciaRecordatorio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Capa de persistencia de la configuracion de recordatorios. */
public interface PreferenciaRecordatorioRepository extends JpaRepository<PreferenciaRecordatorio, Long> {

    Optional<PreferenciaRecordatorio> findByUsuarioId(Long usuarioId);
}
