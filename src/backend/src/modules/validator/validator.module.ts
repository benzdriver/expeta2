import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { ValidatorController } from './validator.controller';
import { ValidatorService } from './validator.service';
import { Validation, ValidationSchema } from './schemas/validation.schema';
import { LlmRouterModule } from '../../services/llm-router.module';
import { MemoryModule } from '../memory/memory.module';
import { SemanticMediatorModule } from '../semantic-mediator/semantic-mediator.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Validation.name, schema: ValidationSchema }]),
    LlmRouterModule,
    MemoryModule,
    SemanticMediatorModule,
  ],
  controllers: [ValidatorController],
  providers: [ValidatorService],
  exports: [ValidatorService],
})
export class ValidatorModule {}
