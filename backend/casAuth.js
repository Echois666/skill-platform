// backend/casAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// 51aes ECP 单点登录（CAS 协议）客户端 —— 零依赖实现
//
// 背景（实测 https://cas.51aes.com/loginPage 得出）：
//   · cas.51aes.com 是 CAS 单点登录服务器（定制前端，登录页 /loginPage）
//   · 身份源 = 企业微信扫码（corpid=wwa6bc3575475dc52a, agentid=1000090）
//     —— 这些由 CAS 内部处理，本平台作为 CAS「客户端(service)」无需关心企业微信
//
// 本平台要做的事（标准 CAS 客户端三步）：
//   1) 未登录 → 302 跳 CAS /login?service=<回调地址>
//   2) CAS 扫码认证后回跳 <回调地址>?ticket=ST-xxxx
//   3) 后端拿 ticket 调 /p3/serviceValidate 验票 → 得到工号/姓名/部门 → 建会话
//
// ⚠️ 上线前置条件（缺一不可）：
//   · 让 CAS 管理员把本平台回调地址登记进「服务注册表(service registry)」白名单
//   · 平台需 HTTPS 回调（echoswiki.com 备案通过后可用；联调期可请对方登记临时地址）
//   · 确认对方释放的属性字段名（工号/姓名/部门/邮箱对应的 cas:attributes 标签）
//
// 依赖：无。会话用 HMAC 签名的 HttpOnly Cookie 自持（不需要 express-session），
//       XML 用内置正则解析。整套 SSO 零 npm 依赖，开启只需设环境变量。
// 接线方式见本目录 CAS接入说明.md。CAS_ENABLED!=1 时 server.js 不加载本文件，对生产无影响。
// ─────────────────────────────────────────────────────────────────────────────

const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');

const SESS_COOKIE = 'cas_sess';   // 登录会话（签名，含用户）
const RET_COOKIE = 'cas_return';  // 登录前来路（签名，短时）

/**
 * @param {object} opts
 * @param {string} opts.casBaseUrl   CAS 根地址，如 https://cas.51aes.com
 * @param {string} opts.serviceUrl   本平台回调完整地址（必须与登记到 CAS 的一致）
 *                                    如 https://www.echoswiki.com/auth/cas/callback
 * @param {string} [opts.validatePath] 验票端点，默认 /p3/serviceValidate（CAS3.0，带属性）
 * @param {string} [opts.sessionSecret] 会话签名密钥（不传则进程启动时随机生成，重启会掉登录）
 * @param {number} [opts.sessionMaxAgeMs] 会话有效期，默认 8 小时
 * @param {string[]} [opts.adminIds] 管理员工号名单（命中则 role=admin）
 * @param {(profile:object)=>object} [opts.mapUser] 把 CAS 用户映射为平台用户/角色
 */
