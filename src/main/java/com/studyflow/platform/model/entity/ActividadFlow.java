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

import java.time.LocalDate;

/** Conserva el día contabilizado incluso si se reabre o elimina la tarea. */
@Entity
@Table(name = "actividad_flow", indexes = @Index(name = "idx_actividad_flow_usuario_fecha", columnList = "usuario_id, fecha"))
@NoArgsConstructor
public class ActividadFlow {
    @Id
    @Column(name = "tarea_id")
    private Long tareaId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDate fecha;

    public ActividadFlow(Long tareaId, Usuario usuario, LocalDate fecha) {
        this.tareaId = tareaId;
        this.usuario = usuario;
        this.fecha = fecha;
    }
}
