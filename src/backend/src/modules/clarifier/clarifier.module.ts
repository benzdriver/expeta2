import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClarifierController } from './clarifier.controller';
import { ClarifierService } from './clarifier.service';
import { Requirement, RequirementSchema } from './schemas/requirement.schema';
import { Expectation, ExpectationSchema } from './schemas/expectation.schema';
import { LlmModule } from '../../services/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { SemanticMediatorModule } from '../semantic-mediator/semantic-mediator.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Requirement.name, schema: RequirementSchema },
      { name: Expectation.name, schema: ExpectationSchema },
    ]),
    LlmModule,
    MemoryModule,
    forwardRef(() => SemanticMediatorModule), // Using forwardRef to avoid circular dependency
  ],
  controllers: [ClarifierController],
  providers: [ClarifierService],
  exports: [ClarifierService],
})
export class ClarifierModule {}
