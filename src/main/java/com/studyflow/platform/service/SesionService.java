package com.studyflow.platform.service;

import com.studyflow.platform.model.entity.Usuario;

/**
 * Sesion del usuario, deliberadamente sencilla.
 *
 * <p>Guarda el identificador en la {@code HttpSession} del servlet. No es
 * autenticacion real ni sustituye a Spring Security: sirve para que la
 * aplicacion sepa quien esta escribiendo en un canal o reclamando una tarea
 * sin obligar a montar un registro completo antes de empezar a usarla.</p>
 */
public interface SesionService {

    /** Usuario de la sesion. Si no hay ninguna, entra el usuario de demostracion. */
    Usuario usuarioActual();

    Long usuarioActualId();

    void iniciarSesion(Usuario usuario);

    void cerrarSesion();

    boolean haySesionIniciada();

    /**
     * Entrada en un paso: si el correo ya existe reutiliza la cuenta, y si no
     * la crea con lo minimo. Es lo que respalda el boton "empezar ahora".
     */
    Usuario accesoRapido(String nombre, String correo);

    /**
     * Entra con la cuenta de demostracion, la que trae los proyectos de ejemplo.
     *
     * <p>Una cuenta recien creada no participa en ningun proyecto, asi que su
     * espacio aparece vacio. Para recorrer la aplicacion con contenido hace
     * falta poder entrar como el usuario sembrado.</p>
     */
    Usuario entrarComoDemostracion();

    /** Nombre de la cuenta de demostracion, para ofrecerla en la pantalla de acceso. */
    String nombreCuentaDemostracion();
}
