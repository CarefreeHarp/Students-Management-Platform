package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.CanalRecordatorio;
import com.studyflow.platform.model.enums.EstadoRecordatorio;
import com.studyflow.platform.model.enums.TipoRecordatorio;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Recordatorio programado para un estudiante.
 *
 * <p>Se origina en una tarea, en la entrega de un proyecto o en un apunte de clase,
 * y lo entrega la pasarela de mensajeria (WhatsApp Cloud API) cuando llega su
 * {@code fechaHora}, calculada restando la antelacion configurada al vencimiento.</p>
 */
@Entity
@Table(name = "recordatorio")
@Getter
@Setter
@NoArgsConstructor
public class Recordatorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proyecto_id")
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tarea_id")
    private Tarea tarea;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apunte_id")
    private ApunteClase apunte;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoRecordatorio tipo = TipoRecordatorio.TAREA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CanalRecordatorio canal = CanalRecordatorio.WHATSAPP;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoRecordatorio estado = EstadoRecordatorio.PROGRAMADO;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(length = 400)
    private String mensaje;

    /** Momento en el que debe salir el aviso. */
    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    /** Vencimiento real al que hace referencia el recordatorio. */
    @Column(name = "fecha_vencimiento")
    private LocalDateTime fechaVencimiento;

    @Column(name = "fecha_envio")
    private LocalDateTime fechaEnvio;

    @Column(nullable = false)
    private Integer intentos = 0;

    /** Ultimo error devuelto por la pasarela, si lo hubo. */
    @Column(name = "error_envio", length = 400)
    private String errorEnvio;

    /** Identificador del mensaje devuelto por la API de Meta. */
    @Column(name = "referencia_externa", length = 120)
    private String referenciaExterna;

    public boolean estaPendiente() {
        return estado == EstadoRecordatorio.PROGRAMADO;
    }
}
