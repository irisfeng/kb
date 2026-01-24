# Task Plan: Internal Intelligent Solution Library

## 目标

构建一个集成本地 FastGPT 的内部智能方案库，提供两大核心能力：

1. **方案知识管理**：已有方案的智能搜索和问答
2. **AI 辅助方案编写**：基于产品能力库自动生成新方案

---

## 产品定位

### 目标用户
- **方案团队**：产品经理、解决方案架构师
- **使用场景**：
  - 查找参考方案（方案库检索）
  - 基于产品能力生成新方案（AI 编写）

### 核心价值

| 功能 | 用户痛点 | 解决方案 |
|-----|---------|---------|
| 方案检索 | 找不到历史方案，重复造轮子 | AI 语义搜索 + 跨方案问答 |
| 方案编写 | 不知道用哪些产品，写方案耗时 | AI 匹配产品能力 + 生成方案框架 |

---

## 项目信息

### 技术栈
- **前端**: React + Tailwind CSS + Vite
- **后端**: Node.js + Express
- **AI**: FastGPT (本地部署)
- **文档解析**: mammoth, xlsx, MinerU API

### 环境变量
```bash
FASTGPT_API_KEY=sk-xxx
FASTGPT_BASE_URL=http://localhost:3000/api
MINERU_BASE_URL=http://localhost:8887
MINERU_API_TOKEN=xxx
PORT=3001
```

---

## 阶段规划

### 模块一：方案知识库（已有功能）

#### [x] 阶段 1: 基础功能（已完成）
- [x] 1.1 Monorepo 结构初始化
- [x] 1.2 文件上传功能（支持 docx, pdf, txt, md, csv, html, xlsx, xls）
- [x] 1.3 方案列表 UI（网格/列表视图切换）
- [x] 1.4 删除功能
- [x] 1.5 Toast 通知组件
- [x] 1.6 上传进度条
- [x] 1.7 主题切换（深色/浅色模式）

#### [x] 阶段 2: 方案详情页（已完成）
- [x] 2.1 方案详情页组件（SolutionDetail.tsx）
- [x] 2.2 文档预览功能（DocumentPreview.tsx）
- [x] 2.3 单方案智能对话（SolutionChat.tsx）
- [x] 2.4 后端 API（/api/solutions/:id, /api/solutions/:id/preview, /api/solutions/:id/chat）

#### [x] 阶段 3: 文档解析与图片支持（已完成）
- [x] 3.1 格式自动检测（PDF/Word/Excel/Markdown/TXT/HTML）
- [x] 3.2 格式标签显示
- [x] 3.3 Markdown 渲染（react-markdown）
- [x] 3.4 图片提取和保存（MinerU ZIP）
- [x] 3.5 图片静态文件服务（/images 路径）

#### [x] 阶段 4: 智能助手优化（已完成）
- [x] 4.1 流式输出（SSE）
- [x] 4.2 知识块引用显示
- [x] 4.3 全局聊天功能
- [x] 4.4 对话记录持久化（localStorage + 清空功能）

#### [x] 阶段 5: 体验优化（已完成）
- [x] 5.1 对话记录持久化
- [x] 5.2 清空对话记录功能
- [x] 5.3 可点击引用编号（全局聊天 + 单方案聊天）
- [x] 5.4 调试单方案聊天引用问题
  - [x] 发现问题：使用了错误的 API Key（简单对话应用）
  - [x] 切换到 FASTGPT_WORKFLOW_KEY（工作流应用，有知识库）
  - [x] 测试单方案对话引用显示（已验证）
- [x] 5.5 原始文档预览功能（OriginalDocumentViewer.tsx）
- [x] 5.6 UI/UX 重大重构
  - [x] 导航结构调整（对话集成到主页，上传移到独立 tab）
  - [x] 删除方案详情页的对话功能
  - [x] 修复对话标题翻译问题
  - [x] 使用 ui-ux-pro-max 优化对话界面（渐变背景、粘性头部、优雅气泡、操作按钮）
  - [x] 优化方案库排版和滚动（smooth scroll、响应式网格、更好的视觉层次）
