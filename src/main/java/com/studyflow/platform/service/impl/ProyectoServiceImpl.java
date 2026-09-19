package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.exception.CampoInvalidoException;
import com.studyflow.platform.mapper.ProyectoMapper;
import com.studyflow.platform.model.dto.PeticionIntegrante;
import com.studyflow.platform.model.dto.PeticionFase;
import com.studyflow.platform.model.dto.PeticionFases;
import com.studyflow.platform.model.dto.PeticionProyecto;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.ProyectoDTO;
import com.studyflow.platform.model.entity.Canal;
import com.studyflow.platform.model.entity.Etapa;
import com.studyflow.platform.model.entity.Integrante;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.model.enums.ModoReparto;
import com.studyflow.platform.model.enums.RolIntegrante;
import com.studyflow.platform.model.enums.TipoCanal;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import com.studyflow.platform.util.TextoUtil;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Implementacion de la gestion de proyectos academicos. */
@Service
@Transactional
public class ProyectoServiceImpl implements ProyectoService {

    /** Paleta usada para distinguir proyectos e integrantes en los calendarios. */
    private static final String[] COLORES = {"#5b5ce2", "#19a7bd", "#ee8a54", "#36aa8a", "#d7639d", "#5b91b4"};

    private final ProyectoRepository proyectoRepository;
    private final UsuarioService usuarioService;
    private final ProyectoMapper proyectoMapper;

