# Base de datos MySQL

`schema.sql` crea la base `studyflow`, el usuario de la aplicación y las 22 tablas.

```bash
sudo mysql < schema.sql
```

**Los datos de ejemplo no están aquí.** Los siembra la propia aplicación al arrancar
(`config/CargadorDatosIniciales`) cuando encuentra la tabla `usuario` vacía.

Antes existía un `data.sql` con los mismos datos, y mantener dos copias salió mal:
al añadir canales, entregables y dependencias, el SQL se quedó atrás e insertaba
estados de tarea que ya no existían. Peor aún, como sí creaba usuarios, el cargador
de Java se saltaba la siembra y la base quedaba a medias. Ahora hay una sola fuente,
y está cubierta por las pruebas automáticas.

## Reiniciar los datos

`schema.sql` empieza con `DROP DATABASE`, así que vuelve a dejarlo todo limpio:

```bash
sudo mysql < schema.sql          # borra y recrea la base vacía
./mvnw spring-boot:run           # al arrancar, siembra los datos de ejemplo
```
