package com.studyflow.platform.exception;

/** Error de dominio asociado a un campo concreto de un formulario. */
public class CampoInvalidoException extends IllegalArgumentException {

    private final String campo;

    public CampoInvalidoException(String campo, String mensaje) {
        super(mensaje);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
