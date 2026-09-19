package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Resumen de una conversación generado localmente a partir de sus mensajes.
 * Guarda el rango de mensajes que cubre para poder repetirlo o auditarlo.
 */
@Entity
@Table(name = "resumen_chat")
@Getter
@Setter
@NoArgsConstructor
public class ResumenChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "canal_id", nullable = false)
    private Canal canal;

    @Column(nullable = false, length = 2000)
    private String contenido;

    /** Acuerdos y siguientes pasos detectados, uno por linea. */
    @Column(name = "puntos_clave", length = 1500)
    private String puntosClave;

    @Column(name = "mensajes_resumidos", nullable = false)
    private Integer mensajesResumidos = 0;

    @Column(name = "desde_mensaje_id")
    private Long desdeMensajeId;

    @Column(name = "hasta_mensaje_id")
    private Long hastaMensajeId;

    /** Origen del resumen: "Local" cuando se genera sin proveedor externo. */
    @Column(length = 60)
    private String modelo = "Local";

    @Column(name = "fecha_generacion", nullable = false)
    private LocalDateTime fechaGeneracion = LocalDateTime.now();
}
