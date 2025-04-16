import { Injectable, Logger } from '@nestjs/common';
import { ITransformationEngine } from '../../interfaces/transformation-engine.interface';
import { SemanticDescriptor } from '../../interfaces/semantic-descriptor.interface';
import { LlmRouterService } from '../../../../services/llm-router.service';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * 转换引擎服务
 * 生成和执行数据转换
 */
@Injectable()
export class TransformationEngineService implements ITransformationEngine {
  private readonly logger = new Logger(TransformationEngineService.name);
  private readonly transformationStrategies: Map<
    string,
    (data: unknown, transformationPath: unknown, context?: unknown) => Promise<unknown>
  > = new Map();

  constructor(
    private readonly llmRouterService: LlmRouterService,
    private readonly memoryService: MemoryService,
  ) {
    this.registerDefaultStrategies();
  }

  /**
   * 生成转换路径
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @param context 上下文信息
   * @returns 转换路径
   */
  async generateTransformationPath(
    sourceDescriptor: SemanticDescriptor,
    targetDescriptor: SemanticDescriptor,
    context?: unknown,
  ): Promise<any> {
    this.logger.debug('Generating transformation path');

    const prompt = `生成从源数据结构到目标数据结构的转换路径：

源结构描述：
${JSON.stringify(sourceDescriptor, null, 2)}

目标结构描述：
${JSON.stringify(targetDescriptor, null, 2)}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请提供一个详细的转换路径，包括以下内容：
1. 属性映射关系
2. 需要的数据转换操作
3. 可能需要的中间转换步骤
4. 建议使用的转换策略

以JSON格式返回结果，包含以下字段：
- mappings: 属性映射关系数组
- transformations: 转换操作数组
- intermediateSteps: 中间步骤数组（如果需要）
- recommendedStrategy: 建议的转换策略名称`;

    try {
      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.2,
        maxTokens: 2000,
      });

      const transformationPath = JSON.parse(response);

      await this.memoryService.storeMemory({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: {
          type: 'transformation_path',
          sourceDescriptor,
          targetDescriptor,
          transformationPath,
          context: context || {},
          timestamp: new Date().toISOString(),
        },
        tags: ['transformation_engine', 'path_generation'],
      });

