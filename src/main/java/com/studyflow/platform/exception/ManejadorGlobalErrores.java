package com.studyflow.platform.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Traduce las excepciones a mensajes que una persona pueda entender.
 *
 * <p>Sin esto, un fallo de validación llegaba a la pantalla como el volcado
 * interno de Hibernate («Validation failed for classes ... ConstraintViolationImpl
 * ... propertyPath=apellido»), que no dice qué hacer.</p>
 */
@RestControllerAdvice(basePackages = "com.studyflow.platform.controller.api")
public class ManejadorGlobalErrores {

    /** Nombres de campo tal como aparecen en los formularios. */
    private static String enCastellano(String campo) {
        return switch (campo) {
            case "nombre" -> "el nombre";
            case "apellido" -> "el apellido";
            case "correo" -> "el correo";
            case "contrasena", "contrasenaHash" -> "la contraseña";
            case "edad" -> "la edad";
            case "titulo" -> "el título";
            case "url" -> "el enlace";
            case "telefonoWhatsapp" -> "el número de WhatsApp";
            default -> "el campo " + campo;
        };
    }

    /** Sin sesión no se sabe quién pide la operación: 401 en lugar de actuar por otro. */
    @ExceptionHandler(SesionNoIniciadaException.class)
    public ProblemDetail sinSesion(SesionNoIniciadaException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, error.getMessage());
    }

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ProblemDetail noEncontrado(RecursoNoEncontradoException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, error.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail peticionInvalida(IllegalArgumentException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, error.getMessage());
    }

    /** Validación del cuerpo de la petición (@Valid sobre un DTO). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail camposInvalidos(MethodArgumentNotValidException error) {
        String detalle = error.getBindingResult().getFieldErrors().stream()
                .map(campo -> "%s %s".formatted(enCastellano(campo.getField()), campo.getDefaultMessage()))
                .distinct()
                .collect(Collectors.joining("; "));
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                detalle.isBlank() ? "Revisa los datos del formulario." : "Revisa " + detalle + ".");
    }

    /** Validación al guardar la entidad, que salta más tarde que la anterior. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail entidadInvalida(ConstraintViolationException error) {
        String detalle = error.getConstraintViolations().stream()
                .map(violacion -> "%s %s".formatted(
                        enCastellano(ultimoTramo(violacion.getPropertyPath().toString())),
                        violacion.getMessage()))
                .distinct()
                .collect(Collectors.joining("; "));
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                detalle.isBlank() ? "Revisa los datos del formulario." : "Revisa " + detalle + ".");
    }

    /** Choque contra una restricción de la base: normalmente un correo repetido. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail datosDuplicados(DataIntegrityViolationException error) {
        String causa = error.getMostSpecificCause().getMessage();
        String detalle = causa != null && causa.toLowerCase().contains("correo")
                ? "Ya existe una cuenta con ese correo."
                : "Esos datos chocan con algo que ya existe. Revisa los campos únicos.";
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detalle);
    }

    private String ultimoTramo(String ruta) {
        int punto = ruta.lastIndexOf('.');
        return punto >= 0 ? ruta.substring(punto + 1) : ruta;
    }
}
