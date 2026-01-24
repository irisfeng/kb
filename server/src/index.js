import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSONFilePreset } from 'lowdb/node';
import 'dotenv/config';

import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');
const xlsx = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: 'uploads/' });

/**
 * Upload image to FastGPT file system
 */
async function uploadImageToFastGPT(imageBuffer, fileName) {
  try {
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer]), fileName);

    const response = await axios.post(
      `${process.env.FASTGPT_BASE_URL}/core/dataset/collection/create/file`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.warn('[FastGPT] Image upload failed:', error.message);
    return null;
  }
}

/**
 * 修复中文文件名乱码问题
 * 当文件名被错误地用 Latin-1 解码时，需要重新用 UTF-8 解码
 */
function fixFileNameEncoding(fileName) {
  // 方法1: 检测是否包含中文 UTF-8 被错误解析为 Latin-1 的特征字符
  // UTF-8 中文字符被误解析为 Latin-1 后，会出现类似 æ¹°è¹₂ 这样的模式
  const hasGarbledChars = /[æçè][°²³´µ¶·¸¹º»¼½¾¿]/.test(fileName) ||
    fileName.includes('æ') || fileName.includes('ç') || fileName.includes('è');

  if (hasGarbledChars) {
    try {
      // 将错误解析的 Latin-1 字符串转换回 bytes，然后用 UTF-8 解码
      const buffer = Buffer.from(fileName, 'latin1');
      const decoded = buffer.toString('utf8');
      console.log(`[FileName Encoding Fix] "${fileName}" -> "${decoded}"`);
      return decoded;
    } catch (e) {
      console.log(`[FileName Encoding Fix] Failed: ${e.message}`);
    }
  }

  // 方法2: 检测是否包含正常中文，如果没有中文但文件名看起来不像英文，可能是乱码
  const hasChinese = /[\u4e00-\u9fa5]/.test(fileName);
  const hasControlChars = /[\x00-\x1F\x7F-\x9F]/.test(fileName);

  if (!hasChinese && fileName.length > 3 && hasControlChars) {
    // 可能是其他编码问题，尝试修复
    try {
      const buffer = Buffer.from(fileName, 'latin1');
      const decoded = buffer.toString('utf8');
      if (/[\u4e00-\u9fa5]/.test(decoded)) {
        console.log(`[FileName Encoding Fix 2] "${fileName}" -> "${decoded}"`);
        return decoded;
      }
    } catch (e) {
      // ignore
    }
  }

  return fileName;
}

const app = express();
app.use(cors());
app.use(express.json());

// Static files serving (for images and original files)
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/files', express.static(path.join(__dirname, '../public/files')));

// Database setup
const defaultData = { solutions: [] };
const db = await JSONFilePreset(path.join(__dirname, 'db.json'), defaultData);

// Capabilities database setup
const defaultCapabilities = { capabilities: [] };
const capabilitiesDb = await JSONFilePreset(path.join(__dirname, '../data/capabilities.json'), defaultCapabilities);

// Draft solutions database setup
const defaultDrafts = { drafts: [] };
const draftsDb = await JSONFilePreset(path.join(__dirname, '../data/drafts.json'), defaultDrafts);

// ==================== Markdown Cleaning Utility ====================

/**
 * 清理 MinerU 解析的 Markdown
 * 移除解析痕迹，优化阅读体验
 */
