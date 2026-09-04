# StudyFlow · Students Management Platform

Sistema de organización académica para estudiantes: horarios de clase, proyectos en equipo con
canales por tema, reparto de tareas por dependencias, registro de entregables, recordatorios
por WhatsApp y asistencia con IA.

Aplicación **Spring Boot 3.3 + Thymeleaf + Tailwind CSS + MySQL 8**, organizada en capas **IMVC**.

---

## 1. Funcionalidades

### 1.1 Acceso y perfil

| Funcionalidad | Estado |
|---|---|
| **Entrar solo con el nombre** — un campo y dentro | Completo |
| Registro reducido: nombre, correo y contraseña | Completo |
| Datos académicos opcionales, plegados en el formulario | Completo |
| Sesión real (`HttpSession`): cada persona escribe y toma tareas como ella misma | Completo |
| Acceso con correo y contraseña para quien ya la tiene | Completo |
| Botones de Google, GitHub y Facebook | **No conectados** (avisan en lugar de fingir) |
| Perfil con foto, descripción, datos académicos y proyectos | Completo |

El camino principal de entrada es de **un solo campo**. Si el correo se omite, se genera uno
interno (`nombre@studyflow.local`) para no pedir más datos; si se indica y ya existe, se reutiliza
la cuenta en lugar de duplicarla.

### 1.2 Proyectos y tareas

| Funcionalidad | Estado |
|---|---|
| Panel de proyectos en tarjetas con fecha, integrantes y avance | Completo |
| Búsqueda y filtros por estado | Completo |
| Creación de proyecto con contexto, entrega, integrantes y primeras tareas | Completo |
| Espacio de trabajo con calendario, avance y tablero de tareas | Completo |
| Tareas con responsable, color por integrante, etapa y archivo adjunto | Completo |
| Bitácora de avance al marcar una tarea terminada | Completo |
| Organización por etapas | Completo |

### 1.3 Canales del proyecto

| Funcionalidad | Estado |
|---|---|
| Un proyecto se divide en canales: `#general`, `#tarea1`, `#tarea-prototipo`… | Completo |
| `#general` se crea con el proyecto y no se puede eliminar | Completo |
| Canales libres o asociados a una tarea concreta | Completo |
| Barra lateral con la lista de canales y su número de mensajes | Completo |
| Mensajes con color e iniciales del integrante | Completo |
| **Reacciones con emoji** — 8 emojis, volver a pulsar retira la reacción | Completo |
| Contador y nombres de quién reaccionó | Completo |
| **Sección de imágenes** del canal (galería) | Completo |
| **Sección de documentos** del canal | Completo |
| Subida real de archivos (hasta 10 MB) al enviar un mensaje | Completo |
| Resumen de la conversación con IA | Simulado · preparado para la API |

Los archivos se guardan en disco (carpeta configurable) y en la base queda solo la ficha. Las
imágenes se muestran en línea y el resto se descarga.

### 1.4 Diagrama de fases y reparto del trabajo

| Funcionalidad | Estado |
|---|---|
| **Diagrama por etapas** en columnas, con flechas entre fases | Completo |
| **Dependencias entre tareas**: qué tarea bloquea a cuál | Completo |
| Detección de ciclos: se rechaza una dependencia que cerraría un bucle | Completo |
| Una tarea bloqueada muestra de qué depende y no se puede tomar | Completo |
| **Sección «Tareas disponibles»**: cada persona elige la que quiere hacer | Completo |
| Tomar una tarea la pone automáticamente en proceso | Completo |
| Liberar una tarea la devuelve al conjunto de disponibles | Completo |
| Quien toma una tarea sin ser del equipo se une al proyecto | Completo |

**Los cuatro estados de tarea** son: `Sin empezar` → `En proceso` → `En revisión` → `Terminada`.
Se admiten además los nombres antiguos (`pending`, `in-progress`, `done`) para los datos guardados
antes del cambio.

Una tarea está **disponible** cuando no tiene responsable **y** todas sus dependencias están
terminadas.

### 1.5 Documentos y entregables