- [ ] 5.7 骨架屏加载状态（详情页）
- [ ] 5.8 搜索结果高亮显示
- [ ] 5.9 错误重试机制
- [ ] 5.10 返回按钮动画过渡

---

### 模块二：AI 方案编写（新功能）

#### [x] 阶段 6: 产品能力库（已完成）

**目标**：建立产品能力知识库，为 AI 方案生成提供数据基础

- [x] 6.1 数据结构设计
  - [x] ProductCapability 类型定义
  - [x] 数据库 schema 设计（使用 JSON 文件存储）

- [x] 6.2 后端 API
  - [x] `POST /api/capabilities` - 创建产品能力
  - [x] `GET /api/capabilities` - 获取所有产品能力
  - [x] `GET /api/capabilities/:id` - 获取单个产品能力
  - [x] `PUT /api/capabilities/:id` - 更新产品能力
  - [x] `DELETE /api/capabilities/:id` - 删除产品能力

- [x] 6.3 前端组件
  - [x] CapabilityLibrary.tsx - 产品能力库主页面
  - [x] CapabilityCard.tsx - 产品能力卡片
  - [x] CapabilityForm.tsx - 产品能力表单
  - [ ] CapabilityDetail.tsx - 产品能力详情（可选，卡片已足够）

- [x] 6.4 FastGPT 知识库集成
  - [x] 产品能力导入到 FastGPT（自动导入）
  - [x] 建立 collectionId 映射

#### [x] 阶段 7: AI 方案生成工作流（已完成）

**目标**：用户输入需求，AI 基于产品能力库生成方案

- [x] 7.1 后端 API
  - [x] `POST /api/drafts/generate` - AI 生成方案
  - [x] `GET /api/drafts` - 获取草稿方案列表
  - [x] `GET /api/drafts/:id` - 获取草稿方案详情
  - [x] `PUT /api/drafts/:id` - 更新草稿方案
  - [x] `DELETE /api/drafts/:id` - 删除草稿方案
  - [ ] `POST /api/drafts/:id/publish` - 发布为正式方案（可选）

- [x] 7.2 前端组件
  - [x] SolutionGenerator.tsx - 方案生成器（含需求输入表单）
  - [x] DraftList.tsx - 草稿方案列表
  - [x] SolutionEditor.tsx - 方案编辑器（Markdown 编辑 + 预览）
  - [ ] ProductSelector.tsx - 产品选择器（后期优化）
  - [ ] RequirementInput.tsx - 独立需求输入组件（已集成到 SolutionGenerator）

- [x] 7.3 FastGPT 集成
  - [x] 使用 FastGPT Chat API 生成方案
  - [x] 自定义 System Prompt（专业解决方案架构师）
  - [x] 结构化输出要求（标题、背景、架构、功能、技术、实施、价值）

#### [ ] 阶段 8: 方案编辑与导出（部分完成）

- [x] 8.1 Markdown 编辑器
  - [x] 实时预览
  - [ ] 语法高亮（后期优化）
  - [ ] 快捷操作（插入图片、表格等）（后期优化）

- [x] 8.2 导出功能
  - [x] 导出为 Markdown
  - [x] 导出为 TXT
  - [ ] 导出为 PDF（待实现）
  - [ ] 导出为 Word（待实现）

- [ ] 8.3 版本管理
  - [x] 基础版本号（自动递增）
  - [ ] 保存历史版本（待实现）
  - [ ] 版本对比（待实现）
  - [ ] 版本回退（待实现）

---

### 模块三：体验增强（可选）

#### [ ] 阶段 9: 高级功能
- [ ] 9.1 方案模板库
- [ ] 9.2 协作编辑
- [ ] 9.3 方案评论和审阅
- [ ] 9.4 数据统计和分析

---

## 关键问题

