// 全链路规则引擎 —— 驱动"客户雷达 / 团队作战手册 / 客户成功评分"
// 复用 content.js + knowledgeBase.js 既有知识，确定性输出，无需外部AI Key。
const { parks, phases, getPark } = require('../data/content');
const { verticals, company } = require('../data/knowledgeBase');
const { bayAreaCities, clientArchetypes, journeyStages, businessModel } = require('../data/journey');

function getCity(id) {
  return bayAreaCities.find(c => c.id === id || c.name === id);
}

// 取某行业知识库的痛点/场景/案例（带兜底）
function kbOf(parkId) {
  const kb = verticals[parkId] || {};
  return {
    pains: kb.pains || [],
    scenarios: kb.scenarios || [],
    cases: kb.cases || [],
    keywords: kb.keywords || [],
    objectives: kb.objectives || [],
    valueMetrics: kb.valueMetrics || []
  };
}

// ============ 全链路蓝图 ============
function getJourney() {
  return {
    company: { name: company.shortName, full: company.name, slogan: company.slogan, positioning: company.positioning },
    stages: journeyStages,
    businessModel,
    cities: bayAreaCities.map(c => ({ id: c.id, name: c.name, pillars: c.pillars })),
    stats: { parks: parks.length, phases: Object.keys(phases).length, cities: bayAreaCities.length, stages: journeyStages.length }
  };
}

// ============ 段1：AI客户雷达 ============
// 输入：parkId(行业) + city(可选) + count，输出目标客户清单 + 个性化触达话术
function buildLeadRadar({ parkId, city, count = 4 } = {}) {
  const park = getPark(parkId);
  if (!park) return { ok: false, error: '请选择有效的园区/行业类型' };
  const kb = kbOf(parkId);
  const cityObj = city ? getCity(city) : null;
  const archetypes = clientArchetypes[parkId] || [{ type: `${park.name}相关单位`, role: '数字化负责人', hook: park.desc }];

  // 命名素材：城市 + 区域感 + 行业
  const districts = cityObj
    ? { shenzhen: ['南山', '前海', '宝安', '龙岗'], guangzhou: ['天河', '黄埔', '南沙', '番禺'], dongguan: ['松山湖', '滨海湾', '长安', '虎门'],
        foshan: ['顺德', '南海', '禅城', '三水'], zhuhai: ['横琴', '金湾', '高新区'], huizhou: ['大亚湾', '仲恺', '惠城'],
        zhongshan: ['火炬区', '翠亨新区', '小榄'], jiangmen: ['蓬江', '江海', '大广海湾'], zhaoqing: ['高新区', '鼎湖', '四会'],
        hongkong: ['科学园', '数码港', '中环'], macau: ['路凼', '横琴口岸', '澳门半岛'] }[cityObj.id] || [cityObj.name]
    : ['大湾区'];

  const cap = Math.max(1, Math.min(8, +count || 4));
  const leads = [];
  for (let i = 0; i < cap; i++) {
    const arch = archetypes[i % archetypes.length];
    const district = districts[i % districts.length];
    const cityName = cityObj ? cityObj.name : '大湾区';
    const pain = kb.pains[i % Math.max(1, kb.pains.length)] || { title: park.pains[0] || '数字化升级', fix: park.value[0] || '智慧化运营' };
    const fit = cityObj
      ? `${cityName}主导产业「${cityObj.pillars.join('、')}」与${park.name}高度契合`
      : `${park.name}在大湾区需求旺盛`;
    leads.push({
      name: `${cityName}${district}${arch.type}`,
      type: arch.type,
      decisionMaker: arch.role,
      region: cityObj ? `${cityName}·${district}` : '大湾区',
      fitReason: fit,
      painHook: pain.title,
      valueHook: pain.fix,
      priority: i < 2 ? '高' : (i < 4 ? '中' : '观察'),
      // 个性化触达话术（冷启动首封）
      outreach: `${arch.role}您好，我是${company.shortName}（${company.positioning}）。` +
        `注意到${cityName}${district}的${arch.type}普遍面临「${pain.title}」的挑战，` +
        `我们已为${kb.cases[0] ? kb.cases[0].name : '多个标杆园区'}等客户通过数字孪生实现「${pain.fix}」。` +
        `想用15分钟，结合贵单位场景给您看一版${park.name}的价值蓝图，您看本周方便吗？`
    });
  }

  return {
    ok: true,
    parkId, parkName: park.name, icon: park.icon,
    city: cityObj ? cityObj.name : '大湾区全域',
    cityNote: cityObj ? cityObj.note : '可指定具体城市以获得本地化线索',
    summary: `已为「${park.name}」在「${cityObj ? cityObj.name : '大湾区'}」生成 ${leads.length} 条精准线索，` +
      `决策切入点聚焦：${[...new Set(leads.map(l => l.painHook))].slice(0, 3).join('、')}。`,
    leads,
    nextStep: { stage: '品牌升级 / 转化成交', action: '对高优先级线索，一键生成品牌一页纸与定制方案包', link: '/#generator' }
  };
}

