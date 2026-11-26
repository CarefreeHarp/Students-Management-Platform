package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.MensajeChat;
import com.studyflow.platform.model.dto.MensajeParaResumen;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/** Capa de persistencia de los mensajes de los canales. */
public interface MensajeChatRepository extends JpaRepository<MensajeChat, Long> {

    List<MensajeChat> findByCanalIdOrderByFechaEnvioAsc(Long canalId);

    @Query("""
            select new com.studyflow.platform.model.dto.MensajeParaResumen(m.id, m.autorNombre, m.contenido, m.fechaEnvio)
            from MensajeChat m where m.canal.id = :canalId
            order by m.fechaEnvio desc, m.id desc
            """)
    List<MensajeParaResumen> ultimosParaResumen(Long canalId, Pageable pagina);

    long countByCanalId(Long canalId);
}
