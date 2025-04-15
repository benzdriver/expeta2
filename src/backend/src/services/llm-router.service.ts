import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as templates from './prompt-templates';

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
  private primaryProvider: 'anthropic' | 'openai' = 'anthropic'; // Default primary
  private fallbackProvider: 'anthropic' | 'openai' = 'openai'; // Default fallback
  private defaultAnthropicModel: string = 'claude-3-opus-20240229'; // Default Anthropic model (Opus as placeholder, will use Sonnet 3.5 later)
  private defaultOpenaiModel: string = 'gpt-4'; // Default OpenAI model
  private defaultTemperature: number;
  private defaultMaxTokens: number; // Max tokens for OpenAI
  private defaultAnthropicMaxTokens: number = 4096; // Max tokens for Anthropic (Claude 3 Opus limit)
  private cache: Map<string, { result: string; timestamp: number }> = new Map();
  private cacheTTL: number = 3600000; // 1 hour in milliseconds

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY'); // Load Anthropic key

    if (!this.openaiApiKey) {
      this.logger.warn('OPENAI_API_KEY not found in configuration.');
    }
    if (!this.anthropicApiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not found in configuration. Anthropic provider will not be available.',
      );
      if (this.primaryProvider === 'anthropic') {
        this.primaryProvider = 'openai';
        this.fallbackProvider = null; // No fallback if primary is the only one configured
        this.logger.warn('Setting OpenAI as the primary provider due to missing Anthropic key.');
      }
    }

    this.openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
    this.anthropicApiUrl = 'https://api.anthropic.com/v1/messages'; // Anthropic Messages API endpoint

    this.defaultAnthropicModel = 'claude-3-5-sonnet-20240620'; // Updated to Sonnet 3.5 as requested
    this.defaultOpenaiModel = 'gpt-4'; // Keep gpt-4 as default for OpenAI

    this.defaultTemperature = 0.7;
    this.defaultMaxTokens = 4000; // For OpenAI
    this.defaultAnthropicMaxTokens = 4096; // Max output tokens for Claude 3.5 Sonnet
  }

  async generateContent(prompt: string, options: LlmRequestOptions = {}): Promise<string> {
    const _cacheKey = 
    const _cachedResult = 

    if (cachedResult) {
      this.logger.debug('Using cached LLM result');
      return cachedResult;
    }

    let _providerToUse: 'anthropic' | 'openai' | null = 
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

    const _effectiveProvider = 
    const model =
      options.model ||
      (effectiveProvider === 'anthropic' ? this.defaultAnthropicModel : this.defaultOpenaiModel);
    const _temperature = 
    const maxTokens =
      options.maxTokens ||
      (effectiveProvider === 'anthropic' ? this.defaultAnthropicMaxTokens : this.defaultMaxTokens);
    const _systemPrompt = 

    if (providerToUse) {
      this.logger.debug(`Attempting LLM call with specified provider: ${providerToUse}`);
      try {
        const _result = 
          providerToUse,
          prompt,
          systemPrompt,
          model,
          temperature,
          maxTokens,
        );
        this.addToCache(cacheKey, result); // Use the potentially provider-specific cache key
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

      const _result = 
        this.primaryProvider,
        prompt,
        systemPrompt,
        model, // Use model determined based on primary provider
        temperature,
        maxTokens, // Use maxTokens determined based on primary provider
      );
      const _primaryCacheKey = 
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

          const _fallbackResult = 
            this.fallbackProvider,
            prompt,
            systemPrompt,
            fallbackModel,
            temperature,
            fallbackMaxTokens,
          );
          const _fallbackCacheKey = 
            prompt,
            { ...options, model: fallbackModel },
            this.fallbackProvider,
          );
          this.addToCache(fallbackCacheKey, fallbackResult); // Cache the successful fallback result
          return fallbackResult;
        } catch (fallbackError) {
          this.logger.error(
            `Fallback provider (${this.fallbackProvider}) also failed: ${fallbackError.message}`,
          );
          throw new Error(
            `LLM generation failed with both primary (${this.primaryProvider}) and fallback (${this.fallbackProvider}) providers. Primary Error: ${primaryError.message}, Fallback Error: ${fallbackError.message}`,
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
    maxTokens: number,
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
    maxTokens: number,
  ): Promise<string> {
    if (!this.anthropicApiKey) {
      this.logger.error('Anthropic API key is missing, cannot make the call.');
      throw new Error('Anthropic API key is not configured.');
    }
    this.logger.debug(
      `Calling Anthropic API: model=${model}, temp=${temperature}, max_tokens=${maxTokens}`,
    );
    try {
      const _response = 
        this.anthropicApiUrl,
        {
          model: model,
          system: systemPrompt, // Use 'system' field for system prompt
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey, // Anthropic uses 'x-api-key' header
            'anthropic-version': '2023-06-01', // Required version header
          },
          timeout: 60000, // Add a timeout (e.g., 60 seconds)
        },
      );

      if (
        response.data.content &&
        response.data.content.length > 0 &&
        response.data.content[0].type === 'text'
      ) {
        const _result = 
        this.logger.debug(
          `Anthropic API call successful. Output tokens: ${response.data.usage?.output_tokens}`,
        );
        return result;
      } else {
        this.logger.error(
          `Anthropic API returned unexpected response format or empty content. Response: ${JSON.stringify(response.data)}`,
        );
        throw new Error('Anthropic API returned unexpected response format or empty content.');
      }
    } catch (error) {
      this.logger.error(`Error calling Anthropic API: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(
          `Anthropic API response: Status=${error.response.status}, Data=${JSON.stringify(error.response.data)}`,
        );
        throw new Error(
          `Anthropic API request failed with status ${error.response.status}: ${error.message}`,
        );
      } else if (error.request) {
        this.logger.error('Anthropic API request made but no response received (e.g., timeout).');
        throw new Error('Anthropic API request failed: No response received.');
      } else {
        this.logger.error(`Error setting up Anthropic API request: ${error.message}`);
        throw new Error(`Anthropic API request setup failed: ${error.message}`);
      }
    }
  }

  private async _callOpenAI(
    prompt: string,
    systemPrompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    if (!this.openaiApiKey) {
      this.logger.error('OpenAI API key is missing, cannot make the call.');
      throw new Error('OpenAI API key is not configured.');
    }
    this.logger.debug(
      `Calling OpenAI API: model=${model}, temp=${temperature}, max_tokens=${maxTokens}`,
    );
    try {
      const _response = 
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
          timeout: 60000, // Add a timeout (e.g., 60 seconds)
        },
      );

      if (
        response.data.choices &&
        response.data.choices.length > 0 &&
        response.data.choices[0].message
      ) {
        const _result = 
        this.logger.debug(
          `OpenAI API call successful. Output tokens: ${response.data.usage?.completion_tokens}`,
        );
        return result;
      } else {
        this.logger.error(
          `OpenAI API returned unexpected response format or empty content. Response: ${JSON.stringify(response.data)}`,
        );
        throw new Error('OpenAI API returned unexpected response format or empty content.');
      }
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(
          `OpenAI API response: Status=${error.response.status}, Data=${JSON.stringify(error.response.data)}`,
        );
        throw new Error(
          `OpenAI API request failed with status ${error.response.status}: ${error.message}`,
        );
      } else if (error.request) {
        this.logger.error('OpenAI API request made but no response received (e.g., timeout).');
        throw new Error('OpenAI API request failed: No response received.');
      } else {
        this.logger.error(`Error setting up OpenAI API request: ${error.message}`);
        throw new Error(`OpenAI API request setup failed: ${error.message}`);
      }
    }
  }

  private generateCacheKey(
    prompt: string,
    options: LlmRequestOptions,
    providerOverride?: 'anthropic' | 'openai',
  ): string {
    const _provider = 
    const modelKey =
      options.model ||
      (provider === 'anthropic' ? this.defaultAnthropicModel : this.defaultOpenaiModel);
    return `${provider}:${modelKey}:${options.temperature || this.defaultTemperature}:${prompt}`;
  }

  private getFromCache(key: string): string | null {
    const _cached = 
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }
    return null;
  }

  private addToCache(key: string, result: string): void {
    this.cache.set(key, { result, timestamp: Date.now() });

    if (this.cache.size > 100) {
      const _now = 
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  async analyzeRequirement(requirementText: string): Promise<any> {
    const _prompt = 
      '{requirementText}',
      requirementText,
    );

    const _analysisText = 
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
    });

    try {
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      this.logger.error(`Raw response: ${analysisText}`);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async generateClarificationQuestions(
    requirementText: string,
    existingClarifications: string,
  ): Promise<any> {
    const _prompt = 
      '{requirementText}',
      requirementText,
    ).replace('{existingClarifications}', existingClarifications);

    const _questionsText = 
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
    });

    try {
      return JSON.parse(questionsText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async analyzeClarificationProgress(
    requirementText: string,
    clarificationHistory: string,
  ): Promise<any> {
    const _prompt = 
      '{requirementText}',
      requirementText,
    ).replace('{clarificationHistory}', clarificationHistory);

    const _analysisText = 
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
    });

    try {
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async generateExpectationModel(requirement: unknown, clarifications: unknown[]): Promise<any> {
    const _clarificationInfo = 
      .map((c) => `问题: ${c.questionId}, 答案: ${c.answer}`)
      .join('\n');

    const _prompt = 
      '{requirementText}',
      requirement.text,
    ).replace('{clarificationInfo}', clarificationInfo);

    const _expectationsText = 
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
      maxTokens: 8000, // Expectations can be complex and require more tokens
    });

    try {
      return JSON.parse(expectationsText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async generateCode(
    expectationModel: string,
    language: string,
    framework: string,
    codeStyle: string,
  ): Promise<any> {
    const _prompt = 
      .replace('{language}', language)
      .replace('{framework}', framework)
      .replace('{codeStyle}', codeStyle);

    const _codeText = 
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 8000, // Code generation requires more tokens
    });

    try {
      return JSON.parse(codeText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async optimizeCode(originalCode: string, expectationModel: string): Promise<any> {
    const _prompt = 
      '{expectationModel}',
      expectationModel,
    );

    const _optimizedCodeText = 
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 8000,
    });

    try {
      return JSON.parse(optimizedCodeText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async generateDocumentation(code: string, expectationModel: string): Promise<string> {
    const _prompt = 
      '{expectationModel}',
      expectationModel,
    );

    return this.generateContent(prompt, {
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });
  }

  async validateCode(expectationModel: string, codeImplementation: string): Promise<any> {
    const _prompt = 
      '{expectationModel}',
      expectationModel,
    ).replace('{codeImplementation}', codeImplementation);

    const _validationText = 
      systemPrompt: templates.VALIDATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(validationText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async generateTestCases(expectationModel: string, codeImplementation: string): Promise<any> {
    const _prompt = 
      '{expectationModel}',
      expectationModel,
    ).replace('{codeImplementation}', codeImplementation);

    const _testCasesText = 
      systemPrompt: templates.VALIDATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(testCasesText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async analyzeValidationResults(
    validationResults: string,
    expectationModel: string,
    codeImplementation: string,
  ): Promise<any> {
    const _prompt = 
      '{validationResults}',
      validationResults,
    )
      .replace('{expectationModel}', expectationModel)
      .replace('{codeImplementation}', codeImplementation);

    const _analysisText = 
      systemPrompt: templates.VALIDATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async translateBetweenModules(
    sourceModule: string,
    targetModule: string,
    sourceData: string,
  ): Promise<any> {
    const _prompt = 
      /{sourceModule}/g,
      sourceModule,
    )
      .replace(/{targetModule}/g, targetModule)
      .replace('{sourceData}', sourceData);

    const _translationText = 
      systemPrompt: templates.SEMANTIC_MEDIATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(translationText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async enrichWithContext(
    module: string,
    originalData: string,
    contextQuery: string,
  ): Promise<any> {
    const _prompt = 
      .replace('{originalData}', originalData)
      .replace('{contextQuery}', contextQuery);

    const _enrichedText = 
      systemPrompt: templates.SEMANTIC_MEDIATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(enrichedText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async resolveSemanticConflicts(
    moduleA: string,
    dataA: string,
    moduleB: string,
    dataB: string,
  ): Promise<any> {
    const _prompt = 
      .replace('{dataA}', dataA)
      .replace('{moduleB}', moduleB)
      .replace('{dataB}', dataB);

    const _resolutionText = 
      systemPrompt: templates.SEMANTIC_MEDIATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(resolutionText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async extractSemanticInsights(data: string, query: string): Promise<any> {
    const _prompt = 
      '{query}',
      query,
    );

    const _insightsText = 
      systemPrompt: templates.SEMANTIC_MEDIATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(insightsText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  /**
   * 使用语义分析结果生成代码
   * 这个方法使用语义分析结果来增强代码生成过程
   */
  async generateCodeWithSemanticInput(
    expectation: unknown,
    semanticAnalysis: unknown,
    options?: unknown,
  ): Promise<any> {
    this.logger.log('Generating code with semantic input');

    const _prompt = 
      ? templates.GENERATE_CODE_WITH_SEMANTIC_INPUT_PROMPT.replace(
          '{expectationModel}',
          JSON.stringify(expectation, null, 2),
        )
          .replace('{semanticAnalysis}', JSON.stringify(semanticAnalysis, null, 2))
          .replace('{options}', JSON.stringify(options || {}, null, 2))
      : `
        基于以下期望模型和语义分析结果，生成相应的代码实现：
        
        期望模型：${JSON.stringify(expectation, null, 2)}
        
        语义分析结果：${JSON.stringify(semanticAnalysis, null, 2)}
        
        生成选项：${JSON.stringify(options || {}, null, 2)}
        
        请生成以下文件的代码：
        1. 主要功能实现文件
        2. 接口定义文件
        3. 测试文件
        
        返回JSON格式，包含files数组，每个文件包含path、content和language字段。
      `;

    const _codeText = 
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 8000, // Code generation requires more tokens
    });

    try {
      return JSON.parse(codeText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  /**
   * 分析多轮对话的需求澄清过程
   * 提供对话流程的深入分析，包括有效性评分、关键信息提取和改进建议
   */
  async analyzeMultiRoundDialogue(requirementText: string, dialogueHistory: string): Promise<any> {
    this.logger.log('Analyzing multi-round dialogue process');

    const _prompt = 
      '{requirementText}',
      requirementText,
    ).replace('{dialogueHistory}', dialogueHistory);

    const _analysisText = 
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
      maxTokens: 6000,
    });

    try {
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  /**
   * 生成期望模型总结
   * 基于期望模型生成简洁的总结，确保用户理解系统将要实现什么
   */
  async generateExpectationSummary(expectationModel: unknown): Promise<any> {
    this.logger.log('Generating expectation model summary');

    const _prompt = 
      '{expectationModel}',
      JSON.stringify(expectationModel, null, 2),
    );

    const _summaryText = 
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
      maxTokens: 4000,
    });

    try {
      return JSON.parse(summaryText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
}
