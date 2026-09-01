package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** Materia candidata que el estudiante registra en el planificador de horarios. */
@Entity
@Table(name = "materia")
@Getter
@Setter
@NoArgsConstructor
public class Materia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 30)
    private String codigo;

    @Column(length = 100)
    private String profesor;

    private Integer creditos;

    /** Indice de color (0-5) que usa el calendario de horarios. */
    @Column(name = "indice_color", nullable = false)
    private Integer indiceColor = 0;

    @OneToMany(mappedBy = "materia", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BloqueHorario> bloques = new ArrayList<>();

    public void agregarBloque(BloqueHorario bloque) {
        bloque.setMateria(this);
        bloques.add(bloque);
    }
}
