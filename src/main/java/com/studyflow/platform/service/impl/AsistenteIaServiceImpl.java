package com.studyflow.platform.service.impl;

import com.studyflow.platform.model.dto.PeticionTarea;
import com.studyflow.platform.service.AsistenteIaService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Simulacion del asistente de planificacion.
 * Reparte un conjunto de etapas entre los integrantes y distribuye las fechas
 * de forma uniforme hasta la entrega final.
 */
@Service
public class AsistenteIaServiceImpl implements AsistenteIaService {

    private static final List<String[]> PLANTILLA = List.of(
            new String[]{"Definir alcance y objetivos", "Investigación", "Acordar el problema, el alcance y los entregables del proyecto."},
            new String[]{"Investigación y referentes", "Investigación", "Reunir fuentes, casos similares y requisitos clave."},
            new String[]{"Propuesta de solución", "Diseño", "Bocetar la solución y validarla con el equipo."},
            new String[]{"Construcción del primer avance", "Desarrollo", "Implementar la versión inicial de la propuesta."},
            new String[]{"Revisión interna", "Desarrollo", "Revisar calidad, corregir observaciones y ajustar pendientes."},
            new String[]{"Preparar la entrega", "Entrega", "Consolidar documento, demo y presentación final."}
    );

    @Override
    public List<PeticionTarea> proponerPlan(String descripcion, LocalDate fechaEntrega, List<String> integrantes) {
        LocalDate entrega = fechaEntrega != null ? fechaEntrega : LocalDate.now().plusWeeks(4);
        LocalDate inicio = LocalDate.now();
        long diasTotales = Math.max(PLANTILLA.size(), inicio.until(entrega).getDays()
                + inicio.until(entrega).getMonths() * 30L);
        long paso = Math.max(1, diasTotales / PLANTILLA.size());

        List<PeticionTarea> propuestas = new ArrayList<>();
        for (int i = 0; i < PLANTILLA.size(); i++) {
            String[] fila = PLANTILLA.get(i);
            String responsable = integrantes == null || integrantes.isEmpty()
                    ? null
                    : integrantes.get(i % integrantes.size());
            LocalDate fecha = inicio.plusDays(paso * (i + 1L));
            if (fecha.isAfter(entrega)) {
                fecha = entrega;
            }
            propuestas.add(new PeticionTarea(fila[0], fila[2], responsable, fila[1], fecha, "09:00", "pending"));
        }
        return propuestas;
    }

    @Override
    public String resumirContexto(String descripcion) {
        if (descripcion == null || descripcion.isBlank()) {
            return "Plan inicial sugerido con etapas de investigación, diseño, desarrollo y entrega.";
        }
        String limpio = descripcion.trim().replaceAll("\\s+", " ");
        String extracto = limpio.length() > 140 ? limpio.substring(0, 140) + "…" : limpio;
        return "A partir de \"%s\" se propone un plan de %d tareas distribuidas hasta la entrega."
                .formatted(extracto, PLANTILLA.size());
    }
}
