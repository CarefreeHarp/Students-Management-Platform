package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.RecordatorioMapper;
import com.studyflow.platform.model.dto.PeticionPreferenciaRecordatorio;
import com.studyflow.platform.model.dto.PreferenciaRecordatorioDTO;
import com.studyflow.platform.model.dto.RecordatorioDTO;
import com.studyflow.platform.model.entity.*;
import com.studyflow.platform.model.enums.CanalRecordatorio;
import com.studyflow.platform.model.enums.EstadoRecordatorio;
import com.studyflow.platform.model.enums.EstadoTarea;
import com.studyflow.platform.model.enums.TipoRecordatorio;
import com.studyflow.platform.repository.ApunteClaseRepository;
import com.studyflow.platform.repository.PreferenciaRecordatorioRepository;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.repository.RecordatorioRepository;
import com.studyflow.platform.service.PasarelaMensajeria;
import com.studyflow.platform.service.RecordatorioService;
import com.studyflow.platform.service.UsuarioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Programacion y entrega de recordatorios.
 *
 * <p>La agenda se recalcula por completo cada vez que cambian las preferencias:
 * se cancelan los avisos pendientes y se vuelven a crear a partir de las tres
 * fuentes (tareas, entregas de proyecto y apuntes de clase) aplicando la
 * antelacion configurada para cada tipo.</p>
 */
@Service
@Transactional
public class RecordatorioServiceImpl implements RecordatorioService {

    private static final Logger log = LoggerFactory.getLogger(RecordatorioServiceImpl.class);
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("d 'de' MMMM");
    /** Hora a la que se considera que vence algo sin hora concreta. */
    private static final LocalTime HORA_POR_DEFECTO = LocalTime.of(9, 0);
    /** Tope de reintentos antes de marcar el recordatorio como fallido. */
    private static final int MAX_INTENTOS = 3;

    private final PreferenciaRecordatorioRepository preferenciaRepository;
    private final RecordatorioRepository recordatorioRepository;
    private final ProyectoRepository proyectoRepository;
    private final ApunteClaseRepository apunteRepository;
    private final UsuarioService usuarioService;
    private final PasarelaMensajeria pasarela;
    private final RecordatorioMapper mapper;

    public RecordatorioServiceImpl(PreferenciaRecordatorioRepository preferenciaRepository,
                                   RecordatorioRepository recordatorioRepository,
                                   ProyectoRepository proyectoRepository,
                                   ApunteClaseRepository apunteRepository,
                                   UsuarioService usuarioService,
                                   PasarelaMensajeria pasarela,
                                   RecordatorioMapper mapper) {
        this.preferenciaRepository = preferenciaRepository;
        this.recordatorioRepository = recordatorioRepository;
        this.proyectoRepository = proyectoRepository;
        this.apunteRepository = apunteRepository;
        this.usuarioService = usuarioService;
        this.pasarela = pasarela;
        this.mapper = mapper;
    }

    // ---------------------------------------------------------------- preferencias

    @Override
    public PreferenciaRecordatorioDTO obtenerPreferencias(Long usuarioId) {
        return mapper.aDTO(preferenciaDe(usuarioId), pasarela.estaConectada());
    }

    @Override
    public PreferenciaRecordatorioDTO guardarPreferencias(Long usuarioId, PeticionPreferenciaRecordatorio peticion) {
        PreferenciaRecordatorio preferencia = preferenciaDe(usuarioId);
        if (peticion.canal() != null && !peticion.canal().isBlank()) {
            preferencia.setCanal(CanalRecordatorio.valueOf(peticion.canal().toUpperCase()));
        }
        if (peticion.telefonoWhatsapp() != null) {
            preferencia.setTelefonoWhatsapp(peticion.telefonoWhatsapp().replaceAll("[^0-9]", ""));
        }
        if (peticion.activo() != null) {
            preferencia.setActivo(peticion.activo());
        }
        if (peticion.minutosAntesTarea() != null) {
            preferencia.setMinutosAntesTarea(peticion.minutosAntesTarea());
        }
        if (peticion.minutosAntesEntrega() != null) {
            preferencia.setMinutosAntesEntrega(peticion.minutosAntesEntrega());
        }
        if (peticion.minutosAntesApunte() != null) {
            preferencia.setMinutosAntesApunte(peticion.minutosAntesApunte());
        }
        if (peticion.silencioDesde() != null && !peticion.silencioDesde().isBlank()) {
            preferencia.setSilencioDesde(LocalTime.parse(peticion.silencioDesde()));
        }
        if (peticion.silencioHasta() != null && !peticion.silencioHasta().isBlank()) {
            preferencia.setSilencioHasta(LocalTime.parse(peticion.silencioHasta()));
        }
        // Cambiar la antelacion obliga a recalcular todos los avisos ya programados.
        reprogramarTodo(usuarioId);
        return mapper.aDTO(preferencia, pasarela.estaConectada());
    }

    // ---------------------------------------------------------------- programacion