function cleanMarkdown(markdown) {
  if (!markdown) return '';

  let cleaned = markdown;

  // 1. 清理 HTML 表格 - 简单转换为文本（复杂表格保持 HTML，前端需要支持）
  // 移除 table 标签，保留单元格内容
  cleaned = cleaned.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
    // 提取所有单元格内容
    const cells = content.match(/<td[^>]*>(.*?)<\/td>/gi) || [];
    const cellTexts = cells.map(cell => cell.replace(/<td[^>]*>/gi, '').replace(/<\/td>/gi, '').trim());
    // 用空格连接，简单处理
    return cellTexts.join(' | ');
  });

  // 2. 清理 LaTeX 数学公式（简化显示）
  cleaned = cleaned.replace(/\$[^$]+\$/g, (match) => {
    // 提取公式中的文本内容，移除 LaTeX 命令
    return match
      .replace(/\\[a-zA-Z]+/g, '') // 移除 LaTeX 命令
      .replace(/[{}^_]/g, '')      // 移除特殊字符
      .replace(/\s+/g, ' ')         // 合并空格
      .trim();
  });

  // 3. 清理 HTML 实体和特殊符号
  cleaned = cleaned
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/》/g, '')
    .replace(/《/g, '');

  // 4. 移除多余的 --- 分隔符
  cleaned = cleaned
    .replace(/\n-{3,}\n\n-{3,}\n/g, '\n\n')
    .replace(/\n-{3,}\n/g, '\n\n')
    .replace(/^---\n\n/gm, '');

  // 5. 限制空行数量（最多保留 2 个连续空行）
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  // 6. 移除 MinerU 特定标记
  cleaned = cleaned
    .replace(/\\*Page \d+\\*\n?/gi, '')
    .replace(/\\*第\s*\d+\s*页\\*\n?/gi, '');

  // 7. 清理图片引用前后的多余空行
  cleaned = cleaned
    .replace(/\n+(!\[)/g, '\n\n$1')
    .replace(/(\)\])\n+/g, '$1\n\n');

  // 8. 移除标题前后的多余空行
  cleaned = cleaned.replace(/\n+^(#{1,6}\s)/gm, '\n\n$1');

  // 9. 移除首尾空白
  cleaned = cleaned.trim();

  return cleaned;
}

// ==================== MinerU Online API Functions ====================

/**
 * 申请 MinerU 文件上传链接
 */
async function applyMinerUUploadUrl(fileName, dataId) {
  const response = await axios.post(
    `${process.env.MINERU_BASE_URL}/file-urls/batch`,
    {
      files: [{ name: fileName, data_id: dataId }],
      model_version: 'pipeline'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MINERU_API_TOKEN}`
      }
    }
  );

  if (response.data.code !== 0) {
    throw new Error(`MinerU upload URL failed: ${response.data.msg}`);
  }

  return {
    batchId: response.data.data.batch_id,
    uploadUrl: response.data.data.file_urls[0]
  };
}

/**
 * 上传文件到 MinerU
 * 注意：不要设置 Content-Type 请求头（根据官方文档）
 */
async function uploadFileToMinerU(filePath, uploadUrl) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;

  // 使用原生 https 模块
  const https = await import('https');
  const url = new URL(uploadUrl);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        // 官方文档明确说明：上传文件时，无须设置 Content-Type 请求头
        'Content-Length': fileSize
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          reject(new Error(`MinerU file upload failed: ${res.statusCode} - ${body}`));
        });
      }
    });

    req.on('error', (error) => {
      reject(new Error(`MinerU file upload error: ${error.message}`));
    });

    req.write(fileBuffer);
    req.end();
  });
}

/**
 * 轮询查询 MinerU 解析结果
 */
async function pollMinerUResult(batchId, maxAttempts = 60, interval = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios.get(
      `${process.env.MINERU_BASE_URL}/extract-results/batch/${batchId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MINERU_API_TOKEN}`
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`MinerU result query failed: ${response.data.msg}`);
    }

    const result = response.data.data.extract_result[0];
    console.log(`MinerU parsing progress: ${result.state}${result.extract_progress ? ` (${result.extract_progress.extracted_pages || 0}/${result.extract_progress.total_pages || 0} pages)` : ''}`);

    if (result.state === 'done') {
      // 下载解析结果 ZIP
      const zipUrl = result.full_zip_url;
      const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer' });

      // 保存到临时文件
      const tempZipPath = path.join(__dirname, `../uploads/temp_${batchId}.zip`);
      fs.writeFileSync(tempZipPath, zipResponse.data);

      // 解压 ZIP 并读取 Markdown 内容
      const zip = new AdmZip(tempZipPath);
      const zipEntries = zip.getEntries();

      // 创建图片存储目录（使用 batchId 作为唯一标识）
      const imagesDir = path.join(__dirname, `../public/images/${batchId}`);
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // 提取并保存图片
      const savedImages = [];
      for (const entry of zipEntries) {
        // 保存图片文件
        if (entry.entryName.startsWith('images/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.entryName)) {
          const imageName = path.basename(entry.entryName);
          const imagePath = path.join(imagesDir, imageName);
          zip.extractEntryTo(entry, path.dirname(imagePath), false);
          savedImages.push({ originalPath: entry.entryName, imageName });
          console.log(`[MinerU] Saved image: ${imageName}`);
        }
      }

      // 查找 markdown 文件（通常叫 auto.md 或同名 .md）
      let markdownContent = '';
      for (const entry of zipEntries) {
        if (entry.entryName.endsWith('.md')) {
          markdownContent = zip.readAsText(entry);
          break;
        }
      }

      // 删除临时 ZIP 文件
      fs.unlinkSync(tempZipPath);

      if (!markdownContent) {
        throw new Error('No markdown file found in ZIP');
      }

      // ✅ 清理 markdown - 移除解析痕迹，优化阅读体验
      const cleanedMarkdown = cleanMarkdown(markdownContent);
      console.log(`[MinerU] Cleaned markdown: ${markdownContent.length} → ${cleanedMarkdown.length} chars`);

      // 创建带本地路径的 Markdown（用于前端显示）- 使用清理后的内容
      const localMarkdown = cleanedMarkdown.replace(
        /!\[([^\]]*)\]\((images\/[^)]+|[^)]+\.(png|jpg|jpeg|gif|webp))\)/gi,
        (match, alt, imagePath) => {
          const imageName = path.basename(imagePath);
          // 使用 /images/{batchId}/{imageName} 格式
          return `![${alt}](/images/${batchId}/${imageName})`;
        }
      );

      // 创建带 Base64 图片的 Markdown（用于发送到 FastGPT）
      // 图片直接嵌入在 markdown 中，FastGPT 不需要额外下载
      let convertedImages = 0;
      const base64Markdown = cleanedMarkdown.replace(
        /!\[([^\]]*)\]\((images\/[^)]+|[^)]+\.(png|jpg|jpeg|gif|webp))\)/gi,
        (match, alt, imagePath) => {
          const imageName = path.basename(imagePath);
          const imageEntry = zipEntries.find(e => e.entryName.endsWith(imageName) || e.entryName === `images/${imageName}`);
          if (imageEntry) {
            // 将图片转换为 base64 并嵌入 markdown
            const imageBuffer = imageEntry.getData();
            const ext = imageName.toLowerCase().split('.').pop();
            const mimeType = ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : ext === 'webp' ? 'webp' : 'jpeg';
            const base64 = imageBuffer.toString('base64');
            convertedImages++;
            console.log(`[MinerU] Converted image to base64: ${imageName} (${imageBuffer.length} bytes -> ${base64.length} chars)`);
            return `![${alt}](data:image/${mimeType};base64,${base64})`;
          }
          return match;
        }
      );
      console.log(`[MinerU] Base64 markdown: ${convertedImages} images converted, total length: ${base64Markdown.length}`);

      console.log(`MinerU parsing completed! Markdown length: ${localMarkdown.length}, Images saved: ${savedImages.length}`);
      return {
        markdown: localMarkdown,
        base64Markdown: base64Markdown,
        batchId: batchId,
        imageCount: savedImages.length,
        markdownUrl: zipUrl
      };
    } else if (result.state === 'failed') {
      throw new Error(`MinerU parsing failed: ${result.err_msg}`);
    }

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('MinerU parsing timeout');
}

/**
 * 使用 MinerU 在线 API 解析文件
 * 支持: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG, JPEG, HTML
 */
async function parseWithMinerU(filePath, fileName) {
  const dataId = `file_${Date.now()}`;

  // 1. 申请上传链接
  console.log('Applying MinerU upload URL...');
  const { batchId, uploadUrl } = await applyMinerUUploadUrl(fileName, dataId);

  // 2. 上传文件
  console.log('Uploading file to MinerU...');
  await uploadFileToMinerU(filePath, uploadUrl);

  // 3. 轮询查询结果
  console.log('Polling MinerU result...');
  const result = await pollMinerUResult(batchId);

  // 4. 返回完整结果（包含本地 markdown 和 base64 markdown）
  return {
    text: result.base64Markdown || result.markdown,  // 发送给 FastGPT 的内容（base64 图片）
    localMarkdown: result.markdown,  // 本地路径版本的 markdown（用于预览）
    base64Markdown: result.base64Markdown,  // base64 版本的 markdown
    batchId: result.batchId,
    imageCount: result.imageCount,
    source: 'mineru-api'
  };
}

// ==================== Routes ====================

// Get all solutions
app.get('/api/solutions', async (req, res) => {
  await db.read();
  res.json(db.data.solutions);
});

// Get solution detail with FastGPT data
app.get('/api/solutions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.read();
    const solution = db.data.solutions.find(s => s.id === id);

    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    // Get collection detail from FastGPT
    let fastgptDetail = null;
    if (solution.collectionId) {
      try {
        const detailRes = await axios.get(
          `${process.env.FASTGPT_BASE_URL}/core/dataset/collection/detail?id=${solution.collectionId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`
            }
          }
        );
        fastgptDetail = detailRes.data.data;
      } catch (fastgptError) {
        // More detailed error logging
        if (fastgptError.response) {
          console.warn(`[FastGPT] Collection detail failed (${fastgptError.response.status}):`, fastgptError.response.data?.message || fastgptError.message);
        } else {
          console.warn('[FastGPT] Collection detail failed:', fastgptError.message);
        }
        // Don't fail the entire request - just return solution without fastgptDetail
      }
    }

    res.json({
      ...solution,
      fastgptDetail
    });
  } catch (error) {
    console.error('Get solution detail error:', error.message);
    res.status(500).json({ error: 'Failed to fetch solution detail' });
  }
});

// Get solution preview (raw text from FastGPT)
app.get('/api/solutions/:id/preview', async (req, res) => {
  const { id } = req.params;

  try {
    await db.read();
    const solution = db.data.solutions.find(s => s.id === id);

    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    // 优先使用本地保存的 markdown（包含图片）
    if (solution.localMarkdown) {
      console.log('[Preview] Using local markdown with images');
      return res.json({
        text: solution.localMarkdown,
        chunks: [],
        chunkCount: 0,
        source: 'local',
        hasImages: true,
        imageCount: solution.imageCount || 0
      });
    }

    if (!solution.collectionId) {
      return res.json({ text: '', chunks: [] });
    }

    // Get data chunks from FastGPT
    console.log('[Preview] Fetching chunks for collectionId:', solution.collectionId);
    const dataList = await axios.post(
      `${process.env.FASTGPT_BASE_URL}/core/dataset/data/v2/list`,
      {
        collectionId: solution.collectionId,
        offset: 0,
        pageSize: 1000,
        searchText: ''
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[Preview] FastGPT response status:', dataList.status);
    const chunks = dataList.data.data?.list || [];
    console.log('[Preview] Chunks count:', chunks.length);
    // 打印第一个知识块的内容（用于调试）
    if (chunks.length > 0) {
      console.log('[Preview] First chunk preview:', chunks[0].q?.substring(0, 200));
      console.log('[Preview] First chunk has image?', chunks[0].q?.includes('data:image') || chunks[0].q?.includes('/images/'));
    }
    const fullText = chunks.map(chunk => chunk.q).join('\n\n---\n\n');

    res.json({
      text: fullText,
      chunks: chunks,
      chunkCount: chunks.length
    });
  } catch (error) {
    console.error('Preview error:', error.message);
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
});

// Solution-specific chat - Streaming support
app.post('/api/solutions/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { messages } = req.body;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await db.read();
    const solution = db.data.solutions.find(s => s.id === id);

    if (!solution) {
      res.write(`data: ${JSON.stringify({ error: 'Solution not found' })}\n\n`);
      return res.end();
    }

    // Use system prompt to limit scope to current solution
    // FastGPT 社区版不支持按 collectionId/tags 限定搜索范围，只能通过 Prompt 引导 AI
    const systemPrompt = `你是《${solution.title}》的专业助手。

【当前方案 - 严格限定】
- 方案标题：${solution.title}
- 方案描述：${solution.description || '无'}
- 文件名：${solution.fileName}
- Collection ID: ${solution.collectionId}

【核心约束 - 必须遵守】
你只能使用来自"文件名：${solution.fileName}"的内容回答问题。

【识别与过滤规则】
知识库会返回多个来源的引用，你必须：
1. 严格检查每个引用的来源文件名（sourceName 字段）
2. 只使用 sourceName 为 "${solution.fileName}" 的引用
3. 完全忽略所有其他来源的引用，无论它们多么相关
4. 如果没有来自 "${solution.fileName}" 的引用，明确告知："《${solution.title}》方案中没有找到相关内容"

【回答格式】
- 基于匹配的引用内容回答
- 如果知识库中有来自其他文件的引用，不要提及它们
- 如果用户问题与当前方案无关，直接说明范围限制

【禁止行为】
- ❌ 不要使用其他方案的内容
- ❌ 不要说"根据其他方案..."或"从相关资料中..."
- ❌ 不要编造或推测信息

请严格遵守这些约束。`;

    console.log('[SolutionChat] Using prompt-based filtering for solution:', solution.title);
    console.log('[SolutionChat] Collection ID:', solution.collectionId);
    console.log('[SolutionChat] Sending variables:', JSON.stringify({ collectionId: solution.collectionId }));

    // Track the last sent textOutput to avoid sending partial/incomplete content
    let lastSentTextOutputLength = 0;

    const requestBody = {
      chatId: 'solution-kb-chat',
      stream: true,
      detail: true,
      // Pass collectionId as variable to workflow (if configured)
      variables: {
        collectionId: solution.collectionId
      },
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    };
    console.log('[SolutionChat] Request body keys:', Object.keys(requestBody).join(', '));
    console.log('[SolutionChat] Request variables:', JSON.stringify(requestBody.variables));

    const response = await axios.post(
      `${process.env.FASTGPT_BASE_URL}/v1/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FASTGPT_WORKFLOW_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    // Handle streaming response
    let buffer = '';  // Buffer for incomplete JSON
    let allNodeResponses = [];  // Collect all node responses for citations

    response.data.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';  // Keep the last incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            let content = parsed.choices?.[0]?.delta?.content || '';

            // Debug: log all data
            console.log('[Debug SolutionChat] Parsed data keys:', Object.keys(parsed));

            // Extract content from workflow AI chat node (responseData)
            if (parsed.responseData && Array.isArray(parsed.responseData)) {
              console.log('[Debug SolutionChat] responseData array length:', parsed.responseData.length);
              for (const nodeData of parsed.responseData) {
                console.log('[Debug SolutionChat] Node - moduleType:', nodeData.moduleType, 'keys:', Object.keys(nodeData).join(','));
                // AI chat node response - extract textOutput
                if (nodeData.moduleType === 'chatNode') {
                  if (nodeData.textOutput) {
                    console.log('[Debug SolutionChat] Found AI chat textOutput, length:', nodeData.textOutput.length, 'lastSent:', lastSentTextOutputLength);
                    // Only send content if textOutput has grown (avoid sending partial content)
                    if (nodeData.textOutput.length > lastSentTextOutputLength) {
                      // Send only the new portion
                      const newContent = nodeData.textOutput.substring(lastSentTextOutputLength);
                      console.log('[Debug SolutionChat] Sending new content, length:', newContent.length);
                      content = newContent;
                      lastSentTextOutputLength = nodeData.textOutput.length;
                    } else {
                      content = ''; // No new content to send
                      console.log('[Debug SolutionChat] No new content, textOutput not grown yet');
                    }
                  } else {
                    console.log('[Debug SolutionChat] Chat node found but NO textOutput. Available keys:', Object.keys(nodeData));
                  }
                }
                // Collect all node responses for citation extraction later
                allNodeResponses.push(nodeData);
              }
            }

            // Check for flowNodeResponse event (another FastGPT format)
            if (parsed.nodeResponse) {
              console.log('[Debug SolutionChat] flowNodeResponse found, moduleType:', parsed.nodeResponse.moduleType);
              allNodeResponses.push(parsed.nodeResponse);
            }

            // Check if the response itself is an array (workflow responses format)
            if (Array.isArray(parsed)) {
              console.log('[Debug SolutionChat] Received array format data, length:', parsed.length);
              allNodeResponses.push(...parsed);
            }

            // Process image paths in content if batchId exists
            if (solution.batchId && content) {
              // Match ![](xxx) patterns and convert to /images/{batchId}/xxx.jpg
              content = content.replace(
                /!\[\]\(([^)]+)\)/g,
                (match, imagePath) => {
                  // If already a full path, don't modify
                  if (imagePath.startsWith('/images/') || imagePath.startsWith('http')) {
                    return match;
                  }
                  // Otherwise, convert to local image path
                  return `![](/images/${solution.batchId}/${imagePath}.jpg)`;
                }
              );
            }

            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            console.log('[Debug SolutionChat] JSON parse error:', e.message, 'data:', data.substring(0, 100));
          }
        }
      }
    });

    response.data.on('end', () => {
      // Extract citations from collected node responses
      const citations = [];

      console.log('[Debug SolutionChat] solution.collectionId:', solution.collectionId);

      for (const nodeResponse of allNodeResponses) {
        // Handle different node response formats
        if (nodeResponse.quoteList && Array.isArray(nodeResponse.quoteList)) {
          // Knowledge base search node format
          console.log('[Debug SolutionChat] Found quoteList with', nodeResponse.quoteList.length, 'items');
          for (const quote of nodeResponse.quoteList) {
            console.log('[Debug SolutionChat] Quote collectionId:', quote.collectionId, '| Match:', quote.collectionId === solution.collectionId);
            if (quote.collectionId === solution.collectionId) {
              citations.push({
                id: quote.id,
                q: quote.q,
                a: quote.a,
                score: quote.score
              });
            }
          }
        }
      }

      console.log('[Debug SolutionChat] Total citations found:', citations.length, 'out of', allNodeResponses.filter(r => r.quoteList).reduce((sum, r) => sum + r.quoteList?.length || 0, 0));

      if (citations.length > 0) {
        const citationData = {
          citations,
          isComplete: true
        };
        console.log('[Debug SolutionChat] Sending citation data, citations count:', citations.length);
        res.write(`data: ${JSON.stringify(citationData)}\n\n`);
        // Flush to ensure data is sent immediately
        if (res.flush) res.flush();
      }

      res.write('data: [DONE]\n\n');
      if (res.flush) res.flush();
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Solution chat error:', error.message);
    res.write(`data: ${JSON.stringify({ error: 'Chat failed' })}\n\n`);
    res.end();
  }
});

