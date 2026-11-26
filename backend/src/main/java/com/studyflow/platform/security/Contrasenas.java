package com.studyflow.platform.security;

import com.studyflow.platform.exception.CampoInvalidoException;
import com.studyflow.platform.repository.UsuarioRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

@Component
public class Contrasenas {
    private static final String LEGADA_LARGA = "{bcrypt-sha256}";
    private final PasswordEncoder bcrypt;
    private final String hashSinCuenta;

    public Contrasenas(PasswordEncoder bcrypt) {
        this.bcrypt = bcrypt;
        hashSinCuenta = bcrypt.encode(java.util.UUID.randomUUID().toString());
    }

    public String nueva(String texto) {
        if (texto == null || texto.codePointCount(0, texto.length()) < 12 || bytes(texto).length > 72) {
            throw new CampoInvalidoException("contrasena", "Usa al menos 12 caracteres y como máximo 72 bytes.");
        }
        return bcrypt.encode(texto);
    }

    public boolean coincide(String texto, String hash) {
        if (texto == null || texto.length() > 256) return false;
        boolean larga = hash != null && hash.startsWith(LEGADA_LARGA);
        boolean valida = bcrypt.matches(larga ? resumir(texto) : bytes(texto).length <= 72 ? texto : "",
                hash == null ? hashSinCuenta : larga ? hash.substring(LEGADA_LARGA.length()) : hash);
        return hash != null && (larga || bytes(texto).length <= 72) && valida;
    }

    public String migrar(String correo, String hash) {
        if ("valentina.rojas@universidad.edu.co".equalsIgnoreCase(correo) && "c3R1ZHlmbG93".equals(hash)) {
            return null; // Contraseña pública publicada con la demo anterior.
        }
        if (hash == null || hash.startsWith("$2") || hash.startsWith(LEGADA_LARGA)) return hash;
        try {
            String texto = new String(Base64.getDecoder().decode(hash), StandardCharsets.UTF_8);
            if (texto.isEmpty()) return null;
            return bytes(texto).length <= 72 ? bcrypt.encode(texto) : LEGADA_LARGA + bcrypt.encode(resumir(texto));
        } catch (IllegalArgumentException desconocida) {
            return null;
        }
    }

    private static byte[] bytes(String texto) {
        return texto.getBytes(StandardCharsets.UTF_8);
    }

    private static String resumir(String texto) {
        try {
            return Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256").digest(bytes(texto)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}

@Configuration
class MigracionContrasenas {
    @Bean
    @Order(0)
    ApplicationRunner convertirContrasenas(UsuarioRepository usuarios, Contrasenas contrasenas,
                                           TransactionTemplate tx) {
        return args -> tx.executeWithoutResult(status -> usuarios.findAll().forEach(usuario ->
                usuario.setContrasenaHash(contrasenas.migrar(usuario.getCorreo(), usuario.getContrasenaHash()))));
    }
}
