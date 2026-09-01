package com.studyflow.platform.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Etapa de un proyecto (Planeacion, Investigacion, Diseno, Desarrollo, Entrega...). */
@Entity
@Table(name = "etapa")
@Getter
@Setter
@NoArgsConstructor
public class Etapa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false)
    private Proyecto proyecto;

    @Column(nullable = false, length = 60)
    private String nombre;

    @Column(nullable = false)
    private Integer orden = 1;

    @Column(length = 250)
    private String objetivo;

    public Etapa(String nombre, Integer orden) {
        this.nombre = nombre;
        this.orden = orden;
    }
}
