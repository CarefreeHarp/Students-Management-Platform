package com.studyflow.platform.service.impl;

import com.studyflow.platform.config.PropiedadesWhatsApp;
import com.studyflow.platform.service.PasarelaMensajeria;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pasarela de WhatsApp sobre la Cloud API de Meta.
 *
 * <p>Publica en {@code POST /{version}/{phone-number-id}/messages} de la Graph API
 * con el cuerpo estandar de mensaje de texto.</p>
 *
 * <p><b>Modo simulacion:</b> si {@code studyflow.whatsapp.enabled=false} o faltan
 * credenciales, no se realiza ninguna llamada de red: el mensaje se escribe en el
 * log y se devuelve un resultado marcado como simulado. Asi la funcionalidad
 * completa (programacion, cola de envio, estados) se puede probar sin una cuenta
 * de Meta, y basta rellenar las credenciales para que empiece a enviar de verdad.</p>
 */
@Service
public class WhatsAppCloudApiGateway implements PasarelaMensajeria {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppCloudApiGateway.class);

    private final PropiedadesWhatsApp propiedades;
    private final RestClient restClient;

    public WhatsAppCloudApiGateway(PropiedadesWhatsApp propiedades, RestClient.Builder builder) {
        this.propiedades = propiedades;
        this.restClient = builder.build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public ResultadoEnvio enviarTexto(String telefono, String mensaje) {
        String destino = normalizarTelefono(telefono);
        if (destino == null) {
            return ResultadoEnvio.fallo("El número de WhatsApp no es válido. Usa formato internacional, por ejemplo 573001112233.");
        }

        if (!propiedades.credencialesCompletas()) {
            log.info("[WhatsApp · SIMULADO] Para {}: {}", destino, mensaje);
            return ResultadoEnvio.simulado("sim-" + UUID.randomUUID().toString().substring(0, 8));
        }

        try {
            Map<String, Object> cuerpo = Map.of(
                    "messaging_product", "whatsapp",
                    "recipient_type", "individual",
                    "to", destino,
                    "type", "text",
                    "text", Map.of("preview_url", false, "body", mensaje));

            Map<String, Object> respuesta = restClient.post()
                    .uri(propiedades.urlMensajes())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + propiedades.getToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(cuerpo)
                    .retrieve()
                    .body(Map.class);

            return ResultadoEnvio.ok(extraerIdMensaje(respuesta));
        } catch (Exception error) {
            log.warn("Fallo al enviar el recordatorio por WhatsApp a {}: {}", destino, error.getMessage());
            return ResultadoEnvio.fallo(recortar(error.getMessage()));
        }
    }

    @Override
    public boolean estaConectada() {
        return propiedades.credencialesCompletas();
    }

    @Override
    public String nombreCanal() {
        return "WhatsApp";
    }

    /**
     * Deja el numero como lo espera Meta: solo digitos, con indicativo de pais
     * y sin el signo mas.
     */
    private String normalizarTelefono(String telefono) {
        if (telefono == null) {
            return null;
        }
        String limpio = telefono.replaceAll("[^0-9]", "");
        return limpio.length() >= 10 && limpio.length() <= 15 ? limpio : null;
    }

    @SuppressWarnings("unchecked")
    private String extraerIdMensaje(Map<String, Object> respuesta) {
        if (respuesta == null) {
            return null;
        }
        Object mensajes = respuesta.get("messages");
        if (mensajes instanceof List<?> lista && !lista.isEmpty()
                && lista.get(0) instanceof Map<?, ?> primero) {
            return String.valueOf(((Map<String, Object>) primero).get("id"));
        }
        return null;
    }

    private String recortar(String texto) {
        if (texto == null) {
            return "Error desconocido en la pasarela de WhatsApp.";
        }
        return texto.length() > 380 ? texto.substring(0, 380) : texto;
    }
}
