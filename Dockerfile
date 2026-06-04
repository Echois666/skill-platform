FROM node:18-alpine

WORKDIR /app

# 复制依赖清单并安装生产依赖
COPY package.json ./
RUN npm install --omit=dev

# 复制应用代码
COPY backend/ ./backend/
COPY data/ ./data/
COPY public/ ./public/

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/api/health',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)})"

# 启动应用
CMD ["npm", "start"]
