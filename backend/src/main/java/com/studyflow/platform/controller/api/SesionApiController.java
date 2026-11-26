package com.studyflow.platform.controller.api;

import com.studyflow.platform.mapper.UsuarioMapper;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.security.SolicitudesAutenticacion;
import com.studyflow.platform.security.TokensSesion;
import com.studyflow.platform.service.SesionService;
import com.studyflow.platform.service.UsuarioService;
import com.studyflow.platform.service.impl.SesionServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/sesion")
public class SesionApiController {
    private final SesionService sesionService;
    private final UsuarioService usuarioService;
    private final UsuarioMapper usuarioMapper;
    private final TokensSesion tokens;
    private final SolicitudesAutenticacion solicitudes;
    private final boolean cookieSegura;
    private final String nombreCookie;

    public SesionApiController(SesionService sesionService, UsuarioService usuarioService,
                               UsuarioMapper usuarioMapper, TokensSesion tokens,
                               SolicitudesAutenticacion solicitudes,
                               @Value("${studyflow.auth.secure-cookie:true}") boolean cookieSegura) {
        this.sesionService = sesionService;
        this.usuarioService = usuarioService;
        this.usuarioMapper = usuarioMapper;
        this.tokens = tokens;
        this.solicitudes = solicitudes;
        this.cookieSegura = cookieSegura;
        this.nombreCookie = cookieSegura ? "__Host-studyflow-refresh" : "studyflow-refresh";
    }

    @GetMapping("/actual")
    public Map<String, Object> actual() {
        return Map.of("usuario", usuarioMapper.aDTO(sesionService.usuarioActual()), "iniciada", true,
                "cuentaDemostracion", sesionService.nombreCuentaDemostracion());
    }

    /** La ruta histórica de entrada ahora tiene los mismos requisitos que el acceso normal. */
    @PostMapping({"/acceder", "/entrar"})
    public ResponseEntity<Map<String, Object>> acceder(@RequestBody Map<String, String> cuerpo,
                                                      HttpServletRequest request,
                                                      HttpServletResponse response) {
        solicitudes.exigirOrigen(request);
        String correo = cuerpo.get("correo");
        solicitudes.limitar(request, correo);
        Usuario usuario = usuarioService.autenticar(correo, cuerpo.get("contrasena"));
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("acceso", false, "mensaje", "Correo o contraseña incorrectos."));
        }
        return ResponseEntity.ok(iniciar(usuario, request, response));
    }

    @PostMapping("/renovar")
    public ResponseEntity<Map<String, String>> renovar(HttpServletRequest request) {
        solicitudes.exigirOrigen(request);
        return tokens.renovar(credencial(request))
                .map(token -> ResponseEntity.ok(Map.of("token", token)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/salir")
    public Map<String, String> salir(HttpServletRequest request, HttpServletResponse response) {
        solicitudes.exigirOrigen(request);
        tokens.cerrar(SesionServiceImpl.identidadActual(), credencial(request));
        escribirCookie(response, "", Duration.ZERO);
        return Map.of("mensaje", "Sesión cerrada.");
    }

    private Map<String, Object> iniciar(Usuario usuario, HttpServletRequest request,
                                        HttpServletResponse response) {
        var credenciales = tokens.iniciar(usuario, false, credencial(request));
        escribirCookie(response, credenciales.renovacion(), TokensSesion.VIDA_SESION);
        return Map.of("acceso", true, "usuario", usuarioMapper.aDTO(usuario), "token", credenciales.token());
    }

    private String credencial(HttpServletRequest request) {
        var cookies = request.getCookies();
        if (cookies == null) return null;
        var candidatas = Arrays.stream(cookies).filter(cookie -> nombreCookie.equals(cookie.getName())).toList();
        return candidatas.size() == 1 ? candidatas.get(0).getValue() : null;
    }

    private void escribirCookie(HttpServletResponse response, String valor, Duration duracion) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(nombreCookie, valor)
                .path(cookieSegura ? "/" : "/api/sesion").httpOnly(true).secure(cookieSegura)
                .sameSite("Strict").maxAge(duracion).build().toString());
    }
}
