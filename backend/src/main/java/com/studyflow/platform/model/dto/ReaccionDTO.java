package com.studyflow.platform.model.dto;

import java.util.List;

/** Reacciones agrupadas por emoji, como las muestra la interfaz. */
public record ReaccionDTO(
        String emoji,
        Integer total,
        /** Nombres de quienes reaccionaron, para el tooltip. */
        List<String> personas,
        /** Si el usuario actual ya reaccionó con este emoji. */
        boolean propia
) {
}
