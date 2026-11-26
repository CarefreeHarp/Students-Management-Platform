package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Recordatorio;
import com.studyflow.platform.model.enums.EstadoRecordatorio;
import com.studyflow.platform.model.enums.TipoRecordatorio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Capa de persistencia de recordatorios. */
public interface RecordatorioRepository extends JpaRepository<Recordatorio, Long> {

    List<Recordatorio> findByUsuarioIdOrderByFechaHoraAsc(Long usuarioId);

    List<Recordatorio> findByUsuarioIdAndEstadoOrderByFechaHoraAsc(Long usuarioId, EstadoRecordatorio estado);

    /** Cola de envio: lo que ya vencio y sigue programado. */
    List<Recordatorio> findByEstadoAndFechaHoraLessThanEqualOrderByFechaHoraAsc(EstadoRecordatorio estado,
                                                                               LocalDateTime limite);

    /** Evita duplicar el aviso de una misma tarea. */
    Optional<Recordatorio> findByTareaIdAndTipoAndEstado(Long tareaId, TipoRecordatorio tipo, EstadoRecordatorio estado);

    Optional<Recordatorio> findByProyectoIdAndTipoAndEstado(Long proyectoId, TipoRecordatorio tipo, EstadoRecordatorio estado);

    Optional<Recordatorio> findByApunteIdAndTipoAndEstado(Long apunteId, TipoRecordatorio tipo, EstadoRecordatorio estado);

    long countByUsuarioIdAndEstado(Long usuarioId, EstadoRecordatorio estado);
}