      this.logger.debug('Transformation path generated successfully');
      return transformationPath;
    } catch (error) {
      this.logger.error(`Error generating transformation path: ${error.message}`);
      throw new Error(`Failed to generate transformation path: ${error.message}`);
    }
  }

  /**
   * 执行转换
   * @param data 源数据
   * @param transformationPath 转换路径
   * @param context 上下文信息
   * @returns 转换后的数据
   */
  async executeTransformation(data: unknown, transformationPath: unknown, context?: unknown): Promise<any> {
    this.logger.debug('Executing transformation');

    const startTime = Date.now();
    let result: unknown;

    try {
      const strategyName = typeof transformationPath === 'object' && transformationPath !== null
        ? (transformationPath as any).recommendedStrategy || 'default'
        : 'default';

      if (!this.transformationStrategies.has(strategyName)) {
        this.logger.warn(`Transformation strategy '${strategyName}' not found, using default`);
      }

      const strategy =
        this.transformationStrategies.get(strategyName) ||
        this.transformationStrategies.get('default');

      if (!strategy) {
        throw new Error('No transformation strategy available, not even default strategy');
      }

      result = await strategy(data, transformationPath, context);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      await this.memoryService.storeMemory({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: {
          type: 'transformation_execution',
          sourceData: data,
          transformationPath,
          result,
          context: context || {},
          executionTime,
          timestamp: new Date().toISOString(),
        },
        tags: ['transformation_engine', 'execution'],
      });

      this.logger.debug(`Transformation executed successfully in ${executionTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Error executing transformation: ${error.message}`);
      throw new Error(`Failed to execute transformation: ${error.message}`);
    }
  }

  /**
   * 验证转换结果
   * @param result 转换结果
   * @param targetDescriptor 目标描述符
   * @param context 上下文信息
   * @returns 验证结果
   */
  async validateTransformation(
    result: unknown,
    targetDescriptor: SemanticDescriptor,
    context?: unknown,
  ): Promise<{
    valid: boolean;
    issues?: unknown[];
  }> {
    this.logger.debug('Validating transformation result');

    const prompt = `验证转换结果是否符合目标结构描述：

转换结果：
${JSON.stringify(result, null, 2)}

目标结构描述：
${JSON.stringify(targetDescriptor, null, 2)}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请验证结果是否符合目标结构的要求，并指出任何问题。

以JSON格式返回结果，包含以下字段：
- valid: 布尔值，表示结果是否有效
- issues: 问题数组，每个问题包含字段、描述和严重性`;

    try {
      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.1,
        maxTokens: 1500,
      });

      const validationResult = JSON.parse(response);

      await this.memoryService.storeMemory({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: {
          type: 'transformation_validation',
          result,
          targetDescriptor,
          validationResult,
          context: context || {},
          timestamp: new Date().toISOString(),
        },
        tags: ['transformation_engine', 'validation'],
      });

      this.logger.debug(`Validation completed: ${validationResult.valid ? 'Valid' : 'Invalid'}`);
      return validationResult;
    } catch (error) {
      this.logger.error(`Error validating transformation: ${error.message}`);
      throw new Error(`Failed to validate transformation: ${error.message}`);
    }
  }

  /**
   * 优化转换路径
   * @param transformationPath 转换路径
   * @param metrics 性能指标
   * @returns 优化后的转换路径
   */
  async optimizeTransformationPath(transformationPath: unknown, metrics?: unknown): Promise<any> {
    this.logger.debug('Optimizing transformation path');

    const prompt = `优化以下转换路径：

转换路径：
${JSON.stringify(transformationPath, null, 2)}

${metrics ? `性能指标：\n${JSON.stringify(metrics, null, 2)}\n` : ''}

请分析转换路径，并提供优化建议，包括：
1. 简化或合并转换步骤
2. 提高效率的方法
3. 更合适的转换策略

返回优化后的转换路径，保持与原始路径相同的JSON结构。`;

    try {
      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.2,
        maxTokens: 2000,
      });

      const optimizedPath = JSON.parse(response);

      await this.memoryService.storeMemory({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: {
          type: 'transformation_optimization',
          originalPath: transformationPath,
          optimizedPath,
          metrics: metrics || {},
          timestamp: new Date().toISOString(),
        },
        tags: ['transformation_engine', 'optimization'],
      });

      this.logger.debug('Transformation path optimized successfully');
      return optimizedPath;
    } catch (error) {
      this.logger.error(`Error optimizing transformation path: ${error.message}`);
      throw new Error(`Failed to optimize transformation path: ${error.message}`);
    }
  }

  /**
   * 获取可用的转换策略
   * @returns 转换策略列表
   */
  async getAvailableTransformationStrategies(): Promise<string[]> {
    this.logger.debug('Getting available transformation strategies');
    return Array.from(this.transformationStrategies.keys());
  }

  /**
   * 注册自定义转换策略
   * @param name 策略名称
   * @param strategy 策略实现
   * @returns 是否成功
   */
  async registerTransformationStrategy(
    name: string,
    strategy: (data: unknown, transformationPath: unknown, context?: unknown) => Promise<unknown>,
  ): Promise<boolean> {
    this.logger.debug(`Registering transformation strategy: ${name}`);

    if (this.transformationStrategies.has(name)) {
      this.logger.warn(`Transformation strategy '${name}' already exists, overwriting`);
    }

    this.transformationStrategies.set(name, strategy);

    this.logger.debug(`Transformation strategy '${name}' registered successfully`);
    return true;
  }

  /**
   * 注册默认转换策略
   */
  private registerDefaultStrategies(): void {
    this.logger.debug('Registering default transformation strategies');

    this.transformationStrategies.set('default', this.defaultTransformationStrategy.bind(this));

    this.transformationStrategies.set('llm', this.llmTransformationStrategy.bind(this));

    this.transformationStrategies.set('direct_mapping', this.directMappingStrategy.bind(this));

    this.logger.debug('Default transformation strategies registered');
  }

  /**
   * 默认转换策略
   * @param data 源数据
   * @param transformationPath 转换路径
   * @param context 上下文信息
   * @returns 转换后的数据
   */
  private async defaultTransformationStrategy(
    data: unknown,
    transformationPath: unknown,
    context?: unknown,
  ): Promise<any> {
    this.logger.debug('Executing default transformation strategy');

    const result: any = {};

    if (transformationPath && typeof transformationPath === 'object' && 
        (transformationPath as any).mappings && 
        Array.isArray((transformationPath as any).mappings)) {
      
      for (const mapping of (transformationPath as any).mappings) {
        const { source, target, transform } = mapping;

        let value = this.getNestedValue(data, source);

        if (transform) {
          value = await this.applyTransformation(value, transform, context);
        }

        this.setNestedValue(result, target, value);
      }
    }

    if (transformationPath && typeof transformationPath === 'object' && 
        (transformationPath as any).transformations && 
        Array.isArray((transformationPath as any).transformations)) {
      
      for (const transformation of (transformationPath as any).transformations) {
        const { type, params } = transformation;

        switch (type) {
          case 'merge':
            this.mergeObjects(result, params);
            break;
          case 'filter':
            this.filterObject(result, params);
            break;
          case 'compute':
            this.computeValue(result, params, data, context);
            break;
          default:
            this.logger.warn(`Unknown transformation type: ${type}`);
        }
      }
    }

    return result;
  }

  /**
   * LLM驱动的转换策略
   * @param data 源数据
   * @param transformationPath 转换路径
   * @param context 上下文信息
   * @returns 转换后的数据
   */
  private async llmTransformationStrategy(
    data: unknown,
    transformationPath: unknown,
    context?: unknown,
  ): Promise<any> {
    this.logger.debug('Executing LLM transformation strategy');

    const prompt = `根据以下转换路径，将源数据转换为目标格式：

源数据：
${JSON.stringify(data, null, 2)}

转换路径：
${JSON.stringify(transformationPath, null, 2)}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请执行转换并返回结果。只返回转换后的JSON数据，不要有其他文本。`;

    try {
      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.1,
        maxTokens: 2000,
      });

      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Error in LLM transformation strategy: ${error.message}`);
      throw new Error(`LLM transformation failed: ${error.message}`);
    }
  }

  /**
   * 直接映射策略
   * @param data 源数据
   * @param transformationPath 转换路径
   * @param context 上下文信息
   * @returns 转换后的数据
   */
  private async directMappingStrategy(
    data: unknown,
    transformationPath: unknown,
    context?: unknown,
  ): Promise<any> {
    this.logger.debug('Executing direct mapping strategy');

    const result: any = {};

    if (transformationPath && typeof transformationPath === 'object' && 
        (transformationPath as any).mappings && 
        Array.isArray((transformationPath as any).mappings)) {
      
      for (const mapping of (transformationPath as any).mappings) {
        const { source, target } = mapping;

        const value = this.getNestedValue(data, source);

        this.setNestedValue(result, target, value);
      }
    }

    return result;
  }

  /**
   * 获取嵌套值
   * @param obj 对象
   * @param path 路径
   * @returns 值
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }

      value = (value as any)[key];
    }

    return value;
  }

  /**
   * 设置嵌套值
   * @param obj 对象
   * @param path 路径
   * @param value 值
   */
  private setNestedValue(obj: unknown, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj as any;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }

      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 应用转换
   * @param value 值
   * @param transform 转换
   * @param context 上下文
   * @returns 转换后的值
   */
  private async applyTransformation(value: unknown, transform: unknown, context?: unknown): Promise<any> {
    const { type, params } = transform as { type: string; params: any };

    switch (type) {
      case 'format':
        return this.formatValue(value, params);
      case 'convert':
        return this.convertValue(value, params);
      case 'llm':
        return this.transformWithLlm(value, params, context);
      default:
        this.logger.warn(`Unknown transformation type: ${type}`);
        return value;
    }
  }

  /**
   * 格式化值
   * @param value 值
   * @param params 参数
   * @returns 格式化后的值
   */
  private formatValue(value: unknown, params: unknown): unknown {
    const { format } = params as { format: string };

    if (!format) {
      return value;
    }

    switch (format) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'capitalize':
        return typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      default:
        return value;
    }
  }

  /**
   * 转换值
   * @param value 值
   * @param params 参数
   * @returns 转换后的值
   */
  private convertValue(value: unknown, params: unknown): unknown {
    const { targetType } = params as { targetType: string };

    if (!targetType) {
      return value;
    }

    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(String(value)).toISOString();
      case 'array':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }

  /**
   * 使用LLM转换值
   * @param value 值
   * @param params 参数
   * @param context 上下文
   * @returns 转换后的值
   */
  private async transformWithLlm(value: unknown, params: unknown, context?: unknown): Promise<any> {
    const { instruction } = params as { instruction: string };

    if (!instruction) {
      return value;
    }

    const prompt = `根据以下指令转换值：

