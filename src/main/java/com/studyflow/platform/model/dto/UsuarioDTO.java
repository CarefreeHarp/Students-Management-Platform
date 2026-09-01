package com.studyflow.platform.model.dto;

/** Vista publica del estudiante (nunca incluye la contrasena). */
public record UsuarioDTO(
        Long id,
        String nombre,
        String apellido,
        String nombreCompleto,
        String correo,
        Integer edad,
        String universidad,
        String programa,
        Integer semestre,
        String descripcion,
        String avatarUrl,
        String fechaRegistro
) {
}
