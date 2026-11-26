package com.studyflow.platform.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/** Oferta de secciones del borrador. Todas las franjas de una sección se cursan juntas. */
public record PeticionGenerarHorario(
        @NotEmpty(message = "debe incluir al menos una materia")
        @Size(max = 40) List<@NotNull @Valid MateriaCandidata> materias,
        @Valid Preferencias preferencias
) {
    public PeticionGenerarHorario {
        if (preferencias == null) preferencias = new Preferencias("any", "any", false);
    }

    public record MateriaCandidata(
            @NotBlank @Size(max = 120) String nombre,
            @NotNull @Min(1) @Max(30) Integer creditos,
            @NotEmpty @Size(max = 20) List<@NotEmpty @Size(max = 14) List<@NotNull @Valid Franja>> opciones
    ) {}

    public record Franja(
            @NotNull @Pattern(regexp = "lunes|martes|miercoles|jueves|viernes|sabado|domingo") String dia,
            @NotNull @Pattern(regexp = "(?:[01][0-9]|2[0-3]):[0-5][0-9]") String horaInicio,
            @NotNull @Pattern(regexp = "(?:[01][0-9]|2[0-3]):[0-5][0-9]") String horaFin
    ) {
        public boolean chocaCon(Franja otra) {
            return dia.equals(otra.dia) && horaInicio.compareTo(otra.horaFin) < 0
                    && otra.horaInicio.compareTo(horaFin) < 0;
        }

        public BloqueHorarioDTO aBloque() {
            return new BloqueHorarioDTO(null, dia, horaInicio, horaFin, null);
        }
    }

    public record Preferencias(
            @NotNull @Pattern(regexp = "any|early|late") String jornada,
            @NotNull @Pattern(regexp = "any|short|long") String pausas,
            boolean masCreditos
    ) {}

    public static PeticionGenerarHorario desdeRegistradas(List<MateriaDTO> materias) {
        return new PeticionGenerarHorario(materias.stream().map(m -> new MateriaCandidata(
                m.nombre(), m.creditos() == null ? 0 : m.creditos(),
                List.of(m.bloques().stream().map(b -> new Franja(b.dia(), b.horaInicio(), b.horaFin())).toList())
        )).toList(), null);
    }

    public void validarFranjas() {
        if (materias.isEmpty()) throw new IllegalArgumentException("Incluye al menos una materia para generar horarios.");
        for (var materia : materias) {
            for (var opcion : materia.opciones()) {
                if (opcion.isEmpty()) throw new IllegalArgumentException("Faltan franjas para " + materia.nombre() + ".");
                for (int i = 0; i < opcion.size(); i++) {
                    Franja franja = opcion.get(i);
                    if (franja.horaInicio().compareTo(franja.horaFin()) >= 0
                            || opcion.subList(0, i).stream().anyMatch(franja::chocaCon)) {
                        throw new IllegalArgumentException("Revisa las horas y los cruces dentro de una sección de " + materia.nombre() + ".");
                    }
                }
            }
        }
    }
}
