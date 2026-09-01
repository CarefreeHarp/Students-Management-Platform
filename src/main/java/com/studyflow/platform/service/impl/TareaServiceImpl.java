package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.ProyectoMapper;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.TareaDTO;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.RegistroAvance;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.repository.RegistroAvanceRepository;
import com.studyflow.platform.repository.TareaRepository;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.TareaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Implementacion del seguimiento de tareas. */
@Service
@Transactional
public class TareaServiceImpl implements TareaService {

    private final TareaRepository tareaRepository;
    private final RegistroAvanceRepository registroRepository;
    private final ProyectoService proyectoService;
    private final ProyectoMapper proyectoMapper;

    public TareaServiceImpl(TareaRepository tareaRepository,
                            RegistroAvanceRepository registroRepository,
                            ProyectoService proyectoService,
                            ProyectoMapper proyectoMapper) {
        this.tareaRepository = tareaRepository;
        this.registroRepository = registroRepository;
        this.proyectoService = proyectoService;
        this.proyectoMapper = proyectoMapper;
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
    public TareaDTO marcarCompletada(Long tareaId, String nota) {
        Tarea tarea = obtener(tareaId);
        tarea.setEstado(EstadoTarea.COMPLETADA);
        tarea.setFechaCompletada(LocalDateTime.now());
        if (nota != null && !nota.isBlank()) {
            registroRepository.save(new RegistroAvance(
                    tarea.getProyecto(), tarea, "Avance en " + tarea.getTitulo(), nota.trim()));
        }
        return proyectoMapper.aDTO(tarea);
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
        tarea.setTitulo(peticion.titulo().trim());
        tarea.setDescripcion(peticion.descripcion());
        tarea.setFechaLimite(peticion.fechaLimite());
        tarea.setHoraLimite(peticion.horaLimite() != null && !peticion.horaLimite().isBlank()
                ? LocalTime.parse(peticion.horaLimite())
                : LocalTime.of(9, 0));
        tarea.setEstado(EstadoTarea.desdeClave(peticion.estado()));
        if (tarea.getEstado() == EstadoTarea.COMPLETADA && tarea.getFechaCompletada() == null) {
            tarea.setFechaCompletada(LocalDateTime.now());
        }
        proyecto.getIntegrantes().stream()
                .filter(integrante -> integrante.getNombre().equalsIgnoreCase(String.valueOf(peticion.responsable())))
                .findFirst()
                .ifPresent(tarea::setResponsable);
        proyecto.getEtapas().stream()
                .filter(etapa -> etapa.getNombre().equalsIgnoreCase(String.valueOf(peticion.etapa())))
                .findFirst()
                .ifPresent(tarea::setEtapa);
    }
}
