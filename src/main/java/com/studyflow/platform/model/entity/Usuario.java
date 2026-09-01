package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.ProveedorAcceso;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Estudiante registrado. Reune los campos de las pantallas de registro,
 * perfil y edicion de perfil.
 */
@Entity
@Table(name = "usuario", uniqueConstraints = @UniqueConstraint(columnNames = "correo"))
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String nombre;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String apellido;

    @Email
    @NotBlank
    @Column(nullable = false, length = 160)
    private String correo;

    /** Hash de la contrasena. Nunca se expone en los DTO. */
    @Column(name = "contrasena_hash", length = 200)
    private String contrasenaHash;

    @Min(15)
    @Max(99)
    private Integer edad;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "universidad_id")
    private Universidad universidad;

    @Column(length = 120)
    private String programa;

    private Integer semestre;

    @Column(length = 300)
    private String descripcion;

    /** URL o data-URI de la foto de perfil. */
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private ProveedorAcceso proveedor = ProveedorAcceso.CORREO;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public String getNombreCompleto() {
        return (nombre + " " + apellido).trim();
    }
}
