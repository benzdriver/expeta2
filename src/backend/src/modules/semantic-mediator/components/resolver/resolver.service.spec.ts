import { Test, TestingModule } from '@nestjs/testing';
import { ResolverService } from './resolver.service';
import { ExplicitMappingStrategy } from './strategies/explicit-mapping.strategy';
import { PatternMatchingStrategy } from './strategies/pattern-matching.strategy';
import { LlmResolutionStrategy } from './strategies/llm-resolution.strategy';
import { MonitoringSystemService } from '../monitoring-system/monitoring-system.service';
import { IntelligentCacheService } from '../intelligent-cache/intelligent-cache.service';
import { MemoryService } from '../../../memory/memory.service';
import { MemoryType } from '../../../memory/schemas/memory.schema';
import { ResolutionStrategy } from './interfaces/resolution-strategy.interface';
import { ResolutionResult } from './interfaces/resolution-result.interface';
import { SemanticDescriptor } from '../../interfaces/semantic-descriptor.interface';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('ResolverService', () => {
  let service: ResolverService;
  let explicitMappingStrategy: ExplicitMappingStrategy;
  let patternMatchingStrategy: PatternMatchingStrategy;
  let llmResolutionStrategy: LlmResolutionStrategy;
  let monitoringSystemService: MonitoringSystemService;
  let intelligentCacheService: IntelligentCacheService;
  let memoryService: MemoryService;

  const mockMonitoringSystemService = {
    createDebugSession: jest.fn(() => Promise.resolve('debug-session-id')),
    logTransformationEvent: jest.fn(() => Promise.resolve(undefined)),
    logError: jest.fn(() => Promise.resolve(undefined)),
    endDebugSession: jest.fn(() => Promise.resolve(undefined)),
  };

  const mockIntelligentCacheService = {
    retrieveTransformationPath: jest.fn(() => Promise.resolve(null)),
    storeTransformationPath: jest.fn(() => Promise.resolve(undefined)),
    updateUsageStatistics: jest.fn(() => Promise.resolve(undefined)),
  };

  const mockMemoryService = {
    storeMemory: jest.fn(() => Promise.resolve({ _id: 'memory-id' })),
    getMemoryByType: jest.fn(() => Promise.resolve([])),
  };

  const mockExplicitMappingStrategy = {
    name: 'explicit_mapping',
    priority: 3,
    canResolve: jest.fn(() => Promise.resolve(false)),
    resolve: jest.fn(() => Promise.resolve({
      success: true,
      resolvedData: { result: 'explicit mapping result' },
      strategyUsed: 'explicit_mapping',
      confidence: 1.0,
    })),
  } as ResolutionStrategy;

  const mockPatternMatchingStrategy = {
    name: 'pattern_matching',
    priority: 2,
    canResolve: jest.fn(() => Promise.resolve(false)),
    resolve: jest.fn(() => Promise.resolve({
      success: true,
      resolvedData: { result: 'pattern matching result' },
      strategyUsed: 'pattern_matching',
      confidence: 0.8,
    })),
  } as ResolutionStrategy;

  const mockLlmResolutionStrategy = {
    name: 'llm_resolution',
    priority: 1,
    canResolve: jest.fn(() => Promise.resolve(true)),
    resolve: jest.fn(() => Promise.resolve({
      success: true,
      resolvedData: { result: 'llm resolution result' },
      strategyUsed: 'llm_resolution',
      confidence: 0.6,
    })),
  } as ResolutionStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolverService,
        {
          provide: ExplicitMappingStrategy,
          useValue: mockExplicitMappingStrategy,
        },
        {
          provide: PatternMatchingStrategy,
          useValue: mockPatternMatchingStrategy,
        },
        {
          provide: LlmResolutionStrategy,
          useValue: mockLlmResolutionStrategy,
        },
        {
          provide: MonitoringSystemService,
          useValue: mockMonitoringSystemService,
        },
        {
          provide: IntelligentCacheService,
          useValue: mockIntelligentCacheService,
        },
        {
          provide: MemoryService,
          useValue: mockMemoryService,
        },
      ],
    }).compile();

    service = module.get<ResolverService>(ResolverService);
    explicitMappingStrategy = module.get<ExplicitMappingStrategy>(ExplicitMappingStrategy);
    patternMatchingStrategy = module.get<PatternMatchingStrategy>(PatternMatchingStrategy);
    llmResolutionStrategy = module.get<LlmResolutionStrategy>(LlmResolutionStrategy);
    monitoringSystemService = module.get<MonitoringSystemService>(MonitoringSystemService);
    intelligentCacheService = module.get<IntelligentCacheService>(IntelligentCacheService);
    memoryService = module.get<MemoryService>(MemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveConflicts', () => {
    it('should resolve conflicts using the appropriate strategy', async () => {
      const moduleA = 'moduleA';
      const dataA = { id: 1, name: 'Test A' };
      const moduleB = 'moduleB';
      const dataB = { id: 2, name: 'Test B' };

      const result = await service.resolveConflicts(moduleA, dataA, moduleB, dataB);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('llm_resolution');
      expect(monitoringSystemService.createDebugSession).toHaveBeenCalled();
      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalled();
      expect(monitoringSystemService.endDebugSession).toHaveBeenCalled();
    });

    it('should use cached result if available', async () => {
      const moduleA = 'moduleA';
      const dataA = { id: 1, name: 'Test A' };
      const moduleB = 'moduleB';
      const dataB = { id: 2, name: 'Test B' };

      const cachedResult = {
        success: true,
        resolvedData: { result: 'cached result' },
        strategyUsed: 'cached_strategy',
        confidence: 0.95,
      };

      (intelligentCacheService.retrieveTransformationPath as jest.Mock).mockImplementation(() => Promise.resolve(cachedResult));

      const result = await service.resolveConflicts(moduleA, dataA, moduleB, dataB);

      expect(result).toBeDefined();
      expect(result).toEqual(cachedResult);
      expect(intelligentCacheService.retrieveTransformationPath).toHaveBeenCalled();
      expect(intelligentCacheService.updateUsageStatistics).toHaveBeenCalled();
      expect(monitoringSystemService.logTransformationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'conflict_resolution_cache_hit',
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      const moduleA = 'moduleA';
      const dataA = { id: 1, name: 'Test A' };
      const moduleB = 'moduleB';
      const dataB = { id: 2, name: 'Test B' };

      const error = new Error('Test error');
      llmResolutionStrategy.resolve = jest.fn(() => Promise.reject(error));

      const result = await service.resolveConflicts(moduleA, dataA, moduleB, dataB);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.strategyUsed).toBe('error');
      expect(monitoringSystemService.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'resolveConflicts',
        }),
      );
    });

    it('should use forced strategy if specified', async () => {
      const moduleA = 'moduleA';
      const dataA = { id: 1, name: 'Test A' };
      const moduleB = 'moduleB';
      const dataB = { id: 2, name: 'Test B' };

      mockPatternMatchingStrategy.canResolve = jest.fn(() => Promise.resolve(true));

      const result = await service.resolveConflicts(moduleA, dataA, moduleB, dataB, {
        forceStrategy: 'pattern_matching',
      });

      expect(result).toBeDefined();
      expect(result.strategyUsed).toBe('pattern_matching');
      expect(patternMatchingStrategy.resolve).toHaveBeenCalled();
    });
  });

  describe('findCandidateSources', () => {
    it('should find candidate sources based on semantic intent', async () => {
      const semanticIntent = 'user profile data';
      const mockSources = [
        {
          _id: 'source1',
          content: {
            id: 'source1',
            name: 'User Profile API',
            description: 'API for user profile data',
            capabilities: ['user data', 'profile management'],
          },
          tags: ['data_source'],
        },
        {
          _id: 'source2',
          content: {
            id: 'source2',
            name: 'Authentication Service',
            description: 'Service for user authentication',
            capabilities: ['authentication', 'authorization'],
          },
          tags: ['data_source'],
        },
      ];

      (memoryService.getMemoryByType as jest.Mock).mockImplementation(() => Promise.resolve(mockSources));

      const candidates = await service.findCandidateSources(semanticIntent);

      expect(candidates).toBeDefined();
      expect(candidates.length).toBeGreaterThan(0);
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(MemoryType.SYSTEM, 100);
    });

    it('should return empty array if no sources found', async () => {
      const semanticIntent = 'nonexistent data';
      (memoryService.getMemoryByType as jest.Mock).mockImplementation(() => Promise.resolve([]));

      const candidates = await service.findCandidateSources(semanticIntent);

      expect(candidates).toBeDefined();
      expect(candidates.length).toBe(0);
    });
  });

  describe('registerStrategy', () => {
    it('should register a new strategy and sort by priority', () => {
      const newStrategy = {
        name: 'new_strategy',
        priority: 4, // Higher than explicit_mapping
        canResolve: jest.fn().mockReturnValue(Promise.resolve(false)),
        resolve: jest.fn().mockReturnValue(Promise.resolve({
          success: true,
          resolvedData: { result: 'new strategy result' },
          strategyUsed: 'new_strategy',
          confidence: 1.0,
        })),
      } as ResolutionStrategy;

      service.registerStrategy(newStrategy);

      mockExplicitMappingStrategy.canResolve = jest.fn(() => Promise.resolve(false));
      newStrategy.canResolve = jest.fn(() => Promise.resolve(true));

      return service
        .resolveConflicts('moduleA', { test: 'data' }, 'moduleB', { test: 'data' })
        .then((result) => {
          expect(result.strategyUsed).toBe('new_strategy');
        });
    });
  });
});
