package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.ResumenChat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de los resumenes de conversacion. */
public interface ResumenChatRepository extends JpaRepository<ResumenChat, Long> {

    List<ResumenChat> findByCanalIdOrderByFechaGeneracionDesc(Long canalId);
}
