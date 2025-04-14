import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemoryService } from './memory.service';
import { Memory, MemorySchema } from './schemas/memory.schema';
import { SemanticCacheService } from './services/semantic-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Memory.name, schema: MemorySchema },
    ]),
  ],
  providers: [MemoryService, SemanticCacheService],
  exports: [MemoryService, SemanticCacheService],
})
export class MemoryModule {}
