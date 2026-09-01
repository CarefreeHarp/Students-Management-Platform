package com.studyflow.platform;

import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    @Test
    void elContextoArranca() {
        assertThat(usuarioService.obtenerActual()).isNotNull();
    }

    @Test
    void lasPaginasPrincipalesResponden() throws Exception {
        mockMvc.perform(get("/")).andExpect(status().isOk()).andExpect(view().name("index"));
        mockMvc.perform(get("/login")).andExpect(status().isOk()).andExpect(view().name("login"));
        mockMvc.perform(get("/proyectos")).andExpect(status().isOk()).andExpect(view().name("proyectos"));
        mockMvc.perform(get("/horarios")).andExpect(status().isOk()).andExpect(view().name("crear-horario"));
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
        mockMvc.perform(get("/api/proyectos")).andExpect(status().isOk());
        mockMvc.perform(get("/api/usuarios/actual")).andExpect(status().isOk());
    }
}
