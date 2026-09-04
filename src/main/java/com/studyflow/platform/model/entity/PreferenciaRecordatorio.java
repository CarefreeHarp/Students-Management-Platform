package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.CanalRecordatorio;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

/**
 * Configuracion de recordatorios de un estudiante.
 *
 * <p>La antelacion se guarda en minutos y por separado para cada tipo, porque no
 * se avisa igual de una tarea del dia siguiente que de la entrega final de un
 * proyecto.</p>
 */
@Entity
@Table(name = "preferencia_recordatorio", uniqueConstraints = @UniqueConstraint(columnNames = "usuario_id"))
@Getter
@Setter
@NoArgsConstructor
public class PreferenciaRecordatorio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CanalRecordatorio canal = CanalRecordatorio.WHATSAPP;

    /** Numero en formato internacional sin signos: 573001112233. */
    @Column(length = 20)
    private String telefonoWhatsapp;

    @Column(nullable = false)
    private boolean activo = true;

    /** Antelacion para el vencimiento de una tarea. Por defecto, 1 dia. */
    @Column(name = "minutos_antes_tarea", nullable = false)
    private Integer minutosAntesTarea = 1440;

    /** Antelacion para la entrega final de un proyecto. Por defecto, 3 dias. */
    @Column(name = "minutos_antes_entrega", nullable = false)
    private Integer minutosAntesEntrega = 4320;

    /** Antelacion para un pendiente anotado despues de clase. Por defecto, 2 horas. */
    @Column(name = "minutos_antes_apunte", nullable = false)
    private Integer minutosAntesApunte = 120;

    /** Inicio de la franja en la que no se envian mensajes. */
    @Column(name = "silencio_desde")
    private LocalTime silencioDesde = LocalTime.of(22, 0);

    /** Fin de la franja de silencio. Un recordatorio que caiga dentro se aplaza. */
    @Column(name = "silencio_hasta")
    private LocalTime silencioHasta = LocalTime.of(7, 0);

    public PreferenciaRecordatorio(Usuario usuario) {
        this.usuario = usuario;
    }

    /** Antelacion configurada para el tipo indicado, en minutos. */
    public int minutosPara(com.studyflow.platform.model.enums.TipoRecordatorio tipo) {
        return switch (tipo) {
            case TAREA -> minutosAntesTarea;
            case ENTREGA_PROYECTO -> minutosAntesEntrega;
            case APUNTE_CLASE -> minutosAntesApunte;
        };
    }

    /**
     * Indica si una hora cae dentro de la franja de silencio.
     * Contempla el caso habitual de que la franja cruce la medianoche (22:00 a 07:00).
     */
    public boolean enSilencio(LocalTime hora) {
        if (silencioDesde == null || silencioHasta == null || hora == null) {
            return false;
        }
        if (silencioDesde.isBefore(silencioHasta)) {
            return !hora.isBefore(silencioDesde) && hora.isBefore(silencioHasta);
        }
        return !hora.isBefore(silencioDesde) || hora.isBefore(silencioHasta);
    }
}
