package com.studyflow.platform.controller.api;

import com.studyflow.platform.model.dto.AgendaDTO;
import com.studyflow.platform.service.AgendaService;
import com.studyflow.platform.service.SesionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AgendaApiController {
    private final AgendaService agenda;
    private final SesionService sesion;

    public AgendaApiController(AgendaService agenda, SesionService sesion) {
        this.agenda = agenda;
        this.sesion = sesion;
    }

    @GetMapping("/api/agenda")
    public AgendaDTO consultar() {
        return agenda.consultar(sesion.usuarioActualId());
    }
}
