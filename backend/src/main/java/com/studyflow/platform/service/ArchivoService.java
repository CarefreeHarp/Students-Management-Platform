package com.studyflow.platform.service;

import com.studyflow.platform.model.dto.ArchivoAdjuntoDTO;
import com.studyflow.platform.model.entity.ArchivoAdjunto;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Imagenes y documentos compartidos en los canales. */
public interface ArchivoService {

    ArchivoAdjuntoDTO subir(Long canalId, Long usuarioId, MultipartFile archivo, Long mensajeId);

    /** Archivos de un canal. Con {@code soloImagenes} se obtiene la galeria. */
    List<ArchivoAdjuntoDTO> listarDeCanal(Long canalId, Boolean soloImagenes);

    /** Todos los archivos del proyecto, atravesando sus canales. */
    List<ArchivoAdjuntoDTO> listarDeProyecto(String codigoProyecto);

    ArchivoAdjunto obtener(Long archivoId);

    /** Contenido del archivo para descargarlo o mostrarlo. */
    Resource contenido(Long archivoId);

    void eliminar(Long archivoId);
}
