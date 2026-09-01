package com.studyflow.platform.mapper;

import com.studyflow.platform.model.dto.UsuarioDTO;
import com.studyflow.platform.model.entity.Usuario;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

/** Traduce {@link Usuario} a su vista publica. */
@Component
public class UsuarioMapper {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public UsuarioDTO aDTO(Usuario usuario) {
        return new UsuarioDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getNombreCompleto(),
                usuario.getCorreo(),
                usuario.getEdad(),
                usuario.getUniversidad() != null ? usuario.getUniversidad().getNombre() : null,
                usuario.getPrograma(),
                usuario.getSemestre(),
                usuario.getDescripcion(),
                usuario.getAvatarUrl(),
                usuario.getFechaRegistro() != null ? usuario.getFechaRegistro().format(FECHA) : null
        );
    }
}