| Funcionalidad | Estado |
|---|---|
| Registro de enlaces: Word, Canva, Google Docs, GitHub, YouTube… | Completo |
| **Tipo deducido del enlace** al pegarlo | Completo |
| Estado por documento: Borrador · En revisión · Final | Completo |
| Responsable de cada entregable | Completo |
| Vínculo opcional con la tarea de la que sale | Completo |

Es el índice de dónde vive cada parte del trabajo, distinto de los archivos subidos a un canal.

### 1.6 Horarios de clase

| Funcionalidad | Estado |
|---|---|
| Registro de materias con día, horas, profesor y créditos | Completo |
| Vista previa semanal | Completo |
| Generación de alternativas de horario **con IA** | Simulado (algoritmo propio) |
| Comparación y selección de alternativas | Completo |
| Detección de choques de horas | Completo |

### 1.7 Recordatorios por WhatsApp

| Funcionalidad | Estado |
|---|---|
| Envío por la **WhatsApp Cloud API de Meta** | Cliente real · **desactivado por defecto** |
| Antelación configurable por separado para tareas, entregas y pendientes de clase | Completo |
| Franja de «no molestar» que aplaza los avisos nocturnos | Completo |
| Apuntes posteriores a clase que generan recordatorios | Completo |
| Recálculo automático de la agenda al cambiar la configuración | Completo |
| Cola revisada cada minuto por una tarea programada | Completo |
| Estados por aviso con reintentos, y mensaje de prueba | Completo |

Sin credenciales de Meta la pasarela funciona en **modo simulación**: toda la lógica se ejecuta
igual y el mensaje se escribe en el log en lugar de enviarse.

### 1.8 Organizador de proyectos con IA

| Funcionalidad | Estado |
|---|---|
| Reparto en el número de tareas que se indique (1–20) | Completo |
| Plazo por tarea: inicio, fecha límite y días estimados | Completo |
| Rotación de responsables entre los integrantes | Completo |
| Reorganización de un proyecto conservando lo completado | Completo (vía API) |
| Redacción de la explicación con ChatGPT | **Preparado, sin conectar** |

### 1.9 Panel principal

Calendario general con las tareas de todos los proyectos (un color por proyecto), ventana flotante
al pasar el ratón, clic para ir al proyecto, formulario para marcar tarea terminada y resumen de
ritmo y próximas entregas.

### 1.10 Qué **no** está implementado

- **No hay autenticación real.** La sesión identifica a la persona pero no la verifica: no se usa
  Spring Security y la contraseña se guarda codificada en Base64 como marcador provisional.
- **Los botones de Google, GitHub y Facebook no hacen OAuth.**
- **La API de OpenAI no está conectada.** `ClienteIaOpenAi` está escrito contra el contrato público
  pero nunca se ha ejecutado contra el servicio real.
- **El envío por WhatsApp no se ha probado contra Meta**, por no disponer de credenciales.
- **Los mensajes no llegan solos**: no hay WebSocket, hay que recargar para ver lo nuevo.
- **Tres pantallas siguen leyendo `localStorage`**: panel, listado de proyectos y horarios. Las
  demás (canales, fases, entregables, recordatorios, acceso) ya usan la API REST.

---

## 2. Arquitectura por capas (IMVC)

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **I** · Interfaz | `src/main/resources/static/` | Hoja Tailwind compilada, JavaScript de interacción e imágenes |
| **V** · Vista | `src/main/resources/templates/` | Plantillas Thymeleaf; `fragments/layout.html` centraliza head, navegación y scripts |
| **C** · Controlador | `controller/view/`, `controller/api/` | `PaginaController` resuelve la navegación; los `*ApiController` exponen la API REST |
| **M** · Modelo | `model/entity/`, `model/dto/`, `model/enums/` | Entidades JPA, objetos de transferencia y enumeraciones |

Capas de apoyo: `service/` (+`impl/`), `repository/`, `mapper/`, `config/`, `exception/`, `util/`.

