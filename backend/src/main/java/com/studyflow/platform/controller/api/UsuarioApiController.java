package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.UsuarioDTO;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.http.HttpStatus;
import com.studyflow.platform.security.SolicitudesAutenticacion;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** API REST del perfil y del acceso de estudiantes. */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioApiController {

    private final UsuarioService usuarioService;

    private final SolicitudesAutenticacion solicitudes;

    public UsuarioApiController(UsuarioService usuarioService, SolicitudesAutenticacion solicitudes) {
        this.usuarioService = usuarioService;
        this.solicitudes = solicitudes;
    }

    @GetMapping("/actual")
    public UsuarioDTO actual() {
        return usuarioService.obtenerPerfilActual();
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioDTO registrar(@RequestBody Map<String, String> cuerpo, HttpServletRequest request) {
        solicitudes.exigirOrigen(request);
        solicitudes.limitar(request, cuerpo.get("email"));
        Usuario usuario = new Usuario();
        usuario.setNombre(cuerpo.get("firstName"));
        usuario.setApellido(cuerpo.get("lastName"));
        usuario.setCorreo(cuerpo.get("email"));
        usuario.setEdad(entero(cuerpo.get("age")));
        usuario.setPrograma(cuerpo.get("career"));
        usuario.setSemestre(entero(cuerpo.get("semester")));
        return usuarioService.registrar(usuario, cuerpo.get("university"), cuerpo.get("password"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ESTUDIANTE') and @permisos.esUsuario(#id)")
    public UsuarioDTO actualizar(@PathVariable Long id, @RequestBody Map<String, String> cuerpo) {
        Usuario datos = new Usuario();
        datos.setNombre(cuerpo.get("firstName"));
        datos.setApellido(cuerpo.get("lastName"));
        datos.setCorreo(cuerpo.get("email"));
        datos.setEdad(entero(cuerpo.get("age")));
        datos.setPrograma(cuerpo.get("career"));
        datos.setSemestre(entero(cuerpo.get("semester")));
        datos.setDescripcion(cuerpo.get("description"));
        datos.setAvatarUrl(cuerpo.get("avatar"));
        return usuarioService.actualizarPerfil(id, datos, cuerpo.get("university"));
    }

    /** Comprueba credenciales para clientes de la API que usan la ruta histórica. */
    @PostMapping("/acceso")
    public Map<String, Object> acceso(@RequestBody Map<String, String> cuerpo, HttpServletRequest request) {
        solicitudes.exigirOrigen(request);
        solicitudes.limitar(request, cuerpo.get("email"));
        boolean valido = usuarioService.autenticar(cuerpo.get("email"), cuerpo.get("password")) != null;
        return Map.of("acceso", valido);
    }

    private Integer entero(String valor) {
        try {
            return valor == null || valor.isBlank() ? null : Integer.valueOf(valor.trim());
        } catch (NumberFormatException error) {
            return null;
        }
    }
}
