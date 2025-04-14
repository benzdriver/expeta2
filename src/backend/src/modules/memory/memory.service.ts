import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory, MemoryType } from './schemas/memory.schema';
import { SemanticCacheService } from './services/semantic-cache.service';
import { 
  SemanticQueryOptions, 
  ValidationResult, 
  TransformationFeedback,
  SemanticConstraint,
  SemanticDataSource
} from './interfaces/semantic-memory.interfaces';

/**
 * 内存服务
 * 负责存储和检索系统中的各种数据，包括需求、期望、代码和验证结果
 * 增强版本：添加了语义驱动的检索和智能缓存功能
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private semanticDataSources: Map<string, SemanticDataSource> = new Map();
  private semanticConstraints: Map<string, SemanticConstraint[]> = new Map();
  
  constructor(
    @InjectModel(Memory.name) private memoryModel: Model<Memory>,
    private readonly semanticCacheService: SemanticCacheService,
  ) {
    this.logger.log('Memory service initialized with semantic capabilities');
    this.initializeSemanticConstraints();
  }

  /**
   * 初始化语义约束
   * @private
   */
  private initializeSemanticConstraints(): void {
    this.semanticConstraints.set(MemoryType.REQUIREMENT, [
      {
        field: 'title',
        constraint: 'Title must be descriptive and concise',
        validationFn: (value) => !!value && value.length > 3 && value.length < 100,
        errorMessage: 'Title must be between 3 and 100 characters',
        severity: 'error'
      },
      {
        field: 'status',
        constraint: 'Status must be a valid status value',
        validationFn: (value) => ['active', 'completed', 'pending', 'cancelled'].includes(value),
        errorMessage: 'Invalid status value',
        severity: 'error'
      }
    ]);
    
    this.semanticConstraints.set(MemoryType.EXPECTATION, [
      {
        field: 'requirementId',
        constraint: 'Must reference a valid requirement',
        validationFn: (value) => !!value && typeof value === 'string',
        errorMessage: 'Requirement ID is required',
        severity: 'error'
      },
      {
        field: 'title',
        constraint: 'Title must be descriptive',
        validationFn: (value) => !!value && value.length > 3,
        errorMessage: 'Title must be at least 3 characters',
        severity: 'error'
      }
    ]);
    
    this.semanticConstraints.set(MemoryType.SEMANTIC_TRANSFORMATION, [
      {
        field: 'sourceType',
        constraint: 'Source type must be specified',
        validationFn: (value) => !!value,
        errorMessage: 'Source type is required',
        severity: 'error'
      },
      {
        field: 'targetType',
        constraint: 'Target type must be specified',
        validationFn: (value) => !!value,
        errorMessage: 'Target type is required',
        severity: 'error'
      }
    ]);
  }

  /**
   * 存储需求到内存系统
   * @param requirement 需求对象
   * @returns 存储的内存条目
   */
  async storeRequirement(requirement: any): Promise<Memory> {
    this.logger.log(`Storing requirement: ${requirement.title || 'Untitled'}`);
    
    try {
      const memoryEntry = new this.memoryModel({
        type: MemoryType.REQUIREMENT,
        content: requirement,
        metadata: {
          title: requirement.title,
          status: requirement.status,
          domain: requirement.domain || 'general',
          createdBy: requirement.createdBy || 'system',
          sessionId: requirement.sessionId || null,
          timestamp: new Date().toISOString()
        },
        semanticMetadata: {
          description: `Requirement: ${requirement.title}. ${requirement.text || ''}`,
          relevanceScore: 1.0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedEntry = await memoryEntry.save();
      this.logger.debug(`Requirement stored successfully with id: ${savedEntry._id}`);
      return savedEntry;
    } catch (error) {
      this.logger.error(`Failed to store requirement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新已存储的需求
   * @param requirement 需求对象
   * @returns 更新后的内存条目
   */
  async updateRequirement(requirement: any): Promise<Memory> {
    this.logger.log(`Updating requirement: ${requirement._id}`);
    
    try {
      const memoryEntry = await this.memoryModel.findOne({
        type: MemoryType.REQUIREMENT,
        'content._id': requirement._id,
      });

      if (!memoryEntry) {
        this.logger.debug(`Requirement not found, creating new entry`);
        return this.storeRequirement(requirement);
      }

      this.logger.debug(`Found existing requirement, updating content`);
      memoryEntry.content = requirement;
      memoryEntry.metadata = {
        ...memoryEntry.metadata,
        title: requirement.title,
        status: requirement.status,
        lastUpdatedBy: requirement.updatedBy || 'system',
        updateTimestamp: new Date().toISOString(),
        updateCount: (memoryEntry.metadata.updateCount || 0) + 1
      };
      memoryEntry.semanticMetadata = {
        ...memoryEntry.semanticMetadata,
        description: `Requirement: ${requirement.title}. ${requirement.text || ''}`,
        relevanceScore: 1.0
      };
      memoryEntry.updatedAt = new Date();

      const savedEntry = await memoryEntry.save();
      this.logger.debug(`Requirement updated successfully: ${savedEntry._id}`);
      return savedEntry;
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
      const result = await this.memoryModel.deleteOne({
        type: MemoryType.REQUIREMENT,
        'content._id': requirementId,
      });
      
      this.logger.debug(`Deletion result: ${result.deletedCount} document(s) removed`);
    } catch (error) {
      this.logger.error(`Failed to delete requirement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 存储期望模型到内存系统
   * @param expectation 期望模型对象
   * @returns 存储的内存条目
   */
  async storeExpectation(expectation: any): Promise<Memory> {
    this.logger.log(`Storing expectation for requirement: ${expectation.requirementId}`);
    
    try {
      const memoryEntry = new this.memoryModel({
        type: MemoryType.EXPECTATION,
        content: expectation,
        metadata: {
          requirementId: expectation.requirementId,
          title: expectation.title || 'Untitled Expectation',
          version: expectation.version || 1,
          semanticTracking: expectation.semanticTracking || {},
          createdBy: expectation.createdBy || 'system',
          timestamp: new Date().toISOString()
        },
        semanticMetadata: {
          description: `Expectation: ${expectation.title || 'Untitled'}. For requirement: ${expectation.requirementId}`,
          relevanceScore: 1.0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedEntry = await memoryEntry.save();
      this.logger.debug(`Expectation stored successfully with id: ${savedEntry._id}`);
      return savedEntry;
    } catch (error) {
      this.logger.error(`Failed to store expectation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取与查询相关的内存条目
   * @param query 查询字符串
   * @param limit 结果数量限制
   * @returns 相关的内存条目数组
   */
  async getRelatedMemories(query: string, limit: number = 5): Promise<Memory[]> {
    this.logger.log(`Searching for memories related to: "${query}" (limit: ${limit})`);
    
    try {
      const cacheKey = `related_memories:${query}:${limit}`;
      const cachedResult = this.semanticCacheService.get<Memory[]>(cacheKey);
      
      if (cachedResult) {
        this.logger.debug(`Retrieved ${cachedResult.length} related memories from cache`);
        return cachedResult;
      }
      
      const searchCriteria = {
        $or: [
          { 'metadata.title': { $regex: query, $options: 'i' } },
          { 'content.text': { $regex: query, $options: 'i' } },
          { 'content.description': { $regex: query, $options: 'i' } },
          { 'semanticMetadata.description': { $regex: query, $options: 'i' } },
        ],
      };
      
      this.logger.debug(`Using search criteria: ${JSON.stringify(searchCriteria)}`);
      
      const results = await this.memoryModel
        .find(searchCriteria)
        .sort({ 'semanticMetadata.relevanceScore': -1, updatedAt: -1 })
        .limit(limit)
        .exec();
      
      this.semanticCacheService.set(cacheKey, results, 0.8, 5 * 60 * 1000); // 5分钟缓存
      
      this.logger.debug(`Found ${results.length} related memories`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to get related memories: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 按类型获取内存条目
   * @param type 内存类型
   * @param limit 结果数量限制
   * @returns 指定类型的内存条目数组
   */
  async getMemoryByType(type: MemoryType, limit: number = 10): Promise<Memory[]> {
    this.logger.log(`Retrieving memories of type: ${type} (limit: ${limit})`);
    
    try {
      const cacheKey = `memory_by_type:${type}:${limit}`;
      const cachedResult = this.semanticCacheService.get<Memory[]>(cacheKey);
      
      if (cachedResult) {
        this.logger.debug(`Retrieved ${cachedResult.length} memories of type ${type} from cache`);
        return cachedResult;
      }
      
      const results = await this.memoryModel
        .find({ type })
        .sort({ 'semanticMetadata.relevanceScore': -1, updatedAt: -1 })
        .limit(limit)
        .exec();
      
      this.semanticCacheService.set(cacheKey, results, 0.7, 3 * 60 * 1000); // 3分钟缓存
      
      this.logger.debug(`Found ${results.length} memories of type ${type}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to get memories by type: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 存储通用内存条目
   * @param data 内存数据对象
   * @returns 存储的内存条目
   */
  async storeMemory(data: { type: string; content: any; metadata?: any; tags?: string[]; semanticMetadata?: any }): Promise<Memory> {
    this.logger.log(`Storing memory of type: ${data.type}`);
    
    try {
      const memoryEntry = new this.memoryModel({
        type: data.type as MemoryType,
        content: data.content,
        metadata: {
          ...data.metadata || {},
          storedAt: new Date().toISOString(),
          contentType: typeof data.content === 'object' ? 'object' : typeof data.content
        },
        tags: data.tags || [],
        semanticMetadata: data.semanticMetadata || {
          description: `Memory of type ${data.type}`,
          relevanceScore: 0.5
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedEntry = await memoryEntry.save();
      this.logger.debug(`Memory stored successfully with id: ${savedEntry._id}`);
      return savedEntry;
    } catch (error) {
      this.logger.error(`Failed to store memory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新已存储的内存条目
   * @param type 内存类型
   * @param contentId 内容ID
   * @param data 更新数据
   * @returns 更新后的内存条目
   */
  async updateMemory(
    type: string, 
    contentId: string, 
    data: { content: any; metadata?: any; tags?: string[]; semanticMetadata?: any }
  ): Promise<Memory> {
    this.logger.log(`Updating memory of type: ${type}, contentId: ${contentId}`);
    
    try {
      const memoryEntry = await this.memoryModel.findOne({
        type: type as MemoryType,
        'content._id': contentId,
      });

      if (!memoryEntry) {
        this.logger.debug(`Memory entry not found, creating new entry`);
        return this.storeMemory({
          type,
          content: data.content,
          metadata: data.metadata || {},
          tags: data.tags || [],
          semanticMetadata: data.semanticMetadata
        });
      }

      this.logger.debug(`Found existing memory entry, updating content`);
      memoryEntry.content = data.content;
      memoryEntry.metadata = {
        ...data.metadata || memoryEntry.metadata,
        lastUpdatedAt: new Date().toISOString(),
        updateHistory: [
          ...(memoryEntry.metadata.updateHistory || []),
          {
            timestamp: new Date().toISOString(),
            updatedFields: Object.keys(data.content).filter(key => 
              JSON.stringify(data.content[key]) !== JSON.stringify(memoryEntry.content[key])
            )
          }
        ]
      };
      
      if (data.semanticMetadata) {
        memoryEntry.semanticMetadata = {
          ...memoryEntry.semanticMetadata,
          ...data.semanticMetadata
        };
      }
      
      if (data.tags) {
        memoryEntry.tags = data.tags;
      }
      memoryEntry.updatedAt = new Date();

      const savedEntry = await memoryEntry.save();
      this.logger.debug(`Memory updated successfully: ${savedEntry._id}`);
      return savedEntry;
    } catch (error) {
      this.logger.error(`Failed to update memory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 基于语义意图获取内存条目
   * @param intent 语义意图
   * @param options 查询选项
   * @returns 相关的内存条目数组
   */
  async getBySemanticIntent(intent: string, options: SemanticQueryOptions = {}): Promise<Memory[]> {
    this.logger.log(`Searching memories by semantic intent: "${intent}"`);
    
    const {
      similarityThreshold = 0.7,
      limit = 10,
      sortBy = 'relevance',
      includeTypes = [],
      excludeTypes = [],
      useCache = true
    } = options;
    
    try {
      if (useCache) {
        const cacheKey = `semantic_intent:${intent}:${JSON.stringify(options)}`;
        const cachedResult = this.semanticCacheService.get<Memory[]>(cacheKey);
        
        if (cachedResult) {
          this.logger.debug(`Retrieved ${cachedResult.length} memories from cache for intent: ${intent}`);
          return cachedResult;
        }
      }
      
      const query: any = {
        'semanticMetadata.relevanceScore': { $gte: similarityThreshold }
      };
      
      if (includeTypes.length > 0) {
        query.type = { $in: includeTypes };
      }
      
      if (excludeTypes.length > 0) {
        query.type = { ...(query.type || {}), $nin: excludeTypes };
      }
      
      query.$or = [
        { 'semanticMetadata.description': { $regex: intent, $options: 'i' } },
        { 'metadata.title': { $regex: intent, $options: 'i' } },
        { 'content.text': { $regex: intent, $options: 'i' } },
        { 'content.description': { $regex: intent, $options: 'i' } },
      ];
      
      let sortOptions: any = {};
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
      
      const results = await this.memoryModel
        .find(query)
        .sort(sortOptions)
        .limit(limit)
        .exec();
      
      if (useCache) {
        const cacheKey = `semantic_intent:${intent}:${JSON.stringify(options)}`;
        this.semanticCacheService.set(cacheKey, results, 0.9, 10 * 60 * 1000); // 10分钟缓存
      }
      
      this.logger.debug(`Found ${results.length} memories for semantic intent: ${intent}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to get memories by semantic intent: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查找与指定内存条目语义相似的条目
   * @param memoryId 内存条目ID
   * @param similarityThreshold 相似度阈值
   * @param limit 结果数量限制
   * @returns 相似的内存条目数组
   */
  async findSimilarMemories(memoryId: string, similarityThreshold: number = 0.7, limit: number = 5): Promise<Memory[]> {
    this.logger.log(`Finding memories similar to: ${memoryId} (threshold: ${similarityThreshold})`);
    
    try {
      const cacheKey = `similar_memories:${memoryId}:${similarityThreshold}:${limit}`;
      const cachedResult = this.semanticCacheService.get<Memory[]>(cacheKey);
      
      if (cachedResult) {
        this.logger.debug(`Retrieved ${cachedResult.length} similar memories from cache`);
        return cachedResult;
      }
      
      const sourceMemory = await this.memoryModel.findById(memoryId);
      if (!sourceMemory) {
        throw new Error(`Memory with id ${memoryId} not found`);
      }
      
      const query: any = {
        _id: { $ne: memoryId }, // 排除自身
        'semanticMetadata.relevanceScore': { $gte: similarityThreshold }
      };
      
      if (sourceMemory.semanticMetadata?.description) {
        query.$or = [
          { 'semanticMetadata.description': { $regex: sourceMemory.semanticMetadata.description, $options: 'i' } },
          { 'metadata.title': { $regex: sourceMemory.metadata?.title || '', $options: 'i' } },
        ];
      } else if (sourceMemory.metadata?.title) {
        query.$or = [
          { 'metadata.title': { $regex: sourceMemory.metadata.title, $options: 'i' } },
        ];
      }
      
      const results = await this.memoryModel
        .find(query)
        .sort({ 'semanticMetadata.relevanceScore': -1 })
        .limit(limit)
        .exec();
      
      this.semanticCacheService.set(cacheKey, results, 0.8, 15 * 60 * 1000); // 15分钟缓存
      
      this.logger.debug(`Found ${results.length} memories similar to ${memoryId}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to find similar memories: ${error.message}`, error.stack);
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
    const cachedData = this.semanticCacheService.get<T>(key);
    if (cachedData) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cachedData;
    }
    
    this.logger.debug(`Cache miss for key: ${key}, fetching data`);
    const data = await fetchFn();
    
    this.semanticCacheService.set(key, data, 0.8);
    
    return data;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.semanticCacheService.clear();
    this.logger.log('Memory cache cleared');
  }
}
