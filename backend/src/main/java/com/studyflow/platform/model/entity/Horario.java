package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Alternativa de horario guardada o propuesta por el asistente de IA.
 * Corresponde a las tarjetas comparables de la pagina "Crear horario".
 */
@Entity
@Table(name = "horario")
@Getter
@Setter
@NoArgsConstructor
public class Horario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 300)
    private String descripcion;

    @Column(length = 40)
    private String tipo;

    /** Puntaje 0-100 con el que se ordenan las alternativas propuestas. */
    private Integer puntaje;

    @Column(name = "total_creditos")
    private Integer totalCreditos;

    @Column(name = "generado_por_ia", nullable = false)
    private boolean generadoPorIa = false;

    @Column(nullable = false)
    private boolean seleccionado = false;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "horario_materia",
            joinColumns = @JoinColumn(name = "horario_id"),
            inverseJoinColumns = @JoinColumn(name = "materia_id"))
    private Set<Materia> materias = new LinkedHashSet<>();
}
