// 交付物模板 Word 生成器 —— 把模板定义渲染成"可直接照着填写"的 .docx 文档模板
// 特点：封面 + 写作要点 + 标准目录大纲(每节带写作指引批注 + 占位提示)，对齐 51WORLD/CMMI L3 交付规范。
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const KB = require('../data/knowledgeBase');
const { getTemplate } = require('../data/deliverableTemplates');

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 22, bold: !!opts.bold, color: opts.color, italics: opts.italics })],
    spacing: { after: opts.after == null ? 100 : opts.after, line: opts.line || 300, before: opts.before || 0 },
    alignment: opts.align
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 21, color: opts.color, bold: opts.bold, italics: opts.italics })],
    bullet: { level: opts.level || 0 }, spacing: { after: 50, line: 290 }
  });
}
// 写作指引批注块（浅灰斜体 + 左侧色条），打印前应删除
function guideNote(text) {
  return new Paragraph({
    children: [new TextRun({ text: '【写作指引】' + text, italics: true, size: 19, color: '7C3AED' })],
    border: { left: { color: 'C7B8F5', space: 8, style: BorderStyle.SINGLE, size: 18 } },
    spacing: { after: 80, before: 40, line: 280 }, indent: { left: 120 }
  });
}
// 占位提示
function placeholder() {
  return new Paragraph({
    children: [new TextRun({ text: '（请在此处填写内容……）', italics: true, size: 20, color: 'AAB2C0' })],
    spacing: { after: 160, line: 290 }
  });
}

function buildTemplateDoc(tpl) {
  const children = [];

  // ===== 封面 =====
  children.push(new Paragraph({ text: '', spacing: { before: 1200 } }));
  children.push(p(KB.company.shortName + ' · 标准交付文档模板', { size: 22, color: '7C3AED', align: AlignmentType.CENTER, after: 80 }));
  children.push(p(`${tpl.icon}  ${tpl.name}`, { bold: true, size: 52, align: AlignmentType.CENTER, after: 200 }));
  children.push(p(`（${tpl.stage} · ${tpl.phase}）`, { size: 24, color: '475569', align: AlignmentType.CENTER, after: 600 }));
  children.push(p('项目名称：________________________', { size: 22, align: AlignmentType.CENTER, after: 120 }));
  children.push(p('编制单位：________________________', { size: 22, align: AlignmentType.CENTER, after: 120 }));
  children.push(p('编制人/日期：____________________', { size: 22, align: AlignmentType.CENTER, after: 400 }));
  children.push(p('本模板对齐 CMMI DEV V2.0 L3 标准化交付流程，灰紫色【写作指引】为填写说明，定稿前请删除。', { size: 18, color: '94A3B8', align: AlignmentType.CENTER }));
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));

  // ===== 文档说明 =====
  children.push(new Paragraph({ text: '文档说明', heading: HeadingLevel.HEADING_1, spacing: { after: 120 } }));
  children.push(p('文档用途：', { bold: true, after: 40 }));
  children.push(p(tpl.purpose, { color: '334155' }));
  children.push(p('适用读者：', { bold: true, after: 40 }));
  children.push(p(tpl.audience, { color: '334155' }));
  if (tpl.source) {
    children.push(p('参考来源：', { bold: true, after: 40 }));
    children.push(p(tpl.source + '（51WORLD 真实模板库）', { color: '64748B', size: 20 }));
  }

  // ===== 写作要点 =====
  children.push(new Paragraph({ text: '写作要点', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 120 } }));
  children.push(p('动笔前请先读以下要点，能帮你避开最常见的坑：', { color: '475569', after: 80 }));
  (tpl.tips || []).forEach(t => children.push(bullet(t, { color: '334155' })));
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));

  // ===== 目录 =====
  children.push(new Paragraph({ text: '文档目录', heading: HeadingLevel.HEADING_1, spacing: { after: 120 } }));
  tpl.outline.forEach(sec => children.push(p(sec.section, { size: 22, after: 50 })));
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));

  // ===== 正文大纲（每节：标题 + 写作指引 + 要点清单 + 占位）=====
  tpl.outline.forEach(sec => {
    children.push(new Paragraph({ text: sec.section, heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }));
    if (sec.guide) children.push(guideNote(sec.guide));
    (sec.points || []).forEach((pt, i) => {
      // 子标题：用"x.y 要点"形式
      const num = sec.section.match(/^(\d+)/);
      const prefix = num ? `${num[1]}.${i + 1}　` : '';
      children.push(p(prefix + pt, { bold: true, size: 22, after: 40, before: 60 }));
      children.push(placeholder());
    });
  });

  // ===== 页脚说明 =====
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));
  children.push(p('—— 模板结束 ——', { size: 18, color: '999999', align: AlignmentType.CENTER, after: 80 }));
  children.push(p(`${KB.company.shortName}　${KB.company.slogan}　|　标准化交付文档模板`, { size: 18, color: '7C3AED', align: AlignmentType.CENTER }));

  return new Document({
    creator: KB.company.shortName,
    title: `${tpl.name}（模板）`,
    sections: [{ children }]
  });
}

async function generateTemplateBuffer(key) {
  const tpl = getTemplate(key);
  if (!tpl) throw new Error('未找到该交付物模板');
  const doc = buildTemplateDoc(tpl);
  return { buffer: await Packer.toBuffer(doc), name: tpl.name };
}

module.exports = { generateTemplateBuffer };
