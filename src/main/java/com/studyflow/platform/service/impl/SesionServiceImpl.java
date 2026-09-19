package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.exception.SesionNoIniciadaException;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.service.SesionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** Implementacion de la sesion sobre {@code HttpSession}. */
@Service
@Transactional
public class SesionServiceImpl implements SesionService {

    private static final String CLAVE_USUARIO = "studyflow.usuarioId";

    private final UsuarioRepository usuarioRepository;
    private final HttpSession sesion;
    /** Correo de la cuenta sembrada con los proyectos de ejemplo. */
    private final String correoDemostracion;
    private final boolean demostracionHabilitada;

    public SesionServiceImpl(UsuarioRepository usuarioRepository,
                             HttpSession sesion,
                             @org.springframework.beans.factory.annotation.Value(
                                 "${studyflow.demo.correo:valentina.rojas@universidad.edu.co}")
                             String correoDemostracion,
                             @org.springframework.beans.factory.annotation.Value("${studyflow.demo.enabled:false}")
                             boolean demostracionHabilitada) {
        this.usuarioRepository = usuarioRepository;
        this.sesion = sesion;
        this.correoDemostracion = correoDemostracion;
        this.demostracionHabilitada = demostracionHabilitada;
    }

    @Override
    @Transactional(readOnly = true)
    public Usuario usuarioActual() {
        Object guardado = sesion.getAttribute(CLAVE_USUARIO);
        if (guardado instanceof Long id) {
            // La cuenta pudo desaparecer si se recreó la base con el servidor abierto.
            return usuarioRepository.findById(id).orElseThrow(SesionNoIniciadaException::new);
        }
        throw new SesionNoIniciadaException();
    }

    @Override
    @Transactional(readOnly = true)
    public Long usuarioActualId() {
        return usuarioActual().getId();
    }

    @Override
    public void iniciarSesion(Usuario usuario) {
        sesion.setAttribute(CLAVE_USUARIO, usuario.getId());
    }

    @Override
    public void cerrarSesion() {
        sesion.removeAttribute(CLAVE_USUARIO);
    }

    @Override
    public boolean haySesionIniciada() {
        return sesion.getAttribute(CLAVE_USUARIO) instanceof Long;
    }

    @Override
    public Usuario accesoRapido(String nombre, String correo) {
        String correoLimpio = normalizarCorreo(nombre, correo);

        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(correoLimpio)
                .orElseGet(() -> crearMinimo(nombre, correoLimpio));
        iniciarSesion(usuario);
        return usuario;
    }

    /**
     * Crea la cuenta con lo estrictamente necesario. El resto de datos
     * academicos se completan despues desde el perfil.
     */
    private Usuario crearMinimo(String nombre, String correo) {
        String limpio = nombre == null || nombre.isBlank() ? "Estudiante" : nombre.trim();
        String[] partes = limpio.split("\\s+", 2);

        Usuario usuario = new Usuario();
        usuario.setNombre(partes[0]);
        usuario.setApellido(partes.length > 1 ? partes[1] : "");
        usuario.setCorreo(correo);
        return usuarioRepository.save(usuario);
    }

    /** Sin correo se genera uno interno a partir del nombre, para no pedir mas datos. */
    private String normalizarCorreo(String nombre, String correo) {
        if (correo != null && !correo.isBlank()) {
            return correo.trim().toLowerCase(Locale.ROOT);
        }
        String base = com.studyflow.platform.util.TextoUtil.aSlug(
                nombre == null || nombre.isBlank() ? "estudiante" : nombre);
        return base + "@studyflow.local";
    }

    @Override
    public Usuario entrarComoDemostracion() {
        if (!demostracionHabilitada) {
            throw new RecursoNoEncontradoException("acceso de demostración", "deshabilitado");
        }
        Usuario demo = cuentaDemostracion();
        iniciarSesion(demo);
        return demo;
    }

    @Override
    @Transactional(readOnly = true)
    public String nombreCuentaDemostracion() {
        if (!demostracionHabilitada) return "";
        return cuentaDemostracion().getNombreCompleto();
    }

    /** Only the explicitly configured fixture can be used in demo-enabled environments. */
    private Usuario cuentaDemostracion() {
        return usuarioRepository.findByCorreoIgnoreCase(correoDemostracion)
                .orElseThrow(() -> new RecursoNoEncontradoException("usuario", "demostración"));
    }
}
