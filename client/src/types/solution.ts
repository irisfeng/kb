export interface Solution {
  id: string;
  title: string;
  description: string;
  collectionId: string;
  fileName: string;
  fileId?: string;
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
  citations?: Citation[];
}

export interface Citation {
  id: string;
  q: string;
  a?: string;
  score?: number;
}

export type ViewMode = 'solutions' | 'chat' | 'solution-detail';
