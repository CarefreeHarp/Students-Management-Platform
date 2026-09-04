package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.MensajeChat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de los mensajes de los canales. */
public interface MensajeChatRepository extends JpaRepository<MensajeChat, Long> {

    List<MensajeChat> findByCanalIdOrderByFechaEnvioAsc(Long canalId);

    long countByCanalId(Long canalId);
}