    @Override
    @Transactional(readOnly = true)
    public List<RecordatorioDTO> listar(Long usuarioId) {
        return recordatorioRepository.findByUsuarioIdOrderByFechaHoraAsc(usuarioId)
                .stream().map(mapper::aDTO).toList();
    }

    @Override
    public int reprogramarTodo(Long usuarioId) {
        Usuario usuario = usuarioService.obtenerPorId(usuarioId);
        PreferenciaRecordatorio preferencia = preferenciaDe(usuarioId);

        // Se descartan los avisos aun no enviados; los ya entregados se conservan como historial.
        recordatorioRepository.findByUsuarioIdAndEstadoOrderByFechaHoraAsc(usuarioId, EstadoRecordatorio.PROGRAMADO)
                .forEach(recordatorio -> recordatorio.setEstado(EstadoRecordatorio.CANCELADO));

        if (!preferencia.isActivo()) {
            return 0;
        }

        int programados = 0;
        LocalDate hoy = LocalDate.now();

        for (Proyecto proyecto : proyectoRepository.findParticipaUsuario(usuarioId)) {
            for (Tarea tarea : proyecto.getTareas()) {
                if (tarea.getEstado() == EstadoTarea.TERMINADA || tarea.getFechaLimite() == null
                        || tarea.getFechaLimite().isBefore(hoy)) {
                    continue;
                }
                LocalDateTime vencimiento = tarea.getFechaLimite()
                        .atTime(tarea.getHoraLimite() != null ? tarea.getHoraLimite() : HORA_POR_DEFECTO);
                crear(usuario, preferencia, TipoRecordatorio.TAREA, vencimiento,
                        tarea.getTitulo(),
                        "Tu tarea «%s» del proyecto %s vence el %s."
                                .formatted(tarea.getTitulo(), proyecto.getNombre(), vencimiento.format(FECHA)),
                        proyecto, tarea, null);
                programados++;
            }

            if (proyecto.getFechaEntrega() != null && !proyecto.getFechaEntrega().isBefore(hoy)) {
                LocalDateTime entrega = proyecto.getFechaEntrega().atTime(HORA_POR_DEFECTO);
                crear(usuario, preferencia, TipoRecordatorio.ENTREGA_PROYECTO, entrega,
                        "Entrega de " + proyecto.getNombre(),
                        "Se acerca la entrega final de «%s» (%s). Avance actual: %d%%."
                                .formatted(proyecto.getNombre(), entrega.format(FECHA), progreso(proyecto)),
                        proyecto, null, null);
                programados++;
            }
        }

        for (ApunteClase apunte : apunteRepository.findByUsuarioIdAndResueltoFalseOrderByFechaLimiteAsc(usuarioId)) {
            if (apunte.getFechaLimite() == null || apunte.getFechaLimite().isBefore(hoy)) {
                continue;
            }
            LocalDateTime vencimiento = apunte.getFechaLimite().atTime(HORA_POR_DEFECTO);
            String materia = apunte.getMateria() != null ? apunte.getMateria().getNombre() : "tus clases";
            crear(usuario, preferencia, TipoRecordatorio.APUNTE_CLASE, vencimiento,
                    apunte.getTitulo(),
                    "Pendiente de %s: «%s». Fecha límite: %s."
                            .formatted(materia, apunte.getTitulo(), vencimiento.format(FECHA)),
                    null, null, apunte);
            programados++;
        }

        log.debug("Recordatorios reprogramados para el usuario {}: {}", usuarioId, programados);
        return programados;
    }

    /** Crea el aviso restando la antelacion y respetando la franja de silencio. */
    private void crear(Usuario usuario, PreferenciaRecordatorio preferencia, TipoRecordatorio tipo,
                       LocalDateTime vencimiento, String titulo, String mensaje,
                       Proyecto proyecto, Tarea tarea, ApunteClase apunte) {
        LocalDateTime aviso = vencimiento.minusMinutes(preferencia.minutosPara(tipo));
        aviso = aplazarSiEsSilencio(preferencia, aviso);

        Recordatorio recordatorio = new Recordatorio();
        recordatorio.setUsuario(usuario);
        recordatorio.setTipo(tipo);
        recordatorio.setCanal(preferencia.getCanal());
        recordatorio.setTitulo(titulo);
        recordatorio.setMensaje(mensaje);
        recordatorio.setFechaHora(aviso);
        recordatorio.setFechaVencimiento(vencimiento);
        recordatorio.setProyecto(proyecto);
        recordatorio.setTarea(tarea);
        recordatorio.setApunte(apunte);
        recordatorioRepository.save(recordatorio);
    }

