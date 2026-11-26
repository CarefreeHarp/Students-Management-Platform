# StudyFlow · Students Management Platform

El semestre de un estudiante, en una sola vista: horario de clases, tareas de todos los proyectos
y entregas en el mismo calendario, y cada trabajo en grupo con su espacio propio —conversación por
tema, reparto de tareas por dependencias y registro de entregables—.

SPA en **Angular 21, TypeScript, RxJS y CSS** con una API **Spring Boot 4.1 y Java 17**. Los datos se guardan en H2.

**Índice** · [Qué es](#1-qué-es-studyflow) · [Flujo de pantallas](#2-flujo-de-pantallas) ·
[Las pantallas](#3-las-pantallas-una-a-una) · [Funcionalidades](#4-funcionalidades) ·
[Arquitectura](#5-arquitectura) · [Puesta en marcha](#6-puesta-en-marcha)

---

## 1. Qué es StudyFlow

### El problema

Un estudiante universitario no lleva un solo calendario: lleva el horario de clases,
las entregas de cada materia, dos o tres trabajos en grupo con su propio reparto de
tareas, un chat distinto por equipo, y los enlaces de Drive o Canva donde vive cada
documento. Nada de eso se habla entre sí. Lo que se anuncia en clase se apunta en el
móvil, la coordinación del grupo se pierde en un chat sin estructura, y el estado real
de un trabajo solo lo sabe quien lo está haciendo.

El resultado conocido: se llega a la semana de entregas sin una vista de qué falta, y
el trabajo en grupo se reparte tarde y mal.

### La propuesta

**Un solo sitio donde el semestre se ve entero**: las clases, las tareas de todos los
proyectos y las entregas en un mismo calendario, y cada trabajo en grupo con su
espacio propio —conversación por tema, reparto de tareas por dependencias y registro
de entregables—.

### Para quién

Estudiantes universitarios que cursan varias materias a la vez **y** trabajan en
equipo. El caso de uso central no es la tarea individual, que ya cubre cualquier lista
de pendientes, sino **el trabajo en grupo con fechas**.

### Qué lo diferencia

| | Herramienta habitual | StudyFlow |
|---|---|---|
| Coordinación del equipo | Un chat plano por grupo | Canales por tema dentro del proyecto |
| Reparto de tareas | «¿Quién hace qué?» por mensaje | Cada quien **toma** la tarea que quiere, y solo si está desbloqueada |
| Orden del trabajo | Implícito, en la cabeza de alguien | Explícito: dependencias entre tareas y diagrama de fases |
| Dónde está cada archivo | Enlaces perdidos en el chat | Registro de entregables con estado y responsable |
| Avisos | Recordatorio genérico del móvil | WhatsApp, con antelación distinta por tipo de vencimiento |
| Lo anunciado en clase | Una nota suelta | Apunte que se convierte en recordatorio |

La idea que sostiene el producto: **una tarea está disponible cuando no tiene
responsable y todas sus dependencias están terminadas.** De ahí sale el reparto por
libre elección, que es lo que evita la reunión de asignación.

### En una frase

> StudyFlow reúne el horario, las entregas y los trabajos en grupo de un estudiante en
> una sola vista, y convierte el reparto de tareas de un equipo en algo que se ve y se
> elige, en lugar de negociarse por chat.

### Estado del proyecto

El organizador puede usar OpenAI para redactar el resumen de un plan. Canales usa Gemini para los resúmenes cuando se configura la clave, con un resumen local disponible como respaldo. WhatsApp y OpenAI tienen la conexión externa desactivada por defecto.

## 2. Flujo de pantallas

La portada está en `/`. Desde `/login` se puede abrir el tour sin cuenta, crear una cuenta o entrar con correo y contraseña. El tour usa datos temporales en el navegador.

Después de entrar, Angular abre `/panel` o recupera la ruta privada solicitada. Desde el panel se llega a Proyectos, Horarios, Recordatorios y Perfil. Cada proyecto tiene páginas para Canales, Fases y Entregables. `/paleta` muestra la guía de estilo y es pública.

## 3. Las pantallas, una a una

### 3.1 Acceso · `/login`

El acceso ofrece un tour temporal, registro o ingreso con correo y contraseña. El tour se abre en `/sandbox` y elimina sus datos al salir o reiniciar.

### 3.2 Registro · `/registro`

Se solicita nombre, correo y contraseña. Universidad, programa, semestre y edad son opcionales. Las contraseñas nuevas requieren al menos 12 caracteres y un máximo de 72 bytes.

### 3.3 Panel · `/panel`

La pantalla que más se usa. Saluda por el nombre y resume la semana en una frase
(«Siete tareas por avanzar esta semana. La más cercana vence el jueves»).

- **Tres tarjetas de resumen**: avance del semestre, próxima entrega y avisos
  programados.
- **Calendario semanal** con las tareas de *todos* los proyectos, cada uno con su
  color, y navegación entre semanas. Al pasar el ratón sobre una tarea sale una
  ventana con su detalle; al pulsarla se abre su proyecto.
- **«Próximamente»**: las siguientes entregas en una lista.
- **«Tus proyectos»**: avance de cada uno en porcentaje.
- **«¿Terminaste algo?»**: marcar una tarea como terminada sin salir del panel, lo
  que además deja registro en la bitácora del proyecto.

### 3.4 Mis proyectos · `/proyectos`

Cuadrícula de tarjetas, una por trabajo, con su color, la fecha de entrega, los
integrantes y el porcentaje de avance. Buscador por texto y filtros por estado.
Botón para crear uno nuevo.

### 3.5 Crear proyecto · `/proyectos/nuevo`

Formulario en tres pasos numerados, con vista previa a la derecha.

1. **Información**: nombre, contexto, fecha de entrega y etapa inicial.
2. **Integrantes**: se añaden en filas, cada uno con su color.
3. **Primeras tareas**: nombre, responsable y fecha.

- **Calendario de vista previa** que se va llenando según se añaden tareas.
- **«Usar plantilla»**: completa los campos vacíos con datos editables. El organizador disponible en la API reparte tareas con
  plazos calculados y responsables rotados entre el equipo.
- Al crearlo, el proyecto **nace con su canal `#general`**.

### 3.6 Espacio de trabajo · `/proyectos/{codigo}`

El interior de un proyecto. Arriba, tres botones que llevan a canales, fases y
entregables.

- **Calendario del proyecto** con sus tareas, coloreadas por responsable.
- **Tablero de tareas** con estado, responsable, etapa y fecha; se filtran por estado.
- **Equipo**: los integrantes y sus colores, modificables.
- Alta de tareas con responsable, fecha, etapa y archivo adjunto.

### 3.7 Canales · `/proyectos/{codigo}/canales`

La conversación del equipo, dividida por temas al estilo de un servidor de mensajería.

- **Barra lateral** con los canales y su número de mensajes. `#general` viene con el
  proyecto y **no se puede eliminar**; el resto se crean libres o atados a una tarea.
- **Mensajes** con el color y las iniciales de cada integrante.
- **Reacciones con emoji**: ocho disponibles; volver a pulsar retira la reacción y se
  ve quién reaccionó.
- **Adjuntos hasta 10 MB**: las imágenes se muestran en línea y el resto se descarga.
- Columna derecha con **galería de imágenes**, **lista de documentos** y **resumen de
  la conversación** (marcado como simulado mientras la IA no esté conectada).

### 3.8 Fases y dependencias · `/proyectos/{codigo}/fases`

La pantalla más distintiva del producto.

- **«Tareas disponibles»**: las que no tienen responsable y tienen todas sus
  dependencias terminadas. Cada persona **toma** la que quiere con un botón, y al
  hacerlo la tarea pasa a «En proceso» automáticamente.
- **Diagrama por etapas** en columnas con flechas entre fases, cada etapa con su
  color. Una tarea bloqueada muestra un candado, se raya en diagonal e indica **de
  qué depende**.
- Quien toma una tarea sin ser del equipo **se une al proyecto**.
- El sistema **rechaza cualquier dependencia que cerraría un ciclo**.

### 3.9 Documentos y entregables · `/proyectos/{codigo}/entregables`

El índice de dónde vive cada parte del trabajo —distinto de los archivos subidos a un
canal—.

- Se pega un enlace (Google Docs, Word, Canva, GitHub, YouTube…) y **el tipo se
  deduce solo**.
- Cada documento lleva estado (**Borrador · En revisión · Final**), responsable y,
  opcionalmente, la tarea de la que sale.
- Tres tarjetas de resumen arriba con el recuento por estado.

### 3.10 Horarios · `/horarios`

Planificador de la semana de clases.

- **Alta de materias** con día, hora de inicio y fin, profesor y créditos.
- **Calendario semanal** con cada materia en un color, y aviso si dos se solapan.
- **«Generar horarios con IA»**: propone alternativas seleccionando subconjuntos de
  las materias registradas —sin inventarse horas que no existen— para comparar y
  elegir.

### 3.11 Recordatorios · `/recordatorios`

Los avisos por WhatsApp y lo que se anuncia en clase.

- **Configuración**: número de WhatsApp y **antelación distinta por tipo** —tareas,
  entregas de proyecto y pendientes de clase—, más una franja de «no molestar» que
  aplaza los avisos nocturnos.
- **«Lo importante de hoy»**: se apunta lo anunciado en clase y, si tiene fecha, se
  convierte en recordatorio.
- **Agenda** de avisos programados con su estado (Programado · Enviado · Fallido ·
  Cancelado) y un botón de mensaje de prueba.
- Un aviso ámbar explica que está en **modo simulación** mientras no haya credenciales
  de Meta.

### 3.12 Canales de todos los proyectos · `/chats`

Vista transversal: todos los canales agrupados por proyecto, para entrar directo a
cualquier conversación sin pasar por el proyecto.

### 3.13 Mi perfil · `/perfil`

Portada con degradado, foto, nombre y datos académicos. Tres cifras (proyectos
activos, tareas completadas, racha de días), la tarjeta «Sobre mí» con los datos del
estudiante, el «Enfoque de la semana» y los proyectos en los que participa.

### 3.14 Editar perfil · `/perfil/editar`

El formulario guarda en el servidor los datos académicos y la foto de la cuenta autenticada.

### 3.15 Guía de estilo · `/paleta`

Pantalla de apoyo al desarrollo: colores, sombras, radios y tipografías. Los valores
no están escritos en la página, se leen de la hoja de estilos ya compilada, así que no
puede quedar desfasada. No requiere sesión.

### Modo claro y oscuro

Todas las pantallas tienen las dos versiones, con el interruptor en la barra superior.
Sin elegir nada se sigue la preferencia del sistema.

---

## 4. Funcionalidades

### 4.1 Acceso y perfil

Spring Security protege la API. Angular adjunta un JWT de cinco minutos a las llamadas privadas. El navegador conserva una cookie de renovación HttpOnly y SameSite estricta. Cerrar sesión revoca ambos accesos en el servidor. La autorización comprueba el propietario o el integrante vinculado por ID, y solo el titular de la cuenta puede cambiar el perfil.

Para vincular a un colaborador, guarda su ficha en **Modificar integrantes** y copia su enlace de invitación. El enlace vence en 48 horas y se puede usar una vez. Si la ficha tiene un correo, la cuenta que acepta debe usar ese correo.

### 4.2 Proyectos y tareas

| Funcionalidad | Estado |
|---|---|
| Panel de proyectos en tarjetas con fecha, integrantes y avance | Completo |
| Búsqueda y filtros por estado | Completo |
| Creación de proyecto con contexto, entrega, integrantes y primeras tareas | Completo |
| Espacio de trabajo con calendario, avance y tablero de tareas | Completo |
| Tareas con responsable, color por integrante, etapa y archivo adjunto | Completo |
| Bitácora de avance al marcar una tarea terminada | Completo |
| Organización por etapas | Completo |

### 4.3 Canales del proyecto

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

### 4.4 Diagrama de fases y reparto del trabajo

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

### 4.5 Documentos y entregables

| Funcionalidad | Estado |
|---|---|
| Registro de enlaces: Word, Canva, Google Docs, GitHub, YouTube… | Completo |
| **Tipo deducido del enlace** al pegarlo | Completo |
| Estado por documento: Borrador · En revisión · Final | Completo |
| Responsable de cada entregable | Completo |
| Vínculo opcional con la tarea de la que sale | Completo |

Es el índice de dónde vive cada parte del trabajo, distinto de los archivos subidos a un canal.

### 4.6 Horarios de clase

| Funcionalidad | Estado |
|---|---|
| Registro de materias con día, horas, profesor y créditos | Completo |
| Vista previa semanal | Completo |
| Generación de alternativas de horario **con IA** | Simulado (algoritmo propio) |
| Comparación y selección de alternativas | Completo |
| Detección de choques de horas | Completo |

### 4.7 Recordatorios por WhatsApp

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

### 4.8 Organizador de proyectos

Los endpoints del organizador proponen tareas y fechas con reglas locales. Con la integración OpenAI activada, el modelo redacta el resumen del plan. En la pantalla de creación, **Usar plantilla** solo completa campos editables. El resumen de Canales usa un prompt de sistema y hasta 60 mensajes recientes. Consulta la configuración de Gemini para activarlo.

### 4.9 Panel principal

Calendario general con las tareas de todos los proyectos (un color por proyecto), ventana flotante
al pasar el ratón, clic para ir al proyecto, formulario para marcar tarea terminada y resumen de
ritmo y próximas entregas.

## 5. Arquitectura

| Carpeta | Responsabilidad |
|---|---|
| `frontend/` | Componentes y plantillas Angular, Router, guards, interceptor HTTP y estilos CSS. |
| `backend/` | API Spring Boot, Spring Security, reglas de negocio, JPA y base H2. |

Angular sirve las pantallas y reenvía las llamadas REST de `/api` a Spring Boot mediante el proxy de desarrollo. El backend publica la API REST. El tour carga las mismas plantillas en un marco con la red bloqueada y usa un almacén en RAM.

## 6. Puesta en marcha

Usa Java 17 o superior y Node.js 20.19+, 22.12+ o 24.

```bash
make install
make run
```

Abre el frontend en <http://localhost:4200>. La API REST está en <http://localhost:6767/api>. `make run` inicia ambos procesos y `make run-h2` es un alias. H2 arranca en memoria con datos de demostración. Al detener el backend se descartan los cambios de esa ejecución y el cargador vuelve a sembrar los datos al siguiente arranque. El perfil `dev` usa una base separada en memoria para las pruebas existentes.

Para entrar a la demostración desde Angular, usa `valentina.rojas@universidad.edu.co` o `mateo@universidad.edu.co`. La contraseña de ambas cuentas es `StudyFlowDemo2026!`. Los dos comparten Cognitiva, un proyecto con cuatro tareas encadenadas y tres canales con conversaciones. Comparten Arquitectura de software y cada uno tiene otras dos materias. Valentina tiene un pendiente de esa clase. Usa `STUDYFLOW_DEMO_PASSWORD` para cambiar la contraseña del próximo arranque o `STUDYFLOW_DEMO_ENABLED=false` para iniciar con la base vacía.

También puedes ejecutar `make backend` y `make frontend` en dos terminales. `make build` genera los archivos estáticos en `frontend/dist/studyflow/browser` y un JAR separado para la API.

### Panel local de administración

Con el backend iniciado mediante `make backend` o `make run`, usa `admin` / `admin` en la pantalla normal de ingreso o abre <http://localhost:4200/admin>. El panel muestra el motor, el esquema, las tablas y sus filas paginadas. El visor es de solo lectura y oculta las columnas de credenciales. Las credenciales de administrador y el panel están reservados a la ejecución local y el JAR por sí solo sirve la API de estudiantes.

**Reiniciar backend** pide confirmación, reinicia el proceso de Java y vuelve a cargar la demostración en una H2 nueva cuando está en memoria. Si H2 usa un archivo, los datos se conservan. Después del reinicio se requiere iniciar sesión otra vez.

En un despliegue HTTPS, sirve los archivos de Angular desde un servidor web con reenvío de `/api/` a Spring, y usa `index.html` como entrada para las rutas de Angular. Ejecuta el JAR desde `backend/` con `STUDYFLOW_SECURE_COOKIE=true`. Puedes definir `STUDYFLOW_JWT_KEY` como una clave aleatoria de 32 bytes codificada en Base64. Cuando falta, se genera una clave en memoria al arrancar. El directorio de archivos adjuntos se puede configurar con `STUDYFLOW_ARCHIVOS_RUTA`.

#### Railway

Conecta dos servicios al mismo repositorio y rama. Railway detecta los Dockerfiles desde los directorios raíz de cada servicio.

| Servicio | Directorio raíz | Variables | Red |
| --- | --- | --- | --- |
| `backend` | `/backend` | `PORT=6767` | Privada |
| `frontend` | `/frontend` | `PORT=8080`, `BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:6767` | Dominio público al puerto 8080 |

El contenedor de Angular sirve la SPA y reenvía `/api` al backend privado. Spring escucha en IPv6 para la red privada de Railway y arranca con H2 en memoria. Para cargar los datos de demostración, configura `STUDYFLOW_DEMO_ENABLED=true` y una contraseña propia en `STUDYFLOW_DEMO_PASSWORD`. El panel administrativo sigue deshabilitado. Configura `GEMINI_KEY` y `STUDYFLOW_JWT_KEY` como variables del backend. H2 en memoria se reinicia con cada arranque, y los adjuntos necesitan un volumen si deben conservarse entre despliegues.

WhatsApp y OpenAI mantienen sus propiedades en `backend/src/main/resources/application.properties`. La conexión externa se habilita ahí con la propiedad `enabled` y sus credenciales correspondientes.

### Gemini para Canales

En el `.env` de la raíz, añade la clave a `gemini.key=` y reinicia el backend. La clave vive en el servidor. Al pulsar **Resumir**, se envía a Gemini el texto reciente del canal y un directorio con los nombres de los autores en el prompt de sistema. Gemini resume los acuerdos vigentes y atribuye los compromisos confirmados. El canal `#general` de Cognitiva trae una discusión de ejemplo con propuestas reemplazadas y un acuerdo final. Si falta la clave o el proveedor no responde, se muestra el resumen local.

Los canales son compartidos por cuentas vinculadas al mismo proyecto. La conversación abierta se actualiza automáticamente sin recargar la página.

### Datos de una instalación anterior

H2 es la única base de datos de ejecución. Para copiar una instalación MySQL anterior, usa el migrador local `com.studyflow.platform.migration.MigrarMysql` desde un JAR compilado. Prepara un archivo H2 vacío iniciando y deteniendo la aplicación con `STUDYFLOW_H2_URL=jdbc:h2:file:./data/studyflow` desde `backend/`. Esa variable selecciona la base persistente para recuperación o migración. Define `STUDYFLOW_MYSQL_URL`, `STUDYFLOW_MYSQL_USER` y `STUDYFLOW_MYSQL_PASSWORD` en el entorno. Mantén apagada la aplicación durante la copia.

```bash
cd backend
java -Dloader.main=com.studyflow.platform.migration.MigrarMysql \
  -Dloader.path=/ruta/mysql-connector-j.jar \
  -cp target/students-management-platform.jar \
  org.springframework.boot.loader.launch.PropertiesLauncher
```

El migrador copia y verifica las filas, mantiene los IDs y transforma las contraseñas legadas a BCrypt. Las cuentas antiguas sin contraseña y las que usaban la clave pública de demostración conservan sus datos. Para recuperar su acceso, establece una contraseña localmente con el servidor detenido. El comando la solicita sin mostrarla en la terminal y revoca las sesiones anteriores.

```bash
cd backend
java -Dloader.main=com.studyflow.platform.migration.RestablecerContrasena \
  -cp target/students-management-platform.jar \
  org.springframework.boot.loader.launch.PropertiesLauncher correo@ejemplo.edu
```

## 7. Rutas

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
| `POST` | `/api/sesion/entrar` | Alias del ingreso con correo y contraseña |
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

## 8. Base de datos

H2 guarda las entidades académicas, las relaciones y los IDs durante la ejecución. La tabla `sesion_autenticada` guarda el vencimiento y el hash de la credencial de renovación. Los resultados y adjuntos binarios se almacenan por separado en `archivos/`.
