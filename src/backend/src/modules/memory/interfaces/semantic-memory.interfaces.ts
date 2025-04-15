/**
 * 语义内存接口定义
 * 为内存系统提供语义驱动功能的接口和类型定义
 */

/**
 * 语义查询选项
 */
export interface SemanticQueryOptions {
  /** 相似度阈值 (0-1) */
  similarityThreshold?: number;
  /** 结果数量限制 */
  limit?: number;
  /** 排序方式 */
  sortBy?: 'relevance' | 'date' | 'priority';
  /** 包含的内存类型 */
  includeTypes?: string[];
  /** 排除的内存类型 */
  excludeTypes?: string[];
  /** 是否使用缓存 */
  useCache?: boolean;
  /** 上下文信息 */
  context?: Record<string, unknown>;
}

/**
 * 缓存条目
 */
export interface CacheEntry<T = unknown> {
  /** 缓存的数据 */
  data: T;
  /** 缓存时间 */
  timestamp: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 访问次数 */
  accessCount: number;
  /** 最后访问时间 */
  lastAccessed: Date;
  /** 语义相关性分数 */
  semanticRelevance: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 默认过期时间（毫秒） */
  defaultTTL: number;
  /** 最大缓存条目数 */
  maxEntries: number;
  /** 最小语义相关性阈值 */
  minSemanticRelevance: number;
  /** 是否启用自适应缓存 */
  adaptiveCache: boolean;
}

/**
 * 转换反馈
 */
export interface TransformationFeedback {
  /** 转换ID */
  transformationId: string;
  /** 反馈评分 (1-5) */
  rating: number;
  /** 反馈评论 */
  comments?: string;
  /** 建议的改进 */
  suggestedImprovements?: string[];
  /** 是否需要人工审核 */
  requiresHumanReview?: boolean;
  /** 反馈提供者 */
  providedBy: string;
  /** 反馈时间 */
  timestamp: Date;
  /** 反馈类别 */
  category?: 'accuracy' | 'completeness' | 'relevance' | 'other';
  /** 是否已处理 */
  processed?: boolean;
  /** 处理结果 */
  processingResult?: string;
  /** 处理时间 */
  processedAt?: Date;
}

/**
 * 语义验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 验证消息 */
  messages: ValidationMessage[];
  /** 验证分数 (0-100) */
  score: number;
  /** 建议的修复 */
  suggestedFixes?: Record<string, unknown>;
  /** 验证时间戳 */
  timestamp?: Date;
  /** 验证上下文 */
  context?: Record<string, unknown>;
  /** 验证者 */
  validator?: string;
}

/**
 * 验证消息
 */
export interface ValidationMessage {
  /** 消息类型 */
  type: 'error' | 'warning' | 'info';
  /** 消息内容 */
  message: string;
  /** 相关字段 */
  field?: string;
  /** 验证规则 */
  rule?: string;
  /** 消息代码 */
  code?: string;
  /** 消息严重性 (1-5) */
  severity?: number;
  /** 修复建议 */
  suggestion?: string;
}

/**
 * 语义约束
 */
export interface SemanticConstraint {
  /** 字段名 */
  field: string;
  /** 约束描述 */
  constraint: string;
  /** 验证函数 */
  validationFn?: (value: unknown) => boolean;
  /** 错误消息 */
  errorMessage?: string;
  /** 约束严重性 */
  severity: 'error' | 'warning' | 'info';
  /** 约束ID */
  id?: string;
  /** 约束优先级 (1-5) */
  priority?: number;
  /** 约束类别 */
  category?: string;
  /** 约束描述 */
  description?: string;
  /** 约束示例 */
  examples?: {
    valid: unknown[];
    invalid: unknown[];
  };
}

/**
 * 语义验证配置
 */
export interface SemanticValidationConfig {
  /** 是否启用验证 */
  enabled: boolean;
  /** 验证模式 */
  mode: 'strict' | 'lenient' | 'adaptive';
  /** 验证阈值 */
  threshold: number;
  /** 自动修复 */
  autoFix: boolean;
  /** 验证超时（毫秒） */
  timeout: number;
  /** 验证缓存 */
  cacheResults: boolean;
  /** 验证策略 */
  strategy: 'all' | 'critical' | 'sample';
}

/**
 * 反馈分析结果
 */
export interface FeedbackAnalysisResult {
  /** 总体评分 */
  overallRating: number;
  /** 常见问题 */
  commonIssues: string[];
  /** 改进建议 */
  improvementSuggestions: string[];
  /** 趋势分析 */
  trends: {
    period: string;
    rating: number;
    change: number;
  }[];
  /** 反馈分类 */
  categories: Record<string, number>;
}

/**
 * 语义数据源
 */
export interface SemanticDataSource {
  /** 数据源ID */
  id: string;
  /** 数据源名称 */
  name: string;
  /** 数据源类型 */
  type: string;
  /** 语义描述 */
  semanticDescription: string;
  /** 数据模式 */
  schema?: Record<string, unknown>;
  /** 查询函数 */
  queryFn?: (query: string, options?: unknown) => Promise<unknown[]>;
}
