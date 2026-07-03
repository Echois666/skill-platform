// 需求解析引擎 —— 解析用户自然语言需求，识别行业、客户、关注场景与诉求
const { parks } = require('../data/content');
const { verticals } = require('../data/knowledgeBase');

// 通用诉求关键词 → 标签
const EMPHASIS_MAP = [
  { tag: '安全应急', words: ['安全', '应急', '风险', '预警', '隐患', '消防', '危险', '指挥', '事故'] },
  { tag: '招商运营', words: ['招商', '去化', '运营', '出租', '入驻', '产业', '经济'] },
  { tag: '能耗双碳', words: ['能耗', '节能', '双碳', '碳排', '碳中和', '能源', '低碳', '绿色', '能效'] },
  { tag: '智慧服务', words: ['服务', '体验', '便民', '门户', '一站式', '用户', '满意度'] },
  { tag: '数据治理', words: ['数据', '中台', '孤岛', '融合', '治理', '共享', '决策', '分析'] },
  { tag: '运维管理', words: ['运维', '设备', '机电', '巡检', '工单', '后勤', '资产'] },
  { tag: '可视化大屏', words: ['可视化', '大屏', '一张图', '驾驶舱', 'IOC', '态势', '孪生'] },
  { tag: '安防监控', words: ['安防', '监控', '视频', '周界', '门禁', '人员定位'] }
];

// 客户名称识别：匹配「XX公司/集团/园区/医院/学校/政府/管委会...」
const CLIENT_SUFFIX = ['集团', '公司', '园区', '医院', '学校', '大学', '学院', '政府', '管委会', '管理委员会', '保护区', '景区', '场馆', '社区', '中心', '基地'];

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

// 识别最匹配的行业
function matchPark(text) {
  const scores = [];
  for (const park of parks) {
    let score = 0;
    const kb = verticals[park.id];
    // 园区名称直接命中权重最高
    const nameCore = park.name.replace(/智慧|智能|数字|方案/g, '');
    if (nameCore && text.includes(nameCore)) score += 10;
    if (text.includes(park.name)) score += 6;
    // 关键词命中
    if (kb && kb.keywords) {
      for (const kw of kb.keywords) {
        if (text.includes(kw)) score += 3;
      }
    }
    // 模块命中
    (park.modules || []).forEach(m => { if (text.includes(m)) score += 2; });
    scores.push({ park, score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function detectClient(text) {
  const STOP = ['我们要给', '我们给', '我们要', '想要给', '帮我给', '我想给', '请给', '帮我', '帮', '给', '为', '做', '建设', '建', '搞', '一个', '某某', '某个', '某', '想', '要'];
  function trim(name) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const sw of STOP) {
        if (name.length - sw.length >= 2 && name.startsWith(sw)) { name = name.slice(sw.length); changed = true; break; }
      }
    }
    return name;
  }
  let bestCandidate = '';
  for (const suf of CLIENT_SUFFIX) {
    const re = new RegExp('[\\u4e00-\\u9fa5A-Za-z0-9]{2,8}?' + suf, 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      const cand = trim(m[0]);
      if (cand.length >= 2 && (!bestCandidate || cand.length < bestCandidate.length)) bestCandidate = cand;
    }
  }
  return bestCandidate;
}

function detectEmphases(text) {
  const hits = [];
  for (const e of EMPHASIS_MAP) {
    if (e.words.some(w => text.includes(w))) hits.push(e.tag);
  }
  return hits;
}

function featureText(feature) {
  if (typeof feature === 'string') return feature;
  if (!feature || typeof feature !== 'object') return '';
  return [feature.name, feature.detail, feature.value].filter(Boolean).join(' ');
}

// 根据诉求高亮匹配行业内的相关场景
function matchScenarios(park, emphases, text) {
  const kb = verticals[park.id];
  if (!kb || !kb.scenarios) return [];
  const scored = kb.scenarios.map(sc => {
    let score = 0;
    if (text.includes(sc.name)) score += 5;
    (sc.features || []).forEach(f => { if (featureText(f) && text.includes(featureText(f))) score += 2; });
    // 诉求标签与场景名/特性的弱关联
    emphases.forEach(tag => {
      const t = tag.replace(/[^\u4e00-\u9fa5]/g, '');
      if (sc.name.includes(t.slice(0, 2)) || (sc.features || []).some(f => featureText(f).includes(t.slice(0, 2)))) score += 1;
    });
    return { name: sc.name, desc: sc.desc, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function parseRequirement(text) {
  const raw = normalize(text);
  if (!raw) {
    return { ok: false, error: '需求内容为空，请输入您的项目需求描述。' };
  }
  const scores = matchPark(raw);
  const best = scores[0];
  const confident = best.score >= 3;
  const park = best.park;
  const emphases = detectEmphases(raw);
  const rawClient = detectClient(raw);
  const scenarioRank = matchScenarios(park, emphases, raw);
  const focusScenarios = scenarioRank.filter(s => s.score > 0).map(s => s.name);

  // 置信度（0-100）
  const confidence = Math.min(100, Math.round((best.score / 12) * 100));

  // 区分「真实客户主体」与「园区类型本身」——避免把"化工园区"这类行业词误当客户
  const parkTail = park.name.replace(/^智慧|^智能|^数字/, '');
  const nameCore = park.name.replace(/智慧|智能|数字|方案/g, '');
  const isGenericClient = !rawClient || rawClient === parkTail || rawClient === park.name ||
    rawClient === nameCore || rawClient.includes(park.name) || (nameCore && rawClient === nameCore);
  const client = isGenericClient ? '' : rawClient;

  // 项目名称：有真实客户时拼接「客户+园区类型」，否则用园区类型本身；并去重
  let projectName;
  if (client) {
    projectName = client.includes(parkTail) ? `${client}数字化解决方案` : `${client}${parkTail}数字化解决方案`;
  } else {
    projectName = `${park.name}数字化解决方案`;
  }

  // 生成对需求的理解说明
  const understanding =
    `已识别项目类型为「${park.name}」` +
    (client ? `，客户主体为「${client}」` : '') +
    (emphases.length ? `，核心诉求聚焦：${emphases.join('、')}` : '') +
    (focusScenarios.length ? `；重点关注场景：${focusScenarios.slice(0, 4).join('、')}` : '') + '。';

  return {
    ok: true,
    parkId: park.id,
    parkName: park.name,
    icon: park.icon,
    confident,
    confidence,
    client,
    projectName,
    emphases,
    focusScenarios,
    understanding,
    alternatives: scores.slice(1, 4).filter(s => s.score > 0).map(s => ({ parkId: s.park.id, parkName: s.park.name }))
  };
}

module.exports = { parseRequirement };
