// 管理后台数据 —— 任务看板 + 代码版本功能信息（人工维护的项目台账）
// 供 /api/admin/overview 接口读取，实时 Git 与服务状态在 server.js 中动态补充

// ---------- 任务台账（待办 / 进行中 / 已完成）----------
const tasks = [
  // 本轮新增（v2.3.0）
  { id: 'single-entry', title: '统一生成入口（移除对外/对内双版本）',     status: 'done',        phase: '深化',   date: '2026-06-05', desc: '前端只保留一个「一键生成并下载」按钮，后端版本中性化' },
  { id: 'industry-pains', title: '15行业专属痛点+数字孪生解法',           status: 'done',        phase: '深化',   date: '2026-06-05', desc: '从2026脱敏方案提取，驱动PPT痛点页与Word需求章，各行业不再雷同' },
  { id: 'img-fallback', title: 'PPT配图回退机制 + 色值修复',              status: 'done',        phase: '深化',   date: '2026-06-05', desc: '无图行业复用相近行业图库达8-10图；修复8处非法RGBA消除黑边' },
  { id: 'admin-sync',   title: '前台后台互通 + 台账实时同步',             status: 'done',        phase: '深化',   date: '2026-06-05', desc: '前台加管理后台入口，adminData同步最新进展' },
  { id: 'phases-viz',   title: '三阶段各环节交付物可视化',               status: 'in_progress', phase: '前端',   date: '2026-06-05', desc: '前端对接content.js完整三阶段数据，展示活动+交付物清单' },
  { id: 'park-materials', title: '方案库板块资料浏览与下载',             status: 'pending',     phase: '深化',   date: '', desc: '上传各行业脱敏素材，弹窗内预览/下载真实方案PDF' },
  { id: 'ppt-enrich',   title: 'PPT逐行业内容加厚',                       status: 'pending',     phase: '深化',   date: '', desc: '场景功能点配真实说明、案例不截断，提升每页信息密度' },
  { id: 'ext-integrations', title: '对接报价/UI设计/原型设计平台',       status: 'pending',     phase: '规划',   date: '', desc: '预留外部平台对接入口，待目标平台信息后实装' },

  // 已完成（历史）
  { id: 'analyze',     title: '分析园区资料并构建结构化数据模型', status: 'done',        phase: '规划',   date: '2026-06-04', desc: '梳理15个园区类型 + 售前/售中/交付三阶段环节与交付物' },
  { id: 'frontend',    title: '搭建可视化前端平台',               status: 'done',        phase: '前端',   date: '2026-06-04', desc: '园区方案库、三阶段流程、生成工具的可视化页面' },
  { id: 'docx-gen',    title: '实现真实 Word 方案文档生成',       status: 'done',        phase: '后端',   date: '2026-06-04', desc: '基于 docx 库，含封面/概述/痛点/价值/模块/架构/实施计划' },
  { id: 'pptx-gen',    title: '实现真实 PPT 演示文稿生成',        status: 'done',        phase: '后端',   date: '2026-06-04', desc: '基于 pptxgenjs，10+ 页专业幻灯片' },
  { id: 'xlsx-gen',    title: '实现真实 Excel 实施计划生成',      status: 'done',        phase: '后端',   date: '2026-06-04', desc: '基于 exceljs，三阶段配色甘特式计划表' },
  { id: 'zip-pack',    title: '完整方案包打包下载（zip）',        status: 'done',        phase: '后端',   date: '2026-06-04', desc: 'archiver 将三件套打包为 zip 一键下载' },
  { id: 'pages',       title: 'GitHub Pages 浏览器端版本上线',    status: 'done',        phase: '部署',   date: '2026-06-04', desc: '客户端 CDN 库实时生成，零服务器，免费备用站点' },
  { id: 'push',        title: '推送全部代码到 GitHub',            status: 'done',        phase: '部署',   date: '2026-06-04', desc: '仓库 Echois666/skill-platform，main 分支' },
  { id: 'deploy-sh',   title: '编写服务器一键部署脚本',           status: 'done',        phase: '部署',   date: '2026-06-04', desc: 'deploy/server-setup.sh：Node+PM2+Nginx 自动化' },
  { id: 'server',      title: '部署到腾讯云服务器并守护进程',     status: 'done',        phase: '部署',   date: '2026-06-04', desc: 'Ubuntu 24.04，PM2 守护 + 开机自启，Nginx 反代 80→3000' },
  { id: 'verify',      title: '公网端到端验证全部接口',           status: 'done',        phase: '测试',   date: '2026-06-04', desc: '首页/健康检查/4个生成接口均返回有效文件' },
  { id: 'admin',       title: '构建管理后台（任务+版本看板）',     status: 'in_progress', phase: '深化',   date: '2026-06-04', desc: '本页面：实时展示任务台账、代码版本、服务状态' },

  // 进行中 / 待办
  { id: 'customize',   title: '方案定制（客户名称/项目名称/编制单位）', status: 'pending', phase: '深化', date: '', desc: '生成时注入客户信息到文档封面与正文，贴合真实投标' },
  { id: 'quote-gen',   title: '新增报价单生成（分项报价明细）',   status: 'pending',     phase: '深化',   date: '', desc: '基于功能模块自动生成 Excel 报价单' },
  { id: 'park-search', title: '园区搜索与分类过滤',               status: 'pending',     phase: '前端',   date: '', desc: '前端关键词搜索 + 标签筛选，快速定位方案' },
  { id: 'domain',      title: '域名绑定 + HTTPS 证书',            status: 'in_progress', phase: '部署',   date: '2026-06-04', desc: '已装 certbot 2.9.0，已启用自签名 HTTPS(443)，已备一键脚本 enable-domain.sh；待办：腾讯云安全组放行443 + 域名解析 + ICP备案后一键签发正式证书' }
];