值：
${JSON.stringify(value, null, 2)}

指令：
${instruction}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请执行转换并返回结果。只返回转换后的值，不要有其他文本。`;

    try {
      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
      });

      try {
        return JSON.parse(response);
      } catch {
        return response.trim();
      }
    } catch (error) {
      this.logger.error(`Error in LLM value transformation: ${error.message}`);
      return value;
    }
  }

  /**
   * 合并对象
   * @param result 结果对象
   * @param params 参数
   */
  private mergeObjects(result: unknown, params: unknown): void {
    const { sources } = params as { sources: Array<{ path: string; target: string }> };

    if (!sources || !Array.isArray(sources)) {
      return;
    }

    for (const source of sources) {
      const { path, target } = source;

      if (!path || !target) {
        continue;
      }

      const value = this.getNestedValue(result, path);
      this.setNestedValue(result, target, value);
    }
  }

  /**
   * 过滤对象
   * @param result 结果对象
   * @param params 参数
   */
  private filterObject(result: unknown, params: unknown): void {
    const { paths } = params as { paths: string[] };

    if (!paths || !Array.isArray(paths)) {
      return;
    }

    for (const path of paths) {
      const keys = path.split('.');
      let current = result as any;
      let parent = null;
      let lastKey = '';

      for (let i = 0; i < keys.length; i++) {
        if (!current || typeof current !== 'object') {
          break;
        }

        parent = current;
        lastKey = keys[i];
        current = current[keys[i]];
      }

      if (parent && lastKey) {
        delete parent[lastKey];
      }
    }
  }

  /**
   * 计算值
   * @param result 结果对象
   * @param params 参数
   * @param sourceData 源数据
   * @param context 上下文
   */
  private computeValue(result: unknown, params: unknown, sourceData: unknown, context?: unknown): void {
    const { target, expression, inputs } = params as { 
      target: string; 
      expression: string; 
      inputs: Record<string, string> 
    };

    if (!target || !expression) {
      return;
    }

    const inputValues: Record<string, unknown> = {};

    if (inputs && typeof inputs === 'object') {
      for (const [key, path] of Object.entries(inputs)) {
        if (typeof path === 'string') {
          inputValues[key] = this.getNestedValue(sourceData, path);
        }
      }
    }

    this.computeExpressionWithLlm(result, target, expression, inputValues, context).catch(
      (error) => {
        this.logger.error(`Error computing expression: ${error.message}`);
      },
    );
  }

  /**
   * 使用LLM计算表达式
   * @param result 结果对象
   * @param target 目标路径
   * @param expression 表达式
   * @param inputs 输入值
   * @param context 上下文
   */
  private async computeExpressionWithLlm(
    result: unknown,
    target: string,
    expression: string,
    inputs: unknown,
    context?: unknown,
  ): Promise<void> {
    const prompt = `根据以下表达式和输入值计算结果：

