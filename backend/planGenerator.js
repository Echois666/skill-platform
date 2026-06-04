// Excel 实施计划生成器 —— 使用 exceljs 生成真实可下载的 .xlsx 项目计划
const ExcelJS = require('exceljs');
const { phases } = require('../data/content');

async function generatePlanBuffer(park, version) {
  const wb = new ExcelJS.Workbook();
  wb.creator = '园区Skill平台';
  const ws = wb.addWorksheet('实施计划');

  ws.columns = [
    { header: '阶段', key: 'stage', width: 14 },
    { header: '环节', key: 'phase', width: 16 },
    { header: '周期', key: 'duration', width: 12 },
    { header: '主要活动', key: 'activities', width: 50 },
    { header: '交付物', key: 'deliverables', width: 45 }
  ];

  // 标题行样式
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // 顶部标题
  ws.spliceRows(1, 0, [`${park.icon} ${park.name} 数字化解决方案 - 实施计划（${version}）`]);
  ws.mergeCells('A1:E1');
  const titleCell = ws.getCell('A1');
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E1B4B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 30;

  const stageColors = { presales: 'FFEDE9FE', midsales: 'FFDBEAFE', delivery: 'FFD1FAE5' };
  ['presales', 'midsales', 'delivery'].forEach(key => {
    const ph = phases[key];
    ph.items.forEach((it, idx) => {
      const row = ws.addRow({
        stage: idx === 0 ? ph.name : '',
        phase: it.name,
        duration: it.duration,
        activities: it.activities.join('、'),
        deliverables: it.deliverables.join('、')
      });
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stageColors[key] } };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      });
      row.getCell('stage').font = { bold: true };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = { generatePlanBuffer };
