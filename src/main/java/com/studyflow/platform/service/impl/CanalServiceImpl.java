package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.CanalMapper;
import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.model.entity.*;
import com.studyflow.platform.model.enums.TipoCanal;
import com.studyflow.platform.repository.*;
import com.studyflow.platform.service.CanalService;
import com.studyflow.platform.service.ClienteIaConversacional;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import com.studyflow.platform.util.TextoUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Implementacion de los canales de conversacion y sus resumenes. */
@Service
@Transactional
public class CanalServiceImpl implements CanalService {

    private static final String INSTRUCCION = """
            Eres un asistente que resume conversaciones de equipos de estudiantes.
            Redacta un resumen breve en español, indicando de qué se habló,
            qué se acordó y qué queda pendiente.
            """;

    /** Marcas que identifican un mensaje relevante para la lista de puntos clave. */
    private static final List<String> MARCAS = List.of(
            "quedamos", "acordamos", "hagamos", "me encargo", "yo hago", "listo",
            "entrega", "fecha", "pendiente", "falta", "necesito", "revisar", "?");

    /** Emojis admitidos en las reacciones, los mismos que ofrece la interfaz. */
    private static final List<String> EMOJIS = List.of("👍", "🎉", "❤️", "🚀", "👀", "✅", "😅", "🔥");

    private final CanalRepository canalRepository;
    private final MensajeChatRepository mensajeRepository;
    private final ResumenChatRepository resumenRepository;
    private final ReaccionMensajeRepository reaccionRepository;
    private final UsuarioService usuarioService;
    private final ProyectoService proyectoService;
    private final ClienteIaConversacional clienteIa;
    private final CanalMapper mapper;

    public CanalServiceImpl(CanalRepository canalRepository,
                            MensajeChatRepository mensajeRepository,
                            ResumenChatRepository resumenRepository,
                            ReaccionMensajeRepository reaccionRepository,
                            UsuarioService usuarioService,
                            ProyectoService proyectoService,
                            ClienteIaConversacional clienteIa,
                            CanalMapper mapper) {
        this.canalRepository = canalRepository;
        this.mensajeRepository = mensajeRepository;
        this.resumenRepository = resumenRepository;
        this.reaccionRepository = reaccionRepository;
        this.usuarioService = usuarioService;
        this.proyectoService = proyectoService;
        this.clienteIa = clienteIa;
        this.mapper = mapper;
    }

    // ---------------------------------------------------------------- canales

    @Override
    @Transactional(readOnly = true)
    public List<CanalDTO> listar(Long usuarioId) {
        return canalRepository.findParticipaUsuario(usuarioId).stream()
                .map(canal -> mapper.aDTO(canal, usuarioId, false))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CanalDTO> listarDeProyecto(String codigoProyecto, Long usuarioId) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        return canalRepository.findByProyectoIdOrderByOrdenAscNombreAsc(proyecto.getId()).stream()
                .map(canal -> mapper.aDTO(canal, usuarioId, false))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CanalDTO obtener(Long canalId, Long usuarioId) {
        return mapper.aDTO(obtenerEntidad(canalId), usuarioId, true);
    }

    @Override
    @Transactional(readOnly = true)
    public CanalDTO obtenerPorSlug(String codigoProyecto, String slug, Long usuarioId) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        Canal canal = canalRepository.findByProyectoIdAndSlug(proyecto.getId(), slug)
                .orElseThrow(() -> new RecursoNoEncontradoException("canal", slug));
        return mapper.aDTO(canal, usuarioId, true);
    }

    @Override
    public CanalDTO crear(String codigoProyecto, Long usuarioId, PeticionCanal peticion) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        String slug = TextoUtil.aSlug(peticion.nombre());

        if (canalRepository.existsByProyectoIdAndSlug(proyecto.getId(), slug)) {
            throw new IllegalArgumentException("Ya existe un canal #%s en este proyecto.".formatted(slug));
        }

        TipoCanal tipo = peticion.tipo() != null && !peticion.tipo().isBlank()
                ? TipoCanal.valueOf(peticion.tipo().toUpperCase())
                : TipoCanal.LIBRE;
        // #general lo crea el sistema con el proyecto; a mano solo se abren canales normales.
        if (tipo == TipoCanal.GENERAL) {
            tipo = TipoCanal.LIBRE;
        }

