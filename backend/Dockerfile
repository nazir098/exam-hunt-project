# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

ARG BUILD_COMMIT=local
ARG BUILD_REF=local
ARG BUILD_TIME=unknown
ARG BUILD_RUN_NUMBER=local
ARG IMAGE_TAG=local

ENV BUILD_COMMIT=${BUILD_COMMIT}
ENV BUILD_REF=${BUILD_REF}
ENV BUILD_TIME=${BUILD_TIME}
ENV BUILD_RUN_NUMBER=${BUILD_RUN_NUMBER}
ENV IMAGE_TAG=${IMAGE_TAG}

LABEL org.opencontainers.image.source="https://github.com/nazir098/exam-hunt-project"
LABEL org.opencontainers.image.revision="${BUILD_COMMIT}"
LABEL org.opencontainers.image.created="${BUILD_TIME}"
LABEL org.opencontainers.image.version="${IMAGE_TAG}"

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /workspace/target/*.jar /app/app.jar
COPY scripts ./scripts

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8081/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
