// 园区Skill智能方案生成平台 - 后端服务
// 提供数据查询 + 真实 Word/PPT/Excel 文档生成与下载
const express = require('express');
const cors = require('cors');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const { parks, phases, getPark } = require('../data/content');
const { tasks, versions, branches } = require('./adminData');
const { generateSolutionBuffer } = require('./docxGenerator');
const { generatePptBuffer } = require('./pptGenerator');
const { generatePlanBuffer } = require('./planGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// 安全文件名（去除特殊字符）
function safeName(s) {
  return String(s).replace(/[^\w\u4e00-\u9fa5\-]/g, '_');
}

// ---------- 数据查询 API ----------
app.get('/api/parks', (req, res) => res.json(parks));

app.get('/api/parks/:id', (req, res) => {
  const park = getPark(req.params.id);
  if (!park) return res.status(404).json({ error: '未找到该园区' });
  res.json(park);
});

app.get('/api/sales-phases', (req, res) => res.json(phases));

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime(), parks: parks.length });
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
  const branchListRaw = run('git branch -a --format=%(refname:short)');
  const branchList = branchListRaw ? branchListRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const logRaw = run('git log -15 --pretty=format:%h|%an|%ad|%s --date=short');
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
    const { parkId, version = '脱敏版' } = req.body;
    const park = getPark(parkId);
    if (!park) return res.status(404).json({ error: '未找到该园区' });
    const buffer = await generateSolutionBuffer(park, version);
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
    const { parkId, version = '脱敏版' } = req.body;
    const park = getPark(parkId);
    if (!park) return res.status(404).json({ error: '未找到该园区' });
    const buffer = await generatePptBuffer(park, version);
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
    const { parkId, version = '脱敏版' } = req.body;
    const park = getPark(parkId);
    if (!park) return res.status(404).json({ error: '未找到该园区' });
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

// 生成完整包 (.zip 包含 docx + pptx + xlsx)
app.post('/api/generate/complete-package', async (req, res) => {
  try {
    const { parkId, version = '脱敏版' } = req.body;
    const park = getPark(parkId);
    if (!park) return res.status(404).json({ error: '未找到该园区' });

    const [docBuf, pptBuf, planBuf] = await Promise.all([
      generateSolutionBuffer(park, version),
      generatePptBuffer(park, version),
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
