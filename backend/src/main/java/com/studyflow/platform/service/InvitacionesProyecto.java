package com.studyflow.platform.service;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.model.entity.Integrante;
import com.studyflow.platform.model.enums.RolIntegrante;
import com.studyflow.platform.repository.IntegranteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Pattern;

@Service
@Transactional
public class InvitacionesProyecto {
    private static final SecureRandom AZAR = new SecureRandom();
    private static final Pattern TOKEN = Pattern.compile("[A-Za-z0-9_-]{43}");
    private static final Pattern CORREO = Pattern.compile("[^\\s@]+@[^\\s@]+");
    private final IntegranteRepository integrantes;
    private final SesionService sesion;

    public InvitacionesProyecto(IntegranteRepository integrantes, SesionService sesion) {
        this.integrantes = integrantes;
        this.sesion = sesion;
    }

    public String generar(String codigo, Long id) {
        Integrante integrante = integrantes.bloquearPorId(id)
                .filter(item -> item.getProyecto().getCodigo().equals(codigo))
                .orElseThrow(() -> new RecursoNoEncontradoException("integrante", id));
        if (integrante.getRol() != RolIntegrante.COLABORADOR || integrante.getUsuario() != null) {
            throw new IllegalArgumentException("Esta persona ya tiene acceso al proyecto.");
        }
        byte[] bytes = new byte[32];
        AZAR.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        integrante.setInvitacionHash(com.studyflow.platform.util.TextoUtil.sha256(token));
        integrante.setInvitacionVence(Instant.now().plus(Duration.ofDays(2)));
        return token;
    }

    public String aceptar(String token) {
        if (token == null || !TOKEN.matcher(token).matches()) throw noEncontrada();
        Integrante integrante = integrantes.bloquearInvitacion(com.studyflow.platform.util.TextoUtil.sha256(token))
                .filter(item -> item.getInvitacionVence() != null && item.getInvitacionVence().isAfter(Instant.now()))
                .filter(item -> item.getUsuario() == null)
                .orElseThrow(this::noEncontrada);
        var usuario = sesion.usuarioActual();
        String contacto = integrante.getContacto();
        if (contacto != null && CORREO.matcher(contacto.trim()).matches()
                && !contacto.trim().equalsIgnoreCase(usuario.getCorreo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Entra con la cuenta a la que enviaron esta invitación.");
        }
        integrante.setUsuario(usuario);
        integrante.setInvitacionHash(null);
        integrante.setInvitacionVence(null);
        return integrante.getProyecto().getCodigo();
    }

    private RecursoNoEncontradoException noEncontrada() {
        return new RecursoNoEncontradoException("invitación", "vencida o inexistente");
    }
}
