package com.studyflow.platform.migration;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Objects;

final class H2Local {
    private H2Local() {}

    static String urlExistente() {
        String url = Objects.toString(System.getenv("STUDYFLOW_H2_URL"), "jdbc:h2:file:./data/studyflow");
        if (!url.startsWith("jdbc:h2:file:") || url.contains(";")) {
            throw new IllegalArgumentException("Usa una URL H2 de archivo local, sin opciones adicionales.");
        }
        return url + ";IFEXISTS=TRUE";
    }

    static Connection conectar(String url) throws SQLException {
        return DriverManager.getConnection(url,
                Objects.toString(System.getenv("STUDYFLOW_H2_USER"), "sa"),
                Objects.toString(System.getenv("STUDYFLOW_H2_PASSWORD"), ""));
    }

    static String variable(String clave) {
        String valor = System.getenv(clave);
        if (valor == null || valor.isBlank()) throw new IllegalArgumentException("Falta " + clave);
        return valor;
    }
}
