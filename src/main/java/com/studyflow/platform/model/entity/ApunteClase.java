package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Punto importante anotado despues de una clase: un trabajo que anunciaron,
 * un tema que hay que repasar, una lectura pendiente.
 *
 * <p>Cuando el apunte tiene {@code fechaLimite}, el servicio de recordatorios
 * programa un aviso con la antelacion configurada por el estudiante.</p>
 */
@Entity
@Table(name = "apunte_clase")
@Getter
@Setter
@NoArgsConstructor
public class ApunteClase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    /** Materia en la que se tomo el apunte. Puede quedar vacio. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "materia_id")
    private Materia materia;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(length = 800)
    private String contenido;

    /** Dia de la clase a la que corresponde el apunte. */
    @Column(name = "fecha_clase", nullable = false)
    private LocalDate fechaClase = LocalDate.now();

    /** Fecha en la que vence lo anotado; si es nula, no genera recordatorio. */
    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    /** Marca los apuntes que el estudiante considera prioritarios. */
    @Column(nullable = false)
    private boolean importante = false;

    @Column(nullable = false)
    private boolean resuelto = false;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}
