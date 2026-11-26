package com.studyflow.platform.security;

import com.studyflow.platform.model.entity.Usuario;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class TokensSesion {
    private static final String EMISOR = "studyflow";
    private static final Duration VIDA_JWT = Duration.ofMinutes(5);
    public static final Duration VIDA_SESION = Duration.ofDays(7);
    private static final SecureRandom ALEATORIO = new SecureRandom();
    private static final Pattern CREDENCIAL = Pattern.compile("[A-Za-z0-9_-]{43}");

    public record Identidad(Long usuarioId, UUID sesionId, boolean demostracion) {}
    public record Credenciales(String token, String renovacion) {}

    private final SesionAutenticadaRepository sesiones;
    private final SecretKey clave;
    private final JwtParser parser;
    private final boolean demostracionHabilitada;

    public TokensSesion(SesionAutenticadaRepository sesiones,
                        @Value("${studyflow.auth.jwt-key}") String claveBase64,
                        @Value("${studyflow.demo.enabled:false}") boolean demostracionHabilitada) {
        this.sesiones = sesiones;
        this.demostracionHabilitada = demostracionHabilitada;
        byte[] bytes = claveBase64.isBlank() ? aleatorio() : Base64.getDecoder().decode(claveBase64);
        if (bytes.length != 32) {
            throw new IllegalArgumentException("STUDYFLOW_JWT_KEY debe codificar 32 bytes en Base64.");
        }
        clave = Keys.hmacShaKeyFor(bytes);
        parser = Jwts.parser().requireIssuer(EMISOR).verifyWith(clave).build();
    }

    @Transactional
    public Credenciales iniciar(Usuario usuario, boolean demostracion, String sesionAnterior) {
        revocarCookie(sesionAnterior);
        String renovacion = Base64.getUrlEncoder().withoutPadding().encodeToString(aleatorio());
        SesionAutenticada sesion = sesiones.save(new SesionAutenticada(UUID.randomUUID(), usuario,
                hash(renovacion), Instant.now().plus(VIDA_SESION), demostracion));
        return new Credenciales(jwt(sesion), renovacion);
    }

    @Transactional(readOnly = true)
    public Optional<String> renovar(String renovacion) {
        if (!esCredencial(renovacion)) return Optional.empty();
        return sesiones.findByCredencialHashAndVenceAfter(hash(renovacion), Instant.now())
                .filter(this::habilitada)
                .map(this::jwt);
    }

    @Transactional(readOnly = true)
    public Optional<Identidad> verificar(String token) {
        if (token.length() > 2048) return Optional.empty();
        try {
            var jwt = parser.parseSignedClaims(token);
            var datos = jwt.getPayload();
            if (!Jwts.SIG.HS256.getId().equals(jwt.getHeader().getAlgorithm()) || datos.getExpiration() == null) {
                return Optional.empty();
            }
            UUID sesion = UUID.fromString(datos.getId());
            Long usuario = Long.valueOf(datos.getSubject());
            return sesiones.findByIdAndVenceAfter(sesion, Instant.now())
                    .filter(this::habilitada)
                    .filter(registro -> registro.getUsuario().getId().equals(usuario))
                    .map(registro -> new Identidad(usuario, sesion, registro.isDemostracion()));
        } catch (JwtException | IllegalArgumentException | NullPointerException error) {
            return Optional.empty();
        }
    }

    @Transactional
    public void cerrar(Identidad identidad, String renovacion) {
        if (identidad != null) sesiones.deleteById(identidad.sesionId());
        revocarCookie(renovacion);
    }

    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void limpiarVencidas() {
        sesiones.deleteByVenceBefore(Instant.now());
    }

    private boolean habilitada(SesionAutenticada sesion) {
        return !sesion.isDemostracion() || demostracionHabilitada;
    }

    private void revocarCookie(String renovacion) {
        if (esCredencial(renovacion)) sesiones.deleteByCredencialHash(hash(renovacion));
    }

    private boolean esCredencial(String valor) {
        return valor != null && CREDENCIAL.matcher(valor).matches();
    }

    private String jwt(SesionAutenticada sesion) {
        Instant ahora = Instant.now();
        Instant vence = ahora.plus(VIDA_JWT);
        if (sesion.getVence().isBefore(vence)) vence = sesion.getVence();
        return Jwts.builder()
                .issuer(EMISOR)
                .subject(sesion.getUsuario().getId().toString())
                .id(sesion.getId().toString())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(vence))
                .signWith(clave, Jwts.SIG.HS256)
                .compact();
    }

    private static byte[] aleatorio() {
        byte[] bytes = new byte[32];
        ALEATORIO.nextBytes(bytes);
        return bytes;
    }

    private static String hash(String renovacion) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(renovacion.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}
