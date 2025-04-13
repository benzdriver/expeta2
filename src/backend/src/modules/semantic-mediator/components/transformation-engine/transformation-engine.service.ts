import { Injectable, Logger } from '@nestjs/common';
import { ITransformationEngine } from '../../interfaces/transformation-engine.interface';
import { SemanticDescriptor } from '../../interfaces/semantic-descriptor.interface';
import { LlmService } from '../../../../services/llm.service';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';

/**
 * 转换引擎服务
 * 生成和执行数据转换
 */
@Injectable()
export class TransformationEngineService implements ITransformationEngine {
  private readonly logger = new Logger(TransformationEngineService.name);
  private readonly transformationStrategies: Map<string, Function> = new Map();

  constructor(
    private readonly llmService: LlmService,
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
    context?: any,
  ): Promise<any> {
    this.logger.debug('Generating transformation path');
    
    const prompt = `
生成从源数据结构到目标数据结构的转换路径：

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
- recommendedStrategy: 建议的转换策略名称
`;

    try {
      const response = await this.llmService.generateContent(
        prompt,
        {
          temperature: 0.2,
          maxTokens: 2000,
        }
      );
      
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
  async executeTransformation(
    data: any,
    transformationPath: any,
    context?: any,
  ): Promise<any> {
    this.logger.debug('Executing transformation');
    
    const startTime = Date.now();
    let result: any;
    
    try {
      const strategyName = transformationPath.recommendedStrategy || 'default';
      
      if (!this.transformationStrategies.has(strategyName)) {
        this.logger.warn(`Transformation strategy '${strategyName}' not found, using default`);
      }
      
      const strategy = this.transformationStrategies.get(strategyName) || this.transformationStrategies.get('default');
      
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
    result: any,
    targetDescriptor: SemanticDescriptor,
    context?: any,
  ): Promise<{
    valid: boolean;
    issues?: any[];
  }> {
    this.logger.debug('Validating transformation result');
    
    const prompt = `
验证转换结果是否符合目标结构描述：

转换结果：
${JSON.stringify(result, null, 2)}

目标结构描述：
${JSON.stringify(targetDescriptor, null, 2)}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请验证结果是否符合目标结构的要求，并指出任何问题。

以JSON格式返回结果，包含以下字段：
- valid: 布尔值，表示结果是否有效
- issues: 问题数组，每个问题包含字段、描述和严重性
`;

    try {
      const response = await this.llmService.generateContent(
        prompt,
        {
          temperature: 0.1,
          maxTokens: 1500,
        }
      );
      
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
  async optimizeTransformationPath(
    transformationPath: any,
    metrics?: any,
  ): Promise<any> {
    this.logger.debug('Optimizing transformation path');
    
    const prompt = `
优化以下转换路径：

转换路径：
${JSON.stringify(transformationPath, null, 2)}

${metrics ? `性能指标：\n${JSON.stringify(metrics, null, 2)}\n` : ''}

请分析转换路径，并提供优化建议，包括：
1. 简化或合并转换步骤
2. 提高效率的方法
3. 更合适的转换策略

返回优化后的转换路径，保持与原始路径相同的JSON结构。
`;

    try {
      const response = await this.llmService.generateContent(
        prompt,
        {
          temperature: 0.2,
          maxTokens: 2000,
        }
      );
      
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
  async registerTransformationStrategy(name: string, strategy: Function): Promise<boolean> {
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
    data: any,
    transformationPath: any,
    context?: any,
  ): Promise<any> {
    this.logger.debug('Executing default transformation strategy');
    
    const result: any = {};
    
    if (transformationPath.mappings && Array.isArray(transformationPath.mappings)) {
      for (const mapping of transformationPath.mappings) {
        const { source, target, transform } = mapping;
        
        let value = this.getNestedValue(data, source);
        
        if (transform) {
          value = await this.applyTransformation(value, transform, context);
        }
        
        this.setNestedValue(result, target, value);
      }
    }
    
    if (transformationPath.transformations && Array.isArray(transformationPath.transformations)) {
      for (const transformation of transformationPath.transformations) {
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
    data: any,
    transformationPath: any,
    context?: any,
  ): Promise<any> {
    this.logger.debug('Executing LLM transformation strategy');
    
    const prompt = `
根据以下转换路径，将源数据转换为目标格式：

源数据：
${JSON.stringify(data, null, 2)}

转换路径：
${JSON.stringify(transformationPath, null, 2)}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请执行转换并返回结果。只返回转换后的JSON数据，不要有其他文本。
`;

    try {
      const response = await this.llmService.generateContent(
        prompt,
        {
          temperature: 0.1,
          maxTokens: 2000,
        }
      );
      
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
    data: any,
    transformationPath: any,
    context?: any,
  ): Promise<any> {
    this.logger.debug('Executing direct mapping strategy');
    
    const result: any = {};
    
    if (transformationPath.mappings && Array.isArray(transformationPath.mappings)) {
      for (const mapping of transformationPath.mappings) {
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
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      value = value[key];
    }
    
    return value;
  }

  /**
   * 设置嵌套值
   * @param obj 对象
   * @param path 路径
   * @param value 值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
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
  private async applyTransformation(value: any, transform: any, context?: any): Promise<any> {
    const { type, params } = transform;
    
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
  private formatValue(value: any, params: any): any {
    const { format } = params;
    
    if (!format) {
      return value;
    }
    
    switch (format) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'capitalize':
        return typeof value === 'string' ? 
          value.charAt(0).toUpperCase() + value.slice(1) : value;
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
  private convertValue(value: any, params: any): any {
    const { targetType } = params;
    
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
        return new Date(value).toISOString();
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
  private async transformWithLlm(value: any, params: any, context?: any): Promise<any> {
    const { instruction } = params;
    
    if (!instruction) {
      return value;
    }
    
    const prompt = `
根据以下指令转换值：

值：
${JSON.stringify(value, null, 2)}

指令：
${instruction}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请执行转换并返回结果。只返回转换后的值，不要有其他文本。
`;

    try {
      const response = await this.llmService.generateContent(
        prompt,
        {
          temperature: 0.1,
          maxTokens: 1000,
        }
      );
      
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
  private mergeObjects(result: any, params: any): void {
    const { sources } = params;
    
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
  private filterObject(result: any, params: any): void {
    const { paths } = params;
    
    if (!paths || !Array.isArray(paths)) {
      return;
    }
    
    for (const path of paths) {
      const keys = path.split('.');
      let current = result;
      let parent = null;
      let lastKey = '';
      
      for (let i = 0; i < keys.length - 1; i++) {
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
  private computeValue(result: any, params: any, sourceData: any, context?: any): void {
    const { target, expression, inputs } = params;
    
    if (!target || !expression) {
      return;
    }
    
    const inputValues: any = {};
    
    if (inputs && typeof inputs === 'object') {
      for (const [key, path] of Object.entries(inputs)) {
        if (typeof path === 'string') {
          inputValues[key] = this.getNestedValue(sourceData, path);
        }
      }
    }
    
    this.computeExpressionWithLlm(result, target, expression, inputValues, context)
      .catch(error => {
        this.logger.error(`Error computing expression: ${error.message}`);
      });
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
    result: any,
    target: string,
    expression: string,
    inputs: any,
    context?: any,
  ): Promise<void> {
    const prompt = `
根据以下表达式和输入值计算结果：

表达式：
${expression}

输入值：
${JSON.stringify(inputs, null, 2)}

${context ? `上下文信息：\n${JSON.stringify(context, null, 2)}\n` : ''}

请计算表达式的结果。只返回计算结果，不要有其他文本。
`;

    try {
      const response = await this.llmService.generateContent(
        prompt,
        {
          temperature: 0.1,
          maxTokens: 500,
        }
      );
      
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
}
