import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClarifierController } from './clarifier.controller';
import { ClarifierService } from './clarifier.service';
import { Requirement, RequirementSchema } from './schemas/requirement.schema';
import { Expectation, ExpectationSchema } from './schemas/expectation.schema';
import { LlmModule } from '../../services/llm.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Requirement.name, schema: RequirementSchema },
      { name: Expectation.name, schema: ExpectationSchema },
    ]),
    LlmModule,
    MemoryModule,
  ],
  controllers: [ClarifierController],
  providers: [ClarifierService],
  exports: [ClarifierService],
})
export class ClarifierModule {}
