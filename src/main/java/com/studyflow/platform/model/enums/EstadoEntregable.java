package com.studyflow.platform.model.enums;

/** Madurez de un entregable del proyecto. */
public enum EstadoEntregable {

    BORRADOR("Borrador"),
    EN_REVISION("En revisión"),
    FINAL("Final");

    private final String etiqueta;

    EstadoEntregable(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    public static EstadoEntregable desdeClave(String valor) {
        if (valor == null) {
            return BORRADOR;
        }
        return switch (valor.trim().toLowerCase()) {
            case "en-revision", "en_revision", "revision" -> EN_REVISION;
            case "final" -> FINAL;
            default -> BORRADOR;
        };
    }
}
