// 品牌物料生成器 —— 一键生成「品牌升级一页纸」.docx
// 全链路第2段（品牌升级）：基于行业知识库，产出可对外的品牌价值主张/能力背书/标杆案例/行动召唤。
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const KB = require('../data/knowledgeBase');

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 22, bold: !!opts.bold, color: opts.color, italics: opts.italics })],
    spacing: { after: opts.after == null ? 100 : opts.after, line: opts.line || 300, before: opts.before || 0 },
    alignment: opts.align
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 21, color: opts.color, bold: opts.bold })],
    bullet: { level: opts.level || 0 }, spacing: { after: 60, line: 290 }
  });
}
// 分隔线
function divider(color = 'C7B8F5') {
  return new Paragraph({
    border: { bottom: { color, space: 1, style: BorderStyle.SINGLE, size: 8 } },
    spacing: { after: 120, before: 60 }
  });
}
function sectionTitle(text, color = '7C3AED') {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color })],
    spacing: { before: 220, after: 100 }
  });
}

// 生成品牌一页纸文档
function buildBrandDoc(park, brief) {
  const kb = KB.getKB(park.id) || {};
  const client = brief && brief.client ? brief.client : '';
  const emphases = (brief && brief.emphases) || [];
  const children = [];

  // ===== 顶部品牌头 =====
  children.push(p(KB.company.shortName + '　|　' + KB.company.positioning, { bold: true, size: 22, color: '7C3AED', align: AlignmentType.CENTER, after: 40 }));
  children.push(p(`${park.icon}  ${park.name} · 品牌价值一页纸`, { bold: true, size: 40, align: AlignmentType.CENTER, after: 60 }));
  const tagline = client
    ? `为 ${client} 打造看得见、信得过的数字化品牌`
    : `让 ${park.name} 的数字化价值，被客户一眼看见、一次记住`;
  children.push(p(tagline, { size: 24, color: '475569', align: AlignmentType.CENTER, after: 80 }));
  children.push(divider());

  // ===== 一句话价值主张 =====
  children.push(sectionTitle('🎯 一句话价值主张'));
  const corePain = (kb.pains && kb.pains[0]) ? kb.pains[0] : { title: park.pains[0] || '数字化升级', fix: park.value[0] || '智慧化运营' };
  const valueProp = `用数字孪生，把「${corePain.title}」变成「${corePain.fix}」——` +
    `让 ${park.name} 从分散管理升级为一张图可视、可管、可控的智慧运营。`;
  children.push(p(valueProp, { size: 24, bold: true, color: '334155' }));

  // ===== 我们解决什么（客户痛点）=====
  children.push(sectionTitle('💡 我们为客户解决什么'));
  const pains = (kb.pains && kb.pains.length) ? kb.pains : (park.pains || []).map(t => ({ title: t, fix: '' }));
  pains.slice(0, 5).forEach(x => {
    const txt = x.fix ? `${x.title} → ${x.fix}` : x.title;
    bulletColorPush(children, txt, emphases);
  });

  // ===== 凭什么相信我们（能力背书）=====
  children.push(sectionTitle('🏆 凭什么相信我们'));
  children.push(p(KB.company.scale, { size: 21, color: '334155', after: 80 }));
  (KB.company.advantages || []).forEach(a => children.push(bullet(a, { size: 21 })));

  // ===== 核心能力（精选三项）=====
  children.push(sectionTitle('⚙️ 核心能力'));
  (KB.capabilities || []).slice(0, 3).forEach((c, i) => {
    children.push(p(`（${i + 1}）${c.name}`, { bold: true, color: '7C3AED', size: 22, after: 30 }));
    children.push(p(c.desc, { size: 20, after: 60 }));
  });

  // ===== 标杆案例 =====
  children.push(sectionTitle('🌟 标杆案例'));
  const cases = (kb.cases || []).slice(0, 2);
  if (cases.length) {
    cases.forEach((c) => {
      children.push(p(`${c.name}`, { bold: true, size: 22, color: '7C3AED', after: 30 }));
      const cv = c.value || c.desc;
      if (cv) children.push(p('价值：' + cv, { size: 20, after: 30 }));
      if (c.metrics && c.metrics.length) children.push(p('成效：' + c.metrics.join('；'), { size: 20, color: 'BE123C', after: 60 }));
    });
  } else {
    children.push(p(`${KB.company.shortName} 已在该领域服务多个标杆项目，可按需提供详细案例资料。`, { size: 21 }));
  }

  // ===== 量化价值 =====
  if (kb.valueMetrics && kb.valueMetrics.length) {
    children.push(sectionTitle('📊 量化价值'));
    const line = kb.valueMetrics.map(m => `${m.label} ${m.value}（${m.desc}）`).join('　·　');
    children.push(p(line, { size: 22, bold: true, color: '7C3AED' }));
  }

  // ===== 客户重点诉求（若有）=====
  if (emphases.length) {
    children.push(sectionTitle('🔍 为您重点强化'));
    children.push(p('结合您的关注重点，本方案将重点强化：' + emphases.join('、') + '。', { size: 22, color: '7C3AED' }));
  }

  // ===== 行动召唤 CTA =====
  children.push(divider());
  children.push(p('📞 下一步', { bold: true, size: 24, color: '7C3AED', after: 60 }));
  children.push(p('15 分钟，我们结合贵单位实际场景，给您一版专属的数字化价值蓝图与可落地的实施路径。', { size: 22, after: 60 }));
  children.push(p(`${KB.company.shortName}　${KB.company.slogan}　${KB.company.site}`, { bold: true, size: 22, color: '7C3AED', align: AlignmentType.CENTER, after: 40 }));
  children.push(p(`生成日期：${new Date().toLocaleDateString('zh-CN')}　|　全链路第②段 · 品牌升级一页纸`, { size: 16, color: '94A3B8', align: AlignmentType.CENTER }));

  return new Document({
    creator: KB.company.shortName,
    title: `${park.name}品牌一页纸`,
    sections: [{ children }]
  });
}

// 痛点条目：命中客户重点诉求时高亮
function bulletColorPush(children, text, emphases) {
  const hit = emphases.some(e => {
    const key = String(e).replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 2);
    return key && text.includes(key);
  });
  children.push(bullet(text, { size: 21, color: hit ? '7C3AED' : undefined, bold: hit }));
}

async function generateBrandBuffer(park, brief) {
  const doc = buildBrandDoc(park, brief);
  return await Packer.toBuffer(doc);
}

module.exports = { generateBrandBuffer };
