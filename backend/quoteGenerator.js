// 报价清单 Excel 生成器 —— 输出与 51WORLD《产品报价清单》同格式的 .xlsx
// 列：内容 | 行业类别 | 合作报价 | 单位 | 数量 | 标准报价小计 | 说明
// 按板块分组，每板块末尾小计，最后输出含税(6%)合同总计。
const ExcelJS = require('exceljs');
const { sections, TAX_RATE, getItem } = require('../data/pricing');

const HEADER_FILL = 'FF1E3A8A';   // 深蓝标题
const SECTION_FILL = 'FFDCEAFE';  // 板块行浅蓝
const SUBTOTAL_FILL = 'FFFEF3C7'; // 小计浅黄
const TOTAL_FILL = 'FF7C3AED';    // 总计紫

// selections: [{ id, qty }]，projectName/client 选填
async function generateQuoteBuffer({ selections = [], projectName, client } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = '51WORLD · 园区Skill平台';
  const ws = wb.addWorksheet('产品报价清单');

  ws.columns = [
    { key: 'content', width: 26 },
    { key: 'category', width: 30 },
    { key: 'price', width: 16 },
    { key: 'unit', width: 12 },
    { key: 'qty', width: 8 },
    { key: 'subtotal', width: 16 },
    { key: 'desc', width: 48 }
  ];

  // 选中项 map：id -> qty
  const qtyMap = {};
  selections.forEach(s => { if (s && s.id) qtyMap[s.id] = Math.max(0, +s.qty || 0); });

  // ===== 大标题 =====
  ws.mergeCells('A1:G1');
  const t = ws.getCell('A1');
  t.value = '51WORLD 产品报价单';
  t.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:G2');
  const sub = ws.getCell('A2');
  sub.value = (projectName ? `项目：${projectName}` : '本清单仅作为产品清单展示参考使用') +
    (client ? `　|　客户：${client}` : '') + `　|　生成日期：${new Date().toLocaleDateString('zh-CN')}`;
  sub.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
  sub.alignment = { horizontal: 'center' };

  let grandTotal = 0;
  let r = 3;

  const setRow = (cells, opts = {}) => {
    const row = ws.getRow(r);
    cells.forEach((v, i) => { row.getCell(i + 1).value = v; });
    row.eachCell(cell => {
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: opts.center ? 'center' : 'left' };
      if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
      if (opts.bold) cell.font = { bold: true, color: { argb: opts.color || 'FF1E293B' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    });
    r++;
    return row;
  };

  sections.forEach(sec => {
    // 只输出用户实际勾选（数量>0）的项，不默认计入任何必选项
    const chosen = sec.items.filter(it => qtyMap[it.id] > 0);
    if (chosen.length === 0) return;

    // 板块标题行
    ws.mergeCells(`A${r}:G${r}`);
    setRow([`${sec.no}、${sec.name}（${sec.note}）`], { fill: SECTION_FILL, bold: true });

    // 表头
    setRow(['内容', '行业类别', '合作报价', '单位', '数量', '标准报价小计', '说明'], { fill: 'FFEFF6FF', bold: true, center: true });

    let secSubtotal = 0;
    chosen.forEach(it => {
      const qty = qtyMap[it.id] != null ? qtyMap[it.id] : 0;
      let priceCell, subtotal = 0, qtyDisp = qty;
      if (it.type === 'tiered') {
        priceCell = it.priceText;
        // 阶梯项：用 tierExample 估算（首档基准价），数量列显示"按方案"
        subtotal = it.tierExample || 0;
        qtyDisp = '按方案';
      } else {
        priceCell = it.price;
        subtotal = (it.price || 0) * qty;
      }
      secSubtotal += subtotal;
      const row = setRow([it.content, it.category, priceCell, it.unit, qtyDisp, subtotal, it.desc || '']);
      row.getCell(3).alignment = { vertical: 'middle', wrapText: true, horizontal: it.type === 'tiered' ? 'left' : 'right' };
      row.getCell(6).numFmt = '#,##0';
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    });

    // 板块小计
    ws.mergeCells(`A${r}:E${r}`);
    const subtotalRow = ws.getRow(r);
    subtotalRow.getCell(1).value = `${sec.name}小计：`;
    subtotalRow.getCell(6).value = secSubtotal;
    subtotalRow.getCell(6).numFmt = '#,##0';
    subtotalRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBTOTAL_FILL } };
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: cell.col === 6 ? 'right' : 'right' };
    });
    r++;
    grandTotal += secSubtotal;
  });

  if (grandTotal === 0) {
    // 没有任何选择，给出提示行
    ws.mergeCells(`A${r}:G${r}`);
    setRow(['未选择任何产品项，请在报价生成器中勾选板块/产品并填写数量后重新生成。'], { bold: true });
  }

  // ===== 含税总计（各项报价已含 6% 税，直接汇总即为含税总价） =====
  const taxIncl = grandTotal;
  const pretax = Math.round(grandTotal / (1 + TAX_RATE));
  ws.mergeCells(`A${r}:E${r}`);
  const totalRow = ws.getRow(r);
  totalRow.getCell(1).value = `合同含税价格总计（已含税点${(TAX_RATE * 100).toFixed(0)}%，不含运营服务费）：`;
  totalRow.getCell(6).value = taxIncl;
  totalRow.getCell(6).numFmt = '#,##0';
  totalRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });
  ws.getRow(r).height = 26;
  r++;

  // 备注
  ws.mergeCells(`A${r}:G${r}`);
  setRow([`说明：各项报价均为含税(${(TAX_RATE * 100).toFixed(0)}%)价。含税合计 ${taxIncl.toLocaleString()} 元，其中不含税 ${pretax.toLocaleString()} 元、税额 ${(taxIncl - pretax).toLocaleString()} 元。阶梯计价项（标"按方案"）以实际工程量结算，本表按起步基准估列。`],
    { bold: false });
  ws.getCell(`A${r - 1}`).font = { italic: true, size: 10, color: { argb: 'FF94A3B8' } };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// 计算汇总（供前端预览，不生成文件）
function computeQuote({ selections = [] } = {}) {
  const qtyMap = {};
  selections.forEach(s => { if (s && s.id) qtyMap[s.id] = Math.max(0, +s.qty || 0); });
  const lines = [];
  let subtotalSum = 0;
  sections.forEach(sec => {
    sec.items.forEach(it => {
      const qty = qtyMap[it.id];
      if (!(qty > 0)) return;   // 仅统计用户实际勾选的项，不默认计入必选项
      let amount = 0, qtyDisp = qty;
      if (it.type === 'tiered') { amount = it.tierExample || 0; qtyDisp = '按方案'; }
      else { amount = (it.price || 0) * qty; }
      subtotalSum += amount;
      lines.push({ section: sec.name, content: it.content, category: it.category, unit: it.unit, qty: qtyDisp, amount, tiered: it.type === 'tiered' });
    });
  });
  // 各项报价已含 6% 税：含税合计即为汇总值，税前由含税反算
  const taxed = subtotalSum;
  const pretax = Math.round(subtotalSum / (1 + TAX_RATE));
  return { lines, subtotal: pretax, taxRate: TAX_RATE, taxed, count: lines.length };
}

module.exports = { generateQuoteBuffer, computeQuote };
