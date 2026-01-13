# 内部智能方案库开发计划

本计划旨在构建一个基于 FastGPT 的内部智能方案库，实现方案的卡片式管理、自动解析入库以及智能问答交互。

## 1. 技术架构选型

*   **前端**: React (Vite) + TailwindCSS + Shadcn/UI (或 Ant Design)
    *   用于构建现代化、响应式的卡片管理界面和对话窗口。
*   **后端/中间层**: Node.js (Express)
    *   处理文件上传、元数据存储以及与 FastGPT API 的安全通信。
*   **数据存储**:
    *   **元数据**: `lowdb` (本地 JSON 数据库) 存储方案卡片信息（标题、描述、标签、关联的 FastGPT Collection ID）。
    *   **知识库**: FastGPT (本地部署) 存储实际文档切片和向量数据。

## 2. FastGPT 调用详细设计方案

假设 FastGPT 地址为 `http://localhost:3000/api`。

### 2.1 核心配置
需在 `.env` 中配置：
*   `FASTGPT_BASE_URL`: API 基础地址
*   `FASTGPT_DATASET_ID`: 目标知识库 ID (需在 FastGPT 后台预先创建)
*   `FASTGPT_API_KEY`: 用于数据导入的 API Key
*   `FASTGPT_APP_KEY`: 用于对话的应用 API Key (绑定了上述知识库的应用)

### 2.2 业务流程与 API 映射

#### A. 方案上传与解析流程
1.  **用户操作**: 在前端填写方案信息（标题、描述），上传 PDF/Word 附件。
2.  **文件上传 (FastGPT)**:
    *   后端接收文件后，调用 FastGPT 文件上传接口。
    *   `POST /common/file/upload`
    *   响应: 获取 `fileId`。
3.  **创建集合/导入数据**:
    *   后端调用本地文件导入接口，将文件关联到指定知识库。
    *   `POST /core/dataset/collection/create/localFile`
    *   参数: `datasetId`, `fileId`, `trainingType: "chunk"`, `chunkSize: 512` 等。
    *   响应: 获取 `collectionId`。
4.  **保存卡片**:
    *   后端将 `collectionId` 与方案标题、描述存入本地 `db.json`。

#### B. 智能问答/搜索流程
1.  **用户操作**: 在前端对话框输入问题。
2.  **发起对话**:
    *   后端转发请求至 FastGPT Chat 接口。
    *   `POST /v1/chat/completions` (OpenAI 兼容接口)
    *   Header: `Authorization: Bearer <FASTGPT_APP_KEY>`
    *   Body: `{"messages": [{"role": "user", "content": "..."}], "stream": true}`

## 3. 实施步骤

### 第一阶段：项目初始化与后端搭建
1.  创建项目目录结构 (Monorepo 或前后端分离目录)。
2.  初始化 Express 后端，配置 `multer` 处理文件上传。
3.  编写 FastGPT API 适配器 (Service Layer)。

### 第二阶段：前端开发
1.  初始化 React 项目。
2.  开发 **"方案广场"** 页面：展示方案卡片 (Grid 布局)。
3.  开发 **"上传方案"** 模态框：表单 + 文件上传组件。
4.  开发 **"智能助手"** 组件：悬浮或侧边栏对话窗口。

### 第三阶段：联调与优化
1.  联调上传流程，确保文件在 FastGPT 中正确解析。
2.  联调对话流程，验证能否基于上传的方案回答问题。
3.  UI/UX 优化。

## 4. 目录结构规划
```
kb-project/
├── server/           # 后端服务
│   ├── src/
│   │   ├── services/ # FastGPT API 封装
│   │   ├── routes/   # 路由定义
│   │   └── db.json   # 本地轻量数据库
│   └── .env
├── client/           # 前端界面
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   └── vite.config.ts
└── README.md
```
