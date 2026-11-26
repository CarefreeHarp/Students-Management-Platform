package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.EstadoEntregable;
import com.studyflow.platform.model.enums.TipoEntregable;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro de los documentos y entregables del trabajo grupal.
 *
 * <p>Guarda el enlace al recurso donde realmente vive el trabajo (un documento
 * de Word en Drive, un diseno de Canva, un repositorio) junto con quien lo
 * mantiene y en que estado esta, para que el equipo tenga un unico indice.</p>
 */
@Entity
@Table(name = "entregable")
@Getter
@Setter
@NoArgsConstructor
public class Entregable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false)
    private Proyecto proyecto;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 400)
    private String descripcion;

    /** Enlace al documento. Es el dato central de esta ficha. */
    @NotBlank
    @Column(nullable = false, length = 600)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoEntregable tipo = TipoEntregable.OTRO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoEntregable estado = EstadoEntregable.BORRADOR;

    /** Integrante que mantiene el documento. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responsable_id")
    private Integrante responsable;

    /** Tarea de la que sale este entregable, si aplica. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tarea_id")
    private Tarea tarea;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;
}
