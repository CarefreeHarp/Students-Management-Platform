package com.studyflow.platform.service.impl;

import tools.jackson.databind.JsonNode;
import com.studyflow.platform.model.dto.PeticionGenerarHorario;
import com.studyflow.platform.model.dto.PeticionGenerarHorario.Franja;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class GeneradorHorariosGemini {

    public record Propuesta(String nombre, String descripcion, List<Integer> opciones) {}

    private static final String INSTRUCCIONES = """
            Eres el planificador universitario de StudyFlow. Busca tres combinaciones distintas y
            ordénalas de mayor a menor afinidad con las preferencias. Si solo existen dos, entrega
            ambas; si solo existe una, entrega esa. Cada materia tiene opciones de sección.
            Cada opción incluye TODAS sus franjas obligatorias. En "opciones" devuelve
            un entero por materia, en el mismo orden de la entrada: 1 para su primera sección,
            2 para la segunda, etc. Dos horarios distintos deben cambiar al menos un valor de
            "opciones". Usa 0 solo si ninguna sección de esa materia cabe en ese horario.
            La entrada incluye ejemplosCompatibles ya verificados. Puedes elegirlos o proponer
            otras combinaciones mejores. Compara al menos tantos horarios distintos como ejemplos
            recibas y usa un ejemplo sin repetir si otra combinación tendría cruces.
            Maximiza las materias compatibles, o sus créditos si masCreditos es true.
            Nunca cruces franjas del mismo día. Una clase puede empezar justo cuando termina otra.
            Ten en cuenta la jornada (early: empezar temprano, late: terminar tarde, any: indiferente)
            y las pausas (short: cortas, long: largas, any: indiferente). Pon a cada horario un
            nombre breve en español y explica en una frase de hasta 250 caracteres cómo queda
            la semana según sus horas y pausas.
            """;

    private static final String RESPUESTA_INVALIDA =
            "Gemini no devolvió un horario válido con estas secciones. Vuelve a generar las alternativas.";

    private final ClienteGemini gemini;

    public GeneradorHorariosGemini(ClienteGemini gemini) {
        this.gemini = gemini;
    }

    public List<Propuesta> generar(PeticionGenerarHorario oferta) {
        oferta.validarFranjas();
        var ejemplos = ejemplosCompatibles(oferta);
        var datos = Map.of("materias", numerarSecciones(oferta), "preferencias", oferta.preferencias(),
                "ejemplosCompatibles", ejemplos);
        var respuesta = gemini.generar(INSTRUCCIONES, datos,
                esquemaRespuesta(oferta.materias().size(), ejemplos.size()), RESPUESTA_INVALIDA);
        return leerPropuestas(respuesta.contenido(), oferta);
    }

    private List<Map<String, Object>> numerarSecciones(PeticionGenerarHorario oferta) {
        // Las referencias numéricas bastan para planificar sin enviar nombres al proveedor.
        List<Map<String, Object>> materias = new ArrayList<>();
        for (var materia : oferta.materias()) {
            List<Map<String, Object>> secciones = new ArrayList<>();
            for (var franjas : materia.opciones()) {
                secciones.add(Map.of("opcion", secciones.size() + 1, "franjas", franjas));
            }
            materias.add(Map.of("materia", materias.size() + 1, "creditos", materia.creditos(), "opciones", secciones));
        }
        return materias;
    }

    // Ejemplos de factibilidad para el modelo. Las recomendaciones que se publican
    // siempre proceden de su respuesta y pasan de nuevo por validarSeleccion.
    private List<List<Integer>> ejemplosCompatibles(PeticionGenerarHorario oferta) {
        List<List<Integer>> ejemplos = new ArrayList<>();
        for (int i = 0; i < oferta.materias().size(); i++) {
            var secciones = oferta.materias().get(i).opciones();
            for (int j = 0; j < secciones.size(); j++) {
                var ejemplo = completarDesde(oferta, i, j);
                if (!ejemplos.contains(ejemplo)) ejemplos.add(ejemplo);
                if (ejemplos.size() == 3) return ejemplos;
            }
        }
        return ejemplos;
    }

    private List<Integer> completarDesde(PeticionGenerarHorario oferta, int materiaInicial, int seccionInicial) {
        var materias = oferta.materias();
        var indices = new ArrayList<>(Collections.nCopies(materias.size(), 0));
        indices.set(materiaInicial, seccionInicial + 1);
        var ocupadas = new ArrayList<>(materias.get(materiaInicial).opciones().get(seccionInicial));
        for (int i = 0; i < materias.size(); i++) {
            if (i == materiaInicial) continue;
            var opciones = materias.get(i).opciones();
            for (int j = 0; j < opciones.size(); j++) {
                if (cabe(opciones.get(j), ocupadas)) {
                    indices.set(i, j + 1);
                    ocupadas.addAll(opciones.get(j));
                    break;
                }
            }
        }
        return indices;
    }

    private Map<String, Object> esquemaRespuesta(int cantidad, int minimo) {
        return Map.of("type", "array", "minItems", minimo, "maxItems", 3,
                "items", Map.of("type", "object", "required", List.of("opciones", "nombre", "descripcion"),
                        "properties", Map.of(
                                "opciones", Map.of("type", "array", "minItems", cantidad, "maxItems", cantidad,
                                        "items", Map.of("type", "integer")),
                                "nombre", Map.of("type", "string"), "descripcion", Map.of("type", "string"))));
    }

    private List<Propuesta> leerPropuestas(JsonNode lista, PeticionGenerarHorario oferta) {
        if (!lista.isArray() || lista.size() > 3) throw respuestaInvalida();

        List<Propuesta> propuestas = new ArrayList<>();
        Set<List<Integer>> vistas = new HashSet<>();
        for (JsonNode item : lista) {
            if (!item.path("nombre").isTextual() || !item.path("descripcion").isTextual()) continue;
            String nombre = item.path("nombre").asText("").strip();
            String descripcion = item.path("descripcion").asText("").strip();
            if (nombre.isEmpty() || nombre.length() > 120 || descripcion.isEmpty() || descripcion.length() > 300) continue;
            List<Integer> opciones = validarSeleccion(item.path("opciones"), oferta);
            if (!opciones.isEmpty() && vistas.add(opciones)) propuestas.add(new Propuesta(nombre, descripcion, opciones));
        }
        if (propuestas.isEmpty()) throw respuestaInvalida();
        return propuestas;
    }

    private List<Integer> validarSeleccion(JsonNode seleccion, PeticionGenerarHorario oferta) {
        if (!seleccion.isArray() || seleccion.size() != oferta.materias().size()) return List.of();
        List<Integer> indices = new ArrayList<>();
        List<Franja> ocupadas = new ArrayList<>();
        List<List<Franja>> omitidas = new ArrayList<>();
        for (int i = 0; i < seleccion.size(); i++) {
            JsonNode valor = seleccion.get(i);
            var secciones = oferta.materias().get(i).opciones();
            if (!valor.isIntegralNumber() || !valor.canConvertToInt()) return List.of();
            int indice = valor.intValue();
            if (indice < 0 || indice > secciones.size()) return List.of();
            indices.add(indice);
            if (indice == 0) {
                omitidas.addAll(secciones);
            } else {
                var franjas = secciones.get(indice - 1);
                if (!cabe(franjas, ocupadas)) return List.of();
                ocupadas.addAll(franjas);
            }
        }
        // Una propuesta incompleta solo sirve si cada sección omitida tiene algún cruce.
        if (ocupadas.isEmpty() || omitidas.stream().anyMatch(seccion -> cabe(seccion, ocupadas))) return List.of();
        return indices;
    }

    private boolean cabe(List<Franja> seccion, List<Franja> ocupadas) {
        return seccion.stream().noneMatch(franja -> ocupadas.stream().anyMatch(franja::chocaCon));
    }

    private ResponseStatusException respuestaInvalida() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                RESPUESTA_INVALIDA);
    }
}
