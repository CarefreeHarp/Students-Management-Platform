package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.ReaccionMensaje;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Capa de persistencia de las reacciones con emoji. */
public interface ReaccionMensajeRepository extends JpaRepository<ReaccionMensaje, Long> {

    Optional<ReaccionMensaje> findByMensajeIdAndUsuarioIdAndEmoji(Long mensajeId, Long usuarioId, String emoji);

    List<ReaccionMensaje> findByMensajeId(Long mensajeId);
}
