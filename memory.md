# Tony 的 Claude Code 记忆

## 项目背景
- **项目名称**: Internal Intelligent Solution Library (内部智能方案库)
- **目的**: 集成本地 FastGPT，提供方案知识库的智能搜索和问答
- **技术栈**: React + Tailwind (前端) / Node.js + Express (后端)

## 开发进展

### 已完成
- Monorepo 结构初始化
- 文件上传功能（使用本地解析 + FastGPT 文本导入）
- 支持 .docx、.pdf、.txt、.md、.csv、.html、.xlsx、.xls 解析
- 基础的"方案库"UI
- **2026-01-11**: 完成所有待办任务
  - 删除功能（后端 API + 前端 UI）
  - Toast 通知组件（替换 alert()）
  - 上传进度条
  - Excel 文件支持

### 待完成
- 文档：API 文档更新（可选）

## 重要决策
- **文件上传策略**: 本地解析（mammoth/xlsx）+ MinerU 在线 API（PDF/DOC/PPT）+ FastGPT 文本导入
- **MinerU 调用方式**: 使用在线 API（MINERU_BASE_URL + MINERU_API_TOKEN），非本地部署

## 会话记录
- **2026-01-09**: 首次会话，探索项目状态
- **2026-01-09 (下午)**: 使用 ui-ux-pro-max skill 进行 Notion 风格 UI 优化
  - 配色方案：知识库专用（Primary #3B82F6, Bg #F8FAFC）
  - 字体：Inter (Notion 同款)
  - 组件化：Sidebar, SolutionCard, UploadForm, ChatInterface
  - 设计原则：12px 间距、8px 圆角、200ms 过渡
- **2026-01-11**: 完成所有待办任务
  - 新增文件：`Toast.tsx`、`ToastContext.tsx`
  - 更新文件：`SolutionCard.tsx`、`App.tsx`、`UploadForm.tsx`、`server/src/index.js`
  - 新增翻译：删除成功提示
  - 安装依赖：xlsx (后端)
- **2026-01-11**: 档案风格 UI 重新设计 + Dark/Light 模式
  - 配色方案：浅色（white 背景）+ 深色（neutral-950 背景 + amber-600 金色）
  - 字体：Noto Serif SC（衬线）+ Noto Sans SC（无衬线）
  - 设计元素：罗马数字编号、档案标签（DHA-0001）、箭头图标
  - 新增：`ThemeContext.tsx` 主题管理（localStorage 持久化）
  - 新增：Sidebar 主题切换按钮（太阳/月亮图标）
  - 更新文件：所有组件支持 `dark:` 前缀，`tailwind.config.js` 启用 `darkMode: 'class'`
- **2026-01-12**: UI 优化 - 删除按钮、列表模式、上传位置调整
  - 修复：删除按钮始终可见（opacity-60 hover:opacity-100）
  - 新增：列表/网格模式切换（Grid3x3/List 图标按钮）
  - 新增：SolutionCard 支持列表模式（水平紧凑布局）
  - 调整：上传模块移到页面底部，带分隔线和标题
  - 更新文件：`App.tsx`, `SolutionCard.tsx`
- **2026-01-12**: 方案详情页 + 单方案对话功能（第一阶段 MVP）
  - 后端 API：新增 3 个端点
    - `GET /api/solutions/:id` - 获取方案详情（含 FastGPT 数据）
    - `GET /api/solutions/:id/preview` - 获取文档预览（知识块列表）
    - `POST /api/solutions/:id/chat` - 单方案智能对话（使用 System Prompt 限定范围）
  - 前端组件：
    - `types/solution.ts` - 类型定义
    - `SolutionDetail.tsx` - 详情页主组件（支持预览/对话 Tab 切换）
    - `DocumentPreview.tsx` - 文档预览（搜索、展开/折叠、分页加载）
    - `SolutionChat.tsx` - 方案专用聊天组件
  - 路由：扩展状态管理，新增 `solution-detail` 视图（不引入 React Router）
  - 更新文件：`App.tsx`, `SolutionCard.tsx`, `server/src/index.js`, `locales/*/translation.json`
- **2026-01-13**: 文档预览格式匹配功能 + Bug 修复
  - 新增：根据文件扩展名自动检测格式（PDF/Word/Excel/Markdown/TXT/HTML）
  - 新增：格式标签显示（带颜色图标：PDF红色、Word蓝色、Excel绿色等）
  - 新增：分块/完整文档视图切换（Markdown 文件）
  - 新增：Markdown 渲染（使用 react-markdown + remarkGfm）
  - 新增：Tailwind Typography 配置（prose 样式）
  - **Bug 修复**：collectionId 保存错误
    - 问题：FastGPT 返回 `{ collectionId: 'xxx', results: {...} }`，代码错误使用了 `collectionId.id`
    - 修复：改为 `responseData?.collectionId`
  - 安装依赖：react-markdown, remark-gfm, @tailwindcss/typography
  - 更新文件：`DocumentPreview.tsx`, `SolutionDetail.tsx`, `tailwind.config.js`, `server/src/index.js`

## 当前状态

### 已知问题
- 旧方案数据缺少 `collectionId`，无法使用详情页功能
- 解决：用户手动删除旧数据，重新上传新方案

### 待办事项

#### 第二阶段：体验优化
- [ ] 骨架屏加载状态（详情页）
- [ ] 聊天界面显示引用的知识块高亮
- [ ] 搜索结果高亮显示
- [ ] 错误重试机制
- [ ] 返回按钮动画过渡

#### 第三阶段：图文支持（可选）
- [ ] 上传时提取并保存 MinerU ZIP 中的图片
- [ ] 使用 react-markdown 渲染带图片的 Markdown
- [ ] 图片懒加载和点击放大
- [ ] 新增 `GET /api/solutions/:id/images` 端点

#### 其他优化
- [ ] 方案搜索功能
- [ ] 批量操作（批量删除）
- [ ] 导出方案为 PDF
