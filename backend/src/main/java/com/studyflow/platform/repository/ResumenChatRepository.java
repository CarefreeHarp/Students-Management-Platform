package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.ResumenChat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Capa de persistencia de los resumenes de conversacion. */
public interface ResumenChatRepository extends JpaRepository<ResumenChat, Long> {

    Optional<ResumenChat> findFirstByCanalIdAndHastaMensajeIdAndModeloAndVersionPromptOrderByFechaGeneracionDesc(
            Long canalId, Long hastaMensajeId, String modelo, Integer versionPrompt);

    List<ResumenChat> findByCanalIdOrderByFechaGeneracionDesc(Long canalId);
}
