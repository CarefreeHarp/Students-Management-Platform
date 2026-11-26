package com.studyflow.platform.security;

import com.studyflow.platform.model.entity.Usuario;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sesion_autenticada")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SesionAutenticada {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, unique = true, length = 64)
    private String credencialHash;

    @Column(nullable = false)
    private Instant vence;

    @Column(nullable = false)
    private boolean demostracion;

    SesionAutenticada(UUID id, Usuario usuario, String credencialHash, Instant vence, boolean demostracion) {
        this.id = id;
        this.usuario = usuario;
        this.credencialHash = credencialHash;
        this.vence = vence;
        this.demostracion = demostracion;
    }
}
