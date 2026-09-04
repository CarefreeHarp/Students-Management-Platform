package com.studyflow.platform.model.enums;

/**
 * Estados por los que pasa una tarea en el tablero del proyecto.
 *
 * <p>El valor {@code clave} es el que viaja a la interfaz. Se conservan los
 * alias antiguos ({@code pending}, {@code in-progress}, {@code done}...) en
 * {@link #desdeClave(String)} para que los datos guardados antes del cambio
 * de estados se sigan interpretando bien.</p>
 */
public enum EstadoTarea {

    SIN_EMPEZAR("sin-empezar", "Sin empezar"),
    EN_PROCESO("en-proceso", "En proceso"),
    EN_REVISION("en-revision", "En revisión"),
    TERMINADA("terminada", "Terminada");

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

    /** Traduce la clave que envia el frontend, incluidos los nombres anteriores. */
    public static EstadoTarea desdeClave(String valor) {
        if (valor == null || valor.isBlank()) {
            return SIN_EMPEZAR;
        }
        return switch (valor.trim().toLowerCase()) {
            case "en-proceso", "in-progress", "progress", "en-curso", "en_proceso" -> EN_PROCESO;
            case "en-revision", "revision", "in-review", "en_revision" -> EN_REVISION;
            case "terminada", "completed", "complete", "done", "completada" -> TERMINADA;
            default -> SIN_EMPEZAR;
        };
    }

    /** Una tarea cuenta para el avance solo cuando esta terminada. */
    public boolean cuentaComoCompletada() {
        return this == TERMINADA;
    }

    /** Estados en los que la tarea sigue abierta y admite ser reclamada o avanzada. */
    public boolean estaAbierta() {
        return this != TERMINADA;
    }
}
