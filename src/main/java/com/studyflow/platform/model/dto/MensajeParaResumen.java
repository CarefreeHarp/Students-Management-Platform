package com.studyflow.platform.model.dto;

import java.time.LocalDateTime;

public record MensajeParaResumen(Long id, String autor, String texto, LocalDateTime fecha) {}
