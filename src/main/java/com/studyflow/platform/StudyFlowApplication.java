package com.studyflow.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de entrada de StudyFlow.
 *
 * <p>Arquitectura por capas (IMVC):</p>
 * <ul>
 *   <li><b>I - Interfaz</b>: recursos estaticos ({@code static/css}, {@code static/js}).</li>
 *   <li><b>V - Vista</b>: plantillas Thymeleaf de {@code resources/templates}.</li>
 *   <li><b>C - Controlador</b>: {@code controller.view} (paginas) y {@code controller.api} (REST).</li>
 *   <li><b>M - Modelo</b>: {@code model.entity}, {@code model.dto} y {@code model.enums},
 *       apoyados por las capas {@code service} (reglas de negocio) y
 *       {@code repository} (persistencia en MySQL).</li>
 * </ul>
 */
@SpringBootApplication
@EnableScheduling
public class StudyFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudyFlowApplication.class, args);
    }
}
