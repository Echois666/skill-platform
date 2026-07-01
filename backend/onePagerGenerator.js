// 行业产品一页纸生成器 v2 —— 单页 PPTX，复刻「51WORLD 园区一页纸」版式与信息密度
// 六大分区：① 顶部产品定义 ② 客户痛点(5-6) ③ 业务场景(8模块×8功能点) ④ 客户案例(2) ⑤ 创新价值/产品矩阵(7)
'use strict';
const pptxgen = require('pptxgenjs');
const KB = require('../data/knowledgeBase');
const { getOnePagerData, productMatrix } = require('../data/onePagerData');

// ── 深蓝主题（对齐参考一页纸提取色）──────────────────────────
const C = {
  BG: '1C1F3A', BG2: '292B58', PANEL: '232850',
  HEAD: '034DAD', BLUE: '5B9BD5', BLUEL: '65B8FF', PERI: '648FFF',
  CHIP: '33397A', CHIP2: '3A4694',
  WH: 'FFFFFF', TX: 'E5EAF5', GR: 'A9B4D6', GRL: '8C97BE',
  RD: 'FF6B6B', RDB: '3A2647', GN: '37D9A0', AMBER: 'FFC24B',
};

const EN_NAME = {
  'smart-park': 'Pan Park Digital Twin IOC Platform',
  'chemical-park': 'Chemical Park Digital Twin IOC Platform',
  'smart-hospital': 'Smart Hospital Digital Twin IOC Platform',
  'smart-campus': 'Smart Campus Digital Twin IOC Platform',
  'campus-construction': 'Smart Campus Construction IOC Platform',
  'smart-venue': 'Smart Venue · AIC Digital Twin Platform',
  'smart-logistics': 'Smart Logistics Digital Twin IOC Platform',
  'carbon-park': 'Low-Carbon Park Digital Twin IOC Platform',
  'smart-building': 'Smart Building Digital Twin IOC Platform',
  'smart-city': 'Smart City CIM Digital Twin Platform',
  'smart-scenic': 'Smart Scenic Digital Twin IOC Platform',
  'smart-rural': 'Digital Rural Twin IOC Platform',
  'smart-forestry': 'Smart Forestry Digital Twin IOC Platform',
  'smart-realestate': 'Smart Real Estate Digital Twin Platform',
  'smart-park-public': 'Smart Park Digital Twin IOC Platform',
};

