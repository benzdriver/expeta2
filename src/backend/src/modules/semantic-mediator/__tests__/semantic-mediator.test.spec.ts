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

describe('SemanticMediatorService Tests', () => {
  let service: SemanticMediatorService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;
  let semanticRegistry: SemanticRegistryService;
  let transformationEngine: TransformationEngineService;
  let intelligentCache: IntelligentCacheService;
  let monitoringSystem: MonitoringSystemService;
  let humanInTheLoop: HumanInTheLoopService;

  beforeEach(async () => {
    const mockLlmRouterService = {
      translateBetweenModules: jest
        .fn()
        .mockResolvedValue({ translated: true, data: 'translated data' }),
      enrichWithContext: jest.fn().mockResolvedValue({ enriched: true, data: 'enriched data' }),
      resolveSemanticConflicts: jest
        .fn()
        .mockResolvedValue({ resolved: true, data: 'resolved data' }),
      extractSemanticInsights: jest.fn().mockResolvedValue({ insights: ['insight1', 'insight2'] }),
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('translate')) {
          return Promise.resolve(JSON.stringify({ translated: true, data: 'translated data' }));
        } else if (prompt.includes('enrich')) {
          return Promise.resolve(JSON.stringify({ enriched: true, data: 'enriched data' }));
        } else if (prompt.includes('conflict')) {
          return Promise.resolve(JSON.stringify({ resolved: true, data: 'resolved data' }));
        } else if (prompt.includes('insights')) {
          return Promise.resolve(JSON.stringify({ insights: ['insight1', 'insight2'] }));
        } else if (prompt.includes('分析以下两组数据之间的语义差异')) {
          return Promise.resolve(
            JSON.stringify({
              semanticPreservation: { preserved: ['key1'], changed: ['key2'] },
              transformationQuality: 85,
              semanticDrift: { detected: false, areas: [] },
              recommendations: ['recommendation1'],
            }),
          );
        } else if (prompt.includes('生成验证上下文')) {
          return Promise.resolve(
            JSON.stringify({
              validationContext: {
                semanticExpectations: ['expectation1'],
                validationCriteria: ['criteria1'],
                priorityAreas: ['area1'],
              },
            }),
          );
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    const memoryServiceMock = {
      getRelatedMemories: jest.fn().mockResolvedValue([
        { content: 'memory1', type: MemoryType.EXPECTATION },
        { content: 'memory2', type: MemoryType.CODE },
      ]),
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getMemoryByType: jest.fn().mockImplementation((type, id) => {
        if (type === MemoryType.EXPECTATION && id === 'exp-123') {
          return Promise.resolve([
            { content: { _id: 'exp-123', model: { key: 'value' } } }
          ]);
        } else if (type === MemoryType.CODE && id === 'code-456') {
          return Promise.resolve([
            {
              content: {
                _id: 'code-456',
                files: [{ path: 'test.js', content: 'console.log("test")' }],
              },
            },
          ]);
        } else {
          return Promise.resolve([]);
        }
      }),
    };
    const semanticRegistryMock = {
      registerDataSource: jest.fn().mockResolvedValue('source-id-1'),
      updateDataSource: jest.fn().mockResolvedValue(true),
      removeDataSource: jest.fn().mockResolvedValue(true),
      getDataSource: jest.fn().mockResolvedValue({ id: 'source-id-1', moduleId: 'test-module' }),
      findPotentialSources: jest.fn().mockResolvedValue(['source-id-1', 'source-id-2']),
      getAllDataSources: jest
        .fn()
        .mockResolvedValue([{ id: 'source-id-1' }, { id: 'source-id-2' }]),
      calculateSemanticSimilarity: jest.fn().mockResolvedValue(0.85),
    };

    const transformationEngineMock = {
      generateTransformationPath: jest.fn().mockResolvedValue({
        steps: [{ type: 'transform', operation: 'rename' }],
      }),
      executeTransformation: jest.fn().mockResolvedValue({
        success: true,
        data: { newKey: 'transformedValue', date: '2025-04-13' },
      }),
      validateTransformation: jest.fn().mockResolvedValue({ valid: true }),
      optimizeTransformationPath: jest.fn().mockResolvedValue({
        steps: [{ type: 'transform', operation: 'rename' }],
      }),
      getAvailableTransformationStrategies: jest.fn().mockResolvedValue(['strategy1', 'strategy2']),
      registerTransformationStrategy: jest.fn().mockResolvedValue(true),
    };

    const intelligentCacheMock = {
      storeTransformationPath: jest.fn().mockResolvedValue('path-id-1'),
      retrieveTransformationPath: jest.fn().mockResolvedValue(null),
      updateUsageStatistics: jest.fn().mockResolvedValue(true),
      getMostUsedPaths: jest.fn().mockResolvedValue([{ id: 'path-id-1', usageCount: 10 }]),
      getRecentlyUsedPaths: jest
        .fn()
        .mockResolvedValue([{ id: 'path-id-1', timestamp: new Date() }]),
      clearCache: jest.fn().mockResolvedValue(5),
      analyzeUsagePatterns: jest.fn().mockResolvedValue({ patterns: ['pattern1'] }),
    };

    const monitoringSystemMock = {
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

    const humanInTheLoopMock = {
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
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
    semanticRegistry = module.get<SemanticRegistryService>(SemanticRegistryService); // Moved assignments here
    transformationEngine = module.get<TransformationEngineService>(TransformationEngineService);
    intelligentCache = module.get<IntelligentCacheService>(IntelligentCacheService);
    monitoringSystem = module.get<MonitoringSystemService>(MonitoringSystemService);
    humanInTheLoop = module.get<HumanInTheLoopService>(HumanInTheLoopService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should translate between modules', async () => {
    const result = await service.translateBetweenModules('clarifier', 'generator', {
      key: 'value',
    });
    expect(result).toBeDefined();
  });

  it('should enrich with context', async () => {
    const result = await service.enrichWithContext('generator', { key: 'value' }, 'context query');
    expect(result).toBeDefined();
  });

  it('should resolve semantic conflicts', async () => {
    const result = await service.resolveSemanticConflicts('moduleA', { key: 'source' }, 'moduleB', {
      key: 'target',
    });
    expect(result).toBeDefined();
  });

  it('should extract semantic insights', async () => {
    const result = await service.extractSemanticInsights({ key: 'data' }, 'semantic query');
    expect(result).toBeDefined();
    expect(llmRouterService.generateContent).toHaveBeenCalled();
  });

  it('should track semantic transformation', async () => {
    const result = await service.trackSemanticTransformation(
      'clarifier',
      'generator',
      { original: { key: 'value' } },
      { transformed: { key: 'new-value' } },
    );
    expect(result).toBeDefined();
  });

  it('should generate validation context', async () => {
    const result = await service.generateValidationContext('exp-123', 'code-456', [], { strategy: 'balanced' });
    expect(result).toBeDefined();
    expect(memoryService.getMemoryByType).toHaveBeenCalledWith(MemoryType.EXPECTATION, 'exp-123');
    expect(memoryService.getMemoryByType).toHaveBeenCalledWith(MemoryType.CODE, 'code-456');
  });

  it('should evaluate semantic transformation', async () => {
    const result = await service.evaluateSemanticTransformation(
      { source: 'data' },
      { transformed: 'data' },
      'Expected outcome description',
    );
    expect(result).toBeDefined();
  });
});
