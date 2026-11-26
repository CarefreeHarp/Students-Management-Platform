package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.RecordatorioMapper;
import com.studyflow.platform.model.dto.ApunteClaseDTO;
import com.studyflow.platform.model.dto.PeticionApunteClase;
import com.studyflow.platform.model.entity.ApunteClase;
import com.studyflow.platform.repository.ApunteClaseRepository;
import com.studyflow.platform.repository.MateriaRepository;
import com.studyflow.platform.service.ApunteClaseService;
import com.studyflow.platform.service.RecordatorioService;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Apuntes posteriores a clase.
 *
 * <p>Cada vez que se crea o se cierra un apuntecon fecha limite se pide al
 * servicio de recordatorios que recalcule la agenda, para que el aviso aparezca
 * o desaparezca sin pasos adicionales por parte del estudiante.</p>
 */
@Service
@Transactional
public class ApunteClaseServiceImpl implements ApunteClaseService {

    private final ApunteClaseRepository apunteRepository;
    private final MateriaRepository materiaRepository;
    private final UsuarioService usuarioService;
    private final RecordatorioService recordatorioService;
    private final RecordatorioMapper mapper;

    public ApunteClaseServiceImpl(ApunteClaseRepository apunteRepository,
                                  MateriaRepository materiaRepository,
                                  UsuarioService usuarioService,
                                  RecordatorioService recordatorioService,
                                  RecordatorioMapper mapper) {
        this.apunteRepository = apunteRepository;
        this.materiaRepository = materiaRepository;
        this.usuarioService = usuarioService;
        this.recordatorioService = recordatorioService;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApunteClaseDTO> listar(Long usuarioId) {
        return apunteRepository.findByUsuarioIdOrderByFechaClaseDesc(usuarioId)
                .stream().map(mapper::aDTO).toList();
    }

    @Override
    public ApunteClaseDTO crear(Long usuarioId, PeticionApunteClase peticion) {
        ApunteClase apunte = new ApunteClase();
        apunte.setUsuario(usuarioService.obtenerPorId(usuarioId));
        apunte.setTitulo(peticion.titulo().trim());
        apunte.setContenido(peticion.contenido());
        apunte.setFechaClase(peticion.fechaClase() != null ? peticion.fechaClase() : LocalDate.now());
        apunte.setFechaLimite(peticion.fechaLimite());
        apunte.setImportante(Boolean.TRUE.equals(peticion.importante()));
        if (peticion.materiaId() != null) {
            materiaRepository.findById(peticion.materiaId()).ifPresent(apunte::setMateria);
        }
        ApunteClase guardado = apunteRepository.save(apunte);

        if (guardado.getFechaLimite() != null) {
            recordatorioService.reprogramarTodo(usuarioId);
        }
        return mapper.aDTO(guardado);
    }

    @Override
    public ApunteClaseDTO marcarResuelto(Long apunteId, boolean resuelto) {
        ApunteClase apunte = obtener(apunteId);
        apunte.setResuelto(resuelto);
        // Un pendiente resuelto ya no debe generar avisos.
        recordatorioService.reprogramarTodo(apunte.getUsuario().getId());
        return mapper.aDTO(apunte);
    }

    @Override
    public void eliminar(Long apunteId) {
        ApunteClase apunte = obtener(apunteId);
        Long usuarioId = apunte.getUsuario().getId();
        apunteRepository.delete(apunte);
        recordatorioService.reprogramarTodo(usuarioId);
    }

    private ApunteClase obtener(Long id) {
        return apunteRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("apunte de clase", id));
    }
}