// Delete a solution
app.delete('/api/solutions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.read();
    const solution = db.data.solutions.find(s => s.id === id);

    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    // Delete from FastGPT if collectionId exists
    if (solution.collectionId && solution.collectionId !== 'local-parsed') {
      let deleted = false;
      const errors = [];

      // Try Method 1: /api/core/dataset/collection/deleteById
      try {
        console.log(`[Delete] Method 1: POST /api/core/dataset/collection/deleteById`);
        const res1 = await axios.post(
          `${process.env.FASTGPT_BASE_URL}/api/core/dataset/collection/deleteById`,
          {
            collectionId: solution.collectionId
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`[Delete] Method 1 succeeded:`, res1.status);
        deleted = true;
      } catch (err) {
        errors.push(`Method 1 (/api/...): ${err.message}`);
        if (err.response) {
          errors.push(`  Status: ${err.response.status}`);
          if (err.response.data) {
            errors.push(`  Data: ${JSON.stringify(err.response.data).substring(0, 300)}`);
          }
        }
      }

      // Try Method 2: /v1/dataset/collection/delete
      if (!deleted) {
        try {
          console.log(`[Delete] Method 2: POST /v1/dataset/collection/delete`);
          const res2 = await axios.post(
            `${process.env.FASTGPT_BASE_URL}/v1/dataset/collection/delete`,
            {
              collectionId: solution.collectionId,
              datasetId: process.env.FASTGPT_DATASET_ID
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`[Delete] Method 2 succeeded:`, res2.status);
          deleted = true;
        } catch (err) {
          errors.push(`Method 2 (/v1/dataset/...): ${err.message}`);
          if (err.response) {
            errors.push(`  Status: ${err.response.status}`);
            if (err.response.data) {
              errors.push(`  Data: ${JSON.stringify(err.response.data).substring(0, 300)}`);
            }
          }
        }
      }

      // Try Method 3: Get collection detail first, then delete
      if (!deleted) {
        try {
          console.log(`[Delete] Method 3: GET /api/core/dataset/collection/detail`);
          const detailRes = await axios.get(
            `${process.env.FASTGPT_BASE_URL}/api/core/dataset/collection/detail`,
            {
              params: {
                collectionId: solution.collectionId,
                datasetId: process.env.FASTGPT_DATASET_ID
              },
              headers: { 'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}` }
            }
          );

          console.log(`[Delete] Got collection detail:`, detailRes.data?.data?.name);

          // Now try to delete it using same API
          const deleteRes = await axios.post(
            `${process.env.FASTGPT_BASE_URL}/api/core/dataset/collection/deleteById`,
            {
              collectionId: solution.collectionId
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`[Delete] Method 3 succeeded:`, deleteRes.status);
          deleted = true;
        } catch (err) {
          errors.push(`Method 3 (detail then delete): ${err.message}`);
          if (err.response) {
            errors.push(`  Status: ${err.response.status}`);
          }
        }
      }

      if (deleted) {
        console.log(`[Delete] Successfully deleted collection ${solution.collectionId} from FastGPT`);
      } else {
        console.warn(`[Delete] All methods failed for collection ${solution.collectionId}:`);
        errors.forEach(e => console.warn(`  - ${e}`));
      }
    }

    // Delete from local DB
    await db.update(({ solutions }) => {
      const index = solutions.findIndex(s => s.id === id);
      if (index !== -1) {
        solutions.splice(index, 1);
      }
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error('Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete solution' });
  }
});

// Upload and Process Solution
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { title, description } = req.body;
  const filePath = req.file.path;

  // 修复文件名编码
  const originalName = fixFileNameEncoding(req.file.originalname);
  const fileExt = path.extname(originalName).toLowerCase();

  // 生成唯一文件 ID
  const fileId = `file_${Date.now()}`;

  try {
    let textContent = '';
    let mineruResult = null;  // 在外层声明，确保作用域正确

    console.log(`Processing file: ${originalName} (${fileExt})`);

    // ✅ 保存原始文件到 static/files 目录
    const filesDir = path.join(__dirname, '../public/files');
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    const originalFileName = `${fileId}${fileExt}`;
    const originalFilePath = path.join(filesDir, originalFileName);
    fs.copyFileSync(filePath, originalFilePath);
    console.log(`[Upload] Original file saved to: /files/${originalFileName}`);

    // 检查 MinerU Token
    const isMinerUEnabled = process.env.MINERU_API_TOKEN && process.env.MINERU_API_TOKEN !== 'your_mineru_token_here';

    // Parse file content
    if (fileExt === '.pdf' || fileExt === '.doc' || fileExt === '.docx' || fileExt === '.ppt' || fileExt === '.pptx' || fileExt === '.png' || fileExt === '.jpg' || fileExt === '.jpeg') {
      // Use MinerU Online API for these formats
      if (!isMinerUEnabled) {
        return res.status(400).json({
          error: 'MinerU API Token not configured. Please add MINERU_API_TOKEN to .env file.'
        });
      }
      mineruResult = await parseWithMinerU(filePath, originalName);
      console.log('[Debug] mineruResult keys:', Object.keys(mineruResult || {}));
      console.log('[Debug] base64Markdown length:', mineruResult?.base64Markdown?.length || 0);
      console.log('[Debug] markdown length:', mineruResult?.markdown?.length || 0);
      // 使用 base64Markdown 发送给 FastGPT（包含内嵌的 base64 图片）
      textContent = mineruResult?.base64Markdown || mineruResult?.markdown || '';
      console.log('[Debug] textContent length:', textContent.length);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      const sheets = sheetNames.map(name => xlsx.utils.sheet_to_csv(workbook.Sheets[name]));
      textContent = sheets.join('\n\n--- Sheet Separator ---\n\n');
    } else if (fileExt === '.txt' || fileExt === '.md' || fileExt === '.csv' || fileExt === '.html') {
      textContent = fs.readFileSync(filePath, 'utf-8');
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    console.log(`Extracted text length: ${textContent.length}`);

    // Use base64Markdown for FastGPT (images embedded as base64)
    // FastGPT should support base64 images in markdown
    const fastGPTTextContent = mineruResult?.base64Markdown || textContent;

    console.log('[Upload] Using base64 markdown for FastGPT, length:', fastGPTTextContent.length);
    console.log('[Upload] Sample content preview:', fastGPTTextContent.substring(0, 200) + '...');

    // Debug: Check for base64 images in content
    const base64ImageMatches = fastGPTTextContent.match(/!\[.*?\]\(data:image\/[^)]+\)/gi);
    const relativeImageMatches = fastGPTTextContent.match(/!\[.*?\]\([^)]+\.(jpg|jpeg|png|gif|webp)\)/gi);
    const datasetImageMatches = fastGPTTextContent.match(/!\[.*?\]\(dataset\/[^)]+\)/gi);

    console.log('[Upload Debug] Image analysis:');
    console.log('  - Base64 images found:', base64ImageMatches?.length || 0);
    console.log('  - Relative path images found:', relativeImageMatches?.length || 0);
    console.log('  - Dataset path images found:', datasetImageMatches?.length || 0);

    if (base64ImageMatches && base64ImageMatches.length > 0) {
      console.log('  - First base64 image length:', base64ImageMatches[0].length);
      console.log('  - First base64 image preview:', base64ImageMatches[0].substring(0, 100) + '...');
    }
    if (datasetImageMatches && datasetImageMatches.length > 0) {
      console.log('  - First dataset image:', datasetImageMatches[0]);
    }

    // Import to Dataset as Text
    // FastGPT will automatically append .txt to the document name (e.g., 123.pdf -> 123.pdf.txt)
    const importRes = await axios.post(`${process.env.FASTGPT_BASE_URL}/core/dataset/collection/create/text`, {
      datasetId: process.env.FASTGPT_DATASET_ID,
      name: originalName,  // Use original name, FastGPT adds .txt automatically
      text: fastGPTTextContent,
      trainingType: 'chunk',
      chunkSize: 512,
      chunkSplitter: '',
      qaPrompt: ''
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // FastGPT returns { collectionId: 'xxx', results: {...} }
    const responseData = importRes.data.data;
    // Handle different response formats from FastGPT
    let collectionId;
    if (typeof responseData === 'string') {
      collectionId = responseData;
    } else if (responseData?.collectionId) {
      collectionId = responseData.collectionId;
    } else {
      console.warn('[Upload] Unexpected FastGPT response format:', JSON.stringify(responseData).substring(0, 200));
      throw new Error('Invalid FastGPT response: missing collectionId');
    }
    console.log('[Upload] Collection ID:', collectionId);

    // 3. Save to local DB
    const newSolution = {
      id: Date.now().toString(),
      title,
      description,
      fileName: originalName,
      fileId: fileId,
      originalFilePath: `/files/${originalFileName}`,  // 原始文件路径
      collectionId: collectionId,
      // 保存本地 markdown 信息用于预览
      localMarkdown: mineruResult?.localMarkdown || '',
      batchId: mineruResult?.batchId || '',
      imageCount: mineruResult?.imageCount || 0,
      createdAt: new Date().toISOString()
    };

    await db.update(({ solutions }) => solutions.push(newSolution));

    // Cleanup local file
    fs.unlinkSync(filePath);

    res.json(newSolution);

  } catch (error) {
    console.error('Error processing solution:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    // Cleanup local file on error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process solution' });
  }
});