// ---------- 代码版本 / 功能变更台账 ----------
const versions = [
  { version: 'v2.3.0', date: '2026-06-05', branch: 'main', stage: '已发布',
    title: '生成质量跃升 · 行业深化 · 后台同步',
    features: ['移除对外/对内双版本，统一为单一「一键生成并下载」入口', '15个行业各注入专属痛点+数字孪生解法（取自2026脱敏方案），痛点页/Word需求章不再雷同', '配图回退机制：6个无图行业复用语义相近行业图库，PPT达8-10张配图', '修复8处非法RGBA色值，消除PPT黑边/黑块', '前台新增「管理后台」入口；后台台账实时同步'],
    commit: '(本轮)' },
  { version: 'v2.2.0', date: '2026-06-04', branch: 'main', stage: '已发布',
    title: '管理后台 · HTTPS · 功能深化',
    features: ['新增管理后台（任务看板 + 版本台账 + 服务状态）', '服务器安装 certbot 2.9.0，启用自签名 HTTPS(443)', '新增 enable-domain.sh：域名解析+备案后一键签发正式证书', '规划：方案定制、报价单生成、园区搜索'],
    commit: '(开发中)' },
  { version: 'v2.1.0', date: '2026-06-04', branch: 'main', stage: '已发布',
    title: '服务器一键部署',
    features: ['新增 deploy/server-setup.sh 一键部署脚本', '自动安装 Node.js 18 + PM2 + Nginx', 'PM2 进程守护与开机自启'],
    commit: '1434981' },
  { version: 'v2.0.1', date: '2026-06-04', branch: 'main', stage: '已发布',
    title: 'GitHub Pages 浏览器端真实生成',
    features: ['首页升级为客户端 CDN 库实时生成', '零服务器即可下载真实 Word/PPT/Excel/zip', '数据全程不离开浏览器'],
    commit: '22915f0' },
  { version: 'v2.0.0', date: '2026-06-04', branch: 'main', stage: '已发布',
    title: '完整后端 · 真实文档生成',
    features: ['data/content.js：15园区+三阶段结构化数据', 'docx/pptx/xlsx 三大真实文档生成器', 'server.js：4个生成下载端点 + 数据API + 静态托管', 'public/index.html：fetch→blob→download 真实下载前端'],
    commit: 'a40eefc' },
  { version: 'v1.2.0', date: '2026-06-04', branch: 'main', stage: '已发布',
    title: 'GitHub Pages 自包含静态版',
    features: ['完整自包含 index.html 上线 Pages', '15园区 + 三阶段可视化展示'],
    commit: '259b6b8' },
  { version: 'v1.1.0', date: '2026-06-04', branch: 'main', stage: '已归档',
    title: 'Railway 部署配置',
    features: ['新增 Railway 部署配置与脚本', 'Dockerfile / railway.json'],
    commit: '1468ab9' },
  { version: 'v1.0.0', date: '2026-06-04', branch: 'main', stage: '已发布',
    title: '平台初始框架',
    features: ['完整平台框架 + 静态前端', '部署文档与配置初始化'],
    commit: '3b244fa' }
];

// ---------- 分支台账 ----------
const branches = [
  { name: 'main', role: '生产主干', status: 'active',
    desc: '线上腾讯云服务器与 GitHub Pages 均从此分支部署，始终保持可发布状态。',
    deployedTo: ['腾讯云服务器 http://49.233.170.127/', 'GitHub Pages https://echois666.github.io/skill-platform/'] }
];

module.exports = { tasks, versions, branches };
