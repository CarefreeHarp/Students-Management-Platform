package com.studyflow.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Credenciales de la WhatsApp Cloud API de Meta.
 *
 * <p>Se configuran en {@code application.properties} bajo el prefijo
 * {@code studyflow.whatsapp}. Mientras {@code enabled} sea {@code false} o falte
 * el token, la pasarela funciona en modo simulacion: registra el mensaje en el
 * log en lugar de llamar a Meta.</p>
 */
@Component
@ConfigurationProperties(prefix = "studyflow.whatsapp")
public class PropiedadesWhatsApp {

    /** Activa el envio real. Sin credenciales validas debe quedarse en false. */
    private boolean enabled = false;

    /** Token permanente de la aplicacion de Meta. */
    private String token = "";

    /** Identificador del numero emisor (Phone Number ID del panel de Meta). */
    private String phoneNumberId = "";

    /** Version de la Graph API. */
    private String apiVersion = "v21.0";

    private String urlBase = "https://graph.facebook.com";

    /** Plantilla aprobada en Meta, necesaria fuera de la ventana de 24 horas. */
    private String plantilla = "";

    private String idiomaPlantilla = "es";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getPhoneNumberId() {
        return phoneNumberId;
    }

    public void setPhoneNumberId(String phoneNumberId) {
        this.phoneNumberId = phoneNumberId;
    }

    public String getApiVersion() {
        return apiVersion;
    }

    public void setApiVersion(String apiVersion) {
        this.apiVersion = apiVersion;
    }

    public String getUrlBase() {
        return urlBase;
    }

    public void setUrlBase(String urlBase) {
        this.urlBase = urlBase;
    }

    public String getPlantilla() {
        return plantilla;
    }

    public void setPlantilla(String plantilla) {
        this.plantilla = plantilla;
    }

    public String getIdiomaPlantilla() {
        return idiomaPlantilla;
    }

    public void setIdiomaPlantilla(String idiomaPlantilla) {
        this.idiomaPlantilla = idiomaPlantilla;
    }

    /** Hay credenciales suficientes para hablar con Meta. */
    public boolean credencialesCompletas() {
        return enabled
                && token != null && !token.isBlank()
                && phoneNumberId != null && !phoneNumberId.isBlank();
    }

    public String urlMensajes() {
        return "%s/%s/%s/messages".formatted(urlBase, apiVersion, phoneNumberId);
    }
}
