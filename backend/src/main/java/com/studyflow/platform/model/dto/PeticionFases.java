package com.studyflow.platform.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Complete, ordered phase configuration for one project. */
public record PeticionFases(
        @NotEmpty(message = "debe conservar al menos una fase")
        List<@Valid PeticionFase> fases,
        @NotNull(message = "es obligatoria")
        @Min(value = 0, message = "debe apuntar a una fase válida")
        Integer etapaActualIndice
) {
}
