package com.studyflow.platform.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@ConditionalOnProperty(name = "studyflow.admin.enabled", havingValue = "true")
public class VisorBaseDatos {
    private static final int FILAS_POR_PAGINA = 25;
    private static final int LIMITE_CELDA = 500;

    public record Base(String motor, String version, String esquema, boolean enMemoria, List<String> tablas) {}
    public record Columna(String nombre, String tipo) {}
    public record Tabla(String nombre, List<Columna> columnas, List<List<String>> filas,
                        long totalFilas, long pagina, int filasPorPagina) {}

    private final JdbcTemplate jdbc;

    public VisorBaseDatos(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Base base() {
        return jdbc.execute((ConnectionCallback<Base>) conexion -> {
            var metadatos = conexion.getMetaData();
            return new Base(metadatos.getDatabaseProductName(), metadatos.getDatabaseProductVersion(),
                    conexion.getSchema(), metadatos.getURL().startsWith("jdbc:h2:mem:"), tablas(conexion));
        });
    }

    public Tabla tabla(String nombre, long pagina) {
        if (pagina < 1 || pagina > Integer.MAX_VALUE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Número de página inválido.");
        }
        return jdbc.execute((ConnectionCallback<Tabla>) conexion -> {
            if (!tablas(conexion).contains(nombre)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tabla no encontrada.");
            }

            var columnas = columnasVisibles(conexion, nombre);
            String tabla = identificador(conexion.getSchema()) + "." + identificador(nombre);
            long total;
            try (var consulta = conexion.createStatement()) {
                consulta.setQueryTimeout(5);
                try (var conteo = consulta.executeQuery("SELECT COUNT(*) FROM " + tabla)) {
                    conteo.next();
                    total = conteo.getLong(1);
                }
            }

            var filas = new ArrayList<List<String>>();
            if (!columnas.isEmpty() && (pagina - 1) * FILAS_POR_PAGINA < total) {
                String proyeccion = columnas.stream()
                        .map(columna -> "LEFT(CAST(" + identificador(columna.nombre()) + " AS VARCHAR), "
                                + (LIMITE_CELDA + 1) + ")")
                        .collect(Collectors.joining(", "));
                String sql = "SELECT " + proyeccion + " FROM " + tabla
                        + " ORDER BY " + orden(conexion, nombre, columnas.get(0).nombre()) + " LIMIT ? OFFSET ?";
                try (var consulta = conexion.prepareStatement(sql)) {
                    consulta.setQueryTimeout(5);
                    consulta.setInt(1, FILAS_POR_PAGINA);
                    consulta.setLong(2, (pagina - 1) * FILAS_POR_PAGINA);
                    try (var resultados = consulta.executeQuery()) {
                        while (resultados.next()) {
                            var fila = new ArrayList<String>();
                            for (int indice = 1; indice <= columnas.size(); indice++) {
                                String valor = resultados.getString(indice);
                                fila.add(valor != null && valor.length() > LIMITE_CELDA
                                        ? valor.substring(0, LIMITE_CELDA) + "…" : valor);
                            }
                            filas.add(fila);
                        }
                    }
                }
            }
            return new Tabla(nombre, columnas, filas, total, pagina, FILAS_POR_PAGINA);
        });
    }

    private static List<String> tablas(Connection conexion) throws SQLException {
        var nombres = new ArrayList<String>();
        try (var resultado = conexion.getMetaData().getTables(conexion.getCatalog(), conexion.getSchema(),
                "%", new String[]{"TABLE", "BASE TABLE"})) {
            while (resultado.next()) nombres.add(resultado.getString("TABLE_NAME"));
        }
        return nombres.stream().sorted().toList();
    }

    private static List<Columna> columnasVisibles(Connection conexion, String tabla) throws SQLException {
        var columnas = new ArrayList<Columna>();
        DatabaseMetaData metadatos = conexion.getMetaData();
        try (var resultado = metadatos.getColumns(conexion.getCatalog(), conexion.getSchema(), tabla, "%")) {
            while (resultado.next()) {
                String nombre = resultado.getString("COLUMN_NAME");
                String clave = nombre.toUpperCase(Locale.ROOT);
                int tipo = resultado.getInt("DATA_TYPE");
                if (tabla.equals(resultado.getString("TABLE_NAME"))
                        && !clave.matches(".*(HASH|TOKEN|PASSWORD|SECRET|CONTRASEN|CREDENCIAL|API_KEY).*")
                        && tipo != Types.BINARY && tipo != Types.VARBINARY && tipo != Types.LONGVARBINARY
                        && tipo != Types.BLOB && tipo != Types.JAVA_OBJECT) {
                    columnas.add(new Columna(nombre, resultado.getString("TYPE_NAME")));
                }
            }
        }
        return columnas;
    }

    private static String orden(Connection conexion, String tabla, String primeraColumna) throws SQLException {
        var clave = new TreeMap<Short, String>();
        try (var resultado = conexion.getMetaData().getPrimaryKeys(conexion.getCatalog(), conexion.getSchema(), tabla)) {
            while (resultado.next()) clave.put(resultado.getShort("KEY_SEQ"), resultado.getString("COLUMN_NAME"));
        }
        if (clave.isEmpty()) return identificador(primeraColumna);
        return clave.values().stream().map(VisorBaseDatos::identificador).collect(Collectors.joining(", "));
    }

    private static String identificador(String nombre) {
        return "\"" + nombre.replace("\"", "\"\"") + "\"";
    }
}
