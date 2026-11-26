package com.studyflow.platform.controller.api;

import org.springframework.security.access.prepost.PreAuthorize;

import com.studyflow.platform.model.dto.DiagramaFasesDTO;
import com.studyflow.platform.model.dto.TareaFaseDTO;
import com.studyflow.platform.service.FaseService;
import com.studyflow.platform.service.SesionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** API REST del diagrama de fases y del reparto de tareas. */
@RestController
@RequestMapping("/api")
public class FaseApiController {

    private final FaseService faseService;
    private final SesionService sesionService;

    public FaseApiController(FaseService faseService, SesionService sesionService) {
        this.faseService = faseService;
        this.sesionService = sesionService;
    }

    @GetMapping("/proyectos/{codigo}/fases")
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public DiagramaFasesDTO diagrama(@PathVariable String codigo) {
        return faseService.diagrama(codigo);
    }

    /** Tareas libres y sin bloqueos, para que cada persona elija la suya. */
    @GetMapping("/proyectos/{codigo}/tareas-disponibles")
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public List<TareaFaseDTO> disponibles(@PathVariable String codigo) {
        return faseService.disponibles(codigo);
    }

    @PostMapping("/tareas/{id}/dependencias")
    @PreAuthorize("@permisos.tarea(#id)")
    public TareaFaseDTO agregarDependencia(@PathVariable Long id, @RequestBody Map<String, Long> cuerpo) {
        return faseService.agregarDependencia(id, cuerpo.get("dependeDe"));
    }

    @DeleteMapping("/tareas/{id}/dependencias/{dependeDe}")
    @PreAuthorize("@permisos.tarea(#id)")
    public TareaFaseDTO quitarDependencia(@PathVariable Long id, @PathVariable Long dependeDe) {
        return faseService.quitarDependencia(id, dependeDe);
    }

    @PostMapping("/tareas/{id}/reclamar")
    @PreAuthorize("@permisos.tarea(#id)")
    public TareaFaseDTO reclamar(@PathVariable Long id) {
        return faseService.reclamar(id, sesionService.usuarioActualId());
    }

    @PostMapping("/tareas/{id}/liberar")
    @PreAuthorize("@permisos.tarea(#id)")
    public TareaFaseDTO liberar(@PathVariable Long id) {
        return faseService.liberar(id);
    }

    @PatchMapping("/tareas/{id}/estado")
    @PreAuthorize("@permisos.tarea(#id)")
    public TareaFaseDTO cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> cuerpo) {
        return faseService.cambiarEstado(id, cuerpo.get("estado"));
    }

    @GetMapping("/estados-tarea")
    public ResponseEntity<List<Map<String, String>>> estados() {
        return ResponseEntity.ok(java.util.Arrays.stream(
                        com.studyflow.platform.model.enums.EstadoTarea.values())
                .map(estado -> Map.of("clave", estado.getClave(), "etiqueta", estado.getEtiqueta()))
                .toList());
    }
}
