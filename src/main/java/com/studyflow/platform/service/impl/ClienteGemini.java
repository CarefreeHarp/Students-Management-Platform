package com.studyflow.platform.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Cliente compartido para las respuestas estructuradas de Gemini. */
@Service
public class ClienteGemini {

    public record Respuesta(JsonNode contenido, String modelo) {}

    private final RestClient cliente;
    private final ObjectMapper json;
    private final String clave;
    private final String modelo;

    public ClienteGemini(RestClient.Builder builder, ObjectMapper json,
            @Value("${studyflow.gemini.api-key}") String clave,
            @Value("${studyflow.gemini.modelo}") String modelo,
            @Value("${studyflow.gemini.url-base:https://generativelanguage.googleapis.com/v1beta}") String urlBase) {
        var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(60));
        this.cliente = builder.baseUrl(urlBase).requestFactory(factory).build();
        this.json = json;
        this.clave = clave;
        this.modelo = modelo;
    }

    public Respuesta generar(String instrucciones, Object datos, Map<String, Object> esquema, String mensajeInvalido) {
        if (clave.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Falta configurar GEMINI_API_KEY en el servidor.");

        try {
            String entrada = json.writeValueAsString(datos);
            var cuerpo = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", instrucciones))),
                    "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", entrada)))),
                    "generationConfig", Map.of("responseMimeType", "application/json",
                            "responseJsonSchema", esquema, "maxOutputTokens", 4096));
            JsonNode respuesta = consultar(cuerpo);
            if (respuesta == null) throw invalida(mensajeInvalido);
            JsonNode candidato = respuesta.at("/candidates/0");
            if (!"STOP".equals(candidato.path("finishReason").asText())) throw invalida(mensajeInvalido);

            var texto = new StringBuilder();
            for (var parte : candidato.at("/content/parts")) {
                if (!parte.path("thought").asBoolean()) texto.append(parte.path("text").asText(""));
            }
            JsonNode contenido = json.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readTree(texto.toString());
            if (contenido == null || contenido.isMissingNode() || contenido.isNull()) throw invalida(mensajeInvalido);
            return new Respuesta(contenido, respuesta.path("modelVersion").asText(modelo));
        } catch (RestClientResponseException e) {
            throw switch (e.getStatusCode().value()) {
                case 400, 401, 403 -> new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Gemini rechazó la solicitud. Revisa la clave y el modelo configurados en el servidor.");
                case 404 -> new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "El modelo de Gemini configurado no está disponible para esta clave.");
                case 429 -> new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Se alcanzó la cuota de Gemini. Intenta más tarde o revisa la cuota del proyecto.");
                default -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Gemini no está disponible en este momento. Intenta de nuevo.");
            };
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se recibió una respuesta de Gemini a tiempo. Intenta de nuevo.");
        } catch (RestClientException | JsonProcessingException e) {
            throw invalida(mensajeInvalido);
        }
    }

    private JsonNode consultar(Map<String, ?> cuerpo) {
        for (int intento = 1; ; intento++) {
            try {
                return cliente.post().uri("/models/{modelo}:generateContent", modelo)
                        .header("x-goog-api-key", clave).contentType(MediaType.APPLICATION_JSON)
                        .body(cuerpo).retrieve().body(JsonNode.class);
            } catch (HttpServerErrorException e) {
                int estado = e.getStatusCode().value();
                if (intento == 2 || (estado != 502 && estado != 503)
                        || (e.getResponseHeaders() != null && e.getResponseHeaders().containsKey("Retry-After"))) throw e;
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException interrumpida) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            }
        }
    }

    private ResponseStatusException invalida(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, mensaje);
    }
}
