package com.studyflow.platform.mapper;

import com.studyflow.platform.model.dto.ApunteClaseDTO;
import com.studyflow.platform.model.dto.PreferenciaRecordatorioDTO;
import com.studyflow.platform.model.dto.RecordatorioDTO;
import com.studyflow.platform.model.entity.ApunteClase;
import com.studyflow.platform.model.entity.PreferenciaRecordatorio;
import com.studyflow.platform.model.entity.Recordatorio;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

/** Traduce las entidades de recordatorios y apuntes a DTO. */
@Component
public class RecordatorioMapper {

    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public PreferenciaRecordatorioDTO aDTO(PreferenciaRecordatorio preferencia, boolean pasarelaConectada) {
        return new PreferenciaRecordatorioDTO(
                preferencia.getId(),
                preferencia.getCanal().name(),
                preferencia.getTelefonoWhatsapp(),
                preferencia.isActivo(),
                preferencia.getMinutosAntesTarea(),
                preferencia.getMinutosAntesEntrega(),
                preferencia.getMinutosAntesApunte(),
                preferencia.getSilencioDesde() != null ? preferencia.getSilencioDesde().format(HORA) : null,
                preferencia.getSilencioHasta() != null ? preferencia.getSilencioHasta().format(HORA) : null,
                pasarelaConectada
        );
    }

    public RecordatorioDTO aDTO(Recordatorio recordatorio) {
        return new RecordatorioDTO(
                recordatorio.getId(),
                recordatorio.getTipo().name(),
                recordatorio.getTipo().getEtiqueta(),
                recordatorio.getCanal().name(),
                recordatorio.getEstado().name(),
                recordatorio.getTitulo(),
                recordatorio.getMensaje(),
                recordatorio.getFechaHora() != null ? recordatorio.getFechaHora().format(FECHA_HORA) : null,
                recordatorio.getFechaVencimiento() != null ? recordatorio.getFechaVencimiento().format(FECHA_HORA) : null,
                recordatorio.getProyecto() != null ? recordatorio.getProyecto().getNombre() : null,
                recordatorio.getErrorEnvio()
        );
    }

    public ApunteClaseDTO aDTO(ApunteClase apunte) {
        return new ApunteClaseDTO(
                apunte.getId(),
                apunte.getTitulo(),
                apunte.getContenido(),
                apunte.getMateria() != null ? apunte.getMateria().getNombre() : null,
                apunte.getMateria() != null ? apunte.getMateria().getIndiceColor() : 0,
                apunte.getFechaClase(),
                apunte.getFechaLimite(),
                apunte.isImportante(),
                apunte.isResuelto()
        );
    }
}
