package com.studyflow.platform.pagos;

import com.studyflow.platform.security.TokensSesion.Identidad;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/pagos")
public class WompiApi {
    private final PagoPruebaRepository pagos;
    private final ObjectMapper json;
    private final String publica, integridad, eventos;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build();
    private static final Map<String, Long> PRECIOS = Map.of("mensual", 1990000L, "semestral", 7990000L, "vitalicio", 32000000L);
    public record Inicio(String referencia, String publicKey, long monto, String firma) {}
    public record Estado(String referencia, String plan, String estado, Instant vence) {}
    public WompiApi(PagoPruebaRepository pagos, ObjectMapper json,
                    @Value("${WOMPI_PUBLIC_KEY:}") String publica,
                    @Value("${WOMPI_INTEGRITY_SECRET:}") String integridad,
                    @Value("${WOMPI_EVENTS_SECRET:}") String eventos) {
        this.pagos = pagos; this.json = json; this.publica = publica; this.integridad = integridad; this.eventos = eventos;
    }
    private void configurado() {
        if (!publica.startsWith("pub_test_") || !integridad.startsWith("test_integrity_") || !eventos.startsWith("test_events_"))
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Wompi sandbox no está configurado.");
    }
    @PostMapping("/wompi/iniciar")
    @Transactional
    public Inicio iniciar(@AuthenticationPrincipal Identidad identidad, @RequestBody Map<String, String> cuerpo) {
        configurado();
        String plan = cuerpo.get("plan"); Long monto = PRECIOS.get(plan);
        if (monto == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan inválido.");
        String ref = UUID.randomUUID().toString();
        pagos.save(new PagoPrueba(ref, identidad.usuarioId(), plan, monto));
        return new Inicio(ref, publica, monto, sha256(ref + monto + "COP" + integridad));
    }
    @GetMapping("/wompi/estado")
    @Transactional
    public Estado estado(@AuthenticationPrincipal Identidad identidad, @RequestParam String referencia, @RequestParam(required = false) String id) {
        configurado();
        PagoPrueba pago = pagos.findById(referencia).filter(p -> p.usuarioId.equals(identidad.usuarioId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pago no encontrado."));
        if (id != null && !id.isBlank()) verificarConWompi(pago, id);
        return new Estado(pago.referencia, pago.plan, pago.estado, pago.vence);
    }
    @GetMapping("/wompi/mi-plan")
    public List<Estado> miPlan(@AuthenticationPrincipal Identidad identidad) {
        return pagos.findByUsuarioIdOrderByCreadoDesc(identidad.usuarioId()).stream().map(p -> new Estado(p.referencia, p.plan, p.estado, p.vence)).toList();
    }
    @PostMapping("/wompi/eventos")
    @Transactional
    public Map<String, String> evento(@RequestBody JsonNode evento) {
        configurado();
        if (!"transaction.updated".equals(evento.path("event").asText())) return Map.of("status", "ignored");
        JsonNode firma = evento.path("signature"), propiedades = firma.path("properties"), data = evento.path("data");
        if (!propiedades.isArray() || propiedades.size() > 20 || !evento.path("timestamp").isIntegralNumber())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        StringBuilder contenido = new StringBuilder(); Set<String> firmados = new HashSet<>();
        for (JsonNode p : propiedades) {
            String ruta = p.asText(); firmados.add(ruta); JsonNode valor = data;
            for (String parte : ruta.split("\\.")) valor = valor.path(parte);
            if (valor.isMissingNode() || !valor.isValueNode() || valor.isNull()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
            contenido.append(valor.asText());
        }
        if (!firmados.containsAll(Set.of("transaction.id", "transaction.status", "transaction.amount_in_cents")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        contenido.append(evento.path("timestamp").asText()).append(eventos);
        String recibido = firma.path("checksum").asText();
        if (!MessageDigest.isEqual(sha256(contenido.toString()).getBytes(StandardCharsets.US_ASCII), recibido.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII)))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        JsonNode tx = data.path("transaction");
        String id = tx.path("id").asText(), referencia = tx.path("reference").asText();
        // La referencia del evento se confirma mediante la consulta directa a Wompi.
        PagoPrueba pago = pagos.findById(referencia).orElse(null);
        if (pago == null) return Map.of("status", "ignored");
        verificarConWompi(pago, id);
        return Map.of("status", "ok");
    }
    private void verificarConWompi(PagoPrueba pago, String id) {
        if (!id.matches("[A-Za-z0-9_-]{1,120}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://sandbox.wompi.co/v1/transactions/" + id)).timeout(Duration.ofSeconds(10)).GET().build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No fue posible consultar Wompi.");
            JsonNode tx = json.readTree(response.body()).path("data");
            if (!id.equals(tx.path("id").asText()) || !pago.referencia.equals(tx.path("reference").asText()) || pago.monto != tx.path("amount_in_cents").asLong() || !"COP".equals(tx.path("currency").asText()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La transacción no corresponde al pedido.");
            if (pago.transaccionId != null && !pago.transaccionId.equals(id)) throw new ResponseStatusException(HttpStatus.CONFLICT);
            String estado = tx.path("status").asText();
            if (!Set.of("PENDING", "APPROVED", "DECLINED", "ERROR", "VOIDED").contains(estado)) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY);
            if (!"APPROVED".equals(pago.estado) && "APPROVED".equals(estado)) {
                pago.vence = switch (pago.plan) { case "mensual" -> Instant.now().plus(30, ChronoUnit.DAYS); case "semestral" -> Instant.now().plus(180, ChronoUnit.DAYS); default -> null; };
            }
            pago.estado = estado; pago.transaccionId = id; pagos.save(pago);
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new ResponseStatusException(HttpStatus.BAD_GATEWAY); }
          catch (java.io.IOException e) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No fue posible consultar Wompi."); }
    }
    private static String sha256(String valor) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
