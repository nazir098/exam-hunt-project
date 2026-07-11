# Cloudflare WAF & rate limits (production)

Protect `api.techmuzzle.in` from scraping, credential stuffing, and bot traffic **before** requests reach EC2.

Stack today:

| Host | Where | Cloudflare |
|------|--------|------------|
| `www.techmuzzle.in` | Cloudflare Pages | Already on Cloudflare |
| `api.techmuzzle.in` | EC2 + Nginx | **Must be proxied (orange cloud)** |

Backend also applies in-app rate limits (`RateLimitFilter`) in production. Cloudflare is the first line of defense and blocks abuse at the edge.

---

## 1. Proxy the API through Cloudflare

In **Cloudflare DNS** (zone `techmuzzle.in`):

1. Find the **`api`** record (currently A → EC2 public IP).
2. Turn **Proxy status** to **Proxied** (orange cloud).
3. Wait 2–5 minutes for DNS.

Verify:

```bash
dig +short api.techmuzzle.in
# Should return Cloudflare anycast IPs (e.g. 104.x, 172.x), NOT your EC2 IP
```

### SSL/TLS mode

**SSL/TLS → Overview → Encryption mode:** **Full (strict)**

Origin already uses Let's Encrypt on Nginx (`certbot`). Cloudflare validates that cert when connecting to EC2.

Optional: issue a **Cloudflare Origin Certificate** (15-year) and install on Nginx if you prefer.

---

## 2. Block bypass (direct-to-EC2 attacks)

If someone uses the **EC2 public IP** or an unproxied hostname, they **skip** WAF and rate limits.

### A. Nginx — restore real visitor IP only (do not use allow/deny here)

Nginx runs `real_ip` **before** `allow`/`deny`. After `real_ip_header CF-Connecting-IP`, `$remote_addr` is the **visitor** IP, not Cloudflare’s edge IP — so `allow <cloudflare-cidr>` no longer matches and **legitimate traffic can get 403**.

**Correct nginx pattern** ([`deploy/ec2/nginx-exam-hunt-api.conf.example`](../deploy/ec2/nginx-exam-hunt-api.conf.example)):

```nginx
include /etc/nginx/conf.d/cloudflare-real-ip.conf;

server {
    server_name api.techmuzzle.in;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header X-Real-IP $remote_addr;  # restored client IP
        ...
    }
    listen 443 ssl;
    ...
}
```

On EC2:

```bash
sudo bash deploy/cloudflare/update-cloudflare-ips.sh
# Merge deploy/ec2/nginx-exam-hunt-api.conf.example with your Certbot SSL block
sudo nginx -t && sudo systemctl reload nginx
```

Refresh real_ip list monthly (cron): re-run `update-cloudflare-ips.sh`.

### B. Host firewall — only Cloudflare may reach 80/443 (recommended bypass block)

Block at **packet source IP** (iptables), not nginx `allow`/`deny`:

```bash
sudo bash deploy/cloudflare/lockdown-host-to-cloudflare.sh
```

Undo: `sudo bash deploy/cloudflare/lockdown-host-to-cloudflare.sh --remove`

Keep **SSH (22)** open from your IP in the security group. Port **8081** must stay **not** public (Docker bind to 127.0.0.1 only).

### D. Authenticated Origin Pulls (optional, strongest origin lock)

Use when **Global** AOP is enabled in Cloudflare but you have not finished nginx yet.

**Cloudflare:** **SSL/TLS → Origin Server → Authenticated Origin Pulls → Global → On**

**EC2:**

```bash
sudo curl -fsSL -o /etc/nginx/cloudflare-origin-pull-ca.pem \
  https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem

# Add inside the 443 server block for api.techmuzzle.in:
#   ssl_client_certificate /etc/nginx/cloudflare-origin-pull-ca.pem;
#   ssl_verify_client on;

sudo nginx -t && sudo systemctl reload nginx
```

Only enable `ssl_verify_client on` **after** Global AOP is On in Cloudflare. Otherwise Cloudflare cannot connect and the API goes down.

---

## 3. Bot management

### Free plan: turn Bot Fight Mode **Off** (cannot skip per hostname)

