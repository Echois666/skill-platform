// PPT 生成器 —— 生成对齐 51WORLD 真实方案结构的完整 .pptx 演示文稿
const pptxgen = require('pptxgenjs');
const { phases } = require('../data/content');
const KB = require('../data/knowledgeBase');

const PURPLE = '7C3AED';
const PINK = 'EC4899';
const DARK = '1E1B4B';
const GRAY = '64748B';
const LIGHT = 'F1F5F9';

function sectionTitle(s, t, sub) {
  s.addText(t, { x: 0.6, y: 0.4, w: 12.1, h: 0.7, fontSize: 30, bold: true, color: PURPLE });
  if (sub) s.addText(sub, { x: 0.6, y: 1.1, w: 12.1, h: 0.45, fontSize: 14, color: GRAY });
  s.addShape('line', { x: 0.6, y: 1.15, w: 2.2, h: 0, line: { color: PINK, width: 2 } });
}

async function generatePptBuffer(park, version, brief) {
  const kb = KB.getKB(park.id) || {};
  const projectName = (brief && brief.projectName) || `${park.name}数字化解决方案`;
  const pres = new pptxgen();
  pres.author = KB.company.shortName;
  pres.title = projectName;
  pres.layout = 'LAYOUT_WIDE';
  let s;

  // 1 封面
  s = pres.addSlide(); s.background = { color: DARK };
  s.addText(park.icon, { x: 0.5, y: 1.3, w: 12.3, h: 1.4, fontSize: 72, align: 'center', color: 'FFFFFF' });
  s.addText('AI 赋能 · ' + park.name + '综合解决方案', { x: 0.5, y: 2.8, w: 12.3, h: 1, fontSize: 40, bold: true, align: 'center', color: 'FFFFFF' });
  s.addText(projectName, { x: 0.5, y: 3.9, w: 12.3, h: 0.7, fontSize: 22, align: 'center', color: 'A78BFA' });
  s.addText(KB.company.shortName + '  ·  ' + KB.company.slogan, { x: 0.5, y: 5.6, w: 12.3, h: 0.5, fontSize: 16, align: 'center', color: 'CBD5E1' });
  s.addText(`${version}  ·  ${new Date().toLocaleDateString('zh-CN')}`, { x: 0.5, y: 6.4, w: 12.3, h: 0.4, fontSize: 12, align: 'center', color: GRAY });

  // 2 目录
  s = pres.addSlide();
  sectionTitle(s, '目录', 'CATALOG');
  const toc = ['01  行业态势与政策背景', '02  需求理解与痛点分析', '03  总体架构与技术底座', '04  解决方案与应用场景', '05  落地案例与建设价值'];
  toc.forEach((t, i) => {
    const cy = 1.8 + i * 0.95;
    s.addShape('roundRect', { x: 1.2, y: cy, w: 10.9, h: 0.75, fill: { color: LIGHT }, rectRadius: 0.08 });
    s.addText(t, { x: 1.5, y: cy, w: 10.3, h: 0.75, fontSize: 18, bold: true, color: DARK, valign: 'middle' });
  });

  // 3 行业态势
  s = pres.addSlide();
  sectionTitle(s, '01  行业态势与政策背景', 'INDUSTRY TREND');
  if (kb.background) s.addText(kb.background, { x: 0.6, y: 1.5, w: 12.1, h: 1.4, fontSize: 14, color: '334155', valign: 'top' });
  s.addText('政策利好', { x: 0.6, y: 3.0, w: 5.9, h: 0.4, fontSize: 16, bold: true, color: PURPLE });
  s.addText(KB.industryTrends.policies.map(x => '• ' + x).join('\n'), { x: 0.6, y: 3.5, w: 5.9, h: 3.2, fontSize: 12, color: '475569', valign: 'top', lineSpacingMultiple: 1.3 });
  s.addText('发展优势', { x: 6.8, y: 3.0, w: 5.9, h: 0.4, fontSize: 16, bold: true, color: PURPLE });
  s.addText(KB.industryTrends.advantages.map(x => '• ' + x).join('\n'), { x: 6.8, y: 3.5, w: 5.9, h: 3.2, fontSize: 12, color: '475569', valign: 'top', lineSpacingMultiple: 1.3 });

  // 4 共性痛点
  s = pres.addSlide();
  sectionTitle(s, '02  需求理解与痛点分析', 'PAIN POINTS');
  KB.commonPains.forEach((x, i) => {
    const cx = 0.6 + (i % 3) * 4.05, cy = 1.7 + Math.floor(i / 3) * 1.55;
    s.addShape('roundRect', { x: cx, y: cy, w: 3.85, h: 1.4, fill: { color: 'FEF2F2' }, line: { color: PINK, width: 1 }, rectRadius: 0.08 });
    s.addText('⚠ ' + x.title, { x: cx + 0.15, y: cy + 0.1, w: 3.55, h: 0.45, fontSize: 14, bold: true, color: 'BE123C' });
    s.addText(x.desc, { x: cx + 0.15, y: cy + 0.55, w: 3.55, h: 0.75, fontSize: 10.5, color: '64748B', valign: 'top' });
  });
  // 本行业 + 客户诉求
  const painLine = '本行业重点：' + (park.pains || []).join('、');
  s.addText(painLine, { x: 0.6, y: 5.0, w: 12.1, h: 0.6, fontSize: 12, color: '334155', valign: 'top' });
  if (brief && brief.emphases && brief.emphases.length) {
    s.addText('客户核心诉求：' + brief.emphases.join('、'), { x: 0.6, y: 5.7, w: 12.1, h: 0.6, fontSize: 13, bold: true, color: PURPLE });
  }

  // 5 分层架构
  s = pres.addSlide();
  sectionTitle(s, '03  总体架构与技术底座', 'ARCHITECTURE');
  const colors = ['A78BFA', '818CF8', '60A5FA', '38BDF8', '34D399', 'FBBF24'];
  KB.architecture.forEach((l, i) => {
    const cy = 1.6 + i * 0.82;
    s.addShape('roundRect', { x: 2.2, y: cy, w: 8.9, h: 0.7, fill: { color: colors[i] }, rectRadius: 0.05 });
    s.addText([{ text: l.layer + '  ', options: { bold: true, fontSize: 15 } }, { text: l.desc, options: { fontSize: 11 } }],
      { x: 2.2, y: cy, w: 8.9, h: 0.7, align: 'center', valign: 'middle', color: 'FFFFFF' });
  });

  // 6 六大产品能力
  s = pres.addSlide();
  sectionTitle(s, KB.company.shortName + ' 六大产品能力', 'SIX MAJOR PRODUCT CAPABILITIES');
  KB.capabilities.forEach((c, i) => {
    const cx = 0.6 + (i % 3) * 4.05, cy = 1.7 + Math.floor(i / 3) * 2.5;
    s.addShape('roundRect', { x: cx, y: cy, w: 3.85, h: 2.3, fill: { color: LIGHT }, line: { color: PURPLE, width: 1 }, rectRadius: 0.08 });
    s.addText(c.name, { x: cx + 0.15, y: cy + 0.12, w: 3.55, h: 0.5, fontSize: 14, bold: true, color: PURPLE });
    s.addText(c.desc, { x: cx + 0.15, y: cy + 0.62, w: 3.55, h: 0.7, fontSize: 9.5, color: '64748B', valign: 'top' });
    s.addText(c.points.map(p => '· ' + p).join('\n'), { x: cx + 0.15, y: cy + 1.3, w: 3.55, h: 0.95, fontSize: 8.5, color: '475569', valign: 'top', lineSpacingMultiple: 1.1 });
  });

  // 7 解决方案场景（每个场景一页或合并）
  const focus = (brief && brief.focusScenarios) || [];
  const scenarios = kb.scenarios || (park.modules || []).map(m => ({ name: m, desc: m, features: [] }));
  s = pres.addSlide();
  sectionTitle(s, '04  解决方案与应用场景', 'SOLUTION & SCENARIOS');
  scenarios.slice(0, 6).forEach((sc, i) => {
    const cx = 0.6 + (i % 3) * 4.05, cy = 1.7 + Math.floor(i / 3) * 2.5;
    const isFocus = focus.includes(sc.name);
    s.addShape('roundRect', { x: cx, y: cy, w: 3.85, h: 2.3, fill: { color: isFocus ? 'F5F3FF' : LIGHT }, line: { color: isFocus ? PINK : PURPLE, width: isFocus ? 2 : 1 }, rectRadius: 0.08 });
    s.addText((isFocus ? '★ ' : '') + sc.name, { x: cx + 0.15, y: cy + 0.12, w: 3.55, h: 0.5, fontSize: 14, bold: true, color: isFocus ? 'BE123C' : DARK });
    s.addText(sc.desc, { x: cx + 0.15, y: cy + 0.6, w: 3.55, h: 0.7, fontSize: 9.5, color: '64748B', valign: 'top' });
    s.addText((sc.features || []).map(f => '· ' + f).join('\n'), { x: cx + 0.15, y: cy + 1.3, w: 3.55, h: 0.95, fontSize: 9, color: '475569', valign: 'top', lineSpacingMultiple: 1.1 });
  });

  // 8 实施计划三阶段
  ['presales', 'midsales', 'delivery'].forEach(key => {
    const ph = phases[key];
    s = pres.addSlide();
    sectionTitle(s, '实施计划 · ' + ph.name, ph.desc);
    ph.items.forEach((it, i) => {
      const y = 1.7 + i * 1.0;
      s.addText(it.name, { x: 0.6, y, w: 2.2, h: 0.9, fontSize: 15, bold: true, color: DARK, valign: 'middle' });
      s.addText(it.duration, { x: 0.6, y: y + 0.45, w: 2.2, h: 0.4, fontSize: 11, color: PINK });
      s.addText('交付物：' + it.deliverables.join('、'), { x: 3.0, y, w: 9.7, h: 0.9, fontSize: 13, color: '475569', valign: 'middle' });
    });
  });

  // 9 落地案例
  s = pres.addSlide();
  sectionTitle(s, '05  落地案例', 'CASES');
  (kb.cases || []).slice(0, 3).forEach((c, i) => {
    const cy = 1.7 + i * 1.55;
    s.addShape('roundRect', { x: 0.6, y: cy, w: 12.1, h: 1.4, fill: { color: LIGHT }, rectRadius: 0.06 });
    s.addText('● ' + c.name, { x: 0.85, y: cy + 0.1, w: 11.6, h: 0.4, fontSize: 15, bold: true, color: PURPLE });
    s.addText(c.desc, { x: 0.85, y: cy + 0.5, w: 11.6, h: 0.4, fontSize: 11, color: '475569' });
    if (c.metrics) s.addText('成效：' + c.metrics.join('　|　'), { x: 0.85, y: cy + 0.92, w: 11.6, h: 0.4, fontSize: 11, bold: true, color: 'BE123C' });
  });

  // 10 建设价值
  s = pres.addSlide();
  sectionTitle(s, '建设价值与成效', 'VALUE');
  (kb.valueMetrics || []).forEach((m, i) => {
    const cx = 1.2 + i * 3.7;
    s.addShape('roundRect', { x: cx, y: 2.0, w: 3.4, h: 2.6, fill: { color: DARK }, rectRadius: 0.1 });
    s.addText(m.value, { x: cx, y: 2.3, w: 3.4, h: 1, fontSize: 40, bold: true, align: 'center', color: '34D399' });
    s.addText(m.label, { x: cx, y: 3.4, w: 3.4, h: 0.5, fontSize: 18, bold: true, align: 'center', color: 'FFFFFF' });
    s.addText(m.desc, { x: cx + 0.2, y: 3.95, w: 3.0, h: 0.55, fontSize: 11, align: 'center', color: 'CBD5E1' });
  });
  s.addText('综合价值：' + (park.value || []).join('　·　'), { x: 0.6, y: 5.2, w: 12.1, h: 1, fontSize: 13, color: '334155', valign: 'top' });

  // 11 结尾
  s = pres.addSlide(); s.background = { color: DARK };
  s.addText('谢谢观看', { x: 0.5, y: 2.6, w: 12.3, h: 1, fontSize: 44, bold: true, align: 'center', color: 'FFFFFF' });
  s.addText(KB.company.name, { x: 0.5, y: 3.9, w: 12.3, h: 0.6, fontSize: 18, align: 'center', color: 'A78BFA' });
  s.addText(KB.company.slogan + '  ·  ' + KB.company.site, { x: 0.5, y: 4.6, w: 12.3, h: 0.5, fontSize: 14, align: 'center', color: 'CBD5E1' });

  return await pres.write({ outputType: 'nodebuffer' });
}

module.exports = { generatePptBuffer };
