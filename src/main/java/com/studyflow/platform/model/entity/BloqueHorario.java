package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.DiaSemana;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

/** Franja semanal de una materia (dia + hora de inicio y fin). */
@Entity
@Table(name = "bloque_horario")
@Getter
@Setter
@NoArgsConstructor
public class BloqueHorario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "materia_id", nullable = false)
    private Materia materia;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private DiaSemana dia = DiaSemana.LUNES;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Column(length = 60)
    private String aula;

    public BloqueHorario(DiaSemana dia, LocalTime horaInicio, LocalTime horaFin, String aula) {
        this.dia = dia;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.aula = aula;
    }

    /** Comprueba si dos bloques se solapan; base del generador de horarios. */
    public boolean chocaCon(BloqueHorario otro) {
        return otro != null
                && dia == otro.dia
                && horaInicio.isBefore(otro.horaFin)
                && otro.horaInicio.isBefore(horaFin);
    }
}
