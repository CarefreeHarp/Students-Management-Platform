package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.PeticionOrganizacion;
import com.studyflow.platform.model.dto.PlanOrganizadoDTO;
import com.studyflow.platform.model.dto.ProyectoDTO;
import com.studyflow.platform.service.ClienteIaConversacional;
import com.studyflow.platform.service.OrganizadorProyectoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * API REST del organizador de proyectos.
 *
 * <p>Un endpoint propone el plan sin guardarlo (para previsualizarlo en el
 * formulario de creacion) y otro lo aplica sobre un proyecto existente.</p>
 */
@RestController
@RequestMapping("/api/organizador")
public class OrganizadorApiController {

    private final OrganizadorProyectoService organizadorService;
    private final ClienteIaConversacional clienteIa;

    public OrganizadorApiController(OrganizadorProyectoService organizadorService,
                                    ClienteIaConversacional clienteIa) {
        this.organizadorService = organizadorService;
        this.clienteIa = clienteIa;
    }

    /** Propone un plan de N tareas con sus plazos, sin persistir nada. */
    @PostMapping("/plan")
    public PlanOrganizadoDTO proponer(@Valid @RequestBody PeticionOrganizacion peticion) {
        return organizadorService.proponerPlan(peticion);
    }

    /** Reorganiza un proyecto existente conservando sus tareas ya completadas. */
    @PostMapping("/proyectos/{codigo}")
    public ProyectoDTO organizar(@PathVariable String codigo,
                                 @RequestParam(defaultValue = "5") int numeroTareas) {
        return organizadorService.organizarProyecto(codigo, numeroTareas);
    }

    /** Permite a la interfaz saber si esta hablando con la API real o con la simulacion. */
    @GetMapping("/estado")
    public Map<String, Object> estado() {
        return Map.of(
                "modelo", clienteIa.getModelo(),
                "conectada", clienteIa.estaConectada());
    }
}
