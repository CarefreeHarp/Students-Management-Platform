package com.studyflow.platform.config;

import com.studyflow.platform.model.dto.PeticionIntegrante;
import com.studyflow.platform.model.dto.PeticionProyecto;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.entity.ApunteClase;
import com.studyflow.platform.model.entity.BloqueHorario;
import com.studyflow.platform.model.entity.Canal;
import com.studyflow.platform.model.entity.Entregable;
import com.studyflow.platform.model.entity.Materia;
import com.studyflow.platform.model.entity.MensajeChat;
import com.studyflow.platform.model.entity.Proyecto;
import com.studyflow.platform.model.entity.Tarea;
import com.studyflow.platform.model.entity.Universidad;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.DiaSemana;
import com.studyflow.platform.model.enums.EstadoEntregable;
import com.studyflow.platform.model.enums.TipoCanal;
import com.studyflow.platform.model.enums.TipoEntregable;
import com.studyflow.platform.repository.ApunteClaseRepository;
import com.studyflow.platform.repository.CanalRepository;
import com.studyflow.platform.repository.EntregableRepository;
import com.studyflow.platform.repository.MateriaRepository;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.repository.UniversidadRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.service.ProyectoService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Base64;
import java.util.List;

/**
 * Carga los datos de demostracion cuando la base esta vacia.
 * Reproduce el contenido de prueba que ya usaba la interfaz, de modo que
 * la aplicacion se vea igual con o sin backend conectado.
 */
@Configuration
public class CargadorDatosIniciales {

