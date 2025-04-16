import { Injectable, Logger } from '@nestjs/common';
import { IIntelligentCache } from '../../interfaces/intelligent-cache.interface';
import { MemoryService } from '../../../memory/memory.service';
import { LlmRouterService } from '../../../../services/llm-router.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';
import { v4 as uuidv4 } from 'uuid';
import { MemoryAdapter } from './memory.adapter';
import { DataAccessService } from '../../../memory/services/data-access.service';
import { CacheAccessService } from '../../../memory/services/cache-access.service';

/**
 * 智能缓存服务
 * 存储成功的转换路径并学习使用模式
 */
@Injectable()
export class IntelligentCacheService implements IIntelligentCache {
  private readonly logger = new Logger(IntelligentCacheService.name);
  private readonly cachePrefix = MemoryType.SEMANTIC_TRANSFORMATION;
  private readonly memoryAdapter: MemoryAdapter;
  
  // 预测缓存配置
  private predictiveCacheEnabled = true;
  private predictiveThreshold = 0.75;
  private adaptiveThresholds = {
    highUsage: 10, // 高使用率阈值
    recentTimeWindow: 7 * 24 * 60 * 60 * 1000, // 一周内为最近使用
  };

  constructor(
    private readonly memoryService: MemoryService,
    private readonly llmRouterService: LlmRouterService,
    private readonly dataAccessService?: DataAccessService,
    private readonly cacheAccessService?: CacheAccessService,
  ) {
    // 创建内存适配器
    this.memoryAdapter = new MemoryAdapter(memoryService, dataAccessService, cacheAccessService);
    // 定期清理长时间未使用的缓存
    this.setupPeriodicCleanup();
  }

  /**
   * 设置定期清理任务
   * @private
   */
  private setupPeriodicCleanup(): void {
    const cleanupInterval = 24 * 60 * 60 * 1000; // 每24小时
    setInterval(async () => {
      const date = new Date();
      date.setMonth(date.getMonth() - 3); // 清理3个月前未使用的缓存
      await this.clearCache(date);
    }, cleanupInterval);
  }

  /**
   * 存储转换路径
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @param transformationPath 转换路径
   * @param metadata 元数据
   * @returns 缓存条目ID
   */
  async storeTransformationPath(
    sourceDescriptor: unknown,
    targetDescriptor: unknown,
    transformationPath: unknown,
    metadata?: unknown,
  ): Promise<string> {
    this.logger.debug('Storing transformation path');

    const cacheId = uuidv4();

    const savedMemory = await this.memoryAdapter.storeMemory({
      type: this.cachePrefix,
      content: {
        id: cacheId,
        sourceDescriptor,
        targetDescriptor,
        transformationPath,
        usageCount: 1,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        metadata: metadata || {},
      },
    });

    this.logger.debug(`Transformation path stored with ID: ${cacheId}`);
    return cacheId;
  }

