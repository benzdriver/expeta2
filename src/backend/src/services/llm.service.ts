import { Injectable, Logger } from '@nestjs/common';
import { LlmRouterService } from './llm-router.service';

/**
 * Interface for LLM request options
 */
interface LlmRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  provider?: 'anthropic' | 'openai';
}

/**
 * LLM Service - A wrapper around LlmRouterService to maintain backward compatibility
 * This service provides a simplified interface to the LlmRouterService
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly llmRouterService: LlmRouterService) {}

  /**
   * Generate content using the LLM
   * @param prompt The prompt to send to the LLM
   * @param options Optional parameters for the LLM request
   * @returns The generated content
   */
  async generateContent(prompt: string, options: LlmRequestOptions = {}): Promise<string> {
    this.logger.debug('Generating content using LlmRouterService');
    return this.llmRouterService.generateContent(prompt, options);
  }
}