### 待解决问题
1. **用户会话隔离问题** (2026-01-23)
   - **现象**: 当前没有登录和用户模块，所有用户共享同一个对话历史
   - **影响**: 任何用户清空对话，所有人都会看到清空后的结果
   - **解决方案**: 游客会话隔离（最小实现）
     - 前端: 生成唯一匿名会话 ID (`anon_${timestamp}_${random}`)，存储在 localStorage
     - 后端: 按 sessionId 隔离聊天记录存储
     - API: 所有聊天请求带上 sessionId 参数
     - 后期可升级为可选登录系统
2. 产品能力库的数据持久化方案（JSON 文件 vs 数据库）

### 待评估问题
1. FastGPT Workflow 是否支持复杂的方案生成逻辑？
2. 是否需要引入数据库（SQLite/PostgreSQL）？
3. 方案编辑器使用哪个库（TipTap/CodeMirror/MDXEditor）？

### 技术决策
1. **文件上传策略**: 本地解析（mammoth/xlsx）+ MinerU 在线 API（PDF/DOC/PPT）+ FastGPT 文本导入
2. **MinerU 调用方式**: 使用在线 API（MINERU_BASE_URL + MINERU_API_TOKEN），非本地部署
3. **对话记录持久化**: 使用 localStorage
4. **产品能力存储**: 初期使用 JSON 文件，后期可迁移到数据库

---

## 已做出的决定

| 决策 | 原因 |
|-----|------|
| 使用 localStorage 持久化对话 | 简单，无需后端支持 |
| 使用 MinerU 在线 API | 避免本地部署复杂性 |
| 使用 react-markdown 渲染 | 支持 GitHub Flavored Markdown |
| 分离全局聊天和单方案对话 | 不同的使用场景，需要独立管理 |
| 产品能力库独立于方案库 | 概念清晰，便于管理和扩展 |
| 初期使用 JSON 文件存储 | 简单快速，无需数据库 |

---

## 遇到的错误

### 错误 1: collectionId 保存错误
- **问题**: FastGPT 返回 `{ collectionId: 'xxx', results: {...} }`，代码错误使用了 `collectionId.id`
- **修复**: 改为 `responseData?.collectionId`
- **位置**: server/src/index.js

### 错误 2: async 回调函数作用域问题
- **问题**: `response.data.on('data')` 回调函数中使用了 `await`，但函数不是 `async`
- **修复**: 将回调改为 `async (chunk) => { ... }`
- **位置**: server/src/index.js:601

### 错误 3: FastGPT 应用未发布
- **问题**: API 调用失败，返回应用不存在
- **解决**: FastGPT 应用需要发布后才能通过 API 调用

### 错误 4: SSE 流式 JSON 解析错误 (已修复)
- **问题**: `Unterminated string in JSON at position 1926`
- **原因**: SSE 流式传输时，JSON 对象被截断跨多个 chunk
- **修复**: 添加 `buffer` 缓冲不完整的 JSON 行
- **位置**: server/src/index.js:459 (单方案), 729 (全局聊天)

### 错误 5: 引用数据未返回 (已修复)
- **问题**: FastGPT API 未返回 `responseData`，日志显示 `Has responseData: false`
- **原因**: 使用了 `FASTGPT_APP_KEY`（简单对话应用，无知识库配置）
- **修复**: 切换到 `FASTGPT_WORKFLOW_KEY`（工作流应用，已配置知识库搜索）
- **位置**: server/.env, server/src/index.js:454, 745

---

## 状态
**当前在阶段 7** - AI 方案生成工作流（已完成，待测试）

### 当前任务
- ✅ 阶段 5 体验优化已完成
- ✅ 阶段 6 产品能力库已完成并测试通过
- ✅ 阶段 7 AI 方案生成工作流已完成（待用户测试）
- ⏳ 用户会话隔离问题已识别，待实现解决方案

### 下一步计划
1. **测试阶段 7 功能**
   - 测试方案生成流程
   - 验证 Markdown 编辑和导出功能
   - 收集用户反馈并优化
