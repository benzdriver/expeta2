import { Injectable, Logger } from '@nestjs/common';
import { IIntelligentCache } from '../../interfaces/intelligent-cache.interface';
import { MemoryService } from '../../../memory/memory.service';
import { LlmService } from '../../../../services/llm.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';

/**
 * 智能缓存服务
 * 存储成功的转换路径并学习使用模式
 */
@Injectable()
export class IntelligentCacheService implements IIntelligentCache {
  private readonly logger = new Logger(IntelligentCacheService.name);
  private readonly cachePrefix = MemoryType.SEMANTIC_TRANSFORMATION;

  constructor(
    private readonly memoryService: MemoryService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * 存储转换路径
   * @param sourceDescriptor 源描述符
   * @param targetDescriptor 目标描述符
   * @param transformationPath 转换路径
   * @param metadata 元数据
   * @returns 缓存条目ID
   */
  async storeTransformationPath(
    sourceDescriptor: any,
    targetDescriptor: any,
    transformationPath: any,
    metadata?: any,
  ): Promise<string> {
    this.logger.debug('Storing transformation path');
    
    const cacheId = `${this.cachePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await this.memoryService.storeMemory({
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
    sourceDescriptor: any,
    targetDescriptor: any,
    similarityThreshold: number = 0.85,
  ): Promise<any> {
    this.logger.debug('Retrieving transformation path');
    
    const allCacheEntries = await this.memoryService.getMemoryByType(this.cachePrefix);
    
    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return null;
    }
    
    let bestMatch = null;
    let highestSimilarity = 0;
    
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
      
      const combinedSimilarity = (sourceSimilarity + targetSimilarity) / 2;
      
      if (combinedSimilarity > highestSimilarity && combinedSimilarity >= similarityThreshold) {
        highestSimilarity = combinedSimilarity;
        bestMatch = entry.content;
      }
    }
    
    if (bestMatch) {
      this.logger.debug(`Found matching transformation path with ID: ${bestMatch.id}`);
      await this.updateUsageStatistics(bestMatch.id);
      return bestMatch.transformationPath;
    }
    
    this.logger.debug('No matching transformation path found');
    return null;
  }

  /**
   * 更新转换路径的使用统计
   * @param pathId 路径ID
   * @param metadata 元数据
   * @returns 是否成功
   */
  async updateUsageStatistics(
    pathId: string,
    metadata?: any,
  ): Promise<boolean> {
    this.logger.debug(`Updating usage statistics for path ID: ${pathId}`);
    
    const allCacheEntries = await this.memoryService.getMemoryByType(this.cachePrefix);
    
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
        ...updatedContent.metadata,
        ...metadata,
      };
    }
    
    await this.memoryService.storeMemory({
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
    
    const allCacheEntries = await this.memoryService.getMemoryByType(this.cachePrefix);
    
    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return [];
    }
    
    const sortedEntries = allCacheEntries
      .map(entry => entry.content)
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
    
    const allCacheEntries = await this.memoryService.getMemoryByType(this.cachePrefix);
    
    if (!allCacheEntries || allCacheEntries.length === 0) {
      this.logger.debug('No cache entries found');
      return [];
    }
    
    const sortedEntries = allCacheEntries
      .map(entry => entry.content)
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
    
    const allCacheEntries = await this.memoryService.getMemoryByType(this.cachePrefix);
    
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
          await this.memoryService.storeMemory({
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
        await this.memoryService.storeMemory({
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
    
    const allCacheEntries = await this.memoryService.getMemoryByType(this.cachePrefix);
    
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
      const analysisResult = await this.llmService.generateContent(
        analysisPrompt,
        {
          temperature: 0.3,
          maxTokens: 2000,
        }
      );
      
      const parsedResult = JSON.parse(analysisResult);
      this.logger.debug('Usage pattern analysis completed');
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
   * 计算描述符相似度
   * @param descriptorA 描述符A
   * @param descriptorB 描述符B
   * @returns 相似度分数
   */
  private async calculateDescriptorSimilarity(
    descriptorA: any,
    descriptorB: any,
  ): Promise<number> {
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
      const response = await this.llmService.generateContent(
        prompt,
        {
          temperature: 0.1,
          maxTokens: 10,
        }
      );

      const similarityScore = parseFloat(response.trim());
      return isNaN(similarityScore) ? 0 : Math.max(0, Math.min(1, similarityScore));
    } catch (error) {
      this.logger.error(`Error calculating descriptor similarity: ${error.message}`);
      return 0;
    }
  }
}
