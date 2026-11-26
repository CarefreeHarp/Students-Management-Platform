package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.HorarioMapper;
import com.studyflow.platform.model.dto.DetalleHorario;
import com.studyflow.platform.model.dto.HorarioDTO;
import com.studyflow.platform.model.dto.MateriaDTO;
import com.studyflow.platform.model.dto.PeticionGenerarHorario;
import com.studyflow.platform.model.dto.PeticionMateria;
import com.studyflow.platform.model.entity.BloqueHorario;
import com.studyflow.platform.model.entity.Horario;
import com.studyflow.platform.model.entity.Materia;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.DiaSemana;
import com.studyflow.platform.repository.HorarioRepository;
import com.studyflow.platform.repository.MateriaRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.service.HorarioService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/** Planificador de secciones y persistencia de las alternativas de cada estudiante. */
@Service
@Transactional
public class HorarioServiceImpl implements HorarioService {

    private final MateriaRepository materiaRepository;
    private final HorarioRepository horarioRepository;
    private final UsuarioRepository usuarios;
    private final HorarioMapper horarioMapper;
    private final GeneradorHorariosGemini gemini;
    private final TransactionTemplate transacciones;

    public HorarioServiceImpl(MateriaRepository materiaRepository,
                              HorarioRepository horarioRepository,
                              UsuarioRepository usuarios, HorarioMapper horarioMapper,
                              GeneradorHorariosGemini gemini, TransactionTemplate transacciones) {
        this.materiaRepository = materiaRepository;
        this.horarioRepository = horarioRepository;
        this.usuarios = usuarios;
        this.horarioMapper = horarioMapper;
        this.gemini = gemini;
        this.transacciones = transacciones;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MateriaDTO> listarMaterias(Long usuarioId) {
        return horarioMapper.aMateriaDTO(materiaRepository.findByUsuarioIdOrderByNombreAsc(usuarioId));
    }

    @Override
    public MateriaDTO agregarMateria(Long usuarioId, PeticionMateria peticion) {
        LocalTime inicio = LocalTime.parse(peticion.horaInicio());
        LocalTime fin = LocalTime.parse(peticion.horaFin());
        if (!inicio.isBefore(fin)) {
            throw new IllegalArgumentException("La hora de finalización debe ser posterior a la de inicio.");
        }

        Usuario usuario = bloquearUsuario(usuarioId);
        List<Materia> existentes = materiaRepository.findByUsuarioIdOrderByNombreAsc(usuarioId);
        Materia materia = new Materia();
        materia.setUsuario(usuario);
        materia.setNombre(peticion.nombre().trim());
        materia.setCodigo(peticion.codigo());
        materia.setProfesor(peticion.profesor());
        materia.setCreditos(peticion.creditos() != null ? peticion.creditos() : 3);
        materia.setIndiceColor(existentes.size() % 6);
        materia.agregarBloque(new BloqueHorario(DiaSemana.desdeClave(peticion.dia()), inicio, fin, peticion.aula()));
        return horarioMapper.aDTO(materiaRepository.save(materia));
    }

    @Override
    public void eliminarMateria(Long usuarioId, Long materiaId) {
        bloquearUsuario(usuarioId);
        Materia materia = materiaRepository.findByIdAndUsuarioId(materiaId, usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("materia", materiaId));
        horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId)
                .forEach(horario -> horario.getMaterias().remove(materia));
        materiaRepository.delete(materia);
    }

