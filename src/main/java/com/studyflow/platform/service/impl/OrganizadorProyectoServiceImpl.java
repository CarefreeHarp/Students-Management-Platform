package com.studyflow.platform.service.impl;

import com.studyflow.platform.mapper.ProyectoMapper;
import com.studyflow.platform.model.dto.PeticionOrganizacion;
import com.studyflow.platform.model.dto.PlanOrganizadoDTO;
import com.studyflow.platform.model.dto.ProyectoDTO;
import com.studyflow.platform.model.dto.TareaPlanificadaDTO;
import com.studyflow.platform.model.entity.Integrante;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.service.ClienteIaConversacional;
import com.studyflow.platform.service.OrganizadorProyectoService;
import com.studyflow.platform.service.ProyectoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Organizador de proyectos.
 *
 * <p>A partir del numero de tareas que pide el estudiante reparte el trabajo en
 * fases y calcula la ventana de cada tarea repartiendo de forma uniforme los
 * dias disponibles hasta la entrega. Cada tarea recibe fecha de inicio, fecha
 * limite y una estimacion en dias.</p>
 *
 * <p>El texto explicativo lo produce {@link ClienteIaConversacional}, que hoy
 * funciona en modo simulado. El reparto de fechas es deterministico y no
 * depende del modelo, de modo que los plazos siguen siendo correctos tanto en
 * simulacion como con la API real conectada.</p>
 */
@Service
@Transactional
public class OrganizadorProyectoServiceImpl implements OrganizadorProyectoService {

    /** Fases por las que pasa un trabajo academico, en orden. */
    private static final List<String[]> FASES = List.of(
            new String[]{"Encuadre del problema", "Planeación",
                    "Delimitar el objetivo, el alcance y los entregables comprometidos."},
            new String[]{"Investigación y referentes", "Investigación",
                    "Reunir fuentes, casos similares y requisitos que condicionan la solución."},
            new String[]{"Análisis de la información", "Investigación",
                    "Ordenar los hallazgos y extraer las conclusiones que guiarán el diseño."},
            new String[]{"Propuesta de solución", "Diseño",
                    "Definir la solución y validarla con el equipo antes de construir."},
            new String[]{"Diseño detallado", "Diseño",
                    "Concretar la estructura, los componentes y los criterios de aceptación."},
            new String[]{"Construcción del primer avance", "Desarrollo",
                    "Implementar la versión inicial de lo diseñado."},
            new String[]{"Construcción del avance final", "Desarrollo",
                    "Completar los pendientes e integrar todas las partes."},
            new String[]{"Pruebas y correcciones", "Desarrollo",
                    "Revisar calidad, corregir observaciones y dejar el trabajo presentable."},
            new String[]{"Documentación", "Entrega",
                    "Redactar el informe y dejar registro del proceso seguido."},
            new String[]{"Preparación de la entrega", "Entrega",
                    "Consolidar documento, demo y presentación final."});

    private static final String INSTRUCCION = """
            Eres un asistente que organiza proyectos académicos universitarios.
            Explica en dos frases cómo se repartió el trabajo y qué debe vigilar el equipo.
            """;

    private final ProyectoRepository proyectoRepository;
    private final ProyectoService proyectoService;
    private final ProyectoMapper proyectoMapper;
    private final ClienteIaConversacional clienteIa;

    public OrganizadorProyectoServiceImpl(ProyectoRepository proyectoRepository,
                                          ProyectoService proyectoService,
                                          ProyectoMapper proyectoMapper,
                                          ClienteIaConversacional clienteIa) {
        this.proyectoRepository = proyectoRepository;
        this.proyectoService = proyectoService;
        this.proyectoMapper = proyectoMapper;
        this.clienteIa = clienteIa;
    }

    @Override
    public PlanOrganizadoDTO proponerPlan(PeticionOrganizacion peticion) {
        int cantidad = normalizarCantidad(peticion.numeroTareas());
        LocalDate inicio = LocalDate.now();
        LocalDate entrega = peticion.fechaEntrega() != null && peticion.fechaEntrega().isAfter(inicio)
                ? peticion.fechaEntrega()
                : inicio.plusWeeks(4);

        List<String> integrantes = peticion.integrantes() == null || peticion.integrantes().isEmpty()
                ? List.of()
                : peticion.integrantes();

        List<TareaPlanificadaDTO> tareas = repartir(cantidad, inicio, entrega, integrantes);
        int dias = (int) ChronoUnit.DAYS.between(inicio, entrega);

        // La explicación se pide al modelo solo cuando hay API real conectada.
        // El simulador está pensado para resumir conversaciones y describiría
        // el plan con un lenguaje que no corresponde, así que en ese caso se
        // usa un texto propio construido con los datos exactos del reparto.
        String resumen = clienteIa.estaConectada()
                ? clienteIa.completar(INSTRUCCION, contexto(peticion, cantidad, dias, tareas))
                : describir(cantidad, dias, entrega, integrantes, tareas);

        return new PlanOrganizadoDTO(resumen, clienteIa.getModelo(), cantidad, dias, tareas);
    }

    @Override
    public ProyectoDTO organizarProyecto(String codigoProyecto, int numeroTareas) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        List<String> integrantes = proyecto.getIntegrantes().stream().map(Integrante::getNombre).toList();

