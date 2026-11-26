package com.studyflow.platform.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface SesionAutenticadaRepository extends JpaRepository<SesionAutenticada, UUID> {
    Optional<SesionAutenticada> findByCredencialHashAndVenceAfter(String hash, Instant ahora);
    Optional<SesionAutenticada> findByIdAndVenceAfter(UUID id, Instant ahora);
    void deleteByCredencialHash(String hash);
    void deleteByVenceBefore(Instant ahora);
}
