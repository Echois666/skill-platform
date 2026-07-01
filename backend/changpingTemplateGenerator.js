// 昌平标准格式文档生成器 —— 严格复刻训练素材（昌平验收材料）真实版式
// 封面(上级项目名/项目名/文档名/日期) + 文档修改记录表(5列) + 目录 + 正文章节 + 占位
const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, TableOfContents } = require('docx');
const { getDoc, getContent } = require('../data/changpingTemplates');

const SONG = '宋体', HEI = '黑体', TNR = 'Times New Roman';

function coverLine(text, { size = 44, bold = false, font = SONG, after = 60 } = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after, line: 360 },
    children: [ new TextRun({ text, bold, size, font: { ascii: TNR, eastAsia: font, hAnsi: TNR } }) ] });
}
function empty(n = 1) { const a = []; for (let i = 0; i < n; i++) a.push(new Paragraph({ children: [new TextRun('')] })); return a; }
function placeholder() {
  return new Paragraph({ spacing: { after: 120, line: 360 },
    children: [ new TextRun({ text: '（请在此处填写……）', italics: true, size: 21, color: '808080', font: { ascii: TNR, eastAsia: SONG, hAnsi: TNR } }) ] });
}

function revisionTable() {
  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const widths = [959, 4111, 1134, 1573, 1415];
  const headCell = (t, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, verticalAlign: 'center',
    children: [ new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: t, bold: true, size: 21, font: { ascii: TNR, eastAsia: SONG, hAnsi: TNR } }) ] }) ] });
  const cell = (t, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, verticalAlign: 'center',
    children: [ new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [ new TextRun({ text: t, size: 21, font: { ascii: TNR, eastAsia: SONG, hAnsi: TNR } }) ] }) ] });
  const headers = ['版本号', '版本描述', '责任人', '日期', '备注'];
  const rows = [ new TableRow({ tableHeader: true, children: headers.map((h, i) => headCell(h, widths[i])) }) ];
  ['V1.0', '初版编写', '', '', ''].forEach; // keep readable
  rows.push(new TableRow({ children: ['V1.0', '初版编写', '', '', ''].map((c, i) => cell(c, widths[i])) }));
  for (let r = 0; r < 3; r++) rows.push(new TableRow({ children: widths.map(w => cell('', w)) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border }, rows });
}

function buildTemplateDoc(def, ctx = {}) {
  const topName = ctx.topName || '【上级项目/采购项目名称】';
  const projName = ctx.projName || '【项目名称】';
  const dateName = ctx.dateName || '【二〇__年__月】';
  const children = [];

  // 封面
  children.push(...empty(2));
  children.push(coverLine(topName, { size: 44, bold: false, font: HEI, after: 120 }));
  children.push(coverLine(projName, { size: 44, bold: true, font: SONG, after: 120 }));
  children.push(coverLine(def.docName, { size: 44, bold: true, font: SONG, after: 400 }));
  children.push(coverLine(dateName, { size: 50, bold: true, font: HEI, after: 0 }));
  children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));

  // 文档修改记录
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [ new TextRun({ text: '文档修改记录', bold: true, size: 32, font: { ascii: TNR, eastAsia: HEI, hAnsi: TNR } }) ] }));
  children.push(revisionTable());
  children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));

  // 目录
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [ new TextRun({ text: '目录', bold: false, size: 32, font: { ascii: TNR, eastAsia: HEI, hAnsi: TNR } }) ] }));
  try { children.push(new TableOfContents('目录', { hyperlink: true, headingStyleRange: '1-3' })); } catch (e) { /* ignore */ }
  children.push(new Paragraph({ spacing: { after: 60 }, children: [ new TextRun({ text: '（打开文档后右键“更新域”生成页码目录）', italics: true, size: 18, color: '808080', font: { eastAsia: SONG } }) ] }));
  children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));

  // 正文
  if (def.tableDoc) {
    const cols = def.tableDoc.cols;
    const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const w = Math.floor(9000 / cols.length);
    const headRow = new TableRow({ tableHeader: true, children: cols.map(c => new TableCell({ width: { size: w, type: WidthType.DXA }, children: [ new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: c, bold: true, size: 21, font: { eastAsia: SONG } }) ] }) ] })) });
    const rows = [headRow];
    for (let r = 0; r < (def.tableDoc.rows || 6); r++) rows.push(new TableRow({ children: cols.map(() => new TableCell({ width: { size: w, type: WidthType.DXA }, children: [ new Paragraph({ children: [ new TextRun({ text: '', size: 21 }) ] }) ] })) }));
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border }, rows }));
  } else {
    let n = 0;
    for (const sec of def.sections) {
      n++;
      const t1 = typeof sec === 'string' ? sec : sec.t;
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 80 },
        children: [ new TextRun({ text: `${n}. ${t1}`, bold: true, size: 28, font: { ascii: TNR, eastAsia: HEI, hAnsi: TNR } }) ] }));
      const subs = (typeof sec === 'object' && sec.sub) ? sec.sub : [];
      if (subs.length) {
        subs.forEach((s, i) => {
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 120, after: 60 },
            children: [ new TextRun({ text: `${n}.${i + 1} ${s}`, bold: true, size: 24, font: { ascii: TNR, eastAsia: HEI, hAnsi: TNR } }) ] }));
          children.push(placeholder());
        });
      } else {
        children.push(placeholder());
      }
    }
  }

  return new Document({ creator: '云TB百科全书', title: def.docName,
    styles: { default: { document: { run: { font: { ascii: TNR, eastAsia: SONG, hAnsi: TNR }, size: 21 } } } },
    sections: [{ properties: {}, children }] });
}

