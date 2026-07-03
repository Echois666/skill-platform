// 五阶段方案作战台数据层 —— 商机雷达→行业一张图→方案生成→文档手册→报价联动
// 复用 content.js(parks/phases) 与 knowledgeBase.js(verticals/company) 的既有知识，不重复造数据。

// ============ 一、大湾区 11 城产业画像 ============
// 用于"AI客户雷达"：按城市主导产业匹配可切入的园区方案类型，生成本地化目标客户。
const bayAreaCities = [
  { id: 'shenzhen', name: '深圳', pillars: ['科技创新', '先进制造', '生物医药', '数字经济'],
    parks: ['smart-park', 'smart-building', 'carbon-park', 'smart-hospital'],
    note: '高新园区与总部经济密集，数字化预算充足，决策快、看重创新标杆。' },
  { id: 'guangzhou', name: '广州', pillars: ['医疗健康', '商贸会展', '汽车制造', '人工智能'],
    parks: ['smart-hospital', 'smart-venue', 'smart-park', 'smart-city'],
    note: '三甲医院与大型场馆资源丰富，国企/事业单位客户多，重资质与案例。' },
  { id: 'dongguan', name: '东莞', pillars: ['电子制造', '智能装备', '产业园区', '物流'],
    parks: ['smart-park', 'smart-logistics', 'carbon-park', 'smart-building'],
    note: '制造业园区集群，关注招商去化、能耗双碳与降本增效。' },
  { id: 'foshan', name: '佛山', pillars: ['家电制造', '陶瓷建材', '工业园区', '氢能'],
    parks: ['smart-park', 'carbon-park', 'chemical-park', 'smart-building'],
    note: '传统制造转型升级需求强，低碳与安全环保是政策硬指标。' },
  { id: 'zhuhai', name: '珠海', pillars: ['生物医药', '海洋经济', '文旅会展', '高端装备'],
    parks: ['smart-hospital', 'smart-scenic', 'smart-venue', 'smart-park'],
    note: '宜居宜业，文旅与医疗并重，横琴政策红利明显。' },
  { id: 'huizhou', name: '惠州', pillars: ['石化能源', '电子信息', '清洁能源'],
    parks: ['chemical-park', 'carbon-park', 'smart-park'],
    note: '大亚湾石化区是华南最大石化基地，安全应急与封闭化管理刚需。' },
  { id: 'zhongshan', name: '中山', pillars: ['装备制造', '健康医药', '灯饰照明'],
    parks: ['smart-park', 'smart-hospital', 'carbon-park'],
    note: '专业镇经济，中小企业园区多，重性价比与快速见效。' },
  { id: 'jiangmen', name: '江门', pillars: ['先进制造', '现代农业', '文旅侨乡'],
    parks: ['smart-park', 'smart-rural', 'smart-scenic'],
    note: '大广海湾承接产业转移，农业与文旅特色突出。' },
  { id: 'zhaoqing', name: '肇庆', pillars: ['新能源汽车', '林业生态', '绿色农业'],
    parks: ['carbon-park', 'smart-forestry', 'smart-rural'],
    note: '生态保育与绿色制造并重，林业与双碳场景适配。' },
  { id: 'hongkong', name: '香港', pillars: ['金融科技', '国际贸易', '智慧城市', '高校科研'],
    parks: ['smart-city', 'smart-building', 'smart-campus', 'smart-venue'],
    note: '国际化标准高，重数据安全与合规，智慧城市与高校科研合作机会多。' },
  { id: 'macau', name: '澳门', pillars: ['文旅会展', '综合度假', '中医药'],
    parks: ['smart-venue', 'smart-scenic', 'smart-hospital'],
    note: '世界级文旅场馆运营需求，重体验与大型活动保障。' }
];

