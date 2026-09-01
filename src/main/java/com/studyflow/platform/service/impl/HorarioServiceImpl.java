package com.studyflow.platform.service.impl;

import com.studyflow.platform.exception.RecursoNoEncontradoException;
import com.studyflow.platform.mapper.HorarioMapper;
import com.studyflow.platform.model.dto.HorarioDTO;
import com.studyflow.platform.model.dto.MateriaDTO;
import com.studyflow.platform.model.dto.PeticionMateria;
import com.studyflow.platform.model.entity.BloqueHorario;
import com.studyflow.platform.model.entity.Horario;
import com.studyflow.platform.model.entity.Materia;
import com.studyflow.platform.model.enums.DiaSemana;
import com.studyflow.platform.repository.HorarioRepository;
import com.studyflow.platform.repository.MateriaRepository;
import com.studyflow.platform.service.HorarioService;
import com.studyflow.platform.service.UsuarioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Implementacion del planificador de horarios.
 * La "generacion con IA" es una simulacion: ordena las materias segun tres
 * criterios (manana, tarde y jornada compacta) y descarta los choques de horas.
 */
@Service
@Transactional
public class HorarioServiceImpl implements HorarioService {

    private record Criterio(String nombre, String tipo, String descripcion, Comparator<Materia> orden) {
    }

    private final MateriaRepository materiaRepository;
    private final HorarioRepository horarioRepository;
    private final UsuarioService usuarioService;
    private final HorarioMapper horarioMapper;

    public HorarioServiceImpl(MateriaRepository materiaRepository,
                              HorarioRepository horarioRepository,
                              UsuarioService usuarioService,
                              HorarioMapper horarioMapper) {
        this.materiaRepository = materiaRepository;
        this.horarioRepository = horarioRepository;
        this.usuarioService = usuarioService;
        this.horarioMapper = horarioMapper;
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

        List<Materia> existentes = materiaRepository.findByUsuarioIdOrderByNombreAsc(usuarioId);
        Materia materia = new Materia();
        materia.setUsuario(usuarioService.obtenerPorId(usuarioId));
        materia.setNombre(peticion.nombre().trim());
        materia.setCodigo(peticion.codigo());
        materia.setProfesor(peticion.profesor());
        materia.setCreditos(peticion.creditos() != null ? peticion.creditos() : 3);
        materia.setIndiceColor(existentes.size() % 6);
        materia.agregarBloque(new BloqueHorario(DiaSemana.desdeClave(peticion.dia()), inicio, fin, peticion.aula()));
        return horarioMapper.aDTO(materiaRepository.save(materia));
    }

    @Override
    public void eliminarMateria(Long materiaId) {
        Materia materia = materiaRepository.findById(materiaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("materia", materiaId));
        materiaRepository.delete(materia);
    }

    @Override
    public void limpiarMaterias(Long usuarioId) {
        materiaRepository.deleteByUsuarioId(usuarioId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HorarioDTO> listarAlternativas(Long usuarioId) {
        return horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId)
                .stream().map(horarioMapper::aDTO).toList();
    }

    @Override
    public List<HorarioDTO> generarAlternativas(Long usuarioId) {
        List<Materia> materias = materiaRepository.findByUsuarioIdOrderByNombreAsc(usuarioId);
        if (materias.isEmpty()) {
            throw new IllegalArgumentException("Registra al menos una materia antes de generar alternativas.");
        }

        List<Criterio> criterios = List.of(
                new Criterio("Mañanas libres", "equilibrado",
                        "Concentra las clases después del mediodía para dejar la mañana disponible.",
                        Comparator.comparing(m -> primeraHora(m), Comparator.reverseOrder())),
                new Criterio("Jornada temprana", "madrugador",
                        "Agrupa las materias al inicio del día y libera las tardes.",
                        Comparator.comparing(HorarioServiceImpl::primeraHora)),
                new Criterio("Carga compacta", "compacto",
                        "Prioriza las materias con más créditos para avanzar el semestre.",
                        Comparator.comparing((Materia m) -> m.getCreditos() == null ? 0 : m.getCreditos()).reversed())
        );

        horarioRepository.deleteAll(horarioRepository.findByUsuarioIdOrderByPuntajeDesc(usuarioId));

        List<Horario> generados = new ArrayList<>();
        for (Criterio criterio : criterios) {
            List<Materia> ordenadas = new ArrayList<>(materias);
            ordenadas.sort(criterio.orden());

            Horario horario = new Horario();
            horario.setUsuario(usuarioService.obtenerPorId(usuarioId));
            horario.setNombre(criterio.nombre());
            horario.setTipo(criterio.tipo());
            horario.setDescripcion(criterio.descripcion());
            horario.setGeneradoPorIa(true);

            int creditos = 0;
            for (Materia candidata : ordenadas) {
                if (chocaCon(horario, candidata)) {
                    continue;
                }
                horario.getMaterias().add(candidata);
                creditos += candidata.getCreditos() == null ? 0 : candidata.getCreditos();
            }
            horario.setTotalCreditos(creditos);
            // Puntaje simple: cobertura de materias sin choques sobre el total disponible.
            horario.setPuntaje((int) Math.round(horario.getMaterias().size() * 100.0 / materias.size()));
            generados.add(horarioRepository.save(horario));
        }
        return generados.stream().map(horarioMapper::aDTO).toList();
    }

    @Override
    public HorarioDTO seleccionar(Long horarioId) {
        Horario horario = horarioRepository.findById(horarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("horario", horarioId));
        horarioRepository.findByUsuarioIdOrderByPuntajeDesc(horario.getUsuario().getId())
                .forEach(otro -> otro.setSeleccionado(false));
        horario.setSeleccionado(true);
        return horarioMapper.aDTO(horario);
    }

    /** Comprueba si la materia candidata se cruza con algo ya incluido en el horario. */
    private boolean chocaCon(Horario horario, Materia candidata) {
        return horario.getMaterias().stream()
                .flatMap(materia -> materia.getBloques().stream())
                .anyMatch(bloque -> candidata.getBloques().stream().anyMatch(bloque::chocaCon));
    }

    private static LocalTime primeraHora(Materia materia) {
        return materia.getBloques().stream()
                .map(BloqueHorario::getHoraInicio)
                .min(Comparator.naturalOrder())
                .orElse(LocalTime.of(7, 0));
    }
}
