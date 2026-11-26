package com.studyflow.platform.model.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record AgendaDTO(HorarioDTO horario, List<Entrega> entregables) {
    public record Entrega(Long id, String titulo, String proyectoCodigo, LocalDate fecha, LocalTime hora, String estado) {}
}
