package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.ProyectoMapper;
import com.studyflow.platform.model.dto.PeticionIntegrante;
import com.studyflow.platform.model.dto.PeticionProyecto;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.ProyectoDTO;
import com.studyflow.platform.model.entity.Canal;
import com.studyflow.platform.model.entity.Etapa;
import com.studyflow.platform.model.entity.Integrante;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.model.enums.RolIntegrante;
import com.studyflow.platform.model.enums.TipoCanal;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import com.studyflow.platform.util.TextoUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

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
        Proyecto proyecto = new Proyecto();
        proyecto.setCodigo(generarCodigoUnico(peticion.nombre()));
        proyecto.setNombre(peticion.nombre());
        proyecto.setDescripcion(peticion.descripcion());
        proyecto.setFechaEntrega(peticion.fechaEntrega());
        proyecto.setEtapaActual(peticion.etapaInicial() != null ? peticion.etapaInicial() : "Planeación");
        proyecto.setColor(peticion.color() != null ? peticion.color() : COLORES[0]);
        proyecto.setPropietario(usuarioService.obtenerPorId(usuarioId));

        // El creador siempre queda como lider del equipo.
        proyecto.agregarIntegrante(new Integrante(
                proyecto.getPropietario().getNombreCompleto(),
                proyecto.getPropietario().getCorreo(),
                COLORES[0],
                RolIntegrante.LIDER));

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

        crearEtapasBase(proyecto);

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
    public void eliminar(String codigo) {
        proyectoRepository.delete(obtenerEntidadPorCodigo(codigo));
    }

    @Override
    @Transactional(readOnly = true)
    public int calcularProgreso(String codigo) {
        return proyectoMapper.calcularProgreso(obtenerEntidadPorCodigo(codigo));
    }

    /** Crea las etapas por defecto con las que se organiza el trabajo. */
    private void crearEtapasBase(Proyecto proyecto) {
        String[] nombres = {"Planeación", "Investigación", "Diseño", "Desarrollo", "Entrega"};
        for (int i = 0; i < nombres.length; i++) {
            proyecto.agregarEtapa(new Etapa(nombres[i], i + 1));
        }
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
}
