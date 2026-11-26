package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.CanalMapper;
import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.model.entity.*;
import com.studyflow.platform.model.enums.TipoCanal;
import com.studyflow.platform.repository.*;
import com.studyflow.platform.service.CanalService;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import com.studyflow.platform.util.TextoUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Implementacion de los canales de conversacion y sus resumenes. */
@Service
@Transactional
public class CanalServiceImpl implements CanalService {

    private static final int MAX_MENSAJES_RESUMEN = 100;

    /** Reacciones de texto admitidas, las mismas que ofrece la interfaz. */
    private static final List<String> REACCIONES = List.of("acuerdo", "hecho", "gracias");

    private final CanalRepository canalRepository;
    private final MensajeChatRepository mensajeRepository;
    private final ResumenChatRepository resumenRepository;
    private final ReaccionMensajeRepository reaccionRepository;
    private final UsuarioService usuarioService;
    private final ProyectoService proyectoService;
    private final CanalMapper mapper;
    private final ResumidorCanalGemini resumidor;
    private final TransactionTemplate transacciones;

    public CanalServiceImpl(CanalRepository canalRepository,
                            MensajeChatRepository mensajeRepository,
                            ResumenChatRepository resumenRepository,
                            ReaccionMensajeRepository reaccionRepository,
                            UsuarioService usuarioService,
                            ProyectoService proyectoService,
                            CanalMapper mapper, ResumidorCanalGemini resumidor,
                            TransactionTemplate transacciones) {
        this.canalRepository = canalRepository;
        this.mensajeRepository = mensajeRepository;
        this.resumenRepository = resumenRepository;
        this.reaccionRepository = reaccionRepository;
        this.usuarioService = usuarioService;
        this.proyectoService = proyectoService;
        this.mapper = mapper;
        this.resumidor = resumidor;
        this.transacciones = transacciones;
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
    public List<CanalDTO> listarDeProyecto(String codigoProyecto, Long usuarioId) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        verificarProyecto(proyecto, usuarioId);
        asegurarCanalGeneral(proyecto);
        return canalRepository.findByProyectoIdOrderByOrdenAscNombreAsc(proyecto.getId()).stream()
                .map(canal -> mapper.aDTO(canal, usuarioId, false))
                .toList();
    }

    /**
     * Repone el canal #general si el proyecto no lo tiene.
     *
     * <p>Los proyectos creados antes de que ProyectoService abriera el canal se
     * quedaron sin el, y sin esto seguirian sin poder usarlo. Es una reparacion
     * silenciosa: si ya existe, no hace nada.</p>
     */
    private void asegurarCanalGeneral(Proyecto proyecto) {
        if (canalRepository.existsByProyectoIdAndSlug(proyecto.getId(), Canal.NOMBRE_GENERAL)) {
            return;
        }
        Canal general = new Canal(Canal.NOMBRE_GENERAL, TipoCanal.GENERAL, 0);
        general.setSlug(Canal.NOMBRE_GENERAL);
        general.setDescripcion("Coordinación general de " + proyecto.getNombre());
        general.setCreador(proyecto.getPropietario());
        proyecto.agregarCanal(general);
        canalRepository.save(general);
    }

    @Override
    @Transactional(readOnly = true)
    public CanalDTO obtener(Long canalId, Long usuarioId) {
        return mapper.aDTO(obtenerVisible(canalId, usuarioId), usuarioId, true);
    }