On **Free**, **Bot Fight Mode does not appear** under WAF Skip components and **cannot be bypassed** with custom Skip rules. It runs outside the WAF ruleset engine. Checking **All Super Bot Fight Mode Rules** only helps on **Pro+** with Super Bot Fight — not regular Bot Fight Mode.

**Security → Bots → Bot Fight Mode → Off**

Without this, `https://api.techmuzzle.in` returns **403** with `cf-mitigated: challenge` for normal `fetch()` / XHR from the SPA.

Scraping protection stays covered by your **rate limit** on `/api/questions*` (section 4) and backend `RateLimitFilter`.

### WAF skip rule for API (still useful)

**Security → WAF → Custom rules → Create rule**

| Field | Value |
|-------|--------|
| **Rule name** | `Skip hard checks on API` |
| **Expression** | `(http.host eq "api.techmuzzle.in")` |
| **Action** | **Skip** |

Under **More components to skip**, enable:

- **Browser Integrity Check** (often blocks API clients)
- **Security Level** (optional — avoids extra challenges on API)

Do **not** skip: rate limiting rules, managed rules, or remaining custom rules.

Verify after Bot Fight is Off + rule deployed:

```bash
curl -sI https://api.techmuzzle.in/actuator/health | grep -E 'HTTP/|cf-mitigated'
# Expect HTTP/2 200 and NO cf-mitigated: challenge
```

### Pro+ alternative

Upgrade to **Super Bot Fight Mode**, disable plain Bot Fight, then use a Skip rule with **All Super Bot Fight Mode Rules** for `api.techmuzzle.in` only.

**Security → WAF → Managed rules**

Enable:

- **Cloudflare Managed Ruleset**
- **Cloudflare OWASP Core Ruleset** (tune if admin import POSTs trigger false positives)

For long admin import jobs (`POST /api/admin/import/...`), add a **WAF skip rule** for authenticated admin (JWT cookie/header) or your office IP — see section 6.

---

## 4. Rate limiting rules

Create in **Security → WAF → Rate limiting rules** (or **Security → Rate Rules** depending on dashboard).

Use **characteristics:** `IP` (default). Action: **Block** for 60 seconds (or **Managed Challenge** for auth paths).

### Rule 1 — Login brute force

| Field | Value |
|-------|--------|
| **Name** | API login limit |
| **Expression** | `(http.host eq "api.techmuzzle.in" and http.request.uri.path eq "/api/auth/login" and http.request.method eq "POST")` |
| **Requests** | 10 per 1 minute |
| **Action** | Block |

### Rule 2 — Registration spam

| Field | Value |
|-------|--------|
| **Name** | API register limit |
| **Expression** | `(http.host eq "api.techmuzzle.in" and http.request.uri.path eq "/api/auth/register" and http.request.method eq "POST")` |
| **Requests** | 5 per 1 hour |
| **Action** | Block |

### Rule 3 — Question catalog scraping

| Field | Value |
|-------|--------|
| **Name** | Question API scrape limit |
| **Expression** | `(http.host eq "api.techmuzzle.in" and http.request.method eq "GET" and (http.request.uri.path eq "/api/questions" or starts_with(http.request.uri.path, "/api/questions/")))` |
| **Requests** | 60 per 1 minute |
| **Action** | Block |

This is **stricter** than the app limit (120/min) and slows bulk download of stems/options.

### Rule 4 — Practice AI cost abuse

| Field | Value |
|-------|--------|
| **Name** | Practice AI limit |
| **Expression** | `(http.host eq "api.techmuzzle.in" and http.request.uri.path eq "/api/practice-ai/assist" and http.request.method eq "POST")` |
| **Requests** | 20 per 1 minute |
| **Action** | Block |

### Rule 5 — SEO metadata (question pages)

| Field | Value |
|-------|--------|
| **Name** | SEO question meta limit |
| **Expression** | `(http.host eq "api.techmuzzle.in" and http.request.method eq "GET" and starts_with(http.request.uri.path, "/api/seo/questions/"))` |
| **Requests** | 30 per 1 minute |
| **Action** | Block |

