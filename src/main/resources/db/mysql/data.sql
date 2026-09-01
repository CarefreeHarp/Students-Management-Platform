-- ===========================================================================
-- StudyFlow · Datos de demostración
-- Reproduce el contenido de prueba que ya mostraba la interfaz.
-- Ejecutar después de schema.sql:
--   mysql -u root -p studyflow < src/main/resources/db/mysql/data.sql
-- ===========================================================================
USE studyflow;

INSERT INTO universidad (id, nombre, pais) VALUES
    (1, 'Universidad Nacional de Colombia', 'Colombia'),
    (2, 'Universidad Central', 'Colombia');

-- Contraseña de demostración: "studyflow" (Base64, provisional hasta integrar Spring Security)
INSERT INTO usuario (id, nombre, apellido, correo, contrasena_hash, edad, universidad_id, programa, semestre, descripcion, proveedor, fecha_registro) VALUES
    (1, 'Valentina', 'Rojas', 'valentina.rojas@universidad.edu.co', 'c3R1ZHlmbG93', 21, 1, 'Ingeniería de Sistemas', 6,
     'Diseño soluciones que hacen más fácil aprender, colaborar y crear.', 'CORREO', '2026-08-01 12:00:00'),
    (2, 'Mateo', 'Díaz', 'mateo.diaz@universidad.edu.co', 'c3R1ZHlmbG93', 22, 1, 'Diseño Industrial', 7, NULL, 'GOOGLE', '2026-08-02 09:30:00'),
    (3, 'Sara', 'Gómez', 'sara.gomez@universidad.edu.co', 'c3R1ZHlmbG93', 20, 1, 'Ingeniería de Sistemas', 5, NULL, 'CORREO', '2026-08-02 10:15:00');

INSERT INTO proyecto (id, codigo, nombre, descripcion, fecha_entrega, color, etapa_actual, propietario_id) VALUES
    (1, 'cognitiva', 'Cognitiva', 'Aplicación para visualizar hábitos de estudio y bienestar universitario.', '2026-08-21', '#5b5ce2', 'Desarrollo', 1),
    (2, 'redes-inteligentes', 'Redes inteligentes', 'Propuesta de optimización para una red de sensores del campus.', '2026-08-28', '#19a7bd', 'Investigación', 1),
    (3, 'laboratorio-ux', 'Laboratorio UX', 'Rediseño colaborativo de la experiencia de préstamo de equipos.', '2026-09-04', '#d7639d', 'Planeación', 1);

INSERT INTO integrante (id, proyecto_id, usuario_id, nombre, contacto, iniciales, color, rol) VALUES
    (1, 1, 1, 'Valentina Rojas', 'valentina.rojas@universidad.edu.co', 'VR', '#5b5ce2', 'LIDER'),
    (2, 1, 2, 'Mateo Díaz', 'mateo.diaz@universidad.edu.co', 'MD', '#e2779b', 'COLABORADOR'),
    (3, 1, 3, 'Sara Gómez', 'sara.gomez@universidad.edu.co', 'SG', '#2ca89b', 'COLABORADOR'),
    (4, 2, 1, 'Valentina Rojas', 'valentina.rojas@universidad.edu.co', 'VR', '#5b5ce2', 'LIDER'),
    (5, 2, NULL, 'Daniela Ruiz', 'daniela.ruiz@universidad.edu.co', 'DR', '#f0a33f', 'COLABORADOR'),
    (6, 3, 1, 'Valentina Rojas', 'valentina.rojas@universidad.edu.co', 'VR', '#5b5ce2', 'LIDER'),
    (7, 3, NULL, 'Nicolás Vega', 'nicolas.vega@universidad.edu.co', 'NV', '#7c76d9', 'COLABORADOR'),
    (8, 3, 3, 'Sara Gómez', 'sara.gomez@universidad.edu.co', 'SG', '#2ca89b', 'COLABORADOR');

INSERT INTO etapa (id, proyecto_id, nombre, orden) VALUES
    (1, 1, 'Planeación', 1), (2, 1, 'Investigación', 2), (3, 1, 'Diseño', 3), (4, 1, 'Desarrollo', 4), (5, 1, 'Entrega', 5),
    (6, 2, 'Planeación', 1), (7, 2, 'Investigación', 2), (8, 2, 'Diseño', 3), (9, 2, 'Desarrollo', 4), (10, 2, 'Entrega', 5),
    (11, 3, 'Planeación', 1), (12, 3, 'Investigación', 2), (13, 3, 'Diseño', 3), (14, 3, 'Desarrollo', 4), (15, 3, 'Entrega', 5);

