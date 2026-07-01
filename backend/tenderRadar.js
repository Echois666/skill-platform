// 实时招标雷达 —— 从「中国政府采购网」(ccgp.gov.cn) 抓取全网各行业真实招标公告
// 数据真实、来源权威、无任何虚构内容。失败时返回 ok:false 并说明原因，绝不编造数据。
const http = require('http');

// 行业 → 搜索关键词（对齐平台 15 个行业 parkId）
const KEYWORD_MAP = {
  'smart-park': '智慧园区',
  'chemical-park': '化工园区',
  'smart-hospital': '智慧医院',
  'smart-campus': '智慧校园',
  'campus-construction': '智慧校园',
  'smart-venue': '智慧场馆',
  'smart-logistics': '智慧物流',
  'carbon-park': '零碳园区',
  'smart-building': '智慧楼宇',
  'smart-city': '智慧城市',
  'smart-scenic': '智慧景区',
  'smart-rural': '数字乡村',
  'smart-forestry': '智慧林业',
  'smart-realestate': '智慧地产',
  'smart-park-public': '智慧公园'
};

// 行业下拉之外的「综合」入口，覆盖全网各行业数字化项目
const ALL_KEYWORD = '数字孪生';

const CACHE = new Map();
const CACHE_TTL = 20 * 60 * 1000; // 20 分钟

function getCache(key) {
  const hit = CACHE.get(key);
  if (hit && (Date.now() - hit.time) < CACHE_TTL) return hit.data;
  return null;
}
function setCache(key, data) { CACHE.set(key, { time: Date.now(), data }); }