    @Override
    @Transactional(readOnly = true)
    public CanalDTO obtenerPorSlug(String codigoProyecto, String slug, Long usuarioId) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        verificarProyecto(proyecto, usuarioId);
        Canal canal = canalRepository.findByProyectoIdAndSlug(proyecto.getId(), slug)
                .orElseThrow(() -> new RecursoNoEncontradoException("canal", slug));
        return mapper.aDTO(canal, usuarioId, true);
    }

    @Override
    public CanalDTO crear(String codigoProyecto, Long usuarioId, PeticionCanal peticion) {
        Proyecto proyecto = proyectoService.obtenerEntidadPorCodigo(codigoProyecto);
        verificarProyecto(proyecto, usuarioId);
        String slug = TextoUtil.aSlug(peticion.nombre());

        if (canalRepository.existsByProyectoIdAndSlug(proyecto.getId(), slug)) {
            throw new IllegalArgumentException("Ya existe un canal #%s en este proyecto.".formatted(slug));
        }

        // El nombre esta reservado: si se dejara pasar, quedaria un segundo
        // #general de tipo LIBRE que si se puede eliminar, y el proyecto
        // acabaria con dos canales que se llaman igual.
        if (Canal.NOMBRE_GENERAL.equals(slug)) {
            throw new IllegalArgumentException(
                    "El canal #general ya existe en el proyecto y lo crea el sistema.");
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
    public void eliminar(Long canalId, Long usuarioId) {
        Canal canal = obtenerVisible(canalId, usuarioId);
        if (!canal.esBorrable()) {
            throw new IllegalArgumentException("El canal #general no se puede eliminar.");
        }
        canalRepository.delete(canal);
    }

    // ---------------------------------------------------------------- mensajes

    @Override
    public MensajeChatDTO publicar(Long canalId, Long usuarioId, PeticionMensajeChat peticion) {
        Canal canal = obtenerVisible(canalId, usuarioId);
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
        if (emoji == null || !REACCIONES.contains(emoji)) {
            throw new IllegalArgumentException("Esa reacción no está disponible.");
        }
        MensajeChat mensaje = mensajeRepository.findById(mensajeId)
                .orElseThrow(() -> new RecursoNoEncontradoException("mensaje", mensajeId));

        reaccionRepository.findByMensajeIdAndUsuarioIdAndEmoji(mensajeId, usuarioId, emoji)
                .ifPresentOrElse(
                        // Volver a pulsar la misma opción retira la reacción.
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
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public ResumenChatDTO resumir(Long canalId, Long usuarioId) {
        List<MensajeParaResumen> mensajes = transacciones.execute(tx -> {
            obtenerVisible(canalId, usuarioId);
            return new ArrayList<>(mensajeRepository.ultimosParaResumen(canalId, PageRequest.of(0, MAX_MENSAJES_RESUMEN)));
        });
        if (mensajes.isEmpty()) {
            throw new IllegalArgumentException("El canal aún no tiene mensajes que resumir.");
        }
        Collections.reverse(mensajes);
        var resultado = resumidor.resumir(mensajes);

        return transacciones.execute(tx -> {
            Canal canal = obtenerVisible(canalId, usuarioId);
            ResumenChat resumen = new ResumenChat();
            resumen.setCanal(canal);
            resumen.setContenido(resultado.contenido());
            resumen.setPuntosClave(String.join("\n", resultado.puntosClave()));
            resumen.setMensajesResumidos(mensajes.size());
            resumen.setDesdeMensajeId(mensajes.get(0).id());
            resumen.setHastaMensajeId(mensajes.get(mensajes.size() - 1).id());
            resumen.setModelo(resultado.modelo());
            return mapper.aDTO(resumenRepository.save(resumen));
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResumenChatDTO> historialResumenes(Long canalId, Long usuarioId) {
        obtenerVisible(canalId, usuarioId);
        return resumenRepository.findByCanalIdOrderByFechaGeneracionDescIdDesc(canalId)
                .stream().map(mapper::aDTO).toList();
    }

    private Canal obtenerVisible(Long canalId, Long usuarioId) {
        Canal canal = canalRepository.findById(canalId)
                .orElseThrow(() -> new RecursoNoEncontradoException("canal", canalId));
        if (canal.getProyecto() != null) {
            verificarProyecto(canal.getProyecto(), usuarioId);
        } else if (canal.getCreador() == null || !usuarioId.equals(canal.getCreador().getId())) {
            throw new RecursoNoEncontradoException("canal", canalId);
        }
        return canal;
    }

    private void verificarProyecto(Proyecto proyecto, Long usuarioId) {
        if (!proyecto.participa(usuarioId)) throw new RecursoNoEncontradoException("proyecto", proyecto.getCodigo());
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
}
