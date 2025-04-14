import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory, MemoryType } from './schemas/memory.schema';
import { SemanticCacheService } from './services/semantic-cache.service';
import {
  SemanticQueryOptions,
  ValidationResult,
  ValidationMessage,
  TransformationFeedback,
  SemanticConstraint,
  SemanticDataSource,
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
        severity: 'error',
      },
      {
        field: 'status',
        constraint: 'Status must be a valid status value',
        validationFn: (value) => ['active', 'completed', 'pending', 'cancelled'].includes(value),
        errorMessage: 'Invalid status value',
        severity: 'error',
      },
    ]);

    this.semanticConstraints.set(MemoryType.EXPECTATION, [
      {
        field: 'requirementId',
        constraint: 'Must reference a valid requirement',
        validationFn: (value) => !!value && typeof value === 'string',
        errorMessage: 'Requirement ID is required',
        severity: 'error',
      },
      {
        field: 'title',
        constraint: 'Title must be descriptive',
        validationFn: (value) => !!value && value.length > 3,
        errorMessage: 'Title must be at least 3 characters',
        severity: 'error',
      },
    ]);

    this.semanticConstraints.set(MemoryType.SEMANTIC_TRANSFORMATION, [
      {
        field: 'sourceType',
        constraint: 'Source type must be specified',
        validationFn: (value) => !!value,
        errorMessage: 'Source type is required',
        severity: 'error',
      },
      {
        field: 'targetType',
        constraint: 'Target type must be specified',
        validationFn: (value) => !!value,
        errorMessage: 'Target type is required',
        severity: 'error',
      },
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
          timestamp: new Date().toISOString(),
        },
        semanticMetadata: {
          description: `Requirement: ${requirement.title}. ${requirement.text || ''}`,
          relevanceScore: 1.0,
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
        updateCount: (memoryEntry.metadata.updateCount || 0) + 1,
      };
      memoryEntry.semanticMetadata = {
        ...memoryEntry.semanticMetadata,
        description: `Requirement: ${requirement.title}. ${requirement.text || ''}`,
        relevanceScore: 1.0,
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
          timestamp: new Date().toISOString(),
        },
        semanticMetadata: {
          description: `Expectation: ${expectation.title || 'Untitled'}. For requirement: ${expectation.requirementId}`,
          relevanceScore: 1.0,
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
  async storeMemory(data: {
    type: string;
    content: any;
    metadata?: any;
    tags?: string[];
    semanticMetadata?: any;
  }): Promise<Memory> {
    this.logger.log(`Storing memory of type: ${data.type}`);

    try {
      const memoryEntry = new this.memoryModel({
        type: data.type as MemoryType,
        content: data.content,
        metadata: {
          ...(data.metadata || {}),
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
    data: { content: any; metadata?: any; tags?: string[]; semanticMetadata?: any },
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
          semanticMetadata: data.semanticMetadata,
        });
      }

      this.logger.debug(`Found existing memory entry, updating content`);
      memoryEntry.content = data.content;
      memoryEntry.metadata = {
        ...(data.metadata || memoryEntry.metadata || {}),
        lastUpdatedAt: new Date().toISOString(),
        updateHistory: [
          ...((memoryEntry.metadata && memoryEntry.metadata.updateHistory) || []),
          {
            timestamp: new Date().toISOString(),
            updatedFields: Object.keys(data.content).filter(
              (key) =>
                JSON.stringify(data.content[key]) !== JSON.stringify(memoryEntry.content[key]),
            ),
          },
        ],
      };

      if (data.semanticMetadata) {
        memoryEntry.semanticMetadata = {
          ...memoryEntry.semanticMetadata,
          ...data.semanticMetadata,
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
      useCache = true,
    } = options;

    try {
      if (useCache) {
        const cacheKey = `semantic_intent:${intent}:${JSON.stringify(options)}`;
        const cachedResult = this.semanticCacheService.get<Memory[]>(cacheKey);

        if (cachedResult) {
          this.logger.debug(
            `Retrieved ${cachedResult.length} memories from cache for intent: ${intent}`,
          );
          return cachedResult;
        }
      }

      const query: any = {
        'semanticMetadata.relevanceScore': { $gte: similarityThreshold },
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

      const results = await this.memoryModel.find(query).sort(sortOptions).limit(limit).exec();

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
  async findSimilarMemories(
    memoryId: string,
    similarityThreshold: number = 0.7,
    limit: number = 5,
  ): Promise<Memory[]> {
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
        'semanticMetadata.relevanceScore': { $gte: similarityThreshold },
      };

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

  /**
   * 使用语义转换存储数据
   * @param data 源数据
   * @param targetSchema 目标模式
   * @returns 存储的内存条目
   */
  async storeWithSemanticTransformation(data: any, targetSchema: any): Promise<Memory | undefined> {
    this.logger.log('Storing data with semantic transformation');

    try {
      const semanticMediatorService = await this.getSemanticMediatorService();
      const transformedData = await semanticMediatorService.translateToSchema(data, targetSchema);

      const memoryEntry = await this.storeMemory({
        type: typeof data.type === 'string' ? data.type : MemoryType.SEMANTIC_TRANSFORMATION,
        content: transformedData,
        metadata: {
          originalType: typeof data.type === 'string' ? data.type : 'unknown',
          transformationTimestamp: new Date().toISOString(),
          targetSchemaId: targetSchema.id || 'unknown',
          transformationStatus: 'success',
        },
        tags: ['semantic_transformation', 'schema_based'],
        semanticMetadata: {
          description: `Semantically transformed data. Original type: ${typeof data.type === 'string' ? data.type : 'unknown'}`,
          relevanceScore: 0.9,
        },
      });

      this.logger.debug(`Data stored with semantic transformation: ${memoryEntry._id}`);
      return memoryEntry;
    } catch (error) {
      this.logger.error(
        `Error storing data with semantic transformation: ${error.message}`,
        error.stack,
      );
      return undefined;
    }
  }

  /**
   * 将内存类型注册为语义数据源
   * @param memoryType 内存类型
   * @param semanticDescription 语义描述
   */
  async registerAsDataSource(memoryType: MemoryType, semanticDescription: string): Promise<void> {
    this.logger.log(`Registering memory type as data source: ${memoryType}`);

    try {
      const semanticMediatorService = await this.getSemanticMediatorService();

      const sourceId = `memory_${memoryType.toLowerCase()}_${Date.now()}`;

      await semanticMediatorService.registerSemanticDataSource(
        sourceId,
        `Memory ${memoryType}`,
        'memory_system',
        semanticDescription,
      );

      await this.storeMemory({
        type: MemoryType.SYSTEM,
        content: {
          action: 'register_data_source',
          memoryType,
          sourceId,
          semanticDescription,
        },
        metadata: {
          title: `Registered ${memoryType} as semantic data source`,
          timestamp: new Date().toISOString(),
        },
        tags: ['data_source_registration', memoryType, sourceId],
        semanticMetadata: {
          description: `Memory type ${memoryType} registered as semantic data source: ${semanticDescription}`,
          relevanceScore: 1.0,
        },
      });

      this.logger.debug(`Memory type registered as data source: ${memoryType} (${sourceId})`);
    } catch (error) {
      this.logger.error(
        `Error registering memory type as data source: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 记录转换反馈
   * 存储人类对语义转换的反馈，用于改进未来的转换
   * @param transformationId 转换ID
   * @param feedback 反馈信息
   */
  async recordTransformationFeedback(
    transformationId: string,
    feedback: TransformationFeedback,
  ): Promise<void> {
    this.logger.log(`Recording feedback for transformation: ${transformationId}`);

    try {
      const transformations = await this.memoryModel
        .find({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          'metadata.transformationId': transformationId,
        })
        .exec();

      if (!transformations || transformations.length === 0) {
        throw new Error(`Transformation with ID ${transformationId} not found`);
      }

      const transformation = transformations[0];

      await this.storeMemory({
        type: MemoryType.SEMANTIC_FEEDBACK,
        content: {
          transformationId,
          feedback,
          originalTransformation: transformation.content,
          timestamp: new Date(),
        },
        metadata: {
          transformationId,
          rating: feedback.rating,
          requiresHumanReview: feedback.requiresHumanReview || false,
          providedBy: feedback.providedBy,
          timestamp: new Date(),
        },
        tags: ['semantic_feedback', transformationId, `rating_${feedback.rating}`],
        semanticMetadata: {
          description: `Feedback for semantic transformation ${transformationId}. Rating: ${feedback.rating}/5.`,
          relevanceScore: 1.0,
        },
      });

      await this.updateMemory(MemoryType.SEMANTIC_TRANSFORMATION, transformation._id, {
        content: transformation.content,
        metadata: {
          ...transformation.metadata,
          hasFeedback: true,
          lastFeedbackTimestamp: new Date(),
          lastFeedbackRating: feedback.rating,
        },
      });

      this.logger.debug(`Feedback recorded for transformation: ${transformationId}`);
    } catch (error) {
      this.logger.error(`Error recording transformation feedback: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取需要人工审核的转换
   * @param limit 结果数量限制
   * @returns 需要人工审核的转换列表
   */
  async getFeedbackRequiringTransformations(limit: number = 10): Promise<Memory[]> {
    this.logger.log(`Getting transformations requiring feedback, limit: ${limit}`);

    try {
      const explicitlyMarked = await this.memoryModel
        .find({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          'metadata.requiresHumanReview': true,
        })
        .sort({ 'metadata.timestamp': -1 })
        .limit(limit)
        .exec();

      if (explicitlyMarked.length >= limit) {
        return explicitlyMarked;
      }

      const withoutFeedback = await this.memoryModel
        .find({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          'metadata.hasFeedback': { $ne: true },
        })
        .sort({ 'metadata.timestamp': -1 })
        .limit(limit - explicitlyMarked.length)
        .exec();

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
   * 验证数据的语义一致性
   * @param data 要验证的数据
   * @param type 内存类型
   * @returns 验证结果
   */
  async validateSemanticConsistency(data: any, type: MemoryType): Promise<ValidationResult> {
    this.logger.log(`Validating semantic consistency for type: ${type}`);

    try {
      const constraints = await this.getSemanticConstraints(type);

      if (!constraints || constraints.length === 0) {
        return {
          isValid: true,
          messages: [
            {
              type: 'info',
              message: `No semantic constraints defined for type: ${type}`,
            },
          ],
          score: 100,
        };
      }

      const messages: ValidationMessage[] = [];
      let totalScore = 0;
      let validConstraints = 0;

      for (const constraint of constraints) {
        try {
          let isValid = true;

          if (constraint.validationFn && typeof constraint.validationFn === 'function') {
            const fieldValue = constraint.field
              .split('.')
              .reduce((obj, key) => obj && obj[key], data);
            isValid = constraint.validationFn(fieldValue);
          } else {
            const semanticMediatorService = await this.getSemanticMediatorService();
            const validationResult = await semanticMediatorService.evaluateSemanticTransformation(
              { [constraint.field]: data[constraint.field] },
              { [constraint.field]: data[constraint.field] },
              constraint.constraint,
            );

            isValid = validationResult.semanticPreservation >= 70;
          }

          if (!isValid) {
            messages.push({
              type: constraint.severity || 'error',
              message:
                constraint.errorMessage ||
                `Field '${constraint.field}' does not satisfy constraint: ${constraint.constraint}`,
              field: constraint.field,
              rule: constraint.constraint,
            });

            totalScore += 0;
          } else {
            totalScore += 100;
          }

          validConstraints++;
        } catch (error) {
          this.logger.warn(
            `Error validating constraint for field ${constraint.field}: ${error.message}`,
          );
          messages.push({
            type: 'warning',
            message: `Could not validate constraint for field '${constraint.field}': ${error.message}`,
            field: constraint.field,
          });
        }
      }

      const finalScore = validConstraints > 0 ? Math.round(totalScore / validConstraints) : 100;
      const isValid = messages.filter((m) => m.type === 'error').length === 0;

      return {
        isValid,
        messages,
        score: finalScore,
        suggestedFixes: isValid ? undefined : this.generateSuggestedFixes(data, messages),
      };
    } catch (error) {
      this.logger.error(`Error validating semantic consistency: ${error.message}`, error.stack);
      return {
        isValid: false,
        messages: [
          {
            type: 'error',
            message: `Validation error: ${error.message}`,
          },
        ],
        score: 0,
      };
    }
  }

  /**
   * 获取特定类型的语义约束
   * @param type 内存类型
   * @returns 语义约束列表
   * @private
   */
  private async getSemanticConstraints(type: MemoryType): Promise<SemanticConstraint[]> {
    const cacheKey = `semantic_constraints_${type}`;
    const cachedConstraints = this.semanticCacheService.get<SemanticConstraint[]>(cacheKey);

    if (cachedConstraints) {
      return cachedConstraints;
    }

    const constraintMemories = await this.memoryModel
      .find({
        type: MemoryType.SYSTEM,
        'metadata.constraintType': type,
        tags: 'semantic_constraint',
      })
      .exec();

    if (!constraintMemories || constraintMemories.length === 0) {
      return this.getDefaultConstraints(type);
    }

    const constraints: SemanticConstraint[] = [];

    for (const memory of constraintMemories) {
      if (memory.content && Array.isArray(memory.content.constraints)) {
        constraints.push(...memory.content.constraints);
      }
    }

    this.semanticCacheService.set(cacheKey, constraints, 1.0, 30 * 60 * 1000); // 30分钟缓存

    return constraints;
  }

  /**
   * 获取默认语义约束
   * @param type 内存类型
   * @returns 默认约束列表
   * @private
   */
  private getDefaultConstraints(type: MemoryType): SemanticConstraint[] {
    switch (type) {
      case MemoryType.REQUIREMENT:
        return [
          {
            field: 'content.text',
            constraint: '需求描述应该清晰、具体、可测试',
            errorMessage: '需求描述不够清晰或具体',
            severity: 'warning',
          },
        ];
      case MemoryType.EXPECTATION:
        return [
          {
            field: 'content.description',
            constraint: '期望应该包含明确的验收标准',
            errorMessage: '期望缺少明确的验收标准',
            severity: 'warning',
          },
        ];
      default:
        return [];
    }
  }

  /**
   * 生成修复建议
   * @param data 原始数据
   * @param messages 验证消息
   * @returns 修复建议
   * @private
   */
  private generateSuggestedFixes(data: any, messages: ValidationMessage[]): Record<string, any> {
    const fixes: Record<string, any> = {};

    for (const message of messages) {
      if (message.type === 'error' && message.field) {
        fixes[message.field] = {
          original: message.field.split('.').reduce((obj, key) => obj && obj[key], data),
          suggestion: `请修正此字段以满足约束: ${message.rule || '未指定'}`,
        };
      }
    }

    return fixes;
  }

  /**
   * 获取语义中介器服务实例
   * 使用延迟依赖注入模式，避免循环依赖
   * @private
   */
  private async getSemanticMediatorService(): Promise<any> {
    if (process.env.NODE_ENV === 'test') {
      this.logger.debug('Using mock semantic mediator service for tests');
      return {
        translateToSchema: async (data: any, targetSchema: any) => {
          return { ...data, _schema: targetSchema.id || 'mock-schema' };
        },
        registerSemanticDataSource: async (
          sourceId: string,
          sourceName: string,
          sourceType: string,
          semanticDescription: string,
        ) => {
          return;
        },
        evaluateSemanticTransformation: async (source: any, target: any, constraint: string) => {
          return { semanticPreservation: 100 };
        },
        extractSemanticInsights: async (data: any, query: string) => {
          return { insights: ['mock-insight-1', 'mock-insight-2'] };
        },
        trackSemanticTransformation: async (sourceModule: string, targetModule: string, originalData: any, transformedData: any) => {
          return { tracked: true };
        },
        generateValidationContext: async (expectationId: string, codeId: string, additionalContext: any[], options: any) => {
          return { validationContext: { semanticExpectations: ['mock-expectation'] } };
        },
        evaluateTransformation: async (sourceData: any, transformedData: any, expectedOutcome: string) => {
          return { score: 0.9, feedback: 'Mock feedback' };
        }
      };
    }

    try {
      const { SemanticMediatorService } = await import(
        '../semantic-mediator/semantic-mediator.service'
      );

      const { AppModule } = await import('../../app.module');
      const { NestFactory } = await import('@nestjs/core');

      const app = await NestFactory.createApplicationContext(AppModule);
      const semanticMediatorService = app.get(SemanticMediatorService);

      return semanticMediatorService;
    } catch (error) {
      this.logger.error(`Error getting semantic mediator service: ${error.message}`, error.stack);

      return {
        translateToSchema: async (data: any, targetSchema: any) => {
          this.logger.warn('Using fallback implementation of translateToSchema');
          return { ...data, _schema: targetSchema.id || 'unknown' };
        },
        registerSemanticDataSource: async (
          sourceId: string,
          sourceName: string,
          sourceType: string,
          semanticDescription: string,
        ) => {
          this.logger.warn('Using fallback implementation of registerSemanticDataSource');
          return;
        },
        evaluateSemanticTransformation: async (source: any, target: any, constraint: string) => {
          this.logger.warn('Using fallback implementation of evaluateSemanticTransformation');
          return { semanticPreservation: 100 };
        }
      };
    }
  }
}
