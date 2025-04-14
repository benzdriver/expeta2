import { Test, TestingModule } from '@nestjs/testing';
import { LlmResolutionStrategy } from './llm-resolution.strategy';
import { LlmRouterService } from '../../../../../services/llm-router.service';
import { SemanticDescriptor } from '../../../interfaces/semantic-descriptor.interface';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('LlmResolutionStrategy', () => {
  let strategy: LlmResolutionStrategy;
  let llmService: LlmRouterService;

  const mockLlmService = {
    generateContent: jest.fn().mockReturnValue(Promise.resolve('{"result": "llm generated result"}')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmResolutionStrategy,
        {
          provide: LlmRouterService,
          useValue: mockLlmService,
        },
      ],
    }).compile();

    strategy = module.get<LlmResolutionStrategy>(LlmResolutionStrategy);
    llmService = module.get<LlmRouterService>(LlmRouterService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('canResolve', () => {
    it('should always return true', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const targetDescriptor: SemanticDescriptor = {
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      const result = await strategy.canResolve(sourceDescriptor, targetDescriptor);
      expect(result).toBe(true);
    });

    it('should handle composite descriptors', async () => {
      const sourceDescriptor = {
        type: 'composite',
        components: [
          {
            entity: 'moduleA',
            description: 'Test module A',
            attributes: {},
            metadata: {},
          } as SemanticDescriptor,
        ],
      };

      const targetDescriptor = {
        type: 'composite',
        components: [
          {
            entity: 'moduleB',
            description: 'Test module B',
            attributes: {},
            metadata: {},
          } as SemanticDescriptor,
        ],
      };

      const result = await strategy.canResolve(sourceDescriptor, targetDescriptor);
      expect(result).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should successfully resolve using LLM', async () => {
      const sourceData = { id: 1, name: 'Source' };
      const targetData = { id: 2, name: 'Target' };

      const sourceDescriptor: SemanticDescriptor = {
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const targetDescriptor: SemanticDescriptor = {
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      mockLlmService.generateContent.mockReturnValueOnce(Promise.resolve('{"id": 1, "name": "Target", "source_id": 1}'));

      const result = await strategy.resolve(sourceData, targetData, sourceDescriptor, targetDescriptor);

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('llm_resolution');
      expect(result.confidence).toBeGreaterThan(0);
      expect(llmService.generateContent).toHaveBeenCalled();
      expect(result.resolvedData).toEqual({
        id: 1,
        name: 'Target',
        source_id: 1,
      });
    });

    it('should handle LLM response parsing errors', async () => {
      const sourceData = { id: 1, name: 'Source' };
      const targetData = { id: 2, name: 'Target' };

      const sourceDescriptor: SemanticDescriptor = {
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const targetDescriptor: SemanticDescriptor = {
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      mockLlmService.generateContent.mockReturnValueOnce(Promise.resolve('Invalid JSON response'));

      const result = await strategy.resolve(sourceData, targetData, sourceDescriptor, targetDescriptor);

      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe('llm_resolution');
      expect(result.confidence).toBe(0);
      expect(result.unresolvedConflicts).toHaveLength(1);
      expect(result.unresolvedConflicts[0].type).toBe('llm_error');
    });

    it('should handle LLM service errors', async () => {
      const sourceData = { id: 1, name: 'Source' };
      const targetData = { id: 2, name: 'Target' };

      const sourceDescriptor: SemanticDescriptor = {
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const targetDescriptor: SemanticDescriptor = {
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      mockLlmService.generateContent.mockReturnValueOnce(Promise.reject(new Error('LLM service error')));

      const result = await strategy.resolve(sourceData, targetData, sourceDescriptor, targetDescriptor);

      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe('llm_resolution');
      expect(result.confidence).toBe(0);
      expect(result.unresolvedConflicts).toHaveLength(1);
      expect(result.unresolvedConflicts[0].type).toBe('llm_error');
      expect(result.unresolvedConflicts[0].reason).toBe('LLM service error');
    });

    it('should calculate confidence based on resolution quality', async () => {
      const sourceData = { id: 1, name: 'Source', description: 'Test source' };
      const targetData = { id: 2, name: 'Target', category: 'Test' };

      const sourceDescriptor: SemanticDescriptor = {
        entity: 'moduleA',
        description: 'Test module A',
        attributes: {},
        metadata: {},
      };

      const targetDescriptor: SemanticDescriptor = {
        entity: 'moduleB',
        description: 'Test module B',
        attributes: {},
        metadata: {},
      };

      mockLlmService.generateContent.mockReturnValueOnce(Promise.resolve(
        '{"id": 1, "name": "Target", "description": "Test source", "category": "Test"}'
      ));

      const result = await strategy.resolve(sourceData, targetData, sourceDescriptor, targetDescriptor);

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('llm_resolution');
      expect(result.confidence).toBeGreaterThan(0.5); // Should have high confidence
    });
  });
});
