package com.studyflow.platform.migration;

import com.studyflow.platform.security.Contrasenas;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Arrays;

/** Operación local para recuperar cuentas importadas sin un medio de acceso seguro. */
public final class RestablecerContrasena {
    public static void main(String[] args) throws Exception {
        var consola = System.console();
        if (consola == null || args.length != 1) {
            throw new IllegalArgumentException("Ejecuta el comando en una terminal con el correo de la cuenta.");
        }
        char[] clave = consola.readPassword("Nueva contraseña: ");
        char[] confirmacion = consola.readPassword("Confirma la contraseña: ");
        if (clave == null || confirmacion == null) return;
        try (var db = H2Local.conectar(H2Local.urlExistente())) {
            if (!Arrays.equals(clave, confirmacion)) throw new IllegalArgumentException("Las contraseñas no coinciden.");
            String hash = new Contrasenas(new BCryptPasswordEncoder(12)).nueva(new String(clave));
            db.setAutoCommit(false);
            try (var cuenta = db.prepareStatement("""
                    UPDATE usuario SET contrasena_hash = ?
                    WHERE LOWER(correo) = LOWER(?) AND proveedor <> 'DEMOSTRACION'
                    """);
                 var sesiones = db.prepareStatement("""
                    DELETE FROM sesion_autenticada WHERE usuario_id IN
                    (SELECT id FROM usuario WHERE LOWER(correo) = LOWER(?))
                    """)) {
                cuenta.setString(1, hash);
                cuenta.setString(2, args[0].trim());
                if (cuenta.executeUpdate() != 1) {
                    db.rollback();
                    throw new IllegalArgumentException("El correo no identifica a una cuenta recuperable.");
                }
                sesiones.setString(1, args[0].trim());
                sesiones.executeUpdate();
                db.commit();
                consola.printf("Contraseña guardada. Las sesiones anteriores se cerraron.%n");
            }
        } finally {
            Arrays.fill(clave, '\0');
            Arrays.fill(confirmacion, '\0');
        }
    }
}
