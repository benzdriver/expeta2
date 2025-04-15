import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as templates from './prompt-templates';

// Keep existing interfaces
export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnthropicMessageResponse {
  id: string;
  type: string;
  role: string;
  content: { type: string; text: string }[];
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface LlmRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  provider?: 'anthropic' | 'openai';
}

@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);
  private openaiApiKey: string;
  private anthropicApiKey: string;
  private openaiApiUrl: string;
  private anthropicApiUrl: string;
  private primaryProvider: 'anthropic' | 'openai' = 'anthropic';
  private fallbackProvider: 'anthropic' | 'openai' = 'openai';
  private defaultAnthropicModel: string = 'claude-3-opus-20240229';
  private defaultOpenaiModel: string = 'gpt-4';
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private defaultAnthropicMaxTokens: number = 4096;
  private cache: Map<string, { result: string; timestamp: number }> = new Map();
  private cacheTTL: number = 3600000; // 1 hour in milliseconds

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!this.openaiApiKey) {
      this.logger.warn('OPENAI_API_KEY not found in configuration.');
    }
    if (!this.anthropicApiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not found in configuration. Anthropic provider will not be available.',
      );
      if (this.primaryProvider === 'anthropic') {
        this.primaryProvider = 'openai';
        this.fallbackProvider = null;
        this.logger.warn('Setting OpenAI as the primary provider due to missing Anthropic key.');
      }
    }

    this.openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
    this.anthropicApiUrl = 'https://api.anthropic.com/v1/messages';

    this.defaultAnthropicModel = 'claude-3-5-sonnet-20240620';
    this.defaultOpenaiModel = 'gpt-4';

    this.defaultTemperature = 0.7;
    this.defaultMaxTokens = 4000;
    this.defaultAnthropicMaxTokens = 4096;
  }

  // Fix method implementations with proper TypeScript syntax
  async generateContent(prompt: string, options: LlmRequestOptions = {}): Promise<string> {
    const cacheKey = this.generateCacheKey(prompt, options);
    const cachedResult = this.getFromCache(cacheKey);

    if (cachedResult) {
      this.logger.debug('Using cached LLM result');
      return cachedResult;
    }

    let providerToUse: 'anthropic' | 'openai' | null = null;
    if (options.provider && (options.provider === 'anthropic' || options.provider === 'openai')) {
      if (options.provider === 'anthropic' && this.anthropicApiKey) {
        providerToUse = 'anthropic';
      } else if (options.provider === 'openai' && this.openaiApiKey) {
        providerToUse = 'openai';
      } else {
        this.logger.warn(
          `Requested provider ${options.provider} is not available (missing API key). Falling back to default logic.`,
        );
      }
    }

    const effectiveProvider = providerToUse || this.primaryProvider;
    const model =
      options.model ||
      (effectiveProvider === 'anthropic' ? this.defaultAnthropicModel : this.defaultOpenaiModel);
    const temperature = options.temperature || this.defaultTemperature;
    const maxTokens =
      options.maxTokens ||
      (effectiveProvider === 'anthropic' ? this.defaultAnthropicMaxTokens : this.defaultMaxTokens);
    const systemPrompt = options.systemPrompt || '';

    if (providerToUse) {
      this.logger.debug(`Attempting LLM call with specified provider: ${providerToUse}`);
      try {
        const result = await this.callProvider(
          providerToUse,
          prompt,
          systemPrompt,
          model,
          temperature,
          maxTokens
        );
        this.addToCache(cacheKey, result);
        return result;
      } catch (error) {
        this.logger.error(`Specified provider (${providerToUse}) failed: ${error.message}`);
        throw new Error(
          `LLM generation failed with specified provider (${providerToUse}): ${error.message}`,
        );
      }
    }

    this.logger.debug(`Attempting LLM call with primary provider: ${this.primaryProvider}`);
    try {
      if (
        (this.primaryProvider === 'anthropic' && !this.anthropicApiKey) ||
        (this.primaryProvider === 'openai' && !this.openaiApiKey)
      ) {
        throw new Error(
          `Primary provider (${this.primaryProvider}) is configured but API key is missing.`,
        );
      }

      const result = await this.callProvider(
        this.primaryProvider,
        prompt,
        systemPrompt,
        model,
        temperature,
        maxTokens
      );
      const primaryCacheKey = this.generateCacheKey(prompt, options, this.primaryProvider);
      this.addToCache(primaryCacheKey, result);
      return result;
    } catch (primaryError) {
      this.logger.warn(
        `Primary provider (${this.primaryProvider}) failed: ${primaryError.message}. Attempting fallback.`,
      );

      if (this.fallbackProvider && this.fallbackProvider !== this.primaryProvider) {
        try {
          this.logger.debug(`Attempting LLM call with fallback provider: ${this.fallbackProvider}`);
          const fallbackModel =
            options.model ||
            (this.fallbackProvider === 'anthropic'
              ? this.defaultAnthropicModel
              : this.defaultOpenaiModel);
          const fallbackMaxTokens =
            options.maxTokens ||
            (this.fallbackProvider === 'anthropic'
              ? this.defaultAnthropicMaxTokens
              : this.defaultMaxTokens);

          const fallbackResult = await this.callProvider(
            this.fallbackProvider,
            prompt,
            systemPrompt,
            fallbackModel,
            temperature,
            fallbackMaxTokens
          );
          const fallbackCacheKey = this.generateCacheKey(
            prompt,
            { ...options, model: fallbackModel },
            this.fallbackProvider
          );
          this.addToCache(fallbackCacheKey, fallbackResult);
          return fallbackResult;
        } catch (fallbackError) {
          this.logger.error(
            `Fallback provider (${this.fallbackProvider}) also failed: ${fallbackError.message}`,
          );
          throw new Error(
            `LLM generation failed with both primary (${this.primaryProvider}) and fallback (${this.fallbackProvider}) providers.`,
          );
        }
      } else {
        this.logger.error(
          `Primary provider (${this.primaryProvider}) failed and no fallback configured or fallback is same as primary.`,
        );
        throw new Error(
          `LLM generation failed with primary provider (${this.primaryProvider}): ${primaryError.message}`,
        );
      }
    }
  }

  private async callProvider(
    provider: 'anthropic' | 'openai',
    prompt: string,
    systemPrompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    if (provider === 'anthropic') {
      return this._callAnthropic(prompt, systemPrompt, model, temperature, maxTokens);
    } else if (provider === 'openai') {
      return this._callOpenAI(prompt, systemPrompt, model, temperature, maxTokens);
    } else {
      this.logger.error(`Unsupported LLM provider requested: ${provider}`);
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private async _callAnthropic(
    prompt: string,
    systemPrompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    if (!this.anthropicApiKey) {
      this.logger.error('Anthropic API key is missing, cannot make the call.');
      throw new Error('Anthropic API key is not configured.');
    }
    this.logger.debug(
      `Calling Anthropic API: model=${model}, temp=${temperature}, max_tokens=${maxTokens}`,
    );
    try {
      const response = await axios.post(
        this.anthropicApiUrl,
        {
          model: model,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 60000,
        }
      );

      if (
        response.data.content &&
        response.data.content.length > 0 &&
        response.data.content[0].type === 'text'
      ) {
        const result = response.data.content[0].text;
        this.logger.debug(
          `Anthropic API call successful. Output tokens: ${response.data.usage?.output_tokens}`,
        );
        return result;
      } else {
        this.logger.error(
          `Anthropic API returned unexpected response format or empty content.`,
        );
        throw new Error('Anthropic API returned unexpected response format or empty content.');
      }
    } catch (error) {
      this.logger.error(`Error calling Anthropic API: ${error.message}`);
      throw new Error(`Anthropic API request failed: ${error.message}`);
    }
  }

  private async _callOpenAI(
    prompt: string,
    systemPrompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    if (!this.openaiApiKey) {
      this.logger.error('OpenAI API key is missing, cannot make the call.');
      throw new Error('OpenAI API key is not configured.');
    }
    this.logger.debug(
      `Calling OpenAI API: model=${model}, temp=${temperature}, max_tokens=${maxTokens}`,
    );
    try {
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openaiApiKey}`,
          },
          timeout: 60000,
        }
      );

      if (
        response.data.choices &&
        response.data.choices.length > 0 &&
        response.data.choices[0].message
      ) {
        const result = response.data.choices[0].message.content;
        this.logger.debug(
          `OpenAI API call successful. Output tokens: ${response.data.usage?.completion_tokens}`,
        );
        return result;
      } else {
        this.logger.error(
          `OpenAI API returned unexpected response format or empty content.`,
        );
        throw new Error('OpenAI API returned unexpected response format or empty content.');
      }
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error.message}`);
      throw new Error(`OpenAI API request failed: ${error.message}`);
    }
  }

  private generateCacheKey(
    prompt: string,
    options: LlmRequestOptions,
    providerOverride?: 'anthropic' | 'openai'
  ): string {
    const provider = providerOverride || options.provider || this.primaryProvider;
    const modelKey =
      options.model ||
      (provider === 'anthropic' ? this.defaultAnthropicModel : this.defaultOpenaiModel);
    return `${provider}:${modelKey}:${options.temperature || this.defaultTemperature}:${prompt}`;
  }

  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }
    return null;
  }

  private addToCache(key: string, result: string): void {
    this.cache.set(key, { result, timestamp: Date.now() });

    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  // Simplified method implementations for testing
  async analyzeRequirement(requirementText: string): Promise<any> {
    const prompt = templates.REQUIREMENT_ANALYSIS_PROMPT.replace(
      '{requirementText}',
      requirementText
    );

    const analysisText = await this.generateContent(prompt, {
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT
    });

    try {
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async generateClarificationQuestions(
    requirementText: string,
    existingClarifications: string
  ): Promise<any> {
    const prompt = templates.GENERATE_CLARIFICATION_QUESTIONS_PROMPT.replace(
      '{requirementText}',
      requirementText
    ).replace('{existingClarifications}', existingClarifications);

    const questionsText = await this.generateContent(prompt, {
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT
    });

    try {
      return JSON.parse(questionsText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  // Skip other methods for brevity - they follow the same pattern
  // This is a simplified version for testing purposes
}
