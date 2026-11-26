package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.ActividadFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface ActividadFlowRepository extends JpaRepository<ActividadFlow, Long> {
    @Query("""
            select distinct a.fecha from ActividadFlow a
            where a.usuario.id = :usuarioId and a.fecha <= :hoy
            order by a.fecha desc
            """)
    List<LocalDate> diasConActividad(Long usuarioId, LocalDate hoy);
}
