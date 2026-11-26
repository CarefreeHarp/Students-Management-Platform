package com.studyflow.platform.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;

/** Conserva el premio del estudiante incluso si después se borra o reasigna la tarea. */
@Entity
@Table(name = "premio_flow", indexes = @Index(name = "idx_premio_flow_usuario", columnList = "usuario_id"))
@NoArgsConstructor
public class PremioFlow {
    @Id
    @Column(name = "tarea_id")
    private Long tareaId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    public PremioFlow(Long tareaId, Usuario usuario) {
        this.tareaId = tareaId;
        this.usuario = usuario;
    }
}