INSERT INTO tarea (id, codigo, proyecto_id, titulo, descripcion, responsable_id, etapa_id, fecha_limite, hora_limite, estado, fecha_completada) VALUES
    (1, 'cognitiva-1', 1, 'Diseñar flujo de onboarding', 'Definir las pantallas y mensajes de bienvenida.', 1, 3, '2026-08-13', '09:00:00', 'EN_CURSO', NULL),
    (2, 'cognitiva-2', 1, 'Entrevistas a estudiantes', 'Sintetizar hallazgos de las entrevistas realizadas.', 2, 2, '2026-08-14', '11:00:00', 'PENDIENTE', NULL),
    (3, 'cognitiva-3', 1, 'Prototipo de analítica', 'Crear primera versión del tablero de hábitos.', 3, 4, '2026-08-15', '14:00:00', 'PENDIENTE', NULL),
    (4, 'cognitiva-4', 1, 'Presentación de avance', 'Preparar demo y narrativa para la revisión.', 1, 5, '2026-08-19', '10:00:00', 'COMPLETADA', '2026-08-19 11:20:00'),
    (5, 'redes-inteligentes-1', 2, 'Mapa de actores', 'Identificar usuarios, áreas y responsables involucrados.', 5, 7, '2026-08-13', '13:00:00', 'EN_CURSO', NULL),
    (6, 'redes-inteligentes-2', 2, 'Modelo de datos', 'Definir entidades y métricas del sistema de sensores.', 4, 6, '2026-08-16', '08:00:00', 'PENDIENTE', NULL),
    (7, 'redes-inteligentes-3', 2, 'Revisar bibliografía', 'Organizar fuentes y referencias principales.', 4, 7, '2026-08-18', '15:00:00', 'COMPLETADA', '2026-08-18 16:05:00'),
    (8, 'laboratorio-ux-1', 3, 'Auditoría de interfaz', 'Registrar hallazgos de accesibilidad y experiencia.', 7, 13, '2026-08-17', '10:00:00', 'PENDIENTE', NULL),
    (9, 'laboratorio-ux-2', 3, 'Organizar pruebas de uso', 'Convocar estudiantes y preparar guion de pruebas.', 8, 12, '2026-08-20', '14:00:00', 'PENDIENTE', NULL);

INSERT INTO registro_avance (proyecto_id, tarea_id, autor_id, titulo, contenido) VALUES
    (1, 4, 1, 'Avance en Presentación de avance', 'Demo lista y guion revisado con el equipo.'),
    (2, 7, 1, 'Avance en Revisar bibliografía', 'Se consolidaron 18 referencias en la matriz de fuentes.');

INSERT INTO materia (id, usuario_id, nombre, codigo, profesor, creditos, indice_color) VALUES
    (1, 1, 'Arquitectura de software', 'IS-501', 'Prof. Andrea Torres', 4, 0),
    (2, 1, 'Bases de datos avanzadas', 'IS-502', 'Prof. Camilo Rueda', 3, 1),
    (3, 1, 'Interacción humano-computador', 'IS-503', 'Prof. Lucía Peña', 3, 2),
    (4, 1, 'Gestión de proyectos TI', 'IS-504', 'Prof. Julián Mora', 2, 3);

INSERT INTO bloque_horario (materia_id, dia, hora_inicio, hora_fin, aula) VALUES
    (1, 'LUNES', '08:00:00', '10:00:00', 'Edificio B · 204'),
    (1, 'MIERCOLES', '08:00:00', '10:00:00', 'Edificio B · 204'),
    (2, 'MARTES', '10:00:00', '12:00:00', 'Laboratorio 3'),
    (3, 'MIERCOLES', '14:00:00', '16:00:00', 'Edificio A · 110'),
    (4, 'JUEVES', '16:00:00', '18:00:00', 'Edificio C · 302');

INSERT INTO horario (id, usuario_id, nombre, descripcion, tipo, puntaje, total_creditos, generado_por_ia, seleccionado) VALUES
    (1, 1, 'Mañanas libres', 'Concentra las clases después del mediodía para dejar la mañana disponible.', 'equilibrado', 75, 8, 1, 0),
    (2, 1, 'Jornada temprana', 'Agrupa las materias al inicio del día y libera las tardes.', 'madrugador', 100, 12, 1, 1),
    (3, 1, 'Carga compacta', 'Prioriza las materias con más créditos para avanzar el semestre.', 'compacto', 100, 12, 1, 0);

INSERT INTO horario_materia (horario_id, materia_id) VALUES
    (1, 3), (1, 4), (1, 2),
    (2, 1), (2, 2), (2, 3), (2, 4),
    (3, 1), (3, 2), (3, 3), (3, 4);

INSERT INTO recordatorio (usuario_id, proyecto_id, tarea_id, titulo, mensaje, fecha_hora, enviado) VALUES
    (1, 1, 3, 'Prototipo de analítica', 'Falta un día para la entrega del prototipo.', '2026-08-14 18:00:00', 0),
    (1, 2, NULL, 'Entrega de Redes inteligentes', 'La entrega final es en una semana.', '2026-08-21 09:00:00', 0);
