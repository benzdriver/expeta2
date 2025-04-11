import { Module, forwardRef } from '@nestjs/common';
import { SemanticMediatorService } from './semantic-mediator.service';
import { SemanticMediatorController } from './semantic-mediator.controller';
import { LlmModule } from '../../services/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [
    LlmModule,
    MemoryModule,
    forwardRef(() => OrchestratorModule),
  ],
  controllers: [SemanticMediatorController],
  providers: [SemanticMediatorService],
  exports: [SemanticMediatorService],
})
export class SemanticMediatorModule {}
