## Overview

The Neetlu Exam Preparation Platform uses a **monorepo-wide `.env` file** at the project root as the primary source of runtime secrets and environment variables, combined with **Spring Boot's `application.yml`** for default values and property binding. The frontend relies on **Vite's built-in env handling** (`import.meta.env`) and a dev-server proxy to avoid exposing backend URLs.

---

## Architecture

### Backend (Spring Boot)

1. **Root `.env` loader** — A custom `RootEnvLoader` class reads `.env` from the monorepo root (either `../.env` or `./.env`) before Spring Boot starts. It maps flat env vars into Spring property keys (e.g., `MONGODB_URI` → `spring.data.mongodb.uri`, `OPENAI_API_KEY` → `app.llm-api-key`). OS-level environment variables take precedence over `.env` values.

2. **`application.yml` defaults** — All configurable properties are declared in `backend/src/main/resources/application.yml` with `${VAR:default}` syntax. This provides safe fallbacks for local development (e.g., `mongodb://127.0.0.1:27017/exam-hunt` when no `MONGODB_URI` is set).

3. **Typed configuration records** — Three `@ConfigurationProperties` classes bind YAML/env properties into strongly-typed Java records:
   - `AppProperties` (prefix `app`) — core app settings (CORS, JWT, LLM, admin credentials)
   - `PublicApiCacheProperties` (prefix `app.public-api-cache`) — HTTP cache TTLs with validation guards
   - `AnalyticsProperties` (prefix `app.analytics`) — feature toggle for analytics events

4. **Entry point wiring** — `ExamHuntApplication.main()` calls `RootEnvLoader.loadDefaults()` and passes the result to `SpringApplication.setDefaultProperties()`, ensuring `.env` values are available as Spring defaults before any profile-specific overrides.

### Frontend (React + Vite)

1. **Vite proxy for dev** — `vite.config.ts` proxies `/api` requests to `http://127.0.0.1:8081`, so the frontend never needs a hardcoded API URL during local development.

2. **Optional `VITE_API_BASE_URL`** — The `resolveApiBase()` function in `frontend/src/api.ts` checks `import.meta.env.VITE_API_BASE_URL`. In dev mode, it returns an empty string (relying on the proxy) unless `VITE_API_BASE_URL_FORCE=true` is set.

3. **Runtime platform settings** — The `PlatformSettingsContext` fetches public-facing configuration from `GET /api/settings/public` at app startup. These settings (marketing copy, AI tutor welcome text, feature toggles like `bookmarksEnabled`) are stored in MongoDB via the `PlatformSettings` entity and managed through the admin UI. This decouples content/configuration from code deploys.

---

## Key Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for root-level env vars (MongoDB, JWT, OpenAI, admin creds) |
| `deploy/ec2/.env.example` | Production-ready env template with explicit CORS origins and disabled demo seed |
| `backend/src/main/resources/application.yml` | Spring Boot property defaults with `${VAR:default}` interpolation |
| `backend/src/main/java/com/neetlu/examhunt/config/RootEnvLoader.java` | Custom `.env` parser that maps env vars to Spring properties |
| `backend/src/main/java/com/neetlu/examhunt/config/AppProperties.java` | Typed record for `app.*` properties |
| `backend/src/main/java/com/neetlu/examhunt/config/PublicApiCacheProperties.java` | Typed record for cache TTLs with input validation |
| `backend/src/main/java/com/neetlu/examhunt/config/AnalyticsProperties.java` | Typed record for analytics feature toggle |
| `backend/src/main/java/com/neetlu/examhunt/config/AppConfig.java` | `@EnableConfigurationProperties` registration |
| `backend/src/main/java/com/neetlu/examhunt/ExamHuntApplication.java` | Entry point that wires `RootEnvLoader` into Spring context |
| `frontend/vite.config.ts` | Dev server proxy config (`/api` → backend) |
| `frontend/src/api.ts` | API client with `resolveApiBase()` for optional `VITE_API_BASE_URL` override |
| `frontend/src/settings/PlatformSettingsContext.tsx` | React context that fetches runtime platform settings from backend |

---

## Conventions & Rules

1. **Never commit `.env`** — Only `.env.example` files are tracked. The root `.env` is gitignored.

2. **OS env > `.env` > `application.yml` defaults** — Precedence order: system environment variables override `.env` values, which override YAML defaults.

3. **Use typed `@ConfigurationProperties` records** — Do not inject `@Value` annotations scattered across services. Add new properties to the appropriate record class and register it in `AppConfig`.

4. **Frontend avoids hardcoded API URLs** — Use the Vite proxy in dev. Only set `VITE_API_BASE_URL` (with `VITE_API_BASE_URL_FORCE=true`) when calling the API directly from the browser (e.g., production builds).

5. **Runtime settings via database** — User-facing configuration (marketing text, feature flags, AI tutor messages) lives in the `platform_settings` MongoDB collection, not in env vars. Admins update these via `PUT /api/admin/settings`.

6. **Sensitive values stay in env** — JWT secrets, MongoDB URIs, OpenAI API keys, and admin passwords are exclusively env-driven. They never appear in `application.yml` defaults except for non-sensitive dev placeholders (e.g., `exam-hunt-dev-jwt-secret-change-in-prod-32b`).

7. **Production env template in `deploy/ec2/`** — The EC2 deployment directory contains its own `.env.example` with production-appropriate defaults (e.g., `LEADERBOARD_DEMO_SEED=false`, explicit CORS origins including production domains).