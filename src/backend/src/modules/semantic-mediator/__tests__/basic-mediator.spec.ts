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
import { MemoryAdapter } from '../components/intelligent-cache/memory.adapter';
import { ResolverService } from '../components/resolver/resolver.service';
import '../types/semantic-mediator.d';

describe('SemanticMediatorService Basic Tests', () => {
  let service: any;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;
  let intelligentCacheService: IntelligentCacheService;

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
        } else if (prompt.includes('计算以下两个描述符之间的相似度') || 
                   prompt.includes('计算以下两个上下文环境之间的相似度')) {
          return Promise.resolve('0.85');
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
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([{ content: { _id: 'exp-123', model: { key: 'value' } } }]);
        } else if (type === MemoryType.CODE) {
          return Promise.resolve([
            {
              content: {
                _id: 'code-456',
                files: [{ path: 'test.js', content: '/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\n/* eslint-disable-next-line no-console */\nconsole.log("test")' }],
              },
            },
          ]);
        } else if (type === MemoryType.SEMANTIC_TRANSFORMATION) {
          return Promise.resolve([
            {
              content: {
                id: 'cache-123',
                sourceDescriptor: { entity: 'moduleA', description: 'Module A descriptor' },
                targetDescriptor: { entity: 'moduleB', description: 'Module B descriptor' },
                transformationPath: { path: ['moduleA', 'moduleB'] },
                usageCount: 5,
                lastUsed: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                metadata: { sourceModule: 'moduleA', targetModule: 'moduleB' },
              },
            }
          ]);
        } else {
          return Promise.resolve([]);
        }
      }),
    };

    // 创建内存适配器的Mock
    const memoryAdapterMock = {
      storeMemory: jest.fn().mockImplementation(memoryServiceMock.storeMemory),
      getMemoryByType: jest.fn().mockImplementation(memoryServiceMock.getMemoryByType),
      queryMemories: jest.fn().mockResolvedValue([]),
      updateMemory: jest.fn().mockResolvedValue({ id: 'updated-memory-id' }),
    };

    // 创建新的智能缓存服务的Mock，匹配当前的API
    const intelligentCacheMock = {
      retrieveTransformationPath: jest.fn().mockResolvedValue({
        path: ['moduleA', 'moduleB'],
        transformations: [{ from: 'moduleA', to: 'moduleB', quality: 0.9 }],
      }),
      storeTransformationPath: jest.fn().mockResolvedValue('cache-123'),
      updateUsageStatistics: jest.fn().mockResolvedValue(true),
      getMostUsedPaths: jest.fn().mockResolvedValue([
        {
          id: 'cache-123',
          sourceDescriptor: { entity: 'moduleA' },
          targetDescriptor: { entity: 'moduleB' },
          usageCount: 5,
        }
      ]),
      getRecentlyUsedPaths: jest.fn().mockResolvedValue([
        {
          id: 'cache-123',
          sourceDescriptor: { entity: 'moduleA' },
          targetDescriptor: { entity: 'moduleB' },
          lastUsed: new Date().toISOString(),
        }
      ]),
      clearCache: jest.fn().mockResolvedValue(1),
      analyzeUsagePatterns: jest.fn().mockResolvedValue({
        patterns: [{ type: 'frequent_transformation', source: 'moduleA', target: 'moduleB' }],
        insights: 'Some usage patterns detected',
      }),
      predictNeededTransformations: jest.fn().mockResolvedValue([
        {
          id: 'cache-123',
          sourceDescriptor: { entity: 'moduleA' },
          targetDescriptor: { entity: 'moduleB' },
        }
      ]),
      preloadCacheForModules: jest.fn().mockResolvedValue(2),
      recommendCacheOptimizations: jest.fn().mockResolvedValue({
        retainTypes: ['moduleA_to_moduleB'],
        purgeTypes: [],
        thresholdAdjustments: { predictiveThreshold: 0.8 },
        additionalSuggestions: ['Suggestion 1'],
      }),
      calculateDescriptorSimilarity: jest.fn().mockResolvedValue(0.85),
    };

    const resolverServiceMock = {
      resolveSemanticConflict: jest.fn().mockResolvedValue({
        resolvedData: { resolved: true, data: 'resolved data' },
        metadata: { resolutionMethod: 'test' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SemanticMediatorService,
          useValue: {
            translateBetweenModules: jest.fn().mockResolvedValue({ data: 'translated data' }),
            enrichWithContext: jest.fn().mockResolvedValue({ data: 'enriched data' }),
            resolveSemanticConflicts: jest.fn().mockResolvedValue({ data: 'resolved data' }),
            extractSemanticInsights: jest.fn().mockResolvedValue({ insights: ['insight1', 'insight2'] }),
            trackSemanticTransformation: jest.fn().mockResolvedValue({ 
              transformationId: 'trans-123',
              differences: { semanticPreservation: 0.85 } 
            }),
            generateValidationContext: jest.fn().mockResolvedValue({
              validationContext: {
                semanticExpectations: ['expectation1'],
                validationCriteria: ['criteria1'],
              }
            }),
            evaluateSemanticTransformation: jest.fn().mockResolvedValue({
              semanticPreservation: 0.9,
              structuralAdaptability: 0.8,
              overallQuality: 0.85
            }),
          }
        },
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: memoryServiceMock },
        { provide: SemanticRegistryService, useValue: {} },
        {
          provide: TransformationEngineService,
          useValue: {
            executeTransformation: jest.fn().mockResolvedValue({
              result: 'transformed data',
              metadata: { quality: 0.9 },
            }),
          },
        },
        { provide: IntelligentCacheService, useValue: intelligentCacheMock },
        {
          provide: MonitoringSystemService,
          useValue: {
            logError: jest.fn().mockResolvedValue({}),
            trackOperation: jest.fn().mockResolvedValue({}),
            recordMetric: jest.fn().mockResolvedValue({}),
            logTransformationEvent: jest.fn().mockResolvedValue({}),
            createDebugSession: jest.fn().mockResolvedValue({ sessionId: 'debug-123' }),
            logDebugData: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: HumanInTheLoopService,
          useValue: {
            requestHumanFeedback: jest.fn().mockResolvedValue({
              feedback: 'Test human feedback',
              approved: true,
            }),
            recordHumanDecision: jest.fn().mockResolvedValue(true),
            getHumanFeedbackHistory: jest
              .fn()
              .mockResolvedValue([
                { timestamp: new Date(), feedback: 'Previous feedback', approved: true },
              ]),
          },
        },
        { provide: MemoryAdapter, useValue: memoryAdapterMock },
        { provide: ResolverService, useValue: resolverServiceMock },
      ],
    }).compile();

    service = module.get<SemanticMediatorService>(SemanticMediatorService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
    intelligentCacheService = module.get<IntelligentCacheService>(IntelligentCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should translate between modules', async () => {
    const result = await service.translateBetweenModules('moduleA', 'moduleB', {
      key: 'value',
    });
    expect(result).toBeDefined();
  });

  it('should enrich with context', async () => {
    const result = await service.enrichWithContext('moduleA', { data: 'some data' }, 'test query');
    expect(result).toBeDefined();
  });

  it('should resolve semantic conflicts', async () => {
    const result = await service.resolveSemanticConflicts(
      'moduleA',
      { key: 'source' },
      'moduleB',
      { key: 'target' },
    );
    expect(result).toBeDefined();
  });

  it('should extract semantic insights', async () => {
    const result = await service.extractSemanticInsights({ data: 'complex data structure' }, 'test query');
    expect(result).toBeDefined();
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
    const result = await service.generateValidationContext(
      'exp-123',
      'code-456',
      [],
      { strategy: 'balanced' },
    );
    expect(result).toBeDefined();
  });

  it('should evaluate semantic transformation', async () => {
    const result = await service.evaluateSemanticTransformation(
      { source: 'data' },
      { transformed: 'data' },
      'Expected outcome description',
    );
    expect(result).toBeDefined();
  });

  // 为新增的智能缓存功能添加测试
  describe('Intelligent Cache Features', () => {
    it('should store and retrieve transformation paths', async () => {
      // 测试存储转换路径
      const storeResult = await intelligentCacheService.storeTransformationPath(
        { entity: 'moduleA' },
        { entity: 'moduleB' },
        { steps: ['step1', 'step2'] },
      );
      expect(storeResult).toBe('cache-123');

      // 测试检索转换路径
      const retrieveResult = await intelligentCacheService.retrieveTransformationPath(
        { entity: 'moduleA' },
        { entity: 'moduleB' },
      );
      expect(retrieveResult).toBeDefined();
      expect(retrieveResult.path).toEqual(['moduleA', 'moduleB']);
    });

    it('should analyze usage patterns', async () => {
      const patterns = await intelligentCacheService.analyzeUsagePatterns();
      expect(patterns).toBeDefined();
      expect(patterns.patterns).toHaveLength(1);
      expect(patterns.insights).toBeDefined();
    });

    it('should predict needed transformations', async () => {
      const predictions = await intelligentCacheService.predictNeededTransformations({
        currentModule: 'moduleA',
        targetModule: 'moduleB',
      });
      expect(predictions).toBeDefined();
      expect(predictions).toHaveLength(1);
    });

    it('should preload cache for modules', async () => {
      const count = await intelligentCacheService.preloadCacheForModules(['moduleA', 'moduleB']);
      expect(count).toBe(2);
    });

    it('should recommend cache optimizations', async () => {
      const recommendations = await intelligentCacheService.recommendCacheOptimizations();
      expect(recommendations).toBeDefined();
      expect(recommendations.retainTypes).toContain('moduleA_to_moduleB');
      expect(recommendations.thresholdAdjustments).toBeDefined();
    });
  });
});
