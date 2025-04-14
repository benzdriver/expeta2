import { Test, TestingModule } from '@nestjs/testing';
import { PatternMatchingStrategy } from './pattern-matching.strategy';
import { IntelligentCacheService } from '../../intelligent-cache/intelligent-cache.service';
import { SemanticDescriptor } from '../../../interfaces/semantic-descriptor.interface';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('PatternMatchingStrategy', () => {
  let strategy: PatternMatchingStrategy;
  let intelligentCacheService: IntelligentCacheService;

  const mockIntelligentCacheService = {
    retrieveTransformationPath: jest.fn().mockReturnValue(Promise.resolve(null)),
    storeTransformationPath: jest.fn().mockReturnValue(Promise.resolve(undefined)),
    updateUsageStatistics: jest.fn().mockReturnValue(Promise.resolve(undefined)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatternMatchingStrategy,
        {
          provide: IntelligentCacheService,
          useValue: mockIntelligentCacheService,
        },
      ],
    }).compile();

    strategy = module.get<PatternMatchingStrategy>(PatternMatchingStrategy);
    intelligentCacheService = module.get<IntelligentCacheService>(IntelligentCacheService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('canResolve', () => {
    it('should return false when no similar patterns found', async () => {
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

      mockIntelligentCacheService.retrieveTransformationPath.mockReturnValueOnce(Promise.resolve(null));

      const result = await strategy.canResolve(sourceDescriptor, targetDescriptor);
      expect(result).toBe(false);
      expect(intelligentCacheService.retrieveTransformationPath).toHaveBeenCalled();
    });

    it('should return true when similar patterns found', async () => {
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

      const mockTransformationPath = {
        steps: [
          {
            type: 'field_mapping',
            mapping: { targetField: 'sourceField' },
          },
        ],
      };

      mockIntelligentCacheService.retrieveTransformationPath.mockReturnValueOnce(Promise.resolve(mockTransformationPath));

      const result = await strategy.canResolve(sourceDescriptor, targetDescriptor);
      expect(result).toBe(true);
      expect(intelligentCacheService.retrieveTransformationPath).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
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

      mockIntelligentCacheService.retrieveTransformationPath.mockReturnValueOnce(Promise.reject(new Error('Test error')));

      const result = await strategy.canResolve(sourceDescriptor, targetDescriptor);
      expect(result).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should successfully resolve when similar patterns found', async () => {
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

      const mockTransformationPath = {
        steps: [
          {
            type: 'field_mapping',
            mapping: { id: 'id', name: 'name' },
          },
        ],
      };

      mockIntelligentCacheService.retrieveTransformationPath.mockReturnValueOnce(Promise.resolve(mockTransformationPath));

      const result = await strategy.resolve(sourceData, targetData, sourceDescriptor, targetDescriptor);

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('pattern_matching');
      expect(result.confidence).toBeGreaterThan(0);
      expect(intelligentCacheService.retrieveTransformationPath).toHaveBeenCalled();
    });

    it('should fail to resolve when no similar patterns found', async () => {
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

      mockIntelligentCacheService.retrieveTransformationPath.mockReturnValueOnce(Promise.resolve(null));

      const result = await strategy.resolve(sourceData, targetData, sourceDescriptor, targetDescriptor);

      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe('pattern_matching');
      expect(result.confidence).toBe(0);
      expect(result.unresolvedConflicts).toHaveLength(1);
      expect(result.unresolvedConflicts[0].type).toBe('no_similar_patterns');
    });

    it('should handle errors in transformation application', async () => {
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

      const mockTransformationPath = {
        steps: [
          {
            type: 'invalid_type',
            mapping: {},
          },
        ],
      };

      mockIntelligentCacheService.retrieveTransformationPath.mockReturnValueOnce(Promise.resolve(mockTransformationPath));

      const result = await strategy.resolve(sourceData, targetData, sourceDescriptor, targetDescriptor);

      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe('pattern_matching');
      expect(result.confidence).toBe(0);
      expect(result.unresolvedConflicts).toHaveLength(1);
      expect(result.unresolvedConflicts[0].type).toBe('pattern_matching_error');
    });
  });
});