    @Override
    public void limpiarMaterias(Long usuarioId) {
        bloquearUsuario(usuarioId);
        horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId)
                .forEach(horario -> horario.getMaterias().clear());
        materiaRepository.deleteByUsuarioId(usuarioId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HorarioDTO> listarAlternativas(Long usuarioId) {
        return horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId)
                .stream().map(horarioMapper::aDTO).toList();
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public List<HorarioDTO> generarAlternativas(Long usuarioId, PeticionGenerarHorario borrador) {
        // El cliente anterior enviaba la petición sin cuerpo y usaba sus materias de la base.
        List<MateriaDTO> registradas = borrador == null
                ? transacciones.execute(tx -> listarMaterias(usuarioId)) : List.of();
        var oferta = borrador == null ? PeticionGenerarHorario.desdeRegistradas(registradas) : borrador;
        var propuestas = gemini.generar(oferta);

        // La espera de red ocurre fuera de la transacción que reemplaza las alternativas.
        return transacciones.execute(tx -> {
            Usuario usuario = bloquearUsuario(usuarioId);
            if (borrador == null && !registradas.equals(listarMaterias(usuarioId))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Tus materias cambiaron durante la generación. Vuelve a generar el horario.");
            }
            var anteriores = horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId);
            var guardado = anteriores.stream().filter(Horario::isSeleccionado).findFirst();
            horarioRepository.deleteAll(anteriores.stream().filter(h -> !h.isSeleccionado()).toList());
            List<HorarioDTO> generados = new ArrayList<>();
            for (var propuesta : propuestas) {
                var detalle = armarDetalle(oferta, propuesta.opciones(), registradas);
                var horario = guardado.filter(h -> detalle.equals(h.getDetalleSecciones())).orElseGet(Horario::new);
                horario.setUsuario(usuario);
                horario.setNombre(propuesta.nombre());
                horario.setDescripcion(propuesta.descripcion());
                horario.setTipo("gemini");
                horario.setGeneradoPorIa(true);
                horario.setDetalleSecciones(detalle);
                horario.setTotalCreditos(detalle.materias().stream().mapToInt(MateriaDTO::creditos).sum());
                horario.setPuntaje((int) Math.round(100.0 * detalle.materias().size() / oferta.materias().size()));
                if (borrador == null) {
                    detalle.materias().forEach(m -> horario.getMaterias().add(materiaRepository.getReferenceById(m.id())));
                }
                generados.add(horarioMapper.aDTO(horarioRepository.save(horario)));
            }
            return generados;
        });
    }

    private DetalleHorario armarDetalle(PeticionGenerarHorario oferta, List<Integer> opciones,
                                         List<MateriaDTO> registradas) {
        List<MateriaDTO> incluidas = new ArrayList<>();
        List<String> omitidas = new ArrayList<>();
        for (int i = 0; i < oferta.materias().size(); i++) {
            var materia = oferta.materias().get(i);
            int opcion = opciones.get(i);
            if (opcion == 0) {
                omitidas.add(materia.nombre());
            } else if (registradas.isEmpty()) {
                var bloques = materia.opciones().get(opcion - 1).stream().map(PeticionGenerarHorario.Franja::aBloque).toList();
                incluidas.add(new MateriaDTO(null, materia.nombre(), null, null, materia.creditos(), i % 6, bloques, opcion));
            } else {
                var original = registradas.get(i);
                incluidas.add(new MateriaDTO(original.id(), original.nombre(), original.codigo(), original.profesor(),
                        materia.creditos(), original.indiceColor(), original.bloques(), opcion));
            }
        }
        return new DetalleHorario(incluidas, omitidas);
    }

    @Override
    public HorarioDTO guardarManual(Long usuarioId, PeticionGenerarHorario borrador) {
        borrador.validarFranjas();
        var franjas = new ArrayList<PeticionGenerarHorario.Franja>();
        for (var materia : borrador.materias()) {
            if (materia.opciones().size() != 1) {
                throw new IllegalArgumentException("Elige una sección por materia para guardar tu horario.");
            }
            var seccion = materia.opciones().get(0);
            if (seccion.stream().anyMatch(f -> franjas.stream().anyMatch(f::chocaCon))) {
                throw new IllegalArgumentException("Corrige los cruces antes de guardar tu horario.");
            }
            franjas.addAll(seccion);
        }
        Usuario usuario = bloquearUsuario(usuarioId);
        var anteriores = horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId);
        var horario = anteriores.stream().filter(h -> "manual".equals(h.getTipo())).findFirst().orElseGet(Horario::new);
        anteriores.forEach(h -> h.setSeleccionado(false));
        var detalle = armarDetalle(borrador, java.util.Collections.nCopies(borrador.materias().size(), 1), List.of());
        horario.setUsuario(usuario);
        horario.setNombre("Mi horario");
        horario.setTipo("manual");
        horario.setSeleccionado(true);
        horario.setDetalleSecciones(detalle);
        horario.setTotalCreditos(detalle.materias().stream().mapToInt(MateriaDTO::creditos).sum());
        horario.setPuntaje(100);
        return horarioMapper.aDTO(horarioRepository.save(horario));
    }

    @Override
    public HorarioDTO seleccionar(Long usuarioId, Long horarioId) {
        bloquearUsuario(usuarioId);
        var alternativas = horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId);
        var elegido = alternativas.stream().filter(h -> h.getId().equals(horarioId)).findFirst()
                .orElseThrow(() -> new RecursoNoEncontradoException("horario", horarioId));
        alternativas.forEach(h -> h.setSeleccionado(h == elegido));
        return horarioMapper.aDTO(elegido);
    }

    private Usuario bloquearUsuario(Long usuarioId) {
        return usuarios.bloquearPorId(usuarioId).orElseThrow(() -> new RecursoNoEncontradoException("usuario", usuarioId));
    }
}