function httpGet(url, timeoutMs = 12000, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Referer': 'http://search.ccgp.gov.cn/',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        const next = res.headers.location.startsWith('http') ? res.headers.location : ('http://search.ccgp.gov.cn' + res.headers.location);
        return httpGet(next, timeoutMs, redirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`数据源返回 HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', err => reject(err));
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('数据源响应超时')); });
  });
}

function stripTags(s) {
  return String(s == null ? '' : s)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

// 按公告类型归类：opportunity 可投标机会 / result 结果公告 / update 更正 / void 废标终止
function classify(type) {
  if (/中标|成交|结果/.test(type)) return 'result';
  if (/废标|流标|终止/.test(type)) return 'void';
  if (/更正|变更|澄清|答疑/.test(type)) return 'update';
  return 'opportunity';
}

function parseTenders(html) {
  const out = [];
  const listMatch = html.match(/<ul class="vT-srch-result-list-bid">([\s\S]*?)<\/ul>/);
  const scope = listMatch ? listMatch[1] : '';
  if (!scope) return out;
  const liRe = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = liRe.exec(scope)) !== null) {
    const li = m[1];
    const aMatch = li.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!aMatch) continue;
    const url = aMatch[1].trim();
    const title = stripTags(aMatch[2]).replace(/\s+/g, ' ').trim();
    if (!title) continue;
    const pMatch = li.match(/<p>([\s\S]*?)<\/p>/);
    const summary = pMatch ? stripTags(pMatch[1]).replace(/\s+/g, ' ').trim() : '';
    const spanMatch = li.match(/<span>([\s\S]*?)<\/span>/);
    const span = spanMatch ? spanMatch[1] : '';

    const dateM = span.match(/(\d{4})\.(\d{2})\.(\d{2})\s*([\d:]+)?/);
    const date = dateM ? `${dateM[1]}-${dateM[2]}-${dateM[3]}` : '';
    const buyerM = span.match(/采购人：\s*([^|<\n]+?)\s*(?:\||<|\n|$)/);
    const buyer = buyerM ? buyerM[1].trim() : '';
    const agentM = span.match(/代理机构：\s*([^|<\n]+?)\s*(?:\||<|\n|$)/);
    const agent = agentM ? agentM[1].trim() : '';

    const strongs = [];
    const strongRe = /<strong[^>]*>([\s\S]*?)<\/strong>/g;
    let sm;
    while ((sm = strongRe.exec(span)) !== null) {
      const t = stripTags(sm[1]).replace(/\s+/g, '').trim();
      if (t) strongs.push(t);
    }
    const type = strongs[0] || '采购公告';
    const category = strongs[1] || '';

    let province = '';
    const afterStrong = span.split('</strong>')[1] || '';
    const provM = afterStrong.match(/\|\s*([^|<\n]+?)\s*(?:\||<|\n|$)/);
    if (provM) province = provM[1].trim();

    const dtHits = dtScore(title + ' ' + summary);
    out.push({ title, url, summary, date, buyer, agent, type, category, province, kind: classify(type),
      dtRelated: dtHits.length > 0, dtTags: dtHits.slice(0, 3) });
  }
  return out;
}

// 数字孪生行业相关性识别：基于关键词判断招标项目是否属于数字孪生/智慧化范畴
const DT_KEYWORDS = [
  '数字孪生', '孪生', '智慧', '智能化', '可视化', '三维', '3D', 'BIM', 'CIM', 'IOC', 'GIS',
  '仿真', '一张图', '数字化', '信息化平台', '大数据', '物联网', '城市大脑', '数字底座',
  '虚拟现实', '元宇宙', '数据中台', '智慧大屏', '运营中心', '感知', '态势', '数字平台',
  '智慧园区', '智慧城市', '智慧场馆', '智慧景区', '智慧医院', '智慧校园', '智慧楼宇',
  '综合管控', '可视化平台', '指挥中心', '应急指挥', '数字沙盘'
];
function dtScore(text) {
  const t = String(text || '');
  let hits = [];
  for (const k of DT_KEYWORDS) {
    if (t.includes(k)) hits.push(k);
  }
  return hits;
}

function buildUrl(kw, timeType) {
  const q = encodeURIComponent(kw);
  return 'http://search.ccgp.gov.cn/bxsearch?searchtype=1&page_index=1&bidSort=0' +
    `&buyerName=&projectId=&pinMu=0&bidType=0&dbselect=bidx&kw=${q}` +
    `&start_time=&end_time=&timeType=${timeType}&displayZone=&zoneId=&pppStatus=0&agentName=`;
}

// 主入口：抓取真实招标公告
// parkId 行业(可选) / keyword 自定义关键词(可选,优先) / kind 类型筛选 / days 时间范围 / limit 条数 / dtOnly 仅数字孪生相关
async function fetchTenderRadar({ parkId = '', keyword = '', kind = 'opportunity', days = 30, limit = 12, dtOnly = false } = {}) {
  const kw = (keyword && String(keyword).trim()) || KEYWORD_MAP[parkId] || ALL_KEYWORD;
  const d = +days || 30;
  const timeType = d <= 7 ? '2' : (d <= 30 ? '3' : '4'); // 近1周/近1月/近3月
  const rangeLabel = d <= 7 ? '近一周' : (d <= 30 ? '近一月' : '近三月');
  const cap = Math.max(1, Math.min(30, +limit || 12));

  const cacheKey = `${kw}|${timeType}`;
  let items = getCache(cacheKey);
  let cached = true;
  if (!items) {
    cached = false;
    let html;
    try {
      html = await httpGet(buildUrl(kw, timeType));
    } catch (e) {
      return { ok: false, error: `实时招标数据获取失败：${e.message}`, keyword: kw, source: '中国政府采购网 (ccgp.gov.cn)' };
    }
    items = parseTenders(html);
    setCache(cacheKey, items);
  }

  let filtered = items;
  if (kind === 'opportunity') filtered = items.filter(t => t.kind === 'opportunity');
  else if (kind === 'result') filtered = items.filter(t => t.kind === 'result');
  // kind === 'all' 时不过滤
  if (dtOnly) filtered = filtered.filter(t => t.dtRelated);

  const list = filtered.slice(0, cap);
  const counts = {
    opportunity: items.filter(t => t.kind === 'opportunity').length,
    result: items.filter(t => t.kind === 'result').length,
    update: items.filter(t => t.kind === 'update').length,
    dtRelated: items.filter(t => t.dtRelated).length,
    total: items.length
  };

  return {
    ok: true,
    keyword: kw,
    parkId,
    kind,
    dtOnly: !!dtOnly,
    rangeLabel,
    source: '中国政府采购网（财政部指定政府采购信息发布媒体）',
    sourceUrl: 'http://www.ccgp.gov.cn',
    fetchedAt: new Date().toISOString(),
    cached,
    counts,
    shown: list.length,
    summary: list.length
      ? `${rangeLabel}内，「${kw}」相关共抓取到 ${counts.total} 条公告（可投标 ${counts.opportunity} 条、中标 ${counts.result} 条、数字孪生相关 ${counts.dtRelated} 条）${dtOnly ? '，已筛选仅显示数字孪生相关项目' : ''}，数据来自中国政府采购网，实时更新。`
      : (dtOnly
          ? `${rangeLabel}内「${kw}」相关公告中暂无数字孪生相关项目，可关闭该筛选或更换关键词。`
          : `${rangeLabel}内未检索到「${kw}」相关公告，可尝试更换关键词或放宽时间范围。`),
    tenders: list
  };
}

module.exports = { fetchTenderRadar, KEYWORD_MAP, ALL_KEYWORD };
