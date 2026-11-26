package com.studyflow.platform.controller.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@ConditionalOnProperty(name = "studyflow.demo.enabled", havingValue = "true")
public class CuentasDemoApiController {
    record Cuenta(String nombre, String correo, String contrasena) {}

    private final String contrasena;

    public CuentasDemoApiController(@Value("${studyflow.demo.password}") String contrasena) {
        this.contrasena = contrasena;
    }

    @GetMapping("/api/sesion/cuentas-demo")
    public ResponseEntity<List<Cuenta>> cuentas() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(List.of(
                new Cuenta("Valentina", "valentina.rojas@universidad.edu.co", contrasena),
                new Cuenta("Mateo", "mateo@universidad.edu.co", contrasena)));
    }
}
