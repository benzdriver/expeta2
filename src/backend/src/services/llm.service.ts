import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as templates from './prompt-templates';

interface LlmRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private cache: Map<string, { result: string; timestamp: number }> = new Map();
  private cacheTTL: number = 3600000; // 1 hour in milliseconds

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.defaultModel = 'gpt-4';
    this.defaultTemperature = 0.7;
    this.defaultMaxTokens = 4000;
  }

  async generateContent(
    prompt: string, 
    options: LlmRequestOptions = {}
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(prompt, options);
    const cachedResult = this.getFromCache(cacheKey);
    
    if (cachedResult) {
      this.logger.debug('Using cached LLM result');
      return cachedResult;
    }

    const model = options.model || this.defaultModel;
    const temperature = options.temperature || this.defaultTemperature;
    const maxTokens = options.maxTokens || this.defaultMaxTokens;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant specialized in software requirements analysis and clarification.';

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      const result = response.data.choices[0].message.content;
      this.addToCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Error calling LLM API: ${error.message}`, error.stack);
      
      if (error.response) {
        this.logger.error(`API response: ${JSON.stringify(error.response.data)}`);
      }
      
      throw new Error(`Failed to generate content using LLM: ${error.message}`);
    }
  }

  private generateCacheKey(prompt: string, options: LlmRequestOptions): string {
    return `${options.model || this.defaultModel}:${options.temperature || this.defaultTemperature}:${prompt}`;
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
    const prompt = templates.REQUIREMENT_ANALYSIS_PROMPT.replace(
      '{requirementText}',
      requirementText
    );

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

  async generateClarificationQuestions(requirementText: string, existingClarifications: string): Promise<any> {
    const prompt = templates.GENERATE_CLARIFICATION_QUESTIONS_PROMPT
      .replace('{requirementText}', requirementText)
      .replace('{existingClarifications}', existingClarifications);

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

  async analyzeClarificationProgress(requirementText: string, clarificationHistory: string): Promise<any> {
    const prompt = templates.ANALYZE_CLARIFICATION_PROGRESS_PROMPT
      .replace('{requirementText}', requirementText)
      .replace('{clarificationHistory}', clarificationHistory);

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
    const clarificationInfo = clarifications.map(c => `问题: ${c.questionId}, 答案: ${c.answer}`).join('\n');
    
    const prompt = templates.GENERATE_EXPECTATIONS_PROMPT
      .replace('{requirementText}', requirement.text)
      .replace('{clarificationInfo}', clarificationInfo);

    const expectationsText = await this.generateContent(prompt, {
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

  async generateCode(expectationModel: string, language: string, framework: string, codeStyle: string): Promise<any> {
    const prompt = templates.GENERATE_CODE_PROMPT
      .replace('{expectationModel}', expectationModel)
      .replace('{language}', language)
      .replace('{framework}', framework)
      .replace('{codeStyle}', codeStyle);

    const codeText = await this.generateContent(prompt, {
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
    const prompt = templates.OPTIMIZE_CODE_PROMPT
      .replace('{originalCode}', originalCode)
      .replace('{expectationModel}', expectationModel);

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
    const prompt = templates.GENERATE_DOCUMENTATION_PROMPT
      .replace('{code}', code)
      .replace('{expectationModel}', expectationModel);

    return this.generateContent(prompt, {
      systemPrompt: templates.GENERATOR_SYSTEM_PROMPT,
      maxTokens: 6000,
    });
  }

  async validateCode(expectationModel: string, codeImplementation: string): Promise<any> {
    const prompt = templates.VALIDATE_CODE_PROMPT
      .replace('{expectationModel}', expectationModel)
      .replace('{codeImplementation}', codeImplementation);

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
    const prompt = templates.GENERATE_TEST_CASES_PROMPT
      .replace('{expectationModel}', expectationModel)
      .replace('{codeImplementation}', codeImplementation);

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

  async analyzeValidationResults(validationResults: string, expectationModel: string, codeImplementation: string): Promise<any> {
    const prompt = templates.ANALYZE_VALIDATION_RESULTS_PROMPT
      .replace('{validationResults}', validationResults)
      .replace('{expectationModel}', expectationModel)
      .replace('{codeImplementation}', codeImplementation);

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

  async translateBetweenModules(sourceModule: string, targetModule: string, sourceData: string): Promise<any> {
    const prompt = templates.TRANSLATE_BETWEEN_MODULES_PROMPT
      .replace(/{sourceModule}/g, sourceModule)
      .replace(/{targetModule}/g, targetModule)
      .replace('{sourceData}', sourceData);

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

  async enrichWithContext(module: string, originalData: string, contextQuery: string): Promise<any> {
    const prompt = templates.ENRICH_WITH_CONTEXT_PROMPT
      .replace('{module}', module)
      .replace('{originalData}', originalData)
      .replace('{contextQuery}', contextQuery);

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

  async resolveSemanticConflicts(moduleA: string, dataA: string, moduleB: string, dataB: string): Promise<any> {
    const prompt = templates.RESOLVE_SEMANTIC_CONFLICTS_PROMPT
      .replace('{moduleA}', moduleA)
      .replace('{dataA}', dataA)
      .replace('{moduleB}', moduleB)
      .replace('{dataB}', dataB);

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
    const prompt = templates.EXTRACT_SEMANTIC_INSIGHTS_PROMPT
      .replace('{data}', data)
      .replace('{query}', query);

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
}
