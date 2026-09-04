package com.studyflow.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuracion del asistente conversacional (API de OpenAI).
 *
 * <p>Con {@code enabled=false} (valor por defecto) se usa
 * {@code ClienteIaSimulado} y no se realiza ninguna llamada externa.</p>
 */
@Component
@ConfigurationProperties(prefix = "studyflow.ia")
public class PropiedadesIa {

    /** Activa las llamadas reales a la API. */
    private boolean enabled = false;

    private String apiKey = "";

    private String modelo = "gpt-4o-mini";

    private String urlBase = "https://api.openai.com/v1";

    /** Tiempo maximo de espera de la respuesta, en segundos. */
    private int timeoutSegundos = 30;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModelo() {
        return modelo;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public String getUrlBase() {
        return urlBase;
    }

    public void setUrlBase(String urlBase) {
        this.urlBase = urlBase;
    }

    public int getTimeoutSegundos() {
        return timeoutSegundos;
    }

    public void setTimeoutSegundos(int timeoutSegundos) {
        this.timeoutSegundos = timeoutSegundos;
    }

    public boolean credencialesCompletas() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }
}
