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

// Static files serving (for images)
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Database setup
const defaultData = { solutions: [] };
const db = await JSONFilePreset(path.join(__dirname, 'db.json'), defaultData);

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

      // 更新 Markdown 中的图片路径
      // MinerU 输出的图片引用格式：![](images/xxx.png) 或相对路径
      markdownContent = markdownContent.replace(
        /!\[([^\]]*)\]\((images\/[^)]+|[^)]+\.(png|jpg|jpeg|gif|webp))\)/gi,
        (match, alt, imagePath) => {
          const imageName = path.basename(imagePath);
          // 使用 /images/{batchId}/{imageName} 格式
          return `![${alt}](/images/${batchId}/${imageName})`;
        }
      );

      console.log(`MinerU parsing completed! Markdown length: ${markdownContent.length}, Images saved: ${savedImages.length}`);
      return {
        markdown: markdownContent,
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

  // 4. 返回 Markdown 内容
  return {
    text: result.markdown,
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
        console.warn('Failed to fetch FastGPT collection detail:', fastgptError.message);
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

    if (!solution.collectionId) {
      return res.json({ text: '', chunks: [] });
    }

    // Get data chunks from FastGPT
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

    const chunks = dataList.data.data?.list || [];
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

// Solution-specific chat
app.post('/api/solutions/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { messages } = req.body;

  try {
    await db.read();
    const solution = db.data.solutions.find(s => s.id === id);

    if (!solution) {
      return res.status(404).json({ error: 'Solution not found' });
    }

    // Use system prompt to limit scope to current solution
    const systemPrompt = `你是一个专业的方案助手。请仅基于《${solution.title}》这个方案的内容回答用户问题。

方案描述：${solution.description || '无'}
文件名：${solution.fileName}

如果用户询问的内容不在该方案中，请明确告知用户。`;

    const chatRes = await axios.post(
      `${process.env.FASTGPT_BASE_URL}/v1/chat/completions`,
      {
        chatId: `solution-${id}`,
        stream: false,
        detail: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.FASTGPT_APP_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = chatRes.data.choices[0].message.content;
    const responseData = chatRes.data.responseData || [];

    // Extract citations from response data
    const citations = responseData
      .filter(item => item.quoteList && item.quoteList.length > 0)
      .flatMap(item => item.quoteList)
      .filter(q => q.collectionId === solution.collectionId);

    res.json({
      content,
      citations: citations.map(c => ({
        id: c.id,
        q: c.q,
        a: c.a,
        score: c.score
      }))
    });
  } catch (error) {
    console.error('Solution chat error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Chat failed' });
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
      try {
        await axios.post(`${process.env.FASTGPT_BASE_URL}/core/dataset/collection/delete`, {
          datasetId: process.env.FASTGPT_DATASET_ID,
          collectionId: solution.collectionId
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`Deleted collection ${solution.collectionId} from FastGPT`);
      } catch (fastgptError) {
        console.warn('Failed to delete from FastGPT:', fastgptError.message);
        // Continue with local deletion even if FastGPT fails
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

  try {
    let textContent = '';

    console.log(`Processing file: ${originalName} (${fileExt})`);

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
      const mineruResult = await parseWithMinerU(filePath, originalName);
      textContent = mineruResult.text;
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

    // Import to Dataset as Text
    const importRes = await axios.post(`${process.env.FASTGPT_BASE_URL}/core/dataset/collection/create/text`, {
      datasetId: process.env.FASTGPT_DATASET_ID,
      name: originalName,
      text: textContent,
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
    const collectionId = responseData?.collectionId || responseData;

    // 3. Save to local DB
    const newSolution = {
      id: Date.now().toString(),
      title,
      description,
      fileName: originalName,
      fileId: 'mineru-api',
      collectionId: collectionId,
      createdAt: new Date().toISOString()
    };

    await db.update(({ solutions }) => solutions.push(newSolution));

    // Cleanup local file
    fs.unlinkSync(filePath);

    res.json(newSolution);

  } catch (error) {
    console.error('Error processing solution:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    // Cleanup local file on error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process solution' });
  }
});

// Chat Interface
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const chatRes = await axios.post(`${process.env.FASTGPT_BASE_URL}/v1/chat/completions`, {
      chatId: 'solution-kb-chat',
      stream: false,
      detail: false,
      messages: messages
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.FASTGPT_APP_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = chatRes.data.choices[0].message.content;
    res.json({ content });

  } catch (error) {
    console.error('Chat error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Chat failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
