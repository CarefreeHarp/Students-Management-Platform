package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Institucion a la que pertenece un estudiante (dato del registro y del perfil). */
@Entity
@Table(name = "universidad", uniqueConstraints = @UniqueConstraint(columnNames = "nombre"))
@Getter
@Setter
@NoArgsConstructor
public class Universidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 100)
    private String pais;

    public Universidad(String nombre, String pais) {
        this.nombre = nombre;
        this.pais = pais;
    }
}
