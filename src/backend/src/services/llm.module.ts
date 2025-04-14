import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmRouterModule } from './llm-router.module';

@Module({
  imports: [LlmRouterModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