// Helper function: Find solution by collectionId
async function findSolutionByCollectionId(collectionId) {
  await db.read();
  return db.data.solutions.find(s => s.collectionId === collectionId);
}

// Chat Interface - Streaming support
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    console.log('[Debug GlobalChat] Using FASTGPT_WORKFLOW_KEY:', process.env.FASTGPT_WORKFLOW_KEY?.substring(0, 20) + '...');

    // Track the last sent textOutput to avoid sending partial/incomplete content
    let lastSentTextOutputLength = 0;

    // Store batchId -> solutionId mapping for image path conversion
    const batchIdMap = new Map();
    await db.read();
    for (const solution of db.data.solutions) {
      if (solution.batchId) {
        batchIdMap.set(solution.batchId, solution.id);
      }
    }

    const response = await axios.post(`${process.env.FASTGPT_BASE_URL}/v1/chat/completions`, {
      chatId: 'solution-kb-chat',
      stream: true,  // Enable streaming
      detail: true,
      messages: messages
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.FASTGPT_WORKFLOW_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    // Handle streaming response
    let buffer = '';  // Buffer for incomplete JSON
    let allNodeResponses = [];  // Collect all node responses for citations

    response.data.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';  // Keep the last incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            let content = parsed.choices?.[0]?.delta?.content || '';

            // Debug: log all parsed data
            console.log('[Debug GlobalChat] Parsed SSE data keys:', Object.keys(parsed).join(', '));

            // Extract content from workflow AI chat node (responseData)
            if (parsed.responseData && Array.isArray(parsed.responseData)) {
              console.log('[Debug GlobalChat] responseData array length:', parsed.responseData.length);
              for (const nodeData of parsed.responseData) {
                console.log('[Debug GlobalChat] Node - moduleType:', nodeData.moduleType, 'keys:', Object.keys(nodeData).join(','));
                // AI chat node response - extract textOutput
                if (nodeData.moduleType === 'chatNode' && nodeData.textOutput) {
                  console.log('[Debug GlobalChat] Found AI chat textOutput, length:', nodeData.textOutput.length, 'lastSent:', lastSentTextOutputLength);
                  // Only send content if textOutput has grown (avoid sending partial content)
                  if (nodeData.textOutput.length > lastSentTextOutputLength) {
                    // Send only the new portion
                    const newContent = nodeData.textOutput.substring(lastSentTextOutputLength);
                    console.log('[Debug GlobalChat] Sending new content, length:', newContent.length);
                    content = newContent;
                    lastSentTextOutputLength = nodeData.textOutput.length;
                  } else {
                    content = ''; // No new content to send
                  }
                }
                // Check if this node has quoteList (knowledge base search node)
                if (nodeData.quoteList && Array.isArray(nodeData.quoteList)) {
                  console.log('[Debug GlobalChat] Found quoteList in responseData node, count:', nodeData.quoteList.length);
                }
                // Collect all node responses for citation extraction later
                allNodeResponses.push(nodeData);
              }
            }

            // Check for flowNodeResponse event (FastGPT workflow format)
            if (parsed.nodeResponse) {
              console.log('[Debug GlobalChat] flowNodeResponse found, moduleType:', parsed.nodeResponse.moduleType);
              allNodeResponses.push(parsed.nodeResponse);
            }

            // Check if the response itself is an array (workflow responses format)
            if (Array.isArray(parsed)) {
              console.log('[Debug GlobalChat] Received array format data, length:', parsed.length);
              allNodeResponses.push(...parsed);
            }

            // Note: Image paths are already processed by FastGPT knowledge base
            // No need to process here as FastGPT returns the content as-is

            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            console.log('[Debug GlobalChat] JSON parse error:', e.message);
          }
        }
      }
    });

    response.data.on('end', async () => {
      // Extract citations from collected node responses
      const citations = [];
      const solutionIds = new Set();

      for (const nodeResponse of allNodeResponses) {
        // Handle different node response formats
        if (nodeResponse.quoteList && Array.isArray(nodeResponse.quoteList)) {
          // Knowledge base search node format
          console.log('[Debug GlobalChat] Found quoteList in nodeResponse');
          for (const quote of nodeResponse.quoteList) {
            const solution = await findSolutionByCollectionId(quote.collectionId);
            if (solution) {
              citations.push({
                id: quote.id,
                q: quote.q,
                a: quote.a,
                score: quote.score,
                solutionId: solution.id,
                solutionTitle: solution.title
              });
              solutionIds.add(solution.id);
            }
          }
        }
      }

      console.log('[Debug GlobalChat] Total citations found:', citations.length);

      if (citations.length > 0) {
        const citationData = {
          citations,
          relatedSolutions: Array.from(solutionIds),
          isComplete: true
        };
        console.log('[Debug GlobalChat] Sending citation data, citations count:', citations.length);
        const citationJson = JSON.stringify(citationData);
        console.log('[Debug GlobalChat] Citation JSON length:', citationJson.length);
        res.write(`data: ${citationJson}\n\n`);
        // Flush to ensure data is sent immediately
        if (res.flush) res.flush();
      }

      res.write('data: [DONE]\n\n');
      if (res.flush) res.flush();
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Chat error:', error.response ? error.response.data : error.message);
    res.write(`data: ${JSON.stringify({ error: 'Chat failed' })}\n\n`);
    res.end();
  }
});

