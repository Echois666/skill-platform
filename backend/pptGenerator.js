// PPT 生成器 v3 —— 对齐 51WORLD 2026 真实 PPT 风格
// 深色主题 + 图表 + 每能力/场景/案例独立页 + 嵌入真实 IOC 图片
'use strict';
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const { phases } = require('../data/content');
const KB = require('../data/knowledgeBase');

// ── 品牌色系（对齐 2026 PPT 提取色）────────────────────────────────────────
const C = {
  P:  '5B3AED', PD: '3D1FBF', PL: 'EDE9FE',  // 紫色系
  PK: 'EC4899',                                 // 粉色强调
  DK: '0D0F1A',                                 // 极深蓝黑（封面/闭幕）
  SB: '1E3A5F',                                 // 深钢蓝（政策页背景）
  SL: '2E4A7A',                                 // 钢蓝浅一点
  WH: 'FFFFFF', LG: 'F4F6FA', LGD: 'E8EDF5',  // 白/浅灰
  TX: '1E293B', GR: '64748B', GRL: '94A3B8',   // 文字色
  GN: '059669', GNL: 'D1FAE5',                  // 绿色
  RD: 'BE123C', RDL: 'FEE2E2',                  // 红色
  YL: 'D97706', YLL: 'FEF3C7',                  // 琥珀
  OR: 'EA580C',                                  // 橙色
  CY: '0891B2',                                  // 青色
  PR: '7E22CE',                                  // 深紫
};

// ── IOC 图片路径（从 2026 PPT 提取）────────────────────────────────────────
const ASSETS_DIR = path.join(__dirname, 'assets');
const IOC_IMG  = path.join(ASSETS_DIR, 'image96.png');
const IOC_AVAIL = fs.existsSync(IOC_IMG);

/** 行业配图回退映射：无专属配图的行业复用语义最接近行业的渲染图 */
const IMG_FALLBACK = {
  'smart-venue': 'smart-building',
  'smart-realestate': 'smart-building',
  'smart-park-public': 'smart-scenic',
  'smart-rural': 'smart-scenic',
  'smart-forestry': 'smart-scenic',
  'campus-construction': 'smart-campus',
};
const GLOBAL_IMG_POOL = ['smart-city', 'smart-park', 'smart-building'];

/** 读取某目录下的封面+渲染图，返回绝对路径数组 */
function readImgDir(parkId) {
  const dir = path.join(ASSETS_DIR, parkId || '');
  const imgs = [];
  try {
    if (fs.existsSync(dir)) {
      const cover = path.join(dir, 'cover.jpg');
      if (fs.existsSync(cover)) imgs.push(cover);
      for (let i = 1; i <= 6; i++) {
        const f = path.join(dir, `render${i}.jpg`);
        if (fs.existsSync(f)) imgs.push(f);
      }
    }
  } catch (e) { /* ignore */ }
  return imgs;
}

/** 加载某行业可用的真实渲染图，自身没有则按映射回退，确保每份方案都有充足配图 */
function loadVerticalImages(parkId) {
  let imgs = readImgDir(parkId);
  if (imgs.length >= 3) return imgs;
  // 一级回退：语义相近行业
  const fb = IMG_FALLBACK[parkId];
  if (fb) imgs = imgs.concat(readImgDir(fb));
  // 二级回退：全局通用数字孪生图池
  if (imgs.length < 5) {
    for (const g of GLOBAL_IMG_POOL) {
      if (g === parkId || g === fb) continue;
      imgs = imgs.concat(readImgDir(g));
      if (imgs.length >= 6) break;
    }
  }
  // 去重
  return Array.from(new Set(imgs));
}

// ── 工具函数 ────────────────────────────────────────────────────────────────

/** 创建深色节段分隔页 */
function addDivider(pres, no, title, enTitle, lead) {
  const s = pres.addSlide();
  s.background = { color: C.DK };
  // 左侧紫色色块
  s.addShape('rect', { x: 0, y: 0, w: 4.0, h: 7.5, fill: { color: C.P }, line: { type: 'none' } });
  // 大号半透明章节序号
  s.addText(no, { x: 0, y: 1.0, w: 4.0, h: 3.5, fontSize: 130, bold: true, align: 'center', valign: 'middle', color: 'FFFFFF', transparency: 70 });
  // 章节标题
  s.addText(title, { x: 4.5, y: 2.35, w: 8.3, h: 1.1, fontSize: 36, bold: true, color: 'FFFFFF' });
  s.addText(enTitle, { x: 4.5, y: 3.5, w: 8.3, h: 0.55, fontSize: 16, color: C.GRL, letterSpacingPt: 2 });
  // 底部装饰线
  s.addShape('rect', { x: 4.5, y: 4.25, w: 5.5, h: 0.06, fill: { color: C.PK }, line: { type: 'none' } });
  // 本章导读（叙事主线）
  if (lead) {
    s.addText('本章导读', { x: 4.5, y: 4.55, w: 8.0, h: 0.4, fontSize: 12, bold: true, color: 'A5B4FC' });
    s.addText(lead, { x: 4.5, y: 4.95, w: 8.2, h: 1.6, fontSize: 13, color: 'CBD5E1', valign: 'top', lineSpacingMultiple: 1.5 });
  }
  return s;
}

/** 每张内容页顶部标题栏 */
function addHeader(s, title, tag) {
  s.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.7, fill: { color: C.P }, line: { type: 'none' } });
  s.addText(title, { x: 0.45, y: 0, w: 10.5, h: 0.7, fontSize: 20, bold: true, color: 'FFFFFF', valign: 'middle' });
  if (tag) s.addText(tag, { x: 10.9, y: 0, w: 2.25, h: 0.7, fontSize: 11, color: 'DDD6FE', align: 'right', valign: 'middle' });
}

/** 带编号圆圈 */
function numCircle(s, num, x, y, r, bg, fg) {
  s.addShape('ellipse', { x, y, w: r * 2, h: r * 2, fill: { color: bg || C.P }, line: { type: 'none' } });
  s.addText(String(num), { x, y, w: r * 2, h: r * 2, fontSize: r * 26, bold: true, align: 'center', valign: 'middle', color: fg || 'FFFFFF' });
}

/** 数字指标卡 */
function addMetricBox(s, value, label, desc, x, y, w, h, dark) {
  const bg = dark ? C.DK : C.P;
  const vColor = dark ? '34D399' : 'FFFFFF';
  s.addShape('roundRect', { x, y, w, h, fill: { color: bg }, line: { type: 'none' }, rectRadius: 0.1 });
  s.addText(value, { x, y: y + 0.2, w, h: h * 0.45, fontSize: 34, bold: true, align: 'center', valign: 'middle', color: vColor });
  s.addText(label, { x, y: y + h * 0.52, w, h: h * 0.25, fontSize: 14, bold: true, align: 'center', color: 'FFFFFF' });
  if (desc) s.addText(desc, { x: x + 0.1, y: y + h * 0.77, w: w - 0.2, h: h * 0.2, fontSize: 9.5, align: 'center', color: 'CBD5E1' });
}

