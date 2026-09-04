package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Reaccion con emoji sobre un mensaje.
 *
 * <p>La clave unica (mensaje, usuario, emoji) impide que la misma persona
 * reaccione dos veces con el mismo emoji: volver a pulsarlo retira la
 * reaccion.</p>
 */
@Entity
@Table(name = "reaccion_mensaje",
        uniqueConstraints = @UniqueConstraint(columnNames = {"mensaje_id", "usuario_id", "emoji"}))
@Getter
@Setter
@NoArgsConstructor
public class ReaccionMensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mensaje_id", nullable = false)
    private MensajeChat mensaje;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    /** Emoji en texto plano. Se limita la longitud para admitir secuencias compuestas. */
    @Column(nullable = false, length = 16)
    private String emoji;

    @Column(name = "fecha_reaccion", nullable = false)
    private LocalDateTime fechaReaccion = LocalDateTime.now();

    public ReaccionMensaje(MensajeChat mensaje, Usuario usuario, String emoji) {
        this.mensaje = mensaje;
        this.usuario = usuario;
        this.emoji = emoji;
    }
}
