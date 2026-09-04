package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.CanalMapper;
import com.studyflow.platform.model.dto.ArchivoAdjuntoDTO;
import com.studyflow.platform.model.entity.ArchivoAdjunto;
import com.studyflow.platform.model.entity.Canal;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.repository.ArchivoAdjuntoRepository;
import com.studyflow.platform.repository.CanalRepository;
import com.studyflow.platform.repository.MensajeChatRepository;
import com.studyflow.platform.service.ArchivoService;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

/**
 * Almacenamiento de imagenes y documentos de los canales.
 *
 * <p>El binario se guarda en una carpeta local ({@code studyflow.archivos.ruta})
 * y en la base solo queda la ficha. El nombre en disco se genera con un UUID
 * para que dos archivos con el mismo nombre no se pisen y para que el nombre
 * original que escribe el usuario nunca llegue al sistema de ficheros.</p>
 */
@Service
@Transactional
public class ArchivoServiceImpl implements ArchivoService {

    /** Limite por archivo: 10 MB. */
    private static final long TAMANO_MAXIMO = 10L * 1024 * 1024;

    private final ArchivoAdjuntoRepository archivoRepository;
    private final CanalRepository canalRepository;
    private final MensajeChatRepository mensajeRepository;
    private final UsuarioService usuarioService;
    private final ProyectoService proyectoService;
    private final CanalMapper mapper;
    private final Path carpeta;

    public ArchivoServiceImpl(ArchivoAdjuntoRepository archivoRepository,
                              CanalRepository canalRepository,
                              MensajeChatRepository mensajeRepository,
                              UsuarioService usuarioService,
                              ProyectoService proyectoService,
                              CanalMapper mapper,
                              @Value("${studyflow.archivos.ruta:archivos}") String ruta) {
        this.archivoRepository = archivoRepository;
        this.canalRepository = canalRepository;
        this.mensajeRepository = mensajeRepository;
        this.usuarioService = usuarioService;
        this.proyectoService = proyectoService;
        this.mapper = mapper;
        this.carpeta = Paths.get(ruta).toAbsolutePath().normalize();
    }

    @Override
    public ArchivoAdjuntoDTO subir(Long canalId, Long usuarioId, MultipartFile archivo, Long mensajeId) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("No se recibió ningún archivo.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new IllegalArgumentException("El archivo supera el máximo de 10 MB.");
        }

        Canal canal = canalRepository.findById(canalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("canal", canalId));

        String nombreOriginal = limpiarNombre(archivo.getOriginalFilename());
        String nombreAlmacenado = UUID.randomUUID() + extension(nombreOriginal);

        try {
            Files.createDirectories(carpeta);
            Path destino = carpeta.resolve(nombreAlmacenado).normalize();
            // Defensa frente a nombres con "..": el destino debe seguir dentro de la carpeta.
            if (!destino.startsWith(carpeta)) {
                throw new IllegalArgumentException("Ruta de archivo no válida.");
            }
            try (var entrada = archivo.getInputStream()) {
                Files.copy(entrada, destino, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException error) {
            throw new IllegalArgumentException("No se pudo guardar el archivo: " + error.getMessage());
        }

        ArchivoAdjunto adjunto = new ArchivoAdjunto();
        adjunto.setCanal(canal);
        adjunto.setNombre(nombreOriginal);
        adjunto.setNombreAlmacenado(nombreAlmacenado);
        adjunto.setTipoMime(archivo.getContentType());
        adjunto.setTamanoBytes(archivo.getSize());
        adjunto.setEsImagen(archivo.getContentType() != null && archivo.getContentType().startsWith("image/"));
        adjunto.setSubidoPor(usuarioService.obtenerPorId(usuarioId));
        if (mensajeId != null) {
            mensajeRepository.findById(mensajeId).ifPresent(adjunto::setMensaje);
        }
        canal.getArchivos().add(adjunto);
        return mapper.aDTO(archivoRepository.save(adjunto));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ArchivoAdjuntoDTO> listarDeCanal(Long canalId, Boolean soloImagenes) {
        List<ArchivoAdjunto> archivos = soloImagenes == null
                ? archivoRepository.findByCanalIdOrderByFechaSubidaDesc(canalId)
                : archivoRepository.findByCanalIdAndEsImagenOrderByFechaSubidaDesc(canalId, soloImagenes);
        return archivos.stream().map(mapper::aDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ArchivoAdjuntoDTO> listarDeProyecto(String codigoProyecto) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        return archivoRepository.findByCanalProyectoIdOrderByFechaSubidaDesc(proyecto.getId())
                .stream().map(mapper::aDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ArchivoAdjunto obtener(Long archivoId) {
        return archivoRepository.findById(archivoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("archivo", archivoId));
    }

    @Override
    @Transactional(readOnly = true)
    public Resource contenido(Long archivoId) {
        ArchivoAdjunto archivo = obtener(archivoId);
        Path ruta = carpeta.resolve(archivo.getNombreAlmacenado()).normalize();
        if (!ruta.startsWith(carpeta) || !Files.exists(ruta)) {
            throw new RecursoNoEncontradoException("archivo en disco", archivo.getNombre());
        }
        return new FileSystemResource(ruta);
    }

    @Override
    public void eliminar(Long archivoId) {
        ArchivoAdjunto archivo = obtener(archivoId);
        try {
            Files.deleteIfExists(carpeta.resolve(archivo.getNombreAlmacenado()).normalize());
        } catch (IOException ignorado) {
            // Si el binario ya no está, basta con retirar la ficha de la base.
        }
        archivoRepository.delete(archivo);
    }

    /** Se queda solo con el nombre, sin rutas, y acota la longitud. */
    private String limpiarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return "archivo";
        }
        String limpio = Paths.get(nombre).getFileName().toString();
        return limpio.length() > 180 ? limpio.substring(limpio.length() - 180) : limpio;
    }

    private String extension(String nombre) {
        int punto = nombre.lastIndexOf('.');
        return punto > 0 && punto < nombre.length() - 1 ? nombre.substring(punto) : "";
    }
}
