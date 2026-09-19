package com.studyflow.platform;

import com.studyflow.platform.controller.view.SandboxController;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

/** Sandbox views cannot seed, impersonate or load persistent account data. */
@SpringBootTest(properties = {
        "studyflow.demo.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:studyflow-sandbox-tests;MODE=MySQL;DB_CLOSE_DELAY=-1"
})
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class SandboxIsolationTests {
    @Autowired private MockMvc mvc;
    @Autowired private SandboxController sandbox;
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
        mvc.perform(post("/api/sesion/demostracion")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/sesion/actual")).andExpect(status().isUnauthorized());
        assertThat(usuarios.count()).isEqualTo(1);
        assertThat(proyectos.count()).isZero();
    }

    @Test
    void elSandboxAbreSinSesionYSinCrearUnaCuenta() throws Exception {
        mvc.perform(get("/sandbox")).andExpect(status().isOk()).andExpect(view().name("sandbox"));
        String html = mvc.perform(get("/sandbox/vista")).andExpect(status().isOk())
                .andExpect(view().name("index")).andExpect(model().attribute("sandbox", true))
                .andExpect(header().string("Content-Security-Policy",
                        org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("connect-src 'none'"),
                                org.hamcrest.Matchers.containsString("form-action 'none'"))))
                .andReturn().getResponse().getContentAsString();
        assertThat(html).contains("id=\"sandbox-preflight\"", "window.__sandboxIsolated = true");
        assertThat(html.indexOf("id=\"sandbox-preflight\""))
                .isLessThan(html.indexOf("src=\"/js/sandbox-frame.js\""));
        assertThat(html).containsPattern("src=\"/js/main(?:-[a-f0-9]+)?\\.js\"");
        assertThat(html.indexOf("src=\"/js/sandbox-frame.js\""))
                .isLessThan(html.indexOf("src=\"/js/main"));
        assertThat(usuarios.count()).isZero();
        assertThat(proyectos.count()).isZero();
    }

    @Test
    void lasVistasDelSandboxSoloExponenLaRutaNoDatosPersistidos() {
        Map<String, String> rutas = Map.ofEntries(
                Map.entry("/panel", "index"), Map.entry("/proyectos", "proyectos"),
                Map.entry("/proyectos/nuevo", "crear-proyecto"), Map.entry("/horarios", "crear-horario"),
                Map.entry("/recordatorios", "recordatorios"), Map.entry("/perfil", "perfil"),
                Map.entry("/perfil/editar", "editar-perfil"), Map.entry("/proyectos/prueba", "proyecto"),
                Map.entry("/proyectos/prueba/fases", "fases"),
                Map.entry("/proyectos/prueba/canales", "canales"),
                Map.entry("/proyectos/prueba/entregables", "entregables"));
        rutas.forEach((ruta, vista) -> {
            var modelo = new ExtendedModelMap();
            assertThat(sandbox.vista(ruta, modelo, new MockHttpServletResponse())).isEqualTo(vista);
            assertThat(modelo).containsEntry("sandbox", true);
            assertThat(modelo.keySet()).isSubsetOf("sandbox", "projectId");
            if (modelo.containsKey("projectId")) assertThat(modelo.get("projectId")).isEqualTo("prueba");
        });
        assertThat(usuarios.count()).isZero();
        assertThat(proyectos.count()).isZero();
    }

    @Test
    void noSePuedeUsarLaVistaPublicaParaElegirPlantillasArbitrarias() {
        for (String ruta : new String[]{"/api/usuarios/actual", "../perfil", "/../perfil", "/proyectos/x/admin",
                "/proyectos/x/../../perfil", "/proyectos/a?otro=1", "https://ejemplo.com", "/login"}) {
            assertThatThrownBy(() -> sandbox.vista(ruta, new ExtendedModelMap(), new MockHttpServletResponse()))
                    .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        }
    }
}
