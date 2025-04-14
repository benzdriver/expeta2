import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmRouterService } from './llm-router.service';

@Module({
  imports: [ConfigModule],
  providers: [LlmRouterService],
  exports: [LlmRouterService],
})
export class LlmRouterModule {}