// ============ 段4：AI团队作战手册 ============
// 输入：parkId + audience(销售/售前/交付)，输出开场白/价值话术/异议应对/Demo脚本
const OBJECTIONS = [
  { q: '我们已经上了不少系统，为什么还要数字孪生底座？', a: '正因为系统多，数据更孤岛。数字孪生不是再加一个系统，而是把已有系统的数据在统一三维底座上融合，让“烟囱”变“一张图”，已有投资被盘活而非推翻。' },
  { q: '预算紧张，能不能先小范围试试？', a: '完全可以。我们支持按场景分期落地，先用1-2个高价值场景（如安全应急或招商运营）跑出可量化效果，用第一期ROI撬动后续预算。' },
  { q: '数据安全和涉密怎么保证？', a: '平台支持私有化容器部署，数据不出园区；涉密/脱敏版本分离管理、权限分级，满足合规与等保要求。' },
  { q: '上线后没人会用、用不起来怎么办？', a: '我们交付的不只是系统，还有团队赋能与客户成功陪跑：培训手册+活跃度看板+季度优化，确保系统真正用起来、产出持续价值。' },
  { q: '你们有没有同类标杆案例？', a: '有。我们已累计落地近2000个项目，本行业可直接参考对标案例，提供可验证的量化效果与现场参观。' }
];

function buildEnablement({ parkId, audience = '销售' } = {}) {
  const park = getPark(parkId);
  if (!park) return { ok: false, error: '请选择有效的园区/行业类型' };
  const kb = kbOf(parkId);
  const topScenarios = kb.scenarios.slice(0, 4);
  const refCase = kb.cases[0];

  const opening = `您好，我是${company.shortName}。我们专注用数字孪生帮助${park.name}解决` +
    `「${(kb.pains[0] && kb.pains[0].title) || park.pains[0]}」等核心难题——` +
    `把分散系统融合成一张可视、可管、可控的运行底图。`;

  const valueTalk = (kb.pains.length ? kb.pains : park.pains.map(p => ({ title: p, fix: '' })))
    .slice(0, 4)
    .map(p => ({ pain: p.title, pitch: p.fix || '数字化升级', proof: '可量化效果 + 标杆案例支撑' }));

  const demoScript = topScenarios.length
    ? topScenarios.map((sc, i) => ({
        step: i + 1, scene: sc.name,
        say: `${sc.name}：${sc.desc}`,
        highlight: sc.value || (sc.features && sc.features[0] && sc.features[0].name) || '现场演示三维联动效果'
      }))
    : park.modules.map((m, i) => ({ step: i + 1, scene: m, say: `演示「${m}」核心能力`, highlight: park.value[i] || '价值亮点' }));

  return {
    ok: true,
    parkId, parkName: park.name, icon: park.icon, audience,
    title: `${park.name} · ${audience}作战手册`,
    company: company.shortName,
    opening,
    valueTalk,
    objections: OBJECTIONS,
    demoScript,
    closing: refCase
      ? `临门一脚：用${refCase.name}的成功故事建立信心——「${refCase.value}」，邀请客户实地参观或安排POC验证。`
      : '临门一脚：提出明确的下一步（POC/试点/方案评审会），把意向转为时间表。',
    deliverableNote: '可配合「转化成交」一键生成定制方案包，作为手册的随手交付物。'
  };
}

