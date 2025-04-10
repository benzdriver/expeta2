import { Module } from '@nestjs/common';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { ClarifierModule } from '../clarifier/clarifier.module';
import { GeneratorModule } from '../generator/generator.module';
import { ValidatorModule } from '../validator/validator.module';
import { MemoryModule } from '../memory/memory.module';
import { SemanticMediatorModule } from '../semantic-mediator/semantic-mediator.module';

@Module({
  imports: [
    ClarifierModule,
    GeneratorModule,
    ValidatorModule,
    MemoryModule,
    SemanticMediatorModule,
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
