package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.ProyectoMapper;
import com.studyflow.platform.model.dto.DiagramaFasesDTO;
import com.studyflow.platform.model.dto.TareaFaseDTO;
import com.studyflow.platform.model.entity.Etapa;
import com.studyflow.platform.model.entity.Integrante;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.model.enums.RolIntegrante;
import com.studyflow.platform.repository.IntegranteRepository;
import com.studyflow.platform.repository.TareaRepository;
import com.studyflow.platform.service.FaseService;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Diagrama de fases y reparto voluntario de tareas.
 *
 * <p>Las dependencias forman un grafo dirigido. Antes de anadir una se
 * comprueba que no se cierre un ciclo, porque un ciclo dejaria a todas las
 * tareas implicadas bloqueadas para siempre.</p>
 */
@Service
@Transactional
public class FaseServiceImpl implements FaseService {

    private final TareaRepository tareaRepository;
    private final IntegranteRepository integranteRepository;
    private final ProyectoService proyectoService;
    private final UsuarioService usuarioService;
    private final ProyectoMapper proyectoMapper;

    public FaseServiceImpl(TareaRepository tareaRepository,
                           IntegranteRepository integranteRepository,
                           ProyectoService proyectoService,
                           UsuarioService usuarioService,
                           ProyectoMapper proyectoMapper) {
        this.tareaRepository = tareaRepository;
        this.integranteRepository = integranteRepository;
        this.proyectoService = proyectoService;
        this.usuarioService = usuarioService;
        this.proyectoMapper = proyectoMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public DiagramaFasesDTO diagrama(String codigoProyecto) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);

        List<DiagramaFasesDTO.FaseDTO> fases = proyecto.getEtapas().stream()
                .map(etapa -> new DiagramaFasesDTO.FaseDTO(
                        etapa.getNombre(),
                        etapa.getOrden(),
                        proyecto.getTareas().stream()
                                .filter(tarea -> tarea.getEtapa() != null
                                        && tarea.getEtapa().getId().equals(etapa.getId()))
                                .map(proyectoMapper::aFaseDTO)
                                .toList()))
                .toList();

        // Las tareas sin etapa asignada quedarían invisibles en el diagrama.
        List<TareaFaseDTO> sinEtapa = proyecto.getTareas().stream()
                .filter(tarea -> tarea.getEtapa() == null)
                .map(proyectoMapper::aFaseDTO)
                .toList();

        List<DiagramaFasesDTO.FaseDTO> todas = new ArrayList<>(fases);
        if (!sinEtapa.isEmpty()) {
            todas.add(new DiagramaFasesDTO.FaseDTO("Sin etapa", 99, sinEtapa));
        }

        return new DiagramaFasesDTO(
                proyecto.getCodigo(),
                proyecto.getNombre(),
                todas,
                disponiblesDe(proyecto));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TareaFaseDTO> disponibles(String codigoProyecto) {
        return disponiblesDe(proyectoService.obtenerEntidadPorCodigo(codigoProyecto));
    }

    @Override
    public TareaFaseDTO agregarDependencia(Long tareaId, Long dependeDeId) {
        if (tareaId.equals(dependeDeId)) {
            throw new IllegalArgumentException("Una tarea no puede depender de sí misma.");
        }
        Tarea tarea = obtener(tareaId);
        Tarea dependencia = obtener(dependeDeId);

        if (!tarea.getProyecto().getId().equals(dependencia.getProyecto().getId())) {
            throw new IllegalArgumentException("Las dos tareas deben pertenecer al mismo proyecto.");
        }
        if (creariaCiclo(dependencia, tareaId)) {
            throw new IllegalArgumentException(
                    "Esa dependencia crearía un ciclo: «%s» ya depende de «%s»."
                            .formatted(dependencia.getTitulo(), tarea.getTitulo()));
        }

        tarea.getDependencias().add(dependencia);
        return proyectoMapper.aFaseDTO(tarea);
    }

    @Override
    public TareaFaseDTO quitarDependencia(Long tareaId, Long dependeDeId) {
        Tarea tarea = obtener(tareaId);
        tarea.getDependencias().removeIf(dependencia -> dependencia.getId().equals(dependeDeId));
        return proyectoMapper.aFaseDTO(tarea);
    }

