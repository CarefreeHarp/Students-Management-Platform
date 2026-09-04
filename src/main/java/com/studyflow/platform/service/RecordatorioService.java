package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.PeticionPreferenciaRecordatorio;
import com.studyflow.platform.model.dto.PreferenciaRecordatorioDTO;
import com.studyflow.platform.model.dto.RecordatorioDTO;

import java.util.List;

/** Programacion y envio de recordatorios por WhatsApp. */
public interface RecordatorioService {

    PreferenciaRecordatorioDTO obtenerPreferencias(Long usuarioId);

    PreferenciaRecordatorioDTO guardarPreferencias(Long usuarioId, PeticionPreferenciaRecordatorio peticion);

    List<RecordatorioDTO> listar(Long usuarioId);

    /**
     * Recalcula la agenda de avisos del usuario a partir de sus tareas pendientes,
     * las entregas de sus proyectos y los apuntes de clase con fecha limite.
     *
     * @return numero de recordatorios programados
     */
    int reprogramarTodo(Long usuarioId);

    /** Envia inmediatamente un recordatorio, sin esperar a su hora. */
    RecordatorioDTO enviarAhora(Long recordatorioId);

    /** Manda un mensaje de prueba al numero configurado. */
    String enviarPrueba(Long usuarioId);

    void cancelar(Long recordatorioId);

    /** Procesa la cola de avisos vencidos. Lo invoca la tarea programada. */
    int procesarPendientes();
}
