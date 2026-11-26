package com.studyflow.platform.controller.api;

import com.studyflow.platform.service.FlowService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flow")
public class FlowApiController {
    private final FlowService flow;

    public FlowApiController(FlowService flow) {
        this.flow = flow;
    }

    public record Personalizacion(String color) {}

    @GetMapping
    public FlowService.Mascota consultar() {
        return flow.consultar();
    }

    @PutMapping
    public FlowService.Mascota personalizar(@RequestBody Personalizacion personalizacion) {
        return flow.cambiarColor(personalizacion.color());
    }
}
