import { Module, forwardRef } from '@nestjs/common';
import { SchemaFactory } from '@nestjs/mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { Code } from './schemas/code.schema';
import { LlmRouterModule } from '../../services/llm-router.module';
import { MemoryModule } from '../memory/memory.module';
import { SemanticMediatorModule } from '../semantic-mediator/semantic-mediator.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Code.name, schema: SchemaFactory.createForClass(Code) }]),
    LlmRouterModule,
    forwardRef(() => MemoryModule),
    forwardRef(() => SemanticMediatorModule),
  ],
  controllers: [GeneratorController],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
