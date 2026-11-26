package com.studyflow.platform.controller.api;

import org.springframework.security.access.prepost.PreAuthorize;

import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.service.ArchivoService;
import com.studyflow.platform.service.CanalService;
import com.studyflow.platform.service.SesionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** API REST de los canales de un proyecto, sus mensajes, reacciones y archivos. */
@RestController
@RequestMapping("/api")
public class CanalApiController {

    private static final Pattern AVATAR_CARGADO = Pattern.compile("^data:(image/(?:png|jpeg|webp));base64,");

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
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public List<CanalDTO> deProyecto(@PathVariable String codigo) {
        return canalService.listarDeProyecto(codigo, sesionService.usuarioActualId());
    }

    @PostMapping("/proyectos/{codigo}/canales")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public CanalDTO crear(@PathVariable String codigo, @Valid @RequestBody PeticionCanal peticion) {
        return canalService.crear(codigo, sesionService.usuarioActualId(), peticion);
    }

    @GetMapping("/proyectos/{codigo}/canales/{slug}")
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public CanalDTO porSlug(@PathVariable String codigo, @PathVariable String slug) {
        return canalService.obtenerPorSlug(codigo, slug, sesionService.usuarioActualId());
    }

    @GetMapping("/canales/{id}")
    @PreAuthorize("@permisos.canal(#id, false)")
    public CanalDTO obtener(@PathVariable Long id) {
        return canalService.obtener(id, sesionService.usuarioActualId());
    }

    @DeleteMapping("/canales/{id}")
    @PreAuthorize("@permisos.canal(#id, true)")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        canalService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------ mensajes

    @PostMapping("/canales/{id}/mensajes")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permisos.canal(#id, false)")
    public MensajeChatDTO publicar(@PathVariable Long id, @Valid @RequestBody PeticionMensajeChat peticion) {
        return canalService.publicar(id, sesionService.usuarioActualId(), peticion);
    }

    @GetMapping("/canales/{id}/avatares/{autorId}")
    @PreAuthorize("@permisos.canal(#id, false)")
    public ResponseEntity<byte[]> avatar(@PathVariable Long id, @PathVariable Long autorId) {
        String avatar = canalService.avatarDelAutor(id, autorId).orElse("");
        var tipo = AVATAR_CARGADO.matcher(avatar);
        if (!tipo.find()) return ResponseEntity.notFound().build();

        try {
            byte[] imagen = Base64.getDecoder().decode(avatar.substring(tipo.end()));
            return ResponseEntity.ok().contentType(MediaType.parseMediaType(tipo.group(1))).body(imagen);
        } catch (IllegalArgumentException imagenInvalida) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Anade o retira la reaccion del usuario actual sobre un mensaje. */
    @PostMapping("/mensajes/{id}/reacciones")
    @PreAuthorize("@permisos.mensaje(#id)")
    public MensajeChatDTO reaccionar(@PathVariable Long id, @RequestBody Map<String, String> cuerpo) {
        return canalService.alternarReaccion(id, sesionService.usuarioActualId(), cuerpo.get("emoji"));
    }

    // ------------------------------------------------------------ resumenes

    @PostMapping("/canales/{id}/resumen")
    @PreAuthorize("@permisos.canal(#id, false)")
    public ResumenChatDTO resumir(@PathVariable Long id) {
        return canalService.resumir(id);
    }

    @GetMapping("/canales/{id}/resumenes")
    @PreAuthorize("@permisos.canal(#id, false)")
    public List<ResumenChatDTO> historial(@PathVariable Long id) {
        return canalService.historialResumenes(id);
    }

    // ------------------------------------------------------------ archivos

    @PostMapping("/canales/{id}/archivos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permisos.canal(#id, false)")
    public ArchivoAdjuntoDTO subir(@PathVariable Long id,
                                   @RequestParam("archivo") MultipartFile archivo,
                                   @RequestParam(required = false) Long mensajeId) {
        return archivoService.subir(id, sesionService.usuarioActualId(), archivo, mensajeId);
    }

    /** Archivos del canal. Con {@code soloImagenes} se obtiene la galeria. */
    @GetMapping("/canales/{id}/archivos")
    @PreAuthorize("@permisos.canal(#id, false)")
    public List<ArchivoAdjuntoDTO> archivos(@PathVariable Long id,
                                            @RequestParam(required = false) Boolean soloImagenes) {
        return archivoService.listarDeCanal(id, soloImagenes);
    }

    @GetMapping("/proyectos/{codigo}/archivos")
    @PreAuthorize("@permisos.proyecto(#codigo, false)")
    public List<ArchivoAdjuntoDTO> archivosDeProyecto(@PathVariable String codigo) {
        return archivoService.listarDeProyecto(codigo);
    }

    @DeleteMapping("/archivos/{id}")
    @PreAuthorize("@permisos.archivo(#id, true)")
    public ResponseEntity<Void> eliminarArchivo(@PathVariable Long id) {
        archivoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
