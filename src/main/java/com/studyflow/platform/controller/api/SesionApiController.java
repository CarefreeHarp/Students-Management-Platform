package com.studyflow.platform.controller.api;

import com.studyflow.platform.mapper.UsuarioMapper;
import com.studyflow.platform.model.dto.UsuarioDTO;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.service.SesionService;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Acceso y registro, reducidos a lo minimo.
 *
 * <p>La idea es que se pueda empezar a usar la aplicacion sin rellenar un
 * formulario largo: basta un nombre. El resto de datos academicos se completan
 * despues desde el perfil.</p>
 */
@RestController
@RequestMapping("/api/sesion")
public class SesionApiController {

    private final SesionService sesionService;
    private final UsuarioService usuarioService;
    private final UsuarioMapper usuarioMapper;

    public SesionApiController(SesionService sesionService,
                               UsuarioService usuarioService,
                               UsuarioMapper usuarioMapper) {
        this.sesionService = sesionService;
        this.usuarioService = usuarioService;
        this.usuarioMapper = usuarioMapper;
    }

    /** Quien está usando la aplicación ahora mismo. */
    @GetMapping("/actual")
    public Map<String, Object> actual() {
        return Map.of(
                "usuario", usuarioMapper.aDTO(sesionService.usuarioActual()),
                "iniciada", sesionService.haySesionIniciada(),
                "cuentaDemostracion", sesionService.nombreCuentaDemostracion());
    }

    /**
     * Entra con la cuenta que trae los proyectos de ejemplo.
     *
     * <p>Una cuenta nueva no participa en ningún proyecto y su espacio aparece
     * vacío, que es lo correcto. Para recorrer la aplicación con contenido
     * —o para enseñarla— hace falta esta puerta.</p>
     */
    @PostMapping("/demostracion")
    public UsuarioDTO demostracion() {
        return usuarioMapper.aDTO(sesionService.entrarComoDemostracion());
    }

    /**
     * Entrada en un paso. Con solo el nombre ya se puede entrar: si el correo
     * existe se reutiliza la cuenta y si no, se crea.
     */
    @PostMapping("/entrar")
    public UsuarioDTO entrar(@RequestBody Map<String, String> cuerpo) {
        Usuario usuario = sesionService.accesoRapido(cuerpo.get("nombre"), cuerpo.get("correo"));
        return usuarioMapper.aDTO(usuario);
    }

    /** Acceso con correo y contraseña, para quien ya se registró así. */
    @PostMapping("/acceder")
    public Map<String, Object> acceder(@RequestBody Map<String, String> cuerpo) {
        String correo = cuerpo.get("correo");
        if (!usuarioService.credencialesValidas(correo, cuerpo.get("contrasena"))) {
            return Map.of("acceso", false, "mensaje", "Correo o contraseña incorrectos.");
        }
        Usuario usuario = usuarioService.obtenerPorCorreo(correo);
        sesionService.iniciarSesion(usuario);
        return Map.of("acceso", true, "usuario", usuarioMapper.aDTO(usuario));
    }

    @PostMapping("/salir")
    public Map<String, String> salir() {
        sesionService.cerrarSesion();
        return Map.of("mensaje", "Sesión cerrada.");
    }
}
