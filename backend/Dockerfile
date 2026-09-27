FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
# curl for the health check; pg_dump/pg_restore (matching the PostgreSQL 18 server in docker-compose) for backups and restores.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -r -u 1001 -m eoz \
    && mkdir -p /app/data/uploads /app/data/backups /app/data/exports \
    && chown -R eoz:eoz /app
WORKDIR /app
COPY --from=build --chown=eoz:eoz /app/target/eoz-backend-0.1.0.jar app.jar
USER eoz
VOLUME /app/data
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=10 \
    CMD curl -fsS http://localhost:8081/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
