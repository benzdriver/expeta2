import { Test, TestingModule } from '@nestjs/testing';
import { IntelligentCacheService } from '../components/intelligent-cache/intelligent-cache.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';

describe('IntelligentCacheService', () => {
  let service: IntelligentCacheService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;

  beforeEach(async () => {
    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('计算以下两个描述符之间的相似度')) {
          return Promise.resolve('0.85');
        } else if (prompt.includes('分析以下转换路径的使用模式')) {
          return Promise.resolve(JSON.stringify({ 
            patterns: [{ type: 'common', count: 5 }], 
            insights: 'Test insights' 
          }));
        } else {
          return Promise.resolve('{}');
        }
      }),
    };

    const mockMemoryService = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
      getMemoryByType: jest.fn().mockResolvedValue([
        {
          content: {
            id: 'test-id',
            sourceDescriptor: { entity: 'source', attributes: {} },
            targetDescriptor: { entity: 'target', attributes: {} },
            transformationPath: { mappings: [{ source: 'a', target: 'b' }] },
            usageCount: 5,
            lastUsed: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            metadata: { test: 'data' }
          }
        }
      ]),
      getRelatedMemories: jest.fn().mockResolvedValue([
        {
          content: {
            id: 'test-id',
            sourceDescriptor: { entity: 'source', attributes: {} },
            targetDescriptor: { entity: 'target', attributes: {} },
            transformationPath: { mappings: [{ source: 'a', target: 'b' }] }
          }
        }
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligentCacheService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: mockMemoryService },
      ],
    }).compile();

    service = module.get<IntelligentCacheService>(IntelligentCacheService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
  });

  describe('storeTransformationPath', () => {
    it('should store a transformation path', async () => {
      const sourceDescriptor = { entity: 'source', attributes: {} };
      const targetDescriptor = { entity: 'target', attributes: {} };
      const transformationPath = { mappings: [{ source: 'a', target: 'b' }] };
      const metadata = { test: 'data' };

      const result = await service.storeTransformationPath(
        sourceDescriptor,
        targetDescriptor,
        transformationPath,
        metadata
      );

      expect(result).toBeDefined();
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: expect.objectContaining({
            sourceDescriptor,
            targetDescriptor,
            transformationPath,
            metadata: expect.objectContaining({
              test: 'data'
            })
          })
        })
      );
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(memoryService, 'storeMemory').mockRejectedValueOnce(new Error('Memory service error'));
      
      const sourceDescriptor = { entity: 'source', attributes: {} };
      const targetDescriptor = { entity: 'target', attributes: {} };
      const transformationPath = { mappings: [{ source: 'a', target: 'b' }] };
      
      await expect(service.storeTransformationPath(
        sourceDescriptor,
        targetDescriptor,
        transformationPath
      )).resolves.toBeDefined();
    });
  });

  describe('retrieveTransformationPath', () => {
    it('should retrieve a transformation path', async () => {
      const sourceDescriptor = { entity: 'source', attributes: {} };
      const targetDescriptor = { entity: 'target', attributes: {} };
      const threshold = 0.8;
      
      const result = await service.retrieveTransformationPath(
        sourceDescriptor,
        targetDescriptor,
        threshold
      );

      expect(result).toBeDefined();
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(
        MemoryType.SEMANTIC_TRANSFORMATION
      );
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('计算以下两个描述符之间的相似度'),
        expect.any(Object)
      );
    });

    it('should return null when no cache entries are found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const sourceDescriptor = { entity: 'source', attributes: {} };
      const targetDescriptor = { entity: 'target', attributes: {} };
      
      const result = await service.retrieveTransformationPath(sourceDescriptor, targetDescriptor);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockRejectedValueOnce(new Error('Memory service error'));
      
      const sourceDescriptor = { entity: 'source', attributes: {} };
      const targetDescriptor = { entity: 'target', attributes: {} };
      
      const result = await service.retrieveTransformationPath(sourceDescriptor, targetDescriptor);

      expect(result).toBeNull();
    });
  });

  describe('updateUsageStatistics', () => {
    it('should update usage statistics for a path', async () => {
      const pathId = 'test-id';
      const metadata = { test: 'updated' };

      const result = await service.updateUsageStatistics(pathId, metadata);

      expect(result).toBe(true);
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(
        MemoryType.SEMANTIC_TRANSFORMATION
      );
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SEMANTIC_TRANSFORMATION,
          content: expect.objectContaining({
            id: pathId,
            usageCount: 6, // Incremented from 5
            lastUsed: expect.any(String),
            metadata: expect.objectContaining({
              test: 'updated'
            })
          })
        })
      );
    });

    it('should return false when no cache entries are found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const pathId = 'test-id';
      const result = await service.updateUsageStatistics(pathId);

      expect(result).toBe(false);
    });

    it('should return false when path ID is not found', async () => {
      const pathId = 'non-existent-id';
      const result = await service.updateUsageStatistics(pathId);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockRejectedValueOnce(new Error('Memory service error'));
      
      const pathId = 'test-id';
      const result = await service.updateUsageStatistics(pathId);

      expect(result).toBe(false);
    });
  });

  describe('getMostUsedPaths', () => {
    it('should retrieve most used paths', async () => {
      const limit = 5;
      const result = await service.getMostUsedPaths(limit);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(
        MemoryType.SEMANTIC_TRANSFORMATION
      );
    });

    it('should return empty array when no cache entries are found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const result = await service.getMostUsedPaths();

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockRejectedValueOnce(new Error('Memory service error'));
      
      const result = await service.getMostUsedPaths();

      expect(result).toEqual([]);
    });

    it('should use default limit when not provided', async () => {
      await service.getMostUsedPaths();
      
      expect(memoryService.getMemoryByType).toHaveBeenCalled();
    });
  });

  describe('getRecentlyUsedPaths', () => {
    it('should retrieve recently used paths', async () => {
      const limit = 5;
      const result = await service.getRecentlyUsedPaths(limit);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(
        MemoryType.SEMANTIC_TRANSFORMATION
      );
    });

    it('should return empty array when no cache entries are found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const result = await service.getRecentlyUsedPaths();

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockRejectedValueOnce(new Error('Memory service error'));
      
      const result = await service.getRecentlyUsedPaths();

      expect(result).toEqual([]);
    });

    it('should use default limit when not provided', async () => {
      await service.getRecentlyUsedPaths();
      
      expect(memoryService.getMemoryByType).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', async () => {
      const result = await service.clearCache();

      expect(result).toBe(1); // We have 1 mock cache entry
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(
        MemoryType.SEMANTIC_TRANSFORMATION
      );
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MemoryType.SYSTEM,
          content: expect.objectContaining({
            originalType: MemoryType.SEMANTIC_TRANSFORMATION,
            status: 'deleted',
            deletedAt: expect.any(String)
          })
        })
      );
    });

    it('should clear only older entries when olderThan is provided', async () => {
      const olderThan = new Date();
      const result = await service.clearCache(olderThan);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(
        MemoryType.SEMANTIC_TRANSFORMATION
      );
    });

    it('should return 0 when no cache entries are found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const result = await service.clearCache();

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockRejectedValueOnce(new Error('Memory service error'));
      
      const result = await service.clearCache();

      expect(result).toBe(0);
    });
  });

  describe('analyzeUsagePatterns', () => {
    it('should analyze usage patterns', async () => {
      const result = await service.analyzeUsagePatterns();

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(memoryService.getMemoryByType).toHaveBeenCalledWith(
        MemoryType.SEMANTIC_TRANSFORMATION
      );
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('分析以下转换路径的使用模式'),
        expect.any(Object)
      );
    });

    it('should return default response when no cache entries are found', async () => {
      jest.spyOn(memoryService, 'getMemoryByType').mockResolvedValueOnce([]);
      
      const result = await service.analyzeUsagePatterns();

      expect(result).toEqual({
        patterns: [],
        insights: 'No usage data available for analysis',
      });
    });

    it('should handle LLM service errors gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      const result = await service.analyzeUsagePatterns();

      expect(result).toBeDefined();
      expect(result.patterns).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid LLM responses gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a valid JSON');
      
      const result = await service.analyzeUsagePatterns();

      expect(result).toBeDefined();
      expect(result.patterns).toEqual([]);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculateDescriptorSimilarity', () => {
    it('should calculate similarity between descriptors', async () => {
      const descriptorA = { entity: 'source', attributes: {} };
      const descriptorB = { entity: 'target', attributes: {} };
      
      const result = await service['calculateDescriptorSimilarity'](descriptorA, descriptorB);

      expect(result).toBe(0.85);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('计算以下两个描述符之间的相似度'),
        expect.any(Object)
      );
    });

    it('should handle LLM service errors gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));
      
      const descriptorA = { entity: 'source', attributes: {} };
      const descriptorB = { entity: 'target', attributes: {} };
      
      const result = await service['calculateDescriptorSimilarity'](descriptorA, descriptorB);

      expect(result).toBe(0);
    });

    it('should handle invalid LLM responses gracefully', async () => {
      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a number');
      
      const descriptorA = { entity: 'source', attributes: {} };
      const descriptorB = { entity: 'target', attributes: {} };
      
      const result = await service['calculateDescriptorSimilarity'](descriptorA, descriptorB);

      expect(result).toBe(0);
    });
  });
});
