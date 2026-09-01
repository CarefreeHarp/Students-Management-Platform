package com.studyflow.platform.model.enums;

/** Estados posibles de una tarea. El valor {@code clave} es el que usa la interfaz. */
public enum EstadoTarea {

    PENDIENTE("pending", "Pendiente"),
    EN_CURSO("in-progress", "En curso"),
    COMPLETADA("completed", "Completada"),
    ATRASADA("late", "Atrasada");

    private final String clave;
    private final String etiqueta;

    EstadoTarea(String clave, String etiqueta) {
        this.clave = clave;
        this.etiqueta = etiqueta;
    }

    public String getClave() {
        return clave;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    /** Traduce la clave que envia el frontend (pending, in-progress, done...) al enum. */
    public static EstadoTarea desdeClave(String valor) {
        if (valor == null || valor.isBlank()) {
            return PENDIENTE;
        }
        String normalizado = valor.trim().toLowerCase();
        return switch (normalizado) {
            case "in-progress", "progress", "en-curso" -> EN_CURSO;
            case "completed", "complete", "done", "completada", "terminada" -> COMPLETADA;
            case "late", "atrasada" -> ATRASADA;
            default -> PENDIENTE;
        };
    }
}
