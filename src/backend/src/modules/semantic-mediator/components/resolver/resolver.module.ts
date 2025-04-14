import { Module } from '@nestjs/common';
import { ResolverService } from './resolver.service';
import { ExplicitMappingStrategy } from './strategies/explicit-mapping.strategy';
import { PatternMatchingStrategy } from './strategies/pattern-matching.strategy';
import { LlmResolutionStrategy } from './strategies/llm-resolution.strategy';
import { MonitoringSystemService } from '../monitoring-system/monitoring-system.service';
import { IntelligentCacheService } from '../intelligent-cache/intelligent-cache.service';
import { MemoryModule } from '../../../memory/memory.module';
import { LlmModule } from '../../../../services/llm.module';

@Module({
  imports: [
    MemoryModule,
    LlmModule,
  ],
  providers: [
    ResolverService,
    ExplicitMappingStrategy,
    PatternMatchingStrategy,
    LlmResolutionStrategy,
    MonitoringSystemService,
    IntelligentCacheService,
  ],
  exports: [ResolverService],
})
export class ResolverModule {}