        PlanOrganizadoDTO plan = proponerPlan(new PeticionOrganizacion(
                proyecto.getNombre(),
                proyecto.getDescripcion(),
                proyecto.getFechaEntrega(),
                numeroTareas,
                integrantes));

        // Se conservan las tareas ya completadas: solo se reorganiza lo que queda por hacer.
        proyecto.getTareas().removeIf(tarea -> tarea.getEstado() != EstadoTarea.TERMINADA);

        int consecutivo = proyecto.getTareas().size() + 1;
        for (TareaPlanificadaDTO planificada : plan.tareas()) {
            Tarea tarea = new Tarea();
            tarea.setCodigo("%s-%d".formatted(proyecto.getCodigo(), consecutivo++));
            tarea.setTitulo(planificada.titulo());
            tarea.setDescripcion(planificada.descripcion());
            tarea.setFechaLimite(planificada.fechaLimite());
            tarea.setHoraLimite(LocalTime.of(9, 0));
            tarea.setEstado(EstadoTarea.SIN_EMPEZAR);
            tarea.setGeneradaPorIa(true);
            proyecto.getIntegrantes().stream()
                    .filter(integrante -> integrante.getNombre().equals(planificada.responsable()))
                    .findFirst()
                    .ifPresent(tarea::setResponsable);
            proyecto.getEtapas().stream()
                    .filter(etapa -> etapa.getNombre().equalsIgnoreCase(planificada.etapa()))
                    .findFirst()
                    .ifPresent(tarea::setEtapa);
            proyecto.agregarTarea(tarea);
        }
        return proyectoMapper.aDTO(proyectoRepository.save(proyecto));
    }

    /**
     * Reparte {@code cantidad} tareas entre hoy y la entrega.
     *
     * <p>El ultimo dia se reserva como margen, de modo que la ultima tarea no
     * vence el mismo dia de la entrega. Los responsables rotan por orden para
     * que la carga quede equilibrada.</p>
     */
    private List<TareaPlanificadaDTO> repartir(int cantidad, LocalDate inicio, LocalDate entrega,
                                               List<String> integrantes) {
        long diasTotales = Math.max(cantidad, ChronoUnit.DAYS.between(inicio, entrega) - 1);
        long ventana = Math.max(1, diasTotales / cantidad);

        List<TareaPlanificadaDTO> tareas = new ArrayList<>();
        LocalDate cursor = inicio;
        for (int i = 0; i < cantidad; i++) {
            String[] fase = FASES.get(i * FASES.size() / cantidad);
            LocalDate fin = cursor.plusDays(ventana);
            if (fin.isAfter(entrega)) {
                fin = entrega;
            }
            String responsable = integrantes.isEmpty() ? null : integrantes.get(i % integrantes.size());

            tareas.add(new TareaPlanificadaDTO(
                    i + 1,
                    cantidad > FASES.size() ? "%s (%d)".formatted(fase[0], i + 1) : fase[0],
                    fase[2],
                    fase[1],
                    responsable,
                    cursor,
                    fin,
                    (int) ventana));
            cursor = fin.plusDays(1);
            if (cursor.isAfter(entrega)) {
                cursor = entrega;
            }
        }
        return tareas;
    }

    /**
     * Explicacion del reparto construida con los datos reales del plan.
     * Se usa mientras la API de IA no este conectada.
     */
    private String describir(int cantidad, int dias, LocalDate entrega,
                             List<String> integrantes, List<TareaPlanificadaDTO> tareas) {
        int ventana = tareas.isEmpty() ? 0 : tareas.get(0).diasEstimados();
        long etapas = tareas.stream().map(TareaPlanificadaDTO::etapa).distinct().count();

        StringBuilder texto = new StringBuilder();
        texto.append("El trabajo se repartió en %d tareas a lo largo de %d días, hasta la entrega del %s. "
                .formatted(cantidad, dias, entrega));
        texto.append("Cada tarea dispone de unos %d días y el plan recorre %d etapas. "
                .formatted(ventana, etapas));
        if (integrantes.isEmpty()) {
            texto.append("Aún no hay integrantes asignados: añádelos para repartir la carga.");
        } else {
            texto.append("Las responsabilidades rotan entre %d integrantes para equilibrar la carga."
                    .formatted(integrantes.size()));
        }
        return texto.toString();
    }

    private int normalizarCantidad(Integer solicitadas) {
        if (solicitadas == null) {
            return 5;
        }
        return Math.max(1, Math.min(20, solicitadas));
    }

    /** Contexto que se entrega al modelo para que redacte la explicacion. */
    private String contexto(PeticionOrganizacion peticion, int cantidad, int dias,
                            List<TareaPlanificadaDTO> tareas) {
        StringBuilder texto = new StringBuilder();
        texto.append("Proyecto: ").append(peticion.nombreProyecto() != null ? peticion.nombreProyecto() : "sin nombre").append('\n');
        texto.append("Contexto: ").append(peticion.descripcion() != null ? peticion.descripcion() : "no indicado").append('\n');
        texto.append("Tareas solicitadas: ").append(cantidad).append('\n');
        texto.append("Días disponibles hasta la entrega: ").append(dias).append('\n');
        tareas.forEach(tarea -> texto.append("- ")
                .append(tarea.titulo())
                .append(" (").append(tarea.etapa()).append(") ")
                .append("del ").append(tarea.fechaInicio())
                .append(" al ").append(tarea.fechaLimite())
                .append('\n'));
        return texto.toString();
    }
}
