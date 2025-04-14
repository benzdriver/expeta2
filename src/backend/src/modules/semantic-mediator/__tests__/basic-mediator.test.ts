import { Test, TestingModule } from '@nestjs/testing';
import { SemanticMediatorService } from '../semantic-mediator.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';


describe('SemanticMediatorService Basic Tests', () => {
  let service: SemanticMediatorService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;
  
  beforeEach(async () => {
    const mockLlmRouterService = {
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
          return Promise.resolve(JSON.stringify({
            semanticPreservation: { preserved: ['key1'], changed: ['key2'] },
            transformationQuality: 85,
            semanticDrift: { detected: false, areas: [] },
            recommendations: ['recommendation1']
          }));
        } else if (prompt.includes('生成验证上下文')) {
          return Promise.resolve(JSON.stringify({
            validationContext: {
              semanticExpectations: ['expectation1'],
              validationCriteria: ['criteria1'],
              priorityAreas: ['area1']
            }
          }));
        } else {
          return Promise.resolve('{}');
        }
      })
    };
    
    const memoryServiceMock = {
      getRelatedMemories: jest.fn().mockResolvedValue([
        { content: 'memory1', type: MemoryType.EXPECTATION },
        { content: 'memory2', type: MemoryType.CODE }
      ]),
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getMemoryByType: jest.fn().mockImplementation((type) => {
        if (type === MemoryType.EXPECTATION) {
          return Promise.resolve([
            { content: { _id: 'exp-1', model: { key: 'value' } } }
          ]);
        } else {
          return Promise.resolve([]);
        }
      })
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticMediatorService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: memoryServiceMock }
      ],
    }).compile();

    service = module.get<SemanticMediatorService>(SemanticMediatorService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  it('should translate between modules', async () => {
    const result = await service.translateBetweenModules('clarifier', 'generator', { key: 'value' });
    expect(result).toBeDefined();
  });
  
  it('should enrich with context', async () => {
    const result = await service.enrichWithContext('generator', { key: 'value' }, 'context query');
    expect(result).toBeDefined();
  });
  
  it('should resolve semantic conflicts', async () => {
    const result = await service.resolveSemanticConflicts(
      'moduleA',
      { key: 'source' },
      'moduleB',
      { key: 'target' }
    );
    expect(result).toBeDefined();
  });
  
  it('should extract semantic insights', async () => {
    const result = await service.extractSemanticInsights(
      { key: 'data' },
      'semantic query'
    );
    expect(result).toBeDefined();
  });
  
  it('should track semantic transformation', async () => {
    const result = await service.trackSemanticTransformation(
      'clarifier',
      'generator',
      { original: { key: 'value' } },
      { transformed: { key: 'new-value' } }
    );
    expect(result).toBeDefined();
  });
  
  it('should generate validation context', async () => {
    const result = await service.generateValidationContext(
      'exp-123',
      'code-456',
      [],
      { strategy: 'balanced' }
    );
    expect(result).toBeDefined();
  });
  
  it('should evaluate semantic transformation', async () => {
    const result = await service.evaluateSemanticTransformation(
      { source: 'data' },
      { transformed: 'data' },
      'Expected outcome description'
    );
    expect(result).toBeDefined();
  });
});
