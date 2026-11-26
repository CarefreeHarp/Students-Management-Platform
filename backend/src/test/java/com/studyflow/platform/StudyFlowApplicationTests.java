package com.studyflow.platform;

import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import com.studyflow.platform.security.TokensSesion;
import com.studyflow.platform.model.entity.Usuario;
import org.junit.jupiter.api.AfterEach;
import java.util.List;
import java.util.UUID;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

/** Comprobaciones basicas de arranque, navegacion y datos iniciales. */
@SpringBootTest(properties = {"studyflow.demo.enabled=true", "gemini.key="})
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class StudyFlowApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private ProyectoService proyectoService;
    @Autowired private TokensSesion tokens;

    @Autowired
    private com.studyflow.platform.service.SesionService sesionService;

    /**
     * Sin sesión no hay identidad: la aplicación ya no actúa en nombre del
     * usuario sembrado. Cada prueba entra con la cuenta de ejemplo.
     */
    @BeforeEach
    void entrarComoEjemplo() {
        autenticarPrueba(sesionService.entrarComoDemostracion());
    }

    @Test
    void elContextoArranca() {
        assertThat(usuarioService.obtenerActual()).isNotNull();
    }

    static void autenticarPrueba(Usuario usuario) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        new TokensSesion.Identidad(usuario.getId(), UUID.randomUUID(), false), null, List.of()));
    }

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    private String sesionDeNavegador() {
        return "Bearer " + tokens.iniciar(sesionService.entrarComoDemostracion(), true, null).token();
    }

    @Test
    void lasPaginasDeAccesoPertenecenAlFrontend() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isNotFound());
        mockMvc.perform(get("/registro")).andExpect(status().isNotFound());
    }

    @Test
    void lasPantallasPrivadasPertenecenAlFrontend() throws Exception {
        String sesion = sesionDeNavegador();
        mockMvc.perform(get("/proyectos").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isNotFound());
        mockMvc.perform(get("/horarios").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isNotFound());
        mockMvc.perform(get("/recordatorios").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isNotFound());
        mockMvc.perform(get("/proyectos/cognitiva/canales").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isNotFound());
        mockMvc.perform(get("/proyectos/cognitiva/fases").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isNotFound());
        mockMvc.perform(get("/proyectos/cognitiva/entregables").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isNotFound());
    }

    @Test
    void lasRutasPrivadasNoEntreganHtmlDesdeElBackend() throws Exception {
        for (String ruta : new String[]{"/panel", "/proyectos", "/horarios", "/recordatorios",
                                        "/proyectos/cognitiva", "/proyectos/cognitiva/fases"}) {
            mockMvc.perform(get(ruta))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    void sinSesionLaApiRespondeNoAutorizado() throws Exception {
        // La causa de que una tarea tomada quedara a nombre de otra persona.
        mockMvc.perform(get("/api/proyectos")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/tareas/1/reclamar")).andExpect(status().isUnauthorized());
    }

    @Test
    void laRaizDelBackendDevuelveUnErrorJson() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mockMvc.perform(get("/").header(HttpHeaders.AUTHORIZATION, sesionDeNavegador()))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void elBackendNoSirveElPaqueteAngular() throws Exception {
        mockMvc.perform(get("/index.html").header(HttpHeaders.AUTHORIZATION, sesionDeNavegador()))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void entrarConSoloElNombreNoAutenticaLaCuenta() throws Exception {
        mockMvc.perform(post("/api/sesion/entrar")
                        .header("X-StudyFlow-Auth", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Cher\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unCorreoRepetidoDevuelveUnMensajeLegible() throws Exception {
        String cuerpo = "{\"firstName\":\"Valentina\",\"lastName\":\"Rojas\","
                + "\"email\":\"valentina.rojas@universidad.edu.co\",\"password\":\"123456\"}";
        mockMvc.perform(post("/api/usuarios/registro")
                        .header("X-StudyFlow-Auth", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("Ya existe una cuenta")));
    }

    @Test
    void unaCuentaNuevaNoVeLosProyectosDeOtraPersona() {
        var nueva = new Usuario();
        nueva.setNombre("Persona Nueva");
        nueva.setCorreo("persona.nueva@u.edu");
        var recienLlegado = usuarioService.registrar(nueva, null, "secreto de prueba largo");
        assertThat(proyectoService.listarDeUsuario(recienLlegado.id())).isEmpty();
    }

    @Test
    void laCuentaDeEjemploSiTieneLosProyectosSembrados() {
        var demo = sesionService.entrarComoDemostracion();
        assertThat(demo.getNombreCompleto()).isEqualTo("Valentina Rojas");
        assertThat(proyectoService.listarDeUsuario(demo.getId())).hasSize(1);
    }

    @Test
    void losDatosDeDemostracionSeCargan() {
        var proyectos = proyectoService.listarDeUsuario(usuarioService.obtenerActual().getId());
        assertThat(proyectos).hasSize(1);
        // Cognitiva tiene 4 tareas y una completada: 25 % de avance.
        assertThat(proyectos)
                .filteredOn(proyecto -> proyecto.codigo().equals("cognitiva"))
                .singleElement()
                .satisfies(proyecto -> assertThat(proyecto.progreso()).isEqualTo(25));
    }

    @Test
    void laApiDeProyectosDevuelveJson() throws Exception {
        String sesion = sesionDeNavegador();
        mockMvc.perform(get("/api/proyectos").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isOk());
        mockMvc.perform(get("/api/usuarios/actual").header(HttpHeaders.AUTHORIZATION, sesion)).andExpect(status().isOk());
    }

    @Test
    void crearProyectoDevuelveLosErroresDeCamposObligatoriosDesdeElBackend() throws Exception {
        mockMvc.perform(post("/api/proyectos")
                        .header(HttpHeaders.AUTHORIZATION, sesionDeNavegador())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").value("es obligatorio"))
                .andExpect(jsonPath("$.errores.descripcion").value("es obligatoria"))
                .andExpect(jsonPath("$.errores.fechaEntrega").value("es obligatoria"));
    }

    @Test
    void crearProyectoRechazaUnaEntregaQueNoSeaPosteriorAHoy() throws Exception {
        String cuerpo = """
                {"nombre":"Proyecto inválido","descripcion":"Validar la fecha de entrega",%n
                "fechaEntrega":"%s","etapaInicial":"Planeación","modoReparto":"asignado"}
                """.formatted(java.time.LocalDate.now());

        mockMvc.perform(post("/api/proyectos")
                        .header(HttpHeaders.AUTHORIZATION, sesionDeNavegador())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.fechaEntrega")
                        .value("La fecha de entrega debe ser posterior a la fecha actual."));
    }
}
