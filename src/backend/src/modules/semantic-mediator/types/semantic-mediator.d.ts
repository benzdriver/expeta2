// 扩展 SemanticMediatorService 接口以支持测试中使用的方法
declare module '../semantic-mediator.service' {
  interface SemanticMediatorService {
    // 基本转换方法
    translateBetweenModules(
      sourceModule: string,
      targetModule: string,
      data: unknown,
    ): Promise<any>;

    // 上下文丰富方法
    enrichWithContext(
      module: string,
      data: unknown,
      contextQuery: string,
    ): Promise<any>;

    // 语义冲突解决方法
    resolveSemanticConflicts(
      moduleA: string,
      dataA: unknown,
      moduleB: string,
      dataB: unknown,
      options?: any,
    ): Promise<any>;

    // 语义洞察提取方法
    extractSemanticInsights(
      data: unknown,
      query: string,
    ): Promise<any>;

    // 语义转换跟踪方法
    trackSemanticTransformation(
      sourceModule: string,
      targetModule: string,
      sourceData: unknown,
      transformedData: unknown,
      options?: any,
    ): Promise<any>;

    // 验证上下文生成方法
    generateValidationContext(
      expectationId: string,
      codeId: string,
      previousValidations?: string[],
      options?: any,
    ): Promise<any>;

    // 语义转换评估方法
    evaluateSemanticTransformation(
      sourceData: unknown,
      transformedData: unknown,
      expectedOutcome: string,
    ): Promise<any>;
  }
} 