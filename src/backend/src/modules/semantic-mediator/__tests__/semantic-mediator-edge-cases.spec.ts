
import { Test, TestingModule } from '@nestjs/testing';
import { SemanticMediatorService } from '../semantic-mediator.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { SemanticRegistryService } from '../components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from '../components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from '../components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from '../components/human-in-the-loop/human-in-the-loop.service';

describe('SemanticMediatorService Edge Cases', () => {
  let service: SemanticMediatorService;
  let mockLlmRouterService: any;
  let memoryServiceMock: any;
  let semanticRegistryMock: any;
  let transformationEngineMock: any;
  let intelligentCacheMock: any;
  let monitoringSystemMock: any;
  let humanInTheLoopMock: any;

  beforeEach(async () => {
    mockLlmRouterService = {
      translateBetweenModules: jest.fn().mockImplementation((source, target, data) => {
        if (data === null || data === undefined) {
          return Promise.resolve({ translated: true, data: null });
        } else if (typeof data === 'object' && Object.keys(data).length === 0) {
          return Promise.resolve({ translated: true, data: { empty: true } });
        } else if (Array.isArray(data) && data.length === 0) {
          return Promise.resolve({ translated: true, data: [] });
        } else {
          return Promise.resolve({ translated: true, data: 'translated data' });
        }
      }),
      enrichWithContext: jest.fn().mockImplementation((module, data, context) => {
        if (context && context.length > 1000) {
          return Promise.resolve({ enriched: true, data: 'enriched with large context' });
        } else if (context && context.includes('conflict')) {
          return Promise.resolve({ enriched: true, data: 'enriched with conflict resolution' });
        } else {
          return Promise.resolve({ enriched: true, data: 'enriched data' });
        }
      }),
      resolveSemanticConflicts: jest.fn().mockImplementation((moduleA, dataA, moduleB, dataB) => {
        if (dataA && dataA.unresolvable) {
          return Promise.reject(new Error('Unresolvable conflict'));
        } else if (dataA && dataA.nested && dataA.nested.conflict) {
          return Promise.resolve({ resolved: true, data: 'resolved nested conflict' });
        } else if (dataA && dataA.priority) {
          return Promise.resolve({ resolved: true, data: 'resolved with priority rules' });
        } else {
          return Promise.resolve({ resolved: true, data: 'resolved data' });
        }
      }),
      extractSemanticInsights: jest.fn().mockImplementation((data, query) => {
        if (data === null || data === undefined) {
          return Promise.resolve({ insights: [] });
        } else if (typeof data === 'string' && data.length < 10) {
          return Promise.resolve({ insights: ['limited insights due to low information'] });
        } else if (Array.isArray(data)) {
          return Promise.resolve({ insights: ['array insight 1', 'array insight 2'] });
        } else if (typeof data === 'object') {
          return Promise.resolve({ insights: ['object insight 1', 'object insight 2'] });
        } else {
          return Promise.resolve({ insights: ['insight1', 'insight2'] });
        }
      }),
      generateContent: jest.fn().mockResolvedValue('{}'),
    };

    memoryServiceMock = {
      getRelatedMemories: jest.fn().mockImplementation((query) => {
        if (query && query.length > 1000) {
          return Promise.resolve([
            { content: 'large memory 1', type: MemoryType.EXPECTATION },
            { content: 'large memory 2', type: MemoryType.CODE },
          ]);
        } else if (query && query.includes('conflict')) {
          return Promise.resolve([
            { content: 'conflicting memory 1', type: MemoryType.EXPECTATION },
            { content: 'conflicting memory 2', type: MemoryType.EXPECTATION },
          ]);
        } else if (query && query.includes('empty')) {
          return Promise.resolve([]);
        } else {
          return Promise.resolve([
            { content: 'memory1', type: MemoryType.EXPECTATION },
            { content: 'memory2', type: MemoryType.CODE },
          ]);
        }
      }),
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getMemoryByType: jest.fn().mockResolvedValue([]),
    };

    semanticRegistryMock = {
      registerDataSource: jest.fn().mockResolvedValue('source-id-1'),
      updateDataSource: jest.fn().mockResolvedValue(true),
      removeDataSource: jest.fn().mockResolvedValue(true),
      getDataSource: jest.fn().mockResolvedValue({ id: 'source-id-1', moduleId: 'test-module' }),
      findPotentialSources: jest.fn().mockResolvedValue(['source-id-1', 'source-id-2']),
      getAllDataSources: jest.fn().mockResolvedValue([{ id: 'source-id-1' }, { id: 'source-id-2' }]),
      calculateSemanticSimilarity: jest.fn().mockResolvedValue(0.85),
    };

    transformationEngineMock = {
      generateTransformationPath: jest.fn().mockResolvedValue({
        steps: [{ type: 'transform', operation: 'rename' }],
      }),
      executeTransformation: jest.fn().mockImplementation((data, path, context) => {
        if (data === null || data === undefined) {
          return Promise.resolve({ success: true, data: null });
        } else if (path && path.steps && path.steps.some(s => s.type === 'conflict_resolution')) {
          return Promise.resolve({ success: true, data: 'conflict resolved' });
        } else if (path && path.steps && path.steps.some(s => s.type === 'semantic_insights_extraction')) {
          return Promise.resolve({ success: true, insights: ['insight1', 'insight2'] });
        } else {
          return Promise.resolve({ success: true, data: 'transformed data' });
        }
      }),
      validateTransformation: jest.fn().mockResolvedValue({ valid: true }),
      optimizeTransformationPath: jest.fn().mockResolvedValue({
        steps: [{ type: 'transform', operation: 'rename' }],
      }),
      getAvailableTransformationStrategies: jest.fn().mockResolvedValue(['strategy1', 'strategy2']),
      registerTransformationStrategy: jest.fn().mockResolvedValue(true),
    };

    intelligentCacheMock = {
      storeTransformationPath: jest.fn().mockResolvedValue('path-id-1'),
      retrieveTransformationPath: jest.fn().mockImplementation((source, target, threshold) => {
        if (source && source.entity === 'test_cache_hit') {
          return Promise.resolve({
            id: 'cached-path-1',
            steps: [{ type: 'cached', operation: 'transform' }],
          });
        } else {
          return Promise.resolve(null);
        }
      }),
      updateUsageStatistics: jest.fn().mockResolvedValue(true),
      getMostUsedPaths: jest.fn().mockResolvedValue([{ id: 'path-id-1', usageCount: 10 }]),
      getRecentlyUsedPaths: jest.fn().mockResolvedValue([{ id: 'path-id-1', timestamp: new Date() }]),
      clearCache: jest.fn().mockResolvedValue(5),
      analyzeUsagePatterns: jest.fn().mockResolvedValue({ patterns: ['pattern1'] }),
    };

    monitoringSystemMock = {
      logTransformationEvent: jest.fn().mockResolvedValue('event-id-1'),
      logError: jest.fn().mockResolvedValue('error-id-1'),
      recordPerformanceMetrics: jest.fn().mockResolvedValue(true),
      getTransformationHistory: jest.fn().mockResolvedValue([{ id: 'event-id-1' }]),
      getErrorHistory: jest.fn().mockResolvedValue([{ id: 'error-id-1' }]),
      getPerformanceReport: jest.fn().mockResolvedValue({ averageTime: 100, successRate: 0.95 }),
      createDebugSession: jest.fn().mockResolvedValue('debug-session-1'),
      endDebugSession: jest.fn().mockResolvedValue(true),
      logDebugData: jest.fn().mockResolvedValue(true),
      getDebugSessionData: jest.fn().mockResolvedValue({ id: 'debug-session-1', events: [] }),
    };

    humanInTheLoopMock = {
      requestHumanReview: jest.fn().mockResolvedValue('review-id-1'),
      submitHumanFeedback: jest.fn().mockResolvedValue(true),
      getReviewStatus: jest.fn().mockResolvedValue({ status: 'pending' }),
      getPendingReviews: jest.fn().mockResolvedValue([{ id: 'review-id-1' }]),
      cancelReview: jest.fn().mockResolvedValue(true),
      registerReviewCallback: jest.fn().mockResolvedValue('callback-id-1'),
      removeReviewCallback: jest.fn().mockResolvedValue(true),
      getFeedbackHistory: jest.fn().mockResolvedValue([{ id: 'feedback-id-1' }]),
      analyzeFeedbackPatterns: jest.fn().mockResolvedValue({ patterns: ['pattern1'] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticMediatorService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: memoryServiceMock },
        { provide: SemanticRegistryService, useValue: semanticRegistryMock },
        { provide: TransformationEngineService, useValue: transformationEngineMock },
        { provide: IntelligentCacheService, useValue: intelligentCacheMock },
        { provide: MonitoringSystemService, useValue: monitoringSystemMock },
        { provide: HumanInTheLoopService, useValue: humanInTheLoopMock },
      ],
    }).compile();

    service = module.get<SemanticMediatorService>(SemanticMediatorService);
  });

  describe('translateBetweenModules - Edge Cases', () => {
    it('should handle null data', async () => {
      const result = await service.translateBetweenModules('clarifier', 'generator', null);
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle undefined data', async () => {
      const result = await service.translateBetweenModules('clarifier', 'generator', undefined);
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle empty object data', async () => {
      const result = await service.translateBetweenModules('clarifier', 'generator', {});
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle empty array data', async () => {
      const result = await service.translateBetweenModules('clarifier', 'generator', []);
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: 'nested value',
              array: [1, 2, { nestedInArray: 'value' }],
            },
          },
          sibling: 'sibling value',
        },
        topLevel: 'top level value',
      };
      
      const result = await service.translateBetweenModules('clarifier', 'generator', complexData);
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should use cached transformation path when available', async () => {
      intelligentCacheMock.retrieveTransformationPath.mockResolvedValueOnce({
        id: 'cached-path-1',
        steps: [{ type: 'cached', operation: 'transform' }],
      });
      
      const result = await service.translateBetweenModules('clarifier', 'generator', { key: 'value' });
      
      expect(result).toBeDefined();
      expect(intelligentCacheMock.retrieveTransformationPath).toHaveBeenCalled();
      expect(intelligentCacheMock.updateUsageStatistics).toHaveBeenCalled();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle validation failure', async () => {
      transformationEngineMock.validateTransformation.mockResolvedValueOnce({ 
        valid: false,
        issues: ['Invalid transformation'] 
      });
      
      const result = await service.translateBetweenModules('clarifier', 'generator', { key: 'value' });
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.validateTransformation).toHaveBeenCalled();
      expect(intelligentCacheMock.storeTransformationPath).not.toHaveBeenCalled();
    });
  });

  describe('enrichWithContext - Edge Cases', () => {
    it('should return original data when no related memories found', async () => {
      memoryServiceMock.getRelatedMemories.mockResolvedValueOnce([]);
      
      const data = { key: 'value' };
      const result = await service.enrichWithContext('generator', data, 'empty query');
      
      expect(result).toEqual(data);
      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalled();
      expect(transformationEngineMock.executeTransformation).not.toHaveBeenCalled();
    });

    it('should handle large context data', async () => {
      const largeQuery = 'large '.repeat(500) + 'context';
      
      const result = await service.enrichWithContext('generator', { key: 'value' }, largeQuery);
      
      expect(result).toBeDefined();
      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalledWith(largeQuery);
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle conflicting context information', async () => {
      const result = await service.enrichWithContext('generator', { key: 'value' }, 'conflict query');
      
      expect(result).toBeDefined();
      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalledWith('conflict query');
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle null data with context', async () => {
      const result = await service.enrichWithContext('generator', null, 'context query');
      
      expect(result).toBeDefined();
      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalled();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle complex data structures with context', async () => {
      const complexData = {
        nested: {
          deeply: {
            value: 'nested value',
            array: [1, 2, 3],
          },
        },
        topLevel: 'top level',
      };
      
      const result = await service.enrichWithContext('generator', complexData, 'context query');
      
      expect(result).toBeDefined();
      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalled();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });
  });

  describe('resolveSemanticConflicts - Edge Cases', () => {
    it('should handle deeply nested conflicts', async () => {
      const dataA = {
        nested: {
          deeply: {
            conflict: true,
            value: 'value A',
          },
        },
      };
      
      const dataB = {
        nested: {
          deeply: {
            conflict: true,
            value: 'value B',
          },
        },
      };
      
      const result = await service.resolveSemanticConflicts('moduleA', dataA, 'moduleB', dataB);
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle conflicts with priority rules', async () => {
      const dataA = {
        priority: true,
        value: 'high priority',
      };
      
      const dataB = {
        priority: false,
        value: 'low priority',
      };
      
      const result = await service.resolveSemanticConflicts('moduleA', dataA, 'moduleB', dataB);
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle unresolvable conflicts', async () => {
      const dataA = {
        unresolvable: true,
        value: 'cannot be resolved',
      };
      
      const dataB = {
        value: 'normal value',
      };
      
      transformationEngineMock.executeTransformation.mockImplementationOnce((data, path, context) => {
        if (data.moduleA && data.moduleA.unresolvable) {
          return Promise.reject(new Error('Unresolvable conflict'));
        }
        return Promise.resolve({ success: true, data: 'conflict resolved' });
      });
      
      await expect(
        service.resolveSemanticConflicts('moduleA', dataA, 'moduleB', dataB)
      ).rejects.toThrow(/Failed to resolve semantic conflicts/);
      
      expect(monitoringSystemMock.logError).toHaveBeenCalled();
    });

    it('should handle null or empty data in conflicts', async () => {
      const result = await service.resolveSemanticConflicts('moduleA', null, 'moduleB', {});
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle array data in conflicts', async () => {
      const dataA = [1, 2, 3, 4];
      const dataB = [3, 4, 5, 6];
      
      const result = await service.resolveSemanticConflicts('moduleA', dataA, 'moduleB', dataB);
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });
  });

  describe('extractSemanticInsights - Edge Cases', () => {
    it('should handle null data for insights extraction', async () => {
      const result = await service.extractSemanticInsights(null, 'query');
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle undefined data for insights extraction', async () => {
      const result = await service.extractSemanticInsights(undefined, 'query');
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle low information content', async () => {
      const result = await service.extractSemanticInsights('tiny', 'query');
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle array data for insights extraction', async () => {
      const result = await service.extractSemanticInsights([1, 2, 3, 'test'], 'query');
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle object data for insights extraction', async () => {
      const result = await service.extractSemanticInsights({ key1: 'value1', key2: 'value2' }, 'query');
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle complex nested data for insights extraction', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: 'deep value',
            array: [1, 2, { nested: 'value' }],
          },
        },
        sibling: 'sibling value',
      };
      
      const result = await service.extractSemanticInsights(complexData, 'query');
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle error during insights extraction', async () => {
      transformationEngineMock.executeTransformation.mockRejectedValueOnce(
        new Error('Extraction error')
      );
      
      await expect(
        service.extractSemanticInsights({ key: 'value' }, 'query')
      ).rejects.toThrow(/Failed to extract semantic insights/);
      
      expect(monitoringSystemMock.logError).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large data sets for translation', async () => {
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = `value${i}`;
      }
      
      const result = await service.translateBetweenModules('clarifier', 'generator', largeData);
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });

    it('should handle large data sets for insights extraction', async () => {
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = `value${i}`;
      }
      
      const result = await service.extractSemanticInsights(largeData, 'query');
      
      expect(result).toBeDefined();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
    });
  });
});
