import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { HttpModule } from '@nestjs/axios';

import { HttpService } from '@nestjs/axios'; /* eslint-disable-line @typescript-eslint/no-unused-vars */
import { of, throwError } from 'rxjs'; /* eslint-disable-line @typescript-eslint/no-unused-vars */
import axios from 'axios'; /* eslint-disable-line @typescript-eslint/no-unused-vars */
import { AxiosResponse, AxiosError } from 'axios';
import { LlmRouterService } from '../llm-router.service';
import { AnthropicMessageResponse, OpenAIChatCompletionResponse } from '../llm-router.service';

describe('LlmRouterService', () => {
  let service: LlmRouterService;
  let _configService: ConfigService;

  const _mockAnthropicApiKey = 
  const _mockOpenaiApiKey = 
  const _mockAnthropicModel = 
  const _mockOpenaiModel = 

  const _mockConfigGet = 
    if (key === 'ANTHROPIC_API_KEY') return mockAnthropicApiKey;
    if (key === 'OPENAI_API_KEY') return mockOpenaiApiKey;
    if (key === 'ANTHROPIC_DEFAULT_MODEL') return mockAnthropicModel;
    if (key === 'OPENAI_DEFAULT_MODEL') return mockOpenaiModel;
    if (key === 'ANTHROPIC_API_URL') return 'https://api.anthropic.com/v1/messages';
    if (key === 'OPENAI_API_URL') return 'https://api.openai.com/v1/chat/completions';
    if (key === 'DEFAULT_TEMPERATURE') return 0.7;
    if (key === 'DEFAULT_MAX_TOKENS') return 4000; // OpenAI default
    if (key === 'DEFAULT_ANTHROPIC_MAX_TOKENS') return 4096; // Anthropic default
    return null;
  });

  beforeEach(async () => {
    mockConfigGet.mockClear();
    mockConfigGet.mockImplementation((key: string) => {
      if (key === 'ANTHROPIC_API_KEY') return mockAnthropicApiKey;
      if (key === 'OPENAI_API_KEY') return mockOpenaiApiKey;
      if (key === 'ANTHROPIC_DEFAULT_MODEL') return mockAnthropicModel;
      if (key === 'OPENAI_DEFAULT_MODEL') return mockOpenaiModel;
      if (key === 'ANTHROPIC_API_URL') return 'https://api.anthropic.com/v1/messages';
      if (key === 'OPENAI_API_URL') return 'https://api.openai.com/v1/chat/completions';
      if (key === 'DEFAULT_TEMPERATURE') return 0.7;
      if (key === 'DEFAULT_MAX_TOKENS') return 4000;
      if (key === 'DEFAULT_ANTHROPIC_MAX_TOKENS') return 4096;
      return null;
    });

    const _module: TestingModule = 
      imports: [HttpModule], // HttpModule is needed by the service itself
      providers: [
        LlmRouterService,
        {
          provide: ConfigService,
          useValue: {
            get: mockConfigGet, // Use the mock function here
          },
        },
      ],
    }).compile();

    service = module.get<LlmRouterService>(LlmRouterService);
    _configService = module.get<ConfigService>(ConfigService); // Keep reference if needed, but use mockConfigGet for mocking

    jest.clearAllMocks(); // Clear other mocks like spies
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateContent', () => {
    const _prompt = 
    const _options = 

    beforeEach(() => {
      jest.spyOn(service as unknown, '_callAnthropic').mockClear(); // Clear any previous mocks/calls
      jest.spyOn(service as unknown, '_callOpenAI').mockClear();
    });

    const _mockAnthropicSuccessResponse: AxiosResponse<AnthropicMessageResponse> = {
      data: {
        id: 'anthropic-test-id',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Anthropic response' }],
        model: mockAnthropicModel,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as unknown }, // Use 'as any' to bypass strict type checks if needed
    };

    const _mockOpenaiSuccessResponse: AxiosResponse<OpenAIChatCompletionResponse> = {
      data: {
        id: 'openai-test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: mockOpenaiModel,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'OpenAI response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as unknown }, // Use 'as any' to bypass strict type checks if needed
    };

    const _mockAnthropicApiError = new AxiosError(
      'Anthropic API Error',
      '500',
      undefined,
      undefined,
      {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: { headers: {} as unknown },
      } as AxiosResponse,
    );

    const _mockOpenaiApiError = new AxiosError('OpenAI API Error', '500', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      data: {},
      headers: {},
      config: { headers: {} as unknown },
    } as AxiosResponse);

    it('should call Anthropic API successfully and return response', async () => {
      jest.spyOn(service as unknown, '_callAnthropic').mockResolvedValue('Anthropic response');
      jest.spyOn(service as unknown, '_callOpenAI').mockResolvedValue('OpenAI response');

      const _result = 

      expect(service['_callAnthropic']).toHaveBeenCalledTimes(1);
      expect(service['_callAnthropic']).toHaveBeenCalledWith(
        prompt,
        'You are a helpful assistant.', // Default system prompt
        mockAnthropicModel,
        0.7, // Default temperature
        4096, // Default Anthropic max tokens
      );
      expect(service['_callOpenAI']).not.toHaveBeenCalled();
      expect(result).toBe('Anthropic response');
    });

    it('should fall back to OpenAI API when Anthropic API fails', async () => {
      const _anthropicError = 
      jest.spyOn(service as unknown, '_callAnthropic').mockRejectedValue(anthropicError);
      jest.spyOn(service as unknown, '_callOpenAI').mockResolvedValue('OpenAI response');

      const _result = 

      expect(service['_callAnthropic']).toHaveBeenCalledTimes(1);
      expect(service['_callAnthropic']).toHaveBeenCalledWith(
        prompt,
        'You are a helpful assistant.', // Default system prompt
        mockAnthropicModel,
        0.7, // Default temperature
        4096, // Default Anthropic max tokens
      );
      expect(service['_callOpenAI']).toHaveBeenCalledTimes(1);
      expect(service['_callOpenAI']).toHaveBeenCalledWith(
        prompt,
        'You are a helpful assistant.',
        mockOpenaiModel,
        0.7,
        4000, // Default OpenAI max tokens
      );
      expect(result).toBe('OpenAI response');
    });

    it('should throw an error when both Anthropic and OpenAI APIs fail', async () => {
      const _anthropicError = 
      jest.spyOn(service as unknown, '_callAnthropic').mockRejectedValue(anthropicError);
      const _openaiError = 
      jest.spyOn(service as unknown, '_callOpenAI').mockRejectedValue(openaiError);

      await expect(service.generateContent(prompt, options)).rejects.toThrow(
        `LLM generation failed with both primary (anthropic) and fallback (openai) providers. Primary Error: ${anthropicError.message}, Fallback Error: ${openaiError.message}`,
      );

      expect(service['_callAnthropic']).toHaveBeenCalledTimes(1);
      expect(service['_callOpenAI']).toHaveBeenCalledTimes(1);
    });

    it('should fall back to OpenAI if Anthropic key is missing', async () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_API_KEY') return undefined; // Simulate missing key
        if (key === 'OPENAI_API_KEY') return mockOpenaiApiKey;
        if (key === 'ANTHROPIC_DEFAULT_MODEL') return mockAnthropicModel;
        if (key === 'OPENAI_DEFAULT_MODEL') return mockOpenaiModel;
        if (key === 'ANTHROPIC_API_URL') return 'https://api.anthropic.com/v1/messages';
        if (key === 'OPENAI_API_URL') return 'https://api.openai.com/v1/chat/completions';
        if (key === 'DEFAULT_TEMPERATURE') return 0.7;
        if (key === 'DEFAULT_MAX_TOKENS') return 4000;
        if (key === 'DEFAULT_ANTHROPIC_MAX_TOKENS') return 4096;
        return null;
      });

      const _module: TestingModule = 
        imports: [HttpModule],
        providers: [LlmRouterService, { provide: ConfigService, useValue: { get: mockConfigGet } }],
      }).compile();
      const _testService = 

      const _anthropicSpy = 
      const _openaiSpy = 
        .spyOn(testService as unknown, '_callOpenAI')
        .mockResolvedValue('OpenAI response');

      const _result = 

      expect(anthropicSpy).not.toHaveBeenCalled();
      expect(openaiSpy).toHaveBeenCalledTimes(1);
      expect(openaiSpy).toHaveBeenCalledWith(
        prompt,
        'You are a helpful assistant.',
        mockOpenaiModel, // Should use OpenAI model now
        0.7,
        4000,
      );
      expect(result).toBe('OpenAI response');
    });

    it('should throw an error if both API keys are missing', async () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_API_KEY') return undefined;
        if (key === 'OPENAI_API_KEY') return undefined; // Both missing
        if (key === 'ANTHROPIC_DEFAULT_MODEL') return mockAnthropicModel;
        if (key === 'OPENAI_DEFAULT_MODEL') return mockOpenaiModel;
        if (key === 'ANTHROPIC_API_URL') return 'https://api.anthropic.com/v1/messages';
        if (key === 'OPENAI_API_URL') return 'https://api.openai.com/v1/chat/completions';
        if (key === 'DEFAULT_TEMPERATURE') return 0.7;
        if (key === 'DEFAULT_MAX_TOKENS') return 4000;
        if (key === 'DEFAULT_ANTHROPIC_MAX_TOKENS') return 4096;
        return null;
      });

      const _module: TestingModule = 
        imports: [HttpModule],
        providers: [LlmRouterService, { provide: ConfigService, useValue: { get: mockConfigGet } }],
      }).compile();
      const _testService = 

      const _anthropicSpy = 
      const _openaiSpy = jest.spyOn(testService as unknown, '_callOpenAI');

      await expect(testService.generateContent(prompt, options)).rejects.toThrow(
        'LLM generation failed with primary provider (openai): Primary provider (openai) is configured but API key is missing.',
      );

      expect(anthropicSpy).not.toHaveBeenCalled();
    });

    it('should use OpenAI if specified as provider', async () => {
      jest.spyOn(service as unknown, '_callOpenAI').mockResolvedValue('OpenAI response');
      const _anthropicSpy = 

      const _specificOptions = 
      const _result = 

      expect(anthropicSpy).not.toHaveBeenCalled();
      expect(service['_callOpenAI']).toHaveBeenCalledTimes(1);
      expect(service['_callOpenAI']).toHaveBeenCalledWith(
        prompt,
        'You are a helpful assistant.',
        mockOpenaiModel,
        0.7,
        4000, // Default OpenAI max tokens
      );
      expect(result).toBe('OpenAI response');
    });

    it('should use Anthropic if specified as provider', async () => {
      jest.spyOn(service as unknown, '_callAnthropic').mockResolvedValue('Anthropic response');
      const _openaiSpy = 

      const _specificOptions = 
      const _result = 

      expect(openaiSpy).not.toHaveBeenCalled();
      expect(service['_callAnthropic']).toHaveBeenCalledTimes(1);
      expect(service['_callAnthropic']).toHaveBeenCalledWith(
        prompt,
        'You are a helpful assistant.', // Default system prompt
        mockAnthropicModel,
        0.7, // Default temperature
        4096, // Default Anthropic max tokens
      );
      expect(result).toBe('Anthropic response');
    });

    it('should default to Anthropic if provider is invalid', async () => {
      jest.spyOn(service as unknown, '_callAnthropic').mockResolvedValue('Anthropic response');
      const _openaiSpy = 

      const _specificOptions = 
      const _result = 

      expect(openaiSpy).not.toHaveBeenCalled();
      expect(service['_callAnthropic']).toHaveBeenCalledTimes(1); // Should default to Anthropic
      expect(service['_callAnthropic']).toHaveBeenCalledWith(
        prompt,
        'You are a helpful assistant.', // Default system prompt
        mockAnthropicModel,
        0.7, // Default temperature
        4096, // Default Anthropic max tokens
      );
      expect(result).toBe('Anthropic response');
    });
  });
});
