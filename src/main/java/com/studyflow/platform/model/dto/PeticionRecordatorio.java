package com.studyflow.platform.model.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** Aviso personal con vencimiento y antelacion independientes de los estandares. */
public record PeticionRecordatorio(
        @NotBlank @Size(max = 150) String titulo,
        @Size(max = 400) String mensaje,
        @NotNull @Future LocalDateTime fechaVencimiento,
        @NotNull @Min(0) @Max(43200) Integer minutosAntes
) {
}