function createCasAuth(opts) {
  const casBaseUrl = (opts.casBaseUrl || '').replace(/\/+$/, '');
  const serviceUrl = opts.serviceUrl;
  const validatePath = opts.validatePath || '/p3/serviceValidate';
  const adminIds = (opts.adminIds || []).map(String);
  const mapUser = opts.mapUser || ((p) => defaultMapUser(p, adminIds));
  const maxAgeMs = opts.sessionMaxAgeMs || 8 * 3600 * 1000;
  const secure = /^https:/i.test(serviceUrl);
  const secret = opts.sessionSecret || process.env.CAS_SESSION_SECRET
    || crypto.randomBytes(32).toString('hex');

  if (!casBaseUrl || !serviceUrl) {
    throw new Error('[casAuth] 需要提供 casBaseUrl 和 serviceUrl');
  }
  if (!opts.sessionSecret && !process.env.CAS_SESSION_SECRET) {
    console.warn('[casAuth] 未设置 CAS_SESSION_SECRET，已用随机密钥（进程重启会导致已登录用户掉线）');
  }

  // ── 签名令牌（base64url(payload).base64url(hmac)）───────────────────────────
  function sign(data) {
    return crypto.createHmac('sha256', secret).update(data).digest('base64url');
  }
  function encode(obj) {
    const payload = Buffer.from(JSON.stringify(obj)).toString('base64url');
    return payload + '.' + sign(payload);
  }
  function decode(token) {
    if (!token || token.indexOf('.') < 0) return null;
    const i = token.lastIndexOf('.');
    const payload = token.slice(0, i);
    const mac = token.slice(i + 1);
    const expect = sign(payload);
    // 定长比较，防时序侧信道
    if (mac.length !== expect.length
      || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
    try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
    catch { return null; }
  }

  // ── Cookie 读写（不依赖 cookie-parser）──────────────────────────────────────
  function parseCookies(req) {
    const h = req.headers.cookie || '';
    const out = {};
    h.split(';').forEach((p) => {
      const i = p.indexOf('=');
      if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    });
    return out;
  }
  function appendCookie(res, cookieStr) {
    const prev = res.getHeader('Set-Cookie');
    if (!prev) res.setHeader('Set-Cookie', cookieStr);
    else res.setHeader('Set-Cookie', Array.isArray(prev) ? prev.concat(cookieStr) : [prev, cookieStr]);
  }
  function setCookie(res, name, value, ageMs) {
    const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
    if (secure) parts.push('Secure');
    if (ageMs != null) parts.push(`Max-Age=${Math.floor(ageMs / 1000)}`);
    appendCookie(res, parts.join('; '));
  }
  function clearCookie(res, name) {
    const parts = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
    if (secure) parts.push('Secure');
    appendCookie(res, parts.join('; '));
  }
  function currentUser(req) {
    const c = parseCookies(req);
    const sess = decode(c[SESS_COOKIE]);
    if (sess && sess.u && typeof sess.exp === 'number' && sess.exp > Date.now()) return sess.u;
    return null;
  }

  // ── 1) 发起登录：重定向到 CAS ───────────────────────────────────────────────
  function loginRedirect(req, res) {
    // 记住来路（?next= 或 Referer），登录后跳回
    const next = (req.query && req.query.next) || req.get('referer') || '';
    if (next && isSafeLocalPath(next)) setCookie(res, RET_COOKIE, encode({ to: next }), 10 * 60 * 1000);
    const to = `${casBaseUrl}/login?service=${encodeURIComponent(serviceUrl)}`;
    res.redirect(to);
  }

  // ── 2) 回调：校验 ticket → 建会话 ───────────────────────────────────────────
  async function handleCallback(req, res) {
    const ticket = req.query.ticket;
    if (!ticket) return res.status(400).send('缺少 ticket 参数');
    try {
      const xml = await httpsGet(
        `${casBaseUrl}${validatePath}?service=${encodeURIComponent(serviceUrl)}&ticket=${encodeURIComponent(ticket)}`
      );
      const result = parseCasXml(xml);
      if (!result.success) {
        return res.status(401).send(`CAS 验票失败：${result.code || 'UNKNOWN'} ${result.message || ''}`);
      }
      const user = mapUser({ username: result.user, attributes: result.attributes });
      setCookie(res, SESS_COOKIE, encode({ u: user, exp: Date.now() + maxAgeMs }), maxAgeMs);
      // 取回来路
      const c = parseCookies(req);
      const ret = decode(c[RET_COOKIE]);
      clearCookie(res, RET_COOKIE);
      const back = (ret && isSafeLocalPath(ret.to)) ? ret.to : '/journey.html';
      res.redirect(back);
    } catch (e) {
      res.status(502).send('CAS 验票请求异常：' + e.message);
    }
  }

  // ── 3) 保护路由的中间件 ─────────────────────────────────────────────────────
  function requireAuth(req, res, next) {
    const user = currentUser(req);
    if (user) { req.casUser = user; return next(); }
    if (isApiRequest(req)) {
      return res.status(401).json({ error: 'unauthorized', login: '/auth/cas/login' });
    }
    setCookie(res, RET_COOKIE, encode({ to: req.originalUrl }), 10 * 60 * 1000);
    return loginRedirect(req, res);
  }

  // 仅管理员
  function requireAdmin(req, res, next) {
    const user = currentUser(req);
    if (!user) {
      if (isApiRequest(req)) {
        return res.status(401).json({ error: 'unauthorized', login: '/auth/cas/login' });
      }
      setCookie(res, RET_COOKIE, encode({ to: req.originalUrl }), 10 * 60 * 1000);
      return loginRedirect(req, res);
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: '需要管理员权限' });
    }
    req.casUser = user;
    return next();
  }

  // ── 4) 注销（含 CAS 单点登出）───────────────────────────────────────────────
  function logout(req, res) {
    clearCookie(res, SESS_COOKIE);
    const home = serviceUrl.replace(/\/auth\/cas\/callback$/, '/');
    const casLogout = `${casBaseUrl}/logout?service=${encodeURIComponent(home)}`;
    res.redirect(casLogout);
  }

  // ── 5) 当前用户 ─────────────────────────────────────────────────────────────
  function me(req, res) {
    const user = currentUser(req);
    if (user) return res.json(user);
    return res.status(401).json({ error: 'unauthorized' });
  }

  return {
    loginRedirect, handleCallback, requireAuth, requireAdmin, logout, me,
    parseCasXml, currentUser,
  };
}

