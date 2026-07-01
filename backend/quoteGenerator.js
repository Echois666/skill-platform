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

const KEYWORD_RULES = [
  { id: 'digital-twin-1', words: ['数字孪生', 'IOC', '可视化', '三维', '一张图', '驾驶舱', '智慧园区', '智慧校园', '智慧医院', '智慧城市', 'CIM', 'BIM', '孪生平台'] },
  { id: 'digital-twin-2', words: ['城市底板', '大场景', '城市级', 'CIM', '底板还原'] },
  { id: 'digital-twin-3', words: ['周边环境', '地面铺装', '园区环境', '建筑周边'] },
  { id: 'digital-twin-4', words: ['外立面L3', '建筑外立面', '重点建筑'] },
  { id: 'digital-twin-5', words: ['外立面L4', '精细外立面', '高精度外立面'] },
  { id: 'digital-twin-6', words: ['室内L2', '基础承重', '室内基础'] },
  { id: 'digital-twin-7', words: ['室内L3', '室内还原', '楼层', '室内空间'] },
  { id: 'digital-twin-8', words: ['展厅', 'L4', '室内展厅', '标杆展厅'] },
  { id: 'digital-twin-9', words: ['设备还原', '设备模型', '关键设备'] },
  { id: 'digital-twin-10', words: ['夜景', '灯光', '楼宇夜景'] },
  { id: 'digital-twin-11', words: ['水晶体', '剖切', '透明楼宇'] },
  { id: 'digital-twin-12', words: ['拆楼', '分层', '楼层拆解'] },
  { id: 'iot-1', words: ['物联网', 'IoT', '传感器', '设备接入', '感知设备'] },
  { id: 'iot-2', words: ['协议', '协议解析', 'Modbus', 'BACnet', 'OPC'] },
  { id: 'iot-3', words: ['边缘计算', '边缘网关', '网关'] },
  { id: 'iot-4', words: ['APP', '移动端', '手机端', '移动应用'] },
  { id: 'data-platform-1', words: ['时序数据', '实时数据采集', '传感数据'] },
  { id: 'data-platform-2', words: ['文件数据', '日志', '图片', '视频文件', '音视频'] },
  { id: 'data-platform-3', words: ['流式计算', '流数据', '实时流'] },
  { id: 'data-platform-4', words: ['实时计算', '实时汇总'] },
  { id: 'data-platform-5', words: ['离线计算', '批量计算', '定时任务'] },
  { id: 'data-platform-6', words: ['时序存储', '时序数据库'] },
  { id: 'data-platform-7', words: ['结构化数据', '业务数据库'] },
  { id: 'data-platform-8', words: ['文件存储', '对象存储'] },
  { id: 'data-platform-9', words: ['消防', '机房消防'] },
  { id: 'data-platform-10', words: ['信息化平台', '现有系统', '业务系统'] },
  { id: 'data-platform-11', words: ['物业', '物业管理'] },
  { id: 'data-platform-12', words: ['信息发布', '引导发布'] },
  { id: 'data-platform-13', words: ['楼宇能效', '能效系统'] },
  { id: 'data-platform-14', words: ['安防综合', '安防平台'] },
  { id: 'data-platform-15', words: ['视频监控', '摄像头', '监控'] },
  { id: 'data-platform-16', words: ['门禁', '出入口', '闸机', '通行'] },
  { id: 'data-platform-17', words: ['访客', '一卡通'] },
  { id: 'data-platform-18', words: ['停车', '车位'] },
  { id: 'data-platform-19', words: ['空调', '新风'] },
  { id: 'data-platform-20', words: ['照明'] },
  { id: 'data-platform-21', words: ['入侵报警', '报警'] },
  { id: 'data-platform-22', words: ['给排水', '水泵', '水位'] },
  { id: 'data-platform-23', words: ['冷热源', '冷源', '热源'] },
  { id: 'data-platform-24', words: ['变配电', '配电', '电力'] },
  { id: 'carbon-1', words: ['碳源', '碳排放源'] },
  { id: 'carbon-2', words: ['业态探测', '业态'] },
  { id: 'carbon-3', words: ['区域碳', '碳计算', '碳核算'] },
  { id: 'carbon-4', words: ['减碳措施', '减碳'] },
  { id: 'carbon-5', words: ['碳趋势', '碳预测'] },
  { id: 'carbon-6', words: ['降碳策略', '双碳', '低碳', '碳中和', 'ESG', '能源'] },
  { id: 'ai-agent-1', words: ['自然语言', '语义交流', 'AI问答', '智能问答'] },
  { id: 'ai-agent-2', words: ['Clonova', '大模型', '空间智算', '深度分析', 'AI助手', '智能体', 'Agent'] },
  { id: 'ai-agent-3', words: ['数据训练', '模型训练', '知识库训练', '专属训练', 'RAG'] },
  { id: 'ioc-1', words: ['综合态势', '总览', '运营态势'] },
  { id: 'ioc-2', words: ['通行', '安防', '人车', '门禁'] },
  { id: 'ioc-3', words: ['空间管理', '会议室', '办公空间'] },
  { id: 'ioc-4', words: ['设备运维', '设备管理', '巡检', '工单'] },
  { id: 'ioc-5', words: ['能效', '能耗', '双碳'] },
  { id: 'ioc-6', words: ['信息服务', '服务门户'] },
  { id: 'ioc-7', words: ['数字展厅', '企业展厅', '展厅'] },
  { id: 'ioc-8', words: ['招商', '物业运营', '租赁', '去化'] }
];

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function unique(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function demandSnippet(text, words) {
  const source = normalizeText(text);
  const hit = (words || []).find(w => source.toLowerCase().includes(String(w).toLowerCase()));
  if (!hit) return source.slice(0, 80);
  const idx = source.toLowerCase().indexOf(String(hit).toLowerCase());
  const start = Math.max(0, idx - 24);
  const end = Math.min(source.length, idx + String(hit).length + 36);
  return (start > 0 ? '…' : '') + source.slice(start, end) + (end < source.length ? '…' : '');
}

function firstNumber(text, patterns) {
  for (const re of patterns) {
    const m = String(text || '').match(re);
    if (m) {
      const n = Number(m[1] || m[2]);
      if (Number.isFinite(n) && n > 0) return Math.min(Math.round(n), 999999);
    }
  }
  return null;
}

function inferQty(item, text) {
  const unit = item.unit || '';
  const scope = `${item.content || ''} ${item.category || ''} ${item.desc || ''}`;
  if (unit.includes('元/栋')) {
    const n = firstNumber(text, [/(\d+)\s*(?:栋|幢)/, /(?:建筑|楼宇)[^\d]{0,8}(\d+)\s*(?:个|栋|幢)/]);
    if (n) return { qty: n, qtyReason: `需求中识别到 ${n} 栋/幢建筑，按 ${n} 计量` };
  }
  if (unit.includes('元/个')) {
    const n = /设备/.test(scope)
      ? firstNumber(text, [/(\d+)\s*(?:个|台|套)\s*(?:设备|关键设备)/, /(?:设备|关键设备)[^\d]{0,8}(\d+)\s*(?:个|台|套)/])
      : firstNumber(text, [/(\d+)\s*(?:个|台)/]);
    if (n) return { qty: n, qtyReason: `需求中识别到数量 ${n}，按 ${n} 计量` };
  }
  if (unit.includes('元/m²') || unit.includes('元/10W方')) {
    const n = firstNumber(text, [/(\d+)\s*(?:平方米|平米|m²|㎡)/i, /面积[^\d]{0,8}(\d+)/]);
    if (n && unit.includes('元/m²')) return { qty: n, qtyReason: `需求中识别到面积 ${n}㎡，按面积计量` };
    if (n && unit.includes('元/10W方')) {
      const blocks = Math.max(1, Math.ceil(n / 100000));
      return { qty: blocks, qtyReason: `需求中识别到面积 ${n}㎡，按 ${blocks} 个10万方计量` };
    }
  }
  if (unit.includes('元/套')) {
    const n = firstNumber(text, [new RegExp(`${item.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\d]{0,8}(\\d+)\\s*套`)]);
    if (n) return { qty: n, qtyReason: `需求中识别到 ${item.category} ${n} 套，按 ${n} 计量` };
  }
  return { qty: 1, qtyReason: '需求命中该能力，未识别到明确数量，先按 1 套/项估列' };
}

function recommendQuoteSelections({ requirement = '', limit = 24 } = {}) {
  const text = normalizeText(requirement);
  if (!text) return { ok: false, error: '请输入需求描述或先导入需求文件内容' };
  const scores = new Map();
  const reasons = new Map();
  KEYWORD_RULES.forEach(rule => {
    rule.words.forEach(w => {
      if (text.toLowerCase().includes(String(w).toLowerCase())) {
        scores.set(rule.id, (scores.get(rule.id) || 0) + 1);
        if (!reasons.has(rule.id)) reasons.set(rule.id, []);
        reasons.get(rule.id).push(w);
      }
    });
  });
  const generalDigitalTwin = /园区|校园|医院|楼宇|城市|景区|场馆|物流|乡村|林业|地产|公园|化工|平台|建设|方案/.test(text);
  if (generalDigitalTwin && !scores.has('digital-twin-1')) {
    scores.set('digital-twin-1', 1);
    reasons.set('digital-twin-1', ['行业数字化/平台建设']);
  }
  const selections = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, Math.min(60, Number(limit) || 24)))
    .map(([id]) => {
      const found = getItem(id);
      const q = found ? inferQty(found.item, text) : { qty: 1, qtyReason: '默认按 1 项估列' };
      return { id, qty: q.qty, qtyReason: q.qtyReason };
    });
  const quote = computeQuote({ selections });
  const explain = selections.map(sel => {
    const found = getItem(sel.id);
    const rs = unique(reasons.get(sel.id) || []);
    const amountLine = quote.lines.find(x => x.category === (found && found.item.category) && x.content === (found && found.item.content));
    return {
      id: sel.id,
      qty: sel.qty,
      section: found ? found.section.name : '',
      content: found ? found.item.content : '',
      category: found ? found.item.category : '',
      unit: found ? found.item.unit : '',
      amount: amountLine ? amountLine.amount : 0,
      reasons: rs,
      demandPart: demandSnippet(text, rs),
      qtyReason: sel.qtyReason || '默认按 1 项估列',
      why: found ? `需求中出现「${rs.join('、') || '相关能力'}」，对应报价表中的「${found.section.name} / ${found.item.category}」。` : ''
    };
  });
  return { ok: true, selections, explain, ...quote };
}

module.exports = { generateQuoteBuffer, computeQuote, recommendQuoteSelections };
