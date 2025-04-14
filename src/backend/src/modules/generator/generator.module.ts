import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { Code, CodeSchema } from './schemas/code.schema';
import { LlmRouterModule } from '../../services/llm-router.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Code.name, schema: CodeSchema }]),
    LlmRouterModule,
    MemoryModule,
  ],
  controllers: [GeneratorController],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
