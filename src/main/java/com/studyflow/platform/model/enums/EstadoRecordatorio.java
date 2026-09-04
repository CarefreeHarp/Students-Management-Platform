package com.studyflow.platform.model.enums;

/** Ciclo de vida de un recordatorio programado. */
public enum EstadoRecordatorio {

    /** Aun no ha llegado su momento de envio. */
    PROGRAMADO,
    /** Entregado correctamente por la pasarela. */
    ENVIADO,
    /** La pasarela devolvio un error; queda registrado el motivo. */
    FALLIDO,
    /** Se anulo porque la tarea se completo o cambio de fecha. */
    CANCELADO
}
