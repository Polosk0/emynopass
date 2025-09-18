#!/bin/bash

CLOUDFLARE_IPS=(
    "103.21.244.0/22"
    "103.22.200.0/22"
    "103.31.4.0/22"
    "104.16.0.0/13"
    "104.24.0.0/14"
    "108.162.192.0/18"
    "131.0.72.0/22"
    "141.101.64.0/18"
    "162.158.0.0/15"
    "172.64.0.0/13"
    "173.245.48.0/20"
    "188.114.96.0/20"
    "190.93.240.0/20"
    "197.234.240.0/22"
    "198.41.128.0/17"
)

PORTS=(3000 3001 80 443)

for port in "${PORTS[@]}"; do
    for ip in "${CLOUDFLARE_IPS[@]}"; do
        echo "Adding rule: $ip -> port $port"
        sudo ufw allow from "$ip" to any port "$port"
    done
done

echo "✅ All Cloudflare IPs added to UFW"
