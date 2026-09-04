package com.studyflow.platform.service.impl;

import com.studyflow.platform.service.RecordatorioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tarea programada que vacia la cola de recordatorios.
 *
 * <p>Se ejecuta cada minuto y entrega los avisos cuya hora ya paso. Es el unico
 * punto del sistema que dispara envios automaticos; el resto de la aplicacion
 * solo programa o cancela.</p>
 */
@Component
public class PlanificadorRecordatorios {

    private static final Logger log = LoggerFactory.getLogger(PlanificadorRecordatorios.class);

    private final RecordatorioService recordatorioService;

    public PlanificadorRecordatorios(RecordatorioService recordatorioService) {
        this.recordatorioService = recordatorioService;
    }

    @Scheduled(fixedDelayString = "${studyflow.recordatorios.intervalo-ms:60000}")
    public void despacharPendientes() {
        try {
            int enviados = recordatorioService.procesarPendientes();
            if (enviados > 0) {
                log.info("Recordatorios entregados en este ciclo: {}", enviados);
            }
        } catch (Exception error) {
            // Un fallo puntual no debe detener la planificacion de los siguientes ciclos.
            log.error("Error al procesar la cola de recordatorios: {}", error.getMessage());
        }
    }
}