表达式：
${expression}

输入值：
${JSON.stringify(inputs, null, 2)}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请计算表达式的结果。只返回计算结果，不要有其他文本。`;

    try {
      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.1,
        maxTokens: 500,
      });

      let value;
      try {
        value = JSON.parse(response);
      } catch {
        value = response.trim();
      }

      this.setNestedValue(result, target, value);
    } catch (error) {
      this.logger.error(`Error computing expression with LLM: ${error.message}`);
    }
  }

  /**
   * Evaluate transformation quality
   * @param data Combined source and target data
   * @param transformationPath Transformation path
   * @param context Evaluation context
   * @returns Evaluation result
   */
  async evaluateTransformation(
    data: { source: unknown; target: unknown },
    transformationPath: unknown,
    context: unknown,
  ): Promise<any> {
    this.logger.debug('Evaluating transformation quality');
    
    try {
      const { source, target } = data;
      const { expectedOutcome } = context as any;
      
      // Get evaluation criteria from the transformation path
      const path = transformationPath as any;
      const strategy = path.recommendedStrategy || 'quality_evaluation';
      
      // Prepare the evaluation prompt
      const evaluationPrompt = `Evaluate the quality of the following data transformation:
      
      Source Data:
      ${JSON.stringify(source, null, 2)}
      
      Transformed Data:
      ${JSON.stringify(target, null, 2)}
      
      Expected Outcome:
      ${expectedOutcome}
      
      Evaluation Strategy: ${strategy}
      
      Please evaluate the transformation on the following criteria:
      1. Semantic Preservation (0-100): How well the meaning is preserved
      2. Structural Adaptability (0-100): How well the structure matches the target
      3. Information Completeness (0-100): How completely the information is transferred
      4. Overall Quality (0-100): Overall transformation quality
      
      Return the results in JSON format with the following structure:
      {
        "semanticPreservation": number,
        "structuralAdaptability": number,
        "informationCompleteness": number,
        "overallQuality": number,
        "strengths": [string],
        "weaknesses": [string],
        "recommendations": [string]
      }`;
      
      // Use LLM to generate the evaluation
      const evaluationJson = await this.llmRouterService.generateContent(evaluationPrompt);
      
      // Parse the evaluation result
      const evaluation = JSON.parse(evaluationJson);
      
      // Add timestamp
      evaluation.timestamp = new Date().toISOString();
      evaluation.strategy = strategy;
      
      return evaluation;
    } catch (error) {
      this.logger.error(`Error evaluating transformation: ${error.message}`, error.stack);
      return {
        semanticPreservation: 0,
        structuralAdaptability: 0,
        informationCompleteness: 0,
        overallQuality: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
