package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.MensajeChat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Capa de persistencia de los mensajes de los canales. */
public interface MensajeChatRepository extends JpaRepository<MensajeChat, Long> {

    List<MensajeChat> findByCanalIdOrderByFechaEnvioAsc(Long canalId);

    Optional<MensajeChat> findFirstByCanalIdAndAutorId(Long canalId, Long autorId);

    long countByCanalId(Long canalId);
}
