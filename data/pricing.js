// 产品报价数据层 —— 结构化 51WORLD《产品报价清单》（来源：26年售前支撑一张表.xlsx / 产品报价清单）
// 用于平台「报价生成器」：勾选板块/项 + 填数量 → 自动算价 → 导出同格式 Excel 报价清单。
// 价格类型：fixed=固定单价(可×数量)；tiered=阶梯计价(单价为说明文本，数量另计/按方案估)。

const TAX_RATE = 0.06; // 合同含税税点 6%

const sections = [
  {
    id: 'iot', no: 1, name: '物联网管理平台', optional: true, note: '可选',
    items: [
      { content: '物联网平台', category: '平台基础费用', price: 200000, unit: '元/套', type: 'fixed', desc: '平台作为连接终端、网络与应用的核心枢纽，基础底座能力。' },
      { content: '物联网平台', category: '协议解析', price: 20000, unit: '元/套', type: 'fixed', desc: '在边缘网关中可将一类设备定义成统一模板，标准化协议解析。' },
      { content: '物联网平台', category: '边缘计算', price: 20000, unit: '元/套', type: 'fixed', desc: '边缘端对多维异构数据进行归一化处理。' },
      { content: '物联网平台', category: 'APP端', price: 150000, unit: '元/套', type: 'fixed', desc: '随时随地查看设备运行数据、接收告警信息。' }
    ]
  },
  {
    id: 'data-platform', no: 2, name: '数据中台', optional: true, note: '可选，对接系统仅供参考，可根据实际业务定制',
    items: [
      { content: '数据采集', category: '时序数据采集', price: 100000, unit: '元/套', type: 'fixed', desc: '支持顺序、大量、快速、连续到达的数据序列动态采集。' },
      { content: '数据采集', category: '文件数据采集', price: 100000, unit: '元/套', type: 'fixed', desc: '支持日志、图片、音视频等半结构化、非结构化数据采集。' },
      { content: '数据计算', category: '批量流式计算', price: 80000, unit: '元/套', type: 'fixed', desc: '根据采集流式数据进行计算，支持按记录或滑动窗口计算。' },
      { content: '数据计算', category: '批量实时计算', price: 80000, unit: '元/套', type: 'fixed', desc: '针对实时性要求高的数据，支持实时汇总计算。' },
      { content: '数据计算', category: '批量离线计算', price: 80000, unit: '元/套', type: 'fixed', desc: '支持定时任务对统计、汇总信息进行批量计算。' },
      { content: '数据储存', category: '时序类数据存储安装调试', price: 50000, unit: '元/套', type: 'fixed', desc: '支持时序类数据存储，库结构设计、初始化。' },
      { content: '数据储存', category: '结构化数据存储安装调试', price: 50000, unit: '元/套', type: 'fixed', desc: '支持结构化数据存储，库结构设计、初始化。' },
      { content: '数据储存', category: '文件类数据存储安装调试', price: 50000, unit: '元/套', type: 'fixed', desc: '支持文件类数据存储，库结构设计、初始化。' },
      { content: '弱电系统数据对接', category: '机房消防系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '联动业务平台与数据中台，实现机房消防设备运行数据接入。' },
      { content: '弱电系统数据对接', category: '信息化平台系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '打通与现有信息化平台的数据壁垒，实现数据互通。' },
      { content: '弱电系统数据对接', category: '物业管理系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接物业管理系统，同步设备运维、环境管控等数据。' },
      { content: '弱电系统数据对接', category: '信息引导发布系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接信息引导发布设备，实现平台对各类引导信息的管理。' },
      { content: '弱电系统数据对接', category: '楼宇能效系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '联动楼宇能效系统，采集能耗数据，实现能耗统计。' },
      { content: '弱电系统数据对接', category: '安防综合管理平台对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接安防综合管理平台，整合各类安防数据。' },
      { content: '弱电系统数据对接', category: '视频安防监控系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接视频监控设备，实现监控画面实时上传、回放。' },
      { content: '弱电系统数据对接', category: '出入口控制系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接出入口门禁、闸机等设备，实现人车出入管控。' },
      { content: '弱电系统数据对接', category: '访客及一卡通管理系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接访客登记与一卡通设备，实现访客与人员管理。' },
      { content: '弱电系统数据对接', category: '停车管理及车位引导系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接停车管理设备，实现车位状态监测、车辆进出。' },
      { content: '弱电系统数据对接', category: '空调新风系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接空调、新风设备，实时采集运行参数，实现温控。' },
      { content: '弱电系统数据对接', category: '照明系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接照明设备，实现照明状态监测与远程控制。' },
      { content: '弱电系统数据对接', category: '入侵报警系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接入侵报警设备，实现报警事件接入与联动。' },
      { content: '弱电系统数据对接', category: '给排水数据监测系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接给排水监测设备，采集水位、流量等运行数据。' },
      { content: '弱电系统数据对接', category: '冷热源数据监测系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接冷热源监测设备，采集机组运行参数。' },
      { content: '弱电系统数据对接', category: '变配电数据监测系统对接', price: 40000, unit: '元/套', type: 'fixed', desc: '对接变配电监测设备，采集电力运行数据。' }
    ]
  },
  {
    id: 'digital-twin', no: 3, name: '数字孪生平台', optional: false, note: '必选',
    items: [
      { content: '数字孪生开发平台', category: '基础平台费用', price: 588000, unit: '元/套', type: 'fixed', required: true, desc: 'WDP 数字孪生开发平台基础底座，必选项。' },
      { content: '场景构建及建模', category: '城市底板还原（大场景底板还原）', unit: '元/km²', type: 'tiered',
        priceText: '单城市阶梯计价：0-10km²(含)，60,000元；10~50km²，500元/km²；50~100km²，400元/km²；100-500km²，200元/km²',
        tierExample: 60000, desc: '大场景城市底板还原，按面积阶梯计价。' },
      { content: '场景构建及建模', category: '建筑周边环境及地面铺装还原', price: 130000, unit: '元/10W方', type: 'fixed', desc: '建筑周边环境与地面铺装还原。' },
      { content: '场景构建及建模', category: '重点建筑外立面L3还原', price: 30000, unit: '元/栋', type: 'fixed', desc: '重点建筑外立面 L3 精度还原。' },
      { content: '场景构建及建模', category: '重点建筑外立面L4还原', price: 50000, unit: '元/栋', type: 'fixed', desc: '重点建筑外立面 L4 精度还原。' },
      { content: '场景构建及建模', category: '建筑室内L2精度【基础承重结构还原】', price: 0.5, unit: '元/m²', type: 'fixed', desc: '建筑室内 L2 精度，基础承重结构还原。' },
      { content: '场景构建及建模', category: '建筑室内L3精度还原【满足一般业务展示需求】', unit: '元/m²', type: 'tiered',
        priceText: '0~1000m²，3万元；1000~3000m²，30元/m²；3000~5000m²，25元/m²；5000m²以上，20元/m²',
        tierExample: 30000, desc: '建筑室内 L3 精度还原，按面积阶梯计价。' },
      { content: '场景构建及建模', category: '室内展厅L4精度还原【行业标杆必选】', unit: '元/m²', type: 'tiered',
        priceText: '0~100m²，1万元；100~500m²，110元/m²；500~2000m²，105元/m²；2000m²以上，100元/m²',
        tierExample: 10000, desc: '室内展厅 L4 精度还原，行业标杆项目必选。' },
      { content: '场景构建及建模', category: '设备还原【可选】', price: 5000, unit: '元/个', type: 'fixed', desc: '关键设备三维还原。' },
      { content: '场景构建及建模', category: '楼宇夜景灯【可选】', price: 30000, unit: '元/套', type: 'fixed', desc: '楼宇夜景灯光效果。' },
      { content: '场景构建及建模', category: '建筑水晶体特效【可选】', price: 50000, unit: '元/套', type: 'fixed', desc: '建筑水晶体特效。' },
      { content: '场景构建及建模', category: '建筑拆楼接口封装', price: 30000, unit: '元/套', type: 'fixed', desc: '建筑拆楼/剖切交互接口封装。' }
    ]
  },
  {
    id: 'carbon', no: 4, name: '碳能管理平台', optional: true, note: '可选，双碳分析亮点功能，ESG申报加分项',
    items: [
      { content: '双碳管理板块', category: '碳源检测', price: 20000, unit: '元/套', type: 'fixed', desc: '识别并检测园区碳排放源。' },
      { content: '双碳管理板块', category: '业态探测', price: 60000, unit: '元/套', type: 'fixed', desc: '探测园区业态分布，支撑碳核算。' },
      { content: '双碳管理板块', category: '区域碳计算', price: 30000, unit: '元/套', type: 'fixed', desc: '按区域核算碳排放总量。' },
      { content: '双碳管理板块', category: '自定义减碳措施', price: 50000, unit: '元/套', type: 'fixed', desc: '自定义配置减碳措施。' },
      { content: '双碳管理板块', category: '碳趋势预测', price: 30000, unit: '元/套', type: 'fixed', desc: '基于历史数据预测碳排放趋势。' },
      { content: '双碳管理板块', category: '降碳策略模拟', price: 50000, unit: '元/套', type: 'fixed', desc: '模拟不同降碳策略的减排效果。' }
    ]
  },
  {
    id: 'ai-agent', no: 5, name: 'AI知识问答库助手', optional: true, note: '打造项目专属 Agent',
    items: [
      { content: 'Clonova-基础版', category: '让业主通过自然语言与三维场景交互', price: 150000, unit: '元/套', type: 'fixed', desc: '适用于基础语义交流，解放现场操作人员双手。' },
      { content: 'Clonova-专业版', category: '深度分析+空间智算', price: 510000, unit: '元/套', type: 'fixed', desc: '适用于需具身智能训练分析，实现多维空间智算并通过特效展示。' },
      { content: 'Clonova数据训练', category: '针对性训练', price: 100000, unit: '元/次', type: 'fixed', required: true, desc: '项目专属数据针对性训练（必选）。' }
    ]
  },
  {
    id: 'ioc', no: 6, name: 'IOC业务板块', optional: true, note: '例举，可根据实际业务定制内容',
    items: [
      { content: 'IOC业务展示', category: '综合态势', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' },
      { content: 'IOC业务展示', category: '智慧通行与安防', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' },
      { content: 'IOC业务展示', category: '智慧空间管理', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' },
      { content: 'IOC业务展示', category: '设备智慧运维', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' },
      { content: 'IOC业务展示', category: '能效与双碳管理（双碳板块适配）', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' },
      { content: 'IOC业务展示', category: '智慧信息服务', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' },
      { content: 'IOC业务展示', category: '企业数字展厅', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' },
      { content: 'IOC业务展示', category: '物业与招商运营', price: 80000, unit: '元/套', type: 'fixed', desc: '业务分析数据展示及场景三维交互联动。' }
    ]
  }
];

// 给每个 item 生成稳定 id：板块id-序号
sections.forEach(sec => sec.items.forEach((it, i) => { it.id = `${sec.id}-${i + 1}`; }));

// 按行业推荐的默认勾选板块（用于一键套餐）
const industryPresets = {
  'smart-park':     ['digital-twin', 'ioc', 'data-platform'],
  'chemical-park':  ['digital-twin', 'ioc', 'iot', 'data-platform'],
  'carbon-park':    ['digital-twin', 'carbon', 'ioc'],
  'smart-building': ['digital-twin', 'ioc', 'iot'],
  'smart-hospital': ['digital-twin', 'ioc', 'data-platform'],
  'smart-city':     ['digital-twin', 'ioc', 'data-platform', 'carbon'],
  'default':        ['digital-twin', 'ioc']
};

function listSections() {
  return sections.map(s => ({
    id: s.id, no: s.no, name: s.name, optional: s.optional, note: s.note,
    items: s.items.map(it => ({
      id: it.id, content: it.content, category: it.category, unit: it.unit,
      type: it.type, price: it.price != null ? it.price : null,
      priceText: it.priceText || null, tierExample: it.tierExample || null,
      required: !!it.required, desc: it.desc
    }))
  }));
}
function getItem(id) {
  for (const s of sections) { const it = s.items.find(x => x.id === id); if (it) return { section: s, item: it }; }
  return null;
}

module.exports = { sections, TAX_RATE, industryPresets, listSections, getItem };