// 只允许站内路径回跳，防开放重定向
function isSafeLocalPath(p) {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');
}

// 判定是否 API 请求：用 originalUrl（挂载中间件里 req.path 是相对挂载点的，会误判）
function isApiRequest(req) {
  const u = req.originalUrl || req.url || req.path || '';
  return u.startsWith('/api/');
}

// 默认用户映射：取常见字段；命中 adminIds 则 role=admin
function defaultMapUser({ username, attributes }, adminIds = []) {
  return {
    id: username,
    name: pick(attributes, ['name', 'cn', 'displayName', 'realName']) || username,
    dept: pick(attributes, ['department', 'dept', 'deptName', 'orgName']) || '',
    email: pick(attributes, ['email', 'mail']) || '',
    role: adminIds.map(String).includes(String(username)) ? 'admin' : 'user',
    raw: attributes,
  };
}

function pick(obj, keys) {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  return '';
}

// ── 极简 CAS XML 解析（命名空间无关，适配 CAS 2.0/3.0）──────────────────────
function parseCasXml(xml) {
  if (!xml || typeof xml !== 'string') return { success: false, code: 'EMPTY' };
  const fail = xml.match(/authenticationFailure(?:\s+code=['"]([^'"]+)['"])?\s*>([\s\S]*?)<\/[\w:]*authenticationFailure>/i);
  if (fail) return { success: false, code: fail[1] || 'AUTH_FAILURE', message: (fail[2] || '').trim() };
  const userM = xml.match(/<[\w:]*user>\s*([\s\S]*?)\s*<\/[\w:]*user>/i);
  if (!userM) return { success: false, code: 'NO_USER' };
  const user = userM[1].trim();
  const attributes = {};
  const attrBlock = xml.match(/<[\w:]*attributes>([\s\S]*?)<\/[\w:]*attributes>/i);
  if (attrBlock) {
    const re = /<([\w:]+)>\s*([\s\S]*?)\s*<\/\1>/g;
    let m;
    while ((m = re.exec(attrBlock[1])) !== null) {
      const key = m[1].replace(/^[\w]+:/, '');
      attributes[key] = m[2].trim();
    }
  }
  return { success: true, user, attributes };
}

function httpsGet(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.get(
      { hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, timeout: 10000 },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

module.exports = { createCasAuth, parseCasXml };
