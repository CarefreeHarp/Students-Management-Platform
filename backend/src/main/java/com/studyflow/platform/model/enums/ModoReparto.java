package com.studyflow.platform.model.enums;

/** How a project distributes work; API keys remain independent of enum names. */
public enum ModoReparto {
    ASIGNADO("asignado"),
    LIBRE("libre");

    private final String clave;

    ModoReparto(String clave) {
        this.clave = clave;
    }

    public String getClave() {
        return clave;
    }

    public static ModoReparto desdeClave(String clave) {
        if (clave == null) {
            return ASIGNADO;
        }
        return switch (clave) {
            case "asignado" -> ASIGNADO;
            case "libre" -> LIBRE;
            default -> throw new IllegalArgumentException("Elige reparto asignado o libre.");
        };
    }
}