function clip(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function sectionHead(s, title, en, x, y, w, accent) {
  s.addShape('rect', { x, y: y + 0.03, w: 0.06, h: 0.42, fill: { color: accent }, line: { type: 'none' } });
  s.addText(title, { x: x + 0.13, y, w: w - 0.13, h: 0.28, fontSize: 12.5, bold: true, color: 'FFFFFF', valign: 'middle' });
  s.addText(en, { x: x + 0.13, y: y + 0.28, w: w - 0.13, h: 0.18, fontSize: 7, color: accent, letterSpacingPt: 1 });
}

function buildOnePager(park) {
  const kb = KB.getKB(park.id) || {};
  const data = getOnePagerData(park.id);
  const pres = new pptxgen();
  pres.author = KB.company.shortName;
  pres.title = `${park.name}产品一页纸`;
  pres.layout = 'LAYOUT_WIDE';
  const s = pres.addSlide();
  s.background = { color: C.BG };

  // ===== 顶部带：标题 + 产品定义 =====
  s.addShape('rect', { x: 0, y: 0, w: 13.33, h: 1.18, fill: { color: C.BG2 }, line: { type: 'none' } });
  s.addShape('rect', { x: 0, y: 0, w: 0.12, h: 1.18, fill: { color: C.BLUEL }, line: { type: 'none' } });
  s.addText([
    { text: `${park.name}`, options: { fontSize: 25, bold: true, color: C.WH } },
    { text: '  IOC', options: { fontSize: 25, bold: true, color: C.BLUEL } },
  ], { x: 0.3, y: 0.12, w: 5.0, h: 0.55, valign: 'middle' });
  s.addText(EN_NAME[park.id] || `${park.name} Digital Twin IOC Platform`,
    { x: 0.32, y: 0.66, w: 5.0, h: 0.4, fontSize: 10.5, italic: true, color: C.BLUE, letterSpacingPt: 1 });
  const intro = data.intro || (kb.background || '').replace(/\s+/g, '');
  s.addText(clip(intro, 200),
    { x: 5.5, y: 0.1, w: 7.65, h: 1.0, fontSize: 10, color: C.TX, valign: 'middle', lineSpacingMultiple: 1.16, align: 'justify' });

  const topY = 1.42, colBottom = 7.32;

  // ---------- 左栏：客户痛点 + 客户案例 ----------
  const LX = 0.25, LW = 3.0;
  s.addShape('rect', { x: LX, y: topY, w: LW, h: colBottom - topY, fill: { color: C.PANEL }, line: { type: 'none' }, rectRadius: 0.06 });
  sectionHead(s, '客户痛点', 'CUSTOMER PAINS', LX + 0.14, topY + 0.12, LW - 0.28, C.RD);
  const pains = (kb.pains && kb.pains.length ? kb.pains : (park.pains || []).map(t => ({ title: t, desc: '' }))).slice(0, 5);
  let py = topY + 0.66;
  const painArea = 3.55;
  const painH = (painArea - 0.08 * (pains.length - 1)) / pains.length;
  pains.forEach(p => {
    s.addShape('roundRect', { x: LX + 0.14, y: py, w: LW - 0.28, h: painH, fill: { color: C.RDB }, line: { color: C.RD, width: 0.5 }, rectRadius: 0.04 });
    s.addText([{ text: '▸ ', options: { color: C.RD, bold: true } }, { text: clip(p.title, 15), options: { color: 'FFD9D9', bold: true } }],
      { x: LX + 0.22, y: py + 0.03, w: LW - 0.42, h: 0.22, fontSize: 10, valign: 'middle' });
    s.addText(clip(p.desc || p.fix || '', 52), { x: LX + 0.24, y: py + 0.26, w: LW - 0.44, h: painH - 0.3, fontSize: 7.6, color: C.GR, valign: 'top', lineSpacingMultiple: 1.04 });
    py += painH + 0.08;
  });
  // 客户案例
  const caseY = py + 0.06;
  sectionHead(s, '客户案例', 'BENCHMARK CASES', LX + 0.14, caseY, LW - 0.28, C.GN);
  const cases = (kb.cases || []).slice(0, 2);
  let cy = caseY + 0.54;
  if (cases.length) {
    const availH = colBottom - cy - 0.1;
    const cH = (availH - 0.08 * (cases.length - 1)) / cases.length;
    cases.forEach(c => {
      s.addShape('roundRect', { x: LX + 0.14, y: cy, w: LW - 0.28, h: cH, fill: { color: C.BG2 }, line: { color: C.GN, width: 0.5 }, rectRadius: 0.04 });
      s.addText('★ ' + clip(c.name, 18), { x: LX + 0.22, y: cy + 0.04, w: LW - 0.42, h: 0.24, fontSize: 9.5, bold: true, color: C.GN, valign: 'middle' });
      const cv = c.value || c.bg || '';
      const maxC = Math.floor((cH - 0.3) / 0.128) * 22;
      s.addText(clip(cv, maxC), { x: LX + 0.24, y: cy + 0.29, w: LW - 0.44, h: cH - 0.33, fontSize: 7.6, color: C.TX, valign: 'top', lineSpacingMultiple: 1.06 });
      cy += cH + 0.08;
    });
  }

  // ---------- 中栏：业务场景（8模块×8功能点）----------
  const MX = 3.4, MW = 6.62;
  s.addShape('rect', { x: MX, y: topY, w: MW, h: colBottom - topY, fill: { color: C.PANEL }, line: { type: 'none' }, rectRadius: 0.06 });
  sectionHead(s, '业务场景 · 方案架构', 'BUSINESS SCENARIOS & ARCHITECTURE', MX + 0.16, topY + 0.12, MW - 0.32, C.BLUEL);

  const modules = (data.modules || []).slice(0, 8);
  const gridY = topY + 0.66;
  const gridB = colBottom - 0.12;
  const cols = 2, gap = 0.14;
  const cardW = (MW - 0.32 - gap) / cols;
  const rows = Math.ceil(modules.length / cols) || 1;
  const cardH = (gridB - gridY - gap * (rows - 1)) / rows;
  modules.forEach((mod, i) => {
    const r = Math.floor(i / cols), col = i % cols;
    const x = MX + 0.16 + col * (cardW + gap);
    const y = gridY + r * (cardH + gap);
    s.addShape('roundRect', { x, y, w: cardW, h: cardH, fill: { color: C.BG2 }, line: { color: C.PERI, width: 0.5 }, rectRadius: 0.04 });
    // 模块名条
    s.addShape('roundRect', { x: x + 0.07, y: y + 0.07, w: cardW - 0.14, h: 0.27, fill: { color: C.HEAD }, line: { type: 'none' }, rectRadius: 0.03 });
    s.addText('▎' + clip(mod.name, 13), { x: x + 0.13, y: y + 0.07, w: cardW - 0.26, h: 0.27, fontSize: 10, bold: true, color: C.WH, valign: 'middle' });
    // 功能点 chips：2列网格
    const feats = (mod.feats || []).slice(0, 8);
    const fcols = 2, fgap = 0.05;
    const fw = (cardW - 0.14 - fgap) / fcols;
    const fy0 = y + 0.4;
    const frows = Math.ceil(feats.length / fcols) || 1;
    const availFH = cardH - 0.46;
    const fh = Math.min(0.2, (availFH - fgap * (frows - 1)) / Math.max(1, frows));
    feats.forEach((ft, k) => {
      const fr = Math.floor(k / fcols), fc = k % fcols;
      const fx = x + 0.07 + fc * (fw + fgap);
      const fyy = fy0 + fr * (fh + fgap);
      s.addShape('roundRect', { x: fx, y: fyy, w: fw, h: fh, fill: { color: C.CHIP }, line: { type: 'none' }, rectRadius: 0.02 });
      s.addText(clip(ft, 8), { x: fx + 0.02, y: fyy, w: fw - 0.04, h: fh, fontSize: 7.4, color: C.TX, align: 'center', valign: 'middle' });
    });
  });

  // ---------- 右栏：创新价值 / 产品矩阵 ----------
  const RX = 10.18, RW = 2.9;
  s.addShape('rect', { x: RX, y: topY, w: RW, h: colBottom - topY, fill: { color: C.PANEL }, line: { type: 'none' }, rectRadius: 0.06 });
  sectionHead(s, '创新价值 · 产品矩阵', 'PRODUCT MATRIX', RX + 0.14, topY + 0.12, RW - 0.28, C.AMBER);
  const matrix = productMatrix();
  const my0 = topY + 0.66;
  const mB = colBottom - 0.12;
  const mGap = 0.08;
  const mH = (mB - my0 - mGap * (matrix.length - 1)) / matrix.length;
  matrix.forEach((m, i) => {
    const y = my0 + i * (mH + mGap);
    s.addShape('roundRect', { x: RX + 0.14, y, w: RW - 0.28, h: mH, fill: { color: C.BG2 }, line: { color: C.BLUE, width: 0.5 }, rectRadius: 0.03 });
    s.addShape('roundRect', { x: RX + 0.22, y: y + 0.06, w: 0.9, h: 0.24, fill: { color: C.PERI }, line: { type: 'none' }, rectRadius: 0.03 });
    s.addText(m.tag, { x: RX + 0.22, y: y + 0.06, w: 0.9, h: 0.24, fontSize: 9, bold: true, color: C.WH, align: 'center', valign: 'middle' });
    s.addText(m.name, { x: RX + 1.18, y: y + 0.06, w: RW - 1.36, h: 0.24, fontSize: 9.5, bold: true, color: C.BLUEL, valign: 'middle' });
    s.addText(clip(m.desc, 62), { x: RX + 0.24, y: y + 0.33, w: RW - 0.42, h: mH - 0.37, fontSize: 7.4, color: C.GR, valign: 'top', lineSpacingMultiple: 1.02 });
  });

  s.addText(`${KB.company.shortName}  ${KB.company.slogan}  |  ${KB.company.site}`,
    { x: 0, y: 7.16, w: 13.33, h: 0.3, fontSize: 8, color: C.GRL, align: 'center', valign: 'middle' });

  return pres;
}

async function generateOnePagerBuffer(park) {
  const pres = buildOnePager(park);
  return await pres.write({ outputType: 'nodebuffer' });
}

function buildOnePagerPreview(park) {
  const kb = KB.getKB(park.id) || {};
  const data = getOnePagerData(park.id);
  return {
    ok: true,
    parkId: park.id, parkName: park.name, icon: park.icon,
    en: EN_NAME[park.id] || `${park.name} Digital Twin IOC Platform`,
    intro: clip(data.intro || (kb.background || '').replace(/\s+/g, ''), 220),
    pains: (kb.pains || []).slice(0, 5).map(p => ({ title: p.title, desc: p.desc || p.fix || '' })),
    scenarios: (data.modules || []).slice(0, 8).map(m => ({ name: m.name, features: (m.feats || []).slice(0, 8) })),
    cases: (kb.cases || []).slice(0, 2).map(c => ({ name: c.name, value: c.value || c.bg || '' })),
    matrix: productMatrix(),
    company: KB.company.shortName,
  };
}

module.exports = { generateOnePagerBuffer, buildOnePagerPreview, EN_NAME };
