package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.service.ArchivoService;
import com.studyflow.platform.service.CanalService;
import com.studyflow.platform.service.SesionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** API REST de los canales de un proyecto, sus mensajes, reacciones y archivos. */
@RestController
@RequestMapping("/api")
public class CanalApiController {

    private final CanalService canalService;
    private final ArchivoService archivoService;
    private final SesionService sesionService;

    public CanalApiController(CanalService canalService,
                              ArchivoService archivoService,
                              SesionService sesionService) {
        this.canalService = canalService;
        this.archivoService = archivoService;
        this.sesionService = sesionService;
    }

    // ------------------------------------------------------------ canales

    @GetMapping("/canales")
    public List<CanalDTO> todos() {
        return canalService.listar(sesionService.usuarioActualId());
    }

    @GetMapping("/proyectos/{codigo}/canales")
    public List<CanalDTO> deProyecto(@PathVariable String codigo) {
        return canalService.listarDeProyecto(codigo, sesionService.usuarioActualId());
    }

    @PostMapping("/proyectos/{codigo}/canales")
    @ResponseStatus(HttpStatus.CREATED)
    public CanalDTO crear(@PathVariable String codigo, @Valid @RequestBody PeticionCanal peticion) {
        return canalService.crear(codigo, sesionService.usuarioActualId(), peticion);
    }

    @GetMapping("/proyectos/{codigo}/canales/{slug}")
    public CanalDTO porSlug(@PathVariable String codigo, @PathVariable String slug) {
        return canalService.obtenerPorSlug(codigo, slug, sesionService.usuarioActualId());
    }

    @GetMapping("/canales/{id}")
    public CanalDTO obtener(@PathVariable Long id) {
        return canalService.obtener(id, sesionService.usuarioActualId());
    }

    @DeleteMapping("/canales/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        canalService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------ mensajes

    @PostMapping("/canales/{id}/mensajes")
    @ResponseStatus(HttpStatus.CREATED)
    public MensajeChatDTO publicar(@PathVariable Long id, @Valid @RequestBody PeticionMensajeChat peticion) {
        return canalService.publicar(id, sesionService.usuarioActualId(), peticion);
    }

    /** Anade o retira la reaccion del usuario actual sobre un mensaje. */
    @PostMapping("/mensajes/{id}/reacciones")
    public MensajeChatDTO reaccionar(@PathVariable Long id, @RequestBody Map<String, String> cuerpo) {
        return canalService.alternarReaccion(id, sesionService.usuarioActualId(), cuerpo.get("emoji"));
    }

    // ------------------------------------------------------------ resumenes

    @PostMapping("/canales/{id}/resumen")
    public ResumenChatDTO resumir(@PathVariable Long id) {
        return canalService.resumir(id);
    }

    @GetMapping("/canales/{id}/resumenes")
    public List<ResumenChatDTO> historial(@PathVariable Long id) {
        return canalService.historialResumenes(id);
    }

    // ------------------------------------------------------------ archivos

    @PostMapping("/canales/{id}/archivos")
    @ResponseStatus(HttpStatus.CREATED)
    public ArchivoAdjuntoDTO subir(@PathVariable Long id,
                                   @RequestParam("archivo") MultipartFile archivo,
                                   @RequestParam(required = false) Long mensajeId) {
        return archivoService.subir(id, sesionService.usuarioActualId(), archivo, mensajeId);
    }

    /** Archivos del canal. Con {@code soloImagenes} se obtiene la galeria. */
    @GetMapping("/canales/{id}/archivos")
    public List<ArchivoAdjuntoDTO> archivos(@PathVariable Long id,
                                            @RequestParam(required = false) Boolean soloImagenes) {
        return archivoService.listarDeCanal(id, soloImagenes);
    }

    @GetMapping("/proyectos/{codigo}/archivos")
    public List<ArchivoAdjuntoDTO> archivosDeProyecto(@PathVariable String codigo) {
        return archivoService.listarDeProyecto(codigo);
    }

    @DeleteMapping("/archivos/{id}")
    public ResponseEntity<Void> eliminarArchivo(@PathVariable Long id) {
        archivoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
