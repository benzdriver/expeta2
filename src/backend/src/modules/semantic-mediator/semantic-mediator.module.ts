import { Module, forwardRef } from '@nestjs/common';
import { SemanticMediatorService } from './semantic-mediator.service';
import { SemanticMediatorController } from './semantic-mediator.controller';
import { LlmRouterModule } from '../../services/llm-router.module';
import { MemoryModule } from '../memory/memory.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { GeneratorModule } from '../generator/generator.module';

import { SemanticRegistryService } from './components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from './components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from './components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from './components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from './components/human-in-the-loop/human-in-the-loop.service';

@Module({
  imports: [
    LlmRouterModule, // Use the renamed LlmRouterModule
    MemoryModule,
    forwardRef(() => OrchestratorModule),
    forwardRef(() => GeneratorModule),
  ],
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
