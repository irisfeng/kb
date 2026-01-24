/**
 * 产品能力类型定义
 * 用于 AI 辅助方案编写功能
 */

export interface ProductCapability {
  // 基本信息
  id: string;
  name: string;
  category: string; // 产品类别：如「通信服务」、「AI 能力」、「数据服务」等
  description: string; // 产品概述

  // 功能描述
  features: string[]; // 核心功能列表
  useCases: string[]; // 应用场景列表
  benefits: string[]; // 产品优势/价值

  // 技术参数
  specs: TechSpec[]; // 技术规格
  performance?: Performance; // 性能指标

  // FastGPT 集成
  collectionId?: string; // FastGPT 知识库集合 ID

  // 元数据
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface TechSpec {
  name: string; // 规格名称
  value: string; // 规格值
  unit?: string; // 单位
  description?: string; // 说明
}

export interface Performance {
  concurrency?: string; // 并发数
  responseTime?: string; // 响应时间
  accuracy?: string; // 准确率
  availability?: string; // 可用性
  other?: Record<string, string>; // 其他指标
}

// 表单数据类型（创建/编辑时使用）
export interface ProductCapabilityFormData {
  name: string;
  category: string;
  description: string;
  features: string;
  useCases: string;
  benefits: string;
  specs: string; // JSON 格式字符串
  performance?: string; // JSON 格式字符串
}
