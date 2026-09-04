package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.service.ApunteClaseService;
import com.studyflow.platform.service.RecordatorioService;
import com.studyflow.platform.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** API REST de recordatorios por WhatsApp y de los apuntes que los originan. */
@RestController
@RequestMapping("/api")
public class RecordatorioApiController {

    private final RecordatorioService recordatorioService;
    private final ApunteClaseService apunteService;
    private final UsuarioService usuarioService;

    public RecordatorioApiController(RecordatorioService recordatorioService,
                                     ApunteClaseService apunteService,
                                     UsuarioService usuarioService) {
        this.recordatorioService = recordatorioService;
        this.apunteService = apunteService;
        this.usuarioService = usuarioService;
    }

    // ------------------------------------------------------------ preferencias

    @GetMapping("/recordatorios/preferencias")
    public PreferenciaRecordatorioDTO preferencias() {
        return recordatorioService.obtenerPreferencias(usuarioActual());
    }

    @PutMapping("/recordatorios/preferencias")
    public PreferenciaRecordatorioDTO guardarPreferencias(
            @Valid @RequestBody PeticionPreferenciaRecordatorio peticion) {
        return recordatorioService.guardarPreferencias(usuarioActual(), peticion);
    }

    // ------------------------------------------------------------ recordatorios

    @GetMapping("/recordatorios")
    public List<RecordatorioDTO> listar() {
        return recordatorioService.listar(usuarioActual());
    }

    /** Recalcula la agenda completa a partir de tareas, entregas y apuntes. */
    @PostMapping("/recordatorios/reprogramar")
    public Map<String, Object> reprogramar() {
        int programados = recordatorioService.reprogramarTodo(usuarioActual());
        return Map.of("programados", programados);
    }

    @PostMapping("/recordatorios/{id}/enviar")
    public RecordatorioDTO enviarAhora(@PathVariable Long id) {
        return recordatorioService.enviarAhora(id);
    }

    @PostMapping("/recordatorios/prueba")
    public Map<String, String> enviarPrueba() {
        return Map.of("mensaje", recordatorioService.enviarPrueba(usuarioActual()));
    }

    @DeleteMapping("/recordatorios/{id}")
    public ResponseEntity<Void> cancelar(@PathVariable Long id) {
        recordatorioService.cancelar(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------ apuntes de clase

    @GetMapping("/apuntes")
    public List<ApunteClaseDTO> apuntes() {
        return apunteService.listar(usuarioActual());
    }

    @PostMapping("/apuntes")
    @ResponseStatus(HttpStatus.CREATED)
    public ApunteClaseDTO crearApunte(@Valid @RequestBody PeticionApunteClase peticion) {
        return apunteService.crear(usuarioActual(), peticion);
    }

    @PatchMapping("/apuntes/{id}/resuelto")
    public ApunteClaseDTO marcarResuelto(@PathVariable Long id,
                                         @RequestBody(required = false) Map<String, Boolean> cuerpo) {
        boolean resuelto = cuerpo == null || cuerpo.getOrDefault("resuelto", true);
        return apunteService.marcarResuelto(id, resuelto);
    }

    @DeleteMapping("/apuntes/{id}")
    public ResponseEntity<Void> eliminarApunte(@PathVariable Long id) {
        apunteService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    private Long usuarioActual() {
        return usuarioService.obtenerActual().getId();
    }
}
