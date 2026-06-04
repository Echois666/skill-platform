// Word 文档生成器 —— 使用 docx 库生成真实可下载的 .docx 方案文档
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const { phases } = require('../data/content');

function h(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 22, bold: !!opts.bold, color: opts.color })],
    spacing: { after: opts.after || 80 },
    alignment: opts.align
  });
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 40 } });
}

function buildSolutionDoc(park, version) {
  const children = [];

  // 封面
  children.push(new Paragraph({ text: '', spacing: { before: 1200 } }));
  children.push(p(`${park.icon}  ${park.name}`, { bold: true, size: 56, align: AlignmentType.CENTER, after: 200 }));
  children.push(p('数字化解决方案', { bold: true, size: 40, color: '7C3AED', align: AlignmentType.CENTER, after: 600 }));
  children.push(p(park.desc, { size: 24, align: AlignmentType.CENTER, after: 200 }));
  children.push(p(`版本：${version}`, { size: 22, align: AlignmentType.CENTER }));
  children.push(p(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, { size: 22, align: AlignmentType.CENTER, after: 400 }));
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));

  // 一、项目概述
  children.push(h('一、项目概述', HeadingLevel.HEADING_1));
  children.push(p(`本方案面向${park.name}场景，围绕“${park.desc}”的核心目标，结合行业最佳实践与数字孪生、物联网、大数据、人工智能等先进技术，为客户打造一套完整、可落地的数字化解决方案。`));

  // 二、需求与痛点分析
  children.push(h('二、需求与痛点分析', HeadingLevel.HEADING_1));
  children.push(p('当前客户在业务运营中普遍面临以下挑战：', { bold: true }));
  park.pains.forEach(x => children.push(bullet(x)));

  // 三、建设目标与价值
  children.push(h('三、建设目标与价值', HeadingLevel.HEADING_1));
  children.push(p('通过本方案的实施，将为客户带来以下核心价值：', { bold: true }));
  park.value.forEach(x => children.push(bullet(x)));

  // 四、核心功能模块
  children.push(h('四、核心功能模块', HeadingLevel.HEADING_1));
  park.modules.forEach((m, i) => {
    children.push(h(`4.${i + 1}  ${m}`, HeadingLevel.HEADING_2));
    children.push(p(`${m}是本方案的核心组成部分，提供完善的功能支撑，满足${park.name}在该领域的业务需求，实现数据互通、流程优化与智能决策。`));
  });

  // 五、技术架构
  children.push(h('五、技术架构', HeadingLevel.HEADING_1));
  children.push(p('本方案采用分层架构设计，自下而上包括：'));
  ['感知层：通过物联网设备、传感器实现全域数据采集',
   '网络层：基于5G/光纤等构建高速稳定的数据传输通道',
   '平台层：提供数据中台、AI中台、统一身份认证等基础能力',
   '应用层：面向业务场景的各功能模块与可视化大屏',
   '展现层：PC端、移动端、大屏多终端统一呈现'].forEach(x => children.push(bullet(x)));

  // 六、实施计划（三阶段）
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

  // 七、服务保障
  children.push(h('七、服务保障', HeadingLevel.HEADING_1));
  ['7×24小时技术支持响应', '专属项目经理全程跟踪', '定期巡检与健康度评估', '持续的功能迭代与升级', '完善的培训与知识转移体系'].forEach(x => children.push(bullet(x)));

  children.push(new Paragraph({ text: '', spacing: { before: 400 } }));
  children.push(p('—— 本方案为' + version + '，最终以双方确认的合同为准 ——', { size: 18, color: '999999', align: AlignmentType.CENTER }));

  return new Document({
    creator: '园区Skill平台',
    title: `${park.name}数字化解决方案`,
    sections: [{ children }]
  });
}

async function generateSolutionBuffer(park, version) {
  const doc = buildSolutionDoc(park, version);
  return await Packer.toBuffer(doc);
}

module.exports = { generateSolutionBuffer };
