import { Module } from '@nestjs/common';
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
import { ResolverModule } from './components/resolver/resolver.module';
import { ResolverService } from './components/resolver/resolver.service';
import { MemoryAdapter } from './components/intelligent-cache/memory.adapter';
import { SemanticMediatorExtensionService } from './services/semantic-mediator-extension.service';
import { MemoryService } from '../memory/memory.service';
import { LlmRouterService } from '../../services/llm-router.service';
import { DataAccessService } from '../memory/services/data-access.service';
import { CacheAccessService } from '../memory/services/cache-access.service';

/**
 * 语义中介模块
 * 提供语义处理、转换和验证功能
 * 重构后：单向依赖MemoryModule
 */
@Module({
  imports: [
    LlmRouterModule,
    MemoryModule, // 依赖MemoryModule，但MemoryModule不依赖本模块
    OrchestratorModule,
    GeneratorModule,
    ResolverModule,
  ],
  controllers: [SemanticMediatorController],
  providers: [
    SemanticMediatorService,
    SemanticRegistryService,
    TransformationEngineService,
    {
      provide: IntelligentCacheService,
      useFactory: (
        memoryService: MemoryService,
        llmRouterService: LlmRouterService,
        dataAccessService: DataAccessService,
        cacheAccessService: CacheAccessService,
      ) => {
        return new IntelligentCacheService(
          memoryService,
          llmRouterService,
          dataAccessService,
          cacheAccessService,
        );
      },
      inject: [
        MemoryService,
        LlmRouterService,
        DataAccessService,
        CacheAccessService,
      ],
    },
    MonitoringSystemService,
    HumanInTheLoopService,
    ResolverService,
    MemoryAdapter,
    SemanticMediatorExtensionService, // 新增的扩展服务
  ],
  exports: [
    SemanticMediatorService,
    SemanticRegistryService,
    TransformationEngineService,
    IntelligentCacheService,
    MonitoringSystemService,
    HumanInTheLoopService,
    ResolverService,
    SemanticMediatorExtensionService, // 导出扩展服务
  ],
})
export class SemanticMediatorModule {}
