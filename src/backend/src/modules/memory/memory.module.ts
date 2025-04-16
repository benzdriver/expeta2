import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemoryService } from './memory.service';
import { Memory, MemorySchema } from './schemas/memory.schema';
import { SemanticCacheService } from './services/semantic-cache.service';
import { DataAccessService } from './services/data-access.service';
import { CacheAccessService } from './services/cache-access.service';

/**
 * 记忆模块
 * 提供数据存储、缓存和检索服务
 * 重构后移除了与SemanticMediator的循环依赖
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Memory.name, schema: MemorySchema }]),
  ],
  providers: [
    DataAccessService,
    CacheAccessService,
    SemanticCacheService,
    MemoryService
  ],
  exports: [
    MemoryService,
    DataAccessService,
    CacheAccessService,
    SemanticCacheService
  ],
})
export class MemoryModule {}
