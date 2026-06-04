#!/usr/bin/env bash
###############################################################################
# 园区Skill智能方案生成平台 - 服务器一键部署脚本
# 适用：Ubuntu 20.04 / 22.04（腾讯云轻量应用服务器 / CVM）
# 用法：curl -fsSL https://raw.githubusercontent.com/Echois666/skill-platform/main/deploy/server-setup.sh | sudo bash
# 部署完成后通过 http://<服务器公网IP>/ 访问
###############################################################################
set -euo pipefail

REPO_URL="https://github.com/Echois666/skill-platform.git"
APP_DIR="/opt/skill-platform"
APP_PORT="3000"
NODE_MAJOR="18"

echo "==> [1/7] 更新系统并安装基础工具"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ca-certificates gnupg

echo "==> [2/7] 安装 Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | grep -oE '[0-9]+' | head -1)" -lt "${NODE_MAJOR}" ]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

echo "==> [3/7] 安装 PM2 进程守护"
npm install -g pm2

echo "==> [4/7] 拉取/更新代码到 ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" fetch --all
  git -C "${APP_DIR}" reset --hard origin/main
else
  rm -rf "${APP_DIR}"
  git clone "${REPO_URL}" "${APP_DIR}"
fi

echo "==> [5/7] 安装生产依赖"
cd "${APP_DIR}"
npm install --omit=dev

echo "==> [6/7] 用 PM2 启动后端服务（端口 ${APP_PORT}）"
PORT="${APP_PORT}" pm2 delete skill-platform >/dev/null 2>&1 || true
PORT="${APP_PORT}" pm2 start backend/server.js --name skill-platform
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> [7/7] 配置 Nginx 反向代理（80 -> ${APP_PORT}）"
cat > /etc/nginx/sites-available/skill-platform <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/skill-platform /etc/nginx/sites-enabled/skill-platform
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo ""
echo "============================================================"
echo " 部署完成！"
echo " 本地健康检查："
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" || echo "（健康检查未通过，请查看 pm2 logs）"
echo ""
echo " 访问地址： http://$(curl -fsS https://api.ipify.org || echo '<服务器公网IP>')/"
echo " 进程状态： pm2 status"
echo " 查看日志： pm2 logs skill-platform"
echo "============================================================"
