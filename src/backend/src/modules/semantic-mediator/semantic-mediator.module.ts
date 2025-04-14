import { Module, forwardRef } from '@nestjs/common';
import { SemanticMediatorService } from './semantic-mediator.service';
import { SemanticMediatorController } from './semantic-mediator.controller';
import { LlmModule } from '../../services/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

import { SemanticRegistryService } from './components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from './components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from './components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from './components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from './components/human-in-the-loop/human-in-the-loop.service';

@Module({
  imports: [LlmModule, forwardRef(() => MemoryModule), forwardRef(() => OrchestratorModule)],
  controllers: [SemanticMediatorController],
  providers: [
    SemanticMediatorService,
    SemanticRegistryService,
    TransformationEngineService,
    IntelligentCacheService,
    MonitoringSystemService,
    HumanInTheLoopService,
  ],
  exports: [
    SemanticMediatorService,
    SemanticRegistryService,
    TransformationEngineService,
    IntelligentCacheService,
    MonitoringSystemService,
    HumanInTheLoopService,
  ],
})
export class SemanticMediatorModule {}
