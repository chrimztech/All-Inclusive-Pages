FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    apt-get update && apt-get install -y maven && \
    mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd -r -u 1001 -m eoz
WORKDIR /app
COPY --from=build /app/target/eoz-backend-0.1.0.jar app.jar
USER eoz
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=5s --retries=10 \
    CMD wget -qO- http://localhost:8081/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