    @Bean
    public CommandLineRunner sembrar(UsuarioRepository usuarioRepository,
                                     UniversidadRepository universidadRepository,
                                     MateriaRepository materiaRepository,
                                     ProyectoRepository proyectoRepository,
                                     CanalRepository canalRepository,
                                     EntregableRepository entregableRepository,
                                     ApunteClaseRepository apunteRepository,
                                     ProyectoService proyectoService,
                                     TransactionTemplate transaccion) {
        return args -> transaccion.executeWithoutResult(estado -> {
            if (usuarioRepository.count() > 0) {
                return;
            }

            Universidad universidad = universidadRepository.save(
                    new Universidad("Universidad Nacional de Colombia", "Colombia"));

            Usuario valentina = new Usuario();
            valentina.setNombre("Valentina");
            valentina.setApellido("Rojas");
            valentina.setCorreo("valentina.rojas@universidad.edu.co");
            valentina.setContrasenaHash(Base64.getEncoder().encodeToString("studyflow".getBytes()));
            valentina.setEdad(21);
            valentina.setUniversidad(universidad);
            valentina.setPrograma("Ingeniería de Sistemas");
            valentina.setSemestre(6);
            valentina.setDescripcion("Diseño soluciones que hacen más fácil aprender, colaborar y crear.");
            usuarioRepository.save(valentina);

            proyectoService.crear(new PeticionProyecto(
                    "Cognitiva",
                    "Aplicación para visualizar hábitos de estudio y bienestar universitario.",
                    LocalDate.of(2026, 8, 21),
                    "Desarrollo",
                    "#5b5ce2",
                    List.of(new PeticionIntegrante("Mateo Díaz", "mateo@universidad.edu.co", "#e2779b"),
                            new PeticionIntegrante("Sara Gómez", "sara@universidad.edu.co", "#2ca89b")),
                    List.of(
                            new PeticionTarea("Diseñar flujo de onboarding", "Definir las pantallas y mensajes de bienvenida.",
                                    "Valentina Rojas", "Diseño", LocalDate.of(2026, 8, 13), "09:00", "in-progress"),
                            new PeticionTarea("Entrevistas a estudiantes", "Sintetizar hallazgos de las entrevistas realizadas.",
                                    "Mateo Díaz", "Investigación", LocalDate.of(2026, 8, 14), "11:00", "pending"),
                            new PeticionTarea("Prototipo de analítica", "Crear primera versión del tablero de hábitos.",
                                    "Sara Gómez", "Desarrollo", LocalDate.of(2026, 8, 15), "14:00", "pending"),
                            new PeticionTarea("Presentación de avance", "Preparar demo y narrativa para la revisión.",
                                    "Valentina Rojas", "Entrega", LocalDate.of(2026, 8, 19), "10:00", "completed"))
            ), valentina.getId());

            proyectoService.crear(new PeticionProyecto(
                    "Redes inteligentes",
                    "Propuesta de optimización para una red de sensores del campus.",
                    LocalDate.of(2026, 8, 28),
                    "Investigación",
                    "#19a7bd",
                    List.of(new PeticionIntegrante("Daniela Ruiz", "daniela@universidad.edu.co", "#f0a33f")),
                    List.of(
                            new PeticionTarea("Mapa de actores", "Identificar usuarios, áreas y responsables involucrados.",
                                    "Daniela Ruiz", "Investigación", LocalDate.of(2026, 8, 13), "13:00", "in-progress"),
                            new PeticionTarea("Modelo de datos", "Definir entidades y métricas del sistema de sensores.",
                                    "Valentina Rojas", "Planeación", LocalDate.of(2026, 8, 16), "08:00", "pending"),
                            new PeticionTarea("Revisar bibliografía", "Organizar fuentes y referencias principales.",
                                    "Valentina Rojas", "Investigación", LocalDate.of(2026, 8, 18), "15:00", "completed"))
            ), valentina.getId());

            proyectoService.crear(new PeticionProyecto(
                    "Laboratorio UX",
                    "Rediseño colaborativo de la experiencia de préstamo de equipos.",
                    LocalDate.of(2026, 9, 4),
                    "Planeación",
                    "#d7639d",
                    List.of(new PeticionIntegrante("Nicolás Vega", "nicolas@universidad.edu.co", "#7c76d9"),
                            new PeticionIntegrante("Sara Gómez", "sara@universidad.edu.co", "#2ca89b")),
                    List.of(
                            new PeticionTarea("Auditoría de interfaz", "Registrar hallazgos de accesibilidad y experiencia.",
                                    "Nicolás Vega", "Diseño", LocalDate.of(2026, 8, 17), "10:00", "pending"),
                            new PeticionTarea("Organizar pruebas de uso", "Convocar estudiantes y preparar guion de pruebas.",
                                    "Sara Gómez", "Investigación", LocalDate.of(2026, 8, 20), "14:00", "pending"))
            ), valentina.getId());

            // Cada proyecto arranca con su canal #general.
            proyectoRepository.findAll().forEach(proyecto -> {
                Canal general = new Canal("general", TipoCanal.GENERAL, 0);
                general.setDescripcion("Coordinación general de " + proyecto.getNombre());
                general.setCreador(valentina);
                proyecto.agregarCanal(general);
                canalRepository.save(general);
            });

            // El proyecto de ejemplo tiene además un canal por tarea y una
            // conversación con material suficiente para el generador de resúmenes.
            proyectoRepository.findByCodigo("cognitiva").ifPresent(cognitiva -> {
                Canal general = canalRepository
                        .findByProyectoIdAndSlug(cognitiva.getId(), "general")
                        .orElseThrow();
                general.agregarMensaje(mensaje("Valentina Rojas", "#5b5ce2",
                        "Equipo, ya tengo el primer boceto del onboarding. ¿Lo revisamos mañana?"));
                general.agregarMensaje(mensaje("Mateo Díaz", "#e2779b",
                        "Perfecto. Yo termino las entrevistas hoy y comparto los hallazgos."));
                general.agregarMensaje(mensaje("Sara Gómez", "#2ca89b",
                        "Quedamos entonces en que yo arranco el prototipo de analítica el jueves."));
                general.agregarMensaje(mensaje("Valentina Rojas", "#5b5ce2",
                        "Acordamos eso. Recuerden que la entrega final es el 21 de agosto."));
                general.agregarMensaje(mensaje("Mateo Díaz", "#e2779b",
                        "¿Necesitamos incluir el marco teórico en la presentación?"));
                canalRepository.save(general);

                Canal prototipo = new Canal("tarea-prototipo", TipoCanal.TAREA, 10);
                prototipo.setDescripcion("Trabajo del prototipo de analítica");
                prototipo.setCreador(valentina);
                prototipo.agregarMensaje(mensaje("Sara Gómez", "#2ca89b",
                        "Subo aquí los avances del tablero para que los revisen."));
                cognitiva.agregarCanal(prototipo);
                canalRepository.save(prototipo);

                // Entregables de ejemplo: los enlaces donde vive el trabajo real.
                entregableRepository.saveAll(List.of(
                        entregable(cognitiva, "Informe final",
                                "https://docs.google.com/document/d/ejemplo-informe",
                                TipoEntregable.DOCUMENTO, EstadoEntregable.BORRADOR),
                        entregable(cognitiva, "Presentación de sustentación",
                                "https://www.canva.com/design/ejemplo-presentacion",
                                TipoEntregable.DISENO, EstadoEntregable.EN_REVISION)));

                // Dependencias entre tareas para que el diagrama de fases tenga forma.
                List<Tarea> tareas = cognitiva.getTareas();
                for (int i = 1; i < tareas.size(); i++) {
                    tareas.get(i).getDependencias().add(tareas.get(i - 1));
                }
            });

            // Apunte de clase con fecha límite: genera un recordatorio automático.
            ApunteClase apunte = new ApunteClase();
            apunte.setUsuario(valentina);
            apunte.setTitulo("Entregar el taller de patrones de diseño");
            apunte.setContenido("Resolver los ejercicios 3 y 5, entrega individual en PDF.");
            apunte.setFechaClase(LocalDate.now());
            apunte.setFechaLimite(LocalDate.now().plusDays(5));
            apunte.setImportante(true);
            apunteRepository.save(apunte);

            materiaRepository.saveAll(List.of(
                    materia(valentina, "Arquitectura de software", "Prof. Andrea Torres", 4, 0,
                            DiaSemana.LUNES, LocalTime.of(8, 0), LocalTime.of(10, 0)),
                    materia(valentina, "Bases de datos avanzadas", "Prof. Camilo Rueda", 3, 1,
                            DiaSemana.MARTES, LocalTime.of(10, 0), LocalTime.of(12, 0)),
                    materia(valentina, "Interacción humano-computador", "Prof. Lucía Peña", 3, 2,
                            DiaSemana.MIERCOLES, LocalTime.of(14, 0), LocalTime.of(16, 0)),
                    materia(valentina, "Gestión de proyectos TI", "Prof. Julián Mora", 2, 3,
                            DiaSemana.JUEVES, LocalTime.of(16, 0), LocalTime.of(18, 0))));
        });
    }

    private Entregable entregable(Proyecto proyecto, String nombre, String url,
                                  TipoEntregable tipo, EstadoEntregable estado) {
        Entregable entregable = new Entregable();
        entregable.setProyecto(proyecto);
        entregable.setNombre(nombre);
        entregable.setUrl(url);
        entregable.setTipo(tipo);
        entregable.setEstado(estado);
        return entregable;
    }

    private MensajeChat mensaje(String autor, String color, String contenido) {
        MensajeChat mensaje = new MensajeChat(autor, contenido);
        mensaje.setAutorColor(color);
        return mensaje;
    }

    private Materia materia(Usuario usuario, String nombre, String profesor, int creditos, int color,
                            DiaSemana dia, LocalTime inicio, LocalTime fin) {
        Materia materia = new Materia();
        materia.setUsuario(usuario);
        materia.setNombre(nombre);
        materia.setProfesor(profesor);
        materia.setCreditos(creditos);
        materia.setIndiceColor(color);
        materia.agregarBloque(new BloqueHorario(dia, inicio, fin, null));
        return materia;
    }
}
