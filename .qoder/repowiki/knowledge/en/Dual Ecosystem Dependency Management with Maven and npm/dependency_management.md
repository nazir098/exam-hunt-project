## Overview

The Neetlu Exam Preparation Platform uses two separate dependency management systems for its backend and frontend components:

- **Backend**: Apache Maven (Java/Spring Boot)
- **Frontend**: npm with lockfile v3 (React/TypeScript/Vite)

Both ecosystems follow standard conventions without custom registries, vendoring, or private package infrastructure.

---

## Backend: Maven Dependency Management

### Build System
- **Tool**: Apache Maven 3.9.9 (via Docker build image `maven:3.9.9-eclipse-temurin-17`)
- **Parent POM**: `spring-boot-starter-parent:3.3.5` — inherits managed dependency versions from Spring Boot BOM
- **Java Version**: 17 (Eclipse Temurin runtime)

### Key Dependencies
All dependencies are declared in `backend/pom.xml`:

**Spring Boot Starters** (version managed by parent):
- `spring-boot-starter-web` — REST API framework
- `spring-boot-starter-data-mongodb` — MongoDB data access
- `spring-boot-starter-validation` — Bean validation
- `spring-boot-starter-actuator` — Health checks and metrics
- `spring-boot-starter-security` — Security framework
- `spring-boot-starter-test` — Testing support (test scope)

**Explicitly Versioned**:
- `jjwt-api`, `jjwt-impl`, `jjwt-jackson` (v0.12.6) — JWT token handling

### Dependency Resolution Strategy
- **No local `.mvn` wrapper** detected in repository (only referenced in `.dockerignore`)
- **Maven Central** is the implicit default repository (no `<repositories>` section configured)
- **Docker build caching**: Uses `--mount=type=cache,target=/root/.m2` to cache Maven dependencies across builds, avoiding redundant downloads
- **Offline preparation**: `mvn dependency:go-offline` step ensures all transitive dependencies are resolved before compilation

### No Private Registries
- No `settings.xml` customization found
- No `GOPRIVATE`-equivalent configuration
- All dependencies resolve from public Maven Central

---

## Frontend: npm Dependency Management

### Package Manager
- **Tool**: npm (lockfile version 3)
- **Lockfile**: `frontend/package-lock.json` (4,529 lines, fully deterministic)
- **Registry**: Default npm registry (`https://registry.npmjs.org`)

### Key Dependencies
Declared in `frontend/package.json`:

**Production Dependencies**:
- `react` (^18.3.1), `react-dom` (^18.3.1) — UI framework
- `react-router-dom` (^6.28.0) — Client-side routing
- `react-markdown` (^10.1.0) — Markdown rendering
- `katex` (^0.17.0) — LaTeX math rendering
- `rehype-katex` (^7.0.1), `remark-gfm` (^4.0.1), `remark-math` (^6.0.0) — Markdown/LaTeX processing plugins

**Dev Dependencies**:
- `vite` (^5.4.11) — Build tool and dev server
- `@vitejs/plugin-react` (^4.3.3) — React plugin for Vite
- `typescript` (^5.6.3) — Type checking
- `tailwindcss` (^3.4.17), `postcss` (^8.5.15), `autoprefixer` (^10.5.0) — CSS tooling
- `@types/react`, `@types/react-dom` — TypeScript type definitions

### Version Pinning Strategy
- All dependencies use **caret ranges** (`^`) allowing minor/patch updates
- Lockfile provides exact version pinning for reproducible builds
- No `npm-shrinkwrap.json` or `yarn.lock` present

### No Custom Registry Configuration
- No `.npmrc` file found
- No private scoped packages (all packages are from public npm registry)
- No vendored `node_modules` committed to repository

---

## Deployment-Time Dependency Handling

### Backend Containerization
The `backend/Dockerfile` uses a multi-stage build:
1. **Build stage**: Maven resolves and caches dependencies, compiles source, produces executable JAR
2. **Runtime stage**: Minimal JRE image (`eclipse-temurin:17-jre-jammy`) with only the compiled artifact

This ensures production containers contain no build tools or unresolved dependencies.

### Production Image Distribution
- Images published to **GitHub Container Registry** (`ghcr.io/nazir098/exam-hunt-project/exam-hunt-api`)
- **Watchtower** auto-updates deployed containers by pulling latest tagged images
- No dependency resolution occurs at deployment time — all dependencies are baked into the container image

### Frontend Build
- Built via `vite build` (triggered by `npm run build`)
- Output placed in `frontend/dist/` for static hosting
- No containerization for frontend; served as static assets

---

## Developer Conventions and Rules

### Adding Backend Dependencies
1. Add `<dependency>` declaration to `backend/pom.xml`
2. For Spring Boot managed dependencies, omit `<version>` tag
3. For third-party libraries, specify explicit version
4. Run `mvn dependency:tree` to inspect transitive dependencies if conflicts arise
5. Rebuild Docker image to validate dependency resolution

### Adding Frontend Dependencies
1. Use `npm install <package>` to add and update `package.json` + `package-lock.json`
2. Commit both `package.json` and `package-lock.json` to ensure reproducible builds
3. Use caret ranges (`^`) for version specifiers unless exact pinning is required
4. Verify TypeScript types available (`@types/<package>`) for new dependencies

### Version Upgrade Policy
- **Backend**: Spring Boot parent version upgrades require testing all starter compatibility; third-party library versions (e.g., JJWT) are manually pinned
- **Frontend**: Run `npm outdated` to identify upgrade candidates; test after `npm update` due to potential breaking changes in major versions

### No Vendoring
- Neither `target/` (Maven output) nor `node_modules/` (npm packages) are committed
- Both directories are excluded via `.gitignore`
- All dependencies fetched fresh during CI/build pipeline

### No Private Packages
- No internal package registries configured
- No authentication tokens or private registry URLs in configuration
- All dependencies sourced from public ecosystems (Maven Central, npm registry)