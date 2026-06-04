// PPT 生成器 —— 使用 pptxgenjs 生成真实可下载的 .pptx 演示文稿
const pptxgen = require('pptxgenjs');
const { phases } = require('../data/content');

const PURPLE = '7C3AED';
const PINK = 'EC4899';
const DARK = '1E1B4B';
const GRAY = '64748B';

async function generatePptBuffer(park, version) {
  const pres = new pptxgen();
  pres.author = '园区Skill平台';
  pres.title = `${park.name}解决方案`;
  pres.layout = 'LAYOUT_WIDE';

  // 封面
  let s = pres.addSlide();
  s.background = { color: DARK };
  s.addText(park.icon, { x: 0.5, y: 1.6, w: 12.3, h: 1.5, fontSize: 80, align: 'center', color: 'FFFFFF' });
  s.addText(park.name, { x: 0.5, y: 3.0, w: 12.3, h: 1, fontSize: 44, bold: true, align: 'center', color: 'FFFFFF' });
  s.addText('数字化解决方案', { x: 0.5, y: 4.0, w: 12.3, h: 0.8, fontSize: 28, align: 'center', color: 'A78BFA' });
  s.addText(park.desc, { x: 0.5, y: 4.9, w: 12.3, h: 0.5, fontSize: 16, align: 'center', color: 'CBD5E1' });
  s.addText(`${version}  ·  ${new Date().toLocaleDateString('zh-CN')}`, { x: 0.5, y: 6.4, w: 12.3, h: 0.4, fontSize: 12, align: 'center', color: GRAY });

  // 痛点分析
  s = pres.addSlide();
  s.addText('需求与痛点分析', { x: 0.5, y: 0.4, w: 12.3, h: 0.8, fontSize: 32, bold: true, color: PURPLE });
  park.pains.forEach((x, i) => {
    s.addText([{ text: '⚠ ', options: { color: PINK } }, { text: x, options: { color: '334155' } }],
      { x: 0.8, y: 1.5 + i * 1.0, w: 11.5, h: 0.8, fontSize: 18, valign: 'middle' });
  });

  // 建设价值
  s = pres.addSlide();
  s.addText('建设目标与核心价值', { x: 0.5, y: 0.4, w: 12.3, h: 0.8, fontSize: 32, bold: true, color: PURPLE });
  park.value.forEach((x, i) => {
    s.addText([{ text: '✓ ', options: { color: '22C55E' } }, { text: x, options: { color: '334155' } }],
      { x: 0.8, y: 1.5 + i * 1.0, w: 11.5, h: 0.8, fontSize: 18, valign: 'middle' });
  });

  // 核心功能模块
  s = pres.addSlide();
  s.addText('核心功能模块', { x: 0.5, y: 0.4, w: 12.3, h: 0.8, fontSize: 32, bold: true, color: PURPLE });
  const cols = 3;
  park.modules.forEach((m, i) => {
    const cx = 0.6 + (i % cols) * 4.1;
    const cy = 1.6 + Math.floor(i / cols) * 1.7;
    s.addShape(pres.ShapeType.roundRect, { x: cx, y: cy, w: 3.8, h: 1.4, fill: { color: 'F1F5F9' }, line: { color: PURPLE, width: 1 }, rectRadius: 0.1 });
    s.addText(m, { x: cx, y: cy, w: 3.8, h: 1.4, fontSize: 16, bold: true, align: 'center', valign: 'middle', color: DARK });
  });

  // 技术架构
  s = pres.addSlide();
  s.addText('技术架构', { x: 0.5, y: 0.4, w: 12.3, h: 0.8, fontSize: 32, bold: true, color: PURPLE });
  const layers = [
    ['展现层', 'PC端 · 移动端 · 可视化大屏', 'A78BFA'],
    ['应用层', '各业务功能模块与场景应用', '818CF8'],
    ['平台层', '数据中台 · AI中台 · 统一认证', '60A5FA'],
    ['网络层', '5G · 光纤高速数据传输', '34D399'],
    ['感知层', '物联网设备 · 传感器全域采集', 'FBBF24']
  ];
  layers.forEach((l, i) => {
    s.addShape(pres.ShapeType.roundRect, { x: 2.5, y: 1.5 + i * 1.0, w: 8.3, h: 0.85, fill: { color: l[2] }, rectRadius: 0.05 });
    s.addText([{ text: l[0] + '  ', options: { bold: true, fontSize: 18 } }, { text: l[1], options: { fontSize: 13 } }],
      { x: 2.5, y: 1.5 + i * 1.0, w: 8.3, h: 0.85, align: 'center', valign: 'middle', color: 'FFFFFF' });
  });

  // 三阶段实施计划
  ['presales', 'midsales', 'delivery'].forEach(key => {
    const ph = phases[key];
    s = pres.addSlide();
    s.addText(`实施计划 · ${ph.name}`, { x: 0.5, y: 0.4, w: 12.3, h: 0.7, fontSize: 30, bold: true, color: PURPLE });
    s.addText(ph.desc, { x: 0.5, y: 1.1, w: 12.3, h: 0.5, fontSize: 14, color: GRAY });
    ph.items.forEach((it, i) => {
      const y = 1.8 + i * 1.0;
      s.addText(`${it.name}`, { x: 0.6, y, w: 2.2, h: 0.9, fontSize: 15, bold: true, color: DARK, valign: 'middle' });
      s.addText(it.duration, { x: 0.6, y: y + 0.45, w: 2.2, h: 0.4, fontSize: 11, color: PINK });
      s.addText('交付物：' + it.deliverables.join('、'), { x: 3.0, y, w: 9.7, h: 0.9, fontSize: 13, color: '475569', valign: 'middle' });
    });
  });

  // 服务保障
  s = pres.addSlide();
  s.addText('服务保障', { x: 0.5, y: 0.4, w: 12.3, h: 0.8, fontSize: 32, bold: true, color: PURPLE });
  ['7×24小时技术支持响应', '专属项目经理全程跟踪', '定期巡检与健康度评估', '持续功能迭代与升级', '完善培训与知识转移'].forEach((x, i) => {
    s.addText('★ ' + x, { x: 0.8, y: 1.6 + i * 0.9, w: 11.5, h: 0.7, fontSize: 18, color: '334155', valign: 'middle' });
  });

  // 结尾
  s = pres.addSlide();
  s.background = { color: DARK };
  s.addText('谢谢观看', { x: 0.5, y: 2.8, w: 12.3, h: 1, fontSize: 44, bold: true, align: 'center', color: 'FFFFFF' });
  s.addText('园区Skill智能方案生成平台', { x: 0.5, y: 4.0, w: 12.3, h: 0.6, fontSize: 18, align: 'center', color: 'A78BFA' });

  return await pres.write({ outputType: 'nodebuffer' });
}

module.exports = { generatePptBuffer };