// ==================== Product Capabilities CRUD API ====================

// Helper: Generate unique ID
const generateId = () => `cap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// GET /api/capabilities - Get all capabilities
app.get('/api/capabilities', async (req, res) => {
  try {
    await capabilitiesDb.read();
    res.json(capabilitiesDb.data.capabilities);
  } catch (error) {
    console.error('Get capabilities error:', error.message);
    res.status(500).json({ error: 'Failed to get capabilities' });
  }
});

// GET /api/capabilities/:id - Get single capability
app.get('/api/capabilities/:id', async (req, res) => {
  try {
    await capabilitiesDb.read();
    const capability = capabilitiesDb.data.capabilities.find(c => c.id === req.params.id);

    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    res.json(capability);
  } catch (error) {
    console.error('Get capability error:', error.message);
    res.status(500).json({ error: 'Failed to get capability' });
  }
});

// POST /api/capabilities - Create capability
app.post('/api/capabilities', async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      features,
      useCases,
      benefits,
      specs,
      performance
    } = req.body;

    // Validation
    if (!name || !category || !description) {
      return res.status(400).json({ error: 'Missing required fields: name, category, description' });
    }

    const now = new Date().toISOString();
    const newCapability = {
      id: generateId(),
      name,
      category,
      description,
      features: features || [],
      useCases: useCases || [],
      benefits: benefits || [],
      specs: specs || [],
      performance: performance || {},
      createdAt: now,
      updatedAt: now,
      version: '1.0.0'
    };

    await capabilitiesDb.update(data => {
      data.capabilities.push(newCapability);
    });

    // Import to FastGPT if enabled
    if (process.env.FASTGPT_DATASET_ID) {
      try {
        const capabilityText = formatCapabilityForFastGPT(newCapability);
        const fastgptResponse = await axios.post(
          `${process.env.FASTGPT_BASE_URL}/core/dataset/collection/createByText`,
          {
            datasetId: process.env.FASTGPT_DATASET_ID,
            name: newCapability.name,
            text: capabilityText,
            parentId: null // Top-level collection
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Update capability with collectionId
        newCapability.collectionId = fastgptResponse.data.collectionId;
        await capabilitiesDb.write();

        console.log(`[Capability] Imported to FastGPT: ${newCapability.name} (collectionId: ${newCapability.collectionId})`);
      } catch (fastgptError) {
        console.warn('[Capability] Failed to import to FastGPT:', fastgptError.message);
        // Continue without FastGPT integration
      }
    }

    res.status(201).json(newCapability);
  } catch (error) {
    console.error('Create capability error:', error.message);
    res.status(500).json({ error: 'Failed to create capability' });
  }
});

// PUT /api/capabilities/:id - Update capability
app.put('/api/capabilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await capabilitiesDb.read();
    const index = capabilitiesDb.data.capabilities.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const existing = capabilitiesDb.data.capabilities[index];
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString(),
      version: incrementVersion(existing.version)
    };

    await capabilitiesDb.update(data => {
      data.capabilities[index] = { ...existing, ...updates };
    });

    res.json({ ...existing, ...updates });
  } catch (error) {
    console.error('Update capability error:', error.message);
    res.status(500).json({ error: 'Failed to update capability' });
  }
});

// DELETE /api/capabilities/:id - Delete capability
app.delete('/api/capabilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await capabilitiesDb.read();
    const capability = capabilitiesDb.data.capabilities.find(c => c.id === id);

    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    // Delete from FastGPT if collectionId exists
    if (capability.collectionId) {
      try {
        await axios.post(`${process.env.FASTGPT_BASE_URL}/core/dataset/collection/delete`, {
          datasetId: process.env.FASTGPT_DATASET_ID,
          collectionId: capability.collectionId
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`[Capability] Deleted from FastGPT: ${capability.name}`);
      } catch (fastgptError) {
        console.warn('[Capability] Failed to delete from FastGPT:', fastgptError.message);
      }
    }

    await capabilitiesDb.update(data => {
      data.capabilities = data.capabilities.filter(c => c.id !== id);
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error('Delete capability error:', error.message);
    res.status(500).json({ error: 'Failed to delete capability' });
  }
});

// Helper: Format capability for FastGPT import
function formatCapabilityForFastGPT(capability) {
  const parts = [
    `# ${capability.name}`,
    `**类别**: ${capability.category}`,
    ``,
    `## 产品概述`,
    capability.description,
    ``,
    `## 核心功能`,
    ...(capability.features || []).map(f => `- ${f}`),
    ``,
    `## 应用场景`,
    ...(capability.useCases || []).map(u => `- ${u}`),
    ``,
    `## 产品优势`,
    ...(capability.benefits || []).map(b => `- ${b}`),
  ];

  if (capability.specs && capability.specs.length > 0) {
    parts.push(``, `## 技术规格`);
    capability.specs.forEach(spec => {
      parts.push(`- **${spec.name}**: ${spec.value}${spec.unit ? ` ${spec.unit}` : ''}${spec.description ? ` (${spec.description})` : ''}`);
    });
  }

  if (capability.performance) {
    parts.push(``, `## 性能指标`);
    if (capability.performance.concurrency) parts.push(`- 并发数: ${capability.performance.concurrency}`);
    if (capability.performance.responseTime) parts.push(`- 响应时间: ${capability.performance.responseTime}`);
    if (capability.performance.accuracy) parts.push(`- 准确率: ${capability.performance.accuracy}`);
    if (capability.performance.availability) parts.push(`- 可用性: ${capability.performance.availability}`);
    if (capability.performance.other) {
      Object.entries(capability.performance.other).forEach(([key, value]) => {
        parts.push(`- ${key}: ${value}`);
      });
    }
  }

  return parts.join('\n');
}

