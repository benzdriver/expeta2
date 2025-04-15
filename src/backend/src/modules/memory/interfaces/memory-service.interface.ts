import { MemoryType } from '../schemas/memory.schema';

export interface IMemoryService {
  getMemoryByType(type: MemoryType): Promise<any[]>;
  storeMemory(data: {
    type: MemoryType;
    content: any;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<any>;
  getRelatedMemories(query: string, options?: any): Promise<any[]>;
}
