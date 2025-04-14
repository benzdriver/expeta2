import { Test, TestingModule } from '@nestjs/testing';
import { SemanticMediatorService } from '../semantic-mediator.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticRegistryService } from '../components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from '../components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from '../components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from '../components/human-in-the-loop/human-in-the-loop.service';
import { Logger } from '@nestjs/common';
import { MemoryType } from '../../memory/schemas/memory.schema';

describe('SemanticMediatorService Core Functions', () => {
  let service: SemanticMediatorService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;
  let semanticRegistryService: SemanticRegistryService;
  let transformationEngineService: TransformationEngineService;
  let intelligentCacheService: IntelligentCacheService;
  let monitoringSystemService: MonitoringSystemService;
  let humanInTheLoopService: HumanInTheLoopService;

  beforeEach(async () => {
    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt) => {
        if (prompt.includes('分析以下两组数据之间的语义差异')) {
          return Promise.resolve(JSON.stringify({
            semanticPreservation: { preserved: ['key1'], changed: ['key2'] },
            structuralChanges: [{ description: 'Format changed', purpose: 'Better readability' }],
            informationChanges: { added: ['context'], removed: ['redundancy'] },
            potentialIssues: [{ description: 'Possible data loss', severity: 'low' }],
            overallAssessment: 'Transformation preserved core semantics with minor changes'
          }));
        } else if (prompt.includes('生成以下语义转换的分析报告')) {
          return Promise.resolve(JSON.stringify({
            transformationQuality: 'high',
            semanticAccuracy: 90,
            dataIntegrity: 'maintained',
            recommendations: ['Add more context', 'Preserve metadata']
          }));
        } else if (prompt.includes('提取代码特征')) {
          return Promise.resolve(JSON.stringify({
            complexity: 'medium',
            patterns: ['factory', 'singleton'],
            dependencies: ['external-lib'],
            potentialIssues: ['memory leak']
          }));
        } else {
          return Promise.resolve(JSON.stringify({
            result: 'mock response',
            status: 'success'
          }));
        }
      })
    };

    const mockMemoryService = {
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([{
            content: {
              _id: { toString: () => 'test-expectation-id' },
              model: 'Test expectation model'
            }
          }]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([{
            content: {
              _id: { toString: () => 'test-code-id' },
              files: [{ path: 'test.js', content: 'function test() { return true; }' }]
            }
          }]);
        }
        return Promise.resolve([]);
      }),
      getRelatedMemories: jest.fn().mockResolvedValue([
        { content: { type: 'test', data: 'memory1' } },
        { content: { type: 'test', data: 'memory2' } }
      ]),
      storeMemory: jest.fn().mockResolvedValue({
        content: { _id: { toString: () => 'test-memory-id' } }
      })
    };

    const mockSemanticRegistryService = {
      registerEntity: jest.fn().mockResolvedValue({ id: 'entity-id' }),
      findEntity: jest.fn().mockResolvedValue({ entity: 'test-entity' })
    };

    const mockTransformationEngineService = {
      generateTransformationPath: jest.fn().mockResolvedValue({
        id: 'path-id',
        source: 'source-module',
        target: 'target-module',
        steps: [{ type: 'test-step' }]
      }),
      executeTransformation: jest.fn().mockImplementation((data, path, context) => {
        if (path.steps && path.steps[0] && path.steps[0].type === 'conflict_resolution') {
          return Promise.resolve({
            resolved: true,
            conflicts: ['conflict1', 'conflict2'],
            mergedData: { ...data, resolved: true }
          });
        } else if (path.steps && path.steps[0] && path.steps[0].type === 'semantic_insights_extraction') {
          return Promise.resolve({
            insights: {
              key_concepts: ['concept1', 'concept2'],
              relationships: ['rel1', 'rel2'],
              summary: 'Insight summary'
            }
          });
        } else if (path.steps && path.steps[0] && path.steps[0].type === 'context_enrichment') {
          return Promise.resolve({
            ...data,
            enriched: true,
            context: 'Added context'
          });
        } else {
          return Promise.resolve({
            transformed: true,
            data: { ...data, transformed: true }
          });
        }
      }),
      validateTransformation: jest.fn().mockResolvedValue({ valid: true, score: 0.95 })
    };

    const mockIntelligentCacheService = {
      retrieveTransformationPath: jest.fn().mockImplementation((source, target, threshold) => {
        if (source.entity === 'cache_test' && target.entity === 'cache_test_target') {
          return Promise.resolve({
            id: 'cached-path-id',
            source: source,
            target: target,
            steps: [{ type: 'cached-step' }]
          });
        }
        return Promise.resolve(null);
      }),
      storeTransformationPath: jest.fn().mockResolvedValue({ id: 'stored-path-id' }),
      updateUsageStatistics: jest.fn().mockResolvedValue({ updated: true })
    };

    const mockMonitoringSystemService = {
      logTransformationEvent: jest.fn().mockResolvedValue({ logged: true }),
      logError: jest.fn().mockResolvedValue({ logged: true })
    };

    const mockHumanInTheLoopService = {
      requestReview: jest.fn().mockResolvedValue({ reviewId: 'review-id' }),
      submitFeedback: jest.fn().mockResolvedValue({ feedbackId: 'feedback-id' })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticMediatorService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: SemanticRegistryService, useValue: mockSemanticRegistryService },
        { provide: TransformationEngineService, useValue: mockTransformationEngineService },
        { provide: IntelligentCacheService, useValue: mockIntelligentCacheService },
        { provide: MonitoringSystemService, useValue: mockMonitoringSystemService },
        { provide: HumanInTheLoopService, useValue: mockHumanInTheLoopService },
        { provide: Logger, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn() } }
      ],
    }).compile();

    service = module.get<SemanticMediatorService>(SemanticMediatorService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticRegistryService = module.get<SemanticRegistryService>(SemanticRegistryService);
    transformationEngineService = module.get<TransformationEngineService>(TransformationEngineService);
    intelligentCacheService = module.get<IntelligentCacheService>(IntelligentCacheService);
    monitoringSystemService = module.get<MonitoringSystemService>(MonitoringSystemService);
    humanInTheLoopService = module.get<HumanInTheLoopService>(HumanInTheLoopService);
  });

  describe('translateBetweenModules', () => {
    it('should translate data between modules using a new transformation path', async () => {
      const sourceModule = 'source';
      const targetModule = 'target';
      const data = { key: 'value' };

      const result = await service.translateBetweenModules(sourceModule, targetModule, data);

      expect(intelligentCacheService.retrieveTransformationPath).toHaveBeenCalled();
      expect(transformationEngineService.generateTransformationPath).toHaveBeenCalled();
      expect(transformationEngineService.executeTransformation).toHaveBeenCalled();
      expect(transformationEngineService.validateTransformation).toHaveBeenCalled();
      expect(intelligentCacheService.storeTransformationPath).toHaveBeenCalled();
      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(result).toHaveProperty('transformed', true);
    });

    it('should use cached transformation path when available', async () => {
      const sourceModule = 'cache_test';
      const targetModule = 'cache_test_target';
      const data = { key: 'value' };

      const result = await service.translateBetweenModules(sourceModule, targetModule, data);

      expect(intelligentCacheService.retrieveTransformationPath).toHaveBeenCalled();
      expect(transformationEngineService.generateTransformationPath).not.toHaveBeenCalled();
      expect(transformationEngineService.executeTransformation).toHaveBeenCalled();
      expect(intelligentCacheService.updateUsageStatistics).toHaveBeenCalled();
      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(result).toHaveProperty('transformed', true);
    });

    it('should handle errors during translation', async () => {
      const sourceModule = 'source';
      const targetModule = 'target';
      const data = { key: 'value' };

      jest.spyOn(transformationEngineService, 'executeTransformation').mockRejectedValueOnce(new Error('Transformation error'));

      await expect(service.translateBetweenModules(sourceModule, targetModule, data)).rejects.toThrow(
        'Failed to translate data from source to target: Transformation error'
      );

      expect(monitoringSystemService.logError).toHaveBeenCalled();
    });
  });

  describe('enrichWithContext', () => {
    it('should enrich data with context from related memories', async () => {
      const module = 'test-module';
      const data = { key: 'value' };
      const contextQuery = 'test query';

      const result = await service.enrichWithContext(module, data, contextQuery);

      expect(memoryService.getRelatedMemories).toHaveBeenCalledWith(contextQuery);
      expect(transformationEngineService.executeTransformation).toHaveBeenCalled();
      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(result).toHaveProperty('enriched', true);
    });

    it('should return original data when no related memories are found', async () => {
      const module = 'test-module';
      const data = { key: 'value' };
      const contextQuery = 'no results query';

      jest.spyOn(memoryService, 'getRelatedMemories').mockResolvedValueOnce([]);

      const result = await service.enrichWithContext(module, data, contextQuery);

      expect(memoryService.getRelatedMemories).toHaveBeenCalledWith(contextQuery);
      expect(transformationEngineService.executeTransformation).not.toHaveBeenCalled();
      expect(result).toEqual(data);
    });

    it('should handle errors during context enrichment', async () => {
      const module = 'test-module';
      const data = { key: 'value' };
      const contextQuery = 'test query';

      jest.spyOn(transformationEngineService, 'executeTransformation').mockRejectedValueOnce(new Error('Enrichment error'));

      await expect(service.enrichWithContext(module, data, contextQuery)).rejects.toThrow(
        'Failed to enrich data with context: Enrichment error'
      );

      expect(monitoringSystemService.logError).toHaveBeenCalled();
    });
  });

  describe('resolveSemanticConflicts', () => {
    it('should resolve conflicts between data from different modules', async () => {
      const moduleA = 'module-a';
      const dataA = { key: 'value-a' };
      const moduleB = 'module-b';
      const dataB = { key: 'value-b' };

      const result = await service.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB);

      expect(transformationEngineService.executeTransformation).toHaveBeenCalled();
      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(result).toHaveProperty('resolved', true);
      expect(result).toHaveProperty('conflicts');
    });

    it('should handle errors during conflict resolution', async () => {
      const moduleA = 'module-a';
      const dataA = { key: 'value-a' };
      const moduleB = 'module-b';
      const dataB = { key: 'value-b' };

      jest.spyOn(transformationEngineService, 'executeTransformation').mockRejectedValueOnce(new Error('Resolution error'));

      await expect(service.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB)).rejects.toThrow(
        'Failed to resolve semantic conflicts between module-a and module-b: Resolution error'
      );

      expect(monitoringSystemService.logError).toHaveBeenCalled();
    });

    it('should handle complex nested data structures', async () => {
      const moduleA = 'module-a';
      const dataA = { 
        nested: { 
          deep: { value: 'a' },
          array: [1, 2, 3]
        }
      };
      const moduleB = 'module-b';
      const dataB = { 
        nested: { 
          deep: { value: 'b' },
          array: [3, 4, 5]
        }
      };

      const result = await service.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB);

      expect(transformationEngineService.executeTransformation).toHaveBeenCalled();
      expect(result).toHaveProperty('resolved', true);
    });
  });

  describe('extractSemanticInsights', () => {
    it('should extract insights from data based on query', async () => {
      const data = { key: 'value', nested: { property: 'test' } };
      const query = 'test query';

      const result = await service.extractSemanticInsights(data, query);

      expect(transformationEngineService.executeTransformation).toHaveBeenCalled();
      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(result).toHaveProperty('insights');
      expect(result.insights).toHaveProperty('key_concepts');
      expect(result.insights).toHaveProperty('relationships');
    });

    it('should handle errors during insight extraction', async () => {
      const data = { key: 'value' };
      const query = 'test query';

      jest.spyOn(transformationEngineService, 'executeTransformation').mockRejectedValueOnce(new Error('Extraction error'));

      await expect(service.extractSemanticInsights(data, query)).rejects.toThrow(
        'Failed to extract semantic insights: Extraction error'
      );

      expect(monitoringSystemService.logError).toHaveBeenCalled();
    });

    it('should handle different data types for insight extraction', async () => {
      const arrayData = [1, 2, 3, 4, 5];
      const arrayResult = await service.extractSemanticInsights(arrayData, 'array query');
      expect(arrayResult).toHaveProperty('insights');

      const stringData = 'This is a test string for insight extraction';
      const stringResult = await service.extractSemanticInsights(stringData, 'string query');
      expect(stringResult).toHaveProperty('insights');

      const numberData = 42;
      const numberResult = await service.extractSemanticInsights(numberData, 'number query');
      expect(numberResult).toHaveProperty('insights');
    });
  });

  describe('trackSemanticTransformation', () => {
    it('should track transformation between modules with default options', async () => {
      const sourceModule = 'source';
      const targetModule = 'target';
      const sourceData = { key: 'source' };
      const transformedData = { key: 'transformed' };

      const result = await service.trackSemanticTransformation(
        sourceModule,
        targetModule,
        sourceData,
        transformedData
      );

      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(transformationEngineService.executeTransformation).toHaveBeenCalledTimes(2); // For differences and analysis
      expect(intelligentCacheService.storeTransformationPath).toHaveBeenCalled();
      expect(memoryService.storeMemory).toHaveBeenCalled();
      expect(result).toHaveProperty('sourceModule', sourceModule);
      expect(result).toHaveProperty('targetModule', targetModule);
      expect(result).toHaveProperty('differences');
      expect(result).toHaveProperty('analysis');
    });

    it('should track transformation with custom options', async () => {
      const sourceModule = 'source';
      const targetModule = 'target';
      const sourceData = { key: 'source' };
      const transformedData = { key: 'transformed' };
      const options = {
        trackDifferences: false,
        analyzeTransformation: true,
        saveToMemory: true
      };

      const result = await service.trackSemanticTransformation(
        sourceModule,
        targetModule,
        sourceData,
        transformedData,
        options
      );

      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(transformationEngineService.executeTransformation).toHaveBeenCalledTimes(1); // Only for analysis
      expect(result).not.toHaveProperty('differences');
      expect(result).toHaveProperty('analysis');
    });

    it('should handle errors during transformation tracking', async () => {
      const sourceModule = 'source';
      const targetModule = 'target';
      const sourceData = { key: 'source' };
      const transformedData = { key: 'transformed' };

      jest.spyOn(transformationEngineService, 'executeTransformation').mockRejectedValueOnce(new Error('Tracking error'));

      await expect(service.trackSemanticTransformation(
        sourceModule,
        targetModule,
        sourceData,
        transformedData
      )).rejects.toThrow('Failed to track semantic transformation: Tracking error');

      expect(monitoringSystemService.logError).toHaveBeenCalled();
    });
  });

  describe('generateValidationContext', () => {
    it('should generate validation context for code and expectation', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const previousValidations = [];
      const options = {
        strategy: 'balanced' as 'balanced' | 'performance' | 'strict' | 'lenient' | 'security' | 'custom',
        focusAreas: ['functionality', 'performance']
      };

      const result = await service.generateValidationContext(
        expectationId,
        codeId,
        previousValidations,
        options
      );

      expect(memoryService.getMemoryByType).toHaveBeenCalledTimes(2); // Once for expectation, once for code
      expect(transformationEngineService.executeTransformation).toHaveBeenCalled();
      expect(result).toHaveProperty('semanticContext');
      expect(result.semanticContext).toHaveProperty('codeFeatures');
      expect(result.semanticContext).toHaveProperty('semanticRelationship');
    });

    it('should use cached context when available', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const previousValidations = [];
      const options = {
        strategy: 'balanced' as 'balanced' | 'performance' | 'strict' | 'lenient' | 'security' | 'custom',
        focusAreas: ['functionality', 'performance']
      };

      jest.spyOn(intelligentCacheService, 'retrieveTransformationPath').mockResolvedValueOnce({
        id: 'cached-context-id',
        result: {
          semanticContext: {
            codeFeatures: { complexity: 'cached' },
            semanticRelationship: { alignment: 'cached' }
          }
        }
      });

      const result = await service.generateValidationContext(
        expectationId,
        codeId,
        previousValidations,
        options
      );

      expect(intelligentCacheService.retrieveTransformationPath).toHaveBeenCalled();
      expect(transformationEngineService.executeTransformation).not.toHaveBeenCalled();
      expect(result.semanticContext).toHaveProperty('codeFeatures.complexity', 'cached');
    });

    it('should handle errors during validation context generation', async () => {
      const expectationId = 'test-expectation-id';
      const codeId = 'test-code-id';
      const previousValidations = [];
      const options = {
        strategy: 'balanced' as 'balanced' | 'performance' | 'strict' | 'lenient' | 'security' | 'custom',
        focusAreas: ['functionality', 'performance']
      };

      jest.spyOn(memoryService, 'getMemoryByType').mockRejectedValueOnce(new Error('Memory error'));

      await expect(service.generateValidationContext(
        expectationId,
        codeId,
        previousValidations,
        options
      )).rejects.toThrow('Failed to generate validation context: Memory error');

      expect(monitoringSystemService.logError).toHaveBeenCalled();
    });
  });
});
