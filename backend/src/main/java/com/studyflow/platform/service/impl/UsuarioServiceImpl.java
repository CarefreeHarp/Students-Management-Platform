package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.CampoInvalidoException;
import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.UsuarioMapper;
import com.studyflow.platform.model.dto.UsuarioDTO;
import com.studyflow.platform.model.entity.Universidad;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.ProveedorAcceso;
import com.studyflow.platform.repository.UniversidadRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.security.Contrasenas;
import com.studyflow.platform.service.SesionService;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.Locale;
import java.util.Objects;

/** Implementacion de las reglas de cuentas y perfiles. */
@Service
@Transactional
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UniversidadRepository universidadRepository;
    private final UsuarioMapper usuarioMapper;
    private final SesionService sesionService;
    private final Contrasenas contrasenas;
    private final boolean accesoDemoHabilitado;

    public UsuarioServiceImpl(UsuarioRepository usuarioRepository,
                              UniversidadRepository universidadRepository,
                              UsuarioMapper usuarioMapper,
                              SesionService sesionService,
                              Contrasenas contrasenas,
                              @Value("${studyflow.demo.enabled:false}") boolean demoHabilitada,
                              @Value("${spring.datasource.url}") String urlBaseDeDatos) {
        this.usuarioRepository = usuarioRepository;
        this.universidadRepository = universidadRepository;
        this.usuarioMapper = usuarioMapper;
        this.sesionService = sesionService;
        this.contrasenas = contrasenas;
        this.accesoDemoHabilitado = demoHabilitada && urlBaseDeDatos.startsWith("jdbc:h2:mem:");
    }

    @Override
    @Transactional(readOnly = true)
    public Usuario obtenerActual() {
        return sesionService.usuarioActual();
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioDTO obtenerPerfilActual() {
        return usuarioMapper.aDTO(obtenerActual());
    }

    @Override
    @Transactional(readOnly = true)
    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("usuario", id));
    }

    @Override
    @Transactional(readOnly = true)
    public Usuario obtenerPorCorreo(String correo) {
        return usuarioRepository.findByCorreoIgnoreCase(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("usuario", correo));
    }

    @Override
    public UsuarioDTO registrar(Usuario usuario, String universidad, String contrasena) {
        usuario.setCorreo(normalizarCorreo(usuario.getCorreo()));
        if (usuarioRepository.existsByCorreoIgnoreCase(usuario.getCorreo())) {
            throw new IllegalArgumentException("Ya existe una cuenta con ese correo institucional.");
        }
        usuario.setUniversidad(resolverUniversidad(universidad));
        usuario.setContrasenaHash(contrasenas.nueva(contrasena));
        return usuarioMapper.aDTO(usuarioRepository.save(usuario));
    }

    @Override
    public UsuarioDTO actualizarPerfil(Long id, Usuario datos, String universidad) {
        Usuario usuario = obtenerPorId(id);
        usuario.setNombre(datos.getNombre());
        usuario.setApellido(datos.getApellido());
        usuario.setCorreo(normalizarCorreo(datos.getCorreo()));
        usuario.setEdad(datos.getEdad());
        usuario.setPrograma(datos.getPrograma());
        usuario.setSemestre(datos.getSemestre());
        usuario.setDescripcion(datos.getDescripcion());
        String avatar = datos.getAvatarUrl();
        if (avatar != null && !avatar.isBlank() && !Objects.equals(avatar, usuario.getAvatarUrl())) {
            usuario.setAvatarUrl(validarAvatar(avatar));
        }
        if (universidad != null && !universidad.isBlank()) {
            usuario.setUniversidad(resolverUniversidad(universidad));
        }
        return usuarioMapper.aDTO(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public Usuario autenticar(String correo, String contrasena) {
        Usuario usuario = correo == null || correo.length() > 160 ? null :
                usuarioRepository.findByCorreoIgnoreCase(correo.trim())
                        .filter(cuenta -> accesoDemoHabilitado || cuenta.getProveedor() != ProveedorAcceso.DEMOSTRACION)
                        .orElse(null);
        return contrasenas.coincide(contrasena, usuario == null ? null : usuario.getContrasenaHash())
                ? usuario : null;
    }

    private String normalizarCorreo(String correo) {
        return Objects.toString(correo, "").trim().toLowerCase(Locale.ROOT);
    }

    private String validarAvatar(String avatar) {
        if (avatar.length() <= 2_796_240
                && avatar.matches("data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}")) {
            return avatar;
        }
        if (avatar.length() <= 500) {
            try {
                URI url = URI.create(avatar);
                if ("https".equalsIgnoreCase(url.getScheme()) && url.getHost() != null) return avatar;
            } catch (IllegalArgumentException invalida) {
                // El formulario recibe el mismo error de campo para cualquier formato inválido.
            }
        }
        throw new CampoInvalidoException("avatar", "Usa una imagen PNG, JPG o WEBP de máximo 2 MB.");
    }

    /** Reutiliza la universidad si ya existe; si no, la crea. */
    private Universidad resolverUniversidad(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return null;
        }
        return universidadRepository.findByNombreIgnoreCase(nombre.trim())
                .orElseGet(() -> universidadRepository.save(new Universidad(nombre.trim(), "Colombia")));
    }

}
