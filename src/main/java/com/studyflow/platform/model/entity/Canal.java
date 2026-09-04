package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.TipoCanal;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Canal de conversacion de un proyecto.
 *
 * <p>Un proyecto se divide en varios canales: {@code #general} se crea con el
 * proyecto y a partir de ahi el equipo puede abrir uno por tarea
 * ({@code #tarea-prototipo}) o por tema, para que cada conversacion tenga su sitio. Cada canal guarda sus mensajes, sus
 * archivos y sus resumenes.</p>
 */
@Entity
@Table(name = "canal", uniqueConstraints = @UniqueConstraint(columnNames = {"proyecto_id", "slug"}))
@Getter
@Setter
@NoArgsConstructor
public class Canal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombre visible sin almohadilla: "general", "tarea 1". */
    @NotBlank
    @Column(nullable = false, length = 80)
    private String nombre;

    /** Identificador usado en la URL y mostrado como #slug. */
    @Column(nullable = false, length = 80)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoCanal tipo = TipoCanal.LIBRE;

    @Column(length = 300)
    private String descripcion;

    /** Proyecto al que pertenece. Nulo en un canal suelto sin proyecto. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "proyecto_id")
    private Proyecto proyecto;

    /** Tarea asociada cuando el canal se abre para trabajarla. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tarea_id")
    private Tarea tarea;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creador_id")
    private Usuario creador;

    /** Posicion en la lista lateral; #general siempre va primero. */
    @Column(nullable = false)
    private Integer orden = 10;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @OneToMany(mappedBy = "canal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaEnvio ASC")
    private List<MensajeChat> mensajes = new ArrayList<>();

    @OneToMany(mappedBy = "canal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaGeneracion DESC")
    private List<ResumenChat> resumenes = new ArrayList<>();

    @OneToMany(mappedBy = "canal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaSubida DESC")
    private List<ArchivoAdjunto> archivos = new ArrayList<>();

    public Canal(String nombre, TipoCanal tipo, Integer orden) {
        this.nombre = nombre;
        this.slug = generarSlug(nombre);
        this.tipo = tipo;
        this.orden = orden;
    }

    public void agregarMensaje(MensajeChat mensaje) {
        mensaje.setCanal(this);
        mensajes.add(mensaje);
    }

    /** El canal general no se puede borrar: es el hilo principal del proyecto. */
    public boolean esBorrable() {
        return tipo != TipoCanal.GENERAL;
    }

    public static String generarSlug(String nombre) {
        return com.studyflow.platform.util.TextoUtil.aSlug(nombre);
    }
}
