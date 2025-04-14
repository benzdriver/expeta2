import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import axios from 'axios';
import { AxiosResponse, AxiosError } from 'axios';
import { LlmRouterService } from '../llm-router.service';
import { AnthropicMessageResponse, OpenAIChatCompletionResponse } from '../llm-router.service';

describe('LlmRouterService', () => {
  let service: LlmRouterService;
  let configService: ConfigService;
  let httpService: HttpService;

  const mockAnthropicApiKey = 'test-anthropic-key';
  const mockOpenaiApiKey = 'test-openai-key';
  const mockAnthropicModel = 'claude-3-5-sonnet-20240620'; // Match service default
  const mockOpenaiModel = 'gpt-4';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule], // Import HttpModule to correctly mock HttpService
      providers: [
        LlmRouterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ANTHROPIC_API_KEY') return mockAnthropicApiKey;
              if (key === 'OPENAI_API_KEY') return mockOpenaiApiKey;
              if (key === 'ANTHROPIC_DEFAULT_MODEL') return mockAnthropicModel;
              if (key === 'OPENAI_DEFAULT_MODEL') return mockOpenaiModel;
              if (key === 'ANTHROPIC_API_URL') return 'https://api.anthropic.com/v1/messages';
              if (key === 'OPENAI_API_URL') return 'https://api.openai.com/v1/chat/completions';
              return null;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LlmRouterService>(LlmRouterService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateContent', () => {
    const prompt = 'Test prompt';
    const options = { temperature: 0.7 };

    const mockAnthropicSuccessResponse: AxiosResponse<AnthropicMessageResponse> = {
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
      config: { headers: {} as any }, // Use 'as any' to bypass strict type checks if needed
    };

    const mockOpenaiSuccessResponse: AxiosResponse<OpenAIChatCompletionResponse> = {
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
      config: { headers: {} as any }, // Use 'as any' to bypass strict type checks if needed
    };

    const mockAnthropicApiError = new AxiosError(
      'Anthropic API Error',
      '500',
      undefined,
      undefined,
      {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: { headers: {} as any },
      } as AxiosResponse,
    );

    const mockOpenaiApiError = new AxiosError('OpenAI API Error', '500', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      data: {},
      headers: {},
      config: { headers: {} as any },
    } as AxiosResponse);

    it('should call Anthropic API successfully and return response', async () => {
      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockAnthropicSuccessResponse));

      const result = await service.generateContent(prompt, options);

      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({ model: mockAnthropicModel, messages: expect.any(Array) }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': mockAnthropicApiKey }),
        }),
      );
      expect(result).toBe('Anthropic response');
    });

    it('should fall back to OpenAI API when Anthropic API fails', async () => {
      (httpService.post as jest.Mock)
        .mockReturnValueOnce(throwError(() => mockAnthropicApiError)) // Anthropic fails
        .mockReturnValueOnce(of(mockOpenaiSuccessResponse)); // OpenAI succeeds

      const result = await service.generateContent(prompt, options);

      expect(httpService.post).toHaveBeenCalledTimes(2);
      expect(httpService.post).toHaveBeenNthCalledWith(
        1,
        'https://api.anthropic.com/v1/messages',
        expect.any(Object),
        expect.any(Object),
      );
      expect(httpService.post).toHaveBeenNthCalledWith(
        2,
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({ model: mockOpenaiModel, messages: expect.any(Array) }),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Bearer ${mockOpenaiApiKey}` }),
        }),
      );
      expect(result).toBe('OpenAI response');
    });

    it('should throw an error when both Anthropic and OpenAI APIs fail', async () => {
      (httpService.post as jest.Mock)
        .mockReturnValueOnce(throwError(() => mockAnthropicApiError)) // Anthropic fails
        .mockReturnValueOnce(throwError(() => mockOpenaiApiError)); // OpenAI fails

      await expect(service.generateContent(prompt, options)).rejects.toThrow(
        'LLM generation failed after multiple retries with all providers.',
      );
      expect(httpService.post).toHaveBeenCalledTimes(2); // Attempted both providers
    });

    it('should fall back to OpenAI if Anthropic key is missing', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_API_KEY') return undefined; // Simulate missing key
        if (key === 'OPENAI_API_KEY') return mockOpenaiApiKey;
        if (key === 'ANTHROPIC_DEFAULT_MODEL') return mockAnthropicModel;
        if (key === 'OPENAI_DEFAULT_MODEL') return mockOpenaiModel;
        if (key === 'ANTHROPIC_API_URL') return 'https://api.anthropic.com/v1/messages';
        if (key === 'OPENAI_API_URL') return 'https://api.openai.com/v1/chat/completions';
        return null;
      });
      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockOpenaiSuccessResponse)); // OpenAI should be called

      const result = await service.generateContent(prompt, options);

      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions', // OpenAI URL
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toBe('OpenAI response');
    });

    it('should throw an error if both API keys are missing', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_API_KEY') return undefined;
        if (key === 'OPENAI_API_KEY') return undefined; // Both keys missing
        if (key === 'ANTHROPIC_DEFAULT_MODEL') return mockAnthropicModel;
        if (key === 'OPENAI_DEFAULT_MODEL') return mockOpenaiModel;
        if (key === 'ANTHROPIC_API_URL') return 'https://api.anthropic.com/v1/messages';
        if (key === 'OPENAI_API_URL') return 'https://api.openai.com/v1/chat/completions';
        return null;
      });

      await expect(service.generateContent(prompt, options)).rejects.toThrow(
        'LLM generation failed: No providers configured or available.',
      );
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should use OpenAI if specified as provider', async () => {
      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockOpenaiSuccessResponse));
      const specificOptions = { ...options, provider: 'openai' as const };

      const result = await service.generateContent(prompt, specificOptions);

      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions', // OpenAI URL
        expect.objectContaining({ model: mockOpenaiModel }),
        expect.any(Object),
      );
      expect(result).toBe('OpenAI response');
    });

    it('should use Anthropic if specified as provider', async () => {
      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockAnthropicSuccessResponse));
      const specificOptions = { ...options, provider: 'anthropic' as const };

      const result = await service.generateContent(prompt, specificOptions);

      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages', // Anthropic URL
        expect.objectContaining({ model: mockAnthropicModel }),
        expect.any(Object),
      );
      expect(result).toBe('Anthropic response');
    });

    it('should default to Anthropic if provider is invalid', async () => {
      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockAnthropicSuccessResponse));
      const specificOptions = { ...options, provider: 'invalid-provider' };

      const result = await service.generateContent(prompt, specificOptions);

      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages', // Should default to Anthropic
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toBe('Anthropic response');
    });
  });
});
