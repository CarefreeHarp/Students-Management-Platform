package com.studyflow.platform.pagos;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "pagos_prueba")
public class PagoPrueba {
    @Id public String referencia;
    @Column(nullable = false) public Long usuarioId;
    @Column(nullable = false) public String plan;
    @Column(nullable = false) public long monto;
    @Column(nullable = false) public String estado = "PENDING";
    public String transaccionId;
    @Column(nullable = false) public Instant creado = Instant.now();
    public Instant vence;
    @Version public Long version;
    protected PagoPrueba() {}
    PagoPrueba(String referencia, Long usuarioId, String plan, long monto) {
        this.referencia = referencia; this.usuarioId = usuarioId; this.plan = plan; this.monto = monto;
    }
}
