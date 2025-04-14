import { Test, TestingModule } from '@nestjs/testing';
import { SemanticRegistryService } from '../components/semantic-registry/semantic-registry.service';
import { LlmRouterService } from '../../../services/llm-router.service';
import { MemoryService } from '../../memory/memory.service';
import { SemanticDescriptor } from '../interfaces/semantic-descriptor.interface';

describe('SemanticRegistryService', () => {
  let service: SemanticRegistryService;
  let llmRouterService: LlmRouterService;
  let memoryService: MemoryService;

  beforeEach(async () => {
    const mockLlmRouterService = {
      generateContent: jest.fn().mockImplementation((prompt, options) => {
        if (prompt.includes('计算以下两个语义描述之间的相似度')) {
          return Promise.resolve('0.85');
        }
        return Promise.resolve('{}');
      }),
    };

    const mockMemoryService = {
      storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticRegistryService,
        { provide: LlmRouterService, useValue: mockLlmRouterService },
        { provide: MemoryService, useValue: mockMemoryService },
      ],
    }).compile();

    service = module.get<SemanticRegistryService>(SemanticRegistryService);
    llmRouterService = module.get<LlmRouterService>(LlmRouterService);
    memoryService = module.get<MemoryService>(MemoryService);
  });

  describe('registerDataSource', () => {
    it('should register a data source and return a source ID', async () => {
      const moduleId = 'test-module';
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test entity description',
        attributes: {
          attr1: {
            type: 'string',
            description: 'Test attribute',
          },
        },
        metadata: {
          test: 'metadata',
        },
      };
      const accessMethod = jest.fn().mockResolvedValue({ data: 'test-data' });

      const sourceId = await service.registerDataSource(moduleId, descriptor, accessMethod);

      expect(sourceId).toBeDefined();
      expect(sourceId).toContain(moduleId);
      expect(memoryService.storeMemory).toHaveBeenCalledWith({
        type: 'semantic_registry',
        content: expect.objectContaining({
          id: sourceId,
          moduleId,
          descriptor,
          hasAccessMethod: true,
        }),
      });
    });
  });

  describe('updateDataSource', () => {
    it('should update an existing data source', async () => {
      const moduleId = 'test-module';
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test entity description',
        attributes: { attr1: { type: 'string', description: 'Test attribute' } },
        metadata: { test: 'metadata' },
      };
      const accessMethod = jest.fn().mockResolvedValue({ data: 'test-data' });

      const sourceId = await service.registerDataSource(moduleId, descriptor, accessMethod);

      const updatedDescriptor: SemanticDescriptor = {
        entity: 'updated-entity',
        description: 'Updated description',
        attributes: { attr2: { type: 'number', description: 'New attribute' } },
        metadata: { updated: true },
      };
      const updatedAccessMethod = jest.fn().mockResolvedValue({ data: 'updated-data' });

      const result = await service.updateDataSource(sourceId, updatedDescriptor, updatedAccessMethod);

      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalledTimes(2);
      expect(memoryService.storeMemory).toHaveBeenLastCalledWith({
        type: 'semantic_registry',
        content: expect.objectContaining({
          id: sourceId,
          moduleId,
          descriptor: updatedDescriptor,
          hasAccessMethod: true,
        }),
      });
    });

    it('should return false when updating non-existent data source', async () => {
      const nonExistentId = 'non-existent-id';
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test description',
        attributes: {},
        metadata: {},
      };

      const result = await service.updateDataSource(nonExistentId, descriptor);

      expect(result).toBe(false);
      expect(memoryService.storeMemory).not.toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            id: nonExistentId,
          }),
        }),
      );
    });

    it('should update only the descriptor when accessMethod is not provided', async () => {
      const moduleId = 'test-module';
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test entity description',
        attributes: { attr1: { type: 'string', description: 'Test attribute' } },
        metadata: { test: 'metadata' },
      };
      const accessMethod = jest.fn().mockResolvedValue({ data: 'test-data' });

      const sourceId = await service.registerDataSource(moduleId, descriptor, accessMethod);

      const updatedDescriptor: SemanticDescriptor = {
        entity: 'updated-entity',
        description: 'Updated description',
        attributes: { attr2: { type: 'number', description: 'New attribute' } },
        metadata: { updated: true },
      };

      const result = await service.updateDataSource(sourceId, updatedDescriptor);

      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeDataSource', () => {
    it('should remove an existing data source', async () => {
      const moduleId = 'test-module';
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test entity description',
        attributes: {},
        metadata: {},
      };
      const accessMethod = jest.fn();

      const sourceId = await service.registerDataSource(moduleId, descriptor, accessMethod);

      const result = await service.removeDataSource(sourceId);

      expect(result).toBe(true);
      expect(memoryService.storeMemory).toHaveBeenLastCalledWith({
        type: 'semantic_registry_deleted',
        content: expect.objectContaining({
          id: sourceId,
          deletedAt: expect.any(String),
        }),
      });
    });

    it('should return false when removing non-existent data source', async () => {
      const nonExistentId = 'non-existent-id';

      const result = await service.removeDataSource(nonExistentId);

      expect(result).toBe(false);
      expect(memoryService.storeMemory).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'semantic_registry_deleted',
          content: expect.objectContaining({
            id: nonExistentId,
          }),
        }),
      );
    });
  });

  describe('getDataSource', () => {
    it('should return data source information for existing source', async () => {
      const moduleId = 'test-module';
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test entity description',
        attributes: {},
        metadata: {},
      };
      const accessMethod = jest.fn();

      const sourceId = await service.registerDataSource(moduleId, descriptor, accessMethod);

      const source = await service.getDataSource(sourceId);

      expect(source).toBeDefined();
      expect(source).toEqual({
        id: sourceId,
        moduleId,
        descriptor,
        hasAccessMethod: true,
      });
    });

    it('should return null for non-existent data source', async () => {
      const nonExistentId = 'non-existent-id';

      const source = await service.getDataSource(nonExistentId);

      expect(source).toBeNull();
    });
  });

  describe('findPotentialSources', () => {
    it('should find sources that match the intent above threshold', async () => {
      const descriptor1: SemanticDescriptor = {
        entity: 'entity1',
        description: 'Description 1',
        attributes: {},
        metadata: {},
      };
      const descriptor2: SemanticDescriptor = {
        entity: 'entity2',
        description: 'Description 2',
        attributes: {},
        metadata: {},
      };

      const sourceId1 = await service.registerDataSource('module1', descriptor1, jest.fn());
      const sourceId2 = await service.registerDataSource('module2', descriptor2, jest.fn());

      jest.spyOn(service, 'calculateSemanticSimilarity').mockImplementation(async (source, target) => {
        if (source.entity === 'entity1') {
          return 0.9; // Above threshold
        } else {
          return 0.5; // Below threshold
        }
      });

      const intent = { query: 'find entity1' };
      const sources = await service.findPotentialSources(intent, 0.7);

      expect(sources).toContain(sourceId1);
      expect(sources).not.toContain(sourceId2);
      expect(service.calculateSemanticSimilarity).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no sources match the intent', async () => {
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test description',
        attributes: {},
        metadata: {},
      };

      await service.registerDataSource('test-module', descriptor, jest.fn());

      jest.spyOn(service, 'calculateSemanticSimilarity').mockResolvedValue(0.3);

      const intent = { query: 'unrelated query' };
      const sources = await service.findPotentialSources(intent, 0.7);

      expect(sources).toEqual([]);
      expect(service.calculateSemanticSimilarity).toHaveBeenCalled();
    });
  });

  describe('getAllDataSources', () => {
    it('should return all data sources when no moduleId is provided', async () => {
      const descriptor1: SemanticDescriptor = {
        entity: 'entity1',
        description: 'Description 1',
        attributes: {},
        metadata: {},
      };
      const descriptor2: SemanticDescriptor = {
        entity: 'entity2',
        description: 'Description 2',
        attributes: {},
        metadata: {},
      };

      const sourceId1 = await service.registerDataSource('module1', descriptor1, jest.fn());
      const sourceId2 = await service.registerDataSource('module2', descriptor2, jest.fn());

      const sources = await service.getAllDataSources();

      expect(sources).toHaveLength(2);
      expect(sources[0].id).toBe(sourceId1);
      expect(sources[1].id).toBe(sourceId2);
    });

    it('should filter data sources by moduleId when provided', async () => {
      const descriptor1: SemanticDescriptor = {
        entity: 'entity1',
        description: 'Description 1',
        attributes: {},
        metadata: {},
      };
      const descriptor2: SemanticDescriptor = {
        entity: 'entity2',
        description: 'Description 2',
        attributes: {},
        metadata: {},
      };

      const sourceId1 = await service.registerDataSource('module1', descriptor1, jest.fn());
      const sourceId2 = await service.registerDataSource('module2', descriptor2, jest.fn());

      const sources = await service.getAllDataSources('module1');

      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe(sourceId1);
    });

    it('should return empty array when no data sources match the moduleId', async () => {
      const descriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test description',
        attributes: {},
        metadata: {},
      };

      await service.registerDataSource('test-module', descriptor, jest.fn());

      const sources = await service.getAllDataSources('non-existent-module');

      expect(sources).toEqual([]);
    });
  });

  describe('calculateSemanticSimilarity', () => {
    it('should calculate similarity between source descriptor and target intent', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test description',
        attributes: {},
        metadata: {},
      };
      const targetIntent = { query: 'find test entity' };

      const similarity = await service.calculateSemanticSimilarity(sourceDescriptor, targetIntent);

      expect(similarity).toBe(0.85);
      expect(llmRouterService.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('计算以下两个语义描述之间的相似度'),
        expect.objectContaining({
          temperature: 0.1,
          maxTokens: 10,
        }),
      );
    });

    it('should handle LLM service errors gracefully', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test description',
        attributes: {},
        metadata: {},
      };
      const targetIntent = { query: 'find test entity' };

      jest.spyOn(llmRouterService, 'generateContent').mockRejectedValueOnce(new Error('LLM service error'));

      const similarity = await service.calculateSemanticSimilarity(sourceDescriptor, targetIntent);

      expect(similarity).toBe(0);
    });

    it('should handle invalid LLM responses gracefully', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test description',
        attributes: {},
        metadata: {},
      };
      const targetIntent = { query: 'find test entity' };

      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('not a number');

      const similarity = await service.calculateSemanticSimilarity(sourceDescriptor, targetIntent);

      expect(similarity).toBe(0);
    });

    it('should clamp similarity values to [0, 1] range', async () => {
      const sourceDescriptor: SemanticDescriptor = {
        entity: 'test-entity',
        description: 'Test description',
        attributes: {},
        metadata: {},
      };
      const targetIntent = { query: 'find test entity' };

      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('1.5');
      const highSimilarity = await service.calculateSemanticSimilarity(sourceDescriptor, targetIntent);
      expect(highSimilarity).toBe(1);

      jest.spyOn(llmRouterService, 'generateContent').mockResolvedValueOnce('-0.5');
      const lowSimilarity = await service.calculateSemanticSimilarity(sourceDescriptor, targetIntent);
      expect(lowSimilarity).toBe(0);
    });
  });
});
