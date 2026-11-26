package com.studyflow.platform.security;

import com.studyflow.platform.model.entity.*;
import com.studyflow.platform.model.enums.RolIntegrante;
import com.studyflow.platform.service.SesionService;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Function;

@Component("permisos")
@Transactional(readOnly = true)
public class Permisos {
    private final EntityManager entidades;
    private final SesionService sesion;

    public Permisos(EntityManager entidades, SesionService sesion) {
        this.entidades = entidades;
        this.sesion = sesion;
    }

    public boolean esUsuario(Long id) {
        return sesion.usuarioActualId().equals(id);
    }

    public boolean proyecto(String codigo, boolean lider) {
        Proyecto proyecto = entidades.createQuery("select p from Proyecto p where p.codigo = :codigo", Proyecto.class)
                .setParameter("codigo", codigo).getResultList().stream().findFirst().orElse(null);
        return puede(proyecto, lider);
    }

    public boolean tarea(Long id) {
        return puede(recurso(Tarea.class, id, Tarea::getProyecto), false);
    }

    public boolean canal(Long id, boolean administrar) {
        Canal canal = entidades.find(Canal.class, id);
        return canal != null && (puede(canal.getProyecto(), administrar)
                || administrar && canal.getCreador() != null && esUsuario(canal.getCreador().getId())
                && puede(canal.getProyecto(), false));
    }

    public boolean mensaje(Long id) {
        return puede(recurso(MensajeChat.class, id, mensaje -> mensaje.getCanal().getProyecto()), false);
    }

    public boolean entregable(Long id) {
        return puede(recurso(Entregable.class, id, Entregable::getProyecto), false);
    }

    public boolean archivo(Long id, boolean administrar) {
        ArchivoAdjunto archivo = entidades.find(ArchivoAdjunto.class, id);
        return archivo != null && (puede(archivo.getCanal().getProyecto(), administrar)
                || administrar && archivo.getSubidoPor() != null && esUsuario(archivo.getSubidoPor().getId())
                && puede(archivo.getCanal().getProyecto(), false));
    }

    public boolean materia(Long id) { return propio(Materia.class, id, Materia::getUsuario); }
    public boolean horario(Long id) { return propio(Horario.class, id, Horario::getUsuario); }
    public boolean recordatorio(Long id) { return propio(Recordatorio.class, id, Recordatorio::getUsuario); }
    public boolean apunte(Long id) { return propio(ApunteClase.class, id, ApunteClase::getUsuario); }

    private boolean puede(Proyecto proyecto, boolean lider) {
        if (proyecto == null) return false;
        Long id = sesion.usuarioActualId();
        return proyecto.getPropietario().getId().equals(id)
                || proyecto.getIntegrantes().stream().anyMatch(integrante ->
                        integrante.getUsuario() != null && integrante.getUsuario().getId().equals(id)
                                && (!lider || integrante.getRol() == RolIntegrante.LIDER));
    }

    private <T, R> R recurso(Class<T> tipo, Long id, Function<T, R> relacion) {
        T entidad = entidades.find(tipo, id);
        return entidad == null ? null : relacion.apply(entidad);
    }

    private <T> boolean propio(Class<T> tipo, Long id, Function<T, Usuario> relacion) {
        Usuario usuario = recurso(tipo, id, relacion);
        return usuario != null && esUsuario(usuario.getId());
    }
}
