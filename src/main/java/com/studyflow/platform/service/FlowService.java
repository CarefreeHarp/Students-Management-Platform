package com.studyflow.platform.service;

import com.studyflow.platform.model.entity.ActividadFlow;
import com.studyflow.platform.model.entity.Integrante;
import com.studyflow.platform.model.entity.PremioFlow;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.repository.ActividadFlowRepository;
import com.studyflow.platform.repository.PremioFlowRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class FlowService {
    private static final int PUNTOS_POR_TAREA = 10;
    private static final Set<String> COLORES = Set.of("violeta", "turquesa", "coral");
    private static final ZoneId ZONA_ACADEMICA = ZoneId.of("America/Bogota");
    private final PremioFlowRepository premios;
    private final ActividadFlowRepository actividades;
    private final UsuarioRepository usuarios;
    private final SesionService sesion;

    public record Mascota(String color, long puntos, int rachaDias) {}

    public FlowService(PremioFlowRepository premios, ActividadFlowRepository actividades,
                       UsuarioRepository usuarios, SesionService sesion) {
        this.premios = premios;
        this.actividades = actividades;
        this.usuarios = usuarios;
        this.sesion = sesion;
    }

    @Transactional(readOnly = true)
    public Mascota consultar() {
        Usuario usuario = sesion.usuarioActual();
        return mascota(usuario);
    }

    public Mascota cambiarColor(String color) {
        Usuario usuario = sesion.usuarioActual();
        if (color == null || !COLORES.contains(color)) {
            throw new IllegalArgumentException("Elige un color disponible para Flow.");
        }
        usuario.setColorFlow(color);
        return mascota(usuario);
    }

    private Mascota mascota(Usuario usuario) {
        LocalDate hoy = LocalDate.now(ZONA_ACADEMICA);
        return new Mascota(usuario.getColorFlow() == null ? "violeta" : usuario.getColorFlow(),
                PUNTOS_POR_TAREA * premios.countByUsuarioId(usuario.getId()),
                calcularRacha(actividades.diasConActividad(usuario.getId(), hoy), hoy));
    }

    private int calcularRacha(List<LocalDate> dias, LocalDate hoy) {
        LocalDate esperado = !dias.isEmpty() && dias.get(0).equals(hoy) ? hoy : hoy.minusDays(1);
        int racha = 0;
        for (LocalDate dia : dias) {
            if (!dia.equals(esperado)) break;
            racha++;
            esperado = esperado.minusDays(1);
        }
        return racha;
    }

    /** Los servicios de tareas y fases bloquean la fila antes de validar y cerrar. */
    public void terminar(Tarea tarea) {
        if (!tarea.tieneResultado()) {
            throw new IllegalArgumentException("Para terminar una tarea debes registrar un resultado escrito o adjuntar un archivo.");
        }
        if (tarea.estaCompletada() && tarea.getFechaCompletada() != null) return;

        LocalDateTime cierre = LocalDateTime.now(ZONA_ACADEMICA);
        tarea.setEstado(EstadoTarea.TERMINADA);
        tarea.setFechaCompletada(cierre);

        Usuario beneficiario = beneficiario(tarea);
        if (beneficiario == null) return;

        if (!actividades.existsById(tarea.getId())) {
            actividades.save(new ActividadFlow(tarea.getId(), beneficiario, cierre.toLocalDate()));
        }

        if (tarea.getFechaLimite() == null) return;
        LocalTime horaLimite = tarea.getHoraLimite() == null ? LocalTime.MAX : tarea.getHoraLimite();
        if (cierre.isAfter(tarea.getFechaLimite().atTime(horaLimite)) || premios.existsById(tarea.getId())) return;

        premios.save(new PremioFlow(tarea.getId(), beneficiario));
    }

    private Usuario beneficiario(Tarea tarea) {
        if (!sesion.haySesionIniciada()) return null;
        Usuario actual = sesion.usuarioActual();
        Proyecto proyecto = tarea.getProyecto();
        boolean participante = actual.getId().equals(proyecto.getPropietario().getId())
                || proyecto.getIntegrantes().stream().anyMatch(i -> i.correspondeA(actual));
        if (!participante) return null;

        Integrante responsable = tarea.getResponsable();
        if (responsable == null) return actual;
        if (responsable.getUsuario() != null) return responsable.getUsuario();
        String contacto = responsable.getContacto();
        return contacto == null ? null : usuarios.findByCorreoIgnoreCase(contacto.trim()).orElse(null);
    }
}
