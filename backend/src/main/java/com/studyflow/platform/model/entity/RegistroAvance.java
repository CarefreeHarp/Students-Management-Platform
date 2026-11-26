package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Bitacora del proyecto: notas y resumenes del desarrollo.
 * Alimenta el formulario "marcar tarea terminada" del panel principal.
 */
@Entity
@Table(name = "registro_avance")
@Getter
@Setter
@NoArgsConstructor
public class RegistroAvance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tarea_id")
    private Tarea tarea;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autor_id")
    private Usuario autor;

    @Column(length = 150)
    private String titulo;

    @Column(length = 1000)
    private String contenido;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public RegistroAvance(Proyecto proyecto, Tarea tarea, String titulo, String contenido) {
        this.proyecto = proyecto;
        this.tarea = tarea;
        this.titulo = titulo;
        this.contenido = contenido;
    }
}
