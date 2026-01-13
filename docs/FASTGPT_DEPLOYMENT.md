# FastGPT 本地 Docker 部署指南

本文档描述如何使用 Docker 部署 FastGPT，并配置本项目与 FastGPT 的集成。

## 1. 前置要求

- Docker 24.0+
- Docker Compose 2.20+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

## 2. FastGPT Docker 部署

### 2.1 克隆 FastGPT 仓库

```bash
git clone https://github.com/labring/FastGPT.git
cd FastGPT
```

### 2.2 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d
```

这将启动以下服务：
- **FastGPT**: 主应用 (http://localhost:3000)
- **MongoDB**: 数据库
- **Redis**: 缓存
- **Vector Database**: 向量数据库 (可选：Milvus/PGVector)

### 2.3 初始化设置

1. 访问 http://localhost:3000
2. 首次访问会提示创建管理员账号
3. 登录后进入系统设置

## 3. 知识库配置

### 3.1 创建知识库

1. 进入 **知识库** 页面
2. 点击 **创建知识库**
3. 填写信息：
   - **名称**: `SolutionKB`
   - **描述**: 部门解决方案知识库
   - **类型**: 通用知识库

4. 记录 **知识库 ID**（例如：`6959f3233911b5db807d021a`）

### 3.2 配置索引模型

在知识库设置中配置：

| 配置项 | 推荐值 |
|--------|--------|
| **索引模型** | `bge-m3 (Pro)` |
| **分块上限** | `8000` |

### 3.3 配置 AI 模型

在知识库设置中配置：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **文本理解模型** | `Qwen3-32B` | 用于文本理解和分块 |
| **图片理解模型** | `GLM-4.6V` | 用于图片理解和 OCR |

## 4. 创建应用（API 密钥）

### 4.1 创建对话应用

1. 进入 **应用** 页面
2. 点击 **创建应用** → **简单对话**
3. 填写信息：
   - **应用名称**: `Solution Chat`
   - **关联知识库**: 选择 `SolutionKB`

4. 进入应用编辑器 → **API 访问**
5. 点击 **创建 API Key**

### 4.2 获取 API 密钥

在 **API 访问** 页面，创建两个 API Key：

1. **数据导入 Key** (用于文件上传和数据管理)
   - 格式：`fastgpt-xxxxxxxxxxxx`
   - 用途：调用 `/core/dataset/*` 接口

2. **对话应用 Key** (用于智能问答)
   - 格式：`fastgpt-xxxxxxxxxxxx`
   - 用途：调用 `/v1/chat/completions` 接口

## 5. 本项目配置

### 5.1 创建 `.env` 文件

在 `server/` 目录下创建 `.env` 文件：

```env
# 服务端口
PORT=3001

# FastGPT 配置
FASTGPT_BASE_URL=http://localhost:3000/api
FASTGPT_DATASET_ID=6959f3233911b5db807d021a
FASTGPT_API_KEY=fastgpt-yu7a6QMPwIYjASlliOQ7J1SyG6LnkqsC2emIbeNUSkislIUm8omlRMEtIqxedq
FASTGPT_APP_KEY=fastgpt-mQhln4faPd0PDg9LnoT7Vj6Jty3W3cvkFe44dU6Zay1LvgG45GYqyivGKsa8

# MinerU API 配置（可选，用于文档解析）
MINERU_API_TOKEN=your_mineru_token_here
MINERU_BASE_URL=https://mineru.net/api/v4
```

### 5.2 配置说明

| 环境变量 | 说明 | 获取方式 |
|----------|------|----------|
| `FASTGPT_BASE_URL` | FastGPT API 地址 | 本地部署默认为 `http://localhost:3000/api` |
| `FASTGPT_DATASET_ID` | 目标知识库 ID | 知识库设置页面查看 |
| `FASTGPT_API_KEY` | 数据导入 API Key | API 访问页面创建 |
| `FASTGPT_APP_KEY` | 对话应用 API Key | API 访问页面创建 |
| `MINERU_API_TOKEN` | MinerU 解析 Token | [MinerU 官网](https://mineru.net) 申请 |

## 6. 常用 API 端点

### 6.1 数据导入

```bash
# 文本导入
POST http://localhost:3000/api/core/dataset/collection/create/text
Authorization: Bearer {FASTGPT_API_KEY}
Content-Type: application/json

{
  "datasetId": "6959f3233911b5db807d021a",
  "name": "文档名称",
  "text": "文档内容",
  "trainingType": "chunk",
  "chunkSize": 512
}
```

### 6.2 智能对话

```bash
# 对话接口
POST http://localhost:3000/api/v1/chat/completions
Authorization: Bearer {FASTGPT_APP_KEY}
Content-Type: application/json

{
  "chatId": "unique-chat-id",
  "stream": false,
  "messages": [
    {"role": "user", "content": "你的问题"}
  ]
}
```

### 6.3 知识块查询

```bash
# 获取知识库数据列表
POST http://localhost:3000/api/core/dataset/data/v2/list
Authorization: Bearer {FASTGPT_API_KEY}
Content-Type: application/json

{
  "collectionId": "collection-id",
  "offset": 0,
  "pageSize": 100
}
```

## 7. 验证配置

### 7.1 测试 FastGPT 连接

```bash
curl http://localhost:3000/api/health
```

### 7.2 测试本项目

```bash
# 启动后端
cd server
npm install
npm start

# 启动前端
cd client
npm install
npm run dev
```

访问：http://localhost:5173

## 8. 常见问题

### Q1: Docker 启动失败

检查端口占用：
```bash
netstat -ano | findstr :3000
```

### Q2: API 调用 401 错误

检查 `.env` 中的 API Key 是否正确配置。

### Q3: 知识库导入失败

检查：
1. 知识库 ID 是否正确
2. API Key 是否有数据导入权限
3. 文件格式是否支持

### Q4: 图片无法显示

确保已配置图片理解模型（GLM-4.6V），并检查 MinerU API Token。

## 9. 生产环境部署建议

### 9.1 环境变量

生产环境请使用环境变量或密钥管理服务：

```bash
# Linux/Mac
export FASTGPT_API_KEY="your-key"

# Windows PowerShell
$env:FASTGPT_API_KEY="your-key"
```

### 9.2 反向代理

使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 9.3 数据备份

定期备份 MongoDB 数据：

```bash
docker exec fastgpt-mongo mongodump --archive=/backup/$(date +%Y%m%d).gz
```

---

**最后更新**: 2026-01-13
**适用版本**: FastGPT v4.8+
