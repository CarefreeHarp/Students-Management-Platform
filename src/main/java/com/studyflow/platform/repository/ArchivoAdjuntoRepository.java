package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.ArchivoAdjunto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Capa de persistencia de los archivos compartidos en los canales. */
public interface ArchivoAdjuntoRepository extends JpaRepository<ArchivoAdjunto, Long> {

    List<ArchivoAdjunto> findByCanalIdOrderByFechaSubidaDesc(Long canalId);

    List<ArchivoAdjunto> findByCanalIdAndEsImagenOrderByFechaSubidaDesc(Long canalId, boolean esImagen);

    /** Todos los archivos de un proyecto, atravesando sus canales. */
    List<ArchivoAdjunto> findByCanalProyectoIdOrderByFechaSubidaDesc(Long proyectoId);
}
