package com.studyflow.platform.exception;

/**
 * Se lanza cuando una operacion necesita saber quien la pide y no hay sesion.
 *
 * <p>Antes, sin sesion, la aplicacion actuaba en nombre del primer usuario de
 * la base. Eso hacia que cualquier accion —tomar una tarea, escribir en un
 * canal— quedara atribuida a esa persona en cuanto la sesion se perdia, por
 * ejemplo al reiniciarse el servidor. Ahora se exige identidad.</p>
 */
public class SesionNoIniciadaException extends RuntimeException {

    public SesionNoIniciadaException() {
        super("Tu sesión terminó. Vuelve a entrar para continuar.");
    }
}
