package com.studyflow.platform.service.impl;

import com.studyflow.platform.config.PropiedadesIa;
import com.studyflow.platform.service.ClienteIaConversacional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Cliente de la API de OpenAI ({@code POST /v1/chat/completions}).
 *
 * <p><b>Desactivado por defecto.</b> Solo se registra como bean cuando
 * {@code studyflow.ia.enabled=true}; en ese momento sustituye a
 * {@code ClienteIaSimulado} sin que ningun otro componente cambie.</p>
 *
 * <p>El codigo esta escrito contra el contrato publico de la API pero
 * <b>no se ha probado contra el servicio real</b>, porque el proyecto todavia
 * no tiene credenciales. Al conectarlo por primera vez conviene verificar el
 * nombre del modelo y la forma de la respuesta.</p>
 */
@Service
@ConditionalOnProperty(name = "studyflow.ia.enabled", havingValue = "true")
public class ClienteIaOpenAi implements ClienteIaConversacional {

    private static final Logger log = LoggerFactory.getLogger(ClienteIaOpenAi.class);

    private final PropiedadesIa propiedades;
    private final RestClient restClient;

    public ClienteIaOpenAi(PropiedadesIa propiedades, RestClient.Builder builder) {
        this.propiedades = propiedades;
        this.restClient = builder.build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public String completar(String instruccionSistema, String entrada) {
        try {
            Map<String, Object> cuerpo = Map.of(
                    "model", propiedades.getModelo(),
                    "messages", List.of(
                            Map.of("role", "system", "content", instruccionSistema),
                            Map.of("role", "user", "content", entrada)),
                    "temperature", 0.3);

            Map<String, Object> respuesta = restClient.post()
                    .uri(propiedades.getUrlBase() + "/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + propiedades.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(cuerpo)
                    .retrieve()
                    .body(Map.class);

            return extraerContenido(respuesta);
        } catch (Exception error) {
            log.warn("La API de IA no respondió: {}", error.getMessage());
            return "No fue posible generar el resultado con la IA en este momento. Intenta de nuevo más tarde.";
        }
    }

    @Override
    public String getModelo() {
        return propiedades.getModelo();
    }

    @Override
    public boolean estaConectada() {
        return propiedades.credencialesCompletas();
    }

    @SuppressWarnings("unchecked")
    private String extraerContenido(Map<String, Object> respuesta) {
        if (respuesta == null) {
            return "";
        }
        Object opciones = respuesta.get("choices");
        if (opciones instanceof List<?> lista && !lista.isEmpty()
                && lista.get(0) instanceof Map<?, ?> primera) {
            Object mensaje = ((Map<String, Object>) primera).get("message");
            if (mensaje instanceof Map<?, ?> contenido) {
                return String.valueOf(((Map<String, Object>) contenido).get("content"));
            }
        }
        return "";
    }
}
