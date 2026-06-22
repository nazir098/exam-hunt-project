## Overview

The Neetlu Exam Preparation Platform uses **SLF4J** (Simple Logging Facade for Java) as its logging abstraction, backed by Spring Boot's default Logback implementation. The logging approach is minimal and conventional, relying on Spring Boot's auto-configuration rather than custom logback configuration files.

## Framework and Dependencies

- **Logging API**: SLF4J (`org.slf4j.Logger`, `org.slf4j.LoggerFactory`)
- **Implementation**: Logback (transitively included via `spring-boot-starter-web`)
- **No explicit logging dependencies** declared in `pom.xml` — inherited from Spring Boot parent POM (version 3.3.5)
- **No custom `logback-spring.xml` or `logback.xml`** configuration file exists

## Key Files

### Configuration
- `backend/src/main/resources/application.yml` — Contains a single targeted logging level override:
  ```yaml
  logging:
    level:
      com.neetlu.examhunt.service.FreeLlmClient: INFO
  ```
  This explicitly sets the LLM client to INFO level, suggesting other classes may use DEBUG or TRACE during development but this noisy component is constrained.

### Logger Usage Pattern
All Java classes that emit logs follow a consistent pattern:

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger log = LoggerFactory.getLogger(ClassName.class);
```

Files using this pattern:
- `config/AdminAccountBootstrap.java` — Bootstrap warnings and success messages
- `config/DeploymentInfo.java` — Deployment metadata at startup
- `config/LeaderboardDemoInitializer.java` — Demo seed initialization
- `service/FreeLlmClient.java` — Extensive LLM request/response tracing
- `service/ManifestImportService.java` — Import pipeline progress tracking

## Architecture and Conventions

### Log Level Strategy

The application uses three primary log levels:

1. **INFO** — Operational milestones and structured event markers:
   - Import lifecycle events: `IMPORT_START`, `IMPORT_DONE`, `IMPORT_MANIFEST`, `IMPORT_VARIANTS`, `IMPORT_METADATA_INDEX`
   - LLM request/response details including model, tokens, temperature
   - Deployment info at application startup
   - Admin account bootstrap completion

2. **WARN** — Recoverable issues and degraded states:
   - Missing environment configuration (`ADMIN_EMAIL not set`, `ADMIN_PASSWORD not set`)
   - LLM JSON parse failures with capability context
   - HTTP error responses from external services
   - Empty LLM responses
   - Parse errors in LLM response handling

3. **ERROR** — Not observed in current codebase; exceptions are typically re-thrown as `ResponseStatusException` rather than logged at ERROR level

### Structured Logging Patterns

Log messages use **structured prefixes** for operational observability:

- `IMPORT_*` — Content import pipeline events with folder, packId, question counts
- `LLM →` / `LLM ←` — Outbound/inbound LLM API interactions with full request/response context
- `DEPLOYMENT_INFO` — Startup deployment metadata (image tag, commit, build time)

Multi-line log messages use Java text blocks for readability:
```java
log.info("""
    LLM → request url={} model={} temperature={} maxTokens={} jsonMode={} reasoning={}
    --- system ---
    {}
    --- user ---
    {}
    """, ...);
```

### No Centralized Logging Infrastructure

- No dedicated logging configuration class or bean
- No custom appenders, filters, or formatters
- No file-based log output configured (logs go to stdout/stderr via Spring Boot defaults)
- No correlation IDs, MDC (Mapped Diagnostic Context), or request tracing
- No async logging configuration

## Rules for Developers

1. **Use SLF4J exclusively** — Never use `System.out.println`, `java.util.logging`, or Apache Commons Logging directly
2. **Logger declaration pattern** — Always declare as `private static final Logger log = LoggerFactory.getLogger(ClassName.class)`
3. **Prefer parameterized messages** — Use `{}` placeholders instead of string concatenation for performance
4. **Log levels**:
   - `INFO` for significant business events and external service interactions
   - `WARN` for recoverable issues, missing configuration, or degraded functionality
   - Avoid `DEBUG`/`TRACE` in production paths unless gated behind conditional checks
   - Do not use `ERROR` for expected failures; throw appropriate exceptions instead
5. **Structured prefixes** — Prefix operational log messages with domain-specific tags (e.g., `IMPORT_`, `LLM →`) for easy grep/filtering in log aggregators
6. **Sensitive data** — Do not log API keys, passwords, JWT secrets, or PII. The `application.yml` already masks sensitive env vars with defaults
7. **LLM tracing** — The `FreeLlmClient` logs full prompts and responses at INFO level; be aware this may expose user-generated content in logs
8. **Adding new log levels** — If you need to adjust logging for a specific package, add entries under `logging.level` in `application.yml` rather than creating a custom logback config

## Gaps and Observations

- No centralized error logging strategy — exceptions propagate to `ApiExceptionHandler` without prior ERROR-level logging
- No request/response logging filter for HTTP traffic
- No log rotation or file output configuration (relies on container/platform log capture)
- The single `logging.level` override for `FreeLlmClient` suggests ad-hoc tuning rather than a systematic log level policy
