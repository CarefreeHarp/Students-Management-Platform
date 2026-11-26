package com.studyflow.platform.service.impl;

import com.studyflow.platform.service.ClienteIaConversacional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Implementacion simulada del asistente. Activa por defecto.
 *
 * <p>No inventa contenido: analiza el texto recibido y devuelve una sintesis
 * construida con reglas sencillas (frecuencia de terminos, deteccion de
 * preguntas, acuerdos y fechas). El objetivo es que la interfaz se pueda
 * probar de principio a fin sin gastar cuota de API.</p>
 */
@Service
@ConditionalOnProperty(name = "studyflow.ia.enabled", havingValue = "false", matchIfMissing = true)
public class ClienteIaSimulado implements ClienteIaConversacional {

    /** Palabras que no aportan significado al extraer los temas de la conversacion. */
    private static final Set<String> VACIAS = new LinkedHashSet<>(Arrays.asList(
            "para", "pero", "como", "esta", "este", "esto", "estamos", "tengo", "hacer", "puedo",
            "vamos", "sobre", "porque", "cuando", "donde", "todo", "todos", "nada", "muy", "mas",
            "que", "con", "los", "las", "del", "por", "una", "uno", "unos", "unas", "ser", "hay",
            "creo", "bien", "entonces", "tambien", "ahora", "aqui", "eso", "sea", "les", "nos",
            // Verbos frecuentes: aparecen en casi cualquier conversacion y no
            // identifican de que se esta hablando.
            "acordamos", "quedamos", "necesitamos", "podemos", "tenemos", "hagamos", "queda",
            "quedan", "listo", "lista", "revisamos", "revisar", "mañana", "manana", "hoy",
            "encargo", "comparto", "termino", "arranco", "recuerden", "incluir"));

    private static final List<String> MARCAS_ACUERDO = List.of(
            "quedamos", "acordamos", "listo", "de acuerdo", "hagamos", "yo me encargo",
            "me encargo", "lo hago", "asignamos", "definimos", "confirmo");

    @Override
    public String completar(String instruccionSistema, String entrada) {
        if (entrada == null || entrada.isBlank()) {
            return "No hay contenido suficiente para generar un resumen.";
        }

        List<String> lineas = entrada.lines()
                .map(String::trim)
                .filter(linea -> !linea.isBlank())
                .toList();

        // Los temas se extraen solo del contenido: si se analizara la línea completa,
        // los nombres de los autores acabarían apareciendo como si fueran temas.
        String cuerpo = String.join("\n", lineas.stream().map(this::sinAutor).toList());
        String temas = String.join(", ", terminosFrecuentes(cuerpo, 3));
        long preguntas = lineas.stream().filter(linea -> linea.contains("?")).count();
        long acuerdos = lineas.stream().filter(this::pareceAcuerdo).count();

        StringBuilder resumen = new StringBuilder();
        resumen.append("La conversación reúne %d intervenciones".formatted(lineas.size()));
        if (!temas.isBlank()) {
            resumen.append(" y gira alrededor de: ").append(temas);
        }
        resumen.append(". ");
        if (acuerdos > 0) {
            resumen.append("Se registran %d mensajes con acuerdos o repartos de trabajo. ".formatted(acuerdos));
        }
        if (preguntas > 0) {
            resumen.append("Quedan %d preguntas abiertas que conviene retomar. ".formatted(preguntas));
        }
        if (acuerdos == 0 && preguntas == 0) {
            resumen.append("Aún no hay decisiones explícitas; el equipo sigue compartiendo contexto. ");
        }
        resumen.append("\n[Resumen generado en modo simulación: active studyflow.ia.enabled para usar la API real.]");
        return resumen.toString();
    }

    @Override
    public String getModelo() {
        return "simulado";
    }

    @Override
    public boolean estaConectada() {
        return false;
    }

    /** Quita el prefijo "Nombre: " de una línea de conversación. */
    private String sinAutor(String linea) {
        int separador = linea.indexOf(": ");
        return separador > 0 && separador < 40 ? linea.substring(separador + 2) : linea;
    }

    private boolean pareceAcuerdo(String linea) {
        String minusculas = linea.toLowerCase();
        return MARCAS_ACUERDO.stream().anyMatch(minusculas::contains);
    }

    /** Terminos mas repetidos, ignorando conectores y palabras cortas. */
    private List<String> terminosFrecuentes(String texto, int cuantos) {
        return Arrays.stream(texto.toLowerCase().split("[^a-záéíóúñü]+"))
                .filter(palabra -> palabra.length() > 3)
                .filter(palabra -> !VACIAS.contains(palabra))
                .collect(java.util.stream.Collectors.groupingBy(p -> p, java.util.stream.Collectors.counting()))
                .entrySet().stream()
                .sorted(java.util.Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(cuantos)
                .map(java.util.Map.Entry::getKey)
                .toList();
    }
}