    public ProyectoServiceImpl(ProyectoRepository proyectoRepository,
                               UsuarioService usuarioService,
                               ProyectoMapper proyectoMapper) {
        this.proyectoRepository = proyectoRepository;
        this.usuarioService = usuarioService;
        this.proyectoMapper = proyectoMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProyectoDTO> listarDeUsuario(Long usuarioId) {
        return proyectoMapper.aDTO(proyectoRepository.findParticipaUsuario(usuarioId));
    }

    @Override
    @Transactional(readOnly = true)
    public ProyectoDTO obtenerPorCodigo(String codigo) {
        return proyectoMapper.aDTO(obtenerEntidadPorCodigo(codigo));
    }

    @Override
    @Transactional(readOnly = true)
    public Proyecto obtenerEntidadPorCodigo(String codigo) {
        return proyectoRepository.findByCodigo(codigo)
                .orElseThrow(() -> new RecursoNoEncontradoException("proyecto", codigo));
    }

    @Override
    public ProyectoDTO crear(PeticionProyecto peticion, Long usuarioId) {
        if (peticion.fechaEntrega() != null && !peticion.fechaEntrega().isAfter(LocalDate.now())) {
            throw new CampoInvalidoException("fechaEntrega",
                    "La fecha de entrega debe ser posterior a la fecha actual.");
        }
        if (peticion.modoReparto() == null || peticion.modoReparto().isBlank()) {
            throw new CampoInvalidoException("modoReparto", "Elige cómo se repartirán las tareas.");
        }
        Proyecto proyecto = new Proyecto();
        proyecto.setCodigo(generarCodigoUnico(peticion.nombre()));
        proyecto.setNombre(peticion.nombre());
        proyecto.setDescripcion(peticion.descripcion());
        proyecto.setFechaEntrega(peticion.fechaEntrega());
        proyecto.setColor(peticion.color() != null ? peticion.color() : COLORES[0]);
        proyecto.setPropietario(usuarioService.obtenerPorId(usuarioId));
        proyecto.setModoReparto(ModoReparto.desdeClave(peticion.modoReparto()));

        // El creador siempre queda como lider del equipo.
        Integrante creador = new Integrante(
                proyecto.getPropietario().getNombreCompleto(),
                proyecto.getPropietario().getCorreo(),
                COLORES[0],
                RolIntegrante.LIDER);
        creador.setUsuario(proyecto.getPropietario());
        proyecto.agregarIntegrante(creador);

        if (peticion.integrantes() != null) {
            int indice = 1;
            for (PeticionIntegrante entrada : peticion.integrantes()) {
                if (entrada.nombre() == null || entrada.nombre().isBlank()) {
                    continue;
                }
                String color = entrada.color() != null ? entrada.color() : COLORES[indice % COLORES.length];
                proyecto.agregarIntegrante(new Integrante(
                        entrada.nombre().trim(), entrada.contacto(), color, RolIntegrante.COLABORADOR));
                indice++;
            }
        }

        List<String> etapas = crearEtapas(proyecto, peticion.etapas());
        proyecto.setEtapaActual(etapas.get(0));

        if (peticion.tareas() != null) {
            int numero = 1;
            for (PeticionTarea entrada : peticion.tareas()) {
                if (entrada.titulo() == null || entrada.titulo().isBlank()) {
                    continue;
                }
                proyecto.agregarTarea(construirTarea(proyecto, entrada, numero++));
            }
        }

        crearCanalGeneral(proyecto);

        return proyectoMapper.aDTO(proyectoRepository.save(proyecto));
    }

    /**
     * Abre el canal #general del proyecto.
     *
     * <p>Todo proyecto nace con el, igual que los de ejemplo: es el sitio por
     * defecto para hablar antes de que existan canales por tarea. Se crea aqui
     * y no en CanalService porque el canal forma parte del proyecto recien
     * creado, no de una peticion posterior del usuario.</p>
     */
    private void crearCanalGeneral(Proyecto proyecto) {
        Canal general = new Canal(Canal.NOMBRE_GENERAL, TipoCanal.GENERAL, 0);
        general.setSlug(Canal.NOMBRE_GENERAL);
        general.setDescripcion("Coordinación general de " + proyecto.getNombre());
        general.setCreador(proyecto.getPropietario());
        proyecto.agregarCanal(general);
    }

    @Override
    public ProyectoDTO actualizarIntegrantes(String codigo, List<PeticionIntegrante> integrantes) {
        Proyecto proyecto = obtenerEntidadPorCodigo(codigo);
        proyecto.getIntegrantes().removeIf(integrante -> integrante.getRol() != RolIntegrante.LIDER);
        int indice = 1;
        for (PeticionIntegrante entrada : integrantes) {
            if (entrada.nombre() == null || entrada.nombre().isBlank()) {
                continue;
            }
            String color = entrada.color() != null ? entrada.color() : COLORES[indice % COLORES.length];
            proyecto.agregarIntegrante(new Integrante(
                    entrada.nombre().trim(), entrada.contacto(), color, RolIntegrante.COLABORADOR));
            indice++;
        }
        return proyectoMapper.aDTO(proyecto);
    }

    @Override
    public ProyectoDTO actualizarReparto(String codigo, String modoReparto, Long usuarioId) {
        Proyecto proyecto = obtenerEntidadPorCodigo(codigo);
        exigirPropietario(proyecto, usuarioId, "cambiar el reparto");
        if (modoReparto == null) {
            throw new IllegalArgumentException("Elige reparto asignado o libre.");
        }
        // Switching does not erase existing owners, progress or dependencies.
        proyecto.setModoReparto(ModoReparto.desdeClave(modoReparto));
        return proyectoMapper.aDTO(proyecto);
    }

    /**
     * Applies the phase editor as one transaction. Existing {@link Etapa}
     * entities are kept when their name changes, therefore their tasks keep
     * the same association. A phase containing tasks cannot be removed: the
     * person must move those tasks first, which prevents a task from silently
     * losing its phase.
     */
    @Override
    public ProyectoDTO actualizarFases(String codigo, PeticionFases peticion, Long usuarioId) {
        Proyecto proyecto = obtenerEntidadPorCodigo(codigo);
        exigirPropietario(proyecto, usuarioId, "gestionar las fases");
        if (peticion == null || peticion.fases() == null || peticion.fases().isEmpty()) {
            throw new IllegalArgumentException("El proyecto debe conservar al menos una fase.");
        }
        if (peticion.etapaActualIndice() == null
                || peticion.etapaActualIndice() < 0
                || peticion.etapaActualIndice() >= peticion.fases().size()) {
            throw new IllegalArgumentException("Elige una fase predeterminada válida para las tareas nuevas.");
        }

        Map<Long, Etapa> existentes = proyecto.getEtapas().stream()
                .collect(java.util.stream.Collectors.toMap(Etapa::getId, etapa -> etapa));
        Set<Long> idsSolicitados = new HashSet<>();
        Set<String> nombres = new HashSet<>();
        List<PlanFase> plan = new ArrayList<>();

        for (int indice = 0; indice < peticion.fases().size(); indice++) {
            PeticionFase entrada = peticion.fases().get(indice);
            if (entrada == null) {
                throw new IllegalArgumentException("Cada fase necesita un nombre.");
            }
            String nombre = nombreFase(entrada.nombre());
            if (!nombres.add(nombre.toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("No puede haber dos fases con el mismo nombre.");
            }

            Etapa etapa;
            if (entrada.id() == null) {
                etapa = new Etapa();
            } else {
                etapa = existentes.get(entrada.id());
                if (etapa == null) {
                    throw new IllegalArgumentException("La fase que intentas editar no pertenece a este proyecto.");
                }
                if (!idsSolicitados.add(etapa.getId())) {
                    throw new IllegalArgumentException("Una fase solo puede aparecer una vez en el orden.");
                }
            }
            plan.add(new PlanFase(etapa, nombre, indice + 1));
        }

        List<Etapa> eliminadas = proyecto.getEtapas().stream()
                .filter(etapa -> !idsSolicitados.contains(etapa.getId()))
                .toList();
        for (Etapa etapa : eliminadas) {
            long tareasEnFase = proyecto.getTareas().stream()
                    .filter(tarea -> tarea.getEtapa() != null && etapa.getId().equals(tarea.getEtapa().getId()))
                    .count();
            if (tareasEnFase > 0) {
                throw new IllegalArgumentException(("No puedes eliminar la fase «%s» porque tiene %d %s. "
                        + "Mueve esas tareas a otra fase antes de guardarla.")
                        .formatted(etapa.getNombre(), tareasEnFase, tareasEnFase == 1 ? "tarea" : "tareas"));
            }
        }

        plan.forEach(item -> {
            item.etapa().setNombre(item.nombre());
            item.etapa().setOrden(item.orden());
            if (item.etapa().getProyecto() == null) {
                proyecto.agregarEtapa(item.etapa());
            }
        });
        proyecto.getEtapas().removeAll(eliminadas);
        proyecto.getEtapas().sort(Comparator.comparing(Etapa::getOrden));
        proyecto.setEtapaActual(plan.get(peticion.etapaActualIndice()).etapa().getNombre());

        return proyectoMapper.aDTO(proyecto);
    }

    @Override
    public void eliminar(String codigo) {
        proyectoRepository.delete(obtenerEntidadPorCodigo(codigo));
    }

    @Override
    @Transactional(readOnly = true)
    public int calcularProgreso(String codigo) {
        return proyectoMapper.calcularProgreso(obtenerEntidadPorCodigo(codigo));
    }

    /** Crea únicamente las fases elegidas al iniciar el proyecto. */
    private List<String> crearEtapas(Proyecto proyecto, List<String> solicitadas) {
        List<String> nombres = new ArrayList<>();
        if (solicitadas != null) {
            for (String solicitada : solicitadas) {
                if (solicitada == null || solicitada.isBlank()) continue;
                String nombre = solicitada.trim();
                if (nombres.stream().noneMatch(existente -> existente.equalsIgnoreCase(nombre))) nombres.add(nombre);
            }
        }
        if (nombres.isEmpty()) nombres.add("Planeación");
        for (int i = 0; i < nombres.size(); i++) proyecto.agregarEtapa(new Etapa(nombres.get(i), i + 1));
        return nombres;
    }

    private Tarea construirTarea(Proyecto proyecto, PeticionTarea entrada, int numero) {
        Tarea tarea = new Tarea();
        tarea.setCodigo("%s-%d".formatted(TextoUtil.aSlug(proyecto.getNombre()), numero));
        tarea.setTitulo(entrada.titulo().trim());
        tarea.setDescripcion(entrada.descripcion());
        tarea.setFechaLimite(entrada.fechaLimite());
        tarea.setHoraLimite(entrada.horaLimite() != null ? LocalTime.parse(entrada.horaLimite()) : LocalTime.of(9, 0));
        tarea.setEstado(EstadoTarea.desdeClave(entrada.estado()));
        proyecto.getIntegrantes().stream()
                .filter(integrante -> integrante.getNombre().equalsIgnoreCase(String.valueOf(entrada.responsable())))
                .findFirst()
                .ifPresent(tarea::setResponsable);
        proyecto.getEtapas().stream()
                .filter(etapa -> etapa.getNombre().equalsIgnoreCase(String.valueOf(entrada.etapa())))
                .findFirst()
                .ifPresent(tarea::setEtapa);
        return tarea;
    }

    /** Genera un codigo legible y unico para la URL del proyecto. */
    private String generarCodigoUnico(String nombre) {
        String base = TextoUtil.aSlug(nombre);
        String candidato = base;
        int sufijo = 2;
        while (proyectoRepository.existsByCodigo(candidato)) {
            candidato = base + "-" + sufijo++;
        }
        return candidato;
    }

    private void exigirPropietario(Proyecto proyecto, Long usuarioId, String accion) {
        if (!proyecto.getPropietario().getId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo quien creó el proyecto puede " + accion + ".");
        }
    }

    private String nombreFase(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("Cada fase necesita un nombre.");
        }
        String limpio = nombre.trim();
        if (limpio.length() > 60) {
            throw new IllegalArgumentException("El nombre de una fase no puede superar 60 caracteres.");
        }
        return limpio;
    }

    private record PlanFase(Etapa etapa, String nombre, int orden) {
    }
}
