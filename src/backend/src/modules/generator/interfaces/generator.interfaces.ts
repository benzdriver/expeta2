/**
 * 代码文件接口
 */
export interface CodeFile {
  path: string;
  content: string;
  language?: string;
}

/**
 * 代码生成结果接口
 */
export interface CodeGenerationResult {
  expectationId: string;
  codeFiles: Record<string, any> | CodeFile[];
  status: string;
  metadata?: Record<string, any>;
  generated?: Date;
}

/**
 * 代码获取结果接口
 */
export interface CodeRetrievalResult {
  expectationId: string;
  codeFiles: Record<string, any> | CodeFile[];
  status: string;
  generated: Date;
}

/**
 * 语义分析输入接口
 */
export interface SemanticAnalysisInput {
  key: string;
  summary: string;
  [key: string]: any;
}

/**
 * 技术栈定义接口
 */
export interface TechStackDefinition {
  frontend?: string;
  backend?: string;
  database?: string;
  [key: string]: any;
}

/**
 * 项目结构生成结果接口
 */
export interface ProjectStructureResult {
  expectationId: string;
  structure: any;
  files: CodeFile[];
  explanation: string;
}

/**
 * 重构要求接口
 */
export interface RefactoringRequirements {
  readability?: string;
  performance?: string;
  [key: string]: any;
}

/**
 * 测试要求接口
 */
export interface TestRequirements {
  coverage?: string;
  types?: string[];
  [key: string]: any;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  validationContext: any;
  semanticInsights: any;
  validationResults: any;
  code: {
    id: string;
    expectationId: string;
  };
  timestamp?: Date;
} 