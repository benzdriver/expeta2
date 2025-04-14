import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemoryService } from './memory.service';
import { Memory, MemorySchema } from './schemas/memory.schema';
import { SemanticCacheService } from './services/semantic-cache.service';
import { SemanticMediatorModule } from '../semantic-mediator/semantic-mediator.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Memory.name, schema: MemorySchema }]),
    forwardRef(() => SemanticMediatorModule), // 使用forwardRef解决循环依赖
  ],
  providers: [MemoryService, SemanticCacheService],
  exports: [MemoryService, SemanticCacheService],
})
export class MemoryModule {}
