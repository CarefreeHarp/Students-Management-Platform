package com.studyflow.platform;

import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sandbox views cannot seed, impersonate or load persistent account data. */
@SpringBootTest(properties = {
        "studyflow.demo.enabled=false",
        "gemini.key=",
        "spring.datasource.url=jdbc:h2:mem:studyflow-sandbox-tests;MODE=MySQL;DB_CLOSE_DELAY=-1"
})
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class SandboxIsolationTests {
    @Autowired private MockMvc mvc;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private ProyectoRepository proyectos;

    @Test
    void laAplicacionNormalNoSiembraLaCuentaDeValentina() {
        assertThat(usuarios.count()).isZero();
        assertThat(proyectos.count()).isZero();
    }

    @Test
    void laPuertaDeDemostracionNoUsaLaPrimeraCuentaExistente() throws Exception {
        Usuario real = new Usuario();
        real.setNombre("Cuenta real");
        real.setCorreo("real@ejemplo.edu");
        usuarios.saveAndFlush(real);
        mvc.perform(post("/api/sesion/demostracion").header("X-StudyFlow-Auth", "1")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/sesion/actual")).andExpect(status().isUnauthorized());
        assertThat(usuarios.count()).isEqualTo(1);
        assertThat(proyectos.count()).isZero();
    }

    @Test
    void elSandboxPerteneceAlFrontendYSusRutasNoCreanCuentas() throws Exception {
        mvc.perform(get("/sandbox")).andExpect(status().isNotFound());
        mvc.perform(get("/sandbox/vista.html")).andExpect(status().isNotFound());
        assertThat(usuarios.count()).isZero();
        assertThat(proyectos.count()).isZero();
    }
}
