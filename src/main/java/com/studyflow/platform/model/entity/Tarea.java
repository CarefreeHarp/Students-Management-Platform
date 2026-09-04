package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.EstadoTarea;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Tarea de un proyecto, con responsable, fecha, etapa, estado y archivos adjuntos. */
@Entity
@Table(name = "tarea", uniqueConstraints = @UniqueConstraint(columnNames = {"proyecto_id", "codigo"}))
@Getter
@Setter
@NoArgsConstructor
public class Tarea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador legible usado por la interfaz (ej. "cog-1"). */
    @Column(length = 90)
    private String codigo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false)
    private Proyecto proyecto;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(length = 500)
    private String descripcion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responsable_id")
    private Integrante responsable;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "etapa_id")
    private Etapa etapa;

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(name = "hora_limite")
    private LocalTime horaLimite;

    /**
     * Se usa un convertidor en lugar de {@code @Enumerated} para que una base
     * creada con los estados anteriores se siga pudiendo leer.
     */
    @Convert(converter = com.studyflow.platform.model.enums.EstadoTareaConverter.class)
    @Column(nullable = false, length = 20)
    private EstadoTarea estado = EstadoTarea.SIN_EMPEZAR;

    /**
     * Tareas que deben terminarse antes que esta. Alimentan el diagrama de fases
     * y determinan si una tarea esta disponible para que alguien la reclame.
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "tarea_dependencia",
            joinColumns = @JoinColumn(name = "tarea_id"),
            inverseJoinColumns = @JoinColumn(name = "depende_de_id"))
    private Set<Tarea> dependencias = new LinkedHashSet<>();

    @Column(name = "fecha_completada")
    private LocalDateTime fechaCompletada;

    /** Marca si la tarea fue propuesta por el asistente de IA. */
    @Column(name = "generada_por_ia", nullable = false)
    private boolean generadaPorIa = false;

    @OneToMany(mappedBy = "tarea", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArchivoTarea> archivos = new ArrayList<>();

    public boolean estaCompletada() {
        return estado == EstadoTarea.TERMINADA;
    }

    /**
     * Una tarea esta disponible para reclamarse cuando nadie la ha tomado
     * y todas sus dependencias estan terminadas.
     */
    public boolean estaDisponible() {
        return responsable == null
                && estado.estaAbierta()
                && dependencias.stream().allMatch(Tarea::estaCompletada);
    }

    /** Dependencias que aun bloquean el arranque de esta tarea. */
    public List<Tarea> bloqueantes() {
        return dependencias.stream().filter(dependencia -> !dependencia.estaCompletada()).toList();
    }
}
