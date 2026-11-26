package com.studyflow.platform.exception;

/** Se lanza cuando un identificador solicitado no existe en la base de datos. */
public class RecursoNoEncontradoException extends RuntimeException {

    public RecursoNoEncontradoException(String recurso, Object identificador) {
        super("No se encontró %s con identificador '%s'.".formatted(recurso, identificador));
    }
}
