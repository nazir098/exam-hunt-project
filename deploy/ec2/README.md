# EC2 Deployment: GHCR + Watchtower

This pipeline avoids GitHub Actions SSH deploys.

Flow:

```text
GitHub Actions -> build Docker image -> push to GHCR
EC2 -> Watchtower pulls new image -> restarts backend container
```

## 1. GitHub Package Visibility

The workflow publishes:

```text
ghcr.io/nazir098/exam-hunt-project/exam-hunt-api:latest
```

If the package is private, log in to GHCR on EC2 with a GitHub PAT that has `read:packages`.
If the package is public, Docker can pull without login.

## 2. One-Time EC2 Setup

Install Docker and the Compose plugin on EC2. On Amazon Linux 2023:

```bash
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
newgrp docker
```

Copy this folder to the server:

```bash
mkdir -p ~/exam-hunt
cd ~/exam-hunt
```

Create your production env file:

```bash
cp .env.example .env
nano .env
```

If GHCR package is private:

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Start the stack:

```bash
docker compose up -d
```

Watch logs:

```bash
docker compose logs -f api
```

Confirm the running image/build:

```bash
docker compose logs --tail=80 api | grep DEPLOYMENT_INFO
curl -s http://127.0.0.1:8081/actuator/info
docker inspect exam-hunt-api --format '{{.Config.Image}} {{index .Config.Labels "org.opencontainers.image.revision"}}'
```

## 3. Deploy Updates

Push backend changes to `main`. GitHub Actions publishes a new `latest` image.
Watchtower checks every 5 minutes and restarts the `api` container when a new image exists.

Manual update if needed:

```bash
docker compose pull api
docker compose up -d api
```

Check Watchtower:

```bash
docker compose logs --tail=100 watchtower
```

## 4. Notes

- Do not commit the real `.env` file.
- Keep MongoDB Atlas, R2, and frontend hosting outside EC2.
- Keep Nginx proxying `api.techmuzzle.in` to `http://127.0.0.1:8081`.
- Only open required security group ports, usually 80/443 from the internet and 22 from your IP.
