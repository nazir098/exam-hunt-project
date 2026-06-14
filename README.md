# Neetlu — exam-hunt-project

Monorepo for the **Neetlu** student app: Spring Boot API + React (Vite) UI. Content is imported from [pdf-qa-extractor](https://github.com) published manifests (QC-accepted questions only).

## Architecture

```
pdf-qa-extractor  →  published/manifest.json
        ↓ POST /api/admin/import/*
exam-hunt API (MongoDB)  →  REST: packs, filters, questions
        ↓
Neetlu frontend (public browse, study / practice modes)
```

| Layer | Path | Port |
|-------|------|------|
| API | `backend/` | 8081 |
| Web | `frontend/` | 5173 |

## Prerequisites

- Java 17+, Maven
- Node 20+
- MongoDB Atlas (recommended: **Mumbai / ap-south-1** for India latency)
- Published output from `pdf-qa-extractor` (e.g. `output/2016/published/manifest.json`)

## Setup

1. Copy environment file (never commit `.env`):

   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:

   - `MONGODB_URI` — Atlas connection string with database name, e.g. `...mongodb.net/neetlu?retryWrites=true&w=majority`
   - `EXTRACTOR_ROOT` — absolute path to your `pdf-qa-extractor` repo
   - `OPENAI_BASE_URL` — OpenAI-compatible FreeLLMAPI endpoint, e.g. `https://freellmapi-t1pm.onrender.com/v1`
   - Optional `ADMIN_IMPORT_KEY` — if set, import endpoints require header `X-Admin-Key`

3. Load env when starting the API (Spring does not read `.env` automatically):

   ```bash
   set -a && source .env && set +a
   ```

## Run locally

**Backend**

```bash
cd backend
mvn spring-boot:run
```

**Import manifest** (after extractor publish):

```bash
curl -X POST http://127.0.0.1:8081/api/admin/import/folder/2016
# or all folders with published/manifest.json:
curl -X POST http://127.0.0.1:8081/api/admin/import/all
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 — dev server proxies `/api` to the backend.

## API (v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/packs` | List exam packs |
| GET | `/api/packs/{packId}` | Pack detail + stats |
| GET | `/api/packs/{packId}/facets` | Subject/chapter facets |
| GET | `/api/questions?packId=&subject=&chapter=&page=&size=` | Paginated questions (no answer) |
| GET | `/api/questions/{questionId}` | Full question + answer (for reveal) |
| POST | `/api/admin/import/folder/{folder}` | Import one year folder |
| POST | `/api/admin/import/all` | Import all published manifests |

## Product choices (v1)

- **Public browse** — no login
- **QC** — only questions in publish manifest (`require_qc_accepted`)
- **Study mode** — click “Reveal answer”
- **Practice mode** — submit choice, then show correct answer
- **Payments** — not in v1

## Production deployment

Current production shape:

- **Frontend** — Cloudflare Pages: `https://www.techmuzzle.in`
- **Fallback frontend** — Cloudflare Pages: `https://exam-hunt-project.pages.dev`
- **API** — AWS EC2 + Nginx + Let's Encrypt: `https://api.techmuzzle.in`
- **Spring Boot service** — `exam-hunt` systemd service on local port `8081`

Cloudflare Pages build settings:

| Setting | Value |
|---------|-------|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production env | `VITE_API_BASE_URL=https://api.techmuzzle.in` |

Backend production env must include:

```env
CORS_ORIGINS=https://www.techmuzzle.in,https://exam-hunt-project.pages.dev,http://localhost:8080,http://localhost:5173
OPENAI_BASE_URL=https://freellmapi-t1pm.onrender.com/v1
OPENAI_CHAT_MODEL=auto
AI_PRACTICE_ENABLED=true
LEADERBOARD_DEMO_SEED=false
```

See [docs/deployment.md](docs/deployment.md) for the EC2/Nginx/Certbot runbook and verification commands.

## Build locally

```bash
cd backend && mvn test
cd frontend && npm run build
```

## Security

- Do not commit `.env` or Mongo passwords.
- Restrict admin import in production (`ADMIN_IMPORT_KEY` + network rules).
- Image URLs come from your R2/public CDN as stored in the manifest.
- Keep EC2 port `8081` closed publicly; expose the API through Nginx on HTTPS only.
- Rotate provider/client keys if they are ever pasted into a chat, ticket, log, or screenshot.
