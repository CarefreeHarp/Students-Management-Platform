package com.studyflow.platform.controller.view;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** Public, data-free views. The sandbox API and its state exist only in browser RAM. */
@Controller
public class SandboxController {
    @GetMapping("/sandbox")
    public String sandbox() { return "sandbox"; }

    @GetMapping("/sandbox/vista")
    public String vista(@RequestParam(defaultValue = "/panel") String ruta, Model model, HttpServletResponse response) {
        response.setHeader("Content-Security-Policy", "connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'");
        response.setHeader("Cache-Control", "no-store");
        model.addAttribute("sandbox", true);
        Map<String, String> views = Map.of("/panel", "index", "/proyectos", "proyectos",
            "/proyectos/nuevo", "crear-proyecto", "/horarios", "crear-horario",
            "/recordatorios", "recordatorios", "/perfil", "perfil", "/perfil/editar", "editar-perfil");
        if (views.containsKey(ruta)) return views.get(ruta);
        if (ruta.matches("/proyectos/[a-zA-Z0-9_-]+(?:/(?:fases|canales|entregables))?")) {
            String[] parts = ruta.split("/");
            model.addAttribute("projectId", parts[2]);
            return parts.length == 4 ? parts[3] : "proyecto";
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
