package com.studyflow.platform.mapper;

import com.studyflow.platform.model.dto.EntregableDTO;
import com.studyflow.platform.model.dto.IntegranteDTO;
import com.studyflow.platform.model.dto.ProyectoDTO;
import com.studyflow.platform.model.dto.TareaDTO;
import com.studyflow.platform.model.dto.TareaFaseDTO;
import com.studyflow.platform.model.entity.Entregable;
import com.studyflow.platform.model.entity.Integrante;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Traduce entidades del Modelo a DTO para la Vista y la API.
 * Aisla la interfaz de los cambios internos del modelo de datos.
 */
@Component
public class ProyectoMapper {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public ProyectoDTO aDTO(Proyecto proyecto) {
        return new ProyectoDTO(
                proyecto.getId(),
                proyecto.getCodigo(),
                proyecto.getNombre(),
                proyecto.getDescripcion(),
                proyecto.getFechaEntrega(),
                proyecto.getColor(),
                proyecto.getEtapaActual(),
                calcularProgreso(proyecto),
                proyecto.getIntegrantes().stream().map(this::aDTO).toList(),
                proyecto.getTareas().stream().map(this::aDTO).toList()
        );
    }

    public IntegranteDTO aDTO(Integrante integrante) {
        return new IntegranteDTO(
                integrante.getId(),
                integrante.getNombre(),
                integrante.getContacto(),
                integrante.getIniciales(),
                integrante.getColor(),
                integrante.getRol().name()
        );
    }

    public TareaDTO aDTO(Tarea tarea) {
        Integrante responsable = tarea.getResponsable();
        return new TareaDTO(
                tarea.getId(),
                tarea.getCodigo(),
                tarea.getTitulo(),
                tarea.getDescripcion(),
                responsable != null ? responsable.getNombre() : null,
                responsable != null ? responsable.getColor() : null,
                tarea.getEtapa() != null ? tarea.getEtapa().getNombre() : null,
                tarea.getFechaLimite(),
                tarea.getHoraLimite() != null ? tarea.getHoraLimite().format(HORA) : null,
                tarea.getEstado().getClave(),
                tarea.getEstado().getEtiqueta(),
                tarea.isGeneradaPorIa()
        );
    }

    public List<ProyectoDTO> aDTO(List<Proyecto> proyectos) {
        return proyectos.stream().map(this::aDTO).toList();
    }

    /** Tarea vista desde el diagrama de fases, con dependencias y bloqueos. */
    public TareaFaseDTO aFaseDTO(Tarea tarea) {
        Integrante responsable = tarea.getResponsable();
        return new TareaFaseDTO(
                tarea.getId(),
                tarea.getTitulo(),
                tarea.getDescripcion(),
                tarea.getEtapa() != null ? tarea.getEtapa().getNombre() : "Sin etapa",
                tarea.getEtapa() != null ? tarea.getEtapa().getOrden() : 99,
                tarea.getEstado().getClave(),
                tarea.getEstado().getEtiqueta(),
                responsable != null ? responsable.getNombre() : null,
                responsable != null ? responsable.getColor() : null,
                tarea.getFechaLimite(),
                tarea.getDependencias().stream().map(Tarea::getId).toList(),
                tarea.bloqueantes().stream().map(Tarea::getTitulo).toList(),
                tarea.estaDisponible()
        );
    }

    public EntregableDTO aDTO(Entregable entregable) {
        Integrante responsable = entregable.getResponsable();
        return new EntregableDTO(
                entregable.getId(),
                entregable.getNombre(),
                entregable.getDescripcion(),
                entregable.getUrl(),
                entregable.getTipo().name(),
                entregable.getTipo().getEtiqueta(),
                entregable.getTipo().getIcono(),
                entregable.getEstado().name(),
                entregable.getEstado().getEtiqueta(),
                responsable != null ? responsable.getNombre() : null,
                responsable != null ? responsable.getColor() : null,
                entregable.getTarea() != null ? entregable.getTarea().getTitulo() : null,
                entregable.getFechaRegistro().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
        );
    }

    /** Porcentaje de tareas completadas; alimenta las barras de progreso. */
    public int calcularProgreso(Proyecto proyecto) {
        List<Tarea> tareas = proyecto.getTareas();
        if (tareas.isEmpty()) {
            return 0;
        }
        long completadas = tareas.stream().filter(t -> t.getEstado() == EstadoTarea.TERMINADA).count();
        return (int) Math.round(completadas * 100.0 / tareas.size());
    }
}
