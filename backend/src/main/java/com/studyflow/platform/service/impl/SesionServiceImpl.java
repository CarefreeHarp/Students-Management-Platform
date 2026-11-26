package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.exception.SesionNoIniciadaException;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.ProveedorAcceso;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.security.TokensSesion.Identidad;
import com.studyflow.platform.service.SesionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SesionServiceImpl implements SesionService {
    private final UsuarioRepository usuarios;
    private final boolean demostracionHabilitada;

    public SesionServiceImpl(UsuarioRepository usuarios,
                             @Value("${studyflow.demo.enabled:false}") boolean demostracionHabilitada) {
        this.usuarios = usuarios;
        this.demostracionHabilitada = demostracionHabilitada;
    }

    @Override
    public Usuario usuarioActual() {
        return usuarios.findById(usuarioActualId()).orElseThrow(SesionNoIniciadaException::new);
    }

    @Override
    public Long usuarioActualId() {
        Identidad identidad = identidadActual();
        if (identidad == null) throw new SesionNoIniciadaException();
        return identidad.usuarioId();
    }

    @Override
    public boolean haySesionIniciada() {
        return identidadActual() != null;
    }

    public static Identidad identidadActual() {
        var autenticacion = SecurityContextHolder.getContext().getAuthentication();
        return autenticacion != null && autenticacion.getPrincipal() instanceof Identidad identidad
                ? identidad : null;
    }

    @Override
    public Usuario entrarComoDemostracion() {
        if (!demostracionHabilitada) {
            throw new RecursoNoEncontradoException("acceso de demostración", "deshabilitado");
        }
        return usuarios.findFirstByProveedorOrderByIdAsc(ProveedorAcceso.DEMOSTRACION)
                .orElseThrow(() -> new RecursoNoEncontradoException("usuario", "demostración"));
    }

    @Override
    public String nombreCuentaDemostracion() {
        return demostracionHabilitada ? usuarios.findFirstByProveedorOrderByIdAsc(ProveedorAcceso.DEMOSTRACION)
                .map(Usuario::getNombreCompleto).orElse("") : "";
    }
}
