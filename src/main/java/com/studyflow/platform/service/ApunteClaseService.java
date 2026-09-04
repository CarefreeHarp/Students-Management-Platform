package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.ApunteClaseDTO;
import com.studyflow.platform.model.dto.PeticionApunteClase;

import java.util.List;

/** Apuntes que el estudiante registra despues de cada clase. */
public interface ApunteClaseService {

    List<ApunteClaseDTO> listar(Long usuarioId);

    ApunteClaseDTO crear(Long usuarioId, PeticionApunteClase peticion);

    ApunteClaseDTO marcarResuelto(Long apunteId, boolean resuelto);

    void eliminar(Long apunteId);
}