// Helper: Increment version (e.g., 1.0.0 -> 1.0.1)
function incrementVersion(version) {
  const parts = version.split('.');
  parts[2] = String(parseInt(parts[2]) + 1);
  return parts.join('.');
}

// ==================== Draft Solutions API ====================

// Helper: Generate draft solution ID
const generateDraftId = () => `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// POST /api/drafts/generate - Generate solution using FastGPT Workflow
app.post('/api/drafts/generate', async (req, res) => {
  try {
    const { requirements, industry, customerType, expectedFeatures, additionalNotes } = req.body;

    if (!requirements || requirements.trim().length === 0) {
      return res.status(400).json({ error: 'Requirements field is required' });
    }

    // Build the prompt for FastGPT
    const prompt = `请根据以下需求生成一份专业的产品解决方案：

**用户需求**: ${requirements}

${industry ? `**行业**: ${industry}` : ''}
${customerType ? `**客户类型**: ${customerType}` : ''}
${expectedFeatures ? `**期望功能**: ${expectedFeatures}` : ''}
${additionalNotes ? `**补充说明**: ${additionalNotes}` : ''}

请生成包含以下内容的 Markdown 格式方案：

1. 方案标题（简洁明了）
2. 项目背景（需求分析）
3. 解决方案概述
4. 功能架构设计
5. 核心功能模块（详细描述）
6. 技术方案建议
7. 实施计划建议
8. 预期效果和价值

