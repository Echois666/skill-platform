// 园区Skill智能方案生成平台 - 后端服务
// 提供数据查询 + 真实 Word/PPT/Excel 文档生成与下载
const express = require('express');
const cors = require('cors');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');
const fs = require('fs');

const { parks, phases, getPark } = require('../data/content');
const { tasks, versions, branches } = require('./adminData');
const { generateSolutionBuffer } = require('./docxGenerator');
const { generatePptBuffer } = require('./pptGenerator');
const { generatePlanBuffer } = require('./planGenerator');
const { generateBrandBuffer } = require('./brandGenerator');
const { generateOnePagerBuffer, buildOnePagerPreview } = require('./onePagerGenerator');
const { generateTemplateBuffer } = require('./templateGenerator');
const { listByStage } = require('../data/deliverableTemplates');
const { parseRequirement } = require('./requirementParser');
const { getJourney, buildLeadRadar, buildEnablement, scoreCustomerSuccess, buildBrandPreview } = require('./journeyEngine');
const { fetchTenderRadar } = require('./tenderRadar');
const { listSections, industryPresets, TAX_RATE } = require('../data/pricing');
const { generateQuoteBuffer, computeQuote, recommendQuoteSelections } = require('./quoteGenerator');
const { listByStage: listChangpingByStage } = require('../data/changpingTemplates');
const { generateChangpingTemplateBuffer, generateChangpingReferenceBuffer } = require('./changpingTemplateGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── ECP 单点登录（CAS）—— 功能开关，默认关闭 ────────────────────────────────
// 现状：CAS_ENABLED!=1 时完全不加载，对现有开放平台零影响。
// 开启（对方登记好 service + HTTPS 就绪后）：设置以下环境变量并重启即可，无需 npm install。
//   CAS_ENABLED=1
//   CAS_SERVICE_URL=https://www.echoswiki.com/auth/cas/callback   （必须与登记到CAS的一致）
//   CAS_SESSION_SECRET=<一段随机长字符串>                          （会话签名密钥，务必设置）
//   CAS_ADMIN_IDS=工号1,工号2                                     （可选：进后台的管理员工号）
//   CAS_BASE_URL=https://cas.51aes.com                            （可选，默认已是它）
//   CAS_VALIDATE_PATH=/p3/serviceValidate                         （可选，若对方只开 2.0 改 /serviceValidate）
if (process.env.CAS_ENABLED === '1') {
  const { createCasAuth } = require('./casAuth');
  const cas = createCasAuth({
    casBaseUrl: process.env.CAS_BASE_URL || 'https://cas.51aes.com',
    serviceUrl: process.env.CAS_SERVICE_URL || 'https://www.echoswiki.com/auth/cas/callback',
    validatePath: process.env.CAS_VALIDATE_PATH || '/p3/serviceValidate',
    sessionSecret: process.env.CAS_SESSION_SECRET,
    adminIds: (process.env.CAS_ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),
  });
  // 认证端点
  app.get('/auth/cas/login', cas.loginRedirect);
  app.get('/auth/cas/callback', cas.handleCallback);
  app.get('/auth/cas/logout', cas.logout);
  app.get('/api/me', cas.me);
  // 保护：后台页面 + 后台接口需管理员；方案/PPT 生成需登录（公开只读内容不拦）
  app.use('/admin.html', cas.requireAdmin);
  app.use('/api/admin', cas.requireAdmin);
  app.use('/api/generate', cas.requireAuth);
  console.log('[CAS] SSO 已启用 · service=' + (process.env.CAS_SERVICE_URL || 'default'));
} else {
  console.log('[CAS] SSO 未启用（设置 CAS_ENABLED=1 开启，其余功能照常公开访问）');
}

app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js')) {
      // Service Worker：正确 MIME + 允许根作用域 + 不被 HTTP 缓存卡住更新
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// 安全文件名（去除特殊字符）
function safeName(s) {
  return String(s).replace(/[^\w\u4e00-\u9fa5\-]/g, '_');
}

// 从请求体解析出 park 与 brief（支持自然语言需求）
function resolveRequest(body) {
  const { parkId, version = '专业版', requirement, client, projectName } = body || {};
  let park = parkId ? getPark(parkId) : null;
  let brief = null;
  if (requirement && String(requirement).trim()) {
    const parsed = parseRequirement(String(requirement));
    if (parsed.ok) {
      if (!park) park = getPark(parsed.parkId);
      brief = {
        rawText: String(requirement).trim(),
        client: client || parsed.client,
        projectName: projectName || parsed.projectName,
        emphases: parsed.emphases,
        focusScenarios: parsed.focusScenarios,
        understanding: parsed.understanding
      };
    }
  }
  if (!brief && (client || projectName)) {
    brief = { client, projectName };
  }
  return { park, version, brief };
}

// ---------- 数据查询 API ----------
app.get('/api/parks', (req, res) => res.json(parks));

app.get('/api/parks/:id', (req, res) => {
  const park = getPark(req.params.id);
  if (!park) return res.status(404).json({ error: '未找到该园区' });
  res.json(park);
});

app.get('/api/sales-phases', (req, res) => res.json(phases));

// ---------- 报价生成器 API ----------
// 返回产品报价清单结构（前端按板块渲染勾选项）
app.get('/api/pricing', (req, res) => {
  try {
    res.json({
      ok: true,
      taxRate: TAX_RATE,
      presets: industryPresets,
      sections: listSections()
    });
  } catch (e) {
    console.error('pricing失败:', e);
    res.status(500).json({ ok: false, error: '获取报价数据失败', detail: e.message });
  }
});

// 根据勾选项计算税前/含税报价预览
app.post('/api/quote/compute', (req, res) => {
  try {
    res.json({ ok: true, ...computeQuote(req.body || {}) });
  } catch (e) {
    console.error('quote/compute失败:', e);
    res.status(500).json({ ok: false, error: '报价计算失败', detail: e.message });
  }
});

// 根据自然语言需求推荐报价项（仅推荐，不默认锁定；前端仍可删改）
app.post('/api/quote/recommend', (req, res) => {
  try {
    const result = recommendQuoteSelections(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    console.error('quote/recommend失败:', e);
    res.status(500).json({ ok: false, error: '需求生成报价失败', detail: e.message });
  }
});

// 导出同格式 Excel 报价清单
app.post('/api/generate/quote', async (req, res) => {
  try {
    const { projectName, client } = req.body || {};
    const buffer = await generateQuoteBuffer(req.body || {});
    const baseName = projectName || client || '51WORLD产品报价清单';
    const fname = encodeURIComponent(`${safeName(baseName)}-产品报价清单.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('quote生成失败:', e);
    res.status(500).json({ ok: false, error: '报价清单生成失败', detail: e.message });
  }
});

// ---------- 昌平标准交付模板库 API（真实版式空白模板）----------
// 列出按 9 阶段分组的昌平标准模板
app.get('/api/changping/templates', (req, res) => {
  try {
    res.json({ ok: true, stages: listChangpingByStage() });
  } catch (e) {
    console.error('changping/templates失败:', e);
    res.status(500).json({ ok: false, error: '获取昌平模板失败', detail: e.message });
  }
});

// 下载昌平标准格式空白模板（封面+文档修改记录+目录+章节，复刻训练素材版式）
app.post('/api/generate/changping-template', async (req, res) => {
  try {
    const { key, topName, projName, dateName } = req.body || {};
    if (!key) return res.status(400).json({ error: '缺少模板 key' });
    const { buffer, name } = await generateChangpingTemplateBuffer(key, { topName, projName, dateName });
    const fname = encodeURIComponent(`${safeName(name)}（空白模板）.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('changping-template生成失败:', e);
    res.status(e.message && e.message.includes('未找到') ? 404 : 500).json({ error: '生成失败', detail: e.message });
  }
});

// 下载昌平脱敏参考版（真实交付正文脱敏后，套用同版式）
app.post('/api/generate/changping-reference', async (req, res) => {
  try {
    const { key, topName, projName, dateName } = req.body || {};
    if (!key) return res.status(400).json({ error: '缺少模板 key' });
    const { buffer, name } = await generateChangpingReferenceBuffer(key, { topName, projName, dateName });
    const fname = encodeURIComponent(`${safeName(name)}（脱敏参考版）.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('changping-reference生成失败:', e);
    res.status(e.message && (e.message.includes('未找到') || e.message.includes('暂无')) ? 404 : 500).json({ error: '生成失败', detail: e.message });
  }
});

// ---------- 交付物模板中心 API ----------
// 列出按阶段分组的交付物模板（含写作指南）
app.get('/api/deliverables', (req, res) => {
  try {
    res.json(listByStage());
  } catch (e) {
    console.error('deliverables失败:', e);
    res.status(500).json({ error: '获取交付物模板失败', detail: e.message });
  }
});

// 下载某个交付物的 Word 模板（含写作指引与占位）
app.post('/api/generate/template', async (req, res) => {
  try {
    const { key, client, projectName, parkId } = req.body || {};
    if (!key) return res.status(400).json({ error: '缺少模板 key' });
    const park = parkId ? getPark(parkId) : null;
    const { buffer, name } = await generateTemplateBuffer(key, {
      client,
      projectName,
      parkName: park ? park.name : ''
    });
    const fname = encodeURIComponent(`${safeName(name)}-模板.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('template生成失败:', e);
    res.status(e.message && e.message.includes('未找到') ? 404 : 500).json({ error: '生成失败', detail: e.message });
  }
});

// 列出某园区板块的可下载资料（脱敏方案/案例卡 PDF）
app.get('/api/materials/:parkId', (req, res) => {
  try {
    const parkId = String(req.params.parkId).replace(/[^\w\-]/g, '');
    const dir = path.join(__dirname, '..', 'public', 'materials', parkId);
    if (!fs.existsSync(dir)) return res.json({ parkId, files: [] });
    const files = fs.readdirSync(dir)
      .filter(f => /\.(pdf|pptx|docx|xlsx)$/i.test(f))
      .map(f => {
        const st = fs.statSync(path.join(dir, f));
        const ext = (f.split('.').pop() || '').toLowerCase();
        let kind = '资料';
        if (/案例卡/.test(f)) kind = '案例卡';
        else if (/解决方案|方案/.test(f)) kind = '解决方案';
        else if (/功能/.test(f)) kind = '功能介绍';
        else if (/一页纸/.test(f)) kind = '一页纸';
        return {
          name: f,
          ext,
          kind,
          sizeMB: +(st.size / 1024 / 1024).toFixed(1),
          url: `/materials/${parkId}/${encodeURIComponent(f)}`
        };
      })
      .sort((a, b) => b.sizeMB - a.sizeMB);
    res.json({ parkId, count: files.length, files });
  } catch (e) {
    console.error('读取资料失败:', e);
    res.status(500).json({ error: '读取资料失败', detail: e.message });
  }
});

// 解析自然语言需求 → 识别行业/客户/诉求/场景
app.post('/api/parse-requirement', (req, res) => {
  try {
    const { requirement } = req.body || {};
    const parsed = parseRequirement(requirement);
    if (!parsed.ok) return res.status(400).json(parsed);
    res.json(parsed);
  } catch (e) {
    console.error('需求解析失败:', e);
    res.status(500).json({ ok: false, error: '解析失败', detail: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime(), parks: parks.length });
});

// ---------- 全链路驾驶舱 API（挖掘客户 → 客户成功）----------
// 全链路蓝图：5段旅程 + 大湾区城市 + 商业模式
app.get('/api/journey', (req, res) => {
  try {
    res.json(getJourney());
  } catch (e) {
    console.error('journey失败:', e);
    res.status(500).json({ error: '获取全链路蓝图失败', detail: e.message });
  }
});

// 段1 · 实时招标雷达：从中国政府采购网抓取全网各行业真实招标公告
app.post('/api/lead/radar', async (req, res) => {
  try {
    const result = await fetchTenderRadar(req.body || {});
    if (!result.ok) return res.status(502).json(result);
    res.json(result);
  } catch (e) {
    console.error('招标雷达失败:', e);
    res.status(500).json({ ok: false, error: '实时招标数据获取失败', detail: e.message });
  }
});

// 段2 · 行业产品一页纸内容预览（下载走 /api/generate/onepager）
app.post('/api/brand/preview', (req, res) => {
  try {
    const { park } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ ok: false, error: '请选择有效的行业类型' });
    const result = buildOnePagerPreview(park);
    res.json(result);
  } catch (e) {
    console.error('onepager/preview失败:', e);
    res.status(500).json({ ok: false, error: '行业产品一页纸内容生成失败', detail: e.message });
  }
});

// 段4 · AI团队作战手册：按行业+受众生成话术/异议应对/Demo脚本
app.post('/api/enablement', (req, res) => {
  try {
    const result = buildEnablement(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    console.error('enablement失败:', e);
    res.status(500).json({ ok: false, error: '作战手册生成失败', detail: e.message });
  }
});

// 段5 · AI客户成功评分：健康度 + ROI + 增购建议
app.post('/api/customer-success/score', (req, res) => {
  try {
    const result = scoreCustomerSuccess(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    console.error('customer-success/score失败:', e);
    res.status(500).json({ ok: false, error: '客户成功评分失败', detail: e.message });
  }
});

// 阶段五 · 报价平台联动：先输出可追溯测算与后续报价平台接口字段
app.post('/api/quote/estimate', (req, res) => {
  try {
    const { parkId, edition = 'professional', modules = 8, complexity = 'normal' } = req.body || {};
    const park = getPark(parkId);
    if (!park) return res.status(404).json({ ok: false, error: '请选择有效行业' });

    const editionMap = {
      standard: { name: '标准版', base: 58, factor: 1 },
      professional: { name: '专业版', base: 88, factor: 1.35 },
      flagship: { name: '旗舰版', base: 138, factor: 1.85 }
    };
    const complexMap = {
      light: { name: '轻量', factor: 0.85, days: 0.8 },
      normal: { name: '标准', factor: 1, days: 1 },
      complex: { name: '复杂', factor: 1.35, days: 1.45 }
    };
    const ed = editionMap[edition] || editionMap.professional;
    const cx = complexMap[complexity] || complexMap.normal;
    const moduleCount = Math.max(3, Math.min(12, Number(modules) || 8));

    const software = Math.round(ed.base * ed.factor * cx.factor + moduleCount * 6);
    const delivery = Math.round((28 + moduleCount * 5) * cx.factor);
    const modelData = Math.round((18 + moduleCount * 4) * cx.factor);
    const integration = Math.round((16 + moduleCount * 3) * cx.factor);
    const total = software + delivery + modelData + integration;
    const low = Math.round(total * 0.9);
    const high = Math.round(total * 1.18);
    const manDays = Math.round((45 + moduleCount * 8) * cx.days);

    res.json({
      ok: true,
      industry: park.name,
      edition: ed.name,
      complexity: cx.name,
      modules: moduleCount,
      manDays,
      priceRange: `${low}-${high}万`,
      breakdown: [
        { name: '软件平台授权/行业IOC能力', amount: `${software}万` },
        { name: '实施交付与项目管理', amount: `${delivery}万` },
        { name: '数据治理/三维模型/场景配置', amount: `${modelData}万` },
        { name: '系统集成/接口联调/验收支持', amount: `${integration}万` }
      ],
      integrationFields: [
        'customerId / customerName',
        'industryId / industryName',
        'edition / moduleCount / moduleList',
        'deliveryComplexity / estimatedManDays',
        'softwareAmount / deliveryAmount / integrationAmount',
        'sourceRequirementId / solutionPackageId'
      ],
      note: '当前为售前快速测算口径，正式报价需对接报价平台价格表、折扣权限、软硬件清单和审批流。'
    });
  } catch (e) {
    console.error('quote/estimate失败:', e);
    res.status(500).json({ ok: false, error: '报价测算失败', detail: e.message });
  }
});

// ---------- 管理后台 API ----------
// 读取本地 Git 仓库的实时信息（固定命令，无外部输入，安全）
function readGitInfo() {
  const repoDir = path.join(__dirname, '..');
  const run = (cmd) => {
    try { return execSync(cmd, { cwd: repoDir, encoding: 'utf8', timeout: 4000 }).trim(); }
    catch (e) { return ''; }
  };
  const branch = run('git rev-parse --abbrev-ref HEAD') || 'unknown';
  const branchListRaw = run('git branch -a "--format=%(refname:short)"');
  const branchList = branchListRaw ? branchListRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const logRaw = run('git log -15 "--pretty=format:%h|%an|%ad|%s" --date=short');
  const commits = logRaw ? logRaw.split('\n').map(line => {
    const [hash, author, date, ...rest] = line.split('|');
    return { hash, author, date, message: rest.join('|') };
  }) : [];
  const lastCommit = commits[0] || null;
  return { branch, branchList, commits, lastCommit };
}

app.get('/api/admin/overview', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    service: {
      status: 'online',
      appVersion: require('../package.json').version,
      nodeVersion: process.version,
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
      memoryMB: +(mem.rss / 1024 / 1024).toFixed(1),
      parks: parks.length,
      phases: Object.keys(phases).length,
      serverTime: new Date().toISOString()
    },
    git: readGitInfo(),
    tasks,
    versions,
    branches
  });
});

// ---------- 文档生成与下载 ----------
// 生成方案文档 (.docx)
app.post('/api/generate/solution', async (req, res) => {
  try {
    const { park, version, brief } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ error: '未找到该园区，请选择园区或在需求中说明行业类型' });
    const buffer = await generateSolutionBuffer(park, version, brief);
    const fname = encodeURIComponent(`${safeName(park.name)}-解决方案-${safeName(version)}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('solution生成失败:', e);
    res.status(500).json({ error: '生成失败', detail: e.message });
  }
});

// 生成PPT (.pptx)
app.post('/api/generate/ppt', async (req, res) => {
  try {
    const { park, version, brief } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ error: '未找到该园区，请选择园区或在需求中说明行业类型' });
    const buffer = await generatePptBuffer(park, version, brief);
    const fname = encodeURIComponent(`${safeName(park.name)}-演示文稿-${safeName(version)}.pptx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('ppt生成失败:', e);
    res.status(500).json({ error: '生成失败', detail: e.message });
  }
});

// 生成实施计划 (.xlsx)
app.post('/api/generate/plan', async (req, res) => {
  try {
    const { park, version } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ error: '未找到该园区，请选择园区或在需求中说明行业类型' });
    const buffer = await generatePlanBuffer(park, version);
    const fname = encodeURIComponent(`${safeName(park.name)}-实施计划-${safeName(version)}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('plan生成失败:', e);
    res.status(500).json({ error: '生成失败', detail: e.message });
  }
});

// 生成行业产品一页纸 (.pptx 单页) —— 全链路第②段
app.post('/api/generate/onepager', async (req, res) => {
  try {
    const { park } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ error: '未找到该行业，请选择行业或在需求中说明行业类型' });
    const buffer = await generateOnePagerBuffer(park);
    const fname = encodeURIComponent(`${safeName(park.name)}-产品一页纸.pptx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('onepager生成失败:', e);
    res.status(500).json({ error: '生成失败', detail: e.message });
  }
});
// 兼容旧路径 /api/generate/brand → 行业产品一页纸
app.post('/api/generate/brand', async (req, res) => {
  try {
    const { park } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ error: '未找到该行业，请选择行业或在需求中说明行业类型' });
    const buffer = await generateOnePagerBuffer(park);
    const fname = encodeURIComponent(`${safeName(park.name)}-产品一页纸.pptx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fname}`);
    res.send(buffer);
  } catch (e) {
    console.error('brand生成失败:', e);
    res.status(500).json({ error: '生成失败', detail: e.message });
  }
});

// 生成完整包 (.zip 包含 docx + pptx + xlsx)
app.post('/api/generate/complete-package', async (req, res) => {
  try {
    const { park, version, brief } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ error: '未找到该园区，请选择园区或在需求中说明行业类型' });

    const [docBuf, pptBuf, planBuf] = await Promise.all([
      generateSolutionBuffer(park, version, brief),
      generatePptBuffer(park, version, brief),
      generatePlanBuffer(park, version)
    ]);

    const zipName = encodeURIComponent(`${safeName(park.name)}-完整方案包-${safeName(version)}.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${zipName}`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);
    archive.append(docBuf, { name: `${park.name}-解决方案-${version}.docx` });
    archive.append(pptBuf, { name: `${park.name}-演示文稿-${version}.pptx` });
    archive.append(planBuf, { name: `${park.name}-实施计划-${version}.xlsx` });
    await archive.finalize();
  } catch (e) {
    console.error('complete-package生成失败:', e);
    if (!res.headersSent) res.status(500).json({ error: '生成失败', detail: e.message });
  }
});

// SPA 兜底：未匹配的路由返回首页
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ 园区Skill平台已启动，端口: ${PORT}`);
  console.log(`   园区数量: ${parks.length}`);
});
