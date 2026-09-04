package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Canal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/** Capa de persistencia de los canales de conversacion. */
public interface CanalRepository extends JpaRepository<Canal, Long> {

    List<Canal> findByProyectoIdOrderByOrdenAscNombreAsc(Long proyectoId);

    Optional<Canal> findByProyectoIdAndSlug(Long proyectoId, String slug);

    boolean existsByProyectoIdAndSlug(Long proyectoId, String slug);

    /** Canales de los proyectos en los que participa el usuario. */
    @Query("""
            select distinct c from Canal c
            left join c.proyecto p
            left join p.integrantes i
            where c.creador.id = :usuarioId
               or p.propietario.id = :usuarioId
               or i.usuario.id = :usuarioId
            order by c.fechaCreacion desc
            """)
    List<Canal> findParticipaUsuario(Long usuarioId);
}
