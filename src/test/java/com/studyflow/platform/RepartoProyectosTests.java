package com.studyflow.platform;

import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.exception.CampoInvalidoException;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.service.FaseService;
import com.studyflow.platform.service.ProyectoService;
import com.studyflow.platform.service.SesionService;
import com.studyflow.platform.service.TareaService;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "studyflow.demo.enabled=true")
@ActiveProfiles("dev")
@Transactional
class RepartoProyectosTests {

    @Autowired private ProyectoService proyectos;
    @Autowired private FaseService fases;
    @Autowired private SesionService sesion;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private TareaService tareas;
    @Autowired private Validator validator;

    private Usuario propietario;

    @BeforeEach
    void entrar() {
        propietario = sesion.entrarComoDemostracion();
    }

    private PeticionProyecto peticion(String modo, List<PeticionIntegrante> integrantes) {
        return new PeticionProyecto("Reparto " + UUID.randomUUID(), "Proyecto para probar reparto",
                LocalDate.now().plusDays(14), "Planeación", null, integrantes,
                List.of(tarea("Investigar"), tarea("Diseñar")), modo);
    }

    private PeticionTarea tarea(String titulo) {
        return new PeticionTarea(titulo, null, null, "Planeación", LocalDate.now().plusDays(7),
                "12:00", "sin-empezar");
    }

    private ProyectoDTO crear(String modo) {
        return proyectos.crear(peticion(modo, List.of()), propietario.getId());
    }

    private Usuario persona(String nombre) {
        Usuario usuario = new Usuario();
        usuario.setNombre(nombre);
        usuario.setCorreo(UUID.randomUUID() + "@ejemplo.edu");
        return usuarios.save(usuario);
    }

