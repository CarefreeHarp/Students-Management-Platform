package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.HorarioDTO;
import com.studyflow.platform.model.dto.MateriaDTO;
import com.studyflow.platform.model.dto.PeticionMateria;

import java.util.List;

/** Reglas de negocio del planificador de horarios de clase. */
public interface HorarioService {

    List<MateriaDTO> listarMaterias(Long usuarioId);

    MateriaDTO agregarMateria(Long usuarioId, PeticionMateria peticion);

    void eliminarMateria(Long materiaId);

    void limpiarMaterias(Long usuarioId);

    List<HorarioDTO> listarAlternativas(Long usuarioId);

    /** Genera y guarda alternativas de horario a partir de las materias registradas. */
    List<HorarioDTO> generarAlternativas(Long usuarioId);

    HorarioDTO seleccionar(Long horarioId);
}
