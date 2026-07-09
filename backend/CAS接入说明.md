# 接入公司 ECP 单点登录（51aes CAS）· 接线说明

> 实测结论：`cas.51aes.com` 是 **CAS 单点登录服务器**，身份源是**企业微信扫码**
> （corpid `wwa6bc3575475dc52a`、agentid `1000090`，由 CAS 内部处理）。
> 本平台作为标准 **CAS 客户端（service）** 接入，**无需自己对接企业微信**。

## 一、登录时序（含企业微信扫码，均由 CAS 完成）
```
浏览器            本平台(server.js)            cas.51aes.com            企业微信
  │─ 访问受保护页 ─▶│ 未登录                        │                      │
  │◀ 302 /auth/cas/login                            │                      │
  │─────────────▶│ 302 到 CAS /login?service=回调  │                      │
  │══════════════════════════════════════════════▶│ 展示 /loginPage 扫码 │
  │────────────────────────── 用企业微信扫码 ──────┼─────────────────────▶│
  │                                                 │◀ 认证通过，建 SSO 会话│
  │◀════════ 302 回 /auth/cas/callback?ticket=ST-xxx ═══════════════════│
  │─ GET /auth/cas/callback ─▶│ 调 /p3/serviceValidate 验票            │
  │                           │◀ XML: 工号/姓名/部门/邮箱               │
  │◀ Set-Cookie 会话 + 跳回原页 │ 映射角色，建本地会话                   │
```

## 二、需要 CAS 管理员（对方）配合的三件事 —— 缺一不可
1. **把本平台回调地址登记进 CAS 服务注册表白名单**（最关键，否则一律 302 回登录页）：
   - 生产：`https://www.echoswiki.com/auth/cas/callback`
   - 联调（如生产 HTTPS 未就绪）：请对方临时登记 `http://49.233.170.127/auth/cas/callback` 或测试域名
2. **确认验票端点与属性释放**：
   - 端点：`/p3/serviceValidate`（CAS 3.0，返回属性）是否开放；若只有 `/serviceValidate`（CAS 2.0）则拿不到属性，需请对方开 p3 或改用 SAML1.1 validate
   - 属性字段名：工号/姓名/部门/邮箱 分别对应 `cas:attributes` 里的哪个标签（映射时要用）
3. **HTTPS**：CAS 与企业微信回调基本都要求 HTTPS。`echoswiki.com` 备案通过后自动满足；未通前请对方允许临时地址联调。

## 三、本平台已备好的代码（已接线，默认关闭）
`backend/casAuth.js`（已本地自测通过）——标准 CAS 客户端，**零依赖**：
- 会话用 **HMAC 签名的 HttpOnly Cookie** 自持（不需要 `express-session`）
- CAS XML 用内置正则解析（不需要 xml 库）
- 导出：`loginRedirect` / `handleCallback` / `requireAuth` / `requireAdmin` / `logout` / `me` / `parseCasXml`

`backend/server.js` **已完成接线**（用 `CAS_ENABLED` 功能开关包裹）：
- `CAS_ENABLED!=1`（默认/当前生产状态）→ 完全不加载，所有功能照常公开，**零影响**
- `CAS_ENABLED=1` → 启用以下保护：
  - `GET /auth/cas/login`、`/auth/cas/callback`、`/auth/cas/logout`、`/api/me`
  - `/admin.html`、`/api/admin/*` → 需**管理员**（`requireAdmin`，非管理员 403）
  - `/api/generate/*` → 需**登录**（`requireAuth`）
  - 其余公开只读内容（园区/阶段/材料浏览等）不拦

## 四、如何开启（对方登记好 service 后，无需改代码、无需 npm install）
只需设置环境变量并重启，即可零风险开启/关闭：
```bash
# /opt/skill-platform 下，PM2 环境变量（示例）
export CAS_ENABLED=1
export CAS_SERVICE_URL=https://www.echoswiki.com/auth/cas/callback   # 必须与登记到CAS的完全一致
export CAS_SESSION_SECRET=<一段足够长的随机字符串>                     # 会话签名密钥，务必设置且保密
export CAS_ADMIN_IDS=90012345,90067890                              # 可进后台的管理员工号（逗号分隔）
export CAS_BASE_URL=https://cas.51aes.com                           # 可选，默认已是它
export CAS_VALIDATE_PATH=/p3/serviceValidate                        # 可选，若对方只开 2.0 改 /serviceValidate
pm2 restart skill-platform --update-env
```
> 联调期（生产 HTTPS 未就绪）可临时把 `CAS_SERVICE_URL` 设为 `http://49.233.170.127/auth/cas/callback`
> （需对方把该地址也登记进白名单）。备案通过后切回域名。
>
> 属性字段名映射：默认从 `name/cn/displayName`、`department/dept/deptName`、`email/mail` 里取。
> 若对方释放的标签名不同，改 `casAuth.js` 的 `defaultMapUser`（或传入自定义 `mapUser`）即可。

## 五、安全清单
- [x] 会话用 HMAC 签名 Cookie（HttpOnly + SameSite=Lax；serviceUrl 为 https 时自动加 Secure）
- [x] 篡改/过期会话被拒绝（timingSafeEqual 定长比较，已自测）
- [x] 回跳只允许站内路径（防开放重定向）
- [ ] 设置 `CAS_SESSION_SECRET` 环境变量（不设会用随机密钥，重启后已登录用户掉线）
- [ ] `CAS_SESSION_SECRET` 等配置放环境变量，不进 GitHub
- [ ] 收紧现有 `cors()`（目前全开）
- [ ] 开启前确认 `/api/generate/*`、`/api/admin/*`、`/admin.html` 保护范围符合预期

## 六、开关式灰度（已内置）
`CAS_ENABLED` 开关已写进 server.js：默认不启用鉴权（保持现在开放状态），
对方 service 登记好、HTTPS 就绪后置 `CAS_ENABLED=1` + `pm2 restart --update-env` 即正式启用，
出问题去掉该变量再重启即可秒回退，**做到零风险切换**。
