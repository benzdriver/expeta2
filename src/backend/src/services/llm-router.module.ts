import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ConfigModule } from '@nestjs/config';
import { LlmRouterService } from './llm-router.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [LlmRouterService],
  exports: [LlmRouterService],
})
export class LlmRouterModule {}