// ── 主函数 ──────────────────────────────────────────────────────────────────
async function generatePptBuffer(park, version, brief) {
  const kb = KB.getKB(park.id) || {};
  const projectName = (brief && brief.projectName) || `${park.name}数字化解决方案`;
  const focus = (brief && brief.focusScenarios) || [];
  const imgPool = loadVerticalImages(park.id);
  let imgIdx = 0;
  const nextImg = () => imgPool.length ? imgPool[(imgIdx++) % imgPool.length] : null;
  const pres = new pptxgen();
  pres.author = KB.company.shortName;
  pres.title = projectName;
  pres.layout = 'LAYOUT_WIDE';
  let s;

  // ══════════════════════════════════════
  // 1. 封面（真实渲染大图 + 深色叠加）
  // ══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DK };
  const heroImg = nextImg();
  if (heroImg) {
    // 右侧真实渲染大图（全高）
    s.addImage({ path: heroImg, x: 5.0, y: 0, w: 8.33, h: 7.5, sizing: { type: 'cover', w: 8.33, h: 7.5 } });
    // 左侧深色渐变遮罩，保证文字清晰
    s.addShape('rect', { x: 0, y: 0, w: 5.6, h: 7.5, fill: { color: C.DK }, line: { type: 'none' } });
    s.addShape('rect', { x: 5.6, y: 0, w: 1.6, h: 7.5, fill: { color: C.DK, transparency: 35 }, line: { type: 'none' } });
  }
  // 底部色条
  s.addShape('rect', { x: 0, y: 6.6, w: 13.33, h: 0.9, fill: { color: C.P, transparency: heroImg ? 15 : 0 }, line: { type: 'none' } });
  // AI 大字
  s.addText('AI', { x: 0.5, y: 0.7, w: 2.5, h: 1.3, fontSize: 80, bold: true, color: C.PK });
  s.addShape('rect', { x: 0.6, y: 2.0, w: 1.4, h: 0.05, fill: { color: C.PK }, line: { type: 'none' } });
  // 公司名称
  s.addText('北京五一视界数字孪生科技股份有限公司', { x: 0.6, y: 2.15, w: 4.6, h: 0.5, fontSize: 12, color: C.GRL });
  s.addText('51WORLD · 克隆地球5.1亿平方公里', { x: 0.6, y: 2.6, w: 4.6, h: 0.4, fontSize: 11, color: C.GR });
  // 主标题
  s.addText('赋能\n' + park.name, { x: 0.6, y: 3.2, w: 4.8, h: 2.0, fontSize: 40, bold: true, color: 'FFFFFF', lineSpacingMultiple: 1.1 });
  s.addText('综合解决方案', { x: 0.6, y: 5.1, w: 4.8, h: 0.7, fontSize: 24, bold: true, color: 'A5B4FC' });
  // 底部色条文字
  s.addText(projectName, { x: 0.5, y: 6.6, w: 8.5, h: 0.9, fontSize: 14, bold: true, color: 'FFFFFF', valign: 'middle' });
  s.addText(version + '  ·  ' + new Date().toLocaleDateString('zh-CN'), { x: 9.0, y: 6.6, w: 4.0, h: 0.9, fontSize: 12, color: 'EEEAFE', align: 'right', valign: 'middle' });

  // ══════════════════════════════════════
  // 2. 目录（深色风格 + 5个数字圆圈）
  // ══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: '0A0E1A' };
  s.addText('目录', { x: 1.0, y: 0.55, w: 4, h: 0.8, fontSize: 34, bold: true, color: 'FFFFFF' });
  s.addText('CATALOG', { x: 1.0, y: 1.2, w: 4, h: 0.4, fontSize: 13, color: C.GRL, letterSpacingPt: 3 });
  s.addShape('rect', { x: 1.0, y: 1.62, w: 2.5, h: 0.05, fill: { color: C.PK }, line: { type: 'none' } });
  const tocItems = [
    { no: '01', title: '行业态势与政策背景', en: 'Industry Trends' },
    { no: '02', title: '行业现状与痛点分析', en: 'Current Status & Pain Points' },
    { no: '03', title: '核心产品能力', en: 'Core Capabilities' },
    { no: '04', title: 'ALL-IN-ONE 解决方案', en: 'All-in-One Solution' },
    { no: '05', title: '落地案例与建设价值', en: 'Use Cases & Value' },
  ];
  tocItems.forEach((item, i) => {
    const y = 1.9 + i * 1.0;
    const isActive = i === 0;
    s.addShape('roundRect', { x: 1.0, y, w: 11.1, h: 0.82, fill: { color: isActive ? C.P : '1A1F35' }, line: { type: 'none' }, rectRadius: 0.08 });
    s.addShape('rect', { x: 1.0, y: y + 0.35, w: 0.06, h: 0.12, fill: { color: C.PK }, line: { type: 'none' } });
    s.addText(item.no, { x: 1.15, y, w: 0.85, h: 0.82, fontSize: 22, bold: true, color: isActive ? 'FFFFFF' : C.P, valign: 'middle', align: 'center' });
    s.addText(item.title, { x: 2.1, y, w: 6.8, h: 0.52, fontSize: 17, bold: true, color: 'FFFFFF', valign: 'bottom' });
    s.addText(item.en, { x: 2.1, y: y + 0.5, w: 6.8, h: 0.3, fontSize: 11, color: C.GRL, valign: 'top' });
    s.addText(item.no, { x: 9.8, y, w: 2.1, h: 0.82, fontSize: 32, bold: true, color: isActive ? 'DDD6FE' : '252B45', align: 'right', valign: 'middle', transparency: isActive ? 50 : 30 });
  });

  // ══════════════════════════════════════
  // Section 1 分隔页
  // ══════════════════════════════════════
  addDivider(pres, '01', '行业态势与政策背景', 'Industry Trends & Policy',
    '从国家政策与市场机遇切入，回答"为什么现在要建" —— 政策强力驱动叠加数字孪生技术成熟，' + park.name + '正进入高标准、高质量发展的新周期。');

  // ══════════════════════════════════════
  // 3. 政策驱动（深钢蓝背景，对齐真实 PPT）
  // ══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.SB };
  s.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.75, fill: { color: '162D4A' }, line: { type: 'none' } });
  s.addText('政策强力驱动，数字孪生引领' + park.name + '进入高标准发展新周期', { x: 0.45, y: 0, w: 12.4, h: 0.75, fontSize: 17, bold: true, color: 'FFFFFF', valign: 'middle' });
  const policies = (kb.policies && kb.policies.length) ? kb.policies : KB.industryTrends.policies;
  // 左侧行业背景摘要
  s.addShape('roundRect', { x: 0.3, y: 0.9, w: 4.5, h: 5.9, fill: { color: '162D4A' }, line: { type: 'none' }, rectRadius: 0.1 });
  s.addText('行业背景', { x: 0.55, y: 1.0, w: 4.0, h: 0.45, fontSize: 15, bold: true, color: 'A5B4FC' });
  s.addShape('rect', { x: 0.55, y: 1.5, w: 1.8, h: 0.04, fill: { color: C.PK }, line: { type: 'none' } });
  s.addText(kb.background || KB.industryTrends.intro, { x: 0.5, y: 1.6, w: 4.1, h: 5.1, fontSize: 10.5, color: 'CBD5E1', valign: 'top', lineSpacingMultiple: 1.5 });
  // 右侧政策时间线（最多5条）
  s.addText('核心政策', { x: 5.2, y: 0.9, w: 7.8, h: 0.45, fontSize: 15, bold: true, color: 'A5B4FC' });
  const policyColors = [C.P, C.PK, C.CY, C.GN, C.YL];
  policies.slice(0, 5).forEach((p, i) => {
    const py = 1.5 + i * 1.05;
    // 左侧色条
    s.addShape('rect', { x: 5.1, y: py, w: 0.06, h: 0.78, fill: { color: policyColors[i % 5] }, line: { type: 'none' } });
    s.addShape('roundRect', { x: 5.25, y: py, w: 7.8, h: 0.78, fill: { color: '1D3558' }, line: { type: 'none' }, rectRadius: 0.06 });
    // 截取政策年份
    const yearMatch = p.match(/\d{4}/);
    const yr = yearMatch ? yearMatch[0] : '';
    s.addText(yr, { x: 5.35, y: py + 0.05, w: 0.85, h: 0.32, fontSize: 17, bold: true, color: policyColors[i % 5] });
    s.addText(p.replace(/（\d{4}.*?）/g, '').substring(0, 80), { x: 5.35, y: py + 0.38, w: 7.5, h: 0.38, fontSize: 9.5, color: 'CBD5E1', valign: 'top' });
  });

  // ══════════════════════════════════════
  // 4. 市场机遇（含柱状图）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '市场机遇 —— 高速增长的数字孪生园区市场', 'Market Opportunity');
  // 左侧大数字
  s.addShape('roundRect', { x: 0.3, y: 0.85, w: 3.8, h: 2.6, fill: { color: C.P }, line: { type: 'none' }, rectRadius: 0.12 });
  s.addText('2000+', { x: 0.3, y: 1.0, w: 3.8, h: 1.2, fontSize: 52, bold: true, align: 'center', valign: 'middle', color: 'FFFFFF' });
  s.addText('累计落地项目数', { x: 0.3, y: 2.05, w: 3.8, h: 0.5, fontSize: 14, align: 'center', color: 'DDD6FE' });
  s.addText('覆盖19个国家和地区', { x: 0.3, y: 2.55, w: 3.8, h: 0.35, fontSize: 11, align: 'center', color: 'A5B4FC' });
  // 三大优势指标
  [
    { v: '650+', l: '化工园区市场', c: C.PK },
    { v: '628', l: '国家级经开区', c: C.CY },
    { v: '3012', l: '高校校园', c: C.GN },
  ].forEach((m, i) => {
    const mx = 0.3 + i * 1.3;
    s.addShape('roundRect', { x: mx, y: 3.6, w: 1.15, h: 1.3, fill: { color: '1A1F35' }, line: { color: m.c, width: 1 }, rectRadius: 0.08 });
    s.addText(m.v, { x: mx, y: 3.68, w: 1.15, h: 0.65, fontSize: 20, bold: true, align: 'center', color: m.c });
    s.addText(m.l, { x: mx, y: 4.3, w: 1.15, h: 0.5, fontSize: 8, align: 'center', color: C.GRL });
  });
  if (kb.marketData) {
    s.addShape('roundRect', { x: 0.3, y: 5.15, w: 3.8, h: 1.6, fill: { color: '1A1F35' }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addText('本行业市场', { x: 0.45, y: 5.22, w: 3.5, h: 0.35, fontSize: 11, bold: true, color: C.PK });
    s.addText(kb.marketData, { x: 0.45, y: 5.58, w: 3.5, h: 1.1, fontSize: 9, color: 'CBD5E1', valign: 'top', lineSpacingMultiple: 1.3 });
  }
  // 柱状图（市场规模预测）
  const chartData = [{
    name: '数字孪生园区市场规模(亿元)',
    labels: ['2022', '2023', '2024', '2025E', '2026E', '2027E'],
    values: [280, 420, 580, 780, 1050, 1380]
  }];
  s.addChart('bar', chartData, {
    x: 4.4, y: 0.85, w: 8.6, h: 5.6,
    barDir: 'col',
    chartColors: [C.P],
    chartColorsOpacity: 85,
    showTitle: false,
    showValue: true,
    dataLabelColor: C.TX,
    dataLabelFontSize: 10,
    dataLabelFontBold: true,
    valAxisLabelFontSize: 11,
    catAxisLabelFontSize: 12,
    catAxisLabelColor: C.TX,
    valAxisLabelColor: C.GR,
    plotAreaFillColor: 'F8FAFC',
    plotAreaFillTransparency: 0,
  });

  // ══════════════════════════════════════
  // Section 2 分隔页
  // ══════════════════════════════════════
  addDivider(pres, '02', '行业现状与痛点分析', 'Current Status & Pain Points',
    '直面行业当前的核心挑战 —— 系统分散、数据孤岛、被动管理、安全压力，' +
    '逐条剖析痛点根因，并给出 51WORLD 以品牌力、实战力、产品力支撑的破局思路。');

  // ══════════════════════════════════════
  // 5. 行业痛点（深色卡片风格）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '建设需求增长，行业面临多重挑战', 'Industry Challenges');
  // 行业专属痛点优先（来源：各行业脱敏方案"行业痛点/挑战"页），无则回退共性痛点
  const vPains = (kb.pains && kb.pains.length) ? kb.pains : KB.commonPains;
  const pains = vPains.slice(0, 6);
  const painColors = [C.RD, C.OR, C.YL, C.P, C.CY, C.GN];
  const painIcons = ['🧩', '📊', '👷', '📉', '🛡️', '⚙️'];
  const painFix = ['统一三维底座融合', '数据汇聚智能分析', 'AI 自动巡检预警', '精细化智能运营', '安全双控数字管控', '设备联防联动'];
  pains.forEach((x, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const px = 0.3 + col * 4.37, py = 0.88 + row * 3.05;
    s.addShape('roundRect', { x: px, y: py, w: 4.1, h: 2.8, fill: { color: 'FFFFFF' }, line: { color: painColors[i], width: 1 }, rectRadius: 0.1 });
    // 顶部色条
    s.addShape('rect', { x: px, y: py, w: 4.1, h: 0.06, fill: { color: painColors[i] }, line: { type: 'none' } });
    // 图标徽章
    s.addShape('roundRect', { x: px + 0.22, y: py + 0.22, w: 0.64, h: 0.64, fill: { color: painColors[i] }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addText(painIcons[i] || '•', { x: px + 0.22, y: py + 0.22, w: 0.64, h: 0.64, fontSize: 22, align: 'center', valign: 'middle' });
    s.addText('痛点 0' + (i + 1), { x: px + 0.98, y: py + 0.24, w: 2.9, h: 0.28, fontSize: 9.5, bold: true, color: painColors[i] });
    s.addText(x.title, { x: px + 0.98, y: py + 0.5, w: 2.95, h: 0.42, fontSize: 13, bold: true, color: C.TX, valign: 'middle' });
    s.addText(x.desc || '依赖人力管理，缺乏数字化手段，效率低且难以实现精细化运营管控。', { x: px + 0.24, y: py + 1.02, w: 3.62, h: 1.05, fontSize: 10, color: C.GR, valign: 'top', lineSpacingMultiple: 1.4 });
    // 数字孪生应对（填充底部 + 痛点→方案叙事）
    s.addShape('roundRect', { x: px + 0.24, y: py + 2.12, w: 3.62, h: 0.52, fill: { color: 'F1EEFE' }, line: { type: 'none' }, rectRadius: 0.06 });
    s.addText([
      { text: '孪生应对  ', options: { bold: true, color: painColors[i] } },
      { text: x.fix || painFix[i] || '数字化智能管控', options: { color: C.TX } }
    ], { x: px + 0.4, y: py + 2.12, w: 3.4, h: 0.52, fontSize: 9.5, valign: 'middle' });
  });
  if (brief && brief.emphases && brief.emphases.length) {
    s.addShape('roundRect', { x: 0.3, y: 6.95, w: 12.7, h: 0.42, fill: { color: 'EDE9FE' }, line: { type: 'none' }, rectRadius: 0.06 });
    s.addText('客户核心诉求：' + brief.emphases.join('　|　'), { x: 0.5, y: 6.95, w: 12.3, h: 0.42, fontSize: 12, bold: true, color: C.P, valign: 'middle' });
  }

  // ══════════════════════════════════════
  // 6. 51WORLD 的解答（三大核心优势）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '51WORLD 的解答 —— 品牌力 · 实战力 · 产品力', '51WORLD Response');
  s.addText(KB.company.intro, { x: 0.4, y: 0.85, w: 12.5, h: 0.75, fontSize: 11, color: C.GR, valign: 'top', lineSpacingMultiple: 1.4 });
  KB.company.advantages.forEach((adv, i) => {
    const bx = 0.4 + i * 4.3;
    const cols = [C.P, C.PK, C.CY];
    s.addShape('roundRect', { x: bx, y: 1.75, w: 4.1, h: 5.35, fill: { color: i === 0 ? C.P : 'F0F4FF' }, line: { type: 'none' }, rectRadius: 0.12 });
    const titleColor = i === 0 ? 'FFFFFF' : C.P;
    const bodyColor  = i === 0 ? 'DDD6FE' : C.TX;
    const iconColor  = i === 0 ? 'DDD6FE' : cols[i];
    s.addText(['引领品牌力', '标杆实战力', '卓越产品力'][i], { x: bx + 0.25, y: 1.92, w: 3.6, h: 0.6, fontSize: 18, bold: true, color: titleColor });
    s.addShape('rect', { x: bx + 0.25, y: 2.55, w: 1.6, h: 0.05, fill: { color: i === 0 ? 'DDD6FE' : C.PK }, line: { type: 'none' } });
    s.addText(adv, { x: bx + 0.25, y: 2.72, w: 3.6, h: 4.15, fontSize: 10.5, color: bodyColor, valign: 'top', lineSpacingMultiple: 1.6 });
  });

  // ══════════════════════════════════════
  // Section 3 分隔页
  // ══════════════════════════════════════
  addDivider(pres, '03', '核心产品能力', 'Core Product Capabilities',
    '回答"用什么建" —— 以 AES6.0 数字底座、WDP 平台、ISE 仿真引擎、51Daas 数字资产、' +
    'Clonova 空间孪生智能五大核心产品，构筑统一、开放、可成长的数字孪生技术底盘。');

  // ══════════════════════════════════════
  // 7. 每个核心能力独立一页
  // ══════════════════════════════════════
  KB.capabilities.forEach((cap, ci) => {
    s = pres.addSlide();
    const capColors = [C.P, C.PK, C.CY, C.GN, C.YL];
    const cc = capColors[ci % capColors.length];
    addHeader(s, cap.name + ' —— ' + cap.en, `核心能力 ${ci + 1}/5`);
    // 左侧深色卡片
    s.addShape('roundRect', { x: 0.3, y: 0.85, w: 4.3, h: 6.45, fill: { color: C.DK }, line: { type: 'none' }, rectRadius: 0.12 });
    s.addShape('ellipse', { x: 0.9, y: 1.05, w: 0.7, h: 0.7, fill: { color: cc }, line: { type: 'none' } });
    s.addText(String(ci + 1), { x: 0.9, y: 1.05, w: 0.7, h: 0.7, fontSize: 18, bold: true, align: 'center', valign: 'middle', color: 'FFFFFF' });
    s.addText(cap.name, { x: 0.45, y: 1.85, w: 3.95, h: 1.0, fontSize: 16, bold: true, color: 'FFFFFF', lineSpacingMultiple: 1.2 });
    s.addText(cap.en, { x: 0.45, y: 2.9, w: 3.95, h: 0.38, fontSize: 11, color: C.GRL });
    s.addShape('rect', { x: 0.45, y: 3.32, w: 2.5, h: 0.05, fill: { color: cc }, line: { type: 'none' } });
    s.addText(cap.desc, { x: 0.45, y: 3.45, w: 3.9, h: 3.6, fontSize: 10, color: 'CBD5E1', valign: 'top', lineSpacingMultiple: 1.55 });
    // 右侧核心要点
    s.addText('核心能力亮点', { x: 4.9, y: 0.88, w: 8.1, h: 0.42, fontSize: 14, bold: true, color: C.TX });
    cap.points.forEach((pt, pi) => {
      const py = 1.4 + pi * 1.35;
      s.addShape('roundRect', { x: 4.9, y: py, w: 8.1, h: 1.2, fill: { color: C.LG }, line: { color: cc, width: 1, transparency: 65 }, rectRadius: 0.08 });
      s.addShape('rect', { x: 4.9, y: py, w: 0.06, h: 1.2, fill: { color: cc }, line: { type: 'none' } });
      s.addShape('ellipse', { x: 5.1, y: py + 0.35, w: 0.4, h: 0.4, fill: { color: cc }, line: { type: 'none' } });
      s.addText(String(pi + 1), { x: 5.1, y: py + 0.35, w: 0.4, h: 0.4, fontSize: 12, bold: true, align: 'center', valign: 'middle', color: 'FFFFFF' });
      s.addText(pt, { x: 5.65, y: py + 0.1, w: 7.1, h: 1.0, fontSize: 11, color: C.TX, valign: 'middle', lineSpacingMultiple: 1.3 });
    });
  });

  // ══════════════════════════════════════
  // 8. 标准建设与实战力
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '标准建设 —— 引领行业发展，参与顶层标准制定', 'Standards & Track Record');
  // 实战力卡片
  s.addShape('roundRect', { x: 0.3, y: 0.85, w: 12.7, h: 0.9, fill: { color: C.P }, line: { type: 'none' }, rectRadius: 0.09 });
  s.addText('⭐  ' + KB.company.scale, { x: 0.55, y: 0.85, w: 12.2, h: 0.9, fontSize: 11.5, bold: true, color: 'FFFFFF', valign: 'middle' });
  // 标准统计
  [['10+', '国家标准'], ['2', '行业标准'], ['20+', '团体标准'], ['20+', '白皮书']].forEach((m, i) => {
    const mx = 0.3 + i * 3.2;
    s.addShape('roundRect', { x: mx, y: 1.9, w: 3.0, h: 1.6, fill: { color: 'EDE9FE' }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addText(m[0], { x: mx, y: 1.95, w: 3.0, h: 0.85, fontSize: 38, bold: true, align: 'center', color: C.P });
    s.addText(m[1], { x: mx, y: 2.75, w: 3.0, h: 0.65, fontSize: 13, align: 'center', color: C.GR });
  });
  // 高亮标准列表
  KB.standards.highlights.forEach((h, i) => {
    const hy = 3.68 + i * 0.78;
    s.addShape('roundRect', { x: 0.3, y: hy, w: 12.7, h: 0.68, fill: { color: i % 2 === 0 ? C.LG : 'FFFFFF' }, line: { type: 'none' }, rectRadius: 0.06 });
    s.addShape('rect', { x: 0.3, y: hy, w: 0.06, h: 0.68, fill: { color: [C.P, C.PK, C.CY, C.GN, C.YL][i % 5] }, line: { type: 'none' } });
    s.addText(h, { x: 0.5, y: hy + 0.06, w: 12.3, h: 0.55, fontSize: 9.5, color: C.TX, valign: 'middle' });
  });

  // ══════════════════════════════════════
  // Section 4 分隔页
  // ══════════════════════════════════════
  addDivider(pres, '04', 'ALL-IN-ONE 解决方案', 'All-in-One Solution',
    '回答"怎么建" —— 从一体化技术架构到 IOC 智慧驾驶舱，再到围绕' + park.name +
    '核心业务的全场景智能应用，形成"一个底座 + N 项应用"的一张图整体方案。');

  // ══════════════════════════════════════
  // 9. 技术架构（6层可视化）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '方案架构 —— AI + WDP + Clonova 一体化数字孪生平台', 'Solution Architecture');
  // 架构层（从上往下渐变，宽度有变化）
  const archColors  = ['4F46E5', '6D28D9', '0891B2', '059669', '16A34A', 'D97706'];
  const archWidths  = [11.5, 11.8, 12.0, 12.2, 12.4, 12.7];
  const archLeft    = (w) => (13.33 - w) / 2;
  KB.architecture.forEach((layer, i) => {
    const ly = 0.85 + i * 1.0;
    const lw = archWidths[i], lx = archLeft(lw);
    s.addShape('roundRect', { x: lx, y: ly, w: lw, h: 0.88, fill: { color: archColors[i] }, line: { type: 'none' }, rectRadius: 0.06 });
    s.addText(layer.layer, { x: lx + 0.2, y: ly, w: 2.8, h: 0.88, fontSize: 13, bold: true, color: 'FFFFFF', valign: 'middle' });
    s.addShape('rect', { x: lx + 3.0, y: ly + 0.32, w: 0.04, h: 0.24, fill: { color: 'FFFFFF', transparency: 40 }, line: { type: 'none' } });
    s.addText(layer.desc, { x: lx + 3.2, y: ly, w: lw - 3.4, h: 0.88, fontSize: 10.5, color: 'E0E7FF', valign: 'middle', lineSpacingMultiple: 1.2 });
  });
  // 左侧数据流箭头
  s.addShape('rect', { x: 0.08, y: 0.88, w: 0.22, h: 5.9, fill: { color: C.PK }, line: { type: 'none' } });
  s.addText('数\n据\n流', { x: 0.0, y: 1.8, w: 0.38, h: 2.5, fontSize: 9, bold: true, align: 'center', color: 'FFFFFF', lineSpacingMultiple: 1.2 });

  // ══════════════════════════════════════
  // 10. IOC 标准应用（8大应用 + 真实图片或精美卡片）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '园区 IOC 智慧驾驶舱 —— 八大标准应用', 'IOC Standard Applications');
  s.addText('通过智慧园区建设实现对外服务的形象提升、对内运营的降本增效，实现员工以人为本、管理效益优先。', { x: 0.3, y: 0.8, w: 12.7, h: 0.42, fontSize: 11, color: C.GR, valign: 'middle' });
  // 顶部数字孪生实景横幅（替换原黑底 logo 图）
  const iocBanner = imgPool.length ? imgPool[imgPool.length - 1] : null;
  let iocTop = 1.3;
  if (iocBanner) {
    s.addImage({ path: iocBanner, x: 0.3, y: 1.28, w: 12.73, h: 1.7, sizing: { type: 'cover', w: 12.73, h: 1.7 } });
    s.addShape('rect', { x: 0.3, y: 1.28, w: 4.6, h: 1.7, fill: { color: C.DK, transparency: 25 }, line: { type: 'none' } });
    s.addText('IOC 智慧驾驶舱 · 一屏掌控园区运行态势', { x: 0.55, y: 1.28, w: 6.5, h: 1.7, fontSize: 15, bold: true, color: 'FFFFFF', valign: 'middle' });
    iocTop = 3.2;
  }
  const iocColors = [C.P, C.PK, C.CY, C.GN, C.YL, C.OR, C.RD, C.PR];
  const iocIcons = ['📊', '🛡️', '🚦', '📦', '🔔', '⚡', '🔧', '🏢'];
  const iocCardH = (7.32 - iocTop - 0.2) / 2 - 0.15;
  KB.iocApps.slice(0, 8).forEach((a, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const ix = 0.3 + col * 3.19, iy = iocTop + row * (iocCardH + 0.2);
    s.addShape('roundRect', { x: ix, y: iy, w: 3.0, h: iocCardH, fill: { color: 'F4F6FA' }, line: { color: iocColors[i], width: 1 }, rectRadius: 0.1 });
    s.addShape('rect', { x: ix, y: iy, w: 3.0, h: 0.06, fill: { color: iocColors[i] }, line: { type: 'none' } });
    s.addShape('roundRect', { x: ix + 0.18, y: iy + 0.2, w: 0.6, h: 0.6, fill: { color: iocColors[i] }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addText(iocIcons[i] || '◆', { x: ix + 0.18, y: iy + 0.2, w: 0.6, h: 0.6, fontSize: 20, align: 'center', valign: 'middle' });
    s.addText(a.name, { x: ix + 0.9, y: iy + 0.2, w: 2.0, h: 0.6, fontSize: 13.5, bold: true, color: C.TX, valign: 'middle' });
    s.addText(a.desc, { x: ix + 0.18, y: iy + 0.92, w: 2.66, h: iocCardH - 1.05, fontSize: 9.5, color: C.GR, valign: 'top', lineSpacingMultiple: 1.3 });
  });

  // ══════════════════════════════════════
  // 11. 方案价值（4项核心价值）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '方案价值 —— 数字孪生赋能园区四大核心价值', 'Solution Value');
  const solutionValues = [
    { icon: '👁', title: '全域可视', desc: '园区所有子系统数据融合汇聚，一张图实时呈现运行状态，无死角全掌控。', color: C.P },
    { icon: '🔮', title: '智慧管控', desc: 'AI 算法融合多源数据进行智能预警、异常分析和自动处置，从被动响应到主动预防。', color: C.PK },
    { icon: '🔄', title: '降本增效', desc: '流程自动化与智能调度减少人力依赖，能耗精细化管理显著降低运营成本。', color: C.CY },
    { icon: '🌱', title: '绿色安全', desc: '碳排放实时核算、能耗双控合规监管、应急一键指挥，助力安全绿色可持续运营。', color: C.GN },
  ];
  solutionValues.forEach((v, i) => {
    const vx = 0.3 + i * 3.2;
    s.addShape('roundRect', { x: vx, y: 0.85, w: 3.0, h: 6.35, fill: { color: i === 0 ? C.P : 'FFFFFF' }, line: { color: v.color, width: 1, transparency: 65 }, rectRadius: 0.12 });
    const tc = i === 0 ? 'FFFFFF' : C.TX;
    const dc = i === 0 ? 'DDD6FE' : C.GR;
    s.addText(v.icon, { x: vx, y: 1.15, w: 3.0, h: 0.75, fontSize: 32, align: 'center', valign: 'middle' });
    s.addText(v.title, { x: vx + 0.15, y: 2.0, w: 2.7, h: 0.65, fontSize: 20, bold: true, align: 'center', color: i === 0 ? 'FFFFFF' : v.color });
    s.addShape('rect', { x: vx + 0.8, y: 2.7, w: 1.4, h: 0.05, fill: { color: i === 0 ? 'FFFFFF' : v.color }, line: { type: 'none' } });
    s.addText(v.desc, { x: vx + 0.2, y: 2.9, w: 2.6, h: 4.1, fontSize: 11, color: dc, valign: 'top', lineSpacingMultiple: 1.55 });
  });

  // ══════════════════════════════════════
  // 11.5 解决方案逻辑主线（叙事闭环）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '解决方案逻辑 —— 从痛点到价值的闭环', 'Solution Logic');
  s.addText('一条主线贯穿全案：直面行业痛点 → 夯实数字孪生底座 → 落地 ALL-IN-ONE 全场景 → 兑现可量化价值。', { x: 0.3, y: 0.8, w: 12.7, h: 0.42, fontSize: 11.5, color: C.GR, valign: 'middle' });
  const flow = [
    { t: '行业痛点', d: '系统分散、数据孤岛、被动管理、安全与双碳压力持续加大', c: C.RD, bg: 'FEF2F2', icon: '⚠️' },
    { t: '数字孪生底座', d: 'AES6.0 + WDP + ISE 构建统一、开放、可成长的三维底座', c: C.P, bg: 'F5F3FF', icon: '🧊' },
    { t: 'ALL-IN-ONE 全场景', d: '"一张图"融合 N 项智能应用，业务全要素可视可管可控', c: C.CY, bg: 'ECFEFF', icon: '🗺️' },
    { t: '可量化价值', d: '降本增效、主动预防、绿色安全，价值看得见可衡量', c: C.GN, bg: 'ECFDF5', icon: '📈' },
  ];
  flow.forEach((f, i) => {
    const fx = 0.4 + i * 3.25;
    s.addShape('roundRect', { x: fx, y: 1.55, w: 2.85, h: 4.3, fill: { color: f.bg }, line: { color: f.c, width: 1.5 }, rectRadius: 0.12 });
    s.addShape('rect', { x: fx, y: 1.55, w: 2.85, h: 0.08, fill: { color: f.c }, line: { type: 'none' } });
    s.addShape('ellipse', { x: fx + 1.0, y: 1.92, w: 0.85, h: 0.85, fill: { color: f.c }, line: { type: 'none' } });
    s.addText(f.icon, { x: fx + 1.0, y: 1.92, w: 0.85, h: 0.85, fontSize: 30, align: 'center', valign: 'middle' });
    s.addText('STEP ' + (i + 1), { x: fx, y: 2.98, w: 2.85, h: 0.3, fontSize: 10, align: 'center', bold: true, color: f.c });
    s.addText(f.t, { x: fx, y: 3.32, w: 2.85, h: 0.6, fontSize: 16, bold: true, align: 'center', color: C.TX });
    s.addText(f.d, { x: fx + 0.2, y: 4.0, w: 2.45, h: 1.7, fontSize: 11, align: 'center', color: C.GR, valign: 'top', lineSpacingMultiple: 1.4 });
    if (i < 3) s.addText('➜', { x: fx + 2.82, y: 3.25, w: 0.46, h: 0.8, fontSize: 24, align: 'center', valign: 'middle', color: C.GRL });
  });
  s.addShape('roundRect', { x: 0.4, y: 6.1, w: 12.5, h: 0.95, fill: { color: C.DK }, line: { type: 'none' }, rectRadius: 0.1 });
  s.addText('51WORLD 以「统一底座 + 全场景应用 + 持续运营」方法论，助力' + park.name + '实现从"被动响应"到"主动预防"的范式升级。', { x: 0.6, y: 6.1, w: 12.1, h: 0.95, fontSize: 12.5, bold: true, align: 'center', color: 'FFFFFF', valign: 'middle' });

  // ══════════════════════════════════════
  // 12. 应用场景概览
  // ══════════════════════════════════════
  const scenarios = kb.scenarios || (park.modules || []).map(m => ({ name: m, desc: m, features: [] }));
  s = pres.addSlide();
  addHeader(s, park.name + ' —— 应用场景全景', 'Application Scenarios');
  s.addText('基于数字孪生底座，围绕' + park.name + '核心业务场景，构建"一张图"全场景智能化应用体系。', { x: 0.3, y: 0.8, w: 12.7, h: 0.4, fontSize: 11, color: C.GR });
  const scColors = [C.P, C.PK, C.CY, C.GN, C.YL, C.OR];
  const cols = scenarios.length <= 3 ? 3 : Math.min(3, Math.ceil(scenarios.length / 2));
  scenarios.slice(0, 6).forEach((sc, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const sw = (13.33 - 0.6) / cols - 0.1;
    const sx = 0.3 + col * (sw + 0.1), sy = 1.35 + row * (scenarios.length <= 3 ? 5.5 : 2.75);
    const isFocus = focus.includes(sc.name);
    const cc = scColors[i % scColors.length];
    s.addShape('roundRect', { x: sx, y: sy, w: sw, h: scenarios.length <= 3 ? 5.2 : 2.55, fill: { color: isFocus ? 'FFF0F6' : C.LG }, line: { color: cc, width: isFocus ? 2 : 1, transparency: isFocus ? 0 : 60 }, rectRadius: 0.1 });
    s.addShape('rect', { x: sx, y: sy, w: sw, h: 0.06, fill: { color: cc }, line: { type: 'none' } });
    s.addText(sc.name, { x: sx + 0.2, y: sy + 0.12, w: sw - 0.4, h: 0.5, fontSize: 14, bold: true, color: cc });
    s.addText(sc.desc, { x: sx + 0.2, y: sy + 0.65, w: sw - 0.4, h: 0.72, fontSize: 9.5, color: C.GR, valign: 'top', lineSpacingMultiple: 1.3 });
    (sc.features || []).slice(0, 4).forEach((f, fi) => {
      const fname = (typeof f === 'string') ? f : (f.name || '');
      const fy = sy + 1.45 + fi * 0.38;
      if (fy + 0.35 < sy + (scenarios.length <= 3 ? 5.2 : 2.55)) {
        s.addShape('roundRect', { x: sx + 0.2, y: fy, w: sw - 0.4, h: 0.32, fill: { color: 'F1F5F9' }, line: { type: 'none' }, rectRadius: 0.05 });
        s.addShape('rect', { x: sx + 0.2, y: fy, w: 0.05, h: 0.32, fill: { color: cc }, line: { type: 'none' } });
        s.addText([
          { text: '✦ ', options: { color: cc, bold: true } },
          { text: fname, options: { color: C.TX } }
        ], { x: sx + 0.34, y: fy, w: sw - 0.5, h: 0.32, fontSize: 9.5, valign: 'middle' });
      }
    });
  });

  // ══════════════════════════════════════
  // 13. 每个场景独立详情页（左深色说明 + 右真实渲染图 + 功能卡片）
  // ══════════════════════════════════════
  scenarios.slice(0, 6).forEach((sc, si) => {
    s = pres.addSlide();
    const cc = scColors[si % scColors.length];
    addHeader(s, `应用场景 ${si + 1}/${Math.min(scenarios.length, 6)}  ——  ${sc.name}`, 'Scenario Detail');
    // 左侧：场景背景
    s.addShape('roundRect', { x: 0.3, y: 0.85, w: 5.0, h: 6.45, fill: { color: C.DK }, line: { type: 'none' }, rectRadius: 0.12 });
    s.addShape('ellipse', { x: 0.7, y: 1.05, w: 0.75, h: 0.75, fill: { color: cc }, line: { type: 'none' } });
    s.addText(String(si + 1), { x: 0.7, y: 1.05, w: 0.75, h: 0.75, fontSize: 22, bold: true, align: 'center', valign: 'middle', color: 'FFFFFF' });
    s.addText(sc.name, { x: 0.5, y: 1.95, w: 4.6, h: 1.0, fontSize: 19, bold: true, color: 'FFFFFF', lineSpacingMultiple: 1.15 });
    s.addShape('rect', { x: 0.5, y: 3.0, w: 2.5, h: 0.05, fill: { color: cc }, line: { type: 'none' } });
    s.addText('场景说明', { x: 0.5, y: 3.12, w: 4.6, h: 0.38, fontSize: 11, color: C.GRL });
    s.addText(sc.desc, { x: 0.5, y: 3.5, w: 4.6, h: 1.75, fontSize: 11.5, color: 'E2E8F0', valign: 'top', lineSpacingMultiple: 1.55 });
    // 场景价值（填充左卡 + 强化叙事）
    s.addShape('rect', { x: 0.5, y: 5.35, w: 2.2, h: 0.04, fill: { color: cc }, line: { type: 'none' } });
    s.addText('场景价值', { x: 0.5, y: 5.45, w: 4.6, h: 0.38, fontSize: 11, bold: true, color: 'A5B4FC' });
    // 场景价值（优先使用真实场景价值叙事，回退到通用模板）
    s.addShape('rect', { x: 0.5, y: 5.35, w: 2.2, h: 0.04, fill: { color: cc }, line: { type: 'none' } });
    s.addText('场景价值', { x: 0.5, y: 5.45, w: 4.6, h: 0.38, fontSize: 11, bold: true, color: 'A5B4FC' });
    s.addText(sc.value || ('依托数字孪生底座，实现「' + sc.name + '」业务全要素可视、智能预警与协同处置，显著提升运营效率与本质安全水平。'), { x: 0.5, y: 5.85, w: 4.6, h: 1.3, fontSize: 10.5, color: 'CBD5E1', valign: 'top', lineSpacingMultiple: 1.42 });
    // 右上：真实渲染图（干净矩形，不裁圆）
    const scImg = nextImg();
    let featTop = 0.9;
    if (scImg) {
      s.addImage({ path: scImg, x: 5.5, y: 0.9, w: 7.5, h: 2.6, sizing: { type: 'cover', w: 7.5, h: 2.6 } });
      // 图片标签
      s.addShape('roundRect', { x: 5.7, y: 3.15, w: 2.6, h: 0.36, fill: { color: cc }, line: { type: 'none' }, rectRadius: 0.05 });
      s.addText('▶ 数字孪生实景', { x: 5.78, y: 3.15, w: 2.5, h: 0.36, fontSize: 9.5, bold: true, color: 'FFFFFF', valign: 'middle' });
      featTop = 3.7;
    }
    // 右下：功能特点卡片（2列，标题 + 说明）
    s.addText('核心功能模块', { x: 5.5, y: featTop, w: 7.5, h: 0.38, fontSize: 13, bold: true, color: C.TX });
    const features = sc.features || [];
    const fCardH = scImg ? 1.55 : 1.75;
    features.slice(0, scImg ? 4 : 6).forEach((f, fi) => {
      const fname = (typeof f === 'string') ? f : (f.name || '');
      const fdetail = (typeof f === 'object' && f) ? (f.detail || '') : '';
      const frow = Math.floor(fi / 2), fcol = fi % 2;
      const fx = 5.5 + fcol * 3.85, fy = featTop + 0.45 + frow * (fCardH + 0.12);
      s.addShape('roundRect', { x: fx, y: fy, w: 3.7, h: fCardH, fill: { color: C.LG }, line: { color: cc, width: 1, transparency: 65 }, rectRadius: 0.09 });
      s.addShape('rect', { x: fx, y: fy, w: 3.7, h: 0.06, fill: { color: cc }, line: { type: 'none' } });
      s.addShape('ellipse', { x: fx + 0.15, y: fy + 0.16, w: 0.36, h: 0.36, fill: { color: 'FFFFFF' }, line: { color: cc, width: 1.25 } });
      s.addText(String(fi + 1), { x: fx + 0.15, y: fy + 0.16, w: 0.36, h: 0.36, fontSize: 11, bold: true, align: 'center', valign: 'middle', color: cc });
      if (fdetail) {
        s.addText(fname, { x: fx + 0.62, y: fy + 0.12, w: 2.98, h: 0.42, fontSize: 11, bold: true, color: C.TX, valign: 'middle', lineSpacingMultiple: 1.0 });
        s.addText(fdetail, { x: fx + 0.2, y: fy + 0.58, w: 3.34, h: fCardH - 0.68, fontSize: 8.8, color: C.GR, valign: 'top', lineSpacingMultiple: 1.18 });
      } else {
        s.addText(fname, { x: fx + 0.62, y: fy + 0.12, w: 2.98, h: fCardH - 0.24, fontSize: 11, color: C.TX, valign: 'middle', lineSpacingMultiple: 1.25 });
      }
    });
  });

  // ══════════════════════════════════════
  // Section 5 分隔页
  // ══════════════════════════════════════
  addDivider(pres, '05', '落地案例与建设价值', 'Use Cases & Value',
    '回答"建成什么样" —— 以五步实施方法论、全球标杆案例与可量化的建设成效，' +
    '印证方案的可落地性与价值回报，并给出清晰的分阶段实施路径。');

  // ══════════════════════════════════════
  // 14. 实施方法论（五步建设）
  // ══════════════════════════════════════
  s = pres.addSlide();
  addHeader(s, '实施方法论 —— 五步建设，快速见效', 'Implementation Methodology');
  KB.methodology.forEach((step, i) => {
    const sx = 0.2 + i * 2.58;
    const isLast = i === KB.methodology.length - 1;
    s.addShape('roundRect', { x: sx, y: 0.9, w: 2.45, h: 5.95, fill: { color: i % 2 === 0 ? C.P : C.LG }, line: { type: 'none' }, rectRadius: 0.1 });
    const tc = i % 2 === 0 ? 'FFFFFF' : C.P;
    const dc = i % 2 === 0 ? 'DDD6FE' : C.GR;
    numCircle(s, i + 1, sx + 0.9, 1.12, 0.3, i % 2 === 0 ? 'FFFFFF' : C.P, i % 2 === 0 ? C.P : 'FFFFFF');
    s.addText(step.step, { x: sx + 0.12, y: 1.85, w: 2.21, h: 0.65, fontSize: 15, bold: true, align: 'center', color: tc });
    s.addShape('rect', { x: sx + 0.5, y: 2.55, w: 1.45, h: 0.04, fill: { color: i % 2 === 0 ? 'DDD6FE' : C.PK }, line: { type: 'none' } });
    s.addText(step.desc, { x: sx + 0.18, y: 2.7, w: 2.09, h: 3.95, fontSize: 10, color: dc, valign: 'top', lineSpacingMultiple: 1.5 });
    // 连接箭头
    if (!isLast) {
      s.addText('→', { x: sx + 2.45, y: 3.1, w: 0.13, h: 0.7, fontSize: 18, align: 'center', color: C.P });
    }
  });

  // ══════════════════════════════════════
  // 15. 案例总览
  // ══════════════════════════════════════
  const cases = kb.cases || [];
  s = pres.addSlide();
  addHeader(s, '全球标杆案例 —— 已累计落地近 2000 个项目', 'Reference Cases');
  s.addShape('roundRect', { x: 0.3, y: 0.82, w: 12.7, h: 0.72, fill: { color: C.P }, line: { type: 'none' }, rectRadius: 0.08 });
  s.addText('51Aes 累计落地 10 多个国家和地区、近 2000 个项目，已为全球 19 个国家的数千家企业提供数字孪生产品和服务', { x: 0.5, y: 0.82, w: 12.3, h: 0.72, fontSize: 11.5, bold: true, color: 'FFFFFF', valign: 'middle' });
  const caseColors = [C.P, C.PK, C.CY, C.GN];
  cases.slice(0, 4).forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = 0.3 + col * 6.4, cy = 1.7 + row * 2.7;
    s.addShape('roundRect', { x: cx, y: cy, w: 6.2, h: 2.5, fill: { color: C.LG }, line: { color: caseColors[i], width: 1, transparency: 60 }, rectRadius: 0.1 });
    s.addShape('rect', { x: cx, y: cy, w: 6.2, h: 0.06, fill: { color: caseColors[i] }, line: { type: 'none' } });
    s.addText(c.name, { x: cx + 0.2, y: cy + 0.12, w: 5.8, h: 0.55, fontSize: 14, bold: true, color: C.TX });
    s.addText((c.value || c.bg || ''), { x: cx + 0.2, y: cy + 0.72, w: 5.8, h: 1.0, fontSize: 9.5, color: C.GR, valign: 'top', lineSpacingMultiple: 1.25 });
    if (c.metrics && c.metrics.length) {
      s.addText(c.metrics[0], { x: cx + 0.2, y: cy + 1.82, w: 5.8, h: 0.5, fontSize: 10, bold: true, color: caseColors[i] });
    }
  });

  // ══════════════════════════════════════
  // 16. 每个案例详情页（双栏：左深色背景/右白色功能+指标）
  // ══════════════════════════════════════
  cases.slice(0, 4).forEach((c, ci) => {
    s = pres.addSlide();
    const cc = caseColors[ci % caseColors.length];
    addHeader(s, `案例 ${ci + 1}  ——  ${c.name}`, 'Case Study');
    // 左侧深色背景（40%）
    s.addShape('roundRect', { x: 0.3, y: 0.85, w: 5.3, h: 6.42, fill: { color: C.DK }, line: { type: 'none' }, rectRadius: 0.12 });
    s.addShape('rect', { x: 0.3, y: 0.85, w: 5.3, h: 0.06, fill: { color: cc }, line: { type: 'none' } });
    s.addText(c.name, { x: 0.5, y: 1.05, w: 4.9, h: 1.2, fontSize: 18, bold: true, color: 'FFFFFF', lineSpacingMultiple: 1.15 });
    s.addShape('rect', { x: 0.5, y: 2.3, w: 2.2, h: 0.05, fill: { color: cc }, line: { type: 'none' } });
    s.addText('项目背景', { x: 0.5, y: 2.45, w: 4.9, h: 0.4, fontSize: 12, bold: true, color: cc });
    s.addText((c.bg || ''), { x: 0.5, y: 2.9, w: 4.9, h: 2.45, fontSize: 9.8, color: 'CBD5E1', valign: 'top', lineSpacingMultiple: 1.42 });
    s.addText('项目价值', { x: 0.5, y: 5.45, w: 4.9, h: 0.4, fontSize: 12, bold: true, color: cc });
    s.addText((c.value || ''), { x: 0.5, y: 5.9, w: 4.9, h: 1.3, fontSize: 9.8, color: 'A5B4FC', valign: 'top', lineSpacingMultiple: 1.32 });
    // 右侧：真实渲染图 + 功能 + 指标
    const caseImg = nextImg();
    let rTop = 0.9;
    if (caseImg) {
      s.addImage({ path: caseImg, x: 5.9, y: 0.9, w: 7.1, h: 2.75, sizing: { type: 'cover', w: 7.1, h: 2.75 } });
      s.addShape('roundRect', { x: 6.05, y: 3.25, w: 2.4, h: 0.34, fill: { color: cc }, line: { type: 'none' }, rectRadius: 0.05 });
      s.addText('▶ 项目实景', { x: 6.13, y: 3.25, w: 2.3, h: 0.34, fontSize: 9.5, bold: true, color: 'FFFFFF', valign: 'middle' });
      rTop = 3.85;
    }
    s.addText('功能应用', { x: 5.9, y: rTop, w: 7.1, h: 0.4, fontSize: 13, bold: true, color: C.TX });
    if (c.funcs) {
      const funcs = c.funcs.split(/[、，,]/).map(f => f.trim()).filter(Boolean);
      funcs.slice(0, 6).forEach((f, fi) => {
        const frow = Math.floor(fi / 3), fcol = fi % 3;
        const fx = 5.9 + fcol * 2.4, fy = rTop + 0.42 + frow * 0.62;
        s.addShape('roundRect', { x: fx, y: fy, w: 2.3, h: 0.52, fill: { color: C.LG }, line: { color: cc, width: 1, transparency: 75 }, rectRadius: 0.05 });
        s.addShape('rect', { x: fx, y: fy, w: 0.05, h: 0.52, fill: { color: cc }, line: { type: 'none' } });
        s.addText(f, { x: fx + 0.15, y: fy, w: 2.1, h: 0.52, fontSize: 9.5, color: C.TX, valign: 'middle' });
      });
    }
    // 量化成效
    if (c.metrics && c.metrics.length) {
      const mTop = rTop + 1.85;
      s.addText('建设成效', { x: 5.9, y: mTop, w: 7.1, h: 0.4, fontSize: 13, bold: true, color: C.TX });
      c.metrics.slice(0, 3).forEach((m, mi) => {
        const my = mTop + 0.45 + mi * 0.52;
        s.addShape('roundRect', { x: 5.9, y: my, w: 7.1, h: 0.44, fill: { color: 'EDE9FE' }, line: { type: 'none' }, rectRadius: 0.05 });
        s.addShape('ellipse', { x: 5.97, y: my + 0.06, w: 0.32, h: 0.32, fill: { color: cc }, line: { type: 'none' } });
        s.addText(String(mi + 1), { x: 5.97, y: my + 0.06, w: 0.32, h: 0.32, fontSize: 11, bold: true, align: 'center', valign: 'middle', color: 'FFFFFF' });
        s.addText(m, { x: 6.4, y: my, w: 6.5, h: 0.44, fontSize: 10.5, bold: true, color: C.P, valign: 'middle' });
      });
    }
  });

  // ══════════════════════════════════════
  // 17. 建设价值与成效（深色大数字）
  // ══════════════════════════════════════
  const valueMetrics = kb.valueMetrics || [];
  if (valueMetrics.length) {
    s = pres.addSlide();
    addHeader(s, '建设价值与成效 —— 可量化的数字孪生价值', 'Quantified Value');
    // 综合价值描述
    s.addShape('roundRect', { x: 0.3, y: 0.82, w: 12.7, h: 0.72, fill: { color: 'EDE9FE' }, line: { type: 'none' }, rectRadius: 0.08 });
    s.addText((park.value || []).join('   ·   ') || '一图感知、智能决策、降本增效、绿色安全', { x: 0.5, y: 0.82, w: 12.3, h: 0.72, fontSize: 12, color: C.P, valign: 'middle' });
    // 指标卡
    const mcols = Math.min(valueMetrics.length, 3);
    const mw = (13.33 - 0.6 - (mcols - 1) * 0.25) / mcols;
    valueMetrics.slice(0, 3).forEach((m, i) => {
      addMetricBox(s, m.value, m.label, m.desc, 0.3 + i * (mw + 0.25), 1.7, mw, 3.0, true);
    });
    // 补充说明（功能列表）
    s.addShape('roundRect', { x: 0.3, y: 4.88, w: 12.7, h: 2.45, fill: { color: C.LG }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addText('综合功能应用体系', { x: 0.5, y: 5.0, w: 4, h: 0.42, fontSize: 13, bold: true, color: C.P });
    const funcList = scenarios.slice(0, 8).map(sc => sc.name);
    funcList.forEach((fn, fi) => {
      const fc = fi % 4, fr = Math.floor(fi / 4);
      const fx = 0.5 + fc * 3.1, fy = 5.52 + fr * 0.68;
      s.addShape('roundRect', { x: fx, y: fy, w: 2.9, h: 0.56, fill: { color: 'FFFFFF' }, line: { color: C.P, width: 1, transparency: 65 }, rectRadius: 0.06 });
      s.addText('✦ ' + fn, { x: fx + 0.12, y: fy, w: 2.68, h: 0.56, fontSize: 11, color: C.TX, valign: 'middle' });
    });
  }

  // ══════════════════════════════════════
  // 18. 实施计划（三大阶段：售前/售中/交付）
  // ══════════════════════════════════════
  ['presales', 'midsales', 'delivery'].forEach((key, ki) => {
    const ph = phases[key];
    s = pres.addSlide();
    const phColors = [C.P, C.PK, C.CY];
    const phc = phColors[ki];
    addHeader(s, `实施计划 · 第${['一', '二', '三'][ki]}阶段 —— ${ph.name}`, ph.desc);
    // 阶段说明
    s.addShape('roundRect', { x: 0.3, y: 0.82, w: 12.7, h: 0.65, fill: { color: phc, transparency: 90 }, line: { color: phc, width: 1 }, rectRadius: 0.08 });
    s.addText(`第${['一', '二', '三'][ki]}阶段  ·  ${ph.name}  ·  ${ph.desc}`, { x: 0.5, y: 0.82, w: 12.3, h: 0.65, fontSize: 12, bold: true, color: phc, valign: 'middle' });
    ph.items.forEach((it, ii) => {
      const iy = 1.6 + ii * 1.45;
      s.addShape('roundRect', { x: 0.3, y: iy, w: 12.7, h: 1.3, fill: { color: ii % 2 === 0 ? C.LG : 'FFFFFF' }, line: { color: phc, width: 1, transparency: 80 }, rectRadius: 0.08 });
      s.addShape('rect', { x: 0.3, y: iy, w: 0.06, h: 1.3, fill: { color: phc }, line: { type: 'none' } });
      numCircle(s, ii + 1, 0.45, iy + 0.42, 0.24, phc, 'FFFFFF');
      s.addText(it.name, { x: 1.1, y: iy + 0.1, w: 2.2, h: 0.55, fontSize: 15, bold: true, color: C.TX });
      s.addText(it.duration, { x: 1.1, y: iy + 0.68, w: 2.2, h: 0.42, fontSize: 11, color: phc });
      s.addShape('rect', { x: 3.35, y: iy + 0.15, w: 0.04, h: 1.0, fill: { color: C.LGD }, line: { type: 'none' } });
      s.addText('交付物：', { x: 3.55, y: iy + 0.1, w: 1.5, h: 0.42, fontSize: 11, bold: true, color: C.GR });
      s.addText(it.deliverables.join('　·　'), { x: 3.55, y: iy + 0.52, w: 9.2, h: 0.7, fontSize: 11.5, color: C.TX, valign: 'top', lineSpacingMultiple: 1.3 });
    });
  });

  // ══════════════════════════════════════
  // 19. 结尾
  // ══════════════════════════════════════
  s = pres.addSlide();
  s.background = { color: C.DK };
  s.addShape('rect', { x: 0, y: 4.8, w: 13.33, h: 2.7, fill: { color: C.P }, line: { type: 'none' } });
  s.addShape('rect', { x: 0, y: 4.8, w: 5.0, h: 2.7, fill: { color: C.PD }, line: { type: 'none' } });
  s.addText('谢谢观看', { x: 0.5, y: 1.3, w: 12.3, h: 1.4, fontSize: 56, bold: true, align: 'center', color: 'FFFFFF' });
  s.addText('感谢您关注 51WORLD 数字孪生解决方案', { x: 0.5, y: 2.85, w: 12.3, h: 0.65, fontSize: 18, align: 'center', color: 'A5B4FC' });
  s.addShape('rect', { x: 3.5, y: 3.7, w: 6.33, h: 0.05, fill: { color: C.PK }, line: { type: 'none' } });
  s.addText(KB.company.name, { x: 0.5, y: 5.05, w: 12.3, h: 0.65, fontSize: 16, bold: true, align: 'center', color: 'FFFFFF' });
  s.addText(KB.company.slogan + '  ·  ' + KB.company.site, { x: 0.5, y: 5.72, w: 12.3, h: 0.55, fontSize: 14, align: 'center', color: 'DDD6FE' });

  return await pres.write({ outputType: 'nodebuffer' });
}

// ════════════════════════════════════════════════════════════════════════
// 幻灯片内容模型（网页在线查看用）—— 与 generatePptBuffer 同源数据，逐页对应
// 每个 slide：{ kind, ... }，前端按 kind 渲染成 16:9 幻灯片版式
// ════════════════════════════════════════════════════════════════════════
function buildPptModel(park, version, brief) {
  const kb = KB.getKB(park.id) || {};
  const projectName = (brief && brief.projectName) || `${park.name}数字化解决方案`;
  const focus = (brief && brief.focusScenarios) || [];
  const slides = [];

  // 1. 封面
  slides.push({
    kind: 'cover', badge: 'AI', company: KB.company.name || '北京五一视界数字孪生科技股份有限公司',
    companySub: '51WORLD · 克隆地球5.1亿平方公里',
    title: '赋能' + park.name, subtitle: '综合解决方案',
    project: projectName, meta: version + '  ·  ' + new Date().toLocaleDateString('zh-CN')
  });

  // 2. 目录
  const tocItems = [
    { no: '01', title: '行业态势与政策背景', en: 'Industry Trends' },
    { no: '02', title: '行业现状与痛点分析', en: 'Current Status & Pain Points' },
    { no: '03', title: '核心产品能力', en: 'Core Capabilities' },
    { no: '04', title: 'ALL-IN-ONE 解决方案', en: 'All-in-One Solution' },
    { no: '05', title: '落地案例与建设价值', en: 'Use Cases & Value' },
  ];
  slides.push({ kind: 'toc', title: '目录', en: 'CATALOG', items: tocItems });

  // Section 1
  slides.push({ kind: 'divider', no: '01', title: '行业态势与政策背景', en: 'Industry Trends & Policy',
    lead: '从国家政策与市场机遇切入，回答"为什么现在要建" —— 政策强力驱动叠加数字孪生技术成熟，' + park.name + '正进入高标准、高质量发展的新周期。' });

  // 3. 政策驱动
  const policies = (kb.policies && kb.policies.length) ? kb.policies : KB.industryTrends.policies;
  slides.push({
    kind: 'policy', theme: 'steel',
    title: '政策强力驱动，数字孪生引领' + park.name + '进入高标准发展新周期',
    background: kb.background || KB.industryTrends.intro,
    policies: policies.slice(0, 5).map(p => {
      const m = p.match(/\d{4}/);
      return { year: m ? m[0] : '', text: p.replace(/（\d{4}.*?）/g, '').substring(0, 80) };
    })
  });

  // 4. 市场机遇
  slides.push({
    kind: 'market', title: '市场机遇 —— 高速增长的数字孪生园区市场', tag: 'Market Opportunity',
    bigNum: '2000+', bigLabel: '累计落地项目数', bigSub: '覆盖19个国家和地区',
    metrics: [{ v: '650+', l: '化工园区市场' }, { v: '628', l: '国家级经开区' }, { v: '3012', l: '高校校园' }],
    marketData: kb.marketData || '',
    chart: { title: '数字孪生园区市场规模(亿元)', labels: ['2022', '2023', '2024', '2025E', '2026E', '2027E'], values: [280, 420, 580, 780, 1050, 1380] }
  });

  // Section 2
  slides.push({ kind: 'divider', no: '02', title: '行业现状与痛点分析', en: 'Current Status & Pain Points',
    lead: '直面行业当前的核心挑战 —— 系统分散、数据孤岛、被动管理、安全压力，逐条剖析痛点根因，并给出 51WORLD 以品牌力、实战力、产品力支撑的破局思路。' });

  // 5. 行业痛点
  const vPains = (kb.pains && kb.pains.length) ? kb.pains : KB.commonPains;
  const painIcons = ['🧩', '📊', '👷', '📉', '🛡️', '⚙️'];
  const painFix = ['统一三维底座融合', '数据汇聚智能分析', 'AI 自动巡检预警', '精细化智能运营', '安全双控数字管控', '设备联防联动'];
  slides.push({
    kind: 'pains', title: '建设需求增长，行业面临多重挑战', tag: 'Industry Challenges',
    cards: vPains.slice(0, 6).map((x, i) => ({
      no: '0' + (i + 1), icon: painIcons[i] || '•', title: x.title,
      desc: x.desc || '依赖人力管理，缺乏数字化手段，效率低且难以实现精细化运营管控。',
      fix: x.fix || painFix[i] || '数字化智能管控'
    })),
    emphases: (brief && brief.emphases) || []
  });

  // 6. 51WORLD 的解答
  slides.push({
    kind: 'advantages', title: '51WORLD 的解答 —— 品牌力 · 实战力 · 产品力', tag: '51WORLD Response',
    intro: KB.company.intro,
    cards: (KB.company.advantages || []).slice(0, 3).map((adv, i) => ({
      title: ['引领品牌力', '标杆实战力', '卓越产品力'][i] || '核心优势', body: adv
    }))
  });

  // Section 3
  slides.push({ kind: 'divider', no: '03', title: '核心产品能力', en: 'Core Product Capabilities',
    lead: '回答"用什么建" —— 以 AES6.0 数字底座、WDP 平台、ISE 仿真引擎、51Daas 数字资产、Clonova 空间孪生智能五大核心产品，构筑统一、开放、可成长的数字孪生技术底盘。' });

  // 7. 五大能力独立页
  KB.capabilities.forEach((cap, ci) => {
    slides.push({ kind: 'capability', idx: ci + 1, total: KB.capabilities.length,
      name: cap.name, en: cap.en, desc: cap.desc, points: cap.points || [] });
  });

  // 8. 标准建设
  slides.push({
    kind: 'standards', title: '标准建设 —— 引领行业发展，参与顶层标准制定', tag: 'Standards & Track Record',
    scale: KB.company.scale,
    stats: [['10+', '国家标准'], ['2', '行业标准'], ['20+', '团体标准'], ['20+', '白皮书']],
    highlights: KB.standards.highlights || []
  });

  // Section 4
  slides.push({ kind: 'divider', no: '04', title: 'ALL-IN-ONE 解决方案', en: 'All-in-One Solution',
    lead: '回答"怎么建" —— 从一体化技术架构到 IOC 智慧驾驶舱，再到围绕' + park.name + '核心业务的全场景智能应用，形成"一个底座 + N 项应用"的一张图整体方案。' });

  // 9. 技术架构
  slides.push({
    kind: 'architecture', title: '方案架构 —— AI + WDP + Clonova 一体化数字孪生平台', tag: 'Solution Architecture',
    layers: KB.architecture.map(l => ({ layer: l.layer, desc: l.desc }))
  });

  // 10. IOC 八大应用
  const iocIcons = ['📊', '🛡️', '🚦', '📦', '🔔', '⚡', '🔧', '🏢'];
  slides.push({
    kind: 'ioc', title: '园区 IOC 智慧驾驶舱 —— 八大标准应用', tag: 'IOC Standard Applications',
    intro: '通过智慧园区建设实现对外服务的形象提升、对内运营的降本增效，实现员工以人为本、管理效益优先。',
    banner: 'IOC 智慧驾驶舱 · 一屏掌控园区运行态势',
    apps: KB.iocApps.slice(0, 8).map((a, i) => ({ icon: iocIcons[i] || '◆', name: a.name, desc: a.desc }))
  });

  // 11. 方案价值
  slides.push({
    kind: 'value', title: '方案价值 —— 数字孪生赋能园区四大核心价值', tag: 'Solution Value',
    cards: [
      { icon: '👁', title: '全域可视', desc: '园区所有子系统数据融合汇聚，一张图实时呈现运行状态，无死角全掌控。' },
      { icon: '🔮', title: '智慧管控', desc: 'AI 算法融合多源数据进行智能预警、异常分析和自动处置，从被动响应到主动预防。' },
      { icon: '🔄', title: '降本增效', desc: '流程自动化与智能调度减少人力依赖，能耗精细化管理显著降低运营成本。' },
      { icon: '🌱', title: '绿色安全', desc: '碳排放实时核算、能耗双控合规监管、应急一键指挥，助力安全绿色可持续运营。' },
    ]
  });

  // 11.5 解决方案逻辑
  slides.push({
    kind: 'flow', title: '解决方案逻辑 —— 从痛点到价值的闭环', tag: 'Solution Logic',
    intro: '一条主线贯穿全案：直面行业痛点 → 夯实数字孪生底座 → 落地 ALL-IN-ONE 全场景 → 兑现可量化价值。',
    steps: [
      { icon: '⚠️', t: '行业痛点', d: '系统分散、数据孤岛、被动管理、安全与双碳压力持续加大' },
      { icon: '🧊', t: '数字孪生底座', d: 'AES6.0 + WDP + ISE 构建统一、开放、可成长的三维底座' },
      { icon: '🗺️', t: 'ALL-IN-ONE 全场景', d: '"一张图"融合 N 项智能应用，业务全要素可视可管可控' },
      { icon: '📈', t: '可量化价值', d: '降本增效、主动预防、绿色安全，价值看得见可衡量' },
    ],
    footer: '51WORLD 以「统一底座 + 全场景应用 + 持续运营」方法论，助力' + park.name + '实现从"被动响应"到"主动预防"的范式升级。'
  });

  // 12. 应用场景概览
  const scenarios = kb.scenarios || (park.modules || []).map(m => ({ name: m, desc: m, features: [] }));
  slides.push({
    kind: 'scenarioOverview', title: park.name + ' —— 应用场景全景', tag: 'Application Scenarios',
    intro: '基于数字孪生底座，围绕' + park.name + '核心业务场景，构建"一张图"全场景智能化应用体系。',
    cards: scenarios.slice(0, 6).map(sc => ({
      name: sc.name, desc: sc.desc, focus: focus.includes(sc.name),
      features: (sc.features || []).slice(0, 4).map(f => (typeof f === 'string') ? f : (f.name || ''))
    }))
  });

  // 13. 每个场景详情页
  scenarios.slice(0, 6).forEach((sc, si) => {
    slides.push({
      kind: 'scenarioDetail', idx: si + 1, total: Math.min(scenarios.length, 6),
      name: sc.name, desc: sc.desc,
      value: sc.value || ('依托数字孪生底座，实现「' + sc.name + '」业务全要素可视、智能预警与协同处置，显著提升运营效率与本质安全水平。'),
      features: (sc.features || []).slice(0, 6).map(f => (typeof f === 'string') ? { name: f, detail: '' } : { name: f.name || '', detail: f.detail || '' })
    });
  });

  // Section 5
  slides.push({ kind: 'divider', no: '05', title: '落地案例与建设价值', en: 'Use Cases & Value',
    lead: '回答"建成什么样" —— 以五步实施方法论、全球标杆案例与可量化的建设成效，印证方案的可落地性与价值回报，并给出清晰的分阶段实施路径。' });

  // 14. 实施方法论
  slides.push({
    kind: 'methodology', title: '实施方法论 —— 五步建设，快速见效', tag: 'Implementation Methodology',
    steps: KB.methodology.map(s => ({ step: s.step, desc: s.desc }))
  });

  // 15. 案例总览
  const cases = kb.cases || [];
  if (cases.length) {
    slides.push({
      kind: 'casesOverview', title: '全球标杆案例 —— 已累计落地近 2000 个项目', tag: 'Reference Cases',
      banner: '51Aes 累计落地 10 多个国家和地区、近 2000 个项目，已为全球 19 个国家的数千家企业提供数字孪生产品和服务',
      cards: cases.slice(0, 4).map(c => ({ name: c.name, desc: c.value || c.bg || '', metric: (c.metrics && c.metrics[0]) || '' }))
    });
    // 16. 案例详情页
    cases.slice(0, 4).forEach((c, ci) => {
      slides.push({
        kind: 'caseDetail', idx: ci + 1, name: c.name, bg: c.bg || '', value: c.value || '',
        funcs: c.funcs ? c.funcs.split(/[、，,]/).map(f => f.trim()).filter(Boolean).slice(0, 6) : [],
        metrics: (c.metrics || []).slice(0, 3)
      });
    });
  }

  // 17. 建设价值与成效
  const valueMetrics = kb.valueMetrics || [];
  if (valueMetrics.length) {
    slides.push({
      kind: 'valueMetrics', title: '建设价值与成效 —— 可量化的数字孪生价值', tag: 'Quantified Value',
      summary: (park.value || []).join('   ·   ') || '一图感知、智能决策、降本增效、绿色安全',
      metrics: valueMetrics.slice(0, 3).map(m => ({ value: m.value, label: m.label, desc: m.desc })),
      funcList: scenarios.slice(0, 8).map(sc => sc.name)
    });
  }

  // 18. 实施计划三阶段
  ['presales', 'midsales', 'delivery'].forEach((key, ki) => {
    const ph = phases[key];
    slides.push({
      kind: 'plan', idx: ki + 1, stageLabel: `第${['一', '二', '三'][ki]}阶段`, stage: ph.name, desc: ph.desc,
      items: ph.items.map(it => ({ name: it.name, duration: it.duration, deliverables: it.deliverables.join('　·　') }))
    });
  });

  // 19. 结尾
  slides.push({
    kind: 'closing', title: '谢谢观看', subtitle: '感谢您关注 51WORLD 数字孪生解决方案',
    company: KB.company.name, slogan: (KB.company.slogan || '') + '  ·  ' + (KB.company.site || '')
  });

  return { title: projectName, version, slides };
}

module.exports = { generatePptBuffer, buildPptModel };
