package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.ProveedorAcceso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Capa de persistencia de estudiantes. */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    Optional<Usuario> findFirstByProveedorOrderByIdAsc(ProveedorAcceso proveedor);

    boolean existsByCorreoIgnoreCase(String correo);
}
