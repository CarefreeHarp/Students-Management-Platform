package com.studyflow.platform.migration;

import com.studyflow.platform.security.Contrasenas;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.*;
import java.util.*;

/** Copia puntual, de solo lectura en MySQL, a un esquema H2 vacío preparado por StudyFlow. */
public final class MigrarMysql {
    public static void main(String[] args) throws SQLException {
        var contrasenas = new Contrasenas(new BCryptPasswordEncoder(12));
        String destino = H2Local.urlExistente();
        try (Connection origen = DriverManager.getConnection(H2Local.variable("STUDYFLOW_MYSQL_URL"),
                     H2Local.variable("STUDYFLOW_MYSQL_USER"), System.getenv("STUDYFLOW_MYSQL_PASSWORD"));
             Connection h2 = H2Local.conectar(destino)) {
            origen.setReadOnly(true);
            origen.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            origen.setAutoCommit(false);
            h2.setAutoCommit(false);
            var tablas = tablas(origen);
            try {
                for (String tabla : tablas) {
                    if (contar(h2, tabla) != 0) throw new SQLException("El destino ya contiene filas en " + tabla);
                }
                long filas = 0;
                for (String tabla : ordenar(h2, tablas)) {
                    filas += copiar(origen, h2, tabla, contrasenas);
                }
                h2.commit();
                for (String tabla : tablas) reiniciarIdentidad(h2, tabla);
                crearVistaAvance(h2);
                System.out.printf("Verificadas %d filas en %d tablas.%n", filas, tablas.size());
            } catch (SQLException | RuntimeException error) {
                h2.rollback();
                throw error;
            }
        }
    }

    private static Set<String> tablas(Connection db) throws SQLException {
        Set<String> tablas = new TreeSet<>();
        try (ResultSet datos = db.getMetaData().getTables(db.getCatalog(), null, "%", new String[] { "TABLE" })) {
            while (datos.next()) tablas.add(identificador(datos.getString("TABLE_NAME")));
        }
        if (!tablas.contains("usuario") || !tablas.contains("proyecto")) {
            throw new SQLException("El origen no contiene el esquema de StudyFlow.");
        }
        return tablas;
    }

    private static List<String> ordenar(Connection db, Set<String> tablas) throws SQLException {
        Map<String, Set<String>> dependencias = new LinkedHashMap<>();
        for (String tabla : tablas) {
            Set<String> padres = new HashSet<>();
            try (ResultSet claves = db.getMetaData().getImportedKeys(null, "PUBLIC", tabla.toUpperCase(Locale.ROOT))) {
                while (claves.next()) {
                    String padre = identificador(claves.getString("PKTABLE_NAME"));
                    if (!padre.equals(tabla) && tablas.contains(padre)) padres.add(padre);
                }
            }
            dependencias.put(tabla, padres);
        }
        List<String> orden = new ArrayList<>();
        while (!dependencias.isEmpty()) {
            var disponibles = dependencias.entrySet().stream()
                    .filter(entrada -> entrada.getValue().isEmpty()).map(Map.Entry::getKey).toList();
            if (disponibles.isEmpty()) throw new SQLException("El esquema tiene dependencias circulares.");
            orden.addAll(disponibles);
            disponibles.forEach(dependencias::remove);
            dependencias.values().forEach(padres -> padres.removeAll(disponibles));
        }
        return orden;
    }

    private static long copiar(Connection origen, Connection h2, String tabla, Contrasenas contrasenas) throws SQLException {
        try (Statement leer = origen.createStatement(); ResultSet filas = leer.executeQuery("SELECT * FROM " + tabla)) {
            List<String> columnas = new ArrayList<>();
            for (int i = 1; i <= filas.getMetaData().getColumnCount(); i++) {
                columnas.add(identificador(filas.getMetaData().getColumnName(i)));
            }
            String sql = "INSERT INTO " + tabla + " (" + String.join(", ", columnas) + ") VALUES ("
                    + String.join(", ", Collections.nCopies(columnas.size(), "?")) + ")";
            long total = 0;
            try (PreparedStatement guardar = h2.prepareStatement(sql)) {
                while (filas.next()) {
                    for (int i = 1; i <= columnas.size(); i++) {
                        Object valor = filas.getObject(i);
                        if (tabla.equals("usuario") && columnas.get(i - 1).equals("contrasena_hash")) {
                            valor = contrasenas.migrar(filas.getString("correo"), filas.getString(i));
                        }
                        guardar.setObject(i, valor);
                    }
                    guardar.addBatch();
                    if (++total % 100 == 0) guardar.executeBatch();
                }
                guardar.executeBatch();
            }
            if (total != contar(h2, tabla)) throw new SQLException("No coinciden los recuentos para " + tabla);
            return total;
        }
    }

    private static long contar(Connection db, String tabla) throws SQLException {
        try (var consulta = db.createStatement(); var filas = consulta.executeQuery("SELECT COUNT(*) FROM " + tabla)) {
            filas.next();
            return filas.getLong(1);
        }
    }

    private static void reiniciarIdentidad(Connection db, String tabla) throws SQLException {
        try (ResultSet columnas = db.getMetaData().getColumns(null, "PUBLIC", tabla.toUpperCase(Locale.ROOT), "ID")) {
            if (!columnas.next() || !"YES".equals(columnas.getString("IS_AUTOINCREMENT"))) return;
        }
        try (Statement stmt = db.createStatement()) {
            long siguiente;
            try (ResultSet maximo = stmt.executeQuery("SELECT COALESCE(MAX(id), 0) + 1 FROM " + tabla)) {
                maximo.next();
                siguiente = maximo.getLong(1);
            }
            stmt.execute("ALTER TABLE " + tabla + " ALTER COLUMN id RESTART WITH " + siguiente);
        }
    }

    private static void crearVistaAvance(Connection db) throws SQLException {
        try (var consulta = db.createStatement()) {
            consulta.execute("""
                    CREATE VIEW IF NOT EXISTS vista_avance_proyecto AS
                    SELECT p.id AS proyecto_id, p.codigo, p.nombre, COUNT(t.id) AS total_tareas,
                           SUM(CASE WHEN t.estado = 'TERMINADA' THEN 1 ELSE 0 END) AS tareas_completadas,
                           CASE WHEN COUNT(t.id) = 0 THEN 0 ELSE
                               ROUND(SUM(CASE WHEN t.estado = 'TERMINADA' THEN 1 ELSE 0 END) * 100.0 / COUNT(t.id))
                           END AS porcentaje_avance
                    FROM proyecto p LEFT JOIN tarea t ON t.proyecto_id = p.id
                    GROUP BY p.id, p.codigo, p.nombre
                    """);
        }
    }

    private static String identificador(String nombre) throws SQLException {
        String normalizado = nombre.toLowerCase(Locale.ROOT);
        if (!normalizado.matches("[a-z][a-z0-9_]*")) throw new SQLException("Identificador de esquema no válido.");
        return normalizado;
    }
}
