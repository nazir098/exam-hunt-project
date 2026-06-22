## Build System Overview

The Neetlu Exam Preparation Platform uses a **monorepo architecture** with two independently built components:
- **Backend**: Spring Boot 3.3.5 application built with Maven (Java 17)
- **Frontend**: React 18 SPA built with Vite + TypeScript

There is no root-level build orchestrator (no Makefile, no root `package.json` scripts). Each component is built independently using its native toolchain.

---

## Backend Build (Maven)

### Toolchain
- **Build tool**: Apache Maven via `spring-boot-starter-parent` 3.3.5
- **Java version**: 17 (Eclipse Temurin in Docker)
- **Artifact**: Executable JAR (`exam-hunt-api-0.1.0-SNAPSHOT.jar`)
- **Versioning**: Snapshot-based (`0.1.0-SNAPSHOT`) — no release tagging strategy visible

### Key Commands
```bash
# Development run (loads .env manually)
mvn spring-boot:run

# Package (skips tests by default in Docker)
mvn -B -DskipTests package
```

### Dependencies
Core starters: `spring-boot-starter-web`, `spring-boot-starter-data-mongodb`, `spring-boot-starter-security`, `spring-boot-starter-validation`, `spring-boot-starter-actuator`. JWT handling via `jjwt` 0.12.6.

### Testing
Unit tests exist under `src/test/java` (5 test classes covering CORS, text normalization, variant parsing, pack stats, analytics). Tests are skipped during Docker builds (`-DskipTests`).

---

## Frontend Build (Vite)

### Toolchain
- **Build tool**: Vite 5.4.11 with `@vitejs/plugin-react`
- **Language**: TypeScript 5.6.3 (strict type-check via `tsc --noEmit` before build)
- **Styling**: Tailwind CSS 3.4.17 + PostCSS
- **Output**: Static assets in `dist/` directory

### Key Commands
```bash
npm install        # Install dependencies
npm run dev        # Dev server on port 5173 with /api proxy to backend
npm run build      # Type-check + production build
npm run preview    # Preview production build locally
```

### Dev Server Proxy
The Vite config proxies `/api` requests to `http://127.0.0.1:8081`, enabling seamless local full-stack development without CORS issues.

---

## Containerization (Docker)

### Backend Dockerfile
Uses a **multi-stage build** pattern:
1. **Build stage**: `maven:3.9.9-eclipse-temurin-17` with Maven cache mounting for dependency resolution and compilation
2. **Runtime stage**: `eclipse-temurin:17-jre-jammy` (JRE-only, smaller image) with the compiled JAR

**Build metadata injection** via ARGs: `BUILD_COMMIT`, `BUILD_REF`, `BUILD_TIME`, `BUILD_RUN_NUMBER`, `IMAGE_TAG` — exposed as environment variables and OCI labels for traceability.

**Health check**: HTTP probe to `/actuator/health` every 30s with 60s start period.

**Port**: Exposes 8081.

### Deployment Composition
`deploy/ec2/docker-compose.yml` defines:
- **API service**: Pulls from GHCR (`ghcr.io/nazir098/exam-hunt-project/exam-hunt-api:latest`), maps port 8081, loads `.env`
- **Watchtower**: Auto-updates containers when new images are pushed (polls every 300s, cleanup enabled)

This is a **push-to-deploy** model: CI pushes a new image → Watchtower detects and restarts the container.

---

## CI/CD Pipeline (GitHub Actions)

### Workflow: `publish-backend-image.yml`

**Triggers**:
- Manual dispatch (`workflow_dispatch`)
- Push to `main` branch when `backend/**` or the workflow file itself changes

**Concurrency**: Single concurrent run per ref; in-progress builds are cancelled.

**Steps**:
1. Checkout repository
2. Set up Docker Buildx
3. Login to GHCR using `GITHUB_TOKEN`
4. Generate Docker metadata (tags: `latest` on default branch, `sha-{commit}` always)
5. Compute UTC build timestamp
6. Build and push with GitHub Actions cache (`type=gha`)

**Image naming**: `ghcr.io/{repo}/exam-hunt-api:{latest|sha-{commit}}`

**Notable gaps**:
- No frontend CI/build pipeline
- No integration test execution in CI
- No automated deployment step beyond image publish (relies on Watchtower polling)
- No staging/production environment separation in CI

---

## Local Development Flow

### Environment Configuration
- Root `.env` file (copied from `.env.example`) holds `MONGODB_URI`, `EXTRACTOR_ROOT`, optional `ADMIN_IMPORT_KEY`
- **Backend does not auto-load `.env`** — developers must manually source it: `set -a && source .env && set +a`
- Helper script `scripts/dev-api.sh` automates this sourcing before running `mvn spring-boot:run`

### Startup Sequence
1. Start MongoDB Atlas (external service)
2. Run backend: `cd backend && mvn spring-boot:run` (port 8081)
3. Import content: `curl -X POST http://127.0.0.1:8081/api/admin/import/all`
4. Run frontend: `cd frontend && npm run dev` (port 5173, proxies `/api` to backend)

---

## Developer Conventions & Rules

1. **Never commit `.env`** — credentials (MongoDB URI, admin keys) are excluded via `.gitignore`
2. **Backend env loading** — Spring Boot does not read `.env`; use `source .env` or the helper script
3. **Frontend API base URL** — set `VITE_API_BASE_URL` at build time for production deployments
4. **Import security** — production import endpoints should be protected with `ADMIN_IMPORT_KEY` header and network rules
5. **Version consistency** — both backend and frontend use `0.1.0` versioning; coordinate bumps across both
6. **Docker build optimization** — Maven dependency cache is mounted to avoid re-downloading on every build
7. **No root-level orchestration** — developers manage backend/frontend processes separately (no `concurrently`, no Makefile targets)
