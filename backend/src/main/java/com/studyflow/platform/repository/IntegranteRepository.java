package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Integrante;
import org.springframework.data.jpa.repository.JpaRepository;


import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

/** Capa de persistencia de integrantes de proyecto. */
public interface IntegranteRepository extends JpaRepository<Integrante, Long> {

    List<Integrante> findByProyectoId(Long proyectoId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Integrante i where i.id = :id")
    Optional<Integrante> bloquearPorId(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Integrante i where i.invitacionHash = :hash")
    Optional<Integrante> bloquearInvitacion(String hash);
}
