# StudyFlow · Students Management Platform

Sistema de organización académica para estudiantes: horarios de clase, proyectos en equipo,
reparto de tareas, seguimiento de avance, calendarios y asistencia simulada de IA.

Aplicación **Spring Boot 3.3 + Thymeleaf + Tailwind CSS + MySQL 8**, organizada en capas **IMVC**.

---

## 1. Arquitectura por capas (IMVC)

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **I** · Interfaz | `src/main/resources/static/` | Hoja Tailwind compilada (`css/app.css`), JavaScript de interacción (`js/*.js`) e imágenes |
| **V** · Vista | `src/main/resources/templates/` | Plantillas Thymeleaf; `fragments/layout.html` centraliza `head`, navegación y scripts |
| **C** · Controlador | `controller/view/`, `controller/api/` | `PaginaController` resuelve las rutas de navegación; los `*ApiController` exponen la API REST |
| **M** · Modelo | `model/entity/`, `model/dto/`, `model/enums/` | Entidades JPA, objetos de transferencia y enumeraciones del dominio |

Capas de apoyo:

- `service/` + `service/impl/` — reglas de negocio (interfaz e implementación separadas).
- `repository/` — acceso a datos con Spring Data JPA.
- `mapper/` — traducción entidad ⇄ DTO, para que la interfaz no dependa del modelo interno.
- `config/` — configuración web y carga de datos de demostración.
- `exception/` — errores de negocio traducidos a respuestas HTTP.
- `util/` — utilidades compartidas (slugs, iniciales).

```
src/main/java/com/studyflow/platform/
├── StudyFlowApplication.java
├── config/        ConfiguracionWeb · CargadorDatosIniciales
├── controller/
│   ├── view/      PaginaController
│   └── api/       UsuarioApi · ProyectoApi · TareaApi · HorarioApi
├── service/       UsuarioService · ProyectoService · TareaService · HorarioService · AsistenteIaService
│   └── impl/      implementaciones
├── repository/    9 repositorios Spring Data
├── model/
│   ├── entity/    Universidad · Usuario · Proyecto · Integrante · Etapa · Tarea ·
│   │              ArchivoTarea · RegistroAvance · Materia · BloqueHorario · Horario · Recordatorio
│   ├── dto/       DTO de salida y peticiones de formulario
│   └── enums/     EstadoTarea · DiaSemana · RolIntegrante · ProveedorAcceso
├── mapper/        UsuarioMapper · ProyectoMapper · HorarioMapper
├── exception/     RecursoNoEncontradoException · ManejadorGlobalErrores
└── util/          TextoUtil
```

---

## 2. Puesta en marcha

### Requisitos
- JDK 17+
- MySQL 8 — opcional, ver el atajo del apartado 2.1
- Node 18+ — solo si vas a recompilar los estilos

---

### 2.1 Atajo: arrancar sin instalar MySQL

El perfil `dev` usa una base H2 en memoria. No necesitas instalar ni configurar nada:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Abre <http://localhost:6767>. Los datos de ejemplo se crean solos en cada arranque y se
pierden al parar la aplicación. Suficiente para trabajar en la interfaz; para todo lo demás,
sigue con el apartado 2.2.

---

