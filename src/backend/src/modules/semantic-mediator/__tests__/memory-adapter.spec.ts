import { Test, TestingModule } from '@nestjs/testing';
import { MemoryAdapter } from '../components/intelligent-cache/memory.adapter';
import { MemoryService } from '../../memory/memory.service';
import { MemoryType } from '../../memory/schemas/memory.schema';
import { DataAccessService } from '../../memory/services/data-access.service';
import { CacheAccessService } from '../../memory/services/cache-access.service';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;
  let memoryService: MemoryService;
  let dataAccessService: DataAccessService;
  let cacheAccessService: CacheAccessService;

  beforeEach(async () => {
    const mockMemoryData = [
      {
        _id: 'memory-1',
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: {
          id: 'cache-1',
          sourceDescriptor: { type: 'source1' },
          targetDescriptor: { type: 'target1' },
          transformationPath: { steps: [] },
        },
        tags: ['test'],
      },
      {
        _id: 'memory-2',
        type: MemoryType.EXPECTATION,
        content: {
          id: 'exp-1',
          data: { value: 'test data' },
        },
        tags: ['expectation'],
      },
    ];

    const mockMemoryService = {
      storeMemory: jest.fn().mockImplementation((data) => {
        return Promise.resolve({ _id: `memory-${Date.now()}`, ...data });
      }),
      getMemoryByType: jest.fn().mockImplementation((type, limit = 10) => {
        const filtered = mockMemoryData.filter((m) => m.type === type);
        return Promise.resolve(filtered.slice(0, limit));
      }),
      updateMemory: jest.fn().mockImplementation((type, contentId, data) => {
        return Promise.resolve({
          _id: 'updated-memory',
          type,
          content: { id: contentId, ...data.content },
        });
      }),
      getBySemanticIntent: jest.fn().mockImplementation((intent, options) => {
        const type = options.includeTypes?.[0];
        const filtered = type
          ? mockMemoryData.filter((m) => m.type === type)
          : mockMemoryData;
        return Promise.resolve(filtered.slice(0, options.limit || 10));
      }),
      getRelatedMemories: jest.fn().mockImplementation((query, limit = 5) => {
        return Promise.resolve(mockMemoryData.slice(0, limit));
      }),
      searchMemories: jest.fn().mockImplementation((query, limit = 5) => {
        return Promise.resolve(mockMemoryData.slice(0, limit));
      }),
    };

    // Mock for DataAccessService
    const mockDataAccessService = {
      save: jest.fn().mockImplementation((data) => {
        return Promise.resolve({ _id: `data-${Date.now()}`, ...data });
      }),
      findByType: jest.fn().mockImplementation((type, limit = 10) => {
        const filtered = mockMemoryData.filter((m) => m.type === type);
        return Promise.resolve(filtered.slice(0, limit));
      }),
      find: jest.fn().mockImplementation((query, options = {}) => {
        return Promise.resolve(mockMemoryData.slice(0, options.limit || 10));
      }),
      findOne: jest.fn().mockImplementation((query) => {
        return Promise.resolve(mockMemoryData[0]);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        return Promise.resolve({ _id: id, ...data });
      }),
      delete: jest.fn().mockImplementation((query) => {
        return Promise.resolve({ deletedCount: 1 });
      }),
    };

    // Mock for CacheAccessService
    const mockCacheAccessService = {
      get: jest.fn().mockImplementation((key) => {
        return null; // Assume cache miss by default
      }),
      set: jest.fn().mockImplementation((key, value, options = {}) => {
        return true; // Always succeed
      }),
      has: jest.fn().mockImplementation((key) => {
        return false; // Assume key doesn't exist by default
      }),
      delete: jest.fn().mockImplementation((key) => {
        return true; // Always succeed
      }),
      clear: jest.fn().mockImplementation(() => {
        return true; // Always succeed
      }),
      getStats: jest.fn().mockImplementation(() => {
        return { hits: 0, misses: 0, keys: 0 };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryAdapter,
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: DataAccessService, useValue: mockDataAccessService },
        { provide: CacheAccessService, useValue: mockCacheAccessService },
      ],
    }).compile();

    adapter = module.get<MemoryAdapter>(MemoryAdapter);
    memoryService = module.get<MemoryService>(MemoryService);
    dataAccessService = module.get<DataAccessService>(DataAccessService);
    cacheAccessService = module.get<CacheAccessService>(CacheAccessService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('storeMemory', () => {
    it('should store memory successfully', async () => {
      const data = {
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: { id: 'test-content' },
      };

      await adapter.storeMemory(data);
      expect(dataAccessService.save).toHaveBeenCalled();
    });

    it('should use fallback implementation when storeMemory fails', async () => {
      const data = {
        type: MemoryType.SEMANTIC_TRANSFORMATION,
        content: { id: 'test-content' },
      };

      // Make DataAccessService.save fail
      (dataAccessService.save as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      await adapter.storeMemory(data);
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });
  });

  describe('getMemoryByType', () => {
    it('should get memories by type successfully', async () => {
      await adapter.getMemoryByType(MemoryType.SEMANTIC_TRANSFORMATION);
      expect(dataAccessService.findByType).toHaveBeenCalled();
    });

    it('should try getBySemanticIntent when getMemoryByType fails', async () => {
      // Make DataAccessService.findByType fail
      (dataAccessService.findByType as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      // Make memoryService.getMemoryByType fail too
      (memoryService.getMemoryByType as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      await adapter.getMemoryByType(MemoryType.SEMANTIC_TRANSFORMATION);
      expect(memoryService.getBySemanticIntent).toHaveBeenCalled();
    });

    it('should try getRelatedMemories as fallback', async () => {
      // Make DataAccessService.findByType fail
      (dataAccessService.findByType as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      // Make memoryService.getMemoryByType fail too
      (memoryService.getMemoryByType as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      // Make getBySemanticIntent fail as well
      (memoryService.getBySemanticIntent as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      await adapter.getMemoryByType(MemoryType.SEMANTIC_TRANSFORMATION);
      expect(memoryService.getRelatedMemories).toHaveBeenCalled();
    });

    it('should return empty array as last resort', async () => {
      // Make all methods fail
      (dataAccessService.findByType as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      (memoryService.getMemoryByType as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      (memoryService.getBySemanticIntent as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      (memoryService.getRelatedMemories as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      const result = await adapter.getMemoryByType(MemoryType.SEMANTIC_TRANSFORMATION);
      expect(result).toEqual([]);
    });
  });

  describe('queryMemories', () => {
    it('should query memories successfully', async () => {
      await adapter.queryMemories(
        MemoryType.SEMANTIC_TRANSFORMATION,
        { someField: 'someValue' },
      );
      expect(dataAccessService.find).toHaveBeenCalled();
    });

    it('should return empty array when query fails', async () => {
      // Make find fail
      (dataAccessService.find as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      // Make searchMemories fail
      (memoryService.searchMemories as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      const result = await adapter.queryMemories(
        MemoryType.SEMANTIC_TRANSFORMATION,
        { someField: 'someValue' },
      );
      expect(result).toEqual([]);
    });
  });

  describe('updateMemory', () => {
    it('should update memory successfully when updateMemory exists', async () => {
      const updateData = {
        content: { value: 'updated value' },
        tags: ['updated'],
      };

      await adapter.updateMemory(MemoryType.SEMANTIC_TRANSFORMATION, 'content-id', updateData);
      expect(dataAccessService.findOne).toHaveBeenCalled();
      expect(dataAccessService.update).toHaveBeenCalled();
    });

    it('should use storeMemory as fallback', async () => {
      const updateData = {
        content: { value: 'updated value' },
        tags: ['updated'],
      };

      // Make findOne and update fail
      (dataAccessService.findOne as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      (memoryService.updateMemory as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      // Spy on adapter.storeMemory method
      const storeMemorySpy = jest.spyOn(adapter, 'storeMemory');

      await adapter.updateMemory(MemoryType.SEMANTIC_TRANSFORMATION, 'content-id', updateData);
      expect(storeMemorySpy).toHaveBeenCalled();
      
      // Clean up the spy
      storeMemorySpy.mockRestore();
    });
  });
}); 