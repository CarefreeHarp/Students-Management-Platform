package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.EntregableDTO;
import com.studyflow.platform.model.dto.PeticionEntregable;

import java.util.List;

/** Registro de documentos y entregables del trabajo grupal. */
public interface EntregableService {

    List<EntregableDTO> listar(String codigoProyecto);

    EntregableDTO registrar(String codigoProyecto, PeticionEntregable peticion);

    EntregableDTO actualizar(Long entregableId, PeticionEntregable peticion);

    EntregableDTO cambiarEstado(Long entregableId, String estado);

    void eliminar(Long entregableId);
}
