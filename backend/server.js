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
const { generateTemplateBuffer } = require('./templateGenerator');
const { listByStage } = require('../data/deliverableTemplates');
const { parseRequirement } = require('./requirementParser');
const { getJourney, buildLeadRadar, buildEnablement, scoreCustomerSuccess, buildBrandPreview } = require('./journeyEngine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

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
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: '缺少模板 key' });
    const { buffer, name } = await generateTemplateBuffer(key);
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

// 段1 · AI客户雷达：按行业+城市生成目标客户与触达话术
app.post('/api/lead/radar', (req, res) => {
  try {
    const result = buildLeadRadar(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    console.error('lead/radar失败:', e);
    res.status(500).json({ ok: false, error: '客户雷达生成失败', detail: e.message });
  }
});

// 段2 · 品牌升级一页纸内容预览（下载走 /api/generate/brand）
app.post('/api/brand/preview', (req, res) => {
  try {
    const result = buildBrandPreview(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    console.error('brand/preview失败:', e);
    res.status(500).json({ ok: false, error: '品牌内容生成失败', detail: e.message });
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

// 生成品牌一页纸 (.docx) —— 全链路第②段 品牌升级
app.post('/api/generate/brand', async (req, res) => {
  try {
    const { park, brief } = resolveRequest(req.body);
    if (!park) return res.status(404).json({ error: '未找到该园区，请选择园区或在需求中说明行业类型' });
    const buffer = await generateBrandBuffer(park, brief);
    const fname = encodeURIComponent(`${safeName(park.name)}-品牌一页纸.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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
