package com.studyflow.platform.model.enums;

/**
 * Origen del recordatorio. Cada tipo tiene su propia antelacion configurable
 * en {@code PreferenciaRecordatorio}.
 */
public enum TipoRecordatorio {

    /** Vencimiento de una tarea de proyecto. */
    TAREA("Tarea por vencer"),
    /** Fecha de entrega final de un proyecto. */
    ENTREGA_PROYECTO("Entrega de proyecto"),
    /** Punto importante anotado despues de una clase. */
    APUNTE_CLASE("Pendiente de clase");

    private final String etiqueta;

    TipoRecordatorio(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }
}
