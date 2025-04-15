/**
 * 智能缓存接口
 * 存储成功的转换路径并学习使用模式
 */
export interface IIntelligentCache {
  /**
   * 存储转换路径
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @param transformationPath 转换路径
   * @param metadata 元数据
   * @returns 缓存条目ID
   */
  storeTransformationPath(
    sourceDescriptor: unknown,
    targetDescriptor: unknown,
    transformationPath: unknown,
    metadata?: unknown,
  ): Promise<string>;

  /**
   * 检索转换路径
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @param similarityThreshold 相似度阈值
   * @returns 转换路径
   */
  retrieveTransformationPath(
    sourceDescriptor: unknown,
    targetDescriptor: unknown,
    similarityThreshold?: number,
  ): Promise<Record<string, unknown>>;

  /**
   * 更新转换路径的使用统计
   * @param pathId 路径ID
   * @param metadata 元数据
   * @returns 是否成功
   */
  updateUsageStatistics(pathId: string, metadata?: unknown): Promise<boolean>;

  /**
   * 获取最常用的转换路径
   * @param limit 结果数量限制
   * @returns 转换路径数组
   */
  getMostUsedPaths(limit?: number): Promise<Record<string, unknown>[]>;

  /**
   * 获取最近使用的转换路径
   * @param limit 结果数量限制
   * @returns 转换路径数组
   */
  getRecentlyUsedPaths(limit?: number): Promise<Record<string, unknown>[]>;

  /**
   * 清除缓存
   * @param olderThan 清除早于指定时间的缓存
   * @returns 清除的条目数量
   */
  clearCache(olderThan?: Date): Promise<number>;

  /**
   * 分析使用模式
   * @returns 使用模式分析结果
   */
  analyzeUsagePatterns(): Promise<Record<string, unknown>>;
}
