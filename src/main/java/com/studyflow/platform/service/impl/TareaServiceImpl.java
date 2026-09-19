package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.exception.CampoInvalidoException;
import com.studyflow.platform.mapper.ProyectoMapper;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.TareaDTO;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.ArchivoTarea;
import com.studyflow.platform.model.entity.Etapa;
import com.studyflow.platform.model.entity.RegistroAvance;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.repository.RegistroAvanceRepository;
import com.studyflow.platform.repository.TareaRepository;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.TareaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/** Implementacion del seguimiento de tareas. */
@Service
@Transactional
public class TareaServiceImpl implements TareaService {

    private static final DateTimeFormatter FECHA_CORTA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TareaRepository tareaRepository;
    private final RegistroAvanceRepository registroRepository;
    private final ProyectoService proyectoService;
    private final ProyectoMapper proyectoMapper;
    private final Path carpetaResultados;

    public TareaServiceImpl(TareaRepository tareaRepository,
                            RegistroAvanceRepository registroRepository,
                            ProyectoService proyectoService,
                            ProyectoMapper proyectoMapper,
                            @Value("${studyflow.archivos.ruta:archivos}") String rutaArchivos) {
        this.tareaRepository = tareaRepository;
        this.registroRepository = registroRepository;
        this.proyectoService = proyectoService;
        this.proyectoMapper = proyectoMapper;
        this.carpetaResultados = Paths.get(rutaArchivos).toAbsolutePath().normalize().resolve("resultados-tareas");
    }

