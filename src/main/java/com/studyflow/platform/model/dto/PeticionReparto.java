package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PeticionReparto(
        @NotBlank
        @Pattern(regexp = "asignado|libre", message = "debe ser asignado o libre")
        String modoReparto
) {
}
