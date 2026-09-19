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
import com.studyflow.platform.model.enums.ModoReparto;
import com.studyflow.platform.model.enums.RolIntegrante;
import com.studyflow.platform.repository.IntegranteRepository;
import com.studyflow.platform.repository.TareaRepository;
import com.studyflow.platform.service.FaseService;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalDate;
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
                        etapa.getId(),
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
            todas.add(new DiagramaFasesDTO.FaseDTO(null, "Sin etapa", 99, sinEtapa));
        }

        return new DiagramaFasesDTO(
                proyecto.getCodigo(),
                proyecto.getNombre(),
                todas,
                disponiblesDe(proyecto),
                proyecto.getModoReparto().getClave(),
                proyecto.getPropietario().getId().equals(usuarioService.obtenerActual().getId()),
                proyecto.getPropietario().getId().equals(usuarioService.obtenerActual().getId()));
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
        LocalDate fechaTarea = tarea.getFechaLimite();
        LocalDate fechaDependencia = dependencia.getFechaLimite();
        if (fechaTarea != null && fechaDependencia != null && fechaDependencia.isAfter(fechaTarea)) {
            throw new IllegalArgumentException(
                    ("Verifica las fechas: «%s» vence el %s, después de «%s» (%s). "
                            + "Una dependencia debe vencer antes o el mismo día que la tarea que espera.")
                            .formatted(dependencia.getTitulo(), fechaDependencia, tarea.getTitulo(), fechaTarea));
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
        Tarea tarea = obtenerParaReparto(tareaId);
        Usuario usuario = usuarioService.obtenerPorId(usuarioId);
        Integrante integrante = integranteDe(tarea.getProyecto(), usuario);
        exigirRepartoLibre(tarea.getProyecto());
        if (tarea.getResponsable() != null) {
            throw new IllegalArgumentException(
                    "«%s» ya la está haciendo %s.".formatted(tarea.getTitulo(), tarea.getResponsable().getNombre()));
        }
        if (!tarea.getEstado().estaAbierta()) {
            throw new IllegalArgumentException("Una tarea terminada no está disponible para tomarla.");
        }
        if (!tarea.bloqueantes().isEmpty()) {
            String pendientes = String.join(", ", tarea.bloqueantes().stream().map(Tarea::getTitulo).toList());
            throw new IllegalArgumentException("Antes hay que terminar: " + pendientes);
        }

        tarea.setResponsable(integrante);
        // Tomar una tarea implica empezarla: evita tener que cambiar el estado aparte.
        if (tarea.getEstado() == EstadoTarea.SIN_EMPEZAR) {
            tarea.setEstado(EstadoTarea.EN_PROCESO);
        }
        return proyectoMapper.aFaseDTO(tarea);
    }

    @Override
    public TareaFaseDTO liberar(Long tareaId) {
        Tarea tarea = obtenerParaReparto(tareaId);
        Usuario usuario = usuarioService.obtenerActual();
        exigirRepartoLibre(tarea.getProyecto());
        boolean propietario = tarea.getProyecto().getPropietario().getId().equals(usuario.getId());
        if (!propietario && (tarea.getResponsable() == null || !correspondeA(tarea.getResponsable(), usuario))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo el responsable o quien creó el proyecto puede liberar esta tarea.");
        }
        tarea.setResponsable(null);
        tarea.setEstado(EstadoTarea.SIN_EMPEZAR);
        tarea.setFechaCompletada(null);
        return proyectoMapper.aFaseDTO(tarea);
    }

    @Override
    public TareaFaseDTO cambiarEstado(Long tareaId, String estado) {
        Tarea tarea = obtener(tareaId);
        EstadoTarea nuevo = EstadoTarea.desdeClave(estado);
        if (nuevo == EstadoTarea.TERMINADA && !tarea.tieneResultado()) {
            throw new IllegalArgumentException("Para terminar una tarea debes registrar un resultado escrito o adjuntar un archivo.");
        }
        tarea.setEstado(nuevo);
        tarea.setFechaCompletada(nuevo == EstadoTarea.TERMINADA ? LocalDateTime.now() : null);
        return proyectoMapper.aFaseDTO(tarea);
    }

    // ---------------------------------------------------------------- apoyo

    private List<TareaFaseDTO> disponiblesDe(Proyecto proyecto) {
        if (proyecto.getModoReparto() != ModoReparto.LIBRE) {
            return List.of();
        }
        return proyecto.getTareas().stream()
                .filter(Tarea::estaDisponible)
                .map(proyectoMapper::aFaseDTO)
                .toList();
    }

    private Tarea obtener(Long id) {
        return tareaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("tarea", id));
    }

    private Tarea obtenerParaReparto(Long id) {
        return tareaRepository.findParaRepartoById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("tarea", id));
    }

    private void exigirRepartoLibre(Proyecto proyecto) {
        if (proyecto.getModoReparto() != ModoReparto.LIBRE) {
            throw new IllegalArgumentException("Este proyecto usa tareas asignadas. Activa el reparto libre para tomarlas.");
        }
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

    /** Match a real membership, never a display name supplied by an outsider. */
    private Integrante integranteDe(Proyecto proyecto, Usuario usuario) {
        return proyecto.getIntegrantes().stream()
                .filter(integrante -> correspondeA(integrante, usuario))
                .findFirst()
                .map(integrante -> {
                    // Contact-only invitations become linked when the member takes work.
                    if (integrante.getUsuario() == null) integrante.setUsuario(usuario);
                    return integrante;
                })
                .orElseGet(() -> {
                    // Repair an old owner membership only; never enroll strangers implicitly.
                    if (!proyecto.getPropietario().getId().equals(usuario.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                "Debes formar parte del equipo para tomar una tarea.");
                    }
                    Integrante nuevo = new Integrante(
                            usuario.getNombreCompleto(), usuario.getCorreo(), "#5b91b4", RolIntegrante.LIDER);
                    nuevo.setUsuario(usuario);
                    proyecto.agregarIntegrante(nuevo);
                    // Hay que guardarlo antes de asignarlo a la tarea: si no, al
                    // volcar la tarea Hibernate encuentra una referencia a una
                    // entidad todavía sin persistir y aborta la operación.
                    return integranteRepository.save(nuevo);
                });
    }

    private boolean correspondeA(Integrante integrante, Usuario usuario) {
        if (integrante.getUsuario() != null) {
            return integrante.getUsuario().getId().equals(usuario.getId());
        }
        return integrante.getContacto() != null && usuario.getCorreo() != null
                && integrante.getContacto().trim().equalsIgnoreCase(usuario.getCorreo());
    }
}
