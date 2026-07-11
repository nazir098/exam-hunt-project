#!/usr/bin/env bash
# Generate Nginx Cloudflare real_ip config on EC2.
# Usage: sudo bash update-cloudflare-ips.sh
#
# Do NOT use cloudflare-allow.conf with allow/deny in nginx when real_ip is
# enabled — see deploy/ec2/nginx-exam-hunt-api.conf.example. For bypass
# protection use deploy/cloudflare/lockdown-host-to-cloudflare.sh instead.
set -euo pipefail

REALIP="/etc/nginx/conf.d/cloudflare-real-ip.conf"
tmp_realip="$(mktemp)"

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

mv "$tmp_realip" "$REALIP"
chmod 644 "$REALIP"

# Legacy file — remove if present so it is not accidentally included in nginx.
rm -f /etc/nginx/conf.d/cloudflare-allow.conf

nginx -t
systemctl reload nginx
echo "Updated $REALIP (removed cloudflare-allow.conf if it existed)"
