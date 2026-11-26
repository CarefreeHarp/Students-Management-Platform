package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Proyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/** Capa de persistencia de proyectos academicos. */
public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {

    Optional<Proyecto> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    List<Proyecto> findByPropietarioIdOrderByFechaEntregaAsc(Long propietarioId);

    /** Proyectos donde el usuario es propietario o figura como integrante. */
    @Query("""
            select distinct p from Proyecto p
            left join p.integrantes i
            where p.propietario.id = :usuarioId or i.usuario.id = :usuarioId
            order by p.fechaEntrega asc
            """)
    List<Proyecto> findParticipaUsuario(Long usuarioId);
}
