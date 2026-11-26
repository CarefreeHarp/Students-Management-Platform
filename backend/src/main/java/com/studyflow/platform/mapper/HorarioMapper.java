package com.studyflow.platform.mapper;

import com.studyflow.platform.model.dto.BloqueHorarioDTO;
import com.studyflow.platform.model.dto.HorarioDTO;
import com.studyflow.platform.model.dto.MateriaDTO;
import com.studyflow.platform.model.entity.BloqueHorario;
import com.studyflow.platform.model.entity.Horario;
import com.studyflow.platform.model.entity.Materia;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;

/** Traduce materias y alternativas de horario a DTO. */
@Component
public class HorarioMapper {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public MateriaDTO aDTO(Materia materia) {
        return new MateriaDTO(
                materia.getId(),
                materia.getNombre(),
                materia.getCodigo(),
                materia.getProfesor(),
                materia.getCreditos(),
                materia.getIndiceColor(),
                materia.getBloques().stream().map(this::aDTO).toList()
        );
    }

    public BloqueHorarioDTO aDTO(BloqueHorario bloque) {
        return new BloqueHorarioDTO(
                bloque.getId(),
                bloque.getDia().getClave(),
                bloque.getHoraInicio().format(HORA),
                bloque.getHoraFin().format(HORA),
                bloque.getAula()
        );
    }

    public HorarioDTO aDTO(Horario horario) {
        return new HorarioDTO(
                horario.getId(),
                horario.getNombre(),
                horario.getDescripcion(),
                horario.getTipo(),
                horario.getPuntaje(),
                horario.getTotalCreditos(),
                horario.isGeneradoPorIa(),
                horario.isSeleccionado(),
                horario.getMaterias().stream().map(this::aDTO).toList()
        );
    }

    public List<MateriaDTO> aMateriaDTO(List<Materia> materias) {
        return materias.stream().map(this::aDTO).toList();
    }
}
