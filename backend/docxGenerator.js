// Word 文档生成器 —— 生成对齐 51WORLD 真实方案结构的完整专业 .docx
// 内容模型（buildSolutionModel）为单一数据源：Word 下载与网页在线查看共用同一模型，保证一致。
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const { phases } = require('../data/content');
const KB = require('../data/knowledgeBase');

function h(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 22, bold: !!opts.bold, color: opts.color, italics: opts.italics })],
    spacing: { after: opts.after == null ? 100 : opts.after, line: 300 },
    alignment: opts.align
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 21, color: opts.color, bold: opts.bold })],
    bullet: { level: opts.level || 0 }, spacing: { after: 50, line: 290 }
  });
}

function featureLine(feature) {
  if (typeof feature === 'string') return feature;
  if (!feature || typeof feature !== 'object') return String(feature || '');
  const parts = [];
  if (feature.name) parts.push(feature.name);
  if (feature.detail) parts.push(feature.detail);
  if (feature.value && !String(feature.detail || '').includes(feature.value)) parts.push(`价值：${feature.value}`);
  return parts.join('：');
}

// ============ 内容模型构建（Word + 在线查看共用） ============
// 每个 block：{ tag:'h1'|'h2'|'p'|'bullet'|'pagebreak'|'spacer', text, ...style }
function buildSolutionModel(park, version, brief) {
  const kb = KB.getKB(park.id) || {};
  const projectName = (brief && brief.projectName) || `${park.name}数字化解决方案`;
  const B = [];
  const push = (b) => B.push(b);
  const h1 = (text) => push({ tag: 'h1', text });
  const h2 = (text) => push({ tag: 'h2', text });
  const para = (text, o = {}) => push(Object.assign({ tag: 'p', text }, o));
  const li = (text, o = {}) => push(Object.assign({ tag: 'bullet', text }, o));
  const pb = () => push({ tag: 'pagebreak' });
  const spacer = (before) => push({ tag: 'spacer', before });

  // ===== 封面 =====
  spacer(1400);
  para('AI 赋能', { bold: true, size: 36, color: '7C3AED', align: 'center', after: 60 });
  para(`${park.name}综合解决方案`, { bold: true, size: 52, align: 'center', after: 200 });
  para(projectName, { size: 26, color: '475569', align: 'center', after: 600 });
  para(KB.company.shortName + ' · ' + KB.company.slogan, { size: 22, color: '7C3AED', align: 'center', after: 120 });
  para(`版本：${version}　|　生成日期：${new Date().toLocaleDateString('zh-CN')}`, { size: 20, color: '94A3B8', align: 'center' });
  pb();

  // ===== 编制说明 / 需求理解 =====
  if (brief && (brief.understanding || brief.rawText)) {
    h1('编制说明');
    if (brief.client) para(`客户主体：${brief.client}`, { bold: true });
    if (brief.rawText) para('原始需求：' + brief.rawText, { color: '475569' });
    if (brief.understanding) para('需求理解：' + brief.understanding, { color: '334155' });
    if (brief.emphases && brief.emphases.length) para('核心诉求：' + brief.emphases.join('、'), { bold: true, color: '7C3AED' });
    pb();
  }

  // ===== 目录 =====
  h1('目录');
  ['一、行业态势与政策背景', '二、需求理解与痛点分析', '三、总体架构与技术底座',
   '四、解决方案与应用场景', '五、IOC 标准应用', '六、落地案例', '七、实施计划', '八、建设价值与成效',
   '九、服务保障', '十、关于我们'].forEach(t => para(t, { size: 22, after: 60 }));
  pb();

  // ===== 一、行业态势与政策背景 =====
  h1('一、行业态势与政策背景');
  if (kb.background) para(kb.background);
  para(KB.industryTrends.intro);
  const policies = (kb.policies && kb.policies.length) ? kb.policies : KB.industryTrends.policies;
  para('政策利好：', { bold: true });
  policies.forEach(x => li(x));
  if (kb.marketData) {
    para('市场机遇：', { bold: true });
    para(kb.marketData, { color: '7C3AED' });
  }
  para('发展优势：', { bold: true });
  KB.industryTrends.advantages.forEach(x => li(x));

  // ===== 二、需求理解与痛点分析 =====
  h1('二、需求理解与痛点分析');
  if (kb.objectives && kb.objectives.length) {
    para('2.1  建设目标', { bold: true, size: 24 });
    kb.objectives.forEach(x => li(x));
  }
  para('2.2  园区/行业共性痛点', { bold: true, size: 24 });
  KB.commonPains.forEach(x => li(`${x.title}：${x.desc}`));
  para('2.3  本行业重点痛点与数字孪生应对', { bold: true, size: 24 });
  (kb.pains || []).forEach(x => {
    if (typeof x === 'string') { li(x); return; }
    li(`${x.title}：${x.desc}　【数字孪生应对】${x.fix}`);
  });
  if (brief && brief.emphases && brief.emphases.length) {
    para('2.4  客户核心诉求', { bold: true, size: 24 });
    para('结合客户需求，本方案重点强化以下能力：' + brief.emphases.join('、') + '。', { color: '7C3AED' });
  }

  // ===== 三、总体架构与技术底座 =====
  h1('三、总体架构与技术底座');
  para('3.1  ' + KB.company.shortName + ' 实战力', { bold: true, size: 24 });
  para(KB.company.scale, { color: '334155' });
  (KB.company.advantages || []).forEach(x => li(x));
  para('3.2  分层技术架构', { bold: true, size: 24 });
  para('本方案采用统一数字孪生底座的分层架构（AI + WDP + Copilot），自上而下包括：');
  KB.architecture.forEach(l => li(`${l.layer}：${l.desc}`));
  para('3.3  ' + KB.company.shortName + ' 五大产品核心能力', { bold: true, size: 24 });
  para(`方案依托 ${KB.company.shortName} 自主研发的数字孪生底座，五大产品核心能力环环相扣：`);
  KB.capabilities.forEach((c, i) => {
    para(`（${i + 1}）${c.name}`, { bold: true, color: '7C3AED', after: 40 });
    para(c.desc, { size: 21, after: 40 });
    c.points.forEach(pt => li(pt, { size: 20, level: 1 }));
  });
  para('3.4  标准建设', { bold: true, size: 24 });
  para(KB.standards.summary, { color: '334155' });
  KB.standards.highlights.forEach(x => li(x, { size: 20 }));
  para('3.5  建设方法论', { bold: true, size: 24 });
  KB.methodology.forEach(m => li(`${m.step}：${m.desc}`, { size: 20 }));

  // ===== 四、解决方案与应用场景 =====
  h1('四、解决方案与应用场景');
  const focus = (brief && brief.focusScenarios) || [];
  const scenarios = kb.scenarios || (park.modules || []).map(m => ({ name: m, desc: `${m}是本方案的核心场景。`, features: [] }));
  scenarios.forEach((sc, i) => {
    const isFocus = focus.includes(sc.name);
    h2(`4.${i + 1}  ${sc.name}${isFocus ? '（客户重点）' : ''}`);
    para(sc.desc, { color: isFocus ? '7C3AED' : undefined });
    if (sc.value) para('场景价值：' + sc.value, { color: 'BE123C', size: 21 });
    if (sc.features && sc.features.length) {
      para('核心功能：', { bold: true, size: 22, after: 50 });
      sc.features.forEach(f => li(featureLine(f)));
    }
  });

  // ===== 五、IOC 标准应用 =====
  h1('五、IOC 标准应用');
  para('通过智慧 IOC 驾驶舱建设实现对外服务形象提升、对内运营降本增效，建设新一代科技、高效、安全、绿色、健康的智慧' + park.name + '。园区 IOC 八大标准应用：');
  KB.iocApps.forEach(a => li(`${a.name}：${a.desc}`));
  if (park.modules && park.modules.length) {
    para('推荐纳入本项目范围的模块清单：' + park.modules.join('、') + '。', { color: '334155' });
  }

  // ===== 六、落地案例 =====
  h1('六、落地案例');
  para(KB.company.scale, { size: 20, color: '64748B' });
  (kb.cases || []).forEach((c, i) => {
    para(`案例 ${i + 1}：${c.name}`, { bold: true, size: 23, color: '7C3AED' });
    if (c.bg) para('项目背景：' + c.bg, { size: 21 });
    const cv = c.value || c.desc;
    if (cv) para('项目价值：' + cv, { size: 21 });
    if (c.funcs) para('功能应用：' + c.funcs, { size: 21, color: '334155' });
    if (c.metrics && c.metrics.length) para('建设成效：' + c.metrics.join('；'), { size: 21, color: 'BE123C' });
  });
  if (!kb.cases || !kb.cases.length) para(`${KB.company.shortName} 已在该领域服务多个标杆项目，可按需提供详细案例资料。`);

  // ===== 七、实施计划 =====
  h1('七、实施计划');
  para('项目实施分为售前、售中、交付三大阶段，各阶段关键环节与交付物如下：');
  ['presales', 'midsales', 'delivery'].forEach((key, idx) => {
    const ph = phases[key];
    h2(`7.${idx + 1}  ${ph.name}`);
    para(ph.desc, { color: '666666' });
    ph.items.forEach(it => {
      para(`${it.name}（${it.duration}）`, { bold: true, after: 40 });
      para('主要活动：' + it.activities.join('、'), { size: 20, after: 20 });
      para('交付物：' + it.deliverables.join('、'), { size: 20, color: '7C3AED' });
    });
  });

  // ===== 八、建设价值与成效 =====
  h1('八、建设价值与成效');
  if (kb.valueMetrics && kb.valueMetrics.length) {
    para('量化价值：', { bold: true });
    kb.valueMetrics.forEach(m => li(`${m.label} ${m.value}　——　${m.desc}`, { bold: true }));
  }
  para('综合价值：', { bold: true });
  (park.value || []).forEach(x => li(x));
  para('阶段性价值落地路径：', { bold: true });
  [
    '近期价值：优先完成数据底座、IOC驾驶舱与高频刚需场景上线，快速形成可展示、可汇报、可验收成果。',
    '中期价值：接入更多业务系统与物联设备，形成跨部门联动、事件闭环、运营分析和精细化管理能力。',
    '长期价值：沉淀数字资产和行业模型，接入AI助手、仿真推演与报价/运维平台，形成持续运营和复用能力。'
  ].forEach(x => li(x));

  // ===== 九、服务保障 =====
  h1('九、服务保障');
  ['7×24 小时技术支持响应', '专属项目经理全程跟踪', '定期巡检与健康度评估', '持续的功能迭代与升级', '完善的培训与知识转移体系'].forEach(x => li(x));

  // ===== 十、关于我们 =====
  h1('十、关于我们');
  para(KB.company.intro);
  para(KB.company.scale, { color: '334155' });
  para(`${KB.company.shortName}　${KB.company.slogan}　${KB.company.site}`, { bold: true, color: '7C3AED', align: 'center', after: 200 });
  para('—— 本方案为' + version + '，最终以双方确认的合同为准 ——', { size: 18, color: '999999', align: 'center' });

  return { title: projectName, blocks: B };
}

// 内容模型 block → docx Paragraph
function blockToParagraph(b) {
  switch (b.tag) {
    case 'h1': return h(b.text, HeadingLevel.HEADING_1);
    case 'h2': return h(b.text, HeadingLevel.HEADING_2);
    case 'bullet': return bullet(b.text, b);
    case 'pagebreak': return new Paragraph({ text: '', pageBreakBefore: true });
    case 'spacer': return new Paragraph({ text: '', spacing: { before: b.before || 0 } });
    default: {
      const opts = Object.assign({}, b);
      if (opts.align === 'center') opts.align = AlignmentType.CENTER;
      else delete opts.align;
      return p(b.text, opts);
    }
  }
}

function buildSolutionDoc(park, version, brief) {
  const model = buildSolutionModel(park, version, brief);
  const children = model.blocks.map(blockToParagraph);
  return new Document({
    creator: KB.company.shortName,
    title: model.title,
    sections: [{ children }]
  });
}

async function generateSolutionBuffer(park, version, brief) {
  const doc = buildSolutionDoc(park, version, brief);
  return await Packer.toBuffer(doc);
}

module.exports = { generateSolutionBuffer, buildSolutionModel };