### Rule 6 — SEO sitemap (optional cap)

| Field | Value |
|-------|--------|
| **Name** | Sitemap limit |
| **Expression** | `(http.host eq "api.techmuzzle.in" and http.request.uri.path eq "/api/seo/sitemap")` |
| **Requests** | 30 per 1 hour |
| **Action** | Block |

---

## 5. Custom WAF rules (block obvious scrapers)

**Security → WAF → Custom rules**

### Block empty or bot User-Agents on question API

```
(http.host eq "api.techmuzzle.in"
 and starts_with(http.request.uri.path, "/api/questions")
 and http.request.method eq "GET"
 and (
   len(http.user_agent) eq 0
   or http.user_agent contains "python-requests"
   or http.user_agent contains "curl/"
   or http.user_agent contains "wget/"
   or http.user_agent contains "Scrapy"
 ))
```

**Action:** Managed Challenge (allows real browsers; blocks dumb scripts) or **Block** if you only use the web app.

> Legitimate `curl` for your own ops will need a browser User-Agent or an IP allowlist rule.

### Require browser-like traffic for anonymous question detail (optional, Pro+)

Challenge `GET /api/questions/{id}` when no `Authorization` header and Bot Score is low — tune carefully to avoid hurting SEO crawlers (they usually hit HTML on `www`, not JSON API).

---

## 6. Admin / import exceptions

Admin pack sync sends many requests and can run 5–15 minutes.

**Option A — IP allowlist (simplest)**  
Custom rule: **Skip** all WAF/rate limits when `ip.src eq YOUR_OFFICE_IP`.

**Option B — Path skip for admin**  
Skip rate limits when:

```
(http.host eq "api.techmuzzle.in" and starts_with(http.request.uri.path, "/api/admin/"))
```

Still require `Authorization: Bearer` + admin role on the origin — Cloudflare skip only avoids false blocks, not auth.

---

## 7. Cache rules (keep existing)

Do **not** cache authenticated or question endpoints.

Keep edge cache only for:

- `GET /api/packs`
- `GET /api/exams`

See [deployment.md](./deployment.md#cloudflare-edge-cache-api).

Add a **Cache Rule → Bypass cache** for:

```
(http.host eq "api.techmuzzle.in" and (
  starts_with(http.request.uri.path, "/api/questions")
  or starts_with(http.request.uri.path, "/api/practice")
  or starts_with(http.request.uri.path, "/api/auth")
  or starts_with(http.request.uri.path, "/api/admin")
))
```

---

## 8. Verify WAF is active

```bash
# Should show cf-ray header (Cloudflare handled request)
curl -sI https://api.techmuzzle.in/actuator/health | grep -i cf-ray

# Direct EC2 IP should fail or 403 after Nginx allowlist
curl -sI --resolve api.techmuzzle.in:443:YOUR_EC2_IP https://api.techmuzzle.in/actuator/health
```

Trigger rate limit (from a test IP):

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.techmuzzle.in/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# Expect 429 or Cloudflare block after ~10 requests
```

**Security → Events** in Cloudflare shows blocked/challenged requests.

---

## 9. Free vs paid limits

| Feature | Free | Pro (~$20/mo) |
|---------|------|----------------|
| Bot Fight Mode | Yes | Yes |
| Super Bot Fight Mode | No | Yes |
| WAF custom rules | 5 | 20 |
| Rate limiting rules | 1 (basic) | 2+ (more on higher tiers) |
| OWASP managed rules | Limited | Full |

On **Free**, prioritize: **proxy API**, **skip Bot Fight on `api`**, **one rate limit** on `/api/questions`, **host firewall lockdown** (not nginx allow/deny).

---

## 10. What Cloudflare does *not* fix

- **Free account + JWT** can still scrape answers over time — combine with app-level gates (session before reveal, email verification).
- **R2 public URLs** — images remain downloadable if URL is known; use signed URLs for solutions if needed.
- **Frontend static assets** on Pages — public by design.

Use Cloudflare for edge protection; keep backend secrets, redacted public API, and strong `JWT_SECRET` as documented in deployment runbooks.
