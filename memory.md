# Tony 的 Claude Code 记忆

## 项目背景
- **项目名称**: Internal Intelligent Solution Library (内部智能方案库)
- **核心目标**（两大模块）：
  1. **方案知识管理**：已有方案的智能搜索和问答
  2. **AI 辅助方案编写**：基于产品能力库自动生成新方案
- **目标用户**：产品经理、解决方案架构师
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

---

## 环境配置 - IP 地址修改方案

### 问题
机器 IP 地址会变化，需要批量修改配置文件中的 IP 地址。

### 需要修改的文件

| 文件 | 配置项 | 当前值 |
|-----|--------|--------|
| `server/.env` | `BASE_URL` | `http://192.168.6.125:3001` |
| `client/vite.config.ts` | `proxy.*.target` | `http://192.168.6.125:3001` |

### 快速修改步骤

**1. 查看当前 IP**
```powershell
ipconfig
# 找到 "IPv4 地址"，例如: 192.168.x.x
```

**2. 修改 `server/.env`**
```bash
BASE_URL=http://192.168.x.x:3001
```

**3. 修改 `client/vite.config.ts`**
```javascript
proxy: {
  '/api': { target: 'http://192.168.x.x:3001', changeOrigin: true },
  '/images': { target: 'http://192.168.x.x:3001', changeOrigin: true },
  '/files': { target: 'http://192.168.x.x:3001', changeOrigin: true },
  '/api/system/file': { target: 'http://192.168.x.x:3000', changeOrigin: true },
}
```

**4. 重启前端服务**（必须）
```powershell
cd client
# Ctrl+C 停止，然后重新运行
npm run dev
```

### 注意事项
- **后端无需重启**：`.env` 文件支持热更新
- **前端必须重启**：`vite.config.ts` 修改后必须重启
- **内网访问地址**：`http://新IP:5173`（前端）、`http://新IP:3001`（后端）
- **防火墙**：确保端口 3001 和 5173 已允许内网访问

---
- **管理模式**: 使用 `planning-with-files` skill 进行项目持续性管理
- **管理文件**:
  - `task_plan.md` - 项目阶段和进度跟踪
  - `notes.md` - 技术架构、API 文档、参考资料
  - `memory.md` - 会话记录和决策历史
