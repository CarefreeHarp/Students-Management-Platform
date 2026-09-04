package com.studyflow.platform;

import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

/** Comprobaciones basicas de arranque, navegacion y datos iniciales. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class StudyFlowApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private ProyectoService proyectoService;

    @Autowired
    private com.studyflow.platform.service.SesionService sesionService;

    /**
     * Sin sesión no hay identidad: la aplicación ya no actúa en nombre del
     * usuario sembrado. Cada prueba entra con la cuenta de ejemplo.
     */
    @BeforeEach
    void entrarComoEjemplo() {
        sesionService.entrarComoDemostracion();
    }

    @Test
    void elContextoArranca() {
        assertThat(usuarioService.obtenerActual()).isNotNull();
    }

    /** Abre una sesión de navegador para las pruebas que pasan por MockMvc. */
    private MockHttpSession sesionDeNavegador() throws Exception {
        MockHttpSession sesion = new MockHttpSession();
        mockMvc.perform(post("/api/sesion/demostracion").session(sesion))
                .andExpect(status().isOk());
        return sesion;
    }

    @Test
    void lasPaginasDeAccesoNoPidenSesion() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isOk()).andExpect(view().name("login"));
        mockMvc.perform(get("/registro")).andExpect(status().isOk()).andExpect(view().name("registro"));
    }

    @Test
    void lasPaginasPrincipalesResponden() throws Exception {
        MockHttpSession sesion = sesionDeNavegador();
        mockMvc.perform(get("/proyectos").session(sesion)).andExpect(status().isOk()).andExpect(view().name("proyectos"));
        mockMvc.perform(get("/horarios").session(sesion)).andExpect(status().isOk()).andExpect(view().name("crear-horario"));
        mockMvc.perform(get("/recordatorios").session(sesion)).andExpect(status().isOk()).andExpect(view().name("recordatorios"));
        mockMvc.perform(get("/proyectos/cognitiva/canales").session(sesion)).andExpect(status().isOk()).andExpect(view().name("canales"));
        mockMvc.perform(get("/proyectos/cognitiva/fases").session(sesion)).andExpect(status().isOk()).andExpect(view().name("fases"));
        mockMvc.perform(get("/proyectos/cognitiva/entregables").session(sesion)).andExpect(status().isOk()).andExpect(view().name("entregables"));
    }

    @Test
    void sinSesionLasPaginasLlevanAlAcceso() throws Exception {
        // Antes cargaban y sus llamadas a la API actuaban como el usuario sembrado.
        for (String ruta : new String[]{"/", "/proyectos", "/horarios", "/recordatorios",
                                        "/proyectos/cognitiva", "/proyectos/cognitiva/fases"}) {
            mockMvc.perform(get(ruta))
                    .andExpect(status().is3xxRedirection())
                    .andExpect(redirectedUrl("/login"));
        }
    }

    @Test
    void sinSesionLaApiRespondeNoAutorizado() throws Exception {
        // La causa de que una tarea tomada quedara a nombre de otra persona.
        mockMvc.perform(get("/api/proyectos")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/tareas/1/reclamar")).andExpect(status().isUnauthorized());
    }

    @Test
    void laRaizLlevaAlAccesoMientrasNoHaySesion() throws Exception {
        // Entrar por la raíz sin haber accedido debe ofrecer la pantalla de acceso,
        // no el panel con los datos de otra persona.
        mockMvc.perform(get("/"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    void laRaizMuestraElPanelConSesionIniciada() throws Exception {
        MockHttpSession sesion = new MockHttpSession();
        mockMvc.perform(post("/api/sesion/entrar")
                        .session(sesion)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Prueba Acceso\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/").session(sesion))
                .andExpect(status().isOk())
                .andExpect(view().name("index"));
    }

    @Test
    void entrarConSoloElNombreNoRompeLaValidacion() throws Exception {
        // El apellido era obligatorio en la entidad y un nombre de una sola
        // palabra reventaba con un error de validación de Hibernate.
        mockMvc.perform(post("/api/sesion/entrar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Cher\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void unCorreoRepetidoDevuelveUnMensajeLegible() throws Exception {
        String cuerpo = "{\"firstName\":\"Valentina\",\"lastName\":\"Rojas\","
                + "\"email\":\"valentina.rojas@universidad.edu.co\",\"password\":\"123456\"}";
        mockMvc.perform(post("/api/usuarios/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("Ya existe una cuenta")));
    }

    @Test
    void unaCuentaNuevaNoVeLosProyectosDeOtraPersona() {
        // Al arreglar las sesiones, entrar con un nombre pasa a crear una cuenta
        // propia. Ver los proyectos ajenos sería una fuga de datos entre usuarios.
        var recienLlegado = sesionService.accesoRapido("Persona Nueva", "persona.nueva@u.edu");
        assertThat(proyectoService.listarDeUsuario(recienLlegado.getId())).isEmpty();
    }

    @Test
    void laCuentaDeEjemploSiTieneLosProyectosSembrados() {
        var demo = sesionService.entrarComoDemostracion();
        assertThat(demo.getNombreCompleto()).isEqualTo("Valentina Rojas");
        assertThat(proyectoService.listarDeUsuario(demo.getId())).hasSize(3);
    }

    @Test
    void losDatosDeDemostracionSeCargan() {
        var proyectos = proyectoService.listarDeUsuario(usuarioService.obtenerActual().getId());
        assertThat(proyectos).hasSize(3);
        // Cognitiva tiene 4 tareas y una completada: 25 % de avance.
        assertThat(proyectos)
                .filteredOn(proyecto -> proyecto.codigo().equals("cognitiva"))
                .singleElement()
                .satisfies(proyecto -> assertThat(proyecto.progreso()).isEqualTo(25));
    }

    @Test
    void laApiDeProyectosDevuelveJson() throws Exception {
        MockHttpSession sesion = sesionDeNavegador();
        mockMvc.perform(get("/api/proyectos").session(sesion)).andExpect(status().isOk());
        mockMvc.perform(get("/api/usuarios/actual").session(sesion)).andExpect(status().isOk());
    }
}
