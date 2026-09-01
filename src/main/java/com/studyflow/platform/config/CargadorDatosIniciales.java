package com.studyflow.platform.config;

import com.studyflow.platform.model.dto.PeticionIntegrante;
import com.studyflow.platform.model.dto.PeticionProyecto;
import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.model.entity.BloqueHorario;
import com.studyflow.platform.model.entity.Materia;
import com.studyflow.platform.model.entity.Universidad;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.DiaSemana;
import com.studyflow.platform.repository.MateriaRepository;
import com.studyflow.platform.repository.UniversidadRepository;
import com.studyflow.platform.repository.UsuarioRepository;
import com.studyflow.platform.service.ProyectoService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
                                     ProyectoService proyectoService) {
        return args -> {
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

            materiaRepository.saveAll(List.of(
                    materia(valentina, "Arquitectura de software", "Prof. Andrea Torres", 4, 0,
                            DiaSemana.LUNES, LocalTime.of(8, 0), LocalTime.of(10, 0)),
                    materia(valentina, "Bases de datos avanzadas", "Prof. Camilo Rueda", 3, 1,
                            DiaSemana.MARTES, LocalTime.of(10, 0), LocalTime.of(12, 0)),
                    materia(valentina, "Interacción humano-computador", "Prof. Lucía Peña", 3, 2,
                            DiaSemana.MIERCOLES, LocalTime.of(14, 0), LocalTime.of(16, 0)),
                    materia(valentina, "Gestión de proyectos TI", "Prof. Julián Mora", 2, 3,
                            DiaSemana.JUEVES, LocalTime.of(16, 0), LocalTime.of(18, 0))));
        };
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
