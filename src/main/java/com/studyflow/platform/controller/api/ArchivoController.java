package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.entity.ArchivoAdjunto;
import com.studyflow.platform.service.ArchivoService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/**
 * Entrega el contenido de un archivo subido a un canal.
 *
 * <p>Las imagenes se muestran en linea y el resto se descarga. El nombre del
 * archivo se codifica en la cabecera para admitir tildes y espacios.</p>
 */
@RestController
@RequestMapping("/api/archivos")
public class ArchivoController {

    private final ArchivoService archivoService;

    public ArchivoController(ArchivoService archivoService) {
        this.archivoService = archivoService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> descargar(@PathVariable Long id) {
        ArchivoAdjunto ficha = archivoService.obtener(id);
        Resource contenido = archivoService.contenido(id);

        String disposicion = ficha.isEsImagen() ? "inline" : "attachment";
        String nombre = java.net.URLEncoder.encode(ficha.getNombre(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "%s; filename*=UTF-8''%s".formatted(disposicion, nombre))
                .contentType(ficha.getTipoMime() != null
                        ? MediaType.parseMediaType(ficha.getTipoMime())
                        : MediaType.APPLICATION_OCTET_STREAM)
                .body(contenido);
    }
}
