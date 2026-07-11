#!/usr/bin/env bash
# Restrict ports 80/443 on this host to Cloudflare edge IPs only (bypass protection).
# Uses packet source IP — unaffected by nginx real_ip_header.
#
# Usage: sudo bash lockdown-host-to-cloudflare.sh
# Undo:  sudo bash lockdown-host-to-cloudflare.sh --remove
set -euo pipefail

CHAIN_V4="CLOUDFLARE_IN_V4"
CHAIN_V6="CLOUDFLARE_IN_V6"

remove_rules() {
  echo "Removing Cloudflare host lockdown rules..."
  iptables -D INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN_V4" 2>/dev/null || true
  ip6tables -D INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN_V6" 2>/dev/null || true
  iptables -F "$CHAIN_V4" 2>/dev/null || true
  ip6tables -F "$CHAIN_V6" 2>/dev/null || true
  iptables -X "$CHAIN_V4" 2>/dev/null || true
  ip6tables -X "$CHAIN_V6" 2>/dev/null || true
  echo "Done."
}

if [[ "${1:-}" == "--remove" ]]; then
  remove_rules
  exit 0
fi

remove_rules

iptables -N "$CHAIN_V4"
ip6tables -N "$CHAIN_V6"

echo "Allowing SSH (22) before Cloudflare lockdown..."
iptables -C INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || iptables -A INPUT -p tcp --dport 22 -j ACCEPT

while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  if [[ "$cidr" == *:* ]]; then
    ip6tables -A "$CHAIN_V6" -s "$cidr" -j ACCEPT
  else
    iptables -A "$CHAIN_V4" -s "$cidr" -j ACCEPT
  fi
done < <(
  curl -fsSL https://www.cloudflare.com/ips-v4
  curl -fsSL https://www.cloudflare.com/ips-v6
)

iptables -A "$CHAIN_V4" -j DROP
ip6tables -A "$CHAIN_V6" -j DROP

iptables -I INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN_V4"
ip6tables -I INPUT -p tcp -m multiport --dports 80,443 -j "$CHAIN_V6"

echo "Host firewall: only Cloudflare IPs may reach ports 80/443."
echo "SSH (22) unchanged. To undo: sudo bash $0 --remove"
