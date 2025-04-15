import { SemanticDescriptor } from './semantic-descriptor.interface';

/**
 * 语义注册表接口
 * 管理数据源及其语义描述
 */
export interface ISemanticRegistry {
  /**
   * 注册数据源
   * @param moduleId 模块ID
   * @param semanticDescriptor 语义描述符
   * @param accessMethod 访问方法
   * @returns 数据源ID
   */
  registerDataSource(
    moduleId: string,
    semanticDescriptor: SemanticDescriptor,
    accessMethod: (params?: unknown) => Promise<unknown>,
  ): Promise<string>;

  /**
   * 更新数据源
   * @param sourceId 数据源ID
   * @param semanticDescriptor 语义描述符
   * @param accessMethod 访问方法
   * @returns 是否成功
   */
  updateDataSource(
    sourceId: string,
    semanticDescriptor?: SemanticDescriptor,
    accessMethod?: (params?: unknown) => Promise<unknown>,
  ): Promise<boolean>;

  /**
   * 删除数据源
   * @param sourceId 数据源ID
   * @returns 是否成功
   */
  removeDataSource(sourceId: string): Promise<boolean>;

  /**
   * 获取数据源
   * @param sourceId 数据源ID
   * @returns 数据源信息
   */
  getDataSource(sourceId: string): Promise<any>;

  /**
   * 查找潜在的数据源
   * @param intent 意图
   * @param threshold 相似度阈值
   * @returns 数据源ID数组
   */
  findPotentialSources(intent: unknown, threshold?: number): Promise<string[]>;

  /**
   * 获取所有数据源
   * @param moduleId 可选的模块ID过滤
   * @returns 数据源信息数组
   */
  getAllDataSources(moduleId?: string): Promise<any[]>;

  /**
   * 计算语义相似度
   * @param sourceDescriptor 源描述符
   * @param targetIntent 目标意图
   * @returns 相似度分数
   */
  calculateSemanticSimilarity(
    sourceDescriptor: SemanticDescriptor,
    targetIntent: unknown,
  ): Promise<number>;
}
