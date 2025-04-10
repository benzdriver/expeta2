import { Module } from '@nestjs/common';
import { SemanticMediatorService } from './semantic-mediator.service';
import { LlmModule } from '../../services/llm.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    LlmModule,
    MemoryModule,
  ],
  providers: [SemanticMediatorService],
  exports: [SemanticMediatorService],
})
export class SemanticMediatorModule {}
