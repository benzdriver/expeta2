import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MemoryService } from '../memory.service';
import { Memory, MemoryType } from '../schemas/memory.schema';
import { SemanticCacheService } from '../services/semantic-cache.service';
import { SemanticQueryOptions } from '../interfaces/semantic-memory.interfaces';

describe('MemoryService - Semantic Retrieval', () => {
  let service: MemoryService;
  let mockMemoryModel: unknown;
  let mockSemanticCacheService: unknown;

  const _mockMemory = 
    _id: 'test-id',
    type: MemoryType.REQUIREMENT,
    content: { text: 'Test requirement about user authentication' },
    metadata: { title: 'User Authentication' },
    tags: ['authentication', 'user'],
    semanticMetadata: {
      description: 'A requirement about user authentication and login process',
      relevanceScore: 0.85,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockMemoryModel = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockMemory]),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      new: jest.fn().mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue({ ...data, _id: 'test-id' }),
      })),
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
          _id: 'test-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    };

    mockSemanticCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    const _module: TestingModule = 
      providers: [
        MemoryService,
        {
          provide: getModelToken(Memory.name),
          useValue: mockMemoryModel,
        },
        {
          provide: SemanticCacheService,
          useValue: mockSemanticCacheService,
        },
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);

    jest.spyOn<any, any>(service, 'getSemanticMediatorService').mockResolvedValue({
      interpretIntent: jest.fn().mockResolvedValue({
        relevantTerms: ['authentication', 'user', 'login'],
        intentType: 'search',
      }),
      calculateSimilarity: jest.fn().mockResolvedValue(0.85),
    });
  });

  describe('getBySemanticIntent', () => {
    it('should retrieve memories based on semantic intent', async () => {
      const _intent = 
      const _options: SemanticQueryOptions = 
        similarityThreshold: 0.7,
        limit: 10,
        sortBy: 'relevance',
      };

      const _mockResults = 

      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      });

      const _result = 

      expect(result).toEqual(mockResults);
      expect(mockMemoryModel.find).toHaveBeenCalled();
    });

    it('should use cache when available', async () => {
      const _intent = 
      const _cachedResults = 

      mockSemanticCacheService.get.mockReturnValue(cachedResults);

      const _result = 

      expect(result).toEqual(cachedResults);
      expect(mockSemanticCacheService.get).toHaveBeenCalled();
      expect(mockMemoryModel.find).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const _intent = 

      jest
        .spyOn<any, any>(service, 'getSemanticMediatorService')
        .mockRejectedValue(new Error('Service unavailable'));

      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const _result = 

      expect(result).toEqual([]);
    });
  });

  describe('findSimilarMemories', () => {
    it('should find similar memories based on memory ID', async () => {
      const _memoryId = 
      const _similarityThreshold = 

      const _mockResults = 
        { ...mockMemory, _id: 'similar-id-1' },
        { ...mockMemory, _id: 'similar-id-2' },
      ];

      mockMemoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemory),
      });

      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockResults),
      });

      const _result = 

      expect(result).toEqual(mockResults);
      expect(mockMemoryModel.findById).toHaveBeenCalledWith(memoryId);
      expect(mockMemoryModel.find).toHaveBeenCalled();
    });

    it('should return empty array if source memory not found', async () => {
      const _memoryId = 

      mockMemoryModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockMemoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const _result = 

      expect(result).toEqual([]);
      expect(mockMemoryModel.findById).toHaveBeenCalledWith(memoryId);
    });
  });
});
