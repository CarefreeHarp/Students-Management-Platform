package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.HorarioDTO;
import com.studyflow.platform.model.dto.MateriaDTO;
import com.studyflow.platform.model.dto.PeticionGenerarHorario;
import com.studyflow.platform.model.dto.PeticionMateria;
import com.studyflow.platform.service.HorarioService;
import com.studyflow.platform.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API REST del planificador de horarios de clase. */
@RestController
@RequestMapping("/api")
public class HorarioApiController {

    private final HorarioService horarioService;
    private final UsuarioService usuarioService;

    public HorarioApiController(HorarioService horarioService, UsuarioService usuarioService) {
        this.horarioService = horarioService;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/materias")
    public List<MateriaDTO> materias() {
        return horarioService.listarMaterias(usuarioActual());
    }

    @PostMapping("/materias")
    @ResponseStatus(HttpStatus.CREATED)
    public MateriaDTO agregarMateria(@Valid @RequestBody PeticionMateria peticion) {
        return horarioService.agregarMateria(usuarioActual(), peticion);
    }

    @DeleteMapping("/materias/{id}")
    public ResponseEntity<Void> eliminarMateria(@PathVariable Long id) {
        horarioService.eliminarMateria(usuarioActual(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/materias")
    public ResponseEntity<Void> limpiarMaterias() {
        horarioService.limpiarMaterias(usuarioActual());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/horarios")
    public List<HorarioDTO> alternativas() {
        return horarioService.listarAlternativas(usuarioActual());
    }

    /** Respalda el boton "Generar horarios con IA". */
    @PostMapping("/horarios/generar")
    public List<HorarioDTO> generar(@Valid @RequestBody(required = false) PeticionGenerarHorario borrador) {
        return horarioService.generarAlternativas(usuarioActual(), borrador);
    }

    @PutMapping("/horarios/seleccionado")
    public HorarioDTO guardarManual(@Valid @RequestBody PeticionGenerarHorario borrador) {
        return horarioService.guardarManual(usuarioActual(), borrador);
    }

    @PatchMapping("/horarios/{id}/seleccionar")
    public HorarioDTO seleccionar(@PathVariable Long id) {
        return horarioService.seleccionar(usuarioActual(), id);
    }

    private Long usuarioActual() {
        return usuarioService.obtenerActual().getId();
    }
}
