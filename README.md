# StudyFlow · Students Management Platform

El semestre de un estudiante, en una sola vista: horario de clases, tareas de todos los proyectos
y entregas en el mismo calendario, y cada trabajo en grupo con su espacio propio —conversación por
tema, reparto de tareas por dependencias y registro de entregables—.

Aplicación **Spring Boot 3.3 + Thymeleaf + Tailwind CSS + MySQL 8**, organizada en capas **IMVC**.

**Índice** · [Qué es](#1-qué-es-studyflow) · [Flujo de pantallas](#2-flujo-de-pantallas) ·
[Las pantallas](#3-las-pantallas-una-a-una) · [Funcionalidades](#4-funcionalidades) ·
[Arquitectura](#5-arquitectura-por-capas-imvc) · [Puesta en marcha](#6-puesta-en-marcha)

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

Prototipo funcional con **136 clases Java, 15 pantallas, 70 endpoints REST, 22 tablas
y 38 pruebas automáticas**. Los dos servicios externos (WhatsApp de Meta y OpenAI)
están escritos e integrados, pero **corren en simulación**: la lógica se ejecuta
entera y el envío se escribe en el log. El apartado 4.10 detalla qué no está hecho.

---

## 2. Flujo de pantallas

### El recorrido

```
                        ┌─────────────┐
                        │   /login    │  entrar con el nombre (un campo)
                        │  /registro  │  o crear cuenta (tres datos)
                        └──────┬──────┘
                               │
                    ┌──────────▼──────────┐
                    │         /           │   PANEL · el centro de todo
                    │  calendario general │   clases + tareas + entregas
                    └──┬───┬───┬───┬──────┘
          ┌────────────┘   │   │   └────────────┐
          │                │   │                │
   ┌──────▼──────┐  ┌──────▼───▼─────┐  ┌───────▼────────┐
   │  /horarios  │  │   /proyectos   │  │ /recordatorios │
   │  materias   │  │  mis trabajos  │  │ avisos + apuntes│
   └─────────────┘  └────────┬───────┘  └────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │ /proyectos/{codigo}│  ESPACIO DE TRABAJO
                   │ calendario + tareas│
                   └──┬───────┬───────┬─┘
                      │       │       │
        ┌─────────────▼─┐ ┌───▼────┐ ┌▼──────────────┐
        │   /canales    │ │ /fases │ │ /entregables  │
        │ conversación  │ │reparto │ │ documentos    │
        └───────────────┘ └────────┘ └───────────────┘

   Transversales, desde la barra superior:
   /perfil → /perfil/editar        /chats (canales de todos los proyectos)
   /paleta (guía de estilo, sin sesión)
```

### Las tres reglas de navegación

1. **Todo empieza en el panel.** Al entrar se cae siempre en `/`, que es la vista
   general del semestre. La barra superior lleva a las cuatro zonas: Inicio,
   Proyectos, Horarios, Canales y Recordatorios.
2. **Un proyecto es un espacio con tres pestañas.** Desde el espacio de trabajo se
   entra a sus canales, a su diagrama de fases y a sus entregables. Las tres tienen
   un enlace de vuelta al proyecto.
3. **Sin sesión no se ve nada.** Cualquier ruta sin sesión redirige a `/login`. La
   única excepción es `/paleta`, la guía de estilo, que no muestra datos de nadie.

### Recorrido recomendado para una demostración

| # | Pantalla | Qué enseñar |
|---|---|---|
| 1 | `/login` | Entrar con **un solo campo**, o el botón de datos de ejemplo |
| 2 | `/` | El calendario con las tareas de los tres proyectos, cada uno con su color |
| 3 | `/horarios` | Añadir una materia y verla aparecer en la semana |
| 4 | `/proyectos` → `/proyectos/cognitiva` | Abrir un trabajo en grupo |
| 5 | `/proyectos/cognitiva/fases` | **El momento fuerte**: tomar una tarea disponible y ver que otra sigue bloqueada |
| 6 | `/proyectos/cognitiva/canales` | Escribir en `#general`, reaccionar con un emoji, pedir el resumen |
| 7 | `/proyectos/cognitiva/entregables` | Registrar un enlace de Canva y ver que se reconoce el tipo |
| 8 | `/recordatorios` | Apuntar algo «anunciado en clase» y ver que entra en la cola de avisos |
| 9 | Barra superior | El interruptor de modo oscuro |

Los datos de ejemplo ya traen tres proyectos, cuatro materias, una conversación con
mensajes y dependencias entre tareas, así que **la demostración no necesita
preparación**: basta con el botón «Explorar con datos de ejemplo» del acceso.

---

## 3. Las pantallas, una a una

### 3.1 Acceso · `/login`

Dos mitades: a la izquierda un panel con degradado de marca y tres ventajas del
producto; a la derecha el formulario.

- **Entrada de un solo campo**: el nombre basta. El correo es opcional y solo sirve
  para recuperar la cuenta después.
- Botón **«Explorar con datos de ejemplo»**, que entra con el usuario de demostración
  y sus tres proyectos ya cargados.
- Google, GitHub y Facebook aparecen, pero **avisan de que no están conectados** en
  lugar de fingir una entrada.
- Plegado abajo, el acceso con correo y contraseña para quien ya la tiene.

### 3.2 Registro · `/registro`

«Tres datos y listo»: nombre, correo y contraseña. Universidad, programa, semestre y
edad quedan plegados como opcionales, para que el formulario no ahuyente. Se pueden
completar después desde el perfil.

### 3.3 Panel · `/`

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
- **«Organizar con IA»**: se indica un número de tareas (1–20) y se reparten con
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

Foto, datos personales y datos académicos, en dos grupos de campos.

> **Aviso para la demostración:** los cambios del perfil **se guardan solo en el
> navegador**, no en la base de datos. El endpoint existe pero la pantalla todavía no
> lo llama (ver 4.10).

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

### 4.8 Organizador de proyectos con IA

| Funcionalidad | Estado |
|---|---|
| Reparto en el número de tareas que se indique (1–20) | Completo |
| Plazo por tarea: inicio, fecha límite y días estimados | Completo |
| Rotación de responsables entre los integrantes | Completo |
| Reorganización de un proyecto conservando lo completado | Completo (vía API) |
| Redacción de la explicación con ChatGPT | **Preparado, sin conectar** |

### 4.9 Panel principal

Calendario general con las tareas de todos los proyectos (un color por proyecto), ventana flotante
al pasar el ratón, clic para ir al proyecto, formulario para marcar tarea terminada y resumen de
ritmo y próximas entregas.

### 4.10 Qué **no** está implementado

- **No hay autenticación real.** La sesión identifica a la persona pero no la verifica: no se usa
  Spring Security y la contraseña se guarda codificada en Base64 como marcador provisional.
- **Los botones de Google, GitHub y Facebook no hacen OAuth.**
- **La API de OpenAI no está conectada.** `ClienteIaOpenAi` está escrito contra el contrato público
  pero nunca se ha ejecutado contra el servicio real.
- **El envío por WhatsApp no se ha probado contra Meta**, por no disponer de credenciales.
- **Los mensajes no llegan solos**: no hay WebSocket, hay que recargar para ver lo nuevo.
- **El perfil no se guarda en la base de datos.** La pantalla lee y escribe en el navegador; el
  endpoint `PUT /api/usuarios/{id}` existe pero ninguna pantalla lo llama, así que los cambios se
  pierden al cerrar sesión.
- **Los horarios viven solo en el navegador**: las materias se guardan en `localStorage` y no
  llegan a la base. El resto de pantallas —panel, proyectos, canales, fases, entregables,
  recordatorios y acceso— ya usan la API REST.

---

## 5. Arquitectura por capas (IMVC)

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **I** · Interfaz | `src/main/resources/static/` | Hoja Tailwind compilada, JavaScript de interacción e imágenes |
| **V** · Vista | `src/main/resources/templates/` | Plantillas Thymeleaf; `fragments/layout.html` centraliza head, navegación y scripts |
| **C** · Controlador | `controller/view/`, `controller/api/` | `PaginaController` resuelve la navegación; los `*ApiController` exponen la API REST |
| **M** · Modelo | `model/entity/`, `model/dto/`, `model/enums/` | Entidades JPA, objetos de transferencia y enumeraciones |

Capas de apoyo: `service/` (+`impl/`), `repository/`, `mapper/`, `config/`, `exception/`, `util/`.

```
src/main/java/com/studyflow/platform/        · 136 archivos
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

## 6. Puesta en marcha

### Requisitos
- JDK 17+
- MySQL 8 — opcional, ver el atajo del apartado 6.1
- Node 18+ — solo si vas a recompilar los estilos

### 6.1 Atajo: arrancar sin instalar MySQL

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Base H2 en memoria, sin instalar nada. Abre <http://localhost:6767>. Los datos de ejemplo se
crean en cada arranque y se pierden al parar.

### 6.2 Instalar MySQL (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install mysql-server
systemctl status mysql          # debe decir "active (running)"
```

> `mysql_secure_installation` es opcional y **no afecta a este proyecto**: la aplicación se conecta
> como `studyflow`, no como `root`.

### 6.3 Crear la base de datos — paso manual, una sola vez

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

### 6.4 Arrancar

```bash
./mvnw spring-boot:run
```

La aplicación queda en <http://localhost:6767>.

### 6.5 Detener la ejecución

- **Lanzada desde una terminal:** `Ctrl+C`.
- **Lanzada en segundo plano** (`&` o `nohup`), `Ctrl+C` no sirve:

```bash
pkill -f "com.studyflow.platform.StudyFlowApplication"
```

`spring-boot:run` arranca **dos** procesos (Maven y la JVM). El `pkill` de arriba apunta a la JVM,
que es la que ocupa el puerto. Para ver quién lo tiene: `ss -ltnp | grep 6767`.

### 6.6 Configuración

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

### 6.7 Empaquetar

```bash
./mvnw clean package
java -jar target/students-management-platform.jar
```

### 6.8 Estilos (Tailwind)

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

## 8. Base de datos

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

## 9. Pruebas

```bash
./mvnw test
```

27 pruebas sobre el perfil `dev`: arranque, respuesta de las páginas, datos de demostración,
antelación de recordatorios, modo simulación de WhatsApp, reparto de plazos del organizador,
resúmenes de canal, reacciones con emoji, ciclos de dependencias, reparto de tareas, los cuatro
estados, tipos de entregable deducidos del enlace y acceso rápido.

---

## 10. Problemas frecuentes

**El navegador dice «no se puede acceder a este sitio».**
La aplicación no está arrancada o murió al arrancar. Si ves `Communications link failure` o
`Unknown database 'studyflow'`, falta MySQL o el paso 3.3. Comprobación rápida:
`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` no necesita base de datos — si con `dev`
sí abre, el problema está en MySQL y no en la aplicación.

**`Port 6767 was already in use`.**
Quedó una ejecución viva. `ss -ltnp | grep 6767` y el `pkill` del apartado 6.5.

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
