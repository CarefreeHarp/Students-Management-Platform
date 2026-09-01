package com.studyflow.platform.controller.view;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Capa Controlador de la Vista: resuelve las rutas de navegacion y devuelve
 * la plantilla Thymeleaf correspondiente. Las paginas se hidratan por ahora
 * desde la capa de datos del navegador (main.js); cuando la API se conecte,
 * este mismo controlador podra inyectar los datos en el modelo.
 */
@Controller
public class PaginaController {

    @GetMapping("/")
    public String panel() {
        return "index";
    }

    @GetMapping("/login")
    public String iniciarSesion() {
        return "login";
    }

    @GetMapping("/registro")
    public String registro() {
        return "registro";
    }

    @GetMapping("/perfil")
    public String perfil() {
        return "perfil";
    }

    @GetMapping("/perfil/editar")
    public String editarPerfil() {
        return "editar-perfil";
    }

    @GetMapping("/proyectos")
    public String proyectos() {
        return "proyectos";
    }

    @GetMapping("/proyectos/nuevo")
    public String crearProyecto() {
        return "crear-proyecto";
    }

    /** Espacio de trabajo de un proyecto. El codigo viaja a la vista como data-project-id. */
    @GetMapping("/proyectos/{codigo}")
    public String proyecto(@PathVariable String codigo, Model model) {
        model.addAttribute("projectId", codigo);
        return "proyecto";
    }

    @GetMapping("/horarios")
    public String horarios() {
        return "crear-horario";
    }
}
