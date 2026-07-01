// 昌平标准格式文档生成器 —— 严格复刻训练素材（昌平验收材料）真实版式
// 封面(上级项目名/项目名/文档名/日期) + 文档修改记录表(5列) + 目录 + 正文章节 + 占位
const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, TableOfContents } = require('docx');
const { getDoc } = require('../data/changpingTemplates');

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

module.exports = { generateChangpingTemplateBuffer };
