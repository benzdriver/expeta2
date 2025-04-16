import { MemoryType } from '../schemas/memory.schema';

// 扩展MemoryService接口以支持测试中使用的方法
declare module '../../memory/memory.service' {
  interface MemoryService {
    // 基本内存存储方法
    storeMemory(data: {
      type: string | MemoryType;
      content: unknown;
      metadata?: unknown;
      tags?: string[];
      semanticMetadata?: unknown;
    }): Promise<any>;

    // 按类型获取内存条目
    getMemoryByType(type: MemoryType, limit?: number): Promise<any[]>;

    // 获取相关内存条目
    getRelatedMemories(query: string, limit?: number): Promise<any[]>;

    // 更新内存条目
    updateMemory(
      type: string | MemoryType,
      contentId: string,
      data: { content: unknown; metadata?: unknown; tags?: string[]; semanticMetadata?: unknown },
    ): Promise<any>;

    // 语义查询
    getBySemanticIntent?(intent: string, options?: any): Promise<any[]>;
  }
} 