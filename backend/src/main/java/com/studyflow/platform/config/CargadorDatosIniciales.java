package com.studyflow.platform.config;

import com.studyflow.platform.model.dto.PeticionIntegrante;
import com.studyflow.platform.model.dto.PeticionProyecto;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.entity.ApunteClase;
import com.studyflow.platform.model.entity.BloqueHorario;
import com.studyflow.platform.model.entity.Canal;
import com.studyflow.platform.model.entity.Materia;
import com.studyflow.platform.model.entity.MensajeChat;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.entity.Universidad;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.DiaSemana;
import com.studyflow.platform.model.enums.ProveedorAcceso;
import com.studyflow.platform.model.enums.TipoCanal;
import com.studyflow.platform.repository.ApunteClaseRepository;
import com.studyflow.platform.repository.MateriaRepository;
import com.studyflow.platform.repository.UniversidadRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.security.Contrasenas;
import com.studyflow.platform.service.ProyectoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Inicializa una base H2 en memoria con el proyecto compartido de demostración. */
@Configuration
@ConditionalOnProperty(name = "studyflow.demo.enabled", havingValue = "true")
public class CargadorDatosIniciales {
    private static final String VIOLETA = "#5b5ce2";
    private static final String VERDE = "#2ca89b";

    @Bean
    public CommandLineRunner sembrar(UsuarioRepository usuarios,
                                     UniversidadRepository universidades,
                                     MateriaRepository materias,
                                     ApunteClaseRepository apuntes,
                                     ProyectoService proyectos,
                                     Contrasenas contrasenas,
                                     TransactionTemplate transaccion,
                                     @Value("${spring.datasource.url}") String urlBaseDeDatos,
                                     @Value("${studyflow.demo.password}") String contrasenaDemo) {
        return args -> transaccion.executeWithoutResult(estado -> {
            if (!urlBaseDeDatos.startsWith("jdbc:h2:mem:") || usuarios.count() > 0) return;

            Universidad universidad = universidades.save(new Universidad("Universidad Nacional de Colombia", "Colombia"));
            Usuario valentina = usuarios.save(usuario("Valentina", "Rojas", "valentina.rojas@universidad.edu.co",
                    universidad, contrasenas.nueva(contrasenaDemo), "/assets/img/avatares-demo/valentina.webp"));
            Usuario mateo = usuarios.save(usuario("Mateo", "Díaz", "mateo@universidad.edu.co",
                    universidad, contrasenas.nueva(contrasenaDemo), "/assets/img/avatares-demo/mateo.webp"));

            LocalDate hoy = LocalDate.now();
            Proyecto cognitiva = crearProyecto(proyectos, valentina, mateo, hoy);
            cargarConversaciones(cognitiva, valentina, mateo);

            Materia compartida = materiaCompartida(valentina);
            materias.saveAll(List.of(
                    compartida,
                    materia(valentina, "Bases de datos avanzadas", 3, 1, DiaSemana.MARTES, 10, 12),
                    materia(valentina, "Interacción humano-computador", 3, 2, DiaSemana.MIERCOLES, 14, 16),
                    materiaCompartida(mateo),
                    materia(mateo, "Redes de computadores", 3, 1, DiaSemana.JUEVES, 10, 12),
                    materia(mateo, "Estadística aplicada", 3, 2, DiaSemana.VIERNES, 8, 10)));

            ApunteClase apunte = new ApunteClase();
            apunte.setUsuario(valentina);
            apunte.setMateria(compartida);
            apunte.setTitulo("Entregar el taller de patrones de diseño");
            apunte.setContenido("Resolver los ejercicios 3 y 5, entrega individual en PDF.");
            apunte.setFechaClase(hoy);
            apunte.setFechaLimite(hoy.plusDays(5));
            apunte.setImportante(true);
            apuntes.save(apunte);
        });
    }

    private Proyecto crearProyecto(ProyectoService proyectos, Usuario valentina, Usuario mateo, LocalDate hoy) {
        var creado = proyectos.crear(new PeticionProyecto(
                "Cognitiva",
                "Prototipo para visualizar hábitos de estudio y bienestar universitario.",
                hoy.plusDays(28), "Investigación", VIOLETA,
                List.of(new PeticionIntegrante(mateo.getNombreCompleto(), mateo.getCorreo(), VERDE)),
                List.of(
                        new PeticionTarea("Entrevistas a estudiantes", "Sintetizar los hallazgos de las entrevistas.",
                                valentina.getNombreCompleto(), "Investigación", hoy, "09:00", "completed"),
                        new PeticionTarea("Diseñar flujo de onboarding", "Definir las pantallas y mensajes de bienvenida.",
                                mateo.getNombreCompleto(), "Diseño", hoy.plusDays(3), "11:00", "in-progress"),
                        new PeticionTarea("Prototipo de analítica", "Crear el tablero de hábitos de estudio.",
                                null, "Desarrollo", hoy.plusDays(8), "14:00", "pending"),
                        new PeticionTarea("Presentación de avance", "Preparar el guion y mostrar el prototipo.",
                                valentina.getNombreCompleto(), "Entrega", hoy.plusDays(14), "10:00", "pending")),
                List.of("Investigación", "Diseño", "Desarrollo", "Entrega"), "libre"), valentina.getId());

        Proyecto proyecto = proyectos.obtenerEntidadPorCodigo(creado.codigo());
        proyecto.getIntegrantes().stream()
                .filter(integrante -> mateo.getCorreo().equals(integrante.getContacto()))
                .findFirst().orElseThrow().setUsuario(mateo);

        List<Tarea> tareas = proyecto.getTareas();
        tareas.get(0).setResultadoTexto("Las entrevistas confirmaron que el calendario y la vista semanal son prioritarios.");
        for (int i = 1; i < tareas.size(); i++) {
            tareas.get(i).getDependencias().add(tareas.get(i - 1));
        }
        return proyecto;
    }

