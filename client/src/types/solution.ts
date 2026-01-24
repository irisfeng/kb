export interface Solution {
  id: string;
  title: string;
  description: string;
  collectionId: string;
  fileName: string;
  fileId?: string;
  originalFilePath?: string;  // 原始文件路径 (/files/file_xxx.pdf)
  createdAt?: string;
}

export interface SolutionDetail extends Solution {
  fastgptDetail?: {
    _id: string;
    name: string;
    type: string;
    trainingType: string;
    createdAt: string;
  } | null;
}

export interface DocumentChunk {
  _id: string;
  q: string;
  a?: string;
  chunkIndex?: number;
}

export interface PreviewData {
  text: string;
  chunks: DocumentChunk[];
  chunkCount: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: EnhancedCitation[];
  relatedSolutions?: string[];
}

export interface Citation {
  id: string;
  q: string;
  a?: string;
  score?: number;
}

// Enhanced citation with solution info
export interface EnhancedCitation extends Citation {
  solutionId: string;
  solutionTitle: string;
}

export type ViewMode = 'solutions' | 'upload' | 'solution-detail' | 'capabilities' | 'generator' | 'editor';

// AI Generated Draft Solution
export interface DraftSolution {
  id: string;
  title: string;
  requirements: string;  // 用户原始需求
  industry?: string;      // AI 分析的行业
  scenario?: string;      // AI 分析的场景
  matchedCapabilities: string[];  // 匹配到的产品能力 ID 列表
  content: string;        // 生成的 Markdown 内容
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  version: string;
}

// Form data for generating a new solution
export interface SolutionRequirementForm {
  requirements: string;
  industry?: string;
  customerType?: string;
  expectedFeatures?: string;
  additionalNotes?: string;
}
