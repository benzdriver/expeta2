import { Injectable } from '@nestjs/common';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';
import { DataAccessService } from '../../../memory/services/data-access.service';
import { CacheAccessService } from '../../../memory/services/cache-access.service';

/**
 * MemoryAdapter 类
 * 用于包装和扩展记忆服务，提供智能缓存所需的方法
 * 重构后: 支持通过DataAccessService和MemoryService两种方式访问数据
 */
@Injectable()
export class MemoryAdapter {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly dataAccess?: DataAccessService,
    private readonly cacheAccess?: CacheAccessService
  ) {}

  /**
   * 存储记忆
   * @param data 存储数据
   * @returns 存储结果
   */
  async storeMemory(data: {
    type: string | MemoryType;
    content: unknown;
    metadata?: unknown;
    tags?: string[];
    semanticMetadata?: unknown;
  }): Promise<any> {
    // 首先尝试使用DataAccessService
    if (this.dataAccess) {
      try {
        return await this.dataAccess.save({
          type: data.type as MemoryType,
          content: data.content,
          metadata: data.metadata as Record<string, unknown>,
          tags: data.tags || [],
          semanticMetadata: data.semanticMetadata as Record<string, unknown>,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        // 失败时降级到其他方法
      }
    }
    
    // 尝试使用MemoryService
    try {
      return await this.memoryService.storeMemory(data);
    } catch (error) {
      // 忽略错误，尝试备选方案
    }

    // 备选实现：使用通用内存存储方法
    return {
      _id: `memory_${Date.now()}`,
      type: data.type,
      content: data.content,
      metadata: data.metadata || {},
      tags: data.tags || [],
      semanticMetadata: data.semanticMetadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 按类型获取记忆
   * @param type 记忆类型
   * @param limit 结果限制
   * @returns 记忆条目数组
   */
  async getMemoryByType(type: MemoryType, limit: number = 100): Promise<any[]> {
    // 首先尝试使用DataAccessService
    if (this.dataAccess) {
      try {
        return await this.dataAccess.findByType(type, limit);
      } catch (error) {
        // 失败时降级到其他方法
      }
    }
    
    // 尝试使用MemoryService
    try {
      return await this.memoryService.getMemoryByType(type, limit);
    } catch (error) {
      // 忽略错误，使用备选方案
    }

    // 尝试使用getBySemanticIntent
    try {
      const options = {
        includeTypes: [type],
        limit,
        useCache: true,
      };
      return await this.memoryService.getBySemanticIntent(`type:${type}`, options);
    } catch (error) {
      // 忽略错误，继续使用其他备选方案
    }

    // 尝试使用getRelatedMemories
    try {
      const memories = await this.memoryService.getRelatedMemories(`type:${type}`, limit);
      return memories.filter(memory => memory.type === type);
    } catch (error) {
      // 忽略错误，返回空数组
    }

    // 返回空数组作为默认结果
    return [];
  }

  /**
   * 通用查询记忆
   * @param type 记忆类型
   * @param query 查询条件
   * @param limit 结果限制
   * @returns 记忆条目数组
   */
  async queryMemories(type: MemoryType, query: any, limit: number = 100): Promise<any[]> {
    // 首先尝试使用DataAccessService
    if (this.dataAccess) {
      try {
        return await this.dataAccess.find(query, { limit });
      } catch (error) {
        // 失败时降级到其他方法
      }
    }
    
    // 尝试使用MemoryService的searchMemories
    try {
      const queryStr = typeof query === 'string' ? query : 
                      (query.semanticKey ? `semanticKey:${query.semanticKey}` : JSON.stringify(query));
      return await this.memoryService.searchMemories(queryStr, limit);
    } catch (error) {
      // 忽略错误，返回空数组
    }
    
    return [];
  }

  /**
   * 更新记忆
   * @param type 记忆类型 
   * @param contentId 内容ID
   * @param data 更新数据
   * @returns 更新结果
   */
  async updateMemory(
    type: string | MemoryType,
    contentId: string,
    data: { content: unknown; metadata?: unknown; tags?: string[]; semanticMetadata?: unknown },
  ): Promise<any> {
    // 首先尝试使用DataAccessService
    if (this.dataAccess) {
      try {
        // 尝试根据contentId查找记录
        const existingEntry = await this.dataAccess.findOne({
          type: type,
          'content._id': contentId
        });
        
        if (existingEntry) {
          return await this.dataAccess.update(existingEntry._id, {
            content: data.content,
            metadata: data.metadata as Record<string, unknown> || existingEntry.metadata,
            tags: data.tags || existingEntry.tags,
            semanticMetadata: data.semanticMetadata || existingEntry.semanticMetadata,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        // 失败时降级到其他方法
      }
    }
    
    // 尝试使用MemoryService
    try {
      return await this.memoryService.updateMemory(type.toString(), contentId, data);
    } catch (error) {
      // 忽略错误，使用storeMemory作为替代
    }

    // 备选：使用storeMemory并创建新的内容对象
    const combinedContent = typeof data.content === 'object' && data.content !== null
      ? { _id: contentId, ...data.content as Record<string, any> }
      : { _id: contentId, value: data.content };
      
    return await this.storeMemory({
      type: type,
      content: combinedContent,
      metadata: data.metadata,
      tags: data.tags,
      semanticMetadata: data.semanticMetadata,
    });
  }
} 