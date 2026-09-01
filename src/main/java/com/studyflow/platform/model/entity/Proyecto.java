package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Proyecto academico. Es la raiz del agregado: contiene integrantes,
 * etapas, tareas y bitacora de avance.
 */
@Entity
@Table(name = "proyecto", uniqueConstraints = @UniqueConstraint(columnNames = "codigo"))
@Getter
@Setter
@NoArgsConstructor
public class Proyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador legible usado por la interfaz y las URLs (/proyectos/{codigo}). */
    @NotBlank
    @Column(nullable = false, length = 90)
    private String codigo;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 600)
    private String descripcion;

    @Column(name = "fecha_entrega")
    private LocalDate fechaEntrega;

    /** Color hexadecimal con el que se distingue el proyecto en los calendarios. */
    @Column(length = 9)
    private String color = "#5b5ce2";

    @Column(name = "etapa_actual", length = 60)
    private String etapaActual = "Planeación";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "propietario_id", nullable = false)
    private Usuario propietario;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @OneToMany(mappedBy = "proyecto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Integrante> integrantes = new ArrayList<>();

    @OneToMany(mappedBy = "proyecto", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<Etapa> etapas = new ArrayList<>();

    @OneToMany(mappedBy = "proyecto", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaLimite ASC")
    private List<Tarea> tareas = new ArrayList<>();

    @OneToMany(mappedBy = "proyecto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RegistroAvance> registros = new ArrayList<>();

    public void agregarIntegrante(Integrante integrante) {
        integrante.setProyecto(this);
        integrantes.add(integrante);
    }

    public void agregarTarea(Tarea tarea) {
        tarea.setProyecto(this);
        tareas.add(tarea);
    }

    public void agregarEtapa(Etapa etapa) {
        etapa.setProyecto(this);
        etapas.add(etapa);
    }
}
