/**
 * 使用语义输入生成代码的DTO
 */
export class GenerateCodeWithSemanticInputDto {
  /**
   * 期望ID
   */
  expectationId: string;

  /**
   * 语义分析结果
   */
  semanticAnalysis: unknown;

  /**
   * 生成选项
   */
  options?: {
    /**
     * 代码风格
     */
    codeStyle?: string;

    /**
     * 技术栈
     */
    techStack?: string;

    /**
     * 优化目标
     */
    optimizationTarget?: 'performance' | 'readability' | 'maintainability';

    /**
     * 是否包含测试
     */
    includeTests?: boolean;

    /**
     * 是否包含文档
     */
    includeDocs?: boolean;
  };
}
