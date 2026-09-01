package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.UsuarioDTO;
import com.studyflow.platform.model.entity.Usuario;

/** Reglas de negocio de cuentas y perfiles de estudiante. */
public interface UsuarioService {

    /** Usuario de la sesion actual. Mientras no exista autenticacion, el primero registrado. */
    Usuario obtenerActual();

    UsuarioDTO obtenerPerfilActual();

    Usuario obtenerPorId(Long id);

    UsuarioDTO registrar(Usuario usuario, String universidad, String contrasena);

    UsuarioDTO actualizarPerfil(Long id, Usuario datos, String universidad);

    /** Valida credenciales del formulario de inicio de sesion. */
    boolean credencialesValidas(String correo, String contrasena);
}