async function generateChangpingTemplateBuffer(key, ctx = {}) {
  const def = getDoc(key);
  if (!def) throw new Error('未找到该昌平模板');
  const doc = buildTemplateDoc(def, ctx);
  return { buffer: await Packer.toBuffer(doc), name: def.docName };
}

// ===== 脱敏参考版：套用真实版式（封面+修改记录+目录）+ 渲染脱敏后的真实正文 =====
function isHeadingLine(s) {
  const t = s.trim();
  // 目录行：编号 + 标题 + 页码
  if (/^([一二三四五六七八九十]+、\s*|\d+(\.\d+){0,3}\.?\s+).*\d+$/.test(t) && t.length < 42) return { toc: true };
  // 正文一级：一、 或 1  或 第x章
  if (/^([一二三四五六七八九十]+、)\s*\S/.test(t) && t.length < 30) return { level: 1 };
  if (/^\d+\.\s*\S/.test(t) && !/\d+\.\d/.test(t) && t.length < 30) return { level: 1 };
  // 正文二级：1.1 或 x.y
  if (/^\d+\.\d+\s*\S/.test(t) && !/\d+\.\d+\.\d/.test(t) && t.length < 34) return { level: 2 };
  // 三级
  if (/^\d+\.\d+\.\d+\s*\S/.test(t) && t.length < 40) return { level: 3 };
  return null;
}

function renderContentItems(items) {
  const out = [];
  let tocPassed = false;
  for (const it of items) {
    if (it.type === 'table') {
      const rows = it.rows;
      if (!rows.length) continue;
      const cols = Math.max(...rows.map(r => r.length));
      const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
      const w = Math.floor(9000 / Math.max(1, cols));
      const trs = rows.map((r, ri) => new TableRow({ tableHeader: ri === 0, children: Array.from({ length: cols }).map((_, ci) =>
        new TableCell({ width: { size: w, type: WidthType.DXA }, children: [ new Paragraph({ children: [ new TextRun({ text: r[ci] || '', bold: ri === 0, size: 20, font: { eastAsia: SONG } }) ] }) ] })
      ) }));
      out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border }, rows: trs }));
      continue;
    }
    const text = (it.text || '').trim();
    if (!text) continue;
    const hi = isHeadingLine(text);
    if (hi && hi.toc && !tocPassed) {
      // 目录条目：普通小字（真实文档目录样式）
      out.push(new Paragraph({ spacing: { after: 20, line: 300 }, children: [ new TextRun({ text, size: 21, font: { ascii: TNR, eastAsia: SONG, hAnsi: TNR } }) ] }));
      continue;
    }
    if (hi && hi.level) {
      tocPassed = true;
      const lvl = hi.level === 1 ? HeadingLevel.HEADING_1 : (hi.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3);
      const sz = hi.level === 1 ? 28 : (hi.level === 2 ? 24 : 22);
      out.push(new Paragraph({ heading: lvl, spacing: { before: hi.level === 1 ? 200 : 120, after: 60 },
        children: [ new TextRun({ text, bold: true, size: sz, font: { ascii: TNR, eastAsia: HEI, hAnsi: TNR } }) ] }));
      continue;
    }
    // 普通正文
    out.push(new Paragraph({ spacing: { after: 80, line: 360 }, indent: { firstLine: 420 },
      children: [ new TextRun({ text, size: 21, font: { ascii: TNR, eastAsia: SONG, hAnsi: TNR } }) ] }));
  }
  return out;
}

function buildReferenceDoc(def, content, ctx = {}) {
  const topName = ctx.topName || '【上级项目/采购项目名称】';
  const projName = ctx.projName || '【项目名称】';
  const dateName = ctx.dateName || '【二〇__年__月】';
  const children = [];

  // 封面
  children.push(...empty(2));
  children.push(coverLine(topName, { size: 44, bold: false, font: HEI, after: 120 }));
  children.push(coverLine(projName, { size: 44, bold: true, font: SONG, after: 120 }));
  children.push(coverLine(def.docName, { size: 44, bold: true, font: SONG, after: 400 }));
  children.push(coverLine(dateName, { size: 50, bold: true, font: HEI, after: 0 }));
  children.push(new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [ new TextRun({ text: '（脱敏参考版 · 内容提炼自真实交付文档，项目名/单位/人名/金额/数字已脱敏，仅供编写参考）', size: 18, italics: true, color: '808080', font: { eastAsia: SONG } }) ] }));
  children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));

  // 文档修改记录
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [ new TextRun({ text: '文档修改记录', bold: true, size: 32, font: { ascii: TNR, eastAsia: HEI, hAnsi: TNR } }) ] }));
  children.push(revisionTable());
  children.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun('')] }));

  // 正文（脱敏内容）
  children.push(...renderContentItems(content.items));

  return new Document({ creator: '云TB百科全书', title: def.docName + '（脱敏参考版）',
    styles: { default: { document: { run: { font: { ascii: TNR, eastAsia: SONG, hAnsi: TNR }, size: 21 } } } },
    sections: [{ properties: {}, children }] });
}

async function generateChangpingReferenceBuffer(key, ctx = {}) {
  const def = getDoc(key);
  if (!def) throw new Error('未找到该昌平模板');
  const content = getContent(key);
  if (!content || !content.items || !content.items.length) throw new Error('该文档暂无脱敏参考内容');
  const doc = buildReferenceDoc(def, content, ctx);
  return { buffer: await Packer.toBuffer(doc), name: def.docName };
}

module.exports = { generateChangpingTemplateBuffer, generateChangpingReferenceBuffer };
