-- ===========================================================================
-- StudyFlow · Esquema MySQL
-- Modelo derivado de las pantallas del frontend: cuentas, perfil, proyectos,
-- equipos, etapas, tareas, archivos, bitácora, materias, horarios y recordatorios.
--
-- Ejecutar:  mysql -u root -p < src/main/resources/db/mysql/schema.sql
-- ===========================================================================

DROP DATABASE IF EXISTS studyflow;
CREATE DATABASE studyflow
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;
USE studyflow;

-- Usuario de aplicación usado por application.properties
CREATE USER IF NOT EXISTS 'studyflow'@'localhost' IDENTIFIED BY 'studyflow';
GRANT ALL PRIVILEGES ON studyflow.* TO 'studyflow'@'localhost';
FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------------
-- 1. Cuentas y perfil
-- ---------------------------------------------------------------------------
CREATE TABLE universidad (
    id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    pais   VARCHAR(100),
    CONSTRAINT uq_universidad_nombre UNIQUE (nombre)
) ENGINE = InnoDB;

CREATE TABLE usuario (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(80)  NOT NULL,
    apellido        VARCHAR(80)  NOT NULL,
    correo          VARCHAR(160) NOT NULL,
    contrasena_hash VARCHAR(200),
    edad            INT,
    universidad_id  BIGINT,
    programa        VARCHAR(120),
    semestre        INT,
    descripcion     VARCHAR(300),
    avatar_url      VARCHAR(500),
    proveedor       VARCHAR(20)  NOT NULL DEFAULT 'CORREO',
    fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_correo UNIQUE (correo),
    CONSTRAINT fk_usuario_universidad FOREIGN KEY (universidad_id) REFERENCES universidad (id)
        ON DELETE SET NULL,
    CONSTRAINT ck_usuario_edad CHECK (edad IS NULL OR edad BETWEEN 15 AND 99)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- 2. Proyectos, equipo y etapas
-- ---------------------------------------------------------------------------
CREATE TABLE proyecto (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo         VARCHAR(90)  NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    VARCHAR(600),
    fecha_entrega  DATE,
    color          VARCHAR(9)   NOT NULL DEFAULT '#5b5ce2',
    etapa_actual   VARCHAR(60)  NOT NULL DEFAULT 'Planeación',
    propietario_id BIGINT       NOT NULL,
    fecha_creacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_proyecto_codigo UNIQUE (codigo),
    CONSTRAINT fk_proyecto_propietario FOREIGN KEY (propietario_id) REFERENCES usuario (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_proyecto_entrega ON proyecto (fecha_entrega);

CREATE TABLE integrante (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id BIGINT       NOT NULL,
    usuario_id  BIGINT,
    nombre      VARCHAR(120) NOT NULL,
    contacto    VARCHAR(150),
    iniciales   VARCHAR(5),
    color       VARCHAR(9)   NOT NULL DEFAULT '#5b5ce2',
    rol         VARCHAR(20)  NOT NULL DEFAULT 'COLABORADOR',
    CONSTRAINT fk_integrante_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_integrante_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
        ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX ix_integrante_proyecto ON integrante (proyecto_id);

CREATE TABLE etapa (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id BIGINT      NOT NULL,
    nombre      VARCHAR(60) NOT NULL,
    orden       INT         NOT NULL DEFAULT 1,
    objetivo    VARCHAR(250),
    CONSTRAINT fk_etapa_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- 3. Tareas, archivos y bitácora de avance
-- ---------------------------------------------------------------------------
CREATE TABLE tarea (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo           VARCHAR(90),
    proyecto_id      BIGINT       NOT NULL,
    titulo           VARCHAR(150) NOT NULL,
    descripcion      VARCHAR(500),
    responsable_id   BIGINT,
    etapa_id         BIGINT,
    fecha_limite     DATE,
    hora_limite      TIME,
    estado           VARCHAR(20)  NOT NULL DEFAULT 'SIN_EMPEZAR',
    fecha_completada DATETIME,
    generada_por_ia  TINYINT(1)   NOT NULL DEFAULT 0,
    CONSTRAINT uq_tarea_codigo UNIQUE (proyecto_id, codigo),
    CONSTRAINT fk_tarea_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tarea_responsable FOREIGN KEY (responsable_id) REFERENCES integrante (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_tarea_etapa FOREIGN KEY (etapa_id) REFERENCES etapa (id)
        ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX ix_tarea_fecha ON tarea (fecha_limite);
CREATE INDEX ix_tarea_estado ON tarea (estado);

-- Dependencias entre tareas: alimentan el diagrama de fases y determinan
-- si una tarea está disponible para que alguien la tome.
CREATE TABLE tarea_dependencia (
    tarea_id     BIGINT NOT NULL,
    depende_de_id BIGINT NOT NULL,
    PRIMARY KEY (tarea_id, depende_de_id),
    CONSTRAINT fk_dep_tarea FOREIGN KEY (tarea_id) REFERENCES tarea (id) ON DELETE CASCADE,
    CONSTRAINT fk_dep_origen FOREIGN KEY (depende_de_id) REFERENCES tarea (id) ON DELETE CASCADE,
    CONSTRAINT ck_dep_distinta CHECK (tarea_id <> depende_de_id)
) ENGINE = InnoDB;

CREATE TABLE archivo_tarea (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    tarea_id     BIGINT       NOT NULL,
    nombre       VARCHAR(200) NOT NULL,
    ruta         VARCHAR(500),
    tipo_mime    VARCHAR(100),
    tamano_bytes BIGINT,
    fecha_subida DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_archivo_tarea FOREIGN KEY (tarea_id) REFERENCES tarea (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE registro_avance (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id    BIGINT   NOT NULL,
    tarea_id       BIGINT,
    autor_id       BIGINT,
    titulo         VARCHAR(150),
    contenido      VARCHAR(1000),
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_registro_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_registro_tarea FOREIGN KEY (tarea_id) REFERENCES tarea (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_registro_autor FOREIGN KEY (autor_id) REFERENCES usuario (id)
        ON DELETE SET NULL
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- 4. Materias y horarios de clase
-- ---------------------------------------------------------------------------
CREATE TABLE materia (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id    BIGINT       NOT NULL,
    nombre        VARCHAR(120) NOT NULL,
    codigo        VARCHAR(30),
    profesor      VARCHAR(100),
    creditos      INT,
    indice_color  INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_materia_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE bloque_horario (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    materia_id  BIGINT      NOT NULL,
    dia         VARCHAR(12) NOT NULL,
    hora_inicio TIME        NOT NULL,
    hora_fin    TIME        NOT NULL,
    aula        VARCHAR(60),
    CONSTRAINT fk_bloque_materia FOREIGN KEY (materia_id) REFERENCES materia (id)
        ON DELETE CASCADE,
    CONSTRAINT ck_bloque_horas CHECK (hora_inicio < hora_fin)
) ENGINE = InnoDB;

CREATE TABLE horario (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      BIGINT       NOT NULL,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     VARCHAR(300),
    tipo            VARCHAR(40),
    puntaje         INT,
    total_creditos  INT,
    generado_por_ia TINYINT(1)   NOT NULL DEFAULT 0,
    seleccionado    TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_horario_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE horario_materia (
    horario_id BIGINT NOT NULL,
    materia_id BIGINT NOT NULL,
    PRIMARY KEY (horario_id, materia_id),
    CONSTRAINT fk_hm_horario FOREIGN KEY (horario_id) REFERENCES horario (id) ON DELETE CASCADE,
    CONSTRAINT fk_hm_materia FOREIGN KEY (materia_id) REFERENCES materia (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- 5. Apuntes de clase y recordatorios por WhatsApp
-- ---------------------------------------------------------------------------

-- Lo importante anotado después de cada clase. Con fecha límite genera un aviso.
CREATE TABLE apunte_clase (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id     BIGINT       NOT NULL,
    materia_id     BIGINT,
    titulo         VARCHAR(150) NOT NULL,
    contenido      VARCHAR(800),
    fecha_clase    DATE         NOT NULL,
    fecha_limite   DATE,
    importante     TINYINT(1)   NOT NULL DEFAULT 0,
    resuelto       TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apunte_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_apunte_materia FOREIGN KEY (materia_id) REFERENCES materia (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX ix_apunte_pendiente ON apunte_clase (usuario_id, resuelto, fecha_limite);

-- Antelación configurable por tipo de vencimiento y franja de silencio.
CREATE TABLE preferencia_recordatorio (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id            BIGINT      NOT NULL,
    canal                 VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    telefono_whatsapp     VARCHAR(20),
    activo                TINYINT(1)  NOT NULL DEFAULT 1,
    minutos_antes_tarea   INT         NOT NULL DEFAULT 1440,
    minutos_antes_entrega INT         NOT NULL DEFAULT 4320,
    minutos_antes_apunte  INT         NOT NULL DEFAULT 120,
    silencio_desde        TIME                 DEFAULT '22:00:00',
    silencio_hasta        TIME                 DEFAULT '07:00:00',
    CONSTRAINT uq_preferencia_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_preferencia_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE recordatorio (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id         BIGINT       NOT NULL,
    proyecto_id        BIGINT,
    tarea_id           BIGINT,
    apunte_id          BIGINT,
    tipo               VARCHAR(20)  NOT NULL DEFAULT 'TAREA',
    canal              VARCHAR(20)  NOT NULL DEFAULT 'WHATSAPP',
    estado             VARCHAR(20)  NOT NULL DEFAULT 'PROGRAMADO',
    titulo             VARCHAR(150) NOT NULL,
    mensaje            VARCHAR(400),
    fecha_hora         DATETIME     NOT NULL,
    fecha_vencimiento  DATETIME,
    fecha_envio        DATETIME,
    intentos           INT          NOT NULL DEFAULT 0,
    error_envio        VARCHAR(400),
    referencia_externa VARCHAR(120),
    CONSTRAINT fk_recordatorio_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT fk_recordatorio_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto (id) ON DELETE CASCADE,
    CONSTRAINT fk_recordatorio_tarea FOREIGN KEY (tarea_id) REFERENCES tarea (id) ON DELETE CASCADE,
    CONSTRAINT fk_recordatorio_apunte FOREIGN KEY (apunte_id) REFERENCES apunte_clase (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- Índice de la cola de envío: el planificador consulta por estado y hora.
CREATE INDEX ix_recordatorio_cola ON recordatorio (estado, fecha_hora);

-- ---------------------------------------------------------------------------
-- 6. Canales, mensajes, reacciones, archivos y entregables
-- ---------------------------------------------------------------------------
-- Un proyecto se divide en canales, como en Discord: #general, #tarea-1...
CREATE TABLE canal (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(80)  NOT NULL,
    slug           VARCHAR(80)  NOT NULL,
    tipo           VARCHAR(20)  NOT NULL DEFAULT 'LIBRE',
    descripcion    VARCHAR(300),
    proyecto_id    BIGINT,
    tarea_id       BIGINT,
    creador_id     BIGINT,
    orden          INT          NOT NULL DEFAULT 10,
    fecha_creacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_canal_slug UNIQUE (proyecto_id, slug),
    CONSTRAINT fk_canal_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto (id) ON DELETE CASCADE,
    CONSTRAINT fk_canal_tarea FOREIGN KEY (tarea_id) REFERENCES tarea (id) ON DELETE SET NULL,
    CONSTRAINT fk_canal_creador FOREIGN KEY (creador_id) REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE mensaje_chat (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    canal_id        BIGINT        NOT NULL,
    autor_id        BIGINT,
    autor_nombre    VARCHAR(120)  NOT NULL,
    autor_color     VARCHAR(9)             DEFAULT '#5b5ce2',
    contenido       VARCHAR(2000) NOT NULL,
    fecha_envio     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generado_por_ia TINYINT(1)    NOT NULL DEFAULT 0,
    CONSTRAINT fk_mensaje_canal FOREIGN KEY (canal_id) REFERENCES canal (id) ON DELETE CASCADE,
    CONSTRAINT fk_mensaje_autor FOREIGN KEY (autor_id) REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX ix_mensaje_canal ON mensaje_chat (canal_id, fecha_envio);

-- Reacciones con emoji. La clave única impide reaccionar dos veces igual:
-- volver a pulsar el mismo emoji retira la reacción.
CREATE TABLE reaccion_mensaje (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    mensaje_id      BIGINT      NOT NULL,
    usuario_id      BIGINT      NOT NULL,
    emoji           VARCHAR(16) NOT NULL,
    fecha_reaccion  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_reaccion UNIQUE (mensaje_id, usuario_id, emoji),
    CONSTRAINT fk_reaccion_mensaje FOREIGN KEY (mensaje_id) REFERENCES mensaje_chat (id) ON DELETE CASCADE,
    CONSTRAINT fk_reaccion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- Imágenes y documentos compartidos en un canal. El binario vive en disco;
-- aquí queda solo la ficha.
CREATE TABLE archivo_adjunto (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    canal_id          BIGINT       NOT NULL,
    mensaje_id        BIGINT,
    nombre            VARCHAR(200) NOT NULL,
    nombre_almacenado VARCHAR(200) NOT NULL,
    tipo_mime         VARCHAR(120),
    tamano_bytes      BIGINT,
    es_imagen         TINYINT(1)   NOT NULL DEFAULT 0,
    subido_por_id     BIGINT,
    fecha_subida      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_archivo_canal FOREIGN KEY (canal_id) REFERENCES canal (id) ON DELETE CASCADE,
    CONSTRAINT fk_archivo_mensaje FOREIGN KEY (mensaje_id) REFERENCES mensaje_chat (id) ON DELETE SET NULL,
    CONSTRAINT fk_archivo_usuario FOREIGN KEY (subido_por_id) REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX ix_archivo_canal ON archivo_adjunto (canal_id, es_imagen);

-- Registro de documentos del trabajo grupal: el enlace a Word, Canva, GitHub...
CREATE TABLE entregable (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id         BIGINT       NOT NULL,
    nombre              VARCHAR(150) NOT NULL,
    descripcion         VARCHAR(400),
    url                 VARCHAR(600) NOT NULL,
    tipo                VARCHAR(20)  NOT NULL DEFAULT 'OTRO',
    estado              VARCHAR(20)  NOT NULL DEFAULT 'BORRADOR',
    responsable_id      BIGINT,
    tarea_id            BIGINT,
    fecha_registro      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME,
    CONSTRAINT fk_entregable_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyecto (id) ON DELETE CASCADE,
    CONSTRAINT fk_entregable_responsable FOREIGN KEY (responsable_id) REFERENCES integrante (id) ON DELETE SET NULL,
    CONSTRAINT fk_entregable_tarea FOREIGN KEY (tarea_id) REFERENCES tarea (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE resumen_chat (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    canal_id          BIGINT        NOT NULL,
    contenido         VARCHAR(2000) NOT NULL,
    puntos_clave      VARCHAR(1500),
    mensajes_resumidos INT          NOT NULL DEFAULT 0,
    desde_mensaje_id  BIGINT,
    hasta_mensaje_id  BIGINT,
    modelo            VARCHAR(60)            DEFAULT 'simulado',
    fecha_generacion  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resumen_canal FOREIGN KEY (canal_id) REFERENCES canal (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------
-- 7. Vista de apoyo: avance por proyecto (barras de progreso)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_avance_proyecto AS
SELECT p.id                                                       AS proyecto_id,
       p.codigo,
       p.nombre,
       COUNT(t.id)                                                AS total_tareas,
       SUM(CASE WHEN t.estado = 'TERMINADA' THEN 1 ELSE 0 END)   AS tareas_completadas,
       CASE WHEN COUNT(t.id) = 0 THEN 0
            ELSE ROUND(SUM(CASE WHEN t.estado = 'TERMINADA' THEN 1 ELSE 0 END) * 100 / COUNT(t.id))
       END                                                        AS porcentaje_avance
FROM proyecto p
         LEFT JOIN tarea t ON t.proyecto_id = p.id
GROUP BY p.id, p.codigo, p.nombre;
