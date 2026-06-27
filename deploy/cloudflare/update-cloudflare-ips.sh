#!/usr/bin/env bash
# Generate Nginx Cloudflare allow + real_ip configs on EC2.
# Usage: sudo bash update-cloudflare-ips.sh
set -euo pipefail

ALLOW="/etc/nginx/conf.d/cloudflare-allow.conf"
REALIP="/etc/nginx/conf.d/cloudflare-real-ip.conf"

tmp_allow="$(mktemp)"
tmp_realip="$(mktemp)"

{
  echo "# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  curl -fsSL https://www.cloudflare.com/ips-v4
  curl -fsSL https://www.cloudflare.com/ips-v6
} | while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  echo "allow $cidr;"
done > "$tmp_allow"

{
  echo "# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  curl -fsSL https://www.cloudflare.com/ips-v4
  curl -fsSL https://www.cloudflare.com/ips-v6
} | while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  echo "set_real_ip_from $cidr;"
done > "$tmp_realip"

echo "real_ip_header CF-Connecting-IP;" >> "$tmp_realip"
echo "real_ip_recursive on;" >> "$tmp_realip"

mv "$tmp_allow" "$ALLOW"
mv "$tmp_realip" "$REALIP"
chmod 644 "$ALLOW" "$REALIP"

nginx -t
systemctl reload nginx
echo "Updated $ALLOW and $REALIP"
