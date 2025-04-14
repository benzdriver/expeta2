import { Module, forwardRef } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { Code, CodeSchema } from './schemas/code.schema';
import { LlmModule } from '../../services/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { SemanticMediatorModule } from '../semantic-mediator/semantic-mediator.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Code.name, schema: CodeSchema }]),
    LlmModule,
    forwardRef(() => MemoryModule),
    forwardRef(() => SemanticMediatorModule),
  ],
  controllers: [GeneratorController],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
