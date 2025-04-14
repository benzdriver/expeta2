import { Test, TestingModule } from '@nestjs/testing';
import { SemanticMediatorService } from '../semantic-mediator.service';
import { LlmService } from '../../../services/llm.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { SemanticRegistryService } from '../components/semantic-registry/semantic-registry.service';
import { TransformationEngineService } from '../components/transformation-engine/transformation-engine.service';
import { IntelligentCacheService } from '../components/intelligent-cache/intelligent-cache.service';
import { MonitoringSystemService } from '../components/monitoring-system/monitoring-system.service';
import { HumanInTheLoopService } from '../components/human-in-the-loop/human-in-the-loop.service';

describe('SemanticMediatorService', () => {
  let service: SemanticMediatorService;
  let llmServiceMock: any;
  let memoryServiceMock: any;
  let semanticRegistryMock: any;
  let transformationEngineMock: any;
  let intelligentCacheMock: any;
  let monitoringSystemMock: any;
  let humanInTheLoopMock: any;

  beforeEach(async () => {
    // Mock LLM Service
    llmServiceMock = {
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

    // Mock Memory Service
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

    // Mock Semantic Registry Service
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

    // Mock Transformation Engine Service
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

    // Mock Intelligent Cache Service
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

    // Mock Monitoring System Service
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

    // Mock Human-in-the-Loop Service
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

    // Create test module with mocked services
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticMediatorService,
        { provide: LlmService, useValue: llmServiceMock },
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

  // Tests for existing functionality
  describe('translateBetweenModules', () => {
    it('should translate data between modules', async () => {
      const sourceModule = 'clarifier';
      const targetModule = 'generator';
      const data = { key: 'value' };

      (intelligentCacheMock.retrieveTransformationPath as jest.Mock).mockClear();
      (transformationEngineMock.generateTransformationPath as jest.Mock).mockClear();
      (transformationEngineMock.executeTransformation as jest.Mock).mockClear();

      (intelligentCacheMock.retrieveTransformationPath as jest.Mock).mockResolvedValue(null);
      (transformationEngineMock.generateTransformationPath as jest.Mock).mockResolvedValue({
        steps: [{ type: 'transform', operation: 'rename' }],
      });
      (transformationEngineMock.executeTransformation as jest.Mock).mockResolvedValue({
        success: true,
        data: { newKey: 'transformedValue', date: '2025-04-13' },
      });
      (transformationEngineMock.validateTransformation as jest.Mock).mockResolvedValue({
        valid: true,
      });

      const result = await service.translateBetweenModules(sourceModule, targetModule, data);

      expect(intelligentCacheMock.retrieveTransformationPath).toHaveBeenCalled();
      expect(transformationEngineMock.generateTransformationPath).toHaveBeenCalled();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: { newKey: 'transformedValue', date: '2025-04-13' },
      });
    });

    it('should handle errors during translation', async () => {
      const sourceModule = 'clarifier';
      const targetModule = 'generator';
      const data = { key: 'value' };

      (intelligentCacheMock.retrieveTransformationPath as jest.Mock).mockClear();
      (transformationEngineMock.generateTransformationPath as jest.Mock).mockClear();

      (intelligentCacheMock.retrieveTransformationPath as jest.Mock).mockResolvedValue(null);
      (transformationEngineMock.generateTransformationPath as jest.Mock).mockRejectedValueOnce(
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
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
      expect(monitoringSystemMock.logTransformationEvent).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: { newKey: 'transformedValue', date: '2025-04-13' },
      });
    });

    it('should return original data if no related memories found', async () => {
      const module = 'generator';
      const data = { key: 'value' };
      const contextQuery = 'context query';

      (memoryServiceMock.getRelatedMemories as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.enrichWithContext(module, data, contextQuery);

      expect(memoryServiceMock.getRelatedMemories).toHaveBeenCalledWith(contextQuery);
      expect(transformationEngineMock.executeTransformation).not.toHaveBeenCalled();
      expect(result).toEqual(data);
    });
  });

  // Tests for Semantic Registry component
  describe('Semantic Registry Integration', () => {
    it('should register a data source', async () => {
      const moduleId = 'test-module';
      const descriptor = { entity: 'TestEntity', description: 'Test entity description' };
      const accessMethod = jest.fn();

      await service.registerDataSource(moduleId, descriptor, accessMethod);

      expect(semanticRegistryMock.registerDataSource).toHaveBeenCalledWith(
        moduleId,
        descriptor,
        accessMethod,
      );
      expect(monitoringSystemMock.logTransformationEvent).toHaveBeenCalled();
    });

    it('should find potential data sources', async () => {
      const intent = { purpose: 'test purpose', requirements: ['req1', 'req2'] };
      const threshold = 0.8;

      const result = await service.findPotentialDataSources(intent, threshold);

      expect(semanticRegistryMock.findPotentialSources).toHaveBeenCalledWith(intent, threshold);
      expect(result).toEqual(['source-id-1', 'source-id-2']);
    });
  });

  // Tests for Transformation Engine component
  describe('Transformation Engine Integration', () => {
    it('should generate and execute a transformation', async () => {
      const sourceData = { oldKey: 'sourceValue', date: '4/13/2025' };
      const sourceDescriptor = { entity: 'SourceEntity', description: 'Source entity' };
      const targetDescriptor = { entity: 'TargetEntity', description: 'Target entity' };

      (intelligentCacheMock.retrieveTransformationPath as jest.Mock).mockClear();
      (transformationEngineMock.generateTransformationPath as jest.Mock).mockClear();
      (transformationEngineMock.executeTransformation as jest.Mock).mockClear();
      (transformationEngineMock.validateTransformation as jest.Mock).mockClear();
      (intelligentCacheMock.storeTransformationPath as jest.Mock).mockClear();
      (monitoringSystemMock.logTransformationEvent as jest.Mock).mockClear();

      (intelligentCacheMock.retrieveTransformationPath as jest.Mock).mockResolvedValue(null);
      (transformationEngineMock.generateTransformationPath as jest.Mock).mockResolvedValue({
        steps: [{ type: 'transform', operation: 'rename' }],
      });
      (transformationEngineMock.executeTransformation as jest.Mock).mockResolvedValue({
        success: true,
        data: { newKey: 'transformedValue', date: '2025-04-13' },
      });
      (transformationEngineMock.validateTransformation as jest.Mock).mockResolvedValue({
        valid: true,
      });

      const result = await service.transformData(sourceData, sourceDescriptor, targetDescriptor);

      expect(transformationEngineMock.generateTransformationPath).toHaveBeenCalledWith(
        sourceDescriptor,
        targetDescriptor,
        expect.any(Object),
      );
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
      expect(intelligentCacheMock.storeTransformationPath).toHaveBeenCalled();
      expect(monitoringSystemMock.logTransformationEvent).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: { newKey: 'transformedValue', date: '2025-04-13' },
      });
    });

    it('should use cached transformation path when available', async () => {
      const sourceData = { oldKey: 'sourceValue' };
      const sourceDescriptor = { entity: 'SourceEntity', description: 'Source entity' };
      const targetDescriptor = { entity: 'TargetEntity', description: 'Target entity' };

      (intelligentCacheMock.retrieveTransformationPath as jest.Mock).mockResolvedValueOnce({
        id: 'path-id-1',
        steps: [{ type: 'map', operation: 'rename', parameters: { from: 'oldKey', to: 'newKey' } }],
      });

      await service.transformData(sourceData, sourceDescriptor, targetDescriptor);

      expect(intelligentCacheMock.retrieveTransformationPath).toHaveBeenCalled();
      expect(transformationEngineMock.generateTransformationPath).not.toHaveBeenCalled();
      expect(transformationEngineMock.executeTransformation).toHaveBeenCalled();
      expect(intelligentCacheMock.updateUsageStatistics).toHaveBeenCalled();
    });
  });

  // Tests for Intelligent Cache component
  describe('Intelligent Cache Integration', () => {
    it('should analyze cache usage patterns', async () => {
      const result = await service.analyzeCacheUsagePatterns();

      expect(intelligentCacheMock.analyzeUsagePatterns).toHaveBeenCalled();
      expect(result).toEqual({
        frequentPatterns: ['pattern1', 'pattern2'],
        successFactors: ['factor1', 'factor2'],
        recommendations: ['recommendation1'],
      });
    });

    it('should clear cache', async () => {
      const olderThan = new Date('2025-04-10');

      const result = await service.clearTransformationCache(olderThan);

      expect(intelligentCacheMock.clearCache).toHaveBeenCalledWith(olderThan);
      expect(result).toBe(3);
    });
  });

  // Tests for Monitoring System component
  describe('Monitoring System Integration', () => {
    it('should get performance report', async () => {
      const timeRange = {
        start: new Date('2025-04-10'),
        end: new Date('2025-04-13'),
      };

      const result = await service.getPerformanceReport(timeRange);

      expect(monitoringSystemMock.getPerformanceReport).toHaveBeenCalledWith(timeRange);
      expect(result).toEqual({
        averageLatency: 120,
        successRate: 0.92,
        throughput: 150,
        errorRate: 0.08,
        topErrors: ['error1', 'error2'],
      });
    });

    it('should create and use debug session', async () => {
      const context = { operation: 'test-operation', user: 'test-user' };
      const debugData = { step: 'test-step', data: { key: 'value' } };

      const sessionId = await service.createDebugSession(context);
      expect(monitoringSystemMock.createDebugSession).toHaveBeenCalledWith(context);

      await service.logDebugData(sessionId, debugData);
      expect(monitoringSystemMock.logDebugData).toHaveBeenCalledWith(sessionId, debugData);

      const sessionData = await service.getDebugSessionData(sessionId);
      expect(monitoringSystemMock.getDebugSessionData).toHaveBeenCalledWith(sessionId);
      expect(sessionData).toEqual({
        id: 'debug-session-1',
        startTime: '2025-04-13T12:00:00Z',
        endTime: '2025-04-13T12:15:00Z',
        events: ['event1', 'event2'],
      });
    });
  });

  // Tests for Human-in-the-Loop component
  describe('Human-in-the-Loop Integration', () => {
    it('should request human review', async () => {
      const data = { key: 'value', needsReview: true };
      const context = { priority: 'high', deadline: '2025-04-14' };

      const reviewId = await service.requestHumanReview(data, context);

      expect(humanInTheLoopMock.requestHumanReview).toHaveBeenCalledWith(data, context, undefined);
      expect(reviewId).toBe('review-id-1');
    });

    it('should submit human feedback', async () => {
      const reviewId = 'review-id-1';
      const feedback = { approved: true, comments: 'Looks good!' };

      const result = await service.submitHumanFeedback(reviewId, feedback);

      expect(humanInTheLoopMock.submitHumanFeedback).toHaveBeenCalledWith(
        reviewId,
        feedback,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should analyze feedback patterns', async () => {
      const result = await service.analyzeFeedbackPatterns();

      expect(humanInTheLoopMock.analyzeFeedbackPatterns).toHaveBeenCalled();
      expect(result).toEqual({
        commonFeedback: ['feedback1', 'feedback2'],
        improvementAreas: ['area1', 'area2'],
        userSatisfaction: 0.85,
      });
    });
  });
});