2. **阶段 8 优化**（可选）
   - PDF/Word 导出功能
   - 版本管理和对比
3. **用户会话隔离功能** (优先)
   - 前端: 创建 `useSessionId` hook 生成和管理匿名会话 ID
   - 后端: 修改聊天 API 按 sessionId 隔离存储
   - 测试: 验证多用户场景下对话数据隔离

---

## 文件结构

```
kb/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SolutionCard.tsx
│   │   │   ├── SolutionDetail.tsx
│   │   │   ├── DocumentPreview.tsx
│   │   │   ├── SolutionChat.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── UploadForm.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── contexts/
│   │   │   # 新增：AI 方案编写模块
│   │   │   ├── CapabilityLibrary.tsx      # 产品能力库
│   │   │   ├── CapabilityCard.tsx
│   │   │   ├── CapabilityForm.tsx
│   │   │   ├── CapabilityDetail.tsx
│   │   │   ├── SolutionGenerator.tsx      # 方案生成器
│   │   │   ├── RequirementInput.tsx
│   │   │   ├── ProductSelector.tsx
│   │   │   ├── SolutionEditor.tsx
│   │   │   └── DraftSolutionList.tsx
│   │   ├── types/
│   │   │   ├── solution.ts
│   │   │   └── capability.ts  # 新增
│   │   ├── locales/
│   │   └── App.tsx
│   └── package.json
├── server/
│   ├── src/
│   │   └── index.js
│   ├── data/
│   │   └── capabilities.json  # 新增：产品能力数据
│   ├── public/
│   │   └── images/
│   └── package.json
├── docs/
│   └── FASTGPT_DEPLOYMENT.md
├── memory.md
├── task_plan.md
└── notes.md
```

---

## 最后更新
**2026-01-23**:
- ✅ 阶段 7 AI 方案生成工作流已完成
  - 后端 API 实现：`POST /api/drafts/generate`, `GET /api/drafts`, `GET /api/drafts/:id`, `PUT /api/drafts/:id`, `DELETE /api/drafts/:id`
  - 前端组件开发完成：SolutionGenerator（需求输入表单）、DraftList（草稿列表）、SolutionEditor（Markdown 编辑器）
  - FastGPT 集成：自定义 System Prompt，结构化输出方案
  - 导航更新：Sidebar 新增 "AI 方案生成" 入口
  - 导出功能：Markdown 和 TXT 格式
  - 版本管理：基础版本号自动递增
- 更新 task_plan.md：标记阶段 7 完成，阶段 8 部分完成
- 待用户测试验证

**2026-01-23** (之前):
- ✅ 阶段 6 产品能力库已完成并测试通过
  - 数据结构设计完成（ProductCapability 类型）
  - 后端 CRUD API 实现（5 个端点）
  - 前端组件开发完成（CapabilityLibrary、CapabilityCard、CapabilityForm）
  - FastGPT 自动导入集成完成
  - 用户成功测试并保存第一个产品能力 "智能外呼系统"
- 更新当前状态为阶段 7（AI 方案生成工作流）

**2026-01-23** (更早之前):
- UI/UX 重大重构完成：导航重组 + 对话集成到主页 + 删除单方案对话功能
- 使用 ui-ux-pro-max 优化对话界面（渐变背景、粘性头部、优雅气泡、操作按钮）
- 修复对话标题翻译问题
- 优化方案库排版和滚动
- 发现新问题：用户会话隔离（所有用户共享同一个对话历史）

**2026-01-19**:
- 发现引用数据未返回的根本原因：使用了错误的 API Key
- 切换到 FASTGPT_WORKFLOW_KEY（工作流应用，有知识库配置）
- 添加调试日志显示正在使用的 key
- 更新错误记录：错误 5 - 引用数据未返回
- 更新当前状态为阶段 5.4，等待用户重启测试

**2026-01-18**:
- 实现可点击引用编号功能（全局聊天 + 单方案聊天）
- 添加单方案聊天调试日志
- 更新当前状态为阶段 5.4