### 2.2 Instalar MySQL (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install mysql-server
systemctl status mysql          # debe decir "active (running)"
```

El servicio arranca solo al terminar la instalación y queda habilitado en el inicio del sistema.

> `mysql_secure_installation` es opcional y **no afecta a este proyecto**: la aplicación no se
> conecta como `root`, sino con el usuario `studyflow`. Si lo ejecutas y le pones contraseña a
> `root`, recuerda que a partir de entonces usarás `mysql -u root -p` en lugar de `sudo mysql`.

---

### 2.3 Crear la base de datos — paso manual, una sola vez

**Este paso no es automático y hay que hacerlo a mano.** La aplicación se conecta *a* la base
`studyflow` con el usuario `studyflow`, así que ambos tienen que existir antes de que arranque:
no puede crear la base a la que necesita conectarse para funcionar.

```bash
sudo mysql < src/main/resources/db/mysql/schema.sql
```

Ese único comando crea la base de datos, las 12 tablas, la vista de avance, el usuario
`studyflow` y sus permisos. **No hay que repetirlo nunca más.**

Los datos de ejemplo son **opcionales**:

```bash
sudo mysql studyflow < src/main/resources/db/mysql/data.sql
```

Solo aportan los recordatorios y las alternativas de horario ya guardadas. Todo lo demás
(usuario, 3 proyectos con sus tareas y 4 materias) lo crea la propia aplicación al arrancar
si encuentra la base vacía. No hay riesgo de duplicados si ejecutas los dos: el cargador
comprueba que la tabla `usuario` esté vacía antes de insertar nada.

#### Qué es automático y qué no

| | Quién lo hace |
|---|---|
| Base de datos y usuario de MySQL | **Tú**, con `schema.sql` (una vez) |
| Tablas | Hibernate, con `spring.jpa.hibernate.ddl-auto=update` |
| Datos de demostración | `CargadorDatosIniciales`, si la base está vacía |

Los archivos de `db/mysql/` están fuera de la raíz de `resources/` a propósito: así Spring Boot
no los ejecuta por su cuenta y sirven como documentación del modelo de datos.

---

### 2.4 Arrancar

```bash
./mvnw spring-boot:run
```

La aplicación queda en <http://localhost:6767>.

---

### 2.5 Detener la ejecución

- **Si la lanzaste desde una terminal:** `Ctrl+C` en esa misma terminal.
- **Si la lanzaste en segundo plano** (con `&` o `nohup`), `Ctrl+C` no sirve:

```bash
pkill -f "com.studyflow.platform.StudyFlowApplication"
```

`spring-boot:run` arranca **dos** procesos: Maven y la JVM de la aplicación. Si matas solo el de
Maven, la JVM puede seguir viva ocupando el puerto. El `pkill` de arriba apunta directamente a
la JVM, que es la que realmente escucha.

Para ver qué está ocupando el puerto:

```bash
ss -ltnp | grep 6767
```

---

### 2.6 Cambiar el puerto o el servidor de MySQL

Todo está en `src/main/resources/application.properties`:

| Qué | Dónde |
|---|---|
| Puerto de la aplicación | `server.port=6767` |
| Servidor y base de MySQL | `spring.datasource.url` |
| Acceso desde otros equipos | añade `server.address=0.0.0.0` |

Las credenciales no hace falta editarlas en el archivo; se pueden pasar por entorno:

```bash
DB_USER=miusuario DB_PASSWORD=miclave ./mvnw spring-boot:run
```

Si mueves MySQL a otra máquina, recuerda que el usuario del `schema.sql` está creado como
`'studyflow'@'localhost'`, es decir, solo puede conectarse desde el propio servidor de la base
de datos. Habría que recrearlo con `@'%'` o con la IP correspondiente.

---

### 2.7 Empaquetar

```bash
./mvnw clean package            # genera target/students-management-platform.jar
java -jar target/students-management-platform.jar
```

---

### 2.8 Estilos (Tailwind)

```bash
npm install
npm run css        # compila una vez, minificado
npm run css:watch  # recompila al guardar
```

Fuente: `src/main/frontend/tailwind.css` → salida: `src/main/resources/static/css/app.css`.
La paleta original del proyecto está declarada en `tailwind.config.js`.

El CSS compilado está versionado, así que **solo necesitas Node si vas a modificar los estilos**.

---

## 3. Rutas

### Navegación (Vista)

| Ruta | Página |
|------|--------|
| `/` | Panel principal con calendario general |
| `/login` | Inicio de sesión |
| `/registro` | Creación de cuenta |
| `/perfil` · `/perfil/editar` | Perfil y edición |
| `/proyectos` | Gestión general de proyectos |
| `/proyectos/nuevo` | Creación de proyecto |
| `/proyectos/{codigo}` | Espacio de trabajo del proyecto |
| `/horarios` | Planificador de horarios de clase |

### API REST (Controlador)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/usuarios/actual` | Perfil del usuario en sesión |
| `POST` | `/api/usuarios/registro` | Alta de cuenta |
| `PUT` | `/api/usuarios/{id}` | Actualizar perfil |
| `POST` | `/api/usuarios/acceso` | Validar credenciales |
| `GET`/`POST` | `/api/proyectos` | Listar / crear proyectos |
| `GET`/`DELETE` | `/api/proyectos/{codigo}` | Detalle / eliminar |
| `PUT` | `/api/proyectos/{codigo}/integrantes` | Modificar equipo |
| `GET`/`POST` | `/api/proyectos/{codigo}/tareas` | Tareas del proyecto |
| `POST` | `/api/proyectos/planificacion-ia` | "Rellenar con IA" |
| `PUT`/`DELETE` | `/api/tareas/{id}` | Editar / eliminar tarea |
| `PATCH` | `/api/tareas/{id}/completar` | Marcar tarea terminada |
| `GET` | `/api/tareas/agenda?desde&hasta` | Agenda del calendario general |
| `GET`/`POST`/`DELETE` | `/api/materias` | Materias del planificador |
| `GET` | `/api/horarios` | Alternativas guardadas |
| `POST` | `/api/horarios/generar` | "Generar horarios con IA" |
| `PATCH` | `/api/horarios/{id}/seleccionar` | Elegir una alternativa |

---

## 4. Estado actual

- La interfaz sigue funcionando con la capa de datos del navegador (`localStorage`, en `js/main.js`),
  de modo que todas las pantallas son navegables sin base de datos.
- El backend ya expone el modelo completo y la API; la conexión de la interfaz a esa API es
  el siguiente paso natural: `App.ROUTES.api` y `App.api()` en `js/main.js` son el punto de entrada.
- La autenticación aún no usa Spring Security; `UsuarioServiceImpl` codifica la contraseña en Base64
  como marcador provisional que debe reemplazarse por `BCryptPasswordEncoder`.

---

## 5. Problemas frecuentes

**El navegador dice «no se puede acceder a este sitio».**
La aplicación no está arrancada, o murió al arrancar. Revisa la salida de la terminal: si ves
`Communications link failure` o `Unknown database 'studyflow'`, es que falta MySQL o el paso 2.3.
Como comprobación rápida, `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` no necesita
base de datos: si con el perfil `dev` sí abre, el problema está en MySQL y no en la aplicación.

**`Port 6767 was already in use`.**
Quedó una ejecución anterior viva. Mírala con `ss -ltnp | grep 6767` y ciérrala con el `pkill`
del apartado 2.5.

**`Unknown database 'studyflow'` o `Access denied for user 'studyflow'`.**
Falta el paso 2.3. Ejecuta el `schema.sql`. Para comprobar que quedó bien:

```bash
sudo mysql -e "SHOW DATABASES;" | grep studyflow
```

**Cambié el CSS y no se ve el cambio.**
Editar `src/main/frontend/tailwind.css` no basta: hay que recompilar con `npm run css`, que es
lo que genera `static/css/app.css`. Usa `npm run css:watch` mientras trabajas en los estilos.
Si aun así no se ve, fuerza recarga en el navegador con `Ctrl+Shift+R`.

**Cambié `server.port` y sigue en el puerto anterior.**
Spring Boot lee ese valor solo al iniciar. Hay que parar y volver a arrancar la aplicación.
