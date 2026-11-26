package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Mensaje publicado en un canal, con sus reacciones y sus archivos adjuntos. */
@Entity
@Table(name = "mensaje_chat")
@Getter
@Setter
@NoArgsConstructor
public class MensajeChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "canal_id", nullable = false)
    private Canal canal;

    /** Autor registrado. Queda vacio si el mensaje viene de un integrante sin cuenta. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "autor_id")
    private Usuario autor;

    /** Nombre mostrado, para poder pintar el mensaje sin cargar el usuario. */
    @Column(name = "autor_nombre", nullable = false, length = 120)
    private String autorNombre;

    /** Color del integrante, reutiliza la paleta del equipo del proyecto. */
    @Column(length = 9)
    private String autorColor = "#5b5ce2";

    @NotBlank
    @Column(nullable = false, length = 2000)
    private String contenido;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now();

    /** Marca los mensajes escritos por el asistente (por ejemplo, un resumen publicado). */
    @Column(name = "generado_por_ia", nullable = false)
    private boolean generadoPorIa = false;

    @OneToMany(mappedBy = "mensaje", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReaccionMensaje> reacciones = new ArrayList<>();

    @OneToMany(mappedBy = "mensaje", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArchivoAdjunto> adjuntos = new ArrayList<>();

    public MensajeChat(String autorNombre, String contenido) {
        this.autorNombre = autorNombre;
        this.contenido = contenido;
    }
}