    /**
     * Si el aviso cae en la franja de silencio, se mueve al final de esa franja.
     * Nunca se adelanta un aviso: si eso lo dejara despues del vencimiento, se
     * mantiene la hora original para no llegar tarde.
     */
    private LocalDateTime aplazarSiEsSilencio(PreferenciaRecordatorio preferencia, LocalDateTime aviso) {
        if (!preferencia.enSilencio(aviso.toLocalTime())) {
            return aviso;
        }
        LocalTime fin = preferencia.getSilencioHasta();
        // Si el aviso cae de madrugada, el silencio termina ese mismo día;
        // si cae de noche, hay que esperar a la mañana siguiente.
        return aviso.toLocalTime().isBefore(fin)
                ? aviso.toLocalDate().atTime(fin)
                : aviso.toLocalDate().plusDays(1).atTime(fin);
    }

    // ---------------------------------------------------------------- envio

    @Override
    public RecordatorioDTO enviarAhora(Long recordatorioId) {
        Recordatorio recordatorio = recordatorioRepository.findById(recordatorioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("recordatorio", recordatorioId));
        entregar(recordatorio);
        return mapper.aDTO(recordatorio);
    }

    @Override
    public String enviarPrueba(Long usuarioId) {
        PreferenciaRecordatorio preferencia = preferenciaDe(usuarioId);
        if (preferencia.getTelefonoWhatsapp() == null || preferencia.getTelefonoWhatsapp().isBlank()) {
            throw new IllegalArgumentException("Configura primero tu número de WhatsApp.");
        }
        String texto = "StudyFlow: tus recordatorios están configurados correctamente. "
                + "Recibirás avisos de tareas, entregas y pendientes de clase.";
        PasarelaMensajeria.ResultadoEnvio resultado = pasarela.enviarTexto(preferencia.getTelefonoWhatsapp(), texto);
        if (!resultado.exito()) {
            throw new IllegalArgumentException("No se pudo enviar el mensaje: " + resultado.error());
        }
        return resultado.simulado()
                ? "Mensaje de prueba simulado. Revisa la consola del servidor: aún no hay credenciales de Meta configuradas."
                : "Mensaje de prueba enviado a tu WhatsApp.";
    }

    @Override
    public void cancelar(Long recordatorioId) {
        Recordatorio recordatorio = recordatorioRepository.findById(recordatorioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("recordatorio", recordatorioId));
        recordatorio.setEstado(EstadoRecordatorio.CANCELADO);
    }

    @Override
    public int procesarPendientes() {
        List<Recordatorio> vencidos = recordatorioRepository
                .findByEstadoAndFechaHoraLessThanEqualOrderByFechaHoraAsc(
                        EstadoRecordatorio.PROGRAMADO, LocalDateTime.now());
        int enviados = 0;
        for (Recordatorio recordatorio : vencidos) {
            if (entregar(recordatorio)) {
                enviados++;
            }
        }
        return enviados;
    }

    /** Entrega un recordatorio por la pasarela y deja registrado el resultado. */
    private boolean entregar(Recordatorio recordatorio) {
        PreferenciaRecordatorio preferencia = preferenciaDe(recordatorio.getUsuario().getId());
        String telefono = preferencia.getTelefonoWhatsapp();
        recordatorio.setIntentos(recordatorio.getIntentos() + 1);

        if (telefono == null || telefono.isBlank()) {
            recordatorio.setEstado(EstadoRecordatorio.FALLIDO);
            recordatorio.setErrorEnvio("No hay un número de WhatsApp configurado.");
            return false;
        }

        PasarelaMensajeria.ResultadoEnvio resultado = pasarela.enviarTexto(telefono, componer(recordatorio));
        if (resultado.exito()) {
            recordatorio.setEstado(EstadoRecordatorio.ENVIADO);
            recordatorio.setFechaEnvio(LocalDateTime.now());
            recordatorio.setReferenciaExterna(resultado.referencia());
            recordatorio.setErrorEnvio(null);
            return true;
        }

        recordatorio.setErrorEnvio(resultado.error());
        if (recordatorio.getIntentos() >= MAX_INTENTOS) {
            recordatorio.setEstado(EstadoRecordatorio.FALLIDO);
        }
        return false;
    }

    /** Texto final que recibe el estudiante en WhatsApp. */
    private String componer(Recordatorio recordatorio) {
        return "*StudyFlow · %s*\n%s".formatted(
                recordatorio.getTipo().getEtiqueta(),
                recordatorio.getMensaje() != null ? recordatorio.getMensaje() : recordatorio.getTitulo());
    }

    // ---------------------------------------------------------------- apoyo

    private PreferenciaRecordatorio preferenciaDe(Long usuarioId) {
        return preferenciaRepository.findByUsuarioId(usuarioId)
                .orElseGet(() -> preferenciaRepository.save(
                        new PreferenciaRecordatorio(usuarioService.obtenerPorId(usuarioId))));
    }

    private int progreso(Proyecto proyecto) {
        List<Tarea> tareas = proyecto.getTareas();
        if (tareas.isEmpty()) {
            return 0;
        }
        long completadas = tareas.stream().filter(t -> t.getEstado() == EstadoTarea.TERMINADA).count();
        return (int) Math.round(completadas * 100.0 / tareas.size());
    }
}
