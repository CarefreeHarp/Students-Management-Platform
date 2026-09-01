package com.studyflow.platform.model.entity;

import com.studyflow.platform.model.enums.RolIntegrante;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Participante de un proyecto. Puede estar enlazado a un {@link Usuario} registrado
 * o quedar solo como nombre/contacto, tal como permite el formulario de creacion.
 */
@Entity
@Table(name = "integrante")
@Getter
@Setter
@NoArgsConstructor
public class Integrante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String nombre;

    /** Correo o @usuario escrito en el formulario. */
    @Column(length = 150)
    private String contacto;

    @Column(length = 5)
    private String iniciales;

    /** Color con el que se identifica al integrante en tarjetas y calendarios. */
    @Column(length = 9)
    private String color = "#5b5ce2";

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private RolIntegrante rol = RolIntegrante.COLABORADOR;

    public Integrante(String nombre, String contacto, String color, RolIntegrante rol) {
        this.nombre = nombre;
        this.contacto = contacto;
        this.color = color;
        this.rol = rol;
        this.iniciales = calcularIniciales(nombre);
    }

    public static String calcularIniciales(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return "?";
        }
        String[] partes = nombre.trim().split("\\s+");
        StringBuilder iniciales = new StringBuilder();
        for (int i = 0; i < Math.min(2, partes.length); i++) {
            iniciales.append(Character.toUpperCase(partes[i].charAt(0)));
        }
        return iniciales.toString();
    }
}