// ============ 段5：AI客户成功评分 ============
// 输入：parkId + 运营指标，输出健康度评分 + ROI + 续约/增购建议
function scoreCustomerSuccess({ parkId, modulesLive = 3, activeRate = 60, satisfaction = 4, sponsor = 3, dataIntegration = 60, monthsLive = 6 } = {}) {
  const park = getPark(parkId);
  if (!park) return { ok: false, error: '请选择有效的园区/行业类型' };
  const kb = kbOf(parkId);
  const totalModules = Math.max(park.modules.length, 1);

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const adoption = clamp((+modulesLive / totalModules) * 100, 0, 100);   // 模块落地率
  const usage = clamp(+activeRate, 0, 100);                              // 活跃使用率
  const satis = clamp((+satisfaction / 5) * 100, 0, 100);               // 满意度
  const sponsorScore = clamp((+sponsor / 5) * 100, 0, 100);             // 高层支持
  const dataScore = clamp(+dataIntegration, 0, 100);                    // 数据接入完整度

  // 加权健康度（使用率与满意度权重最高）
  const health = Math.round(usage * 0.3 + satis * 0.25 + adoption * 0.2 + sponsorScore * 0.15 + dataScore * 0.1);
  let level, levelColor, advice;
  if (health >= 80) { level = '健康'; levelColor = 'green'; advice = '客户处于价值兑现期，是增购与转介绍的最佳时机。'; }
  else if (health >= 60) { level = '关注'; levelColor = 'amber'; advice = '基础稳固但价值未充分释放，需推动活跃使用与场景扩展。'; }
  else { level = '预警'; levelColor = 'red'; advice = '存在流失风险，需高层对齐并制定挽回与激活计划。'; }

  // 风险信号
  const risks = [];
  if (usage < 50) risks.push('活跃使用率偏低，系统价值未被感知');
  if (sponsor < 3) risks.push('缺乏高层赞助者，续约决策缺支撑');
  if (satisfaction < 3.5) risks.push('满意度不足，需排查体验与交付问题');
  if (adoption < 50) risks.push('上线模块偏少，未形成全局价值闭环');
  if (!risks.length) risks.push('暂无显著风险，保持季度价值复盘');

  // 增购建议：尚未上线的场景/模块
  const liveCount = +modulesLive;
  const upsellModules = park.modules.slice(liveCount).map(m => ({ name: m, why: '扩展场景，形成端到端价值闭环' }));
  const upsellScenarios = kb.scenarios.slice(0, 3).map(s => ({ name: s.name, why: s.value || s.desc }));

  // ROI 估算（基于行业量化价值，给出区间表达）
  const roiHighlights = (park.value || []).slice(0, 3);
  const roi = {
    period: `${monthsLive} 个月`,
    statement: `以${park.name}典型量化收益测算，系统价值主要体现在：${roiHighlights.join('；')}。`,
    metrics: kb.valueMetrics.length ? kb.valueMetrics : [{ label: '运营效率', value: '↑', desc: '一体化降本增效' }],
    estimate: health >= 60
      ? '当前使用水平下，预计 12 个月内可通过效率提升/成本下降收回本期投入并产生正向回报。'
      : '需先提升活跃度，否则ROI兑现将延后，建议启动激活计划。'
  };

  return {
    ok: true,
    parkId, parkName: park.name, icon: park.icon,
    health, level, levelColor, advice,
    breakdown: [
      { label: '活跃使用率', score: Math.round(usage), weight: '30%' },
      { label: '客户满意度', score: Math.round(satis), weight: '25%' },
      { label: '模块落地率', score: Math.round(adoption), weight: '20%' },
      { label: '高层支持度', score: Math.round(sponsorScore), weight: '15%' },
      { label: '数据接入度', score: Math.round(dataScore), weight: '10%' }
    ],
    risks,
    renewal: { signal: health >= 70 ? '续约信心高' : (health >= 55 ? '需主动经营' : '流失预警'), action: advice },
    upsell: { modules: upsellModules, scenarios: upsellScenarios },
    roi
  };
}

// ============ 段2：品牌升级 —— 一页纸内容预览（供前端展示，下载走 /api/generate/brand）============
function buildBrandPreview({ parkId, client = '', emphases = [] } = {}) {
  const park = getPark(parkId);
  if (!park) return { ok: false, error: '请选择有效的园区/行业类型' };
  const kb = kbOf(parkId);
  const corePain = kb.pains[0] || { title: park.pains[0] || '数字化升级', fix: park.value[0] || '智慧化运营' };
  const tagline = client
    ? `为 ${client} 打造看得见、信得过的数字化品牌`
    : `让 ${park.name} 的数字化价值，被客户一眼看见、一次记住`;
  const valueProp = `用数字孪生，把「${corePain.title}」变成「${corePain.fix}」——` +
    `让 ${park.name} 从分散管理升级为一张图可视、可管、可控的智慧运营。`;
  const solves = (kb.pains.length ? kb.pains : (park.pains || []).map(t => ({ title: t, fix: '' })))
    .slice(0, 5).map(x => x.fix ? `${x.title} → ${x.fix}` : x.title);
  return {
    ok: true,
    parkId, parkName: park.name, icon: park.icon,
    company: company.shortName, positioning: company.positioning,
    tagline, valueProp,
    solves,
    proof: { scale: company.scale, advantages: company.advantages || [] },
    capabilities: (require('../data/knowledgeBase').capabilities || []).slice(0, 3).map(c => ({ name: c.name, desc: c.desc })),
    cases: kb.cases.slice(0, 2).map(c => ({ name: c.name, value: c.value || c.desc, metrics: c.metrics || [] })),
    valueMetrics: kb.valueMetrics,
    emphases,
    cta: '15 分钟，我们结合贵单位实际场景，给您一版专属的数字化价值蓝图与可落地的实施路径。'
  };
}

module.exports = { getJourney, buildLeadRadar, buildEnablement, scoreCustomerSuccess, buildBrandPreview };
