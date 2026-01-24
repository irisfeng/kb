# Notes: Internal Intelligent Solution Library

## 技术架构

### 前端组件树

```
App.tsx
├── Sidebar.tsx              # 侧边栏导航
├── SolutionCard.tsx         # 方案卡片（网格/列表模式）
├── SolutionDetail.tsx       # 方案详情页
│   ├── DocumentPreview.tsx  # 文档预览（支持 Markdown）
│   └── SolutionChat.tsx     # 单方案智能对话
├── ChatInterface.tsx        # 全局聊天界面
├── UploadForm.tsx           # 上传表单
└── Toast.tsx                # 通知组件
```

### 后端 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/solutions` | GET | 获取所有方案 |
| `/api/solutions/:id` | GET | 获取方案详情 |
| `/api/solutions/:id/preview` | GET | 获取文档预览（知识块列表） |
| `/api/solutions/:id/chat` | POST | 单方案智能对话（流式） |
| `/api/solutions/:id` | DELETE | 删除方案 |
| `/api/upload` | POST | 上传文件 |
| `/api/chat` | POST | 全局智能对话（流式） |
| `/images/*` | GET | 静态图片文件 |

---

## FastGPT 集成

### API 配置

```javascript
// .env
FASTGPT_API_KEY=sk-xxx
FASTGPT_BASE_URL=http://localhost:3000/api
```

### Chat Completions API

```javascript
// 端点
POST /v1/chat/completions

// 请求头
Authorization: Bearer {API_KEY}
Content-Type: application/json

// 请求体
{
  "model": "xxx",
  "messages": [
    { "role": "user", "content": "问题" }
  ],
  "stream": true,
  "detail": true  // 启用引用详情
}

// 响应（SSE 流式）
data: {"content": "..."}
data: {"citations": [...], "isComplete": true}
data: [DONE]
```

### 关键点

1. **应用发布**: FastGPT 应用必须发布后才能通过 API 调用
2. **知识库关联**: 需要在应用编辑器中关联知识库
3. **引用溯源**: 设置 `detail: true` 获取引用信息

---

## MinerU 文档解析

### API 配置

```bash
MINERU_BASE_URL=http://localhost:8887
MINERU_API_TOKEN=xxx
```

### 调用流程

```javascript
// 1. 提交解析任务
POST /api/parse
{
  "pdf_url": "文件URL或base64"
}

// 2. 获取结果（轮询或回调）
GET /api/result/{task_id}

// 3. 返回 ZIP 包，包含：
//    - markdown.md (文档内容，包含图片引用)
//    - images/ (提取的图片)
```

### 图片处理

```javascript
// 从 ZIP 提取图片
const zip = await JSZip.loadAsync(buffer);
const images = {};
for (const filename of Object.keys(zip.files)) {
  if (filename.startsWith('images/')) {
    const image = zip.files[filename];
    const content = await image.async('base64');
    images[filename] = `data:image/${ext};base64,${content}`;
  }
}
```

---

## 状态管理

### localStorage 使用

| 键名 | 用途 | 格式 |
|------|------|------|
| `global_chat_history` | 全局聊天记录 | `ChatMessage[]` |
| `solution_chat_{id}` | 单方案对话记录 | `ChatMessage[]` |
| `theme` | 主题模式 | `'light' \| 'dark'` |

### ChatMessage 类型

```typescript
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  citations?: EnhancedCitation[];  // 知识块引用
  relatedSolutions?: string[];     // 相关方案 ID
};
```

---

## UI/UX 设计规范

### 档案风格配色

| 元素 | 浅色模式 | 深色模式 |
|------|---------|---------|
| 背景 | `white` | `neutral-950` |
| 主色 | `amber-600` | `amber-500` |
| 边框 | `neutral-200` | `neutral-800` |
| 文字主色 | `neutral-900` | `white` |

### 字体