- **工作流程**:
  1. 开始任务前读取 `task_plan.md` 了解当前状态
  2. 完成阶段后更新 `task_plan.md` 标记进度
  3. 重要技术信息记录到 `notes.md`
  4. 大改动后更新 `memory.md`

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
- **2026-01-13**: 文档预览格式匹配功能 + Bug 修复 + 图片支持
  - 新增：根据文件扩展名自动检测格式（PDF/Word/Excel/Markdown/TXT/HTML）
  - 新增：格式标签显示（带颜色图标：PDF红色、Word蓝色、Excel绿色等）
  - 新增：分块/完整文档视图切换（Markdown 文件）
  - 新增：Markdown 渲染（使用 react-markdown + remarkGfm）
  - 新增：Tailwind Typography 配置（prose 样式）
  - 新增：从 MinerU ZIP 中提取并保存图片
  - 新增：图片静态文件服务（/images 路径）
  - 新增：Vite 代理配置（/images → 后端 3001）
  - **Bug 修复**：collectionId 保存错误
    - 问题：FastGPT 返回 `{ collectionId: 'xxx', results: {...} }`，代码错误使用了 `collectionId.id`
    - 修复：改为 `responseData?.collectionId`
  - 安装依赖：react-markdown, remark-gfm, @tailwindcss/typography
  - 更新文件：`DocumentPreview.tsx`, `SolutionDetail.tsx`, `tailwind.config.js`, `server/src/index.js`, `vite.config.ts`
  - 新增文件：`docs/FASTGPT_DEPLOYMENT.md` - FastGPT 部署指南
  - 代码仓库：推送到 GitHub (https://github.com/irisfeng/kb)
- **2026-01-13 (晚上)**: 图片支持实现 + Git 仓库设置
  - 实现从 MinerU ZIP 提取图片并保存到 `server/public/images/{batchId}/`
  - 配置静态文件访问和 Vite 代理
  - 创建 .gitignore 并初始化 Git 仓库
  - 通过 GitHub Desktop 完成首次推送
  - 创建 FastGPT 部署文档 `docs/FASTGPT_DEPLOYMENT.md`
  - 待测试：图片显示效果（需要重启服务器测试）
- **2026-01-16**: 智能助手优化 - 全局聊天引用显示 + 流式输出 + 图片解析
  - 后端：修改 `/api/chat` 端点，启用 `stream: true` 和 `detail: true`
  - 后端：新增 `findSolutionByCollectionId` 辅助函数
  - 后端：修复语法错误（async 回调函数作用域问题）
  - 后端：修复字段映射（`localMarkdown: result.markdown`）
  - 后端：单方案聊天改为流式输出（`stream: true`）
  - 后端：保存方案时保存 `localMarkdown`、`batchId`、`imageCount`
  - 后端：预览 API 优先返回本地 markdown（包含图片）
  - 前端：修改 `App.tsx` 的 `handleChat`，使用 fetch API 处理 SSE 流式数据
  - 前端：修改 `SolutionDetail.tsx` 传递 `fullText` 和 `source` 给 DocumentPreview
  - 前端：修改 `DocumentPreview.tsx` 支持本地 markdown 显示（图片路径 `/images/{batchId}/xxx.jpg`）
  - 前端：修改 `SolutionChat.tsx` 使用 fetch API 支持流式输出
  - 前端：新增 `EnhancedCitation` 类型，扩展 `ChatMessage` 接口
  - 前端：新建 `CitationCard.tsx` 组件
  - 配置：更新 `.env`，确认 FastGPT 端口为 3000
  - **关键修复**：FastGPT 应用需要发布后才能通过 API 调用
  - **图片解析**：MinerU API 返回 markdown + 图片，发送给 FastGPT 使用 base64 图片，本地预览使用本地路径图片
  - **已知问题**：全局问答引用显示有问题（待修复）
- **2026-01-17**: 对话记录持久化
  - 前端：修改 `App.tsx`，全局聊天使用 localStorage 持久化（键名：`global_chat_history`）
  - 前端：修改 `SolutionChat.tsx`，单方案对话使用 localStorage 持久化（键名：`solution_chat_{solutionId}`）
  - **已完成**：全局聊天和单方案对话刷新页面后自动恢复历史记录
- **2026-01-17**: 项目管理模式更新
  - 安装并配置 `planning-with-files` skill（OthmanAdi/planning-with-files）
  - 重建 `task_plan.md`：项目整体阶段规划、技术栈、环境变量、错误记录
  - 重建 `notes.md`：技术架构、API 端点、FastGPT/MinerU 集成、UI/UX 规范
  - 更新 `memory.md`：添加项目管理模式说明
  - **文件结构**：
    - `task_plan.md` - 项目阶段和进度跟踪
    - `notes.md` - 技术笔记和参考资料
    - `memory.md` - 会话记录和决策历史
  - **工作流程**：
    1. 开始任务前读取 `task_plan.md`
    2. 完成阶段后更新 `task_plan.md`
    3. 技术信息记录到 `notes.md`
    4. 大改动后更新 `memory.md`
- **2026-01-17**: 新增核心目标 - AI 辅助方案编写
  - **需求**：帮助内部同事根据现有公司或供应商产品能力编写相关方案
  - **产品定位**：两大模块
    1. 方案知识管理：已有方案的智能搜索和问答（已实现）
    2. AI 辅助方案编写：基于产品能力库自动生成新方案（新功能）
  - **实现方案**：
    - 阶段 6：产品能力库（ProductCapability 数据结构、CRUD API、前端组件）
    - 阶段 7：AI 方案生成工作流（需求输入 → AI 匹配产品 → 生成方案 → 编辑导出）
    - 阶段 8：方案编辑与导出（Markdown 编辑器、PDF/Word 导出、版本管理）
  - **技术决策**：
    - 产品能力存储：初期使用 JSON 文件，后期可迁移到数据库
    - 产品能力库独立于方案库：概念清晰，便于管理和扩展
  - **待评估问题**：
    - FastGPT Workflow 是否支持复杂的方案生成逻辑？
    - 方案编辑器使用哪个库（TipTap/CodeMirror/MDXEditor）？
- **2026-01-17**: 对话记录持久化优化 + 清空功能
  - 新建文件：`client/src/utils/storage.ts` - localStorage 工具函数（安全读写、元数据管理、删除方案时清理）
  - 修改 `App.tsx`：
    - 使用新的 storage 工具替换原生 localStorage 操作
    - 添加 `handleClearGlobalChat` 函数（带确认对话框）
    - 修改 `handleDelete` 函数，删除方案时同步清理对话记录
    - 传递 `onClearChat` 给 `ChatInterface`
  - 修改 `ChatInterface.tsx`：添加清空按钮（仅在有消息时显示，使用 Trash2 图标）
  - 修改 `SolutionChat.tsx`：
    - 使用新的 storage 工具替换原生 localStorage 操作
    - 添加 `handleClearChat` 函数（带确认对话框和 Toast 反馈）
    - 添加清空按钮（仅在有消息时显示）
  - 修改翻译文件：添加 `chat.clear`, `chat.clear_confirm`, `chat.clear_success`, `chat.clear_failed`
  - **新增功能**：
    - 安全的 localStorage 操作（错误处理、QuotaExceededError 捕获）
    - 元数据管理（跟踪每个对话的大小、更新时间）
    - 删除方案时自动清理对应对话记录
    - 清空对话功能（全局聊天 + 单方案聊天）
  - **已完成**：阶段 4.4 对话记录持久化 + 清空功能
- **2026-01-18**: 可点击引用编号功能 + SSE 解析修复
  - 修改 `SolutionChat.tsx`：实现类似 FastGPT 后台的可点击引用编号
  - 修改 `ChatInterface.tsx`：为全局聊天添加可点击引用编号功能
  - 修改 `server/src/index.js`：
    - 添加单方案聊天的调试日志
    - **修复 SSE 流式 JSON 解析错误**：添加 buffer 缓冲不完整的 JSON 行
  - **新增功能**：
    - `renderContentWithCitations` 函数：解析 AI 回复中的 [1], [2] 编号，渲染为可点击按钮
    - 可折叠的引用列表：点击"参考来源"展开/收起
    - 点击引用编号自动滚动到对应引用卡片并高亮显示
    - 引用卡片显示引用内容、相关度评分、来源方案标题
  - **Bug 修复**：
    - SSE 流式传输时 JSON 对象被截断导致解析失败
    - 解决方案：添加 buffer 变量缓冲不完整的行
  - **新增状态**：
    - `expandedCitations`: 跟踪哪些消息的引用列表已展开
    - `highlightedCitation`: 跟踪当前高亮的引用（用于滚动定位）
    - `citationRefs`: 引用卡片 DOM 引用（用于滚动定位）
- **2026-01-19**: 修复引用显示问题 - 切换到 Workflow Key
  - **问题根因**: 使用了 `FASTGPT_APP_KEY`（简单对话应用，无知识库配置）
  - **解决方案**: 切换到 `FASTGPT_WORKFLOW_KEY`（工作流应用，已配置知识库搜索）
  - **修改文件**:
    - `server/.env`: 取消注释 `FASTGPT_WORKFLOW_KEY`，添加说明注释
    - `server/src/index.js`: 两个聊天端点改用 `FASTGPT_WORKFLOW_KEY`
    - 添加调试日志：显示正在使用的 workflow key
  - **待测试**: 重启后端服务，验证引用数据是否正确返回
- **2026-01-19**: 修复 FastGPT 工作流输出截断问题 + 前端消息操作功能
  - **问题 1**: AI 回复只有 1-2 个字（"这个问题"、"目前"等）
    - **根本原因**: FastGPT 工作流中"最大响应 tokens"被设置为 1
    - **解决过程**:
      1. 检查后端代码 - 代码正常，只是转发 FastGPT 响应
      2. 分析 CSV 日志 - 发现 `Input/Output = 6976/1`，确认是 tokens 限制
      3. 修改工作流配置 - 将回复上限从 1 改为 4096
      4. 仍然截断 - 进一步排查发现是模型配置问题
      5. **最终解决**: 更换模型（从 DeepSeek-V3.2 换成其他模型）+ 调整温度（从 2 降到 0.5-0.7）+ 关闭流式输出
  - **问题 2**: 前端 UI 缺少标准消息操作功能
    - **需求**: 复制、重发、编辑、删除按钮
    - **实现**:
      - 修改 `ChatInterface.tsx`：添加 hover-to-show 操作按钮
      - 修改 `App.tsx`：实现 `handleResendMessage`, `handleEditMessage`, `handleDeleteMessage`
      - 修改翻译文件：添加 `copy`, `resend`, `edit`, `delete` 等键
      - 使用 Toast 通知提供用户反馈
  - **关键配置**:
    - 回复上限: 4096（不是 1）
    - 温度: 0.5-0.7（不是 2）
    - 流输出: 关闭（或正确配置）
    - 模型: Qwen/GLM 系列（不是 DeepSeek-V3.2）
- **2026-01-19**: FastGPT 工作流引用数据显示问题调试（进行中）
  - **问题**: FastGPT 调用日志有引用信息，但我们的应用页面缺少引用信息
  - **已确认**:
    - ✅ AI 回复内容完整正确
    - ✅ 图片显示正常（已添加 `/api/system/file` 代理）
    - ❌ 引用数据未显示（citations 为空）
  - **调试发现**:
    - 后端日志显示所有 SSE 消息只有 `id, object, created, model, choices` 字段
    - **没有 `responseData` 字段**（我们代码预期的引用数据字段）
    - 最后一条消息的 keys 是 `0, 1, 2, 3`（数组格式）
    - 最后的消息结构：`[{ "obj": "Human", "value": "..." }, { "obj": "AI", "value": "..." }]`
    - **这个数组中没有引用数据**
  - **初步结论**: FastGPT 工作流没有通过 API 返回引用数据，或者引用数据字段名与预期不同
  - **待排查**:
    - 查看 FastGPT 工作流 AI 对话节点的完整响应（用户有 docx 文件待查看）
    - 确认 FastGPT 工作流输出节点的配置
    - 确认引用数据在 FastGPT 中的实际字段名称
  - **文件位置**:
    - `C:\Users\tonif\Desktop\调用记录日志.docx` - FastGPT 调用日志
    - `C:\Users\tonif\Desktop\节点中某次ai对话响应过程.docx` - AI 对话节点响应详情
    - 需要用户转换为 .txt 格式或重启后查看
- **2026-01-19**: 内网访问配置 + 硬编码地址修复
  - **需求**: 让内网同事访问正在开发的系统进行测试
  - **本机 IP**: 192.168.1.121
  - **配置修改**:
    - `client/vite.config.ts`: 添加 `host: '0.0.0.0'` 和 `/api` 代理配置
    - `server/src/index.js`: 修改监听地址为 `0.0.0.0`
  - **问题排查**:
    - **现象**: 同事访问页面看不到任何方案
    - **根本原因**: 前端代码硬编码了 `http://localhost:3001`，同事浏览器尝试访问他们自己机器的 localhost
    - **修复文件**:
      - `client/src/App.tsx` - 4 处 API 调用改为相对路径
      - `client/src/components/SolutionDetail.tsx` - 2 处 API 调用改为相对路径
      - `client/src/components/SolutionChat.tsx` - 1 处 API 调用改为相对路径
    - **修改内容**: 将所有 `http://localhost:3001/api/...` 改为 `/api/...`
  - **防火墙设置**（管理员 PowerShell）:
    ```powershell
    New-NetFirewallRule -DisplayName "KB Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
    New-NetFirewallRule -DisplayName "KB Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
    ```
  - **同事访问方式**: `http://192.168.1.121:5173`
  - **上线优化建议**:
    1. **环境变量管理**: 创建 `.env.development` 和 `.env.production`，使用 `import.meta.env.VITE_API_URL`
    2. **生产环境部署**:
       - 前端: `npm run build` 生成静态文件，使用 Nginx 托管
       - 后端: 使用 PM2 进行进程管理
       - 反向代理: Nginx 统一处理前端和后端路由
    3. **配置文件示例**（Nginx）:
       ```nginx
       server {
           listen 80;
           server_name your-domain.com;

           # 前端静态文件
           location / {
               root /var/www/kb/client/dist;
               try_files $uri $uri/ /index.html;
           }

           # 后端 API 代理
           location /api/ {
               proxy_pass http://localhost:3001;
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
           }

           # 图片静态文件
           location /images/ {
               proxy_pass http://localhost:3001/images/;
           }
       }
       ```
    4. **安全加固**:
       - 添加 HTTPS（使用 Let's Encrypt）
       - 配置 CORS 白名单
       - 添加请求限流（rate limiting）
       - 敏感配置使用环境变量，不提交到 Git
- **2026-01-19**: 文档预览优化 - 优雅的完整文档视图
  - **需求**: 优化方案预览功能，让 Word、PDF、PPT、Excel 等文档能够优雅美观地呈现，而不是被切割成块
  - **问题分析**:
    - 原实现有两种模式：分块视图和完整文档视图
    - 分块视图会将文档分割，不适合完整阅读
    - 需要默认使用完整文档视图，提供更好的阅读体验
  - **优化内容**:
    - **移除分块/完整切换**: 简化界面，默认总是显示完整文档
    - **增强 Markdown 渲染**: 使用自定义 ReactMarkdown components，提供更优美的样式
      - 标题：h1/h2 带底部分隔线，层次分明
      - 段落：优化行高和间距
      - 代码块：浅色背景、圆角、边框
      - 表格：斑马纹、悬停效果、边框分隔
      - 引用块：左侧彩色边框、浅色背景
      - 图片：圆角、阴影、懒加载
      - 链接：主题色、下划线、新窗口打开
    - **新增功能**:
      - 文档统计：字符数、标题数、图片数
      - 下载按钮：将文档导出为 Markdown 文件
      - 来源标识：显示是 MinerU 高清解析还是 FastGPT 知识库
    - **样式优化**:
      - 添加 `.document-content` 类，统一内边距和行高
      - 支持打印样式优化
  - **修改文件**:
    - `client/src/components/DocumentPreview.tsx` - 完全重写，移除 viewMode 状态，简化逻辑
    - `client/src/index.css` - 添加 `.document-content` 样式类
  - **效果**:
    - PDF/Word/PPT 文档通过 MinerU 解析后，完整保留原始格式和图片
    - Excel/CSV 文档以表格形式优雅呈现
    - Markdown 文档完美渲染，支持 GFM（GitHub Flavored Markdown）
    - 所有文档类型统一阅读体验
- **2026-01-19**: 修复单方案对话搜索范围问题
  - **问题**: 单方案对话会搜索其他方案的内容，而不是只搜索当前方案
  - **根本原因**: FastGPT 工作流的知识库搜索节点默认搜索整个数据集，System Prompt 无法限定搜索范围
  - **解决方案**:
    1. 在 FastGPT 工作流中添加外部变量 `collectionId`（String 类型）
    2. 配置知识库搜索节点使用 `{{collectionId}}` 变量限定搜索范围
    3. 后端代码通过 API 调用传递 `variables: { collectionId: solution.collectionId }`
  - **修改文件**:
    - `server/src/index.js` (行 444-466): 添加 `variables` 参数传递 collectionId
  - **配置要点**:
    - FastGPT 工作流 → 添加外部变量 `collectionId`
    - 知识库搜索节点 → 引用 `{{collectionId}}`
    - 后端 API → 传递 `variables: { collectionId: ... }`
  - **测试结果**: ✅ 单方案对话现在只搜索当前方案的内容

## 当前状态

### 产品模块

| 模块 | 状态 | 进度 |
|-----|------|------|
| 模块一：方案知识库 | ✅ 已完成 | 阶段 1-4 |
| 模块二：AI 方案编写 | 🔄 规划中 | 阶段 6-8 |
| 模块三：体验增强 | 📋 待规划 | 阶段 9 |

### 已知问题
- 全局问答引用显示有问题

### 待办事项

#### 模块一：体验优化（进行中）
- [x] 对话记录持久化 + 清空功能
- [ ] 骨架屏加载状态（详情页）
- [ ] 搜索结果高亮显示
- [ ] 错误重试机制
- [ ] 返回按钮动画过渡

#### 模块二：AI 方案编写（新功能）
- [ ] 阶段 6: 产品能力库
  - [ ] 数据结构设计
  - [ ] 后端 API（CRUD）
  - [ ] 前端组件（列表、表单、详情）
  - [ ] FastGPT 知识库集成
- [ ] 阶段 7: AI 方案生成工作流
  - [ ] 后端 API（生成、草稿管理）
  - [ ] 前端组件（生成器、编辑器）
  - [ ] FastGPT Workflow 配置
- [ ] 阶段 8: 方案编辑与导出
  - [ ] Markdown 编辑器
  - [ ] 导出功能（PDF/Word/MD）
  - [ ] 版本管理

#### 模块三：其他优化（可选）
- [ ] 方案搜索功能
- [ ] 批量操作（批量删除）
- [ ] 图片懒加载和点击放大
- [ ] 方案模板库
- [ ] 协作编辑
- **2026-01-23**: UI/UX 重大重构 - 导航重组 + 对话集成 + 删除单方案对话
  - **需求**: 重新设计页面结构，提升用户体验
    1. 把智能助手（全局对话）放在主页方案库的下方，集成在一个页面上
    2. 上传新方案换到另一个 tab 页（如现在的智能助手 tab 位置）
    3. 删除方案详情页的智能回答功能
  - **实现内容**:
    - **导航结构调整** (`Sidebar.tsx`):
      - 将"智能助手"改为"上传方案"
      - 图标从 `MessageSquare` 改为 `Upload`
      - ViewMode 类型从 `'solutions' | 'chat' | 'solution-detail'` 改为 `'solutions' | 'upload' | 'solution-detail'`
    - **App.tsx 重构**:
      - 集成 ChatInterface 到 solutions 视图底部（用 `border-t-2` 分隔）
      - 创建独立的 upload 视图页面
      - 上传成功后重定向回 solutions 视图
    - **SolutionDetail.tsx 简化**:
      - 删除聊天 tab 和相关状态
      - 移除 `SolutionChat` 组件引用
      - 只保留文档预览功能
    - **翻译文件更新** (`locales/zh/translation.json`, `locales/en/translation.json`):
      - 添加 `app.nav.upload` 键
      - 添加 `chat.title` 键（用于对话界面标题）
  - **Bug 修复**: 对话标题翻译问题
    - **问题**: 智能对话标题显示英文而不是中文
    - **原因**: `ChatInterface` 使用 `t('app.nav.assistant')`，但导航已改为 `app.nav.upload`
    - **解决**: 添加新的翻译键 `chat.title`，更新组件使用 `t('chat.title')`
- **2026-01-23**: UI 优化 - 使用 ui-ux-pro-max 技能优化对话界面
  - **需求**:
    1. 对话 UI 功能优化（复制、重新生成、删除）
    2. 美观提升（标准 chatbot 样式，优雅 speech bubble）
    3. Scroll 丝滑
    4. 方案库排版和滚动优化
  - **ChatInterface.tsx 完全重写**:
    - **背景**: `bg-gradient-to-b from-neutral-50 to-white` 渐变效果
    - **粘性头部**: `backdrop-blur-sm` 磨砂玻璃效果，`sticky top-0`
    - **头像设计**:
      - 用户: `bg-gradient-to-br from-amber-500 to-amber-600` 琥珀色渐变
      - AI: `bg-gradient-to-br from-neutral-100 to-neutral-50` 中性渐变
    - **Speech Bubble 优化**:
      - 用户消息: 琥珀色渐变背景，`rounded-2xl rounded-br-md`，阴影
      - AI 消息: 白色背景+边框，`rounded-2xl rounded-bl-md`，阴影
    - **操作按钮** (hover 显示):
      - 复制按钮（所有消息）
      - 重发按钮（用户消息）
      - 删除按钮（用户消息）
      - 绝对定位在消息上方，`opacity-0 group-hover:opacity-100`
    - **输入区域**:
      - 清晰的文本输入框，聚焦时 `ring-2 ring-amber-500/50`
      - 发送按钮: `bg-gradient-to-r from-amber-500 to-amber-600` 渐变
      - 禁用状态: 空输入或加载时
    - **引用显示**:
      - 可折叠的引用列表（`FileText` 图标 + 展开/收起动画）
      - 引用卡片: 阴影、hover 效果、相关度评分显示
      - Markdown 渲染支持
    - **空状态**:
      - 渐变背景图标 (`from-amber-100 to-amber-50`)
      - 居中显示，引导文字
    - **滚动优化**:
      - `scroll-smooth` 平滑滚动
      - 滚动到底部按钮（长对话时显示）
      - 新消息自动滚动
  - **App.tsx 优化**:
    - **Hero 区域增强**:
      - 更大的图标 (16x16, `shadow-xl`)
      - 5xl 标题字体
      - 统计数据居中显示
    - **视图切换按钮**: `rounded-2xl` 设计，更好的 hover 状态
    - **空状态优化**: 更友好的视觉引导
    - **主内容区域**: 添加 `scroll-smooth` 类
  - **设计原则**:
    - 主色调: amber-600 (#D97706)
    - 圆角: 统一 `rounded-2xl`
    - 过渡: 200ms smooth transitions
    - 间距: 8px/16px/24px/32px 比例
    - 阴影: 带色调的微妙阴影 (`shadow-amber-500/20`)
  - **已修改文件**:
    - `client/src/components/ChatInterface.tsx` (完全重写)
    - `client/src/App.tsx` (优化)
    - `client/src/components/Sidebar.tsx` (导航调整)
    - `client/src/components/SolutionDetail.tsx` (删除聊天功能)
    - `client/src/types/solution.ts` (类型更新)
    - `client/src/locales/zh/translation.json` (翻译键)
    - `client/src/locales/en/translation.json` (翻译键)
  - **待解决问题**:
    - **用户会话隔离**: 当前没有登录和用户模块，所有用户共享同一个对话历史
      - **现象**: 任何用户清空对话，所有人都会看到清空后的结果
      - **解决方案**: 游客会话隔离（最小实现）
        - 前端: 生成唯一匿名会话 ID (`anon_${timestamp}_${random}`)，存储在 localStorage
        - 后端: 按 sessionId 隔离聊天记录存储
        - API: 所有聊天请求带上 sessionId 参数
        - 后期可升级为可选登录系统
- **2026-01-20**: 原始文档预览功能 + UI 优化
  - **需求**: 用户希望预览原始文档，而不是解析后的 markdown 块
  - **实现方案**:
    - 后端：上传时保存原始文件到 `public/files/` 目录
    - 后端：添加 `/files` 静态文件服务
    - 前端：新增 `OriginalDocumentViewer.tsx` 组件
      - PDF: 浏览器原生 iframe 预览
      - Word/PPT/Excel: 提供下载提示
      - 图片: 直接显示
      - 文本/代码: 内容显示
    - 前端：`SolutionDetail.tsx` 添加"原文档" / "解析内容"切换按钮
  - **UI 优化**（使用 ui-ux-pro-max）:
    - 统一中性色调 + 琥珀金点缀
    - 精致边框和阴影
    - 增加留白和间距
    - 优雅的过渡动画
    - 页面底部 96px 留白
  - **解析内容预览优化**:
    - 字体缩小约 30-40%（h1: 30px→20px, p: 16px→14px）
    - 图片最大宽度限制为 512px
    - 行高和间距优化
  - **问题**: FastGPT PDF.js worker 加载失败
    - 解决: 改用浏览器原生 iframe 预览 PDF
  - **文件支持**: PDF, Word, PPT, Excel, 图片, 文本, 代码等所有常用格式
- **2026-01-20**: 数据清理 + FastGPT 图片问题排查
  - **问题**: 单方案问答返回"智能外呼"，与文档内容无关
  - **根因**: 删除旧方案后，FastGPT 知识库集合未同步删除
  - **清理操作**:
    - ✅ 本地数据库 (`db.json`) 已清空
    - ✅ 上传文件 (`uploads/`) 已删除
    - ✅ 图片文件 (`images/`) 已删除
    - ✅ 原始文件 (`files/`) 已删除
    - ✅ FastGPT 知识库集合已手动清理
    - ✅ 备份文件已创建
  - **新发现问题**: FastGPT 中的图片链接格式异常
    - 现象: `![](dataset:6959f3.../IMAGE_xxx.jpeg)` 无法访问
    - 原因: 发送给 FastGPT 的是 base64 图片，FastGPT 转换为内部格式但无法访问
    - 修改: 改用可访问的 HTTP URL (`http://192.168.1.121:3001/images/file_xxx/xxx.jpg`)
    - 环境变量: 新增 `BASE_URL=http://192.168.1.121:3001`
  - **待验证**: 重启后端 + 上传新文件，检查 FastGPT 知识库中的图片链接是否正常
- **2026-01-23**: 阶段 6 产品能力库 - 完成
  - **目标**: 建立产品能力知识库，为 AI 方案生成提供数据基础
  - **实现内容**:
    - **数据结构**: `client/src/types/capability.ts`
      - ProductCapability 接口：id, name, category, description, features[], useCases[], benefits[], specs, performance, collectionId, timestamps
    - **后端 API** (`server/src/index.js`):
      - POST /api/capabilities - 创建产品能力
      - GET /api/capabilities - 获取所有产品能力
      - GET /api/capabilities/:id - 获取单个产品能力
      - PUT /api/capabilities/:id - 更新产品能力
      - DELETE /api/capabilities/:id - 删除产品能力
      - FastGPT 自动导入：创建时自动调用 `createByText` API 导入知识库
    - **前端组件**:
      - `CapabilityLibrary.tsx` - 产品能力库主页面（分组显示、搜索、CRUD 操作）
      - `CapabilityCard.tsx` - 产品能力卡片（显示功能、用例标签、编辑/删除按钮）
      - `CapabilityForm.tsx` - 产品能力表单（支持数组字段换行分隔、JSON 字段解析）
    - **数据存储**: `server/data/capabilities.json` (lowdb)
    - **导航集成**: Sidebar 添加"产品能力"入口（Wrench 图标）
    - **翻译**: 中英文完整支持
  - **测试结果**: ✅ 用户成功测试并保存第一个产品能力 "智能外呼系统"
  - **技术亮点**:
    - 自动版本号递增
    - FastGPT 知识库无缝集成
    - 优雅的表单验证和错误处理
    - JSON 格式字段可选，降低使用门槛

## 当前状态

### 产品模块

| 模块 | 状态 | 进度 |
|-----|------|------|
| 模块一：方案知识库 | ✅ 已完成 | 阶段 1-5 |
| 模块二：AI 方案编写 | 🔄 进行中 | 阶段 6-8 |
| 模块三：体验增强 | 📋 待规划 | 阶段 9 |

### 已知问题
- **用户会话隔离**: 当前没有登录和用户模块，所有用户共享同一个对话历史（待实现）
- **单方案对话搜索范围问题**（2026-01-23 发现）：
  - **现象**：单一方案对话会搜索并返回其他方案的内容
  - **根本原因**：FastGPT 知识库搜索节点按 **Dataset（数据集）级别** 搜索，不支持按 Collection（集合）级别过滤
  - **解决方法**：在 FastGPT 工作流中添加代码节点，在知识库搜索和 AI 聊天之间过滤 quoteList

### 待办事项

#### 模块一：体验优化
- [x] 对话记录持久化 + 清空功能
- [x] 原始文档预览功能
- [x] UI 优化（优雅档案风格）
- [ ] 骨架屏加载状态（详情页）
- [ ] 搜索结果高亮显示
- [ ] 错误重试机制
- [ ] 返回按钮动画过渡

#### 模块二：AI 方案编写
- [x] 阶段 6: 产品能力库
  - [x] 数据结构设计
  - [x] 后端 API（CRUD）
  - [x] 前端组件（列表、表单、详情）
  - [x] FastGPT 知识库集成
- [x] 阶段 7: AI 方案生成工作流
  - [x] 后端 API（生成、草稿管理）
  - [x] 前端组件（生成器、列表、编辑器）
  - [x] FastGPT Workflow 集成
- [ ] 阶段 8: 方案编辑与导出
  - [x] Markdown 编辑器（基础版）
  - [x] 导出功能（Markdown/TXT）
  - [ ] 导出为 PDF/Word
  - [ ] 版本管理和对比

#### 模块三：其他优化（可选）
- **2026-01-23**: 阶段 7 AI 方案生成工作流 - 完成
  - **目标**: 实现用户输入需求，AI 自动生成专业方案
  - **实现内容**:
    - **数据结构**: `client/src/types/solution.ts`
      - DraftSolution 接口：id, title, requirements, industry, scenario, matchedCapabilities, content, status, timestamps, version
      - SolutionRequirementForm: 需求表单数据结构
    - **后端 API** (`server/src/index.js`):
      - POST /api/drafts/generate - AI 生成方案（调用 FastGPT）
      - GET /api/drafts - 获取所有草稿
      - GET /api/drafts/:id - 获取单个草稿
      - PUT /api/drafts/:id - 更新草稿
      - DELETE /api/drafts/:id - 删除草稿
    - **前端组件**:
      - `SolutionGenerator.tsx` - 需求输入表单（支持必填/可选字段）
      - `DraftList.tsx` - 草稿列表（按更新时间排序）
      - `SolutionEditor.tsx` - Markdown 编辑器（编辑/预览切换、导出）
    - **数据存储**: `server/data/drafts.json` (lowdb)
    - **导航集成**: Sidebar 新增 "AI 方案生成" 入口（Wand2 图标）
  - **FastGPT 集成**:
    - 自定义 System Prompt：专业解决方案架构师
    - 结构化输出要求：标题、背景、架构、功能、技术、实施、价值
    - 字数要求：不少于 1000 字
  - **导出功能**:
    - Markdown 格式（.md）
    - 纯文本格式（.txt）
  - **版本管理**:
    - 自动版本号递增（1.0.0 → 1.0.1）
    - 更新时间戳自动记录
  - **待测试验证**:
    - AI 生成方案质量
    - 编辑器流畅度
    - 导出功能正确性
- **2026-01-23**: UI/UX 优化 - 分页、搜索、滚动、代码块
  - **问题**: 方案越来越多，页面布局和用户体验需要优化
  - **实现内容**:
    - **分页功能** (`Pagination.tsx`):
      - 12 项/页，支持页码跳转
      - 省略号显示（总页数 > 7 时）
      - 显示项目范围（"显示 1-12 共 45 项"）
    - **搜索功能**: 实时搜索方案标题、描述、文件名
    - **滚动优化**: 移除所有独立滚动容器，改用自然页面滚动
    - **布局优化**: 方案卡片缩小约 50%，聊天区域 `flex-1 min-h-[50vh]`
    - **代码块和 Mermaid 图表**:
      - 安装依赖：react-syntax-highlighter, mermaid
      - 语法高亮：VS Code One Dark 主题
      - 代码块复制按钮
      - Mermaid 图表自动渲染
  - **已知问题**:
    - FastGPT 删除 API 无法同步（所有 API 端点返回 404）
    - FastGPT 图片显示问题（本地预览正常，知识库显示 `dataset/xxx` 链接）
  - **待调试**:
    - FastGPT 图片显示：需要完整上传日志查看 `[Upload Debug]` 部分
    - FastGPT 删除 API：需要查找正确的 API 端点

#### 模块三：其他优化（可选）
