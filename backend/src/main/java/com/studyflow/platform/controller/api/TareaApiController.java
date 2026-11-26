package com.studyflow.platform.controller.api;

import org.springframework.security.access.prepost.PreAuthorize;

import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.TareaDTO;
import com.studyflow.platform.service.TareaService;
import com.studyflow.platform.model.entity.ArchivoTarea;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** API REST de tareas: edicion, cierre y agenda del calendario general. */
@RestController
@RequestMapping("/api/tareas")
public class TareaApiController {

    private final TareaService tareaService;

    public TareaApiController(TareaService tareaService) {
        this.tareaService = tareaService;
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisos.tarea(#id)")
    public TareaDTO actualizar(@PathVariable Long id, @Valid @RequestBody PeticionTarea peticion) {
        return tareaService.actualizar(id, peticion);
    }

    /** Cierra una tarea solo cuando se aporta una evidencia escrita o un archivo. */
    @PatchMapping(value = "/{id}/completar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@permisos.tarea(#id)")
    public TareaDTO completar(@PathVariable Long id,
                              @RequestParam(value = "resultado", required = false) String resultado,
                              @RequestParam(value = "archivo", required = false) MultipartFile archivo) {
        return tareaService.marcarCompletada(id, resultado, archivo);
    }

    @GetMapping("/{id}/resultado/archivo")
    @PreAuthorize("@permisos.tarea(#id)")
    public ResponseEntity<Resource> descargarResultado(@PathVariable Long id) {
        ArchivoTarea archivo = tareaService.archivoResultado(id);
        String nombre = java.net.URLEncoder.encode(archivo.getNombre(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''%s".formatted(nombre))
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(tareaService.contenidoResultado(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisos.tarea(#id)")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        tareaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /** Tareas de todos los proyectos en un rango: alimenta el calendario del panel. */
    @GetMapping("/agenda")
    public List<TareaDTO> agenda(@RequestParam LocalDate desde, @RequestParam LocalDate hasta) {
        return tareaService.agendaEntre(desde, hasta);
    }
}
