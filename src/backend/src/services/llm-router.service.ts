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
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
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
    this.defaultModel = this.configService.get<string>('llm.defaultModel') || 'gpt-4';
  }

  async generateContent(prompt: string, options: LlmRequestOptions = {}): Promise<string> {
    const _cacheKey = this.generateCacheKey(prompt, options);
    const cachedResult = this.getFromCache(_cacheKey);

    if (cachedResult) {
      this.logger.debug('Using cached LLM result');
      return cachedResult;
    }

    let _providerToUse: 'anthropic' | 'openai' | null = null;
    if (options.provider && (options.provider === 'anthropic' || options.provider === 'openai')) {
      if (options.provider === 'anthropic' && this.anthropicApiKey) {
        _providerToUse = 'anthropic';
      } else if (options.provider === 'openai' && this.openaiApiKey) {
        _providerToUse = 'openai';
      } else {
        this.logger.warn(
          `Requested provider ${options.provider} is not available (missing API key). Falling back to default logic.`,
        );
      }
    }

    const _effectiveProvider = _providerToUse || this.primaryProvider;
    const model = options.model || (_effectiveProvider === 'anthropic' ? this.defaultAnthropicModel : this.defaultOpenaiModel);
    const _temperature = options.temperature || this.defaultTemperature;
    const maxTokens = options.maxTokens || (_effectiveProvider === 'anthropic' ? this.defaultAnthropicMaxTokens : this.defaultMaxTokens);
    const _systemPrompt = options.systemPrompt || 'You are a helpful assistant.';

    if (_providerToUse) {
      this.logger.debug(`Attempting LLM call with specified provider: ${_providerToUse}`);
      try {
        const _result = await this.callProvider(_providerToUse, prompt, _systemPrompt, model, _temperature, maxTokens);
        this.addToCache(_cacheKey, _result);
        return _result;
      } catch (error) {
        this.logger.error(`Specified provider (${_providerToUse}) failed: ${error.message}`);
        throw new Error(`LLM generation failed with specified provider (${_providerToUse}): ${error.message}`);
      }
    }

    this.logger.debug(`Attempting LLM call with primary provider: ${this.primaryProvider}`);
    try {
      if (
        (_effectiveProvider === 'anthropic' && !this.anthropicApiKey) ||
        (_effectiveProvider === 'openai' && !this.openaiApiKey)
      ) {
        throw new Error(`Primary provider (${_effectiveProvider}) is configured but API key is missing.`);
      }

      const _result = await this.callProvider(this.primaryProvider, prompt, _systemPrompt, model, _temperature, maxTokens);
      const _primaryCacheKey = this.generateCacheKey(prompt, { ...options, provider: this.primaryProvider });
      this.addToCache(_primaryCacheKey, _result);
      return _result;
    } catch (primaryError) {
      this.logger.warn(
        `Primary provider (${this.primaryProvider}) failed: ${primaryError.message}. Attempting fallback.`,
      );

      if (this.fallbackProvider && this.fallbackProvider !== this.primaryProvider) {
        try {
          this.logger.debug(`Attempting LLM call with fallback provider: ${this.fallbackProvider}`);
          const fallbackModel = options.model || this.defaultAnthropicModel;
          const fallbackMaxTokens = options.maxTokens || this.defaultAnthropicMaxTokens;

          const _fallbackResult = await this.callProvider(this.fallbackProvider, prompt, _systemPrompt, fallbackModel, _temperature, fallbackMaxTokens);
          const _fallbackCacheKey = this.generateCacheKey(prompt, { ...options, model: fallbackModel, provider: this.fallbackProvider });
          this.addToCache(_fallbackCacheKey, _fallbackResult);
          return _fallbackResult;
        } catch (fallbackError) {
          this.logger.error(
            `Fallback provider (${this.fallbackProvider}) also failed: ${fallbackError.message}`,
          );
          throw new Error(`LLM generation failed with both primary (${this.primaryProvider}) and fallback (${this.fallbackProvider}) providers. Primary Error: ${primaryError.message}, Fallback Error: ${fallbackError.message}`);
        }
      } else {
        this.logger.error(
          `Primary provider (${this.primaryProvider}) failed and no fallback configured or fallback is same as primary.`,
        );
        throw new Error(`LLM generation failed with primary provider (${this.primaryProvider}): ${primaryError.message}`);
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
      const _response = await axios.post(
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
        },
      );

      if (
        _response.data.content &&
        _response.data.content.length > 0 &&
        _response.data.content[0].type === 'text'
      ) {
        const _result = _response.data.content[0].text;
        this.logger.debug(
          `Anthropic API call successful. Output tokens: ${_response.data.usage?.output_tokens}`,
        );
        return _result;
      } else {
        this.logger.error(
          `Anthropic API returned unexpected response format or empty content. Response: ${JSON.stringify(_response.data)}`,
        );
        throw new Error('Anthropic API returned unexpected response format or empty content.');
      }
    } catch (error) {
      this.logger.error(`Error calling Anthropic API: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(
          `Anthropic API response: Status=${error.response.status}, Data=${JSON.stringify(error.response.data)}`,
        );
        throw new Error(`Anthropic API request failed with status ${error.response.status}: ${error.message}`);
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
      const _response = await axios.post(
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
        },
      );

      if (
        _response.data.choices &&
        _response.data.choices.length > 0 &&
        _response.data.choices[0].message
      ) {
        const _result = _response.data.choices[0].message.content;
        this.logger.debug(
          `OpenAI API call successful. Output tokens: ${_response.data.usage?.completion_tokens}`,
        );
        return _result;
      } else {
        this.logger.error(
          `OpenAI API returned unexpected response format or empty content. Response: ${JSON.stringify(_response.data)}`,
        );
        throw new Error('OpenAI API returned unexpected response format or empty content.');
      }
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(
          `OpenAI API response: Status=${error.response.status}, Data=${JSON.stringify(error.response.data)}`,
        );
        throw new Error(`OpenAI API request failed with status ${error.response.status}: ${error.message}`);
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
    const _provider = providerOverride || options.provider || this.primaryProvider;
    const modelKey = options.model || (_provider === 'anthropic' ? this.defaultAnthropicModel : this.defaultOpenaiModel);
    return `${_provider}:${modelKey}:${options.temperature || this.defaultTemperature}:${prompt}`;
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

  async analyzeRequirement(requirementText: string): Promise<any> {
    const prompt = `分析以下需求文本，提取关键功能点、约束条件和可能的实现难点：

${requirementText}

请以JSON格式返回分析结果，包含以下字段：
- 功能点：主要功能点列表
- 约束条件：需求中提到的限制或要求
- 难点：可能的实现难点或挑战
- 建议：针对这些难点的建议解决方案`;

    const analysisText = await this.generateContent(prompt, {
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
    const prompt = `基于以下需求文本，生成需要澄清的问题：

需求文本：
${requirementText}

已有的澄清信息：
${existingClarifications}

请生成5个关键问题，这些问题的澄清将帮助更好地理解和实现需求。
以JSON格式返回，包含questions数组，每个问题包含id、question和importance字段。`;

    const questionsText = await this.generateContent(prompt, {
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
    const prompt = `分析以下需求澄清过程的进展情况：

需求文本：
${requirementText}

澄清历史：
${clarificationHistory}

请评估当前澄清进度，并确定是否已收集足够信息来实现需求。
以JSON格式返回，包含以下字段：
- 完成度：表示澄清过程的完成百分比（0-100）
- 未解决问题：列出尚未完全澄清的关键问题
- 建议：下一步应该关注的澄清方向
- 是否可以开始实现：布尔值，表示是否已有足够信息开始实现`;

    const analysisText = await this.generateContent(prompt, {
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
    });

    try {
      return JSON.parse(analysisText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async generateExpectationModel(requirement: any, clarifications: any[]): Promise<any> {
    const clarificationInfo = clarifications.map((c) => `问题: ${c.questionId}, 答案: ${c.answer}`).join('\n');

    const prompt = `基于以下需求和澄清信息，生成详细的期望模型：

需求文本：
${requirement.text}

澄清信息：
${clarificationInfo}

请生成详细的期望模型，包含以下内容：
- 功能列表：详细的功能描述和优先级
- 数据模型：主要实体及其关系
- 接口定义：API或服务接口定义
- 非功能需求：性能、安全、可靠性等需求
- 验收标准：验证实现是否满足需求的标准

以JSON格式返回。`;

    const expectationsText = await this.generateContent(prompt, {
      systemPrompt: templates.CLARIFIER_SYSTEM_PROMPT,
      maxTokens: 8000,
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
    const prompt = `基于以下期望模型，生成${language}代码，使用${framework}框架，遵循${codeStyle}代码风格：

期望模型：
${expectationModel}

请生成完整的实现代码，包括：
- 主要功能实现
- 数据模型定义
- 接口实现
- 错误处理
- 基本测试

以JSON格式返回，包含files数组，每个文件包含path、content和language字段。`;

    const codeText = await this.generateContent(prompt, {
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 8000,
    });

    try {
      return JSON.parse(codeText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async optimizeCode(originalCode: string, expectationModel: string): Promise<any> {
    const prompt = `优化以下代码，确保它满足期望模型中的需求：

原始代码：
${originalCode}

期望模型：
${expectationModel}

请优化代码，关注以下方面：
- 性能优化
- 代码可读性
- 最佳实践
- 错误处理
- 安全性

以JSON格式返回优化结果，包含files数组，每个文件包含path、content和optimizations字段（描述所做的优化）。`;

    const optimizedCodeText = await this.generateContent(prompt, {
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
    const prompt = `为以下代码生成详细文档，基于期望模型中的需求：

代码：
${code}

期望模型：
${expectationModel}

请生成包含以下内容的文档：
- 概述和架构说明
- 安装和配置指南
- API参考文档
- 使用示例
- 常见问题解答`;

    return this.generateContent(prompt, {
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });
  }

  async validateCode(expectationModel: string, codeImplementation: string): Promise<any> {
    const prompt = `验证以下代码实现是否满足期望模型中的需求：

期望模型：
${expectationModel}

代码实现：
${codeImplementation}

请全面验证代码，关注以下方面：
- 功能完整性：是否实现了所有需求
- 代码质量：结构、可读性、最佳实践
- 潜在问题：错误处理、边界情况、安全问题
- 性能考虑：是否有明显的性能问题

以JSON格式返回验证结果，包含验证通过的项目、发现的问题及改进建议。`;

    const validationText = await this.generateContent(prompt, {
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
    const prompt = `基于以下期望模型和代码实现，生成全面的测试用例：

期望模型：
${expectationModel}

代码实现：
${codeImplementation}

请生成全面的测试用例，涵盖：
- 单元测试
- 集成测试
- 边界条件测试
- 异常情况测试
- 性能测试建议

以JSON格式返回测试用例，每个测试用例包含testName、type、description、input、expectedOutput和testCode字段。`;

    const testCasesText = await this.generateContent(prompt, {
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
    const prompt = `分析以下验证结果，并提供改进建议：

验证结果：
${validationResults}

期望模型：
${expectationModel}

代码实现：
${codeImplementation}

请分析验证结果，并提供具体的改进建议。
以JSON格式返回分析结果，包含以下字段：
- 主要问题：按严重程度排序的问题列表
- 改进建议：针对每个问题的具体改进建议
- 优先级：建议的修复优先级
- 预期结果：完成改进后的预期效果`;

    const analysisText = await this.generateContent(prompt, {
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
    const prompt = `将以下来自${sourceModule}模块的数据转换为${targetModule}模块可以理解的格式：

源数据 (${sourceModule}):
${sourceData}

请将数据转换为${targetModule}模块需要的格式和语义，保持核心信息不变。
以JSON格式返回转换结果。`;

    const translationText = await this.generateContent(prompt, {
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
    const prompt = `使用以下上下文信息丰富原始数据：

原始数据：
${originalData}

上下文查询：
${contextQuery}

请使用上下文信息丰富原始数据，使其更全面、更有用。
保持原始数据的核心信息不变，只添加相关的上下文信息。
以JSON格式返回丰富后的数据。`;

    const enrichedText = await this.generateContent(prompt, {
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
    const prompt = `解决以下两个模块之间的语义冲突：

${moduleA}模块数据：
${dataA}

${moduleB}模块数据：
${dataB}

请解决这两个模块之间的语义冲突，创建一个统一的视图。
以JSON格式返回解决结果，包含合并后的数据和解决冲突的说明。`;

    const resolutionText = await this.generateContent(prompt, {
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
    const prompt = `基于以下查询，从数据中提取语义见解：

数据：
${data}

查询：
${query}

请提取与查询相关的语义见解和关键信息。
以JSON格式返回提取的见解，包含insights数组和relevance评分。`;

    const insightsText = await this.generateContent(prompt, {
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

  async generateCodeWithSemanticInput(
    expectation: unknown,
    semanticAnalysis: unknown,
    options?: unknown,
  ): Promise<any> {
    this.logger.log('Generating code with semantic input');

    const promptTemplate = templates.GENERATE_CODE_WITH_SEMANTIC_INPUT_PROMPT || `
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

    const prompt = promptTemplate
      .replace('{expectationModel}', JSON.stringify(expectation, null, 2))
      .replace('{semanticAnalysis}', JSON.stringify(semanticAnalysis, null, 2))
      .replace('{options}', JSON.stringify(options || {}, null, 2));

    const codeText = await this.generateContent(prompt, {
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 8000,
    });

    try {
      return JSON.parse(codeText);
    } catch (error) {
      this.logger.error(`Error parsing LLM response: ${error.message}`, error.stack);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  async analyzeMultiRoundDialogue(requirementText: string, dialogueHistory: string): Promise<any> {
    this.logger.log('Analyzing multi-round dialogue process');

    const prompt = `分析以下多轮对话过程，评估需求澄清的质量和进展：

需求文本：
${requirementText}

对话历史：
${dialogueHistory}

请分析对话过程，评估需求澄清的质量和进展情况。
以JSON格式返回分析结果，包含以下字段：
- 关键点：已澄清的关键需求点
- 遗漏点：尚未澄清的重要需求点
- 质量评分：对话过程的整体质量（1-10分）
- 建议：改进对话过程的建议
- 结论：对需求理解完整性的总体评估`;

    const analysisText = await this.generateContent(prompt, {
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

    const prompt = `基于以下期望模型，生成一个简洁明了的总结，确保用户能理解系统将要实现什么：

期望模型：
${JSON.stringify(expectationModel, null, 2)}

请生成一个全面但简洁的总结，包含以下方面：
- 核心功能概述
- 关键特性和价值
- 主要约束和限制
- 实现的预期范围
- 用户体验预期

以JSON格式返回，包含summary字段和keyPoints数组。`;

    const summaryText = await this.generateContent(prompt, {
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
