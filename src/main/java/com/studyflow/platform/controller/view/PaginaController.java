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

    private final com.studyflow.platform.service.SesionService sesionService;

    public PaginaController(com.studyflow.platform.service.SesionService sesionService) {
        this.sesionService = sesionService;
    }

    /**
     * Devuelve la vista solo si hay sesión; si no, lleva al acceso.
     *
     * <p>Sin esta comprobación las páginas cargaban y sus llamadas a la API
     * actuaban en nombre del usuario sembrado, atribuyéndole acciones ajenas.</p>
     */
    private String conSesion(String vista) {
        return sesionService.haySesionIniciada() ? vista : "redirect:/login";
    }

    @GetMapping("/")
    public String landing() {
        return "landing";
    }

    @GetMapping("/panel")
    public String panel() {
        return conSesion("index");
    }

    @GetMapping("/login")
    public String iniciarSesion() {
        return "login";
    }

    @GetMapping("/registro")
    public String registro() {
        return "registro";
    }

    /**
     * Guía de estilo: colores, sombras, redondeos y tipografías.
     *
     * <p>No pide sesión a proposito. No muestra datos de ningun usuario y sirve
     * de referencia mientras se maqueta, tambien con la sesion cerrada.</p>
     */
    @GetMapping("/paleta")
    public String paleta() {
        return "paleta";
    }

    @GetMapping("/perfil")
    public String perfil() {
        return conSesion("perfil");
    }

    @GetMapping("/perfil/editar")
    public String editarPerfil() {
        return conSesion("editar-perfil");
    }

    @GetMapping("/proyectos")
    public String proyectos() {
        return conSesion("proyectos");
    }

    @GetMapping("/proyectos/nuevo")
    public String crearProyecto() {
        return conSesion("crear-proyecto");
    }

    /** Espacio de trabajo de un proyecto. El codigo viaja a la vista como data-project-id. */
    @GetMapping("/proyectos/{codigo}")
    public String proyecto(@PathVariable String codigo, Model model) {
        model.addAttribute("projectId", codigo);
        return conSesion("proyecto");
    }

    @GetMapping("/horarios")
    public String horarios() {
        return conSesion("crear-horario");
    }

    /** Configuración de recordatorios por WhatsApp y apuntes de clase. */
    @GetMapping("/recordatorios")
    public String recordatorios() {
        return conSesion("recordatorios");
    }

    /** Listado de canales agrupados por proyecto. */
    @GetMapping("/chats")
    public String chats() {
        return conSesion("chats");
    }

    /** Espacio de canales de un proyecto. */
    @GetMapping("/proyectos/{codigo}/canales")
    public String canales(@PathVariable String codigo, Model model) {
        model.addAttribute("projectId", codigo);
        return conSesion("canales");
    }

    /** Diagrama de fases y reparto de tareas. */
    @GetMapping("/proyectos/{codigo}/fases")
    public String fases(@PathVariable String codigo, Model model) {
        model.addAttribute("projectId", codigo);
        return conSesion("fases");
    }

    /** Registro de documentos y entregables del trabajo grupal. */
    @GetMapping("/proyectos/{codigo}/entregables")
    public String entregables(@PathVariable String codigo, Model model) {
        model.addAttribute("projectId", codigo);
        return conSesion("entregables");
    }
}
