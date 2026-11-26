package com.studyflow.platform;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.platform.model.dto.PeticionGenerarHorario;
import com.studyflow.platform.service.impl.ClienteGemini;
import com.studyflow.platform.service.impl.GeneradorHorariosGemini;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"studyflow.gemini.api-key=clave-de-prueba", "studyflow.gemini.modelo=modelo-prueba"})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class HorariosGeminiTests {
    private static final String RUTA = "/api/horarios";
    private static final String OFERTA = """
            {"materias":[
                {"nombre":"Álgebra","creditos":4,"opciones":[
                    [{"dia":"lunes","horaInicio":"08:00","horaFin":"10:00"},
                     {"dia":"miercoles","horaInicio":"08:00","horaFin":"10:00"}],
                    [{"dia":"martes","horaInicio":"14:00","horaFin":"16:00"},
                     {"dia":"jueves","horaInicio":"14:00","horaFin":"16:00"}]]},
                {"nombre":"Física","creditos":3,"opciones":[[{"dia":"lunes","horaInicio":"09:00","horaFin":"11:00"}]]},
                {"nombre":"Arte","creditos":2,"opciones":[[{"dia":"jueves","horaInicio":"16:00","horaFin":"17:00"}]]}
            ],"preferencias":{"jornada":"late","pausas":"short","masCreditos":true}}
            """;
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final AtomicReference<JsonNode> peticion = new AtomicReference<>();
    private static final AtomicInteger estado = new AtomicInteger();
    private static final AtomicInteger fallosTemporales = new AtomicInteger();
    private static final AtomicReference<byte[]> respuesta = new AtomicReference<>();
    private static HttpServer servidor;
    @Autowired private MockMvc mvc;
    private MockHttpSession sesion;

    @DynamicPropertySource
    static void configurarServidor(DynamicPropertyRegistry propiedades) throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/v1beta/models/modelo-prueba:generateContent", intercambio -> {
            try (intercambio) {
                if (!"POST".equals(intercambio.getRequestMethod())
                        || !"clave-de-prueba".equals(intercambio.getRequestHeaders().getFirst("x-goog-api-key"))) {
                    intercambio.sendResponseHeaders(403, -1);
                    return;
                }
                peticion.set(JSON.readTree(intercambio.getRequestBody()));
                intercambio.getResponseHeaders().set("Content-Type", "application/json");
                int codigo = fallosTemporales.getAndUpdate(n -> Math.max(0, n - 1)) > 0 ? 503 : estado.get();
                intercambio.sendResponseHeaders(codigo, respuesta.get().length);
                intercambio.getResponseBody().write(respuesta.get());
            }
        });
        servidor.start();
        propiedades.add("studyflow.gemini.url-base", () -> "http://127.0.0.1:" + servidor.getAddress().getPort() + "/v1beta");
    }

    @AfterAll static void cerrar() { servidor.stop(0); }

    @BeforeEach
    void preparar() throws Exception {
        peticion.set(null);
        fallosTemporales.set(0);
        sesion = nuevaSesion();
        responder(List.of(List.of(2, 1, 1), List.of(1, 0, 1), List.of(1, 1, 1)));
    }

    @Test
    void comparaSeccionesCompletasSegunPreferenciasYPersisteElResultadoPorUsuario() throws Exception {
        var generados = generar();
        assertThat(generados.size()).isEqualTo(2);
        JsonNode completo = generados.get(0);
        assertThat(completo.path("totalCreditos").asInt()).isEqualTo(9);
        assertThat(completo.at("/materias/0/opcion").asInt()).isEqualTo(2);
        assertThat(completo.at("/materias/0/bloques/1/dia").asText()).isEqualTo("jueves");
        assertThat(generados.at("/1/omitidas/0").asText()).isEqualTo("Física");
        var enviada = peticion.get();
        assertThat(enviada.at("/generationConfig/responseMimeType").asText()).isEqualTo("application/json");
        var entrada = JSON.readTree(enviada.at("/contents/0/parts/0/text").asText());
        assertThat(entrada.at("/preferencias/jornada").asText()).isEqualTo("late");
        assertThat(entrada.at("/materias/0/opciones/0/franjas").size()).isEqualTo(2);
        assertThat(entrada.path("ejemplosCompatibles").size()).isEqualTo(2);
        assertThat(enviada.at("/generationConfig/responseJsonSchema/minItems").asInt()).isEqualTo(2);
        assertThat(entrada.toString()).doesNotContain("Álgebra", "correo", "usuario", "clave-de-prueba");

        long id = completo.get("id").asLong();
        mvc.perform(patch(RUTA + "/" + id + "/seleccionar").session(sesion))
                .andExpect(status().isOk()).andExpect(jsonPath("$.seleccionado").value(true));
        mvc.perform(get(RUTA).session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].materias[0].bloques[1].horaFin").value("16:00"))
                .andExpect(jsonPath("$[0].seleccionado").value(true));
        var otra = nuevaSesion();
        mvc.perform(get(RUTA).session(otra)).andExpect(jsonPath("$").isEmpty());
        mvc.perform(patch(RUTA + "/" + id + "/seleccionar").session(otra)).andExpect(status().isNotFound());
        assertThat(generar().get(0).get("id").asLong()).isEqualTo(id);
    }

    @Test
    void recuperaUnaIndisponibilidadTemporalDelProveedor() throws Exception {
        fallosTemporales.set(1);
        assertThat(generar().size()).isEqualTo(2);
    }

    @Test
    void conservaElHorarioElegidoSiHayCuotaAgotadaRespuestaInvalidaORegeneracion() throws Exception {
        long id = generar().get(0).get("id").asLong();
        mvc.perform(patch(RUTA + "/" + id + "/seleccionar").session(sesion)).andExpect(status().isOk());
        estado.set(429);
        enviarOferta(OFERTA).andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.detail").isNotEmpty());
        responder(List.of(List.of(7, 1, 1), List.of(1, 1, 1), List.of(2, 0, 0)));
        enviarOferta(OFERTA).andExpect(status().isBadGateway());
        respuesta.set(JSON.writeValueAsBytes(Map.of("candidates", List.of())));
        enviarOferta(OFERTA).andExpect(status().isBadGateway());
        mvc.perform(get(RUTA).session(sesion)).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].seleccionado").value(true));
        responder(List.of(List.of(1, 0, 1), List.of(1, 0, 1)));
        assertThat(generar().size()).isEqualTo(1);
        mvc.perform(get(RUTA).session(sesion)).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(id));
    }

    @Test
    void noConsultaGeminiSinSesionSinMateriasOConSeccionesInvalidas() throws Exception {
        mvc.perform(post(RUTA + "/generar").contentType(MediaType.APPLICATION_JSON).content(OFERTA))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(RUTA + "/generar").session(sesion)).andExpect(status().isBadRequest());
        enviarOferta("{\"materias\":[]}").andExpect(status().isBadRequest());
        enviarOferta(OFERTA.replace("miercoles", "lunes")).andExpect(status().isBadRequest());
        enviarOferta(OFERTA.replace("08:00", "25:00")).andExpect(status().isBadRequest());
        enviarOferta(OFERTA.replace("14:00", "18:00")).andExpect(status().isBadRequest());
        var sinClave = new GeneradorHorariosGemini(new ClienteGemini(RestClient.builder(), JSON, "", "modelo", "http://127.0.0.1"));
        assertThatThrownBy(() -> sinClave.generar(JSON.readValue(OFERTA, PeticionGenerarHorario.class)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("503");
        assertThat(peticion.get()).isNull();
    }

    @Test
    void mantieneElContratoSinCuerpoParaMateriasQueYaEstanEnLaBase() throws Exception {
        String materia = """
                {"nombre":"Dibujo","profesor":"Docente","dia":"viernes","horaInicio":"08:00","horaFin":"10:00","creditos":2}
                """;
        String alta = mvc.perform(post("/api/materias").session(sesion).contentType(MediaType.APPLICATION_JSON).content(materia))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = JSON.readTree(alta).get("id").asLong();
        responder(List.of(List.of(1)));
        mvc.perform(post(RUTA + "/generar").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].materias[0].id").value(id))
                .andExpect(jsonPath("$[0].materias[0].profesor").value("Docente"));
        mvc.perform(delete("/api/materias/" + id).session(nuevaSesion())).andExpect(status().isNotFound());
        mvc.perform(delete("/api/materias/" + id).session(sesion)).andExpect(status().isNoContent());
        mvc.perform(get(RUTA).session(sesion)).andExpect(jsonPath("$[0].materias[0].nombre").value("Dibujo"));
    }

    @Test
    void dosGeneracionesSimultaneasConservanUnSoloConjuntoDeAlternativas() throws Exception {
        var hilos = Executors.newFixedThreadPool(2);
        try {
            Callable<JsonNode> solicitud = this::generar;
            var primera = hilos.submit(solicitud);
            var segunda = hilos.submit(solicitud);
            assertThat(primera.get(10, TimeUnit.SECONDS).size()).isEqualTo(2);
            assertThat(segunda.get(10, TimeUnit.SECONDS).size()).isEqualTo(2);
        } finally {
            hilos.shutdownNow();
        }
        mvc.perform(get(RUTA).session(sesion)).andExpect(jsonPath("$.length()").value(2));
    }

    private void responder(List<List<Integer>> opciones) throws IOException {
        var lista = opciones.stream().map(o -> Map.of("opciones", o, "nombre", "Semana " + o,
                "descripcion", "Clases en secciones compatibles.")).toList();
        responderContenido(lista);
    }

    private void responderContenido(Object contenido) throws IOException {
        var parte = Map.of("text", JSON.writeValueAsString(contenido));
        estado.set(200);
        respuesta.set(JSON.writeValueAsBytes(Map.of("modelVersion", "gemini-prueba", "candidates",
                List.of(Map.of("finishReason", "STOP", "content", Map.of("parts", List.of(parte)))))));
    }

    @Test
    void geminiResumeSoloElCanalSolicitadoYElHistorialSobreviveAUnFalloDeCuota() throws Exception {
        String proyecto = nuevoProyecto();
        var general = leer(mvc.perform(get("/api/proyectos/" + proyecto + "/canales").session(sesion))
                .andExpect(status().isOk())).get(0);
        String ruta = "/api/canales/" + general.get("id").asLong();
        mvc.perform(post(ruta + "/resumen").session(sesion)).andExpect(status().isBadRequest());
        String mensaje = "Acordamos que Ana entregará el informe el viernes.";
        mvc.perform(post(ruta + "/mensajes").session(sesion).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("contenido", mensaje)))).andExpect(status().isCreated());
        responderContenido(Map.of("contenido", "El equipo acordó entregar el informe.", "puntosClave",
                List.of("Ana entregará el informe el viernes.")));
        mvc.perform(post(ruta + "/resumen")).andExpect(status().isUnauthorized());
        var externa = nuevaSesion();
        mvc.perform(post(ruta + "/resumen").session(externa)).andExpect(status().isNotFound());
        mvc.perform(get(ruta + "/resumenes").session(externa)).andExpect(status().isNotFound());
        mvc.perform(get(ruta).session(externa)).andExpect(status().isNotFound());
        assertThat(peticion.get()).isNull();
        mvc.perform(post(ruta + "/resumen").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.modelo").value("gemini-prueba"))
                .andExpect(jsonPath("$.mensajesResumidos").value(1))
                .andExpect(jsonPath("$.puntosClave[0]").value("Ana entregará el informe el viernes."));
        JsonNode entrada = JSON.readTree(peticion.get().at("/contents/0/parts/0/text").asText());
        assertThat(entrada.at("/mensajes/0/texto").asText()).isEqualTo(mensaje);
        assertThat(entrada.toString()).doesNotContain("example.test", "clave-de-prueba");
        estado.set(429);
        mvc.perform(post(ruta + "/resumen").session(sesion)).andExpect(status().isTooManyRequests());
        responderContenido(Map.of("contenido", " ", "puntosClave", List.of()));
        mvc.perform(post(ruta + "/resumen").session(sesion)).andExpect(status().isBadGateway());
        mvc.perform(get(ruta + "/resumenes").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get(ruta).session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.ultimoResumen.modelo").value("gemini-prueba"));
    }

    @Test
    void agendaIncluyeElHorarioSeleccionadoYEntregablesConSuFechaSinCompartirlosConOtraCuenta() throws Exception {
        String proyecto = nuevoProyecto();
        String documento = "/api/proyectos/" + proyecto + "/entregables";
        String fecha = LocalDate.now().plusDays(5).toString();
        var entrega = leer(mvc.perform(post(documento).session(sesion).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("nombre", "Informe final", "url", "https://example.test/informe",
                        "fechaLimite", fecha)))).andExpect(status().isCreated()));
        assertThat(entrega.path("fechaLimite").asText()).isEqualTo(fecha);
        var opciones = generar();
        mvc.perform(get("/api/agenda").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.horario").isEmpty())
                .andExpect(jsonPath("$.entregables[0].fecha").value(fecha));
        mvc.perform(patch(RUTA + "/" + opciones.get(0).get("id").asLong() + "/seleccionar").session(sesion))
                .andExpect(status().isOk());
        mvc.perform(get("/api/agenda").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.horario.tipo").value("gemini"))
                .andExpect(jsonPath("$.horario.materias[0].bloques[1].dia").value("jueves"));

        String horarioManual = """
                {"materias":[{"nombre":"Laboratorio","creditos":2,"opciones":[[
                    {"dia":"sabado","horaInicio":"07:00","horaFin":"09:00"}]]}]}
                """;
        mvc.perform(put(RUTA + "/seleccionado").session(sesion).contentType(MediaType.APPLICATION_JSON).content(horarioManual))
                .andExpect(status().isOk()).andExpect(jsonPath("$.seleccionado").value(true));
        mvc.perform(get("/api/agenda").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.horario.tipo").value("manual"))
                .andExpect(jsonPath("$.horario.materias[0].bloques[0].dia").value("sabado"))
                .andExpect(jsonPath("$.entregables[0].proyectoCodigo").value(proyecto));
        MockHttpSession externa = nuevaSesion();
        mvc.perform(get("/api/agenda").session(externa)).andExpect(status().isOk())
                .andExpect(jsonPath("$.horario").isEmpty()).andExpect(jsonPath("$.entregables").isEmpty());
        mvc.perform(get(documento).session(externa)).andExpect(status().isNotFound());
        mvc.perform(get("/api/agenda")).andExpect(status().isUnauthorized());
    }

    @Test
    void agendaHeredaLaFechaYHoraDeLaTareaCuandoElEntregableNoTieneVencimientoPropio() throws Exception {
        String proyecto = nuevoProyecto();
        String fecha = LocalDate.now().plusDays(3).toString();
        String ruta = "/api/proyectos/" + proyecto;
        var tarea = leer(mvc.perform(post(ruta + "/tareas").session(sesion).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("titulo", "Preparar exposición", "fechaLimite", fecha,
                        "horaLimite", "07:30")))).andExpect(status().isCreated()));
        var vinculado = Map.of("nombre", "Presentación", "url", "https://example.test/presentacion",
                "tareaId", tarea.path("id").asLong());
        var entrega = leer(mvc.perform(post(ruta + "/entregables").session(sesion).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(vinculado))).andExpect(status().isCreated()));
        mvc.perform(post(ruta + "/entregables").session(sesion).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("nombre", "Referencias", "url", "https://example.test/referencias"))))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/agenda").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.entregables.length()").value(1))
                .andExpect(jsonPath("$.entregables[0].fecha").value(fecha))
                .andExpect(jsonPath("$.entregables[0].hora").value("07:30:00"));
        mvc.perform(put("/api/entregables/" + entrega.path("id").asLong()).session(sesion).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(Map.of("nombre", "Presentación", "url", "https://example.test/presentacion", "fechaLimite", fecha))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/agenda").session(sesion)).andExpect(status().isOk())
                .andExpect(jsonPath("$.entregables[0].fecha").value(fecha))
                .andExpect(jsonPath("$.entregables[0].hora").isEmpty());
    }

    private String nuevoProyecto() throws Exception {
        var datos = Map.of("nombre", "Prueba " + UUID.randomUUID(), "descripcion", "Datos de prueba",
                "fechaEntrega", LocalDate.now().plusDays(12).toString(), "modoReparto", "asignado");
        return leer(mvc.perform(post("/api/proyectos").session(sesion).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsBytes(datos))).andExpect(status().isCreated())).path("codigo").asText();
    }

    private JsonNode leer(ResultActions resultado) throws IOException {
        return JSON.readTree(resultado.andReturn().getResponse().getContentAsByteArray());
    }

    private MockHttpSession nuevaSesion() throws Exception {
        var sesionNueva = new MockHttpSession();
        mvc.perform(post("/api/sesion/entrar").session(sesionNueva).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("nombre", "Estudiante", "correo", UUID.randomUUID() + "@example.test"))))
                .andExpect(status().isOk());
        return sesionNueva;
    }

    private ResultActions enviarOferta(String oferta) throws Exception {
        return mvc.perform(post(RUTA + "/generar").session(sesion).contentType(MediaType.APPLICATION_JSON).content(oferta));
    }

    private JsonNode generar() throws Exception {
        return JSON.readTree(enviarOferta(OFERTA).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
    }
}
