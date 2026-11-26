package com.studyflow.platform;

import com.studyflow.platform.model.dto.PeticionIntegrante;
import com.studyflow.platform.model.dto.PeticionProyecto;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.dto.ProyectoDTO;
import com.studyflow.platform.model.entity.ActividadFlow;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.repository.ActividadFlowRepository;
import com.studyflow.platform.service.FaseService;
import com.studyflow.platform.service.FlowService;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.SesionService;
import com.studyflow.platform.service.TareaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "studyflow.demo.enabled=true")
@ActiveProfiles("dev")
class FlowTests {
    @Autowired SesionService sesion;
    @Autowired FlowService flow;
    @Autowired ProyectoService proyectos;
    @Autowired TareaService tareas;
    @Autowired FaseService fases;
    @Autowired ActividadFlowRepository actividades;

    private final LocalDate hoy = LocalDate.now(ZoneId.of("America/Bogota"));
    private Usuario ana;
    private Usuario leo;

    @BeforeEach
    void crearCuentas() {
        String variante = UUID.randomUUID().toString();
        leo = sesion.accesoRapido("Leo", variante + "-leo@example.org");
        ana = sesion.accesoRapido("Ana", variante + "-ana@example.org");
    }

    private PeticionTarea tarea(String titulo, String responsable, LocalDate fecha, String estado) {
        return new PeticionTarea(titulo, null, responsable, "Planeación", fecha, "23:59", estado);
    }

    private ProyectoDTO proyecto(PeticionTarea... entradas) {
        return proyectos.crear(new PeticionProyecto("Prueba Flow", "Equipo de estudio", hoy.plusDays(4),
                "Planeación", null, List.of(new PeticionIntegrante("Leo", leo.getCorreo(), null)),
                List.of(entradas)), ana.getId());
    }

    @Test
    void guardaColorPorCuentaYRechazaColoresInvalidos() {
        assertThat(flow.consultar()).isEqualTo(new FlowService.Mascota("violeta", 0, 0));
        flow.cambiarColor("turquesa");
        assertThatThrownBy(() -> flow.cambiarColor("azul")).isInstanceOf(IllegalArgumentException.class);
        sesion.iniciarSesion(leo);
        assertThat(flow.consultar().color()).isEqualTo("violeta");
        sesion.iniciarSesion(ana);
        assertThat(flow.consultar().color()).isEqualTo("turquesa");
    }

    @Test
    void soloLaTareaPuntualConEvidenciaPremiaAlResponsable() {
        var proyecto = proyecto(tarea("A tiempo", "Leo", hoy.plusDays(1), "sin-empezar"),
                tarea("Tarde", "Ana", hoy.minusDays(1), "sin-empezar"),
                tarea("Sin fecha", null, null, "sin-empezar"));
        Long id = proyecto.tareas().get(0).id();
        assertThatThrownBy(() -> tareas.marcarCompletada(id, " ", null)).isInstanceOf(IllegalArgumentException.class);
        tareas.marcarCompletada(id, "Entregado", null);
        assertThat(flow.consultar().rachaDias()).isZero();
        tareas.marcarCompletada(proyecto.tareas().get(1).id(), "Tarde", null);
        assertThat(flow.consultar().rachaDias()).isEqualTo(1);
        tareas.marcarCompletada(proyecto.tareas().get(2).id(), "Sin plazo", null);
        assertThat(flow.consultar()).isEqualTo(new FlowService.Mascota("violeta", 0, 1));
        sesion.iniciarSesion(leo);
        assertThat(flow.consultar()).isEqualTo(new FlowService.Mascota("violeta", 10, 1));
    }

    @Test
    void reabrirYReasignarNoDuplicanNiTransfierenElPremio() {
        var entrada = tarea("Informe", null, hoy.plusDays(1), "sin-empezar");
        Long id = proyecto(entrada).tareas().get(0).id();
        tareas.marcarCompletada(id, "Entregado", null);
        tareas.marcarCompletada(id, "", null);
        fases.cambiarEstado(id, "en-revision");
        fases.cambiarEstado(id, "terminada");
        tareas.actualizar(id, entrada);
        tareas.actualizar(id, tarea("Informe", "Leo", hoy.plusDays(1), "terminada"));
        assertThat(flow.consultar().puntos()).isEqualTo(10);
        sesion.iniciarSesion(leo);
        assertThat(flow.consultar().puntos()).isZero();
    }

    @Test
    void cerrarUnaTareaAjenaNoOtorgaPuntosAlVisitante() {
        Long id = proyecto(tarea("Informe", null, hoy.plusDays(1), "sin-empezar")).tareas().get(0).id();
        sesion.accesoRapido("Visita", UUID.randomUUID() + "@example.org");
        tareas.marcarCompletada(id, "Entregado", null);
        assertThat(flow.consultar()).isEqualTo(new FlowService.Mascota("violeta", 0, 0));
        sesion.iniciarSesion(ana);
        assertThat(flow.consultar()).isEqualTo(new FlowService.Mascota("violeta", 0, 0));
    }

    @Test
    void conservaLaRachaHastaHoyYLaReiniciaSiSeSaltaUnDia() {
        var proyecto = proyecto(tarea("Informe", null, null, "sin-empezar"),
                tarea("Presentación", null, null, "sin-empezar"));
        var informe = proyecto.tareas().get(0).id();
        actividades.saveAll(List.of(
                new ActividadFlow(informe, ana, hoy.minusDays(1)),
                new ActividadFlow(-1L, ana, hoy.minusDays(1)),
                new ActividadFlow(-2L, ana, hoy.minusDays(2)),
                new ActividadFlow(-3L, ana, hoy.minusDays(4)),
                new ActividadFlow(-4L, leo, hoy.minusDays(2))));

        assertThat(flow.consultar().rachaDias()).isEqualTo(2);
        tareas.marcarCompletada(informe, "Corrección", null);
        assertThat(flow.consultar().rachaDias()).isEqualTo(2);
        tareas.marcarCompletada(proyecto.tareas().get(1).id(), "Trabajo nuevo", null);
        assertThat(flow.consultar().rachaDias()).isEqualTo(3);
        sesion.iniciarSesion(leo);
        assertThat(flow.consultar().rachaDias()).isZero();
    }
}
