package com.studyflow.platform.service;

/**
 * Acceso al modelo de lenguaje que organiza proyectos y resume conversaciones.
 *
 * <p>Existen dos implementaciones intercambiables por configuracion:</p>
 * <ul>
 *   <li>{@code ClienteIaSimulado} — activa por defecto, no llama a ningun servicio externo.</li>
 *   <li>{@code ClienteIaOpenAi} — se activa con {@code studyflow.ia.enabled=true}.</li>
 * </ul>
 *
 * <p>El resto de la aplicacion depende solo de esta interfaz, de modo que
 * conectar la API real no obliga a tocar servicios ni controladores.</p>
 */
public interface ClienteIaConversacional {

    /**
     * Pide una respuesta al modelo.
     *
     * @param instruccionSistema rol y estilo que debe adoptar
     * @param entrada            contenido a procesar
     * @return texto generado
     */
    String completar(String instruccionSistema, String entrada);

    /** Nombre del modelo, que se guarda junto a cada resumen generado. */
    String getModelo();

    /** Indica si se esta hablando con la API real o con la simulacion. */
    boolean estaConectada();
}