```css
font-family: 'Noto Serif SC', serif;  /* 标题 */
font-family: 'Noto Sans SC', sans-serif;  /* 正文 */
```

### 组件规范

- 圆角: `rounded-lg` (8px)
- 间距: 12px 基准
- 过渡: `duration-200`
- 阴影: `shadow-sm`

---

## 已知问题与解决方案

### 问题 1: 单方案聊天引用不显示 (调试中)

**现象**: 单方案对话中 AI 回复没有引用编号 [1], [2] 等

**可能原因**:
- FastGPT 单方案应用未关联知识库
- collectionId 不匹配
- FastGPT 未返回 responseData

**已添加调试日志**:
```javascript
[Debug SolutionChat] responseData found: {...}
[Debug SolutionChat] solution.collectionId: xxx
[Debug SolutionChat] quoteList: [...]
[Debug SolutionChat] citations found: N
```

**待解决**: 用户测试并提供后端日志输出

**位置**: `server/src/index.js:458-527`

### 问题 2: 全局问答引用显示 (已解决)

**修复**: 更新 `ChatInterface.tsx` 实现可点击引用编号功能
- `renderContentWithCitations` 函数解析 [1], [2] 编号
- 点击展开引用列表 + 滚动高亮对应引用

---

## 可点击引用编号功能

### 实现位置

| 文件 | 功能 |
|------|------|
| `SolutionChat.tsx` | 单方案对话可点击引用 |
| `ChatInterface.tsx` | 全局对话可点击引用 |
| `server/src/index.js:458-527` | 单方案聊天调试日志 |

### 核心函数

```typescript
// renderContentWithCitations
// 解析 AI 回复中的 [1], [2] 编号，渲染为可点击按钮

const renderContentWithCitations = (
  content: string,
  citations: any[] | undefined,
  onCitationClick: (index: number) => void
) => {
  // Regex: /\[(\d+)\]/g
  // 匹配 [1], [2], [3] 等引用编号
  // 返回带可点击按钮的 React 节点
}
```

### 状态管理

```typescript
// expandedCitations: Set<number>
// 跟踪哪些消息的引用列表已展开

// highlightedCitation: number | null
// 跟踪当前高亮的引用（用于滚动定位）

// citationRefs: useRef<(HTMLDivElement | null)[]>
// 引用卡片的 DOM 引用数组
```

### 交互流程

```
1. 用户点击 [1] 按钮
   ↓
2. handleCitationClick(0, messageIndex)
   - 展开引用列表 (setExpandedCitations)
   - 设置高亮索引 (setHighlightedCitation)
   ↓
3. useEffect 检测 highlightedCitation 变化
   - 滚动到对应引用卡片
   - 2秒后自动清除高亮
   ↓
4. 引用卡片显示高亮边框
```

### 样式规范

| 元素 | 样式 |
|------|------|
| 引用按钮 | `w-5 h-5 text-xs text-amber-600 bg-amber-50 rounded` |
| 高亮边框 | `border-amber-500 ring-1 ring-amber-500` |
| 引用卡片 | `p-3 bg-neutral-50 rounded-lg border` |

---

## 开发工作流

### 新功能开发流程

1. 在 `task_plan.md` 中更新阶段状态
2. 实现功能（前端/后端）
3. 测试验证
4. 更新 `memory.md` 记录改动
5. 更新 `task_plan.md` 标记完成

### 错误处理流程

1. 在 `task_plan.md` 的 "遇到的错误" 部分记录
2. 描述问题现象和原因
3. 记录解决方案
4. 更新相关代码

---

## 参考资料

### FastGPT 文档
- 部署指南: `docs/FASTGPT_DEPLOYMENT.md`
- API 文档: http://localhost:3000/docs

### MinerU 文档
- GitHub: https://github.com/opendatalab/MinerU

### React 库
- react-markdown: https://github.com/remarkjs/react-markdown
- lucide-react: https://lucide.dev/
