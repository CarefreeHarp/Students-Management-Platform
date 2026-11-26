package com.studyflow.platform.controller.api;

import org.springframework.security.access.prepost.PreAuthorize;

import com.studyflow.platform.model.dto.EntregableDTO;
import com.studyflow.platform.model.dto.PeticionEntregable;
import com.studyflow.platform.service.EntregableService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** API REST del registro de documentos y entregables. */
@RestController
@RequestMapping("/api")
public class EntregableApiController {

    private final EntregableService entregableService;

    public EntregableApiController(EntregableService entregableService) {
        this.entregableService = entregableService;
    }

    @GetMapping("/proyectos/{codigo}/entregables")
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public List<EntregableDTO> listar(@PathVariable String codigo) {
        return entregableService.listar(codigo);
    }

    @PostMapping("/proyectos/{codigo}/entregables")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public EntregableDTO registrar(@PathVariable String codigo,
                                   @Valid @RequestBody PeticionEntregable peticion) {
        return entregableService.registrar(codigo, peticion);
    }

    @PutMapping("/entregables/{id}")
    @PreAuthorize("@permisos.entregable(#id)")
    public EntregableDTO actualizar(@PathVariable Long id, @Valid @RequestBody PeticionEntregable peticion) {
        return entregableService.actualizar(id, peticion);
    }

    @PatchMapping("/entregables/{id}/estado")
    @PreAuthorize("@permisos.entregable(#id)")
    public EntregableDTO cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> cuerpo) {
        return entregableService.cambiarEstado(id, cuerpo.get("estado"));
    }

    @DeleteMapping("/entregables/{id}")
    @PreAuthorize("@permisos.entregable(#id)")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        entregableService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
