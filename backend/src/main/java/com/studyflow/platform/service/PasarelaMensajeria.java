package com.studyflow.platform.service;

/**
 * Salida de mensajes hacia el estudiante. La implementacion actual es
 * WhatsApp Cloud API; la interfaz permite anadir correo o notificaciones push
 * sin tocar el servicio de recordatorios.
 */
public interface PasarelaMensajeria {

    /**
     * Resultado de un envio.
     *
     * @param exito       si la pasarela acepto el mensaje
     * @param referencia  identificador devuelto por el proveedor
     * @param error       motivo del fallo, nulo si todo fue bien
     * @param simulado    true cuando no se llamo al proveedor real
     */
    record ResultadoEnvio(boolean exito, String referencia, String error, boolean simulado) {

        public static ResultadoEnvio ok(String referencia) {
            return new ResultadoEnvio(true, referencia, null, false);
        }

        public static ResultadoEnvio simulado(String referencia) {
            return new ResultadoEnvio(true, referencia, null, true);
        }

        public static ResultadoEnvio fallo(String error) {
            return new ResultadoEnvio(false, null, error, false);
        }
    }

    /** Envia un mensaje de texto al numero indicado en formato internacional. */
    ResultadoEnvio enviarTexto(String telefono, String mensaje);

    /** Indica si hay credenciales configuradas para hablar con el proveedor real. */
    boolean estaConectada();

    /** Nombre del canal, para mostrarlo en la interfaz y en los logs. */
    String nombreCanal();
}
