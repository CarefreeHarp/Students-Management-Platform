package com.studyflow.platform.pagos;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PagoPruebaRepository extends JpaRepository<PagoPrueba, String> {
    List<PagoPrueba> findByUsuarioIdOrderByCreadoDesc(Long usuarioId);
}
