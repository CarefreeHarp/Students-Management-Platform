package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.UsuarioMapper;
import com.studyflow.platform.model.dto.UsuarioDTO;
import com.studyflow.platform.model.entity.Universidad;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.repository.UniversidadRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.Optional;

/** Implementacion de las reglas de cuentas y perfiles. */
@Service
@Transactional
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UniversidadRepository universidadRepository;
    private final UsuarioMapper usuarioMapper;

    public UsuarioServiceImpl(UsuarioRepository usuarioRepository,
                              UniversidadRepository universidadRepository,
                              UsuarioMapper usuarioMapper) {
        this.usuarioRepository = usuarioRepository;
        this.universidadRepository = universidadRepository;
        this.usuarioMapper = usuarioMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Usuario obtenerActual() {
        return usuarioRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new RecursoNoEncontradoException("usuario", "actual"));
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
    public UsuarioDTO registrar(Usuario usuario, String universidad, String contrasena) {
        if (usuarioRepository.existsByCorreoIgnoreCase(usuario.getCorreo())) {
            throw new IllegalArgumentException("Ya existe una cuenta con ese correo institucional.");
        }
        usuario.setUniversidad(resolverUniversidad(universidad));
        usuario.setContrasenaHash(codificar(contrasena));
        return usuarioMapper.aDTO(usuarioRepository.save(usuario));
    }

    @Override
    public UsuarioDTO actualizarPerfil(Long id, Usuario datos, String universidad) {
        Usuario usuario = obtenerPorId(id);
        usuario.setNombre(datos.getNombre());
        usuario.setApellido(datos.getApellido());
        usuario.setCorreo(datos.getCorreo());
        usuario.setEdad(datos.getEdad());
        usuario.setPrograma(datos.getPrograma());
        usuario.setSemestre(datos.getSemestre());
        usuario.setDescripcion(datos.getDescripcion());
        if (datos.getAvatarUrl() != null && !datos.getAvatarUrl().isBlank()) {
            usuario.setAvatarUrl(datos.getAvatarUrl());
        }
        if (universidad != null && !universidad.isBlank()) {
            usuario.setUniversidad(resolverUniversidad(universidad));
        }
        return usuarioMapper.aDTO(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean credencialesValidas(String correo, String contrasena) {
        Optional<Usuario> usuario = usuarioRepository.findByCorreoIgnoreCase(correo);
        return usuario.isPresent() && codificar(contrasena).equals(usuario.get().getContrasenaHash());
    }

    /** Reutiliza la universidad si ya existe; si no, la crea. */
    private Universidad resolverUniversidad(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return null;
        }
        return universidadRepository.findByNombreIgnoreCase(nombre.trim())
                .orElseGet(() -> universidadRepository.save(new Universidad(nombre.trim(), "Colombia")));
    }

    /**
     * Codificacion provisional de la contrasena. Al incorporar Spring Security
     * debe sustituirse por BCryptPasswordEncoder.
     */
    private String codificar(String contrasena) {
        return contrasena == null ? null : Base64.getEncoder().encodeToString(contrasena.getBytes());
    }
}
