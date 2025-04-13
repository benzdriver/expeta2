import { SemanticDescriptor } from './semantic-descriptor.interface';

/**
 * 转换引擎接口
 * 生成和执行数据转换
 */
export interface ITransformationEngine {
  /**
   * 生成转换路径
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @param context 上下文信息
   * @returns 转换路径
   */
  generateTransformationPath(
    sourceDescriptor: SemanticDescriptor,
    targetDescriptor: SemanticDescriptor,
    context?: any
  ): Promise<any>;

  /**
   * 执行转换
   * @param data 源数据
   * @param transformationPath 转换路径
   * @param context 上下文信息
   * @returns 转换后的数据
   */
  executeTransformation(
    data: any,
    transformationPath: any,
    context?: any
  ): Promise<any>;

  /**
   * 验证转换结果
   * @param result 转换结果
   * @param targetDescriptor 目标描述符
   * @param context 上下文信息
   * @returns 验证结果
   */
  validateTransformation(
    result: any,
    targetDescriptor: SemanticDescriptor,
    context?: any
  ): Promise<{
    valid: boolean;
    issues?: any[];
  }>;

  /**
   * 优化转换路径
   * @param transformationPath 转换路径
   * @param metrics 性能指标
   * @returns 优化后的转换路径
   */
  optimizeTransformationPath(
    transformationPath: any,
    metrics?: any
  ): Promise<any>;

  /**
   * 获取可用的转换策略
   * @returns 转换策略列表
   */
  getAvailableTransformationStrategies(): Promise<string[]>;

  /**
   * 注册自定义转换策略
   * @param name 策略名称
   * @param strategy 策略实现
   * @returns 是否成功
   */
  registerTransformationStrategy(name: string, strategy: Function): Promise<boolean>;
}
