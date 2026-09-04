package com.studyflow.platform;

import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Recordatorios por WhatsApp, organizador de proyectos y chats grupales. */
@SpringBootTest
@ActiveProfiles("dev")
class FuncionalidadesNuevasTests {

    @Autowired
    private RecordatorioService recordatorioService;

    @Autowired
    private OrganizadorProyectoService organizadorService;

    @Autowired
    private CanalService canalService;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private ApunteClaseService apunteService;

    @Autowired
    private PasarelaMensajeria pasarela;

    @Autowired
    private FaseService faseService;

    @Autowired
    private EntregableService entregableService;

    @Autowired
    private SesionService sesionService;

    /**
     * Sin sesión no hay identidad: la aplicación ya no actúa en nombre del
     * usuario sembrado. Cada prueba entra con la cuenta de ejemplo.
     */
    @BeforeEach
    void entrarComoEjemplo() {
        sesionService.entrarComoDemostracion();
    }

    private Long usuarioId() {
        return usuarioService.obtenerActual().getId();
    }

    // ------------------------------------------------------------ recordatorios

    @Test
    void laAntelacionConfiguradaAdelantaElAviso() {
        Long usuario = usuarioId();
        // Un apunte que vence en 10 días, avisando 2 días antes.
        apunteService.crear(usuario, new PeticionApunteClase(
                "Preparar exposición", "Tema libre", null, LocalDate.now(), LocalDate.now().plusDays(10), true));

        recordatorioService.guardarPreferencias(usuario, new PeticionPreferenciaRecordatorio(
                "WHATSAPP", "573001112233", true, 1440, 4320, 2880, "22:00", "07:00"));

        RecordatorioDTO aviso = recordatorioService.listar(usuario).stream()
                .filter(item -> item.titulo().equals("Preparar exposición"))
                .findFirst()
                .orElseThrow();

        // 10 días de plazo menos 2 de antelación => el aviso sale 8 días antes de hoy + 10.
        assertThat(aviso.fechaHora()).startsWith(
                LocalDate.now().plusDays(8).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        assertThat(aviso.estado()).isEqualTo("PROGRAMADO");
    }

    @Test
    void desactivarLosRecordatoriosVaciaLaAgenda() {
        Long usuario = usuarioId();
        recordatorioService.guardarPreferencias(usuario, new PeticionPreferenciaRecordatorio(
                "WHATSAPP", "573001112233", false, 1440, 4320, 120, "22:00", "07:00"));

        assertThat(recordatorioService.listar(usuario))
                .noneMatch(recordatorio -> recordatorio.estado().equals("PROGRAMADO"));
    }

    @Test
    void sinCredencialesLaPasarelaTrabajaEnModoSimulacion() {
        assertThat(pasarela.estaConectada()).isFalse();
        PasarelaMensajeria.ResultadoEnvio resultado = pasarela.enviarTexto("573001112233", "Hola");
        assertThat(resultado.exito()).isTrue();
        assertThat(resultado.simulado()).isTrue();
    }

    @Test
    void unNumeroInvalidoNoSeEnvia() {
        PasarelaMensajeria.ResultadoEnvio resultado = pasarela.enviarTexto("123", "Hola");
        assertThat(resultado.exito()).isFalse();
        assertThat(resultado.error()).contains("no es válido");
    }

    // ------------------------------------------------------------ organizador

    @Test
    void elOrganizadorRepartePlazosHastaLaEntrega() {
        LocalDate entrega = LocalDate.now().plusDays(60);
        PlanOrganizadoDTO plan = organizadorService.proponerPlan(new PeticionOrganizacion(
                "Proyecto de prueba", "Contexto del proyecto", entrega, 5,
                List.of("Ana", "Luis")));

        assertThat(plan.tareas()).hasSize(5);
        // Ninguna tarea puede vencer después de la entrega.
        assertThat(plan.tareas()).allSatisfy(tarea ->
                assertThat(tarea.fechaLimite()).isBeforeOrEqualTo(entrega));
        // Las fechas avanzan de forma creciente.
        for (int i = 1; i < plan.tareas().size(); i++) {
            assertThat(plan.tareas().get(i).fechaInicio())
                    .isAfterOrEqualTo(plan.tareas().get(i - 1).fechaLimite());
        }
        // Los responsables rotan entre los integrantes indicados.
        assertThat(plan.tareas()).allSatisfy(tarea ->
                assertThat(tarea.responsable()).isIn("Ana", "Luis"));
    }

    @Test
    void elNumeroDeTareasSeMantieneDentroDeLimites() {
        PlanOrganizadoDTO exceso = organizadorService.proponerPlan(new PeticionOrganizacion(
                "P", "C", LocalDate.now().plusDays(30), 99, List.of()));
        assertThat(exceso.tareas()).hasSize(20);

        PlanOrganizadoDTO minimo = organizadorService.proponerPlan(new PeticionOrganizacion(
                "P", "C", LocalDate.now().plusDays(30), 0, List.of()));
        assertThat(minimo.tareas()).hasSize(1);
    }

    // ------------------------------------------------------------ chats

    @Test
    void seResumeLaConversacionDeUnCanal() {
        Long usuario = usuarioId();
        CanalDTO canal = canalService.crear("cognitiva", usuario,
                new PeticionCanal("canal de prueba", "Para el test", null, null));

        canalService.publicar(canal.id(), usuario, new PeticionMensajeChat(
                "Quedamos en revisar el informe el martes.", null));
        canalService.publicar(canal.id(), usuario, new PeticionMensajeChat(
                "¿Alguien tiene la plantilla de la presentación?", null));

        ResumenChatDTO resumen = canalService.resumir(canal.id());
        assertThat(resumen.mensajesResumidos()).isEqualTo(2);
        assertThat(resumen.contenido()).isNotBlank();
        // Los puntos clave recogen el acuerdo y la pregunta abierta.
        assertThat(resumen.puntosClave()).hasSize(2);
    }

    @Test
    void noSePuedeResumirUnCanalVacio() {
        Long usuario = usuarioId();
        CanalDTO canal = canalService.crear("cognitiva", usuario,
                new PeticionCanal("vacio", null, null, null));

        assertThatThrownBy(() -> canalService.resumir(canal.id()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no tiene mensajes");
    }

    @Test
    void unProyectoNoPuedeTenerDosCanalesConElMismoNombre() {
        Long usuario = usuarioId();
        canalService.crear("cognitiva", usuario, new PeticionCanal("repetido", null, null, null));

        assertThatThrownBy(() -> canalService.crear("cognitiva", usuario,
                new PeticionCanal("Repetido", null, null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ya existe un canal");
    }

    // ------------------------------------------------------------ reacciones

    @Test
    void reaccionarDosVecesConElMismoEmojiRetiraLaReaccion() {
        Long usuario = usuarioId();
        CanalDTO canal = canalService.crear("cognitiva", usuario,
                new PeticionCanal("reacciones", null, null, null));
        MensajeChatDTO mensaje = canalService.publicar(canal.id(), usuario,
                new PeticionMensajeChat("Mensaje para reaccionar", null));

        MensajeChatDTO conReaccion = canalService.alternarReaccion(mensaje.id(), usuario, "👍");
        assertThat(conReaccion.reacciones()).hasSize(1);
        assertThat(conReaccion.reacciones().get(0).total()).isEqualTo(1);
        assertThat(conReaccion.reacciones().get(0).propia()).isTrue();

        MensajeChatDTO sinReaccion = canalService.alternarReaccion(mensaje.id(), usuario, "👍");
        assertThat(sinReaccion.reacciones()).isEmpty();
    }

    @Test
    void noSeAdmiteUnEmojiFueraDeLaLista() {
        Long usuario = usuarioId();
        CanalDTO canal = canalService.crear("cognitiva", usuario,
                new PeticionCanal("emojis", null, null, null));
        MensajeChatDTO mensaje = canalService.publicar(canal.id(), usuario,
                new PeticionMensajeChat("Hola", null));

        assertThatThrownBy(() -> canalService.alternarReaccion(mensaje.id(), usuario, "💀"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ------------------------------------------------------------ fases y dependencias

    /** Todas las tareas del diagrama, en una lista plana. */
    private List<TareaFaseDTO> tareasDe(String proyecto) {
        return faseService.diagrama(proyecto).fases().stream()
                .flatMap(fase -> fase.tareas().stream())
                .toList();
    }

    @Test
    void unaTareaBloqueadaNoSePuedeReclamar() {
        // El cargador encadena las tareas del proyecto de ejemplo.
        TareaFaseDTO bloqueada = tareasDe("cognitiva").stream()
                .filter(tarea -> !tarea.bloqueantes().isEmpty())
                .findFirst()
                .orElseThrow();
        // Se libera primero para aislar el motivo del rechazo: la dependencia.
        faseService.liberar(bloqueada.id());

        assertThatThrownBy(() -> faseService.reclamar(bloqueada.id(), usuarioId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Antes hay que terminar");
    }

    @Test
    void unaTareaYaTomadaNoSePuedeReclamar() {
        TareaFaseDTO ocupada = tareasDe("cognitiva").stream()
                .filter(tarea -> tarea.responsable() != null)
                .findFirst()
                .orElseThrow();

        assertThatThrownBy(() -> faseService.reclamar(ocupada.id(), usuarioId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya la está haciendo");
    }

    @Test
    void noSeAdmiteUnCicloDeDependencias() {
        // Se toman dos tareas de proyectos distintos del ejemplo encadenado.
        List<TareaFaseDTO> tareas = tareasDe("laboratorio-ux");
        Long primera = tareas.get(0).id();
        Long segunda = tareas.get(1).id();

        faseService.agregarDependencia(segunda, primera);

        // El camino inverso cerraría el ciclo.
        assertThatThrownBy(() -> faseService.agregarDependencia(primera, segunda))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ciclo");
    }

    @Test
    void unaTareaNoPuedeDependerDeSiMisma() {
        Long id = tareasDe("cognitiva").get(0).id();
        assertThatThrownBy(() -> faseService.agregarDependencia(id, id))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sí misma");
    }

    @Test
    void liberarUnaTareaLaDevuelveAlConjuntoDeDisponibles() {
        // Una tarea sin dependencias pendientes: la primera de la cadena.
        TareaFaseDTO libre = tareasDe("cognitiva").stream()
                .filter(tarea -> tarea.bloqueantes().isEmpty())
                .findFirst()
                .orElseThrow();

        TareaFaseDTO liberada = faseService.liberar(libre.id());
        assertThat(liberada.responsable()).isNull();
        assertThat(liberada.estado()).isEqualTo("sin-empezar");
        assertThat(faseService.disponibles("cognitiva"))
                .extracting(TareaFaseDTO::id)
                .contains(libre.id());

        // Y al tomarla queda en proceso sin tener que cambiar el estado aparte.
        TareaFaseDTO tomada = faseService.reclamar(libre.id(), usuarioId());
        assertThat(tomada.responsable()).isNotNull();
        assertThat(tomada.estado()).isEqualTo("en-proceso");
    }

    @Test
    void alguienDeFueraDelEquipoPuedeTomarUnaTareaYSeUneAlProyecto() {
        // Un usuario nuevo, que no figura entre los integrantes del proyecto.
        var recienLlegado = sesionService.accesoRapido("Ana Nueva", "ana.nueva@u.edu");

        TareaFaseDTO libre = tareasDe("cognitiva").stream()
                .filter(tarea -> tarea.bloqueantes().isEmpty())
                .findFirst()
                .orElseThrow();
        faseService.liberar(libre.id());

        TareaFaseDTO tomada = faseService.reclamar(libre.id(), recienLlegado.getId());
        assertThat(tomada.responsable()).isEqualTo("Ana Nueva");
    }

    @Test
    void losCuatroEstadosDeTareaEstanDisponibles() {
        Long id = tareasDe("cognitiva").get(0).id();

        assertThat(faseService.cambiarEstado(id, "en-revision").estadoEtiqueta()).isEqualTo("En revisión");
        assertThat(faseService.cambiarEstado(id, "terminada").estadoEtiqueta()).isEqualTo("Terminada");
        assertThat(faseService.cambiarEstado(id, "sin-empezar").estadoEtiqueta()).isEqualTo("Sin empezar");
        assertThat(faseService.cambiarEstado(id, "en-proceso").estadoEtiqueta()).isEqualTo("En proceso");
    }

    @Test
    void losNombresAntiguosDeEstadoSeSiguenEntendiendo() {
        Long id = tareasDe("cognitiva").get(0).id();
        // Datos guardados antes del cambio de estados.
        assertThat(faseService.cambiarEstado(id, "done").estado()).isEqualTo("terminada");
        assertThat(faseService.cambiarEstado(id, "in-progress").estado()).isEqualTo("en-proceso");
        assertThat(faseService.cambiarEstado(id, "pending").estado()).isEqualTo("sin-empezar");
    }

    // ------------------------------------------------------------ entregables

    @Test
    void elTipoDeEntregableSeDeduceDelEnlace() {
        EntregableDTO canva = entregableService.registrar("cognitiva", new PeticionEntregable(
                "Presentación", null, "https://www.canva.com/design/abc", null, null, null, null));
        assertThat(canva.tipo()).isEqualTo("DISENO");

        EntregableDTO word = entregableService.registrar("cognitiva", new PeticionEntregable(
                "Informe", null, "https://docs.google.com/document/d/abc", null, null, null, null));
        assertThat(word.tipo()).isEqualTo("DOCUMENTO");

        EntregableDTO repo = entregableService.registrar("cognitiva", new PeticionEntregable(
                "Código", null, "https://github.com/equipo/proyecto", null, null, null, null));
        assertThat(repo.tipo()).isEqualTo("CODIGO");
    }

    @Test
    void seCambiaElEstadoDeUnEntregable() {
        EntregableDTO entregable = entregableService.registrar("cognitiva", new PeticionEntregable(
                "Anexos", null, "https://ejemplo.com/anexos", null, null, null, null));
        assertThat(entregable.estado()).isEqualTo("BORRADOR");

        assertThat(entregableService.cambiarEstado(entregable.id(), "final").estadoEtiqueta())
                .isEqualTo("Final");
    }

    // ------------------------------------------------------------ acceso sencillo

    @Test
    void elAccesoRapidoCreaLaCuentaConSoloElNombre() {
        var usuario = sesionService.accesoRapido("Camila Herrera", null);
        assertThat(usuario.getNombre()).isEqualTo("Camila");
        assertThat(usuario.getApellido()).isEqualTo("Herrera");
        // Sin correo se genera uno interno para no pedir más datos.
        assertThat(usuario.getCorreo()).isEqualTo("camila-herrera@studyflow.local");
        assertThat(sesionService.haySesionIniciada()).isTrue();
    }

    @Test
    void entrarDosVecesConElMismoCorreoReutilizaLaCuenta() {
        var primera = sesionService.accesoRapido("Diego Salas", "diego@u.edu");
        var segunda = sesionService.accesoRapido("Diego S.", "diego@u.edu");
        assertThat(segunda.getId()).isEqualTo(primera.getId());
    }
}