// ============ 二、目标客户主体类型（按园区类型给出客户原型与决策角色）============
// 用于"AI客户雷达"生成可落地的目标客户清单与触达对象。
const clientArchetypes = {
  'smart-park': [
    { type: '产业园区运营公司', role: '运营总监 / 招商负责人', hook: '招商去化与运营效率' },
    { type: '经开区/高新区管委会', role: '信息中心主任 / 分管副主任', hook: '园区一图统览与产业经济' },
    { type: '产业地产开发商', role: '数字化负责人 / 项目总', hook: '资产盘活与智慧运营' }
  ],
  'chemical-park': [
    { type: '化工园区管委会', role: '安环局长 / 应急办主任', hook: '安全风险与应急指挥' },
    { type: '危化品生产企业', role: 'EHS总监 / 安全经理', hook: '重大危险源监测与封闭化管理' }
  ],
  'carbon-park': [
    { type: '制造业龙头企业', role: '能源管理负责人 / 双碳办', hook: '能耗双控与碳资产' },
    { type: '工业园区平台公司', role: '运营总经理', hook: '绿色园区与节能降本' }
  ],
  'smart-hospital': [
    { type: '三甲/区域中心医院', role: '信息科主任 / 副院长', hook: '就医流程与运营驾驶舱' },
    { type: '医疗集团/医共体', role: 'CIO / 信息中心', hook: '多院区数据互通' }
  ],
  'smart-building': [
    { type: '甲级写字楼/总部园区', role: '物业总经理 / 工程总监', hook: '能耗与设备运维' },
    { type: '商业综合体运营方', role: '设施管理负责人', hook: '楼宇自控与空间运营' }
  ],
  'smart-logistics': [
    { type: '第三方物流/快递企业', role: '运营VP / 仓配总监', hook: '仓储分拣与路径优化' },
    { type: '大型物流园区', role: '园区运营负责人', hook: '货物追踪与成本核算' }
  ],
  'smart-scenic': [
    { type: '5A/4A 景区管委会', role: '运营副总 / 智慧化负责人', hook: '客流安全与精准营销' },
    { type: '文旅集团', role: '数字化中心总监', hook: '游客体验与一体化指挥' }
  ],
  'smart-venue': [
    { type: '会展中心/体育场馆', role: '运营总监 / 场馆经理', hook: '大型活动保障与利用率' },
    { type: '文旅度假综合体', role: '智慧运营负责人', hook: '观众服务与设备智控' }
  ],
  'smart-city': [
    { type: '区/县政府数字政府办', role: '大数据局长 / 信息中心主任', hook: '城市数字孪生底座' },
    { type: '城投/城运平台公司', role: '智慧城市事业部总经理', hook: '一网统管与CIM平台' }
  ],
  'smart-campus': [
    { type: '高校/职校', role: '信息化处处长 / 后勤处长', hook: '一卡通与校园数据' },
    { type: '教育集团', role: '信息中心主任', hook: '多校区统一管理' }
  ],
  'smart-rural': [
    { type: '县域农业农村局', role: '分管领导 / 信息中心', hook: '数字治理与农产品溯源' },
    { type: '现代农业产业园', role: '运营负责人', hook: '智慧农业与产业发展' }
  ],
  'smart-forestry': [
    { type: '林业局/自然保护区', role: '资源管理科长 / 防火办', hook: '森林防火与生态监测' }
  ],
  'smart-realestate': [
    { type: '房地产开发集团', role: '数字化中心总经理', hook: '项目全周期与智慧物业' }
  ],
  'smart-park-public': [
    { type: '城市公园/湿地管理处', role: '运营管理负责人', hook: '生态监测与访客服务' }
  ],
  'campus-construction': [
    { type: '新建院校筹建办', role: '基建处长 / 筹建组', hook: '统一规划与信息化建设' }
  ]
};