    @Override
    @Transactional(readOnly = true)
    public List<TareaDTO> listarPorProyecto(String codigoProyecto) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        return tareaRepository.findByProyectoIdOrderByFechaLimiteAsc(proyecto.getId())
                .stream().map(proyectoMapper::aDTO).toList();
    }

    @Override
    public TareaDTO crear(String codigoProyecto, PeticionTarea peticion) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        Tarea tarea = new Tarea();
        tarea.setProyecto(proyecto);
        tarea.setCodigo("%s-%d".formatted(proyecto.getCodigo(), proyecto.getTareas().size() + 1));
        aplicar(tarea, peticion, proyecto);
        proyecto.getTareas().add(tarea);
        return proyectoMapper.aDTO(tareaRepository.save(tarea));
    }

    @Override
    public TareaDTO actualizar(Long tareaId, PeticionTarea peticion) {
        Tarea tarea = obtener(tareaId);
        aplicar(tarea, peticion, tarea.getProyecto());
        return proyectoMapper.aDTO(tarea);
    }

    @Override
    public TareaDTO marcarCompletada(Long tareaId, String resultado, MultipartFile archivo) {
        Tarea tarea = obtener(tareaId);
        String texto = resultado == null ? "" : resultado.trim();
        if (texto.isBlank() && (archivo == null || archivo.isEmpty()) && !tarea.tieneResultado()) {
            throw new IllegalArgumentException("Para terminar una tarea debes registrar un resultado escrito o adjuntar un archivo.");
        }
        if (!texto.isBlank()) {
            tarea.setResultadoTexto(texto);
            registroRepository.save(new RegistroAvance(
                    tarea.getProyecto(), tarea, "Resultado de " + tarea.getTitulo(), texto));
        }
        if (archivo != null && !archivo.isEmpty()) {
            tarea.getArchivos().add(guardarArchivo(tarea, archivo));
        }
        tarea.setEstado(EstadoTarea.TERMINADA);
        tarea.setFechaCompletada(LocalDateTime.now());
        return proyectoMapper.aDTO(tarea);
    }

    @Override
    @Transactional(readOnly = true)
    public ArchivoTarea archivoResultado(Long tareaId) {
        Tarea tarea = obtener(tareaId);
        if (tarea.getArchivos().isEmpty()) {
            throw new RecursoNoEncontradoException("archivo de resultado", tareaId);
        }
        return tarea.getArchivos().get(tarea.getArchivos().size() - 1);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource contenidoResultado(Long tareaId) {
        ArchivoTarea archivo = archivoResultado(tareaId);
        Path ruta = carpetaResultados.resolve(archivo.getRuta()).normalize();
        if (!ruta.startsWith(carpetaResultados) || !Files.exists(ruta)) {
            throw new RecursoNoEncontradoException("archivo de resultado", archivo.getNombre());
        }
        return new FileSystemResource(ruta);
    }

    @Override
    public void eliminar(Long tareaId) {
        tareaRepository.delete(obtener(tareaId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TareaDTO> agendaEntre(LocalDate desde, LocalDate hasta) {
        return tareaRepository.findByFechaLimiteBetweenOrderByFechaLimiteAscHoraLimiteAsc(desde, hasta)
                .stream().map(proyectoMapper::aDTO).toList();
    }

    private Tarea obtener(Long id) {
        return tareaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("tarea", id));
    }

    /** Vuelca los datos del formulario sobre la entidad, resolviendo responsable y etapa. */
    private void aplicar(Tarea tarea, PeticionTarea peticion, Proyecto proyecto) {
        validarFechaContraEntrega(proyecto, peticion.fechaLimite());
        validarFechaContraDependencias(tarea, peticion.fechaLimite());
        tarea.setTitulo(peticion.titulo().trim());
        tarea.setDescripcion(peticion.descripcion());
        tarea.setFechaLimite(peticion.fechaLimite());
        tarea.setHoraLimite(peticion.horaLimite() != null && !peticion.horaLimite().isBlank()
                ? LocalTime.parse(peticion.horaLimite())
                : LocalTime.of(9, 0));
        EstadoTarea estadoPropuesto = EstadoTarea.desdeClave(peticion.estado());
        if (estadoPropuesto == EstadoTarea.TERMINADA && !tarea.tieneResultado()) {
            throw new IllegalArgumentException("Para terminar una tarea debes registrar un resultado escrito o adjuntar un archivo.");
        }
        tarea.setEstado(estadoPropuesto);
        if (tarea.getEstado() == EstadoTarea.TERMINADA && tarea.getFechaCompletada() == null) {
            tarea.setFechaCompletada(LocalDateTime.now());
        }
        if (peticion.responsable() == null || peticion.responsable().isBlank()) {
            tarea.setResponsable(null);
        } else {
            tarea.setResponsable(proyecto.getIntegrantes().stream()
                    .filter(integrante -> integrante.getNombre().equalsIgnoreCase(peticion.responsable().trim()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("El responsable elegido no pertenece al proyecto.")));
        }
        String nombreEtapa = peticion.etapa() == null || peticion.etapa().isBlank()
                ? (tarea.getEtapa() != null ? tarea.getEtapa().getNombre() : proyecto.getEtapaActual())
                : peticion.etapa().trim();
        Etapa etapa = proyecto.getEtapas().stream()
                .filter(candidata -> candidata.getNombre().equalsIgnoreCase(nombreEtapa))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("La etapa elegida no pertenece a este proyecto."));
        tarea.setEtapa(etapa);
    }

    /** Una tarea no puede extender el plan más allá de la entrega final del proyecto. */
    private void validarFechaContraEntrega(Proyecto proyecto, LocalDate fechaPropuesta) {
        if (fechaPropuesta != null && proyecto.getFechaEntrega() != null
                && fechaPropuesta.isAfter(proyecto.getFechaEntrega())) {
            throw new CampoInvalidoException("fechaLimite",
                    "La fecha límite de la tarea no puede ser posterior a la fecha de entrega del proyecto (%s)."
                            .formatted(proyecto.getFechaEntrega().format(FECHA_CORTA)));
        }
    }

    /** Evita que al editar una fecha se rompa un orden de dependencias ya creado. */
    private void validarFechaContraDependencias(Tarea tarea, LocalDate fechaPropuesta) {
        if (fechaPropuesta == null) return;
        Tarea dependenciaTardia = tarea.getDependencias().stream()
                .filter(dependencia -> dependencia.getFechaLimite() != null
                        && dependencia.getFechaLimite().isAfter(fechaPropuesta))
                .findFirst().orElse(null);
        if (dependenciaTardia != null) {
            throw new IllegalArgumentException(("Verifica las fechas: «%s» vence después de esta tarea. "
                    + "Una dependencia debe vencer antes o el mismo día que la tarea que espera.")
                    .formatted(dependenciaTardia.getTitulo()));
        }
        Tarea tareaQueEspera = tarea.getProyecto().getTareas().stream()
                .filter(candidata -> candidata.getDependencias().contains(tarea))
                .filter(candidata -> candidata.getFechaLimite() != null
                        && fechaPropuesta.isAfter(candidata.getFechaLimite()))
                .findFirst().orElse(null);
        if (tareaQueEspera != null) {
            throw new IllegalArgumentException(("Verifica las fechas: «%s» espera a esta tarea y vence antes. "
                    + "Una dependencia debe vencer antes o el mismo día que la tarea que espera.")
                    .formatted(tareaQueEspera.getTitulo()));
        }
    }

    private ArchivoTarea guardarArchivo(Tarea tarea, MultipartFile archivo) {
        if (archivo.getSize() > 10L * 1024 * 1024) {
            throw new IllegalArgumentException("El archivo de resultado supera el máximo de 10 MB.");
        }
        String nombre = limpiarNombre(archivo.getOriginalFilename());
        String almacenado = UUID.randomUUID() + extension(nombre);
        try {
            Files.createDirectories(carpetaResultados);
            Path destino = carpetaResultados.resolve(almacenado).normalize();
            if (!destino.startsWith(carpetaResultados)) {
                throw new IllegalArgumentException("Ruta de archivo no válida.");
            }
            try (var entrada = archivo.getInputStream()) {
                Files.copy(entrada, destino, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException error) {
            throw new IllegalArgumentException("No se pudo guardar el archivo de resultado: " + error.getMessage());
        }
        ArchivoTarea adjunto = new ArchivoTarea();
        adjunto.setTarea(tarea);
        adjunto.setNombre(nombre);
        adjunto.setRuta(almacenado);
        adjunto.setTipoMime(archivo.getContentType());
        adjunto.setTamanoBytes(archivo.getSize());
        return adjunto;
    }

    private String limpiarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) return "resultado";
        String limpio = Paths.get(nombre).getFileName().toString();
        return limpio.length() > 180 ? limpio.substring(limpio.length() - 180) : limpio;
    }

    private String extension(String nombre) {
        int punto = nombre.lastIndexOf('.');
        return punto > 0 && punto < nombre.length() - 1 ? nombre.substring(punto) : "";
    }
}