```
src/main/java/com/studyflow/platform/        · 134 archivos
├── StudyFlowApplication.java
├── config/        ConfiguracionWeb · CargadorDatosIniciales
│                  PropiedadesWhatsApp · PropiedadesIa
├── controller/
│   ├── view/      PaginaController
│   └── api/       Usuario · Sesion · Proyecto · Tarea · Horario
│                  Recordatorio · Canal · Archivo · Entregable · Fase · Organizador
├── service/       UsuarioService · SesionService · ProyectoService · TareaService
│                  HorarioService · RecordatorioService · ApunteClaseService
│                  CanalService · ArchivoService · EntregableService · FaseService
│                  OrganizadorProyectoService · AsistenteIaService
│                  PasarelaMensajeria · ClienteIaConversacional  ← puntos de integración
│   └── impl/      implementaciones + WhatsAppCloudApiGateway
│                  ClienteIaSimulado · ClienteIaOpenAi · PlanificadorRecordatorios
├── repository/    17 repositorios Spring Data
├── model/
│   ├── entity/    Universidad · Usuario · Proyecto · Integrante · Etapa · Tarea ·
│   │              ArchivoTarea · RegistroAvance · Entregable · Materia · BloqueHorario ·
│   │              Horario · Recordatorio · PreferenciaRecordatorio · ApunteClase ·
│   │              Canal · MensajeChat · ReaccionMensaje · ArchivoAdjunto · ResumenChat
│   ├── dto/       DTO de salida y peticiones de formulario
│   └── enums/     EstadoTarea · DiaSemana · RolIntegrante · ProveedorAcceso ·
│                  CanalRecordatorio · TipoRecordatorio · EstadoRecordatorio ·
│                  TipoCanal · TipoEntregable · EstadoEntregable
├── mapper/        UsuarioMapper · ProyectoMapper · HorarioMapper
│                  RecordatorioMapper · CanalMapper
├── exception/     RecursoNoEncontradoException · ManejadorGlobalErrores
└── util/          TextoUtil
```

### Puntos de integración

Las dos APIs externas están detrás de una interfaz, de modo que conectarlas no obliga a tocar
servicios ni controladores:

| Interfaz | Implementación activa | Implementación real |
|---|---|---|
| `PasarelaMensajeria` | `WhatsAppCloudApiGateway` en simulación | el mismo, con credenciales |
| `ClienteIaConversacional` | `ClienteIaSimulado` | `ClienteIaOpenAi` con `studyflow.ia.enabled=true` |

---

## 3. Puesta en marcha

### Requisitos
- JDK 17+
- MySQL 8 — opcional, ver el atajo del apartado 3.1
- Node 18+ — solo si vas a recompilar los estilos

### 3.1 Atajo: arrancar sin instalar MySQL

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Base H2 en memoria, sin instalar nada. Abre <http://localhost:6767>. Los datos de ejemplo se
crean en cada arranque y se pierden al parar.

### 3.2 Instalar MySQL (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install mysql-server
systemctl status mysql          # debe decir "active (running)"
```

> `mysql_secure_installation` es opcional y **no afecta a este proyecto**: la aplicación se conecta
> como `studyflow`, no como `root`.

### 3.3 Crear la base de datos — paso manual, una sola vez

**Este paso no es automático.** La aplicación se conecta *a* la base `studyflow` con el usuario
`studyflow`: ambos deben existir antes de que arranque, porque no puede crear la base a la que
necesita conectarse.

```bash
sudo mysql < src/main/resources/db/mysql/schema.sql
```

Crea la base, las 22 tablas, la vista de avance, el usuario y sus permisos. **No se repite.**

Los datos de ejemplo son opcionales:

```bash
sudo mysql studyflow < src/main/resources/db/mysql/data.sql
```

Si la base está vacía, la propia aplicación la siembra al arrancar (usuario, 3 proyectos con sus
tareas encadenadas por dependencias, canales `#general`, materias, entregables y un apunte de
clase). No hay riesgo de duplicados si ejecutas los dos.

#### Qué es automático y qué no

| | Quién lo hace |
|---|---|
| Base de datos y usuario de MySQL | **Tú**, con `schema.sql` (una vez) |
| Tablas | Hibernate, con `ddl-auto=update` |
| Datos de demostración | `CargadorDatosIniciales`, si la base está vacía |

