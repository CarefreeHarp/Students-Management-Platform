package com.studyflow.platform.model.enums;

/** Dias habiles usados por los calendarios de horarios de clase. */
public enum DiaSemana {

    LUNES("lunes", "Lun"),
    MARTES("martes", "Mar"),
    MIERCOLES("miercoles", "Mié"),
    JUEVES("jueves", "Jue"),
    VIERNES("viernes", "Vie"),
    SABADO("sabado", "Sáb"),
    DOMINGO("domingo", "Dom");

    private final String clave;
    private final String abreviatura;

    DiaSemana(String clave, String abreviatura) {
        this.clave = clave;
        this.abreviatura = abreviatura;
    }

    public String getClave() {
        return clave;
    }

    public String getAbreviatura() {
        return abreviatura;
    }

    public static DiaSemana desdeClave(String valor) {
        if (valor == null) {
            return LUNES;
        }
        for (DiaSemana dia : values()) {
            if (dia.clave.equalsIgnoreCase(valor.trim())) {
                return dia;
            }
        }
        return LUNES;
    }
}
