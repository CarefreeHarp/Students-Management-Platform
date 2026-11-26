package com.studyflow.platform.controller.api;

import com.studyflow.platform.service.InvitacionesProyecto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class InvitacionApiController {
    private final InvitacionesProyecto invitaciones;

    public InvitacionApiController(InvitacionesProyecto invitaciones) {
        this.invitaciones = invitaciones;
    }

    @PostMapping("/proyectos/{codigo}/integrantes/{id}/invitacion")
    @PreAuthorize("hasRole('ESTUDIANTE') and @permisos.proyecto(#codigo, true)")
    public Map<String, String> generar(@PathVariable String codigo, @PathVariable Long id) {
        return Map.of("token", invitaciones.generar(codigo, id));
    }

    @PostMapping("/invitaciones/aceptar")
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public Map<String, String> aceptar(@RequestBody Map<String, String> datos) {
        return Map.of("codigo", invitaciones.aceptar(datos.get("token")));
    }
}
