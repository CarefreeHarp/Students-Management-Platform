package com.studyflow.platform.controller.api;

import com.studyflow.platform.service.VisorBaseDatos;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequestMapping("/api/admin")
@ConditionalOnProperty(name = "studyflow.admin.enabled", havingValue = "true")
public class AdminApiController {
    private static final int CODIGO_REINICIO = 75;

    public record Estado(boolean autenticado, String csrf, UUID instancia) {}

    private final VisorBaseDatos visor;
    private final ConfigurableApplicationContext contexto;
    private final UUID instancia = UUID.randomUUID();
    private final AtomicBoolean reiniciando = new AtomicBoolean();

    public AdminApiController(VisorBaseDatos visor, ConfigurableApplicationContext contexto) {
        this.visor = visor;
        this.contexto = contexto;
    }

    @GetMapping("/estado")
    public Estado estado(Authentication autenticacion, CsrfToken csrf) {
        return new Estado(autenticacion != null, csrf.getToken(), instancia);
    }

    @GetMapping("/base-de-datos")
    public VisorBaseDatos.Base base() {
        return visor.base();
    }

    @GetMapping("/tablas/{nombre}")
    public VisorBaseDatos.Tabla tabla(@PathVariable String nombre, @RequestParam(defaultValue = "1") long pagina) {
        return visor.tabla(nombre, pagina);
    }

    @PostMapping("/reiniciar")
    public ResponseEntity<Void> reiniciar() {
        if (reiniciando.compareAndSet(false, true)) {
            // Spring espera a las peticiones en curso durante el apagado de Tomcat.
            new Thread(() -> {
                try {
                    contexto.close();
                } finally {
                    System.exit(CODIGO_REINICIO);
                }
            }, "studyflow-reinicio-local").start();
        }
        return ResponseEntity.accepted().build();
    }
}
