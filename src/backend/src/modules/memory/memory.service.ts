import { Injectable, Logger } from '@nestjs/common';
import { Memory, MemoryType } from './schemas/memory.schema';
import { CacheAccessService } from './services/cache-access.service';
import { DataAccessService } from './services/data-access.service';
import { SemanticQueryOptions } from './interfaces/semantic-memory.interfaces';
import { LlmRouterService } from '../../services/llm-router.service';

/**
 * 记忆服务
 * 负责系统中各种数据的存储和检索，包括需求、期望、代码和验证结果
 * 重构后：移除了语义处理功能，专注于数据管理
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly dataAccess: DataAccessService,
    private readonly cacheAccess: CacheAccessService,
    private readonly llmRouterService: LlmRouterService,
  ) {
    this.logger.log('Memory service initialized with focused data management capabilities');
  }

  /**
   * 存储需求
   * @param requirement 需求对象
   * @returns 存储的记忆条目
   */
  async storeRequirement(requirement: any): Promise<Memory> {
    this.logger.log(`Storing requirement: ${requirement.title || 'Untitled'}`);

    try {
      const memoryData = {
        type: MemoryType.REQUIREMENT,
        content: requirement,
        metadata: {
          title: requirement.title,
          status: requirement.status,
          domain: requirement.domain || 'general',
          createdBy: requirement.createdBy || 'system',
          sessionId: requirement.sessionId || null,
          timestamp: new Date().toISOString(),
        },
        semanticMetadata: {
          description: `Requirement: ${requirement.title}. ${requirement.text || ''}`,
          relevanceScore: 1.0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedEntry = await this.dataAccess.save(memoryData);
      this.logger.debug(`Requirement stored successfully with id: ${savedEntry._id}`);
      return savedEntry;
    } catch (error) {
      this.logger.error(`Failed to store requirement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新需求
   * @param requirement 需求对象
   * @returns 更新后的记忆条目
   */
  async updateRequirement(requirement: any): Promise<Memory> {
    this.logger.log(`Updating requirement: ${requirement._id}`);

    try {
      const existingEntry = await this.dataAccess.findOne({
        type: MemoryType.REQUIREMENT,
        'content._id': requirement._id,
      });

      if (!existingEntry) {
        this.logger.debug(`Requirement not found, creating new entry`);
        return this.storeRequirement(requirement);
      }

      this.logger.debug(`Found existing requirement, updating content`);
      
      const updateCount = existingEntry.metadata && 
                          typeof existingEntry.metadata === 'object' && 
                          existingEntry.metadata.updateCount ? 
                          Number(existingEntry.metadata.updateCount) + 1 : 1;
      
      const updatedEntry = await this.dataAccess.updateOne(
        { _id: existingEntry._id },
        {
          content: requirement,
          metadata: {
            ...existingEntry.metadata,
            title: requirement.title,
            status: requirement.status,
            lastUpdatedBy: requirement.updatedBy || 'system',
            updateTimestamp: new Date().toISOString(),
            updateCount: updateCount,
          },
          semanticMetadata: {
            ...existingEntry.semanticMetadata,
            description: `Requirement: ${requirement.title}. ${requirement.text || ''}`,
            relevanceScore: 1.0,
          },
          updatedAt: new Date(),
        }
      );

      if (!updatedEntry) {
        throw new Error(`Failed to update requirement with ID: ${requirement._id}`);
      }

      this.logger.debug(`Requirement updated successfully: ${updatedEntry._id}`);
      return updatedEntry;
    } catch (error) {
      this.logger.error(`Failed to update requirement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除需求
   * @param requirementId 需求ID
   */
  async deleteRequirement(requirementId: string): Promise<void> {
    this.logger.log(`Deleting requirement: ${requirementId}`);

    try {
      const deletedCount = await this.dataAccess.deleteMany({
        type: MemoryType.REQUIREMENT,
        'content._id': requirementId,
      });

      this.logger.debug(`Deletion result: ${deletedCount} document(s) removed`);
    } catch (error) {
      this.logger.error(`Failed to delete requirement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 存储期望模型
   * @param expectation 期望模型对象
   * @returns 存储的记忆条目
   */
  async storeExpectation(expectation: any): Promise<Memory> {
    this.logger.log(`Storing expectation for requirement: ${expectation.requirementId}`);

    try {
      const memoryData = {
        type: MemoryType.EXPECTATION,
        content: expectation,
        metadata: {
          requirementId: expectation.requirementId,
          title: expectation.title || 'Untitled Expectation',
          version: expectation.version || 1,
          semanticTracking: expectation.semanticTracking || {},
          createdBy: expectation.createdBy || 'system',
          timestamp: new Date().toISOString(),
        },
        semanticMetadata: {
          description: `Expectation: ${expectation.title || 'Untitled'}. For requirement: ${expectation.requirementId}`,
          relevanceScore: 1.0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedEntry = await this.dataAccess.save(memoryData);
      this.logger.debug(`Expectation stored successfully with id: ${savedEntry._id}`);
      return savedEntry;
    } catch (error) {
      this.logger.error(`Failed to store expectation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 存储通用记忆条目
   * @param data 记忆数据对象
   * @returns 存储的记忆条目
   */
  async storeMemory(data: {
    type: string;
    content: unknown;
    metadata?: unknown;
    tags?: string[];
    semanticMetadata?: unknown;
  }): Promise<Memory> {
    this.logger.log(`Storing memory of type: ${data.type}`);

    try {
      const memoryData = {
        type: data.type as MemoryType,
        content: data.content,
        metadata: {
          ...((data.metadata as Record<string, any>) || {}),
          storedAt: new Date().toISOString(),
          contentType: typeof data.content === 'object' ? 'object' : typeof data.content,
        },
        tags: data.tags || [],
        semanticMetadata: data.semanticMetadata || {
          description: `Memory of type ${data.type}`,
          relevanceScore: 0.5,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedEntry = await this.dataAccess.save(memoryData);
      this.logger.debug(`Memory stored successfully with id: ${savedEntry._id}`);
      return savedEntry;
    } catch (error) {
      this.logger.error(`Failed to store memory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新记忆条目
   * @param type 记忆类型
   * @param contentId 内容ID
   * @param data 更新数据
   * @returns 更新后的记忆条目
   */
  async updateMemory(
    type: string,
    contentId: string,
    data: { content: unknown; metadata?: unknown; tags?: string[]; semanticMetadata?: unknown },
  ): Promise<Memory> {
    this.logger.log(`Updating memory of type: ${type}, contentId: ${contentId}`);

    try {
      const existingEntry = await this.dataAccess.findOne({
        type: type as MemoryType,
        'content._id': contentId,
      });

      if (!existingEntry) {
        this.logger.debug(`Memory entry not found, creating new entry`);
        return this.storeMemory({
          type,
          content: data.content,
          metadata: data.metadata || {},
          tags: data.tags || [],
          semanticMetadata: data.semanticMetadata,
        });
      }

      this.logger.debug(`Found existing memory entry, updating content`);

      // Extract existing history or initialize empty array if it doesn't exist
      const existingHistory = (existingEntry.metadata && 
                              typeof existingEntry.metadata === 'object' && 
                              Array.isArray((existingEntry.metadata as any).updateHistory)) ? 
                              (existingEntry.metadata as any).updateHistory : [];

      // Build update object for data model
      const updateData: Record<string, any> = {
        content: data.content,
        metadata: {
          ...((existingEntry.metadata as Record<string, any>) || {}),
          ...((data.metadata as Record<string, any>) || {}),
          lastUpdatedAt: new Date().toISOString(),
          updateHistory: [
            ...existingHistory,
            {
              timestamp: new Date().toISOString(),
              updatedFields: Object.keys(data.content as Record<string, any>),
            },
          ],
        },
        updatedAt: new Date(),
      };

      // Add semanticMetadata if provided
      if (data.semanticMetadata) {
        updateData.semanticMetadata = {
          ...existingEntry.semanticMetadata,
          ...(data.semanticMetadata as Record<string, any>),
        };
      }

      // Add tags if provided
      if (data.tags) {
        updateData.tags = data.tags;
      }

      const updatedEntry = await this.dataAccess.updateOne(
        { _id: existingEntry._id },
        updateData
      );

      if (!updatedEntry) {
        throw new Error(`Failed to update memory with ID: ${existingEntry._id}`);
      }

      this.logger.debug(`Memory updated successfully: ${updatedEntry._id}`);
      return updatedEntry;
    } catch (error) {
      this.logger.error(`Failed to update memory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取与查询相关的记忆
   * @param query 查询字符串
   * @param limit 结果限制
   * @returns 相关记忆条目数组
   */
  async getRelatedMemories(query: string, limit: number = 5): Promise<Memory[]> {
    this.logger.log(`Searching for memories related to: "${query}" (limit: ${limit})`);

    try {
      const cacheKey = `related_${query}_${limit}`;
      const cachedResult = this.cacheAccess.get<Memory[]>(cacheKey);

      if (cachedResult) {
        this.logger.debug(`Retrieved ${cachedResult.length} related memories from cache`);
        return cachedResult;
      }

      const results = await this.dataAccess.textSearch(query, {
        limit,
        sort: { 'semanticMetadata.relevanceScore': -1, updatedAt: -1 }
      });

      this.cacheAccess.set(cacheKey, results, 0.8, 5 * 60 * 1000); // 5 minute cache

      this.logger.debug(`Found ${results.length} related memories`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to get related memories: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 按类型获取记忆
   * @param type 记忆类型
   * @param limit 结果限制
   * @returns 指定类型的记忆条目数组
   */
  async getMemoryByType(type: MemoryType, limit: number = 10): Promise<Memory[]> {
    this.logger.log(`Retrieving memories of type: ${type} (limit: ${limit})`);

    try {
      const cacheKey = `type_${type}_${limit}`;
      const cachedResult = this.cacheAccess.get<Memory[]>(cacheKey);

      if (cachedResult) {
        this.logger.debug(`Retrieved ${cachedResult.length} memories of type ${type} from cache`);
        return cachedResult;
      }

      const results = await this.dataAccess.findByType(type, limit);

      this.cacheAccess.set(cacheKey, results, 0.7, 3 * 60 * 1000); // 3 minute cache

      this.logger.debug(`Found ${results.length} memories of type ${type}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to get memories by type: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 按ID获取记忆
   * @param id 记忆ID
   * @returns 指定ID的记忆条目或null
   */
  async getMemoryById(id: string): Promise<Memory | null> {
    this.logger.log(`Retrieving memory by ID: ${id}`);

    try {
      const memory = await this.dataAccess.findById(id);
      
      if (!memory) {
        this.logger.debug(`No memory found with ID: ${id}`);
        return null;
      }

      this.logger.debug(`Retrieved memory with ID: ${id}`);
      return memory;
    } catch (error) {
      this.logger.error(`Failed to get memory by ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 基于语义意图获取记忆
   * @param intent 语义意图
   * @param options 查询选项
   * @returns 相关记忆条目数组
   */
  async getBySemanticIntent(intent: string, options: SemanticQueryOptions = {}): Promise<Memory[]> {
    this.logger.log(`Searching memories by semantic intent: "${intent}"`);

    const {
      similarityThreshold = 0.7,
      limit = 10,
      sortBy = 'relevance',
      includeTypes = [],
      excludeTypes = [],
      useCache = true,
    } = options;

    try {
      if (useCache) {
        const cacheKey = `intent_${intent}_${similarityThreshold}_${limit}_${sortBy}_${includeTypes.join('_')}_${excludeTypes.join('_')}`;
        const cachedResult = this.cacheAccess.get<Memory[]>(cacheKey);

        if (cachedResult) {
          this.logger.debug(
            `Retrieved ${cachedResult.length} memories from cache for intent: ${intent}`,
          );
          return cachedResult;
        }
      }

      // Build query
      const query: any = {
        'semanticMetadata.relevanceScore': { $gte: similarityThreshold },
      };

      if (includeTypes.length > 0) {
        query.type = { $in: includeTypes };
      }

      if (excludeTypes.length > 0) {
        if (query.type) {
          query.type = { ...query.type, $nin: excludeTypes };
        } else {
          query.type = { $nin: excludeTypes };
        }
      }

      query.$or = [
        { 'semanticMetadata.description': { $regex: intent, $options: 'i' } },
        { 'metadata.title': { $regex: intent, $options: 'i' } },
        { 'content.text': { $regex: intent, $options: 'i' } },
        { 'content.description': { $regex: intent, $options: 'i' } },
      ];

      // Set sort options
      let sortOptions: any;
      switch (sortBy) {
        case 'relevance':
          sortOptions = { 'semanticMetadata.relevanceScore': -1 };
          break;
        case 'date':
          sortOptions = { updatedAt: -1 };
          break;
        case 'priority':
          sortOptions = { 'metadata.priority': -1, 'semanticMetadata.relevanceScore': -1 };
          break;
        default:
          sortOptions = { 'semanticMetadata.relevanceScore': -1, updatedAt: -1 };
      }

      const results = await this.dataAccess.find(query, {
        sort: sortOptions,
        limit: limit
      });

      if (useCache) {
        const cacheKey = `intent_${intent}_${similarityThreshold}_${limit}_${sortBy}_${includeTypes.join('_')}_${excludeTypes.join('_')}`;
        this.cacheAccess.set(cacheKey, results, 0.9, 10 * 60 * 1000); // 10 minute cache
      }

      this.logger.debug(`Found ${results.length} memories for semantic intent: ${intent}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to get memories by semantic intent: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查找与指定记忆相似的记忆
   * @param memoryId 记忆条目ID
   * @param similarityThreshold 相似度阈值
   * @param limit 结果限制
   * @returns 相似记忆条目数组
   */
  async findSimilarMemories(
    memoryId: string,
    similarityThreshold: number = 0.7,
    limit: number = 5,
  ): Promise<Memory[]> {
    this.logger.log(`Finding memories similar to: ${memoryId} (threshold: ${similarityThreshold})`);

    try {
      const cacheKey = `similar_${memoryId}_${similarityThreshold}`;
      const cachedResult = this.cacheAccess.get<Memory[]>(cacheKey);

      if (cachedResult) {
        this.logger.debug(`Retrieved ${cachedResult.length} similar memories from cache`);
        return cachedResult;
      }

      const sourceMemory = await this.dataAccess.findById(memoryId);
      if (!sourceMemory) {
        throw new Error(`Memory with id ${memoryId} not found`);
      }

      // Build query to find similar memories
      const query: any = {
        _id: { $ne: memoryId }, // Exclude self
        'semanticMetadata.relevanceScore': { $gte: similarityThreshold },
      };

      // Add conditions based on available source metadata
      if (sourceMemory.semanticMetadata?.description) {
        query.$or = [
          {
            'semanticMetadata.description': {
              $regex: sourceMemory.semanticMetadata.description,
              $options: 'i',
            },
          },
          { 'metadata.title': { $regex: sourceMemory.metadata?.title || '', $options: 'i' } },
        ];
      } else if (sourceMemory.metadata?.title) {
        query.$or = [{ 'metadata.title': { $regex: sourceMemory.metadata.title, $options: 'i' } }];
      }

      const results = await this.dataAccess.find(query, {
        sort: { 'semanticMetadata.relevanceScore': -1 },
        limit: limit
      });

      this.cacheAccess.set(cacheKey, results, 0.8, 15 * 60 * 1000); // 15 minute cache

      this.logger.debug(`Found ${results.length} memories similar to ${memoryId}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to find similar memories: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取需要反馈的转换
   * @param limit 结果限制
   * @returns 需要反馈的转换列表
   */
  async getFeedbackRequiringTransformations(limit: number = 10): Promise<Memory[]> {
    this.logger.log(`Getting transformations requiring feedback, limit: ${limit}`);

    try {
      // First look for explicitly marked items that need human review
      const explicitlyMarked = await this.dataAccess.find({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        'metadata.requiresHumanReview': true,
      }, {
        sort: { 'metadata.timestamp': -1 },
        limit: limit
      });

      // If we have enough explicitly marked items, return them
      if (explicitlyMarked.length >= limit) {
        return explicitlyMarked;
      }

      // Otherwise, find items without feedback to fill the remaining slots
      const withoutFeedback = await this.dataAccess.find({
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        'metadata.hasFeedback': { $ne: true },
      }, {
        sort: { 'metadata.timestamp': -1 },
        limit: limit - explicitlyMarked.length
      });

      // Combine both sets of results
      return [...explicitlyMarked, ...withoutFeedback];
    } catch (error) {
      this.logger.error(
        `Error getting transformations requiring feedback: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 从缓存或存储中获取数据
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @returns 数据
   */
  async getFromCacheOrStore<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cachedData = this.cacheAccess.get<T>(key);
    if (cachedData) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cachedData;
    }

    this.logger.debug(`Cache miss for key: ${key}, fetching data`);
    const data = await fetchFn();

    this.cacheAccess.set(key, data, 0.8);

    return data;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cacheAccess.clear();
    this.logger.log('Memory cache cleared');
  }

  /**
   * 按文本内容搜索记忆
   * @param query 查询字符串
   * @param limit 结果限制
   * @returns 匹配的记忆数组
   */
  async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
    this.logger.debug(`Searching memories with query: ${query}`);
    
    try {
      return await this.dataAccess.textSearch(query, { limit });
    } catch (error) {
      this.logger.error(`Error searching memories: ${error.message}`, error.stack);
      return [];
    }
  }
}
