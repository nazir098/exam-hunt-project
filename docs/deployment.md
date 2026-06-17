# Exam Hunt Production Deployment

This runbook documents the current low-cost production setup.

## URLs

| Component | URL |
|-----------|-----|
| Frontend | `https://www.techmuzzle.in` |
| Frontend fallback | `https://exam-hunt-project.pages.dev` |
| Backend API | `https://api.techmuzzle.in` |
| FreeLLMAPI router | `https://freellmapi-t1pm.onrender.com/v1` |

## Infrastructure

- Frontend: Cloudflare Pages from `nazir098/exam-hunt-project`
- Backend: AWS EC2 Amazon Linux 2023
- Reverse proxy: Nginx
- TLS: Certbot / Let's Encrypt
- Backend runtime: Docker Compose service `api`
- Backend auto-update: Watchtower pulls `ghcr.io/nazir098/exam-hunt-project/exam-hunt-api:latest`
- Spring Boot port: `8081`, bound behind Nginx

## DNS

At GoDaddy:

| Type | Name | Value |
|------|------|-------|
| CNAME | `www` | `exam-hunt-project.pages.dev` |
| A | `api` | EC2 public IPv4 |

Root `techmuzzle.in` is forwarded to `https://www.techmuzzle.in`.

## AWS Security Group

Keep only these inbound rules:

| Type | Port | Source |
|------|------|--------|
| SSH | `22` | Your IP only |
| HTTP | `80` | `0.0.0.0/0` |
| HTTPS | `443` | `0.0.0.0/0` |

Do not expose `8081` publicly. Nginx should be the only public path to the API.

## Backend Files On EC2

| Purpose | Path |
|---------|------|
| Compose stack | `/home/ec2-user/exam-hunt/docker-compose.yml` |
| Env | `/home/ec2-user/exam-hunt/.env` |
| Docker auth | `/home/ec2-user/.docker/config.json` |
| Nginx config | `/etc/nginx/conf.d/exam-hunt-api.conf` |
| SSL cert | `/etc/letsencrypt/live/api.techmuzzle.in/fullchain.pem` |
| SSL key | `/etc/letsencrypt/live/api.techmuzzle.in/privkey.pem` |

Required backend env values:

```env
SERVER_PORT=8081
MONGODB_URI=<atlas-uri>
JWT_SECRET=<long-random-secret>
ADMIN_EMAIL=hussaininazir1@gmail.com
ADMIN_PASSWORD=<admin-password>
OPENAI_BASE_URL=https://freellmapi-t1pm.onrender.com/v1
OPENAI_API_KEY=<freellmapi-client-key>
OPENAI_CHAT_MODEL=auto
AI_PRACTICE_ENABLED=true
PUBLIC_FILES_BASE_URL=https://pub-e97c6c0fb4ed4d289eea27512d33293d.r2.dev
# IMPORT_PACK_FOLDERS=2016,2025
CORS_ORIGINS=https://www.techmuzzle.in,https://exam-hunt-project.pages.dev,http://localhost:8080,http://localhost:5173
LEADERBOARD_DEMO_SEED=false
```

Do **not** set `EXTRACTOR_ROOT` on EC2 unless you mount extractor output on the server. Production import reads manifests and metadata from R2 via `PUBLIC_FILES_BASE_URL`.

### R2 layout (per year)

Upload each published year folder to the bucket root:

```text
2016/manifest.json
2016/questions/*.webp
2016/solutions/*.webp
2016/metadata/AI_*.json
2016/metadata/index.json
```

Optional at bucket root for faster admin discovery:

```json
{ "folders": ["2016", "2025"] }
```

Save as `packs-index.json` in R2.

## Nginx Proxy

The HTTP server block should proxy to Spring Boot:

```nginx
server {
    listen 80;
    server_name api.techmuzzle.in;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Admin pack sync fetches hundreds of R2 metadata files — allow long requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 900s;
        proxy_read_timeout 900s;
        send_timeout 900s;
    }
}
```

Certbot updates this file for HTTPS.

### Import times out or shows “cancelled”

Pack sync is **async**: `POST /api/admin/import/folder/{year}` returns **202** immediately with a `jobId`. Poll status:

```bash
curl -s https://api.techmuzzle.in/api/admin/import/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Status values: `QUEUED` → `RUNNING` → `SUCCEEDED` or `FAILED`.

The Admin UI polls automatically. Large R2 syncs (many `metadata/AI_*.json` files) can take **5–15 minutes** on the server even though the start request finishes in under a second.

Watch server logs:

```bash
cd ~/exam-hunt
docker compose logs -f api
```

## Backend Image Deploy

GitHub Actions builds and publishes the backend image to GHCR on each `main` push that touches backend deployment files:

```text
ghcr.io/nazir098/exam-hunt-project/exam-hunt-api:latest
```

Watchtower on EC2 polls GHCR every 5 minutes and restarts the `api` container when `latest` changes.

### One-time EC2 setup

Copy the compose files:

```bash
mkdir -p ~/exam-hunt
cd ~/exam-hunt
# copy deploy/ec2/docker-compose.yml and deploy/ec2/.env.example here
cp .env.example .env
nano .env
```

If the GHCR package is private, create a GitHub PAT with `read:packages`, then log in on EC2:

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Start the stack:

```bash
docker compose up -d
docker compose ps
docker compose logs -f api
```

### Manual image refresh

Usually Watchtower does this automatically. To force it:

```bash
cd ~/exam-hunt
docker compose pull api
docker compose up -d api
docker compose logs -f api
```

## Cloudflare Pages

Build settings:

```text
Root directory: frontend
Build command: npm run build
Build output directory: dist
```

Production environment variable:

```text
VITE_API_BASE_URL=https://api.techmuzzle.in
```

After changing env vars, redeploy the latest production deployment.

## Verification

Backend health:

```bash
curl -i https://api.techmuzzle.in/actuator/health
```

Backend CORS:

```bash
curl -i 'https://api.techmuzzle.in/api/exams' \
  -H 'Origin: https://www.techmuzzle.in' \
  -H 'Referer: https://www.techmuzzle.in/'
```

AI status:

```bash
curl -i https://api.techmuzzle.in/api/practice-ai/status
```

Expected CORS headers:

```text
Access-Control-Allow-Origin: https://www.techmuzzle.in
Access-Control-Allow-Credentials: true
```

SSL renewal dry run:

```bash
sudo certbot renew --dry-run
```

Useful service commands:

```bash
cd ~/exam-hunt
docker compose ps
docker compose restart api
docker compose logs --tail=100 api
docker compose logs --tail=100 watchtower
sudo nginx -t
sudo systemctl reload nginx
```

## Cost Checks

Use AWS Cost Explorer:

- Date range: Month-to-date
- Granularity: Daily
- Group by: Service

Most likely cost lines for this setup are EC2 instance hours, EBS storage, data transfer, and small CloudWatch usage.