### 3.4 Arrancar

```bash
./mvnw spring-boot:run
```

La aplicación queda en <http://localhost:6767>.

### 3.5 Detener la ejecución

- **Lanzada desde una terminal:** `Ctrl+C`.
- **Lanzada en segundo plano** (`&` o `nohup`), `Ctrl+C` no sirve:

```bash
pkill -f "com.studyflow.platform.StudyFlowApplication"
```

`spring-boot:run` arranca **dos** procesos (Maven y la JVM). El `pkill` de arriba apunta a la JVM,
que es la que ocupa el puerto. Para ver quién lo tiene: `ss -ltnp | grep 6767`.

### 3.6 Configuración

Todo en `src/main/resources/application.properties`:

| Qué | Propiedad |
|---|---|
| Puerto | `server.port=6767` |
| Servidor y base de MySQL | `spring.datasource.url` |
| Acceso desde otros equipos | añade `server.address=0.0.0.0` |
| Carpeta de archivos subidos | `studyflow.archivos.ruta` (por defecto `archivos/`) |
| Frecuencia de la cola de recordatorios | `studyflow.recordatorios.intervalo-ms` |

Credenciales por entorno, sin editar el archivo:

```bash
DB_USER=miusuario DB_PASSWORD=miclave ./mvnw spring-boot:run
```

#### Activar el envío real por WhatsApp

