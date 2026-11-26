package com.studyflow.platform.repository;

import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.ProveedorAcceso;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/** Capa de persistencia de estudiantes. */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    Optional<Usuario> findFirstByProveedorOrderByIdAsc(ProveedorAcceso proveedor);

    boolean existsByCorreoIgnoreCase(String correo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where u.id = :id")
    Optional<Usuario> bloquearPorId(Long id);
}
