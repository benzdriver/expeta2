import { Test, TestingModule } from '@nestjs/testing';
import { SemanticMediatorService } from '../semantic-mediator.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema'; // Added import
import { SemanticRegistryService } from '../components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from '../components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from '../components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from '../components/human-in-the-loop/human-in-the-loop.service';


describe('SemanticMediatorService', () => {
  let service: SemanticMediatorService;
  let mockLlmRouterService: any; // Use 'any' for simplicity in mock
  let memoryServiceMock: any; // Use 'any' for simplicity in mock

  let semanticRegistryMock: any;
  let transformationEngineMock: any;
  let intelligentCacheMock: any;
  let monitoringSystemMock: any;
  let humanInTheLoopMock: any;

  beforeEach(async () => {
    mockLlmRouterService = {
      translateBetweenModules: jest
        .fn()
        .mockResolvedValue({ translated: true, data: 'translated data' }),
      enrichWithContext: jest.fn().mockResolvedValue({ enriched: true, data: 'enriched data' }),
      resolveSemanticConflicts: jest
        .fn()
        .mockResolvedValue({ resolved: true, data: 'resolved data' }),
      extractSemanticInsights: jest.fn().mockResolvedValue({ insights: ['insight1', 'insight2'] }),
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('分析以下两组数据之间的语义差异')) {
          return Promise.resolve(
            JSON.stringify({
              semanticPreservation: { preserved: ['key1'], changed: ['key2'] },
              structuralChanges: [{ change: 'structure change', purpose: 'improve readability' }],
              informationChanges: { added: ['info1'], removed: ['info2'] },
              potentialIssues: [{ issue: 'potential issue', severity: 'low' }],
              overallAssessment: 'Good transformation with minor issues',
            }),
          );
        } else if (prompt.includes('生成以下语义转换的分析报告')) {
          return Promise.resolve(
            JSON.stringify({
              purpose: 'Improve data structure',
              transformationRules: ['rule1', 'rule2'],
              completeness: 85,
              accuracy: 90,
              applicability: 95,
              innovations: ['innovation1'],
              recommendations: ['recommendation1'],
            }),
          );
        } else if (prompt.includes('评估以下语义转换的质量')) {
          return Promise.resolve(
            JSON.stringify({
              semanticPreservation: 90,
              structuralAdaptability: 85,
              informationCompleteness: 95,
              overallQuality: 90,
              improvements: ['improvement1', 'improvement2'],
            }),
          );
        } else if (prompt.includes('分析以下代码，提取其主要特征')) {
          return Promise.resolve(
            JSON.stringify({
              complexity: 'medium',
              modules: ['module1', 'module2'],
              designPatterns: ['pattern1'],
              performanceBottlenecks: ['bottleneck1'],
              securityConsiderations: ['security1'],
              maintainabilityFeatures: ['feature1'],
            }),
          );
        } else if (prompt.includes('分析以下期望模型和代码之间的语义关系')) {
          return Promise.resolve(
            JSON.stringify({
              matchDegree: 85,
              implementedFeatures: ['feature1', 'feature2'],
              unimplementedFeatures: ['feature3'],
              extraFeatures: ['extraFeature1'],
              semanticDifferences: ['difference1'],
            }),
          );
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    memoryServiceMock = {
      getRelatedMemories: jest.fn().mockResolvedValue([
        { content: 'memory1', type: MemoryType.EXPECTATION },
        { content: 'memory2', type: MemoryType.CODE },
      ]),
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([{ content: { _id: 'exp-1', model: { key: 'value' } } }]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([
            {
              content: {
                _id: 'code-1',
                files: [
                  { path: 'file1.js', content: 'console.log("test")' },
                  { path: 'file2.js', content: 'function test() { return true; }' },
                ],
              },
            },
          ]);
        } else if (type === MemoryType.VALIDATION) {
          return Promise.resolve([{ content: { _id: 'val-1', results: { passed: true } } }]);
        }
        return Promise.resolve([]);
      }),
    };

    semanticRegistryMock = {
      registerDataSource: jest.fn().mockResolvedValue('source-id-1'),
      updateDataSource: jest.fn().mockResolvedValue(true),
      removeDataSource: jest.fn().mockResolvedValue(true),
      getDataSource: jest.fn().mockResolvedValue({
        id: 'source-id-1',
        moduleId: 'test-module',
        descriptor: { entity: 'TestEntity', description: 'Test entity description' },
        hasAccessMethod: true,
      }),
      findPotentialSources: jest.fn().mockResolvedValue(['source-id-1', 'source-id-2']),
      getAllDataSources: jest.fn().mockResolvedValue([
        {
          id: 'source-id-1',
          moduleId: 'test-module-1',
          descriptor: { entity: 'TestEntity1', description: 'Test entity 1 description' },
          hasAccessMethod: true,
        },
        {
          id: 'source-id-2',
          moduleId: 'test-module-2',
          descriptor: { entity: 'TestEntity2', description: 'Test entity 2 description' },
          hasAccessMethod: true,
        },
      ]),
      calculateSemanticSimilarity: jest.fn().mockResolvedValue(0.85),
    };

    transformationEngineMock = {
      generateTransformationPath: jest.fn().mockResolvedValue({
        steps: [
          { type: 'map', operation: 'rename', parameters: { from: 'oldKey', to: 'newKey' } },
          {
            type: 'transform',
            operation: 'format',
            parameters: { field: 'date', format: 'YYYY-MM-DD' },
          },
        ],
        complexity: 0.5,
        estimatedLatency: 100,
      }),
      executeTransformation: jest.fn().mockResolvedValue({
        success: true,
        data: { newKey: 'transformedValue', date: '2025-04-13' },
      }),
      validateTransformation: jest.fn().mockResolvedValue({
        valid: true,
        issues: [],
      }),
      optimizeTransformationPath: jest.fn().mockResolvedValue({
        steps: [
          { type: 'map', operation: 'rename', parameters: { from: 'oldKey', to: 'newKey' } },
          {
            type: 'transform',
            operation: 'format',
            parameters: { field: 'date', format: 'YYYY-MM-DD' },
          },
        ],
        complexity: 0.4, // Optimized complexity
        estimatedLatency: 80, // Optimized latency
      }),
      getAvailableTransformationStrategies: jest
        .fn()
        .mockResolvedValue(['direct-mapping', 'pattern-matching', 'llm-driven']),
      registerTransformationStrategy: jest.fn().mockResolvedValue(true),
    };

    intelligentCacheMock = {
      storeTransformationPath: jest.fn().mockResolvedValue('path-id-1'),
      retrieveTransformationPath: jest.fn().mockResolvedValue({
        id: 'path-id-1',
        steps: [{ type: 'map', operation: 'rename', parameters: { from: 'oldKey', to: 'newKey' } }],
        usageCount: 5,
        successRate: 0.9,
      }),
      updateUsageStatistics: jest.fn().mockResolvedValue(true),
      getMostUsedPaths: jest.fn().mockResolvedValue([
        { id: 'path-id-1', usageCount: 10, successRate: 0.9 },
        { id: 'path-id-2', usageCount: 8, successRate: 0.85 },
      ]),
      getRecentlyUsedPaths: jest.fn().mockResolvedValue([
        { id: 'path-id-3', lastUsed: '2025-04-13T12:00:00Z', successRate: 0.95 },
        { id: 'path-id-1', lastUsed: '2025-04-13T11:30:00Z', successRate: 0.9 },
      ]),
      clearCache: jest.fn().mockResolvedValue(3),
      analyzeUsagePatterns: jest.fn().mockResolvedValue({
        frequentPatterns: ['pattern1', 'pattern2'],
        successFactors: ['factor1', 'factor2'],
        recommendations: ['recommendation1'],
      }),
    };

    monitoringSystemMock = {
      logTransformationEvent: jest.fn().mockResolvedValue('event-id-1'),
      logError: jest.fn().mockResolvedValue('error-id-1'),
      recordPerformanceMetrics: jest.fn().mockResolvedValue(true),
      getTransformationHistory: jest.fn().mockResolvedValue([
        { id: 'event-id-1', timestamp: '2025-04-13T12:00:00Z', success: true },
        { id: 'event-id-2', timestamp: '2025-04-13T11:30:00Z', success: false },
      ]),
      getErrorHistory: jest.fn().mockResolvedValue([
        { id: 'error-id-1', timestamp: '2025-04-13T11:30:00Z', message: 'Test error 1' },
        { id: 'error-id-2', timestamp: '2025-04-13T10:45:00Z', message: 'Test error 2' },
      ]),
      getPerformanceReport: jest.fn().mockResolvedValue({
        averageLatency: 120,
        successRate: 0.92,
        throughput: 150,
        errorRate: 0.08,
        topErrors: ['error1', 'error2'],
      }),
      createDebugSession: jest.fn().mockResolvedValue('debug-session-1'),
      endDebugSession: jest.fn().mockResolvedValue(true),
      logDebugData: jest.fn().mockResolvedValue(true),
      getDebugSessionData: jest.fn().mockResolvedValue({
        id: 'debug-session-1',
        startTime: '2025-04-13T12:00:00Z',
        endTime: '2025-04-13T12:15:00Z',
        events: ['event1', 'event2'],
      }),
    };

    humanInTheLoopMock = {
      requestHumanReview: jest.fn().mockResolvedValue('review-id-1'),
      submitHumanFeedback: jest.fn().mockResolvedValue(true),
      getReviewStatus: jest.fn().mockResolvedValue({
        id: 'review-id-1',
        status: 'pending',
        createdAt: '2025-04-13T12:00:00Z',
        data: { key: 'value' },
      }),
      getPendingReviews: jest.fn().mockResolvedValue([
        { id: 'review-id-1', status: 'pending', createdAt: '2025-04-13T12:00:00Z' },
        { id: 'review-id-2', status: 'pending', createdAt: '2025-04-13T11:30:00Z' },
      ]),
      cancelReview: jest.fn().mockResolvedValue(true),
      registerReviewCallback: jest.fn().mockResolvedValue('callback-id-1'),
      removeReviewCallback: jest.fn().mockResolvedValue(true),
      getFeedbackHistory: jest.fn().mockResolvedValue([
        { id: 'feedback-id-1', reviewId: 'review-id-1', timestamp: '2025-04-13T12:15:00Z' },
        { id: 'feedback-id-2', reviewId: 'review-id-2', timestamp: '2025-04-13T11:45:00Z' },
      ]),
      analyzeFeedbackPatterns: jest.fn().mockResolvedValue({
        commonFeedback: ['feedback1', 'feedback2'],
        improvementAreas: ['area1', 'area2'],
        userSatisfaction: 0.85,
      }),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translateBetweenModules', () => {
    it('should translate data between modules', async () => {
      const sourceModule = 'clarifier';
      const targetModule = 'generator';
      const data = { key: 'value' };

      const result = await service.translateBetweenModules(sourceModule, targetModule, data);

      expect(mockLlmRouterService.translateBetweenModules).toHaveBeenCalledWith(
        sourceModule,
        targetModule,
        JSON.stringify(data, null, 2),
      );
      expect(result).toEqual({ translated: true, data: 'translated data' });
    });

    it('should handle errors during translation', async () => {
      const sourceModule = 'clarifier';
      const targetModule = 'generator';
      const data = { key: 'value' };

      (mockLlmRouterService.translateBetweenModules as jest.Mock).mockRejectedValueOnce(
        new Error('Translation error'),
      );

      await expect(
        service.translateBetweenModules(sourceModule, targetModule, data),
      ).rejects.toThrow(
        `Failed to translate data from ${sourceModule} to ${targetModule}: Translation error`,
      );
    });
  });

  describe('enrichWithContext', () => {
    it('should enrich data with context', async () => {
      const module = 'generator';
      const data = { key: 'value' };
      const contextQuery = 'context query';

      const result = await service.enrichWithContext(module, data, contextQuery);

      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalledWith(contextQuery);
      expect(mockLlmRouterService.enrichWithContext).toHaveBeenCalled(); // Assuming LlmRouterService has this method
      expect(result).toEqual({ enriched: true, data: 'enriched data' });
    });

    it('should return original data if no related memories found', async () => {
      const module = 'generator';
      const data = { key: 'value' };
      const contextQuery = 'context query';

      (memoryServiceMock.getRelatedMemories as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.enrichWithContext(module, data, contextQuery);

      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalledWith(contextQuery);
      expect(mockLlmRouterService.enrichWithContext).not.toHaveBeenCalled();
      expect(result).toEqual(data);
    });

    it('should handle errors during enrichment', async () => {
      const module = 'generator';
      const data = { key: 'value' };
      const contextQuery = 'context query';

      (mockLlmRouterService.enrichWithContext as jest.Mock).mockRejectedValueOnce(
        new Error('Enrichment error'),
      );

      await expect(service.enrichWithContext(module, data, contextQuery)).rejects.toThrow(
        'Failed to enrich data with context: Enrichment error',
      );
    });
  });

  describe('resolveSemanticConflicts', () => {
    it('should resolve semantic conflicts between modules', async () => {
      const moduleA = 'clarifier';
      const dataA = { key: 'valueA' };
      const moduleB = 'generator';
      const dataB = { key: 'valueB' };

      const result = await service.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB);

      expect(mockLlmRouterService.resolveSemanticConflicts).toHaveBeenCalledWith(
        // Assuming LlmRouterService has this method
        moduleA,
        JSON.stringify(dataA, null, 2),
        moduleB,
        JSON.stringify(dataB, null, 2),
      );
      expect(result).toEqual({ resolved: true, data: 'resolved data' });
    });

    it('should handle errors during conflict resolution', async () => {
      const moduleA = 'clarifier';
      const dataA = { key: 'valueA' };
      const moduleB = 'generator';
      const dataB = { key: 'valueB' };

      (mockLlmRouterService.resolveSemanticConflicts as jest.Mock).mockRejectedValueOnce(
        new Error('Resolution error'),
      );

      await expect(
        service.resolveSemanticConflicts(moduleA, dataA, moduleB, dataB),
      ).rejects.toThrow(
        `Failed to resolve semantic conflicts between ${moduleA} and ${moduleB}: Resolution error`,
      );
    });
  });

  describe('extractSemanticInsights', () => {
    it('should extract semantic insights from data', async () => {
      const data = { key: 'value' };
      const query = 'insight query';

      const result = await service.extractSemanticInsights(data, query);

      expect(mockLlmRouterService.extractSemanticInsights).toHaveBeenCalledWith(
        // Assuming LlmRouterService has this method
        JSON.stringify(data, null, 2),
        query,
      );
      expect(result).toEqual({ insights: ['insight1', 'insight2'] });
    });

    it('should handle errors during insight extraction', async () => {
      const data = { key: 'value' };
      const query = 'insight query';

      (mockLlmRouterService.extractSemanticInsights as jest.Mock).mockRejectedValueOnce(
        new Error('Extraction error'),
      );

      await expect(service.extractSemanticInsights(data, query)).rejects.toThrow(
        'Failed to extract semantic insights: Extraction error',
      );
    });
  });

  describe('trackSemanticTransformation', () => {
    it('should track semantic transformation with all options enabled', async () => {
      const sourceModule = 'clarifier';
      const targetModule = 'generator';
      const sourceData = { key: 'sourceValue' };
      const transformedData = { key: 'transformedValue' };

      const result = await service.trackSemanticTransformation(
        sourceModule,
        targetModule,
        sourceData,
        transformedData,
      );

      expect(mockLlmRouterService.generateContent).toHaveBeenCalledTimes(2);
      expect(memoryServiceMock.storeMemory).toHaveBeenCalled();
      expect(result).toHaveProperty('sourceModule', sourceModule);
      expect(result).toHaveProperty('targetModule', targetModule);
      expect(result).toHaveProperty('sourceData', sourceData);
      expect(result).toHaveProperty('transformedData', transformedData);
      expect(result).toHaveProperty('differences');
      expect(result).toHaveProperty('analysis');
    });

    it('should track semantic transformation with custom options', async () => {
      const sourceModule = 'clarifier';
      const targetModule = 'generator';
      const sourceData = { key: 'sourceValue' };
      const transformedData = { key: 'transformedValue' };
      const options = {
        trackDifferences: false,
        analyzeTransformation: true,
        saveToMemory: false,
      };

      const result = await service.trackSemanticTransformation(
        sourceModule,
        targetModule,
        sourceData,
        transformedData,
        options,
      );

      expect(mockLlmRouterService.generateContent).toHaveBeenCalledTimes(1); // Only for analysis
      expect(memoryServiceMock.storeMemory).not.toHaveBeenCalled(); // saveToMemory is false
      expect(result).toHaveProperty('sourceModule', sourceModule);
      expect(result).toHaveProperty('targetModule', targetModule);
      expect(result).toHaveProperty('sourceData', sourceData);
      expect(result).toHaveProperty('transformedData', transformedData);
      expect(result).not.toHaveProperty('differences'); // trackDifferences is false
      expect(result).toHaveProperty('analysis'); // analyzeTransformation is true
    });

    it('should handle errors during transformation tracking', async () => {
      const sourceModule = 'clarifier';
      const targetModule = 'generator';
      const sourceData = { key: 'sourceValue' };
      const transformedData = { key: 'transformedValue' };

      (mockLlmRouterService.generateContent as jest.Mock).mockRejectedValueOnce(
        new Error('Tracking error'),
      );

      await expect(
        service.trackSemanticTransformation(
          sourceModule,
          targetModule,
          sourceData,
          transformedData,
        ),
      ).rejects.toThrow('Failed to track semantic transformation: Tracking error');
    });
  });

  describe('evaluateSemanticTransformation', () => {
    it('should evaluate semantic transformation quality', async () => {
      const sourceData = { key: 'sourceValue' };
      const transformedData = { key: 'transformedValue' };
      const expectedOutcome = 'expected outcome description';

      const result = await service.evaluateSemanticTransformation(
        sourceData,
        transformedData,
        expectedOutcome,
      );

      expect(mockLlmRouterService.generateContent).toHaveBeenCalled();
      expect(result).toHaveProperty('semanticPreservation', 90);
      expect(result).toHaveProperty('structuralAdaptability', 85);
      expect(result).toHaveProperty('informationCompleteness', 95);
      expect(result).toHaveProperty('overallQuality', 90);
      expect(result).toHaveProperty('improvements');
    });

    it('should handle errors during transformation evaluation', async () => {
      const sourceData = { key: 'sourceValue' };
      const transformedData = { key: 'transformedValue' };
      const expectedOutcome = 'expected outcome description';

      (mockLlmRouterService.generateContent as jest.Mock).mockRejectedValueOnce(
        new Error('Evaluation error'),
      );

      await expect(
        service.evaluateSemanticTransformation(sourceData, transformedData, expectedOutcome),
      ).rejects.toThrow('Failed to evaluate semantic transformation: Evaluation error');
    });
  });

  describe('generateValidationContext', () => {
    it('should generate validation context with default options', async () => {
      const expectationId = 'exp-1';
      const codeId = 'code-1';

      const result = await service.generateValidationContext(expectationId, codeId);

      expect(memoryServiceMock.getMemoryByType).toHaveBeenCalledWith(MemoryType.EXPECTATION);
      expect(memoryServiceMock.getMemoryByType).toHaveBeenCalledWith(MemoryType.CODE);
      expect(mockLlmRouterService.generateContent).toHaveBeenCalledTimes(2); // For code features and semantic relationship
      expect(result).toHaveProperty('strategy', 'balanced');
      expect(result).toHaveProperty('weights');
      expect(result).toHaveProperty('focusAreas');
      expect(result).toHaveProperty('semanticContext');
    });

    it('should generate validation context with custom options', async () => {
      const expectationId = 'exp-1';
      const codeId = 'code-1';
      const previousValidations = ['val-1'];
      const options = {
        focusAreas: ['security', 'performance'],
        strategy: 'strict' as const,
        customWeights: { security: 0.8 },
      };

      const result = await service.generateValidationContext(
        expectationId,
        codeId,
        previousValidations,
        options,
      );

      expect(memoryServiceMock.getMemoryByType).toHaveBeenCalledWith(MemoryType.EXPECTATION);
      expect(memoryServiceMock.getMemoryByType).toHaveBeenCalledWith(MemoryType.CODE);
      expect(memoryServiceMock.getMemoryByType).toHaveBeenCalledWith(MemoryType.VALIDATION);
      expect(mockLlmRouterService.generateContent).toHaveBeenCalledTimes(2); // For code features and semantic relationship
      expect(result).toHaveProperty('strategy', 'strict');
      expect(result).toHaveProperty('weights.security', 0.8); // Custom weight
      expect(result).toHaveProperty('focusAreas', ['security', 'performance']);
      expect(result).toHaveProperty('previousValidations', previousValidations);
      expect(result).toHaveProperty('semanticContext');
    });

    it('should handle errors when expectation or code not found', async () => {
      const expectationId = 'non-existent';
      const codeId = 'non-existent';

      (memoryServiceMock.getMemoryByType as jest.Mock).mockResolvedValueOnce([]);

      await expect(service.generateValidationContext(expectationId, codeId)).rejects.toThrow(
        'Expectation or Code not found',
      );
    });

    it('should handle errors during validation context generation', async () => {
      const expectationId = 'exp-1';
      const codeId = 'code-1';

      (mockLlmRouterService.generateContent as jest.Mock).mockRejectedValueOnce(
        new Error('Context generation error'),
      );

      await expect(service.generateValidationContext(expectationId, codeId)).rejects.toThrow(
        'Failed to generate validation context: Context generation error',
      );
    });
  });
});
