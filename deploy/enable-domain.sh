#!/usr/bin/env bash
###############################################################################
# 园区Skill平台 - 域名绑定 + 正式 HTTPS 证书一键脚本
# 用法：sudo bash enable-domain.sh <你的域名> <你的邮箱>
# 例如：sudo bash enable-domain.sh skill.example.com you@example.com
#
# 前提条件（必须先完成，否则证书签发会失败）：
#   1. 域名已注册，并将 A 记录解析到本服务器公网 IP：49.233.170.127
#   2. 大陆服务器：域名已完成 ICP 备案（否则 80/443 对外服务会被拦截）
#   3. 腾讯云安全组已放行 80 与 443 端口（入站 TCP）
###############################################################################
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "用法: sudo bash enable-domain.sh <域名> <邮箱>"
  echo "例如: sudo bash enable-domain.sh skill.example.com you@example.com"
  exit 1
fi

echo "==> [1/5] 校验域名解析是否指向本机"
SERVER_IP="$(curl -fsS https://api.ipify.org || echo '')"
RESOLVED_IP="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || echo '')"
echo "    本机公网IP: ${SERVER_IP:-未知}"
echo "    域名解析IP: ${RESOLVED_IP:-未解析}"
if [ -n "$SERVER_IP" ] && [ -n "$RESOLVED_IP" ] && [ "$SERVER_IP" != "$RESOLVED_IP" ]; then
  echo "    ⚠️ 警告：域名解析IP与本机不一致，证书签发可能失败。请确认 A 记录。"
fi

echo "==> [2/5] 安装 certbot（如未安装）"
if ! command -v certbot >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y -q
  apt-get install -y -q certbot python3-certbot-nginx
fi

echo "==> [3/5] 更新 Nginx server_name 为 ${DOMAIN}"
CONF="/etc/nginx/sites-available/skill-platform"
# 将默认配置中的 server_name _ 替换为真实域名（仅 80 段，certbot 会接管 443）
cat > "$CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
nginx -t
systemctl reload nginx

echo "==> [4/5] 通过 certbot 申请并安装 Let's Encrypt 证书（自动配置 HTTPS + 跳转）"
certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --redirect \
  -m "$EMAIL"

echo "==> [5/5] 校验自动续期"
certbot renew --dry-run || echo "    （续期演练失败，请手动检查 certbot 定时任务）"

echo ""
echo "✅ 完成！现在可通过 https://${DOMAIN}/ 安全访问"
echo "   管理后台: https://${DOMAIN}/admin.html"
echo "   证书将由 certbot systemd timer 自动续期（每 60 天左右）"