要求：
- 方案要专业、详细、可落地
- 内容要符合实际业务场景
- 使用标准 Markdown 格式
- 字数不少于 1000 字`;

    // Call FastGPT Workflow API
    const fastgptResponse = await axios.post(
      `${process.env.FASTGPT_BASE_URL}/v1/chat/completions`,
      {
        model: process.env.FASTGPT_WORKFLOW_KEY,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的解决方案架构师，擅长根据客户需求生成详细的产品解决方案。你的方案要专业、可落地，并且结构清晰。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        detail: true
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for generation
      }
    );

    // Extract the generated content
    let generatedContent = '';
    if (fastgptResponse.data && fastgptResponse.data.choices && fastgptResponse.data.choices.length > 0) {
      const choice = fastgptResponse.data.choices[0];
      if (choice.message && choice.message.content) {
        generatedContent = choice.message.content;
      }
    }

    if (!generatedContent) {
      return res.status(500).json({ error: 'Failed to generate solution content' });
    }

    // Extract title from generated content (first h1)
    let title = '未命名方案';
    const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    const now = new Date().toISOString();
    const newDraft = {
      id: generateDraftId(),
      title,
      requirements,
      industry: industry || null,
      scenario: customerType || null,
      matchedCapabilities: [], // Can be enhanced later with AI matching
      content: generatedContent,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      version: '1.0.0'
    };

    await draftsDb.update(data => {
      data.drafts.push(newDraft);
    });

    console.log(`[Draft] Generated solution: ${newDraft.id} - ${newDraft.title}`);

    res.status(201).json(newDraft);
  } catch (error) {
    console.error('Generate draft error:', error.message);
    if (error.response) {
      console.error('FastGPT API error:', error.response.status, error.response.data);
    }
    res.status(500).json({ error: 'Failed to generate solution' });
  }
});

// GET /api/drafts - Get all draft solutions
app.get('/api/drafts', async (req, res) => {
  try {
    await draftsDb.read();
    res.json(draftsDb.data.drafts);
  } catch (error) {
    console.error('Get drafts error:', error.message);
    res.status(500).json({ error: 'Failed to get drafts' });
  }
});

// GET /api/drafts/:id - Get single draft solution
app.get('/api/drafts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await draftsDb.read();
    const draft = draftsDb.data.drafts.find(d => d.id === id);

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(draft);
  } catch (error) {
    console.error('Get draft error:', error.message);
    res.status(500).json({ error: 'Failed to get draft' });
  }
});

// PUT /api/drafts/:id - Update draft solution
app.put('/api/drafts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await draftsDb.read();
    const index = draftsDb.data.drafts.findIndex(d => d.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const existing = draftsDb.data.drafts[index];
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString(),
      version: incrementVersion(existing.version)
    };

    await draftsDb.update(data => {
      data.drafts[index] = { ...existing, ...updates };
    });

    res.json(draftsDb.data.drafts[index]);
  } catch (error) {
    console.error('Update draft error:', error.message);
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

// DELETE /api/drafts/:id - Delete draft solution
app.delete('/api/drafts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await draftsDb.read();
    const index = draftsDb.data.drafts.findIndex(d => d.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    await draftsDb.update(data => {
      data.drafts.splice(index, 1);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete draft error:', error.message);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';  // 允许内网访问

// 获取本机 IP 地址
function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`内网访问地址: http://${localIP}:${PORT}`);
});
