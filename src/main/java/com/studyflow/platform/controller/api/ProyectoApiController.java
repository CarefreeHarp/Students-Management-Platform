package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.service.AsistenteIaService;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.TareaService;
import com.studyflow.platform.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** API REST de proyectos y de su planificacion asistida. */
@RestController
@RequestMapping("/api/proyectos")
public class ProyectoApiController {

    private final ProyectoService proyectoService;
    private final TareaService tareaService;
    private final UsuarioService usuarioService;
    private final AsistenteIaService asistenteIaService;

    public ProyectoApiController(ProyectoService proyectoService,
                                 TareaService tareaService,
                                 UsuarioService usuarioService,
                                 AsistenteIaService asistenteIaService) {
        this.proyectoService = proyectoService;
        this.tareaService = tareaService;
        this.usuarioService = usuarioService;
        this.asistenteIaService = asistenteIaService;
    }

    @GetMapping
    public List<ProyectoDTO> listar() {
        return proyectoService.listarDeUsuario(usuarioService.obtenerActual().getId());
    }

    @GetMapping("/{codigo}")
    public ProyectoDTO obtener(@PathVariable String codigo) {
        return proyectoService.obtenerPorCodigo(codigo);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProyectoDTO crear(@Valid @RequestBody PeticionProyecto peticion) {
        return proyectoService.crear(peticion, usuarioService.obtenerActual().getId());
    }

    @PutMapping("/{codigo}/integrantes")
    public ProyectoDTO actualizarIntegrantes(@PathVariable String codigo,
                                             @RequestBody List<PeticionIntegrante> integrantes) {
        return proyectoService.actualizarIntegrantes(codigo, integrantes);
    }

    @DeleteMapping("/{codigo}")
    public ResponseEntity<Void> eliminar(@PathVariable String codigo) {
        proyectoService.eliminar(codigo);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{codigo}/tareas")
    public List<TareaDTO> tareas(@PathVariable String codigo) {
        return tareaService.listarPorProyecto(codigo);
    }

    @PostMapping("/{codigo}/tareas")
    @ResponseStatus(HttpStatus.CREATED)
    public TareaDTO crearTarea(@PathVariable String codigo, @Valid @RequestBody PeticionTarea peticion) {
        return tareaService.crear(codigo, peticion);
    }

    /** Respalda el boton "Rellenar con IA" del formulario de creacion. */
    @PostMapping("/planificacion-ia")
    public Map<String, Object> planificarConIa(@RequestBody Map<String, Object> cuerpo) {
        String descripcion = String.valueOf(cuerpo.getOrDefault("descripcion", ""));
        LocalDate fechaEntrega = cuerpo.get("fechaEntrega") != null
                ? LocalDate.parse(String.valueOf(cuerpo.get("fechaEntrega")))
                : null;
        @SuppressWarnings("unchecked")
        List<String> integrantes = (List<String>) cuerpo.getOrDefault("integrantes", List.of());
        return Map.of(
                "resumen", asistenteIaService.resumirContexto(descripcion),
                "tareas", asistenteIaService.proponerPlan(descripcion, fechaEntrega, integrantes)
        );
    }
}