    private void cargarConversaciones(Proyecto proyecto, Usuario valentina, Usuario mateo) {
        Canal general = proyecto.getCanales().stream()
                .filter(canal -> Canal.NOMBRE_GENERAL.equals(canal.getSlug()))
                .findFirst().orElseThrow();
        List<MensajeChat> debate = List.of(
                mensaje(valentina, VIOLETA,
                        "Para la pantalla de inicio propongo un tablero Kanban con tarjetas por estado."),
                mensaje(mateo, VERDE,
                        "Me inclino por un calendario mensual con FullCalendar. Así vemos las entregas de todo el mes."),
                mensaje(valentina, VIOLETA,
                        "Vale, acordemos por ahora el calendario mensual. Podríamos tener un borrador el miércoles."),
                mensaje(mateo, VERDE,
                        "Volví a mirar las entrevistas: necesitan organizar la semana. ¿Cambiamos a un calendario semanal?"),
                mensaje(valentina, VIOLETA,
                        "Sí, mejor semanal que mensual. Quizá basta con una lista por día, sin cuadrícula."),
                mensaje(mateo, VERDE,
                        "La lista oculta los cruces de horario. Propongo una cuadrícula semanal con CSS Grid y tarjetas con título, hora y estado."),
                mensaje(valentina, VIOLETA,
                        "De acuerdo con la cuadrícula y esas tarjetas. Cambiemos el borrador al viernes a las 16:00. Yo reviso móvil y accesibilidad ese día a las 17:00."),
                mensaje(mateo, VERDE,
                        "Confirmo que yo implemento la cuadrícula y comparto el borrador el viernes a las 16:00. ¿Le ponemos notificaciones push?"),
                mensaje(valentina, VIOLETA,
                        "Las notificaciones siguen por decidir. El acuerdo final es la cuadrícula semanal en CSS Grid con título, hora y estado. Tú compartes el borrador el viernes a las 16:00 y yo reviso móvil y accesibilidad ese mismo día a las 17:00."),
                mensaje(mateo, VERDE,
                        "Confirmado. Con eso queda cerrado el alcance de la primera pantalla."));
        LocalDateTime inicioDebate = LocalDateTime.now().minusMinutes(debate.size());
        for (int i = 0; i < debate.size(); i++) {
            MensajeChat aporte = debate.get(i);
            aporte.setFechaEnvio(inicioDebate.plusMinutes(i));
            general.agregarMensaje(aporte);
        }

        Canal prototipo = new Canal("Prototipo", TipoCanal.LIBRE, 1);
        prototipo.setDescripcion("Decisiones de diseño y avances del prototipo.");
        prototipo.setCreador(mateo);
        prototipo.agregarMensaje(mensaje(mateo, VERDE,
                "Propongo mostrar primero el calendario y dejar el gráfico de hábitos en una segunda vista."));
        prototipo.agregarMensaje(mensaje(valentina, VIOLETA,
                "De acuerdo con empezar por el calendario. Falta definir cómo mostramos las semanas sin tareas."));
        proyecto.agregarCanal(prototipo);

        Canal entrega = new Canal("Entrega", TipoCanal.LIBRE, 2);
        entrega.setDescripcion("Acuerdos para la presentación del proyecto.");
        entrega.setCreador(valentina);
        entrega.agregarMensaje(mensaje(valentina, VIOLETA,
                "Yo preparo el guion de la presentación cuando tengamos el prototipo."));
        entrega.agregarMensaje(mensaje(mateo, VERDE,
                "Yo grabo la demostración. Queda pendiente confirmar cuánto tiempo tenemos para presentar."));
        proyecto.agregarCanal(entrega);
    }

    private Usuario usuario(String nombre, String apellido, String correo, Universidad universidad,
                            String hash, String avatarUrl) {
        Usuario usuario = new Usuario();
        usuario.setNombre(nombre);
        usuario.setApellido(apellido);
        usuario.setCorreo(correo);
        usuario.setUniversidad(universidad);
        usuario.setPrograma("Ingeniería de Sistemas");
        usuario.setSemestre(6);
        usuario.setProveedor(ProveedorAcceso.DEMOSTRACION);
        usuario.setContrasenaHash(hash);
        usuario.setAvatarUrl(avatarUrl);
        return usuario;
    }

    private MensajeChat mensaje(Usuario autor, String color, String contenido) {
        MensajeChat mensaje = new MensajeChat(autor.getNombreCompleto(), contenido);
        mensaje.setAutor(autor);
        mensaje.setAutorColor(color);
        return mensaje;
    }

    private Materia materiaCompartida(Usuario usuario) {
        Materia materia = materia(usuario, "Arquitectura de software", 4, 0, DiaSemana.LUNES, 8, 10);
        materia.setCodigo("ARQ-301");
        materia.setProfesor("Prof. Andrea Torres");
        return materia;
    }

    private Materia materia(Usuario usuario, String nombre, int creditos, int color,
                            DiaSemana dia, int inicio, int fin) {
        Materia materia = new Materia();
        materia.setUsuario(usuario);
        materia.setNombre(nombre);
        materia.setCreditos(creditos);
        materia.setIndiceColor(color);
        materia.agregarBloque(new BloqueHorario(dia, LocalTime.of(inicio, 0), LocalTime.of(fin, 0), null));
        return materia;
    }
}
