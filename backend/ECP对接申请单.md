# ECP 单点登录（CAS）对接申请单

> 用途：把本文件/以下内容直接转发给 **ECP / CAS 系统管理员**，请其配合完成对接。
> 我方系统：云TB百科全书 · 五阶段行业方案作战台（Node/Express）
> 已确认贵司 SSO：`cas.51aes.com`（CAS 协议，身份源为企业微信扫码）。我方将作为标准 CAS 客户端(service)接入。

---

## 一、请协助登记我方 service（最关键）
请将以下回调地址登记进 CAS **服务注册表(service registry)** 白名单，否则会被 302 拒绝回登录页：

- 生产回调：`https://www.echoswiki.com/auth/cas/callback`
- 联调回调（生产 HTTPS 未就绪期间临时使用）：`http://49.233.170.127/auth/cas/callback`
- 登出后回跳：`https://www.echoswiki.com/`

> 我方域名正在 ICP 备案审核中，HTTPS 尚未生效。**能否临时允许上面的 IP 地址作为 service 联调？** 备案通过后切回域名。

## 二、请确认验票端点与属性释放
1. 是否开放 **`/p3/serviceValidate`**（CAS 3.0）？我方需要它返回用户属性；若只有 `/serviceValidate`（CAS 2.0，不含属性）请告知，或改用 `/samlValidate`。
2. 校验成功后会释放（release）哪些**属性字段**？请提供字段名，我方按此映射：

   | 我方需要 | 请填写 CAS 释放的属性名(cas:attributes 标签) |
   |---------|----------------------------------------------|
   | 工号/唯一标识 | （cas:user 是否即工号？） |
   | 姓名 |  |
   | 部门 |  |
   | 邮箱 |  |
   | 角色/岗位（如有）|  |

## 三、请确认调用限制
- 我方后端服务器出口 IP：`49.233.170.127`（腾讯云）。**验票接口 `/p3/serviceValidate` 是否有 IP 白名单/服务网格(istio)访问限制？** 如有，请放行该 IP。
- 验票是否需要额外的 client 凭据/密钥？（标准 CAS 不需要，仅凭 ticket+service）

## 四、请提供（若有）
- 贵司这套 CAS 的**内部接入文档 / 沙箱环境地址**
- 一个**测试工号**用于联调
- CAS 版本（Apereo CAS x.x）及是否同时支持 OIDC/SAML（我方可择优）

---

## 我方对接信息（供登记）
| 项 | 值 |
|----|----|
| 应用名称 | 云TB百科全书·五阶段方案作战台 |
| 应用类型 | Web（服务端会话，标准 CAS 客户端）|
| 生产回调 | https://www.echoswiki.com/auth/cas/callback |
| 联调回调 | http://49.233.170.127/auth/cas/callback |
| 出口 IP | 49.233.170.127 |
| 对接负责人 | （你的姓名/联系方式）|

> 我方代码已就绪（CAS 客户端 + 会话 + 路由保护），拿到上述①②③即可联调，预计半天内跑通。