// ============ 三、5 段全链路作战蓝图 ============
// 每段：客户旅程定位 + 客户痛点 + AI能力 + 交付物 + 量化KPI + 关联现有平台能力
const journeyStages = [
  {
    id: 'discover', step: 1, icon: '🛰️', name: '阶段一',
    subtitle: '实时招标雷达', color: 'cyan',
    customerPain: '不知道全网哪里有项目机会、招标信息分散难追踪、错过投标窗口期。',
    aiCapability: '实时抓取中国政府采购网全网各行业最新招标公告，按行业关键词精准锁定可投标商机，第一时间发现项目机会。',
    deliverables: ['实时招标清单', '采购人/代理机构', '公告类型与时间', '一键直达原文'],
    kpis: [{ label: '数据实时性', value: '当日更新' }, { label: '覆盖行业', value: '全网' }],
    linkedFeature: '/journey.html#radar',
    tool: 'radar'
  },
  {
    id: 'brand', step: 2, icon: '📄', name: '阶段二',
    subtitle: '行业产品一页纸', color: 'pink',
    customerPain: '没有标准化的行业产品介绍材料，案例零散、一页纸缺失，客户记不住产品价值。',
    aiCapability: '基于行业知识库一键产出对标51WORLD园区一页纸版式的产品一页纸：产品定义+客户痛点+业务场景+客户案例+产品矩阵，第一面建立专业信任。',
    deliverables: ['行业产品一页纸(.pptx)', '客户痛点梳理', '业务场景矩阵', '标杆案例卡'],
    kpis: [{ label: '物料产出', value: '分钟级' }, { label: '覆盖行业', value: '15+' }],
    linkedFeature: '/journey.html#brand',
    tool: 'brand'
  },
  {
    id: 'convert', step: 3, icon: '🎯', name: '阶段三',
    subtitle: '方案/PPT/计划生成', color: 'purple',
    customerPain: '方案准备周期长、个性化难、Word/PPT/报价要反复返工。',
    aiCapability: '把方案生成嵌入当前作战驾驶舱，按客户需求一键输出解决方案、PPT、实施计划与完整方案包。',
    deliverables: ['解决方案(.docx)', '演示文稿(.pptx)', '实施计划(.xlsx)', '完整方案包(.zip)'],
    kpis: [{ label: '方案效率', value: '↑70%' }, { label: '准备周期', value: '数天→分钟' }],
    linkedFeature: '/journey.html#convert',
    tool: 'convert'
  },
  {
    id: 'enable', step: 4, icon: '📚', name: '阶段四',
    subtitle: '全环节文档手册', color: 'amber',
    customerPain: '售前、设计、实施、验收、运维各环节文档散落，新人不知道该写什么、客户也拿不到适配材料。',
    aiCapability: '按阶段整理需求调研、SRS、概设、详设、实施计划、操作手册、测试、验收、运维等标准文档，并可快速下载客户适配模板。',
    deliverables: ['调研报告', '概设/详设', '产品说明/操作手册', '验收/运维文档'],
    kpis: [{ label: '模板覆盖', value: '18份+' }, { label: '交付规范', value: '标准化' }],
    linkedFeature: '/journey.html#enable',
    tool: 'enable'
  },
  {
    id: 'success', step: 5, icon: '💰', name: '阶段五',
    subtitle: '报价平台联动', color: 'green',
    customerPain: '报价与方案脱节，模块、工期、人天、软硬件、交付物无法快速形成统一口径。',
    aiCapability: '先提供可配置报价测算入口，后续对接正式报价平台，把行业、版本、模块、交付范围转成报价清单。',
    deliverables: ['报价测算', '模块清单', '人天估算', '报价平台接口'],
    kpis: [{ label: '报价效率', value: '分钟级' }, { label: '口径一致', value: '可追溯' }],
    linkedFeature: '/journey.html#success',
    tool: 'success'
  }
];

// 商业模式：从项目制走向订阅制（用于驾驶舱展示）
const businessModel = [
  { tier: '入口', name: '阶段一·商机雷达', price: '线索入口', desc: '实时招标雷达+数字孪生相关性筛选，先找到真实项目机会', stage: '阶段一' },
  { tier: '转化', name: '阶段二三·物料与方案', price: '项目制', desc: '产品一页纸+解决方案+PPT+计划，快速完成客户沟通与成交材料', stage: '阶段二→阶段三' },
  { tier: '落地', name: '阶段四五·交付与报价', price: '平台化', desc: '交付物模板+报价测算/报价平台接口，形成从售前到商务的闭环', stage: '阶段四→阶段五' }
];

module.exports = { bayAreaCities, clientArchetypes, journeyStages, businessModel };