    @Override
    public TareaFaseDTO reclamar(Long tareaId, Long usuarioId) {
        Tarea tarea = obtener(tareaId);
        if (tarea.getResponsable() != null) {
            throw new IllegalArgumentException(
                    "«%s» ya la está haciendo %s.".formatted(tarea.getTitulo(), tarea.getResponsable().getNombre()));
        }
        if (!tarea.bloqueantes().isEmpty()) {
            String pendientes = String.join(", ", tarea.bloqueantes().stream().map(Tarea::getTitulo).toList());
            throw new IllegalArgumentException("Antes hay que terminar: " + pendientes);
        }

        Usuario usuario = usuarioService.obtenerPorId(usuarioId);
        Integrante integrante = integranteDe(tarea.getProyecto(), usuario);
        tarea.setResponsable(integrante);
        // Tomar una tarea implica empezarla: evita tener que cambiar el estado aparte.
        if (tarea.getEstado() == EstadoTarea.SIN_EMPEZAR) {
            tarea.setEstado(EstadoTarea.EN_PROCESO);
        }
        return proyectoMapper.aFaseDTO(tarea);
    }

    @Override
    public TareaFaseDTO liberar(Long tareaId) {
        Tarea tarea = obtener(tareaId);
        tarea.setResponsable(null);
        tarea.setEstado(EstadoTarea.SIN_EMPEZAR);
        return proyectoMapper.aFaseDTO(tarea);
    }

    @Override
    public TareaFaseDTO cambiarEstado(Long tareaId, String estado) {
        Tarea tarea = obtener(tareaId);
        EstadoTarea nuevo = EstadoTarea.desdeClave(estado);
        tarea.setEstado(nuevo);
        tarea.setFechaCompletada(nuevo == EstadoTarea.TERMINADA ? LocalDateTime.now() : null);
        return proyectoMapper.aFaseDTO(tarea);
    }

    // ---------------------------------------------------------------- apoyo

    private List<TareaFaseDTO> disponiblesDe(Proyecto proyecto) {
        return proyecto.getTareas().stream()
                .filter(Tarea::estaDisponible)
                .map(proyectoMapper::aFaseDTO)
                .toList();
    }

    private Tarea obtener(Long id) {
        return tareaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("tarea", id));
    }

    /**
     * Recorre el grafo de dependencias en profundidad buscando si {@code objetivo}
     * es alcanzable desde {@code origen}. Si lo es, anadir la arista cerraria un ciclo.
     */
    private boolean creariaCiclo(Tarea origen, Long objetivo) {
        Set<Long> visitados = new HashSet<>();
        return alcanza(origen, objetivo, visitados);
    }

    private boolean alcanza(Tarea actual, Long objetivo, Set<Long> visitados) {
        if (actual.getId().equals(objetivo)) {
            return true;
        }
        if (!visitados.add(actual.getId())) {
            return false;
        }
        return actual.getDependencias().stream()
                .anyMatch(dependencia -> alcanza(dependencia, objetivo, visitados));
    }

    /** Busca al usuario entre los integrantes; si no está, lo añade al equipo. */
    private Integrante integranteDe(Proyecto proyecto, Usuario usuario) {
        return proyecto.getIntegrantes().stream()
                .filter(integrante -> (integrante.getUsuario() != null
                        && integrante.getUsuario().getId().equals(usuario.getId()))
                        || integrante.getNombre().equalsIgnoreCase(usuario.getNombreCompleto()))
                .findFirst()
                .orElseGet(() -> {
                    Integrante nuevo = new Integrante(
                            usuario.getNombreCompleto(), usuario.getCorreo(), "#5b91b4", RolIntegrante.COLABORADOR);
                    nuevo.setUsuario(usuario);
                    proyecto.agregarIntegrante(nuevo);
                    // Hay que guardarlo antes de asignarlo a la tarea: si no, al
                    // volcar la tarea Hibernate encuentra una referencia a una
                    // entidad todavía sin persistir y aborta la operación.
                    return integranteRepository.save(nuevo);
                });
    }
}
