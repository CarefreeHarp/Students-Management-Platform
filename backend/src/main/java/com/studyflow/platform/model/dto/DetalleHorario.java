package com.studyflow.platform.model.dto;

import java.util.List;

/** Copia de las secciones al generar el horario, independiente de ediciones posteriores del borrador. */
public record DetalleHorario(List<MateriaDTO> materias, List<String> omitidas) {}
