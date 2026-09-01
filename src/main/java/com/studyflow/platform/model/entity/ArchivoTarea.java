package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Archivo asociado a una tarea (boton "Adjuntar" de la tarjeta de tarea). */
@Entity
@Table(name = "archivo_tarea")
@Getter
@Setter
@NoArgsConstructor
public class ArchivoTarea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tarea_id", nullable = false)
    private Tarea tarea;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(length = 500)
    private String ruta;

    @Column(name = "tipo_mime", length = 100)
    private String tipoMime;

    @Column(name = "tamano_bytes")
    private Long tamanoBytes;

    @Column(name = "fecha_subida", nullable = false)
    private LocalDateTime fechaSubida = LocalDateTime.now();
}
