package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Archivo compartido en un canal.
 *
 * <p>El contenido se guarda en disco (carpeta configurable) y en la base solo
 * queda la ficha. Asi la seccion de imagenes y documentos del canal puede
 * listarlos sin cargar los binarios.</p>
 */
@Entity
@Table(name = "archivo_adjunto")
@Getter
@Setter
@NoArgsConstructor
public class ArchivoAdjunto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "canal_id", nullable = false)
    private Canal canal;

    /** Mensaje con el que se envio. Nulo si se subio directamente a la galeria. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mensaje_id")
    private MensajeChat mensaje;

    @Column(nullable = false, length = 200)
    private String nombre;

    /** Nombre con el que quedo guardado en disco, unico para evitar colisiones. */
    @Column(name = "nombre_almacenado", nullable = false, length = 200)
    private String nombreAlmacenado;

    @Column(name = "tipo_mime", length = 120)
    private String tipoMime;

    @Column(name = "tamano_bytes")
    private Long tamanoBytes;

    /** Permite separar la galeria de imagenes del listado de documentos. */
    @Column(name = "es_imagen", nullable = false)
    private boolean esImagen = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "subido_por_id")
    private Usuario subidoPor;

    @Column(name = "fecha_subida", nullable = false)
    private LocalDateTime fechaSubida = LocalDateTime.now();

    /** Tamano legible para mostrarlo en la interfaz. */
    public String getTamanoLegible() {
        if (tamanoBytes == null) {
            return "";
        }
        if (tamanoBytes < 1024) {
            return tamanoBytes + " B";
        }
        if (tamanoBytes < 1024 * 1024) {
            return "%.0f KB".formatted(tamanoBytes / 1024.0);
        }
        return "%.1f MB".formatted(tamanoBytes / (1024.0 * 1024.0));
    }
}
