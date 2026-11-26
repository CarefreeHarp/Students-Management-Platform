package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Entregable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/** Capa de persistencia del registro de entregables. */
public interface EntregableRepository extends JpaRepository<Entregable, Long> {

    List<Entregable> findByProyectoIdOrderByFechaRegistroDesc(Long proyectoId);

    @Query("""
            select e from Entregable e join fetch e.proyecto p left join fetch e.tarea t
            where (e.fechaLimite is not null or t.fechaLimite is not null)
            and (p.propietario.id = :usuarioId or exists (
                select i.id from Integrante i where i.proyecto = p and i.usuario.id = :usuarioId))
            """)
    List<Entregable> findConVencimientoDeUsuario(Long usuarioId);
}
