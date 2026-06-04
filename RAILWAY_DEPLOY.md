# 🚀 Railway.app 自动部署指南

## ⚡ 超快速部署 (3分钟)

您的仓库已准备好部署。按照下面的步骤操作：

---

## 📋 部署步骤

### 方法1️⃣: 使用Web界面 (最简单，推荐)

#### 步骤1: 打开Railway网站
```
访问: https://railway.app
```

#### 步骤2: 使用GitHub登录
- 点击 "Start a New Project" 或登录您的账户
- 选择 "Deploy from GitHub repo"

#### 步骤3: 授权Railway访问您的GitHub
- 点击 "Authorize Railway GitHub App"
- 您会看到GitHub授权页面
- 点击 "Authorize railwayapp"

#### 步骤4: 选择仓库
- 搜索或选择 `Echois666/skill-platform`
- 点击 "Deploy Now"

#### 步骤5: 等待部署完成
- Railway会自动检测Node.js项目
- 自动安装依赖 (npm install)
- 自动构建Docker镜像
- 自动启动服务

#### 步骤6: 获取公网URL
部署完成后，您会看到：
```
✅ Deployment successful!
Your app is live at: https://skill-platform-xxxxx.railway.app
```

**总耗时: 2-3分钟**

---

## ✅ 验证部署成功

### 测试API
```bash
curl https://your-railway-url.railway.app/api/health
```

应该返回:
```json
{
  "status": "healthy",
  "timestamp": "2026-06-04T...",
  "uptime": 123.45
}
```

---

## 🎉 就这么简单！

部署完成后，您会拥有：

✅ **公网访问地址** - https://your-app.railway.app
✅ **自动HTTPS** - Railway会自动配置SSL证书
✅ **自动部署** - 推送代码自动部署
✅ **监控和日志** - 实时查看应用状态