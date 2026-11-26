package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.PremioFlow;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PremioFlowRepository extends JpaRepository<PremioFlow, Long> {
    long countByUsuarioId(Long usuarioId);
}
