package com.studyflow.platform.model.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Guarda el estado de una tarea como texto y lo lee de vuelta tolerando los
 * nombres anteriores.
 *
 * <p>Los estados cambiaron de {@code PENDIENTE / EN_CURSO / COMPLETADA} a
 * {@code SIN_EMPEZAR / EN_PROCESO / EN_REVISION / TERMINADA}. Con
 * {@code @Enumerated(EnumType.STRING)}, una fila guardada antes del cambio
 * rompe la lectura entera con «No enum constant ...EN_CURSO». Este convertidor
 * traduce esos valores en lugar de fallar, de modo que una base creada con el
 * esquema anterior sigue abriéndose.</p>
 */
@Converter(autoApply = false)
public class EstadoTareaConverter implements AttributeConverter<EstadoTarea, String> {

    @Override
    public String convertToDatabaseColumn(EstadoTarea estado) {
        return estado == null ? EstadoTarea.SIN_EMPEZAR.name() : estado.name();
    }

    @Override
    public EstadoTarea convertToEntityAttribute(String valor) {
        if (valor == null || valor.isBlank()) {
            return EstadoTarea.SIN_EMPEZAR;
        }
        return switch (valor.trim().toUpperCase()) {
            case "SIN_EMPEZAR", "PENDIENTE" -> EstadoTarea.SIN_EMPEZAR;
            case "EN_PROCESO", "EN_CURSO" -> EstadoTarea.EN_PROCESO;
            case "EN_REVISION" -> EstadoTarea.EN_REVISION;
            case "TERMINADA", "COMPLETADA" -> EstadoTarea.TERMINADA;
            // ATRASADA existía como estado propio; ahora es una tarea sin empezar
            // cuya fecha ya pasó, algo que la interfaz deduce de la fecha límite.
            case "ATRASADA" -> EstadoTarea.SIN_EMPEZAR;
            default -> EstadoTarea.desdeClave(valor);
        };
    }
}