    @Test
    void omitirElModoRechazaLaCreacionDelProyecto() {
        assertThatThrownBy(() -> crear(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Elige cómo se repartirán las tareas");
    }

    @Test
    void elModoLibrePermiteTomarYDevolverUnaTareaDisponible() {
        ProyectoDTO proyecto = crear("libre");
        Long id = proyecto.tareas().get(0).id();
        assertThat(fases.diagrama(proyecto.codigo()).puedeConfigurarReparto()).isTrue();
        assertThat(fases.disponibles(proyecto.codigo())).hasSize(2);
        TareaFaseDTO tomada = fases.reclamar(id, propietario.getId());
        assertThat(tomada.responsable()).isEqualTo(propietario.getNombreCompleto());
        assertThat(tomada.estado()).isEqualTo("en-proceso");
        assertThat(tomada.disponible()).isFalse();
        assertThat(fases.liberar(id).disponible()).isTrue();
    }

    @Test
    void unaTareaNoPuedeUsarUnaEtapaAjenaAlProyecto() {
        ProyectoDTO proyecto = crear("asignado");
        PeticionTarea invalida = new PeticionTarea("Tarea inválida", null, null,
                "Etapa inventada", LocalDate.now().plusDays(7), "12:00", "sin-empezar");
        assertThatThrownBy(() -> tareas.crear(proyecto.codigo(), invalida))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no pertenece a este proyecto");
    }

    @Test
    void unaTareaNoPuedeTenerFechaLimitePosteriorALaEntregaDelProyecto() {
        ProyectoDTO proyecto = crear("asignado");
        PeticionTarea invalida = new PeticionTarea("Tarea fuera del plazo", null, null,
                "Planeación", LocalDate.now().plusDays(15), "12:00", "sin-empezar");

        assertThatThrownBy(() -> tareas.crear(proyecto.codigo(), invalida))
                .isInstanceOf(CampoInvalidoException.class)
                .hasMessageContaining("no puede ser posterior a la fecha de entrega")
                .hasMessageContaining(LocalDate.now().plusDays(14).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
    }

    @Test
    void lasFasesSePuedenCrearRenombrarYOrdenarSinDesasignarLasTareas() {
        ProyectoDTO proyecto = proyectos.crear(new PeticionProyecto(
                "Fases " + UUID.randomUUID(), "Proyecto para probar fases editables",
                LocalDate.now().plusDays(14), "Planeación", null, List.of(),
                List.of(tarea("Descubrir necesidad")), List.of("Planeación", "Diseño"), "asignado"),
                propietario.getId());
        DiagramaFasesDTO diagramaInicial = fases.diagrama(proyecto.codigo());
        DiagramaFasesDTO.FaseDTO planeacion = diagramaInicial.fases().stream()
                .filter(fase -> fase.nombre().equals("Planeación")).findFirst().orElseThrow();
        DiagramaFasesDTO.FaseDTO diseno = diagramaInicial.fases().stream()
                .filter(fase -> fase.nombre().equals("Diseño")).findFirst().orElseThrow();

        ProyectoDTO actualizado = proyectos.actualizarFases(proyecto.codigo(), new PeticionFases(List.of(
                new PeticionFase(diseno.id(), "Diseño UX"),
                new PeticionFase(planeacion.id(), "Descubrimiento"),
                new PeticionFase(null, "Validación")), 2), propietario.getId());

        assertThat(actualizado.etapas()).containsExactly("Diseño UX", "Descubrimiento", "Validación");
        assertThat(actualizado.etapaActual()).isEqualTo("Validación");
        assertThat(actualizado.tareas().get(0).etapa()).isEqualTo("Descubrimiento");
        assertThat(fases.diagrama(proyecto.codigo()).fases().stream().map(DiagramaFasesDTO.FaseDTO::nombre))
                .containsExactly("Diseño UX", "Descubrimiento", "Validación");

        DiagramaFasesDTO.FaseDTO validacion = fases.diagrama(proyecto.codigo()).fases().stream()
                .filter(fase -> fase.nombre().equals("Validación")).findFirst().orElseThrow();
        assertThatThrownBy(() -> proyectos.actualizarFases(proyecto.codigo(), new PeticionFases(List.of(
                new PeticionFase(diseno.id(), "Diseño UX"),
                new PeticionFase(validacion.id(), "Validación")), 0), propietario.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Mueve esas tareas");
    }

    @Test
    void cambiarDeModoNoBorraResponsablesNiProgresoNiDependencias() {
        ProyectoDTO proyecto = crear("libre");
        Long primera = proyecto.tareas().get(0).id();
        Long segunda = proyecto.tareas().get(1).id();
        fases.reclamar(primera, propietario.getId());
        fases.agregarDependencia(segunda, primera);
        proyectos.actualizarReparto(proyecto.codigo(), "asignado", propietario.getId());
        ProyectoDTO asignado = proyectos.obtenerPorCodigo(proyecto.codigo());
        assertThat(asignado.tareas().get(0).responsable()).isEqualTo(propietario.getNombreCompleto());
        assertThat(asignado.tareas().get(0).estado()).isEqualTo("en-proceso");
        assertThat(fases.diagrama(proyecto.codigo()).fases().stream().flatMap(f -> f.tareas().stream())
                .filter(t -> t.id().equals(segunda)).findFirst().orElseThrow().dependencias()).contains(primera);
        assertThat(fases.disponibles(proyecto.codigo())).isEmpty();
        assertThatThrownBy(() -> fases.liberar(primera)).hasMessageContaining("tareas asignadas");
        proyectos.actualizarReparto(proyecto.codigo(), "libre", propietario.getId());
        assertThat(fases.liberar(primera).disponible()).isTrue();
    }

    @Test
    void lasDependenciasSeDebenCompletarAntesDeTomarUnaTarea() {
        ProyectoDTO proyecto = crear("libre");
        Long primera = proyecto.tareas().get(0).id();
        Long segunda = proyecto.tareas().get(1).id();
        fases.agregarDependencia(segunda, primera);
        assertThatThrownBy(() -> fases.reclamar(segunda, propietario.getId()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Antes hay que terminar");
        tareas.marcarCompletada(primera, "Resultado de la tarea inicial", null);
        assertThat(fases.reclamar(segunda, propietario.getId()).estado()).isEqualTo("en-proceso");
        assertThatThrownBy(() -> fases.reclamar(primera, propietario.getId()))
                .hasMessageContaining("terminada no está disponible");
    }

    @Test
    void unaDependenciaNoPuedeVencerDespuesDeLaTareaQueEspera() {
        ProyectoDTO proyecto = crear("asignado");
        Long tareaTemprana = proyecto.tareas().get(0).id();
        TareaDTO dependenciaTardia = tareas.crear(proyecto.codigo(), new PeticionTarea(
                "Dependencia tardía", null, null, "Planeación", LocalDate.now().plusDays(13),
                "12:00", "sin-empezar"));

        assertThatThrownBy(() -> fases.agregarDependencia(tareaTemprana, dependenciaTardia.id()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Verifica las fechas")
                .hasMessageContaining("debe vencer antes");
    }

    @Test
    void soloElPropietarioPuedeConfigurarElReparto() {
        ProyectoDTO proyecto = crear("asignado");
        Usuario otro = persona("Otra persona");
        assertThatThrownBy(() -> proyectos.actualizarReparto(proyecto.codigo(), "libre", otro.getId()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Solo quien creó");
        sesion.iniciarSesion(otro);
        assertThat(fases.diagrama(proyecto.codigo()).puedeConfigurarReparto()).isFalse();
    }

    @Test
    void unInvitadoPorCorreoPuedeTomarPeroNoLiberarLaTareaDeOtro() {
        Usuario miembro = persona("Camila");
        ProyectoDTO proyecto = proyectos.crear(peticion("libre", List.of(new PeticionIntegrante(
                "Camila", miembro.getCorreo(), null))), propietario.getId());
        Long primera = proyecto.tareas().get(0).id();
        Long segunda = proyecto.tareas().get(1).id();
        assertThat(fases.reclamar(primera, miembro.getId()).responsable()).isEqualTo("Camila");
        fases.reclamar(segunda, propietario.getId());
        sesion.iniciarSesion(miembro);
        assertThat(fases.liberar(primera).disponible()).isTrue();
        assertThatThrownBy(() -> fases.liberar(segunda))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Solo el responsable");
    }

    @Test
    void coincidirEnNombreNoPermiteEntrarAlEquipo() {
        ProyectoDTO proyecto = crear("libre");
        Usuario impostor = persona(propietario.getNombreCompleto());
        assertThatThrownBy(() -> fases.reclamar(proyecto.tareas().get(0).id(), impostor.getId()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("formar parte del equipo");
        assertThat(proyectos.obtenerPorCodigo(proyecto.codigo()).integrantes()).hasSize(1);
    }

    @Test
    void seRechazanValoresDeModoDesconocidos() {
        assertThat(validator.validate(peticion("cualquiera", List.of()))).isNotEmpty();
        assertThat(validator.validate(new PeticionReparto(null))).isNotEmpty();
        assertThat(validator.validate(new PeticionReparto(""))).isNotEmpty();
        assertThatThrownBy(() -> crear("otro")).isInstanceOf(IllegalArgumentException.class);
        ProyectoDTO proyecto = crear("asignado");
        assertThatThrownBy(() -> proyectos.actualizarReparto(proyecto.codigo(), null, propietario.getId()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void dosIntentosSimultaneosNoPuedenTomarLaMismaTarea() throws Exception {
        Usuario miembro = persona("Lucía");
        ProyectoDTO proyecto = proyectos.crear(peticion("libre", List.of(new PeticionIntegrante(
                "Lucía", miembro.getCorreo(), null))), propietario.getId());
        Long id = proyecto.tareas().get(0).id();
        var ejecutor = Executors.newFixedThreadPool(2);
        var inicio = new CountDownLatch(1);
        try {
            List<Future<Boolean>> resultados = List.of(propietario.getId(), miembro.getId()).stream()
                    .map(usuarioId -> ejecutor.submit(() -> {
                        inicio.await(5, TimeUnit.SECONDS);
                        try {
                            fases.reclamar(id, usuarioId);
                            return true;
                        } catch (IllegalArgumentException ocupada) {
                            assertThat(ocupada).hasMessageContaining("ya la está haciendo");
                            return false;
                        }
                    })).toList();
            inicio.countDown();
            int tomadas = 0;
            for (Future<Boolean> resultado : resultados) {
                if (resultado.get(10, TimeUnit.SECONDS)) tomadas++;
            }
            assertThat(tomadas).isEqualTo(1);
        } finally {
            ejecutor.shutdownNow();
        }
    }
}
