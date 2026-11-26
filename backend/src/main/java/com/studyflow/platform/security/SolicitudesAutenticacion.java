package com.studyflow.platform.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Component
public class SolicitudesAutenticacion {
    private record Ventana(long vence, int intentos) {}
    private static final long PERIODO = Duration.ofMinutes(2).toMillis();
    private final Map<String, Ventana> limites = new LinkedHashMap<>();

    public void exigirOrigen(HttpServletRequest request) {
        String sitio = request.getHeader("Sec-Fetch-Site");
        if (!"1".equals(request.getHeader("X-StudyFlow-Auth"))
                || "cross-site".equals(sitio) || "same-site".equals(sitio)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solicitud de autenticación no permitida.");
        }
    }

    public synchronized void limitar(HttpServletRequest request, String cuenta) {
        long ahora = System.currentTimeMillis();
        if (cuenta != null && cuenta.length() > 160) cuenta = null;
        if (limites.size() >= 4096) limites.values().removeIf(ventana -> ventana.vence() <= ahora);
        if (limites.size() >= 4096 || !consumir("ip:" + request.getRemoteAddr(), ahora, 60)
                || cuenta != null && !consumir("cuenta:" + cuenta.trim().toLowerCase(Locale.ROOT), ahora, 12)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muchos intentos. Espera un momento.");
        }
    }

    private boolean consumir(String clave, long ahora, int maximo) {
        Ventana previa = limites.get(clave);
        if (previa == null || previa.vence() <= ahora) {
            limites.put(clave, new Ventana(ahora + PERIODO, 1));
            return true;
        }
        if (previa.intentos() >= maximo) return false;
        limites.put(clave, new Ventana(previa.vence(), previa.intentos() + 1));
        return true;
    }
}
