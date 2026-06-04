// Word 文档生成器 —— 生成对齐 51WORLD 真实方案结构的完整专业 .docx
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

function buildSolutionDoc(park, version, brief) {
  const kb = KB.getKB(park.id) || {};
  const projectName = (brief && brief.projectName) || `${park.name}数字化解决方案`;
  const children = [];

  // ===== 封面 =====
  children.push(new Paragraph({ text: '', spacing: { before: 1400 } }));
  children.push(p('AI 赋能', { bold: true, size: 36, color: '7C3AED', align: AlignmentType.CENTER, after: 60 }));
  children.push(p(`${park.name}综合解决方案`, { bold: true, size: 52, align: AlignmentType.CENTER, after: 200 }));
  children.push(p(projectName, { size: 26, color: '475569', align: AlignmentType.CENTER, after: 600 }));
  children.push(p(KB.company.shortName + ' · ' + KB.company.slogan, { size: 22, color: '7C3AED', align: AlignmentType.CENTER, after: 120 }));
  children.push(p(`版本：${version}　|　生成日期：${new Date().toLocaleDateString('zh-CN')}`, { size: 20, color: '94A3B8', align: AlignmentType.CENTER }));
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));

  // ===== 编制说明 / 需求理解 =====
  if (brief && (brief.understanding || brief.rawText)) {
    children.push(h('编制说明', HeadingLevel.HEADING_1));
    if (brief.client) children.push(p(`客户主体：${brief.client}`, { bold: true }));
    if (brief.rawText) children.push(p('原始需求：' + brief.rawText, { color: '475569' }));
    if (brief.understanding) children.push(p('需求理解：' + brief.understanding, { color: '334155' }));
    if (brief.emphases && brief.emphases.length) children.push(p('核心诉求：' + brief.emphases.join('、'), { bold: true, color: '7C3AED' }));
    children.push(new Paragraph({ text: '', pageBreakBefore: true }));
  }

  // ===== 目录 =====
  children.push(h('目录', HeadingLevel.HEADING_1));
  ['一、行业态势与政策背景', '二、需求理解与痛点分析', '三、总体架构与技术底座',
   '四、解决方案与应用场景', '五、落地案例', '六、实施计划', '七、建设价值与成效',
   '八、服务保障', '九、关于我们'].forEach(t => children.push(p(t, { size: 22, after: 60 })));
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));

  // ===== 一、行业态势与政策背景 =====
  children.push(h('一、行业态势与政策背景', HeadingLevel.HEADING_1));
  if (kb.background) children.push(p(kb.background));
  children.push(p(KB.industryTrends.intro));
  children.push(p('政策利好：', { bold: true }));
  KB.industryTrends.policies.forEach(x => children.push(bullet(x)));
  children.push(p('发展优势：', { bold: true }));
  KB.industryTrends.advantages.forEach(x => children.push(bullet(x)));

  // ===== 二、需求理解与痛点分析 =====
  children.push(h('二、需求理解与痛点分析', HeadingLevel.HEADING_1));
  children.push(p('2.1  园区/行业共性痛点', { bold: true, size: 24 }));
  KB.commonPains.forEach(x => children.push(bullet(`${x.title}：${x.desc}`)));
  children.push(p('2.2  本行业重点痛点', { bold: true, size: 24 }));
  (park.pains || []).forEach(x => children.push(bullet(x)));
  if (brief && brief.emphases && brief.emphases.length) {
    children.push(p('2.3  客户核心诉求', { bold: true, size: 24 }));
    children.push(p('结合客户需求，本方案重点强化以下能力：' + brief.emphases.join('、') + '。', { color: '7C3AED' }));
  }

  // ===== 三、总体架构与技术底座 =====
  children.push(h('三、总体架构与技术底座', HeadingLevel.HEADING_1));
  children.push(p('3.1  分层技术架构', { bold: true, size: 24 }));
  children.push(p('本方案采用统一数字孪生底座的分层架构，自下而上包括：'));
  KB.architecture.forEach(l => children.push(bullet(`${l.layer}：${l.desc}`)));
  children.push(p('3.2  ' + KB.company.shortName + ' 六大产品能力', { bold: true, size: 24 }));
  children.push(p(`方案依托 ${KB.company.shortName} 自主研发的数字孪生底座，提供六大核心产品能力：`));
  KB.capabilities.forEach((c, i) => {
    children.push(p(`（${i + 1}）${c.name}`, { bold: true, color: '7C3AED', after: 40 }));
    children.push(p(c.desc, { size: 21, after: 40 }));
    c.points.forEach(pt => children.push(bullet(pt, { size: 20, level: 1 })));
  });

  // ===== 四、解决方案与应用场景 =====
  children.push(h('四、解决方案与应用场景', HeadingLevel.HEADING_1));
  const focus = (brief && brief.focusScenarios) || [];
  const scenarios = kb.scenarios || (park.modules || []).map(m => ({ name: m, desc: `${m}是本方案的核心场景。`, features: [] }));
  scenarios.forEach((sc, i) => {
    const isFocus = focus.includes(sc.name);
    children.push(h(`4.${i + 1}  ${sc.name}${isFocus ? '（客户重点）' : ''}`, HeadingLevel.HEADING_2));
    children.push(p(sc.desc, { color: isFocus ? '7C3AED' : undefined }));
    (sc.features || []).forEach(f => children.push(bullet(f)));
  });

  // ===== 五、落地案例 =====
  children.push(h('五、落地案例', HeadingLevel.HEADING_1));
  (kb.cases || []).forEach((c, i) => {
    children.push(p(`案例 ${i + 1}：${c.name}`, { bold: true, size: 23, color: '7C3AED' }));
    children.push(p(c.desc));
    if (c.metrics && c.metrics.length) children.push(p('建设成效：' + c.metrics.join('；'), { size: 21, color: '334155' }));
  });
  if (!kb.cases || !kb.cases.length) children.push(p(`${KB.company.shortName} 已在该领域服务多个标杆项目，可按需提供详细案例资料。`));

  // ===== 六、实施计划 =====
  children.push(h('六、实施计划', HeadingLevel.HEADING_1));
  children.push(p('项目实施分为售前、售中、交付三大阶段，各阶段关键环节与交付物如下：'));
  ['presales', 'midsales', 'delivery'].forEach((key, idx) => {
    const ph = phases[key];
    children.push(h(`6.${idx + 1}  ${ph.name}`, HeadingLevel.HEADING_2));
    children.push(p(ph.desc, { color: '666666' }));
    ph.items.forEach(it => {
      children.push(p(`${it.name}（${it.duration}）`, { bold: true, after: 40 }));
      children.push(p('主要活动：' + it.activities.join('、'), { size: 20, after: 20 }));
      children.push(p('交付物：' + it.deliverables.join('、'), { size: 20, color: '7C3AED' }));
    });
  });

  // ===== 七、建设价值与成效 =====
  children.push(h('七、建设价值与成效', HeadingLevel.HEADING_1));
  if (kb.valueMetrics && kb.valueMetrics.length) {
    children.push(p('量化价值：', { bold: true }));
    kb.valueMetrics.forEach(m => children.push(bullet(`${m.label} ${m.value}　——　${m.desc}`, { bold: true })));
  }
  children.push(p('综合价值：', { bold: true }));
  (park.value || []).forEach(x => children.push(bullet(x)));

  // ===== 八、服务保障 =====
  children.push(h('八、服务保障', HeadingLevel.HEADING_1));
  ['7×24 小时技术支持响应', '专属项目经理全程跟踪', '定期巡检与健康度评估', '持续的功能迭代与升级', '完善的培训与知识转移体系'].forEach(x => children.push(bullet(x)));

  // ===== 九、关于我们 =====
  children.push(h('九、关于我们', HeadingLevel.HEADING_1));
  children.push(p(KB.company.intro));
  children.push(p(`${KB.company.shortName}　${KB.company.slogan}　${KB.company.site}`, { bold: true, color: '7C3AED', align: AlignmentType.CENTER, after: 200 }));
  children.push(p('—— 本方案为' + version + '，最终以双方确认的合同为准 ——', { size: 18, color: '999999', align: AlignmentType.CENTER }));

  return new Document({
    creator: KB.company.shortName,
    title: projectName,
    sections: [{ children }]
  });
}

async function generateSolutionBuffer(park, version, brief) {
  const doc = buildSolutionDoc(park, version, brief);
  return await Packer.toBuffer(doc);
}

module.exports = { generateSolutionBuffer };
