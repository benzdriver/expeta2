import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Memory, MemoryType } from './schemas/memory.schema';

/**
 * 内存服务
 * 负责存储和检索系统中的各种数据，包括需求、期望、代码和验证结果
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  
  constructor(
    @InjectModel(Memory.name) private memoryModel: Model<Memory>,
  ) {
    this.logger.log('Memory service initialized');
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
      const searchCriteria = {
        $or: [
          { 'metadata.title': { $regex: query, $options: 'i' } },
          { 'content.text': { $regex: query, $options: 'i' } },
          { 'content.description': { $regex: query, $options: 'i' } },
        ],
      };
      
      this.logger.debug(`Using search criteria: ${JSON.stringify(searchCriteria)}`);
      
      const results = await this.memoryModel
        .find(searchCriteria)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();
      
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
      const results = await this.memoryModel
        .find({ type })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();
      
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
  async storeMemory(data: { type: string; content: any; metadata?: any; tags?: string[] }): Promise<Memory> {
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
  async updateMemory(type: string, contentId: string, data: { content: any; metadata?: any; tags?: string[] }): Promise<Memory> {
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
}
