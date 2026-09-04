package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.ProyectoMapper;
import com.studyflow.platform.model.dto.EntregableDTO;
import com.studyflow.platform.model.dto.PeticionEntregable;
import com.studyflow.platform.model.entity.Entregable;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.enums.EstadoEntregable;
import com.studyflow.platform.model.enums.TipoEntregable;
import com.studyflow.platform.repository.EntregableRepository;
import com.studyflow.platform.service.EntregableService;
import com.studyflow.platform.service.ProyectoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Registro de documentos y entregables.
 *
 * <p>Si no se indica el tipo, se deduce del dominio del enlace: un enlace de
 * Canva se clasifica como diseño, uno de Google Docs como documento, etc.</p>
 */
@Service
@Transactional
public class EntregableServiceImpl implements EntregableService {

    private final EntregableRepository entregableRepository;
    private final ProyectoService proyectoService;
    private final ProyectoMapper proyectoMapper;

    public EntregableServiceImpl(EntregableRepository entregableRepository,
                                 ProyectoService proyectoService,
                                 ProyectoMapper proyectoMapper) {
        this.entregableRepository = entregableRepository;
        this.proyectoService = proyectoService;
        this.proyectoMapper = proyectoMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EntregableDTO> listar(String codigoProyecto) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        return entregableRepository.findByProyectoIdOrderByFechaRegistroDesc(proyecto.getId())
                .stream().map(proyectoMapper::aDTO).toList();
    }

    @Override
    public EntregableDTO registrar(String codigoProyecto, PeticionEntregable peticion) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        Entregable entregable = new Entregable();
        entregable.setProyecto(proyecto);
        aplicar(entregable, peticion, proyecto);
        proyecto.getEntregables().add(entregable);
        return proyectoMapper.aDTO(entregableRepository.save(entregable));
    }

    @Override
    public EntregableDTO actualizar(Long entregableId, PeticionEntregable peticion) {
        Entregable entregable = obtener(entregableId);
        aplicar(entregable, peticion, entregable.getProyecto());
        entregable.setFechaActualizacion(LocalDateTime.now());
        return proyectoMapper.aDTO(entregable);
    }

    @Override
    public EntregableDTO cambiarEstado(Long entregableId, String estado) {
        Entregable entregable = obtener(entregableId);
        entregable.setEstado(EstadoEntregable.desdeClave(estado));
        entregable.setFechaActualizacion(LocalDateTime.now());
        return proyectoMapper.aDTO(entregable);
    }

    @Override
    public void eliminar(Long entregableId) {
        entregableRepository.delete(obtener(entregableId));
    }

    private Entregable obtener(Long id) {
        return entregableRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("entregable", id));
    }

    private void aplicar(Entregable entregable, PeticionEntregable peticion, Proyecto proyecto) {
        entregable.setNombre(peticion.nombre().trim());
        entregable.setDescripcion(peticion.descripcion());
        entregable.setUrl(peticion.url().trim());
        entregable.setTipo(peticion.tipo() != null && !peticion.tipo().isBlank()
                ? TipoEntregable.valueOf(peticion.tipo().toUpperCase())
                : TipoEntregable.desdeUrl(peticion.url()));
        entregable.setEstado(EstadoEntregable.desdeClave(peticion.estado()));

        if (peticion.responsable() != null && !peticion.responsable().isBlank()) {
            proyecto.getIntegrantes().stream()
                    .filter(integrante -> integrante.getNombre().equalsIgnoreCase(peticion.responsable().trim()))
                    .findFirst()
                    .ifPresent(entregable::setResponsable);
        }
        if (peticion.tareaId() != null) {
            proyecto.getTareas().stream()
                    .filter(tarea -> tarea.getId().equals(peticion.tareaId()))
                    .findFirst()
                    .ifPresent(entregable::setTarea);
        }
    }
}
