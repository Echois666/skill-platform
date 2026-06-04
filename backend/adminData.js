// 管理后台数据 —— 任务看板 + 代码版本功能信息（人工维护的项目台账）
// 供 /api/admin/overview 接口读取，实时 Git 与服务状态在 server.js 中动态补充

// ---------- 任务台账（待办 / 进行中 / 已完成）----------
const tasks = [
  // 已完成
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
  { version: 'v2.2.0', date: '2026-06-04', branch: 'main', stage: '进行中',
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
