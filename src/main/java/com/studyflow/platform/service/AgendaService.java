package com.studyflow.platform.service;

import com.studyflow.platform.mapper.HorarioMapper;
import com.studyflow.platform.model.dto.AgendaDTO;
import com.studyflow.platform.repository.EntregableRepository;
import com.studyflow.platform.repository.HorarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgendaService {
    private final HorarioRepository horarios;
    private final HorarioMapper horarioMapper;
    private final EntregableRepository entregables;

    public AgendaService(HorarioRepository horarios, HorarioMapper horarioMapper, EntregableRepository entregables) {
        this.horarios = horarios;
        this.horarioMapper = horarioMapper;
        this.entregables = entregables;
    }

    @Transactional(readOnly = true)
    public AgendaDTO consultar(Long usuarioId) {
        var horario = horarios.findFirstByUsuarioIdAndSeleccionadoTrueOrderByIdDesc(usuarioId)
                .map(horarioMapper::aDTO).orElse(null);
        var entregas = entregables.findConVencimientoDeUsuario(usuarioId).stream().map(e -> {
            var tarea = e.getTarea();
            boolean usaTarea = e.getFechaLimite() == null;
            var fecha = usaTarea ? tarea.getFechaLimite() : e.getFechaLimite();
            var hora = usaTarea ? tarea.getHoraLimite() : null;
            return new AgendaDTO.Entrega(e.getId(), e.getNombre(), e.getProyecto().getCodigo(),
                    fecha, hora, e.getEstado().getEtiqueta());
        }).toList();
        return new AgendaDTO(horario, entregas);
    }
}