        Canal canal = new Canal(peticion.nombre().trim(), tipo, 20);
        canal.setSlug(slug);
        canal.setDescripcion(peticion.descripcion());
        canal.setCreador(usuarioService.obtenerPorId(usuarioId));
        if (peticion.tareaId() != null) {
            proyecto.getTareas().stream()
                    .filter(tarea -> tarea.getId().equals(peticion.tareaId()))
                    .findFirst()
                    .ifPresent(tarea -> {
                        canal.setTarea(tarea);
                        canal.setTipo(TipoCanal.TAREA);
                    });
        }
        proyecto.agregarCanal(canal);
        return mapper.aDTO(canalRepository.save(canal), usuarioId, true);
    }

    @Override
    public void eliminar(Long canalId) {
        Canal canal = obtenerEntidad(canalId);
        if (!canal.esBorrable()) {
            throw new IllegalArgumentException("El canal #general no se puede eliminar.");
        }
        canalRepository.delete(canal);
    }

    // ---------------------------------------------------------------- mensajes

    @Override
    public MensajeChatDTO publicar(Long canalId, Long usuarioId, PeticionMensajeChat peticion) {
        Canal canal = obtenerEntidad(canalId);
        Usuario usuario = usuarioService.obtenerPorId(usuarioId);

        MensajeChat mensaje = new MensajeChat();
        mensaje.setAutor(usuario);
        mensaje.setAutorNombre(peticion.autorNombre() != null && !peticion.autorNombre().isBlank()
                ? peticion.autorNombre().trim()
                : usuario.getNombreCompleto());
        mensaje.setContenido(peticion.contenido().trim());
        mensaje.setAutorColor(colorDe(canal, mensaje.getAutorNombre()));
        canal.agregarMensaje(mensaje);
        return mapper.aDTO(mensajeRepository.save(mensaje), usuarioId);
    }

    @Override
    public MensajeChatDTO alternarReaccion(Long mensajeId, Long usuarioId, String emoji) {
        if (emoji == null || !EMOJIS.contains(emoji)) {
            throw new IllegalArgumentException("Ese emoji no está disponible para reaccionar.");
        }
        MensajeChat mensaje = mensajeRepository.findById(mensajeId)
                .orElseThrow(() -> new RecursoNoEncontradoException("mensaje", mensajeId));

        reaccionRepository.findByMensajeIdAndUsuarioIdAndEmoji(mensajeId, usuarioId, emoji)
                .ifPresentOrElse(
                        // Volver a pulsar el mismo emoji retira la reacción.
                        existente -> {
                            mensaje.getReacciones().remove(existente);
                            reaccionRepository.delete(existente);
                        },
                        () -> {
                            ReaccionMensaje reaccion = new ReaccionMensaje(
                                    mensaje, usuarioService.obtenerPorId(usuarioId), emoji);
                            mensaje.getReacciones().add(reaccion);
                            reaccionRepository.save(reaccion);
                        });

        return mapper.aDTO(mensaje, usuarioId);
    }

    // ---------------------------------------------------------------- resumenes

    @Override
    public ResumenChatDTO resumir(Long canalId) {
        Canal canal = obtenerEntidad(canalId);
        List<MensajeChat> mensajes = mensajeRepository.findByCanalIdOrderByFechaEnvioAsc(canalId);
        if (mensajes.isEmpty()) {
            throw new IllegalArgumentException("El canal aún no tiene mensajes que resumir.");
        }

        String conversacion = mensajes.stream()
                .map(mensaje -> "%s: %s".formatted(mensaje.getAutorNombre(), mensaje.getContenido()))
                .reduce("", (acumulado, linea) -> acumulado + linea + "\n");

        ResumenChat resumen = new ResumenChat();
        resumen.setCanal(canal);
        resumen.setContenido(clienteIa.completar(INSTRUCCION, conversacion));
        resumen.setPuntosClave(extraerPuntosClave(mensajes));
        resumen.setMensajesResumidos(mensajes.size());
        resumen.setDesdeMensajeId(mensajes.get(0).getId());
        resumen.setHastaMensajeId(mensajes.get(mensajes.size() - 1).getId());
        resumen.setModelo(clienteIa.getModelo());

        ResumenChat guardado = resumenRepository.save(resumen);
        canal.getResumenes().add(0, guardado);
        return mapper.aDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResumenChatDTO> historialResumenes(Long canalId) {
        return resumenRepository.findByCanalIdOrderByFechaGeneracionDesc(canalId)
                .stream().map(mapper::aDTO).toList();
    }

    // ---------------------------------------------------------------- apoyo

    private Canal obtenerEntidad(Long canalId) {
        return canalRepository.findById(canalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("canal", canalId));
    }

    /** Reutiliza el color del integrante para que coincida con el resto de la interfaz. */
    private String colorDe(Canal canal, String nombre) {
        if (canal.getProyecto() == null) {
            return "#5b5ce2";
        }
        return canal.getProyecto().getIntegrantes().stream()
                .filter(integrante -> integrante.getNombre().equalsIgnoreCase(nombre))
                .map(Integrante::getColor)
                .findFirst()
                .orElse("#5b5ce2");
    }

    /**
     * Selecciona hasta cinco mensajes que contienen acuerdos, fechas o preguntas.
     * Es una heuristica local: no depende del modelo y sirve igual con la API real.
     */
    private String extraerPuntosClave(List<MensajeChat> mensajes) {
        return mensajes.stream()
                .filter(mensaje -> {
                    String texto = mensaje.getContenido().toLowerCase();
                    return MARCAS.stream().anyMatch(texto::contains);
                })
                .limit(5)
                .map(mensaje -> "%s: %s".formatted(mensaje.getAutorNombre(), recortar(mensaje.getContenido())))
                .reduce("", (acumulado, linea) -> acumulado.isEmpty() ? linea : acumulado + "\n" + linea);
    }

    private String recortar(String texto) {
        String limpio = texto.replaceAll("\\s+", " ").trim();
        return limpio.length() > 140 ? limpio.substring(0, 140) + "…" : limpio;
    }
}