El token y el *Phone Number ID* salen del
[panel de desarrolladores de Meta](https://developers.facebook.com/).

```properties
studyflow.whatsapp.enabled=true
studyflow.whatsapp.token=${WHATSAPP_TOKEN:}
studyflow.whatsapp.phone-number-id=${WHATSAPP_PHONE_ID:}
```

Dos avisos al conectarlo: Meta solo permite **texto libre dentro de las 24 h** posteriores a un
mensaje del usuario (fuera de esa ventana hace falta una plantilla aprobada, que este cliente aún
no envía), y el número va en **formato internacional sin signos**: `573001112233`.

#### Activar la API de ChatGPT

```properties
studyflow.ia.enabled=true
studyflow.ia.api-key=${OPENAI_API_KEY:}
studyflow.ia.modelo=gpt-4o-mini
```

`ClienteIaOpenAi` sustituye automáticamente a `ClienteIaSimulado`. Ese cliente **no se ha probado
contra el servicio real**: al conectarlo conviene verificar el modelo y la forma de la respuesta.

### 3.7 Empaquetar

```bash
./mvnw clean package
java -jar target/students-management-platform.jar
```

### 3.8 Estilos (Tailwind)

```bash
npm install
npm run css        # compila una vez
npm run css:watch  # recompila al guardar
```

Fuente: `src/main/frontend/tailwind.css` → salida: `src/main/resources/static/css/app.css`.
El CSS compilado está versionado: **solo necesitas Node si vas a modificar los estilos**.

**Modo claro y oscuro.** El interruptor está en la barra superior (y suelto en
acceso, registro y la guía de estilo, que no llevan barra). La elección se
guarda en el navegador; mientras no se elija nada se sigue la preferencia del
sistema y la página cambia con ella.

No hay dos hojas de estilo ni variantes `dark:` repetidas por componente: las
superficies son **variables de rol** (`--tarjeta-gris`, `--campo`, `--titulo-a`,
`--form-linea`…) declaradas dos veces en `tailwind.css`, una en `:root` y otra
en `.dark`. Cada regla usa la variable, así que volcar ese bloque cambia toda la
aplicación y no puede quedar media pantalla sin adaptar. Los colores de marca
(primary, success, warning, danger, cyan) son fijos: valen en los dos modos.

La clase `.dark` la pone un script síncrono en el `<head>`, antes de pintar; si
se dejara a `main.js` (que va con `defer`) se vería un fogonazo blanco al cargar.

**Paleta y guía de estilo:** con la aplicación en marcha, `http://localhost:6767/paleta`
muestra los colores, las sombras, los redondeos y las tipografías. No hace falta
sesión. Los valores no están escritos en esa página: cada muestra se pinta con la
clase real y se lee su color ya calculado, así que la guía no puede quedar
desfasada respecto a la hoja de estilos. Pulsa cualquier muestra para copiarla.

Conviene mirarla antes de maquetar una pantalla nueva. Los colores con nombre
(`primary`, `success`…) viven en `tailwind.config.js`, pero los grises azulados
que separan una tarjeta del fondo o un campo de su panel están escritos como
valor literal dentro de `tailwind.css` y no tienen nombre; la guía es el único
sitio donde se ven todos juntos y con su función explicada.

---

## 4. Rutas

### Navegación

| Ruta | Página |
|------|--------|
| `/` | Panel con calendario general |
| `/login` · `/registro` | Entrar (un campo) y registro |
| `/perfil` · `/perfil/editar` | Perfil y edición |
| `/proyectos` · `/proyectos/nuevo` | Listado y creación |
| `/proyectos/{codigo}` | Espacio de trabajo |
| `/proyectos/{codigo}/canales` | Canales del proyecto |
| `/proyectos/{codigo}/fases` | Diagrama de fases y reparto |
| `/proyectos/{codigo}/entregables` | Documentos y entregables |
| `/horarios` | Planificador de horarios |
| `/recordatorios` | WhatsApp y apuntes de clase |
| `/chats` | Canales agrupados por proyecto |
| `/paleta` | Guía de estilo: colores, sombras y tipografías (sin sesión) |

### API REST

**Sesión y cuentas**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/sesion/actual` | Quién está usando la aplicación |
| `POST` | `/api/sesion/entrar` | Entrada en un paso (nombre) |
| `POST` | `/api/sesion/acceder` · `/salir` | Correo y contraseña · cerrar sesión |
| `GET`/`POST`/`PUT` | `/api/usuarios/**` | Perfil, registro y actualización |

**Proyectos, tareas y fases**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`/`POST` | `/api/proyectos` | Listar / crear |
| `GET`/`DELETE` | `/api/proyectos/{codigo}` | Detalle / eliminar |
| `PUT` | `/api/proyectos/{codigo}/integrantes` | Modificar equipo |
| `GET`/`POST` | `/api/proyectos/{codigo}/tareas` | Tareas |
| `GET` | `/api/proyectos/{codigo}/fases` | Diagrama con dependencias |
| `GET` | `/api/proyectos/{codigo}/tareas-disponibles` | Tareas libres y sin bloqueos |
| `POST`/`DELETE` | `/api/tareas/{id}/dependencias[/{dep}]` | Añadir / quitar dependencia |
| `POST` | `/api/tareas/{id}/reclamar` · `/liberar` | Tomar / soltar una tarea |
| `PATCH` | `/api/tareas/{id}/estado` | Cambiar entre los cuatro estados |
| `GET` | `/api/estados-tarea` | Lista de estados disponibles |
| `PATCH` | `/api/tareas/{id}/completar` | Marcar terminada con nota |
| `GET` | `/api/tareas/agenda?desde&hasta` | Agenda del calendario |

**Canales, mensajes y archivos**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/canales` | Todos los canales visibles |
| `GET`/`POST` | `/api/proyectos/{codigo}/canales` | Canales del proyecto / crear |
| `GET` | `/api/proyectos/{codigo}/canales/{slug}` | Canal por su nombre |
| `GET`/`DELETE` | `/api/canales/{id}` | Conversación / eliminar |
| `POST` | `/api/canales/{id}/mensajes` | Publicar mensaje |
| `POST` | `/api/mensajes/{id}/reacciones` | Añadir o retirar un emoji |
| `POST`/`GET` | `/api/canales/{id}/archivos` | Subir / listar (`?soloImagenes=`) |
| `GET` | `/api/archivos/{id}` | Descargar o mostrar |
| `GET` | `/api/proyectos/{codigo}/archivos` | Archivos de todo el proyecto |
| `POST`/`GET` | `/api/canales/{id}/resumen[es]` | Generar / historial de resúmenes |

**Entregables, recordatorios, horarios y organizador**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`/`POST` | `/api/proyectos/{codigo}/entregables` | Registro de documentos |
| `PUT`/`PATCH`/`DELETE` | `/api/entregables/{id}[/estado]` | Editar, cambiar estado, eliminar |
| `GET`/`PUT` | `/api/recordatorios/preferencias` | Antelación y canal |
| `GET`/`POST`/`DELETE` | `/api/recordatorios[/…]` | Agenda, reprogramar, prueba, cancelar |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/apuntes[/…]` | Apuntes de clase |
| `GET`/`POST`/`DELETE` | `/api/materias` | Materias del planificador |
| `GET`/`POST`/`PATCH` | `/api/horarios[/…]` | Alternativas, generar con IA, seleccionar |
| `POST` | `/api/organizador/plan` | Plan de N tareas con plazos |
| `POST` | `/api/organizador/proyectos/{codigo}` | Reorganizar un proyecto |
| `GET` | `/api/organizador/estado` | Modelo activo y si está conectado |

---

## 5. Base de datos

22 tablas en MySQL 8:

| Área | Tablas |
|---|---|
| Cuentas | `universidad`, `usuario` |
| Proyectos | `proyecto`, `integrante`, `etapa` |
| Tareas | `tarea`, `tarea_dependencia`, `archivo_tarea`, `registro_avance` |
| Entregables | `entregable` |
| Canales | `canal`, `mensaje_chat`, `reaccion_mensaje`, `archivo_adjunto`, `resumen_chat` |
| Horarios | `materia`, `bloque_horario`, `horario`, `horario_materia` |
| Recordatorios | `apunte_clase`, `preferencia_recordatorio`, `recordatorio` |

Más la vista `vista_avance_proyecto`, que precalcula el porcentaje de tareas terminadas.

Esquema en `src/main/resources/db/mysql/schema.sql`, con claves foráneas, borrado en cascada,
índices sobre fechas y estados, y restricciones de coherencia (edad válida, `hora_inicio < hora_fin`,
una tarea no puede depender de sí misma, un emoji por persona y mensaje).

---

## 6. Pruebas

```bash
./mvnw test
```

27 pruebas sobre el perfil `dev`: arranque, respuesta de las páginas, datos de demostración,
antelación de recordatorios, modo simulación de WhatsApp, reparto de plazos del organizador,
resúmenes de canal, reacciones con emoji, ciclos de dependencias, reparto de tareas, los cuatro
estados, tipos de entregable deducidos del enlace y acceso rápido.

---

## 7. Problemas frecuentes

**El navegador dice «no se puede acceder a este sitio».**
La aplicación no está arrancada o murió al arrancar. Si ves `Communications link failure` o
`Unknown database 'studyflow'`, falta MySQL o el paso 3.3. Comprobación rápida:
`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` no necesita base de datos — si con `dev`
sí abre, el problema está en MySQL y no en la aplicación.

**`Port 6767 was already in use`.**
Quedó una ejecución viva. `ss -ltnp | grep 6767` y el `pkill` del apartado 3.5.

**`Unknown database 'studyflow'` o `Access denied`.**
Falta el paso 3.3. Comprobar: `sudo mysql -e "SHOW DATABASES;" | grep studyflow`.

**No me llega ningún WhatsApp.**
Es lo esperado sin credenciales: la pasarela simula y escribe en el log (`[WhatsApp · SIMULADO]`).
La página de recordatorios muestra un aviso amarillo cuando está en ese modo.

**Los recordatorios no aparecen.**
Solo se programan avisos para vencimientos **futuros**. Pulsa «Recalcular agenda» tras cambiar
tareas o fechas.

**No puedo tomar una tarea.**
O ya tiene responsable, o alguna de sus dependencias no está terminada. El diagrama de fases marca
las bloqueadas con un candado e indica de qué dependen.

**No puedo eliminar un canal.**
`#general` es el hilo principal del proyecto y no se puede borrar. Los demás sí.

**Cambié el CSS y no se ve.**
Hay que recompilar con `npm run css`. Y `Ctrl+Shift+R` en el navegador.

**Cambié `server.port` y sigue en el puerto anterior.**
Spring Boot lee ese valor solo al iniciar: hay que reiniciar.
