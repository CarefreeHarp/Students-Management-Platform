package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.TareaDTO;
import com.studyflow.platform.service.TareaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public TareaDTO actualizar(@PathVariable Long id, @Valid @RequestBody PeticionTarea peticion) {
        return tareaService.actualizar(id, peticion);
    }

    /** Formulario "marcar tarea terminada" del panel principal. */
    @PatchMapping("/{id}/completar")
    public TareaDTO completar(@PathVariable Long id, @RequestBody(required = false) Map<String, String> cuerpo) {
        String nota = cuerpo != null ? cuerpo.get("nota") : null;
        return tareaService.marcarCompletada(id, nota);
    }

    @DeleteMapping("/{id}")
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