  /**
   * 检索转换路径
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @param similarityThreshold 相似度阈值
   * @returns 转换路径
   */
  async retrieveTransformationPath(
    sourceDescriptor: unknown,
    targetDescriptor: unknown,
    similarityThreshold: number = 0.85,
  ): Promise<any> {
    this.logger.debug('Retrieving transformation path');
    
    // 从语义指纹查找相似缓存
    const semanticKey = await this.generateSemanticKey(sourceDescriptor, targetDescriptor);
    const cachedResult = await this.memoryAdapter.queryMemories(
      this.cachePrefix as MemoryType,
      { semanticKey } as any,
    );
    
    // 如果有精确匹配，直接返回
    if (cachedResult && cachedResult.length > 0) {
      const exactMatch = cachedResult.find(entry => {
        const entrySemanticKey = entry.content.semanticKey || '';
        return entrySemanticKey === semanticKey;
      });
      
      if (exactMatch) {
        this.logger.debug(`Found exact matching transformation path with ID: ${exactMatch.content.id}`);
        await this.updateUsageStatistics(exactMatch.content.id);
        return exactMatch.content.transformationPath;
      }
    }

    // 否则进行相似度搜索
    const allCacheEntries = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);

    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return null;
    }

    let bestMatch = null;
    let highestSimilarity = 0;

    // 首先检查带有semanticKey的条目
    const entriesWithSemanticKeys = allCacheEntries.filter(entry => entry.content.semanticKey);
    
    // 如果有带语义键的条目，优先从这些条目中寻找匹配
    if (entriesWithSemanticKeys.length > 0) {
      for (const entry of entriesWithSemanticKeys) {
        if (!entry.content.similarityCache) {
          entry.content.similarityCache = {};
        }
        
        // 检查是否有缓存的相似度结果
        const cacheKey = `${semanticKey}_${entry.content.semanticKey}`;
        let combinedSimilarity = entry.content.similarityCache[cacheKey];
        
        if (combinedSimilarity === undefined) {
          // 计算语义键相似度
          combinedSimilarity = await this.calculateSemanticKeySimilarity(
            semanticKey,
            entry.content.semanticKey
          );
          
          // 缓存相似度结果
          entry.content.similarityCache[cacheKey] = combinedSimilarity;
          
          // 更新内存缓存
          await this.memoryAdapter.updateMemory(this.cachePrefix as MemoryType, entry._id, {
            content: {
              ...entry.content,
              similarityCache: entry.content.similarityCache
            }
          });
        }
        
        if (combinedSimilarity > highestSimilarity && combinedSimilarity >= similarityThreshold) {
          highestSimilarity = combinedSimilarity;
          bestMatch = entry.content;
        }
      }
    }
    
    // 如果没有找到匹配，回退到传统计算方法
    if (!bestMatch) {
      for (const entry of allCacheEntries) {
        const cachedSourceDescriptor = entry.content.sourceDescriptor;
        const cachedTargetDescriptor = entry.content.targetDescriptor;
  
        const sourceSimilarity = await this.calculateDescriptorSimilarity(
          sourceDescriptor,
          cachedSourceDescriptor,
        );
  
        const targetSimilarity = await this.calculateDescriptorSimilarity(
          targetDescriptor,
          cachedTargetDescriptor,
        );
  
        // 加权计算相似度得分
        const combinedSimilarity = (sourceSimilarity * 0.6) + (targetSimilarity * 0.4);
  
        if (combinedSimilarity > highestSimilarity && combinedSimilarity >= similarityThreshold) {
          highestSimilarity = combinedSimilarity;
          bestMatch = entry.content;
        }
      }
    }

    if (bestMatch) {
      this.logger.debug(`Found matching transformation path with ID: ${bestMatch.id}`);
      
      // 检查是否是传统匹配模式，如果是则添加语义键
      if (!bestMatch.semanticKey) {
        bestMatch.semanticKey = await this.generateSemanticKey(
          bestMatch.sourceDescriptor,
          bestMatch.targetDescriptor
        );
        
        await this.memoryAdapter.storeMemory({
          type: this.cachePrefix,
          content: {
            ...bestMatch,
            semanticKey: bestMatch.semanticKey,
            similarityCache: {}
          },
        });
      }
      
      await this.updateUsageStatistics(bestMatch.id);
      return bestMatch.transformationPath;
    }

    this.logger.debug('No matching transformation path found');
    return null;
  }
  
  /**
   * 生成源和目标描述符的语义键
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @returns 语义键
   */
  private async generateSemanticKey(sourceDescriptor: unknown, targetDescriptor: unknown): Promise<string> {
    try {
      // 提取关键特征
      const sourceType = this.extractEntityType(sourceDescriptor);
      const targetType = this.extractEntityType(targetDescriptor);
      
      // 生成指纹
      const sourceFingerprint = JSON.stringify(this.extractKeyFields(sourceDescriptor));
      const targetFingerprint = JSON.stringify(this.extractKeyFields(targetDescriptor));
      
      // 使用MD5或其他快速哈希算法生成指纹
      // 注意：在生产环境中，建议使用加密库生成散列
      const combinedString = `${sourceType}:${sourceFingerprint}#${targetType}:${targetFingerprint}`;
      
      // 简化处理，直接使用字符串（实际应该使用哈希函数）
      return combinedString;
    } catch (error) {
      this.logger.error(`Error generating semantic key: ${error.message}`);
      // 生成一个唯一的回退键
      return `fallback:${Date.now()}:${Math.random().toString(36).substring(2)}`;
    }
  }
  
  /**
   * 提取实体类型
   * @param descriptor 描述符
   * @returns 实体类型
   */
  private extractEntityType(descriptor: any): string {
    if (!descriptor) return 'unknown';
    
    if (typeof descriptor === 'object') {
      if (descriptor.type) return descriptor.type;
      if (descriptor.entity) return descriptor.entity;
      if (descriptor.entityType) return descriptor.entityType;
    }
    
    return 'unknown';
  }
  
  /**
   * 提取描述符中的关键字段
   * @param descriptor 描述符
   * @returns 关键字段对象
   */
  private extractKeyFields(descriptor: any): Record<string, any> {
    if (!descriptor || typeof descriptor !== 'object') return {};
    
    const keyFields: Record<string, any> = {};
    
    // 提取关键字段（这里需要根据实际描述符结构调整）
    if (descriptor.type) keyFields.type = descriptor.type;
    if (descriptor.entity) keyFields.entity = descriptor.entity;
    if (descriptor.schema) keyFields.schema = this.simplifySchema(descriptor.schema);
    if (descriptor.components) keyFields.componentTypes = 
      Array.isArray(descriptor.components) 
        ? descriptor.components.map(c => this.extractEntityType(c))
        : [];
    
    return keyFields;
  }
  
  /**
   * 简化模式对象，提取关键结构信息
   * @param schema 模式对象
   * @returns 简化的模式信息
   */
  private simplifySchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return {};
    
    // 简化处理，仅提取字段名和类型
    if (schema.properties && typeof schema.properties === 'object') {
      const simplifiedProps: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(schema.properties)) {
        if (typeof value === 'object' && (value as any).type) {
          simplifiedProps[key] = (value as any).type;
        } else {
          simplifiedProps[key] = typeof value;
        }
      }
      
      return { properties: simplifiedProps };
    }
    
    return schema;
  }
  
  /**
   * 计算两个语义键之间的相似度
   * @param keyA 语义键A
   * @param keyB 语义键B
   * @returns 相似度分数
   */
  private async calculateSemanticKeySimilarity(keyA: string, keyB: string): Promise<number> {
    if (keyA === keyB) return 1.0; // 完全匹配
    
    try {
      // 解析键
      const [sourceTypeA, sourceDataA, targetTypeA, targetDataA] = this.parseSemanticKey(keyA);
      const [sourceTypeB, sourceDataB, targetTypeB, targetDataB] = this.parseSemanticKey(keyB);
      
      // 计算类型匹配度
      const typeMatch = (sourceTypeA === sourceTypeB && targetTypeA === targetTypeB) ? 0.3 : 0;
      
      // 计算数据相似度
      let dataSimScore = 0;
      
      // 计算源数据相似度
      if (sourceDataA && sourceDataB) {
        try {
          const sourceObjA = JSON.parse(sourceDataA);
          const sourceObjB = JSON.parse(sourceDataB);
          dataSimScore += 0.35 * this.calculateObjectSimilarity(sourceObjA, sourceObjB);
        } catch (e) {
          // 解析错误时降级为字符串比较
          dataSimScore += 0.35 * (sourceDataA === sourceDataB ? 1 : 0);
        }
      }
      
      // 计算目标数据相似度
      if (targetDataA && targetDataB) {
        try {
          const targetObjA = JSON.parse(targetDataA);
          const targetObjB = JSON.parse(targetDataB);
          dataSimScore += 0.35 * this.calculateObjectSimilarity(targetObjA, targetObjB);
        } catch (e) {
          // 解析错误时降级为字符串比较
          dataSimScore += 0.35 * (targetDataA === targetDataB ? 1 : 0);
        }
      }
      
      return typeMatch + dataSimScore;
    } catch (error) {
      this.logger.error(`Error calculating semantic key similarity: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * 解析语义键
   * @param semanticKey 语义键
   * @returns 解析后的组件数组 [sourceType, sourceData, targetType, targetData]
   */
  private parseSemanticKey(semanticKey: string): [string, string, string, string] {
    try {
      const [sourcePart, targetPart] = semanticKey.split('#');
      
      if (!sourcePart || !targetPart) {
        return ['unknown', '{}', 'unknown', '{}'];
      }
      
      const [sourceType, sourceData] = sourcePart.split(':');
      const [targetType, targetData] = targetPart.split(':');
      
      return [sourceType || 'unknown', sourceData || '{}', targetType || 'unknown', targetData || '{}'];
    } catch (error) {
      return ['unknown', '{}', 'unknown', '{}'];
    }
  }
  
  /**
   * 计算两个对象之间的相似度
   * @param objA 对象A
   * @param objB 对象B
   * @returns 相似度分数
   */
  private calculateObjectSimilarity(objA: any, objB: any): number {
    // 简单实现：基于键的匹配度
    if (!objA || !objB) return 0;
    if (typeof objA !== 'object' || typeof objB !== 'object') return 0;
    
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    
    if (keysA.length === 0 && keysB.length === 0) return 1;
    if (keysA.length === 0 || keysB.length === 0) return 0;
    
    // 计算共有键的数量
    const commonKeys = keysA.filter(key => keysB.includes(key));
    
    // 基础相似度：共有键 / 所有唯一键
    const uniqueKeys = new Set([...keysA, ...keysB]);
    const baseSimilarity = commonKeys.length / uniqueKeys.size;
    
    // 如果有共有键，进一步计算值的相似度
    if (commonKeys.length > 0) {
      let valuesSimilarity = 0;
      
      for (const key of commonKeys) {
        const valA = objA[key];
        const valB = objB[key];
        
        // 对于简单类型，检查是否相等
        if (typeof valA !== 'object' && typeof valB !== 'object') {
          valuesSimilarity += (valA === valB) ? 1 : 0;
        } 
        // 对于对象类型，递归计算相似度
        else if (typeof valA === 'object' && typeof valB === 'object') {
          valuesSimilarity += this.calculateObjectSimilarity(valA, valB);
        }
        // 类型不匹配
        else {
          valuesSimilarity += 0;
        }
      }
      
      // 平均值相似度
      const avgValueSimilarity = valuesSimilarity / commonKeys.length;
      
      // 最终相似度：(基础相似度 + 值相似度) / 2
      return (baseSimilarity + avgValueSimilarity) / 2;
    }
    
    return baseSimilarity;
  }

  /**
   * 更新转换路径的使用统计
   * @param pathId 路径ID
   * @param metadata 元数据
   * @returns 是否成功
   */
  async updateUsageStatistics(pathId: string, metadata?: unknown): Promise<boolean> {
    this.logger.debug(`Updating usage statistics for path ID: ${pathId}`);

    const allCacheEntries = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);

    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return false;
    }

    const targetEntry = allCacheEntries.find(entry => entry.content.id === pathId);

    if (!targetEntry) {
      this.logger.debug(`Cache entry with ID ${pathId} not found`);
      return false;
    }

    const updatedContent = {
      ...targetEntry.content,
      usageCount: (targetEntry.content.usageCount || 0) + 1,
      lastUsed: new Date().toISOString(),
    };

    if (metadata) {
      updatedContent.metadata = {
        ...(updatedContent.metadata || {}),
        ...metadata as Record<string, any>,
      };
    }

    await this.memoryAdapter.storeMemory({
      type: this.cachePrefix,
      content: updatedContent,
    });

    this.logger.debug(`Usage statistics updated for path ID: ${pathId}`);
    return true;
  }

  /**
   * 获取最常用的转换路径
   * @param limit 结果数量限制
   * @returns 转换路径数组
   */
  async getMostUsedPaths(limit: number = 10): Promise<any[]> {
    this.logger.debug(`Getting most used paths (limit: ${limit})`);

    const allCacheEntries = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);

    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return [];
    }

    const sortedEntries = allCacheEntries
      .map((entry) => entry.content)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);

    this.logger.debug(`Retrieved ${sortedEntries.length} most used paths`);
    return sortedEntries;
  }

  /**
   * 获取最近使用的转换路径
   * @param limit 结果数量限制
   * @returns 转换路径数组
   */
  async getRecentlyUsedPaths(limit: number = 10): Promise<any[]> {
    this.logger.debug(`Getting recently used paths (limit: ${limit})`);

    const allCacheEntries = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);

    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return [];
    }

    const sortedEntries = allCacheEntries
      .map((entry) => entry.content)
      .sort((a, b) => {
        const dateA = new Date(a.lastUsed || a.createdAt);
        const dateB = new Date(b.lastUsed || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);

    this.logger.debug(`Retrieved ${sortedEntries.length} recently used paths`);
    return sortedEntries;
  }

  /**
   * 清除缓存
   * @param olderThan 清除早于指定时间的缓存
   * @returns 清除的条目数量
   */
  async clearCache(olderThan?: Date): Promise<number> {
    this.logger.debug('Clearing cache');

    const allCacheEntries = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);

    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return 0;
    }

    let clearedCount = 0;

    if (olderThan) {
      const olderThanTime = olderThan.getTime();

      for (const entry of allCacheEntries) {
        const lastUsedDate = new Date(entry.content.lastUsed || entry.content.createdAt);

        if (lastUsedDate.getTime() < olderThanTime) {
          await this.memoryAdapter.storeMemory({
            type: MemoryType.SYSTEM,
            content: {
              originalType: this.cachePrefix,
              id: entry.content.id,
              status: 'deleted',
              deletedAt: new Date().toISOString(),
            },
          });

          clearedCount++;
        }
      }
    } else {
      clearedCount = allCacheEntries.length;

      for (const entry of allCacheEntries) {
        await this.memoryAdapter.storeMemory({
          type: MemoryType.SYSTEM,
          content: {
            originalType: this.cachePrefix,
            id: entry.content.id,
            status: 'deleted',
            deletedAt: new Date().toISOString(),
          },
        });
      }
    }

    this.logger.debug(`Cleared ${clearedCount} cache entries`);
    return clearedCount;
  }

  /**
   * 分析使用模式
   * @returns 使用模式分析结果
   */
  async analyzeUsagePatterns(): Promise<any> {
    this.logger.debug('Analyzing usage patterns');

    const allCacheEntries = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);

    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return {
        patterns: [],
        insights: 'No usage data available for analysis',
      };
    }

    const usageData = allCacheEntries.map(entry => ({
      id: entry.content.id,
      sourceType: entry.content.sourceDescriptor.entity,
      targetType: entry.content.targetDescriptor.entity,
      usageCount: entry.content.usageCount || 0,
      lastUsed: entry.content.lastUsed || entry.content.createdAt,
      createdAt: entry.content.createdAt,
      metadata: entry.content.metadata || {},
    }));

    const analysisPrompt = `
分析以下转换路径的使用模式：

${JSON.stringify(usageData, null, 2)}

请提供以下信息：
1. 最常用的转换类型（源类型到目标类型）
2. 使用频率随时间的变化趋势
3. 可能的优化建议
4. 任何其他有价值的见解

以JSON格式返回结果，包含patterns数组和insights字符串。
`;

    try {
      const analysisResult = await this.llmRouterService.generateContent(analysisPrompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const parsedResult = JSON.parse(analysisResult);
      this.logger.debug('Usage pattern analysis completed');
      
      // 自适应优化：根据分析结果调整阈值
      this.adjustAdaptiveSettings(parsedResult);
      
      return parsedResult;
    } catch (error) {
      this.logger.error(`Error analyzing usage patterns: ${error.message}`);
      return {
        patterns: [],
        insights: 'Failed to analyze usage patterns due to an error',
        error: error.message,
      };
    }
  }

  /**
   * 调整自适应缓存设置
   * @param analysisResult 使用模式分析结果
   */
  private adjustAdaptiveSettings(analysisResult: any): void {
    try {
      // 如果有特定优化建议，调整阈值
      if (analysisResult.recommendations && analysisResult.recommendations.length > 0) {
        // 检查是否有提高/降低阈值的建议
        const thresholdRecommendation = analysisResult.recommendations.find(
          (r: string) => r.toLowerCase().includes('threshold') || r.toLowerCase().includes('阈值')
        );
        
        if (thresholdRecommendation) {
          if (thresholdRecommendation.toLowerCase().includes('lower') || 
              thresholdRecommendation.toLowerCase().includes('降低')) {
            this.predictiveThreshold = Math.max(0.65, this.predictiveThreshold - 0.05);
            this.logger.log(`Adaptive adjustment: Lowered predictive threshold to ${this.predictiveThreshold}`);
          } else if (thresholdRecommendation.toLowerCase().includes('higher') || 
                     thresholdRecommendation.toLowerCase().includes('提高')) {
            this.predictiveThreshold = Math.min(0.95, this.predictiveThreshold + 0.05);
            this.logger.log(`Adaptive adjustment: Raised predictive threshold to ${this.predictiveThreshold}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error adjusting adaptive settings: ${error.message}`);
    }
  }

  /**
   * 基于使用模式预测将需要的转换路径
   * @param moduleContext 当前模块上下文
   * @returns 可能需要的转换路径
   */
  async predictNeededTransformations(moduleContext: any): Promise<any[]> {
    if (!this.predictiveCacheEnabled) {
      return [];
    }

    this.logger.debug('Predicting needed transformations');
    
    try {
      // 1. 获取最近和最常用的路径
      const recentPaths = await this.getRecentlyUsedPaths(5);
      const mostUsedPaths = await this.getMostUsedPaths(5);
      
      // 2. 组合使用频率和最近使用情况的候选集
      const candidatePaths = [...new Set([...recentPaths, ...mostUsedPaths])];
      
      // 3. 计算每个候选路径的预测分数
      const scoredPaths = await Promise.all(
        candidatePaths.map(async (path) => {
          const contextSimilarity = await this.calculateContextSimilarity(
            path.metadata?.context || {},
            moduleContext
          );
          
          // 计算最近使用加分
          const lastUsedDate = new Date(path.lastUsed || path.createdAt);
          const now = new Date();
          const timeScore = Math.max(
            0, 
            1 - ((now.getTime() - lastUsedDate.getTime()) / this.adaptiveThresholds.recentTimeWindow)
          );
          
          // 使用频率加分
          const usageScore = Math.min(1, path.usageCount / this.adaptiveThresholds.highUsage);
          
          // 综合评分：上下文相似度(50%) + 时间近期性(25%) + 使用频率(25%)
          const predictionScore = (contextSimilarity * 0.5) + (timeScore * 0.25) + (usageScore * 0.25);
          
          return {
            path,
            score: predictionScore
          };
        })
      );
      
      // 4. 筛选高于预测阈值的路径
      const predictedPaths = scoredPaths
        .filter(item => item.score >= this.predictiveThreshold)
        .sort((a, b) => b.score - a.score)
        .map(item => item.path);
      
      this.logger.debug(`Predicted ${predictedPaths.length} potentially needed transformations`);
      return predictedPaths;
    } catch (error) {
      this.logger.error(`Error predicting needed transformations: ${error.message}`);
      return [];
    }
  }

  /**
   * 计算上下文相似度
   * @param contextA 上下文A
   * @param contextB 上下文B
   * @returns 相似度分数
   */
  private async calculateContextSimilarity(contextA: unknown, contextB: unknown): Promise<number> {
    // 如果上下文为空，返回低相似度
    if (!contextA || !contextB) {
      return 0.3; // 默认低相似度
    }
    
    try {
      const prompt = `
计算以下两个上下文环境之间的相似度：

上下文A：
${JSON.stringify(contextA, null, 2)}

上下文B：
${JSON.stringify(contextB, null, 2)}

请分析这两个上下文环境的语义相似度，并返回一个0到1之间的数值，其中0表示完全不相关，1表示完全匹配。
只返回数值，不要有其他文本。
`;

      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.1,
        maxTokens: 10,
      });

      const similarityScore = parseFloat(response.trim());
      return isNaN(similarityScore) ? 0.3 : Math.max(0, Math.min(1, similarityScore));
    } catch (error) {
      this.logger.error(`Error calculating context similarity: ${error.message}`);
      return 0.3;
    }
  }

  /**
   * 计算描述符相似度
   * @param descriptorA 描述符A
   * @param descriptorB 描述符B
   * @returns 相似度分数
   */
  private async calculateDescriptorSimilarity(descriptorA: unknown, descriptorB: unknown): Promise<number> {
    const prompt = `
计算以下两个描述符之间的相似度：

描述符A：
${JSON.stringify(descriptorA, null, 2)}

描述符B：
${JSON.stringify(descriptorB, null, 2)}

请分析这两个描述符的语义相似度，并返回一个0到1之间的数值，其中0表示完全不相关，1表示完全匹配。
只返回数值，不要有其他文本。
`;

    try {
      const response = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.1,
        maxTokens: 10,
      });

      const similarityScore = parseFloat(response.trim());
      return isNaN(similarityScore) ? 0 : Math.max(0, Math.min(1, similarityScore));
    } catch (error) {
      this.logger.error(`Error calculating descriptor similarity: ${error.message}`);
      return 0;
    }
  }

  /**
   * 针对特定模块路径预热缓存
   * @param modules 需要预热的模块名称数组
   * @returns 预热的缓存路径数量
   */
  async preloadCacheForModules(modules: string[]): Promise<number> {
    this.logger.debug(`Preloading cache for modules: ${modules.join(', ')}`);
    
    try {
      // 创建模块间可能的转换组合
      const transformationPairs: {source: string, target: string}[] = [];
      
      // 创建所有可能的模块对
      for (let i = 0; i < modules.length; i++) {
        for (let j = 0; j < modules.length; j++) {
          if (i !== j) {
            transformationPairs.push({
              source: modules[i],
              target: modules[j]
            });
          }
        }
      }
      
      let preloadedCount = 0;
      
      // 对每个模块对，获取现有的转换路径
      for (const pair of transformationPairs) {
        const existingPaths = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);
        
        // 筛选相关的转换路径
        const relevantPaths = existingPaths.filter(entry => 
          entry.content.metadata && 
          entry.content.metadata.sourceModule === pair.source && 
          entry.content.metadata.targetModule === pair.target
        );
        
        if (relevantPaths.length > 0) {
          // 预加载这些路径（简单地触发缓存更新）
          for (const path of relevantPaths) {
            await this.updateUsageStatistics(path.content.id, {
              preloaded: true,
              timestamp: new Date().toISOString()
            });
            preloadedCount++;
          }
        }
      }
      
      this.logger.debug(`Preloaded ${preloadedCount} cache paths for specified modules`);
      return preloadedCount;
    } catch (error) {
      this.logger.error(`Error preloading cache for modules: ${error.message}`);
      return 0;
    }
  }

  /**
   * 根据转换历史推荐缓存优化策略
   * @returns 优化建议
   */
  async recommendCacheOptimizations(): Promise<any> {
    this.logger.debug('Generating cache optimization recommendations');
    
    try {
      // 1. 获取使用模式分析
      const usagePatterns = await this.analyzeUsagePatterns();
      
      // 2. 获取缓存统计信息
      const allCacheEntries = await this.memoryAdapter.getMemoryByType(this.cachePrefix as MemoryType);
      const totalEntries = allCacheEntries ? allCacheEntries.length : 0;
      
      let unusedEntries = 0;
      let highUsageEntries = 0;
      
      if (allCacheEntries && allCacheEntries.length > 0) {
        unusedEntries = allCacheEntries.filter(
          entry => (entry.content.usageCount || 0) <= 1
        ).length;
        
        highUsageEntries = allCacheEntries.filter(
          entry => (entry.content.usageCount || 0) >= this.adaptiveThresholds.highUsage
        ).length;
      }
      
      // 3. 生成优化建议
      const prompt = `
基于以下缓存使用情况，推荐优化策略：

1. 总缓存条目数: ${totalEntries}
2. 未使用或低使用率条目数: ${unusedEntries}
3. 高使用率条目数: ${highUsageEntries}
4. 使用模式分析:
${JSON.stringify(usagePatterns, null, 2)}

请推荐:
1. 应该保留哪些类型的缓存
2. 应该清理哪些类型的缓存
3. 阈值是否需要调整
4. 其他可以提高缓存效率的建议

以JSON格式返回，包含以下字段:
- retainTypes: 应保留的缓存类型数组
- purgeTypes: 应清理的缓存类型数组
- thresholdAdjustments: 阈值调整建议对象
- additionalSuggestions: 其他建议数组
`;

      const optimizationResult = await this.llmRouterService.generateContent(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });
      
      const parsedRecommendations = JSON.parse(optimizationResult);
      
      // 自动应用简单的优化建议
      if (parsedRecommendations.thresholdAdjustments) {
        if (parsedRecommendations.thresholdAdjustments.predictiveThreshold) {
          this.predictiveThreshold = parsedRecommendations.thresholdAdjustments.predictiveThreshold;
          this.logger.log(`Applied recommended predictive threshold: ${this.predictiveThreshold}`);
        }
        
        if (parsedRecommendations.thresholdAdjustments.highUsage) {
          this.adaptiveThresholds.highUsage = parsedRecommendations.thresholdAdjustments.highUsage;
          this.logger.log(`Applied recommended high usage threshold: ${this.adaptiveThresholds.highUsage}`);
        }
      }
      
      this.logger.debug('Generated cache optimization recommendations');
      return parsedRecommendations;
    } catch (error) {
      this.logger.error(`Error recommending cache optimizations: ${error.message}`);
      return {
        retainTypes: [],
        purgeTypes: [],
        thresholdAdjustments: {},
        additionalSuggestions: [
          'Failed to generate optimization recommendations due to an error'
        ],
        error: error.message
      };
    }
  }
}
