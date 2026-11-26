FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY pom.xml mvnw ./
COPY .mvn .mvn
COPY src src
RUN sh ./mvnw --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/students-management-platform.jar /app/studyflow.jar
RUN mkdir /app/archivos && chown 10001:10001 /app/archivos
USER 10001:10001
ENV SERVER_ADDRESS=:: \
    STUDYFLOW_ADMIN_ENABLED=false \
    STUDYFLOW_DEMO_ENABLED=false \
    STUDYFLOW_SECURE_COOKIE=true \
    STUDYFLOW_ARCHIVOS_RUTA=/app/archivos
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=55", "-jar", "/app/studyflow.jar"]
